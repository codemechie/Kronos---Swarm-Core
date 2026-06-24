"""Quick smoke test for the state machine implementation."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    _proj = str(Path(__file__).resolve().parent.parent)
except NameError:
    _proj = str(Path(".").resolve())
if _proj not in sys.path:
    sys.path.insert(0, _proj)

from backend.orchestrator.state_machine import (
    AgentAssessment,
    KronosStateMachine,
    KronosPhase,
    TickResult,
)


def main() -> int:
    sm = KronosStateMachine()

    for i in range(5):
        result = sm.transition()
        assert isinstance(result, TickResult), "result must be TickResult"
        assert result.phase == KronosPhase.RECOMMEND, "final phase must be RECOMMEND"

        # All phase outputs present
        assert result.observe is not None
        assert result.analyze is not None
        assert result.debate is not None
        assert result.validate is not None
        assert result.recommend is not None

        # Validate runs (heuristic)
        assert result.validate.skipped is False
        assert result.validate.validation_source == "heuristic"
        assert 0.0 <= result.validate.overall_confidence <= 1.0
        assert 0.0 <= result.validate.trust_score <= 1.0
        assert isinstance(result.validate.contradiction_count, int)
        assert isinstance(result.validate.flags, tuple)

        # 5 agents produced output
        assert len(result.recommend.debate_outputs) == 5
        assert len(result.recommend.provider_metadata) == 5
        assert len(result.recommend.assessments) == 5

        # Structured assessment fields present
        for key, assessment in result.recommend.assessments.items():
            assert isinstance(assessment, AgentAssessment)
            assert isinstance(assessment.confidence, float), f"{key}: confidence must be float"
            assert 0.0 <= assessment.confidence <= 1.0, f"{key}: confidence out of bounds"
            assert isinstance(assessment.rationale, str), f"{key}: rationale must be str"
            assert assessment.rationale != "", f"{key}: rationale must not be empty"
            assert assessment.risk_level in ("LOW", "MEDIUM", "HIGH"), f"{key}: invalid risk_level"
            assert isinstance(assessment.supporting_signals, tuple), f"{key}: supporting_signals must be tuple"
            assert assessment.verdict in ("HIGH_RISK", "NOMINAL", "ELEVATED_RISK"), f"{key}: unexpected verdict"

        # Backward-compatible dict
        d = sm.to_legacy_dict(result)
        assert "telemetry" in d
        assert "debate_outputs" in d
        assert "swarm_metrics" in d
        assert "provider_metadata" in d
        assert "fracture_index" in d["swarm_metrics"]
        assert "chaos_probability" in d["swarm_metrics"]
        assert "agreement_score" in d["swarm_metrics"]
        assert "dominant_prediction" in d["swarm_metrics"]

        tel = d["telemetry"]
        assert "match_minute" in tel
        assert "score_home" in tel
        assert "score_away" in tel
        assert "tactical" in tel
        assert "physical" in tel
        assert "psychology" in tel
        assert "game_theory" in tel
        assert "environment" in tel

        v = result.validate
        print(
            f"  Tick {i+1}: minute={result.observe.match_minute} "
            f"phase={result.observe.match_phase} "
            f"fracture={d['swarm_metrics']['fracture_index']} "
            f"urgency={result.recommend.urgency} "
            f"conf={v.overall_confidence:.2f} trust={v.trust_score:.2f} "
            f"flags={[f.value for f in v.flags]}\n"
            f"         {v.evidence_summary}"
        )

    # Verify anomaly detection via ticker scripted triggers (minute 76+)
    for _ in range(80):
        result = sm.transition()

    print(f"  Late match: minute={result.observe.match_minute} anomalies={result.observe.anomalies}")
    assert result.observe.match_phase == "CHAOS"

    print("\nAll assertions passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
