// Main process entry point — DriveQuest EU native app.
//
// The glaze CLI runtime handles framework wiring (IPC server, native bridge,
// lifecycle, signal handlers) before this file runs.

import { app, logger } from "@glaze/core/backend";

import { registerHandlers } from "./handlers/index.js";
import { openMainWindow, showMainWindow } from "./windows/main-window.js";

// ipcMain is already wired to the IPC server by the runtime bootstrap.
registerHandlers();

// Single-instance: focus the existing window instead of launching a second app.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => showMainWindow());

  app.on("activate", () => showMainWindow());

  app
    .whenReady()
    .then(async () => {
      await openMainWindow();
    })
    .catch((error) => logger.error("main", "Startup failed", error as Error));
}
