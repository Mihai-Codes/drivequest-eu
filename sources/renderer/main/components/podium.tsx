import { WheelSvg } from "./wheel-svg.js";

interface PodiumProps {
  name: string;
  flag: string;
  variant: "eu" | "ro";
  color: string;
  accent: string;
  questions: number;
  chapters: number;
  lawValidThrough: string;
  passMin: number;
  timeLimitMin: number;
  expanded: boolean;
  onToggle: () => void;
  onDrive: () => void;
}

export function Podium({
  name,
  flag,
  variant,
  accent,
  questions,
  chapters,
  lawValidThrough,
  passMin,
  timeLimitMin,
  expanded,
  onToggle,
  onDrive,
}: PodiumProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Flag badge */}
      <div className="mb-2 text-3xl drop-shadow-lg">{flag}</div>

      {/* Wheel on podium */}
      <div
        className={`relative w-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-black/30 ${
          expanded ? "scale-[1.02]" : ""
        }`}
      >
        {/* Wheel SVG */}
        <div className="mb-3 flex justify-center">
          <WheelSvg className="h-20 w-44 drop-shadow-xl" variant={variant} />
        </div>

        {/* Name plate */}
        <div className="mb-3 text-center">
          <h3 className="text-lg font-bold tracking-wide text-white">{name}</h3>
          <p className="text-xs text-white/50">
            {questions} questions · {chapters} chapters
          </p>
        </div>

        {/* Spec plate (always visible) */}
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg bg-black/30 p-2 text-center text-xs">
          <div>
            <div className="font-semibold text-white">{passMin}/{questions}</div>
            <div className="text-white/40">to pass</div>
          </div>
          <div>
            <div className="font-semibold text-white">{timeLimitMin}min</div>
            <div className="text-white/40">time limit</div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="w-full rounded-lg bg-white/10 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          {expanded ? "Hide details ▾" : "Show details ▸"}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-2 rounded-lg bg-black/20 p-3 text-xs text-white/60">
            <div className="flex justify-between">
              <span>Rules current as of</span>
              <span className="font-medium text-white/90">{lawValidThrough}</span>
            </div>
            <div className="flex justify-between">
              <span>Exam format</span>
              <span className="font-medium text-white/90">Multiple choice</span>
            </div>
            <div className="flex justify-between">
              <span>Pass threshold</span>
              <span className="font-medium text-white/90">
                {Math.round((passMin / questions) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Drive button — carries the pack's brand accent */}
      <button
        onClick={onDrive}
        className="mt-4 rounded-xl px-8 py-3 text-sm font-bold tracking-wide text-white shadow-lg transition-all motion-safe:hover:opacity-90 motion-safe:hover:shadow-xl active:scale-95"
        style={{ backgroundColor: accent, boxShadow: `0 10px 24px ${accent}55` }}
      >
        DRIVE
      </button>
    </div>
  );
}
