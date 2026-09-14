/**
 * DriveQuest pack loader. Reads versioned country packs (JSON) from disk.
 * Dev: sources/public/packs (symlink into the content repo).
 * Prod: the same tree ships inside the bundle (static assets follow symlinks).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ipcMain, logger } from "@glaze/core/backend";

import { resolvePackMedia, safeSegment } from "./media-store.js";

const SOURCES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CANDIDATES = [
  join(SOURCES_ROOT, "public", "packs"),      // dev: sources/public/packs
  join(SOURCES_ROOT, "build", "packs"),       // prod: runtime/build/packs
  join(SOURCES_ROOT, "packs"),                // alt: runtime/packs
  join(process.resourcesPath ?? "", "packs"), // alt: bundle Resources/packs
];

function packsDir(): string {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error("packs directory not found");
  return found;
}

function loadPack(country: string): Record<string, unknown> {
  const safe = safeSegment(country);
  if (!safe) throw new Error(`invalid country: ${String(country).slice(0, 32)}`);
  const file = join(packsDir(), safe, "pack.json");
  return JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
}

type PackSummary = {
  country: string;
  languages: string[];
  packVersion: string;
  lawValidThrough: string;
  chapters: { id: string; title: Record<string, string> }[];
  questionCount: number;
  fineCount: number;
  perChapter: Record<string, number>;
  examFormat?: { passMinCorrect: number; questionCount: number; timeLimitSec: number };
};

export function registerPackHandlers(): void {
  ipcMain.handle("packs:list", () => {
    const dir = packsDir();
    const out = [];
    for (const country of readdirSync(dir)) {
      if (country.startsWith("_") || country.startsWith(".")) continue;
      try {
        const pack = loadPack(country) as {
          meta: { country: string; languages: string[]; packVersion: string; lawValidThrough: string };
          chapters: { id: string; title: Record<string, string> }[];
          questions: { chapter: string }[];
          fines?: unknown[];
          examFormat?: PackSummary["examFormat"];
        };
        const perChapter: Record<string, number> = {};
        for (const q of pack.questions) perChapter[q.chapter] = (perChapter[q.chapter] ?? 0) + 1;
        out.push({
          country: pack.meta.country,
          languages: pack.meta.languages,
          packVersion: pack.meta.packVersion,
          lawValidThrough: pack.meta.lawValidThrough,
          chapters: pack.chapters,
          questionCount: pack.questions.length,
          fineCount: pack.fines?.length ?? 0,
          perChapter,
          examFormat: pack.examFormat as PackSummary["examFormat"],
        });
      } catch (error) {
        logger.warn("packs", `skipping ${country}: ${String(error)}`);
      }
    }
    return out;
  });

  ipcMain.handle("packs:questions", (_event, country: string, chapter?: string) => {
    const pack = loadPack(country) as { questions: { chapter: string }[] };
    const all = pack.questions as Record<string, unknown>[];
    return chapter ? all.filter((q) => (q as { chapter: string }).chapter === chapter) : all;
  });

  ipcMain.handle("packs:fines", (_event, country: string) => {
    const pack = loadPack(country) as { fines?: unknown[] };
    return pack.fines ?? [];
  });

  ipcMain.handle("packs:media", (_event, params: { country?: unknown; name?: unknown }) => {
    // Per-question illustration as a data: URL (null = none). The renderer
    // renders nothing on null — never a broken-image icon.
    return resolvePackMedia(packsDir(), params?.country, params?.name);
  });

  logger.info("packs", "✓ pack handlers registered");
}
