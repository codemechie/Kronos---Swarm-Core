import { isHighSeverity, isWarningSeverity } from "../../lib/telemetryGroups";

interface TelemetryRowProps {
  label: string;
  value: number | undefined;
}

export function TelemetryRow({ label, value }: TelemetryRowProps) {
  const display = value !== undefined ? String(value) : "--";
  const isNum = value !== undefined;

  const colorClass =
    isNum && isHighSeverity(value)
      ? "text-red-600 font-semibold"
      : isNum && isWarningSeverity(value)
        ? "text-yellow-600 font-semibold"
        : "text-gray-900";

  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className={colorClass}>{display}</span>
    </div>
  );
}
