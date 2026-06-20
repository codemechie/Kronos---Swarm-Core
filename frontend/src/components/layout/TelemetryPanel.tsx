import { useMemo } from "react";
import { useKronos } from "../../hooks/useKronos";
import { TELEMETRY_GROUPS } from "../../lib/telemetryGroups";
import { TelemetrySection } from "../telemetry/TelemetrySection";

export function TelemetryPanel() {
  const { telemetry } = useKronos();

  const hasData = useMemo(
    () => TELEMETRY_GROUPS.some((g) => g.metrics.some((m) => telemetry[m.key] !== undefined)),
    [telemetry],
  );

  if (!hasData) {
    return (
      <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
        <div className="text-xs tracking-widest text-gray-500 mb-3">TELEMETRY</div>
        <div className="text-gray-500 text-sm">Awaiting telemetry stream...</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
      <div className="text-xs tracking-widest text-gray-500 mb-3">TELEMETRY</div>
      {TELEMETRY_GROUPS.map((group) => (
        <TelemetrySection key={group.label} group={group} telemetry={telemetry} />
      ))}
    </div>
  );
}
