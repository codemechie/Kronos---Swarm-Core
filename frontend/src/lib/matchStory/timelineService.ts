import type {
  RuntimeTimelineEvent,
  RuntimeTimeline,
  TimelineGroup,
  MatchPeriod,
  TimelineGroupVisibility,
} from "./timelineTypes";

export type GroupedEvents = Record<TimelineGroup, RuntimeTimelineEvent[]>;

export interface TimelineStatistics {
  totalEvents: number;
  goalsHome: number;
  goalsAway: number;
  cardsYellow: number;
  cardsRed: number;
  substitutions: number;
  pressureSurges: number;
  momentumShifts: number;
  phaseChanges: number;
  keyEvents: number;
  highlights: number;
}

export function filterByGroup(
  events: RuntimeTimelineEvent[],
  group: TimelineGroup,
): RuntimeTimelineEvent[] {
  return events.filter((e) => e.timeline_group === group);
}

export function filterByVisibility(
  events: RuntimeTimelineEvent[],
  visibility: TimelineGroupVisibility,
): RuntimeTimelineEvent[] {
  return events.filter((e) => visibility[e.timeline_group]);
}

export function getEventsByPeriod(
  events: RuntimeTimelineEvent[],
  period: MatchPeriod,
): RuntimeTimelineEvent[] {
  return events.filter((e) => e.match_period === period);
}

export function getScoreAtMinute(
  events: RuntimeTimelineEvent[],
  minute: number,
): { home: number; away: number } | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].minute <= minute) {
      return events[i].score;
    }
  }
  return null;
}

export function getEventById(
  events: RuntimeTimelineEvent[],
  id: string,
): RuntimeTimelineEvent | undefined {
  return events.find((e) => e.id === id);
}

export function getStatistics(
  timeline: RuntimeTimeline,
): TimelineStatistics {
  const events = timeline.timeline;
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
      if (e.team === timeline.match.home_team) {
        goalsHome++;
      } else if (e.team === timeline.match.away_team) {
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

export function groupEvents(
  events: RuntimeTimelineEvent[],
): GroupedEvents {
  const groups: Partial<GroupedEvents> = {};

  for (const e of events) {
    const g = e.timeline_group;
    if (!groups[g]) {
      groups[g] = [];
    }
    groups[g]!.push(e);
  }

  return groups as GroupedEvents;
}

export function getUniqueGroups(
  events: RuntimeTimelineEvent[],
): TimelineGroup[] {
  const seen = new Set<TimelineGroup>();
  for (const e of events) {
    seen.add(e.timeline_group);
  }
  return Array.from(seen);
}

export function getDisplayMinute(event: RuntimeTimelineEvent): string {
  if (event.stoppage_time != null) {
    return `${event.minute}+${event.stoppage_time}`;
  }
  return String(event.minute);
}

export function getPeriodLabel(period: MatchPeriod): string {
  const labels: Record<MatchPeriod, string> = {
    FIRST_HALF: "1st Half",
    SECOND_HALF: "2nd Half",
    EXTRA_TIME_1: "ET 1st Half",
    EXTRA_TIME_2: "ET 2nd Half",
    PENALTY_SHOOTOUT: "Penalties",
  };
  return labels[period];
}

export function getScoreLine(event: RuntimeTimelineEvent): string {
  return `${event.score.home} - ${event.score.away}`;
}

export function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case "HIGH":
      return "text-green-400";
    case "MEDIUM":
      return "text-yellow-400";
    case "LOW":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "TBD";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
