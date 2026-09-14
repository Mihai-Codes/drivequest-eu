/**
 * Pure pack-media resolver (dependency-free: no @glaze imports).
 * Importable from unit/smoke tests without booting the Glaze runtime.
 *
 * Media files live next to their pack: <packsRoot>/<country>/media/<name>.
 * Served to the renderer as data: URLs over IPC (same transport as the
 * Longman `dictionary:image` channel) — no custom protocol, no file://
 * URLs, no CSP exceptions. SVG inside <img>/data: cannot execute scripts.
 */
import { readFileSync, existsSync } from "node:fs";
import { basename, resolve, sep } from "node:path";

const MIME: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
};

/** Single path segment: letters, digits, dot, dash, underscore. Null otherwise. */
export function safeSegment(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) return null;
  if (trimmed === "." || trimmed === "..") return null;
  return trimmed;
}

/**
 * Resolve one media asset to a data: URL.
 * Returns null for: bad country/name, unknown extension, missing file,
 * read error, or anything escaping the pack's media dir. Never throws.
 */
export function resolvePackMedia(packsRoot: string, country: unknown, name: unknown): string | null {
  const safeCountry = safeSegment(country);
  const rawName = safeSegment(name);
  if (!safeCountry || !rawName) return null;
  const ext = rawName.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];
  if (!mime) return null;
  const mediaDir = resolve(packsRoot, safeCountry, "media");
  const file = resolve(mediaDir, basename(rawName));
  // Confinement: resolved path must stay inside the pack's media dir.
  if (file !== mediaDir && !file.startsWith(mediaDir + sep)) return null;
  if (file === mediaDir) return null;
  try {
    if (!existsSync(file)) return null;
    return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
  } catch {
    return null;
  }
}
