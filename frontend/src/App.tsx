import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WarRoom } from "./pages/WarRoom";
import { SwarmIntelligence } from "./pages/SwarmIntelligence";
import { DebateTranscript } from "./pages/DebateTranscript";
import { GraniteIntelligence } from "./pages/GraniteIntelligence";
import { Landing } from "./pages/Landing";
import { MatchStory } from "./pages/MatchStory";

export function App() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-fadeInFromLeft">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/war-room" element={<WarRoom />} />
        <Route path="/swarm" element={<SwarmIntelligence />} />
        <Route path="/transcript" element={<DebateTranscript />} />
        <Route path="/granite" element={<GraniteIntelligence />} />
        <Route path="/match-story" element={<MatchStory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
