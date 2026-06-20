import type { Telemetry } from "../types/kronos";

export interface MetricDef {
  label: string;
  key: keyof Telemetry;
}

export interface MetricGroup {
  label: string;
  metrics: MetricDef[];
}

export const TELEMETRY_GROUPS: MetricGroup[] = [
  {
    label: "TACTICAL",
    metrics: [
      { label: "PPDA", key: "ppda" },
      { label: "Block Height", key: "block_height_m" },
      { label: "Vertical Disconnect", key: "vertical_disconnect" },
      { label: "Field Tilt", key: "field_tilt" },
    ],
  },
  {
    label: "PHYSICAL",
    metrics: [
      { label: "Sprint Drop-Off", key: "sprint_drop_off" },
      { label: "HID Deficit", key: "hid_deficit_km" },
      { label: "Recovery Time", key: "recovery_time_sec" },
      { label: "Defensive Fatigue", key: "defensive_fatigue" },
    ],
  },
  {
    label: "PSYCHOLOGICAL",
    metrics: [
      { label: "Crowd Noise", key: "crowd_decibels" },
      { label: "Foul Escalation", key: "foul_escalation" },
      { label: "xG Delta", key: "xg_delta" },
      { label: "Panic Index", key: "panic_index" },
    ],
  },
  {
    label: "ENVIRONMENTAL",
    metrics: [
      { label: "Pitch Slickness", key: "pitch_slickness" },
      { label: "Wind Interference", key: "wind_interference" },
      { label: "Fog Visibility", key: "fog_visibility" },
    ],
  },
];

export function isHighSeverity(value: number): boolean {
  return value >= 80;
}

export function isWarningSeverity(value: number): boolean {
  return value >= 60 && value < 80;
}
