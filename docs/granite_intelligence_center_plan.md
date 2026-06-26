# Granite Intelligence Center — Implementation Plan

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/pages/GraniteIntelligence.tsx` | New page composing all four sections |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/App.tsx:5` | Import `GraniteIntelligence`, add `<Route path="/granite" element={<GraniteIntelligence />} />` |
| `frontend/src/components/layout/CommandHeader.tsx:8` | Add `{ to: "/granite", label: "Granite Review" }` to `navLinks` |
| `frontend/src/pages/Landing.tsx:18` | Add card with `to: "/granite"`, title `"GRANITE INTELLIGENCE CENTER"`, desc `"Can we trust this intelligence?"` |

## Component Hierarchy

```
GraniteIntelligence
├── CommandHeader                              (reused as-is)
├── Escalation Overview                        (new inline section)
│   └── 4 metric cards: Fracture, Confidence, Contradictions, Status
├── Validation Summary                         (reuse <ValidationCenter />)
├── Granite Review                             (reuse <GraniteTerminal />)
└── Decision Trace                             (new inline section)
    └── Vertical pipeline: OBSERVE → ANALYZE → DEBATE → VALIDATE → GRANITE REVIEW → RECOMMEND
```

## Data Sources (all from `useKronos()`)

| Section | Data | Source Field |
|---------|------|-------------|
| Escalation Overview | Fracture Index | `swarmMetrics.fracture_index` |
| | Overall Confidence | `validation.overall_confidence` |
| | Contradictions | `validation.contradiction_count` |
| | Escalation Status | `granite_review.escalation_triggered` |
| Validation Summary | (entire component) | `validation` |
| Granite Review | (entire component) | `granite_review` |
| Decision Trace | Telemetry, agents, verdict, validation, granite | all of the above |

## Proposed Page Layout

```
┌─────────────────────────────────────────────────┐
│  CommandHeader (Kronos | nav links | minute)    │
├─────────────────────────────────────────────────┤
│  GRANITE INTELLIGENCE CENTER                     │
│  Can we trust it?                                │
├─────────────────────────────────────────────────┤
│  ┌────────────┬────────────┬──────────┬────────┐ │
│  │ FRACTURE   │ CONFIDENCE │ CONTRAD. │ STATUS │ │
│  │   42       │    65%     │    3     │ ACTIVE │ │
│  └────────────┴────────────┴──────────┴────────┘ │
├─────────────────────────────────────────────────┤
│  ValidationCenter (reused as-is)                 │
├─────────────────────────────────────────────────┤
│  GraniteTerminal (reused as-is)                  │
├─────────────────────────────────────────────────┤
│  DECISION TRACE                                  │
│                                                  │
│  ┌─ OBSERVE ─────────────────────────────────┐  │
│  │ Telemetry: min 72, score 2-1, ppda 8.3    │  │
│  └───────────────────────────────────────────┘  │
│         ↓                                        │
│  ┌─ ANALYZE ─────────────────────────────────┐  │
│  │ 5 agents (Pragmatist, Mood Ring, ...)     │  │
│  └───────────────────────────────────────────┘  │
│         ↓                                        │
│  ┌─ DEBATE ──────────────────────────────────┐  │
│  │ Fracture: 42 | Chaos: 23%                 │  │
│  └───────────────────────────────────────────┘  │
│         ↓                                        │
│  ┌─ VALIDATE ────────────────────────────────┐  │
│  │ Agreement: 72% | Confidence: 65%          │  │
│  └───────────────────────────────────────────┘  │
│         ↓                                        │
│  ┌─ GRANITE REVIEW ──────────────────────────┐  │
│  │ Confidence: 81% | Escalation: YES         │  │
│  └───────────────────────────────────────────┘  │
│         ↓                                        │
│  ┌─ RECOMMEND ───────────────────────────────┐  │
│  │ Lead Coach Verdict / Granite Action       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Reuse Opportunities

| Component/Lib | How to Reuse |
|---------------|-------------|
| `CommandHeader` | Import and render at top — already navigable, just needs the link |
| `ValidationCenter` | Direct inline `<ValidationCenter />` — reads its own data from `useKronos()` |
| `GraniteTerminal` | Direct inline `<GraniteTerminal />` — handles unavailable/standby/active states |
| `verdictEngine.generateLeadCoachVerdict()` | Call in Decision Trace to populate the RECOMMEND step |
| `normalizeSwarmAgents()` | Call in Decision Trace for ANALYZE step agent list |
| `swarmCohesion` / `fractureAttribution` | Optional enrichment for DEBATE step |
| Layout patterns | Same `min-h-screen bg-black p-4 font-mono` + `max-w-6xl mx-auto space-y-4` as other pages |
| Metric card styling | Same pattern as `SwarmIntelligence.tsx:37-57` |

## Key Design Decisions

- No new components created — the four sections are inline JSX within the page, keeping the change minimal
- Existing components (`ValidationCenter`, `GraniteTerminal`) continue to handle their own graceful degradation (skipped/unavailable/standby)
- Decision Trace is a visual pipeline, not interactive — a vertically stacked card chain with arrows
- The page reads nothing new from SSE — all data already flows through `KronosState`

**Total changes**: 1 new file, 3 modified files.
