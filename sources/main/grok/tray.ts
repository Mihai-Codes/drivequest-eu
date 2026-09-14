// Menu-bar (status bar) icon with a dropdown menu.

import { Tray, Menu, type NativeImage } from "@glaze/core/backend";

import { TRAY_GUID } from "./config.js";

export interface TrayActions {
  newChat(): void;
  toggleVisibility(): void;
  openSettings(): void;
}

let tray: Tray | null = null;

export function createTray(actions: TrayActions): void {
  if (tray && !tray.isDestroyed()) return;

  // Start with an SF Symbol template glyph; replaced by Grok's real favicon
  // once the page loads (see grok-window.ts).
  tray = new Tray("sparkles", TRAY_GUID);
  tray.setToolTip("Grok");

  const menu = Menu.buildFromTemplate([
    { label: "New Chat", click: () => actions.newChat() },
    { label: "Show / Hide", click: () => actions.toggleVisibility() },
    { type: "separator" },
    { label: "Preferences…", click: () => actions.openSettings() },
    { type: "separator" },
    { role: "quit" },
  ]);
  tray.setContextMenu(menu);
}

export function setTrayImage(image: NativeImage): void {
  try {
    tray?.setImage(image);
  } catch {
    // Keep the existing icon on failure.
  }
}
