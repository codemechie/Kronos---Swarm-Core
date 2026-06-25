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

export interface GraniteReview {
  escalation_triggered: boolean;
  review_summary: string;
  contradiction_analysis: string;
  confidence_assessment: string;
  recommended_action: string;
  granite_confidence: number;
  provider: string;
  skipped: boolean;
}

export interface Validation {
  overall_confidence: number;
  agreement_score: number;
  trust_score: number;
  contradiction_count: number;
  flags: string[];
  evidence_summary: string;
  validation_source: string;
  skipped: boolean;
}

export type ConnectionStatus = "CONNECTED" | "CONNECTING" | "OFFLINE";

export interface KronosState {
  telemetry: Telemetry;
  swarmMetrics: SwarmMetrics;
  debateOutputs: DebateOutputs;
  history: HistoryPoint[];
  phase: MatchPhase;
  events: KronosEvent[];
  granite_review: GraniteReview;
  validation: Validation;
  connectionStatus: ConnectionStatus;
}

export interface MatchProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
}

export interface TeamStats {
  health: number;
  aggression: number;
  momentum: number;
}

export interface TeamIntelligence {
  home: TeamStats;
  away: TeamStats;
}

export interface CommentaryEntry {
  minute: number;
  text: string;
  source: string;
}

export interface MatchStorySnapshot {
  minute: number;
  score: { home: number; away: number };
  probabilities: MatchProbabilities;
  teamIntelligence: TeamIntelligence;
  commentaryEntries: CommentaryEntry[];
}

export interface KronosPacket {
  telemetry?: Telemetry;
  swarm_metrics?: SwarmMetrics;
  debate_outputs?: DebateOutputs;
  minute?: number;
  fracture_index?: number;
  chaos_probability?: number;
  granite_review?: GraniteReview;
  validation?: Validation;
}
