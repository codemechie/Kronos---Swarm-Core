export interface SourceReference {
  source: string;
  detail: string;
}

export interface RuntimeFlags {
  is_key_event: boolean;
  is_highlight: boolean;
  is_commentary_trigger: boolean;
  show_on_timeline: boolean;
  include_in_replay: boolean;
  requires_user_attention: boolean;
}

export interface Score {
  home: number;
  away: number;
}

export interface MatchInfo {
  home_team: string;
  away_team: string;
  date: string;
  competition: string;
  venue: string;
  home_score: number;
  away_score: number;
  home_shootout_score: number | null;
  away_shootout_score: number | null;
}

export type MatchPeriod =
  | "FIRST_HALF"
  | "SECOND_HALF"
  | "EXTRA_TIME_1"
  | "EXTRA_TIME_2"
  | "PENALTY_SHOOTOUT";

export type EventType =
  | "GOAL"
  | "PENALTY"
  | "CARD"
  | "SUBSTITUTION"
  | "MOMENTUM_SHIFT"
  | "PRESSURE_SURGE"
  | "PHASE_CHANGE";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type CardType = "YELLOW" | "RED" | "SECOND_YELLOW";

export type TimelineGroup =
  | "MATCH_STATE"
  | "GOAL_EVENTS"
  | "DISCIPLINE"
  | "TACTICAL"
  | "PRESSURE"
  | "MOMENTUM"
  | "STRUCTURE";

export interface RuntimeTimelineEvent {
  id: string;
  minute: number;
  stoppage_time: number | null;
  match_period: MatchPeriod;
  event_type: EventType;
  team: string | null;
  player: string | null;
  weight: number;
  score: Score;
  shootout_score: Score | null;
  description: string;
  confidence: Confidence;
  card_type: CardType | null;
  attribution: SourceReference[];
  timeline_group: TimelineGroup;
  icon: string;
  color: string;
  animation: string | null;
  audio_trigger: string | null;
  visible: boolean;
  runtime_flags: RuntimeFlags;
}

export interface RuntimeMetadata {
  generation_time: string;
  compiler_version: string;
  source_dataset: string;
  total_events: number;
  validation_status: string;
  schema_version: string;
}

export interface RuntimeTimeline {
  schema_version: string;
  match_id: string;
  match: MatchInfo;
  timeline: RuntimeTimelineEvent[];
  metadata: RuntimeMetadata;
}

export type TimelineGroupVisibility = Record<TimelineGroup, boolean>;
