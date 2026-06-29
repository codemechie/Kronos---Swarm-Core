export function DoclingPipeline() {
  return (
    <div className="border border-gray-200 rounded-card bg-white overflow-hidden font-mono">
      <div className="bg-cyan-50 px-4 py-2 border-b border-cyan-200">
        <span className="text-2xs tracking-widest text-cyan-700 font-semibold uppercase">
          Document-to-Structured-Data Pipeline
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {/* ── Source ── */}
        <div className="p-5">
          <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-3 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Source Documents
          </div>
          <div className="space-y-3 text-xs">
            <div className="border border-gray-200 rounded-card p-3 bg-gray-50">
              <div className="text-2xs tracking-widest text-gray-400 mb-1">AGENT DEBATE OUTPUT (raw)</div>
              <div className="text-gray-700 leading-relaxed">
                "High risk. Fatigue accumulation in defensive line reaching critical
                threshold. Crowd pressure amplifying panic index. Recommend tactical
                substitution within 5 minutes."
              </div>
            </div>
            <div className="border border-gray-200 rounded-card p-3 bg-gray-50">
              <div className="text-2xs tracking-widest text-gray-400 mb-1">TELEMETRY STREAM (raw)</div>
              <div className="text-gray-700 leading-relaxed">
                minute=72 score_home=2 score_away=1 ppda=8.2
                block_height_m=38.0 vertical_disconnect=14.5
                defensive_fatigue=0.31 crowd_decibels=94
                panic_index=0.28 ...
              </div>
            </div>
            <div className="border border-gray-200 rounded-card p-3 bg-gray-50">
              <div className="text-2xs tracking-widest text-gray-400 mb-1">SCOUTING REPORT (excerpt)</div>
              <div className="text-gray-700 leading-relaxed">
                "Opposition left-back vulnerable to high press in final third.
                Average position advanced — space behind on transitions."
              </div>
            </div>
          </div>
        </div>

        {/* ── Structured ── */}
        <div className="p-5">
          <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-3 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Canonical Structured Data
          </div>
          <div className="space-y-3 text-xs">
            <div className="border border-cyan-200 rounded-card p-3 bg-cyan-50">
              <div className="text-2xs tracking-widest text-cyan-600 mb-1">NORMALIZED AGENT</div>
              <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap">{`{
  id: "anarchist",
  displayName: "Anarchist",
  verdict: "High risk. Fatigue...",
  riskLevel: "HIGH_RISK"
}`}</pre>
            </div>
            <div className="border border-cyan-200 rounded-card p-3 bg-cyan-50">
              <div className="text-2xs tracking-widest text-cyan-600 mb-1">STRUCTURED TELEMETRY</div>
              <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap">{`{
  minute: 72,
  defensive_fatigue: 0.31,
  panic_index: 0.28,
  crowd_decibels: 94,
  ...
}`}</pre>
            </div>
            <div className="border border-cyan-200 rounded-card p-3 bg-cyan-50">
              <div className="text-2xs tracking-widest text-cyan-600 mb-1">STRUCTURED CONTEXT</div>
              <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap">{`{
  type: "tactical_note",
  target: "opposition_left_back",
  pattern: "vulnerable_to_high_press",
  phase: "final_third",
  risk: "transition_exposure"
}`}</pre>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-2xs text-gray-500">
              <span className="text-green-600 font-bold">↓</span>
              <span>Ingested into agent debate context as structured references</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
