# Phase 1 — 5-State Machine Implementation

## Goal
Implement Phase 1 of a 5-state machine (OBSERVE → ANALYZE → DEBATE → VALIDATE → RECOMMEND) for Kronos Swarm Core, keeping all logic in one class and maintaining 100% backward compatibility.

## Constraints & Preferences
- No IDLE or COMPLETE states
- No Strategy Pattern — all logic in one `KronosStateMachine` class
- No Granite integration yet (VALIDATE phase is a passthrough)
- Use immutable dataclasses for phase outputs
- Must not break existing frontend (SSE packet shape unchanged)
- All 18 existing backend tests must pass

## Progress

### Done
- Designed and documented full state machine architecture in `docs/state_machine_design.md`
- Created `backend/orchestrator/state_machine.py` with:
  - `KronosStateMachine` class
  - `KronosPhase` enum (OBSERVE, ANALYZE, DEBATE, VALIDATE, RECOMMEND)
  - 5 phase output dataclasses (`ObserveOutput`, `AnalyzeOutput`, `DebateOutput`, `ValidateOutput`, `RecommendOutput`)
  - `AgentAssessment` dataclass
  - `TickResult` dataclass
- Refactored `backend/orchestrator/core_supervisor.py` to delegate `process_next_tick()` to `state_machine.transition()` + `state_machine.to_legacy_dict()`
- All 18 tests pass
- State machine smoke-tested: correct phase sequence, 5 agents per tick, anomaly detection, proper match_phase derivation
- Frontend TypeScript compiles clean (`npx tsc --noEmit`)

### Blocked
- BOB API endpoint DNS-fails (`api.bob-llm.dev` does not resolve) — default `KRONOS_LLM_MODE=hybrid` tries BOB twice per agent per tick then falls back to mock, producing noisy logs but correct behavior

## Key Decisions
- `VALIDATE` phase returns `ValidateOutput(skipped=True)` immediately — future Granite integration adds real logic
- `to_legacy_dict()` converts `TickResult` to the exact dict shape the old orchestrator returned (keys: `telemetry`, `debate_outputs`, `swarm_metrics`, `provider_metadata`) — frontend `normalizeKronosPacket()` uses `??` on every field so additive changes are safe
- `KronosStateMachine` owns ticker, agents, fracture calculator, and gateway directly — orchestrator just delegates
- Phase output dataclasses are `@dataclass(frozen=True)` — immutable per tick
- Urgency (STABLE/WATCH/CRITICAL) derived from fracture_index thresholds (>=80 CRITICAL, >=40 WATCH)

## Relevant Files
- `backend/orchestrator/state_machine.py` — New: `KronosStateMachine`, `KronosPhase`, phase handlers, `TickResult`, `to_legacy_dict()`
- `backend/orchestrator/core_supervisor.py` — Refactored: delegates to state machine
- `docs/state_machine_design.md` — Architecture design document
- `backend/contracts/swarm_metrics.py` — Unchanged: `SwarmFractureCalculator.calculate()` called from DEBATE phase
- `backend/agents/swarm/archetypes.py` — Unchanged: agent prompt builders called from ANALYZE phase
- `backend/app_server.py` — Unchanged: consumes orchestrator output identically
- `backend/scripts/test_state_machine.py` — Smoke test script
