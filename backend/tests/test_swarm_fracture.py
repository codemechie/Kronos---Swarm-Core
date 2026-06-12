from __future__ import annotations

import sys
import unittest

# Ensure the backend package is importable
sys.path.insert(0, "catenaccio-kronos-core")

from backend.contracts.swarm_metrics import SwarmFractureCalculator


class TestSwarmFractureCalculator(unittest.TestCase):
    """Unit tests for SwarmFractureCalculator."""

    def setUp(self) -> None:
        self.calc = SwarmFractureCalculator()

    def test_all_home_win(self) -> None:
        """All 5 agents predict HOME_WIN → fracture_index == 0."""
        outputs = {
            "pragmatist": "home goal incoming, home win certain",
            "mood_ring": "home win expected",
            "gambler": "home win likely",
            "judge": "home win predicted",
            "anarchist": "home will win",
        }
        metrics = self.calc.calculate(outputs)
        self.assertEqual(metrics.fracture_index, 0.0)
        self.assertEqual(metrics.agreement_score, 100.0)
        self.assertEqual(metrics.dominant_prediction, "HOME_WIN")

    def test_three_home_two_draw(self) -> None:
        """3 HOME_WIN, 2 DRAW → fracture_index == 40."""
        outputs = {
            "pragmatist": "home win predicted",
            "mood_ring": "draw expected",
            "gambler": "home win likely",
            "judge": "home win incoming",
            "anarchist": "draw likely outcome",
        }
        metrics = self.calc.calculate(outputs)
        self.assertEqual(metrics.fracture_index, 40.0)
        self.assertEqual(metrics.agreement_score, 60.0)
        self.assertEqual(metrics.dominant_prediction, "HOME_WIN")

    def test_chaos_probability_boost(self) -> None:
        """2 HIGH_RISK + 1 HOME_WIN + 1 DRAW + 1 AWAY_WIN
        → chaos_probability > fracture_index."""
        outputs = {
            "pragmatist": "home win expected",
            "mood_ring": "draw likely",
            "gambler": "high risk collapse likely",
            "judge": "high risk of cards",
            "anarchist": "away goal incoming",
        }
        metrics = self.calc.calculate(outputs)
        # fracture = 100 - (2/5 * 100) = 60
        self.assertEqual(metrics.fracture_index, 60.0)
        # chaos = 60 + 15 (1st HIGH_RISK) + 10 (2nd HIGH_RISK) = 85
        self.assertEqual(metrics.chaos_probability, 85.0)
        self.assertGreater(metrics.chaos_probability, metrics.fracture_index)
        self.assertIn("HIGH_RISK", metrics.prediction_distribution)

    def test_empty_input(self) -> None:
        """Empty agent outputs returns safe defaults."""
        metrics = self.calc.calculate({})
        self.assertEqual(metrics.fracture_index, 0.0)
        self.assertEqual(metrics.agreement_score, 100.0)
        self.assertEqual(metrics.chaos_probability, 0.0)
        self.assertEqual(metrics.dominant_prediction, "UNKNOWN")
        self.assertEqual(metrics.prediction_distribution, {})

    def test_single_agent(self) -> None:
        """Single agent output → full agreement."""
        outputs = {"pragmatist": "away goal incoming"}
        metrics = self.calc.calculate(outputs)
        self.assertEqual(metrics.fracture_index, 0.0)
        self.assertEqual(metrics.agreement_score, 100.0)
        self.assertEqual(metrics.dominant_prediction, "AWAY_WIN")

    def test_all_unknown(self) -> None:
        """All agents return unrecognisable text → UNKNOWN prediction."""
        outputs = {
            "pragmatist": "something unpredictable",
            "mood_ring": "no clear signal",
            "gambler": "data incoherent",
            "judge": "cannot determine",
            "anarchist": "pure randomness",
        }
        metrics = self.calc.calculate(outputs)
        self.assertEqual(metrics.fracture_index, 0.0)
        self.assertEqual(metrics.dominant_prediction, "UNKNOWN")

    def test_low_risk_classification(self) -> None:
        """'low risk' → LOW_RISK category."""
        outputs = {"pragmatist": "low risk of anything happening"}
        metrics = self.calc.calculate(outputs)
        self.assertEqual(metrics.dominant_prediction, "LOW_RISK")


if __name__ == "__main__":
    unittest.main()
