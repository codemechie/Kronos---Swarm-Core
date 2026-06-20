import type { SwarmAgent, FractureContributor } from "../types/kronos";

const HIGH_RISK_WEIGHT = 10;
const NOMINAL_WEIGHT = 1;

export function calculateFractureAttribution(
  agents: SwarmAgent[],
): FractureContributor[] {
  if (agents.length === 0) return [];

  const weights = agents.map((a) => ({
    agentId: a.id,
    displayName: a.displayName,
    weight: a.riskLevel === "HIGH_RISK" ? HIGH_RISK_WEIGHT : NOMINAL_WEIGHT,
  }));

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  const raw = weights.map((w) => ({
    ...w,
    pct: (w.weight / totalWeight) * 100,
  }));

  const rounded = raw.map((r) => ({
    agentId: r.agentId,
    displayName: r.displayName,
    rounded: Math.round(r.pct),
    raw: r.pct,
  }));

  const sumRounded = rounded.reduce((s, r) => s + r.rounded, 0);
  const diff = 100 - sumRounded;

  if (diff !== 0 && rounded.length > 0) {
    const sorted = [...rounded].sort((a, b) => b.raw - a.raw);
    sorted[0] = {
      ...sorted[0],
      rounded: sorted[0].rounded + diff,
    };

    const lookup = new Map(sorted.map((r) => [r.agentId, r.rounded]));

    return rounded.map((r) => ({
      agentId: r.agentId,
      displayName: r.displayName,
      contributionPercent: lookup.get(r.agentId)!,
    }));
  }

  return rounded.map((r) => ({
    agentId: r.agentId,
    displayName: r.displayName,
    contributionPercent: r.rounded,
  }));
}
