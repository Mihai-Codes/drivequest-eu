// The main Grok window: loads grok.com live, with native chrome and all the
// desktop-client wiring (domain routing, downloads, permissions, notifications).
//
// grok.com is external content and deliberately receives NO app preload, so
// window.glazeAPI is never exposed to the site. Page-side behavior (notification
// forwarding, in-page find) is injected from the backend via executeJavaScript
// and relayed back over the console channel.

import { join } from "node:path";

import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  dialog,
  nativeImage,
  shell,
  logger,
  type MenuItemConstructorOptions,
  type WebContents,
  type WebContentsConsoleMessageEvent,
  type WebContentsContextMenuParams,
  type WebContentsNavigationEvent,
} from "@glaze/core/backend";

import {
  GROK_URL,
  SESSION_PARTITION,
  NOTIFY_SENTINEL,
  COOKIE_IMPORT_DOMAINS,
  shouldOpenInApp,
  isAppleAuthHost,
  isExplicitLoginUrl,
  stripElectronToken,
  hostMatches,
} from "./config.js";
import { buildLoadingPage, buildErrorPage } from "./pages.js";
import { setTrayImage } from "./tray.js";

let win: BrowserWindow | null = null;
let zoomFactor = 1;

export function getGrokWindow(): BrowserWindow | null {
  return win && !win.isDestroyed() ? win : null;
}

// Injected into grok.com (main world) to forward web notifications natively and
// grant notification permission. Uses console relay because there is no preload.
const NOTIFY_BRIDGE = `(function () {
  if (window.__grokNotifyPatched) return;
  window.__grokNotifyPatched = true;
  var SENT = "${NOTIFY_SENTINEL}";
  function relay(title, options) {
    try { console.log(SENT + JSON.stringify({ title: String(title || ""), body: (options && options.body) || "" })); } catch (e) {}
  }
  try {
    function GrokNotification(title, options) {
      relay(title, options || {});
      this.title = title; this.body = (options && options.body) || "";
      this.onclick = null; this.onclose = null; this.onshow = null; this.onerror = null;
      this.close = function () {};
      this.addEventListener = function () {};
      this.removeEventListener = function () {};
      this.dispatchEvent = function () { return true; };
    }
    GrokNotification.permission = "granted";
    GrokNotification.requestPermission = function (cb) {
      if (typeof cb === "function") cb("granted");
      return Promise.resolve("granted");
    };
    GrokNotification.maxActions = 2;
    try { Object.defineProperty(window, "Notification", { configurable: true, writable: true, value: GrokNotification }); }
    catch (e) { window.Notification = GrokNotification; }
  } catch (e) {}
  try {
    if (window.ServiceWorkerRegistration && ServiceWorkerRegistration.prototype) {
      ServiceWorkerRegistration.prototype.showNotification = function (title, options) {
        relay(title, options || {});
        return Promise.resolve();
      };
    }
  } catch (e) {}
})();`;

// Injected on ⌘F: a lightweight find-in-page bar using WebKit's window.find().
const FIND_BAR = `(function () {
  var existing = document.getElementById("__grok_find_bar__");
  if (existing) { var i = existing.querySelector("input"); i.focus(); i.select(); return; }
  function mkbtn(t, fn) {
    var b = document.createElement("button");
    b.textContent = t;
    b.style.cssText = "background:transparent;border:none;color:inherit;cursor:pointer;font:inherit;padding:2px 7px;border-radius:6px;line-height:1";
    b.onmouseenter = function () { b.style.background = "rgba(255,255,255,0.12)"; };
    b.onmouseleave = function () { b.style.background = "transparent"; };
    b.onclick = fn;
    return b;
  }
  var bar = document.createElement("div");
  bar.id = "__grok_find_bar__";
  bar.style.cssText = "position:fixed;top:12px;right:16px;z-index:2147483647;display:flex;gap:4px;align-items:center;background:rgba(28,28,32,0.96);color:#fff;border:1px solid rgba(255,255,255,0.14);border-radius:10px;padding:6px 8px;box-shadow:0 10px 34px rgba(0,0,0,0.45);font:13px -apple-system,system-ui,sans-serif";
  var input = document.createElement("input");
  input.type = "text"; input.placeholder = "Find in page";
  input.style.cssText = "background:transparent;border:none;outline:none;color:inherit;width:180px;font:inherit";
  function find(fwd) { if (input.value) { try { window.find(input.value, false, !fwd, true, false, true, false); } catch (e) {} } }
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); find(!e.shiftKey); }
    else if (e.key === "Escape") { e.preventDefault(); bar.remove(); }
  });
  bar.appendChild(input);
  bar.appendChild(mkbtn("‹", function () { find(false); }));
  bar.appendChild(mkbtn("›", function () { find(true); }));
  bar.appendChild(mkbtn("✕", function () { bar.remove(); }));
  document.body.appendChild(bar);
  input.focus();
})();`;

async function injectBridge(): Promise<void> {
  const w = getGrokWindow();
  if (!w) return;
  try {
    await w.webContents.executeJavaScript(NOTIFY_BRIDGE);
  } catch {
    // Page may not be ready; the next dom-ready/did-finish-load retries.
  }
}

let appleDialogShowing = false;

// Apple's sign-in flow requires a system-level ASWebAuthenticationSession to
// complete (it shares Safari's credential store and passes Apple's device-trust
// check); no embedded WKWebView — including this app's — can satisfy that, so
// the flow otherwise hangs indefinitely on "Verifying your device". Short-circuit
// it with a clear explanation instead of letting the user hit that dead end.
async function warnAppleSignInUnavailable(): Promise<void> {
  if (appleDialogShowing) return;
  appleDialogShowing = true;
  const w = getGrokWindow();
  try {
    const options = {
      type: "info" as const,
      title: "Sign in with Apple isn't available here",
      message: "Sign in with Apple can't complete in this desktop app.",
      detail:
        "Apple requires its own system-level authentication view for sign-in, which this app doesn't yet support — the flow would otherwise hang on “Verifying your device.” Please use Google, X, or email sign-in instead.",
      buttons: ["OK"],
      defaultId: 0,
    };
    if (w) {
      await dialog.showMessageBox(w, options);
    } else {
      await dialog.showMessageBox(options);
    }
  } catch {
    // ignore
  } finally {
    appleDialogShowing = false;
  }
}

function safeHostname(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// Single-window auth model: X/xAI's OAuth chain bounces through intermediate
// hosts (token-exchange endpoints, Cloudflare Turnstile challenges, tracking
// redirects) that don't cleanly match a per-domain whitelist. Native popups
// always land with window.opener nulled out by contextIsolation anyway (so
// the popup's own postMessage-based handoff can never work here), so there is
// no benefit to a real child window — every auth popup is instead flattened
// into this SAME webContents, and the "landed on the post-auth page" moment
// is detected by URL rather than by anything the page itself tries to signal.
function wireNavigationGuards(targetWc: WebContents): void {
  // True only while an explicit sign-in *route* (OAuth authorize, /login,
  // etc. — see isExplicitLoginUrl) is actually in flight. Without this gate,
  // landing on accounts.x.ai/account for ANY reason — including the user
  // legitimately clicking "Manage Account" or "Billing" from inside Grok
  // afterwards — would get bounced straight back to grok.com, locking them
  // out of their own settings ("Settings Black Hole"). Reset to false the
  // moment the auto-redirect fires, so a later, non-auth visit to /account
  // is left alone.
  let isAuthenticating = false;

  targetWc.setWindowOpenHandler((details) => {
    if (isAppleAuthHost(details.url)) {
      void warnAppleSignInUnavailable();
      return { action: "deny" };
    }
    if (shouldOpenInApp(details.url, { isPopup: true })) {
      if (isExplicitLoginUrl(details.url)) isAuthenticating = true;
      if (!targetWc.isDestroyed()) {
        queueMicrotask(() => {
          if (!targetWc.isDestroyed()) void targetWc.loadURL(details.url);
        });
      }
      return { action: "deny" };
    }
    // Genuine external link (e.g. a cited Wikipedia article) — send to the
    // system browser instead of flattening it into the app.
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  // The OAuth chain finishes by landing on accounts.x.ai/account, which — with
  // no popup and no window.opener — has nothing left to signal completion.
  // Watch for that URL on both full navigations and in-page (hash/History
  // API) navigations, since a redirect chain this messy doesn't reliably fire
  // only one or the other, and jump straight back to grok.com once it's seen
  // — but only while isAuthenticating is actually true.
  const redirectHomeIfAuthLanded = (url: string): void => {
    if (!isAuthenticating) return;
    if (!url.includes("accounts.x.ai/account")) return;
    isAuthenticating = false;
    if (targetWc.isDestroyed()) return;
    void targetWc.loadURL(GROK_URL);
  };
  targetWc.on("did-navigate", (_event, url) => redirectHomeIfAuthLanded(url));
  targetWc.on("did-navigate-in-page", (_event, url) => redirectHomeIfAuthLanded(url));

  targetWc.on("will-navigate", (details: WebContentsNavigationEvent) => {
    if (!details.isMainFrame) return;
    if (isAppleAuthHost(details.url)) {
      details.preventDefault();
      void warnAppleSignInUnavailable();
      return;
    }
    if (isExplicitLoginUrl(details.url)) isAuthenticating = true;
    // Once navigation has left grok.com — i.e. an auth flow is already in
    // flight — let it bounce freely through whatever hosts OAuth needs
    // (token exchange, CDN, Cloudflare challenge, etc.) instead of
    // re-applying the strict whitelist on every hop; that re-check is what
    // was kicking intermediate redirect domains out to the system browser and
    // breaking the login. The whitelist is only enforced while grok.com
    // itself is still the active page, so a real user-initiated link click
    // away from grok.com still gets routed externally when appropriate.
    const currentHost = safeHostname(targetWc.getURL());
    if (currentHost && !hostMatches(currentHost, "grok.com")) return;
    if (shouldOpenInApp(details.url, { isPopup: false })) return;
    details.preventDefault();
    void shell.openExternal(details.url);
  });
}

// Build and pop up a native context menu tailored to the right-clicked
// target: a "Save Image As…" entry for images (routed through the same
// save-dialog download flow via session.downloadURL), Copy for a selection,
// and Cut/Paste/Select All in editable fields. Roles act on this window's
// focused web contents. Nothing is shown when none of these apply.
function buildContextMenu(params: WebContentsContextMenuParams): void {
  const w = getGrokWindow();
  if (!w) return;

  const hasSelection = params.selectionText.trim().length > 0;
  const groups: MenuItemConstructorOptions[][] = [];

  if (params.mediaType === "image" && params.srcURL) {
    const src = params.srcURL;
    groups.push([
      {
        label: "Save Image As…",
        click: () => {
          try {
            w.webContents.session.downloadURL(src);
          } catch {
            // ignore
          }
        },
      },
    ]);
  }

  const editGroup: MenuItemConstructorOptions[] = [];
  if (params.isEditable && hasSelection) editGroup.push({ role: "cut" });
  if (hasSelection) editGroup.push({ role: "copy" });
  if (params.isEditable) editGroup.push({ role: "paste" });
  if (editGroup.length > 0) groups.push(editGroup);

  if (params.isEditable) groups.push([{ role: "selectAll" }]);

  if (groups.length === 0) return;

  const template: MenuItemConstructorOptions[] = [];
  groups.forEach((group, index) => {
    if (index > 0) template.push({ type: "separator" });
    template.push(...group);
  });

  Menu.buildFromTemplate(template).popup({ window: w });
}

async function updateTrayFromFavicon(favicons: string[]): Promise<void> {
  const w = getGrokWindow();
  if (!w) return;
  const url = favicons.find((f) => !!f);
  if (!url) return;
  try {
    const res = await w.webContents.session.fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    let img = nativeImage.createFromBuffer(buf);
    if (img.isEmpty()) return;
    img = await img.resize({ width: 18, height: 18 });
    setTrayImage(img);
  } catch {
    // Keep the fallback tray glyph.
  }
}

export async function createGrokWindow(): Promise<BrowserWindow> {
  const existing = getGrokWindow();
  if (existing) {
    existing.show();
    existing.focus();
    return existing;
  }

  win = new BrowserWindow({
    windowKey: "main",
    width: 1100,
    height: 800,
    minWidth: 480,
    minHeight: 600,
    title: "Grok",
    show: false,
    backgroundColor: "#0b0b0e",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 18 },
    fullscreenable: true,
    webPreferences: {
      partition: SESSION_PARTITION, // persistent: stays signed in across restarts
      spellcheck: true,
      // Grok streams responses live; don't let Chromium throttle the page's
      // timers/animations when the window is in the background so a
      // long-running reply keeps streaming while the user switches apps.
      backgroundThrottling: false,
      // No preload — keep window.glazeAPI out of grok.com.
    },
  });

  const wc = win.webContents;
  const sess = wc.session;

  try {
    const defaultUA = sess.getUserAgent();
    const honestUA = stripElectronToken(defaultUA);
    sess.setUserAgent(honestUA);
    logger.info("grok", "Set user agent (Electron token stripped)", { defaultUA, honestUA });
  } catch {
    // ignore
  }
  // Force a native "Save As…" dialog for every download instead of silently
  // dropping files into ~/Downloads. Setting a save path (via item.setSavePath
  // or session.setDownloadPath) is exactly what SUPPRESSES the dialog, so we
  // deliberately do neither — we only customize the dialog Electron then shows
  // on its own, defaulting the name/location to the Downloads folder.
  sess.on("will-download", (_event, item) => {
    item.setSaveDialogOptions({
      title: "Save File",
      defaultPath: join(app.getPath("downloads"), item.getFilename()),
      buttonLabel: "Save",
    });
  });

  const ALLOWED_PERMISSIONS = new Set<string>([
    "media",
    "mediaKeySystem",
    "notifications",
    "clipboard-read",
    "clipboard-sanitized-write",
    "fullscreen",
    "pointerLock",
    "display-capture",
    "idle-detection",
    "geolocation",
    "speaker-selection",
    "storage-access",
    "top-level-storage-access",
  ]);
  sess.setPermissionRequestHandler((_wc, permission, callback) =>
    callback(ALLOWED_PERMISSIONS.has(permission)),
  );
  sess.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));

  win.once("ready-to-show", () => {
    win?.show();
  });

  // window.open / target=_blank / top-level navigation guards — see
  // wireNavigationGuards for the single-window auth model.
  wireNavigationGuards(wc);

  // Native right-click context menu, built from what was actually clicked.
  wc.on("context-menu", (_event, params) => buildContextMenu(params));

  // Connection-lost → branded retry page.
  wc.on("did-fail-load", (_event, errorCode, _desc, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (errorCode === -3) return; // ERR_ABORTED (navigation superseded)
    if (validatedURL.startsWith("data:")) return;
    logger.warn("grok", "Main frame load failed", { errorCode, validatedURL });
    void win?.loadURL(buildErrorPage());
  });

  // Relay web notifications forwarded by the injected bridge.
  wc.on("console-message", (details: WebContentsConsoleMessageEvent) => {
    const msg = details.message;
    if (typeof msg !== "string" || !msg.startsWith(NOTIFY_SENTINEL)) return;
    try {
      const data = JSON.parse(msg.slice(NOTIFY_SENTINEL.length)) as {
        title?: string;
        body?: string;
      };
      const notification = new Notification({ title: data.title || "Grok", body: data.body || "" });
      notification.on("click", () => showWindow());
      notification.show();
    } catch {
      // Malformed payload; ignore.
    }
  });

  wc.on("dom-ready", () => void injectBridge());
  wc.on("did-finish-load", () => void injectBridge());
  wc.on("page-favicon-updated", (_event, favicons) => void updateTrayFromFavicon(favicons));

  win.on("closed", () => {
    win = null;
  });

  // Show branded loading chrome instantly, then load the live site.
  await win.loadURL(buildLoadingPage());
  void win.loadURL(GROK_URL);

  return win;
}

// ── Window actions (wired to menu, tray, and global shortcut) ─────────────

export function showWindow(): void {
  const w = getGrokWindow();
  if (!w) {
    void createGrokWindow();
    return;
  }
  if (w.isMinimized()) w.restore();
  w.show();
  w.focus();
}

export function toggleVisibility(): void {
  const w = getGrokWindow();
  if (!w) {
    void createGrokWindow();
    return;
  }
  if (w.isVisible() && w.isFocused()) {
    w.hide();
  } else {
    if (w.isMinimized()) w.restore();
    w.show();
    w.focus();
  }
}

export function newChat(): void {
  const w = getGrokWindow();
  if (!w) {
    void createGrokWindow();
    return;
  }
  showWindow();
  void w.webContents.loadURL(GROK_URL);
}

export function reload(): void {
  getGrokWindow()?.webContents.reload();
}

// "Panic button": if a bad frontend push corrupts the cached bundle or service
// worker and leaves the app stuck on a white screen, clear the cache-type
// storages and reload. Cookies, localStorage and IndexedDB are deliberately
// left intact so the signed-in session survives the reset — a stale service
// worker or HTTP/cache-storage entry is the white-screen culprit, not those.
export async function clearCacheAndReload(): Promise<void> {
  const w = getGrokWindow();
  if (!w) return;
  const sess = w.webContents.session;
  try {
    await sess.clearCache();
    await sess.clearStorageData({
      storages: ["appcache", "shadercache", "serviceworkers", "cachestorage"],
    });
  } catch (error) {
    logger.warn("grok", "Clear cache & reload failed", { error: String(error) });
  }
  if (w.isDestroyed()) return;
  w.webContents.reload();
}

function applyZoom(): void {
  getGrokWindow()?.webContents.setZoomFactor(zoomFactor);
}

export function zoomIn(): void {
  zoomFactor = Math.min(zoomFactor + 0.1, 3);
  applyZoom();
}

export function zoomOut(): void {
  zoomFactor = Math.max(zoomFactor - 0.1, 0.5);
  applyZoom();
}

export function zoomReset(): void {
  zoomFactor = 1;
  applyZoom();
}

export function printPage(): void {
  try {
    getGrokWindow()?.webContents.print();
  } catch (error) {
    logger.warn("grok", "Print failed", { error: String(error) });
  }
}

export function toggleFind(): void {
  const w = getGrokWindow();
  if (!w) return;
  void w.webContents.executeJavaScript(FIND_BAR, true);
}

// ── Manual session import (debug escape hatch) ─────────────────────────────
//
// Parses a raw cookie string in `document.cookie` / `Cookie` header format
// ("name=value; name2=value2") into name/value pairs. Ignores malformed
// segments (no "=", or an empty name) instead of failing the whole batch.
function parseCookieString(raw: string): Array<{ name: string; value: string }> {
  const out: Array<{ name: string; value: string }> = [];
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!name) continue;
    out.push({ name, value });
  }
  return out;
}

/**
 * Debug escape hatch for when in-app/system-browser sign-in can't complete
 * (see the Apple/Turnstile constraints above): takes a raw cookie string
 * copied from an already-signed-in browser session and writes each cookie
 * directly into the main window's cookie store for grok.com, x.ai, and
 * accounts.x.ai, then reloads grok.com.
 *
 * Each cookie is set with a `domain` matching its `url` host (so Chromium
 * normalizes it to a leading-dot `.<host>` cookie valid across all subdomains,
 * matching xAI's cross-subdomain session model), `secure: true`, and an
 * explicit `expirationDate` one year out so the cookies persist across
 * relaunches rather than dropping on quit as session cookies. The `domain`
 * always matches the `url` host, which sidesteps the "Failed to parse cookie"
 * class of errors that only occurs on url/domain *mismatch*.
 */
export async function importSessionCookies(rawCookieString: string): Promise<{ count: number }> {
  const cookies = parseCookieString(rawCookieString);
  if (cookies.length === 0) {
    throw new Error("No valid name=value cookie pairs found in that string.");
  }

  const w = getGrokWindow() ?? (await createGrokWindow());
  const sess = w.webContents.session;

  // One year in the future, in seconds since the UNIX epoch (Electron's unit).
  const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

  for (const domain of COOKIE_IMPORT_DOMAINS) {
    for (const { name, value } of cookies) {
      try {
        await sess.cookies.set({
          url: `https://${domain}/`,
          domain,
          name,
          value,
          path: "/",
          secure: true,
          sameSite: "lax",
          expirationDate,
        });
      } catch (error) {
        logger.warn("grok", "Failed to set imported cookie", {
          domain,
          name,
          error: String(error),
        });
      }
    }
  }

  await w.webContents.loadURL(GROK_URL);

  return { count: cookies.length };
}
