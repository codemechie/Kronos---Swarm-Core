# Historical Runtime Independence Audit — Phase 6.1.10

## Dependency Map

```
HistoricalRuntimeProvider
  → LiveRuntimeProvider (hard-coded composition, line 6)
    → EventSource("http://localhost:3000/stream") (line 23)
      → backend orchestrator (synthetic data from KronosMatchTicker)
        → NOT the Argentina-France timeline JSON
```

There is a separate **timeline JSON** at `frontend/public/datasets/argentina_france_2022_timeline.json` (42 events, `RuntimeTimelineEvent[]` shape), loaded by `timelineLoader.ts` for the Match Story page — but it is **never fed into the runtime engine**. The `HistoricalRuntimeProvider` has zero knowledge of this data.

---

## Question 1: Can HistoricalRuntimeProvider emit RuntimeEvents without any EventSource?

**No.** It has no independent event generation mechanism.

```
HistoricalRuntimeProvider (18 lines, 3 delegating methods)
├── start()     → this.live.start()            → new EventSource(URL)
├── stop()      → this.live.stop()             → this.source?.close()
└── subscribe() → this.live.subscribe()        → this.listeners.add(listener)
```

Every code path terminates at the `LiveRuntimeProvider` instance. There is no:
- Internal event queue
- Timer/scheduler
- JSON data loader
- Synthetic event generator
- Any form of autonomous emission

The provider is a **transparent pass-through wrapper** — zero lines of original logic.

---

## Question 2: Does seek() emit a RuntimeEvent?

**No — seek() does not exist anywhere.**

| Location | Method | Exists? |
|----------|--------|---------|
| `RuntimeProvider` interface | `seek()` | No |
| `RuntimeSession` interface | `seek()` | No |
| `HistoricalRuntimeProvider` | `seek()` | No |
| `HistoricalRuntimeSession` | `seek()` | No |
| `LiveRuntimeProvider` | `seek()` | No |
| `LiveRuntimeSession` | `seek()` | No |

The `HistoricalSessionState` has `playbackPosition: number` (line 10 of `HistoricalRuntimeSession.ts`) but no code path ever sets it from a user action. It is only overwritten passively by incoming SSE packets at `HistoricalRuntimeSession.ts:55` and `96`.

---

## Question 3: Does play() emit RuntimeEvents?

**No — play() does not exist anywhere.**

Only `start()` and `resume()` exist on the `RuntimeSession` interface. Both connect to the SSE stream. There is no concept of "playing from a local buffer" or "resuming from a stored position" — the stream always starts from minute 1 on every connection.

`HistoricalSessionState` has `playbackState` with values `idle`, `playing`, `paused`, `completed` (line 7), but these are purely cosmetic labels. `"playing"` is set but the actual data source is the live SSE regardless.

---

## Question 4: Can HistoricalRuntimeProvider operate entirely from Timeline JSON?

**No.** The data exists but the provider has no way to consume it.

| Requirement | Status |
|-------------|--------|
| Timeline JSON exists at `public/datasets/argentina_france_2022_timeline.json` | ✅ (42 events, 64KB) |
| Timeline loader available (`timelineLoader.ts`) | ✅ (async `loadTimeline()`) |
| `HistoricalRuntimeProvider` references the loader | ❌ **No import** |
| `HistoricalRuntimeProvider` can read files | ❌ **No file-reading capability** |
| Timeline events (`RuntimeTimelineEvent`) match `KronosPacket` shape | ❌ **Different shapes** |
| Provider has an internal event queue for playback | ❌ **No queue** |
| Provider has a timer/scheduler for event pacing | ❌ **No timer** |
| Provider can convert `RuntimeTimelineEvent[]` → `KronosPacket[]` | ❌ **No converter** |

The timeline JSON has field names like `event_type`, `team`, `player`, `description`, `score` — completely different from `KronosPacket` which has `telemetry`, `swarm_metrics`, `debate_outputs`, `granite_review`, `validation`. A conversion layer would be needed to emit timeline events as `KronosPacket`-compatible runtime events.

---

## Question 5: Is HistoricalRuntimeProvider delegating transport concerns to LiveRuntimeProvider?

**Yes, entirely.** This is the complete HistoricalRuntimeProvider implementation:

```ts
class HistoricalRuntimeProvider implements RuntimeProvider {
  private live = new LiveRuntimeProvider();  // ← hard-wired dependency

  start(onStatus?)    { this.live.start(onStatus); }     // ← pure delegation
  stop()              { this.live.stop(); }               // ← pure delegation
  subscribe(listener) { return this.live.subscribe(listener); }  // ← pure delegation
}
```

Three methods, zero original behavior. The `start()` → `EventSource` transport concern is embedded in `LiveRuntimeProvider` and the historical variant has no way to opt out of it.

---

## Question 6: Should HistoricalRuntimeProvider own its own playback loop?

**Yes.** The data exists, the architecture just doesn't use it. The Argentina-France timeline JSON is already compiled and validated (42 events, 64KB, schema v2.1). The only missing piece is a provider that:

1. Loads the JSON via `loadTimeline()`
2. Maintains an internal index of events sorted by `minute`
3. Runs a `setInterval`-based timer on `play()` that emits events from the current position
4. `seek(minute)` jumps the internal cursor and emits the event at that position
5. `pause()` stops the timer

### Current dependencies preventing independence

| # | Dependency | Location | Effect |
|---|-----------|----------|--------|
| D1 | `new LiveRuntimeProvider()` in field initializer | `HistoricalRuntimeProvider.ts:6` | Forces EventSource dependency on every `start()` |
| D2 | `this.live.start()` in `start()` | `HistoricalRuntimeProvider.ts:9` | Cannot start without opening SSE connection |
| D3 | `this.live.subscribe()` in `subscribe()` | `HistoricalRuntimeProvider.ts:17` | Listener management delegated to LiveRuntimeProvider |
| D4 | No `seek()` on `RuntimeSession` interface | `RuntimeSession.ts:7-18` | No way to navigate to a specific position |
| D5 | No `play()`/`pause()` on `RuntimeSession` interface | `RuntimeSession.ts:7-18` | No way to control playback speed |
| D6 | `playbackPosition` only written by SSE packets | `HistoricalRuntimeSession.ts:55,96` | No user-initiated seek path |
| D7 | `playbackState` is cosmetic only | `HistoricalRuntimeSession.ts:7` | State transitions don't affect data source |
| D8 | Timeline JSON never imported in runtime code | No import exists | The 42-event dataset is match-story-only |
| D9 | `RuntimeTimelineEvent` ≠ `KronosPacket` shape | Two type systems | No adapter to convert timeline → runtime events |
| D10 | No timer/scheduler in `HistoricalRuntimeProvider` | Does not exist | Nothing drives event emission without EventSource |

### Required independence contract

For `HistoricalRuntimeProvider` to function without `LiveRuntimeProvider`, it needs:

```
HistoricalRuntimeProvider (refactored)
├── loadTimeline()           → fetches JSON from /datasets/
├── start()                  → calls play() from minute 0
├── stop()                   → calls pause(), resets position
├── play()                   → starts setInterval-based event emission
├── pause()                  → clears the interval
├── seek(minute)             → jumps event cursor, emits event at minute
├── subscribe(listener)      → adds listener (same as now, but for local events)
└── #playbackLoop()          → private: picks next event, emits, advances cursor
```

And `RuntimeSession` needs new methods:

```
interface RuntimeSession {
  ...
  seek(minute: number): void;
  play(): void;
  pause(): void;
}
```

The `KronosPacket` shape needs an adapter from `RuntimeTimelineEvent` — or the timeline JSON should include synthetic telemetry snapshots at each minute that match the `KronosPacket` format, so the engine can process them identically to live data.
