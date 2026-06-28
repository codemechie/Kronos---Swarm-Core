import { useMemo } from "react";
import { useKronos } from "../hooks/useKronos";
import { normalizeSwarmAgents } from "../lib/swarmNormalizer";
import { calculateSwarmCohesion } from "../lib/swarmCohesion";
import { CommandHeader } from "../components/layout/CommandHeader";
import { AgentIntelligenceCard } from "../components/swarm/AgentIntelligenceCard";

const statusColors: Record<string, string> = {
  COHESIVE: "text-green-400",
  FRACTURED: "text-yellow-400",
  COLLAPSED: "text-red-400",
};

export function SwarmIntelligence() {
  const { debateOutputs, swarmMetrics, validation } = useKronos();

  const agents = useMemo(() => normalizeSwarmAgents(debateOutputs), [debateOutputs]);
  const cohesion = useMemo(() => calculateSwarmCohesion(agents), [agents]);

  const hasData = agents.length > 0;

  const nominalCount = agents.filter((a) => a.riskLevel === "NOMINAL").length;
  const highRiskCount = agents.filter((a) => a.riskLevel === "HIGH_RISK").length;

  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-4">
        <CommandHeader />

        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-xs tracking-widest text-gray-500 mb-1">SWARM INTELLIGENCE CENTER</div>
          <div className="text-[10px] tracking-widest text-gray-600 mb-4">
            Inspect individual agent reasoning, confidence, and risk assessments.
          </div>

          {!hasData ? (
            <div className="text-gray-500 text-sm">Awaiting swarm intelligence...</div>
          ) : (
            <>
              <div className="border border-gray-700 rounded bg-gray-950 p-3 mb-4">
                <div className="text-[9px] tracking-widest text-gray-600 mb-2">SWARM OVERVIEW</div>

                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs">
                    <span className="text-gray-600">Status: </span>
                    <span className={`text-sm font-semibold ${statusColors[cohesion.status] ?? "text-white"}`}>
                      {cohesion.status}
                    </span>
                    <span className="text-gray-500 ml-2 text-[10px]">
                      {cohesion.consensusPercent}% consensus
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600">
                    {agents.length} agent{agents.length !== 1 ? "s" : ""}
                    <span className="text-green-400 ml-1">{nominalCount} nominal</span>
                    {highRiskCount > 0 && (
                      <span className="text-red-400 ml-1">{highRiskCount} high-risk</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[9px] tracking-widest text-gray-600">FRACTURE</div>
                    <div className="text-base font-bold text-white">{swarmMetrics.fracture_index}</div>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-widest text-gray-600">CHAOS</div>
                    <div className="text-base font-bold text-white">{swarmMetrics.chaos_probability}%</div>
                  </div>
                  <div>
                    <div className="text-[9px] tracking-widest text-gray-600">CONFIDENCE</div>
                    <div className="text-base font-bold text-white">
                      {validation && !validation.skipped
                        ? `${Math.round(validation.overall_confidence * 100)}%`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((agent) => (
                  <AgentIntelligenceCard key={agent.id} agent={agent} />
                ))}
              </div>

              <div className="border-t border-gray-700 pt-3 mt-4">
                <div className="text-[9px] tracking-widest text-gray-600 mb-1.5">SWARM CONSENSUS</div>
                {highRiskCount === 0 ? (
                  <div className="text-xs text-gray-300">
                    All agents agree on nominal conditions. No anomalies detected across the swarm.
                  </div>
                ) : (
                  <div className="text-xs text-gray-300">
                    {highRiskCount} of {agents.length} agents report elevated risk conditions.
                    Fracture probability remains active.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
