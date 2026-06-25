import type {
  KronosState,
  MatchStorySnapshot,
} from "../../types/kronos";
import { normalizeSwarmAgents } from "../swarmNormalizer";
import { deriveProbabilities } from "./deriveProbabilities";
import { deriveTeamIntelligence } from "./deriveTeamIntelligence";
import { generateCommentary } from "./generateCommentary";

export function buildMatchStorySnapshot(state: KronosState): MatchStorySnapshot {
  const { telemetry, swarmMetrics, debateOutputs, validation } = state;

  const minute = telemetry.minute;
  const score = {
    home: telemetry.score_home ?? 0,
    away: telemetry.score_away ?? 0,
  };

  const probabilities = deriveProbabilities(
    debateOutputs,
    validation.overall_confidence,
  );

  const teamIntelligence = deriveTeamIntelligence(telemetry);

  const agents = normalizeSwarmAgents(debateOutputs);
  const commentaryEntries = generateCommentary({
    agents,
    phase: state.phase,
    fractureIndex: swarmMetrics.fracture_index,
    telemetry,
    minute,
  });

  return {
    minute,
    score,
    probabilities,
    teamIntelligence,
    commentaryEntries,
  };
}
