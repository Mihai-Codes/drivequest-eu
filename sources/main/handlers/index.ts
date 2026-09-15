/**
 * Handler Registration
 *
 * Register all your IPC handlers here
 */

import { getSettingsWindow, openSettingsWindow } from "../windows/settings-window.js";
import { getImportCookiesWindow } from "../windows/import-cookies-window.js";
import { registerGrokHandlers } from "./grok.js";
import { registerPackHandlers } from "./packs.js";
import { registerProgressHandlers } from "./progress.js";
import { registerLinkHandlers } from "./links.js";

import { ipcMain, logger } from "@glaze/core/backend";

export function registerHandlers(): void {
  logger.info("handlers", "Registering IPC handlers...");

  // Settings window handlers
  ipcMain.handle("window:openSettings", async (_event) => {
    await openSettingsWindow();
  });

  ipcMain.handle("window:closeSettings", async (_event) => {
    getSettingsWindow()?.close();
  });

  ipcMain.handle("window:closeImportCookies", async (_event) => {
    getImportCookiesWindow()?.close();
  });

  // Grok preferences (shortcut + launch-at-login)
  registerGrokHandlers();

  // DriveQuest country packs
  registerPackHandlers();

  // DriveQuest learner progress (XP, streak, hearts, mastery)
  registerProgressHandlers();

  // DriveQuest external law-source links (allowlisted)
  registerLinkHandlers();

  logger.info("handlers", "✓ IPC handlers registered");
}
