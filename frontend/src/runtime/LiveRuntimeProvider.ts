import type { RuntimeProvider } from "./RuntimeProvider";
import type { PacketListener, StatusListener } from "./RuntimeProvider";
import type { KronosPacket } from "../types/kronos";

const _base: string = import.meta.env.VITE_API_BASE_URL;
if (!_base) {
  throw new Error(
    "VITE_API_BASE_URL is not set. Set it in .env or Vercel environment variables.",
  );
}
const STREAM_URL = `${_base}/stream`;

let providerCounter = 0;

export class LiveRuntimeProvider implements RuntimeProvider {
  private listeners = new Set<PacketListener>();
  private source: EventSource | null = null;
  private onStatus: StatusListener | null = null;
  readonly instanceId: number;

  constructor() {
    this.instanceId = ++providerCounter;
  }

  start(onStatus?: StatusListener): void {
    this.onStatus = onStatus ?? null;
    const ts = Date.now();
    console.log(`[Kronos:DIAG] 5 | provider_start | ts=${ts} | instanceId=${this.instanceId} | url="${STREAM_URL}"`);
    this.source = new EventSource(STREAM_URL);

    this.source.onopen = () => {
      console.log(`[Kronos:DIAG] 5.1 | provider_connected | ts=${Date.now()} | instanceId=${this.instanceId}`);
      this.onStatus?.("CONNECTED");
    };

    this.source.onmessage = (event) => {
      try {
        const raw: KronosPacket = JSON.parse(event.data);
        console.log(`[Kronos:DIAG] 8 | provider_emitted | ts=${Date.now()} | instanceId=${this.instanceId} | minute=${raw.minute ?? "?"} | listeners=${this.listeners.size}`);
        for (const listener of this.listeners) {
          listener(raw);
        }
      } catch {
        console.log(`[Kronos:DIAG] 8 | provider_emitted_malformed | ts=${Date.now()} | instanceId=${this.instanceId}`);
      }
    };

    this.source.onerror = () => {
      console.log(`[Kronos:DIAG] 5.2 | provider_error | ts=${Date.now()} | instanceId=${this.instanceId}`);
      this.onStatus?.("OFFLINE");
    };
  }

  stop(): void {
    const ts = Date.now();
    console.log(`[Kronos:DIAG] 6 | provider_stop | ts=${ts} | instanceId=${this.instanceId} | hadSource=${!!this.source}`);
    this.source?.close();
    this.source = null;
  }

  subscribe(listener: PacketListener): () => void {
    console.log(`[Kronos:DIAG] 5.3 | provider_listener_added | ts=${Date.now()} | instanceId=${this.instanceId} | totalListeners=${this.listeners.size + 1}`);
    this.listeners.add(listener);
    return () => {
      console.log(`[Kronos:DIAG] 5.4 | provider_listener_removed | ts=${Date.now()} | instanceId=${this.instanceId} | totalListeners=${this.listeners.size - 1}`);
      this.listeners.delete(listener);
    };
  }
}
