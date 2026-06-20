import type { Telemetry, SwarmMetrics, DebateOutputs, KronosPacket } from "../types/kronos";

export interface NormalizedPacket {
  telemetry: Telemetry;
  swarmMetrics: SwarmMetrics;
  debateOutputs: DebateOutputs;
}

export function normalizeKronosPacket(packet: KronosPacket): NormalizedPacket {
  const rawTel: Partial<Telemetry> = packet.telemetry ?? {};

  const telemetry: Telemetry = {
    minute: packet.minute ?? rawTel.minute ?? 0,
    score_home: rawTel.score_home,
    score_away: rawTel.score_away,
    ppda: rawTel.ppda,
    block_height_m: rawTel.block_height_m,
    vertical_disconnect: rawTel.vertical_disconnect,
    field_tilt: rawTel.field_tilt,
    sprint_drop_off: rawTel.sprint_drop_off,
    hid_deficit_km: rawTel.hid_deficit_km,
    recovery_time_sec: rawTel.recovery_time_sec,
    defensive_fatigue: rawTel.defensive_fatigue,
    crowd_decibels: rawTel.crowd_decibels,
    foul_escalation: rawTel.foul_escalation,
    xg_delta: rawTel.xg_delta,
    panic_index: rawTel.panic_index,
    rest_defense_count: rawTel.rest_defense_count,
    box_overload_count: rawTel.box_overload_count,
    gk_sweeper_dist: rawTel.gk_sweeper_dist,
    sub_shock_index: rawTel.sub_shock_index,
    pitch_slickness: rawTel.pitch_slickness,
    wind_interference: rawTel.wind_interference,
    fog_visibility: rawTel.fog_visibility,
  };

  const swarmMetrics: SwarmMetrics = {
    fracture_index:
      packet.fracture_index ?? packet.swarm_metrics?.fracture_index ?? 0,
    chaos_probability:
      packet.chaos_probability ?? packet.swarm_metrics?.chaos_probability ?? 0,
    agreement_score: packet.swarm_metrics?.agreement_score,
  };

  const debateOutputs: DebateOutputs = packet.debate_outputs ?? {};

  return { telemetry, swarmMetrics, debateOutputs };
}
