import { useEffect, useState } from "react";

import { isMuted, toggleMuted, click } from "../lib/sound.js";

/**
 * Global mute button — one tap silences every sound (clicks and ambient)
 * without touching the per-category toggles in Settings. Sits top-right on
 * every screen, inside the drag region margin.
 */
export function SoundToggle({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useState(isMuted());

  // Follow external changes (Settings, other windows).
  useEffect(() => {
    const t = setInterval(() => setMuted(isMuted()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <button
      type="button"
      title={muted ? "Sound off — click to unmute" : "Sound on — click to mute"}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={muted}
      onClick={() => {
        void toggleMuted().then((m) => {
          setMuted(m);
          // Confirm unmuting with a blip; muting stays silent on purpose.
          if (!m) click("primary");
        });
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white/75 backdrop-blur-md transition-colors hover:bg-black/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${className}`}
    >
      {muted ? (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m16 9 5 6m0-6-5 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
