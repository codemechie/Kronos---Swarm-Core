import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  RuntimeTimelineEvent,
  RuntimeTimeline,
  TimelineGroup,
  TimelineGroupVisibility,
} from "./timelineTypes";
import { loadTimeline, TimelineLoadError } from "./timelineLoader";
import {
  getUniqueGroups,
  filterByVisibility,
  getStatistics,
  groupEvents,
  getEventById,
} from "./timelineService";
import type { TimelineStatistics, GroupedEvents } from "./timelineService";

const DEFAULT_GROUP_VISIBILITY: Record<string, boolean> = {
  MATCH_STATE: true,
  GOAL_EVENTS: true,
  DISCIPLINE: true,
  TACTICAL: true,
  PRESSURE: true,
  MOMENTUM: true,
  STRUCTURE: true,
};

export interface UseTimelineResult {
  timeline: RuntimeTimeline | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useTimeline(path?: string): UseTimelineResult {
  const [timeline, setTimeline] = useState<RuntimeTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    loadTimeline(path)
      .then((result) => {
        setTimeline(result.timeline);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof TimelineLoadError) {
          setError(err.message);
        } else {
          setError(String(err));
        }
        setLoading(false);
      });
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { timeline, loading, error, reload: load };
}

export interface UseTimelineEventsResult {
  visibleEvents: RuntimeTimelineEvent[];
  groups: TimelineGroup[];
  groupVisibility: TimelineGroupVisibility;
  toggleGroup: (group: TimelineGroup) => void;
  setAllGroups: (visible: boolean) => void;
}

export function useTimelineEvents(
  timeline: RuntimeTimeline | null,
): UseTimelineEventsResult {
  const groups = useMemo(
    () => (timeline ? getUniqueGroups(timeline.timeline) : []),
    [timeline],
  );

  const [groupVisibility, setGroupVisibility] = useState<
    Record<string, boolean>
  >(DEFAULT_GROUP_VISIBILITY);

  useEffect(() => {
    if (groups.length > 0) {
      setGroupVisibility((prev) => {
        const next = { ...prev };
        for (const g of groups) {
          if (!(g in next)) {
            next[g] = true;
          }
        }
        return next;
      });
    }
  }, [groups]);

  const visibleEvents = useMemo(
    () =>
      timeline
        ? filterByVisibility(timeline.timeline, groupVisibility as TimelineGroupVisibility)
        : [],
    [timeline, groupVisibility],
  );

  const toggleGroup = useCallback((group: TimelineGroup) => {
    setGroupVisibility((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  }, []);

  const setAllGroups = useCallback((visible: boolean) => {
    setGroupVisibility((prev) => {
      const next: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) {
        next[key] = visible;
      }
      return next;
    });
  }, []);

  return {
    visibleEvents,
    groups,
    groupVisibility: groupVisibility as TimelineGroupVisibility,
    toggleGroup,
    setAllGroups,
  };
}

export function useTimelineStatistics(
  timeline: RuntimeTimeline | null,
): TimelineStatistics | null {
  return useMemo(
    () => (timeline ? getStatistics(timeline) : null),
    [timeline],
  );
}

export function useTimelineGrouped(
  events: RuntimeTimelineEvent[],
): GroupedEvents {
  return useMemo(() => groupEvents(events), [events]);
}

export function useSelectedEvent(
  events: RuntimeTimelineEvent[],
): {
  selectedId: string | null;
  selectedEvent: RuntimeTimelineEvent | null;
  selectEvent: (id: string | null) => void;
} {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedEvent = useMemo(
    () => (selectedId ? getEventById(events, selectedId) ?? null : null),
    [events, selectedId],
  );

  return { selectedId, selectedEvent, selectEvent: setSelectedId };
}
