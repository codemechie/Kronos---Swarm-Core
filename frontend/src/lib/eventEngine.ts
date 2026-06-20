import type { KronosState, EventSeverity } from "../types/kronos";

const FRACTURE_THRESHOLDS: { level: number; severity: EventSeverity; message: string }[] = [
  { level: 40, severity: "INFO", message: "Swarm disagreement rising" },
  { level: 60, severity: "WARNING", message: "Critical swarm fracture detected" },
  { level: 80, severity: "CRITICAL", message: "Consensus collapse detected" },
];

const CHAOS_THRESHOLDS: { level: number; severity: EventSeverity; message: string }[] = [
  { level: 50, severity: "INFO", message: "Instability increasing" },
  { level: 75, severity: "WARNING", message: "High probability disruption" },
  { level: 90, severity: "CRITICAL", message: "System instability imminent" },
];

function didCross(prev: number, curr: number, threshold: number): boolean {
  return prev < threshold && curr >= threshold;
}

export interface DetectedEvent {
  minute: number;
  severity: EventSeverity;
  message: string;
  timestamp: number;
}

export function generateEvents(
  previousState: KronosState | null,
  currentState: KronosState,
  now: number,
): DetectedEvent[] {
  const events: DetectedEvent[] = [];
  const { minute } = currentState.telemetry;

  // Phase change
  if (previousState && previousState.phase !== currentState.phase) {
    if (previousState.phase === "GRIND" && currentState.phase === "WEATHER") {
      events.push({ minute, severity: "INFO", message: "Weather system detected", timestamp: now });
    } else if (previousState.phase === "WEATHER" && currentState.phase === "CHAOS") {
      events.push({ minute, severity: "CRITICAL", message: "Chaos phase initiated", timestamp: now });
    }
  }

  // Fracture threshold crossings
  const prevFracture = previousState?.swarmMetrics.fracture_index ?? -1;
  const currFracture = currentState.swarmMetrics.fracture_index;

  for (const t of FRACTURE_THRESHOLDS) {
    if (didCross(prevFracture, currFracture, t.level)) {
      events.push({ minute, severity: t.severity, message: t.message, timestamp: now });
    }
  }

  // Chaos threshold crossings
  const prevChaos = previousState?.swarmMetrics.chaos_probability ?? -1;
  const currChaos = currentState.swarmMetrics.chaos_probability;

  for (const t of CHAOS_THRESHOLDS) {
    if (didCross(prevChaos, currChaos, t.level)) {
      events.push({ minute, severity: t.severity, message: t.message, timestamp: now });
    }
  }

  return events;
}
