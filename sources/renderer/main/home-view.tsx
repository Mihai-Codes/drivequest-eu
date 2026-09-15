import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Podium } from "./components/podium.js";

type PackSummary = {
  country: string;
  languages: string[];
  packVersion: string;
  lawValidThrough: string;
  chapters: { id: string; title: Record<string, string> }[];
  questionCount: number;
  fineCount: number;
  perChapter: Record<string, number>;
  examFormat?: { passMinCorrect: number; questionCount: number; timeLimitSec: number };
};

const invoke = (channel: string, ...args: unknown[]) =>
  (window as unknown as { glazeAPI: { glaze: { ipc: { invoke: (c: string, ...a: unknown[]) => Promise<unknown> } } } })
    .glazeAPI.glaze.ipc.invoke(channel, ...args);

const SHOWROOM: Record<string, { name: string; flag: string; color: string; accent: string }> = {
  eu: { name: "European Core", flag: "🇪🇺", color: "#1e3a8a", accent: "#3b82f6" },
  ro: { name: "Romania", flag: "🇷🇴", color: "#92400e", accent: "#f59e0b" },
};

export function HomeView() {
  const [packs, setPacks] = useState<PackSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    invoke("packs:list")
      .then((data) => setPacks(data as PackSummary[]))
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
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#0a0a12] to-[#000]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <p className="text-secondary">Preparing the showroom…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-[#0a0a12] via-[#0d0d1a] to-[#000]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-60 w-60 rounded-full bg-amber-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">
            DriveQuest EU
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Pick your vehicle. Learn the road rules. Pass the exam.
          </p>
          <p className="mt-1 text-xs text-white/30">Fully offline · No account needed</p>
        </header>

        {/* Showroom grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {packs.map((pack) => {
            const car = SHOWROOM[pack.country] ?? {
              name: pack.country,
              flag: "🚗",
              color: "#374151",
              accent: "#9ca3af",
            };
            const exam = pack.examFormat ?? { passMinCorrect: 0, questionCount: pack.questionCount, timeLimitSec: 1800 };
            const isOpen = open === pack.country;
            return (
              <Podium
                key={pack.country}
                name={car.name}
                flag={car.flag}
                variant={pack.country === "ro" ? "ro" : "eu"}
                color={car.color}
                accent={car.accent}
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
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-xs text-white/20">
          More countries coming soon · Rules current as of 2026-09
        </p>
      </div>
    </div>
  );
}
