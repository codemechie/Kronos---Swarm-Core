import type { SwarmAgent } from "../../types/kronos";

interface AgentCardProps {
  agent: SwarmAgent;
}

const riskStyles: Record<string, string> = {
  NOMINAL: "border-green-700 text-green-400",
  HIGH_RISK: "border-red-700 text-red-400",
};

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="border border-gray-700 rounded px-3 py-2 text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-200 font-semibold">{agent.displayName}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 border rounded ${riskStyles[agent.riskLevel] ?? ""}`}
        >
          [{agent.riskLevel}]
        </span>
      </div>
      <div className="text-gray-400 text-xs leading-relaxed">{agent.verdict}</div>
    </div>
  );
}
