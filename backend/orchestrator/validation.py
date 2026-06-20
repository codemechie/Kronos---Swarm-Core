from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Tuple, TYPE_CHECKING

from backend.contracts.swarm_metrics import SwarmFractureMetrics

if TYPE_CHECKING:
    from backend.orchestrator.state_machine import AgentAssessment

logger = logging.getLogger("kronos.validation")

# ── Constants ─────────────────────────────────────────────────────────

_PROVIDER_RELIABILITY: Dict[str, float] = {
    "granite": 1.0,
    "bob": 0.9,
    "mock": 0.5,
}

_LOW_CONFIDENCE_THRESHOLD: float = 0.5
_HIGH_FRACTURE_THRESHOLD: float = 60.0
_NO_CONSENSUS_THRESHOLD: float = 0.4
_CONTRADICTION_SEVERITY_THRESHOLD: float = 0.8

_WEIGHT_AGREEMENT: float = 0.35
_WEIGHT_TRUST: float = 0.40
_WEIGHT_FRACTURE: float = 0.25

_TRUST_WEIGHT_PROVIDER: float = 0.5
_TRUST_WEIGHT_FRACTURE: float = 0.5


class ValidationFlag(str, Enum):
    """Human-readable warnings produced by the validation layer."""

    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    HIGH_FRACTURE = "HIGH_FRACTURE"
    NO_CONSENSUS = "NO_CONSENSUS"
    CONTRADICTORY_VERDICTS = "CONTRADICTORY_VERDICTS"
    AGENT_FAILURE = "AGENT_FAILURE"


@dataclass(frozen=True)
class ContradictionRecord:
    """Describes a specific contradiction between two agents."""

    agent_a: str
    agent_b: str
    field: str
    value_a: str
    value_b: str
    severity: float


@dataclass(frozen=True)
class ValidateOutput:
    """Output of the VALIDATE phase.

    Shared between heuristic and future Granite validators.
    ``skipped`` is True only when no validator is configured.
    """

    overall_confidence: float = 0.0
    agreement_score: float = 1.0
    trust_score: float = 1.0
    contradiction_count: int = 0
    flags: Tuple[ValidationFlag, ...] = ()
    validation_source: str = "heuristic"
    skipped: bool = False


class HeuristicValidator:
    """Deterministic validation layer using heuristic rules."""

    @staticmethod
    def _compute_agreement_score(fracture_metrics: SwarmFractureMetrics) -> float:
        return fracture_metrics.agreement_score / 100.0

    @staticmethod
    def _compute_trust_score(
        assessments: Dict[str, AgentAssessment],
        fracture_metrics: SwarmFractureMetrics,
    ) -> float:
        provider_reliability = sum(
            _PROVIDER_RELIABILITY.get(a.provider, 0.5) for a in assessments.values()
        ) / max(len(assessments), 1)

        fracture_penalty = 1.0 - fracture_metrics.fracture_index / 100.0

        return (
            provider_reliability * _TRUST_WEIGHT_PROVIDER
            + fracture_penalty * _TRUST_WEIGHT_FRACTURE
        )

    @staticmethod
    def _detect_contradictions(
        assessments: Dict[str, AgentAssessment],
    ) -> List[ContradictionRecord]:
        records: List[ContradictionRecord] = []
        keys = list(assessments.keys())

        for i in range(len(keys)):
            for j in range(i + 1, len(keys)):
                a_key, b_key = keys[i], keys[j]
                a, b = assessments[a_key], assessments[b_key]

                rl_a, rl_b = a.risk_level, b.risk_level
                if (rl_a == "LOW" and rl_b == "HIGH") or (rl_a == "HIGH" and rl_b == "LOW"):
                    records.append(ContradictionRecord(
                        agent_a=a_key,
                        agent_b=b_key,
                        field="risk_level",
                        value_a=rl_a,
                        value_b=rl_b,
                        severity=1.0,
                    ))

        return records

    @staticmethod
    def _compute_overall_confidence(
        agreement_score: float,
        trust_score: float,
        fracture_metrics: SwarmFractureMetrics,
    ) -> float:
        inverse_fracture = 1.0 - fracture_metrics.fracture_index / 100.0
        return (
            agreement_score * _WEIGHT_AGREEMENT
            + trust_score * _WEIGHT_TRUST
            + inverse_fracture * _WEIGHT_FRACTURE
        )

    @staticmethod
    def _determine_flags(
        overall_confidence: float,
        agreement_score: float,
        fracture_metrics: SwarmFractureMetrics,
        contradictions: List[ContradictionRecord],
        assessments: Dict[str, AgentAssessment],
    ) -> List[ValidationFlag]:
        flags: List[ValidationFlag] = []

        if overall_confidence < _LOW_CONFIDENCE_THRESHOLD:
            flags.append(ValidationFlag.LOW_CONFIDENCE)

        if fracture_metrics.fracture_index >= _HIGH_FRACTURE_THRESHOLD:
            flags.append(ValidationFlag.HIGH_FRACTURE)

        if agreement_score < _NO_CONSENSUS_THRESHOLD:
            flags.append(ValidationFlag.NO_CONSENSUS)

        if any(c.severity >= _CONTRADICTION_SEVERITY_THRESHOLD for c in contradictions):
            flags.append(ValidationFlag.CONTRADICTORY_VERDICTS)

        if any(a.provider == "mock" for a in assessments.values()):
            flags.append(ValidationFlag.AGENT_FAILURE)

        return flags

    def validate(
        self,
        assessments: Dict[str, AgentAssessment],
        fracture_metrics: SwarmFractureMetrics,
        contradictions: Tuple[str, ...],
    ) -> ValidateOutput:
        agreement = self._compute_agreement_score(fracture_metrics)
        trust = self._compute_trust_score(assessments, fracture_metrics)
        contradiction_records = self._detect_contradictions(assessments)
        overall = self._compute_overall_confidence(agreement, trust, fracture_metrics)
        flags = self._determine_flags(overall, agreement, fracture_metrics, contradiction_records, assessments)

        return ValidateOutput(
            overall_confidence=round(overall, 4),
            agreement_score=round(agreement, 4),
            trust_score=round(trust, 4),
            contradiction_count=len(contradiction_records),
            flags=tuple(flags),
            validation_source="heuristic",
            skipped=False,
        )
