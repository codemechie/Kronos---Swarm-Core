#!/usr/bin/env python
"""Phase G.4A — Validate Granite escalation has been restored.

Confirms:
- Default thresholds match original working values (60, 0.50, 1)
- Realistic match conditions trigger escalation
- Env var overrides work correctly
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.config.runtime import get_runtime_config, reset_runtime_config
from backend.contracts.swarm_metrics import SwarmFractureMetrics
from backend.orchestrator.granite_review import GraniteReviewEngine
from backend.orchestrator.validation import ValidateOutput

PASS = "PASS"
FAIL = "FAIL"

results: list[dict] = []


def record(test_name: str, status: str, detail: str = "") -> None:
    results.append({"test": test_name, "status": status, "detail": detail})
    print(f"  [{status}] {test_name}")
    if detail:
        for line in detail.split("\n"):
            print(f"         {line}")


def heading(title: str) -> None:
    print(f"\n{'=' * 65}")
    print(f"  {title}")
    print(f"{'=' * 65}")


def make_metrics(fracture: float = 20.0) -> MagicMock:
    m = MagicMock(spec=SwarmFractureMetrics)
    m.fracture_index = fracture
    m.chaos_probability = 0.3
    m.dominant_prediction = "HOME_WIN"
    m.prediction_distribution = ("HOME_WIN", "DRAW")
    return m


def make_validation(
    confidence: float = 0.8, contradictions: int = 0
) -> MagicMock:
    v = MagicMock(spec=ValidateOutput)
    v.overall_confidence = confidence
    v.agreement_score = 0.7
    v.trust_score = 0.65
    v.contradiction_count = contradictions
    v.flags = []
    v.evidence_summary = "Stable."
    v.validation_source = "heuristic"
    v.skipped = False
    return v


def make_assessments() -> Dict[str, Any]:
    a = MagicMock()
    a.agent_key = "pragmatist"
    a.agent_name = "Market Pragmatist"
    a.verdict = "NOMINAL"
    a.provider = "mock"
    a.prompt = "test"
    a.confidence = 0.72
    a.risk_level = "LOW"
    a.rationale = "Normal conditions."
    a.supporting_signals = ()
    return {"pragmatist": a}


# ── Test 1: Default threshold values ──────────────────────────────────


def test_default_thresholds() -> None:
    heading("Default threshold values")

    cfg = get_runtime_config()
    record(
        "Default fracture threshold",
        PASS if cfg.granite_fracture_threshold == 60.0 else FAIL,
        f"got={cfg.granite_fracture_threshold} expected=60.0",
    )
    record(
        "Default confidence threshold",
        PASS if cfg.granite_confidence_threshold == 0.50 else FAIL,
        f"got={cfg.granite_confidence_threshold} expected=0.50",
    )
    record(
        "Default contradiction threshold",
        PASS if cfg.granite_contradiction_threshold == 1 else FAIL,
        f"got={cfg.granite_contradiction_threshold} expected=1",
    )


# ── Test 2: Realistic conditions trigger escalation ────────────────────


def test_realistic_escalation() -> None:
    heading("Realistic match conditions trigger escalation")

    engine = GraniteReviewEngine()
    assessments = make_assessments()

    # Typical scenarios from the calibration report:
    scenarios = [
        ("normal consensus", 20.0, 0.85, 0, False),
        ("mild disagreement", 30.0, 0.75, 2, True),   # contradictions >= 1
        ("moderate disagreement", 40.0, 0.70, 1, True), # contradictions >= 1
        ("stronger disagreement", 50.0, 0.65, 3, True), # contradictions >= 1
        ("elevated fracture", 60.0, 0.55, 2, True),    # fracture >= 60
        ("high fracture", 70.0, 0.40, 4, True),         # fracture >= 60
    ]

    for label, fi, conf, cc, expect_escalate in scenarios:
        metrics = make_metrics(fracture=fi)
        validation = make_validation(confidence=conf, contradictions=cc)
        should = engine._should_escalate(metrics, validation)
        ok = should == expect_escalate
        status = PASS if ok else FAIL
        record(
            f"Scenario: {label}",
            status,
            f"fracture={fi} confidence={conf} contradictions={cc} -> should_escalate={should} (expected={expect_escalate})",
        )


# ── Test 3: Env var overrides work ────────────────────────────────────


def test_env_overrides() -> None:
    heading("Environment variable overrides work")

    os.environ["GRANITE_FRACTURE_THRESHOLD"] = "80"
    os.environ["GRANITE_CONFIDENCE_THRESHOLD"] = "0.20"
    os.environ["GRANITE_CONTRADICTION_THRESHOLD"] = "10"
    reset_runtime_config()

    cfg = get_runtime_config()
    details = (
        f"fracture={cfg.granite_fracture_threshold} "
        f"confidence={cfg.granite_confidence_threshold} "
        f"contradictions={cfg.granite_contradiction_threshold}"
    )
    ok = (
        cfg.granite_fracture_threshold == 80.0
        and cfg.granite_confidence_threshold == 0.20
        and cfg.granite_contradiction_threshold == 10
    )
    record(
        "Custom threshold values from env",
        PASS if ok else FAIL,
        details,
    )

    # Verify engine uses the overridden values
    engine = GraniteReviewEngine()
    # fracture=75 with threshold=80 should NOT escalate
    should = engine._should_escalate(
        make_metrics(fracture=75.0), make_validation(confidence=0.8, contradictions=0)
    )
    record(
        "Engine respects custom fracture threshold (75 < 80, no escalation)",
        PASS if not should else FAIL,
        f"should_escalate={should}",
    )
    # fracture=85 with threshold=80 SHOULD escalate
    should = engine._should_escalate(
        make_metrics(fracture=85.0), make_validation(confidence=0.8, contradictions=0)
    )
    record(
        "Engine respects custom fracture threshold (85 >= 80, escalates)",
        PASS if should else FAIL,
        f"should_escalate={should}",
    )

    # Clean up
    os.environ.pop("GRANITE_FRACTURE_THRESHOLD", None)
    os.environ.pop("GRANITE_CONFIDENCE_THRESHOLD", None)
    os.environ.pop("GRANITE_CONTRADICTION_THRESHOLD", None)
    reset_runtime_config()


# ── Test 4: Review engine integration ────────────────────────────────


def test_review_engine_integration() -> None:
    heading("Review engine integration (mocked Granite)")

    engine = GraniteReviewEngine()
    assessments = make_assessments()

    # Scenario that should escalate: fracture=60, contradictions=1, confidence=0.55
    metrics = make_metrics(fracture=60.0)
    validation = make_validation(confidence=0.55, contradictions=1)
    should = engine._should_escalate(metrics, validation)
    record(
        "Engine escalates on fracture >= 60",
        PASS if should else FAIL,
        f"fracture=60 confidence=0.55 contradictions=1 -> should_escalate={should}",
    )

    # Scenario that should escalate: contradictions >= 1
    metrics = make_metrics(fracture=30.0)
    validation = make_validation(confidence=0.80, contradictions=2)
    should = engine._should_escalate(metrics, validation)
    record(
        "Engine escalates on contradictions >= 1",
        PASS if should else FAIL,
        f"fracture=30 confidence=0.80 contradictions=2 -> should_escalate={should}",
    )

    # Scenario that should NOT escalate
    metrics = make_metrics(fracture=30.0)
    validation = make_validation(confidence=0.80, contradictions=0)
    should = engine._should_escalate(metrics, validation)
    record(
        "Engine skips when all conditions nominal",
        PASS if not should else FAIL,
        f"fracture=30 confidence=0.80 contradictions=0 -> should_escalate={should}",
    )


# ── Main ──────────────────────────────────────────────────────────────


def main() -> None:
    print("=" * 65)
    print("  Phase G.4A — Validate Granite Escalation Restored")
    print("=" * 65)

    test_default_thresholds()
    test_realistic_escalation()
    test_env_overrides()
    test_review_engine_integration()

    print(f"\n{'=' * 65}")
    print("  Summary")
    print(f"{'=' * 65}")
    n_pass = sum(1 for r in results if r["status"] == PASS)
    n_fail = sum(1 for r in results if r["status"] == FAIL)
    print(f"  Passed: {n_pass}  Failed: {n_fail}  Total: {len(results)}")

    failures = [r for r in results if r["status"] == FAIL]
    if failures:
        print(f"\n{'-' * 65}")
        print("  FAILURES:")
        for r in failures:
            print(f"    - {r['test']}: {r['detail']}")
        print()

    if n_fail == 0:
        print("  Granite escalation restored with configurable thresholds.")
        print(f"{'=' * 65}")
    else:
        print(f"  {n_fail} test(s) failed. Review output above.")
        print(f"{'=' * 65}")
        sys.exit(1)


if __name__ == "__main__":
    main()
