from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from enum import Enum, auto
from typing import Any, Dict, List, Optional, Tuple

from backend.agents.swarm.archetypes import (
    ChaosFrictionAgent,
    GameTheoryMaverickAgent,
    MarketPragmatistAgent,
    PsychologyMomentumAgent,
    RefereeProfilerAgent,
)
from backend.contracts.swarm_metrics import SwarmFractureCalculator, SwarmFractureMetrics
from backend.contracts.telemetry_dataclasses import KronosTelemetryPacket
from backend.match_story.runtime.simulation_clock import SimulationClock
from backend.utils.kronos_ticker import KronosMatchTicker
from backend.llm.gateway import LLMGateway
from backend.llm.contracts import LLMResponse
from backend.orchestrator.validation import HeuristicValidator, ValidateOutput
from backend.orchestrator.granite_review import GraniteReviewEngine
from backend.contracts.granite_review import GraniteReview

logger = logging.getLogger("kronos.state_machine")


class KronosPhase(Enum):
    OBSERVE = auto()
    ANALYZE = auto()
    DEBATE = auto()
    VALIDATE = auto()
    GRANITE_REVIEW = auto()
    RECOMMEND = auto()


# ── Phase output dataclasses (immutable per tick) ────────────────────


@dataclass(frozen=True)
class AgentAssessment:
    agent_key: str
    agent_name: str
    verdict: str
    provider: str
    prompt: str
    confidence: float = 0.0
    rationale: str = ""
    risk_level: str = "LOW"
    supporting_signals: Tuple[str, ...] = ()


@dataclass(frozen=True)
class ObserveOutput:
    telemetry: KronosTelemetryPacket
    match_minute: int
    match_phase: str
    anomalies: Tuple[str, ...] = ()


@dataclass(frozen=True)
class AnalyzeOutput:
    assessments: Dict[str, AgentAssessment]
    debate_outputs: Dict[str, str]
    provider_metadata: Dict[str, str]


@dataclass(frozen=True)
class DebateOutput:
    fracture_metrics: SwarmFractureMetrics
    contradictions: Tuple[str, ...] = ()
    high_risk_agents: Tuple[str, ...] = ()


@dataclass(frozen=True)
class RecommendOutput:
    telemetry: KronosTelemetryPacket
    fracture_metrics: SwarmFractureMetrics
    assessments: Dict[str, AgentAssessment]
    debate_outputs: Dict[str, str]
    provider_metadata: Dict[str, str]
    match_phase: str
    urgency: str = "STABLE"
    validation: Optional[ValidateOutput] = None
    granite_review: Optional[GraniteReview] = None


@dataclass(frozen=True)
class TickResult:
    phase: KronosPhase
    observe: Optional[ObserveOutput] = None
    analyze: Optional[AnalyzeOutput] = None
    debate: Optional[DebateOutput] = None
    validate: Optional[ValidateOutput] = None
    granite_review: Optional[GraniteReview] = None
    recommend: Optional[RecommendOutput] = None


# ── Agent registry helper ───────────────────────────────────────────

_AGENT_REGISTRY: List[Tuple[str, Any]] = [
    ("pragmatist", MarketPragmatistAgent),
    ("mood_ring", PsychologyMomentumAgent),
    ("gambler", GameTheoryMaverickAgent),
    ("judge", RefereeProfilerAgent),
    ("anarchist", ChaosFrictionAgent),
]


# ── State Machine ───────────────────────────────────────────────────


class KronosStateMachine:
    """Drives a single tick through OBSERVE → ANALYZE → DEBATE → VALIDATE → RECOMMEND.

    One instance per match. State resets each tick via transition().
    """

    def __init__(self, clock: Optional[SimulationClock] = None) -> None:
        self.clock: SimulationClock = clock if clock is not None else SimulationClock()
        self.ticker = KronosMatchTicker(self.clock)
        self.fracture_calculator = SwarmFractureCalculator()
        self.gateway = LLMGateway()
        self.validator = HeuristicValidator()
        self.granite_review_engine = GraniteReviewEngine()

        self._agents: List[Tuple[str, Any]] = [
            (key, cls()) for key, cls in _AGENT_REGISTRY
        ]

        self.current_phase: KronosPhase = KronosPhase.OBSERVE
        self.tick_count: int = 0

        # Accumulated results for the current tick
        self._observe_out: Optional[ObserveOutput] = None
        self._analyze_out: Optional[AnalyzeOutput] = None
        self._debate_out: Optional[DebateOutput] = None
        self._validate_out: Optional[ValidateOutput] = None
        self._granite_review_out: Optional[GraniteReview] = None
        self._recommend_out: Optional[RecommendOutput] = None

    # ── Public API ──────────────────────────────────────────────────

    def transition(self) -> TickResult:
        self.tick_count += 1
        self.current_phase = KronosPhase.OBSERVE
        self._reset_tick_state()

        self._do_observe()
        self._do_analyze()
        self._do_debate()
        self._do_validate()
        self._do_granite_review()
        self._do_recommend()

        self.current_phase = KronosPhase.RECOMMEND
        return TickResult(
            phase=KronosPhase.RECOMMEND,
            observe=self._observe_out,
            analyze=self._analyze_out,
            debate=self._debate_out,
            validate=self._validate_out,
            granite_review=self._granite_review_out,
            recommend=self._recommend_out,
        )

    def get_current_phase(self) -> KronosPhase:
        return self.current_phase

    # ── Phase 1: OBSERVE ────────────────────────────────────────────

    def _do_observe(self) -> None:
        self.current_phase = KronosPhase.OBSERVE
        packet = self.ticker.generate_tick()
        minute = packet.match_minute

        phase = self._derive_match_phase(minute)

        anomalies: List[str] = []
        if packet.environment.pitch_slickness > 0.8:
            anomalies.append("pitch_slickness_critical")
        if packet.psychology.panic_index > 0.8:
            anomalies.append("panic_index_critical")

        self._observe_out = ObserveOutput(
            telemetry=packet,
            match_minute=minute,
            match_phase=phase,
            anomalies=tuple(anomalies),
        )
        logger.debug("[OBSERVE] minute=%d phase=%s anomalies=%d", minute, phase, len(anomalies))

    @staticmethod
    def _derive_match_phase(minute: int) -> str:
        if minute <= 60:
            return "GRIND"
        if minute <= 75:
            return "WEATHER"
        return "CHAOS"

    # ── Phase 2: ANALYZE ────────────────────────────────────────────

    @staticmethod
    def _parse_assessment_from_content(content: str) -> Dict[str, Any]:
        """Parse structured assessment fields from a raw LLM response string.

        Deterministic — based purely on the response content, making tests
        predictable regardless of LLM provider.
        """
        if "High-risk" in content:
            return {
                "verdict": "HIGH_RISK",
                "confidence": 0.81,
                "risk_level": "HIGH",
                "rationale": content,
                "supporting_signals": ("variance_threshold",),
            }
        if "Nominal" in content:
            return {
                "verdict": "NOMINAL",
                "confidence": 0.62,
                "risk_level": "LOW",
                "rationale": content,
                "supporting_signals": (),
            }
        return {
            "verdict": "ELEVATED_RISK",
            "confidence": 0.70,
            "risk_level": "MEDIUM",
            "rationale": content,
            "supporting_signals": ("anomaly_detected",),
        }

    def _do_analyze(self) -> None:
        self.current_phase = KronosPhase.ANALYZE
        packet = self._observe_out.telemetry

        assessments: Dict[str, AgentAssessment] = {}
        debate_outputs: Dict[str, str] = {}
        provider_metadata: Dict[str, str] = {}

        for key, agent in self._agents:
            prompt = agent.construct_prompt(packet)
            response: LLMResponse = self.gateway.generate(agent.name, prompt)

            parsed = self._parse_assessment_from_content(response.content)

            assessments[key] = AgentAssessment(
                agent_key=key,
                agent_name=agent.name,
                verdict=parsed["verdict"],
                provider=response.provider,
                prompt=prompt,
                confidence=parsed["confidence"],
                rationale=parsed["rationale"],
                risk_level=parsed["risk_level"],
                supporting_signals=parsed["supporting_signals"],
            )
            debate_outputs[key] = response.content
            provider_metadata[key] = response.provider

        self._analyze_out = AnalyzeOutput(
            assessments=assessments,
            debate_outputs=debate_outputs,
            provider_metadata=provider_metadata,
        )
        logger.debug("[ANALYZE] agents=%d", len(assessments))

    # ── Phase 3: DEBATE ─────────────────────────────────────────────

    def _do_debate(self) -> None:
        self.current_phase = KronosPhase.DEBATE
        debate_outputs = self._analyze_out.debate_outputs

        fracture_metrics: SwarmFractureMetrics = self.fracture_calculator.calculate(debate_outputs)

        high_risk: List[str] = []
        contradictions: List[str] = []

        dist = fracture_metrics.prediction_distribution
        if len(dist) >= 3:
            contradictions.append("multiple_prediction_categories")

        for key, text in debate_outputs.items():
            if "high" in text.lower() and "risk" in text.lower():
                high_risk.append(key)

        self._debate_out = DebateOutput(
            fracture_metrics=fracture_metrics,
            contradictions=tuple(contradictions),
            high_risk_agents=tuple(high_risk),
        )
        logger.debug(
            "[DEBATE] fracture=%.1f chaos=%.1f high_risk=%d",
            fracture_metrics.fracture_index,
            fracture_metrics.chaos_probability,
            len(high_risk),
        )

    # ── Phase 4: VALIDATE (heuristic validation) ─────────────────

    def _do_validate(self) -> None:
        self.current_phase = KronosPhase.VALIDATE

        self._validate_out = self.validator.validate(
            assessments=self._analyze_out.assessments,
            fracture_metrics=self._debate_out.fracture_metrics,
            contradictions=self._debate_out.contradictions,
        )
        logger.debug(
            "[VALIDATE] confidence=%.2f trust=%.2f agreement=%.2f flags=%d",
            self._validate_out.overall_confidence,
            self._validate_out.trust_score,
            self._validate_out.agreement_score,
            len(self._validate_out.flags),
        )

    # ── Phase 5: GRANITE REVIEW ──────────────────────────────────

    def _do_granite_review(self) -> None:
        self.current_phase = KronosPhase.GRANITE_REVIEW

        self._granite_review_out = self.granite_review_engine.review(
            assessments=self._analyze_out.assessments,
            fracture_metrics=self._debate_out.fracture_metrics,
            validation=self._validate_out,
        )
        logger.debug(
            "[GRANITE_REVIEW] escalated=%s skipped=%s",
            self._granite_review_out.escalation_triggered,
            self._granite_review_out.skipped,
        )

    # ── Phase 6: RECOMMEND ─────────────────────────────────────────

    def _do_recommend(self) -> None:
        self.current_phase = KronosPhase.RECOMMEND
        observe = self._observe_out
        analyze = self._analyze_out
        debate = self._debate_out

        urgency = self._determine_urgency(debate.fracture_metrics)

        self._recommend_out = RecommendOutput(
            telemetry=observe.telemetry,
            fracture_metrics=debate.fracture_metrics,
            assessments=analyze.assessments,
            debate_outputs=analyze.debate_outputs,
            provider_metadata=analyze.provider_metadata,
            match_phase=observe.match_phase,
            urgency=urgency,
            validation=self._validate_out,
            granite_review=self._granite_review_out,
        )
        logger.debug("[RECOMMEND] urgency=%s", urgency)

    @staticmethod
    def _determine_urgency(metrics: SwarmFractureMetrics) -> str:
        if metrics.fracture_index >= 80:
            return "CRITICAL"
        if metrics.fracture_index >= 40:
            return "WATCH"
        return "STABLE"

    # ── Internal helpers ────────────────────────────────────────────

    def _reset_tick_state(self) -> None:
        self._observe_out = None
        self._analyze_out = None
        self._debate_out = None
        self._validate_out = None
        self._granite_review_out = None
        self._recommend_out = None

    def to_legacy_dict(self, result: TickResult) -> Dict[str, Any]:
        """Convert a TickResult to the backward-compatible dict format."""
        recommend = result.recommend
        v = result.validate
        validation_dict = (
            {
                "overall_confidence": v.overall_confidence,
                "agreement_score": v.agreement_score,
                "trust_score": v.trust_score,
                "contradiction_count": v.contradiction_count,
                "flags": [str(f) for f in v.flags],
                "evidence_summary": v.evidence_summary,
                "validation_source": v.validation_source,
                "skipped": v.skipped,
            }
            if v is not None
            else {"skipped": True}
        )
        gr = result.granite_review
        granite_review_dict = (
            {
                "escalation_triggered": gr.escalation_triggered,
                "review_summary": gr.review_summary,
                "contradiction_analysis": gr.contradiction_analysis,
                "confidence_assessment": gr.confidence_assessment,
                "recommended_action": gr.recommended_action,
                "granite_confidence": gr.granite_confidence,
                "provider": gr.provider,
                "skipped": gr.skipped,
            }
            if gr is not None
            else {
                "escalation_triggered": False,
                "review_summary": "Granite review not required.",
                "contradiction_analysis": "",
                "confidence_assessment": "",
                "recommended_action": "",
                "granite_confidence": 0,
                "provider": "granite",
                "skipped": True,
            }
        )
        return {
            "telemetry": asdict(recommend.telemetry),
            "debate_outputs": recommend.debate_outputs,
            "swarm_metrics": asdict(recommend.fracture_metrics),
            "provider_metadata": recommend.provider_metadata,
            "validation": validation_dict,
            "granite_review": granite_review_dict,
        }
