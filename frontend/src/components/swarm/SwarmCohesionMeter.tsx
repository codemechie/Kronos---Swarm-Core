import { useMemo } from "react";
import type { SwarmAgent } from "../../types/kronos";
import { calculateSwarmCohesion } from "../../lib/swarmCohesion";

interface Props {
  agents: SwarmAgent[];
}

const statusColor: Record<string, string> = {
  COHESIVE: "bg-green-500",
  FRACTURED: "bg-yellow-500",
  COLLAPSED: "bg-red-500",
};

const statusTextColor: Record<string, string> = {
  COHESIVE: "text-green-600",
  FRACTURED: "text-yellow-600",
  COLLAPSED: "text-red-600",
};

export function SwarmCohesionMeter({ agents }: Props) {
  const cohesion = useMemo(() => calculateSwarmCohesion(agents), [agents]);

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>SWARM COHESION</span>
        <span className="text-gray-900 font-semibold">{cohesion.consensusPercent}%</span>
      </div>

      <div className="w-full h-1.5 bg-gray-200 rounded mt-1 overflow-hidden">
        <div
          className={`h-full rounded transition-all duration-500 ${statusColor[cohesion.status]}`}
          style={{ width: `${cohesion.consensusPercent}%` }}
        />
      </div>

      <div className={`text-2xs mt-1 ${statusTextColor[cohesion.status]}`}>
        {cohesion.status}
      </div>
    </div>
  );
}
