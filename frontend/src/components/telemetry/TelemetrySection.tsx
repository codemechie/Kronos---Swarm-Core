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
      <div className="text-[9px] tracking-widest text-gray-600 mb-1 mt-2 first:mt-0">
        {group.label}
      </div>
      <div className="space-y-px">
        {group.metrics.map((m) => (
          <TelemetryRow key={m.key} label={m.label} value={telemetry[m.key]} />
        ))}
      </div>
    </div>
  );
}
