import type { ReplayState } from "./replayTypes";
import { PLAYBACK_SPEEDS } from "./replayTypes";
import type { ReplayControls } from "./replayHooks";

interface ReplayControlsProps {
  state: ReplayState;
  controls: ReplayControls;
  maxMinute: number;
  progress: number;
  isComplete: boolean;
}

export function ReplayControlsBar({
  state,
  controls,
  maxMinute,
  progress,
  isComplete,
}: ReplayControlsProps) {
  const minuteLabel = formatReplayMinute(state.currentMinute, maxMinute);

  return (
    <div className="border border-gray-700 rounded bg-gray-900 p-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] tracking-widest text-gray-400">
            MATCH REPLAY
          </div>
          <div className="text-xs font-bold text-white tabular-nums">
            {minuteLabel}
          </div>
        </div>

        <div className="relative h-2">
          <input
            type="range"
            min={0}
            max={maxMinute}
            step={0.5}
            value={Math.min(state.currentMinute, maxMinute)}
            onChange={(e) => controls.seek(Number(e.target.value))}
            className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer
              [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full
              [&::-webkit-slider-runnable-track]:bg-gray-700
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:-mt-1
              [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-gray-700
              [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
          />
          <div
            className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-blue-500 pointer-events-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1">
            <ReplayButton
              label={state.playbackState === "PLAYING" ? "⏸" : "▶"}
              title={state.playbackState === "PLAYING" ? "Pause" : "Play"}
              onClick={controls.togglePlay}
              active={state.playbackState === "PLAYING"}
            />
            <ReplayButton
              label="⏹"
              title="Restart"
              onClick={controls.restart}
            />
          </div>

          <div className="flex items-center gap-1">
            <ReplayButton
              label="◀◀"
              title="Previous Goal"
              onClick={controls.jumpToPreviousGoal}
            />
            <ReplayButton
              label="▶▶"
              title="Next Goal"
              onClick={controls.jumpToNextGoal}
            />
          </div>

          <div className="flex items-center gap-1">
            <ReplayButton
              label="HT"
              title="Jump to Half-time"
              onClick={controls.jumpToHalftime}
            />
            <ReplayButton
              label="FT"
              title="Jump to Full-time"
              onClick={controls.jumpToFulltime}
            />
            <ReplayButton
              label="ET"
              title="Jump to Extra Time"
              onClick={controls.jumpToExtraTime}
            />
          </div>

          <div className="flex items-center gap-1">
            {PLAYBACK_SPEEDS.map((speed) => (
              <ReplayButton
                key={speed}
                label={`${speed}x`}
                title={`Speed ${speed}x`}
                onClick={() => controls.setSpeed(speed)}
                active={state.playbackSpeed === speed}
              />
            ))}
          </div>
        </div>

        {isComplete && (
          <div className="text-[10px] text-yellow-400 text-center">
            Replay complete. Restart to play again.
          </div>
        )}
      </div>
    </div>
  );
}

function ReplayButton({
  label,
  title,
  onClick,
  active,
}: {
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`text-[10px] px-1.5 py-1 rounded border transition-colors font-mono
        ${active ? "bg-blue-900/50 border-blue-600 text-blue-300" : "bg-gray-950 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function formatReplayMinute(minute: number, maxMinute: number): string {
  if (minute <= 45) {
    return `${Math.floor(minute)}' — 1st Half`;
  }
  if (minute <= 90) {
    return `${Math.floor(minute)}' — 2nd Half`;
  }
  if (minute <= 105) {
    return `${Math.floor(minute)}' — ET 1st Half`;
  }
  if (minute <= 120) {
    return `${Math.floor(minute)}' — ET 2nd Half`;
  }
  return `${Math.floor(Math.min(minute, maxMinute))}' — Full Time`;
}
