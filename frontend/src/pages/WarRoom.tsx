import { useMemo } from "react";
import { useKronos } from "../hooks/useKronos";
import { CommandHeader } from "../components/layout/CommandHeader";
import { TelemetryPanel } from "../components/layout/TelemetryPanel";
import { SwarmPanel } from "../components/layout/SwarmPanel";
import { EventFeed } from "../components/layout/EventFeed";
import { LeadCoachVerdictPanel } from "../components/verdict/LeadCoachVerdictPanel";
import { ValidationCenter } from "../components/validation/ValidationCenter";
import { FractureTimeline } from "../components/charts/FractureTimeline";
import { GraniteTerminal } from "../components/granite/GraniteTerminal";

const connectionDot: Record<string, string> = {
  CONNECTED: "bg-green-500",
  CONNECTING: "bg-yellow-500",
  OFFLINE: "bg-red-500",
};

export function WarRoom() {
  const { telemetry, phase, swarmMetrics, connectionStatus } = useKronos();

  const chaosPct = useMemo(() => {
    const v = swarmMetrics.chaos_probability;
    return v !== undefined ? `${v}%` : "—";
  }, [swarmMetrics.chaos_probability]);

  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-3">
        <CommandHeader />

        <div className="flex items-center gap-3 text-[9px] tracking-widest text-gray-600 border border-gray-800 rounded bg-gray-950 px-4 py-1.5">
          <span className="text-gray-500">{telemetry.minute}&apos;</span>
          <span className="text-gray-700">|</span>
          <span>{phase}</span>
          <span className="text-gray-700">|</span>
          <span>CHAOS {chaosPct}</span>
          <span className="text-gray-700">|</span>
          <span>FRACTURE {swarmMetrics.fracture_index}</span>
          <span className="text-gray-700">|</span>
          <span className="flex items-center gap-1">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${connectionDot[connectionStatus] ?? "bg-gray-600"}`} />
            {connectionStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TelemetryPanel />
          <SwarmPanel />
          <EventFeed />
        </div>
        <LeadCoachVerdictPanel />
        <ValidationCenter />
        <FractureTimeline />
        <GraniteTerminal />
      </div>
    </div>
  );
}
