import { memo, useMemo } from "react";
import type { RuntimeTimelineEvent } from "../../lib/matchStory/timelineTypes";
import { getDisplayMinute, getScoreLine } from "../../lib/matchStory/timelineService";

interface ScoreProgressionProps {
  events: RuntimeTimelineEvent[];
  homeTeam: string;
  awayTeam: string;
  maxMinute: number;
}

export const ScoreProgression = memo(function ScoreProgression({
  events,
  homeTeam,
  awayTeam,
  maxMinute,
}: ScoreProgressionProps) {
  const scoringEvents = useMemo(
    () => events.filter((e) => e.event_type === "GOAL"),
    [events],
  );

  if (scoringEvents.length === 0) {
    return (
      <div className="border border-gray-700 rounded bg-gray-900 p-4">
        <div className="text-[10px] tracking-widest text-gray-400 mb-3">SCORE PROGRESSION</div>
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <span className="text-green-400">{homeTeam}</span>
          <span>0</span>
          <span className="text-gray-500">-</span>
          <span>0</span>
          <span className="text-blue-400">{awayTeam}</span>
        </div>
        <div className="text-[10px] text-gray-500 mt-1">No goals yet</div>
      </div>
    );
  }

  const lastScore = scoringEvents[scoringEvents.length - 1].score;

  return (
    <div className="border border-gray-700 rounded bg-gray-900 p-4">
      <div className="text-[10px] tracking-widest text-gray-400 mb-3">SCORE PROGRESSION</div>

      <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
        <span className="text-green-400">{homeTeam}</span>
        <span>{lastScore.home}</span>
        <span className="text-gray-500">-</span>
        <span>{lastScore.away}</span>
        <span className="text-blue-400">{awayTeam}</span>
      </div>

      <div className="relative h-8 mt-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-1 bg-gray-700 rounded-full" />
        </div>

        {scoringEvents.map((event) => {
          const totalMin = event.minute + (event.stoppage_time ?? 0);
          const leftPct = (totalMin / Math.max(maxMinute, 1)) * 100;
          const isHome = event.team === homeTeam;

          return (
            <div
              key={event.id}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${leftPct}%` }}
            >
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 mb-0.5 whitespace-nowrap">
                  {getDisplayMinute(event)}'
                </span>
                <div
                  className={`w-3 h-3 rounded-full border-2 ${isHome ? "bg-green-500 border-green-300" : "bg-blue-500 border-blue-300"}`}
                />
                <span className="text-[9px] text-gray-400 mt-0.5 whitespace-nowrap">
                  {getScoreLine(event)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
