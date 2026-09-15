/**
 * Persistent top HUD: Driver Level (XP), daily streak, hearts with refill
 * timer, and the EU / RO pack selector. Sits below the drag region on every
 * screen. Color is semantic per the European brand system.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useRouterState } from "@tanstack/react-router";

import { useProgress } from "../lib/use-progress.js";
import { levelFor, nextHeartInMs, MAX_HEARTS } from "../lib/progress.js";
import { Heart, EU_BLUE, EU_GOLD, INK, AMBER } from "../lib/ui.js";

const PACKS = [
  { country: "eu", label: "EU", accent: EU_BLUE },
  { country: "ro", label: "RO", accent: AMBER },
];

function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Hud() {
  const navigate = useNavigate();
  const progress = useProgress();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  // Current pack from the route, defaulting to EU.
  const params = useParams({ strict: false }) as Record<string, string | undefined>;
  const activeCountry = params.country ?? "eu";

  const level = levelFor(progress.state.xp);
  const hearts = progress.hearts;

  // Live countdown to the next heart.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (hearts >= MAX_HEARTS) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [hearts]);
  const refillIn = nextHeartInMs(progress.state, Date.now());

  const goPack = (country: string) => {
    // Switching packs always lands on that pack's chapter map.
    navigate({ to: "/map/$country", params: { country } });
  };

  const showQuick = pathname.startsWith("/map");

  return (
    <header className="pointer-events-none fixed left-0 right-0 top-16 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-4 rounded-2xl border border-white/60 bg-white/60 px-4 py-2 shadow-[0_8px_30px_rgba(45,45,45,0.10)] backdrop-blur-xl">
        {/* Driver level */}
        <div className="flex items-center gap-2" title={`${progress.state.xp} XP total`}>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white"
            style={{ backgroundColor: EU_BLUE }}
          >
            {level}
          </span>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: `${INK}88` }}>
              Driver level
            </p>
            <p className="text-xs font-bold tabular-nums" style={{ color: INK }}>
              {progress.state.xp} XP
            </p>
          </div>
        </div>

        <Divider />

        {/* Streak */}
        <div className="flex items-center gap-1.5" title="Consecutive days with a completed session">
          <Flame active={progress.state.streakDays > 0} />
          <span className="text-sm font-bold tabular-nums" style={{ color: INK }}>
            {progress.state.streakDays}
          </span>
        </div>

        <Divider />

        {/* Hearts */}
        <div className="flex items-center gap-1" title="Hearts for practice. One refills every 30 min.">
          {Array.from({ length: MAX_HEARTS }).map((_, i) => (
            <Heart key={i} filled={i < hearts} />
          ))}
          {hearts < MAX_HEARTS && refillIn > 0 ? (
            <span className="ml-1 text-[10px] font-semibold tabular-nums" style={{ color: `${INK}77` }}>
              +1 in {fmtCountdown(refillIn)}
            </span>
          ) : null}
        </div>

        <div className="flex-1" />

        {/* Quick Challenge */}
        {showQuick ? (
          <button
            type="button"
            onClick={() => navigate({ to: "/quick/$country", params: { country: activeCountry } })}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-opacity motion-safe:hover:opacity-90"
            style={{ backgroundColor: EU_GOLD, color: INK }}
            title="5 quick questions from mastered chapters"
          >
            <Bolt /> Quick Challenge
          </button>
        ) : null}

        {/* Pack selector */}
        <div className="flex items-center rounded-xl border border-white/60 bg-white/50 p-0.5">
          {PACKS.map((p) => {
            const active = p.country === activeCountry;
            return (
              <button
                key={p.country}
                type="button"
                onClick={() => goPack(p.country)}
                className="rounded-lg px-3 py-1 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: active ? p.accent : "transparent",
                  color: active ? "#fff" : `${INK}99`,
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function Divider() {
  return <span className="h-6 w-px" style={{ backgroundColor: `${INK}22` }} aria-hidden />;
}

function Flame({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={active ? "#f97316" : "none"}
      stroke={active ? "#f97316" : `${INK}55`}
      strokeWidth="1.8"
    >
      <path d="M12 2s1 3-1 6c-1.4 2.1-3 3.4-3 6a5 5 0 0010 0c0-2-1-3.5-2-5-.4 1-1 1.7-2 2 .5-2.5-.5-6-2-9z" />
    </svg>
  );
}

function Bolt() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}
