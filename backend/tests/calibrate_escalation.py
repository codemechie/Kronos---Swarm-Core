"""Calibration script: measure escalation rate under normal conditions.

Aims to verify that the new thresholds (fracture >= 75, confidence <= 0.30,
contradictions >= 5) produce ~0% escalation on typical low-fracture data.
"""

import statistics
from dataclasses import dataclass


@dataclass
class _Metrics:
    fracture_index: float


@dataclass
class _Validation:
    overall_confidence: float
    contradiction_count: int


def should_escalate(m: _Metrics, v: _Validation) -> bool:
    if m.fracture_index >= 75.0:
        return True
    if v.overall_confidence <= 0.30:
        return True
    if v.contradiction_count >= 5:
        return True
    return False


def main() -> None:
    scenarios = [
        # (fracture, confidence, contradictions, label)
        (20.0, 0.85, 0, "normal consensus"),
        (25.0, 0.80, 0, "normal consensus"),
        (30.0, 0.75, 2, "mild disagreement"),
        (40.0, 0.70, 1, "moderate disagreement"),
        (50.0, 0.65, 3, "stronger disagreement"),
        (60.0, 0.55, 2, "elevated fracture"),
        (70.0, 0.40, 4, "high fracture"),
        (10.0, 0.90, 0, "strong consensus"),
        (15.0, 0.88, 0, "strong consensus"),
        (35.0, 0.72, 1, "mild fracture"),
    ]

    total = len(scenarios)
    escalated = 0

    results = []
    for fracture, confidence, contradictions, label in scenarios:
        m = _Metrics(fracture_index=fracture)
        v = _Validation(overall_confidence=confidence, contradiction_count=contradictions)
        esc = should_escalate(m, v)
        if esc:
            escalated += 1
        results.append((label, fracture, confidence, contradictions, esc))

    total = len(scenarios)
    pct = (escalated / total) * 100

    print("=" * 65)
    print(f"{'Calibration Report':^65}")
    print("=" * 65)
    print(f"{'Scenario':<25} {'Frac':>5} {'Conf':>5} {'Contra':>5} {'Esc'}")
    print("-" * 65)
    for label, frac, conf, contra, esc in results:
        print(f"{label:<25} {frac:5.0f} {conf:5.2f} {contra:5d} {'YES' if esc else 'no'}")
    print("-" * 65)
    print(f"\nEscalation rate: {escalated}/{total} = {pct:.1f}%")
    print(f"Target: 0% for production normal conditions")
    print("PASS" if pct == 0 else "NEEDS ADJUSTMENT")


if __name__ == "__main__":
    main()
