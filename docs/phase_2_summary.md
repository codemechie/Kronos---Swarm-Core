# Phase 2 — Structured Agent Intelligence

## Goal
Upgrade agent outputs from raw strings to structured assessments (`confidence`, `rationale`, `risk_level`, `supporting_signals`) while preserving backward compatibility for the frontend.

## Constraints & Preferences
- `debate_outputs` dict must continue returning raw strings — frontend unchanged
- Structured assessments live in `AgentAssessment` internally
- No Granite integration yet
- Confidence bounds: 0.0–1.0
- Risk levels: LOW, MEDIUM, HIGH (derived deterministically from LLM response content)
- All 18 existing backend tests must pass

## Changes

### `backend/orchestrator/state_machine.py`
- **`AgentAssessment`** — 4 new fields with defaults:
  - `confidence: float = 0.0`
  - `rationale: str = ""`
  - `risk_level: str = "LOW"`  (one of LOW, MEDIUM, HIGH)
  - `supporting_signals: Tuple[str, ...] = ()`
- **`_parse_assessment_from_content()`** — static method that deterministically extracts structured fields from raw LLM response content:
  - `"High-risk"` in content → verdict=`HIGH_RISK`, confidence=`0.81`, risk_level=`HIGH`, signals=`("variance_threshold",)`
  - `"Nominal"` in content → verdict=`NOMINAL`, confidence=`0.62`, risk_level=`LOW`, signals=`()`
  - Fallback → verdict=`ELEVATED_RISK`, confidence=`0.70`, risk_level=`MEDIUM`, signals=`("anomaly_detected",)`
- **`_do_analyze()`** — calls parser, populates structured fields on `AgentAssessment`. `debate_outputs` still stores raw `response.content`.
- No changes to `TickResult`, `AnallyzeOutput`, or any other dataclass.

### `backend/scripts/test_state_machine.py`
- Added assertions for structured fields (confidence bounds, risk_level values, supporting_signals type, verdict values).

### `backend/tests/test_state_machine.py` (new — 15 tests)
- `TestParseAssessmentFromContent` (3 tests) — structured output creation from raw strings
- `TestAgentAssessmentStructuredFields` (5 tests) — confidence bounds, risk classification, verdict values, supporting signals
- `TestBackwardCompatibility` (3 tests) — debate_outputs remain raw strings, legacy dict shape, assessments excluded from legacy dict
- `TestTickResult` (4 tests) — phase output integrity

## Design Decisions
- Parser is **deterministic** (no random) — keeps tests stable and predictable regardless of LLM provider
- Default values on new `AgentAssessment` fields ensure any code constructing assessments without them still works
- `_parse_assessment_from_content` is `@staticmethod` — easy to unit test in isolation
- Environment reset (`KRONOS_LLM_MODE=mock`) in test `setUp`/`tearDown` prevents BOB DNS failures from leaking between test files

## Test Results
**33 passed**, 110 subtests (18 existing + 15 new).
All 33 tests pass, all 110 subtests pass.
