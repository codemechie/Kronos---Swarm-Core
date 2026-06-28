import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { ConnectionStatus, KronosPacket, KronosState, MatchPhase } from "../types/kronos";
import { normalizeKronosPacket } from "../lib/normalizeKronosPacket";
import { generateEvents } from "../lib/eventEngine";
import { LiveRuntimeProvider } from "../runtime/LiveRuntimeProvider";

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
  granite_review: {
    escalation_triggered: false,
    review_summary: "Granite review not required.",
    contradiction_analysis: "",
    confidence_assessment: "",
    recommended_action: "",
    granite_confidence: 0,
    provider: "granite",
    skipped: true,
  },
  validation: {
    overall_confidence: 0,
    agreement_score: 0,
    trust_score: 0,
    contradiction_count: 0,
    flags: [],
    evidence_summary: "",
    validation_source: "heuristic",
    skipped: true,
  },
  connectionStatus: "CONNECTING",
};

export function KronosProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KronosState>(INITIAL_STATE);
  const providerRef = useRef<LiveRuntimeProvider | null>(null);
  const firstPacketRef = useRef(true);

  useEffect(() => {
    const provider = new LiveRuntimeProvider();
    providerRef.current = provider;

    provider.start((status: ConnectionStatus) => {
      setState((prev) => ({ ...prev, connectionStatus: status }));
    });

    const unsub = provider.subscribe((raw: KronosPacket) => {
      const { telemetry, swarmMetrics, debateOutputs, granite_review, validation } =
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
          granite_review,
          validation,
          history,
          phase: derivePhase(telemetry.minute),
          events: prev.events,
          connectionStatus: firstPacketRef.current ? "CONNECTED" : prev.connectionStatus,
        };
        firstPacketRef.current = false;

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
    });

    return () => {
      unsub();
      provider.stop();
      providerRef.current = null;
    };
  }, []);

  return (
    <KronosContext.Provider value={state}>{children}</KronosContext.Provider>
  );
}
