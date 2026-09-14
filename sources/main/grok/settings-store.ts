// Persisted user preferences for the Grok app.
// Stored in Application Support (userData), never in the repository.

import * as fs from "fs";
import * as path from "path";

import { app, logger } from "@glaze/core/backend";

import { DEFAULT_GLOBAL_SHORTCUT } from "./config.js";

export interface GrokPrefs {
  /** Global summon/hide accelerator; empty string means disabled. */
  globalShortcut: string;
  launchAtLogin: boolean;
  /** Whether we already prompted for camera/mic on first launch. */
  mediaPrompted: boolean;
}

const DEFAULTS: GrokPrefs = {
  globalShortcut: DEFAULT_GLOBAL_SHORTCUT,
  launchAtLogin: false,
  mediaPrompted: false,
};

let cache: GrokPrefs | null = null;

function prefsFile(): string {
  return path.join(app.getPath("userData"), "grok-settings.json");
}

export function getPrefs(): GrokPrefs {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(prefsFile(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<GrokPrefs>;
    cache = { ...DEFAULTS, ...parsed };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function setPrefs(patch: Partial<GrokPrefs>): GrokPrefs {
  const next: GrokPrefs = { ...getPrefs(), ...patch };
  cache = next;
  try {
    fs.writeFileSync(prefsFile(), JSON.stringify(next, null, 2), "utf-8");
  } catch (error) {
    logger.error("grok", "Failed to persist preferences", error as Error);
  }
  return next;
}
