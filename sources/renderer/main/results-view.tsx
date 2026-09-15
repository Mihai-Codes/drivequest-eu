/**
 * Results screen after a Test.
 *
 * Score, accuracy, time and stars up top; article-cited explanations for every
 * question below; and the next action (Retry / Next chapter / Back to map).
 * Reads the outcome from router search params written by the Test stage.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { usePacks, pickLang, fetchQuestions } from "./lib/packs.js";
import type { Question } from "./lib/packs.js";
import { GlassCard, GhostButton, PrimaryButton, Stars, accentFor } from "./lib/ui.js";
import { QuestionMedia } from "./components/question-media.js";

const LANG: Record<string, string> = { eu: "en", ro: "ro" };

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ResultsView() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const { packs } = usePacks();

  const country = typeof search.country === "string" ? search.country : "eu";
  const chapterId = typeof search.chapterId === "string" ? search.chapterId : "";
  const score = Number(search.score ?? 0);
  const total = Number(search.total ?? 0);
  const accuracy = Number(search.accuracy ?? 0);
  const timeSec = Number(search.timeSec ?? 0);
  const stars = Number(search.stars ?? 0);
  const passed = Number(search.passed ?? 0) === 1;

  const lang = LANG[country] ?? "en";
  const accent = accentFor(country);
  const pack = useMemo(() => packs?.find((p) => p.country === country) ?? null, [packs, country]);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  useEffect(() => {
    let live = true;
    if (!chapterId) return;
    fetchQuestions(country, chapterId)
      .then((qs) => {
        if (live) setQuestions(qs);
      })
      .catch(() => {
        if (live) setQuestions([]);
      });
    return () => {
      live = false;
    };
  }, [country, chapterId]);

  // Find the next chapter (for the primary next action).
  const nextChapter = useMemo(() => {
    if (!pack) return null;
    const idx = pack.chapters.findIndex((c) => c.id === chapterId);
    return idx >= 0 && idx + 1 < pack.chapters.length ? pack.chapters[idx + 1] : null;
  }, [pack, chapterId]);

  const pct = Math.round(accuracy * 100);

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: "#fbfaf7" }}>
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-20">
        {/* Headline */}
        <GlassCard className="p-8 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: passed ? "#15803d" : "#c7081b" }}
          >
            {passed ? "You passed" : "Keep practising"}
          </p>
          <div className="mt-3 flex items-center justify-center">
            <Stars count={stars} className="scale-150" />
          </div>
          <p className="mt-4 text-4xl font-black tabular-nums" style={{ color: "#003399" }}>
            {score}<span className="text-xl text-[#2d2d2d]/40"> / {total}</span>
          </p>
          <p className="mt-1 text-sm text-[#2d2d2d]/60">
            {pct}% accuracy · {fmtTime(timeSec)}
          </p>

          {/* Next actions */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <GhostButton
              onClick={() => navigate({ to: "/chapter/$country/$chapterId", params: { country, chapterId } })}
            >
              Retry
            </GhostButton>
            {passed && nextChapter ? (
              <PrimaryButton
                accent={accent.accent}
                onClick={() =>
                  navigate({
                    to: "/chapter/$country/$chapterId",
                    params: { country, chapterId: nextChapter.id },
                  })
                }
              >
                Next chapter →
              </PrimaryButton>
            ) : null}
            <PrimaryButton
              accent={passed && nextChapter ? undefined : accent.accent}
              onClick={() => navigate({ to: "/map/$country", params: { country } })}
            >
              Back to map
            </PrimaryButton>
          </div>
        </GlassCard>

        {/* Explanations */}
        <h2 className="mb-3 mt-10 text-lg font-bold" style={{ color: "#003399" }}>
          Review the answers
        </h2>
        {questions === null ? (
          <p className="text-sm text-[#2d2d2d]/50">Loading explanations…</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-[#2d2d2d]/50">No questions to review.</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {questions.map((q, i) => (
              <li key={q.id}>
                <GlassCard className="p-5">
                  <p className="text-xs font-semibold text-[#2d2d2d]/40">Question {i + 1}</p>
                  <QuestionMedia
                    country={country}
                    media={q.media}
                    alt=""
                    className="mt-2 max-h-40 w-auto rounded-lg"
                  />
                  <h3 className="mt-1 font-semibold text-[#2d2d2d]">{pickLang(q.stem, lang)}</h3>
                  <p className="mt-2 text-sm text-[#2d2d2d]/80">{pickLang(q.explanation, lang)}</p>
                  <p className="mt-2 text-xs text-[#2d2d2d]/50">Source: {q.article}</p>
                </GlassCard>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
