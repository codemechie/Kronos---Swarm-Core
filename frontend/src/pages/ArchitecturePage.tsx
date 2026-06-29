import { Link } from "react-router-dom";
import { CommandHeader } from "../components/layout/CommandHeader";

function FlowBox({ label, color = "green", sub }: { label: string; color?: string; sub?: string }) {
  const border: Record<string, string> = {
    blue: "border-blue-300 bg-blue-50",
    green: "border-green-300 bg-green-50",
    cyan: "border-cyan-300 bg-cyan-50",
    indigo: "border-indigo-300 bg-indigo-50",
    amber: "border-amber-300 bg-amber-50",
    purple: "border-purple-300 bg-purple-50",
    gray: "border-gray-300 bg-gray-50",
  };
  const text: Record<string, string> = {
    blue: "text-blue-700",
    green: "text-green-700",
    cyan: "text-cyan-700",
    indigo: "text-indigo-700",
    amber: "text-amber-700",
    purple: "text-purple-700",
    gray: "text-gray-700",
  };
  return (
    <div className={`border ${border[color] ?? border.gray} rounded-card px-4 py-3 text-center ${text[color] ?? text.gray}`}>
      <div className="text-xs tracking-widest font-semibold">{label}</div>
      {sub && <div className="text-2xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1">
      <span className="text-gray-300 text-xs">↓</span>
    </div>
  );
}

function SideBySide({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-stretch justify-center gap-3">{children}</div>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-2xs px-2 py-0.5 border border-gray-200 rounded text-gray-500 font-semibold">{children}</span>;
}

function Section({ id, title, accent = "green", children }: { id: string; title: string; accent?: string; children: React.ReactNode }) {
  const grad: Record<string, string> = {
    green: "from-green-100/80 to-white",
    blue: "from-blue-100/80 to-white",
    cyan: "from-cyan-100/80 to-white",
    indigo: "from-indigo-100/80 to-white",
    amber: "from-amber-100/80 to-white",
    purple: "from-purple-100/80 to-white",
  };
  return (
    <section id={id} className={`rounded-card bg-gradient-to-b ${grad[accent] ?? grad.green} p-6 md:p-8 scroll-mt-24`}>
      <div className="text-xs tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">{title}</div>
      {children}
    </section>
  );
}

export function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 font-mono">
      <div className="max-w-5xl mx-auto space-y-8">
        <CommandHeader />

        {/* ── Hero ── */}
        <div className="rounded-card bg-gradient-to-b from-amber-100/80 to-white p-8 md:p-10">
          <div className="text-xs tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">Resources</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Architecture</h1>
          <p className="text-sm md:text-base text-gray-600 max-w-3xl leading-relaxed">
            Kronos Swarm Engine is a two-process system. The Python backend generates synthetic match telemetry, runs the agent swarm, and streams results over SSE. The React frontend subscribes to the stream, normalizes the data, and renders live intelligence across 11 pages.
          </p>
        </div>

        {/* ── System Overview ── */}
        <Section id="overview" title="System Overview" accent="indigo">
          <div className="max-w-xl mx-auto">
            <FlowBox label="Kronos Match Ticker" color="gray" sub="Synthetic data generator — 90-min match simulation" />
            <FlowArrow />
            <FlowBox label="Python Backend" color="blue" sub="http.server :3000 — six-phase pipeline per tick" />
            <FlowArrow />
            <FlowBox label="SSE Stream" color="cyan" sub="text/event-stream — JSON packets every ~1s" />
            <FlowArrow />
            <FlowBox label="React Frontend" color="green" sub="Vite :5173 — 11 pages, real-time state" />
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <Tag>Port 3000</Tag>
            <Tag>Port 5173</Tag>
            <Tag>SSE</Tag>
            <Tag>JSON</Tag>
            <Tag>React 18</Tag>
            <Tag>TypeScript 5.6</Tag>
          </div>
        </Section>

        {/* ── Runtime Pipeline ── */}
        <Section id="pipeline" title="Runtime Pipeline" accent="blue">
          <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-3xl">
            Every match tick (~1 second) flows through six ordered phases in the backend orchestrator. Each phase transforms the match state and passes it to the next.
          </p>
          <div className="max-w-lg mx-auto">
            <FlowBox label="1. OBSERVE" color="gray" sub="Telemetry generation — 22 metrics" />
            <FlowArrow />
            <FlowBox label="2. ANALYZE" color="blue" sub="5 agents × LLM Gateway → structured assessments" />
            <FlowArrow />
            <FlowBox label="3. DEBATE" color="indigo" sub="Fracture index, chaos prob., agreement score" />
            <FlowArrow />
            <FlowBox label="4. VALIDATE" color="amber" sub="Heuristic cross-check, flags, confidence score" />
            <FlowArrow />
            <FlowBox label="5. GRANITE REVIEW" color="purple" sub="Escalation check → optional Granite LLM call" />
            <FlowArrow />
            <FlowBox label="6. RECOMMEND" color="green" sub="Lead Coach Verdict: STABLE / WATCH / CRITICAL" />
          </div>
        </Section>

        {/* ── Swarm Architecture ── */}
        <Section id="swarm" title="Swarm Architecture" accent="amber">
          <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-3xl">
            Five specialized AI agent archetypes analyze every match tick from distinct tactical perspectives. Each agent produces a structured verdict which the swarm calculator aggregates into cohesion metrics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              ["Market Pragmatist", "pragmatist", "Scoreline, field tilt, xG delta", "border-blue-200 bg-blue-50", "text-blue-700"],
              ["Mood Ring", "mood_ring", "Crowd noise, panic index, fatigue", "border-purple-200 bg-purple-50", "text-purple-700"],
              ["Gambler", "gambler", "Variance, sub shock, desperation", "border-amber-200 bg-amber-50", "text-amber-700"],
              ["Judge", "judge", "Foul escalation, discipline", "border-cyan-200 bg-cyan-50", "text-cyan-700"],
              ["Anarchist", "anarchist", "Environmental chaos, pitch/wind/fog", "border-red-200 bg-red-50", "text-red-700"],
            ].map(([name, key, focus, box, txt]) => (
              <div key={key as string} className={`${box as string} rounded-card p-4 text-center border`}>
                <div className={`text-xs tracking-widest ${txt as string} font-semibold mb-1`}>{name as string}</div>
                <div className="text-2xs text-gray-500">{key as string}</div>
                <div className="text-2xs text-gray-600 mt-2">{(focus as string).split(", ").map((f, i) => <div key={i}>{f}</div>)}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 border border-gray-200 rounded-card bg-white p-4">
            <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-2 uppercase">Swarm Output</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
              <div>
                <span className="text-gray-500">fracture_index</span>
                <div className="text-gray-900 font-semibold">0–100</div>
                <div className="text-2xs text-gray-400">Swarm disagreement magnitude</div>
              </div>
              <div>
                <span className="text-gray-500">chaos_probability</span>
                <div className="text-gray-900 font-semibold">0–100%</div>
                <div className="text-2xs text-gray-400">Environmental volatility</div>
              </div>
              <div>
                <span className="text-gray-500">agreement_score</span>
                <div className="text-gray-900 font-semibold">0–100%</div>
                <div className="text-2xs text-gray-400">Agent consensus strength</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Validation Layer ── */}
        <Section id="validation" title="Validation Layer" accent="cyan">
          <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-3xl">
            The HeuristicValidator runs after the swarm debate. It cross-checks all agent outputs for internal consistency and produces a confidence score that governs Granite escalation.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-cyan-600 font-semibold mb-3 uppercase">Validation Checks</div>
              <ul className="space-y-2 text-xs text-gray-600">
                {[
                  "Contradictory verdict detection (HIGH_RISK vs NOMINAL)",
                  "Agent failure detection (all mock providers)",
                  "No-consensus detection (split verdicts)",
                  "High fracture flag (fracture_index >= 80)",
                  "Low confidence flag (overall_confidence <= 0.30)",
                ].map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-600 mt-0.5">◆</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-cyan-600 font-semibold mb-3 uppercase">Output</div>
              <div className="space-y-3 text-xs text-gray-600">
                <div><span className="text-gray-500">overall_confidence</span><div className="text-gray-900 font-semibold">0.0 – 1.0</div></div>
                <div><span className="text-gray-500">trust_score</span><div className="text-gray-900 font-semibold">0.0 – 1.0</div></div>
                <div><span className="text-gray-500">contradiction_count</span><div className="text-gray-900 font-semibold">0+</div></div>
                <div><span className="text-gray-500">flags</span><div className="text-gray-900 font-semibold">string[]</div></div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Granite Review ── */}
        <Section id="granite" title="Granite Review" accent="purple">
          <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-3xl">
            IBM Granite provides independent external validation. The GraniteReviewEngine monitors every tick and escalates to Granite only when validation detects meaningful disagreement or risk.
          </p>
          <div className="max-w-md mx-auto mb-6">
            <FlowBox label="Validation flags exceed thresholds?" color="gray" sub="Fracture >= 60 | Confidence <= 0.50 | Contradictions >= 1" />
            <FlowArrow />
            <SideBySide>
              <FlowBox label="No → Standby" color="green" sub="Granite skipped, pipeline continues" />
              <FlowBox label="Yes → Escalate" color="amber" sub="Granite API called for structured review" />
            </SideBySide>
            <FlowArrow />
            <FlowBox label="Lead Coach Verdict + Granite Review" color="purple" sub="Combined recommendation payload" />
          </div>
          <div className="border border-gray-200 rounded-card bg-white p-4">
            <div className="text-2xs tracking-widest text-gray-500 font-semibold mb-2 uppercase">Escalation Thresholds (configurable via env)</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
              <div>
                <span className="text-gray-500">GRANITE_FRACTURE_THRESHOLD</span>
                <div className="text-gray-900 font-semibold">60.0</div>
              </div>
              <div>
                <span className="text-gray-500">GRANITE_CONFIDENCE_THRESHOLD</span>
                <div className="text-gray-900 font-semibold">0.50</div>
              </div>
              <div>
                <span className="text-gray-500">GRANITE_CONTRADICTION_THRESHOLD</span>
                <div className="text-gray-900 font-semibold">1</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Frontend Architecture ── */}
        <Section id="frontend" title="Frontend Architecture" accent="green">
          <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-3xl">
            The frontend is a single-page React application with 11 routes. State is managed via React Context with SSE-driven updates from the backend.
          </p>
          <div className="max-w-sm mx-auto mb-6">
            <FlowBox label="SSE Stream → LiveRuntimeProvider" color="gray" sub="EventSource connection to :3000/stream" />
            <FlowArrow />
            <FlowBox label="KronosProvider (React Context)" color="blue" sub="State normalization + event generation" />
            <FlowArrow />
            <FlowBox label="11 Pages × Shared Components" color="green" sub="useKronos() → render" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-green-600 font-semibold mb-2 uppercase">Pages</div>
              <div className="flex flex-wrap gap-1.5">
                {["Landing", "Live Intelligence", "Match Story", "Swarm Intelligence", "Debate Transcript", "Granite Intelligence", "Tech Granite", "Tech BOB", "Tech Docling", "Documentation", "Architecture"].map((p) => (
                  <Tag key={p}>{p}</Tag>
                ))}
              </div>
            </div>
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-green-600 font-semibold mb-2 uppercase">State Shape (useKronos)</div>
              <div className="text-xs text-gray-600 leading-relaxed">
                {[
                  "telemetry → 22 match metrics",
                  "swarmMetrics → fracture, chaos, agreement",
                  "debateOutputs → 5 agent verdicts (raw)",
                  "validation → confidence, flags, evidence",
                  "granite_review → escalation result",
                  "phase → GRIND / WEATHER / CHAOS",
                  "history → 90-point fracture timeline",
                  "events → system-generated alerts",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-green-500">{'▸'}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Deployment ── */}
        <Section id="deployment" title="Deployment" accent="gray">
          <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-3xl">
            Kronos runs as two independent processes with no containerization. Deployment requires a host with Python 3.13+ and Node.js 20+.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-green-600 font-semibold mb-2 uppercase">Backend</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>python app_server.py</div>
                <div className="text-gray-400">Port 3000 — HTTP + SSE</div>
                <div className="text-gray-400">No framework, no container</div>
                <div className="text-gray-400">Config via .env</div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-card bg-white p-4">
              <div className="text-2xs tracking-widest text-green-600 font-semibold mb-2 uppercase">Frontend</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>npm run build</div>
                <div className="text-gray-400">Static output → dist/</div>
                <div className="text-gray-400">Serve with any HTTP server</div>
                <div className="text-gray-400">All routes client-side</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Footer nav ── */}
        <div className="border-t border-gray-200 pt-6 pb-8 flex items-center justify-between text-xs">
          <Link to="/" className="tracking-widest text-gray-500 hover:text-gray-900 transition-colors duration-150">← Back to Landing</Link>
          <Link to="/docs" className="tracking-widest text-green-600 font-semibold hover:text-green-700 transition-colors duration-150">View Documentation →</Link>
        </div>
      </div>
    </div>
  );
}
