import { useMemo } from "react";
import { useKronos } from "../hooks/useKronos";
import { normalizeSwarmAgents } from "../lib/swarmNormalizer";
import { calculateSwarmCohesion } from "../lib/swarmCohesion";
import { generateLeadCoachVerdict } from "../lib/verdictEngine";
import { CommandHeader } from "../components/layout/CommandHeader";

const stageAccents: Record<string, string> = {
  OBSERVE: "border-l-blue-600 bg-blue-50",
  ANALYZE: "border-l-indigo-600 bg-indigo-50",
  DEBATE: "border-l-violet-600 bg-violet-50",
  VALIDATE: "border-l-amber-600 bg-amber-50",
  GRANITE: "border-l-cyan-600 bg-cyan-50",
  RECOMMENDATION: "border-l-emerald-600 bg-emerald-50",
};

const agentAccents: Record<string, string> = {
  pragmatist: "text-blue-600",
  mood_ring: "text-pink-600",
  gambler: "text-amber-600",
  judge: "text-purple-600",
  anarchist: "text-red-600",
};

const flagColors: Record<string, string> = {
  HIGH_FRACTURE: "text-red-600 border-red-200 bg-red-50",
  CONTRADICTORY_VERDICTS: "text-orange-600 border-orange-200 bg-orange-50",
  LOW_CONFIDENCE: "text-yellow-600 border-yellow-200 bg-yellow-50",
  AGENT_FAILURE: "text-purple-600 border-purple-200 bg-purple-50",
  NO_CONSENSUS: "text-cyan-600 border-cyan-200 bg-cyan-50",
};

function pct(v: number | undefined | null): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

function confidenceLabel(pctValue: number | undefined | null): { label: string; color: string } | null {
  if (pctValue == null) return null;
  if (pctValue >= 90) return { label: "HIGH CONFIDENCE", color: "text-green-600" };
  if (pctValue >= 70) return { label: "STRONG CONFIDENCE", color: "text-cyan-600" };
  if (pctValue >= 50) return { label: "MODERATE CONFIDENCE", color: "text-blue-600" };
  if (pctValue >= 30) return { label: "LOW CONFIDENCE", color: "text-yellow-600" };
  return { label: "CRITICAL UNCERTAINTY", color: "text-red-600" };
}

function Arrow() {
  return <div className="flex justify-center leading-none py-1"><span className="text-gray-300 text-sm">↓</span></div>;
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
    <div className="min-h-screen bg-gray-50 p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">
        <CommandHeader />

        <div className="rounded-card bg-gradient-to-b from-blue-100/80 to-white p-6">
          <div className="text-xs tracking-widest text-green-600 font-semibold mb-1">GRANITE INTELLIGENCE CENTER</div>
          <div className="text-2xs tracking-widest text-gray-600 mb-6">
            Independent validation and decision provenance for every recommendation.
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-6">
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-gray-500 mb-1">FRACTURE INDEX</div>
              <div className={`text-sm font-bold ${swarmMetrics.fracture_index >= 75 ? "text-red-600" : "text-gray-900"}`}>
                {swarmMetrics.fracture_index}
              </div>
              <div className="text-gray-500 text-2xs mt-1">
                {swarmMetrics.fracture_index >= 75 ? "Escalation threshold" : "Normal range"}
              </div>
            </div>
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-gray-500 mb-1">CONFIDENCE</div>
              <div className={`text-sm font-bold ${validation.overall_confidence <= 0.3 ? "text-red-600" : "text-gray-900"}`}>
                {pct(validation.overall_confidence)}
              </div>
              {(() => {
                const cl = confidenceLabel(validation.overall_confidence != null ? Math.round(validation.overall_confidence * 100) : null);
                return cl ? (
                  <div className={`text-2xs mt-1 ${cl.color}`}>{cl.label}</div>
                ) : (
                  <div className="text-gray-500 text-2xs mt-1">—</div>
                );
              })()}
            </div>
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-gray-500 mb-1">CONTRADICTIONS</div>
              <div className={`text-sm font-bold ${validation.contradiction_count >= 5 ? "text-red-600" : validation.contradiction_count > 0 ? "text-yellow-600" : "text-gray-900"}`}>
                {validation.contradiction_count}
              </div>
              <div className="text-gray-500 text-2xs mt-1">
                {validation.contradiction_count >= 5 ? "Critical" : validation.contradiction_count > 0 ? "Warning" : "None"}
              </div>
            </div>
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-gray-500 mb-1">ESCALATION STATUS</div>
              <div className={`text-sm font-bold ${graniteStatus === "ACTIVE" ? "text-amber-600" : graniteStatus === "STANDBY" ? "text-green-600" : "text-gray-500"}`}>
                {graniteStatus}
              </div>
              <div className="text-gray-500 text-2xs mt-1">
                {graniteStatus === "ACTIVE" ? "Granite review triggered" : graniteStatus === "STANDBY" ? "Not required" : "Degraded"}
              </div>
            </div>
          </div>

          <div className="text-2xs tracking-widest text-green-600 font-semibold mb-4">DECISION TRACE</div>

          <div className="space-y-0">
            <div className={`border-l-4 rounded-card border border-gray-200 bg-white p-4 ${stageAccents.OBSERVE}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs tracking-widest text-blue-600 font-bold">OBSERVE</span>
                <span className="text-2xs text-gray-400">Raw telemetry</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 text-2xs">Minute</span>
                  <div className="text-gray-900 font-semibold">{telemetry.minute}</div>
                </div>
                <div>
                  <span className="text-gray-500 text-2xs">Phase</span>
                  <div className={`font-semibold ${phase === "CHAOS" ? "text-red-600" : phase === "WEATHER" ? "text-yellow-600" : "text-green-600"}`}>
                    {phase}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-2xs">Score</span>
                  <div className="text-gray-900 font-semibold">
                    {telemetry.score_home != null ? `${telemetry.score_home} – ${telemetry.score_away ?? "—"}` : "—"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-2xs">PPDA</span>
                  <div className="text-gray-900 font-semibold">{telemetry.ppda ?? "—"}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-2xs">
                {telemetry.panic_index != null && (
                  <span className={telemetry.panic_index >= 0.7 ? "text-yellow-600" : "text-gray-500"}>
                    Panic: {telemetry.panic_index}
                  </span>
                )}
                {telemetry.crowd_decibels != null && (
                  <span className={telemetry.crowd_decibels >= 90 ? "text-yellow-600" : "text-gray-500"}>
                    Crowd: {telemetry.crowd_decibels} dB
                  </span>
                )}
                {telemetry.pitch_slickness != null && (
                  <span className={telemetry.pitch_slickness >= 0.7 ? "text-yellow-600" : "text-gray-500"}>
                    Slickness: {telemetry.pitch_slickness}
                  </span>
                )}
                {telemetry.foul_escalation != null && (
                  <span className={telemetry.foul_escalation >= 5 ? "text-yellow-600" : "text-gray-500"}>
                    Fouls: {telemetry.foul_escalation}
                  </span>
                )}
              </div>
            </div>

            <Arrow />

            <div className={`border-l-4 rounded-card border border-gray-200 bg-white p-4 ${stageAccents.ANALYZE}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs tracking-widest text-indigo-600 font-bold">ANALYZE</span>
                <span className="text-2xs text-gray-400">Swarm agents</span>
              </div>
              {!hasAgents ? (
                <div className="text-gray-500 text-xs">Awaiting agent intelligence...</div>
              ) : (
                <>
                  <div className="text-2xs text-gray-500 mb-2">
                    {agents.length} active agent{agents.length !== 1 ? "s" : ""}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    {agents.map((agent) => (
                      <div key={agent.id} className="border border-gray-200 rounded-card bg-gray-50 p-2">
                        <div className={`text-2xs font-semibold ${agentAccents[agent.id] ?? "text-gray-700"}`}>
                          {agent.displayName}
                        </div>
                        <div className={`text-2xs mt-1 ${agent.riskLevel === "HIGH_RISK" ? "text-red-600" : "text-green-600"}`}>
                          {agent.riskLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Arrow />

            <div className={`border-l-4 rounded-card border border-gray-200 bg-white p-4 ${stageAccents.DEBATE}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs tracking-widest text-violet-600 font-bold">DEBATE</span>
                <span className="text-2xs text-gray-400">Consensus metrics</span>
              </div>
              {!hasAgents ? (
                <div className="text-gray-500 text-xs">Awaiting debate data...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 text-2xs">Fracture Index</span>
                    <div className={`text-sm font-bold ${swarmMetrics.fracture_index >= 75 ? "text-red-600" : swarmMetrics.fracture_index >= 40 ? "text-yellow-600" : "text-gray-900"}`}>
                      {swarmMetrics.fracture_index}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-2xs">Chaos Probability</span>
                    <div className={`text-sm font-bold ${swarmMetrics.chaos_probability >= 75 ? "text-red-600" : swarmMetrics.chaos_probability >= 50 ? "text-yellow-600" : "text-gray-900"}`}>
                      {swarmMetrics.chaos_probability}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-2xs">Consensus</span>
                    <div className="text-sm font-bold text-gray-900">{cohesion.consensusPercent}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-2xs">Cohesion</span>
                    <div className={`text-sm font-bold ${cohesion.status === "COHESIVE" ? "text-green-600" : cohesion.status === "FRACTURED" ? "text-yellow-600" : "text-red-600"}`}>
                      {cohesion.status}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Arrow />

            <div className={`border-l-4 rounded-card border border-gray-200 bg-white p-4 ${stageAccents.VALIDATE}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs tracking-widest text-amber-600 font-bold">VALIDATE</span>
                <span className="text-2xs text-gray-400">Heuristic validation</span>
              </div>
              {!hasValidation ? (
                <div className="text-gray-500 text-xs">Awaiting validation data...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                    <div>
                      <span className="text-gray-500 text-2xs">Agreement</span>
                      <div className="text-sm font-bold text-gray-900">{pct(validation.agreement_score)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-2xs">Contradictions</span>
                      <div className={`text-sm font-bold ${validation.contradiction_count >= 5 ? "text-red-600" : validation.contradiction_count > 0 ? "text-yellow-600" : "text-gray-900"}`}>
                        {validation.contradiction_count}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-2xs">Confidence</span>
                      <div className="text-sm font-bold text-gray-900">{pct(validation.overall_confidence)}</div>
                      {(() => {
                        const cl = confidenceLabel(validation.overall_confidence != null ? Math.round(validation.overall_confidence * 100) : null);
                        return cl ? <div className={`text-2xs mt-1 ${cl.color}`}>{cl.label}</div> : null;
                      })()}
                    </div>
                    <div>
                      <span className="text-gray-500 text-2xs">Trust Score</span>
                      <div className="text-sm font-bold text-gray-900">{pct(validation.trust_score)}</div>
                      {(() => {
                        const cl = confidenceLabel(validation.trust_score != null ? Math.round(validation.trust_score * 100) : null);
                        return cl ? <div className={`text-2xs mt-1 ${cl.color}`}>{cl.label}</div> : null;
                      })()}
                    </div>
                  </div>
                  {validation.flags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {validation.flags.map((flag) => (
                        <span key={flag} className={`text-2xs px-2 py-1 border rounded-button ${flagColors[flag] ?? "text-gray-500 border-gray-300 bg-gray-100"}`}>
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                  {validation.evidence_summary && (
                    <div className="text-2xs text-gray-500 border-t border-gray-200 pt-2">
                      {validation.evidence_summary}
                    </div>
                  )}
                </>
              )}
            </div>

            <Arrow />

            <div className={`border-l-4 rounded-card border border-gray-200 bg-white p-4 ${stageAccents.GRANITE}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs tracking-widest text-cyan-600 font-bold">GRANITE REVIEW</span>
                <span className={`text-2xs px-2 py-1 border rounded-button font-semibold ${
                  graniteStatus === "ACTIVE"
                    ? "text-amber-600 border-amber-200"
                    : graniteStatus === "STANDBY"
                      ? "text-green-600 border-green-200"
                      : "text-gray-500 border-gray-300"
                }`}>
                  [{graniteStatus}]
                </span>
              </div>
              {!hasGranite ? (
                <div className="text-gray-500 text-xs space-y-1">
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
                  <div className="grid grid-cols-3 gap-4 text-xs mb-4">
                    <div>
                      <span className="text-gray-500 text-2xs">Confidence</span>
                      <div className="text-sm font-bold text-amber-600">{granite_review.granite_confidence}%</div>
                      {(() => {
                        const cl = confidenceLabel(granite_review.granite_confidence);
                        return cl ? <div className={`text-2xs mt-1 ${cl.color}`}>{cl.label}</div> : null;
                      })()}
                    </div>
                    <div>
                      <span className="text-gray-500 text-2xs">Escalation</span>
                      <div className={`text-sm font-bold ${escalationActive ? "text-red-600" : "text-green-600"}`}>
                        {escalationActive ? "TRIGGERED" : "NOT TRIGGERED"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-2xs">Provider</span>
                      <div className="text-sm font-bold text-gray-900">{granite_review.provider}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="border-t border-gray-200 pt-2">
                      <span className="text-gray-500 text-2xs">Summary</span>
                      <div className="text-gray-600 mt-1">{granite_review.review_summary}</div>
                    </div>
                    {granite_review.recommended_action && (
                      <div className="border-t border-gray-200 pt-2">
                        <span className="text-gray-500 text-2xs">Recommended Action</span>
                        <div className="text-gray-600 mt-1">{granite_review.recommended_action}</div>
                      </div>
                    )}
                    {granite_review.contradiction_analysis && (
                      <div className="border-t border-gray-200 pt-2">
                        <span className="text-gray-500 text-2xs">Contradiction Analysis</span>
                        <div className="text-gray-600 mt-1">{granite_review.contradiction_analysis}</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <Arrow />

            <div className={`border-l-4 rounded-card border border-gray-200 bg-white p-4 ${stageAccents.RECOMMENDATION}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs tracking-widest text-emerald-600 font-bold">RECOMMENDATION</span>
                <span className={`text-2xs px-2 py-1 border rounded-button font-semibold ${
                  verdict.status === "CRITICAL"
                    ? "text-red-600 border-red-200"
                    : verdict.status === "WATCH"
                      ? "text-yellow-600 border-yellow-200"
                      : "text-green-600 border-green-200"
                }`}>
                  [{verdict.status}]
                </span>
              </div>
              {!hasAgents ? (
                <div className="text-gray-500 text-xs">Awaiting sufficient data for recommendation...</div>
              ) : (
                <>
                  <div className="text-base font-semibold text-gray-900 mb-2">{verdict.headline}</div>
                  <div className="text-xs text-gray-600 mb-4 leading-relaxed">{verdict.rationale}</div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {verdict.supportingAgents.length > 0 && (
                      <div>
                        <span className="text-gray-500 text-2xs">Supporting Agents</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {verdict.supportingAgents.map((name) => (
                            <span key={name} className="text-2xs px-2 py-1 border border-gray-300 rounded-button text-gray-600 bg-gray-100">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {verdict.supportingSignals.length > 0 && (
                      <div>
                        <span className="text-gray-500 text-2xs">Supporting Signals</span>
                        <div className="space-y-2 mt-1">
                          {verdict.supportingSignals.map((sig, i) => (
                            <div key={i} className="text-2xs">
                              <span className={`font-semibold ${
                                sig.category === "AGENT" ? "text-blue-600" :
                                sig.category === "FRACTURE" ? "text-purple-600" :
                                sig.category === "CHAOS" ? "text-orange-600" :
                                sig.category === "TELEMETRY" ? "text-cyan-600" :
                                "text-gray-500"
                              }`}>[{sig.category}]</span>{" "}
                              <span className="text-gray-500">{sig.message}</span>
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
