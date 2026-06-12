from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict


@dataclass
class SwarmFractureMetrics:
    """Quantifies disagreement between swarm agent predictions."""

    fracture_index: float
    agreement_score: float
    chaos_probability: float
    dominant_prediction: str
    prediction_distribution: Dict[str, int] = field(default_factory=dict)


def _classify(text: str) -> str:
    """Map free-text agent output to a normalized prediction category."""
    lower = text.lower()
    if "away" in lower and ("win" in lower or "goal" in lower or "score" in lower):
        return "AWAY_WIN"
    if "home" in lower and ("win" in lower or "goal" in lower or "score" in lower):
        return "HOME_WIN"
    if "draw" in lower:
        return "DRAW"
    if "high" in lower and "risk" in lower:
        return "HIGH_RISK"
    if "low" in lower and "risk" in lower:
        return "LOW_RISK"
    if "risk" in lower:
        return "HIGH_RISK"
    return "UNKNOWN"


class SwarmFractureCalculator:
    """Calculates fracture, agreement, and chaos metrics from agent outputs."""

    CATEGORIES = ("HOME_WIN", "AWAY_WIN", "DRAW", "HIGH_RISK", "LOW_RISK", "UNKNOWN")

    def calculate(self, agent_outputs: Dict[str, str]) -> SwarmFractureMetrics:
        """
        Accept a dict of agent_name -> text response and return
        aggregated fracture metrics.

        Parameters
        ----------
        agent_outputs : Dict[str, str]
            Keys are agent identifiers, values are their textual verdicts.

        Returns
        -------
        SwarmFractureMetrics
            Populated with fracture index, agreement score, chaos probability,
            dominant prediction, and full prediction distribution.
        """
        total = len(agent_outputs)
        if total == 0:
            return SwarmFractureMetrics(
                fracture_index=0.0,
                agreement_score=100.0,
                chaos_probability=0.0,
                dominant_prediction="UNKNOWN",
                prediction_distribution={},
            )

        distribution: Dict[str, int] = {cat: 0 for cat in self.CATEGORIES}
        for text in agent_outputs.values():
            cat = _classify(text)
            distribution[cat] = distribution.get(cat, 0) + 1

        # Remove zero-count entries for cleaner output
        distribution = {k: v for k, v in distribution.items() if v > 0}

        largest_count = max(distribution.values())
        agreement_score = largest_count / total * 100.0
        fracture_index = 100.0 - agreement_score

        # Chaos probability
        chaos_probability = fracture_index
        high_risk_count = distribution.get("HIGH_RISK", 0)
        if high_risk_count >= 1:
            chaos_probability += 15.0
        if high_risk_count >= 2:
            chaos_probability += 10.0
        chaos_probability = max(0.0, min(100.0, chaos_probability))

        # Dominant prediction (first encountered wins ties)
        dominant = max(distribution, key=lambda k: (distribution[k], -list(distribution.keys()).index(k)))

        return SwarmFractureMetrics(
            fracture_index=round(fracture_index, 1),
            agreement_score=round(agreement_score, 1),
            chaos_probability=round(chaos_probability, 1),
            dominant_prediction=dominant,
            prediction_distribution=distribution,
        )
