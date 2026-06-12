from __future__ import annotations

from abc import ABC, abstractmethod

from backend.contracts.telemetry_dataclasses import (
    KronosTelemetryPacket,
)


class BaseSwarmAgent(ABC):
    name: str
    system_prompt: str

    @abstractmethod
    def construct_prompt(self, packet: KronosTelemetryPacket) -> str:
        ...


class MarketPragmatistAgent(BaseSwarmAgent):
    name = "Market Pragmatist"
    system_prompt = (
        "You are the Market Pragmatist. You trust only financial volume and "
        "probability. You ignore tactical hype."
    )

    def construct_prompt(self, packet: KronosTelemetryPacket) -> str:
        goal_diff = packet.score_home - packet.score_away
        return (
            f"CURRENT SCORE: {packet.score_home}-{packet.score_away} "
            f"(Differential: {'+' if goal_diff >= 0 else ''}{goal_diff}).\n"
            f"FIELD TILT: {packet.tactical.field_tilt:.2f} — verifies whether "
            f"scoreline reflects real dominance.\n"
            f"IMPLIED BETTING ODDS (simulated): "
            f"{'Low scoring / tight' if abs(goal_diff) <= 1 else 'High scoring / blowout'} "
            f"match based on goal margin.\n"
            f"VERDICT: Assess whether the market should trust this scoreline."
        )


class PsychologyMomentumAgent(BaseSwarmAgent):
    name = "Mood Ring"
    system_prompt = (
        "You are the Mood Ring. You analyze mental fragility, panic, and "
        "momentum shifts."
    )

    def construct_prompt(self, packet: KronosTelemetryPacket) -> str:
        ps = packet.psychology
        ph = packet.physical
        return (
            f"CROWD NOISE: {ps.crowd_decibels} dB — pressure level.\n"
            f"FOUL ESCALATION: {ps.foul_escalation} fouls in last 5 min — "
            f"temper spike indicator.\n"
            f"PANIC INDEX: {ps.panic_index:.2f} — behavioral shift score.\n"
            f"xG DELTA: {ps.xg_delta:+.2f} — frustration index "
            f"({'overperforming (calm)' if ps.xg_delta > 0 else 'underperforming (tense)'}).\n"
            f"RECOVERY TIME: {ph.recovery_time_sec:.1f}s — physical recovery "
            f"baseline (slower = more fatigued = more fragile).\n"
            f"VERDICT: Rate the current psychological fragility on a scale "
            f"of 1-10."
        )


class GameTheoryMaverickAgent(BaseSwarmAgent):
    name = "Gambler"
    system_prompt = (
        "You are the Game Theory Gambler. You look for high-risk variance "
        "and desperation moves."
    )

    def construct_prompt(self, packet: KronosTelemetryPacket) -> str:
        gt = packet.game_theory
        goal_diff = packet.score_home - packet.score_away
        losing_side_desperation = abs(goal_diff) if goal_diff < 0 else 0
        return (
            f"SCORE DIFFERENTIAL: {goal_diff:+d}.\n"
            f"REST DEFENSE COUNT: {gt.rest_defense_count} — defenders staying "
            f"back ({'cautious / protecting lead' if goal_diff > 0 else 'defending a point'}).\n"
            f"BOX OVERLOAD COUNT: {gt.box_overload_count} — attackers in the box "
            f"({'high-risk chase' if goal_diff < 0 else 'standard attack'} mode).\n"
            f"GK SWEEPER DISTANCE: {gt.gk_sweeper_dist:.1f}m from goal line — "
            f"({['cautious','aggressive'][gt.gk_sweeper_dist > 25]}) positioning.\n"
            f"SUB SHOCK INDEX: {gt.sub_shock_index:.2f} — variance introduced "
            f"by recent substitutions.\n"
            f"LOSING-SIDE DESPERATION SCORE: {losing_side_desperation}.\n"
            f"VERDICT: Identify high-variance gamble scenarios."
        )


class RefereeProfilerAgent(BaseSwarmAgent):
    name = "Judge"
    system_prompt = (
        "You are the Referee Profiler. You predict disciplinary chaos and "
        "red cards."
    )

    def construct_prompt(self, packet: KronosTelemetryPacket) -> str:
        ps = packet.psychology
        ta = packet.tactical
        return (
            f"FOUL ESCALATION: {ps.foul_escalation} fouls in last 5 min — "
            f"flashpoint frequency.\n"
            f"PPDA: {ta.ppda:.1f} — pressing intensity "
            f"({'aggressive press, high card risk' if ta.ppda < 10 else 'moderate press'}).\n"
            f"BLOCK HEIGHT: {ta.block_height_m:.1f}m — high block increases "
            f"tackle-to-foul conversion risk.\n"
            f"CARD DATA: not available in current packet — assume baseline "
            f"discipline.\n"
            f"PANIC INDEX: {ps.panic_index:.2f} — correlated with reckless "
            f"tackling.\n"
            f"VERDICT: Predict red-card probability inside the next 15 min."
        )


class ChaosFrictionAgent(BaseSwarmAgent):
    name = "Anarchist"
    system_prompt = (
        "You are the Chaos Agent. You believe physics and nature ruin "
        "tactical plans."
    )

    def construct_prompt(self, packet: KronosTelemetryPacket) -> str:
        env = packet.environment
        ph = packet.physical
        return (
            f"PITCH SLICKNESS: {env.pitch_slickness:.2f} — traction coefficient "
            f"({'slippery / high error rate' if env.pitch_slickness > 0.6 else 'normal grip'}).\n"
            f"WIND INTERFERENCE: {env.wind_interference:.2f} — wind vector "
            f"impact ({'severe / long-ball unreliable' if env.wind_interference > 0.5 else 'manageable'}).\n"
            f"FOG VISIBILITY: {env.fog_visibility:.2f} — {'low / vision impaired' if env.fog_visibility < 0.4 else 'clear'}.\n"
            f"SPRINT DROP-OFF: {ph.sprint_drop_off:+.2f} — tired legs slip "
            f"more ({'fatigue-induced error risk elevated' if ph.sprint_drop_off < -0.1 else 'normal'}).\n"
            f"VERDICT: Quantify how much environmental friction degrades "
            f"expected performance."
        )
