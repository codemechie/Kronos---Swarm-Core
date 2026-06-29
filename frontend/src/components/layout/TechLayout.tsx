import { CommandHeader } from "./CommandHeader";

const accentGradients: Record<string, string> = {
  indigo: "from-indigo-100/80 to-white",
  purple: "from-purple-100/80 to-white",
  cyan: "from-cyan-100/80 to-white",
};

interface TechLayoutProps {
  accent?: keyof typeof accentGradients;
  name: string;
  tagline: string;
  explanation: string;
  whySection: string;
  integrationSection: string;
  realUsageContent?: React.ReactNode;
  realUsageCaption: string;
  realUsageExplanation: string;
  contributions: string[];
}

export function TechLayout({
  accent = "indigo",
  name,
  tagline,
  explanation,
  whySection,
  integrationSection,
  realUsageContent,
  realUsageCaption,
  realUsageExplanation,
  contributions,
}: TechLayoutProps) {
  const gradient = accentGradients[accent] ?? accentGradients.indigo;

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-mono">
      <div className="max-w-6xl mx-auto space-y-12">
        <CommandHeader />

        {/* ── Hero ── */}
        <div className={`rounded-card bg-gradient-to-b ${gradient} p-8 md:p-10`}>
          <div className="text-xs tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">
            IBM Technology
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{name}</h1>
          <div className="text-sm md:text-base text-green-700 font-semibold mb-4">{tagline}</div>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* ── Why We Used It ── */}
        <section className="scroll-mt-24">
          <div className="text-xs tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">
            Why We Used It
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            Why we chose {name}
          </h2>
          <p className="text-sm md:text-base text-gray-600 max-w-3xl leading-relaxed">
            {whySection}
          </p>
        </section>

        {/* ── Integration Overview ── */}
        <section className="scroll-mt-24 border-t border-gray-200 pt-12 pb-4">
          <div className="text-xs tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">
            Integration Overview
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            How {name} integrates
          </h2>
          <p className="text-sm md:text-base text-gray-600 max-w-3xl leading-relaxed">
            {integrationSection}
          </p>
        </section>

        {/* ── Real Usage ── */}
        <section className="scroll-mt-24 border-t border-gray-200 pt-12 pb-4">
          <div className="text-xs tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">
            Real Usage
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            {name} in action
          </h2>
          {realUsageContent ? (
            <div className="mb-4">
              {realUsageContent}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-card bg-white p-6 mb-4">
              <div className="aspect-video bg-gray-100 rounded-card border border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-xs tracking-widest text-gray-400 font-semibold">SCREENSHOT</span>
              </div>
            </div>
          )}
          <div className="text-sm text-gray-500 font-semibold mb-2">{realUsageCaption}</div>
          <p className="text-sm md:text-base text-gray-600 max-w-3xl leading-relaxed">
            {realUsageExplanation}
          </p>
        </section>

        {/* ── Technical Contribution ── */}
        <section className="scroll-mt-24 border-t border-gray-200 pt-12 pb-4">
          <div className="text-xs tracking-[0.2em] text-green-600 mb-4 uppercase font-semibold">
            Technical Contribution
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
            What {name} contributed
          </h2>
          <ul className="space-y-3 max-w-3xl">
            {contributions.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm md:text-base text-gray-600 leading-relaxed">
                <span className="text-green-600 mt-1 shrink-0">◆</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
