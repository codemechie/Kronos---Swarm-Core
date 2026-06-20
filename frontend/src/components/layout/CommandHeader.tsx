import { useKronos } from "../../hooks/useKronos";

export function CommandHeader() {
  const { telemetry, swarmMetrics, phase } = useKronos();

  return (
    <div className="border border-gray-700 rounded bg-gray-900 px-6 py-3 font-mono text-gray-100">
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <span className="tracking-widest text-gray-400 font-bold">
          KRONOS SWARM ENGINE
        </span>
        <span className="text-gray-600">|</span>
        <span>
          Minute: <span className="text-white">{telemetry.minute}</span>
        </span>
        <span className="text-gray-600">|</span>
        <span>
          Phase:{" "}
          <span
            className={
              phase === "CHAOS"
                ? "text-red-400"
                : phase === "WEATHER"
                  ? "text-yellow-400"
                  : "text-green-400"
            }
          >
            {phase}
          </span>
        </span>
        <span className="text-gray-600">|</span>
        <span>
          Fracture:{" "}
          <span className="text-white">{swarmMetrics.fracture_index}</span>
        </span>
        <span className="text-gray-600">|</span>
        <span>
          Chaos:{" "}
          <span className="text-white">
            {swarmMetrics.chaos_probability}%
          </span>
        </span>
      </div>
    </div>
  );
}
