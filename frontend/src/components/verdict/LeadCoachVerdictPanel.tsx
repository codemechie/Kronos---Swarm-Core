import { useMemo } from "react";
import { useKronos } from "../../hooks/useKronos";
import { normalizeSwarmAgents } from "../../lib/swarmNormalizer";
import { generateLeadCoachVerdict } from "../../lib/verdictEngine";

const statusColors: Record<string, string> = {
  STABLE: "text-green-400 border-green-700",
  WATCH: "text-yellow-400 border-yellow-700",
  CRITICAL: "text-red-400 border-red-700",
};

const statusBg: Record<string, string> = {
  STABLE: "bg-green-900/30",
  WATCH: "bg-yellow-900/30",
  CRITICAL: "bg-red-900/30",
};

const categoryColors: Record<string, string> = {
  AGENT: "border-blue-700 text-blue-400",
  FRACTURE: "border-purple-700 text-purple-400",
  CHAOS: "border-orange-700 text-orange-400",
  TELEMETRY: "border-cyan-700 text-cyan-400",
};

export function LeadCoachVerdictPanel() {
  const { debateOutputs, swarmMetrics, phase, telemetry, granite_review } = useKronos();

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

  if (agents.length === 0) {
    return (
      <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
        <div className="text-xs tracking-widest text-gray-500 mb-1">LEAD COACH VERDICT</div>
        <div className="text-[10px] tracking-widest text-gray-600 mb-3">FINAL DECISION LAYER</div>
        <div className="text-gray-500 text-sm">Awaiting swarm intelligence...</div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-700 rounded ${statusBg[verdict.status]} p-4 font-mono text-gray-100`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs tracking-widest text-gray-400">LEAD COACH VERDICT</span>
        <span className={`text-[10px] px-2 py-0.5 border rounded ${statusColors[verdict.status]}`}>
          [{verdict.status}]
        </span>
      </div>
      <div className="text-[10px] tracking-widest text-gray-600 mb-3">FINAL DECISION LAYER</div>

      <div className="text-sm font-semibold mb-1">{verdict.headline}</div>
      <div className="text-gray-400 text-xs mb-3">{verdict.rationale}</div>

      <div className="border-t border-gray-700 pt-2 text-xs">
        <span className="text-gray-500">Supporting Agents: </span>
        {verdict.supportingAgents.length === 0 ? (
          <span className="text-gray-600">None</span>
        ) : (
          <span className="text-gray-200">{verdict.supportingAgents.join(", ")}</span>
        )}
      </div>

      <div className="border-t border-gray-700 mt-2 pt-2">
        <div className="text-[10px] tracking-widest text-gray-500 mb-1.5">SUPPORTING SIGNALS</div>
        {verdict.supportingSignals.length === 0 ? (
          <div className="text-gray-600 text-xs">No supporting signals detected.</div>
        ) : (
          <div className="max-h-28 overflow-y-auto space-y-1">
            {verdict.supportingSignals.map((sig, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <span
                  className={`text-[9px] px-1 border rounded shrink-0 ${categoryColors[sig.category] ?? ""}`}
                >
                  [{sig.category}]
                </span>
                <span className="text-gray-300">{sig.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 mt-2 pt-2">
        <div className="text-[10px] tracking-widest text-gray-500 mb-1.5">GRANITE STATUS</div>
        {(() => {
          if (!granite_review || granite_review.skipped) {
            return (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-[10px] tracking-widest text-green-400">STANDBY</span>
                <span className="text-xs text-gray-500">No escalation required.</span>
              </div>
            );
          }
          if (
            granite_review.escalation_triggered &&
            granite_review.review_summary.toLowerCase().includes("unavailable")
          ) {
            return (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-[10px] tracking-widest text-red-400">UNAVAILABLE</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[10px] tracking-widest text-amber-400">VALIDATED BY GRANITE</span>
              <span className="text-xs text-gray-400">
                Granite Confidence: <span className="text-amber-300">{granite_review.granite_confidence}%</span>
              </span>
            </div>
          );
        })()}
      </div>

      <div className="flex gap-4 mt-2 pt-2 border-t border-gray-700 text-xs">
        <div>
          <span className="text-gray-500">Fracture: </span>
          <span className="text-white">{swarmMetrics.fracture_index}</span>
        </div>
        <div>
          <span className="text-gray-500">Chaos: </span>
          <span className="text-white">{swarmMetrics.chaos_probability}%</span>
        </div>
      </div>
    </div>
  );
}
