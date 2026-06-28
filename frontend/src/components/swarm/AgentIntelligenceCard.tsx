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
    <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{agent.displayName}</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-600">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {personalityLabel}
          </span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 border rounded ${
            agent.riskLevel === "HIGH_RISK"
              ? "text-red-400 border-red-700 bg-red-900/30"
              : "text-green-400 border-green-700 bg-green-900/30"
          }`}
        >
          [{agent.riskLevel}]
        </span>
      </div>

      <div className="space-y-1.5">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-xs leading-relaxed text-gray-200">{para}</p>
        ))}
      </div>

      <div className="flex gap-3 mt-3 text-[10px] text-gray-600/70">
        <span>
          Confidence:{" "}
          <span className={agent.riskLevel === "HIGH_RISK" ? "text-yellow-400/70" : "text-green-400/70"}>
            {agent.riskLevel === "HIGH_RISK" ? "Low" : "High"}
          </span>
        </span>
        <span>
          Risk:{" "}
          <span className={agent.riskLevel === "HIGH_RISK" ? "text-red-400/70" : "text-green-400/70"}>
            {agent.riskLevel === "HIGH_RISK" ? "ELEVATED" : "NOMINAL"}
          </span>
        </span>
      </div>
    </div>
  );
}
