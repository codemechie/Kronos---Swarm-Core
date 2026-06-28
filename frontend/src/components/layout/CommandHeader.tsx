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

const connectionStyle: Record<string, string> = {
  CONNECTED: "text-green-400",
  CONNECTING: "text-yellow-400",
  OFFLINE: "text-red-400",
};

const connectionDot: Record<string, string> = {
  CONNECTED: "bg-green-500",
  CONNECTING: "bg-yellow-500",
  OFFLINE: "bg-red-500",
};

export function CommandHeader() {
  const { telemetry, swarmMetrics, phase, connectionStatus } = useKronos();
  const location = useLocation();

  return (
    <div className="border border-gray-700 rounded bg-gray-900 px-6 py-3 font-mono text-gray-100">
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <span className="tracking-widest text-gray-400 font-bold">
          KRONOS SWARM ENGINE
        </span>
        <span className={`flex items-center gap-1 text-[10px] ${connectionStyle[connectionStatus]}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${connectionDot[connectionStatus]}`} />
          {connectionStatus}
        </span>
        <span className="text-gray-700">|</span>
        {navLinks.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={
                isActive
                  ? "text-white"
                  : "text-gray-600 hover:text-gray-300"
              }
            >
              {link.label}
            </Link>
          );
        })}
        <span className="text-gray-700 ml-auto">|</span>
        <span>
          Minute: <span className="text-white">{telemetry.minute}</span>
        </span>
        <span className="text-gray-700">|</span>
        <span>
          Phase:{" "}
          <span
            className={
              phase === "CHAOS"
                ? "text-red-400"
                : phase === "WEATHER"
                  ? "text-yellow-400"
                  : "text-green-400"
            }
          >
            {phase}
          </span>
        </span>
        <span className="text-gray-700">|</span>
        <span>
          Fracture:{" "}
          <span className="text-white">{swarmMetrics.fracture_index}</span>
        </span>
        <span className="text-gray-700">|</span>
        <span>
          Chaos:{" "}
          <span className="text-white">
            {swarmMetrics.chaos_probability}%
          </span>
        </span>
      </div>
    </div>
  );
}
