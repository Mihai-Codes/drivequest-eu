// Native application menu with standard editing plus Grok-specific commands.

import { Menu } from "@glaze/core/backend";

export interface MenuActions {
  newChat(): void;
  reload(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomReset(): void;
  printPage(): void;
  toggleFind(): void;
  openSettings(): void;
  openImportCookies(): void;
  clearCacheAndReload(): void;
}

export function buildAppMenu(a: MenuActions): void {
  const menu = Menu.buildFromTemplate([
    {
      label: "Grok",
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Preferences…",
          icon: "gearshape",
          accelerator: "Command+,",
          click: () => a.openSettings(),
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        { label: "New Chat", accelerator: "Command+N", click: () => a.newChat() },
        { type: "separator" },
        { label: "Print…", accelerator: "Command+P", click: () => a.printPage() },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { role: "selectAll" },
        { type: "separator" },
        { label: "Find…", accelerator: "Command+F", click: () => a.toggleFind() },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", accelerator: "Command+R", click: () => a.reload() },
        { type: "separator" },
        { label: "Actual Size", accelerator: "Command+0", click: () => a.zoomReset() },
        { label: "Zoom In", accelerator: "CommandOrControl+Plus", click: () => a.zoomIn() },
        {
          label: "Zoom In",
          accelerator: "CommandOrControl+=",
          visible: false,
          click: () => a.zoomIn(),
        },
        { label: "Zoom Out", accelerator: "CommandOrControl+-", click: () => a.zoomOut() },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
    {
      label: "Debug",
      submenu: [
        {
          label: "Import Session Cookies…",
          click: () => a.openImportCookies(),
        },
        { type: "separator" },
        {
          label: "Clear App Cache & Reload",
          click: () => a.clearCacheAndReload(),
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
}
