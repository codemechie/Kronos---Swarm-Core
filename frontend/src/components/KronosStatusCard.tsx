import type { Telemetry, SwarmMetrics } from "../types/kronos";

interface KronosStatusCardProps {
  telemetry: Telemetry;
  swarmMetrics: SwarmMetrics;
}

export function KronosStatusCard({
  telemetry,
  swarmMetrics,
}: KronosStatusCardProps) {
  return (
    <div className="border border-gray-600 rounded-card bg-gray-900 px-8 py-6 font-mono text-gray-100 w-80">
      <div className="text-sm tracking-widest text-gray-400 mb-4">KRONOS</div>
      <div className="space-y-1">
        <div>Minute: {telemetry.minute}</div>
        <div>Fracture: {swarmMetrics.fracture_index}</div>
        <div>Chaos: {swarmMetrics.chaos_probability}</div>
      </div>
    </div>
  );
}
