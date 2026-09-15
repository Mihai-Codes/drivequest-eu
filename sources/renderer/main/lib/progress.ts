/**
 * DriveQuest learner progress: pure domain logic + types.
 *
 * This module is dependency-free (no React, no IPC) so the rules — hearts,
 * XP, streak, stars, chapter unlock — are unit-testable in isolation and
 * reusable across the map, quiz, HUD and results views (DRY).
 */

// ---- Types ---------------------------------------------------------------

export type ChapterStatus = "locked" | "available" | "in_progress" | "mastered";

export type ChapterProgress = {
  status: ChapterStatus;
  stars: 0 | 1 | 2 | 3;
  /** Best accuracy across completed Test runs, 0..1. */
  bestAccuracy: number;
  /** Fastest passing Test time in seconds. Null when never passed. */
  bestTimeSec: number | null;
};

export type ProgressState = {
  version: 1;
  /** Total lifetime experience points. */
  xp: number;
  /** Hearts left for Practice sessions (0..MAX_HEARTS). */
  hearts: number;
  /** Epoch ms of the last heart decrement, drives the 30-min refill timer. */
  lastHeartAt: number | null;
  /** Consecutive-day streak count. */
  streakDays: number;
  /** YYYY-MM-DD (local) of the last day a session was completed. */
  lastSessionDay: string | null;
  /** Per-pack, per-chapter progress. Key: `${country}/${chapterId}`. */
  chapters: Record<string, ChapterProgress>;
};

// ---- Constants ------------------------------------------------------------

export const MAX_HEARTS = 3;
export const HEART_REFILL_MS = 30 * 60 * 1000;
/** Accuracy needed to master a chapter and unlock the next one. */
export const MASTERY_ACCURACY = 0.8;

export const XP = {
  correctAnswer: 10,
  passTest: 50,
  star: 25, // per star earned
  perfectTest: 40, // bonus on a 100% Test
  quickChallenge: 30, // base for finishing
  quickPerfectBonus: 70, // extra on a perfect Quick Challenge
} as const;

// ---- Defaults -------------------------------------------------------------

export function emptyChapter(): ChapterProgress {
  return { status: "locked", stars: 0, bestAccuracy: 0, bestTimeSec: null };
}

export function emptyProgress(): ProgressState {
  return {
    version: 1,
    xp: 0,
    hearts: MAX_HEARTS,
    lastHeartAt: null,
    streakDays: 0,
    lastSessionDay: null,
    chapters: {},
  };
}

/** Merge a raw persisted blob over defaults; tolerates partial/old saves. */
export function normalizeProgress(raw: unknown): ProgressState {
  const base = emptyProgress();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Partial<ProgressState>;
  return {
    version: 1,
    xp: num(r.xp, base.xp),
    hearts: clamp(num(r.hearts, base.hearts), 0, MAX_HEARTS),
    lastHeartAt: r.lastHeartAt == null ? null : num(r.lastHeartAt, 0),
    streakDays: num(r.streakDays, 0),
    lastSessionDay: typeof r.lastSessionDay === "string" ? r.lastSessionDay : null,
    chapters:
      r.chapters && typeof r.chapters === "object" && !Array.isArray(r.chapters)
        ? (r.chapters as Record<string, ChapterProgress>)
        : {},
  };
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ---- Key helpers -----------------------------------------------------------

export const chapterKey = (country: string, chapterId: string): string =>
  `${country}/${chapterId}`;

// ---- Hearts ----------------------------------------------------------------

/**
 * Hearts available right now, applying time-based refills lazily.
 * One heart regenerates per HEART_REFILL_MS since the last decrement.
 */
export function heartsNow(state: ProgressState, now: number): number {
  if (state.hearts >= MAX_HEARTS) return MAX_HEARTS;
  if (state.lastHeartAt == null) return state.hearts;
  const regained = Math.floor((now - state.lastHeartAt) / HEART_REFILL_MS);
  return clamp(state.hearts + regained, 0, MAX_HEARTS);
}

/** Milliseconds until the next heart is restored. 0 when full. */
export function nextHeartInMs(state: ProgressState, now: number): number {
  if (state.hearts >= MAX_HEARTS || state.lastHeartAt == null) return 0;
  const elapsed = now - state.lastHeartAt;
  const into = elapsed % HEART_REFILL_MS;
  return HEART_REFILL_MS - into;
}

/** Lose one heart. Stamps the timer only when it is not already running. */
export function loseHeart(state: ProgressState, now: number): ProgressState {
  const current = heartsNow(state, now);
  if (current <= 0) return { ...state, hearts: 0 };
  return {
    ...state,
    hearts: current - 1,
    lastHeartAt:
      state.lastHeartAt == null || current >= MAX_HEARTS ? now : state.lastHeartAt,
  };
}

// ---- Streak ----------------------------------------------------------------

function localDay(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Record a completed session today. Extends the streak when consecutive,
 * resets it after a gap, and is idempotent within the same day.
 */
export function recordSession(state: ProgressState, now: number): ProgressState {
  const today = localDay(now);
  if (state.lastSessionDay === today) return state;
  const yesterday = localDay(now - 24 * 60 * 60 * 1000);
  const streakDays = state.lastSessionDay === yesterday ? state.streakDays + 1 : 1;
  return { ...state, lastSessionDay: today, streakDays };
}

// ---- Stars & mastery --------------------------------------------------------

/** Stars for a finished Test by accuracy: >=70% 1*, >=85% 2*, 100% 3*. */
export function starsFor(accuracy: number): 0 | 1 | 2 | 3 {
  if (accuracy >= 1) return 3;
  if (accuracy >= 0.85) return 2;
  if (accuracy >= 0.7) return 1;
  return 0;
}

/** A chapter is mastered once its best Test accuracy reaches the bar. */
export function isMastered(ch: ChapterProgress | undefined): boolean {
  return !!ch && ch.bestAccuracy >= MASTERY_ACCURACY;
}

/**
 * Effective status for a chapter, folding stored progress with unlock rules.
 * Chapter at `index` unlocks when the previous chapter is mastered (or is the
 * first chapter). Pure derivation — the stored status is a cache, this is the
 * source of truth for gating.
 */
export function effectiveStatus(
  self: ChapterProgress | undefined,
  index: number,
  prev: ChapterProgress | undefined,
): ChapterStatus {
  const unlocked = index === 0 || isMastered(prev);
  if (!unlocked) return "locked";
  if (!self || self.status === "locked") return "available";
  return self.status;
}

// ---- XP / level -------------------------------------------------------------

/** Driver level from total XP. Gentle curve: 100 * level XP per level. */
export function levelFor(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function addXp(state: ProgressState, amount: number): ProgressState {
  return { ...state, xp: Math.max(0, state.xp + Math.round(amount)) };
}
