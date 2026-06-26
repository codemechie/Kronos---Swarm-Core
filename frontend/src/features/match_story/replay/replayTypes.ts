export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10;

export type PlaybackState = "PLAYING" | "PAUSED";

export interface ReplayState {
  currentMinute: number;
  currentSecond: number;
  playbackState: PlaybackState;
  playbackSpeed: PlaybackSpeed;
}

export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 5, 10];

export const TICK_INTERVAL_MS = 100;
