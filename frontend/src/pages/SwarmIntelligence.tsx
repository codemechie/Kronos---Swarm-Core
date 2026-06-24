import { useMemo } from "react";
import { useKronos } from "../hooks/useKronos";
import { normalizeSwarmAgents } from "../lib/swarmNormalizer";
import { calculateSwarmCohesion } from "../lib/swarmCohesion";
import { CommandHeader } from "../components/layout/CommandHeader";
import { AgentIntelligenceCard } from "../components/swarm/AgentIntelligenceCard";

const statusColors: Record<string, string> = {
  COHESIVE: "text-green-400 border-green-700 bg-green-900/30",
  FRACTURED: "text-yellow-400 border-yellow-700 bg-yellow-900/30",
  COLLAPSED: "text-red-400 border-red-700 bg-red-900/30",
};

export function SwarmIntelligence() {
  const { debateOutputs, swarmMetrics } = useKronos();

  const agents = useMemo(() => normalizeSwarmAgents(debateOutputs), [debateOutputs]);
  const cohesion = useMemo(() => calculateSwarmCohesion(agents), [agents]);

  const hasData = agents.length > 0;

  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-4">
        <CommandHeader />

        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-xs tracking-widest text-gray-400 mb-1">SWARM INTELLIGENCE CENTER</div>
          <div className="text-[10px] tracking-widest text-gray-600 mb-4">
            Inspect individual agent reasoning, confidence, risk, and supporting signals.
          </div>

          {!hasData ? (
            <div className="text-gray-500 text-sm">Awaiting swarm intelligence...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                <div className="border border-gray-700 rounded bg-gray-950 p-3">
                  <div className="text-[9px] tracking-widest text-gray-500 mb-0.5">SWARM COHESION</div>
                  <div className={`text-base font-bold ${statusColors[cohesion.status]?.split(" ")[0] ?? "text-white"}`}>
                    {cohesion.status}
                  </div>
                  <div className="text-gray-400 text-[10px]">{cohesion.consensusPercent}% consensus</div>
                </div>
                <div className="border border-gray-700 rounded bg-gray-950 p-3">
                  <div className="text-[9px] tracking-widest text-gray-500 mb-0.5">FRACTURE INDEX</div>
                  <div className="text-base font-bold text-white">{swarmMetrics.fracture_index}</div>
                </div>
                <div className="border border-gray-700 rounded bg-gray-950 p-3">
                  <div className="text-[9px] tracking-widest text-gray-500 mb-0.5">CHAOS PROBABILITY</div>
                  <div className="text-base font-bold text-white">{swarmMetrics.chaos_probability}%</div>
                </div>
                <div className="border border-gray-700 rounded bg-gray-950 p-3">
                  <div className="text-[9px] tracking-widest text-gray-500 mb-0.5">ACTIVE AGENTS</div>
                  <div className="text-base font-bold text-white">{agents.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((agent) => (
                  <AgentIntelligenceCard key={agent.id} agent={agent} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
