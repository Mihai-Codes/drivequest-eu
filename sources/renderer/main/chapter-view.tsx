/**
 * Chapter flow: Learn → Practice → Test for a single chapter.
 *
 * - Learn: one theory card, no quiz.
 * - Practice: untimed, explanation after each answer, hearts cost one per miss.
 * - Test: timed by examFormat, no explanations until the end, pass/fail by
 *   passMinCorrect, awards stars + XP and unlocks the next chapter.
 *
 * Illustrations come through the shared QuestionMedia component.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import { usePacks, pickLang, fetchQuestions } from "./lib/packs.js";
import type { Question } from "./lib/packs.js";
import { useProgress } from "./lib/use-progress.js";
import {
  isCorrect,
  toggleOption,
  seededShuffle,
  optionKeys,
  scoreQuiz,
  accuracyOf,
} from "./lib/quiz.js";
import type { Answer } from "./lib/quiz.js";
import { chapterKey, starsFor, XP } from "./lib/progress.js";
import { GlassCard, GhostButton, PrimaryButton, Heart, accentFor } from "./lib/ui.js";
import { QuestionMedia } from "./components/question-media.js";

const LANG: Record<string, string> = { eu: "en", ro: "ro" };
type Stage = "learn" | "practice" | "test";

export function ChapterView() {
  const { country, chapterId } = useParams({ from: "/chapter/$country/$chapterId" });
  const navigate = useNavigate();
  const { packs } = usePacks();
  const progress = useProgress();
  const lang = LANG[country] ?? "en";
  const accent = accentFor(country);

  const pack = useMemo(() => packs?.find((p) => p.country === country) ?? null, [packs, country]);
  const chapterMeta = pack?.chapters.find((c) => c.id === chapterId) ?? null;

  const [stage, setStage] = useState<Stage>("learn");
  const [questions, setQuestions] = useState<Question[] | null>(null);

  useEffect(() => {
    let live = true;
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

  // Mark the chapter in progress as soon as the learner starts it.
  useEffect(() => {
    if (!chapterMeta) return;
    const key = chapterKey(country, chapterId);
    const cur = progress.state.chapters[key];
    if (!cur || cur.status === "locked" || cur.status === "available") {
      progress.updateChapter(country, chapterId, { status: "in_progress" });
    }
  }, [chapterMeta, country, chapterId]);

  if (!packs || !progress.ready || questions === null) {
    return <Loading label="Preparing your chapter…" />;
  }
  if (!pack || !chapterMeta) {
    return (
      <Center>
        <div className="flex flex-col items-center gap-4">
          <p className="text-[#2d2d2d]/70">That chapter is not available.</p>
          <GhostButton onClick={() => navigate({ to: "/map/$country", params: { country } })}>
            Back to map
          </GhostButton>
        </div>
      </Center>
    );
  }

  const title = pickLang(chapterMeta.title, lang);

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: "#fbfaf7" }}>
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-32">
        <GhostButton
          onClick={() => navigate({ to: "/map/$country", params: { country } })}
          className="mb-4"
        >
          ← Map
        </GhostButton>

        {/* Stage tabs */}
        <div className="mb-6 flex items-center gap-2">
          {(["learn", "practice", "test"] as Stage[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: stage === s ? accent.accent : "#ffffffaa",
                  color: stage === s ? "#fff" : "#2d2d2d99",
                }}
              >
                {i + 1}. {s === "learn" ? "Learn" : s === "practice" ? "Practice" : "Test"}
              </span>
              {i < 2 ? <span className="text-[#2d2d2d]/30">→</span> : null}
            </div>
          ))}
        </div>

        <h1 className="mb-6 text-2xl font-black tracking-tight" style={{ color: "#003399" }}>
          {title}
        </h1>

        {stage === "learn" ? (
          <LearnCard
            country={country}
            title={title}
            accent={accent.accent}
            onDone={() => setStage("practice")}
          />
        ) : stage === "practice" ? (
          <PracticeStage
            country={country}
            lang={lang}
            questions={questions}
            accent={accent.accent}
            progress={progress}
            onDone={() => setStage("test")}
          />
        ) : (
          <TestStage
            country={country}
            lang={lang}
            chapterId={chapterId}
            questions={questions}
            accent={accent.accent}
            progress={progress}
            onFinish={(result) =>
              navigate({
                to: "/results",
                search: {
                  country,
                  chapterId,
                  score: result.score,
                  total: result.total,
                  accuracy: result.accuracy,
                  timeSec: result.timeSec,
                  stars: result.stars,
                  passed: result.passed ? 1 : 0,
                },
              })
            }
          />
        )}
      </div>
    </div>
  );
}

// ---- Learn ---------------------------------------------------------------

function LearnCard({
  country,
  title,
  accent,
  onDone,
}: {
  country: string;
  title: string;
  accent: string;
  onDone: () => void;
}) {
  return (
    <GlassCard className="p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#2d2d2d]/50">
        Quick theory
      </p>
      <h2 className="mt-2 text-xl font-bold text-[#2d2d2d]">{title}</h2>
      <p className="mt-4 leading-relaxed text-[#2d2d2d]/80">
        Read the key rules for this topic, then test yourself. There is no timer
        here. Take a moment to understand the ideas before you answer questions
        on them. Each answer later cites the exact article of law it comes from.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <PrimaryButton accent={accent} onClick={onDone}>
          Start practice
        </PrimaryButton>
      </div>
      <p className="mt-4 text-xs text-[#2d2d2d]/40">Pack {country.toUpperCase()} · theory card</p>
    </GlassCard>
  );
}

// ---- Practice -------------------------------------------------------------

function PracticeStage({
  country,
  lang,
  questions,
  accent,
  progress,
  onDone,
}: {
  country: string;
  lang: string;
  questions: Question[];
  accent: string;
  progress: ReturnType<typeof useProgress>;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const q = questions[index];

  const hearts = progress.hearts;
  const outOfHearts = hearts <= 0;

  const choose = (key: string) => {
    if (checked || outOfHearts) return;
    setSelected((sel) => toggleOption(q, sel, key));
  };

  const check = () => {
    if (selected.length === 0) return;
    setChecked(true);
    if (!isCorrect(q, selected)) {
      progress.loseHeart();
    } else {
      progress.addXp(XP.correctAnswer);
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      progress.recordSession();
      onDone();
    } else {
      setIndex((i) => i + 1);
      setSelected([]);
      setChecked(false);
    }
  };

  if (!q) {
    return (
      <GlassCard className="p-8">
        <p className="text-[#2d2d2d]/70">No practice questions in this chapter yet.</p>
        <div className="mt-4">
          <PrimaryButton accent={accent} onClick={onDone}>
            Go to test
          </PrimaryButton>
        </div>
      </GlassCard>
    );
  }

  const wasCorrect = checked && isCorrect(q, selected);

  return (
    <GlassCard className="p-6">
      {/* header: progress + hearts */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold text-[#2d2d2d]/50">
          Question {index + 1} of {questions.length}
        </p>
        <div className="flex items-center gap-1" aria-label={`${hearts} hearts left`}>
          {[0, 1, 2].map((i) => (
            <Heart key={i} filled={i < hearts} />
          ))}
        </div>
      </div>

      <QuestionMedia country={country} media={q.media} alt="" className="mb-4 max-h-48 w-auto rounded-xl" />

      <h2 className="text-lg font-bold text-[#2d2d2d]">{pickLang(q.stem, lang)}</h2>

      <div className="mt-4 flex flex-col gap-2">
        {optionKeys(q, lang).map((key) => {
          const text = (q.options[lang] ?? q.options.en)?.[key] ?? key;
          const isSel = selected.includes(key);
          const isAns = q.correct.map((c) => c.toLowerCase()).includes(key.toLowerCase());
          let ring = "border-[#2d2d2d]/15 bg-white/50";
          if (checked && isAns) ring = "border-green-600/60 bg-green-50";
          else if (checked && isSel && !isAns) ring = "border-[#c7081b]/60 bg-red-50";
          else if (isSel) ring = "border-current";
          return (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              disabled={checked || outOfHearts}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium text-[#2d2d2d] transition-colors disabled:cursor-default ${ring}`}
              style={isSel && !checked ? { borderColor: accent, backgroundColor: "#ffffff" } : undefined}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-black text-white"
                style={{ backgroundColor: isSel ? accent : "#2d2d2d33" }}
              >
                {key.toUpperCase()}
              </span>
              {text}
            </button>
          );
        })}
      </div>

      {/* explanation after answering */}
      {checked ? (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm ${
            wasCorrect ? "border-green-600/30 bg-green-50" : "border-[#c7081b]/30 bg-red-50"
          }`}
        >
          <p className="font-semibold text-[#2d2d2d]">
            {wasCorrect ? "Correct." : "Not quite."}
          </p>
          <p className="mt-1 text-[#2d2d2d]/80">{pickLang(q.explanation, lang)}</p>
          <p className="mt-2 text-xs text-[#2d2d2d]/50">Source: {q.article}</p>
        </div>
      ) : null}

      {outOfHearts ? (
        <div className="mt-4 rounded-xl border border-[#c7081b]/30 bg-red-50 p-4 text-sm text-[#2d2d2d]">
          You are out of hearts. Hearts refill over time, or come back next session.
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        {!checked ? (
          <PrimaryButton accent={accent} onClick={check} disabled={selected.length === 0 || outOfHearts}>
            Check answer
          </PrimaryButton>
        ) : (
          <PrimaryButton accent={accent} onClick={next}>
            {index + 1 >= questions.length ? "Continue to test" : "Next question"}
          </PrimaryButton>
        )}
        <span className="text-xs text-[#2d2d2d]/40">
          {q.type === "multi" ? "Select all that apply" : "Select one"}
        </span>
      </div>
    </GlassCard>
  );
}

// ---- Test -----------------------------------------------------------------

type TestResult = {
  score: number;
  total: number;
  accuracy: number;
  timeSec: number;
  stars: number;
  passed: boolean;
};

function TestStage({
  country,
  lang,
  chapterId,
  questions,
  accent,
  progress,
  onFinish,
}: {
  country: string;
  lang: string;
  chapterId: string;
  questions: Question[];
  accent: string;
  progress: ReturnType<typeof useProgress>;
  onFinish: (r: TestResult) => void;
}) {
  const { packs } = usePacks();
  const pack = packs?.find((p) => p.country === country);
  const exam = pack?.examFormat;
  const timeLimit = exam?.timeLimitSec ?? 1800;
  const passMin = exam?.passMinCorrect ?? Math.ceil(questions.length * 0.8);

  const seed = useRef(Date.now() % 2147483647);
  const ordered = useMemo(
    () => seededShuffle(questions, seed.current).slice(0, exam?.questionCount ?? questions.length),
    [questions, exam],
  );

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const startRef = useRef(Date.now());
  const finished = useRef(false);

  const finish = useCallback(
    (finalAnswers: Answer[]) => {
      if (finished.current) return;
      finished.current = true;
      const scored = scoreQuiz(ordered, finalAnswers);
      const score = scored.filter((s) => s.correct).length;
      const total = ordered.length;
      const accuracy = accuracyOf(scored);
      const timeSec = Math.round((Date.now() - startRef.current) / 1000);
      const passed = score >= passMin;
      const stars = starsFor(accuracy);

      // Persist: session, XP, chapter record.
      progress.recordSession();
      let xp = score * XP.correctAnswer;
      if (passed) {
        xp += XP.passTest + stars * XP.star;
        if (accuracy >= 1) xp += XP.perfectTest;
      }
      progress.addXp(xp);

      const key = chapterKey(country, chapterId);
      const cur = progress.state.chapters[key];
      const best = Math.max(cur?.bestAccuracy ?? 0, accuracy);
      const bestTime =
        passed && (cur?.bestTimeSec == null || timeSec < cur.bestTimeSec)
          ? timeSec
          : (cur?.bestTimeSec ?? null);
      progress.setChapter(country, chapterId, {
        status: best >= 0.8 ? "mastered" : "in_progress",
        stars: Math.max(cur?.stars ?? 0, stars) as 0 | 1 | 2 | 3,
        bestAccuracy: best,
        bestTimeSec: bestTime,
      });

      onFinish({ score, total, accuracy, timeSec, stars, passed });
    },
    [ordered, passMin, onFinish, progress, country, chapterId],
  );

  // countdown
  useEffect(() => {
    if (timeLimit <= 0) return;
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
  }, [timeLimit]);

  const q = ordered[index];
  const choose = (key: string) => setSelected((sel) => toggleOption(q, sel, key));

  const submit = () => {
    const next = selected.length ? [...answers, { questionId: q.id, selected }] : answers;
    if (index + 1 >= ordered.length) {
      finish(next);
    } else {
      setAnswers(next);
      setIndex((i) => i + 1);
      setSelected([]);
    }
  };

  if (!q) {
    return (
      <GlassCard className="p-8">
        <p className="text-[#2d2d2d]/70">No test questions in this chapter yet.</p>
      </GlassCard>
    );
  }

  const mm = Math.floor(timeLeft / 60);
  const ss = String(timeLeft % 60).padStart(2, "0");
  const lowTime = timeLeft <= 60;

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold text-[#2d2d2d]/50">
          Question {index + 1} of {ordered.length}
        </p>
        <span
          className="rounded-full px-3 py-1 text-sm font-bold tabular-nums"
          style={{ backgroundColor: lowTime ? "#c7081b" : "#ffffffaa", color: lowTime ? "#fff" : "#2d2d2d" }}
        >
          {mm}:{ss}
        </span>
      </div>

      <QuestionMedia country={country} media={q.media} alt="" className="mb-4 max-h-48 w-auto rounded-xl" />

      <h2 className="text-lg font-bold text-[#2d2d2d]">{pickLang(q.stem, lang)}</h2>

      <div className="mt-4 flex flex-col gap-2">
        {optionKeys(q, lang).map((key) => {
          const text = (q.options[lang] ?? q.options.en)?.[key] ?? key;
          const isSel = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium text-[#2d2d2d] transition-colors ${
                isSel ? "bg-white" : "border-[#2d2d2d]/15 bg-white/50"
              }`}
              style={isSel ? { borderColor: accent } : undefined}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-black text-white"
                style={{ backgroundColor: isSel ? accent : "#2d2d2d33" }}
              >
                {key.toUpperCase()}
              </span>
              {text}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <PrimaryButton accent={accent} onClick={submit} disabled={selected.length === 0}>
          {index + 1 >= ordered.length ? "Finish test" : "Next question"}
        </PrimaryButton>
        <span className="text-xs text-[#2d2d2d]/40">
          Pass mark {passMin} of {ordered.length} · explanations at the end
        </span>
      </div>
    </GlassCard>
  );
}

// ---- Shared bits -----------------------------------------------------------

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center" style={{ backgroundColor: "#fbfaf7" }}>
      {children}
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <Center>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2d2d2d]/15 border-t-[#2d2d2d]/70 motion-reduce:animate-none" />
        <p className="text-[#2d2d2d]/60">{label}</p>
      </div>
    </Center>
  );
}
