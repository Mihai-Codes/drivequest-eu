/**
 * Article source links.
 *
 * Every question cites a law article ("Vienna Convention, Annex 1, Section A",
 * "Regulamentul de aplicare HG 1391/2006 ..."). This maps each pack to its
 * authoritative public source URL so the Results screen can offer a direct
 * reference link. Only allowlisted https domains are ever handed to the
 * backend opener — the app stays offline-first; links are opt-in per click.
 */
import { invoke } from "./invoke.js";

/** Authoritative public source per pack (must stay https + allowlisted). */
export const PACK_SOURCE: Record<string, { label: string; url: string }> = {
  eu: {
    label: "Vienna Convention on Road Signs and Signals (UNECE)",
    url: "https://unece.org/transport/publications/convention-road-signs-and-signals-1968-european-agreement-supplementing",
  },
  ro: {
    label: "OUG 195/2002 privind circulatia pe drumurile publice",
    url: "https://legislatie.just.ro/Public/DetaliiDocument/74028",
  },
};

export function sourceFor(country: string): { label: string; url: string } | null {
  return PACK_SOURCE[country] ?? null;
}

/**
 * Open a source link in the user's browser. The backend enforces an https +
 * domain allowlist, so this can never be used to open arbitrary URLs.
 * Resolves true when the browser was opened, false otherwise.
 */
export function openSourceLink(url: string): Promise<boolean> {
  return invoke<boolean>("app:openExternal", url).catch(() => false);
}
