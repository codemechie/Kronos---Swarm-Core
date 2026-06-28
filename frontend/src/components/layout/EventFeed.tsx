import { useKronos } from "../../hooks/useKronos";

const severityColor: Record<string, string> = {
  INFO: "text-blue-400",
  WARNING: "text-yellow-400",
  CRITICAL: "text-red-400",
};

const severityDot: Record<string, string> = {
  INFO: "bg-blue-500",
  WARNING: "bg-yellow-500",
  CRITICAL: "bg-red-500",
};

const severityBorder: Record<string, string> = {
  INFO: "border-l-blue-500/20",
  WARNING: "border-l-yellow-500/40",
  CRITICAL: "border-l-red-500/60",
};

export function EventFeed() {
  const { events } = useKronos();

  return (
    <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs tracking-widest text-gray-600">EVENT FEED</span>
        <span className="text-[9px] text-gray-600/60">{events.length} events</span>
      </div>
      <div className="max-h-80 overflow-y-auto space-y-1.5">
        {events.length === 0 ? (
          <div className="text-gray-500 text-sm py-2">No operational events recorded</div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className={`${ev.severity === "CRITICAL" ? "border-l-[3px]" : "border-l-2"} pl-3 py-1.5 ${severityBorder[ev.severity] ?? "border-l-gray-700"}`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${ev.severity === "INFO" ? "opacity-40" : ""} ${severityDot[ev.severity] ?? "bg-gray-500"}`} />
                <span className={`text-[10px] font-semibold ${severityColor[ev.severity] ?? "text-gray-400"}`}>
                  {ev.severity}
                </span>
                <span className="text-gray-600">{ev.minute}&apos;</span>
              </div>
              <div className="text-xs text-gray-200 mt-0.5">{ev.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
