import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Podium } from "./components/podium.js";
import { EuroPlate } from "./components/euro-plate.js";
import { invoke } from "./lib/invoke.js";
import type { PackSummary } from "./lib/packs.js";
import { pickLang } from "./lib/packs.js";
import { AMBER } from "./lib/ui.js";
import { firstUnmastered, resumeStep } from "./lib/progress.js";
import { useProgress } from "./lib/use-progress.js";
import garageHero from "./assets/garage-hero.webp";

/**
 * The garage — the app's landing screen. One composed scene: a European
 * workshop at blue hour, the brand plate as the headline, and the two
 * curricula anchored below with a progress-aware "continue" action.
 * Design rules per docs/GAME-DESIGN.md §Design references.
 */
const PACKS: Record<string, { name: string; code: string; role: string; accent: string }> = {
  eu: {
    name: "European Core",
    code: "EU",
    role: "Foundation · Vienna Convention",
    accent: "#4f7dff",
  },
  ro: { name: "Romania", code: "RO", role: "National · DRPCIV-aligned", accent: AMBER },
};
const PACK_ORDER = ["eu", "ro"] as const;

export function HomeView() {
  const [packs, setPacks] = useState<PackSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const navigate = useNavigate();
  const progress = useProgress();

  useEffect(() => {
    invoke<PackSummary[]>("packs:list")
      .then((data) => setPacks(data))
      .catch(() => setError("Could not load the study packs."));
  }, []);

  // Progress-aware resume: the pack with the learner's own progress leads.
  const resume = useMemo(() => {
    if (!packs) return null;
    return resumeStep(
      [...PACK_ORDER],
      Object.fromEntries(packs.map((p) => [p.country, p.chapters])),
      progress.state.chapters,
    );
  }, [packs, progress.state.chapters]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#0a0a12] to-[#000]">
        <p className="text-secondary">{error}</p>
      </div>
    );
  }

  if (!packs) {
    // Initial load: a garage shutter half-raised, light spilling underneath.
    return (
      <div className="relative flex h-full items-center justify-center overflow-hidden bg-[#0b0d13]">
        <div className="absolute inset-x-0 top-0 h-[58%] overflow-hidden rounded-b-xl" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(180deg, #1a1e28 0px, #1a1e28 26px, #12151d 26px, #12151d 34px)",
              boxShadow: "0 14px 40px rgba(0,0,0,0.6)",
            }}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[42%]" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,190,90,0.20) 0%, rgba(255,170,60,0.07) 45%, rgba(11,13,19,0) 100%), radial-gradient(60% 80% at 50% 0%, rgba(255,200,110,0.28), rgba(11,13,19,0) 70%)",
            }}
          />
        </div>
        <div className="relative flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-amber-200/90 motion-reduce:animate-none" />
          <p className="text-sm font-medium tracking-wide text-amber-100/80">Opening the garage…</p>
        </div>
      </div>
    );
  }

  const packsById = Object.fromEntries(packs.map((p) => [p.country, p]));
  const nextTitle = resume
    ? pickLang(
        packsById[resume.country]?.chapters.find((c) => c.id === resume.chapterId)?.title,
        "en",
      )
    : "";

  return (
    <div className="relative h-full overflow-y-auto bg-[#0b0d13]">
      {/* Garage hero backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <img
          src={garageHero}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        {/* Local scrims: protect the headline zone and ground the bays, keep
            the scene vivid between them (no full-frame dim). */}
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#0b0d13]/88 via-[#0b0d13]/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#0b0d13]/95 via-[#0b0d13]/55 to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.65)]" />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col px-6 pb-8 pt-9">
        {/* Headline: the brand plate carries the title */}
        <header className="flex flex-col items-center">
          <EuroPlate size="lg" code="EU" text="DriveQuest" ariaLabel="DriveQuest EU" />
          <p className="mt-3 text-sm font-medium text-white/70">
            One European standard. Your country&rsquo;s road rules.
          </p>
        </header>

        {/* Curricula: foundation first, national prep, reserved slot. The
            recommended bay carries the entry action (gold ring + next-up
            strip) so the learner's path is visible without a floating CTA. */}
        <div className="mt-auto grid flex-1 grid-cols-1 content-end gap-5 pt-8 md:grid-cols-2 xl:grid-cols-3">
          {packs
            .slice()
            .sort(
              (a, b) =>
                PACK_ORDER.indexOf(a.country as "eu") - PACK_ORDER.indexOf(b.country as "eu"),
            )
            .map((pack) => {
              const meta = PACKS[pack.country] ?? {
                name: pack.country,
                code: pack.country.toUpperCase(),
                role: "Curriculum",
                accent: "#9ca3af",
              };
              const exam = pack.examFormat ?? {
                passMinCorrect: 0,
                questionCount: pack.questionCount,
                timeLimitSec: 1800,
              };
              const isOpen = open === pack.country;
              const step = firstUnmastered(pack.country, pack.chapters, progress.state.chapters);
              const isNext = resume?.country === pack.country;
              return (
                <Podium
                  key={pack.country}
                  code={meta.code}
                  name={meta.name}
                  role={meta.role}
                  nextUp={isNext && nextTitle ? nextTitle : undefined}
                  variant={pack.country === "ro" ? "ro" : "eu"}
                  accent={meta.accent}
                  questions={pack.questionCount}
                  chapters={pack.chapters.length}
                  lawValidThrough={pack.lawValidThrough}
                  passMin={exam.passMinCorrect}
                  timeLimitMin={Math.round(exam.timeLimitSec / 60)}
                  expanded={isOpen}
                  onToggle={() => setOpen(isOpen ? null : pack.country)}
                  ctaLabel={step ? (step.started ? "Continue" : "Start") : "Review"}
                  onDrive={() => {
                    void navigate({
                      to: step ? "/chapter/$country/$chapterId" : "/map/$country",
                      params: step
                        ? { country: step.country, chapterId: step.chapterId }
                        : { country: pack.country },
                    });
                  }}
                />
              );
            })}

          {/* Reserved slot: a blank dealer plate — the promise of more
              countries, inside the scene, without fake content */}
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-center opacity-60">
            <EuroPlate size="lg" code="EU" text="" ariaLabel="Reserved for more countries" />
            <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
              Reserved
            </p>
            <p className="max-w-[190px] text-[11px] leading-snug text-white/35">
              More European countries roll in here soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
