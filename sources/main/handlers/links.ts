/**
 * External reference links.
 *
 * DriveQuest is offline-first: the only network egress is an explicit user
 * click on a law-source link. This handler opens those in the system browser,
 * but ONLY for https URLs on an allowlist of authoritative legal domains, so
 * the renderer can never be used to open arbitrary (phishing/malware) URLs.
 */
import { ipcMain, logger, shell } from "@glaze/core/backend";

const ALLOWED_HOSTS = new Set([
  "unece.org",
  "www.unece.org",
  "legislatie.just.ro",
  "dgpci.mai.gov.ro",
  "www.mai.gov.ro",
]);

function isAllowed(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
}

export function registerLinkHandlers(): void {
  ipcMain.handle("app:openExternal", async (_event, url: unknown) => {
    if (typeof url !== "string" || !isAllowed(url)) {
      logger.warn("links", `blocked non-allowlisted external URL: ${String(url).slice(0, 64)}`);
      return false;
    }
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      logger.error("links", "failed to open external URL", error as Error);
      return false;
    }
  });

  logger.info("links", "✓ external-link handlers registered");
}
