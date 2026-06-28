import { useKronos } from "../hooks/useKronos";
import { CommandHeader } from "../components/layout/CommandHeader";
import { EventFeed } from "../components/layout/EventFeed";

function pct(v: number | undefined | null): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

function confidenceMeta(v: number | undefined | null): { label: string; color: string } | null {
  if (v == null) return null;
  if (v >= 0.9) return { label: "HIGH CONFIDENCE", color: "text-green-400" };
  if (v >= 0.7) return { label: "STRONG CONFIDENCE", color: "text-cyan-400" };
  if (v >= 0.5) return { label: "MODERATE CONFIDENCE", color: "text-blue-400" };
  if (v >= 0.3) return { label: "LOW CONFIDENCE", color: "text-yellow-400" };
  return { label: "CRITICAL UNCERTAINTY", color: "text-red-400" };
}

function matchOutlook(scoreHome: number, scoreAway: number, phase: string): string {
  const diff = scoreHome - scoreAway;
  if (phase === "CHAOS") {
    return diff > 0 ? "Home side weathering chaos" : diff < 0 ? "Away side capitalising on chaos" : "High tactical volatility";
  }
  if (phase === "WEATHER") {
    return diff > 0 ? "Home side control slipping" : diff < 0 ? "Away side gaining momentum" : "Momentum shifting — poised for change";
  }
  return diff > 0 ? "Home side in control" : diff < 0 ? "Away side in control" : "Match balanced — structured contest";
}

const phaseBadge: Record<string, { label: string; color: string }> = {
  GRIND: { label: "STRUCTURED PLAY", color: "text-green-400 border-green-700 bg-green-900/20" },
  WEATHER: { label: "TRANSITION PHASE", color: "text-yellow-400 border-yellow-700 bg-yellow-900/20" },
  CHAOS: { label: "HIGH CHAOS", color: "text-red-400 border-red-700 bg-red-900/20" },
};

/* ── Visual Components ── */

function GaugeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((Math.abs(value) / max) * 100)) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MomentumBar({ value, range }: { value: number; range: number }) {
  const pct = range > 0 ? Math.max(-100, Math.min(100, (value / range) * 100)) : 0;
  const absPct = Math.abs(pct);
  if (absPct < 1) {
    return <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden" />;
  }
  return (
    <div className="relative w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600 z-10" />
      <div
        className={`absolute top-0 h-full ${pct >= 0 ? "bg-green-500/60 left-1/2 rounded-r-full" : "bg-blue-500/60 right-1/2 rounded-l-full"}`}
        style={{ width: `${absPct / 2}%` }}
      />
    </div>
  );
}

function CompactGaugeCard({ label, value, max, unit, color, sub }: { label: string; value: number | string; max: number; unit?: string; color: string; sub?: string }) {
  const num = typeof value === "number" ? value : 0;
  return (
    <div className="border border-gray-700/50 rounded bg-gray-950 p-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] tracking-widest text-gray-500">{label}</span>
        <span className={`text-xs font-bold ${color}`}>
          {value}{unit ?? ""}
        </span>
      </div>
      <GaugeBar value={num} max={max} color={color} />
      {sub && <div className="text-[9px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function CompactMomentumCard({ label, value, range, homeLabel, awayLabel, color }: { label: string; value: number; range: number; homeLabel?: string; awayLabel?: string; color: string }) {
  return (
    <div className="border border-gray-700/50 rounded bg-gray-950 p-2.5">
      <div className="text-[9px] tracking-widest text-gray-500 mb-1">{label}</div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-green-500/70 font-semibold">{homeLabel ?? "HOME"}</span>
        <span className={`font-bold ${color}`}>{value.toFixed(2)}</span>
        <span className="text-blue-500/70 font-semibold">{awayLabel ?? "AWAY"}</span>
      </div>
      <MomentumBar value={value} range={range} />
    </div>
  );
}

function GaugeCard({ label, value, max, unit, color, sub }: { label: string; value: number; max: number; unit?: string; color: string; sub?: string }) {
  return (
    <div className="border border-gray-700/50 rounded bg-gray-950 p-3">
      <div className="text-[9px] tracking-widest text-gray-500 mb-1.5">{label}</div>
      <div className={`text-lg font-bold mb-1 ${color}`}>
        {value}{unit ?? ""}
      </div>
      <GaugeBar value={value} max={max} color={color} />
      {sub && <div className="text-[10px] text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function MomentumGaugeCard({ label, value, range, homeLabel, awayLabel, homeColor, awayColor }: { label: string; value: number; range: number; homeLabel?: string; awayLabel?: string; homeColor?: string; awayColor?: string }) {
  const pct = range > 0 ? Math.max(-100, Math.min(100, (value / range) * 100)) : 0;
  const isHome = pct >= 0;
  return (
    <div className="border border-gray-700/50 rounded bg-gray-950 p-3">
      <div className="text-[9px] tracking-widest text-gray-500 mb-1.5">{label}</div>
      <div className={`text-lg font-bold mb-1 ${isHome ? homeColor ?? "text-green-400" : awayColor ?? "text-blue-400"}`}>
        {value >= 0 ? "+" : ""}{value.toFixed(2)}
      </div>
      <MomentumBar value={value} range={range} />
      <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
        <span>{homeLabel ?? "HOME"}</span>
        <span>{awayLabel ?? "AWAY"}</span>
      </div>
    </div>
  );
}

export function MatchStory() {
  const { telemetry, swarmMetrics, phase, validation, granite_review } = useKronos();

  const hasGranite = granite_review && !granite_review.skipped;
  const cm = confidenceMeta(validation.overall_confidence);
  const outlook = matchOutlook(telemetry.score_home ?? 0, telemetry.score_away ?? 0, phase);
  const badge = phaseBadge[phase] ?? { label: phase, color: "text-gray-400 border-gray-700 bg-gray-800" };
  const fieldTilt = telemetry.field_tilt ?? 1;
  const ftAdj = fieldTilt - 1;
  const xgDelta = telemetry.xg_delta ?? 0;

  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-4">
        <CommandHeader />

        {/* ── HERO ── */}
        <div className="border border-gray-700 rounded bg-gray-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <span className="text-[10px] tracking-widest text-gray-400">MATCH SUMMARY</span>
          </div>

          <div className="px-5 py-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center gap-6 md:gap-12">
                <div className="text-center">
                  <div className="text-[10px] tracking-widest text-green-400/70 mb-1">HOME</div>
                  <div className="text-5xl md:text-6xl font-bold text-green-400 leading-none">{telemetry.score_home ?? 0}</div>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-600 select-none">:</div>
                <div className="text-center">
                  <div className="text-[10px] tracking-widest text-blue-400/70 mb-1">AWAY</div>
                  <div className="text-5xl md:text-6xl font-bold text-blue-400 leading-none">{telemetry.score_away ?? 0}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-sm text-gray-400">{telemetry.minute}&apos;</span>
                <span className={`text-[10px] px-2 py-0.5 border rounded font-semibold ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-gray-800">
            <div className="p-5 md:border-r border-gray-800 flex flex-col justify-center">
              <div className="text-[9px] tracking-widest text-gray-500 mb-2">CONFIDENCE</div>
              <div className="text-3xl font-bold text-white mb-1.5">{pct(validation.overall_confidence)}</div>
              <GaugeBar value={validation.overall_confidence} max={1} color={cm?.color ?? "bg-gray-500"} />
              <div className="flex items-center justify-between mt-1.5">
                {cm && <span className={`text-[10px] font-semibold ${cm.color}`}>{cm.label}</span>}
                <span className="text-[10px] text-gray-500">Trust {pct(validation.trust_score)}</span>
              </div>
            </div>

            <div className="p-5">
              <div className="text-[9px] tracking-widest text-gray-500 mb-2">CURRENT OUTLOOK</div>
              <div className="text-sm font-semibold text-white mb-3">{outlook}</div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-green-500/70">HOME TERRITORY</span>
                    <span className="text-blue-500/70">AWAY TERRITORY</span>
                  </div>
                  <MomentumBar value={ftAdj} range={0.75} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between text-[9px] text-gray-500 mb-0.5">
                      <span>Chaos</span>
                      <span>{swarmMetrics.chaos_probability}%</span>
                    </div>
                    <GaugeBar value={swarmMetrics.chaos_probability} max={100} color={swarmMetrics.chaos_probability >= 75 ? "bg-red-500" : swarmMetrics.chaos_probability >= 50 ? "bg-yellow-500" : "bg-gray-500"} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[9px] text-gray-500 mb-0.5">
                      <span>Fracture</span>
                      <span>{swarmMetrics.fracture_index}</span>
                    </div>
                    <GaugeBar value={swarmMetrics.fracture_index} max={100} color={swarmMetrics.fracture_index >= 75 ? "bg-red-500" : swarmMetrics.fracture_index >= 40 ? "bg-yellow-500" : "bg-gray-500"} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION: Key Match Metrics ── */}
        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-[10px] tracking-widest text-gray-400 mb-3">
            KEY MATCH METRICS
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <CompactMomentumCard
              label="TERRITORIAL TILT"
              value={ftAdj}
              range={0.75}
              color={ftAdj > 0.15 ? "text-green-400" : ftAdj < -0.15 ? "text-blue-400" : "text-gray-400"}
            />
            <CompactMomentumCard
              label="EXPECTED GOALS Δ"
              value={xgDelta}
              range={3}
              color={xgDelta > 0.3 ? "text-green-400" : xgDelta < -0.3 ? "text-blue-400" : "text-gray-400"}
            />
            <CompactGaugeCard
              label="FRACTURE INDEX"
              value={swarmMetrics.fracture_index}
              max={100}
              color={swarmMetrics.fracture_index >= 75 ? "text-red-400" : swarmMetrics.fracture_index >= 40 ? "text-yellow-400" : "text-green-400"}
              sub={swarmMetrics.fracture_index >= 75 ? "Critical" : swarmMetrics.fracture_index >= 40 ? "Elevated" : "Nominal"}
            />
            <CompactGaugeCard
              label="CHAOS PROBABILITY"
              value={swarmMetrics.chaos_probability}
              max={100}
              unit="%"
              color={swarmMetrics.chaos_probability >= 75 ? "text-red-400" : swarmMetrics.chaos_probability >= 50 ? "text-yellow-400" : "text-green-400"}
              sub={swarmMetrics.chaos_probability >= 75 ? "Critical" : swarmMetrics.chaos_probability >= 50 ? "Elevated" : "Nominal"}
            />
            <CompactGaugeCard
              label="FOUL ESCALATION"
              value={telemetry.foul_escalation ?? 0}
              max={10}
              color={telemetry.foul_escalation != null && telemetry.foul_escalation >= 5 ? "text-red-400" : telemetry.foul_escalation != null && telemetry.foul_escalation >= 3 ? "text-yellow-400" : "text-white"}
              sub={telemetry.foul_escalation != null ? `${telemetry.foul_escalation} incidents` : "—"}
            />
            <CompactGaugeCard
              label="SPRINT DROP-OFF"
              value={telemetry.sprint_drop_off ?? 0}
              max={100}
              unit="%"
              color={telemetry.sprint_drop_off != null && telemetry.sprint_drop_off >= 20 ? "text-red-400" : telemetry.sprint_drop_off != null && telemetry.sprint_drop_off >= 10 ? "text-yellow-400" : "text-white"}
              sub={telemetry.sprint_drop_off != null ? `${telemetry.sprint_drop_off}% fatigue` : "—"}
            />
          </div>
        </div>

        {/* ── SECTION: Prediction ── */}
        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-[10px] tracking-widest text-gray-400 mb-3">
            PREDICTION
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="border border-gray-700/50 rounded bg-gray-950 p-3">
              <div className="text-[9px] tracking-widest text-gray-500 mb-1.5">CONTRADICTIONS</div>
              <div className={`text-lg font-bold mb-1 ${validation.contradiction_count > 0 ? "text-yellow-400" : "text-green-400"}`}>
                {validation.contradiction_count}
              </div>
              <GaugeBar value={Math.min(validation.contradiction_count, 10)} max={10} color={validation.contradiction_count >= 5 ? "bg-red-500" : validation.contradiction_count > 0 ? "bg-yellow-500" : "bg-green-500"} />
              {validation.flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {validation.flags.map((flag) => (
                    <span key={flag} className="text-[8px] px-1 py-0.5 border border-gray-700 rounded text-gray-400 bg-gray-900">
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <GaugeCard
              label="AGREEMENT"
              value={validation.agreement_score}
              max={1}
              unit=""
              color={validation.agreement_score >= 0.7 ? "text-green-400" : validation.agreement_score >= 0.4 ? "text-yellow-400" : "text-red-400"}
              sub="Swarm Consensus"
            />
            <GaugeCard
              label="TRUST SCORE"
              value={validation.trust_score}
              max={1}
              unit=""
              color={validation.trust_score >= 0.7 ? "text-cyan-400" : validation.trust_score >= 0.4 ? "text-yellow-400" : "text-red-400"}
              sub="Prediction Reliability"
            />
            <div className="border border-gray-700/50 rounded bg-gray-950 p-3">
              <div className="text-[9px] tracking-widest text-gray-500 mb-1.5">RISK INDICATOR</div>
              <div className={`text-lg font-bold mb-1 ${swarmMetrics.chaos_probability >= 75 ? "text-red-400" : swarmMetrics.chaos_probability >= 50 ? "text-yellow-400" : "text-green-400"}`}>
                {swarmMetrics.chaos_probability >= 75 ? "HIGH RISK" : swarmMetrics.chaos_probability >= 50 ? "ELEVATED" : "NOMINAL"}
              </div>
              <GaugeBar value={swarmMetrics.chaos_probability} max={100} color={swarmMetrics.chaos_probability >= 75 ? "bg-red-500" : swarmMetrics.chaos_probability >= 50 ? "bg-yellow-500" : "bg-green-500"} />
              <div className="text-[10px] text-gray-500 mt-1">Chaos: {swarmMetrics.chaos_probability}%</div>
            </div>
          </div>
          {hasGranite && (
            <div className="mt-3 border-t border-gray-800 pt-3">
              <div className="text-[9px] tracking-widest text-gray-500 mb-1">DETAILED ANALYSIS</div>
              <div className="text-xs text-gray-300">{granite_review.review_summary}</div>
            </div>
          )}
        </div>

        {/* ── SECTION: Recent Match Events ── */}
        <EventFeed />
      </div>
    </div>
  );
}
