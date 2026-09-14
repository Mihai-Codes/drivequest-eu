// Grok app configuration and domain-routing rules.

export const GROK_URL = "https://grok.com/";
export const SESSION_PARTITION = "persist:grok";

// Stable GUID so the menu-bar item keeps its position across relaunches.
export const TRAY_GUID = "b0d5f6a2-9c3e-4a7b-8f2d-6e1a7c4b9d33";

// Leaves ⌥Space free (Raycast) per the product spec.
export const DEFAULT_GLOBAL_SHORTCUT = "Control+Alt+G";

// Cloudflare Turnstile (and some identity providers) fingerprint the literal
// "Electron/x.y.z" token in the default user agent as an automation/embedding
// signal and fail the challenge. Stripping just that token — instead of
// spoofing a different browser's UA entirely — leaves the rest of the string
// (the real Chrome/Chromium identification) honest.
export function stripElectronToken(userAgent: string): string {
  return userAgent.replace(/\s*Electron\/\S+/i, "").trim();
}

// Sentinel used by the injected page bridge to relay web notifications to the
// backend over the console channel (grok.com runs without an app preload).
export const NOTIFY_SENTINEL = "__GROKNOTIFY__";

export function hostMatches(host: string, base: string): boolean {
  return host === base || host.endsWith("." + base);
}

// Paths that indicate an authentication / sign-in flow, which must stay in-app
// even on third-party provider domains.
const AUTH_PATH_RE =
  /(oauth|authorize|\/login|signin|sign[_-]?in|\/sso|\/i\/flow|account\/access|checkpoint|challenge|two[_-]?factor|\/consent|\/authenticate|\/auth\b)/i;

// Dedicated identity-provider hosts that only ever serve sign-in.
const AUTH_HOSTS = new Set([
  "accounts.google.com",
  "appleid.apple.com",
  "idmsa.apple.com",
  "accounts.youtube.com",
]);

// Apple's identity provider structurally cannot complete inside any embedded
// WKWebView (it requires ASWebAuthenticationSession, which Glaze does not yet
// expose) — these hosts are short-circuited with an explanatory dialog instead
// of being allowed to hang on "Verifying your device".
const APPLE_AUTH_HOSTS = new Set(["appleid.apple.com", "idmsa.apple.com"]);

// Domains a manually-pasted cookie string gets replicated across when using
// the debug "Import Session Cookies" flow (bypasses in-app sign-in entirely).
export const COOKIE_IMPORT_DOMAINS = ["grok.com", "x.ai", "accounts.x.ai"] as const;

export function isAppleAuthHost(rawUrl: string): boolean {
  try {
    return APPLE_AUTH_HOSTS.has(new URL(rawUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

// True only for URLs that are explicitly an OAuth/sign-in *route* (e.g.
// twitter.com/i/oauth/authorize, /login) — as opposed to any ordinary page on
// an auth-adjacent domain, such as accounts.x.ai/account (account settings).
// Used to scope the "just finished signing in" auto-redirect so it doesn't
// also fire when the user legitimately navigates to their account/billing
// page outside of a login flow.
export function isExplicitLoginUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    return AUTH_PATH_RE.test(u.pathname + u.search);
  } catch {
    return false;
  }
}

/**
 * Decide whether a URL should stay inside the app window or open in the user's
 * default browser.
 *
 * - grok.com and all x.ai infrastructure (including accounts.x.ai) stay in-app.
 * - Identity providers and auth flows (incl. X/Twitter login) stay in-app so
 *   sign-in can complete and redirect back.
 * - Everything else — cited sources, x.com posts, help docs — goes to the browser.
 */
export function shouldOpenInApp(rawUrl: string, opts: { isPopup: boolean }): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }

  // Internal chrome (branded loading / error pages).
  if (u.protocol === "data:" || u.protocol === "about:" || u.protocol === "blob:") return true;

  // Non-web schemes (mailto:, tel:, etc.) are handled by the OS.
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;

  const host = u.hostname.toLowerCase();
  const path = u.pathname + u.search;

  // Core product + xAI infrastructure (incl. accounts.x.ai).
  if (hostMatches(host, "grok.com") || hostMatches(host, "x.ai")) return true;

  // Dedicated sign-in hosts.
  if (AUTH_HOSTS.has(host)) return true;

  // X / Twitter: kept fully in-app (whitelisted alongside grok.com and x.ai) so
  // the "Sign in with X" OAuth chain — authorize → Approve → redirect back — is
  // never kicked out to Safari on an intermediate hop that doesn't happen to
  // match an auth path. Trade-off: cited x.com post links now also open in-app
  // rather than the system browser.
  if (hostMatches(host, "x.com") || hostMatches(host, "twitter.com")) return true;

  // Cloudflare Turnstile bot-check pages can appear mid-flow on any of the auth
  // domains above (before the redirect back to grok.com completes); keep them
  // in-app too so the challenge doesn't get kicked to the system browser and
  // stall the sign-in redirect chain.
  if (hostMatches(host, "cloudflare.com")) return true;

  // Generic OAuth popups opened via window.open to any provider.
  if (opts.isPopup && AUTH_PATH_RE.test(path)) return true;

  return false;
}
