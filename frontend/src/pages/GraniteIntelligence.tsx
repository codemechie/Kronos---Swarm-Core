import { useMemo } from "react";
import { useKronos } from "../hooks/useKronos";
import { normalizeSwarmAgents } from "../lib/swarmNormalizer";
import { calculateSwarmCohesion } from "../lib/swarmCohesion";
import { generateLeadCoachVerdict } from "../lib/verdictEngine";
import { CommandHeader } from "../components/layout/CommandHeader";

const stageAccents: Record<string, string> = {
  OBSERVE: "border-l-blue-600 bg-blue-900/10",
  ANALYZE: "border-l-indigo-600 bg-indigo-900/10",
  DEBATE: "border-l-violet-600 bg-violet-900/10",
  VALIDATE: "border-l-amber-600 bg-amber-900/10",
  GRANITE: "border-l-cyan-600 bg-cyan-900/10",
  RECOMMENDATION: "border-l-emerald-600 bg-emerald-900/10",
};

const agentAccents: Record<string, string> = {
  pragmatist: "text-blue-400",
  mood_ring: "text-pink-400",
  gambler: "text-amber-400",
  judge: "text-purple-400",
  anarchist: "text-red-400",
};

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

function confidenceLabel(pctValue: number | undefined | null): { label: string; color: string } | null {
  if (pctValue == null) return null;
  if (pctValue >= 90) return { label: "HIGH CONFIDENCE", color: "text-green-400" };
  if (pctValue >= 70) return { label: "STRONG CONFIDENCE", color: "text-cyan-400" };
  if (pctValue >= 50) return { label: "MODERATE CONFIDENCE", color: "text-blue-400" };
  if (pctValue >= 30) return { label: "LOW CONFIDENCE", color: "text-yellow-400" };
  return { label: "CRITICAL UNCERTAINTY", color: "text-red-400" };
}

function Arrow() {
  return <div className="flex justify-center leading-none my-0.5"><span className="text-gray-700 text-xs">↓</span></div>;
}

function GraniteIntelligence() {
  const { telemetry, swarmMetrics, debateOutputs, phase, validation, granite_review } = useKronos();

  const agents = useMemo(() => normalizeSwarmAgents(debateOutputs), [debateOutputs]);
  const cohesion = useMemo(() => calculateSwarmCohesion(agents), [agents]);
  const verdict = useMemo(
    () =>
      generateLeadCoachVerdict({
        agents,
        fractureIndex: swarmMetrics.fracture_index,
        chaosProbability: swarmMetrics.chaos_probability,
        phase,
        telemetry,
      }),
    [agents, swarmMetrics.fracture_index, swarmMetrics.chaos_probability, phase, telemetry],
  );

  const hasAgents = agents.length > 0;
  const hasValidation = validation && !validation.skipped;
  const hasGranite = granite_review && !granite_review.skipped;

  const graniteStatus = !granite_review
    ? "UNAVAILABLE"
    : granite_review.skipped
      ? "STANDBY"
      : "ACTIVE";

  const escalationActive = granite_review?.escalation_triggered ?? false;

  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-4">
        <CommandHeader />

        <div className="border border-gray-700 rounded bg-gray-900 p-3">
          <div className="text-xs tracking-widest text-gray-500 mb-2">GRANITE INTELLIGENCE CENTER</div>

          {/* ── Escalation Overview ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
            <div className="border border-gray-700 rounded bg-gray-950 p-2">
              <div className="text-[9px] tracking-widest text-gray-600">FRACTURE INDEX</div>
              <div className={`text-sm font-bold ${swarmMetrics.fracture_index >= 75 ? "text-red-400" : "text-white"}`}>
                {swarmMetrics.fracture_index}
              </div>
              <div className="text-gray-600 text-[9px]">
                {swarmMetrics.fracture_index >= 75 ? "Escalation threshold" : "Normal range"}
              </div>
            </div>
            <div className="border border-gray-700 rounded bg-gray-950 p-2">
              <div className="text-[9px] tracking-widest text-gray-600">CONFIDENCE</div>
              <div className={`text-sm font-bold ${validation.overall_confidence <= 0.3 ? "text-red-400" : "text-white"}`}>
                {pct(validation.overall_confidence)}
              </div>
              {(() => {
                const cl = confidenceLabel(validation.overall_confidence != null ? Math.round(validation.overall_confidence * 100) : null);
                return cl ? (
                  <div className={`text-[9px] ${cl.color}`}>{cl.label}</div>
                ) : (
                  <div className="text-gray-600 text-[9px]">—</div>
                );
              })()}
            </div>
            <div className="border border-gray-700 rounded bg-gray-950 p-2">
              <div className="text-[9px] tracking-widest text-gray-600">CONTRADICTIONS</div>
              <div className={`text-sm font-bold ${validation.contradiction_count >= 5 ? "text-red-400" : validation.contradiction_count > 0 ? "text-yellow-400" : "text-white"}`}>
                {validation.contradiction_count}
              </div>
              <div className="text-gray-600 text-[9px]">
                {validation.contradiction_count >= 5 ? "Critical" : validation.contradiction_count > 0 ? "Warning" : "None"}
              </div>
            </div>
            <div className="border border-gray-700 rounded bg-gray-950 p-2">
              <div className="text-[9px] tracking-widest text-gray-600">ESCALATION STATUS</div>
              <div className={`text-sm font-bold ${graniteStatus === "ACTIVE" ? "text-amber-400" : graniteStatus === "STANDBY" ? "text-green-400" : "text-gray-500"}`}>
                {graniteStatus}
              </div>
              <div className="text-gray-600 text-[9px]">
                {graniteStatus === "ACTIVE" ? "Granite review triggered" : graniteStatus === "STANDBY" ? "Not required" : "Degraded"}
              </div>
            </div>
          </div>

          {/* ── Decision Trace ── */}
          <div className="space-y-0">
            {/* 01 — OBSERVE */}
            <div className={`border-l-4 rounded border border-gray-700 bg-gray-950 p-2.5 ${stageAccents.OBSERVE}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs tracking-widest text-blue-400 font-bold">OBSERVE</span>
                <span className="text-[9px] text-gray-600/70">Raw telemetry</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-600 text-[9px]">Minute</span>
                  <div className="text-white font-semibold">{telemetry.minute}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-[9px]">Phase</span>
                  <div className={`font-semibold ${phase === "CHAOS" ? "text-red-400" : phase === "WEATHER" ? "text-yellow-400" : "text-green-400"}`}>
                    {phase}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 text-[9px]">Score</span>
                  <div className="text-white font-semibold">
                    {telemetry.score_home != null ? `${telemetry.score_home} – ${telemetry.score_away ?? "—"}` : "—"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 text-[9px]">PPDA</span>
                  <div className="text-white font-semibold">{telemetry.ppda ?? "—"}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[9px]">
                {telemetry.panic_index != null && (
                  <span className={telemetry.panic_index >= 0.7 ? "text-yellow-400" : "text-gray-400"}>
                    Panic: {telemetry.panic_index}
                  </span>
                )}
                {telemetry.crowd_decibels != null && (
                  <span className={telemetry.crowd_decibels >= 90 ? "text-yellow-400" : "text-gray-400"}>
                    Crowd: {telemetry.crowd_decibels} dB
                  </span>
                )}
                {telemetry.pitch_slickness != null && (
                  <span className={telemetry.pitch_slickness >= 0.7 ? "text-yellow-400" : "text-gray-400"}>
                    Slickness: {telemetry.pitch_slickness}
                  </span>
                )}
                {telemetry.foul_escalation != null && (
                  <span className={telemetry.foul_escalation >= 5 ? "text-yellow-400" : "text-gray-400"}>
                    Fouls: {telemetry.foul_escalation}
                  </span>
                )}
              </div>
            </div>

            <Arrow />

            {/* 02 — ANALYZE */}
            <div className={`border-l-4 rounded border border-gray-700 bg-gray-950 p-2.5 ${stageAccents.ANALYZE}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs tracking-widest text-indigo-400 font-bold">ANALYZE</span>
                <span className="text-[9px] text-gray-600/70">Swarm agents</span>
              </div>
              {!hasAgents ? (
                <div className="text-gray-500 text-xs">Awaiting agent intelligence...</div>
              ) : (
                <>
                  <div className="text-[10px] text-gray-600 mb-1.5">
                    {agents.length} active agent{agents.length !== 1 ? "s" : ""}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 text-xs">
                    {agents.map((agent) => (
                      <div key={agent.id} className="border border-gray-700 rounded bg-gray-900 p-1.5">
                        <div className={`text-[10px] font-semibold ${agentAccents[agent.id] ?? "text-gray-300"}`}>
                          {agent.displayName}
                        </div>
                        <div className={`text-[9px] ${agent.riskLevel === "HIGH_RISK" ? "text-red-400" : "text-green-400"}`}>
                          {agent.riskLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Arrow />

            {/* 03 — DEBATE */}
            <div className={`border-l-4 rounded border border-gray-700 bg-gray-950 p-2.5 ${stageAccents.DEBATE}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs tracking-widest text-violet-400 font-bold">DEBATE</span>
                <span className="text-[9px] text-gray-600/70">Consensus metrics</span>
              </div>
              {!hasAgents ? (
                <div className="text-gray-500 text-xs">Awaiting debate data...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600 text-[9px]">Fracture Index</span>
                    <div className={`text-sm font-bold ${swarmMetrics.fracture_index >= 75 ? "text-red-400" : swarmMetrics.fracture_index >= 40 ? "text-yellow-400" : "text-white"}`}>
                      {swarmMetrics.fracture_index}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-[9px]">Chaos Probability</span>
                    <div className={`text-sm font-bold ${swarmMetrics.chaos_probability >= 75 ? "text-red-400" : swarmMetrics.chaos_probability >= 50 ? "text-yellow-400" : "text-white"}`}>
                      {swarmMetrics.chaos_probability}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-[9px]">Consensus</span>
                    <div className="text-sm font-bold text-white">{cohesion.consensusPercent}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600 text-[9px]">Cohesion</span>
                    <div className={`text-sm font-bold ${cohesion.status === "COHESIVE" ? "text-green-400" : cohesion.status === "FRACTURED" ? "text-yellow-400" : "text-red-400"}`}>
                      {cohesion.status}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Arrow />

            {/* 04 — VALIDATE */}
            <div className={`border-l-4 rounded border border-gray-700 bg-gray-950 p-2.5 ${stageAccents.VALIDATE}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs tracking-widest text-amber-400 font-bold">VALIDATE</span>
                <span className="text-[9px] text-gray-600/70">Heuristic validation</span>
              </div>
              {!hasValidation ? (
                <div className="text-gray-500 text-xs">Awaiting validation data...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-gray-600 text-[9px]">Agreement</span>
                      <div className="text-sm font-bold text-white">{pct(validation.agreement_score)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600 text-[9px]">Contradictions</span>
                      <div className={`text-sm font-bold ${validation.contradiction_count >= 5 ? "text-red-400" : validation.contradiction_count > 0 ? "text-yellow-400" : "text-white"}`}>
                        {validation.contradiction_count}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 text-[9px]">Confidence</span>
                      <div className="text-sm font-bold text-white">{pct(validation.overall_confidence)}</div>
                      {(() => {
                        const cl = confidenceLabel(validation.overall_confidence != null ? Math.round(validation.overall_confidence * 100) : null);
                        return cl ? <div className={`text-[8px] ${cl.color}`}>{cl.label}</div> : null;
                      })()}
                    </div>
                    <div>
                      <span className="text-gray-600 text-[9px]">Trust Score</span>
                      <div className="text-sm font-bold text-white">{pct(validation.trust_score)}</div>
                      {(() => {
                        const cl = confidenceLabel(validation.trust_score != null ? Math.round(validation.trust_score * 100) : null);
                        return cl ? <div className={`text-[8px] ${cl.color}`}>{cl.label}</div> : null;
                      })()}
                    </div>
                  </div>
                  {validation.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {validation.flags.map((flag) => (
                        <span key={flag} className={`text-[9px] px-1.5 py-0.5 border rounded ${flagColors[flag] ?? "text-gray-400 border-gray-600 bg-gray-800"}`}>
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                  {validation.evidence_summary && (
                    <div className="text-[10px] text-gray-400 border-t border-gray-800 pt-1">
                      {validation.evidence_summary}
                    </div>
                  )}
                </>
              )}
            </div>

            <Arrow />

            {/* 05 — GRANITE REVIEW */}
            <div className={`border-l-4 rounded border border-gray-700 bg-gray-950 p-2.5 ${stageAccents.GRANITE}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs tracking-widest text-cyan-400 font-bold">GRANITE REVIEW</span>
                <span className={`text-[9px] px-1.5 py-0.5 border rounded ${
                  graniteStatus === "ACTIVE"
                    ? "text-amber-400 border-amber-700"
                    : graniteStatus === "STANDBY"
                      ? "text-green-400 border-green-700"
                      : "text-gray-500 border-gray-700"
                }`}>
                  [{graniteStatus}]
                </span>
              </div>
              {!hasGranite ? (
                <div className="text-gray-500 text-xs space-y-0.5">
                  {graniteStatus === "STANDBY" ? (
                    <div>Swarm confidence remains healthy. No escalation required.</div>
                  ) : (
                    <>
                      <div>Granite review currently unavailable.</div>
                      <div>System operating in graceful-degradation mode using heuristic validation.</div>
                      <div>Decision pipeline remains fully operational.</div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-gray-600 text-[9px]">Confidence</span>
                      <div className="text-sm font-bold text-amber-400">{granite_review.granite_confidence}%</div>
                      {(() => {
                        const cl = confidenceLabel(granite_review.granite_confidence);
                        return cl ? <div className={`text-[8px] ${cl.color}`}>{cl.label}</div> : null;
                      })()}
                    </div>
                    <div>
                      <span className="text-gray-600 text-[9px]">Escalation</span>
                      <div className={`text-sm font-bold ${escalationActive ? "text-red-400" : "text-green-400"}`}>
                        {escalationActive ? "TRIGGERED" : "NOT TRIGGERED"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 text-[9px]">Provider</span>
                      <div className="text-sm font-bold text-white">{granite_review.provider}</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="border-t border-gray-800 pt-1">
                      <span className="text-gray-600 text-[9px]">Summary</span>
                      <div className="text-gray-300 mt-0.5">{granite_review.review_summary}</div>
                    </div>
                    {granite_review.recommended_action && (
                      <div className="border-t border-gray-800 pt-1">
                        <span className="text-gray-600 text-[9px]">Recommended Action</span>
                        <div className="text-gray-300 mt-0.5">{granite_review.recommended_action}</div>
                      </div>
                    )}
                    {granite_review.contradiction_analysis && (
                      <div className="border-t border-gray-800 pt-1">
                        <span className="text-gray-600 text-[9px]">Contradiction Analysis</span>
                        <div className="text-gray-300 mt-0.5">{granite_review.contradiction_analysis}</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <Arrow />

            {/* 06 — RECOMMENDATION */}
            <div className={`border-l-4 rounded border border-gray-700 bg-gray-950 p-3 ${stageAccents.RECOMMENDATION}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs tracking-widest text-emerald-400 font-bold">RECOMMENDATION</span>
                <span className={`text-[10px] px-2 py-0.5 border rounded ${
                  verdict.status === "CRITICAL"
                    ? "text-red-400 border-red-700"
                    : verdict.status === "WATCH"
                      ? "text-yellow-400 border-yellow-700"
                      : "text-green-400 border-green-700"
                }`}>
                  [{verdict.status}]
                </span>
              </div>
              {!hasAgents ? (
                <div className="text-gray-500 text-xs">Awaiting sufficient data for recommendation...</div>
              ) : (
                <>
                  <div className="text-sm font-semibold text-gray-200 mb-1">{verdict.headline}</div>
                  <div className="text-xs text-gray-400 mb-2">{verdict.rationale}</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {verdict.supportingAgents.length > 0 && (
                      <div>
                          <span className="text-gray-600 text-[10px]">Supporting Agents</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {verdict.supportingAgents.map((name) => (
                            <span key={name} className="text-[10px] px-1.5 py-0.5 border border-gray-700 rounded text-gray-300">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {verdict.supportingSignals.length > 0 && (
                      <div>
                          <span className="text-gray-600 text-[10px]">Supporting Signals</span>
                        <div className="space-y-0.5 mt-0.5">
                          {verdict.supportingSignals.map((sig, i) => (
                            <div key={i} className="text-[10px] text-gray-400">
                              [{sig.category}] {sig.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { GraniteIntelligence };
