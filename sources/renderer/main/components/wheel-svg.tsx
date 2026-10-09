// Steering-wheel icon, redrawn: a clean three-spoke wheel that reads
// instantly at small sizes — thick round rim, T-shaped spokes, centre hub
// with the pack accent. Variant drives the hub emblem: "eu" = EU-blue ring
// with a star at 12 o'clock, "ro" = amber ring with a tricolor chevron.

interface WheelSvgProps {
  className?: string;
  variant?: "eu" | "ro";
}

const ACCENT = {
  eu: "#4f7dff",
  ro: "#f59e0b",
} as const;

export function WheelSvg({ className = "", variant = "eu" }: WheelSvgProps) {
  const accent = ACCENT[variant];
  const gid = (n: string): string => `${variant}-${n}`;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid("rim")} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#f2f4f7" />
          <stop offset="0.4" stopColor="#b7bdc7" />
          <stop offset="0.75" stopColor="#6b7280" />
          <stop offset="1" stopColor="#d3d8df" />
        </linearGradient>
        <linearGradient id={gid("spoke")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b5563" />
          <stop offset="1" stopColor="#2b3138" />
        </linearGradient>
        <radialGradient id={gid("hub")} cx="0.35" cy="0.3" r="1">
          <stop offset="0" stopColor="#3f4650" />
          <stop offset="0.7" stopColor="#22262c" />
          <stop offset="1" stopColor="#14171b" />
        </radialGradient>
      </defs>

      {/* Rim: thick ring with a top-left highlight for material depth */}
      <circle
        cx="100"
        cy="100"
        r="76"
        fill="none"
        stroke={`url(#${gid("rim")})`}
        strokeWidth="17"
      />
      <circle cx="100" cy="100" r="66.5" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" />
      <path
        d="M 42 62 A 70 70 0 0 1 128 32"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Spokes: T-shape — two horizontal, one down, rounded into the rim */}
      <g fill={`url(#${gid("spoke")})`}>
        <rect x="58" y="92" width="84" height="16" rx="8" />
        <rect x="92" y="100" width="16" height="64" rx="8" />
      </g>
      {/* Spoke sheen */}
      <rect x="58" y="94.5" width="84" height="3.5" rx="1.75" fill="rgba(255,255,255,0.18)" />

      {/* Hub with pack emblem */}
      <circle
        cx="100"
        cy="100"
        r="26"
        fill={`url(#${gid("hub")})`}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1.5"
      />
      <circle cx="100" cy="100" r="19" fill="none" stroke={accent} strokeWidth="3.5" />
      {variant === "eu" ? (
        // Single gold star at 12 o'clock inside the ring
        <path
          d="M100 90.5l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z"
          fill="#ffcc00"
        />
      ) : (
        // Tricolor chevron
        <g>
          <rect x="91" y="94" width="6" height="12" rx="1.5" fill="#1d4ed8" />
          <rect x="97" y="94" width="6" height="12" rx="1.5" fill="#ffcc00" />
          <rect x="103" y="94" width="6" height="12" rx="1.5" fill="#dc2626" />
        </g>
      )}
    </svg>
  );
}
