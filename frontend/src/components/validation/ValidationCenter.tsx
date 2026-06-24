import { useKronos } from "../../hooks/useKronos";

const flagColors: Record<string, string> = {
  HIGH_FRACTURE: "text-red-400 border-red-700 bg-red-900/30",
  CONTRADICTORY_VERDICTS: "text-orange-400 border-orange-700 bg-orange-900/30",
  LOW_CONFIDENCE: "text-yellow-400 border-yellow-700 bg-yellow-900/30",
  AGENT_FAILURE: "text-purple-400 border-purple-700 bg-purple-900/30",
  NO_CONSENSUS: "text-cyan-400 border-cyan-700 bg-cyan-900/30",
};

function pct(v: number | undefined | null): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

export function ValidationCenter() {
  const { validation } = useKronos();

  const hasData =
    validation &&
    !validation.skipped &&
    validation.overall_confidence > 0;

  if (!hasData) {
    return (
      <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
        <div className="text-xs tracking-widest text-gray-500 mb-3">VALIDATION CENTER</div>
        <div className="text-[10px] tracking-widest text-gray-600 mb-2">SWARM VALIDATION LAYER</div>
        <div className="text-gray-500 text-sm">Awaiting validation data...</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
      <div className="text-xs tracking-widest text-gray-400 mb-1">VALIDATION CENTER</div>
      <div className="text-[10px] tracking-widest text-gray-600 mb-3">SWARM VALIDATION LAYER</div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="border border-gray-700 rounded bg-gray-950 p-3">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1">CONFIDENCE</div>
          <div className="text-2xl font-bold text-white">{pct(validation.overall_confidence)}</div>
        </div>

        <div className="border border-gray-700 rounded bg-gray-950 p-3">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1">AGREEMENT</div>
          <div className="text-2xl font-bold text-white">{pct(validation.agreement_score)}</div>
        </div>

        <div className="border border-gray-700 rounded bg-gray-950 p-3">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1">TRUST SCORE</div>
          <div className="text-2xl font-bold text-white">{pct(validation.trust_score)}</div>
        </div>

        <div className="border border-gray-700 rounded bg-gray-950 p-3">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1">CONTRADICTIONS</div>
          <div className={`text-2xl font-bold ${validation.contradiction_count > 0 ? "text-yellow-400" : "text-white"}`}>
            {validation.contradiction_count}
          </div>
        </div>
      </div>

      {validation.flags.length > 0 && (
        <div className="mt-3 border-t border-gray-700 pt-3">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1.5">FLAGS</div>
          <div className="flex flex-wrap gap-1.5">
            {validation.flags.map((flag) => (
              <span
                key={flag}
                className={`text-[10px] px-2 py-0.5 border rounded ${flagColors[flag] ?? "text-gray-400 border-gray-600 bg-gray-800"}`}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {validation.evidence_summary && (
        <div className="mt-3 border-t border-gray-700 pt-3">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1">EVIDENCE</div>
          <div className="text-xs text-gray-300">{validation.evidence_summary}</div>
        </div>
      )}
    </div>
  );
}
