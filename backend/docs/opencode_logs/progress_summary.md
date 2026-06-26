# Progress Summary

## Goal
Integrate Granite provider + review engine into the Kronus swarm intelligence pipeline.

## Constraints
- Do NOT re-debug IBM access or re-verify Granite connectivity — already verified working
- Do NOT implement consensus logic, escalation logic, or frontend changes in 3C.2
- Do NOT modify validation logic, frontend contracts, or GraniteProvider after it's working
- Granite failures must degrade gracefully — never crash the swarm
- SSE exposure of GraniteReview deferred to Phase 3C.4

## Done
- Architecture audit → `backend/docs/architecture_audit.md`
- Phase 3C.1: validation block in SSE (`to_legacy_dict()`, `_build_payload()`) → `backend/docs/phase_3c1_validation_sse.md`
- Phase 3C.2: `GraniteProvider` — IAM token auth + caching, watsonx `/ml/v1/text/chat`, 30s timeout, 1 retry → `backend/llm/granite_provider.py`
- Config: `GRANITE_*`/`IBM_*` env vars in `backend/config/runtime.py`, `granite` in `ALLOWED_MODES`
- Gateway routing: `backend/llm/gateway.py` line 47-50 routes `granite` mode → `GraniteProvider`
- Phase 3C.2a: real smoke test — `GRANITE ONLINE` confirmed, response parser matches watsonx format
- Phase 3C.3: `GraniteReview` frozen dataclass → `backend/contracts/granite_review.py`
- `GraniteReviewEngine` — escalation rules (fracture >= 60, confidence <= 0.50, contradictions > 0), prompt building, JSON parsing with graceful fallback → `backend/orchestrator/granite_review.py`
- `GRANITE_REVIEW` phase added to state machine (`_do_granite_review()` between VALIDATE and RECOMMEND) → `backend/orchestrator/state_machine.py`
- `GraniteReview` in `RecommendOutput`, `TickResult`, `_reset_tick_state()`
- **All 106 tests pass (110 subtests)**

## Key Decisions
- `.env` uses `IBM_API_KEY`, `IBM_SPACE_ID` — `runtime.py` reads with `GRANITE_*` overrides
- `GraniteReviewEngine` has its own `GraniteProvider` instance (not via `LLMGateway`) — always calls Granite regardless of `KRONOS_LLM_MODE`
- Error handling wraps `review()` — returns fallback `GraniteReview(review_summary="Granite review unavailable.")` on failure
- Escalation thresholds: fracture >= 60, confidence <= 0.50, contradiction_count > 0
- All engine tests mock `GraniteProvider` to avoid live HTTP

## Next Steps
1. Phase 3C.4 — Expose GraniteReview through SSE payload
2. Phase 3C.5+ — Frontend War Room panels

## Relevant Files
- `backend/llm/granite_provider.py` — GraniteProvider
- `backend/llm/gateway.py` — granite mode routing (line 47-50)
- `backend/config/runtime.py` — Granite config from `IBM_*` or `GRANITE_*`
- `backend/contracts/granite_review.py` — GraniteReview dataclass
- `backend/orchestrator/granite_review.py` — GraniteReviewEngine
- `backend/orchestrator/state_machine.py` — GRANITE_REVIEW phase
- `backend/orchestrator/validation.py` — ValidateOutput with `validation_source`
- `backend/scripts/granite_smoke_test.py` — real end-to-end smoke test
- `backend/tests/test_granite_review.py` — 27 tests for model, escalation, parsing, failure, prompt, integration
- `backend/tests/test_llm_gateway.py` — GraniteProvider init, IAM, inference, routing, retry tests
- `backend/tests/test_state_machine.py` — phase order + legacy dict shape
