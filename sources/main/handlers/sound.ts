/**
 * DriveQuest sound preferences.
 *
 * A tiny durable store for the audio toggles (UI click sounds, garage
 * ambient music). Same dumb atomic read/write pattern as progress.ts — the
 * renderer owns playback; the backend only persists the two booleans.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { app, ipcMain, logger } from "@glaze/core/backend";

const FILE_NAME = "drivequest-sound-prefs.json";

export type SoundPrefs = { sfx: boolean; music: boolean };

const DEFAULTS: SoundPrefs = { sfx: true, music: true };

function prefsFile(): string {
  return path.join(app.getPath("userData"), FILE_NAME);
}

function readPrefs(): SoundPrefs {
  try {
    const raw = JSON.parse(fs.readFileSync(prefsFile(), "utf-8")) as Partial<SoundPrefs>;
    return {
      sfx: typeof raw.sfx === "boolean" ? raw.sfx : DEFAULTS.sfx,
      music: typeof raw.music === "boolean" ? raw.music : DEFAULTS.music,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function writePrefs(prefs: SoundPrefs): boolean {
  const file = prefsFile();
  const tmp = `${file}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(prefs, null, 2), "utf-8");
    fs.renameSync(tmp, file);
    return true;
  } catch (error) {
    logger.error("sound-prefs", "Failed to persist sound prefs", error as Error);
    return false;
  }
}

export function registerSoundHandlers(): void {
  ipcMain.handle("sound-prefs:get", () => readPrefs());
  ipcMain.handle("sound-prefs:set", (_event, next: Partial<SoundPrefs>) => {
    const merged = { ...readPrefs(), ...next };
    writePrefs(merged);
    return merged;
  });
  logger.info("sound-prefs", "✓ sound preference handlers registered");
}
