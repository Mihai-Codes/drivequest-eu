import { BrowserWindow, logger } from "@glaze/core/backend";
import { getPreloadPath, getWindowUrl } from "./window-paths.js";

let importCookiesWindow: BrowserWindow | null = null;

export async function openImportCookiesWindow(): Promise<void> {
  if (importCookiesWindow && !importCookiesWindow.isDestroyed()) {
    logger.debug("import-cookies", "Import Cookies window already exists, showing it");
    importCookiesWindow.show();
    importCookiesWindow.focus();
    return;
  }

  logger.info("import-cookies", "Creating Import Cookies window");

  importCookiesWindow = new BrowserWindow({
    windowKey: "import-cookies",
    width: 480,
    height: 440,
    minWidth: 420,
    minHeight: 380,
    title: "Import Session Cookies",
    show: false,
    center: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: getPreloadPath(),
    },
  });

  importCookiesWindow.once("ready-to-show", () => {
    importCookiesWindow?.show();
  });

  importCookiesWindow.on("closed", () => {
    importCookiesWindow = null;
  });

  const url = await getWindowUrl("import-cookies-window.html");
  logger.info("import-cookies", "Loading Import Cookies URL", { url });

  await importCookiesWindow.loadURL(url);
}

export function getImportCookiesWindow(): BrowserWindow | null {
  return importCookiesWindow;
}
