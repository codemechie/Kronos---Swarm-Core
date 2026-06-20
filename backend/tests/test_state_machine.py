from __future__ import annotations

import os
import unittest

from backend.config.runtime import reset_runtime_config
from backend.orchestrator.state_machine import (
    AgentAssessment,
    KronosStateMachine,
    KronosPhase,
    TickResult,
)


def _set_mock_mode() -> None:
    os.environ["KRONOS_LLM_MODE"] = "mock"
    reset_runtime_config()


def _restore_env(saved: dict) -> None:
    os.environ.clear()
    os.environ.update(saved)


class TestParseAssessmentFromContent(unittest.TestCase):
    """Structured output creation from raw LLM response strings."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        _set_mock_mode()
        self.sm = KronosStateMachine()

    def tearDown(self) -> None:
        _restore_env(self._env)

    def test_high_risk_parsing(self) -> None:
        content = "[JUDGE]: High-risk pattern detected. Variance exceeds threshold."
        parsed = self.sm._parse_assessment_from_content(content)
        self.assertEqual(parsed["verdict"], "HIGH_RISK")
        self.assertEqual(parsed["confidence"], 0.81)
        self.assertEqual(parsed["risk_level"], "HIGH")
        self.assertEqual(parsed["rationale"], content)
        self.assertEqual(parsed["supporting_signals"], ("variance_threshold",))

    def test_nominal_parsing(self) -> None:
        content = "[PRAGMATIST]: Nominal conditions observed. No significant deviation."
        parsed = self.sm._parse_assessment_from_content(content)
        self.assertEqual(parsed["verdict"], "NOMINAL")
        self.assertEqual(parsed["confidence"], 0.62)
        self.assertEqual(parsed["risk_level"], "LOW")
        self.assertEqual(parsed["rationale"], content)
        self.assertEqual(parsed["supporting_signals"], ())

    def test_elevated_risk_fallback(self) -> None:
        content = "[ANARCHIST]: Unrecognized pattern — monitoring required."
        parsed = self.sm._parse_assessment_from_content(content)
        self.assertEqual(parsed["verdict"], "ELEVATED_RISK")
        self.assertEqual(parsed["confidence"], 0.70)
        self.assertEqual(parsed["risk_level"], "MEDIUM")
        self.assertEqual(parsed["supporting_signals"], ("anomaly_detected",))


class TestAgentAssessmentStructuredFields(unittest.TestCase):
    """Confidence bounds and risk classification on created assessments."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        _set_mock_mode()
        self.sm = KronosStateMachine()

    def tearDown(self) -> None:
        _restore_env(self._env)

    def test_all_assessments_have_structured_fields(self) -> None:
        result = self.sm.transition()
        for key, assessment in result.recommend.assessments.items():
            with self.subTest(agent=key):
                self.assertIsInstance(assessment, AgentAssessment)
                self.assertIsInstance(assessment.confidence, float)
                self.assertIsInstance(assessment.rationale, str)
                self.assertIsInstance(assessment.risk_level, str)
                self.assertIsInstance(assessment.supporting_signals, tuple)
                self.assertIn(assessment.risk_level, ("LOW", "MEDIUM", "HIGH"))

    def test_confidence_bounds(self) -> None:
        for _ in range(20):
            result = self.sm.transition()
            for key, assessment in result.recommend.assessments.items():
                with self.subTest(agent=key, confidence=assessment.confidence):
                    self.assertGreaterEqual(assessment.confidence, 0.0)
                    self.assertLessEqual(assessment.confidence, 1.0)

    def test_risk_level_consistency(self) -> None:
        for _ in range(20):
            result = self.sm.transition()
            for assessment in result.recommend.assessments.values():
                rl = assessment.risk_level
                conf = assessment.confidence
                if rl == "HIGH":
                    self.assertGreaterEqual(conf, 0.75)
                elif rl == "MEDIUM":
                    self.assertGreaterEqual(conf, 0.65)

    def test_verdict_values(self) -> None:
        for _ in range(20):
            result = self.sm.transition()
            for assessment in result.recommend.assessments.values():
                self.assertIn(assessment.verdict, ("HIGH_RISK", "NOMINAL", "ELEVATED_RISK"))

    def test_supporting_signals_type(self) -> None:
        result = self.sm.transition()
        for assessment in result.recommend.assessments.values():
            for signal in assessment.supporting_signals:
                self.assertIsInstance(signal, str)


class TestBackwardCompatibility(unittest.TestCase):
    """Serialisation and backward-compatible dict output."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        _set_mock_mode()
        self.sm = KronosStateMachine()

    def tearDown(self) -> None:
        _restore_env(self._env)

    def test_debate_outputs_remain_raw_strings(self) -> None:
        result = self.sm.transition()
        for key, text in result.recommend.debate_outputs.items():
            with self.subTest(agent=key):
                self.assertIsInstance(text, str)

    def test_to_legacy_dict_shape(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        expected_keys = {"telemetry", "debate_outputs", "swarm_metrics", "provider_metadata"}
        self.assertEqual(set(d.keys()), expected_keys)

    def test_assessments_not_in_legacy_dict(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        self.assertNotIn("assessments", d)


class TestTickResult(unittest.TestCase):
    """TickResult phase output integrity."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        _set_mock_mode()
        self.sm = KronosStateMachine()

    def tearDown(self) -> None:
        _restore_env(self._env)

    def test_all_phases_present(self) -> None:
        result = self.sm.transition()
        self.assertIsNotNone(result.observe)
        self.assertIsNotNone(result.analyze)
        self.assertIsNotNone(result.debate)
        self.assertIsNotNone(result.validate)
        self.assertIsNotNone(result.recommend)

    def test_five_agents(self) -> None:
        result = self.sm.transition()
        self.assertEqual(len(result.recommend.assessments), 5)
        self.assertEqual(len(result.recommend.debate_outputs), 5)
        self.assertEqual(len(result.recommend.provider_metadata), 5)

    def test_validate_not_skipped(self) -> None:
        result = self.sm.transition()
        self.assertFalse(result.validate.skipped)
        self.assertEqual(result.validate.validation_source, "heuristic")
        self.assertIsInstance(result.validate.overall_confidence, float)
        self.assertIsInstance(result.validate.agreement_score, float)
        self.assertIsInstance(result.validate.trust_score, float)
        self.assertIsInstance(result.validate.contradiction_count, int)
        self.assertIsInstance(result.validate.flags, tuple)

    def test_validation_in_recommend(self) -> None:
        result = self.sm.transition()
        self.assertIsNotNone(result.recommend.validation)
        self.assertIs(result.recommend.validation, result.validate)

    def test_phase_enum(self) -> None:
        result = self.sm.transition()
        self.assertIs(result.phase, KronosPhase.RECOMMEND)
        self.assertIsInstance(result.phase, KronosPhase)


if __name__ == "__main__":
    unittest.main()
