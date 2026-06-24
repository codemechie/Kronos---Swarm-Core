import { useKronos } from "../../hooks/useKronos";

export function GraniteTerminal() {
  const { granite_review, validation, swarmMetrics } = useKronos();

  if (!granite_review) {
    return (
      <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
        <div className="text-xs tracking-widest text-gray-500 mb-3">GRANITE REVIEW TERMINAL</div>
        <div className="text-gray-500 text-sm">Awaiting Granite intelligence...</div>
      </div>
    );
  }

  if (granite_review.skipped) {
    return (
      <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs tracking-widest text-gray-400">GRANITE REVIEW TERMINAL</span>
          <span className="text-[10px] px-2 py-0.5 border rounded text-green-400 border-green-700">
            [STANDBY]
          </span>
        </div>

        <div className="text-xs text-gray-400 mb-2">
          Reason: {granite_review.review_summary}
        </div>

        <div className="border-t border-gray-700 pt-2 flex gap-4 text-xs">
          <div>
            <span className="text-gray-500">Confidence: </span>
            <span className="text-white">{validation?.overall_confidence ?? "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Fracture: </span>
            <span className="text-white">{swarmMetrics.fracture_index}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded bg-gray-900 p-4 font-mono text-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs tracking-widest text-gray-400">GRANITE REVIEW TERMINAL</span>
        <span className="text-[10px] px-2 py-0.5 border rounded text-amber-400 border-amber-700">
          [ACTIVE]
        </span>
      </div>

      <div className="mb-3">
        <span className="text-xs text-gray-500">GRANITE CONFIDENCE: </span>
        <span className="text-lg font-bold text-amber-400">{granite_review.granite_confidence}%</span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="border-t border-gray-700 pt-2">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1">INTELLIGENCE SUMMARY</div>
          <div className="text-gray-200">{granite_review.review_summary}</div>
        </div>

        <div className="border-t border-gray-700 pt-2">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1">CONTRADICTION ANALYSIS</div>
          <div className="text-gray-200">{granite_review.contradiction_analysis || "No contradictions identified."}</div>
        </div>

        <div className="border-t border-gray-700 pt-2">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1">CONFIDENCE ASSESSMENT</div>
          <div className="text-gray-200">{granite_review.confidence_assessment || "No assessment provided."}</div>
        </div>

        <div className="border-t border-gray-700 pt-2">
          <div className="text-[10px] tracking-widest text-gray-500 mb-1">RECOMMENDED ACTION</div>
          <div className="text-gray-200">{granite_review.recommended_action || "No action recommended."}</div>
        </div>
      </div>

      <div className="border-t border-gray-700 mt-3 pt-2 flex gap-4 text-xs">
        <div>
          <span className="text-gray-500">Provider: </span>
          <span className="text-white">{granite_review.provider}</span>
        </div>
        <div>
          <span className="text-gray-500">Confidence: </span>
          <span className="text-white">{validation?.overall_confidence ?? "—"}</span>
        </div>
        <div>
          <span className="text-gray-500">Fracture: </span>
          <span className="text-white">{swarmMetrics.fracture_index}</span>
        </div>
      </div>
    </div>
  );
}
