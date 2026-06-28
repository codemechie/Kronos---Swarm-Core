import { Link } from "react-router-dom";

const cards = [
  {
    to: "/match-story",
    title: "MATCH STORY",
    desc: "Live football intelligence dashboard with real-time match data, AI assessment, and swarm-driven predictions.",
  },
  {
    to: "/war-room",
    title: "LIVE INTELLIGENCE",
    desc: "Live telemetry, swarm debate, validation, Granite review, and lead coach verdict in a unified intelligence dashboard.",
  },
  {
    to: "/swarm",
    title: "SWARM INTELLIGENCE",
    desc: "Inspect individual agent reasoning, confidence, risk levels, and contributing signals.",
  },
  {
    to: "/transcript",
    title: "DEBATE TRANSCRIPT",
    desc: "Chronological intelligence flow across agents, validation, and review layers.",
  },
  {
    to: "/granite",
    title: "GRANITE INTELLIGENCE CENTER",
    desc: "Independent validation and decision provenance for every recommendation.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-black p-4 font-mono">
      <div className="max-w-4xl mx-auto pt-16">
        <div className="text-center mb-12">
          <div className="text-2xl tracking-widest text-gray-300 font-bold mb-2">
            KRONOS SWARM ENGINE
          </div>
          <div className="text-sm text-gray-500">
            AI-powered swarm intelligence for football match analysis
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="border border-gray-700 rounded bg-gray-900 p-6 hover:bg-gray-800 transition-colors"
            >
              <div className="text-xs tracking-widest text-gray-400 mb-2">
                {card.title}
              </div>
              <div className="text-sm text-gray-500">{card.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
