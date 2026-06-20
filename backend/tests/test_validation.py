from __future__ import annotations

import unittest
from typing import Dict

from backend.contracts.swarm_metrics import SwarmFractureMetrics
from backend.orchestrator.state_machine import AgentAssessment
from backend.orchestrator.validation import (
    ContradictionRecord,
    HeuristicValidator,
    ValidateOutput,
    ValidationFlag,
)


def _assessment(
    agent_key: str,
    risk_level: str = "LOW",
    provider: str = "bob",
    confidence: float = 0.8,
) -> AgentAssessment:
    return AgentAssessment(
        agent_key=agent_key,
        agent_name=agent_key.title(),
        verdict="NOMINAL",
        provider=provider,
        prompt="test prompt",
        confidence=confidence,
        rationale="test rationale",
        risk_level=risk_level,
        supporting_signals=(),
    )


def _metrics(
    fracture_index: float = 20.0,
    agreement_score: float = 80.0,
    chaos_probability: float = 20.0,
    dominant_prediction: str = "HOME_WIN",
    prediction_distribution: Dict[str, int] | None = None,
) -> SwarmFractureMetrics:
    return SwarmFractureMetrics(
        fracture_index=fracture_index,
        agreement_score=agreement_score,
        chaos_probability=chaos_probability,
        dominant_prediction=dominant_prediction,
        prediction_distribution=prediction_distribution or {"HOME_WIN": 4, "DRAW": 1},
    )


class TestHeuristicValidator(unittest.TestCase):
    """HeuristicValidator algorithm correctness."""

    def setUp(self) -> None:
        self.validator = HeuristicValidator()

    def test_perfect_agreement_high_trust(self) -> None:
        assessments = {
            "pragmatist": _assessment("pragmatist", provider="bob"),
            "mood_ring": _assessment("mood_ring", provider="bob"),
        }
        metrics = _metrics(agreement_score=100.0, fracture_index=0.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertGreaterEqual(result.overall_confidence, 0.85)
        self.assertGreaterEqual(result.trust_score, 0.85)
        self.assertEqual(result.agreement_score, 1.0)
        self.assertEqual(result.contradiction_count, 0)
        self.assertFalse(result.flags)

    def test_high_fracture_flag(self) -> None:
        assessments = {
            "pragmatist": _assessment("pragmatist"),
            "mood_ring": _assessment("mood_ring"),
        }
        metrics = _metrics(agreement_score=40.0, fracture_index=80.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertIn(ValidationFlag.HIGH_FRACTURE, result.flags)

    def test_no_consensus_flag(self) -> None:
        assessments = {
            "pragmatist": _assessment("pragmatist"),
            "mood_ring": _assessment("mood_ring"),
        }
        metrics = _metrics(agreement_score=30.0, fracture_index=70.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertIn(ValidationFlag.NO_CONSENSUS, result.flags)

    def test_low_confidence_flag(self) -> None:
        assessments = {
            "pragmatist": _assessment("pragmatist", provider="mock"),
            "mood_ring": _assessment("mood_ring", provider="mock"),
        }
        # agreement=40%, fracture=50% → overall ≈ 0.465 < 0.5
        metrics = _metrics(agreement_score=40.0, fracture_index=50.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertIn(ValidationFlag.LOW_CONFIDENCE, result.flags)
        self.assertLess(result.overall_confidence, 0.5)

    def test_contradictory_verdicts_flag(self) -> None:
        assessments = {
            "pragmatist": _assessment("pragmatist", risk_level="LOW"),
            "mood_ring": _assessment("mood_ring", risk_level="HIGH"),
        }
        metrics = _metrics(agreement_score=100.0, fracture_index=0.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertIn(ValidationFlag.CONTRADICTORY_VERDICTS, result.flags)
        self.assertEqual(result.contradiction_count, 1)

    def test_agent_failure_flag_all_mock(self) -> None:
        assessments = {
            "pragmatist": _assessment("pragmatist", provider="mock"),
            "mood_ring": _assessment("mood_ring", provider="mock"),
        }
        metrics = _metrics()
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertIn(ValidationFlag.AGENT_FAILURE, result.flags)

    def test_no_agent_failure_with_bob(self) -> None:
        assessments = {
            "pragmatist": _assessment("pragmatist", provider="bob"),
            "mood_ring": _assessment("mood_ring", provider="bob"),
        }
        metrics = _metrics()
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertNotIn(ValidationFlag.AGENT_FAILURE, result.flags)

    def test_contradiction_count(self) -> None:
        assessments = {
            "a": _assessment("a", risk_level="LOW"),
            "b": _assessment("b", risk_level="HIGH"),
            "c": _assessment("c", risk_level="LOW"),
            "d": _assessment("d", risk_level="HIGH"),
        }
        metrics = _metrics()
        result = self.validator.validate(assessments, metrics, contradictions=())

        # 4 agents: pairs with LOW vs HIGH = (a,b), (a,d), (c,b), (c,d) = 4
        self.assertEqual(result.contradiction_count, 4)

    def test_no_contradiction_same_risk_level(self) -> None:
        assessments = {
            "a": _assessment("a", risk_level="LOW"),
            "b": _assessment("b", risk_level="LOW"),
            "c": _assessment("c", risk_level="MEDIUM"),
        }
        metrics = _metrics()
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertEqual(result.contradiction_count, 0)

    def test_agreement_score_normalization(self) -> None:
        assessments = {
            "a": _assessment("a"),
            "b": _assessment("b"),
        }
        metrics = _metrics(agreement_score=75.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertEqual(result.agreement_score, 0.75)

    def test_trust_score_mock_providers(self) -> None:
        assessments = {
            "a": _assessment("a", provider="mock"),
            "b": _assessment("b", provider="mock"),
        }
        metrics = _metrics(fracture_index=0.0, agreement_score=100.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        # provider_reliability = 0.5, fracture_penalty = 1.0
        # trust = 0.5 * 0.5 + 1.0 * 0.5 = 0.75
        self.assertAlmostEqual(result.trust_score, 0.75)

    def test_trust_score_bob_providers(self) -> None:
        assessments = {
            "a": _assessment("a", provider="bob"),
            "b": _assessment("b", provider="bob"),
        }
        metrics = _metrics(fracture_index=0.0, agreement_score=100.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        # provider_reliability = 0.9, fracture_penalty = 1.0
        # trust = 0.9 * 0.5 + 1.0 * 0.5 = 0.95
        self.assertAlmostEqual(result.trust_score, 0.95)

    def test_overall_confidence_formula(self) -> None:
        assessments = {
            "a": _assessment("a", provider="bob"),
        }
        # agreement=80%, fracture=20% → agreement_score=0.8, inverse_fracture=0.8
        metrics = _metrics(agreement_score=80.0, fracture_index=20.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        # trust = 0.9*0.5 + 0.8*0.5 = 0.85
        # overall = 0.8*0.35 + 0.85*0.40 + 0.8*0.25 = 0.28 + 0.34 + 0.20 = 0.82
        expected = round(0.8 * 0.35 + 0.85 * 0.40 + 0.8 * 0.25, 4)
        self.assertAlmostEqual(result.overall_confidence, expected)

    def test_validate_output_immutable(self) -> None:
        assessments = {"a": _assessment("a")}
        metrics = _metrics()
        result = self.validator.validate(assessments, metrics, contradictions=())

        with self.assertRaises(AttributeError):
            result.overall_confidence = 0.5  # type: ignore[misc]

    def test_validation_source(self) -> None:
        assessments = {"a": _assessment("a")}
        metrics = _metrics()
        result = self.validator.validate(assessments, metrics, contradictions=())

        self.assertEqual(result.validation_source, "heuristic")
        self.assertFalse(result.skipped)

    def test_multiple_flags(self) -> None:
        assessments = {
            "a": _assessment("a", risk_level="LOW", provider="mock"),
            "b": _assessment("b", risk_level="HIGH", provider="mock"),
        }
        # fracture=80 → HIGH_FRACTURE, agreement=20% → NO_CONSENSUS
        metrics = _metrics(agreement_score=20.0, fracture_index=80.0)
        result = self.validator.validate(assessments, metrics, contradictions=())

        expected_flags = {
            ValidationFlag.LOW_CONFIDENCE,
            ValidationFlag.HIGH_FRACTURE,
            ValidationFlag.NO_CONSENSUS,
            ValidationFlag.CONTRADICTORY_VERDICTS,
            ValidationFlag.AGENT_FAILURE,
        }
        self.assertEqual(set(result.flags), expected_flags)


if __name__ == "__main__":
    unittest.main()
