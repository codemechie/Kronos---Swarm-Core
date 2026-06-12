from __future__ import annotations

from dataclasses import asdict
from typing import Any, Dict

from backend.agents.swarm.archetypes import (
    ChaosFrictionAgent,
    GameTheoryMaverickAgent,
    MarketPragmatistAgent,
    PsychologyMomentumAgent,
    RefereeProfilerAgent,
)
from backend.contracts.swarm_metrics import SwarmFractureCalculator, SwarmFractureMetrics
from backend.utils.kronos_ticker import KronosMatchTicker


class KronosOrchestrator:
    """Central engine that drives the match ticker, collects agent verdicts,
    and computes swarm fracture metrics."""

    def __init__(self) -> None:
        self.ticker = KronosMatchTicker()
        self.pragmatist = MarketPragmatistAgent()
        self.mood_ring = PsychologyMomentumAgent()
        self.gambler = GameTheoryMaverickAgent()
        self.judge = RefereeProfilerAgent()
        self.anarchist = ChaosFrictionAgent()
        self.fracture_calculator = SwarmFractureCalculator()

    def _mock_llm_response(self, agent_name: str, prompt: str) -> str:
        """Placeholder for real LLM invocation. Returns a simulated verdict."""
        if "Risk" in prompt or "risk" in prompt:
            return (
                f"[{agent_name.upper()}]: High-risk pattern detected. "
                f"Variance exceeds threshold — recommend elevated caution."
            )
        return (
            f"[{agent_name.upper()}]: Nominal conditions observed. "
            f"No significant deviation from expected range."
        )

    def process_next_tick(self) -> Dict[str, Any]:
        """Advance one match minute and return telemetry, agent debate
        outputs, and swarm fracture metrics."""
        packet = self.ticker.generate_tick()

        agents = [
            ("pragmatist", self.pragmatist),
            ("mood_ring", self.mood_ring),
            ("gambler", self.gambler),
            ("judge", self.judge),
            ("anarchist", self.anarchist),
        ]

        debate_outputs: Dict[str, str] = {}
        for key, agent in agents:
            prompt = agent.construct_prompt(packet)
            debate_outputs[key] = self._mock_llm_response(agent.name, prompt)

        fracture_metrics: SwarmFractureMetrics = self.fracture_calculator.calculate(debate_outputs)

        return {
            "telemetry": asdict(packet),
            "debate_outputs": debate_outputs,
            "swarm_metrics": asdict(fracture_metrics),
        }
