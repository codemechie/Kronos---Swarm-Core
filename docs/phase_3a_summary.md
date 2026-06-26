# Phase 3A — Heuristic Validation Layer

## Goal
Replace the VALIDATE phase passthrough with a deterministic `HeuristicValidator` that produces structured validation output (`agreement_score`, `trust_score`, `overall_confidence`, `contradiction_count`, `validation_flags`).

## Scope (Reduced from Design)
- Only `risk_level` for contradiction detection
- Only 5 flags: `LOW_CONFIDENCE`, `HIGH_FRACTURE`, `NO_CONSENSUS`, `CONTRADICTORY_VERDICTS`, `AGENT_FAILURE`
- Fixed thresholds (no env var overrides)
- No `GraniteValidator`
- No confidence-gap contradictions
- No anomaly-specific flags
- No advanced contradiction severity weighting

## Changes

### `backend/orchestrator/validation.py` (new)
- `ValidationFlag(str, Enum)` — 5 human-readable warning flags
- `ContradictionRecord` — dataclass for pairwise agent contradictions (agent_a, agent_b, field, value_a, value_b, severity)
- `ValidateOutput` — `overall_confidence`, `agreement_score`, `trust_score`, `contradiction_count`, `flags`, `validation_source`, `skipped`
- `HeuristicValidator` — 5 static methods + `validate()` entry point:
  - `_compute_agreement_score` — normalizes `SwarmFractureMetrics.agreement_score` (0–100) to 0.0–1.0
  - `_detect_contradictions` — compares `risk_level` for all unique agent pairs; LOW vs HIGH = severity 1.0
  - `_compute_trust_score` — weighted average of provider reliability (mock=0.5, bob=0.9) and fracture penalty (1.0 - fracture_index/100)
  - `_compute_overall_confidence` — 0.35×agreement + 0.40×trust + 0.25×inverse_fracture
  - `_determine_flags` — threshold-based flag activation

### `backend/orchestrator/state_machine.py` (updated)
- `ValidateOutput` dataclass removed (moved to `validation.py`)
- `RecommendOutput.validation: Optional[ValidateOutput]` added
- `HeuristicValidator` imported and initialized as `self.validator`
- `_do_validate()` calls `self.validator.validate(assessments, fracture_metrics, contradictions)`
- `_do_recommend()` passes `validation=self._validate_out` to `RecommendOutput`

### `backend/tests/test_validation.py` (new — 18 tests)
- `test_perfect_agreement_high_trust` — all agents agree at bob provider → high scores, no flags
- `test_high_fracture_flag` — fracture_index ≥ 60 → `HIGH_FRACTURE`
- `test_no_consensus_flag` — agreement_score < 0.4 → `NO_CONSENSUS`
- `test_low_confidence_flag` — overall_confidence < 0.5 → `LOW_CONFIDENCE`
- `test_contradictory_verdicts_flag` — LOW vs HIGH risk_level → `CONTRADICTORY_VERDICTS`
- `test_agent_failure_flag_all_mock` — all mock providers → `AGENT_FAILURE`
- `test_no_agent_failure_with_bob` — all bob providers → no `AGENT_FAILURE`
- `test_contradiction_count` — 4 agents split LOW/HIGH → 4 contradiction pairs
- `test_no_contradiction_same_risk_level` — all same or MEDIUM → 0 contradictions
- `test_agreement_score_normalization` — 75% → 0.75
- `test_trust_score_mock_providers` — mock: trust = 0.5×0.5 + 1.0×0.5 = 0.75
- `test_trust_score_bob_providers` — bob: trust = 0.9×0.5 + 1.0×0.5 = 0.95
- `test_overall_confidence_formula` — verifies exact weighted calculation
- `test_validate_output_immutable` — frozen dataclass rejects mutation
- `test_validation_source` — `validation_source == "heuristic"`, `skipped == False`
- `test_multiple_flags` — all 5 flags active simultaneously

### Existing test updates
- `tests/test_state_machine.py` — `test_validate_skipped` renamed to `test_validate_not_skipped`, asserts new fields; added `test_validation_in_recommend`
- `scripts/test_state_machine.py` — asserts `skipped is False`, checks confidence/trust bounds; prints validation data per tick

## Test Results
**50 passed**, 110 subtests across 4 test files.

## Sample Validation Output
```
Tick 1: conf=0.74 trust=0.65 flags=['CONTRADICTORY_VERDICTS', 'AGENT_FAILURE']
```
(CONTRADICTORY_VERDICTS because mock agents produce mixed HIGH/LOW risk_levels; AGENT_FAILURE because all providers are mock.)
