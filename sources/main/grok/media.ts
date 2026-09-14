// First-launch camera & microphone permission prompt for Voice / Camera Mode.

import { systemPreferences, logger } from "@glaze/core/backend";

import { getPrefs, setPrefs } from "./settings-store.js";

export async function maybePromptMediaOnFirstLaunch(): Promise<void> {
  if (getPrefs().mediaPrompted) return;

  for (const type of ["camera", "microphone"] as const) {
    try {
      const status = await systemPreferences.getMediaAccessStatus(type);
      if (status === "not-determined") {
        await systemPreferences.askForMediaAccess(type);
      }
    } catch (error) {
      logger.warn("grok", "Media permission prompt failed", { type, error: String(error) });
    }
  }

  setPrefs({ mediaPrompted: true });
}
