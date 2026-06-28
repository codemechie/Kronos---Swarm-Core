import { useMemo } from "react";
import type { SwarmAgent } from "../../types/kronos";
import { calculateFractureAttribution } from "../../lib/fractureAttribution";

interface Props {
  agents: SwarmAgent[];
}

export function FractureAttribution({ agents }: Props) {
  const contributors = useMemo(() => calculateFractureAttribution(agents), [agents]);
  const primary = contributors[0];

  if (agents.length === 0 || !primary) {
    return (
      <div>
        <div className="text-xs tracking-widest text-gray-600 mb-1">
          FRACTURE ATTRIBUTION
        </div>
        <div className="text-[10px] text-gray-600 italic">
          Awaiting swarm attribution...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs tracking-widest text-gray-600 mb-2">
        FRACTURE ATTRIBUTION
      </div>

      <div className="bg-gray-850 border border-gray-700 rounded px-2 py-1.5 mb-2">
        <div className="text-[10px] text-gray-600">PRIMARY CONTRIBUTOR</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-200">{primary.displayName}</span>
          <span className="text-red-400 font-semibold">
            {primary.contributionPercent}%
          </span>
        </div>
        <div className="w-full h-1 bg-gray-700 rounded mt-1 overflow-hidden">
          <div
            className="h-full rounded bg-red-500"
            style={{ width: `${primary.contributionPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        {contributors.slice(1).map((c) => {
          const agent = agents.find((a) => a.id === c.agentId);
          const isHighRisk = agent?.riskLevel === "HIGH_RISK";
          return (
            <div key={c.agentId} className="text-xs">
              <div className="flex items-center justify-between text-gray-400">
                <span>{c.displayName}</span>
                <span className={isHighRisk ? "text-red-400" : "text-gray-500"}>
                  {c.contributionPercent}%
                </span>
              </div>
              <div className="w-full h-1 bg-gray-700 rounded mt-0.5 overflow-hidden">
                <div
                  className={`h-full rounded ${
                    isHighRisk ? "bg-red-500" : "bg-gray-500"
                  }`}
                  style={{ width: `${c.contributionPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
