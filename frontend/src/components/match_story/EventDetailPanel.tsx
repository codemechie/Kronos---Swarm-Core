import type { RuntimeTimelineEvent } from "../../lib/matchStory/timelineTypes";
import {
  getDisplayMinute,
  getPeriodLabel,
  getConfidenceColor,
} from "../../lib/matchStory/timelineService";

interface EventDetailPanelProps {
  event: RuntimeTimelineEvent;
  onClose: () => void;
}

export function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  return (
    <div className="border border-gray-700 rounded bg-gray-950 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] tracking-widest text-gray-400">EVENT DETAIL</div>
        <button
          type="button"
          className="text-gray-500 hover:text-white text-xs px-2 py-0.5 rounded border border-gray-700"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <DetailRow label="ID" value={event.id} />
        <DetailRow label="Minute" value={`${getDisplayMinute(event)}'`} />
        <DetailRow label="Period" value={getPeriodLabel(event.match_period)} />
        <DetailRow label="Event Type" value={event.event_type} />
        <DetailRow label="Team" value={event.team ?? "N/A"} />
        <DetailRow label="Player" value={event.player ?? "N/A"} />
        <DetailRow label="Weight" value={`${Math.round(event.weight * 100)}%`} />
        <DetailRow label="Confidence" value={event.confidence} extraClass={getConfidenceColor(event.confidence)} />
        {event.card_type && <DetailRow label="Card Type" value={event.card_type} />}
        <DetailRow label="Timeline Group" value={event.timeline_group} />
        <DetailRow label="Icon" value={event.icon} />
        <DetailRow label="Color" value={event.color}>
          <span
            className="inline-block w-4 h-4 rounded border border-gray-600 ml-1"
            style={{ backgroundColor: event.color }}
          />
        </DetailRow>
        <DetailRow label="Animation" value={event.animation ?? "none"} />
        <DetailRow label="Audio Trigger" value={event.audio_trigger ?? "none"} />
        <DetailRow label="Visible" value={String(event.visible)} />

        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="text-[10px] tracking-widest text-gray-400 mb-1">RUNTIME FLAGS</div>
          <div className="grid grid-cols-2 gap-1">
            <FlagRow label="Key Event" value={event.runtime_flags.is_key_event} />
            <FlagRow label="Highlight" value={event.runtime_flags.is_highlight} />
            <FlagRow label="Commentary" value={event.runtime_flags.is_commentary_trigger} />
            <FlagRow label="Show on Timeline" value={event.runtime_flags.show_on_timeline} />
            <FlagRow label="Include in Replay" value={event.runtime_flags.include_in_replay} />
            <FlagRow label="User Attention" value={event.runtime_flags.requires_user_attention} />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="text-[10px] tracking-widest text-gray-400 mb-1">DESCRIPTION</div>
          <p className="text-gray-300 text-xs leading-relaxed">{event.description}</p>
        </div>

        {event.attribution.length > 0 && (
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="text-[10px] tracking-widest text-gray-400 mb-1">SOURCES</div>
            {event.attribution.map((ref, idx) => (
              <div key={idx} className="text-[10px] text-gray-500">
                {ref.source} — {ref.detail}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  extraClass,
  children,
}: {
  label: string;
  value: string;
  extraClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`text-gray-300 text-right flex items-center ${extraClass ?? ""}`}>
        {value}
        {children}
      </span>
    </div>
  );
}

function FlagRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full ${value ? "bg-green-500" : "bg-gray-600"}`}
      />
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}
