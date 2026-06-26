# Pre-Granite Integration — Repository State

**Date:** 2026-06-20
**Status:** All Phase 1–3B.1 implementation complete. Validation layer is heuristic-only, ready for Granite drop-in.

---

## 1. Completed Phases

| Phase | Description | Status |
|---|---|---|
| Phase 1 | 5-State Machine (OBSERVE → ANALYZE → DEBATE → VALIDATE → RECOMMEND) | Done |
| Phase 2 | Structured Agent Intelligence (confidence, risk_level, rationale, supporting_signals) | Done |
| Phase 3A | Heuristic Validation Layer (agreement, trust, confidence, contradictions, flags) | Done |
| Phase 3B.1 | Evidence Summary (human-readable validation reasoning) | Done |

## 2. Architecture Overview

```
Ticker ──► OBSERVE ──► ANALYZE ──► DEBATE ──► VALIDATE ──► RECOMMEND ──► SSE
                     │           │            │
                     │           │            └── SwarmFractureCalculator
                     │           │                 fracture_index
                     │           │                 agreement_score
                     │           │                 chaos_probability
                     │           │
                     │           └── 5 agents (via LLMGateway)
                     │                each returns AgentAssessment with:
                     │                - verdict / confidence / risk_level
                     │                - rationale / supporting_signals
                     │                - provider metadata
                     │
                     └── KronosMatchTicker (synthetic telemetry)
                          match_minute, score, tactical, physical,
                          psychology, game_theory, environment
```

## 3. Key Files

| File | Purpose |
|---|---|
| `backend/orchestrator/state_machine.py` | `KronosStateMachine` — drives tick pipeline, owns ticker/agents/fracture-calc/gateway/validator |
| `backend/orchestrator/validation.py` | `HeuristicValidator`, `ValidateOutput`, `ValidationFlag`, `ContradictionRecord` |
| `backend/orchestrator/core_supervisor.py` | `KronosOrchestrator` — thin wrapper that delegates to `KronosStateMachine`, produces backward-compat dict |
| `backend/orchestrator/__init__.py` | (empty) |
| `backend/agents/swarm/archetypes.py` | 5 agent classes (`MarketPragmatist`, `PsychologyMomentum`, `GameTheoryMaverick`, `RefereeProfiler`, `ChaosFriction`) |
| `backend/contracts/swarm_metrics.py` | `SwarmFractureCalculator`, `SwarmFractureMetrics` |
| `backend/contracts/telemetry_dataclasses.py` | `KronosTelemetryPacket` + sub-metric dataclasses |
| `backend/llm/gateway.py` | `LLMGateway` — routes to mock/bob/hybrid |
| `backend/llm/contracts.py` | `LLMResponse` |
| `backend/llm/mock_provider.py` | `MockProvider` — deterministic canned responses |
| `backend/llm/bob_provider.py` | `BobProvider` — external API caller |
| `backend/config/runtime.py` | `RuntimeConfig` — env-var-based configuration |
| `backend/app_server.py` | SSE HTTP server (unchanged) |

## 4. Data Models

### AgentAssessment (Phase 2)
```
agent_key: str              # e.g. "pragmatist"
agent_name: str             # e.g. "Market Pragmatist"
verdict: str                # "HIGH_RISK" | "NOMINAL" | "ELEVATED_RISK"
provider: str               # "mock" | "bob"
prompt: str                 # the prompt that was sent
confidence: float           # 0.0–1.0 (deterministic from response content)
rationale: str              # raw response text
risk_level: str             # "LOW" | "MEDIUM" | "HIGH"
supporting_signals: tuple   # signal names e.g. ("variance_threshold",)
```

### ValidateOutput (Phase 3A + 3B.1)
```
overall_confidence: float    # 0.0–1.0 (weighted: 0.35×agreement + 0.40×trust + 0.25×inverse_fracture)
agreement_score: float       # 0.0–1.0 (normalized from SwarmFractureMetrics)
trust_score: float           # 0.0–1.0 (0.5×provider_reliability + 0.5×fracture_penalty)
contradiction_count: int     # number of LOW-vs-HIGH risk_level pairs
flags: tuple                 # ValidationFlag enums
evidence_summary: str        # human-readable explanation
validation_source: str       # "heuristic"
skipped: bool                # False (when HeuristicValidator is active)
```

### ValidationFlag Enum
```
LOW_CONFIDENCE           # overall_confidence < 0.5
HIGH_FRACTURE            # fracture_index >= 60
NO_CONSENSUS             # agreement_score < 0.4
CONTRADICTORY_VERDICTS   # LOW-vs-HIGH risk_level contradiction exists
AGENT_FAILURE            # any agent uses "mock" provider
```

## 5. Test Coverage

| Test File | Tests | Subtests |
|---|---|---|
| `tests/test_llm_gateway.py` | 11 | 0 |
| `tests/test_swarm_fracture.py` | 6 | 0 |
| `tests/test_state_machine.py` | 15 | 110 |
| `tests/test_validation.py` | 26 | 0 |
| **Total** | **58** | **110** |

All tests pass deterministically — no random values, no network dependencies in test mode.

## 6. Configuration Surface

| Env Var | Default | Purpose |
|---|---|---|
| `KRONOS_LLM_MODE` | `hybrid` | `mock`, `bob`, or `hybrid` |
| `BOB_API_URL` | `https://api.bob-llm.dev/v1/chat/completions` | BOB endpoint |
| `BOB_API_KEY` | — | BOB auth |
| `BOB_PROJECT_ID` | — | BOB project |
| `BOB_MODEL_ID` | — | BOB model |

## 7. Integration Surface for Granite

The validation layer is designed for drop-in Granite replacement:

- **`ValidateOutput`** is the shared interface — heuristic and Granite produce the same type
- **`HeuristicValidator.validate()`** has the same signature that `GraniteValidator.validate()` will use
- **`KronosStateMachine._get_validator()`** can return either implementation
- **`validation_source`** field distinguishes which validator ran
- **`_PROVIDER_RELIABILITY`** already includes `"granite": 1.0` as a key
- **`granite_integration_blueprint.md`** contains the full design for Phase 3C/3D

## 8. Known Issues

- BOB API endpoint (`api.bob-llm.dev`) does not resolve — hybrid mode falls back to mock with noisy logs. Set `KRONOS_LLM_MODE=mock` to suppress.
- Ticker runs indefinitely past minute 90 — no match-end logic in Phase 1.
- IDLE, COMPLETE, and ERROR states from the design doc are not implemented.
