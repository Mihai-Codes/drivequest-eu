import { BrowserWindow, logger } from "@glaze/core/backend";
import { getPreloadPath, getWindowUrl } from "./window-paths.js";

let mainWindow: BrowserWindow | null = null;

export async function openMainWindow(): Promise<void> {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  logger.info("main-window", "Creating main window");

  mainWindow = new BrowserWindow({
    windowKey: "main",
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    title: "DriveQuest EU",
    show: false,
    center: true,
    webPreferences: {
      preload: getPreloadPath(),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const url = await getWindowUrl("main-window.html");
  logger.info("main-window", "Loading main URL", { url });

  await mainWindow.loadURL(url);
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function showMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    void openMainWindow();
  }
}
