import { useMemo, useState } from "react";
import { useKronos } from "../../hooks/useKronos";
import { normalizeSwarmAgents } from "../../lib/swarmNormalizer";
import { generateLeadCoachVerdict } from "../../lib/verdictEngine";

const statusColors: Record<string, string> = {
  STABLE: "text-green-600 border-green-300",
  WATCH: "text-yellow-600 border-yellow-300",
  CRITICAL: "text-red-600 border-red-300",
};

const statusBg: Record<string, string> = {
  STABLE: "bg-green-50",
  WATCH: "bg-yellow-50",
  CRITICAL: "bg-red-50",
};

const categoryColors: Record<string, string> = {
  AGENT: "border-blue-300 text-blue-600",
  FRACTURE: "border-purple-300 text-purple-600",
  CHAOS: "border-orange-300 text-orange-600",
  TELEMETRY: "border-cyan-300 text-cyan-600",
};

export function LeadCoachVerdictPanel() {
  const { debateOutputs, swarmMetrics, phase, telemetry, granite_review } = useKronos();
  const [expanded, setExpanded] = useState(false);

  const agents = useMemo(() => normalizeSwarmAgents(debateOutputs), [debateOutputs]);

  const verdict = useMemo(
    () =>
      generateLeadCoachVerdict({
        agents,
        fractureIndex: swarmMetrics.fracture_index,
        chaosProbability: swarmMetrics.chaos_probability,
        phase,
        telemetry,
      }),
    [agents, swarmMetrics.fracture_index, swarmMetrics.chaos_probability, phase, telemetry],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (agents.length === 0) {
    return (
      <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
        <div className="text-xs tracking-widest text-gray-600 font-semibold mb-1">LEAD COACH VERDICT</div>
        <div className="text-2xs tracking-widest text-gray-500 mb-3">FINAL DECISION LAYER</div>
        <div className="text-gray-500 text-sm">Awaiting swarm intelligence...</div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 rounded-card ${statusBg[verdict.status]} p-4 font-mono text-gray-900`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs tracking-widest text-gray-500 font-semibold">LEAD COACH VERDICT</span>
        <span className={`text-2xs px-2 py-0.5 border rounded-button font-semibold ${statusColors[verdict.status]}`}>
          [{verdict.status}]
        </span>
      </div>

      <div className="text-sm font-semibold mb-1">{verdict.headline}</div>
      <div className="text-gray-500 text-xs">{verdict.rationale}</div>

      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-2xs tracking-widest text-gray-500 hover:text-gray-600 hover:border-gray-500 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
        >
          ▼ EXPAND DETAILS
        </button>
      )}

      {expanded && (
        <>
          <div className="mt-3 text-xs">
            <span className="text-gray-600">Supporting Agents: </span>
            {verdict.supportingAgents.length === 0 ? (
              <span className="text-gray-600">None</span>
            ) : (
              <span className="text-gray-700">{verdict.supportingAgents.join(", ")}</span>
            )}
          </div>

          <div className="mt-2">
            <div className="text-2xs tracking-widest text-gray-500 mb-1.5">SUPPORTING SIGNALS</div>
            {verdict.supportingSignals.length === 0 ? (
              <div className="text-gray-600 text-xs">No supporting signals detected.</div>
            ) : (
              <div className="max-h-28 overflow-y-auto space-y-1">
                {verdict.supportingSignals.map((sig, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    <span
                      className={`text-2xs px-2 py-0.5 border rounded-button shrink-0 font-semibold ${categoryColors[sig.category] ?? ""}`}
                    >
                      [{sig.category}]
                    </span>
                    <span className="text-gray-600">{sig.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2">
            <div className="text-2xs tracking-widest text-gray-500 mb-1.5">GRANITE STATUS</div>
            {(() => {
              if (!granite_review || granite_review.skipped) {
                return (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-2xs tracking-widest text-green-600">STANDBY</span>
                    <span className="text-xs text-gray-600">No escalation required.</span>
                  </div>
                );
              }
              if (
                granite_review.escalation_triggered &&
                granite_review.review_summary.toLowerCase().includes("unavailable")
              ) {
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                      <span className="text-2xs tracking-widest text-yellow-600">DEGRADED</span>
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                      Granite review currently unavailable.
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                      System operating in graceful-degradation mode using heuristic validation.
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                      Decision pipeline remains operational.
                    </div>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-2xs tracking-widest text-amber-600">VALIDATED BY GRANITE</span>
                  <span className="text-xs text-gray-500">
                    Granite Confidence: <span className="text-amber-600">{granite_review.granite_confidence}%</span>
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="flex gap-4 mt-2 text-xs">
            <div>
              <span className="text-gray-600">Fracture: </span>
              <span className="text-gray-900">{swarmMetrics.fracture_index}</span>
            </div>
            <div>
              <span className="text-gray-600">Chaos: </span>
              <span className="text-gray-900">{swarmMetrics.chaos_probability}%</span>
            </div>
          </div>

          <button
            onClick={() => setExpanded(false)}
className="mt-2 text-2xs tracking-widest text-gray-500 hover:text-gray-600 hover:border-gray-500 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400"
          >
            ▲ COLLAPSE
          </button>
        </>
      )}
    </div>
  );
}
