export type MatchPhase = "GRIND" | "WEATHER" | "CHAOS";

export type EventSeverity = "INFO" | "WARNING" | "CRITICAL";

export type VerdictStatus = "STABLE" | "WATCH" | "CRITICAL";

export interface Telemetry {
  minute: number;
  score_home?: number;
  score_away?: number;
  ppda?: number;
  block_height_m?: number;
  vertical_disconnect?: number;
  field_tilt?: number;
  sprint_drop_off?: number;
  hid_deficit_km?: number;
  recovery_time_sec?: number;
  defensive_fatigue?: number;
  crowd_decibels?: number;
  foul_escalation?: number;
  xg_delta?: number;
  panic_index?: number;
  rest_defense_count?: number;
  box_overload_count?: number;
  gk_sweeper_dist?: number;
  sub_shock_index?: number;
  pitch_slickness?: number;
  wind_interference?: number;
  fog_visibility?: number;
}

export interface SwarmMetrics {
  fracture_index: number;
  chaos_probability: number;
  agreement_score?: number;
}

export interface DebateOutputs {
  [agentName: string]: string;
}

export interface HistoryPoint {
  minute: number;
  fracture: number;
  chaos: number;
  timestamp: number;
}

export interface KronosEvent {
  id: string;
  minute: number;
  severity: EventSeverity;
  message: string;
  timestamp: number;
}

export type RiskLevel = "NOMINAL" | "HIGH_RISK";

export interface FractureContributor {
  agentId: string;
  displayName: string;
  contributionPercent: number;
}

export interface SwarmAgent {
  id: string;
  displayName: string;
  verdict: string;
  riskLevel: RiskLevel;
}

export type SignalCategory = "AGENT" | "FRACTURE" | "CHAOS" | "TELEMETRY";

export interface SupportingSignal {
  category: SignalCategory;
  message: string;
}

export interface LeadCoachVerdict {
  status: VerdictStatus;
  headline: string;
  rationale: string;
  supportingAgents: string[];
  supportingSignals: SupportingSignal[];
}

export interface KronosState {
  telemetry: Telemetry;
  swarmMetrics: SwarmMetrics;
  debateOutputs: DebateOutputs;
  history: HistoryPoint[];
  phase: MatchPhase;
  events: KronosEvent[];
}

export interface KronosPacket {
  telemetry?: Telemetry;
  swarm_metrics?: SwarmMetrics;
  debate_outputs?: DebateOutputs;
  minute?: number;
  fracture_index?: number;
  chaos_probability?: number;
}
