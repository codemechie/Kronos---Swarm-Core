import { useKronos } from "../../hooks/useKronos";

export function GraniteTerminal() {
  const { granite_review, validation, swarmMetrics } = useKronos();

  if (!granite_review) {
    return (
      <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
        <div className="text-xs tracking-widest text-green-600 font-semibold mb-1">GRANITE REVIEW TERMINAL</div>
        <div className="text-2xs tracking-widest text-gray-500 mb-3">IBM GRANITE REVIEW LAYER</div>
        <div className="text-gray-500 text-sm">Awaiting Granite intelligence...</div>
      </div>
    );
  }

  if (granite_review.skipped) {
    return (
      <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
        <div className="text-xs tracking-widest text-green-600 font-semibold mb-1">GRANITE REVIEW TERMINAL</div>
        <div className="text-2xs tracking-widest text-gray-500 mb-3">IBM GRANITE REVIEW LAYER</div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-2xs tracking-widest text-gray-500">STATUS</span>
          <span className="text-2xs px-2 py-0.5 border rounded-button text-green-600 border-green-300 font-semibold">
            [STANDBY]
          </span>
        </div>

        <div className="text-xs text-gray-600 mb-1">Swarm confidence remains healthy.</div>
        <div className="text-xs text-gray-500 mb-4">No escalation required.</div>

        <div className="grid grid-cols-3 gap-4 border-t border-gray-200 pt-4 text-xs">
          <div>
            <div className="text-2xs tracking-widest text-gray-500 mb-1">Current Confidence</div>
            <div className="text-sm font-semibold text-gray-900">
              {validation?.overall_confidence != null
                ? `${Math.round(validation.overall_confidence * 100)}%`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-2xs tracking-widest text-gray-500 mb-1">Current Fracture</div>
            <div className="text-sm font-semibold text-gray-900">{swarmMetrics.fracture_index}</div>
          </div>
          <div>
            <div className="text-2xs tracking-widest text-gray-500 mb-1">Current Agreement</div>
            <div className="text-sm font-semibold text-gray-900">
              {validation?.agreement_score != null
                ? `${Math.round(validation.agreement_score * 100)}%`
                : "—"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-card bg-white p-4 font-mono text-gray-900">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs tracking-widest text-green-600 font-semibold">GRANITE REVIEW TERMINAL</span>
        <span className="text-2xs px-2 py-0.5 border rounded-button text-amber-600 border-amber-300 font-semibold">
          [ACTIVE]
        </span>
      </div>
      <div className="text-2xs tracking-widest text-gray-500 mb-3">IBM GRANITE REVIEW LAYER</div>

      <div className="mb-3">
        <span className="text-xs text-gray-600 font-semibold">GRANITE CONFIDENCE: </span>
        <span className="text-lg font-bold text-amber-600">{granite_review.granite_confidence}%</span>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-1">INTELLIGENCE SUMMARY</div>
          <div className="text-gray-700">{granite_review.review_summary}</div>
        </div>

        <div>
          <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-1">CONTRADICTION ANALYSIS</div>
          <div className="text-gray-600">{granite_review.contradiction_analysis || "No contradictions identified."}</div>
        </div>

        <div>
          <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-1">CONFIDENCE ASSESSMENT</div>
          <div className="text-gray-600">{granite_review.confidence_assessment || "No assessment provided."}</div>
        </div>

        <div>
          <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-1">RECOMMENDED ACTION</div>
          <div className="text-gray-700">{granite_review.recommended_action || "No action recommended."}</div>
        </div>
      </div>

      <div className="mt-3 pt-1 flex gap-4 text-xs">
        <div>
          <span className="text-gray-600">Provider: </span>
          <span className="text-gray-900">{granite_review.provider}</span>
        </div>
        <div>
          <span className="text-gray-600">Confidence: </span>
          <span className="text-gray-900">{validation?.overall_confidence ?? "—"}</span>
        </div>
        <div>
          <span className="text-gray-600">Fracture: </span>
          <span className="text-gray-900">{swarmMetrics.fracture_index}</span>
        </div>
      </div>
    </div>
  );
}
