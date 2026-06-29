import { useKronos } from "../../hooks/useKronos";

const flagColors: Record<string, string> = {
  HIGH_FRACTURE: "text-red-600 border-red-300 bg-red-50",
  CONTRADICTORY_VERDICTS: "text-orange-600 border-orange-300 bg-orange-50",
  LOW_CONFIDENCE: "text-yellow-600 border-yellow-300 bg-yellow-50",
  AGENT_FAILURE: "text-purple-600 border-purple-300 bg-purple-50",
  NO_CONSENSUS: "text-cyan-600 border-cyan-300 bg-cyan-50",
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
      <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
        <div className="text-xs tracking-widest text-gray-600 font-semibold mb-3">VALIDATION CENTER</div>
        <div className="text-2xs tracking-widest text-gray-500 mb-2">SWARM VALIDATION LAYER</div>
        <div className="text-gray-500 text-sm">Awaiting validation data...</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
      <div className="text-xs tracking-widest text-gray-500 font-semibold mb-1">VALIDATION CENTER</div>
      <div className="text-2xs tracking-widest text-gray-500 mb-3">SWARM VALIDATION LAYER</div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
          <div className="text-2xs tracking-widest text-gray-500 mb-1">CONFIDENCE</div>
          <div className="text-2xl font-bold text-gray-900">{pct(validation.overall_confidence)}</div>
        </div>

        <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
          <div className="text-2xs tracking-widest text-gray-500 mb-1">AGREEMENT</div>
          <div className="text-2xl font-bold text-gray-900">{pct(validation.agreement_score)}</div>
        </div>

        <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
          <div className="text-2xs tracking-widest text-gray-500 mb-1">TRUST SCORE</div>
          <div className="text-2xl font-bold text-gray-900">{pct(validation.trust_score)}</div>
        </div>

        <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
          <div className="text-2xs tracking-widest text-gray-500 mb-1">CONTRADICTIONS</div>
          <div className={`text-2xl font-bold ${validation.contradiction_count > 0 ? "text-yellow-600" : "text-gray-900"}`}>
            {validation.contradiction_count}
          </div>
        </div>
      </div>

      {validation.flags.length > 0 && (
        <div className="mt-2">
          <div className="text-2xs tracking-widest text-gray-500 mb-1">FLAGS</div>
          <div className="flex flex-wrap gap-1.5">
            {validation.flags.map((flag) => (
              <span
                key={flag}
                className={`text-2xs px-2 py-0.5 border rounded-button ${flagColors[flag] ?? "text-gray-500 border-gray-300 bg-gray-100"}`}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {validation.evidence_summary && (
        <div className="mt-1.5">
          <div className="text-2xs tracking-widest text-gray-500 mb-0.5">EVIDENCE</div>
          <div className="text-2xs text-gray-600">{validation.evidence_summary}</div>
        </div>
      )}
    </div>
  );
}
