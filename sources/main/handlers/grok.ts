// IPC handlers used by the Preferences window (an app-owned page with glazeAPI).

import { ipcMain, logger } from "@glaze/core/backend";

import { getPrefs, setPrefs } from "../grok/settings-store.js";
import { registerGlobalShortcut, unregisterGlobalShortcut, applyLaunchAtLogin } from "../grok/shortcuts.js";
import { toggleVisibility, importSessionCookies } from "../grok/grok-window.js";
import { DEFAULT_GLOBAL_SHORTCUT } from "../grok/config.js";

export function registerGrokHandlers(): void {
  ipcMain.handle("grok:getPrefs", async () => {
    const p = getPrefs();
    return {
      globalShortcut: p.globalShortcut,
      launchAtLogin: p.launchAtLogin,
      defaultShortcut: DEFAULT_GLOBAL_SHORTCUT,
    };
  });

  ipcMain.handle("grok:setLaunchAtLogin", async (_event, value: unknown) => {
    const enabled = value === true;
    applyLaunchAtLogin(enabled);
    setPrefs({ launchAtLogin: enabled });
    return { launchAtLogin: enabled };
  });

  ipcMain.handle("grok:setShortcut", async (_event, value: unknown) => {
    const accelerator =
      typeof value === "string" && value.trim() ? value.trim() : DEFAULT_GLOBAL_SHORTCUT;
    const ok = await registerGlobalShortcut(accelerator, () => toggleVisibility());
    if (ok) setPrefs({ globalShortcut: accelerator });
    return { ok, globalShortcut: ok ? accelerator : getPrefs().globalShortcut };
  });

  ipcMain.handle("grok:disableShortcut", async () => {
    unregisterGlobalShortcut();
    setPrefs({ globalShortcut: "" });
    return { ok: true };
  });

  ipcMain.handle("grok:importSessionCookies", async (_event, value: unknown) => {
    const raw = typeof value === "string" ? value : "";
    return importSessionCookies(raw);
  });

  logger.info("grok", "✓ Grok IPC handlers registered");
}
