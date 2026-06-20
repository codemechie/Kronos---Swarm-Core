import { useKronos } from "../../hooks/useKronos";

const severityColor: Record<string, string> = {
  INFO: "text-blue-400",
  WARNING: "text-yellow-400",
  CRITICAL: "text-red-400",
};

export function EventFeed() {
  const { events } = useKronos();

  return (
    <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
      <div className="text-xs tracking-widest text-gray-500 mb-3">
        EVENT FEED
      </div>
      <div className="max-h-80 overflow-y-auto text-sm space-y-3">
        {events.length === 0 ? (
          <div className="text-gray-500">No operational events recorded</div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="border-b border-gray-800 pb-2 last:border-0">
              <div className={severityColor[ev.severity] ?? "text-gray-400"}>
                [{ev.severity}]
              </div>
              <div className="text-gray-500 text-xs">
                Minute {ev.minute}
              </div>
              <div className="text-gray-200">{ev.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
