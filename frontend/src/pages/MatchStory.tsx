import { useKronos } from "../hooks/useKronos";
import { CommandHeader } from "../components/layout/CommandHeader";

export function MatchStory() {
  const { telemetry, swarmMetrics, phase, events, connectionStatus } = useKronos();

  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-5xl mx-auto space-y-4">
        <CommandHeader />

        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-xs tracking-widest text-gray-400 mb-1">MATCH STORY</div>
          <div className="text-[10px] tracking-widest text-gray-600 mb-3">
            Live Intelligence · Demo Live Match
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-700 rounded bg-gray-950 p-3">
              <div className="text-[9px] tracking-widest text-gray-500 mb-1">MATCH</div>
              <div className="text-sm font-bold text-white">
                Demo Live Match
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Minute {telemetry.minute} · {phase}
              </div>
              <div className="text-xs text-gray-500">
                {connectionStatus}
              </div>
            </div>

            <div className="border border-gray-700 rounded bg-gray-950 p-3">
              <div className="text-[9px] tracking-widest text-gray-500 mb-1">INTELLIGENCE</div>
              <div className="text-lg font-bold text-white">
                <span className="text-green-400">{telemetry.score_home ?? 0}</span>
                <span className="text-gray-500 mx-1">-</span>
                <span className="text-blue-400">{telemetry.score_away ?? 0}</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                Fracture: {swarmMetrics.fracture_index}
              </div>
              <div className="text-[10px] text-gray-500">
                Chaos: {swarmMetrics.chaos_probability}%
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-[10px] tracking-widest text-gray-400 mb-3">
            EVENT FEED · {events.length} events
          </div>

          {events.length === 0 ? (
            <div className="text-gray-500 text-xs text-center py-8">
              Waiting for live events...
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="border border-gray-700/50 rounded bg-gray-950 p-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-gray-500 shrink-0 w-8">
                      {e.minute}&apos;
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs text-gray-200">{e.message}</div>
                      <div className="text-[9px] text-gray-500 mt-0.5">{e.severity}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
