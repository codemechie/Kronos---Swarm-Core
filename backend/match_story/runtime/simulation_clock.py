from __future__ import annotations

import time

from backend.match_story.runtime.clock_models import MatchTime


class SimulationClock:
    """Lightweight looping clock for historical simulation.

    The clock starts automatically on creation.
    It derives match time from elapsed wall-clock time modulo a
    fixed simulation duration, creating an infinite loop.

    No background threads, timers, or scheduled jobs.

    Simulation duration: 180 minutes (configurable via class attribute).

    Speed: SPEED_FACTOR real seconds = 1 simulated match minute.
    Default SPEED_FACTOR=60 means 1 real second → 1 match second, so
    60 real seconds → 1 match minute (real-time simulation).
    Set SPEED_FACTOR=1 for 1 real second → 1 match minute (fast mode).
    """

    SIMULATION_DURATION_MINUTES: int = 180
    SIMULATION_DURATION_SECONDS: int = SIMULATION_DURATION_MINUTES * 60
    # Simulated match-seconds produced per real wall-clock second.
    # SPEED_FACTOR=60 → each real second advances the clock by 60 match-seconds
    # (i.e. one full match-minute per real second, matching the 1-second SSE tick).
    SPEED_FACTOR: int = 60

    def __init__(self) -> None:
        self._start_time: float = time.time()

    # ── Queries ──────────────────────────────────────────────────────

    def get_match_time(self) -> MatchTime:
        """Return the current match time derived from wall-clock elapsed.

        The returned minute/second/period are based on the looped
        (modulo) elapsed time, creating an infinite simulation cycle.
        Wall-clock seconds are multiplied by SPEED_FACTOR before being
        mapped to match seconds, so SPEED_FACTOR=1 advances one match
        minute per real second.
        """
        elapsed = time.time() - self._start_time
        # Scale wall-clock elapsed into simulated match-seconds.
        simulated_seconds = elapsed * self.SPEED_FACTOR
        match_elapsed = simulated_seconds % self.SIMULATION_DURATION_SECONDS
        total_seconds = int(match_elapsed)
        minute = (total_seconds // 60) + 1
        second = total_seconds % 60
        period = SimulationClock._derive_period(minute)

        return MatchTime(
            current_minute=minute,
            current_second=second,
            match_period=period,
            elapsed_seconds=elapsed,
            match_elapsed_seconds=match_elapsed,
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
