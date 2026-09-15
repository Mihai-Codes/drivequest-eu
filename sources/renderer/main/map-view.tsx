/**
 * Chapter map: the pack's chapters rendered as a vertical flow of checkpoints.
 *
 * Each node shows localized title, status, completion, best accuracy and best
 * time, and routes into the Learn → Practice → Test flow. Chapter N unlocks
 * only after chapter N-1 is mastered (>= MASTERY_ACCURACY). The showroom at /
 * is untouched; this is the per-pack container at /map/:country.
 */
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import { usePacks, pickLang } from "./lib/packs.js";
import { useProgress } from "./lib/use-progress.js";
import type { ChapterProgress } from "./lib/progress.js";
import { chapterKey, effectiveStatus, isMastered } from "./lib/progress.js";
import { GlassCard, Stars, GhostButton, PrimaryButton, accentFor } from "./lib/ui.js";

const LANG: Record<string, string> = { eu: "en", ro: "ro" };

function fmtTime(sec: number | null): string {
  if (sec == null) return "--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StatusChip({ status }: { status: string }) {
  const label: Record<string, string> = {
    locked: "Locked",
    available: "Start",
    in_progress: "In progress",
    mastered: "Mastered",
  };
  const color: Record<string, string> = {
    locked: "#2d2d2d66",
    available: "#003399",
    in_progress: "#b45309",
    mastered: "#15803d",
  };
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color: color[status] ?? "#2d2d2d", backgroundColor: "#ffffff88" }}
    >
      {label[status] ?? status}
    </span>
  );
}

export function MapView() {
  const { country } = useParams({ from: "/map/$country" });
  const navigate = useNavigate();
  const { packs, error } = usePacks();
  const { state, ready } = useProgress();
  const lang = LANG[country] ?? "en";

  const pack = useMemo(() => packs?.find((p) => p.country === country) ?? null, [packs, country]);
  const accent = accentFor(country);

  if (error) {
    return (
      <Center>
        <p className="text-[#2d2d2d]/70">{error}</p>
      </Center>
    );
  }
  if (!packs || !ready) {
    return (
      <Center>
        <Spinner label="Loading your map…" />
      </Center>
    );
  }
  if (!pack) {
    return (
      <Center>
        <div className="flex flex-col items-center gap-4">
          <p className="text-[#2d2d2d]/70">That pack is not available yet.</p>
          <GhostButton onClick={() => navigate({ to: "/" })}>Back to showroom</GhostButton>
        </div>
      </Center>
    );
  }

  const chapters: ChapterProgress[] = pack.chapters.map(
    (c) => state.chapters[chapterKey(country, c.id)] ?? {
      status: "locked",
      stars: 0,
      bestAccuracy: 0,
      bestTimeSec: null,
    },
  );
  const masteredCount = chapters.filter((c) => isMastered(c)).length;

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: "#fbfaf7" }}>
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-32">
        {/* Header */}
        <header className="mb-8">
          <GhostButton onClick={() => navigate({ to: "/" })} className="mb-4">
            ← Showroom
          </GhostButton>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: "#2d2d2d" }}>
            {country === "ro" ? "Romania" : "European Core"} licence map
          </h1>
          <p className="mt-1 text-sm text-[#2d2d2d]/60">
            Master each checkpoint to unlock the next. {masteredCount} of {pack.chapters.length} mastered.
          </p>
        </header>

        {/* Node flow */}
        <ol className="relative flex flex-col gap-4">
          {pack.chapters.map((chapter, i) => {
            const prog = chapters[i];
            const mastered = isMastered(prog);
            const rawStatus = effectiveStatus(prog, i, chapters[i - 1]);
            const status = mastered ? "mastered" : rawStatus;
            const locked = status === "locked";
            const completion = Math.round(prog.bestAccuracy * 100);
            return (
              <li key={chapter.id} className="relative">
                {/* connector line */}
                {i < pack.chapters.length - 1 ? (
                  <span
                    className="absolute left-[27px] top-[64px] h-[calc(100%-40px)] w-0.5"
                    style={{ backgroundColor: isMastered(prog) ? accent.accent : "#2d2d2d22" }}
                    aria-hidden
                  />
                ) : null}
                <GlassCard
                  className={`relative flex items-center gap-4 p-4 transition-transform ${
                    locked ? "opacity-60" : "motion-safe:hover:-translate-y-0.5"
                  } ${mastered ? "dq-mastered-card" : ""}`}
                >
                  {/* node badge */}
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-inner"
                    style={{
                      backgroundColor: locked ? "#2d2d2d33" : accent.accent,
                    }}
                  >
                    {locked ? (
                      <LockIcon />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </div>

                  {/* body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-bold" style={{ color: "#2d2d2d" }}>
                        {pickLang(chapter.title, lang)}
                      </h2>
                      <StatusChip status={status} />
                      {prog.stars > 0 ? <Stars count={prog.stars} /> : null}
                    </div>
                    {/* completion bar */}
                    <div className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-[#2d2d2d]/10">
                      <div
                        className="h-full rounded-full transition-all motion-safe:duration-500"
                        style={{ width: `${completion}%`, backgroundColor: accent.accent }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-[#2d2d2d]/60">
                      {completion}% complete · Best time {fmtTime(prog.bestTimeSec)} ·{" "}
                      {pack.perChapter[chapter.id] ?? 0} questions
                    </p>
                  </div>

                  {/* action */}
                  <div className="shrink-0">
                    <PrimaryButton
                      accent={accent.accent}
                      disabled={locked}
                      onClick={() =>
                        navigate({
                          to: "/chapter/$country/$chapterId",
                          params: { country, chapterId: chapter.id },
                        })
                      }
                    >
                      {status === "mastered" ? "Review" : status === "in_progress" ? "Continue" : "Start"}
                    </PrimaryButton>
                  </div>
                </GlassCard>
              </li>
            );
          })}
        </ol>

        {/* Legislation freshness */}
        <p className="mt-10 text-center text-xs text-[#2d2d2d]/40">
          Legislation current as of {pack.lawValidThrough} · Unofficial study aid, always confirm with the law
        </p>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 118 0v4" />
    </svg>
  );
}

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center" style={{ backgroundColor: "#fbfaf7" }}>
      {children}
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2d2d2d]/15 border-t-[#2d2d2d]/70 motion-reduce:animate-none" />
      <p className="text-[#2d2d2d]/60">{label}</p>
    </div>
  );
}
