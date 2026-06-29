from __future__ import annotations

import time
from typing import Optional

from backend.match_story.runtime.clock_models import MatchTime


class VirtualMatchClock:
    """Wall-clock-based match timer.

    The clock derives match time purely from elapsed wall-clock time.
    It contains no football logic — no knowledge of goals, cards, or
    match events.

    Match periods are derived from elapsed minutes:
        minute 1–45   → "FIRST_HALF"
        minute 46–60  → "HALF_TIME"
        minute 61+    → "SECOND_HALF"
    """

    def __init__(self) -> None:
        self._start_time: Optional[float] = None

    # ── Lifecycle ────────────────────────────────────────────────────

    def start(self) -> None:
        """Begin the match clock. Records the wall-clock start time."""
        self._start_time = time.time()

    def reset(self) -> None:
        """Reset the clock to an unstarted state."""
        self._start_time = None

    # ── Queries ──────────────────────────────────────────────────────

    def get_match_time(self) -> MatchTime:
        """Return the current match time as an immutable snapshot."""
        elapsed = self._get_elapsed_seconds()
        total_seconds = int(elapsed)
        minute = (total_seconds // 60) + 1
        second = total_seconds % 60
        period = self._derive_period(minute)

        return MatchTime(
            current_minute=minute,
            current_second=second,
            match_period=period,
            elapsed_seconds=elapsed,
            match_elapsed_seconds=elapsed,
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

    def _get_elapsed_seconds(self) -> float:
        """Total wall-clock seconds since start()."""
        if self._start_time is None:
            return 0.0
        return time.time() - self._start_time

    @staticmethod
    def _derive_period(minute: int) -> str:
        """Map a 1-based minute to a match period.

        No football logic — this is purely a time-interval mapping.
        """
        if minute <= 45:
            return "FIRST_HALF"
        if minute <= 60:
            return "HALF_TIME"
        return "SECOND_HALF"
