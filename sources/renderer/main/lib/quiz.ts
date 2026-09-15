/**
 * Quiz engine: pure, framework-free logic for answering and scoring.
 * Shared by Practice, Test and Quick Challenge so the rules live once (DRY).
 */
import type { Question } from "./packs.js";

export type Answer = {
  questionId: string;
  selected: string[];
};

export type ScoredAnswer = Answer & {
  correct: boolean;
};

/** Normalize a selection for comparison: sorted, deduped, lowercased. */
function norm(list: string[]): string[] {
  return Array.from(new Set(list.map((s) => s.trim().toLowerCase()))).sort();
}

/** Exact-match correctness: the chosen set must equal the correct set. */
export function isCorrect(question: Question, selected: string[]): boolean {
  const a = norm(selected);
  const b = norm(question.correct);
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/** Toggle one option key, respecting single vs multi-select. */
export function toggleOption(question: Question, selected: string[], key: string): string[] {
  if (question.type === "single") return [key];
  return selected.includes(key)
    ? selected.filter((k) => k !== key)
    : [...selected, key];
}

/** Seeded Fisher-Yates shuffle so Test order is stable within a session. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  const rand = () => {
    // mulberry32
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Ordered option keys for a question in the chosen language. */
export function optionKeys(question: Question, lang: string): string[] {
  const bucket = question.options[lang] ?? question.options.en ?? {};
  return Object.keys(bucket).sort();
}

export function scoreQuiz(questions: Question[], answers: Answer[]): ScoredAnswer[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return answers.map((a) => {
    const q = byId.get(a.questionId);
    return { ...a, correct: q ? isCorrect(q, a.selected) : false };
  });
}

export function accuracyOf(scored: ScoredAnswer[]): number {
  if (scored.length === 0) return 0;
  return scored.filter((s) => s.correct).length / scored.length;
}
