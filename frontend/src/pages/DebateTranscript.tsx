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
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-4">
        <CommandHeader />

        <div className="border border-gray-700 rounded bg-gray-900 p-4">
          <div className="text-xs tracking-widest text-gray-500 mb-1">DEBATE TRANSCRIPT</div>
          <div className="text-[10px] tracking-widest text-gray-600 mb-4">
            Structured reasoning across swarm agents, validation, and review layers.
          </div>

          {!hasAnyData ? (
            <div className="text-gray-500 text-sm">Awaiting intelligence feed...</div>
          ) : (
            <TranscriptSection minute={minute}>
              <div className="space-y-2">
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
                      <div className="space-y-1.5">
                        {paragraphs.map((para, i) => (
                          <p key={i} className="text-xs leading-relaxed">{para}</p>
                        ))}
                      </div>
                      <div className="flex gap-3 mt-2 text-[10px] text-gray-600/70">
                        <span>
                          Confidence:{" "}
                          <span className={agent.riskLevel === "HIGH_RISK" ? "text-yellow-400/70" : "text-green-400/70"}>
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-600">Agreement: </span>
                        <span className="text-white">{Math.round(validation.agreement_score * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Trust: </span>
                        <span className="text-white">{Math.round(validation.trust_score * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Confidence: </span>
                        <span className="text-white">{Math.round(validation.overall_confidence * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Contradictions: </span>
                        <span className={validation.contradiction_count > 0 ? "text-yellow-400" : "text-white"}>
                          {validation.contradiction_count}
                        </span>
                      </div>
                    </div>
                    {validation.flags.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] text-gray-600 mb-1">Flags</div>
                        <div className="flex flex-wrap gap-1">
                          {validation.flags.map((flag) => (
                            <span
                              key={flag}
                              className="text-[10px] px-1.5 py-0.5 border border-gray-700 rounded text-gray-400"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {validation.evidence_summary && (
                      <div className="mt-2 text-gray-400 text-[10px]">{validation.evidence_summary}</div>
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
                    <span className="text-green-400">Swarm confidence remains healthy. No escalation required.</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-600">Granite Confidence: </span>
                      <span className="text-amber-400">{granite_review.granite_confidence}%</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-600">Summary: </span>
                      <span className="text-gray-300">{granite_review.review_summary}</span>
                    </div>
                    {granite_review.recommended_action && (
                      <div className="mt-1">
                        <span className="text-gray-600">Recommended Action: </span>
                        <span className="text-gray-300">{granite_review.recommended_action}</span>
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
                <div className="text-sm font-semibold text-gray-200">{verdict.headline}</div>
                <div className="text-gray-400 text-[10px] mt-1">{verdict.rationale}</div>
                {verdict.supportingSignals.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-600 mb-1">Supporting Signals</div>
                    <div className="space-y-0.5">
                      {verdict.supportingSignals.map((sig, i) => (
                        <div key={i} className="text-[10px] text-gray-400">
                          [{sig.category}] {sig.message}
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
