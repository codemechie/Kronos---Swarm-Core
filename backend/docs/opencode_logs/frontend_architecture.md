# Frontend Architecture — Phase 3C.5 Reference

---

## Component Tree

```
KronosProvider (context/SSE owner)
 └─ App
     └─ WarRoom (pages/WarRoom.tsx — single page, no router)
         ├─ CommandHeader                        [components/layout]
         ├─ 3-column grid (grid-cols-3 gap-4)
         │   ├─ TelemetryPanel                   [components/layout]
         │   │   └─ TelemetrySection × 4         [components/telemetry]
         │   │       └─ TelemetryRow × N         [components/telemetry]
         │   ├─ SwarmPanel                       [components/layout]
         │   │   ├─ SwarmCohesionMeter           [components/swarm]
         │   │   ├─ FractureAttribution          [components/swarm]
         │   │   └─ AgentCard × 5                [components/swarm]
         │   └─ EventFeed                        [components/layout]
         ├─ LeadCoachVerdictPanel                [components/verdict]
         ├─ FractureTimeline                     [components/charts]
         └─ ★ Granite Terminal goes here ★
```

---

## Page Tree

Single-page application — no router (no React Router, single entry point):

```
index.html
 └─ src/main.tsx
     └─ <KronosProvider>
         └─ <App>
             ├─ <WarRoom />              ← the entire War Room
             └─ <KronosDebugPanel />
```

---

## WarRoom Layout (`src/pages/WarRoom.tsx`)

```tsx
export function WarRoom() {
  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-4">
        <CommandHeader />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TelemetryPanel />
          <SwarmPanel />
          <EventFeed />
        </div>
        <LeadCoachVerdictPanel />
        <FractureTimeline />
      </div>
    </div>
  );
}
```

Granite Terminal should be inserted as the last child of `<div className="max-w-6xl mx-auto space-y-4">`, after `FractureTimeline`.

---

## SSE Data Flow

```
SSE (localhost:3000/stream)
  → JSON.parse
    → normalizeKronosPacket()
      → returns { telemetry, swarmMetrics, debateOutputs }
        → stored in KronosState:
             { telemetry, swarmMetrics, debateOutputs, history, phase, events }
```

### What reaches the frontend vs what is dropped

| SSE field | Stored in KronosState? | Typed? |
|---|---|---|
| `telemetry` | ✅ yes | ✅ `Telemetry` |
| `swarm_metrics` | ✅ yes | ✅ `SwarmMetrics` |
| `debate_outputs` | ✅ yes | ✅ `DebateOutputs` |
| `validation` | ❌ not stored | ❌ no type |
| `granite_review` | ❌ not stored | ❌ no type |

### Files requiring modification to pipe `granite_review` to components

1. **`src/types/kronos.ts`** — Add `GraniteReview` interface. Add `granite_review` to `KronosState` and `KronosPacket`.
2. **`src/lib/normalizeKronosPacket.ts`** — Extract `granite_review` from raw packet and include in `NormalizedPacket`.
3. **`src/context/KronosProvider.tsx`** — Extract `granite_review` from normalized result and store in `KronosState`.

---

## Types (`src/types/kronos.ts`)

Current `KronosState`:

```ts
export interface KronosState {
  telemetry: Telemetry;
  swarmMetrics: SwarmMetrics;
  debateOutputs: DebateOutputs;
  history: HistoryPoint[];
  phase: MatchPhase;
  events: KronosEvent[];
}
```

Current `KronosPacket` (raw SSE shape):

```ts
export interface KronosPacket {
  telemetry?: Telemetry;
  swarm_metrics?: SwarmMetrics;
  debate_outputs?: DebateOutputs;
  minute?: number;
  fracture_index?: number;
  chaos_probability?: number;
}
```

Both need `granite_review` added before components can consume it.

---

## Pure-function Libs (no React imports)

All logic engines are pure functions — no browser/React dependencies:

| File | Exports |
|---|---|
| `lib/normalizeKronosPacket.ts` | `normalizeKronosPacket()` |
| `lib/verdictEngine.ts` | `generateLeadCoachVerdict()` |
| `lib/eventEngine.ts` | `generateEvents()` |
| `lib/swarmNormalizer.ts` | `normalizeSwarmAgents()` |
| `lib/swarmCohesion.ts` | `calculateSwarmCohesion()` |
| `lib/fractureAttribution.ts` | `calculateFractureAttribution()` |

---

## Recommended Insertion Pattern for Granite Terminal Component

```
src/components/
  granite/
    GraniteTerminal.tsx        ← new panel component
    GraniteReviewCard.tsx      ← optional sub-component for parsed review data
```

The `GraniteTerminal` component should:
- Read `granite_review` from `useKronos()` (after plumbing is added)
- Display review fields in a styled terminal-like panel
- Be inserted in `WarRoom.tsx` after `<FractureTimeline />`
