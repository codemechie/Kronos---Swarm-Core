# Granite Integration Blueprint — Kronos Swarm Core

**Status:** Design Document (not implemented)
**Target:** `backend/llm/granite_provider.py`, `backend/orchestrator/validation.py` (extend)
**Design Date:** 2026-06-20

---

## 1. Granite Provider Architecture

### 1.1 Provider Class

The `GraniteProvider` follows the same pattern as `BobProvider` but is dedicated to the validation task rather than agent prompt execution.

```
backend/
  llm/
    contracts.py          ← LLMResponse (unchanged)
    gateway.py            ← LLMGateway (unchanged)
    bob_provider.py       ← BobProvider (existing pattern)
    granite_provider.py   ← NEW: GraniteProvider
    mock_provider.py      ← MockProvider (unchanged)
  orchestrator/
    validation.py         ← EXTEND: GraniteValidator
    state_machine.py      ← UPDATE: validator selection
```

```python
class GraniteProvider:
    """LLM provider for structured validation using IBM Granite.

    Unlike BobProvider which returns free-text responses for agent
    prompts, GraniteProvider returns a structured JSON response
    that maps directly to ValidateOutput fields.
    """

    def __init__(self, config: GraniteConfig) -> None:
        self.api_url = config.api_url
        self.api_key = config.api_key
        self.project_id = config.project_id
        self.model_id = config.model_id
        self.timeout = config.timeout_seconds

    def validate(
        self,
        assessments: Dict[str, AgentAssessment],
        fracture_metrics: SwarmFractureMetrics,
        telemetry: KronosTelemetryPacket,
        contradictions: Tuple[str, ...],
        anomalies: Tuple[str, ...],
    ) -> GraniteValidationResponse:
        """Send a structured validation prompt to Granite and return
        the parsed JSON response. Does NOT return ValidateOutput
        directly — the GraniteValidator wrapper handles that mapping.
        """
        ...
```

### 1.2 Configuration

```python
from dataclasses import dataclass

@dataclass
class GraniteConfig:
    api_url: str = "https://api.ibm.com/granite/v1/chat/completions"
    api_key: str | None = None
    project_id: str | None = None
    model_id: str = "ibm-granite-13b-chat"
    timeout_seconds: int = 30
    temperature: float = 0.0       # deterministic output for validation
    max_tokens: int = 512           # validation output is compact
```

### 1.3 GraniteValidator (Orchestrator-Level)

```python
from backend.llm.granite_provider import GraniteProvider, GraniteConfig

class GraniteValidator:
    """Validation layer powered by IBM Granite.

    Falls back to HeuristicValidator when Granite is unavailable
    or when validation_source="granite+heuristic".
    """

    def __init__(
        self,
        provider: GraniteProvider,
        heuristic_fallback: HeuristicValidator,
        mode: str = "granite",  # "granite" | "granite+heuristic"
    ) -> None:
        self._provider = provider
        self._fallback = heuristic_fallback
        self._mode = mode

    def validate(self, ...) -> ValidateOutput:
        if self._mode == "granite":
            return self._validate_granite(...)
        # granite+heuristic: blend both results
        return self._validate_blended(...)

    def _validate_granite(self, ...) -> ValidateOutput:
        try:
            raw = self._provider.validate(...)
            return self._map_to_validate_output(raw)
        except Exception:
            return self._fallback.validate(...)
```

---

## 2. Runtime Flow

### 2.1 Tick Sequence (Granite Mode)

```
OBSERVE → ANALYZE → DEBATE → VALIDATE → RECOMMEND
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              Heuristic                    Granite
              (fast path)                  (validation API call)
                    │                           │
                    │                    ┌──────┴──────┐
                    │                    │             │
                    │               Success         Failure
                    │                    │             │
                    │                    ▼             ▼
                    │           Parse JSON       Fallback to
                    │           → ValidateOutput  HeuristicValidator
                    │                    │             │
                    └──────────┬─────────┘─────────────┘
                               ▼
                         RECOMMEND
```

### 2.2 ValidationSource Values

| `validation_source` | Meaning | How `overall_confidence` is computed |
|---|---|---|
| `"heuristic"` | Only heuristic rules ran | `0.35×agreement + 0.40×trust + 0.25×inverse_fracture` |
| `"granite"` | Granite API succeeded | Granite's own confidence score (0.0–1.0) |
| `"granite+heuristic"` | Both ran; results blended | `0.50×granite_confidence + 0.50×heuristic_confidence` |
| `"heuristic_fallback"` | Granite failed; heuristic used | Same as `heuristic` but source distinguishes |

### 2.3 Validator Selection in State Machine

```python
# Inside KronosStateMachine.__init__
self._heuristic_validator = HeuristicValidator()
self._granite_validator: Optional[GraniteValidator] = None

if cfg.granite_enabled:
    provider = GraniteProvider(cfg.granite_config)
    self._granite_validator = GraniteValidator(
        provider=provider,
        heuristic_fallback=self._heuristic_validator,
        mode=cfg.granite_mode,  # "granite" or "granite+heuristic"
    )

def _get_validator(self) -> HeuristicValidator | GraniteValidator:
    if self._granite_validator is not None:
        return self._granite_validator
    return self._heuristic_validator
```

---

## 3. Prompt Design

### 3.1 System Prompt

```
You are a validation analyst for a football match AI swarm. Your task is to
evaluate the quality and consistency of agent assessments and return a
structured JSON analysis. Be concise and deterministic. Use only the data
provided. Do not speculate.
```

### 3.2 User Prompt Template

```
VALIDATE the following swarm intelligence output for minute {minute} of the match.

## Match Context
- Score: {score_home}-{score_away}
- Phase: {match_phase}
- Minutes elapsed: {minute}

## Agent Assessments
{for each agent}
Agent: {agent_key} ({agent_name})
  Verdict: {verdict}
  Confidence: {confidence}
  Risk Level: {risk_level}
  Rationale: {rationale}
  Supporting Signals: {supporting_signals}
  Provider: {provider}
{end for}

## Swarm Metrics
- Fracture Index: {fracture_index}/100
- Agreement Score: {agreement_score}%
- Chaos Probability: {chaos_probability}%
- Dominant Prediction: {dominant_prediction}
- Prediction Distribution: {prediction_distribution}

## Detected Contradictions
{contradictions or "None detected"}

## Telemetry Anomalies
{anomalies or "None detected"}

Return a JSON object with the following structure:
{output_schema}
```

### 3.3 Output Schema Injected into Prompt

```
{
  "overall_confidence": <float 0.0-1.0>,
  "per_agent_confidence": {
    "<agent_key>": <float 0.0-1.0>,
    ...
  },
  "agreement_quality": "<string: 'strong'|'moderate'|'weak'|'conflicting'>",
  "contradictions_detected": <int>,
  "contradiction_details": [
    {
      "agent_a": "<key>",
      "agent_b": "<key>",
      "nature": "<string e.g. 'opposing_risk_levels'>",
      "severity": <float 0.0-1.0>
    }
  ],
  "flags": ["<flag_string>", ...],
  "evidence_summary": "<string: 1-2 sentences explaining key signals>"
}
```

---

## 4. Expected JSON Response Schema

### 4.1 GraniteValidationResponse

```python
from dataclasses import dataclass, field
from typing import Dict, List, Optional

@dataclass(frozen=True)
class ContradictionDetail:
    agent_a: str
    agent_b: str
    nature: str
    severity: float

@dataclass(frozen=True)
class GraniteValidationResponse:
    """Raw structured response from the Granite validation API."""

    overall_confidence: float                        # 0.0–1.0
    per_agent_confidence: Dict[str, float]           # agent_key → 0.0–1.0
    agreement_quality: str                            # strong|moderate|weak|conflicting
    contradictions_detected: int
    contradiction_details: List[ContradictionDetail]
    flags: List[str]                                  # validation flag strings
    evidence_summary: str                             # natural-language summary
    raw_response: str                                 # original JSON for debugging/tracing
```

### 4.2 Example Response

```json
{
  "overall_confidence": 0.72,
  "per_agent_confidence": {
    "pragmatist": 0.85,
    "mood_ring": 0.62,
    "gambler": 0.78,
    "judge": 0.44,
    "anarchist": 0.91
  },
  "agreement_quality": "moderate",
  "contradictions_detected": 2,
  "contradiction_details": [
    {
      "agent_a": "judge",
      "agent_b": "anarchist",
      "nature": "opposing_risk_levels",
      "severity": 1.0
    },
    {
      "agent_a": "mood_ring",
      "agent_b": "pragmatist",
      "nature": "confidence_gap",
      "severity": 0.4
    }
  ],
  "flags": ["CONTRADICTORY_VERDICTS"],
  "evidence_summary": "Anarchist and Judge show opposing risk assessments. Mood Ring confidence is notably lower than Pragmatist, suggesting psychological factors may be diverging from market indicators."
}
```

---

## 5. Confidence Scoring Strategy

### 5.1 Granite-Only Mode

When `validation_source == "granite"`:

```
ValidateOutput.overall_confidence = GraniteValidationResponse.overall_confidence
ValidateOutput.trust_score        = computed from:
    - provider_reliability = _PROVIDER_RELIABILITY["granite"]  (1.0)
    - fracture_penalty     = 1.0 - fracture_index / 100.0
    - matched_agents       = how many per_agent_confidences Granite returned
                              (fewer than 5 = penalty)
    - trust                = 1.0 * 0.3 + fracture_penalty * 0.3
                             + (matched_agents/5) * 0.4

ValidateOutput.agreement_score    = mapped from agreement_quality:
    "strong"      → 0.85
    "moderate"    → 0.60
    "weak"        → 0.35
    "conflicting" → 0.15

ValidateOutput.contradiction_count = GraniteValidationResponse.contradictions_detected
ValidateOutput.flags               = mapped from Granite flag strings
```

### 5.2 Blended Mode

When `validation_source == "granite+heuristic"`:

```
granite_overall = GraniteValidationResponse.overall_confidence
heuristic_overall = HeuristicValidator result.overall_confidence

ValidateOutput.overall_confidence = 0.50 * granite_overall + 0.50 * heuristic_overall

# Flags are unioned (any flag from either validator is included)
ValidateOutput.flags = sorted(set(granite_flags + heuristic_flags))
```

### 5.3 Fallback Mode

When `validation_source == "heuristic_fallback"`:

Identical to `heuristic` mode but `validation_source` is set to `"heuristic_fallback"` so consumers can distinguish "Granite was tried and failed" from "Granite is not configured."

---

## 6. Fallback Strategy

### 6.1 Fallback Chain

```
1. KRONOS_VALIDATION_MODE != "granite"
   ─────────────────────────────────────
   → Use HeuristicValidator directly.
     validation_source = "heuristic"

2. KRONOS_VALIDATION_MODE == "granite", Granite succeeds
   ──────────────────────────────────────────────────────
   → Use GraniteValidator.
     validation_source = "granite"

3. KRONOS_VALIDATION_MODE == "granite", Granite fails
   ───────────────────────────────────────────────────
   → Fall back to HeuristicValidator.
     validation_source = "heuristic_fallback"
     Flags include: the original heuristic flags
                    + no additional error flag (silent)

4. KRONOS_VALIDATION_MODE == "granite+heuristic", Granite succeeds
   ────────────────────────────────────────────────────────────────
   → Blend both results.
     validation_source = "granite+heuristic"

5. KRONOS_VALIDATION_MODE == "granite+heuristic", Granite fails
   ─────────────────────────────────────────────────────────────
   → Use HeuristicValidator only.
     validation_source = "heuristic_fallback"
```

### 6.2 Error Classification

| Error Type | Action | Log Level |
|---|---|---|
| Network timeout (`URLError`) | Retry 1×, then fallback | `warning` |
| HTTP 4xx (auth, rate limit) | No retry, immediate fallback | `error` |
| HTTP 5xx (server error) | Retry 1×, then fallback | `warning` |
| JSON parse error | No retry, fallback | `error` |
| Missing required fields in response | No retry, fallback | `error` |
| Out-of-range confidence values | Clamp to [0.0, 1.0], proceed | `warning` |

---

## 7. Failure Handling

### 7.1 GraniteValidator.validate() Implementation

```python
def validate(self, ...) -> ValidateOutput:
    if self._mode not in ("granite", "granite+heuristic"):
        return self._fallback.validate(...)

    heuristic_result = None
    if self._mode == "granite+heuristic":
        heuristic_result = self._fallback.validate(...)

    try:
        raw = self._provider.validate(...)
        parsed = self._parse_and_validate_response(raw)
        granite_result = self._map_to_validate_output(parsed)

        if self._mode == "granite":
            return granite_result

        # Blended mode
        return self._blend(granite_result, heuristic_result)

    except GraniteAuthError:
        logger.error("[VALIDATION] Granite auth failed — falling back")
    except GraniteTimeoutError:
        logger.warning("[VALIDATION] Granite timed out — falling back")
    except GraniteResponseError as e:
        logger.error("[VALIDATION] Granite returned invalid data: %s", e)
    except Exception as e:
        logger.exception("[VALIDATION] Unexpected Granite error: %s", e)

    # All failures land here
    result = heuristic_result or self._fallback.validate(...)
    object.__setattr__(result, "validation_source", "heuristic_fallback")
    return result
```

### 7.2 Tick Pipeline Guarantee

- **Validation must never block the tick.** If Granite is slow, the tick proceeds with heuristic data after a timeout.
- The timeout is configurable (default 30s). A 30s stall on a 1-minute tick cycle is acceptable for a single tick but not multiple consecutive ticks.
- **Circuit breaker pattern** (optional): If Granite fails N times consecutively, auto-disable Granite for the remainder of the match.

---

## 8. Cost Considerations

### 8.1 Token Budget Per Validation Call

| Component | Est. Tokens |
|---|---|
| System prompt | ~50 |
| Agent assessments (5 agents) | ~500 |
| Match context + metrics | ~100 |
| Contradiction list | ~50 |
| Output schema instruction | ~100 |
| **Total input** | **~800 tokens** |
| Expected output | ~200 tokens |
| **Total per tick** | **~1,000 tokens** |

### 8.2 Per-Match Cost

| Duration | Ticks | Total Tokens | Est. Cost (Granite) |
|---|---|---|---|
| Full match | 90 | 90,000 | ~$0.02–0.05 |
| Development/testing | 1,000 ticks | 1,000,000 | ~$0.20–0.50 |

### 8.3 Cost Optimization

| Strategy | Savings | Trade-off |
|---|---|---|
| Validate every Nth tick (e.g., every 5) | ~80% | Gaps in validation data for UI |
| Validate only on anomalies | ~70% | Misses silent quality degradation |
| Validate only in CHAOS phase | ~66% | No validation in GRIND/WEATHER |
| Cache identical states | Low (ticks are unique) | Complexity not worth savings |

**Recommendation:** Start with full-match validation (90 calls per match) for maximum data. Add tick skipping as an opt-in config later.

---

## 9. Latency Considerations

### 9.1 Expected Latency Budget

| Segment | Time |
|---|---|
| Prompt serialization | < 1ms |
| Network round-trip | 200–3,000ms |
| Granite inference | 1,000–5,000ms |
| Response parsing | < 1ms |
| Fallback execution (if needed) | < 1ms |
| **Total (success)** | **1.2–8s** |
| **Total (timeout + fallback)** | **~30s + 1ms** |

### 9.2 Impact on Tick Cycle

Current tick cycle (mock mode): ~50ms.
Tick cycle with heuristic validation: ~50ms.
Tick cycle with Granite validation: ~1–8s.

A 90-minute match at 1 tick/second currently takes 90s.
With Granite validation, it takes 90–720s (1.5–12 minutes).

**Acceptability:** Since this is not real-time (the ticker is simulated), 1–8s per tick is acceptable for demo and analysis purposes. The ticker advances synthetic time, not wall-clock time.

### 9.3 Non-Blocking Validation (Future Enhancement)

For real-time use cases, validation can be decoupled:

```
Main tick pipeline (fast):
  OBSERVE → ANALYZE → DEBATE → VALIDATE (heuristic only) → RECOMMEND → SSE push

Background (async):
  Granite validation runs in parallel, results available via polling or callback
  → stored in TickResult for frontend to fetch later
```

This doubles the SSE payload or adds a second SSE channel for updates.

---

## 10. Integration Points

### 10.1 Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `KRONOS_GRANITE_ENABLED` | `"false"` | Master switch for Granite validation |
| `KRONOS_GRANITE_API_URL` | `"https://api.ibm.com/granite/v1/chat/completions"` | Granite API endpoint |
| `KRONOS_GRANITE_API_KEY` | — | API key (required if enabled) |
| `KRONOS_GRANITE_PROJECT_ID` | — | Project/space identifier |
| `KRONOS_GRANITE_MODEL_ID` | `"ibm-granite-13b-chat"` | Model identifier |
| `KRONOS_GRANITE_TIMEOUT` | `"30"` | Timeout in seconds |
| `KRONOS_GRANITE_MODE` | `"granite"` | `"granite"` or `"granite+heuristic"` |
| `KRONOS_GRANITE_TEMPERATURE` | `"0.0"` | LLM temperature (0.0 = deterministic) |

### 10.2 RuntimeConfig Extensions

```python
# ── Granite validation ─────────────────────────────────────
self.granite_enabled: bool = os.environ.get("KRONOS_GRANITE_ENABLED", "false").lower() == "true"
self.granite_api_url: str = os.environ.get(
    "KRONOS_GRANITE_API_URL",
    "https://api.ibm.com/granite/v1/chat/completions",
)
self.granite_api_key: str | None = os.environ.get("KRONOS_GRANITE_API_KEY")
self.granite_project_id: str | None = os.environ.get("KRONOS_GRANITE_PROJECT_ID")
self.granite_model_id: str = os.environ.get("KRONOS_GRANITE_MODEL_ID", "ibm-granite-13b-chat")
self.granite_timeout: int = int(os.environ.get("KRONOS_GRANITE_TIMEOUT", "30"))
self.granite_mode: str = os.environ.get("KRONOS_GRANITE_MODE", "granite").strip().lower()
self.granite_temperature: float = float(os.environ.get("KRONOS_GRANITE_TEMPERATURE", "0.0"))
```

### 10.3 State Machine Changes

| File | Change |
|---|---|
| `state_machine.py` | `__init__` conditionally initializes `GraniteValidator`; `_get_validator()` returns appropriate validator |
| `validation.py` | Add `GraniteValidator` class, `GraniteValidationResponse` dataclass, `map_to_validate_output()`, `blend()` |
| `llm/granite_provider.py` | **New** — `GraniteProvider` class with `validate()` method |
| `config/runtime.py` | Add Granite env vars (section 10.2) |
| `tests/test_granite_validation.py` | **New** — unit tests for provider, validator, mapping, blending, fallback |

---

## 11. Migration Strategy

### 11.1 Phase 3B — Heuristic Only (Current)

```
KRONOS_GRANITE_ENABLED=false
validation_source = "heuristic"
```

State machine always uses `HeuristicValidator`. No Granite code is loaded or initialized.

### 11.2 Phase 3C — Granite Side-by-Side

```
KRONOS_GRANITE_ENABLED=true
KRONOS_GRANITE_MODE=granite
```

State machine initializes both validators. `GraniteValidator` is the primary:
- Granite API is called every tick
- On success: `validation_source = "granite"`, output derived from Granite JSON
- On failure: `validation_source = "heuristic_fallback"`, heuristic output used
- All existing tests pass (validation interface unchanged)

**Testing additions:**
- `test_granite_success` — mock Granite API returns valid JSON → Verify `ValidateOutput`
- `test_granite_timeout` — mock timeout → Verify heuristic fallback
- `test_granite_bad_json` — mock garbage response → Verify heuristic fallback
- `test_granite_auth_error` — mock 401 → Verify heuristic fallback
- `test_validation_source_tracking` — Verify source string in each scenario

### 11.3 Phase 3D — Blended Validation

```
KRONOS_GRANITE_ENABLED=true
KRONOS_GRANITE_MODE=granite+heuristic
```

Both validators run every tick. Results are blended:
- `overall_confidence` = 50% Granite + 50% heuristic
- Flags are unioned
- `validation_source = "granite+heuristic"`

**Testing additions:**
- `test_blended_confidence` — both validators produce known values → Verify weighted average
- `test_blended_flags` — different flags from each validator → Verify union
- `test_blended_fallback` — Granite fails in blended mode → Fallback to heuristic only

### 11.4 Rollback

Any of the three modes can be activated by changing one environment variable. No code changes needed. This enables:
- **A/B testing**: Run matches in heuristic vs granite mode and compare outputs
- **Cost control**: Use heuristic for development, granite for production matches
- **Circuit break**: Auto-switch from granite to heuristic on repeated failures

---

## 12. Response Mapping

### 12.1 Granite JSON → ValidateOutput

```python
_AGREEMENT_QUALITY_MAP = {
    "strong": 0.85,
    "moderate": 0.60,
    "weak": 0.35,
    "conflicting": 0.15,
}

_FLAG_MAP = {
    "low_confidence": ValidationFlag.LOW_CONFIDENCE,
    "high_fracture": ValidationFlag.HIGH_FRACTURE,
    "no_consensus": ValidationFlag.NO_CONSENSUS,
    "contradictory_verdicts": ValidationFlag.CONTRADICTORY_VERDICTS,
    "agent_failure": ValidationFlag.AGENT_FAILURE,
    # Future flags (Granite may introduce new ones):
    "environmental_anomaly": None,  # mapped in later phases
    "partial_data": None,
}

def _map_to_validate_output(self, raw: GraniteValidationResponse) -> ValidateOutput:
    confidence = max(0.0, min(1.0, raw.overall_confidence))

    agreement = _AGREEMENT_QUALITY_MAP.get(raw.agreement_quality, 0.5)

    trust = self._compute_granite_trust(raw)

    flags: List[ValidationFlag] = []
    for flag_str in raw.flags:
        mapped = _FLAG_MAP.get(flag_str.lower())
        if mapped is not None:
            flags.append(mapped)

    return ValidateOutput(
        overall_confidence=round(confidence, 4),
        agreement_score=agreement,
        trust_score=round(trust, 4),
        contradiction_count=raw.contradictions_detected,
        flags=tuple(flags),
        validation_source="granite",
        skipped=False,
    )
```

### 12.2 Blending

```python
def _blend(self, granite: ValidateOutput, heuristic: ValidateOutput) -> ValidateOutput:
    return ValidateOutput(
        overall_confidence=round(
            0.5 * granite.overall_confidence + 0.5 * heuristic.overall_confidence,
            4,
        ),
        agreement_score=round(
            0.5 * granite.agreement_score + 0.5 * heuristic.agreement_score,
            4,
        ),
        trust_score=round(
            0.5 * granite.trust_score + 0.5 * heuristic.trust_score,
            4,
        ),
        contradiction_count=max(granite.contradiction_count, heuristic.contradiction_count),
        flags=tuple(sorted(set(granite.flags) | set(heuristic.flags))),
        validation_source="granite+heuristic",
        skipped=False,
    )
```

---

## 13. File Manifest

| File | Action | Purpose |
|---|---|---|
| `backend/llm/granite_provider.py` | **Create** | `GraniteProvider` — HTTP client for Granite validation API, prompt construction, response parsing |
| `backend/orchestrator/validation.py` | **Extend** | Add `GraniteValidator`, `GraniteValidationResponse`, `ContradictionDetail`, mapping tables, blend logic |
| `backend/orchestrator/state_machine.py` | **Update** | Conditional `GraniteValidator` init, `_get_validator()` returns correct validator |
| `backend/config/runtime.py` | **Extend** | Add Granite env vars (`KRONOS_GRANITE_*`) |
| `backend/tests/test_granite_validation.py` | **Create** | Provider tests, validator tests, mapping tests, blend tests, fallback tests |
| `backend/tests/test_state_machine.py` | **Update** | Tests for granite config paths in state machine |

---

## 14. Test Plan (Conceptual)

| Test | Granite Mode | What It Verifies |
|---|---|---|
| `test_granite_success` | granite | Valid JSON → ValidateOutput with correct confidence, flags, contradiction_count |
| `test_granite_timeout_fallback` | granite | Timeout → heuristic_fallback with same ValidateOutput shape |
| `test_granite_auth_error_fallback` | granite | 401 → heuristic_fallback |
| `test_granite_bad_json_fallback` | granite | Garbage response → heuristic_fallback |
| `test_granite_out_of_range_clamp` | granite | Granite returns confidence=1.5 → clamped to 1.0 |
| `test_granite_unmapped_flag` | granite | Unknown flag string → ignored (not in flags tuple) |
| `test_granite_agreement_quality_mapping` | granite | "strong"→0.85, "weak"→0.35 |
| `test_blended_confidence` | granite+heuristic | Average of both validator scores |
| `test_blended_flags_union` | granite+heuristic | Different flags from each → all present |
| `test_blended_granite_failure` | granite+heuristic | Granite fails → heuristic result, source="heuristic_fallback" |
| `test_granite_disabled` | (none) | Heuristic runs, source="heuristic" |
| `test_granite_enabled_config` | granite | State machine initializes GraniteValidator |
| `test_granite_trust_score` | granite | Trust formula uses provider=1.0 + fracture_penalty + agent match ratio |
| `test_circuit_breaker` | granite | N consecutive failures → auto-disable for match |

---

## 15. Design Decisions

| Decision | Rationale |
|---|---|
| **GraniteProvider is separate from LLMGateway** | LLMGateway routes agent prompts (free-text). GraniteProvider handles structured validation (JSON). Different API semantics, different call patterns, different configuration. |
| **GraniteValidator wraps GraniteProvider, not extends HeuristicValidator** | `HeuristicValidator` and `GraniteValidator` are siblings under the same `validate()` signature. Composition over inheritance. |
| **Granite temperature = 0.0** | Validation must be deterministic. Temperature 0.0 minimizes output variance for the same input. |
| **Granite response is JSON, not free-text** | Structured output maps directly to `ValidateOutput` without NLP parsing. Failures are detectable (JSON parse error = fallback). |
| **Flags are manually mapped, not passed through** | Granite may invent new flag names. Mapping ensures only known flags enter the system. Unknown flags are logged and ignored. |
| **Blended mode averages confidence, unions flags** | Hedging strategy: Granite catches what heuristics miss and vice versa. The union of flags is the most conservative (safest) output. |
| **Circuit breaker is optional, not required for v1** | The fallback chain already handles transient failures. Circuit breaker is a cost-optimization, not a correctness requirement. |
| **`validation_source` distinguishes 4 states** | Consumers (UI, analytics, debugging) can see exactly which validation strategy produced each tick. Essential for A/B comparison and trust. |
