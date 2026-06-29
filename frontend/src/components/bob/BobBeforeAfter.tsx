export function BobBeforeAfter() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ── Before ── */}
      <div className="border border-gray-200 rounded-card overflow-hidden">
        <div className="bg-red-50 px-4 py-2 border-b border-red-200">
          <span className="text-2xs tracking-widest text-red-600 font-semibold uppercase">Before BOB</span>
        </div>
        <div className="bg-gray-900 p-6 font-mono">
          <div className="text-center">
            <div className="text-2xs tracking-widest text-gray-400 mb-4 uppercase">Kronos Swarm Engine</div>
            <h2 className="text-xl font-bold text-white mb-3 leading-tight">
              Real-time football intelligence
            </h2>
            <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto leading-relaxed">
              Five AI agents analyze the match.
            </p>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-gray-300 border border-gray-600 px-6 py-2 inline-block">
                Enter War Room
              </span>
              <span className="text-xs text-gray-500">View Match Story →</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 text-2xs text-gray-500">
            <span className="text-gray-400">■</span> Monochrome palette, no brand accent
          </div>
          <div className="flex items-center gap-2 text-2xs text-gray-500">
            <span className="text-gray-400">■</span> Flat buttons without hover feedback
          </div>
          <div className="flex items-center gap-2 text-2xs text-gray-500">
            <span className="text-gray-400">■</span> Minimal hierarchy, limited visual structure
          </div>
          <div className="flex items-center gap-2 text-2xs text-gray-500">
            <span className="text-gray-400">■</span> "War Room" label — tactical, not product-oriented
          </div>
        </div>
      </div>

      {/* ── After ── */}
      <div className="border border-gray-200 rounded-card overflow-hidden">
        <div className="bg-green-50 px-4 py-2 border-b border-green-200">
          <span className="text-2xs tracking-widest text-green-600 font-semibold uppercase">After BOB</span>
        </div>
        <div className="bg-gradient-to-b from-green-50 to-white p-6 font-mono">
          <div className="text-center">
            <div className="text-2xs tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">
              Kronos Swarm Engine
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
              Understand football
              <br />
              <span className="text-gray-400">with verified intelligence.</span>
            </h2>
            <p className="text-xs text-gray-600 mb-6 max-w-xs mx-auto leading-relaxed">
              Five specialized AI agents analyze every moment of the match in real time. One unified verdict surfaces what matters.
            </p>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs tracking-widest text-white font-semibold bg-green-600 px-6 py-2.5 inline-block rounded-button shadow-button">
                ENTER LIVE INTELLIGENCE
              </span>
              <span className="text-xs tracking-widest text-green-700 font-semibold border border-green-400 px-6 py-2.5 inline-block rounded-button">
                VIEW MATCH STORY →
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 text-2xs text-gray-500">
            <span className="text-green-600">◆</span> Green brand accent, gradient backgrounds
          </div>
          <div className="flex items-center gap-2 text-2xs text-gray-500">
            <span className="text-green-600">◆</span> Styled buttons with hover shadows and transitions
          </div>
          <div className="flex items-center gap-2 text-2xs text-gray-500">
            <span className="text-green-600">◆</span> Clear visual hierarchy — tagline, description, dual CTAs
          </div>
          <div className="flex items-center gap-2 text-2xs text-gray-500">
            <span className="text-green-600">◆</span> "Live Intelligence" — product-oriented, user-first naming
          </div>
        </div>
      </div>
    </div>
  );
}
