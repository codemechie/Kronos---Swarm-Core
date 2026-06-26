import type {
  RuntimeTimeline,
  RuntimeTimelineEvent,
  Score,
  MatchPeriod,
} from "../../../lib/matchStory/timelineTypes";
import type { TimelineStatistics } from "../../../lib/matchStory/timelineService";
import type { ReplayState } from "./replayTypes";

export function getVisibleEvents(
  timeline: RuntimeTimeline,
  currentMinute: number,
): RuntimeTimelineEvent[] {
  return timeline.timeline.filter((e) => e.minute <= currentMinute);
}

export function getNewlyVisibleEvents(
  timeline: RuntimeTimeline,
  previousMinute: number,
  currentMinute: number,
): RuntimeTimelineEvent[] {
  return timeline.timeline.filter(
    (e) => e.minute > previousMinute && e.minute <= currentMinute,
  );
}

export function getCurrentScore(events: RuntimeTimelineEvent[]): Score {
  if (events.length === 0) return { home: 0, away: 0 };
  return events[events.length - 1].score;
}

export function getCurrentMatchPeriod(
  events: RuntimeTimelineEvent[],
): MatchPeriod {
  if (events.length === 0) return "FIRST_HALF";
  return events[events.length - 1].match_period;
}

export function getReplayStatistics(
  events: RuntimeTimelineEvent[],
  homeTeam: string,
  awayTeam: string,
): TimelineStatistics {
  let goalsHome = 0;
  let goalsAway = 0;
  let cardsYellow = 0;
  let cardsRed = 0;
  let substitutions = 0;
  let pressureSurges = 0;
  let momentumShifts = 0;
  let phaseChanges = 0;
  let keyEvents = 0;
  let highlights = 0;

  for (const e of events) {
    if (e.event_type === "GOAL") {
      if (e.team === homeTeam) {
        goalsHome++;
      } else if (e.team === awayTeam) {
        goalsAway++;
      }
    }
    if (e.event_type === "CARD") {
      if (e.card_type === "YELLOW" || e.card_type === "SECOND_YELLOW") {
        cardsYellow++;
      }
      if (e.card_type === "RED") {
        cardsRed++;
      }
    }
    if (e.event_type === "SUBSTITUTION") {
      substitutions++;
    }
    if (e.event_type === "PRESSURE_SURGE") {
      pressureSurges++;
    }
    if (e.event_type === "MOMENTUM_SHIFT") {
      momentumShifts++;
    }
    if (e.event_type === "PHASE_CHANGE") {
      phaseChanges++;
    }
    if (e.runtime_flags.is_key_event) {
      keyEvents++;
    }
    if (e.runtime_flags.is_highlight) {
      highlights++;
    }
  }

  return {
    totalEvents: events.length,
    goalsHome,
    goalsAway,
    cardsYellow,
    cardsRed,
    substitutions,
    pressureSurges,
    momentumShifts,
    phaseChanges,
    keyEvents,
    highlights,
  };
}

export function getMaxMinute(timeline: RuntimeTimeline): number {
  let max = 0;
  for (const e of timeline.timeline) {
    const total = e.minute + (e.stoppage_time ?? 0);
    if (total > max) max = total;
  }
  return max;
}

export function getReplayProgress(
  currentMinute: number,
  maxMinute: number,
): number {
  if (maxMinute <= 0) return 0;
  return Math.min(currentMinute / maxMinute, 1);
}

export function isReplayComplete(
  currentMinute: number,
  maxMinute: number,
): boolean {
  return currentMinute >= maxMinute;
}

export function findFirstGoalAfter(
  events: RuntimeTimelineEvent[],
  afterMinute: number,
): RuntimeTimelineEvent | undefined {
  return events.find(
    (e) => e.event_type === "GOAL" && e.minute > afterMinute,
  );
}

export function findLastGoalAtOrBefore(
  events: RuntimeTimelineEvent[],
  minute: number,
): RuntimeTimelineEvent | undefined {
  let found: RuntimeTimelineEvent | undefined;
  for (const e of events) {
    if (e.event_type === "GOAL" && e.minute <= minute) {
      found = e;
    }
  }
  return found;
}

export function findHalftimeMinute(
  events: RuntimeTimelineEvent[],
): number | undefined {
  const ht = events.find(
    (e) =>
      e.event_type === "PHASE_CHANGE" &&
      e.match_period === "FIRST_HALF" &&
      e.minute === 45,
  );
  return ht ? ht.minute + (ht.stoppage_time ?? 0) : undefined;
}

export function findFulltimeMinute(
  events: RuntimeTimelineEvent[],
): number | undefined {
  const ft = events.find(
    (e) =>
      e.event_type === "PHASE_CHANGE" &&
      e.match_period === "SECOND_HALF" &&
      e.minute === 90,
  );
  return ft ? ft.minute + (ft.stoppage_time ?? 0) : undefined;
}

export function findExtraTimeStartMinute(
  events: RuntimeTimelineEvent[],
): number | undefined {
  const et = events.find(
    (e) =>
      e.event_type === "PHASE_CHANGE" &&
      e.match_period === "EXTRA_TIME_1",
  );
  return et ? et.minute + (et.stoppage_time ?? 0) : undefined;
}

export function advanceClock(
  state: ReplayState,
  deltaRealSeconds: number,
): ReplayState {
  const advance = state.playbackSpeed * deltaRealSeconds;
  return {
    ...state,
    currentMinute: +(state.currentMinute + advance).toFixed(3),
    currentSecond: +(state.currentSecond + deltaRealSeconds).toFixed(1),
  };
}
