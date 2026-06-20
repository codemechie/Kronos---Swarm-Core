import type { SwarmAgent } from "../types/kronos";

export type CohesionStatus = "COHESIVE" | "FRACTURED" | "COLLAPSED";

export interface SwarmCohesion {
  consensusPercent: number;
  disagreementPercent: number;
  status: CohesionStatus;
}

export function calculateSwarmCohesion(agents: SwarmAgent[]): SwarmCohesion {
  if (agents.length === 0) {
    return { consensusPercent: 0, disagreementPercent: 0, status: "COLLAPSED" };
  }

  const highRiskCount = agents.filter((a) => a.riskLevel === "HIGH_RISK").length;
  const consensusPercent = Math.max(0, 100 - highRiskCount * 20);
  const disagreementPercent = 100 - consensusPercent;

  let status: CohesionStatus;
  if (consensusPercent >= 80) {
    status = "COHESIVE";
  } else if (consensusPercent >= 40) {
    status = "FRACTURED";
  } else {
    status = "COLLAPSED";
  }

  return { consensusPercent, disagreementPercent, status };
}
