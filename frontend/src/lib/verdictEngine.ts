import type {
  SwarmAgent,
  MatchPhase,
  Telemetry,
  VerdictStatus,
  LeadCoachVerdict,
  SupportingSignal,
} from "../types/kronos";

export interface VerdictInput {
  agents: SwarmAgent[];
  fractureIndex: number;
  chaosProbability: number;
  phase: MatchPhase;
  telemetry: Telemetry;
}

function generateSupportingSignals(input: VerdictInput): SupportingSignal[] {
  const signals: SupportingSignal[] = [];

  for (const agent of input.agents) {
    if (agent.riskLevel === "HIGH_RISK") {
      signals.push({
        category: "AGENT",
        message: `${agent.displayName} reported HIGH_RISK`,
      });
    }
  }

  if (input.fractureIndex >= 40) {
    signals.push({ category: "FRACTURE", message: "Swarm fracture exceeded 40" });
  }
  if (input.fractureIndex >= 60) {
    signals.push({ category: "FRACTURE", message: "Swarm fracture exceeded 60" });
  }
  if (input.fractureIndex >= 80) {
    signals.push({ category: "FRACTURE", message: "Consensus collapse threshold exceeded" });
  }

  if (input.chaosProbability >= 50) {
    signals.push({ category: "CHAOS", message: "Chaos probability exceeded 50%" });
  }
  if (input.chaosProbability >= 75) {
    signals.push({ category: "CHAOS", message: "Chaos probability exceeded 75%" });
  }
  if (input.chaosProbability >= 90) {
    signals.push({ category: "CHAOS", message: "System instability threshold exceeded" });
  }

  const tel = input.telemetry;
  if (tel.panic_index !== undefined && tel.panic_index >= 0.7) {
    signals.push({ category: "TELEMETRY", message: "Panic Index elevated" });
  }
  if (tel.crowd_decibels !== undefined && tel.crowd_decibels >= 90) {
    signals.push({ category: "TELEMETRY", message: "Crowd noise above 90 dB" });
  }
  if (tel.pitch_slickness !== undefined && tel.pitch_slickness >= 0.7) {
    signals.push({ category: "TELEMETRY", message: "Pitch slickness elevated" });
  }
  if (tel.foul_escalation !== undefined && tel.foul_escalation >= 5) {
    signals.push({ category: "TELEMETRY", message: "Foul escalation trend detected" });
  }

  return signals;
}

export function generateLeadCoachVerdict(input: VerdictInput): LeadCoachVerdict {
  const supportingAgents = input.agents
    .filter((a) => a.riskLevel === "HIGH_RISK")
    .map((a) => a.displayName);

  const highRiskCount = supportingAgents.length;

  let status: VerdictStatus;
  if (input.fractureIndex >= 80 || highRiskCount >= 2) {
    status = "CRITICAL";
  } else if (highRiskCount === 1) {
    status = "WATCH";
  } else {
    status = "STABLE";
  }

  const headlines: Record<VerdictStatus, string> = {
    STABLE: "Swarm consensus remains stable",
    WATCH: "Early warning signals detected",
    CRITICAL: "Consensus breakdown detected",
  };

  const rationale =
    input.fractureIndex >= 80
      ? "Swarm consensus collapse detected. Escalation recommended."
      : status === "STABLE"
        ? "All active agents report nominal conditions."
        : status === "WATCH"
          ? "A specialist agent has identified elevated risk conditions."
          : "Multiple instability indicators are active across the swarm.";

  return {
    status,
    headline: headlines[status],
    rationale,
    supportingAgents,
    supportingSignals: generateSupportingSignals(input),
  };
}
