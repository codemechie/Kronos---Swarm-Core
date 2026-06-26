# PHASE 3C.5 — GRANITE TERMINAL UI

Goal: Expose Granite Review intelligence to users via the Granite Terminal UI.

No backend changes. Uses existing SSE payload and existing `granite_review` object.

---

## Files Created

| File | Role |
|---|---|
| `frontend/src/components/granite/GraniteTerminal.tsx` | New component with Loading / Standby / Active states |

---

## Files Modified

| File | Change |
|---|---|
| `frontend/src/types/kronos.ts` | Added `GraniteReview` and `Validation` interfaces; added both to `KronosState` and `KronosPacket` |
| `frontend/src/lib/normalizeKronosPacket.ts` | Extracts `granite_review` + `validation` from raw packet; provides fallback defaults when absent |
| `frontend/src/context/KronosProvider.tsx` | Stores `granite_review` + `validation` in `KronosState` on every SSE tick |
| `frontend/src/pages/WarRoom.tsx` | Inserted `<GraniteTerminal />` after `<FractureTimeline />` |

---

## GraniteReview Interface

```typescript
interface GraniteReview {
  escalation_triggered: boolean;
  review_summary: string;
  contradiction_analysis: string;
  confidence_assessment: string;
  recommended_action: string;
  granite_confidence: number;
  provider: string;
  skipped: boolean;
}
```

## Validation Interface

```typescript
interface Validation {
  overall_confidence: number;
  agreement_score: number;
  trust_score: number;
  contradiction_count: number;
  flags: string[];
  evidence_summary: string;
  validation_source: string;
  skipped: boolean;
}
```

---

## GraniteTerminal Component — Three States

### Loading

Rendered when `granite_review` is `undefined` (initial state before first SSE tick):

```
┌──────────────────────────────────────┐
│ GRANITE REVIEW TERMINAL              │
│                                      │
│ Awaiting Granite intelligence...     │
└──────────────────────────────────────┘
```

### Standby

Rendered when `granite_review.skipped === true`:

```
┌──────────────────────────────────────┐
│ GRANITE REVIEW TERMINAL     [STANDBY]│
│                                      │
│ Reason: Granite review not required. │
│                                      │
│ ─────────────────────────────────── │
│ Confidence: 0.58    Fracture: 40     │
└──────────────────────────────────────┘
```

Green `[STANDBY]` badge (green-400 text, green-700 border). Shows validation confidence and swarm fracture index in the footer.

### Active

Rendered when `granite_review.skipped === false`:

```
┌──────────────────────────────────────┐
│ GRANITE REVIEW TERMINAL      [ACTIVE]│
│                                      │
│ GRANITE CONFIDENCE: 84%              │
│                                      │
│ ─────────────────────────────────── │
│ INTELLIGENCE SUMMARY                 │
│ Swarm is fractured...                │
│                                      │
│ ─────────────────────────────────── │
│ CONTRADICTION ANALYSIS               │
│ Multiple agents disagree on risk...  │
│                                      │
│ ─────────────────────────────────── │
│ CONFIDENCE ASSESSMENT                │
│ Low confidence in swarm consensus.   │
│                                      │
│ ─────────────────────────────────── │
│ RECOMMENDED ACTION                   │
│ Manual intervention recommended.     │
│                                      │
│ ─────────────────────────────────── │
│ Provider: granite  Confidence: 0.58  │
│ Fracture: 40                         │
└──────────────────────────────────────┘
```

Amber `[ACTIVE]` badge (amber-400 text, amber-700 border). Granite confidence shown as a large bold percentage. Four bordered content sections for the review fields. Footer shows provider metadata, validation confidence, and fracture index.

---

## Data Flow

```
SSE payload
  → granite_review (already in payload from Phase 3C.4)
  → normalizeKronosPacket() extracts + defaults
  → KronosProvider stores in KronosState
    → GraniteTerminal reads via useKronos()
      → renders Loading / Standby / Active
```

Also plumbed `validation` through the same pipeline (types, normalizer, provider) so the Standby and Active states can display `validation.overall_confidence`.

---

## Verification

| Check | Result |
|---|---|
| Backend tests (115) | All passed |
| TypeScript build (`npx tsc --noEmit`) | Zero errors |
| Backend modified | No |
| SSE schema modified | No |
| GraniteReviewEngine modified | No |
| New state management introduced | No |

---

## Readiness Assessment

**YES** — Kronos now visibly demonstrates IBM Granite reasoning through the Granite Terminal UI in the War Room command center.
