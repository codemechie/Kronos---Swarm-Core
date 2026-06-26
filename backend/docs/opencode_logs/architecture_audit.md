# KRONOS ARCHITECTURE AUDIT

---

## SECTION 1 — FILE TREE

```
backend/
├── __init__.py
├── app_server.py
├── .env
├── agents/
│   └── swarm/
│       └── archetypes.py
├── config/
│   ├── __init__.py
│   └── runtime.py
├── contracts/
│   ├── swarm_metrics.py
│   └── telemetry_dataclasses.py
├── docs/
│   └── bob_validation_report.md
├── llm/
│   ├── __init__.py
│   ├── base.py
│   ├── bob_provider.py
│   ├── contracts.py
│   ├── gateway.py
│   └── mock_provider.py
├── orchestrator/
│   ├── core_supervisor.py
│   ├── state_machine.py
│   └── validation.py
├── scripts/
│   ├── bob_smoke_test.py
│   ├── test_bob_provider.py
│   └── test_state_machine.py
├── tests/
│   ├── __init__.py
│   ├── test_llm_gateway.py
│   ├── test_state_machine.py
│   ├── test_swarm_fracture.py
│   └── test_validation.py
└── utils/
    └── kronos_ticker.py
```

**Note:** The directories `core/`, `providers/`, `services/`, `validators/`, `models/` do not exist. Providers live in `llm/`, validation in `orchestrator/validation.py`, models in `contracts/` and `orchestrator/state_machine.py`.

---

## SECTION 2 — STATE MACHINE

**File:** `backend/orchestrator/state_machine.py:107`

**Public methods:**

| Method | Line | Signature |
|---|---|---|
| `transition()` | 135 | `() -> TickResult` |
| `get_current_phase()` | 156 | `() -> KronosPhase` |
| `to_legacy_dict()` | 346 | `(result: TickResult) -> Dict[str, Any]` |

**Phase flow:**

```python
def transition(self) -> TickResult:
    self.tick_count += 1
    self.current_phase = KronosPhase.OBSERVE
    self._reset_tick_state()
    self._do_observe()      # Phase 1 — generate telemetry
    self._do_analyze()      # Phase 2 — run 5 agents
    self._do_debate()       # Phase 3 — fracture calculation
    self._do_validate()     # Phase 4 — heuristic validation
    self._do_recommend()    # Phase 5 — assemble output
    self.current_phase = KronosPhase.RECOMMEND
    return TickResult(phase=KronosPhase.RECOMMEND, ...)
```

**`TickResult` structure** (`state_machine.py:83`):

```python
@dataclass(frozen=True)
class TickResult:
    phase: KronosPhase
    observe: Optional[ObserveOutput] = None
    analyze: Optional[AnalyzeOutput] = None
    debate: Optional[DebateOutput] = None
    validate: Optional[ValidateOutput] = None
    recommend: Optional[RecommendOutput] = None
```

**`KronosPhase` enum** (`state_machine.py:25`):

```python
class KronosPhase(Enum):
    OBSERVE = auto()
    ANALYZE = auto()
    DEBATE = auto()
    VALIDATE = auto()
    RECOMMEND = auto()
```

---

## SECTION 3 — AGENT EXECUTION

**1. Which file runs the swarm?** `backend/orchestrator/state_machine.py` — inside `_do_analyze()` at line 223.

**2. How are agents instantiated?**

```python
# state_machine.py:119 — inside __init__
self._agents: List[Tuple[str, Any]] = [
    (key, cls()) for key, cls in _AGENT_REGISTRY
]
```

Registry at line 95:

```python
_AGENT_REGISTRY: List[Tuple[str, Any]] = [
    ("pragmatist", MarketPragmatistAgent),
    ("mood_ring", PsychologyMomentumAgent),
    ("gambler", GameTheoryMaverickAgent),
    ("judge", RefereeProfilerAgent),
    ("anarchist", ChaosFrictionAgent),
]
```

**3. How are AgentAssessments collected?** In `_do_analyze()` (line 223):

```python
def _do_analyze(self) -> None:
    packet = self._observe_out.telemetry
    assessments: Dict[str, AgentAssessment] = {}
    for key, agent in self._agents:
        prompt = agent.construct_prompt(packet)
        response: LLMResponse = self.gateway.generate(agent.name, prompt)
        parsed = self._parse_assessment_from_content(response.content)
        assessments[key] = AgentAssessment(
            agent_key=key, agent_name=agent.name,
            verdict=parsed["verdict"], provider=response.provider,
            prompt=prompt, confidence=parsed["confidence"],
            rationale=parsed["rationale"], risk_level=parsed["risk_level"],
            supporting_signals=parsed["supporting_signals"],
        )
        debate_outputs[key] = response.content
        provider_metadata[key] = response.provider
```

**4. What object is returned?** `TickResult` from `transition()`, converted to `Dict[str, Any]` by `to_legacy_dict()` with keys: `telemetry`, `debate_outputs`, `swarm_metrics`, `provider_metadata`.

---

## SECTION 4 — AGENTASSESSMENT MODEL

**File:** `backend/orchestrator/state_machine.py:36`

```python
@dataclass(frozen=True)
class AgentAssessment:
    agent_key: str
    agent_name: str
    verdict: str
    provider: str
    prompt: str
    confidence: float = 0.0
    rationale: str = ""
    risk_level: str = "LOW"
    supporting_signals: Tuple[str, ...] = ()
```

**Fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `agent_key` | `str` | required | Registry key (e.g. `"pragmatist"`) |
| `agent_name` | `str` | required | Display name (e.g. `"Market Pragmatist"`) |
| `verdict` | `str` | required | `"HIGH_RISK"`, `"ELEVATED_RISK"`, or `"NOMINAL"` |
| `provider` | `str` | required | `"mock"`, `"bob"`, `"granite"` |
| `prompt` | `str` | required | Full prompt sent to LLM |
| `confidence` | `float` | `0.0` | 0-1 parsed from LLM output |
| `rationale` | `str` | `""` | Raw LLM response text |
| `risk_level` | `str` | `"LOW"` | `"HIGH"`, `"MEDIUM"`, or `"LOW"` |
| `supporting_signals` | `Tuple[str, ...]` | `()` | Parsed signal tags |

**Serialization:** No custom methods. Externally converted via `dataclasses.asdict()` (in `to_legacy_dict`). Plain `@dataclass(frozen=True)` — not pydantic.

---

## SECTION 5 — FRACTURE ENGINE

**File:** `backend/contracts/swarm_metrics.py:36`

**Class:** `SwarmFractureCalculator` (plain class, not a dataclass)

**Input:** `agent_outputs: Dict[str, str]` — agent key → raw text response.

**Output:** `SwarmFractureMetrics` dataclass (same file, line 7):

```python
@dataclass
class SwarmFractureMetrics:
    fracture_index: float
    agreement_score: float
    chaos_probability: float
    dominant_prediction: str
    prediction_distribution: Dict[str, int] = field(default_factory=dict)
```

**Calculation flow:**

```
agent_outputs
  ↓  _classify(text) for each agent → maps to category
  ↓  categories: HOME_WIN, AWAY_WIN, DRAW, HIGH_RISK, LOW_RISK, UNKNOWN
  ↓
distribution = {category: count}
agreement_score = max(distribution.values()) / total * 100
fracture_index = 100 - agreement_score
chaos_probability = fracture_index (+15 if ≥1 HIGH_RISK, +10 if ≥2)
dominant_prediction = max(distribution, key=count desc, then first-encountered)
  ↓
SwarmFractureMetrics{round(fracture_index,1), round(agreement_score,1),
                     round(chaos_probability,1), dominant_prediction,
                     distribution}
```

---

## SECTION 6 — HEURISTIC VALIDATOR

**File:** `backend/orchestrator/validation.py:76`

**Entrypoint method:**

```python
def validate(
    self,
    assessments: Dict[str, AgentAssessment],
    fracture_metrics: SwarmFractureMetrics,
    contradictions: Tuple[str, ...],
) -> ValidateOutput:
```

**`ValidateOutput` model** (line 58):

```python
@dataclass(frozen=True)
class ValidateOutput:
    overall_confidence: float = 0.0
    agreement_score: float = 1.0
    trust_score: float = 1.0
    contradiction_count: int = 0
    flags: Tuple[ValidationFlag, ...] = ()
    evidence_summary: str = ""
    validation_source: str = "heuristic"
    skipped: bool = False
```

**`ValidationFlag` enum** (line 36):

```python
class ValidationFlag(str, Enum):
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    HIGH_FRACTURE = "HIGH_FRACTURE"
    NO_CONSENSUS = "NO_CONSENSUS"
    CONTRADICTORY_VERDICTS = "CONTRADICTORY_VERDICTS"
    AGENT_FAILURE = "AGENT_FAILURE"
```

**Internal flow:**

```
validate()
├── _compute_agreement_score()     → fracture_metrics.agreement_score / 100
├── _compute_trust_score()         → provider_reliability(avg) * 0.5 + fracture_penalty * 0.5
├── _detect_contradictions()       → pairwise LOW↔HIGH risk_level → ContradictionRecord[]
├── _compute_overall_confidence()  → agreement*0.35 + trust*0.40 + inverse_fracture*0.25
├── _determine_flags()             → thresholds against confidence/fracture/agreement/contradictions
└── _generate_evidence_summary()   → human-readable string from flags
```

---

## SECTION 7 — CURRENT RECOMMENDATION FLOW

Complete trace of one tick:

```
app_server.py:_handle_stream()  [line 89]
  └─ orchestrator.process_next_tick()          [core_supervisor.py:19]
       └─ state_machine.transition()            [state_machine.py:135]
            ├─ _do_observe()                    [state_machine.py:161]
            │    └─ ticker.generate_tick()       [kronos_ticker.py:40]
            │       → KronosTelemetryPacket
            │
            ├─ _do_analyze()                    [state_machine.py:223]
            │    for each (key, agent) in self._agents:
            │      ├─ agent.construct_prompt(packet)   [archetypes.py:26/47/71/97/122]
            │      ├─ gateway.generate(name, prompt)   [gateway.py:31]
            │      │    ├─ MockProvider.generate()     [mock_provider.py:13]
            │      │    └─ BobProvider.generate()      [bob_provider.py:53]
            │      │    → LLMResponse(provider, content)
            │      └─ _parse_assessment_from_content() [state_machine.py:192]
            │         → AgentAssessment dict
            │    → AnalyzeOutput(assessments, debate_outputs, provider_metadata)
            │
            ├─ _do_debate()                     [state_machine.py:260]
            │    └─ fracture_calculator.calculate()   [swarm_metrics.py:41]
            │       → SwarmFractureMetrics
            │    → DebateOutput(fracture_metrics, contradictions, high_risk_agents)
            │
            ├─ _do_validate()                   [state_machine.py:291]
            │    └─ validator.validate()              [validation.py:185]
            │       → ValidateOutput(overall_confidence, flags, ...)
            │
            └─ _do_recommend()                  [state_machine.py:309]
                 └─ _determine_urgency()              [state_machine.py:329]
                 → RecommendOutput(telemetry, fracture_metrics, assessments,
                                    debate_outputs, provider_metadata, urgency, validation)

       └─ to_legacy_dict(result)               [state_machine.py:346]
          → Dict{telemetry, debate_outputs, swarm_metrics, provider_metadata}

  └─ _build_telemetry(result)                  [app_server.py:55]
     → flat dict with minute + flattened metric categories

  → SSE event: {"telemetry": {...}, "fracture_index": ..., "chaos_probability": ..., "debate_outputs": {...}}
```

---

## SECTION 8 — SSE PAYLOAD

**File:** `backend/app_server.py:89` (`_handle_stream`)

```python
payload = {
    "telemetry": self._build_telemetry(result),
    "fracture_index": result["swarm_metrics"]["fracture_index"],
    "chaos_probability": result["swarm_metrics"]["chaos_probability"],
    "debate_outputs": result["debate_outputs"],
}
```

**`_build_telemetry`** (line 55) flattens nested metric dicts:

```python
def _build_telemetry(self, result: dict) -> dict:
    tel = result["telemetry"]
    flat = {"minute": tel["match_minute"]}
    for cat in ("tactical", "physical", "psychology", "game_theory", "environment"):
        flat.update(tel[cat])
    flat["score_home"] = tel["score_home"]
    flat["score_away"] = tel["score_away"]
    return flat
```

**Example payload:**

```json
{
  "telemetry": {
    "minute": 12,
    "ppda": 8.2,
    "block_height_m": 42.1,
    "vertical_disconnect": 0.35,
    "field_tilt": 61.0,
    "sprint_drop_off": -0.05,
    "hid_deficit_km": 0.12,
    "recovery_time_sec": 18.5,
    "defensive_fatigue": 0.22,
    "crowd_decibels": 85,
    "foul_escalation": 3,
    "xg_delta": 0.12,
    "panic_index": 0.31,
    "rest_defense_count": 4,
    "box_overload_count": 2,
    "gk_sweeper_dist": 22.5,
    "sub_shock_index": 0.0,
    "pitch_slickness": 0.45,
    "wind_interference": 0.30,
    "fog_visibility": 0.80,
    "score_home": 1,
    "score_away": 0
  },
  "fracture_index": 60.0,
  "chaos_probability": 60.0,
  "debate_outputs": {
    "pragmatist": "[MARKET PRAGMATIST]: High-risk pattern detected...",
    "mood_ring": "[MOOD RING]: Nominal conditions observed...",
    "gambler": "[GAMBLER]: High-risk pattern detected...",
    "judge": "[JUDGE]: Nominal conditions observed...",
    "anarchist": "[ANARCHIST]: High-risk pattern detected..."
  }
}
```

**Fields currently exposed to frontend:** `telemetry` (flattened), `fracture_index`, `chaos_probability`, `debate_outputs`. Notably **excluded**: `swarm_metrics.agreement_score`, `swarm_metrics.dominant_prediction`, `swarm_metrics.prediction_distribution`, `provider_metadata`, and all `ValidateOutput` fields.

---

## SECTION 9 — PROVIDERS

### `BaseProvider` (protocol)

**File:** `backend/llm/base.py:8`

```python
class BaseProvider(Protocol):
    def generate(self, agent_name: str, prompt: str) -> LLMResponse: ...
```

### `MockProvider`

**File:** `backend/llm/mock_provider.py:6`

```python
class MockProvider:
    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        # If prompt contains "Risk"/"risk" → "High-risk pattern detected..."
        # Otherwise → "Nominal conditions observed..."
```

Returns `LLMResponse(provider="mock", content=...)`.

### `BobProvider`

**File:** `backend/llm/bob_provider.py:17`

```python
class BobProvider:
    def __init__(self) -> None:
        # Reads cfg.bob_api_url, cfg.bob_api_key, cfg.bob_project_id, cfg.bob_model_id

    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        # POST to BOB API with system+user messages, 10s timeout, 1 retry
        # Raises RuntimeError on failure
```

Returns `LLMResponse(provider="bob", content=...)`.

### `LLMGateway` (routing layer)

**File:** `backend/llm/gateway.py:13`

```python
class LLMGateway:
    mode: str  # "mock" | "bob" | "hybrid"

    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        if mode == "mock":
            return self._mock.generate(...)
        if mode == "bob":
            return self._bob.generate(...)
        # hybrid: try self._bob, catch Exception, fallback to self._mock
```

**No `HybridProvider` class exists.** Hybrid behavior is embedded in `LLMGateway.generate()` via try/except.

---

## SECTION 10 — GRANITE READINESS

The cleanest insertion point is: **B) BEFORE validation**.

**Justification based on existing architecture:**

```
_do_analyze()   → AgentAssessment per agent (individual LLM calls)
_do_debate()    → SwarmFractureMetrics (aggregates raw text outputs)
_do_validate()  → HeuristicValidator (confidence, trust, flags)
```

The `_do_debate()` phase currently only calls `SwarmFractureCalculator.calculate()` which classifies raw text into categories (`HOME_WIN`, `HIGH_RISK`, etc.). A `GraniteConsensusEngine` should sit **after** fracture calculation but **before** heuristic validation, because:

1. **The fracture output** (`SwarmFractureMetrics`) provides the exact input a consensus engine needs — prediction distribution, fracture index, chaos probability.
2. **Validation** (`ValidateOutput`) is designed to be extensible — its docstring at `validation.py:61-63` says:

   > *"Shared between heuristic and future Granite validators."*

3. **The ValidateOutput model already has `validation_source: str = "heuristic"`** — a Granite validator would simply set this to `"granite"`.

Insertion point in `transition()`:

```python
self._do_observe()
self._do_analyze()
self._do_debate()
# ← GraniteConsensusEngine.validate() HERE  (new method)
self._do_validate()    # HeuristicValidator remains or becomes co-validator
self._do_recommend()
```

This lets the Granite consensus engine enrich/replace the heuristic `ValidateOutput` before `_do_recommend()` packages it.

---

## SECTION 11 — PROPOSED IMPLEMENTATION MAP

**Minimal files to create** (3 new files, 1 modified):

```
backend/
├── llm/
│   ├── granite_provider.py        # NEW — implements BaseProvider Protocol
│   │   class GraniteProvider:
│   │       def generate(self, agent_name: str, prompt: str) -> LLMResponse
│   │
├── contracts/
│   ├── granite_consensus.py       # NEW — consensus engine + output model
│   │   @dataclass(frozen=True)
│   │   class GraniteConsensusOutput:
│   │       overall_assessment: str
│   │       confidence_adjustment: float
│   │       fracture_recalibrated: Optional[float]
│   │       rationale: str
│   │
│   │   class GraniteConsensusEngine:
│   │       def evaluate(self, fracture: SwarmFractureMetrics,
│   │                    assessments: Dict[str,AgentAssessment]) -> GraniteConsensusOutput
│   │
├── orchestrator/
│   ├── state_machine.py           # MODIFY — 3 lines changed
│   │   # Add GraniteConsensusEngine instance in __init__
│   │   # Insert _do_granite_consensus() call between _do_debate and _do_validate
```

**Where each maps to existing patterns:**

| New file | Pattern it follows | Existing reference |
|---|---|---|
| `granite_provider.py` | Implements `generate(agent_name, prompt) -> LLMResponse` | `mock_provider.py`, `bob_provider.py` |
| `granite_consensus.py` | Pure function class with single entrypoint + output dataclass | `swarm_metrics.py` → `SwarmFractureCalculator`, `SwarmFractureMetrics` |
| Modify `state_machine.py` | Add instance in `__init__`, call it in `transition()` | Same pattern as `self.validator = HeuristicValidator()` + `_do_validate()` |

**Integration in `state_machine.py`:**

```python
# In __init__:
self.consensus_engine = GraniteConsensusEngine()

# New method (between _do_debate and _do_validate):
def _do_granite_consensus(self) -> None:
    consensus = self.consensus_engine.evaluate(
        fracture=self._debate_out.fracture_metrics,
        assessments=self._analyze_out.assessments,
    )
    logger.info("[GRANITE] consensus=%s", consensus.overall_assessment)
    # Store on self for _do_recommend to use
    self._granite_consensus = consensus

# In transition():
self._do_observe()
self._do_analyze()
self._do_debate()
self._do_granite_consensus()   # ← inserted
self._do_validate()
self._do_recommend()
```

**Files NOT created** — no new `validators/`, `models/`, or `services/` directories needed. Everything slots into existing directory conventions.
