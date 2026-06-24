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

const typeTags: Record<EntryType, string> = {
  AGENT: "text-blue-400 border-blue-700",
  VALIDATION: "text-cyan-400 border-cyan-700",
  GRANITE: "text-amber-400 border-amber-700",
  COACH: "text-emerald-400 border-emerald-700",
};

const severityDots: Record<Severity, string> = {
  INFO: "bg-gray-500",
  WATCH: "bg-yellow-500",
  WARNING: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const severityLabels: Record<Severity, string> = {
  INFO: "text-gray-500 border-gray-600",
  WATCH: "text-yellow-400 border-yellow-700",
  WARNING: "text-orange-400 border-orange-700",
  CRITICAL: "text-red-400 border-red-700",
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
      <div className={`absolute -left-5 top-2 w-3 h-3 rounded-full border-2 border-gray-900 ${severity ? severityDots[severity] : "bg-gray-600"}`} />

      <div className={`border border-gray-700 rounded bg-gray-900 p-3 border-l-4 ${typeBorders[type]}`}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-[9px] px-1 py-0.5 border rounded ${typeTags[type]}`}>
            [{type}]
          </span>
          <span className="text-xs font-bold text-gray-200">{title}</span>
          {severity && (
            <span className={`text-[9px] px-1.5 py-0.5 border rounded ${severityLabels[severity]}`}>
              {severity}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {statusBadge && (
              <span className={`text-[9px] px-1.5 py-0.5 border rounded ${badgeColors[statusBadge] ?? "text-gray-500 border-gray-600"}`}>
                {statusBadge}
              </span>
            )}
            {subtitle && (
              <span className="text-[9px] text-gray-500">{subtitle}</span>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-300 space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
}
