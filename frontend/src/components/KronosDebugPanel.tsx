import { useKronos } from "../hooks/useKronos";

export function KronosDebugPanel() {
  const { telemetry, swarmMetrics, history } = useKronos();

  return (
    <div className="border border-gray-700 rounded-card bg-gray-950 px-6 py-4 font-mono text-gray-300 text-sm w-80 mt-4">
      <div className="text-xs tracking-widest text-gray-500 mb-2">DEBUG</div>
      <div className="space-y-0.5">
        <div>Minute: {telemetry.minute}</div>
        <div>Fracture: {swarmMetrics.fracture_index}</div>
        <div>Chaos: {swarmMetrics.chaos_probability}</div>
        <div>History Entries: {history.length}</div>
      </div>
    </div>
  );
}
