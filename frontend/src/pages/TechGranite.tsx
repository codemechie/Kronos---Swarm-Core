import { TechLayout } from "../components/layout/TechLayout";
import { GraniteTerminal } from "../components/granite/GraniteTerminal";

export function TechGranite() {
  return (
    <TechLayout
      accent="indigo"
      name="IBM Granite"
      tagline="Enterprise Explainability Layer"
      explanation="IBM Granite foundation models provide independent verification of AI-driven match analysis. Every swarm intelligence recommendation is cross-checked against Granite's external reasoning for provable provenance."
      whySection="Swarm intelligence can produce coherent but incorrect conclusions when consensus forms around a flawed premise. Granite provides an independent reasoning layer that validates swarm outputs without being influenced by the same bias patterns. This ensures every tactical recommendation is grounded in verifiable logic rather than groupthink. Granite is not part of the swarm — it is an external auditor that examines the same evidence and either confirms or challenges the consensus."
      integrationSection="Granite sits at the final stage of the Kronos intelligence pipeline. After the swarm debate completes and the heuristic validator assesses confidence, fracture, and contradictions, the GraniteReviewEngine determines whether escalation is warranted. When thresholds are met, a structured prompt containing the match context, all agent assessments, and validation flags is sent to the Granite API. The returned analysis is parsed into a GraniteReviewModel and surfaced alongside the Lead Coach Verdict — giving coaches both the recommendation and an independent second opinion."
      realUsageContent={<GraniteTerminal />}
      realUsageCaption="The Granite Review Terminal as rendered on the Granite Intelligence page."
      realUsageExplanation="The GraniteTerminal component displays the live Granite review output — escalation status, confidence score, intelligence summary, contradiction analysis, and recommended action. When Granite is in standby (no escalation triggered), the terminal shows current swarm health metrics. This terminal is the primary interface through which analysts interact with Granite's independent reasoning."
      contributions={[
        "Independent validation of swarm consensus through external LLM reasoning — a second opinion on every escalated match state",
        "Explainability layer that exposes Granite's reasoning, contradiction analysis, and confidence assessment in human-readable form",
        "Escalation-triggered architecture that preserves compute during stable match states and activates Granite only when meaningful disagreement or risk is detected",
        "Configurable escalation thresholds via environment variables — fracture index, confidence score, and contradiction count — tunable per deployment",
        "Backward-compatible data model that co-exists with heuristic validation, ensuring Granite review data integrates seamlessly into the existing recommendation payload",
      ]}
    />
  );
}
