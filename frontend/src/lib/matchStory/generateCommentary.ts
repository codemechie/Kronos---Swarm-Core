import type {
  CommentaryEntry,
  MatchPhase,
  SwarmAgent,
  Telemetry,
} from "../../types/kronos";

interface CommentaryInput {
  agents: SwarmAgent[];
  phase: MatchPhase;
  fractureIndex: number;
  telemetry: Telemetry;
  minute: number;
}

export function generateCommentary(input: CommentaryInput): CommentaryEntry[] {
  const entries: CommentaryEntry[] = [];
  const { agents, phase, fractureIndex, telemetry, minute } = input;

  const highRiskAgents = agents.filter((a) => a.riskLevel === "HIGH_RISK");
  if (highRiskAgents.length > 0) {
    const names = highRiskAgents.map((a) => a.displayName).join(", ");
    entries.push({
      minute,
      text: `${names} ${highRiskAgents.length === 1 ? "flags" : "flag"} elevated risk conditions.`,
      source: "swarm_synthesis",
    });
  }

  if (fractureIndex >= 80) {
    entries.push({
      minute,
      text: "Swarm consensus has collapsed — agents are in substantial disagreement.",
      source: "swarm_synthesis",
    });
  } else if (fractureIndex >= 60) {
    entries.push({
      minute,
      text: "Critical fracture detected in swarm analysis — confidence is splitting.",
      source: "swarm_synthesis",
    });
  } else if (fractureIndex >= 40) {
    entries.push({
      minute,
      text: "Swarm disagreement is rising — divergence in agent assessments.",
      source: "swarm_synthesis",
    });
  }

  const telText = generateTelemetryCommentary(telemetry);
  if (telText) {
    entries.push({ minute, text: telText, source: "telemetry" });
  }

  const phaseText = generatePhaseCommentary(phase, minute);
  if (phaseText) {
    entries.push({ minute, text: phaseText, source: "phase" });
  }

  if (entries.length === 0) {
    entries.push({
      minute,
      text: "All agents report nominal conditions. Match state stable.",
      source: "swarm_synthesis",
    });
  }

  return entries;
}

function generateTelemetryCommentary(tel: Telemetry): string | null {
  const parts: string[] = [];

  if (tel.panic_index !== undefined && tel.panic_index >= 0.8) {
    parts.push("Panic index is critical");
  }
  if (tel.pitch_slickness !== undefined && tel.pitch_slickness >= 0.7) {
    parts.push("Pitch conditions deteriorating");
  }
  if (tel.foul_escalation !== undefined && tel.foul_escalation >= 5) {
    parts.push("Foul frequency rising rapidly");
  }
  if (tel.crowd_decibels !== undefined && tel.crowd_decibels >= 95) {
    parts.push("Crowd pressure at maximum intensity");
  }
  if (tel.xg_delta !== undefined && tel.xg_delta <= -0.3) {
    parts.push("Underperformance against expected goals creating frustration");
  }
  if (tel.sub_shock_index !== undefined && tel.sub_shock_index >= 0.2) {
    parts.push("Recent substitutions introducing high variance");
  }

  if (parts.length === 0) return null;
  return parts.join(". ") + ".";
}

function generatePhaseCommentary(phase: MatchPhase, minute: number): string | null {
  switch (phase) {
    case "CHAOS":
      return "Chaos phase — conditions are degrading rapidly.";
    case "WEATHER":
      return "Weather system active — environmental factors entering play.";
    case "GRIND":
      return null;
  }
}
