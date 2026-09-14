// Self-contained branded chrome pages loaded as data: URLs.
// These render in the SAME webContents that later loads grok.com, so they must
// NOT rely on an app preload (which would then leak into grok.com).

import { GROK_URL } from "./config.js";

const BASE_STYLE = `
  :root { color-scheme: light dark; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    display: flex; align-items: center; justify-content: center;
    background: #0b0b0e; color: #f5f5f7;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
    -webkit-user-select: none; user-select: none;
    -webkit-app-region: drag;
  }
  @media (prefers-color-scheme: light) { body { background: #ffffff; color: #0b0b0e; } }
  .wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; padding: 32px; max-width: 380px; }
  .logo { font-size: 46px; font-weight: 600; letter-spacing: -1.5px; opacity: 0; animation: fade .5s ease forwards; }
  .spinner { width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid rgba(140,140,150,.25); border-top-color: currentColor; animation: spin .8s linear infinite; opacity: .85; }
  .title { font-size: 19px; font-weight: 600; }
  .sub { font-size: 13.5px; line-height: 1.45; opacity: .6; }
  button {
    -webkit-app-region: no-drag;
    margin-top: 4px; padding: 8px 20px; font: inherit; font-size: 14px; font-weight: 500;
    color: #fff; background: #1a1a1f; border: 1px solid rgba(255,255,255,.14);
    border-radius: 10px; cursor: pointer; transition: background .15s ease;
  }
  button:hover { background: #26262d; }
  @media (prefers-color-scheme: light) {
    button { color: #0b0b0e; background: #f2f2f4; border-color: rgba(0,0,0,.12); }
    button:hover { background: #e8e8ec; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fade { to { opacity: 1; } }
`;

function toDataUrl(html: string): string {
  return "data:text/html;charset=utf-8," + encodeURIComponent(html);
}

export function buildLoadingPage(): string {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${BASE_STYLE}</style></head>
<body><div class="wrap"><div class="logo">Grok</div><div class="spinner"></div></div></body></html>`;
  return toDataUrl(html);
}

export function buildErrorPage(): string {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${BASE_STYLE}</style></head>
<body><div class="wrap">
  <div class="logo">Grok</div>
  <div class="title">Connection lost</div>
  <div class="sub">Grok couldn’t be reached. Check your internet connection and try again.</div>
  <button id="retry">Retry</button>
</div>
<script>
  var GROK = ${JSON.stringify(GROK_URL)};
  var btn = document.getElementById("retry");
  function retry() {
    document.querySelector(".title").textContent = "Reconnecting…";
    document.querySelector(".sub").textContent = "";
    btn.style.display = "none";
    var s = document.createElement("div"); s.className = "spinner";
    document.querySelector(".wrap").appendChild(s);
    setTimeout(function () { location.href = GROK; }, 150);
  }
  btn.addEventListener("click", retry);
  window.addEventListener("keydown", function (e) { if (e.key === "Enter") retry(); });
</script>
</body></html>`;
  return toDataUrl(html);
}
