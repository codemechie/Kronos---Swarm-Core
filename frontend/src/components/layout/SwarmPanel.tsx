import { useMemo } from "react";
import { useKronos } from "../../hooks/useKronos";
import { normalizeSwarmAgents } from "../../lib/swarmNormalizer";
import { AgentCard } from "../swarm/AgentCard";
import { SwarmCohesionMeter } from "../swarm/SwarmCohesionMeter";
import { FractureAttribution } from "../swarm/FractureAttribution";

export function SwarmPanel() {
  const { swarmMetrics, debateOutputs } = useKronos();

  const agents = useMemo(() => normalizeSwarmAgents(debateOutputs), [debateOutputs]);

  const nominalCount = agents.filter((a) => a.riskLevel === "NOMINAL").length;
  const highRiskCount = agents.filter((a) => a.riskLevel === "HIGH_RISK").length;
  const hasFracture = highRiskCount > 0;

  return (
    <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100 flex flex-col gap-3">
      <div className="text-xs tracking-widest text-gray-600">ADVERSARIAL SWARM</div>

      <div className="text-sm space-y-1">
        <div>
          <span className="text-gray-600">Fracture: </span>
          <span className="text-white">{swarmMetrics.fracture_index}</span>
        </div>
        <div>
          <span className="text-gray-600">Chaos: </span>
          <span className="text-white">{swarmMetrics.chaos_probability}%</span>
        </div>
      </div>

      <SwarmCohesionMeter agents={agents} />

      <FractureAttribution agents={agents} />

      <div className="text-sm space-y-1">
        <div>
          <span className="text-gray-600">Agents: </span>
          <span className="text-white">{agents.length}</span>
        </div>
        <div>
          <span className="text-gray-600">Nominal: </span>
          <span className="text-green-400">{nominalCount}</span>
        </div>
        <div>
          <span className="text-gray-600">High Risk: </span>
          <span className="text-red-400">{highRiskCount}</span>
        </div>
      </div>

      <div
        className={`text-sm font-semibold ${
          hasFracture ? "text-yellow-400" : "text-green-400"
        }`}
      >
        {hasFracture ? "SWARM FRACTURE ACTIVE" : "SWARM CONSENSUS"}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
