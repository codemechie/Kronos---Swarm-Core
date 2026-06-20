import { createContext, useEffect, useState, type ReactNode } from "react";
import type { KronosPacket, KronosState, MatchPhase } from "../types/kronos";
import { normalizeKronosPacket } from "../lib/normalizeKronosPacket";
import { generateEvents } from "../lib/eventEngine";

const STREAM_URL = "http://localhost:3000/stream";
const MAX_HISTORY = 90;
const MAX_EVENTS = 50;

function derivePhase(minute: number): MatchPhase {
  if (minute <= 60) return "GRIND";
  if (minute <= 75) return "WEATHER";
  return "CHAOS";
}

export const KronosContext = createContext<KronosState | null>(null);

const INITIAL_STATE: KronosState = {
  telemetry: { minute: 0 },
  swarmMetrics: { fracture_index: 0, chaos_probability: 0 },
  debateOutputs: {},
  history: [],
  phase: "GRIND",
  events: [],
};

export function KronosProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KronosState>(INITIAL_STATE);

  useEffect(() => {
    const source = new EventSource(STREAM_URL);

    source.onmessage = (event) => {
      try {
        const raw: KronosPacket = JSON.parse(event.data);
        const { telemetry, swarmMetrics, debateOutputs } =
          normalizeKronosPacket(raw);

        setState((prev) => {
          const point = {
            minute: telemetry.minute,
            fracture: swarmMetrics.fracture_index,
            chaos: swarmMetrics.chaos_probability,
            timestamp: Date.now(),
          };

          const history = [...prev.history, point];
          if (history.length > MAX_HISTORY) {
            history.splice(0, history.length - MAX_HISTORY);
          }

          const next: KronosState = {
            telemetry,
            swarmMetrics,
            debateOutputs,
            history,
            phase: derivePhase(telemetry.minute),
            events: prev.events,
          };

          const now = Date.now();
          const detected = generateEvents(prev, next, now);
          const newEvents = detected.map((e, i) => ({
            ...e,
            id: `${now}-${i}`,
          }));

          const events = [...newEvents, ...prev.events];
          if (events.length > MAX_EVENTS) {
            events.length = MAX_EVENTS;
          }

          return { ...next, events };
        });
      } catch {
        // ignore malformed data
      }
    };

    return () => {
      source.close();
    };
  }, []);

  return (
    <KronosContext.Provider value={state}>{children}</KronosContext.Provider>
  );
}
