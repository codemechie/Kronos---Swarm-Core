import { Link, useLocation } from "react-router-dom";
import { CommandHeader } from "../components/layout/CommandHeader";

function PipelineIcon({ children, color }: { children: React.ReactNode; color?: string }) {
  const base = "w-10 h-10 rounded-button flex items-center justify-center text-base shrink-0 ";
  const colors: Record<string, string> = {
    blue: "border-blue-500 bg-blue-100 text-blue-600",
    amber: "border-amber-500 bg-amber-100 text-amber-600",
    cyan: "border-cyan-500 bg-cyan-100 text-cyan-600",
    indigo: "border-indigo-500 bg-indigo-100 text-indigo-600",
    green: "border-green-500 bg-green-100 text-green-600",
    purple: "border-purple-500 bg-purple-100 text-purple-600",
  };
  return <div className={base + "border " + (color ? colors[color] : "border-gray-300 bg-gray-100 text-gray-400")}>{children}</div>;
}

function PipelineCard({ icon, title, desc, color = "gray" }: { icon: React.ReactNode; title: string; desc: string; color?: string }) {
  const cardBg: Record<string, string> = {
    blue: "bg-blue-100/70",
    amber: "bg-amber-100/70",
    cyan: "bg-cyan-100/70",
    indigo: "bg-indigo-100/70",
    green: "bg-green-100/70",
  };
  const titleColor: Record<string, string> = {
    blue: "text-blue-600",
    amber: "text-amber-600",
    cyan: "text-cyan-600",
    indigo: "text-indigo-600",
    green: "text-green-600",
  };
  return (
    <div className={"border border-gray-200 rounded-card p-5 hover:border-gray-400 transition-colors duration-200 " + (color ? cardBg[color] : "bg-white")}>
      <div className="flex items-start gap-4">
        <PipelineIcon color={color}>{icon}</PipelineIcon>
        <div className="min-w-0">
          <div className={"text-xs tracking-widest mb-1 " + (color ? titleColor[color] : "text-gray-800")}>{title}</div>
          <div className="text-sm text-gray-600 leading-relaxed">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function PipelineConnector() {
  return (
    <div className="flex items-center gap-2 justify-center py-3">
      <div className="h-0.5 flex-1 max-w-16 bg-green-500" />
      <div className="w-5 h-5 rounded-full border border-green-500 flex items-center justify-center">
        <span className="text-green-700 font-bold text-2xs select-none">↓</span>
      </div>
      <div className="h-0.5 flex-1 max-w-16 bg-green-500" />
    </div>
  );
}

function TechCard({ icon, name, desc, color = "gray" }: { icon: React.ReactNode; name: string; desc: string; color?: string }) {
  const cardBg: Record<string, string> = {
    indigo: "bg-indigo-100/70",
    purple: "bg-purple-100/70",
    cyan: "bg-cyan-100/70",
    amber: "bg-amber-100/70",
    green: "bg-green-100/70",
    blue: "bg-blue-100/70",
  };
  const titleColor: Record<string, string> = {
    indigo: "text-indigo-600",
    purple: "text-purple-600",
    cyan: "text-cyan-600",
    amber: "text-amber-600",
    green: "text-green-600",
    blue: "text-blue-600",
  };
  return (
    <div className={"border border-gray-200 rounded-card p-5 hover:border-gray-400 transition-colors duration-200 " + (color ? cardBg[color] : "bg-white")}>
      <div className="flex items-start gap-4">
        <PipelineIcon color={color}>{icon}</PipelineIcon>
        <div className="min-w-0">
          <div className={"text-xs tracking-widest mb-1 " + (color ? titleColor[color] : "text-gray-800")}>{name}</div>
          <div className="text-sm text-gray-600 leading-relaxed">{desc}</div>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-gray-50 font-mono">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <CommandHeader />

        {/* ── Hero ── */}
        <div className="pt-28 pb-24 text-center">
          <div className="text-sm md:text-base tracking-[0.2em] text-green-600 mb-6 uppercase font-semibold">
            Kronos Swarm Engine
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight max-w-5xl mx-auto">
            Understand football
            <br />
            <span className="text-gray-500">with verified intelligence.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Five specialized AI agents analyze every moment of the match in real time.
            <br className="hidden md:block" />
            One unified verdict surfaces what matters.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to="/war-room"
              className="inline-flex items-center gap-2 rounded-button bg-green-600 px-8 py-3 text-xs tracking-widest text-white font-semibold hover:bg-green-700 transition-all duration-200 shadow-button hover:shadow-button-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400"
            >
              ENTER LIVE INTELLIGENCE
            </Link>
            <Link
              to="/match-story"
              className="inline-flex items-center gap-2 border border-green-400 rounded-button bg-transparent px-8 py-3 text-xs tracking-widest text-green-700 font-semibold hover:bg-green-50 hover:border-green-600 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400"
            >
              VIEW MATCH STORY
              <span className="text-green-500 text-2xs">→</span>
            </Link>
          </div>
        </div>

        {/* ── Storytelling Section ── */}
        <div className="border-t border-gray-200 pt-20 pb-6">
          <div className="max-w-3xl mx-auto space-y-20">
            {/* Step 1 */}
            <div className="text-center">
              <span className="text-xs md:text-sm font-bold tracking-widest text-green-700 mb-4 block">01</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
                Observe the match.
              </h2>
              <p className="text-gray-600 text-sm max-w-lg mx-auto leading-relaxed">
                Live match telemetry captured in real time. Every data point streams direct from the pitch — pressure, fatigue, phase, and pattern.
              </p>
              <Link
                to="/war-room"
                className="mt-6 inline-flex items-center gap-2 text-sm tracking-widest text-green-600 font-semibold hover:text-green-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400"
              >
                EXPLORE LIVE INTELLIGENCE
                <span className="text-green-500">→</span>
              </Link>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 justify-center">
              <div className="h-0.5 flex-1 max-w-32 bg-green-500" />
              <div className="w-6 h-6 rounded-full border border-green-500 flex items-center justify-center">
                <span className="text-green-700 font-bold text-xs select-none">↓</span>
              </div>
              <div className="h-0.5 flex-1 max-w-32 bg-green-500" />
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <span className="text-xs md:text-sm font-bold tracking-widest text-green-700 mb-4 block">02</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
                Understand what is happening.
              </h2>
              <p className="text-gray-600 text-sm max-w-lg mx-auto leading-relaxed">
                Five specialized AI agents debate the match state. Fracture detection, consensus scoring, and risk assessment reveal what the data means.
              </p>
              <Link
                to="/swarm"
                className="mt-6 inline-flex items-center gap-2 text-sm tracking-widest text-green-600 font-semibold hover:text-green-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400"
              >
                EXPLORE SWARM INTELLIGENCE
                <span className="text-green-500">→</span>
              </Link>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 justify-center">
              <div className="h-0.5 flex-1 max-w-32 bg-green-500" />
              <div className="w-6 h-6 rounded-full border border-green-500 flex items-center justify-center">
                <span className="text-green-700 font-bold text-xs select-none">↓</span>
              </div>
              <div className="h-0.5 flex-1 max-w-32 bg-green-500" />
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <span className="text-xs md:text-sm font-bold tracking-widest text-green-700 mb-4 block">03</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
                Inspect the reasoning.
              </h2>
              <p className="text-gray-600 text-sm max-w-lg mx-auto leading-relaxed">
                Every verdict, every contradiction, every supporting signal — exposed in a transparent intelligence timeline from swarm through to coach.
              </p>
              <Link
                to="/transcript"
                className="mt-6 inline-flex items-center gap-2 text-sm tracking-widest text-green-600 font-semibold hover:text-green-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400"
              >
                VIEW DEBATE TRANSCRIPT
                <span className="text-green-500">→</span>
              </Link>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 justify-center">
              <div className="h-0.5 flex-1 max-w-32 bg-green-500" />
              <div className="w-6 h-6 rounded-full border border-green-500 flex items-center justify-center">
                <span className="text-green-700 font-bold text-xs select-none">↓</span>
              </div>
              <div className="h-0.5 flex-1 max-w-32 bg-green-500" />
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <span className="text-xs md:text-sm font-bold tracking-widest text-green-700 mb-4 block">04</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
                Trust every conclusion.
              </h2>
              <p className="text-gray-600 text-sm max-w-lg mx-auto leading-relaxed">
                Independent validation through IBM Granite. Every recommendation confidence-scored with provable provenance and escalation insight.
              </p>
              <Link
                to="/granite"
                className="mt-6 inline-flex items-center gap-2 text-sm tracking-widest text-green-600 font-semibold hover:text-green-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400"
              >
                VIEW GRANITE REVIEW
                <span className="text-green-500">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── How Kronos Works ── */}
        <div className="border-t border-gray-200 pt-20 pb-6">
          <div className="text-center mb-12">
            <div className="text-base md:text-lg tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">
              How Kronos Works
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Intelligence Pipeline
            </h2>
          </div>

          <div className="max-w-2xl mx-auto">
            <PipelineCard
              icon="◈"
              title="MATCH DATA"
              desc="Raw telemetry captured from live match events — minute, phase, score, pressure, fatigue, and field position. Every data point streams direct from the pitch in real time."
              color="blue"
            />

            <PipelineConnector />

            <PipelineCard
              icon="✦"
              title="SWARM INTELLIGENCE"
              desc="Five specialized AI agents analyze the match state from distinct tactical perspectives. Fracture detection, consensus scoring, and risk assessment reveal what the data means."
              color="amber"
            />

            <PipelineConnector />

            <PipelineCard
              icon="✓"
              title="VALIDATION"
              desc="Heuristic cross-checking across all agent outputs. Contradiction detection, trust scoring, and agreement analysis ensure internal consistency before any conclusion is accepted."
              color="cyan"
            />

            <PipelineConnector />

            <PipelineCard
              icon="◆"
              title="IBM GRANITE REVIEW"
              desc="Independent verification through IBM Granite foundation models. Escalation-triggered deep analysis provides provable provenance and external validation of swarm findings."
              color="indigo"
            />

            <PipelineConnector />

            <PipelineCard
              icon="★"
              title="VERIFIED RECOMMENDATION"
              desc="Confidence-scored output with complete decision provenance. Every recommendation surfaces the chain of reasoning from raw data through swarm debate to verified conclusion."
              color="green"
            />
          </div>
        </div>

        {/* ── Powered by IBM AI Technologies ── */}
        <div className="border-t border-gray-200 pt-20 pb-6">
          <div className="text-center mb-12">
            <div className="text-base md:text-lg tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">
              Powered by IBM AI Technologies
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Enterprise Foundation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <TechCard
              icon="◆"
              name="IBM GRANITE"
              desc="Explainable reasoning and validation."
              color="indigo"
            />
            <TechCard
              icon="◎"
              name="IBM BOB"
              desc="Product design and UX consultation."
              color="purple"
            />
            <TechCard
              icon="▣"
              name="IBM DOCLING"
              desc="Document understanding and structured processing."
              color="cyan"
            />
            <TechCard
              icon="⚡"
              name="FASTAPI"
              desc="Backend intelligence services."
              color="green"
            />
            <TechCard
              icon="◈"
              name="REACT + TYPESCRIPT"
              desc="Modern frontend experience."
              color="blue"
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="border-t border-gray-200 pt-14 pb-10 bg-gradient-to-b from-green-50 to-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
            {/* Brand */}
            <div>
              <div className="text-sm md:text-base tracking-widest text-green-600 font-bold mb-2">KRONOS</div>
              <div className="text-2xs tracking-widest text-gray-600 mb-3">Football Intelligence Operating System</div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Real-time swarm intelligence for football match analysis. Five AI agents. One unified verdict.
              </p>
            </div>

            {/* Product */}
            <div>
              <div className="text-2xs tracking-widest text-gray-400 font-semibold mb-4 uppercase">Product</div>
              <div className="space-y-2.5">
                {[
                  { to: "/match-story", label: "Match Story" },
                  { to: "/war-room", label: "Live Intelligence" },
                  { to: "/swarm", label: "Swarm Intelligence" },
                  { to: "/transcript", label: "Debate Transcript" },
                  { to: "/granite", label: "Granite Intelligence" },
                ].map(({ to, label }) => {
                  const active = location.pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`block text-sm transition-all duration-150 border-l-2 pl-3 -ml-3 ${
                        active
                          ? "text-green-700 font-semibold border-green-500"
                          : "text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* IBM Technologies */}
            <div>
              <div className="text-2xs tracking-widest text-gray-400 font-semibold mb-4 uppercase">IBM Technologies</div>
              <div className="space-y-2.5">
                {[
                  { to: "/tech/granite", label: "IBM Granite" },
                  { to: "/tech/bob", label: "IBM BOB" },
                  { to: "/tech/docling", label: "IBM Docling" },
                ].map(({ to, label }) => {
                  const active = location.pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`block text-sm transition-all duration-150 border-l-2 pl-3 -ml-3 ${
                        active
                          ? "text-green-700 font-semibold border-green-500"
                          : "text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Resources */}
            <div>
              <div className="text-2xs tracking-widest text-gray-400 font-semibold mb-4 uppercase">Resources</div>
              <div className="space-y-2.5">
                <a
                  href="https://github.com/codemechie/Kronos---Swarm-Core.git"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-all duration-150 border-l-2 pl-3 -ml-3 border-transparent hover:border-gray-300 group"
                >
                  GitHub
                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors duration-150 text-2xs">↗</span>
                </a>
                {[
                  { to: "/docs", label: "Documentation" },
                  { to: "/architecture", label: "Architecture" },
                ].map(({ to, label }) => {
                  const active = location.pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`block text-sm transition-all duration-150 border-l-2 pl-3 -ml-3 ${
                        active
                          ? "text-green-700 font-semibold border-green-500"
                          : "text-gray-500 hover:text-gray-900 border-transparent hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-2xs text-gray-500 font-semibold">
            <span className="text-gray-400">© 2026 Kronos</span>
            <span className="text-gray-500">Built for the IBM SkillsBuild AI Builders Challenge</span>
            <span className="text-green-600">Powered by IBM AI Technologies</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
