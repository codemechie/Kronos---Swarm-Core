import type { SwarmAgent } from "../../types/kronos";

interface AgentCardProps {
  agent: SwarmAgent;
}

const riskStyles: Record<string, string> = {
  NOMINAL: "border-green-200 text-green-600",
  HIGH_RISK: "border-red-200 text-red-600",
};

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="border border-gray-200 rounded-card px-3 py-2 text-sm bg-gray-50">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-900 font-semibold">{agent.displayName}</span>
        <span
          className={`text-2xs px-1.5 py-0.5 border rounded-button font-semibold ${riskStyles[agent.riskLevel] ?? ""}`}
        >
          [{agent.riskLevel}]
        </span>
      </div>
      <div className="text-gray-600 text-xs leading-relaxed">{agent.verdict}</div>
    </div>
  );
}
