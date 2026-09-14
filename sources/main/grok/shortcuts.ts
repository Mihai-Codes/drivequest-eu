// Global shortcut registration and launch-at-login control.

import { app, globalShortcut, logger } from "@glaze/core/backend";

let currentAccelerator: string | null = null;

export async function registerGlobalShortcut(accelerator: string, callback: () => void): Promise<boolean> {
  if (currentAccelerator) {
    try {
      globalShortcut.unregister(currentAccelerator);
    } catch {
      // ignore
    }
    currentAccelerator = null;
  }
  if (!accelerator) return false;
  try {
    const ok = await globalShortcut.register(accelerator, callback);
    if (ok) {
      currentAccelerator = accelerator;
    } else {
      logger.warn("grok", "Global shortcut registration failed (already in use?)", { accelerator });
    }
    return ok;
  } catch (error) {
    logger.error("grok", "Global shortcut registration error", error as Error);
    return false;
  }
}

export function unregisterGlobalShortcut(): void {
  try {
    globalShortcut.unregisterAll();
  } catch {
    // ignore
  }
  currentAccelerator = null;
}

export function applyLaunchAtLogin(openAtLogin: boolean): void {
  try {
    app.setLoginItemSettings({ openAtLogin });
  } catch (error) {
    logger.error("grok", "Failed to set login item", error as Error);
  }
}
