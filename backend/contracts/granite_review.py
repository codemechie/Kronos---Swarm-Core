from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GraniteReview:
    """Output of the Granite review phase.

    When `escalation_triggered` is False, Granite was not called
    and all other fields use their defaults (skipped review).
    """

    escalation_triggered: bool = False
    review_summary: str = ""
    contradiction_analysis: str = ""
    confidence_assessment: str = ""
    recommended_action: str = ""
    granite_confidence: int = 0
    provider: str = "granite"
    skipped: bool = False
