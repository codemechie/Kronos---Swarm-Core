from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, TYPE_CHECKING

from backend.contracts.granite_review import GraniteReview
from backend.contracts.swarm_metrics import SwarmFractureMetrics
from backend.llm.granite_provider import GraniteProvider

if TYPE_CHECKING:
    from backend.orchestrator.state_machine import AgentAssessment
    from backend.orchestrator.validation import ValidateOutput

logger = logging.getLogger("kronos.granite_review")

# ── Escalation thresholds ───────────────────────────────────────────

HIGH_FRACTURE_THRESHOLD: float = 60.0
LOW_CONFIDENCE_THRESHOLD: float = 0.50
CONTRADICTION_TRIGGER: int = 1


class GraniteReviewEngine:
    """Senior Intelligence Officer review layer.

    Evaluates swarm outputs and escalates to Granite when uncertainty
    becomes elevated.  Granite reviews provide structured analysis
    without replacing the swarm or the heuristic validator.
    """

    def __init__(self) -> None:
        self._granite: GraniteProvider | None = None

    # ── Public API ──────────────────────────────────────────────────

    def review(
        self,
        assessments: Dict[str, "AgentAssessment"],
        fracture_metrics: SwarmFractureMetrics,
        validation: "ValidateOutput",
    ) -> GraniteReview:
        if not self._should_escalate(fracture_metrics, validation):
            return GraniteReview(
                escalation_triggered=False,
                skipped=True,
            )

        try:
            prompt = self._build_prompt(assessments, fracture_metrics, validation)
            raw = self._call_granite(prompt)
            return self._parse_response(raw)
        except Exception:
            logger.warning("[GRANITE_REVIEW] review failed, using fallback")
            return GraniteReview(
                escalation_triggered=True,
                review_summary="Granite review unavailable.",
                contradiction_analysis="Review engine encountered an error.",
                confidence_assessment="Unable to assess.",
                recommended_action="Rely on heuristic validation.",
                granite_confidence=50,
            )

    # ── Escalation rules ────────────────────────────────────────────

    @staticmethod
    def _should_escalate(
        fracture_metrics: SwarmFractureMetrics,
        validation: "ValidateOutput",
    ) -> bool:
        if fracture_metrics.fracture_index >= HIGH_FRACTURE_THRESHOLD:
            return True
        if validation.overall_confidence <= LOW_CONFIDENCE_THRESHOLD:
            return True
        if validation.contradiction_count >= CONTRADICTION_TRIGGER:
            return True
        return False

    # ── Prompt building ─────────────────────────────────────────────

    @staticmethod
    def _build_prompt(
        assessments: Dict[str, "AgentAssessment"],
        fracture_metrics: SwarmFractureMetrics,
        validation: "ValidateOutput",
    ) -> str:
        lines: List[str] = [
            "You are a Senior Intelligence Officer reviewing swarm agent analysis of a football match.",
            "",
            "--- VALIDATION SUMMARY ---",
            f"Overall confidence: {validation.overall_confidence}",
            f"Agreement score: {validation.agreement_score}",
            f"Trust score: {validation.trust_score}",
            f"Contradiction count: {validation.contradiction_count}",
            f"Flags: {[str(f) for f in validation.flags]}",
            f"Evidence summary: {validation.evidence_summary}",
            "",
            "--- SWARM STATE ---",
            f"Fracture index: {fracture_metrics.fracture_index}",
            f"Chaos probability: {fracture_metrics.chaos_probability}",
            f"Dominant prediction: {fracture_metrics.dominant_prediction}",
            f"Prediction distribution: {fracture_metrics.prediction_distribution}",
            "",
            "--- AGENT ASSESSMENTS ---",
        ]

        for key, a in assessments.items():
            lines.extend([
                f"Agent: {a.agent_name} ({key})",
                f"  Verdict: {a.verdict}",
                f"  Confidence: {a.confidence}",
                f"  Risk level: {a.risk_level}",
                f"  Rationale: {a.rationale}",
                f"  Provider: {a.provider}",
                "",
            ])

        lines.extend([
            "--- INSTRUCTION ---",
            "Review the swarm analysis above and respond with a JSON object "
            "containing exactly these fields:",
            "  review_summary (string)",
            "  contradiction_analysis (string)",
            "  confidence_assessment (string)",
            "  recommended_action (string)",
            "  granite_confidence (integer 0-100)",
            "",
            "Do not include any text outside the JSON object.",
        ])

        return "\n".join(lines)

    # ── Granite call ────────────────────────────────────────────────

    def _call_granite(self, prompt: str) -> str:
        if self._granite is None:
            self._granite = GraniteProvider()
        response = self._granite.generate("Granite Review Engine", prompt)
        return response.content

    # ── Response parsing ────────────────────────────────────────────

    @staticmethod
    def _parse_response(raw: str) -> GraniteReview:
        try:
            data: Dict[str, Any] = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            logger.warning("[GRANITE_REVIEW] failed to parse JSON, using fallback")
            return GraniteReview(
                escalation_triggered=True,
                review_summary=raw,
                contradiction_analysis="Unable to parse structured response.",
                confidence_assessment="",
                recommended_action="",
                granite_confidence=50,
            )

        return GraniteReview(
            escalation_triggered=True,
            review_summary=data.get("review_summary", ""),
            contradiction_analysis=data.get("contradiction_analysis", ""),
            confidence_assessment=data.get("confidence_assessment", ""),
            recommended_action=data.get("recommended_action", ""),
            granite_confidence=data.get("granite_confidence", 50),
        )
