import { useMemo } from "react";
import { useKronos } from "../hooks/useKronos";
import { normalizeSwarmAgents } from "../lib/swarmNormalizer";
import { generateLeadCoachVerdict } from "../lib/verdictEngine";
import { CommandHeader } from "../components/layout/CommandHeader";
import { TranscriptSection } from "../components/transcript/TranscriptSection";
import { TranscriptEvent } from "../components/transcript/TranscriptEvent";
import type { Severity } from "../components/transcript/TranscriptEvent";

export function DebateTranscript() {
  const { debateOutputs, swarmMetrics, phase, telemetry, validation, granite_review } = useKronos();

  const agents = useMemo(() => normalizeSwarmAgents(debateOutputs), [debateOutputs]);

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

  const minute = telemetry.minute;

  const hasAgents = agents.length > 0;
  const hasValidation = validation && !validation.skipped;
  const hasGranite = granite_review && !granite_review.skipped;

  const validationSeverity: Severity =
    validation.contradiction_count >= 5
      ? "CRITICAL"
      : validation.contradiction_count > 0
        ? "WARNING"
        : validation.overall_confidence < 0.3
          ? "WATCH"
          : "INFO";

  const coachSeverity: Severity =
    verdict.status === "CRITICAL" ? "CRITICAL" : verdict.status === "WATCH" ? "WATCH" : "INFO";

  const hasAnyData = hasAgents || hasValidation || hasGranite;

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">
        <CommandHeader />

        <div className="rounded-card bg-gradient-to-b from-blue-100/80 to-white p-6">
          <div className="text-xs tracking-widest text-green-600 font-semibold mb-1">DEBATE TRANSCRIPT</div>
          <div className="text-2xs tracking-widest text-gray-600 mb-6">
            Structured reasoning across swarm agents, validation, and review layers.
          </div>

          {!hasAnyData ? (
            <div className="text-gray-500 text-sm">Awaiting intelligence feed...</div>
          ) : (
            <TranscriptSection minute={minute}>
              <div className="space-y-4">
                {agents.map((agent) => {
                  const paragraphs = agent.verdict.split("\n").filter(Boolean);
                  const severity: Severity = agent.riskLevel === "HIGH_RISK" ? "WARNING" : "INFO";
                  const statusBadge = agent.riskLevel === "HIGH_RISK" ? "HIGH RISK" : "NOMINAL";

                  return (
                    <TranscriptEvent
                      key={agent.id}
                      type="AGENT"
                      title={agent.displayName}
                      severity={severity}
                      statusBadge={statusBadge}
                    >
                      <div className="space-y-2">
                        {paragraphs.map((para, i) => (
                          <p key={i} className="text-xs leading-relaxed">{para}</p>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-4 text-2xs text-gray-400">
                        <span>
                          Confidence:{" "}
                          <span className={agent.riskLevel === "HIGH_RISK" ? "text-yellow-600" : "text-green-600"}>
                            {agent.riskLevel === "HIGH_RISK" ? "Low" : "High"}
                          </span>
                        </span>
                      </div>
                    </TranscriptEvent>
                  );
                })}
              </div>

              <TranscriptEvent
                type="VALIDATION"
                title="Validation Center"
                severity={validationSeverity}
                statusBadge={
                  validationSeverity === "INFO" ? "NOMINAL" : validationSeverity === "WATCH" ? "WATCH" : "CRITICAL"
                }
              >
                {!hasValidation ? (
                  <div className="text-gray-500 italic">Awaiting validation data...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500">Agreement: </span>
                        <span className="text-gray-900">{Math.round(validation.agreement_score * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Trust: </span>
                        <span className="text-gray-900">{Math.round(validation.trust_score * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Confidence: </span>
                        <span className="text-gray-900">{Math.round(validation.overall_confidence * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Contradictions: </span>
                        <span className={validation.contradiction_count > 0 ? "text-yellow-600" : "text-gray-900"}>
                          {validation.contradiction_count}
                        </span>
                      </div>
                    </div>
                    {validation.flags.length > 0 && (
                      <div className="mt-4">
                        <div className="text-2xs text-gray-500 mb-2">FLAGS</div>
                        <div className="flex flex-wrap gap-2">
                          {validation.flags.map((flag) => (
                            <span
                              key={flag}
                              className="text-2xs px-2 py-1 border border-gray-300 rounded-button text-gray-500 bg-gray-100"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {validation.evidence_summary && (
                      <div className="mt-2 text-gray-500 text-2xs">{validation.evidence_summary}</div>
                    )}
                  </>
                )}
              </TranscriptEvent>

              <TranscriptEvent
                type="GRANITE"
                title="Granite Review Terminal"
                severity={!hasGranite ? "INFO" : granite_review.escalation_triggered ? "WARNING" : "INFO"}
                statusBadge={!hasGranite ? "STANDBY" : "ACTIVE"}
              >
                {!hasGranite ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-600 text-xs">Swarm confidence remains healthy. No escalation required.</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-500">Granite Confidence: </span>
                      <span className="text-amber-600 font-semibold">{granite_review.granite_confidence}%</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-gray-500">Summary: </span>
                      <span className="text-gray-600">{granite_review.review_summary}</span>
                    </div>
                    {granite_review.recommended_action && (
                      <div className="mt-2">
                        <span className="text-gray-500">Recommended Action: </span>
                        <span className="text-gray-600">{granite_review.recommended_action}</span>
                      </div>
                    )}
                  </>
                )}
              </TranscriptEvent>

              <TranscriptEvent
                type="COACH"
                title="Lead Coach Verdict"
                severity={coachSeverity}
                statusBadge={verdict.status}
              >
                <div className="text-sm font-semibold text-gray-900">{verdict.headline}</div>
                <div className="text-gray-600 text-xs mt-2 leading-relaxed">{verdict.rationale}</div>
                {verdict.supportingSignals.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-2xs text-gray-500 mb-2">Supporting Signals</div>
                    <div className="space-y-2">
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
              </TranscriptEvent>
            </TranscriptSection>
          )}
        </div>
      </div>
    </div>
  );
}
