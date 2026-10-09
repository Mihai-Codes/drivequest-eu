/**
 * DriveQuest audio: UI click sounds + the garage ambient bed.
 *
 * Real produced audio (royalty-free, see assets/audio/CREDITS.md):
 *   sfx-primary    Kenney confirmation blip  — card CTAs, continue actions
 *   sfx-secondary  Kenney soft click         — details toggles, ghost buttons
 *   sfx-toggle     Kenney neutral click      — option toggles
 *   garage-ambient "Another August" (cynicmusic, CC0) — a calm dusk-guitar
 *                  piece that plays only on the landing screen; RootView
 *                  fades it out on every other route.
 *
 * Files are fetched and decoded once into AudioBuffers for gapless looping
 * and precise fades. Prefs ({sfx, music}) persist via sound-prefs IPC;
 * playback unlocks on the first user gesture (autoplay policy).
 */
import { invoke } from "./invoke.js";
import clickPrimaryUrl from "../assets/audio/sfx-primary.m4a";
import clickSecondaryUrl from "../assets/audio/sfx-secondary.m4a";
import clickToggleUrl from "../assets/audio/sfx-toggle.m4a";
import ambientUrl from "../assets/audio/garage-ambient.m4a";

type Prefs = { sfx: boolean; music: boolean; muted: boolean };
type ClickKind = "primary" | "secondary" | "toggle";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let prefs: Prefs = { sfx: true, music: true, muted: false };
let unlocked = false;

const CLICK_URLS: Record<ClickKind, string> = {
  primary: clickPrimaryUrl,
  secondary: clickSecondaryUrl,
  toggle: clickToggleUrl,
};
const CLICK_VOLUME: Record<ClickKind, number> = { primary: 0.5, secondary: 0.4, toggle: 0.45 };
const AMBIENT_VOLUME = 0.22;

const clickBuffers = new Map<ClickKind, AudioBuffer>();
let ambientBuffer: AudioBuffer | null = null;

let ambientSource: AudioBufferSourceNode | null = null;
let ambientGain: GainNode | null = null;
let ambientOn = false;
let ambientStopTimer: ReturnType<typeof setTimeout> | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

async function decode(url: string): Promise<AudioBuffer | null> {
  const ac = ensureCtx();
  if (!ac) return null;
  try {
    const res = await fetch(url);
    const bytes = await res.arrayBuffer();
    return await ac.decodeAudioData(bytes);
  } catch {
    return null;
  }
}

/** Call once from a user-gesture listener so the AudioContext can start. */
export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  const ac = ensureCtx();
  if (!ac) return;
  void refreshPrefs();
  // Pre-decode all clips in the background; failures fall back to silence.
  void (async () => {
    for (const [kind, url] of Object.entries(CLICK_URLS)) {
      const buf = await decode(url);
      if (buf) clickBuffers.set(kind as ClickKind, buf);
    }
    ambientBuffer = (await decode(ambientUrl)) ?? null;
    // If the landing is already active when decoding finishes, start the bed.
    if (ambientOn && prefs.music && !prefs.muted && !ambientSource) {
      ambientSetActive(true);
    }
  })();
}

export async function refreshPrefs(): Promise<Prefs> {
  try {
    prefs = await invoke<Prefs>("sound-prefs:get");
  } catch {
    /* keep defaults */
  }
  applyMusicPref();
  return prefs;
}

export async function setPrefs(next: Partial<Prefs>): Promise<Prefs> {
  try {
    prefs = await invoke<Prefs>("sound-prefs:set", next);
  } catch {
    prefs = { ...prefs, ...next };
  }
  applyMusicPref();
  return prefs;
}

export function getPrefs(): Prefs {
  return { ...prefs };
}

/** Global mute: silences everything without touching the category prefs. */
export async function toggleMuted(): Promise<boolean> {
  prefs = { ...prefs, muted: !prefs.muted };
  try {
    prefs = await invoke<Prefs>("sound-prefs:set", { muted: prefs.muted });
  } catch {
    /* keep in-memory value */
  }
  if (ctx && master) {
    master.gain.setTargetAtTime(prefs.muted ? 0 : 1, ctx.currentTime, 0.08);
  }
  return prefs.muted;
}

export function isMuted(): boolean {
  return prefs.muted;
}

function applyMusicPref(): void {
  // Toggling music off mutes the bed in place; on resumes it only if the
  // garage is the active screen.
  if (!prefs.music && ambientGain && ctx) {
    ambientGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  } else if (prefs.music && ambientOn && ctx) {
    if (!ambientSource) {
      ambientSetActive(true);
      return;
    }
    ambientGain?.gain.setTargetAtTime(AMBIENT_VOLUME, ctx.currentTime, 0.4);
  }
}

// ---- Click sounds ----------------------------------------------------------

export function click(kind: ClickKind = "primary"): void {
  if (!prefs.sfx || prefs.muted) return;
  const ac = ensureCtx();
  if (!ac || !master) return;
  const buf = clickBuffers.get(kind);
  if (!buf) return;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  gain.gain.value = CLICK_VOLUME[kind];
  src.connect(gain).connect(master);
  src.start();
}

// ---- Garage ambient --------------------------------------------------------

export function ambientSetActive(active: boolean): void {
  ambientOn = active;
  if (active && prefs.muted) return;
  if (active) {
    if (ambientStopTimer) {
      clearTimeout(ambientStopTimer);
      ambientStopTimer = null;
    }
    if (!prefs.music) return;
    const ac = ensureCtx();
    if (!ac || !master || !ambientBuffer) return;
    if (!ambientSource) {
      ambientSource = ac.createBufferSource();
      ambientSource.buffer = ambientBuffer;
      ambientSource.loop = true;
      ambientGain = ac.createGain();
      ambientGain.gain.value = 0;
      ambientSource.connect(ambientGain).connect(master);
      ambientSource.start();
    }
    ambientGain?.gain.setTargetAtTime(AMBIENT_VOLUME, ac.currentTime, 1.2);
  } else if (ambientGain && ctx) {
    // Fade out, then release the source node to keep the graph idle-light.
    ambientGain.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
    if (ambientStopTimer) clearTimeout(ambientStopTimer);
    ambientStopTimer = setTimeout(() => {
      try {
        ambientSource?.stop();
      } catch {
        /* already stopped */
      }
      ambientSource = null;
      ambientGain = null;
    }, 3200);
  }
}
