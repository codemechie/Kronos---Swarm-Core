import { Link } from "react-router-dom";
import { CommandHeader } from "../components/layout/CommandHeader";

const sectionLink =
  "text-xs tracking-widest text-green-600 font-semibold hover:text-green-700 transition-colors duration-150";

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">{children}</code>;
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-card bg-gray-50 p-4 overflow-x-auto mb-4">
      <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">{children}</pre>
    </div>
  );
}

export function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        <CommandHeader />

        {/* ── Hero ── */}
        <div className="rounded-card bg-gradient-to-b from-green-100/80 to-white p-8 md:p-10">
          <div className="text-xs tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">Resources</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Documentation</h1>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl leading-relaxed mb-4">
            Kronos Swarm Engine is a real-time football intelligence system that uses five specialized AI agents to analyze match events, detect tactical fractures, and produce verified recommendations with provable provenance.
          </p>
          <div className="flex flex-wrap gap-3 text-2xs text-gray-500">
            <span className="text-green-600 font-semibold">5 min read</span>
            <span className="text-gray-300">|</span>
            <span>v0.0.1</span>
            <span className="text-gray-300">|</span>
            <span>MIT</span>
          </div>
        </div>

        {/* ── On this page ── */}
        <div className="border border-gray-200 rounded-card bg-white p-5">
          <div className="text-xs tracking-widest text-gray-500 font-semibold mb-3 uppercase">On this page</div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <Link to="#getting-started" className={sectionLink}>Getting Started</Link>
            <Link to="#tech-stack" className={sectionLink}>Technology Stack</Link>
            <Link to="#pipeline" className={sectionLink}>Runtime Pipeline</Link>
            <Link to="#project-structure" className={sectionLink}>Project Structure</Link>
            <Link to="#deployment" className={sectionLink}>Deployment</Link>
            <Link to="#workflow" className={sectionLink}>Development Workflow</Link>
          </nav>
        </div>

        {/* ── Getting Started ── */}
        <div className="rounded-card bg-white border border-gray-200 p-6 md:p-8 space-y-8">
          <DocSection id="getting-started" title="Getting Started">
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Kronos runs as two processes — a Python HTTP server on port 3000 that generates and streams match data, and a Vite dev server on port 5173 that serves the React frontend.
            </p>
            <div className="text-sm font-semibold text-gray-900 mb-2">Prerequisites</div>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc pl-5 space-y-1 mb-4">
              <li>Python 3.13+</li>
              <li>Node.js 20+</li>
              <li>npm 10+</li>
            </ul>
            <div className="text-sm font-semibold text-gray-900 mb-2">Quick Start</div>
            <Pre>{`# Terminal 1 — Backend
cd backend
pip install python-dotenv
python app_server.py

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev`}</Pre>
            <p className="text-sm text-gray-600 leading-relaxed">
              Open <Code>http://localhost:5173</Code> in a browser. The frontend connects to the backend SSE stream at <Code>http://localhost:3000/stream</Code> and renders live match data automatically.
            </p>
          </DocSection>

          {/* ── Technology Stack ── */}
          <DocSection id="tech-stack" title="Technology Stack">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="border border-gray-200 rounded-card p-4 bg-gray-50">
                <div className="text-2xs tracking-widest text-green-600 font-semibold mb-2 uppercase">Backend</div>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>Python 3.13 — runtime</li>
                  <li>http.server — HTTP + SSE server</li>
                  <li>python-dotenv — configuration loading</li>
                  <li>IBM watsonx — Granite LLM inference</li>
                  <li>BOB API — secondary LLM provider</li>
                  <li>pytest — test framework</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-card p-4 bg-gray-50">
                <div className="text-2xs tracking-widest text-green-600 font-semibold mb-2 uppercase">Frontend</div>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>React 18 — UI framework</li>
                  <li>TypeScript 5.6 — type safety</li>
                  <li>Vite 6 — build tool & dev server</li>
                  <li>React Router 7 — client-side routing</li>
                  <li>Tailwind CSS 3 — utility-first styling</li>
                  <li>Recharts 3 — data visualizations</li>
                </ul>
              </div>
            </div>
          </DocSection>

          {/* ── Runtime Pipeline ── */}
          <DocSection id="pipeline" title="Runtime Pipeline">
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Each match tick (~1 second) flows through a six-phase pipeline that transforms raw telemetry into a verified recommendation.
            </p>
            <div className="space-y-3 mb-4">
              {[
                ["OBSERVE", "KronosMatchTicker generates a telemetry packet with 22 metrics across five domains: tactical, physical, psychological, environmental, and game theory."],
                ["ANALYZE", "Five agent archetypes (Market Pragmatist, Mood Ring, Gambler, Judge, Anarchist) each receive the telemetry and produce a structured assessment via the LLM Gateway."],
                ["DEBATE", "SwarmFractureCalculator computes fracture index, chaos probability, and agreement score from the agent outputs to measure swarm cohesion."],
                ["VALIDATE", "HeuristicValidator cross-checks agent outputs for contradictions, flags anomalies, and produces confidence/trust scores."],
                ["GRANITE REVIEW", "GraniteReviewEngine decides whether to escalate to IBM Granite for independent reasoning. If triggered, Granite returns a structured analysis with confidence scores and recommendations."],
                ["RECOMMEND", "Lead Coach Verdict is computed from fracture index, agent risk levels, and validation data. Output includes status (STABLE/WATCH/CRITICAL), rationale, and supporting signals."],
              ].map(([phase, desc]) => (
                <div key={phase} className="flex items-start gap-3 text-sm">
                  <span className="text-green-600 font-semibold shrink-0 w-28 text-right text-xs tracking-widest">{phase}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-600 leading-relaxed">{desc}</span>
                </div>
              ))}
            </div>
          </DocSection>

          {/* ── Project Structure ── */}
          <DocSection id="project-structure" title="Project Structure">
            <Pre>{`kronos-swarm-core/
├── backend/
│   ├── app_server.py           # HTTP server (port 3000)
│   ├── config/runtime.py       # RuntimeConfig with env vars
│   ├── agents/swarm/           # 5 AI agent archetypes
│   ├── orchestrator/           # Pipeline: state machine, validation, Granite review
│   ├── llm/                    # Provider gateway (mock, bob, granite)
│   ├── contracts/              # Shared data contracts
│   ├── utils/kronos_ticker.py  # Synthetic match data generator
│   └── tests/                  # Unit tests (pytest)
├── frontend/
│   ├── src/
│   │   ├── pages/              # 11 route pages
│   │   ├── components/         # Shared UI components
│   │   ├── context/            # React context (KronosProvider)
│   │   ├── hooks/              # useKronos hook
│   │   ├── lib/                # Normalizers, calculators, engines
│   │   ├── types/kronos.ts     # All TypeScript interfaces
│   │   └── runtime/            # SSE client
│   ├── package.json
│   └── vite.config.ts
└── docs/                       # Architecture docs, audit reports`}</Pre>
          </DocSection>

          {/* ── Deployment ── */}
          <DocSection id="deployment" title="Deployment">
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Kronos runs as two independent processes with no containerization. Deployment requires a host with Python 3.13+ and Node.js 20+.
            </p>
            <div className="text-sm font-semibold text-gray-900 mb-2">Environment Variables</div>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              Copy <Code>backend/.env.example</Code> to <Code>backend/.env</Code> and configure the LLM provider settings:
            </p>
            <Pre>{`KRONOS_LLM_MODE=hybrid
IBM_API_KEY=your_ibm_cloud_api_key
IBM_SPACE_ID=your_watsonx_space_id
IBM_MODEL_ID=ibm/granite-4-h-small
IBM_RUNTIME_URL=https://eu-de.ml.cloud.ibm.com
BOB_API_KEY=your_bob_api_key`}</Pre>
            <div className="text-sm font-semibold text-gray-900 mb-2">Running in Production</div>
            <Pre>{`# Build frontend
cd frontend
npm run build    # outputs to frontend/dist/

# Start backend (serves on port 3000)
cd backend
python app_server.py

# Serve frontend build with any static file server
npx serve frontend/dist -p 5173`}</Pre>
          </DocSection>

          {/* ── Development Workflow ── */}
          <DocSection id="workflow" title="Development Workflow">
            <div className="text-sm font-semibold text-gray-900 mb-2">Testing</div>
            <Pre>{`# Backend tests (119 tests, 110 subtests)
cd backend
python -m pytest tests/ -v

# Frontend type check
cd frontend
npx tsc --noEmit

# Full frontend build
cd frontend
npm run build`}</Pre>
            <div className="text-sm font-semibold text-gray-900 mb-2">LLM Provider Modes</div>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              Set <Code>KRONOS_LLM_MODE</Code> to switch providers without code changes:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-2xs">
              {[
                ["mock", "Template-based responses, no API keys needed"],
                ["bob", "Real BOB API calls"],
                ["granite", "IBM watsonx Granite calls"],
                ["hybrid", "Try BOB first, fall back to mock"],
              ].map(([mode, desc]) => (
                <div key={mode} className="border border-gray-200 rounded-card p-3 bg-gray-50">
                  <div className="text-green-600 font-semibold mb-1">{mode}</div>
                  <div className="text-gray-500">{desc}</div>
                </div>
              ))}
            </div>
          </DocSection>
        </div>

        {/* ── Footer nav ── */}
        <div className="border-t border-gray-200 pt-6 pb-8 flex items-center justify-between text-xs">
          <Link to="/" className="tracking-widest text-gray-500 hover:text-gray-900 transition-colors duration-150">← Back to Landing</Link>
          <Link to="/architecture" className="tracking-widest text-green-600 font-semibold hover:text-green-700 transition-colors duration-150">View Architecture →</Link>
        </div>
      </div>
    </div>
  );
}
