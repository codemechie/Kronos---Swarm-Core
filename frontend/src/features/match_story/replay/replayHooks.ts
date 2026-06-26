import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { RuntimeTimeline } from "../../../lib/matchStory/timelineTypes";
import type { TimelineStatistics } from "../../../lib/matchStory/timelineService";
import type { ReplayState, PlaybackSpeed } from "./replayTypes";
import { TICK_INTERVAL_MS } from "./replayTypes";
import {
  getVisibleEvents,
  getCurrentScore,
  getCurrentMatchPeriod,
  getReplayStatistics,
  getMaxMinute,
  getReplayProgress,
  isReplayComplete,
  advanceClock,
  findFirstGoalAfter,
  findLastGoalAtOrBefore,
  findHalftimeMinute,
  findFulltimeMinute,
  findExtraTimeStartMinute,
} from "./replayEngine";

const INITIAL_REPLAY_STATE: ReplayState = {
  currentMinute: 0,
  currentSecond: 0,
  playbackState: "PAUSED",
  playbackSpeed: 1,
};

export interface ReplayControls {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  restart: () => void;
  seek: (minute: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  jumpToMinute: (minute: number) => void;
  jumpToNextGoal: () => void;
  jumpToPreviousGoal: () => void;
  jumpToHalftime: () => void;
  jumpToFulltime: () => void;
  jumpToExtraTime: () => void;
}

export interface ReplayDerivedState {
  visibleEvents: ReturnType<typeof getVisibleEvents>;
  currentScore: ReturnType<typeof getCurrentScore>;
  currentPeriod: ReturnType<typeof getCurrentMatchPeriod>;
  statistics: TimelineStatistics;
  maxMinute: number;
  progress: number;
  isComplete: boolean;
}

export function useReplayEngine(
  timeline: RuntimeTimeline | null,
): {
  state: ReplayState;
  derived: ReplayDerivedState;
  controls: ReplayControls;
} {
  const [state, setState] = useState<ReplayState>(INITIAL_REPLAY_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;

  const tick = useCallback(() => {
    const current = stateRef.current;
    if (current.playbackState !== "PLAYING") return;
    const deltaSeconds = TICK_INTERVAL_MS / 1000;
    const next = advanceClock(current, deltaSeconds);
    setState(next);
  }, []);

  useEffect(() => {
    if (state.playbackState === "PLAYING") {
      intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.playbackState, tick]);

  const play = useCallback(() => {
    setState((s) => ({ ...s, playbackState: "PLAYING" }));
  }, []);

  const pause = useCallback(() => {
    setState((s) => ({ ...s, playbackState: "PAUSED" }));
  }, []);

  const togglePlay = useCallback(() => {
    setState((s) => ({
      ...s,
      playbackState: s.playbackState === "PLAYING" ? "PAUSED" : "PLAYING",
    }));
  }, []);

  const restart = useCallback(() => {
    setState({ ...INITIAL_REPLAY_STATE, playbackSpeed: stateRef.current.playbackSpeed });
  }, []);

  const seek = useCallback((minute: number) => {
    setState((s) => ({
      ...s,
      currentMinute: Math.max(0, minute),
    }));
  }, []);

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setState((s) => ({ ...s, playbackSpeed: speed }));
  }, []);

  const jumpToMinute = useCallback((minute: number) => {
    setState((s) => ({
      ...s,
      currentMinute: Math.max(0, minute),
    }));
  }, []);

  const jumpToNextGoal = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    const cm = stateRef.current.currentMinute;
    const goal = findFirstGoalAfter(tl.timeline, cm);
    if (goal) {
      setState((s) => ({ ...s, currentMinute: goal.minute }));
    }
  }, []);

  const jumpToPreviousGoal = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    const cm = stateRef.current.currentMinute;
    const goal = findLastGoalAtOrBefore(tl.timeline, cm - 0.001);
    if (goal) {
      setState((s) => ({ ...s, currentMinute: goal.minute }));
    }
  }, []);

  const jumpToHalftime = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    const minute = findHalftimeMinute(tl.timeline);
    if (minute != null) {
      setState((s) => ({ ...s, currentMinute: minute }));
    }
  }, []);

  const jumpToFulltime = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    const minute = findFulltimeMinute(tl.timeline);
    if (minute != null) {
      setState((s) => ({ ...s, currentMinute: minute }));
    }
  }, []);

  const jumpToExtraTime = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    const minute = findExtraTimeStartMinute(tl.timeline);
    if (minute != null) {
      setState((s) => ({ ...s, currentMinute: minute }));
    }
  }, []);

  const maxMinute = useMemo(
    () => (timeline ? getMaxMinute(timeline) : 120),
    [timeline],
  );

  const visibleEvents = useMemo(
    () =>
      timeline ? getVisibleEvents(timeline, state.currentMinute) : [],
    [timeline, state.currentMinute],
  );

  const currentScore = useMemo(
    () => getCurrentScore(visibleEvents),
    [visibleEvents],
  );

  const currentPeriod = useMemo(
    () => getCurrentMatchPeriod(visibleEvents),
    [visibleEvents],
  );

  const statistics = useMemo(
    () =>
      timeline
        ? getReplayStatistics(
            visibleEvents,
            timeline.match.home_team,
            timeline.match.away_team,
          )
        : {
            totalEvents: 0,
            goalsHome: 0,
            goalsAway: 0,
            cardsYellow: 0,
            cardsRed: 0,
            substitutions: 0,
            pressureSurges: 0,
            momentumShifts: 0,
            phaseChanges: 0,
            keyEvents: 0,
            highlights: 0,
          },
    [timeline, visibleEvents],
  );

  const progress = useMemo(
    () => getReplayProgress(state.currentMinute, maxMinute),
    [state.currentMinute, maxMinute],
  );

  const complete = useMemo(
    () => isReplayComplete(state.currentMinute, maxMinute),
    [state.currentMinute, maxMinute],
  );

  const controls: ReplayControls = {
    play,
    pause,
    togglePlay,
    restart,
    seek,
    setSpeed,
    jumpToMinute,
    jumpToNextGoal,
    jumpToPreviousGoal,
    jumpToHalftime,
    jumpToFulltime,
    jumpToExtraTime,
  };

  return {
    state,
    derived: {
      visibleEvents,
      currentScore,
      currentPeriod,
      statistics,
      maxMinute,
      progress,
      isComplete: complete,
    },
    controls,
  };
}
