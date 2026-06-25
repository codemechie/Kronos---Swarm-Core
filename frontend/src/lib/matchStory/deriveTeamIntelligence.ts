import type { Telemetry, TeamIntelligence, TeamStats } from "../../types/kronos";

function toPercent(value: number | undefined, invert = false): number {
  const raw = value ?? 0.5;
  const clamped = Math.max(0, Math.min(1, invert ? 1 - raw : raw));
  return Math.round(clamped * 100);
}

export function deriveTeamIntelligence(telemetry: Telemetry): TeamIntelligence {
  return {
    home: deriveHomeStats(telemetry),
    away: deriveAwayStats(telemetry),
  };
}

function deriveHomeStats(tel: Telemetry): TeamStats {
  const healthComponents = [
    toPercent(tel.defensive_fatigue, true),
    toPercent(tel.recovery_time_sec, true),
  ];
  const aggressionComponents = [
    toPercent(tel.foul_escalation),
    toPercent(tel.panic_index),
  ];
  const momentumComponents = [
    toPercent(tel.field_tilt),
    toPercent(tel.crowd_decibels),
  ];

  return {
    health: averageComponents(healthComponents),
    aggression: averageComponents(aggressionComponents),
    momentum: averageComponents(momentumComponents),
  };
}

function deriveAwayStats(tel: Telemetry): TeamStats {
  const healthComponents = [
    toPercent(tel.sprint_drop_off, true),
    toPercent(tel.recovery_time_sec, true),
  ];
  const aggressionComponents = [
    toPercent(tel.foul_escalation),
    toPercent(tel.panic_index),
  ];
  const momentumComponents = [
    100 - toPercent(tel.field_tilt),
    toPercent(tel.sub_shock_index),
  ];

  return {
    health: averageComponents(healthComponents),
    aggression: averageComponents(aggressionComponents),
    momentum: averageComponents(momentumComponents),
  };
}

function averageComponents(values: number[]): number {
  if (values.length === 0) return 50;
  const sum = values.reduce((s, v) => s + v, 0);
  return Math.round(sum / values.length);
}
