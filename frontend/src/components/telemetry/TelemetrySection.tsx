import type { MetricGroup } from "../../lib/telemetryGroups";
import type { Telemetry } from "../../types/kronos";
import { TelemetryRow } from "./TelemetryRow";

interface TelemetrySectionProps {
  group: MetricGroup;
  telemetry: Telemetry;
}

export function TelemetrySection({ group, telemetry }: TelemetrySectionProps) {
  return (
    <div>
      <div className="text-[10px] tracking-widest text-gray-600 mb-1 mt-2 first:mt-0">
        {group.label}
      </div>
      <div className="border-t border-gray-800 pt-1 space-y-0.5">
        {group.metrics.map((m) => (
          <TelemetryRow key={m.key} label={m.label} value={telemetry[m.key]} />
        ))}
      </div>
    </div>
  );
}
