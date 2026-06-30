from __future__ import annotations

import time

from backend.match_story.runtime.clock_models import MatchTime


class SimulationClock:
    """Lightweight looping clock for historical simulation.

    The clock advances by exactly one match-minute each time advance() is
    called.  The SSE loop calls advance() once per iteration so the minute
    increments by exactly 1 per emitted packet, regardless of how long tick
    processing takes (LLM latency, Granite network calls, OS scheduling).

    No background threads, timers, or scheduled jobs.

    Simulation duration: 180 minutes.  After minute 180 the counter wraps
    back to minute 1 automatically.
    """

    SIMULATION_DURATION_MINUTES: int = 180

    def __init__(self) -> None:
        self._start_time: float = time.time()
        # Monotonic tick counter.  advance() increments this before each
        # SSE packet.  All minute derivation reads from here, never from
        # wall-clock elapsed time.
        self._tick_count: int = 0

    # ── Mutation ─────────────────────────────────────────────────────

    def advance(self) -> None:
        """Advance the clock by exactly one match-minute.

        Called once per SSE loop iteration, before any component reads the
        current minute.  Decouples the displayed minute from wall-clock
        execution time, ensuring the sequence 1 → 2 → 3 … 180 → 1
        regardless of variable per-tick latency.
        """
        self._tick_count += 1

    # ── Queries ──────────────────────────────────────────────────────

    def get_match_time(self) -> MatchTime:
        """Return the current match time derived from the tick counter.

        current_minute is 1-based and wraps at SIMULATION_DURATION_MINUTES.
        elapsed_seconds retains the wall-clock value for instrumentation;
        it does not influence the minute.
        """
        minute = (self._tick_count % self.SIMULATION_DURATION_MINUTES) + 1
        period = SimulationClock._derive_period(minute)
        elapsed = time.time() - self._start_time

        return MatchTime(
            current_minute=minute,
            current_second=0,
            match_period=period,
            elapsed_seconds=elapsed,
            match_elapsed_seconds=float(self._tick_count),
        )

    def get_current_minute(self) -> int:
        """Return the current match minute (1-based)."""
        return self.get_match_time().current_minute

    def get_current_second(self) -> int:
        """Return the current match second (0–59)."""
        return self.get_match_time().current_second

    def get_match_period(self) -> str:
        """Return the current match period label."""
        return self.get_match_time().match_period

    # ── Internal ─────────────────────────────────────────────────────

    @staticmethod
    def _derive_period(minute: int) -> str:
        """Map a 1-based minute to a match period.

        Pure time-interval mapping — no football logic.
        """
        if minute <= 45:
            return "FIRST_HALF"
        if minute <= 60:
            return "HALF_TIME"
        return "SECOND_HALF"
