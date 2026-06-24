import type { SwarmAgent } from "../../types/kronos";

interface AgentIntelligenceCardProps {
  agent: SwarmAgent;
}

const agentAccents: Record<string, string> = {
  pragmatist: "border-l-blue-600",
  mood_ring: "border-l-pink-600",
  gambler: "border-l-amber-600",
  judge: "border-l-purple-600",
  anarchist: "border-l-red-600",
};

const riskColors: Record<string, string> = {
  NOMINAL: "text-green-400 border-green-700 bg-green-900/30",
  HIGH_RISK: "text-red-400 border-red-700 bg-red-900/30",
};

const providerColors: Record<string, string> = {
  mock: "text-gray-500",
  bob: "text-cyan-400",
  granite: "text-amber-400",
};

export function AgentIntelligenceCard({ agent }: AgentIntelligenceCardProps) {
  const accent = agentAccents[agent.id] ?? "border-l-gray-600";
  const verdictLines = agent.verdict.split("\n").filter(Boolean);
  const provider = verdictLines[0]?.includes(":")
    ? verdictLines[0].slice(1, verdictLines[0].indexOf("]")).toLowerCase()
    : "mock";
  const confidence = agent.riskLevel === "HIGH_RISK" ? "Low" : "High";

  return (
    <div
      className={`border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100 border-l-4 ${accent}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-white">{agent.displayName}</span>
        <span
          className={`text-[10px] px-2 py-0.5 border rounded ${riskColors[agent.riskLevel] ?? ""}`}
        >
          [{agent.riskLevel}]
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="border border-gray-700 rounded bg-gray-950 p-2">
          <div className="text-[9px] tracking-widest text-gray-500 mb-0.5">CONFIDENCE</div>
          <div className={`font-semibold ${confidence === "High" ? "text-green-400" : "text-yellow-400"}`}>
            {confidence}
          </div>
        </div>
        <div className="border border-gray-700 rounded bg-gray-950 p-2">
          <div className="text-[9px] tracking-widest text-gray-500 mb-0.5">PROVIDER</div>
          <div className={`font-semibold ${providerColors[provider] ?? "text-gray-300"}`}>
            {provider.toUpperCase()}
          </div>
        </div>
        <div className="border border-gray-700 rounded bg-gray-950 p-2">
          <div className="text-[9px] tracking-widest text-gray-500 mb-0.5">RISK</div>
          <div className={`font-semibold ${agent.riskLevel === "HIGH_RISK" ? "text-red-400" : "text-green-400"}`}>
            {agent.riskLevel === "HIGH_RISK" ? "ELEVATED" : "NOMINAL"}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-2">
        <div className="text-[9px] tracking-widest text-gray-500 mb-1">RATIONALE</div>
        <div className="text-xs text-gray-300 leading-relaxed">
          {agent.verdict}
        </div>
      </div>
    </div>
  );
}
