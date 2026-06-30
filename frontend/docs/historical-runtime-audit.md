# Historical Runtime Contract Audit — Phase 6.1.9A

## Bypass Inventory

| # | Finding | Risk | File | Status |
|---|---------|------|------|--------|
| B1 | `useKronosStream` is a dormant bypass — creates its own EventSource + local state, never consumed | Medium | `src/hooks/useKronosStream.ts` | Dead code, should be removed |
| B2 | `RuntimeSession` interface lacks `seek()`, `play()`, `pause()` — no replay controls exist | High | `src/runtime/RuntimeSession.ts` | Missing — needed for Phase 6.1.9B |
| B3 | Historical resume restarts from minute 1, ignores the stored `playbackPosition` | High | `src/runtime/HistoricalRuntimeSession.ts` | Not a bypass, but incorrect behavior |
| B4 | `resume()` doesn't set `this.started = true` (minor inconsistency with `start()`) | Low | `src/runtime/HistoricalRuntimeSession.ts` | Fix in next pass |
| B5 | `suspend()` doesn't call `providerUnsub?.()` in either session class | Low | Both session files | Listener leak, fix in next pass |

---

## Question 1: Does any component bypass the RuntimeEngine?

**No active bypasses.** Every component that reads `KronosState` via `useKronos()` is read-only. All state mutations happen exclusively in `src/context/KronosProvider.tsx`:

- Loading state → `setState` line 67 (session switch detection)
- Packet processing → `setState` line 83 (packet handler callback)
- `connectionStatus` is only written in `KronosProvider` (lines 45, 69, 110)

The dormant `useKronosStream.ts` is the only bypass risk — it creates its own `EventSource` and manages local `data`/`connected` state, completely outside the engine.

### Components consuming `useKronos()` (all read-only)

- `src/pages/SwarmIntelligence.tsx`
- `src/pages/DebateTranscript.tsx`
- `src/pages/GraniteIntelligence.tsx`
- `src/components/granite/GraniteTerminal.tsx`
- `src/components/layout/TelemetryPanel.tsx`
- `src/components/charts/FractureTimeline.tsx`
- `src/components/layout/EventFeed.tsx`
- `src/components/layout/CommandHeader.tsx`
- `src/components/layout/SwarmPanel.tsx`
- `src/components/verdict/LeadCoachVerdictPanel.tsx`
- `src/components/validation/ValidationCenter.tsx`
- `src/components/KronosDebugPanel.tsx`

---

## Question 2: Does the replay slider modify React state directly?

**N/A — replay slider doesn't exist.** The `RuntimeSession` interface has no `seek()`, `play()`, or `pause()`. The `HistoricalRuntimeSession` has `playbackPosition` and `playbackState` internally, but no UI component reads or writes them.

*When implemented*, the contract must be:
- `session.seek(minute)` → emits a `KronosPacket` through the provider→session→engine pipeline
- `session.play()` / `session.pause()` → toggles event forwarding
- **Never** call `setState` or modify React context directly

---

## Question 3: Does HistoricalRuntimeProvider emit events after seek?

**N/A — no seek mechanism exists.** `HistoricalRuntimeProvider` delegates to `LiveRuntimeProvider` which connects to `http://localhost:3000/stream`. The stream always emits from minute 1. There is no server-side or client-side seek capability.

---

## Packet Chain Integrity

The freeze on second switch is NOT caused by a bypass. The data flow is architecturally sound:

```
LiveRuntimeProvider.onmessage
  → LiveRuntimeProvider.listeners
    → forwardCallback (session's provider subscription)
      → session.listeners
        → engineHandler (KronosProvider subscription)
          → setState
```

The `forwardCallback` survives suspend/resume because `suspend()` never calls `providerUnsub?.()`. On second `resume()`, `providerUnsub` is truthy so re-subscription is skipped, but the old callback is still registered with the provider.

**Most likely freeze cause**: EventSource connection timing — the second `resume()` starts a new EventSource moments after the previous one was closed. The browser may not have completed the TLS/HTTP teardown, causing the new connection to stall.

---

## Recommended Next Actions

1. **Remove `useKronosStream.ts`** — dead bypass code
2. **Run the app** and inspect `[Kronos:DIAG]` console output on the freeze — the missing stage numbers identify the break point
3. **Verify** that `RuntimeModeContext.tsx` is still wired in the provider hierarchy (it wraps `RuntimeSourceContext`, but `AnalysisSourceSelector` calls `useRuntimeSource()` directly, bypassing `RuntimeModeContext`)
4. Proceed to Phase 6.1.9B (replay controls) once the freeze is resolved
