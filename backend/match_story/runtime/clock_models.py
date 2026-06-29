from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MatchTime:
    """Immutable snapshot of the virtual clock's current match time.

    Attributes:
        current_minute:      The current match minute (1-based).
        current_second:      The current match second (0–59).
        match_period:        The current time period
                             (e.g. "FIRST_HALF", "HALF_TIME", "SECOND_HALF").
        elapsed_seconds:     Total wall-clock seconds since the clock started.
        match_elapsed_seconds: Seconds elapsed within the current simulation
                             cycle. For non-looping clocks this equals
                             elapsed_seconds.
    """
    current_minute: int
    current_second: int
    match_period: str
    elapsed_seconds: float
    match_elapsed_seconds: float
