import { useKronos } from "../../hooks/useKronos";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Landing" },
  { to: "/match-story", label: "Match Story" },
  { to: "/war-room", label: "Live Intelligence" },
  { to: "/swarm", label: "Swarm Intelligence" },
  { to: "/transcript", label: "Debate Transcript" },
  { to: "/granite", label: "Granite Intelligence" },
];

const connectionDot: Record<string, string> = {
  CONNECTED: "bg-green-500",
  CONNECTING: "bg-yellow-500",
  OFFLINE: "bg-red-500",
};

const phaseColor: Record<string, string> = {
  CHAOS: "text-red-600",
  WEATHER: "text-yellow-600",
};

export function CommandHeader() {
  const { telemetry, swarmMetrics, phase, connectionStatus } = useKronos();
  const location = useLocation();

  return (
    <div className="border border-gray-200 rounded-card bg-white shadow-sm font-mono">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="tracking-widest text-green-600 font-bold text-base">
            KRONOS SWARM ENGINE
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`inline-block w-2 h-2 rounded-full ${connectionDot[connectionStatus] ?? "bg-gray-400"}`} />
            {connectionStatus}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Minute: <span className="text-gray-900 font-semibold">{telemetry.minute}</span></span>
          <span className="text-gray-300 select-none">|</span>
          <span>Phase: <span className={`font-semibold ${phaseColor[phase] ?? "text-green-600"}`}>{phase}</span></span>
          <span className="text-gray-300 select-none">|</span>
          <span>Fracture: <span className="text-gray-900 font-semibold">{swarmMetrics.fracture_index}</span></span>
          <span className="text-gray-300 select-none">|</span>
          <span>Chaos: <span className="text-gray-900 font-semibold">{swarmMetrics.chaos_probability}%</span></span>
        </div>
      </div>
      <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-center gap-8">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`text-xs tracking-widest font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 ${
                isActive
                  ? "text-green-600"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
