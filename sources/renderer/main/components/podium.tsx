import { WheelSvg } from "./wheel-svg.js";
import { EuroPlate } from "./euro-plate.js";
import { click } from "../lib/sound.js";

interface PodiumProps {
  /** Country code for the plate band ("EU", "RO"). */
  code: string;
  name: string;
  /** One-line role of this pack, e.g. "Foundation · Vienna Convention". */
  role: string;
  /** When set, the card is the learner's next session: gold strip + ring. */
  nextUp?: string;
  variant: "eu" | "ro";
  accent: string;
  questions: number;
  chapters: number;
  lawValidThrough: string;
  passMin: number;
  timeLimitMin: number;
  expanded: boolean;
  onToggle: () => void;
  /** CTA label: "Start" for fresh chapters, "Continue" for started ones. */
  ctaLabel: string;
  onDrive: () => void;
}

export function Podium({
  code,
  name,
  role,
  nextUp,
  variant,
  accent,
  questions,
  chapters,
  lawValidThrough,
  passMin,
  timeLimitMin,
  expanded,
  onToggle,
  ctaLabel,
  onDrive,
}: PodiumProps) {
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-2xl backdrop-blur-xl transition-colors motion-safe:hover:border-white/25`}
      style={{
        // Liquid Glass cues (WWDC25): adaptive translucent material, specular
        // top edge, lensing inner ring — one material for every card.
        backgroundColor: "rgba(16,19,25,0.68)",
        backdropFilter: "blur(22px) saturate(150%)",
        WebkitBackdropFilter: "blur(22px) saturate(150%)",
        border: `1px solid ${nextUp ? "rgba(255,204,0,0.55)" : "rgba(255,255,255,0.14)"}`,
        boxShadow: nextUp
          ? "0 18px 44px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,204,0,0.18)"
          : "0 18px 44px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      {/* Wheel centrepiece over a subtle stage glow */}
      <div className="relative flex justify-center pt-5 pb-3">
        <div
          className="absolute bottom-0 h-10 w-40 rounded-[100%] blur-md"
          style={{ backgroundColor: `${accent}30` }}
          aria-hidden
        />
        <WheelSvg
          className="h-24 w-24 drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
          variant={variant}
        />
      </div>

      {/* Next-session strip (only on the recommended bay) */}
      {nextUp ? (
        <div
          className="flex items-center gap-2 bg-[#ffcc00]/12 px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffd75e]"
          style={{ fontFamily: "ui-rounded, -apple-system, system-ui" }}
        >
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffcc00] motion-reduce:animate-none"
            aria-hidden
          />
          Next up · {nextUp}
        </div>
      ) : null}

      {/* Identity row: plate chip + name + role */}
      <div className="flex items-center gap-3 px-5 pb-3">
        <EuroPlate size="sm" code={code} text={code} ariaLabel={`${code} pack`} />
        <div className="min-w-0 leading-tight">
          <h3 className="truncate text-base font-bold tracking-wide text-white">{name}</h3>
          <p className="truncate text-[11px] text-white/50">{role}</p>
        </div>
        <span className="font-rounded ml-auto shrink-0 text-right text-[11px] font-semibold tabular-nums text-white/70">
          {questions}
          <span className="block text-[9px] font-medium uppercase tracking-wider text-white/40">
            questions
          </span>
        </span>
      </div>

      {/* Spec strip */}
      <div className="mx-5 grid grid-cols-3 gap-2 rounded-lg border border-white/8 bg-black/30 p-2 text-center text-[11px]">
        <div>
          <div className="font-bold tabular-nums text-white">
            {passMin}/{questions}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/40">to pass</div>
        </div>
        <div>
          <div className="font-bold tabular-nums text-white">{timeLimitMin} min</div>
          <div className="text-[9px] uppercase tracking-wider text-white/40">exam timer</div>
        </div>
        <div>
          <div className="font-bold tabular-nums text-white">{chapters}</div>
          <div className="text-[9px] uppercase tracking-wider text-white/40">chapters</div>
        </div>
      </div>

      {/* Expandable details */}
      {expanded ? (
        <div className="mx-5 mt-2.5 space-y-1.5 rounded-lg border border-white/8 bg-black/25 p-3 text-[11px] text-white/60">
          <div className="flex justify-between">
            <span>Rules current as of</span>
            <span className="font-semibold text-white/90">{lawValidThrough}</span>
          </div>
          <div className="flex justify-between">
            <span>Exam format</span>
            <span className="font-semibold text-white/90">Multiple choice</span>
          </div>
          <div className="flex justify-between">
            <span>Pass threshold</span>
            <span className="font-semibold text-white/90">
              {Math.round((passMin / questions) * 100)}%
            </span>
          </div>
        </div>
      ) : null}

      {/* Footer: details toggle + the single primary CTA, inside the card */}
      <div className="mt-auto flex items-center gap-2 p-4 pt-3">
        <button
          type="button"
          onClick={() => {
            click("toggle");
            onToggle();
          }}
          className="rounded-lg border border-white/15 px-3 py-2 text-[11px] font-semibold text-white/60 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {expanded ? "Hide details" : "Details"}
        </button>
        <button
          type="button"
          onClick={() => {
            click("primary");
            onDrive();
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold tracking-wide text-white transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-safe:hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: accent }}
        >
          {ctaLabel}
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
