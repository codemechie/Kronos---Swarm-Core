import type { SwarmAgent } from "../../types/kronos";

interface AgentIntelligenceCardProps {
  agent: SwarmAgent;
}

const agentPersonalityLabels: Record<string, string> = {
  pragmatist: "Pragmatist",
  mood_ring: "Mood Ring",
  gambler: "Gambler",
  judge: "Judge",
  anarchist: "Anarchist",
};

const agentDotColors: Record<string, string> = {
  pragmatist: "bg-blue-500",
  mood_ring: "bg-pink-500",
  gambler: "bg-amber-500",
  judge: "bg-purple-500",
  anarchist: "bg-red-500",
};

export function AgentIntelligenceCard({ agent }: AgentIntelligenceCardProps) {
  const personalityLabel = agentPersonalityLabels[agent.id] ?? agent.id;
  const dotColor = agentDotColors[agent.id] ?? "bg-gray-500";

  const paragraphs = agent.verdict.split("\n").filter(Boolean);

  return (
    <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{agent.displayName}</span>
          <span className="flex items-center gap-1 text-2xs text-gray-500">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {personalityLabel}
          </span>
        </div>
        <span
          className={`text-2xs px-2 py-0.5 border rounded-button ${
            agent.riskLevel === "HIGH_RISK"
              ? "text-red-600 border-red-200 bg-red-50"
              : "text-green-600 border-green-200 bg-green-50"
          }`}
        >
          [{agent.riskLevel}]
        </span>
      </div>

      <div className="space-y-1.5">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-xs leading-relaxed text-gray-600">{para}</p>
        ))}
      </div>

      <div className="flex gap-3 mt-3 text-2xs text-gray-400">
        <span>
          Confidence:{" "}
          <span className={agent.riskLevel === "HIGH_RISK" ? "text-yellow-600" : "text-green-600"}>
            {agent.riskLevel === "HIGH_RISK" ? "Low" : "High"}
          </span>
        </span>
        <span>
          Risk:{" "}
          <span className={agent.riskLevel === "HIGH_RISK" ? "text-red-600" : "text-green-600"}>
            {agent.riskLevel === "HIGH_RISK" ? "ELEVATED" : "NOMINAL"}
          </span>
        </span>
      </div>
    </div>
  );
}
