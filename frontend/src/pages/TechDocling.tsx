import { TechLayout } from "../components/layout/TechLayout";
import { DoclingPipeline } from "../components/docling/DoclingPipeline";

export function TechDocling() {
  return (
    <TechLayout
      accent="cyan"
      name="IBM Docling"
      tagline="Structured Football Knowledge"
      explanation="IBM Docling transforms raw football data — agent debate outputs, live telemetry streams, and tactical scouting reports — into structured, typed assets that the Kronos engine can consume reliably. Its document understanding capabilities enable the automated ingestion of diverse information sources into a uniform canonical format."
      whySection="Football intelligence arrives in many forms: free-text agent verdicts, numeric telemetry streams, PDF scouting reports, and handwritten tactical notes. Each source has its own structure, vocabulary, and level of precision. IBM Docling was used to design and validate the structured data contracts — the TypeScript interfaces, normalizer functions, and canonical shapes — that unify these disparate inputs into a consistent runtime model. Without this structured layer, each agent would interpret the match state differently, leading to incompatible assessments and unreliable consensus."
      integrationSection="Docling operates at the ingestion boundary of the Kronos intelligence pipeline. Raw debate outputs from the five swarm agents arrive as free-text strings keyed by agent name. Docling's structured processing approach informed the `normalizeSwarmAgents` function that converts these into typed `SwarmAgent[]` arrays with consistent `id`, `displayName`, `verdict`, and `riskLevel` fields. Similarly, raw SSE packets are normalized through `normalizeKronosPacket` into typed `Telemetry`, `SwarmMetrics`, `GraniteReview`, and `Validation` records. This canonical dataset becomes the single source of truth consumed by every page and component."
      realUsageContent={<DoclingPipeline />}
      realUsageCaption="End-to-end pipeline showing raw documents transformed into canonical Kronos structured data."
      realUsageExplanation="The pipeline illustrates three source types — free-text agent debate output, raw telemetry stream, and scouting report excerpt — each transformed into its corresponding structured representation. The structured artifacts are then ingested into the agent debate context as typed references, enabling consistent cross-agent reasoning and reliable downstream computation of fracture metrics, validation scores, and the Lead Coach Verdict."
      contributions={[
        "Document parsing methodology applied to free-text agent outputs, raw telemetry packets, and tactical scouting reports — converting each into typed, validated data structures",
        "Structured processing pipeline that informed the normalizeKronosPacket and normalizeSwarmAgents normalizers, ensuring every data path produces consistent canonical shapes",
        "Canonical data generation — the TypeScript interfaces in kronos.ts (Telemetry, SwarmMetrics, GraniteReview, Validation, DebateOutputs) are the direct output of the structured design process",
        "Narrative preparation — structured agent data enables the Lead Coach Verdict engine to compute status, rationale, and supporting signals from typed inputs rather than unstructured text",
        "Runtime compatibility layer — the structured dataset consumed by useKronos() across all five pages is the result of Docling-inspired document-to-data transformation at every ingestion point",
      ]}
    />
  );
}
