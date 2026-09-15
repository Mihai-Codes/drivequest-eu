/**
 * DriveQuest learner progress persistence.
 *
 * Single-learner state (chapter mastery, stars, XP, streak, hearts) lives in
 * a JSON file under app.getPath("userData") — never in the repository. The
 * renderer owns the shape and merge logic; the backend is a dumb, atomic
 * read/write store so a crash mid-write cannot corrupt the save.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { app, ipcMain, logger } from "@glaze/core/backend";

const FILE_NAME = "drivequest-progress.json";

function progressFile(): string {
  return path.join(app.getPath("userData"), FILE_NAME);
}

function readProgress(): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(progressFile(), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* first launch or unreadable save — fall through to empty */
  }
  return {};
}

function writeProgress(state: Record<string, unknown>): boolean {
  const file = progressFile();
  const tmp = `${file}.tmp`;
  try {
    // Write-then-rename so the on-disk file is never a torn partial JSON.
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tmp, file);
    return true;
  } catch (error) {
    logger.error("progress", "Failed to persist progress", error as Error);
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      /* ignore cleanup failure */
    }
    return false;
  }
}

export function registerProgressHandlers(): void {
  ipcMain.handle("progress:get", () => readProgress());

  ipcMain.handle("progress:set", (_event, state: unknown) => {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      logger.warn("progress", "rejected non-object state in progress:set");
      return false;
    }
    return writeProgress(state as Record<string, unknown>);
  });

  logger.info("progress", "✓ progress handlers registered");
}
