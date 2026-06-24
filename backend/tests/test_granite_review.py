from __future__ import annotations

import json
import os
import unittest
from typing import Dict
from unittest.mock import MagicMock, patch

from backend.config.runtime import reset_runtime_config
from backend.contracts.granite_review import GraniteReview
from backend.contracts.swarm_metrics import SwarmFractureMetrics
from backend.orchestrator.granite_review import GraniteReviewEngine
from backend.orchestrator.state_machine import AgentAssessment
from backend.orchestrator.validation import ValidateOutput, ValidationFlag


# ── Test helpers ───────────────────────────────────────────────────

def _assessment(
    agent_key: str = "test_agent",
    risk_level: str = "LOW",
    provider: str = "bob",
    confidence: float = 0.8,
    verdict: str = "NOMINAL",
    rationale: str = "test rationale",
) -> AgentAssessment:
    return AgentAssessment(
        agent_key=agent_key,
        agent_name=agent_key.title(),
        verdict=verdict,
        provider=provider,
        prompt="test prompt",
        confidence=confidence,
        rationale=rationale,
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


def _validation(
    overall_confidence: float = 0.8,
    agreement_score: float = 1.0,
    trust_score: float = 1.0,
    contradiction_count: int = 0,
    flags: tuple = (),
) -> ValidateOutput:
    return ValidateOutput(
        overall_confidence=overall_confidence,
        agreement_score=agreement_score,
        trust_score=trust_score,
        contradiction_count=contradiction_count,
        flags=flags,
        evidence_summary="Agent consensus is strong and fracture remains low.",
        validation_source="heuristic",
        skipped=False,
    )


# ── Test classes ───────────────────────────────────────────────────


class TestGraniteReviewModel(unittest.TestCase):
    """GraniteReview dataclass structure."""

    def test_default_skipped_review(self) -> None:
        r = GraniteReview()
        self.assertFalse(r.escalation_triggered)
        self.assertFalse(r.skipped)
        self.assertEqual(r.review_summary, "")
        self.assertEqual(r.granite_confidence, 0)
        self.assertEqual(r.provider, "granite")

    def test_escalated_review(self) -> None:
        r = GraniteReview(
            escalation_triggered=True,
            review_summary="Swarm is fractured.",
            contradiction_analysis="Agents disagree on risk.",
            confidence_assessment="Low confidence.",
            recommended_action="Monitor closely.",
            granite_confidence=72,
        )
        self.assertTrue(r.escalation_triggered)
        self.assertEqual(r.review_summary, "Swarm is fractured.")
        self.assertEqual(r.granite_confidence, 72)

    def test_immutable(self) -> None:
        r = GraniteReview(escalation_triggered=True)
        with self.assertRaises(AttributeError):
            r.escalation_triggered = False  # type: ignore[misc]


class TestGraniteReviewEscalation(unittest.TestCase):
    """Escalation rule correctness."""

    def setUp(self) -> None:
        self.engine = GraniteReviewEngine()
        self.assessments = {"a": _assessment("a")}

    def test_high_fracture_triggers_escalation(self) -> None:
        metrics = _metrics(fracture_index=75.0)
        v = _validation(overall_confidence=0.8, contradiction_count=0)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertTrue(result.escalation_triggered)
        self.assertFalse(result.skipped)

    def test_very_high_fracture_triggers_escalation(self) -> None:
        metrics = _metrics(fracture_index=80.0)
        v = _validation(overall_confidence=0.8, contradiction_count=0)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertTrue(result.escalation_triggered)

    def test_low_confidence_triggers_escalation(self) -> None:
        metrics = _metrics(fracture_index=20.0)
        v = _validation(overall_confidence=0.30, contradiction_count=0)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertTrue(result.escalation_triggered)

    def test_very_low_confidence_triggers_escalation(self) -> None:
        metrics = _metrics(fracture_index=20.0)
        v = _validation(overall_confidence=0.3, contradiction_count=0)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertTrue(result.escalation_triggered)

    def test_contradiction_triggers_escalation(self) -> None:
        metrics = _metrics(fracture_index=20.0)
        v = _validation(overall_confidence=0.8, contradiction_count=5)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertTrue(result.escalation_triggered)

    def test_multiple_contradictions_triggers_escalation(self) -> None:
        metrics = _metrics(fracture_index=20.0)
        v = _validation(overall_confidence=0.8, contradiction_count=6)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertTrue(result.escalation_triggered)

    def test_normal_conditions_skip_review(self) -> None:
        metrics = _metrics(fracture_index=20.0)
        v = _validation(overall_confidence=0.8, contradiction_count=0)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertFalse(result.escalation_triggered)
        self.assertTrue(result.skipped)
        self.assertEqual(result.review_summary, "")

    def test_boundary_fracture_just_below(self) -> None:
        metrics = _metrics(fracture_index=74.9)
        v = _validation(overall_confidence=0.8, contradiction_count=0)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertFalse(result.escalation_triggered)

    def test_boundary_fracture_just_at(self) -> None:
        metrics = _metrics(fracture_index=75.0)
        v = _validation(overall_confidence=0.8, contradiction_count=0)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertTrue(result.escalation_triggered)

    def test_boundary_confidence_just_above(self) -> None:
        metrics = _metrics(fracture_index=20.0)
        v = _validation(overall_confidence=0.31, contradiction_count=0)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertFalse(result.escalation_triggered)

    def test_boundary_confidence_just_at(self) -> None:
        metrics = _metrics(fracture_index=20.0)
        v = _validation(overall_confidence=0.30, contradiction_count=0)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertTrue(result.escalation_triggered)

    def test_boundary_contradiction_just_below(self) -> None:
        metrics = _metrics(fracture_index=20.0)
        v = _validation(overall_confidence=0.8, contradiction_count=4)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertFalse(result.escalation_triggered)

    def test_boundary_contradiction_just_at(self) -> None:
        metrics = _metrics(fracture_index=20.0)
        v = _validation(overall_confidence=0.8, contradiction_count=5)
        result = self.engine.review(self.assessments, metrics, v)
        self.assertTrue(result.escalation_triggered)


class TestGraniteReviewParsing(unittest.TestCase):
    """JSON response parsing."""

    def test_valid_json_parsing(self) -> None:
        raw = json.dumps({
            "review_summary": "Swarm is coherent.",
            "contradiction_analysis": "No contradictions.",
            "confidence_assessment": "Moderate confidence.",
            "recommended_action": "Continue monitoring.",
            "granite_confidence": 78,
        })
        result = GraniteReviewEngine._parse_response(raw)
        self.assertTrue(result.escalation_triggered)
        self.assertEqual(result.review_summary, "Swarm is coherent.")
        self.assertEqual(result.granite_confidence, 78)

    def test_invalid_json_fallback(self) -> None:
        raw = "This is not JSON at all"
        result = GraniteReviewEngine._parse_response(raw)
        self.assertTrue(result.escalation_triggered)
        self.assertEqual(result.review_summary, raw)
        self.assertIn("Unable to parse structured response", result.contradiction_analysis)
        self.assertEqual(result.granite_confidence, 50)

    def test_partial_json_missing_fields(self) -> None:
        raw = json.dumps({"review_summary": "Only summary present."})
        result = GraniteReviewEngine._parse_response(raw)
        self.assertEqual(result.review_summary, "Only summary present.")
        self.assertEqual(result.contradiction_analysis, "")
        self.assertEqual(result.granite_confidence, 50)

    def test_empty_json_object(self) -> None:
        raw = json.dumps({})
        result = GraniteReviewEngine._parse_response(raw)
        self.assertEqual(result.review_summary, "")
        self.assertEqual(result.granite_confidence, 50)

    def test_granite_confidence_bounds(self) -> None:
        raw = json.dumps({"granite_confidence": 100})
        result = GraniteReviewEngine._parse_response(raw)
        self.assertEqual(result.granite_confidence, 100)

        raw = json.dumps({"granite_confidence": 0})
        result = GraniteReviewEngine._parse_response(raw)
        self.assertEqual(result.granite_confidence, 0)


class TestGraniteReviewFailureHandling(unittest.TestCase):
    """Graceful degradation when GraniteProvider fails."""

    def setUp(self) -> None:
        self.engine = GraniteReviewEngine()
        self.assessments = {"a": _assessment("a")}
        self.metrics = _metrics(fracture_index=75.0)
        self.validation = _validation(overall_confidence=0.8, contradiction_count=0)

    @patch("backend.orchestrator.granite_review.GraniteProvider")
    def test_provider_failure_returns_fallback(self, mock_provider: MagicMock) -> None:
        mock_provider.return_value.generate.side_effect = RuntimeError("API failure")

        result = self.engine.review(self.assessments, self.metrics, self.validation)
        self.assertTrue(result.escalation_triggered)
        self.assertEqual(result.review_summary, "Granite review unavailable.")
        self.assertEqual(result.granite_confidence, 50)

    @patch("backend.orchestrator.granite_review.GraniteProvider")
    def test_provider_returns_garbage_still_fails_gracefully(
        self, mock_provider: MagicMock
    ) -> None:
        mock_provider.return_value.generate.return_value = MagicMock(
            content="not json at all"
        )

        result = self.engine.review(self.assessments, self.metrics, self.validation)
        self.assertTrue(result.escalation_triggered)
        self.assertIsInstance(result.review_summary, str)

    def test_engine_does_not_crash_without_credentials(self) -> None:
        os.environ["GRANITE_API_KEY"] = ""
        os.environ["IBM_API_KEY"] = ""
        os.environ["GRANITE_SPACE_ID"] = ""
        os.environ["IBM_SPACE_ID"] = ""
        reset_runtime_config()

        result = self.engine.review(self.assessments, self.metrics, self.validation)
        self.assertTrue(result.escalation_triggered)
        self.assertIn("unavailable", result.review_summary)


class TestGraniteReviewPromptBuilding(unittest.TestCase):
    """Prompt construction contains all required data."""

    def test_prompt_contains_key_sections(self) -> None:
        assessments = {
            "pragmatist": _assessment("pragmatist", verdict="NOMINAL", confidence=0.7),
            "mood_ring": _assessment("mood_ring", verdict="HIGH_RISK", risk_level="HIGH"),
        }
        metrics = _metrics(fracture_index=45.0, dominant_prediction="HIGH_RISK")
        v = _validation(overall_confidence=0.55, contradiction_count=1)

        prompt = GraniteReviewEngine._build_prompt(assessments, metrics, v)

        self.assertIn("VALIDATION SUMMARY", prompt)
        self.assertIn("SWARM STATE", prompt)
        self.assertIn("AGENT ASSESSMENTS", prompt)
        self.assertIn("INSTRUCTION", prompt)
        self.assertIn("Fracture index: 45", prompt)
        self.assertIn("Overall confidence: 0.55", prompt)
        self.assertIn("Agent: Pragmatist", prompt)
        self.assertIn("granite_confidence", prompt)

    def test_prompt_includes_all_agents(self) -> None:
        keys = ["pragmatist", "mood_ring", "gambler", "judge", "anarchist"]
        assessments = {k: _assessment(k) for k in keys}
        metrics = _metrics()
        v = _validation()

        prompt = GraniteReviewEngine._build_prompt(assessments, metrics, v)
        for key in keys:
            self.assertIn(key, prompt)


class TestGraniteReviewStateMachineIntegration(unittest.TestCase):
    """State machine produces GraniteReview through the full pipeline."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        os.environ["KRONOS_LLM_MODE"] = "mock"
        reset_runtime_config()

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    def test_tick_result_contains_granite_review(self) -> None:
        from backend.orchestrator.state_machine import KronosStateMachine

        sm = KronosStateMachine()
        result = sm.transition()
        self.assertIsNotNone(result.granite_review)
        self.assertIsInstance(result.granite_review, GraniteReview)

    def test_recommend_output_contains_granite_review(self) -> None:
        from backend.orchestrator.state_machine import KronosStateMachine

        sm = KronosStateMachine()
        result = sm.transition()
        self.assertIsNotNone(result.recommend.granite_review)
        self.assertIs(result.recommend.granite_review, result.granite_review)

    def test_granite_review_is_correct_type(self) -> None:
        from backend.orchestrator.state_machine import KronosStateMachine

        sm = KronosStateMachine()
        result = sm.transition()
        review = result.granite_review
        self.assertIsInstance(review.escalation_triggered, bool)
        self.assertIsInstance(review.skipped, bool)
        self.assertIsInstance(review.review_summary, str)
        self.assertIsInstance(review.granite_confidence, int)

    def test_skipped_in_mock_mode_low_fracture(self) -> None:
        from backend.orchestrator.state_machine import KronosStateMachine

        sm = KronosStateMachine()
        result = sm.transition()
        self.assertIsNotNone(result.granite_review)

    def test_granite_review_not_none(self) -> None:
        from backend.orchestrator.state_machine import KronosStateMachine

        sm = KronosStateMachine()
        result = sm.transition()
        self.assertIsNotNone(result.granite_review)
        self.assertIsNotNone(result.recommend.granite_review)


if __name__ == "__main__":
    unittest.main()
