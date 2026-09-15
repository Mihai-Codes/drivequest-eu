/**
 * Quick Challenge (CloudQuest's drone equivalent).
 *
 * Five random questions drawn only from mastered chapters. Timed but no-fail:
 * finishing always records a session and base XP; a perfect score adds a
 * bonus. Keeps mastered material fresh between chapters.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import { usePacks, pickLang, fetchQuestions } from "./lib/packs.js";
import type { Question } from "./lib/packs.js";
import { useProgress } from "./lib/use-progress.js";
import { toggleOption, optionKeys, scoreQuiz } from "./lib/quiz.js";
import { chapterKey, isMastered, XP } from "./lib/progress.js";
import { GlassCard, GhostButton, PrimaryButton, accentFor, EU_GOLD, INK } from "./lib/ui.js";
import { QuestionMedia } from "./components/question-media.js";

const LANG: Record<string, string> = { eu: "en", ro: "ro" };
const COUNT = 5;
const TIME_LIMIT = 90; // seconds, quick by design

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuickChallengeView() {
  const { country } = useParams({ from: "/quick/$country" });
  const navigate = useNavigate();
  const { packs } = usePacks();
  const progress = useProgress();
  const lang = LANG[country] ?? "en";
  const accent = accentFor(country);

  const pack = useMemo(() => packs?.find((p) => p.country === country) ?? null, [packs, country]);

  const masteredIds = useMemo(
    () =>
      (pack?.chapters ?? [])
        .filter((c) => isMastered(progress.state.chapters[chapterKey(country, c.id)]))
        .map((c) => c.id),
    [pack, progress.state.chapters, country],
  );

  const [pool, setPool] = useState<Question[] | null>(null);
  useEffect(() => {
    let live = true;
    if (masteredIds.length === 0) {
      setPool([]);
      return;
    }
    fetchQuestions(country)
      .then((all) => {
        if (!live) return;
        const inMastered = all.filter((q) => masteredIds.includes(q.chapter));
        setPool(shuffle(inMastered).slice(0, COUNT));
      })
      .catch(() => {
        if (live) setPool([]);
      });
    return () => {
      live = false;
    };
  }, [country, masteredIds.join(",")]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{ questionId: string; selected: string[] }[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [result, setResult] = useState<{ score: number; perfect: boolean } | null>(null);
  const finished = useRef(false);

  const finish = useCallback(
    (finalAnswers: { questionId: string; selected: string[] }[]) => {
      if (finished.current || !pool) return;
      finished.current = true;
      const scored = scoreQuiz(pool, finalAnswers);
      const score = scored.filter((s) => s.correct).length;
      const perfect = score === pool.length && pool.length > 0;
      progress.recordSession();
      progress.addXp(XP.quickChallenge + score * XP.correctAnswer + (perfect ? XP.quickPerfectBonus : 0));
      setResult({ score, perfect });
    },
    [pool, progress],
  );

  useEffect(() => {
    if (result || !pool || pool.length === 0) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finish(answers);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pool, result]);

  if (!packs || !progress.ready || pool === null) {
    return (
      <Center>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2d2d2d]/15 border-t-[#2d2d2d]/70 motion-reduce:animate-none" />
          <p className="text-[#2d2d2d]/60">Setting up your challenge…</p>
        </div>
      </Center>
    );
  }

  if (masteredIds.length === 0) {
    return (
      <Center>
        <GlassCard className="max-w-md p-8 text-center">
          <p className="text-lg font-bold" style={{ color: INK }}>
            Nothing to refresh yet
          </p>
          <p className="mt-2 text-sm text-[#2d2d2d]/60">
            Master a chapter first (score 80% or more on its test) and the Quick
            Challenge will quiz you on it here.
          </p>
          <div className="mt-5">
            <PrimaryButton accent={accent.accent} onClick={() => navigate({ to: "/map/$country", params: { country } })}>
              Back to map
            </PrimaryButton>
          </div>
        </GlassCard>
      </Center>
    );
  }

  if (result) {
    return (
      <Center>
        <GlassCard className="max-w-md p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: result.perfect ? "#b45309" : "#003399" }}>
            {result.perfect ? "Perfect run" : "Challenge complete"}
          </p>
          <p className="mt-3 text-4xl font-black tabular-nums" style={{ color: "#003399" }}>
            {result.score}<span className="text-xl text-[#2d2d2d]/40"> / {pool.length}</span>
          </p>
          <p className="mt-2 text-sm text-[#2d2d2d]/60">
            {result.perfect
              ? `Bonus XP earned. Mastery is holding strong.`
              : `Base XP earned. A little review will sharpen it.`}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <GhostButton onClick={() => navigate({ to: "/map/$country", params: { country } })}>
              Back to map
            </GhostButton>
          </div>
        </GlassCard>
      </Center>
    );
  }

  const q = pool[index];
  const choose = (key: string) => setSelected((sel) => toggleOption(q, sel, key));
  const submit = () => {
    const next = selected.length ? [...answers, { questionId: q.id, selected }] : answers;
    if (index + 1 >= pool.length) {
      finish(next);
    } else {
      setAnswers(next);
      setIndex((i) => i + 1);
      setSelected([]);
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: "#fbfaf7" }}>
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-32">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: EU_GOLD, color: INK }}>
              Quick Challenge
            </span>
            <span className="text-xs text-[#2d2d2d]/50">
              {index + 1} of {pool.length}
            </span>
          </div>
          <span
            className="rounded-full px-3 py-1 text-sm font-bold tabular-nums"
            style={{ backgroundColor: timeLeft <= 15 ? "#c7081b" : "#ffffffaa", color: timeLeft <= 15 ? "#fff" : INK }}
          >
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
        </div>

        <GlassCard className="p-6">
          <QuestionMedia country={country} media={q.media} alt="" className="mb-4 max-h-48 w-auto rounded-xl" />
          <h2 className="text-lg font-bold" style={{ color: INK }}>
            {pickLang(q.stem, lang)}
          </h2>
          <div className="mt-4 flex flex-col gap-2">
            {optionKeys(q, lang).map((key) => {
              const text = (q.options[lang] ?? q.options.en)?.[key] ?? key;
              const isSel = selected.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => choose(key)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    isSel ? "bg-white" : "border-[#2d2d2d]/15 bg-white/50"
                  }`}
                  style={{ color: INK, borderColor: isSel ? accent.accent : undefined }}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-black text-white"
                    style={{ backgroundColor: isSel ? accent.accent : "#2d2d2d33" }}
                  >
                    {key.toUpperCase()}
                  </span>
                  {text}
                </button>
              );
            })}
          </div>
          <div className="mt-6">
            <PrimaryButton accent={accent.accent} onClick={submit} disabled={selected.length === 0}>
              {index + 1 >= pool.length ? "Finish" : "Next"}
            </PrimaryButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center" style={{ backgroundColor: "#fbfaf7" }}>
      {children}
    </div>
  );
}
