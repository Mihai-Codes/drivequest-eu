import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Podium } from "./components/podium.js";
import { invoke } from "./lib/invoke.js";
import type { PackSummary } from "./lib/packs.js";
import { EU_BLUE, AMBER } from "./lib/ui.js";
import garageHero from "./assets/garage-hero.webp";

/**
 * The garage — the app's landing screen. A lived-in European workshop at
 * blue hour: the hero photo sets the scene, pack cards hang like work
 * tickets in the bays, and DRIVE rolls the car out. Design language per
 * docs/GAME-DESIGN.md (Rockstar-grade world detail, GT7-style licence
 * framing, all European).
 */
const BAYS: Record<
  string,
  { name: string; flag: string; color: string; accent: string; bay: string }
> = {
  eu: { name: "European Core", flag: "🇪🇺", color: EU_BLUE, accent: EU_BLUE, bay: "01" },
  ro: { name: "Romania", flag: "🇷🇴", color: AMBER, accent: AMBER, bay: "02" },
};

/** Euro-plate-styled bay marker (DIN Condensed ships with macOS). */
function BayPlate({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-black/45 px-3 py-1 text-sm font-bold tracking-[0.18em] text-white/90 shadow-md backdrop-blur-sm"
      style={{ fontFamily: '"DIN Condensed", "DIN Alternate", system-ui' }}
    >
      <span
        className="inline-block h-3.5 w-1.5 rounded-[2px]"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function HomeView() {
  const [packs, setPacks] = useState<PackSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    invoke<PackSummary[]>("packs:list")
      .then((data) => setPacks(data))
      .catch(() => setError("Could not load the study packs."));
  }, []);

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
        {/* Scrims: calm the top for the title, ground the bottom for the cards */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d13]/85 via-[#0b0d13]/35 to-[#0b0d13]/92" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_100%,rgba(0,0,0,0.55),rgba(0,0,0,0)_70%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1
            className="text-4xl font-black uppercase tracking-[0.14em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
            style={{ fontFamily: '"DIN Condensed", "DIN Alternate", system-ui' }}
          >
            DriveQuest EU
          </h1>
          <p className="mt-2 text-sm text-white/65 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
            Pick your vehicle. Learn the road rules. Pass the exam.
          </p>
        </header>

        {/* Garage bays — one per country pack */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {packs.map((pack) => {
            const bay = BAYS[pack.country] ?? {
              name: pack.country,
              flag: "🚗",
              color: "#374151",
              accent: "#9ca3af",
              bay: "–",
            };
            const exam = pack.examFormat ?? {
              passMinCorrect: 0,
              questionCount: pack.questionCount,
              timeLimitSec: 1800,
            };
            const isOpen = open === pack.country;
            return (
              <div key={pack.country} className="flex flex-col items-center">
                <BayPlate
                  label={`BAY ${bay.bay} · ${bay.name.toUpperCase()}`}
                  accent={bay.accent}
                />
                <div className="mt-2">
                  <Podium
                    name={bay.name}
                    flag={bay.flag}
                    variant={pack.country === "ro" ? "ro" : "eu"}
                    color={bay.color}
                    accent={bay.accent}
                    questions={pack.questionCount}
                    chapters={pack.chapters.length}
                    lawValidThrough={pack.lawValidThrough}
                    passMin={exam.passMinCorrect}
                    timeLimitMin={Math.round(exam.timeLimitSec / 60)}
                    expanded={isOpen}
                    onToggle={() => setOpen(isOpen ? null : pack.country)}
                    onDrive={() => {
                      navigate({ to: "/map/$country", params: { country: pack.country } });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-xs text-white/25">
          More countries coming soon · Rules current as of 2026-09
        </p>
      </div>
    </div>
  );
}
