import { memo } from "react";
import type { RuntimeTimelineEvent } from "../../lib/matchStory/timelineTypes";
import { getDisplayMinute, getConfidenceColor } from "../../lib/matchStory/timelineService";

interface TimelineEventProps {
  event: RuntimeTimelineEvent;
  isSelected: boolean;
  isNewlyVisible: boolean;
  onSelect: (id: string | null) => void;
}

const eventTypeLabels: Record<string, string> = {
  GOAL: "GOAL",
  PENALTY: "PENALTY AWARD",
  CARD: "CARD",
  SUBSTITUTION: "SUB",
  MOMENTUM_SHIFT: "MOMENTUM",
  PRESSURE_SURGE: "PRESSURE",
  PHASE_CHANGE: "PHASE",
};

const iconMap: Record<string, string> = {
  goal: "⚽",
  penalty: "📐",
  card_yellow: "🟨",
  card_red: "🟥",
  card_second_yellow: "🟧",
  substitution: "🔄",
  momentum: "📈",
  pressure: "🔥",
  phase_change: "⏱️",
  unknown: "❓",
};

function getIcon(icon: string): string {
  return iconMap[icon] ?? iconMap.unknown;
}

function getWeightBarStyle(weight: number): string {
  if (weight >= 0.9) return "bg-green-500";
  if (weight >= 0.7) return "bg-blue-500";
  if (weight >= 0.5) return "bg-yellow-500";
  return "bg-gray-500";
}

function getEventTypeColor(eventType: string): string {
  switch (eventType) {
    case "GOAL":
      return "border-l-green-500";
    case "PENALTY":
      return "border-l-red-500";
    case "CARD":
      return "border-l-yellow-500";
    case "SUBSTITUTION":
      return "border-l-gray-500";
    case "MOMENTUM_SHIFT":
      return "border-l-purple-500";
    case "PRESSURE_SURGE":
      return "border-l-orange-500";
    case "PHASE_CHANGE":
      return "border-l-blue-500";
    default:
      return "border-l-gray-500";
  }
}

export const TimelineEvent = memo(function TimelineEvent({
  event,
  isSelected,
  isNewlyVisible,
  onSelect,
}: TimelineEventProps) {
  const weightPct = Math.round(event.weight * 100);
  const minuteStr = getDisplayMinute(event);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`border border-gray-700 rounded bg-gray-900 p-3 cursor-pointer
        hover:bg-gray-800 transition-colors border-l-4 ${getEventTypeColor(event.event_type)}
        ${isSelected ? "ring-1 ring-white bg-gray-800" : ""}
        ${!event.visible ? "opacity-40" : ""}
        ${isNewlyVisible ? "animate-fadeInFromLeft" : ""}`}
      onClick={() => onSelect(isSelected ? null : event.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(isSelected ? null : event.id);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="text-lg w-6 text-center flex-shrink-0">
          {getIcon(event.icon)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="text-white font-bold">{minuteStr}'</span>
            <span
              className="text-[10px] font-bold tracking-wider px-1 rounded"
              style={{ backgroundColor: event.color + "33", color: event.color }}
            >
              {eventTypeLabels[event.event_type] ?? event.event_type}
            </span>
            {event.event_type === "CARD" && event.card_type && (
              <span className="text-[10px] text-gray-400">
                {event.card_type === "SECOND_YELLOW" ? "2ND YELLOW" : event.card_type}
              </span>
            )}
            <span className={`text-[10px] ${getConfidenceColor(event.confidence)}`}>
              {event.confidence}
            </span>
          </div>

          <div className="text-xs text-gray-300 mb-1.5 line-clamp-2">
            {event.description}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            {event.player && (
              <span>#{event.player}</span>
            )}
            {event.team && event.player && <span>·</span>}
            {event.team && (
              <span>{event.team}</span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${getWeightBarStyle(event.weight)}`}
                style={{ width: `${weightPct}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-500 w-6 text-right">{weightPct}%</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-[9px] text-gray-500">
            {event.runtime_flags.is_key_event && (
              <span className="text-yellow-400">★ KEY</span>
            )}
            {event.runtime_flags.is_highlight && (
              <span className="text-purple-400">◆ HL</span>
            )}
            {event.runtime_flags.is_commentary_trigger && (
              <span className="text-blue-400">💬</span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-white">
            {event.score.home}-{event.score.away}
          </div>
        </div>
      </div>
    </div>
  );
});
