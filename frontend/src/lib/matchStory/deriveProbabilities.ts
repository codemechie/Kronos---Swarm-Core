import type { MatchProbabilities } from "../../types/kronos";

type PredictionCategory =
  | "HOME_WIN"
  | "AWAY_WIN"
  | "DRAW"
  | "HIGH_RISK"
  | "LOW_RISK"
  | "UNKNOWN";

function classifyVerdict(text: string): PredictionCategory {
  const lower = text.toLowerCase();
  if (/away/.test(lower) && /(win|goal|score)/.test(lower)) return "AWAY_WIN";
  if (/home/.test(lower) && /(win|goal|score)/.test(lower)) return "HOME_WIN";
  if (/draw/.test(lower)) return "DRAW";
  if (/high.*risk/.test(lower)) return "HIGH_RISK";
  if (/low.*risk/.test(lower)) return "LOW_RISK";
  if (/risk/.test(lower)) return "HIGH_RISK";
  return "UNKNOWN";
}

export function deriveProbabilities(
  debateOutputs: Record<string, string>,
  overallConfidence: number,
): MatchProbabilities {
  const distribution: Record<string, number> = {};
  for (const text of Object.values(debateOutputs)) {
    const cat = classifyVerdict(text);
    distribution[cat] = (distribution[cat] ?? 0) + 1;
  }

  const total = Object.values(distribution).reduce((s, v) => s + v, 0) || 1;

  const homeWin = ((distribution.HOME_WIN ?? 0) / total) * 100;
  const awayWin = ((distribution.AWAY_WIN ?? 0) / total) * 100;
  const draw = ((distribution.DRAW ?? 0) / total) * 100;

  const uncertainty = 1 - Math.max(0, Math.min(1, overallConfidence));
  const damping = 1 - uncertainty * 0.3;

  const dampedHome = Math.round(homeWin * damping);
  const dampedAway = Math.round(awayWin * damping);
  const remaining = 100 - dampedHome - dampedAway;
  const dampedDraw = Math.max(Math.round(draw * (1 - uncertainty * 0.15)), remaining);

  const totalDamped = dampedHome + dampedAway + dampedDraw;
  const diff = 100 - totalDamped;

  return {
    homeWin: clampRound(dampedHome + (diff > 0 ? diff : 0), 0, 100),
    draw: clampRound(diff > 0 ? dampedDraw : dampedDraw + diff, 0, 100),
    awayWin: clampRound(dampedAway, 0, 100),
  };
}

function clampRound(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
