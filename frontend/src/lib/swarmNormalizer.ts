import type { SwarmAgent, RiskLevel } from "../types/kronos";

const AGENT_NAMES: Record<string, string> = {
  pragmatist: "Market Pragmatist",
  mood_ring: "Mood Ring",
  gambler: "Gambler",
  judge: "Judge",
  anarchist: "Anarchist",
};

function detectRiskLevel(verdict: string): RiskLevel {
  return /high-risk/i.test(verdict) ? "HIGH_RISK" : "NOMINAL";
}

export function normalizeSwarmAgents(
  debateOutputs: Record<string, string>,
): SwarmAgent[] {
  return Object.entries(debateOutputs).map(([key, verdict]) => ({
    id: key,
    displayName: AGENT_NAMES[key] ?? key,
    verdict,
    riskLevel: detectRiskLevel(verdict),
  }));
}
