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

const severityDots: Record<Severity, string> = {
  INFO: "bg-gray-500",
  WATCH: "bg-yellow-500",
  WARNING: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const severityColors: Record<Severity, string> = {
  INFO: "text-gray-500",
  WATCH: "text-yellow-400",
  WARNING: "text-orange-400",
  CRITICAL: "text-red-400",
};

const badgeColors: Record<string, string> = {
  NOMINAL: "text-green-400 border-green-700",
  "HIGH RISK": "text-red-400 border-red-700",
  WATCH: "text-yellow-400 border-yellow-700",
  ACTIVE: "text-amber-400 border-amber-700",
  STANDBY: "text-green-400 border-green-700",
  CRITICAL: "text-red-400 border-red-700",
};

export function TranscriptEvent({ type, title, severity, statusBadge, subtitle, children }: TranscriptEventProps) {
  return (
    <div className="relative">
      <div className={`absolute -left-[11px] top-2 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${severity ? severityDots[severity] : "bg-gray-600"}`} />

      <div className={`border border-gray-700 rounded bg-gray-900 p-3 border-l-4 ${typeBorders[type]}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-200">{title}</span>
          {statusBadge && (
            <span className={`text-[9px] px-1.5 py-0.5 border rounded ${badgeColors[statusBadge] ?? "text-gray-500 border-gray-600"}`}>
              {statusBadge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[9px] text-gray-600 mb-2">
          <span>[{type}]</span>
          {severity && (
            <span className={severityColors[severity]}>{severity}</span>
          )}
          {subtitle && (
            <span>· {subtitle}</span>
          )}
        </div>

        <div className="text-xs text-gray-200 leading-relaxed space-y-1.5">
          {children}
        </div>
      </div>
    </div>
  );
}
