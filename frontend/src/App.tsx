import { WarRoom } from "./pages/WarRoom";
import { KronosDebugPanel } from "./components/KronosDebugPanel";

export function App() {
  return (
    <div className="bg-black min-h-screen">
      <WarRoom />
      <div className="flex justify-center pb-8">
        <KronosDebugPanel />
      </div>
    </div>
  );
}
