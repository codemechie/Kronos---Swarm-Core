# PHASE 3C.3 — GRANITE REVIEW ENGINE

---

## DELIVERABLES

---

### 1. Files Created

| File | Purpose |
|---|---|
| `backend/contracts/granite_review.py` | `GraniteReview` frozen dataclass |
| `backend/orchestrator/granite_review.py` | `GraniteReviewEngine` — escalation logic, prompt building, JSON parsing, fallback |
| `backend/tests/test_granite_review.py` | 27 tests across 6 test classes |

---

### 2. Files Modified

| File | Lines changed | Change |
|---|---|---|
| `backend/orchestrator/state_machine.py` | 8, 32, 89–119, 140, 161, 218, 293 | Added `GRANITE_REVIEW` phase enum, `_do_granite_review()` method, `GraniteReview` in `RecommendOutput` / `TickResult` / `_reset_tick_state()` |

---

### 3. GraniteReview Contract

```python
@dataclass(frozen=True)
class GraniteReview:
    escalation_triggered: bool = False
    review_summary: str = ""
    contradiction_analysis: str = ""
    confidence_assessment: str = ""
    recommended_action: str = ""
    granite_confidence: int = 0
    provider: str = "granite"
    skipped: bool = False
```

Frozen dataclass — all fields immutable after construction.

---

### 4. GraniteReviewEngine Design

**Architecture:**

```
GraniteReviewEngine
  ├── __init__() → creates own GraniteProvider (not via LLMGateway)
  ├── review(assessments, metrics, validation) → GraniteReview
  │   ├── _should_escalate(validation, metrics) → bool
  │   │     fracture_index >= 60 OR
  │   │     overall_confidence <= 0.50 OR
  │   │     contradiction_count > 0
  │   ├── _build_prompt(...) → str
  │   └── _parse_response(content) → GraniteReview
  └── (error handling wraps entire review() — returns fallback on failure)
```

**Key design decisions:**

| Decision | Choice | Rationale |
|---|---|---|
| **Own GraniteProvider** | Not via `LLMGateway` | Always calls Granite regardless of `KRONOS_LLM_MODE` |
| **Escalation thresholds** | fracture >= 60, confidence <= 0.50, contradiction > 0 | Covers high-fracture, low-trust, and contradictory swarm states |
| **Skipped behavior** | `skipped=True` when no escalation | Saves Granite inference cost for healthy swarms |
| **Prompt format** | Structured sections with explicit JSON schema | Guides Granite to produce parseable structured output |
| **JSON fallback** | Missing fields → defaults, parse error → fallback object | Never crashes the swarm |
| **Error handling** | `try/except` wraps entire `review()` | Returns `GraniteReview(review_summary="Granite review unavailable.")` |

**Escalation thresholds:**

| Condition | Triggers escalation |
|---|---|
| `metrics.fracture_index >= 60` | Yes |
| `validation.overall_confidence <= 0.50` | Yes |
| `validation.contradiction_count > 0` | Yes |
| None of the above | No — review is skipped |

---

### 5. State Machine Integration

```
DEBATE → ANALYZE → VALIDATE → GRANITE_REVIEW → RECOMMEND
                                        ↑
                                   new phase
```

- `GRANITE_REVIEW` added to `SwarmPhase` enum
- `_do_granite_review()` called between `_do_validate()` and `_do_recommend()`
- `granite_review` field in `RecommendOutput` and `TickResult`
- `_reset_tick_state()` clears `granite_review` each tick
- `to_legacy_dict()` includes `granite_review` key

---

### 6. Example Prompt

```
You are a Senior Intelligence Officer reviewing swarm agent analysis of a football match.

--- VALIDATION SUMMARY ---
Overall confidence: 0.45
Agreement score: 0.6
Trust score: 0.8
Contradiction count: 2
Flags: ["LOW_CONFIDENCE", "CONTRADICTORY_VERDICTS"]
Evidence summary: Multiple contradictions detected...

--- SWARM STATE ---
Fracture index: 72.0
Chaos probability: 35.0
Dominant prediction: HOME_WIN
Prediction distribution: {'HOME_WIN': 3, 'DRAW': 2}

--- AGENT ASSESSMENTS ---
Agent: Market Pragmatist (pragmatist)
  Verdict: HOME_WIN
  Confidence: 0.85
  Risk level: LOW
  Rationale: ...
...

--- INSTRUCTION ---
Review the swarm analysis above and respond with a JSON object containing exactly these fields:
  review_summary (string)
  contradiction_analysis (string)
  confidence_assessment (string)
  recommended_action (string)
  granite_confidence (integer 0-100)

Do not include any text outside the JSON object.
```

---

### 7. JSON Parsing

- Attempts `json.loads()` on response
- Strips markdown code fences if present
- Falls back to regex extraction if top-level parse fails
- Missing integer fields default to `0`, missing string fields default to `""`
- `granite_confidence` clamped to `[0, 100]`
- Total parse failure → default `GraniteReview` with `review_summary="Granite review unavailable."`

---

### 8. Test Results

```
106 passed, 110 subtests passed in 21.03s
```

**Granite Review test classes (27 new tests):**

| Class | Tests | What is verified |
|---|---|---|
| `TestGraniteReviewModel` | 3 | Defaults, escalated construction, immutability |
| `TestGraniteReviewEscalation` | 8 | Each threshold triggers, boundaries, skipped state |
| `TestGraniteReviewParsing` | 5 | Valid JSON, partial fields, empty object, invalid JSON, confidence bounds |
| `TestGraniteReviewFailureHandling` | 3 | Missing credentials, provider failure, garbage response |
| `TestGraniteReviewPromptBuilding` | 2 | Key sections present, all agents listed |
| `TestGraniteReviewStateMachineIntegration` | 5 | Phase order, type correctness, `RecommendOutput`, `TickResult`, skipped in mock mode |

All HTTP calls are mocked — no live API calls in tests.

---

### 9. Readiness Assessment

**Can Phase 3C.4 (SSE exposure of GraniteReview) now be implemented?**

**YES.**

The `GraniteReviewEngine` is a complete, tested component that:
- Evaluates swarm health via escalation rules (no inference cost when skipped)
- Calls Granite only when the swarm shows fracture, low confidence, or contradictions
- Parses structured JSON from Granite responses
- Degrades gracefully on any failure (provider down, bad JSON, missing fields)
- Integrates fully into the state machine between VALIDATE and RECOMMEND
- Exposes `granite_review` in `TickResult` and `RecommendOutput` ready for SSE serialization

Phase 3C.4 can focus purely on adding `granite_review` to the SSE payload with zero additional engine work.
