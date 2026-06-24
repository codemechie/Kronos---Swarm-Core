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
        expected_keys = {
            "telemetry", "debate_outputs", "swarm_metrics",
            "provider_metadata", "validation", "granite_review",
        }
        self.assertEqual(set(d.keys()), expected_keys)

    def test_assessments_not_in_legacy_dict(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        self.assertNotIn("assessments", d)

    def test_validation_block_exists(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        self.assertIn("validation", d)
        self.assertIsInstance(d["validation"], dict)

    def test_validation_fields_present(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        v = d["validation"]
        expected_fields = {
            "overall_confidence", "agreement_score", "trust_score",
            "contradiction_count", "flags", "evidence_summary",
            "validation_source", "skipped",
        }
        self.assertEqual(set(v.keys()), expected_fields)

    def test_validation_numeric_fields(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        v = d["validation"]
        self.assertIsInstance(v["overall_confidence"], float)
        self.assertIsInstance(v["agreement_score"], float)
        self.assertIsInstance(v["trust_score"], float)
        self.assertIsInstance(v["contradiction_count"], int)
        self.assertIsInstance(v["validation_source"], str)
        self.assertIsInstance(v["skipped"], bool)

    def test_flags_serialize_as_strings(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        flags = d["validation"]["flags"]
        self.assertIsInstance(flags, list)
        if flags:
            for flag in flags:
                self.assertIsInstance(flag, str)

    def test_flags_json_serializable(self) -> None:
        import json
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        serialized = json.dumps(d)
        deserialized = json.loads(serialized)
        self.assertIn("validation", deserialized)
        self.assertIn("flags", deserialized["validation"])
        self.assertIsInstance(deserialized["validation"]["flags"], list)

    def test_evidence_summary_included(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        summary = d["validation"]["evidence_summary"]
        self.assertIsInstance(summary, str)
        self.assertGreater(len(summary), 0)

    def test_validation_source_is_heuristic(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        self.assertEqual(d["validation"]["validation_source"], "heuristic")

    def test_skipped_false_in_mock_mode(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        self.assertFalse(d["validation"]["skipped"])

    # ── GraniteReview serialization tests ───────────────────────────

    def test_granite_review_key_exists(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        self.assertIn("granite_review", d)

    def test_granite_review_all_fields_present(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        gr = d["granite_review"]
        expected_fields = {
            "escalation_triggered", "review_summary",
            "contradiction_analysis", "confidence_assessment",
            "recommended_action", "granite_confidence",
            "provider", "skipped",
        }
        self.assertEqual(set(gr.keys()), expected_fields)

    def test_granite_review_field_types(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        gr = d["granite_review"]
        self.assertIsInstance(gr["escalation_triggered"], bool)
        self.assertIsInstance(gr["review_summary"], str)
        self.assertIsInstance(gr["contradiction_analysis"], str)
        self.assertIsInstance(gr["confidence_assessment"], str)
        self.assertIsInstance(gr["recommended_action"], str)
        self.assertIsInstance(gr["granite_confidence"], int)
        self.assertIsInstance(gr["provider"], str)
        self.assertIsInstance(gr["skipped"], bool)

    def test_granite_review_json_serializable(self) -> None:
        import json
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        serialized = json.dumps(d)
        deserialized = json.loads(serialized)
        self.assertIn("granite_review", deserialized)
        gr = deserialized["granite_review"]
        self.assertIsInstance(gr["escalation_triggered"], bool)
        self.assertIsInstance(gr["granite_confidence"], int)
        self.assertIsInstance(gr["review_summary"], str)

    def test_existing_payload_structure_unchanged(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        self.assertIn("telemetry", d)
        self.assertIn("debate_outputs", d)
        self.assertIn("swarm_metrics", d)
        self.assertIn("provider_metadata", d)
        self.assertIn("validation", d)
        self.assertIsInstance(d["telemetry"], dict)
        self.assertIsInstance(d["debate_outputs"], dict)
        self.assertIsInstance(d["swarm_metrics"], dict)
        self.assertIsInstance(d["provider_metadata"], dict)
        self.assertIsInstance(d["validation"], dict)


class TestGraniteReviewLegacySerialization(unittest.TestCase):
    """GraniteReview serialization in to_legacy_dict with known objects."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        _set_mock_mode()
        self.sm = KronosStateMachine()

    def tearDown(self) -> None:
        _restore_env(self._env)

    def test_skipped_review_serialization(self) -> None:
        from backend.contracts.granite_review import GraniteReview
        gr = GraniteReview(
            escalation_triggered=False,
            review_summary="Granite review not required.",
            contradiction_analysis="",
            confidence_assessment="",
            recommended_action="",
            granite_confidence=0,
            provider="granite",
            skipped=True,
        )
        result = self.sm.transition()
        object.__setattr__(result, "granite_review", gr)
        object.__setattr__(result.recommend, "granite_review", gr)
        d = self.sm.to_legacy_dict(result)
        gr_dict = d["granite_review"]
        self.assertFalse(gr_dict["escalation_triggered"])
        self.assertEqual(gr_dict["review_summary"], "Granite review not required.")
        self.assertEqual(gr_dict["granite_confidence"], 0)
        self.assertEqual(gr_dict["provider"], "granite")
        self.assertTrue(gr_dict["skipped"])

    def test_escalated_review_serialization(self) -> None:
        from backend.contracts.granite_review import GraniteReview
        gr = GraniteReview(
            escalation_triggered=True,
            review_summary="Swarm is fractured.",
            contradiction_analysis="Multiple agents disagree on risk assessment.",
            confidence_assessment="Low confidence in swarm consensus.",
            recommended_action="Manual intervention recommended.",
            granite_confidence=72,
            provider="granite",
            skipped=False,
        )
        result = self.sm.transition()
        object.__setattr__(result, "granite_review", gr)
        object.__setattr__(result.recommend, "granite_review", gr)
        d = self.sm.to_legacy_dict(result)
        gr_dict = d["granite_review"]
        self.assertTrue(gr_dict["escalation_triggered"])
        self.assertEqual(gr_dict["review_summary"], "Swarm is fractured.")
        self.assertEqual(gr_dict["contradiction_analysis"], "Multiple agents disagree on risk assessment.")
        self.assertEqual(gr_dict["confidence_assessment"], "Low confidence in swarm consensus.")
        self.assertEqual(gr_dict["recommended_action"], "Manual intervention recommended.")
        self.assertEqual(gr_dict["granite_confidence"], 72)
        self.assertFalse(gr_dict["skipped"])

    def test_granite_review_never_none(self) -> None:
        from backend.contracts.granite_review import GraniteReview
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        self.assertIsNotNone(d["granite_review"])
        self.assertIsInstance(d["granite_review"], dict)

    def test_validation_and_granite_coexist(self) -> None:
        result = self.sm.transition()
        d = self.sm.to_legacy_dict(result)
        self.assertIn("validation", d)
        self.assertIn("granite_review", d)
        self.assertEqual(set(d["validation"].keys()), {
            "overall_confidence", "agreement_score", "trust_score",
            "contradiction_count", "flags", "evidence_summary",
            "validation_source", "skipped",
        })
        self.assertEqual(set(d["granite_review"].keys()), {
            "escalation_triggered", "review_summary",
            "contradiction_analysis", "confidence_assessment",
            "recommended_action", "granite_confidence",
            "provider", "skipped",
        })


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
