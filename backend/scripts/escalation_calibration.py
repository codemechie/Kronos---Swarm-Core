from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

os.environ["KRONOS_LLM_MODE"] = "mock"

from backend.config.runtime import reset_runtime_config

reset_runtime_config()

from backend.orchestrator.state_machine import KronosStateMachine


def _mock_granite_response(*args, **kwargs) -> str:
    return json.dumps({
        "review_summary": "Mock calibration review summary.",
        "contradiction_analysis": "Mock contradiction analysis.",
        "confidence_assessment": "Mock confidence assessment.",
        "recommended_action": "Mock recommended action.",
        "granite_confidence": 50,
    })


def run_calibration(ticks: int = 30) -> list[dict]:
    sm = KronosStateMachine()
    observations: list[dict] = []

    for i in range(ticks):
        with patch.object(sm.granite_review_engine, "_call_granite", _mock_granite_response):
            result = sm.transition()
        rec = result.recommend
        v = result.validate
        fi = rec.fracture_metrics.fracture_index
        conf = v.overall_confidence
        cc = v.contradiction_count

        fracture_trigger = fi >= 60.0
        confidence_trigger = conf <= 0.50
        contradiction_trigger = cc >= 1

        observations.append({
            "tick": i + 1,
            "fracture": fi,
            "confidence": round(conf, 4),
            "contradictions": cc,
            "fracture_trigger": fracture_trigger,
            "confidence_trigger": confidence_trigger,
            "contradiction_trigger": contradiction_trigger,
            "escalated": fracture_trigger or confidence_trigger or contradiction_trigger,
        })

    return observations


def analyze(obs: list[dict]) -> None:
    n = len(obs)

    fractures = [o["fracture"] for o in obs]
    fractures_sorted = sorted(fractures)
    fi_min = fractures_sorted[0]
    fi_max = fractures_sorted[-1]
    fi_mean = sum(fractures) / n
    fi_median = fractures_sorted[n // 2]

    confs = [o["confidence"] for o in obs]
    confs_sorted = sorted(confs)
    c_min = confs_sorted[0]
    c_max = confs_sorted[-1]
    c_mean = sum(confs) / n
    c_median = confs_sorted[n // 2]

    cc_dist = Counter(o["contradictions"] for o in obs)
    escalated = sum(1 for o in obs if o["escalated"])

    fracture_triggered = sum(1 for o in obs if o["fracture_trigger"])
    confidence_triggered = sum(1 for o in obs if o["confidence_trigger"])
    contradiction_triggered = sum(1 for o in obs if o["contradiction_trigger"])

    only_fracture = sum(1 for o in obs if o["fracture_trigger"] and not o["confidence_trigger"] and not o["contradiction_trigger"])
    only_confidence = sum(1 for o in obs if not o["fracture_trigger"] and o["confidence_trigger"] and not o["contradiction_trigger"])
    only_contradiction = sum(1 for o in obs if not o["fracture_trigger"] and not o["confidence_trigger"] and o["contradiction_trigger"])
    multi = sum(1 for o in obs if o["fracture_trigger"] + o["confidence_trigger"] + o["contradiction_trigger"] >= 2)
    none_esc = sum(1 for o in obs if not o["escalated"])

    print("=" * 60)
    print(f"SAMPLE SIZE: {n} ticks")
    print()

    print("--- FRACTURE STATISTICS ---")
    print(f"  Min:    {fi_min}")
    print(f"  Max:    {fi_max}")
    print(f"  Mean:   {fi_mean:.2f}")
    print(f"  Median: {fi_median}")
    print()

    print("--- CONFIDENCE STATISTICS ---")
    print(f"  Min:    {c_min}")
    print(f"  Max:    {c_max}")
    print(f"  Mean:   {c_mean:.4f}")
    print(f"  Median: {c_median}")
    print()

    print("--- CONTRADICTION DISTRIBUTION ---")
    for k in sorted(cc_dist):
        print(f"  {k} contradictions = {cc_dist[k]} ticks ({cc_dist[k]/n*100:.0f}%)")
    print()

    print("--- CURRENT ESCALATION BREAKDOWN ---")
    print(f"  Fracture triggered (>= 60):     {fracture_triggered}/{n} = {fracture_triggered/n*100:.0f}%")
    print(f"  Confidence triggered (<= 0.50): {confidence_triggered}/{n} = {confidence_triggered/n*100:.0f}%")
    print(f"  Contradiction triggered (> 0):  {contradiction_triggered}/{n} = {contradiction_triggered/n*100:.0f}%")
    print(f"  Total escalated:                {escalated}/{n} = {escalated/n*100:.0f}%")
    print()

    print("--- ROOT CAUSE (single trigger) ---")
    print(f"  Fracture only:       {only_fracture}")
    print(f"  Confidence only:     {only_confidence}")
    print(f"  Contradiction only:  {only_contradiction}")
    print(f"  Multiple triggers:   {multi}")
    print(f"  No escalation:       {none_esc}")
    print()

    print("--- WHAT-IF: ADJUSTED CONTRADICTION THRESHOLDS ---")
    print("  (holding fracture>=60 and confidence<=0.50)")
    for cc_t in [2, 3, 4, 5, 6, 7, 8]:
        adj = sum(1 for o in obs if o["fracture"] >= 60 or o["confidence"] <= 0.50 or o["contradictions"] >= cc_t)
        print(f"  contradictions>={cc_t}: {adj}/{n} = {adj/n*100:.0f}%")
    print()

    print("--- WHAT-IF: COMBINED ADJUSTED THRESHOLDS ---")
    scenarios = [
        ("fracture>=75 OR confidence<=0.35 OR contradictions>=4", 75, 0.35, 4),
        ("fracture>=75 OR confidence<=0.35 OR contradictions>=5", 75, 0.35, 5),
        ("fracture>=75 OR confidence<=0.30 OR contradictions>=5", 75, 0.30, 5),
        ("fracture>=75 OR confidence<=0.30 OR contradictions>=6", 75, 0.30, 6),
        ("fracture>=80 OR confidence<=0.35 OR contradictions>=5", 80, 0.35, 5),
        ("fracture>=80 OR confidence<=0.30 OR contradictions>=5", 80, 0.30, 5),
        ("fracture>=80 OR confidence<=0.25 OR contradictions>=6", 80, 0.25, 6),
        ("fracture>=80 OR confidence<=0.35 OR contradictions>=7", 80, 0.35, 7),
    ]
    for label, ft, ct, cct in scenarios:
        adj = sum(1 for o in obs if o["fracture"] >= ft or o["confidence"] <= ct or o["contradictions"] >= cct)
        print(f"  {label}: {adj}/{n} = {adj/n*100:.0f}%")
    print()


if __name__ == "__main__":
    obs = run_calibration(30)
    analyze(obs)
