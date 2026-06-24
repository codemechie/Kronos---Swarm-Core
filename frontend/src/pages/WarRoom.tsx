import { CommandHeader } from "../components/layout/CommandHeader";
import { TelemetryPanel } from "../components/layout/TelemetryPanel";
import { SwarmPanel } from "../components/layout/SwarmPanel";
import { EventFeed } from "../components/layout/EventFeed";
import { LeadCoachVerdictPanel } from "../components/verdict/LeadCoachVerdictPanel";
import { ValidationCenter } from "../components/validation/ValidationCenter";
import { FractureTimeline } from "../components/charts/FractureTimeline";
import { GraniteTerminal } from "../components/granite/GraniteTerminal";
import { KronosDebugPanel } from "../components/KronosDebugPanel";

export function WarRoom() {
  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-4">
        <CommandHeader />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TelemetryPanel />
          <SwarmPanel />
          <EventFeed />
        </div>
        <LeadCoachVerdictPanel />
        <ValidationCenter />
        <FractureTimeline />
        <GraniteTerminal />
        <div className="flex justify-center">
          <KronosDebugPanel />
        </div>
      </div>
    </div>
  );
}
