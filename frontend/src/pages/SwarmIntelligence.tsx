import { useMemo } from "react";
import { useKronos } from "../hooks/useKronos";
import { normalizeSwarmAgents } from "../lib/swarmNormalizer";
import { calculateSwarmCohesion } from "../lib/swarmCohesion";
import { CommandHeader } from "../components/layout/CommandHeader";
import { AgentIntelligenceCard } from "../components/swarm/AgentIntelligenceCard";

const statusColors: Record<string, string> = {
  COHESIVE: "text-green-600",
  FRACTURED: "text-yellow-600",
  COLLAPSED: "text-red-600",
};

export function SwarmIntelligence() {
  const { debateOutputs, swarmMetrics, validation } = useKronos();

  const agents = useMemo(() => normalizeSwarmAgents(debateOutputs), [debateOutputs]);
  const cohesion = useMemo(() => calculateSwarmCohesion(agents), [agents]);

  const hasData = agents.length > 0;

  const nominalCount = agents.filter((a) => a.riskLevel === "NOMINAL").length;
  const highRiskCount = agents.filter((a) => a.riskLevel === "HIGH_RISK").length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">
        <CommandHeader />

        <div className="rounded-card bg-gradient-to-b from-blue-100/80 to-white p-6">
          <div className="text-xs tracking-widest text-green-600 font-semibold mb-1">SWARM INTELLIGENCE CENTER</div>
          <div className="text-2xs tracking-widest text-gray-600 mb-6">
            Inspect individual agent reasoning, confidence, and risk assessments.
          </div>

          {!hasData ? (
            <div className="text-gray-500 text-sm">Awaiting swarm intelligence...</div>
          ) : (
            <>
              <div className="border border-gray-200 rounded-card bg-white p-4 mb-6">
                <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-4">SWARM OVERVIEW</div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs">
                    <span className="text-gray-600">Status: </span>
                    <span className={`text-sm font-semibold ${statusColors[cohesion.status] ?? "text-gray-900"}`}>
                      {cohesion.status}
                    </span>
                    <span className="text-gray-500 ml-2 text-2xs">
                      {cohesion.consensusPercent}% consensus
                    </span>
                  </div>
                  <div className="text-2xs text-gray-600">
                    {agents.length} agent{agents.length !== 1 ? "s" : ""}
                    <span className="text-green-600 ml-2">{nominalCount} nominal</span>
                    {highRiskCount > 0 && (
                      <span className="text-red-600 ml-2">{highRiskCount} high-risk</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
                    <div className="text-2xs tracking-widest text-gray-500 mb-1">FRACTURE</div>
                    <div className="text-lg font-bold text-gray-900">{swarmMetrics.fracture_index}</div>
                  </div>
                  <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
                    <div className="text-2xs tracking-widest text-gray-500 mb-1">CHAOS</div>
                    <div className="text-lg font-bold text-gray-900">{swarmMetrics.chaos_probability}%</div>
                  </div>
                  <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
                    <div className="text-2xs tracking-widest text-gray-500 mb-1">CONFIDENCE</div>
                    <div className="text-lg font-bold text-gray-900">
                      {validation && !validation.skipped
                        ? `${Math.round(validation.overall_confidence * 100)}%`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-2xs tracking-widest text-green-600 font-semibold mb-4">AGENT ANALYSIS</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((agent) => (
                  <AgentIntelligenceCard key={agent.id} agent={agent} />
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="text-2xs tracking-widest text-green-600 font-semibold mb-2">SWARM CONSENSUS</div>
                <div className="border border-emerald-200 rounded-card bg-emerald-50 p-4">
                  {highRiskCount === 0 ? (
                    <div className="text-xs text-gray-600 leading-relaxed">
                      All agents agree on nominal conditions. No anomalies detected across the swarm.
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {highRiskCount} of {agents.length} agents report elevated risk conditions.
                      Fracture probability remains active.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
