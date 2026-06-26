# Validation Layer Design — Kronos Swarm Core

**Status:** Design Document (not implemented)
**Target:** `backend/orchestrator/validation.py` (to be created)
**Design Date:** 2026-06-20

---

## 1. Motivation

The current VALIDATE phase is a passthrough:

```python
def _do_validate(self) -> None:
    self._validate_out = ValidateOutput(skipped=True)
```

This design replaces the passthrough with a heuristic validation layer that evaluates swarm output quality — agreement, contradiction, trust, and confidence — in a deterministic, testable way. The same interface will later accept a Granite-powered validator without changing any call sites.

---

## 2. Architecture

```
                    ┌──────────────────────────────────────┐
                    │            DEBATE OUTPUT              │
                    │  • fracture_metrics                   │
                    │  • contradictions                     │
                    │  • high_risk_agents                   │
                    └──────────────┬───────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VALIDATION LAYER                             │
│                                                                  │
│  ┌──────────────────────┐   ┌────────────────────────────────┐  │
│  │  HeuristicValidator   │   │  GraniteValidator (future)     │  │
│  │  (deterministic)      │   │  (LLM-powered)                 │  │
│  │                       │   │                                │  │
│  │  • agreement_score    │   │  • deep evidence verification  │  │
│  │  • contradiction_map  │   │  • cross-check agent claims   │  │
│  │  • trust_score        │   │  • natural-language flags     │  │
│  │  • overall_confidence │   │  • per-agent confidence       │  │
│  │  • validation_flags   │   │                                │  │
│  └──────────┬───────────┘   └────────────┬───────────────────┘  │
│             │                             │                      │
│             └──────────┬──────────────────┘                      │
│                        ▼                                         │
│             ┌──────────────────────┐                             │
│             │   ValidationResult   │  (shared interface type)    │
│             └──────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │    RECOMMEND PHASE    │
              │  consumes validation  │
              │  for urgency/evidence │
              └──────────────────────┘
```

### 2.1 Validator Protocol (Granite-Compatible)

Both `HeuristicValidator` and future `GraniteValidator` implement the same protocol:

```
Inputs:
  - assessments: Dict[str, AgentAssessment]   # From ANALYZE
  - fracture_metrics: SwarmFractureMetrics    # From DEBATE
  - telemetry: KronosTelemetryPacket          # From OBSERVE
  - contradictions: Tuple[str, ...]           # From DEBATE
  - anomalies: Tuple[str, ...]                # From OBSERVE

Output:
  - ValidateOutput (shared type, same fields regardless of implementation)
```

The `GraniteValidator` when enabled would:
1. Construct a structured prompt from all inputs
2. Call the Granite LLM provider
3. Parse the response into `ValidateOutput` fields

The `HeuristicValidator` computes the same fields via deterministic rules.

---

## 3. Data Models

### 3.1 ValidationFlag Enum

```python
from enum import Enum

class ValidationFlag(str, Enum):
    """Human-readable warnings produced by the validation layer.

    These are designed to be consumed by frontend UI panels and
    future LLM-based explainability modules.
    """
    # ── Confidence warnings ──────────────────────────────────
    LOW_CONFIDENCE       = "LOW_CONFIDENCE"        # overall_confidence < 0.5
    VERY_LOW_CONFIDENCE  = "VERY_LOW_CONFIDENCE"   # overall_confidence < 0.3

    # ── Fracture/agreement warnings ──────────────────────────
    HIGH_FRACTURE        = "HIGH_FRACTURE"         # fracture_index >= 60
    NO_CONSENSUS         = "NO_CONSENSUS"          # agreement_score < 40%
    AGENT_SPLIT          = "AGENT_SPLIT"           # agents split across 3+ categories

    # ── Reliability warnings ────────────────────────────────
    LOW_TRUST            = "LOW_TRUST"             # trust_score < 0.5
    AGENT_FAILURE        = "AGENT_FAILURE"         # one or more agents returned mock/providers failed

    # ── Contradiction warnings ──────────────────────────────
    CONTRADICTORY_VERDICTS = "CONTRADICTORY_VERDICTS"  # agents give opposite risk levels
    RISK_DISAGREEMENT    = "RISK_DISAGREEMENT"     # agents disagree on risk level

    # ── Anomaly warnings ────────────────────────────────────
    ENVIRONMENTAL_ANOMALY = "ENVIRONMENTAL_ANOMALY"  # pitch/weather anomaly active
    PANIC_ANOMALY        = "PANIC_ANOMALY"         # panic_index anomaly active

    # ── Data quality warnings ───────────────────────────────
    PARTIAL_DATA         = "PARTIAL_DATA"          # fewer than 5 agents responded
    INSUFFICIENT_SIGNAL  = "INSUFFICIENT_SIGNAL"   # not enough supporting signals across agents
```

### 3.2 ContradictionRecord

```python
from dataclasses import dataclass
from typing import Tuple

@dataclass(frozen=True)
class ContradictionRecord:
    """Describes a specific contradiction between two agents."""
    agent_a: str                  # e.g. "pragmatist"
    agent_b: str                  # e.g. "anarchist"
    field: str                    # "risk_level" | "verdict" | "confidence"
    value_a: str                  # e.g. "LOW"
    value_b: str                  # e.g. "HIGH"
    severity: float               # 0.0 (minor) — 1.0 (critical)
```

### 3.3 Updated ValidateOutput

```python
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

@dataclass(frozen=True)
class ValidateOutput:
    """Output of the VALIDATE phase.

    Shared between heuristic and Granite validators.
    The `skipped` flag is True only when no validator is configured.
    """
    # ── Confidence ───────────────────────────────────────────
    overall_confidence: float     # 0.0 – 1.0, single normalized score
    per_agent_confidence: Dict[str, float]    # agent_key → confidence (0.0–1.0)

    # ── Agreement / Fracture ─────────────────────────────────
    agreement_score: float        # 0.0 – 1.0 (normalized from SwarmFractureMetrics)
    fracture_index: float         # 0.0 – 100.0 (passthrough from DEBATE)

    # ── Trust ────────────────────────────────────────────────
    trust_score: float            # 0.0 – 1.0, reliability of swarm output

    # ── Contradictions ───────────────────────────────────────
    contradictions: Tuple[ContradictionRecord, ...]  # detailed pairs
    contradiction_count: int      # len(contradictions)

    # ── Flags ────────────────────────────────────────────────
    flags: Tuple[ValidationFlag, ...]   # active warnings for this tick
    flag_count: int               # len(flags)

    # ── Metadata ─────────────────────────────────────────────
    validation_source: str        # "heuristic" | "granite" | "skipped"
    skipped: bool = False
```

---

## 4. Algorithms

### 4.1 Agreement Score (Normalized)

The `SwarmFractureMetrics.agreement_score` is already computed as a percentage (0–100). The validation layer normalizes it to 0.0–1.0 and **weights by agent confidence**:

```
weighted_agreement = sum(
    confidence_of(agent) for agent in majority_group
) / sum(
    confidence_of(agent) for all agents
)

agreement_score = max(
    0.0,
    min(
        1.0,
        weighted_agreement
    )
)
```

**Rationale:** High-confidence agents that agree should boost the score more than low-confidence agents that agree. A low-confidence majority should not produce the same agreement as a high-confidence majority.

**Fallback (no confidence data):** If all agent confidences are 0.0 (no structured data), revert to count-based agreement from `SwarmFractureMetrics.agreement_score / 100.0`.

### 4.2 Contradiction Detection

Contradictions are identified by comparing agent assessments pairwise across three dimensions:

**Dimension 1 — Risk Level Contradiction:**
```
if agent_a.risk_level == "LOW" and agent_b.risk_level == "HIGH":
    contradiction.severity = 1.0  (maximum)
elif agent_a.risk_level == "LOW" and agent_b.risk_level == "MEDIUM":
    contradiction.severity = 0.5
elif agent_a.risk_level == "MEDIUM" and agent_b.risk_level == "HIGH":
    contradiction.severity = 0.5
```

**Dimension 2 — Verdict Contradiction:**
```
contradictory_pairs = {
    ("NOMINAL", "HIGH_RISK"): 1.0,
    ("NOMINAL", "ELEVATED_RISK"): 0.6,
    ("ELEVATED_RISK", "HIGH_RISK"): 0.4,
}
```

**Dimension 3 — Confidence Gap:**
```
if abs(agent_a.confidence - agent_b.confidence) > 0.4:
    # Large confidence gap between two agents = implicit contradiction
    contradiction.severity = 0.3
```

**Deduplication:** Each pair `(agent_a, agent_b)` is only evaluated once (alphabetical ordering). The highest severity among the three dimensions is kept.

### 4.3 Trust Score

Computed from four sub-scores, each 0.0–1.0:

```
provider_reliability = avg of:
    "granite" → 1.0   (future)
    "bob"     → 0.9
    "mock"    → 0.5

confidence_harmony = 1.0 - std_dev(agent confidences)
  # High variance in agent confidence → low harmony

fracture_penalty = max(0.0, 1.0 - fracture_index / 100.0)
  # fracture_index 0 → penalty 1.0; fracture_index 80 → penalty 0.2

anomaly_penalty = max(0.0, 1.0 - len(anomalies) * 0.15)
  # Each anomaly reduces trust; 7+ anomalies → trust 0.0 for this sub-score

trust_score = (
    provider_reliability * 0.30 +
    confidence_harmony * 0.25 +
    fracture_penalty * 0.30 +
    anomaly_penalty * 0.15
)
```

**Weights rationale:**
- Provider reliability (30%) — reflects data source quality
- Fracture penalty (30%) — disagreement is a strong trust signal
- Confidence harmony (25%) — internal consistency of agents
- Anomaly penalty (15%) — external conditions degrade trust

### 4.4 Overall Confidence

Combines agreement, trust, and fracture into a single score:

```
overall_confidence = (
    agreement_score * 0.35 +
    trust_score * 0.40 +
    (1.0 - fracture_index / 100.0) * 0.25
)
```

**Weights rationale:**
- Trust (40%) — highest weight because it captures provider quality + fracture + anomalies together
- Agreement (35%) — strong signal but can be misleading if all agents agree on wrong thing
- Inverse fracture (25%) — raw disagreement as a standalone signal

### 4.5 Validation Flag Triggers

Flags are set based on thresholds applied after computing all scores:

| Flag | Condition | Threshold |
|---|---|---|
| `LOW_CONFIDENCE` | `overall_confidence < 0.5` | configurable via env `KRONOS_VALIDATION_CONFIDENCE_THRESHOLD` |
| `VERY_LOW_CONFIDENCE` | `overall_confidence < 0.3` | fixed |
| `HIGH_FRACTURE` | `fracture_index >= 60` | configurable via env `KRONOS_VALIDATION_FRACTURE_THRESHOLD` |
| `NO_CONSENSUS` | `agreement_score < 0.4` | fixed |
| `AGENT_SPLIT` | `len(prediction_distribution) >= 3` | metric from DEBATE |
| `LOW_TRUST` | `trust_score < 0.5` | fixed |
| `AGENT_FAILURE` | any agent provider == "mock" | mock = degraded quality |
| `CONTRADICTORY_VERDICTS` | any contradiction severity >= 0.8 | high-severity contradictions |
| `RISK_DISAGREEMENT` | any contradiction in risk_level | any risk-level contradiction |
| `ENVIRONMENTAL_ANOMALY` | `"pitch_slickness_critical"` in anomalies | from OBSERVE |
| `PANIC_ANOMALY` | `"panic_index_critical"` in anomalies | from OBSERVE |
| `PARTIAL_DATA` | `len(assessments) < 5` | fewer than expected agents |
| `INSUFFICIENT_SIGNAL` | avg supporting_signals across agents < 1 | agents provide too few signals |

---

## 5. Threshold Configuration

All thresholds should have sensible defaults and be overridable via environment variables:

```python
from dataclasses import dataclass

@dataclass
class ValidationThresholds:
    """Configurable thresholds for heuristic validation.

    Each threshold can be overridden via environment variables
    following the KRONOS_VALIDATION_* pattern.
    """
    # Confidence thresholds
    low_confidence: float = 0.5           # KRONOS_VALIDATION_LOW_CONFIDENCE
    very_low_confidence: float = 0.3      # fixed

    # Fracture thresholds
    high_fracture: float = 60.0           # KRONOS_VALIDATION_HIGH_FRACTURE

    # Agreement thresholds
    no_consensus: float = 0.4             # fixed

    # Trust thresholds
    low_trust: float = 0.5                # KRONOS_VALIDATION_LOW_TRUST

    # Contradiction severity threshold for flagging
    contradiction_severity_threshold: float = 0.8   # KRONOS_VALIDATION_CONTRADICTION_SEVERITY

    # Confidence gap for implicit contradiction
    confidence_gap_threshold: float = 0.4           # KRONOS_VALIDATION_CONFIDENCE_GAP

    # Anomaly penalty per anomaly
    anomaly_penalty_per_unit: float = 0.15          # fixed

    # Weight multipliers for overall_confidence
    weight_agreement: float = 0.35        # KRONOS_VALIDATION_WEIGHT_AGREEMENT
    weight_trust: float = 0.40            # KRONOS_VALIDATION_WEIGHT_TRUST
    weight_fracture: float = 0.25         # KRONOS_VALIDATION_WEIGHT_FRACTURE
```

---

## 6. HeuristicValidator Class (Phase 3 Implementation Target)

```python
from typing import Dict, List, Optional, Tuple
from backend.contracts.telemetry_dataclasses import KronosTelemetryPacket
from backend.contracts.swarm_metrics import SwarmFractureMetrics
from backend.orchestrator.state_machine import AgentAssessment, ValidateOutput, ValidationFlag, ContradictionRecord

class HeuristicValidator:
    """Deterministic validation layer using heuristic rules.

    Implements the same protocol that GraniteValidator will use,
    enabling drop-in replacement when Granite is configured.
    """

    def __init__(self, thresholds: Optional[ValidationThresholds] = None) -> None:
        self.thresholds = thresholds or ValidationThresholds()

    def validate(
        self,
        assessments: Dict[str, AgentAssessment],
        fracture_metrics: SwarmFractureMetrics,
        telemetry: KronosTelemetryPacket,
        contradictions: Tuple[str, ...],
        anomalies: Tuple[str, ...],
    ) -> ValidateOutput:
        """Run all validation algorithms and return structured output."""
        # 1. Compute agreement_score (weighted by confidence)
        # 2. Detect detailed contradictions (pairwise)
        # 3. Compute trust_score
        # 4. Compute overall_confidence
        # 5. Determine active validation flags
        # 6. Build per-agent confidence map
        # 7. Return ValidateOutput
        ...
```

### 6.1 Internal Flow

```
validate()
  │
  ├─ 1. _compute_weighted_agreement(assessments, fracture_metrics)
  │      → float (0.0–1.0)
  │
  ├─ 2. _detect_contradictions(assessments)
  │      → Tuple[ContradictionRecord, ...]
  │
  ├─ 3. _compute_trust_score(assessments, fracture_metrics, anomalies)
  │      → float (0.0–1.0)
  │
  ├─ 4. _compute_overall_confidence(agreement_score, trust_score, fracture_metrics)
  │      → float (0.0–1.0)
  │
  ├─ 5. _determine_flags(overall_confidence, agreement_score, trust_score,
  │                      fracture_metrics, contradictions, anomalies, assessments)
  │      → Tuple[ValidationFlag, ...]
  │
  ├─ 6. _build_per_agent_confidence(assessments)
  │      → Dict[str, float]
  │
  └─ 7. Assemble and return ValidateOutput
```

---

## 7. GraniteValidator Interface (Future)

```python
from abc import ABC, abstractmethod
from typing import Dict, Tuple

class BaseValidator(ABC):
    """Abstract interface shared by heuristic and Granite validators."""

    @abstractmethod
    def validate(
        self,
        assessments: Dict[str, AgentAssessment],
        fracture_metrics: SwarmFractureMetrics,
        telemetry: KronosTelemetryPacket,
        contradictions: Tuple[str, ...],
        anomalies: Tuple[str, ...],
    ) -> ValidateOutput:
        ...
```

The `GraniteValidator` would:

1. Serialize all agent assessments + telemetry + fracture metrics into a structured prompt
2. Call Granite API (via a new `GraniteProvider` similar to `BobProvider`)
3. Parse the JSON response into a `ValidateOutput`
4. Fall back to `HeuristicValidator` if Granite is unavailable

```python
class GraniteValidator(BaseValidator):
    """LLM-powered validation using Granite.

    Falls back to heuristic validation when Granite is unavailable.
    """

    def __init__(
        self,
        granite_provider: GraniteProvider,
        fallback: HeuristicValidator,
        thresholds: Optional[ValidationThresholds] = None,
    ) -> None:
        self._granite = granite_provider
        self._fallback = fallback
        self._thresholds = thresholds or ValidationThresholds()

    def validate(self, ...) -> ValidateOutput:
        try:
            return self._granite.validate(...)
        except Exception:
            return self._fallback.validate(...)
```

---

## 8. Integration with State Machine

### 8.1 `_do_validate` (Updated)

```python
# Inside KronosStateMachine

def _do_validate(self) -> None:
    self.current_phase = KronosPhase.VALIDATE

    validator = self._get_validator()
    result = validator.validate(
        assessments=self._analyze_out.assessments,
        fracture_metrics=self._debate_out.fracture_metrics,
        telemetry=self._observe_out.telemetry,
        contradictions=self._debate_out.contradictions,
        anomalies=self._observe_out.anomalies,
    )
    self._validate_out = result
    logger.debug("[VALIDATE] confidence=%.2f trust=%.2f flags=%s",
                 result.overall_confidence, result.trust_score, result.flags)
```

### 8.2 Validator Selection

```python
def _get_validator(self) -> BaseValidator:
    """Return the configured validator.

    Controlled by KRONOS_VALIDATION_MODE env var:
      - "heuristic" (default) → HeuristicValidator
      - "granite"              → GraniteValidator (future)
    """
    if self._granite_configured and self._validation_mode == "granite":
        return self._granite_validator
    return self._heuristic_validator
```

### 8.3 `ValidateOutput` feeds `RecommendOutput`

`RecommendOutput` gains a reference to the validation result:

```python
@dataclass(frozen=True)
class RecommendOutput:
    telemetry: KronosTelemetryPacket
    fracture_metrics: SwarmFractureMetrics
    assessments: Dict[str, AgentAssessment]
    debate_outputs: Dict[str, str]
    provider_metadata: Dict[str, str]
    match_phase: str
    urgency: str = "STABLE"
    validation: Optional[ValidateOutput] = None   # NEW
```

The urgency override in `_do_recommend` can optionally consider validation flags:

```python
def _do_recommend(self) -> None:
    urgency = self._determine_urgency(debate.fracture_metrics)

    # Escalate urgency if critical validation flags are active
    if ValidationFlag.VERY_LOW_CONFIDENCE in self._validate_out.flags:
        urgency = max(urgency, "WATCH", key=_URGENCY_ORDER)
    if ValidationFlag.HIGH_FRACTURE in self._validate_out.flags:
        urgency = max(urgency, "WATCH", key=_URGENCY_ORDER)

    # ... rest of recommend ...
```

---

## 9. Test Plan (Conceptual)

| Test | What It Verifies |
|---|---|
| `test_perfect_agreement_high_trust` | All agents agree at HIGH confidence → confidence ≈ 1.0, no flags |
| `test_total_disagreement` | Agents split 3 ways → LOW_CONFIDENCE, HIGH_FRACTURE, NO_CONSENSUS |
| `test_risk_level_contradiction` | One LOW, one HIGH → CONTRADICTORY_VERDICTS flag |
| `test_all_mock_providers` | All agents on mock → AGENT_FAILURE flag, lower trust |
| `test_mixed_providers` | Some bob, some mock → trust in middle range |
| `test_low_confidence_flags` | overall_confidence < 0.3 → VERY_LOW_CONFIDENCE + LOW_CONFIDENCE |
| `test_edge_thresholds` | confidence = 0.50 → flag; 0.51 → no flag |
| `test_anomaly_trust_penalty` | 3 anomalies → trust penalized ~0.55 |
| `test_partial_data_flag` | Only 3 assessments → PARTIAL_DATA flag |
| `test_contradiction_severity` | High-severity vs medium-severity contradictions produce correct |
| `test_weighted_agreement` | High-confidence majority counts more than low-confidence majority |
| `test_confidence_gap_contradiction` | Agents with 0.6 confidence gap → implicit contradiction |
| `test_validate_output_immutable` | ValidateOutput cannot be mutated after creation |
| `test_granite_fallback` | Granite failure → HeuristicValidator result (future) |
| `test_validation_thresholds_config` | Environment overrides change flag behavior |

---

## 10. File Manifest

| File | Action | Purpose |
|---|---|---|
| `backend/orchestrator/validation.py` | **Create** | `HeuristicValidator`, `ValidationThresholds`, `BaseValidator` ABC, `ContradictionRecord`, `ValidationFlag` enum, all algorithms |
| `backend/orchestrator/state_machine.py` | **Update** | Replace passthrough `_do_validate` with validator delegation; update `RecommendOutput` to carry `ValidateOutput`; add validator lifecycle (`_get_validator`) |
| `backend/config/runtime.py` | **Extend** | Add `KRONOS_VALIDATION_MODE`, `KRONOS_VALIDATION_*` threshold env vars |
| `backend/tests/test_validation.py` | **Create** | All validation algorithm tests (see test plan above) |
| `backend/tests/test_state_machine.py` | **Update** | New tests for updated `_do_validate` + `RecommendOutput.validation` |
| `backend/llm/granite_provider.py` | **Create** (future) | Granite API provider for LLM-powered validation |

---

## 11. Design Decisions

| Decision | Rationale |
|---|---|
| **Validator as pluggable class, not inline methods** | Clean interface for Granite swap-in; single `validate()` entry point; testable in isolation |
| **Separate `ContradictionRecord` from `DebateOutput.contradictions`** | DEBATE detects *whether* contradictions exist; VALIDATE *describes* them in detail with severity; different concerns |
| **Weights in `ValidationThresholds` via env vars** | Enables tuning without code changes; consistent with existing `RuntimeConfig` pattern |
| **`overall_confidence` weights trust > agreement > fracture** | Trust captures provider quality + fracture + anomalies — it is the richest single signal |
| **`provider_reliability` score for mock = 0.5** | Mock is deterministic and useful for development, but should not be trusted in production — 0.5 reflects "neutral" trust |
| **Validation flags are `str` enum, not `bool` fields** | Extensible — new flags don't require schema changes; tuple iteration is natural; frontend can map flags to UI components |
| **`GraniteValidator` falls back to `HeuristicValidator`** | Validation must never block the tick pipeline. Non-blocking philosophy from design doc applies here too |
| **All algorithms deterministic** | No randomness, no LLM dependency in heuristic mode. Tests produce identical results every run |
| **`validation_source` field identifies which validator ran** | Enables telemetry on validation quality; frontend can show "AI validated" vs "rule-based" indicators |
