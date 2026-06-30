# Historical Session Resume Audit — Phase 6.1.9B

## Objective

Trace the exact lifecycle path for the **second switch-back to historical** (historical → live → historical) and identify where packet flow stops.

---

## Full Lifecycle Trace (second switch-back)

### Step 1 → `RuntimeSessionManager.switchSession(historicalSource)` (`RuntimeSessionManager.ts:41`)

```
prevSession = sessions.get("demo-live-match") → LiveRuntimeSession
prevSession.source.type === "historical"      → FALSE → suspend SKIPPED ✓
session = createSession(historicalSource)     → cached HistoricalRuntimeSession ✓
session !== prevSession                       → TRUE ✓
session.source.type === "historical"          → TRUE
session.resume()                              → CALLED ✓
activeId = "arg-vs-fra-2022"
notify() → setActiveSession(historicalSession)
```

**Status: PASS — `resume()` IS called.**

---

### Step 2 → `HistoricalRuntimeSession.resume()` (`HistoricalRuntimeSession.ts:88`)

```
playbackState = "playing"
providerUnsub is truthy (from first resume)   → subscribe block SKIPPED
provider.start(onStatusCB)                    → CALLED ✓
```

**Status: PASS — `provider.start()` IS called.**

Critical detail: The forwarding callback from the first `resume()` (`HistoricalRuntimeSession.ts:93-101`) survives in `LiveRuntimeProvider.listeners` because `suspend()` never calls `providerUnsub?.()`. This is correct for our purpose — the callback persists.

**FLAW: `this.started` is NOT set to `true`.** Inconsistent with `start()` but not the freeze cause here since `start()` is never called again on this session.

---

### Step 3 → `HistoricalRuntimeProvider.start()` (`HistoricalRuntimeProvider.ts:8`)

```
this.live.start(onStatus) → delegates to LiveRuntimeProvider
```

**Status: PASS — delegation works. Same `LiveRuntimeProvider` instance (same `instanceId`).**

---

### Step 4 → `LiveRuntimeProvider.start()` (`LiveRuntimeProvider.ts:19`)

```
this.onStatus = onStatusCB                   ← NEW status callback set
this.source = new EventSource(STREAM_URL)    ← NEW EventSource created ✓
this.source.onopen  = () => { onStatus?.("CONNECTED"); }
this.source.onmessage = (event) => {
    for (const listener of this.listeners) {
        listener(raw);                       ← iterates [forwardCallback]
    }
}
this.source.onerror = () => { onStatus?.("OFFLINE"); }
```

**Status: PASS — new EventSource created. `forwardCallback` is in `this.listeners`.**

---

### Step 5 → `KronosProvider` effect fires (`KronosProvider.tsx:54`)

```
prevSessionIdRef.current !== sessionId   → TRUE (was live session ID)
→ connectionStatus = "CONNECTING"
→ switchingLabel = "Loading Argentina vs France..."
→ activeSession.subscribe(engineHandler)
  → engineHandler added to HistoricalRuntimeSession.listeners ✓
```

**Status: PASS — engine IS subscribed to historical session's listeners.**

---

### The forwarding chain (if EventSource connects)

```
LiveRuntimeProvider.onmessage
  → iterates LiveRuntimeProvider.listeners
    → forwardCallback (survived from first resume)
      → iterates HistoricalRuntimeSession.listeners
        → engineHandler (just subscribed)
          → setState → UI update
```

---

## Where the Lifecycle STOPS

| Checkpoint | Expected | Actual | Status |
|------------|----------|--------|--------|
| `switchSession()` calls `resume()` | `session.resume()` | Called | ✅ |
| `resume()` calls `provider.start()` | `LiveRuntimeProvider.start()` | Called | ✅ |
| `start()` creates new EventSource | `new EventSource(URL)` | Created | ✅ |
| EventSource fires `onopen` | `this.onStatus?.("CONNECTED")` | ⚠️ **UNKNOWN** | ❓ |
| EventSource fires `onmessage` | `for (listener of this.listeners) listener(raw)` | ⚠️ **UNKNOWN** | ❓ |
| `forwardCallback` iterates session listeners | `for (listener of this.listeners) listener(packet)` | ⚠️ **UNKNOWN** | ❓ |
| Engine handler calls `setState` | `setState(...)` | ⚠️ **UNKNOWN** | ❓ |
| UI re-renders | Component updates | ⚠️ **UNKNOWN** | ❓ |

**The break point is between `LiveRuntimeProvider.start()` and `onopen` firing.**

### Root cause analysis

**Candidate 1: EventSource connection stall (MOST LIKELY)**

The second `LiveRuntimeProvider.start()` creates a new `EventSource` on the **same `LiveRuntimeProvider` instance**. The browser must fully tear down the previous HTTP/SSE connection (closed by `stop()` during `suspend()`) before establishing a new one. If:

- The TCP socket is in `TIME_WAIT` (no new connection until OS releases the port)
- The browser's connection pool hasn't released the slot (6-per-origin limit)
- The previous EventSource hasn't fully disconnected (race condition between `close()` and `new EventSource()`)

...the new EventSource hangs in `CONNECTING` permanently.

Evidence: The live session's EventSource is still active (never suspended). If we're at the 6-per-origin browser limit, two concurrent SSE connections might be fine, but the timing of creating one immediately after closing another on the same subdomain/port can trigger stalls.

**Candidate 2: Silent exception in forwarding chain**

`LiveRuntimeProvider.onmessage` wraps the listener iteration in `try/catch` (`LiveRuntimeProvider.ts:37-39`). If `forwardCallback` or `engineHandler` throws:

```ts
} catch {
    console.log(`[Kronos:DIAG] 8 | provider_emitted_malformed | ...`);
}
```

The error is silently swallowed and logged as "malformed data" — misleading. If this happens on every packet, no state updates reach the UI.

**Candidate 3: Stale `this` in forwarding callback (UNLIKELY)**

The `forwardCallback` is created during the first `resume()` call (`HistoricalRuntimeSession.ts:93-101`). It's an arrow function, so `this` is lexically bound to the `HistoricalRuntimeSession` instance at creation time. Since the same session instance is reused (retrieved from `sessions` map), `this` is still valid. However, if the engine handler changed between subscribes (new function reference each `useEffect` run), the old reference in session.listeners would be stale — but `subscribe()` adds the current reference, and the cleanup removes it. This should be correct.

---

## Audit Questions — Answers

| Question | Answer |
|----------|--------|
| Is HistoricalRuntimeSession resumed? | **Yes** — `resume()` is called on line 55 of `RuntimeSessionManager.ts` |
| Is HistoricalRuntimeProvider restarted? | **Yes** — `HistoricalRuntimeProvider.start()` → `LiveRuntimeProvider.start()` creates new EventSource |
| Is provider.start() called twice? | **No** — once per `resume()` call. On the second switch, one call. |
| Does provider.stop() prevent future resumes? | **No** — `stop()` closes the EventSource but `start()` can create a fresh one. Listeners survive. |
| Does the provider unsubscribe permanently? | **No** — `providerUnsub?.()` is never called in `suspend()`. The forwarding callback persists in `LiveRuntimeProvider.listeners`. |
| **Where does the lifecycle stop?** | **Between `LiveRuntimeProvider.start()` and `onopen`** — the EventSource connection fails to establish. The exact stage can be identified from `[Kronos:DIAG]` console output: missing `5.1 | provider_connected` confirms a transport-level stall. |

## How to Confirm

1. Open browser DevTools → Network tab
2. Filter by `stream`
3. Switch to live → note the SSE connection
4. Switch back to historical
5. Look for a second SSE request to `http://localhost:3000/stream`
   - If it appears as **pending/stalled** → connection pool exhaustion or TCP `TIME_WAIT`
   - If it doesn't appear at all → EventSource was never created (check `[Kronos:DIAG] 5` log)
   - If it shows 200 OK but no `[Kronos:DIAG] 5.1` → EventSource connected but `onopen` didn't fire
   - If `5.1` fires but `[Kronos:DIAG] 9` never appears → packets emitted (`[Kronos:DIAG] 8`) but not received by engine
