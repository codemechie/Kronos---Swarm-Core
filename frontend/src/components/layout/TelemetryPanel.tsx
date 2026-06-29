import { useMemo, useState } from "react";
import { useKronos } from "../../hooks/useKronos";
import { TELEMETRY_GROUPS } from "../../lib/telemetryGroups";
import { TelemetrySection } from "../telemetry/TelemetrySection";

export function TelemetryPanel() {
  const { telemetry } = useKronos();
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));

  const hasData = useMemo(
    () => TELEMETRY_GROUPS.some((g) => g.metrics.some((m) => telemetry[m.key] !== undefined)),
    [telemetry],
  );

  if (!hasData) {
    return (
      <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
        <div className="text-xs tracking-widest text-gray-600 font-semibold mb-3">TELEMETRY</div>
        <div className="text-gray-500 text-sm">Awaiting telemetry stream...</div>
      </div>
    );
  }

  function toggleGroup(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  return (
    <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
      <div className="text-xs tracking-widest text-gray-600 font-semibold mb-3">TELEMETRY</div>
      {TELEMETRY_GROUPS.map((group, idx) => {
        const isOpen = expanded.has(idx);
        const hasMetrics = group.metrics.some((m) => telemetry[m.key] !== undefined);
        return (
          <div key={group.label} className="mb-1 last:mb-0">
            <button
              onClick={() => toggleGroup(idx)}
              className="w-full flex items-center justify-between text-left hover:text-gray-600 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
            >
              <span className="text-2xs tracking-widest text-gray-500">
                {isOpen ? "▼" : "▶"} {group.label}
              </span>
              {!hasMetrics && <span className="text-2xs text-gray-600">—</span>}
            </button>
            {isOpen && hasMetrics && (
              <div className="mt-1">
                <TelemetrySection group={group} telemetry={telemetry} />
              </div>
            )}
            {isOpen && !hasMetrics && (
              <div className="text-2xs text-gray-600 mt-1">No data</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
