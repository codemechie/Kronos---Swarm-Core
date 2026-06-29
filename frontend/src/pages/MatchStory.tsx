import { useKronos } from "../hooks/useKronos";
import { CommandHeader } from "../components/layout/CommandHeader";
import { EventFeed } from "../components/layout/EventFeed";

function pct(v: number | undefined | null): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

function confidenceMeta(v: number | undefined | null): { label: string; color: string } | null {
  if (v == null) return null;
  if (v >= 0.9) return { label: "HIGH CONFIDENCE", color: "text-green-600" };
  if (v >= 0.7) return { label: "STRONG CONFIDENCE", color: "text-cyan-600" };
  if (v >= 0.5) return { label: "MODERATE CONFIDENCE", color: "text-blue-600" };
  if (v >= 0.3) return { label: "LOW CONFIDENCE", color: "text-yellow-600" };
  return { label: "CRITICAL UNCERTAINTY", color: "text-red-600" };
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
  GRIND: { label: "STRUCTURED PLAY", color: "text-green-600 border-green-300 bg-green-50" },
  WEATHER: { label: "TRANSITION PHASE", color: "text-yellow-600 border-yellow-300 bg-yellow-50" },
  CHAOS: { label: "HIGH CHAOS", color: "text-red-600 border-red-300 bg-red-50" },
};

function GaugeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((Math.abs(value) / max) * 100)) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
    return <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden" />;
  }
  return (
    <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300 z-10" />
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
    <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs tracking-widest text-gray-500">{label}</span>
        <span className={`text-xs font-bold ${color}`}>
          {value}{unit ?? ""}
        </span>
      </div>
      <GaugeBar value={num} max={max} color={color} />
      {sub && <div className="text-2xs text-gray-600/70 mt-1">{sub}</div>}
    </div>
  );
}

function CompactMomentumCard({ label, value, range, homeLabel, awayLabel, color }: { label: string; value: number; range: number; homeLabel?: string; awayLabel?: string; color: string }) {
  return (
    <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
      <div className="text-2xs tracking-widest text-gray-500 mb-1">{label}</div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-green-600/70 font-semibold">{homeLabel ?? "HOME"}</span>
        <span className={`font-bold ${color}`}>{value.toFixed(2)}</span>
        <span className="text-blue-600/70 font-semibold">{awayLabel ?? "AWAY"}</span>
      </div>
      <MomentumBar value={value} range={range} />
    </div>
  );
}

function GaugeCard({ label, value, max, unit, color, sub }: { label: string; value: number; max: number; unit?: string; color: string; sub?: string }) {
  return (
    <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
      <div className="text-2xs tracking-widest text-gray-500 mb-2">{label}</div>
      <div className={`text-lg font-bold mb-1 ${color}`}>
        {value}{unit ?? ""}
      </div>
      <GaugeBar value={value} max={max} color={color} />
      {sub && <div className="text-2xs text-gray-600/70 mt-1">{sub}</div>}
    </div>
  );
}

export function MatchStory() {
  const { telemetry, swarmMetrics, phase, validation, granite_review } = useKronos();

  const hasGranite = granite_review && !granite_review.skipped;
  const cm = confidenceMeta(validation.overall_confidence);
  const outlook = matchOutlook(telemetry.score_home ?? 0, telemetry.score_away ?? 0, phase);
  const badge = phaseBadge[phase] ?? { label: phase, color: "text-gray-500 border-gray-300 bg-gray-100" };
  const fieldTilt = telemetry.field_tilt ?? 1;
  const ftAdj = fieldTilt - 1;
  const xgDelta = telemetry.xg_delta ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">
        <CommandHeader />

        <div className="rounded-card bg-gradient-to-b from-blue-100/80 to-white p-6">
          <div className="text-xs tracking-widest text-green-600 font-semibold mb-4">MATCH SUMMARY</div>
          <div className="border border-gray-200 rounded-card bg-white overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center gap-8 md:gap-16">
                <div className="text-center">
                  <div className="text-2xs tracking-widest text-green-600/70 font-semibold mb-2">HOME</div>
                  <div className="text-5xl md:text-7xl font-bold text-green-600 leading-none">{telemetry.score_home ?? 0}</div>
                </div>
                <div className="text-3xl md:text-5xl font-bold text-gray-300 select-none">:</div>
                <div className="text-center">
                  <div className="text-2xs tracking-widest text-blue-600/70 font-semibold mb-2">AWAY</div>
                  <div className="text-5xl md:text-7xl font-bold text-blue-600 leading-none">{telemetry.score_away ?? 0}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-6">
                <span className="text-sm text-gray-500">{telemetry.minute}&apos;</span>
                <span className={`text-2xs px-4 py-1 border rounded-button font-semibold ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-gray-200">
            <div className="p-6 md:border-r border-gray-200 flex flex-col justify-center">
              <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-2">CONFIDENCE</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{pct(validation.overall_confidence)}</div>
              <GaugeBar value={validation.overall_confidence} max={1} color={cm?.color ?? "bg-gray-500"} />
              <div className="flex items-center justify-between mt-2">
                {cm && <span className={`text-2xs font-semibold ${cm.color}`}>{cm.label}</span>}
                <span className="text-2xs text-gray-600">Trust {pct(validation.trust_score)}</span>
              </div>
            </div>

            <div className="p-6">
              <div className="text-2xs tracking-widest text-yellow-600 font-semibold mb-2">CURRENT OUTLOOK</div>
              <div className="text-sm font-semibold text-gray-900 mb-4">{outlook}</div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-2xs mb-1">
                    <span className="text-green-600/70 font-semibold">HOME TERRITORY</span>
                    <span className="text-blue-600/70 font-semibold">AWAY TERRITORY</span>
                  </div>
                  <MomentumBar value={ftAdj} range={0.75} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-2xs text-gray-500 mb-1">
                      <span>Chaos</span>
                      <span>{swarmMetrics.chaos_probability}%</span>
                    </div>
                    <GaugeBar value={swarmMetrics.chaos_probability} max={100} color={swarmMetrics.chaos_probability >= 75 ? "bg-red-500" : swarmMetrics.chaos_probability >= 50 ? "bg-yellow-500" : "bg-gray-500"} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-2xs text-gray-500 mb-1">
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
        </div>

        <div className="rounded-card bg-gradient-to-b from-amber-100/80 to-white p-6">
          <div className="text-xs tracking-widest text-green-600 font-semibold mb-4">
            KEY MATCH METRICS
          </div>
          <div className="border border-gray-200 rounded-card bg-white p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <CompactMomentumCard
              label="TERRITORIAL TILT"
              value={ftAdj}
              range={0.75}
              color={ftAdj > 0.15 ? "text-green-600" : ftAdj < -0.15 ? "text-blue-600" : "text-gray-500"}
            />
            <CompactMomentumCard
              label="EXPECTED GOALS Δ"
              value={xgDelta}
              range={3}
              color={xgDelta > 0.3 ? "text-green-600" : xgDelta < -0.3 ? "text-blue-600" : "text-gray-500"}
            />
            <CompactGaugeCard
              label="FRACTURE INDEX"
              value={swarmMetrics.fracture_index}
              max={100}
              color={swarmMetrics.fracture_index >= 75 ? "text-red-600" : swarmMetrics.fracture_index >= 40 ? "text-yellow-600" : "text-green-600"}
              sub={swarmMetrics.fracture_index >= 75 ? "Critical" : swarmMetrics.fracture_index >= 40 ? "Elevated" : "Nominal"}
            />
            <CompactGaugeCard
              label="CHAOS PROBABILITY"
              value={swarmMetrics.chaos_probability}
              max={100}
              unit="%"
              color={swarmMetrics.chaos_probability >= 75 ? "text-red-600" : swarmMetrics.chaos_probability >= 50 ? "text-yellow-600" : "text-green-600"}
              sub={swarmMetrics.chaos_probability >= 75 ? "Critical" : swarmMetrics.chaos_probability >= 50 ? "Elevated" : "Nominal"}
            />
            <CompactGaugeCard
              label="FOUL ESCALATION"
              value={telemetry.foul_escalation ?? 0}
              max={10}
              color={telemetry.foul_escalation != null && telemetry.foul_escalation >= 5 ? "text-red-600" : telemetry.foul_escalation != null && telemetry.foul_escalation >= 3 ? "text-yellow-600" : "text-gray-900"}
              sub={telemetry.foul_escalation != null ? `${telemetry.foul_escalation} incidents` : "—"}
            />
            <CompactGaugeCard
              label="SPRINT DROP-OFF"
              value={telemetry.sprint_drop_off ?? 0}
              max={100}
              unit="%"
              color={telemetry.sprint_drop_off != null && telemetry.sprint_drop_off >= 20 ? "text-red-600" : telemetry.sprint_drop_off != null && telemetry.sprint_drop_off >= 10 ? "text-yellow-600" : "text-gray-900"}
              sub={telemetry.sprint_drop_off != null ? `${telemetry.sprint_drop_off}% fatigue` : "—"}
            />
          </div>
          </div>
        </div>

        <div className="rounded-card bg-gradient-to-b from-green-100/80 to-white p-6">
          <div className="text-xs tracking-widest text-green-600 font-semibold mb-4">
            PREDICTION
          </div>
          <div className="border border-gray-200 rounded-card bg-white p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
              <div className="text-2xs tracking-widest text-gray-500 mb-2">CONTRADICTIONS</div>
              <div className={`text-lg font-bold mb-1 ${validation.contradiction_count > 0 ? "text-yellow-600" : "text-green-600"}`}>
                {validation.contradiction_count}
              </div>
              <GaugeBar value={Math.min(validation.contradiction_count, 10)} max={10} color={validation.contradiction_count >= 5 ? "bg-red-500" : validation.contradiction_count > 0 ? "bg-yellow-500" : "bg-green-500"} />
              {validation.flags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {validation.flags.map((flag) => (
                    <span key={flag} className="text-2xs px-2 py-1 border border-gray-300 rounded-button text-gray-500 bg-gray-100">
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
              color={validation.agreement_score >= 0.7 ? "text-green-600" : validation.agreement_score >= 0.4 ? "text-yellow-600" : "text-red-600"}
              sub="Swarm Consensus"
            />
            <GaugeCard
              label="TRUST SCORE"
              value={validation.trust_score}
              max={1}
              unit=""
              color={validation.trust_score >= 0.7 ? "text-cyan-600" : validation.trust_score >= 0.4 ? "text-yellow-600" : "text-red-600"}
              sub="Prediction Reliability"
            />
            <div className="border border-gray-200 rounded-card bg-gray-50 p-4">
              <div className="text-2xs tracking-widest text-gray-500 mb-2">RISK INDICATOR</div>
              <div className={`text-lg font-bold mb-1 ${swarmMetrics.chaos_probability >= 75 ? "text-red-600" : swarmMetrics.chaos_probability >= 50 ? "text-yellow-600" : "text-green-600"}`}>
                {swarmMetrics.chaos_probability >= 75 ? "HIGH RISK" : swarmMetrics.chaos_probability >= 50 ? "ELEVATED" : "NOMINAL"}
              </div>
              <GaugeBar value={swarmMetrics.chaos_probability} max={100} color={swarmMetrics.chaos_probability >= 75 ? "bg-red-500" : swarmMetrics.chaos_probability >= 50 ? "bg-yellow-500" : "bg-green-500"} />
              <div className="text-2xs text-gray-600 mt-1">Chaos: {swarmMetrics.chaos_probability}%</div>
            </div>
          </div>
          {hasGranite && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="text-2xs tracking-widest text-gray-500 mb-1">DETAILED ANALYSIS</div>
              <div className="text-xs text-gray-600 leading-relaxed">{granite_review.review_summary}</div>
            </div>
          )}
          </div>
        </div>

        <div className="rounded-card bg-gradient-to-b from-purple-100/80 to-white p-6">
          <div className="text-xs tracking-widest text-green-600 font-semibold mb-4">EVENT FEED</div>
          <EventFeed />
        </div>
      </div>
    </div>
  );
}
