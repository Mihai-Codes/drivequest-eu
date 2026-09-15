/**
 * Shared pack types + a loader hook. One definition of the pack shape so the
 * showroom, map, quiz and results views all read the same fields (DRY).
 */
import { useEffect, useState } from "react";

import { invoke } from "./invoke.js";

export type ExamFormat = {
  passMinCorrect: number;
  questionCount: number;
  timeLimitSec: number;
};

export type ChapterMeta = { id: string; title: Record<string, string> };

export type PackSummary = {
  country: string;
  languages: string[];
  packVersion: string;
  lawValidThrough: string;
  chapters: ChapterMeta[];
  questionCount: number;
  fineCount: number;
  perChapter: Record<string, number>;
  examFormat?: ExamFormat;
};

export type Question = {
  id: string;
  chapter: string;
  type: "single" | "multi";
  stem: Record<string, string>;
  options: Record<string, Record<string, string>>;
  correct: string[];
  explanation: Record<string, string>;
  article: string;
  difficulty?: number;
  media?: string | null;
};

/** Pick the best available language string from a localized field. */
export function pickLang(field: Record<string, string> | undefined, lang: string): string {
  if (!field) return "";
  return field[lang] ?? field.en ?? Object.values(field)[0] ?? "";
}

export function usePacks(): { packs: PackSummary[] | null; error: string | null } {
  const [packs, setPacks] = useState<PackSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    invoke<PackSummary[]>("packs:list")
      .then((data) => {
        if (live) setPacks(data);
      })
      .catch(() => {
        if (live) setError("Could not load the study packs.");
      });
    return () => {
      live = false;
    };
  }, []);

  return { packs, error };
}

export function fetchQuestions(country: string, chapter?: string): Promise<Question[]> {
  return invoke<Question[]>("packs:questions", country, chapter);
}
