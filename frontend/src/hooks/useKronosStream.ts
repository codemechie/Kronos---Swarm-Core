import { useEffect, useState } from "react";
import type { KronosPacket } from "../types/kronos";

const STREAM_URL = "http://localhost:3000/stream";

interface UseKronosStreamResult {
  data: KronosPacket | null;
  connected: boolean;
}

export function useKronosStream(): UseKronosStreamResult {
  const [data, setData] = useState<KronosPacket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(STREAM_URL);

    source.onopen = () => setConnected(true);

    source.onmessage = (event) => {
      try {
        const parsed: KronosPacket = JSON.parse(event.data);
        setData(parsed);
      } catch {
        // ignore malformed data
      }
    };

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      setConnected(false);
      source.close();
    };
  }, []);

  return { data, connected };
}
