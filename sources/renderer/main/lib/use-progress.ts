/**
 * React binding for learner progress.
 *
 * Loads the save from the backend once, keeps it in a module-level store,
 * and persists every mutation back through progress:set. Hearts refill
 * lazily from the timestamp, so a fresh session always sees regained hearts.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "./invoke.js";
import type {
  ProgressState,
  ChapterProgress,
} from "./progress.js";
import {
  emptyChapter,
  emptyProgress,
  normalizeProgress,
  chapterKey,
  heartsNow,
  loseHeart,
  recordSession,
  addXp,
} from "./progress.js";

let cache: ProgressState | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

async function persist(state: ProgressState): Promise<void> {
  try {
    await invoke("progress:set", state);
  } catch {
    /* persistence failure is non-fatal; in-memory state still works */
  }
}

function setState(next: ProgressState, save = true) {
  cache = next;
  emit();
  if (save) void persist(next);
}

async function load(): Promise<ProgressState> {
  if (loaded && cache) return cache;
  try {
    const raw = await invoke("progress:get");
    cache = normalizeProgress(raw);
  } catch {
    cache = emptyProgress();
  }
  loaded = true;
  return cache;
}

export type ProgressApi = {
  state: ProgressState;
  ready: boolean;
  /** Hearts available right now (time-based refills applied). */
  hearts: number;
  loseHeart: () => void;
  addXp: (amount: number) => void;
  recordSession: () => void;
  /** Merge a patch into one chapter's progress, creating it if needed. */
  updateChapter: (
    country: string,
    chapterId: string,
    patch: Partial<ChapterProgress>,
  ) => void;
  /** Read-modify-write a full chapter record (used by the results screen). */
  setChapter: (country: string, chapterId: string, next: ChapterProgress) => void;
};

export function useProgress(): ProgressApi {
  const [, force] = useState(0);
  const [ready, setReady] = useState(loaded);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const rerender = () => {
      if (mounted.current) force((n) => n + 1);
    };
    listeners.add(rerender);
    void load().then(() => {
      if (mounted.current) setReady(true);
    });
    return () => {
      mounted.current = false;
      listeners.delete(rerender);
    };
  }, []);

  const state = cache ?? emptyProgress();
  const now = Date.now();

  const lose = useCallback(() => {
    if (!cache) return;
    setState(loseHeart(cache, Date.now()));
  }, []);

  const gainXp = useCallback((amount: number) => {
    if (!cache) return;
    setState(addXp(cache, amount));
  }, []);

  const session = useCallback(() => {
    if (!cache) return;
    setState(recordSession(cache, Date.now()));
  }, []);

  const updateChapter = useCallback(
    (country: string, chapterId: string, patch: Partial<ChapterProgress>) => {
      if (!cache) return;
      const key = chapterKey(country, chapterId);
      const current = cache.chapters[key] ?? emptyChapter();
      setState({
        ...cache,
        chapters: { ...cache.chapters, [key]: { ...current, ...patch } },
      });
    },
    [],
  );

  const setChapter = useCallback(
    (country: string, chapterId: string, next: ChapterProgress) => {
      if (!cache) return;
      const key = chapterKey(country, chapterId);
      setState({ ...cache, chapters: { ...cache.chapters, [key]: next } });
    },
    [],
  );

  return {
    state,
    ready,
    hearts: heartsNow(state, now),
    loseHeart: lose,
    addXp: gainXp,
    recordSession: session,
    updateChapter,
    setChapter,
  };
}
