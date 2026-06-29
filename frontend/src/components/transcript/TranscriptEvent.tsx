import type { ReactNode } from "react";

export type EntryType = "AGENT" | "VALIDATION" | "GRANITE" | "COACH";
export type Severity = "INFO" | "WATCH" | "WARNING" | "CRITICAL";

interface TranscriptEventProps {
  type: EntryType;
  title: string;
  severity?: Severity;
  statusBadge?: string;
  subtitle?: string;
  children: ReactNode;
}

const typeBorders: Record<EntryType, string> = {
  AGENT: "border-l-blue-600",
  VALIDATION: "border-l-cyan-600",
  GRANITE: "border-l-amber-600",
  COACH: "border-l-emerald-600",
};

const typeColors: Record<EntryType, string> = {
  AGENT: "text-blue-600",
  VALIDATION: "text-cyan-600",
  GRANITE: "text-amber-600",
  COACH: "text-emerald-600",
};

const severityDots: Record<Severity, string> = {
  INFO: "bg-gray-400",
  WATCH: "bg-yellow-500",
  WARNING: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const severityColors: Record<Severity, string> = {
  INFO: "text-gray-500",
  WATCH: "text-yellow-600",
  WARNING: "text-orange-600",
  CRITICAL: "text-red-600",
};

const badgeColors: Record<string, string> = {
  NOMINAL: "text-green-600 border-green-200",
  "HIGH RISK": "text-red-600 border-red-200",
  WATCH: "text-yellow-600 border-yellow-200",
  ACTIVE: "text-amber-600 border-amber-200",
  STANDBY: "text-green-600 border-green-200",
  CRITICAL: "text-red-600 border-red-200",
};

export function TranscriptEvent({ type, title, severity, statusBadge, subtitle, children }: TranscriptEventProps) {
  return (
    <div className="relative">
      <div className={`absolute -left-[11px] top-2 w-2.5 h-2.5 rounded-full border-2 border-gray-50 ${severity ? severityDots[severity] : "bg-gray-400"}`} />

      <div className={`border border-gray-200 rounded-card bg-white p-3 border-l-4 ${typeBorders[type]}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-900">{title}</span>
          {statusBadge && (
            <span className={`text-2xs px-1.5 py-0.5 border rounded-button font-semibold ${badgeColors[statusBadge] ?? "text-gray-500 border-gray-300"}`}>
              {statusBadge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-2xs text-gray-500 mb-2">
          <span className={`font-semibold ${typeColors[type]}`}>[{type}]</span>
          {severity && (
            <span className={severityColors[severity]}>{severity}</span>
          )}
          {subtitle && (
            <span>· {subtitle}</span>
          )}
        </div>

        <div className="text-xs text-gray-600 leading-relaxed space-y-1.5">
          {children}
        </div>
      </div>
    </div>
  );
}
