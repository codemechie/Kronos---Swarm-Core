import { useMemo, useRef, useEffect, useState } from "react";
import { CommandHeader } from "../components/layout/CommandHeader";
import {
  useTimeline,
  useTimelineEvents,
  useSelectedEvent,
} from "../lib/matchStory/timelineHooks";
import { TimelineEvent } from "../components/match_story/TimelineEvent";
import { ScoreProgression } from "../components/match_story/ScoreProgression";
import { EventDetailPanel } from "../components/match_story/EventDetailPanel";
import { ReplayControlsBar } from "../features/match_story/replay/replayControls";
import { useReplayEngine } from "../features/match_story/replay/replayHooks";
import { getNewlyVisibleEvents } from "../features/match_story/replay/replayEngine";
import {
  getPeriodLabel,
  formatDate,
} from "../lib/matchStory/timelineService";

export function MatchStory() {
  const { timeline, loading, error, reload } = useTimeline();
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());
  const prevMinuteRef = useRef(0);

  const replay = useReplayEngine(timeline);

  const {
    visibleEvents,
    groupVisibility,
    toggleGroup,
    setAllGroups,
  } = useTimelineEvents(
    replay.derived.visibleEvents.length > 0
      ? ({ timeline: replay.derived.visibleEvents } as any)
      : null,
  );
  const {
    selectedId,
    selectedEvent,
    selectEvent,
  } = useSelectedEvent(visibleEvents);

  const newlyVisibleEvents = useMemo(
    () =>
      timeline
        ? getNewlyVisibleEvents(
            timeline,
            prevMinuteRef.current,
            replay.state.currentMinute,
          )
        : [],
    [timeline, replay.state.currentMinute],
  );

  useEffect(() => {
    for (const e of newlyVisibleEvents) {
      if (!animatedIds.has(e.id)) {
        setAnimatedIds((prev) => {
          const next = new Set(prev);
          next.add(e.id);
          return next;
        });
      }
    }
    prevMinuteRef.current = replay.state.currentMinute;
  }, [newlyVisibleEvents, animatedIds]);

  const eventsByMinute = useMemo(() => {
    const groups: Record<string, typeof visibleEvents> = {};
    for (const e of visibleEvents) {
      const key = `${e.match_period}:${e.minute}`;
      if (!groups[key]) groups[key] = [];
      groups[key]!.push(e);
    }
    return groups;
  }, [visibleEvents]);

  const sortedPeriods = useMemo(() => {
    const periodOrder = [
      "FIRST_HALF",
      "SECOND_HALF",
      "EXTRA_TIME_1",
      "EXTRA_TIME_2",
      "PENALTY_SHOOTOUT",
    ];
    return Object.keys(eventsByMinute).sort((a, b) => {
      const [pa, ma] = a.split(":");
      const [pb, mb] = b.split(":");
      const oa = periodOrder.indexOf(pa);
      const ob = periodOrder.indexOf(pb);
      if (oa !== ob) return oa - ob;
      return Number(ma) - Number(mb);
    });
  }, [eventsByMinute]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 font-mono">
        <div className="max-w-4xl mx-auto space-y-4">
          <CommandHeader />
          <div className="border border-gray-700 rounded bg-gray-900 p-8 text-center">
            <div className="text-gray-400 text-sm animate-pulse">
              Loading timeline data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black p-4 font-mono">
        <div className="max-w-4xl mx-auto space-y-4">
          <CommandHeader />
          <div className="border border-red-700 rounded bg-red-900/20 p-8 text-center">
            <div className="text-red-400 text-sm mb-2">Failed to load timeline</div>
            <div className="text-red-300 text-xs mb-4">{error}</div>
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded px-3 py-1"
              onClick={reload}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="min-h-screen bg-black p-4 font-mono">
        <div className="max-w-4xl mx-auto space-y-4">
          <CommandHeader />
          <div className="border border-gray-700 rounded bg-gray-900 p-8 text-center">
            <div className="text-gray-500 text-sm">No timeline data available</div>
          </div>
        </div>
      </div>
    );
  }

  const st = replay.derived.statistics;

  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-5xl mx-auto space-y-4">
        <CommandHeader />

        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-xs tracking-widest text-gray-400 mb-1">MATCH STORY</div>
          <div className="text-[10px] tracking-widest text-gray-600 mb-3">
            Match Replay · runtime timeline — compiled from canonical narrative dataset
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-700 rounded bg-gray-950 p-3">
              <div className="text-[9px] tracking-widest text-gray-500 mb-1">MATCH</div>
              <div className="text-sm font-bold text-white">
                {timeline.match.home_team} vs {timeline.match.away_team}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {formatDate(timeline.match.date)} · {timeline.match.competition}
              </div>
              <div className="text-xs text-gray-500">
                {timeline.match.venue || "Venue TBD"}
              </div>
            </div>

            <div className="border border-gray-700 rounded bg-gray-950 p-3">
              <div className="text-[9px] tracking-widest text-gray-500 mb-1">LIVE SCORE</div>
              <div className="text-lg font-bold text-white">
                <span className="text-green-400">{replay.derived.currentScore.home}</span>
                <span className="text-gray-500 mx-1">-</span>
                <span className="text-blue-400">{replay.derived.currentScore.away}</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {replay.derived.currentPeriod.replace(/_/g, " ")}
              </div>
              <div className="text-[10px] text-gray-500">
                {timeline.match_id}
              </div>
            </div>
          </div>
        </div>

        <ReplayControlsBar
          state={replay.state}
          controls={replay.controls}
          maxMinute={replay.derived.maxMinute}
          progress={replay.derived.progress}
          isComplete={replay.derived.isComplete}
        />

        {selectedEvent && (
          <EventDetailPanel event={selectedEvent} onClose={() => selectEvent(null)} />
        )}

        <ScoreProgression
          events={replay.derived.visibleEvents}
          homeTeam={timeline.match.home_team}
          awayTeam={timeline.match.away_team}
          maxMinute={replay.derived.maxMinute}
        />

        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-[10px] tracking-widest text-gray-400 mb-3">MATCH STATISTICS</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
            <StatItem label="Total Events" value={String(st.totalEvents)} />
            <StatItem label="Goals" value={`${st.goalsHome} - ${st.goalsAway}`} />
            <StatItem label="Yellow Cards" value={String(st.cardsYellow)} />
            <StatItem label="Red Cards" value={String(st.cardsRed)} />
            <StatItem label="Substitutions" value={String(st.substitutions)} />
            <StatItem label="Pressure Surges" value={String(st.pressureSurges)} />
            <StatItem label="Momentum Shifts" value={String(st.momentumShifts)} />
            <StatItem label="Key Events" value={String(st.keyEvents)} />
          </div>
        </div>

        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-widest text-gray-400">TIMELINE FILTERS</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-[9px] text-gray-500 hover:text-white border border-gray-700 rounded px-2 py-0.5"
                onClick={() => setAllGroups(true)}
              >
                Show All
              </button>
              <button
                type="button"
                className="text-[9px] text-gray-500 hover:text-white border border-gray-700 rounded px-2 py-0.5"
                onClick={() => setAllGroups(false)}
              >
                Hide All
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(groupVisibility).map(([group, visible]) => (
              <button
                key={group}
                type="button"
                className={`text-[9px] px-2 py-0.5 rounded border transition-colors
                  ${visible ? "border-gray-500 text-gray-300 bg-gray-800" : "border-gray-700 text-gray-600 bg-gray-950"}`}
                onClick={() => toggleGroup(group as keyof typeof groupVisibility)}
              >
                {visible ? "✓ " : ""}
                {group}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-[10px] tracking-widest text-gray-400 mb-3">
            TIMELINE · {visibleEvents.length} events
          </div>

          {visibleEvents.length === 0 ? (
            <div className="text-gray-500 text-xs text-center py-8">
              No events yet. Press Play to start the match replay.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedPeriods.map((key) => {
                const [period, minute] = key.split(":");
                const events = eventsByMinute[key]!;
                return (
                  <div key={key}>
                    <div className="text-[9px] text-gray-600 mb-1 mt-3 first:mt-0">
                      {getPeriodLabel(period as any)} · {minute}'
                    </div>
                    <div className="space-y-2">
                      {events.map((e) => (
                        <TimelineEvent
                          key={e.id}
                          event={e}
                          isSelected={selectedId === e.id}
                          isNewlyVisible={animatedIds.has(e.id)}
                          onSelect={selectEvent}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border border-gray-700 rounded bg-gray-900 p-3">
          <div className="text-[9px] text-gray-600 text-center">
            Compiled from {timeline.metadata.source_dataset} · v{timeline.metadata.compiler_version} ·{" "}
            {timeline.metadata.validation_status} · {timeline.metadata.total_events} events ·{" "}
            {timeline.metadata.generation_time ? new Date(timeline.metadata.generation_time).toLocaleString() : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-700/50 rounded bg-gray-950 p-2">
      <div className="text-[9px] text-gray-500">{label}</div>
      <div className="text-xs font-bold text-white">{value}</div>
    </div>
  );
}
