from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, Optional

from backend.orchestrator.state_machine import KronosStateMachine

if TYPE_CHECKING:
    from backend.match_story.runtime.simulation_clock import SimulationClock


class KronosOrchestrator:
    """Central engine that drives the match ticker, collects agent verdicts,
    and computes swarm fracture metrics.

    Delegates to KronosStateMachine for the OBSERVE → ANALYZE → DEBATE →
    VALIDATE → RECOMMEND pipeline. Maintains backward-compatible dict output.
    """

    def __init__(self, clock: Optional["SimulationClock"] = None) -> None:
        self.state_machine = KronosStateMachine(clock=clock)

    def process_next_tick(self) -> Dict[str, Any]:
        """Advance one match minute through the state machine and return
        telemetry, agent debate outputs, swarm fracture metrics, and
        optional provider metadata."""
        result = self.state_machine.transition()
        return self.state_machine.to_legacy_dict(result)
