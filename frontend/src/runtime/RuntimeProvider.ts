import type { ConnectionStatus, KronosPacket } from "../types/kronos";

// Future runtime providers (e.g. HistoricalRuntimeProvider, SimulatedRuntimeProvider)
// can implement this interface and be consumed by KronosProvider without modifying the engine.
export type PacketListener = (packet: KronosPacket) => void;
export type StatusListener = (status: ConnectionStatus) => void;

export interface RuntimeProvider {
  start(onStatus?: StatusListener): void;
  stop(): void;
  subscribe(listener: PacketListener): () => void;
}
