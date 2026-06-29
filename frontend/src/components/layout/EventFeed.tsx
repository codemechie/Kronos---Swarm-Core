import { useKronos } from "../../hooks/useKronos";

const severityColor: Record<string, string> = {
  INFO: "text-blue-600",
  WARNING: "text-yellow-600",
  CRITICAL: "text-red-600",
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
    <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs tracking-widest text-green-600 font-semibold">EVENT FEED</span>
        <span className="text-2xs text-gray-400">{events.length} events</span>
      </div>
      <div className="max-h-80 overflow-y-auto space-y-2">
        {events.length === 0 ? (
          <div className="text-gray-500 text-sm py-2">No operational events recorded</div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className={`${ev.severity === "CRITICAL" ? "border-l-[3px]" : "border-l-2"} pl-4 py-2 hover:bg-gray-50 transition-colors duration-150 ${severityBorder[ev.severity] ?? "border-l-gray-200"}`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${ev.severity === "INFO" ? "opacity-40" : ""} ${severityDot[ev.severity] ?? "bg-gray-500"}`} />
                <span className={`text-2xs font-semibold ${severityColor[ev.severity] ?? "text-gray-500"}`}>
                  {ev.severity}
                </span>
                <span className="text-gray-600">{ev.minute}&apos;</span>
              </div>
              <div className="text-xs text-gray-700 mt-1">{ev.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
