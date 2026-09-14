// Pack-specific steering wheel marks - metallic rim, shaped spokes,
// transparent background. Variant drives the accent + hub emblem:
// "eu" = EU blue with a 12-star hub ring, "ro" = graphite with a
// tricolor hub shield.

interface WheelSvgProps {
  className?: string;
  variant?: "eu" | "ro";
}

const ACCENT = {
  eu: "#3b82f6",
  ro: "#f59e0b",
} as const;

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
}

export function WheelSvg({ className = "", variant = "eu" }: WheelSvgProps) {
  const accent = ACCENT[variant];
  const gid = (n: string): string => `${variant}-${n}`;
  // Three shaped spokes: two upper (210/330 clock positions -> 150/30 deg
  // in screen angles below) and one straight down.
  const spokes = [150, 30, 270];
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid("rim")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6eaf0" />
          <stop offset="0.45" stopColor="#9aa1ad" />
          <stop offset="0.75" stopColor="#5b616b" />
          <stop offset="1" stopColor="#c9ced7" />
        </linearGradient>
        <radialGradient id={gid("hub")} cx="0.38" cy="0.32" r="0.9">
          <stop offset="0" stopColor="#3a3f47" />
          <stop offset="0.7" stopColor="#22262c" />
          <stop offset="1" stopColor="#14171b" />
        </radialGradient>
        <linearGradient id={gid("spoke")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a5058" />
          <stop offset="1" stopColor="#23272d" />
        </linearGradient>
      </defs>

      {/* Rim */}
      <circle cx={100} cy={100} r={70} fill="none" stroke={`url(#${gid("rim")})`} strokeWidth={15} />
      {/* Accent pinstripe on the rim */}
      <circle cx={100} cy={100} r={70} fill="none" stroke={accent} strokeWidth={2} opacity={0.85} />
      {/* 12-o'clock marker */}
      <rect x={96.5} y={22} width={7} height={10} rx={2} fill={accent} />

      {/* Shaped spokes */}
      {spokes.map((deg) => {
        const [tx, ty] = polar(100, 100, 62, deg);
        const [hx, hy] = polar(100, 100, 30, deg);
        const [lx, ly] = polar(100, 100, 47, deg - 7);
        const [rx, ry] = polar(100, 100, 47, deg + 7);
        return (
          <path
            key={deg}
            d={`M ${lx} ${ly} L ${tx} ${ty} L ${rx} ${ry} L ${hx} ${hy} Z`}
            fill={`url(#${gid("spoke")})`}
            stroke="#101216"
            strokeWidth={1}
          />
        );
      })}

      {/* Hub */}
      <circle cx={100} cy={100} r={30} fill={`url(#${gid("hub")})`} stroke="#0c0e11" strokeWidth={2} />
      <circle cx={100} cy={100} r={30} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.6} />

      {variant === "eu" ? (
        /* 12-star ring */
        <g fill="#dbeafe">
          {Array.from({ length: 12 }, (_, i) => {
            const [sx, sy] = polar(100, 100, 15, i * 30);
            return <circle key={i} cx={sx} cy={sy} r={2.1} />;
          })}
          <circle cx={100} cy={100} r={4.5} fill={accent} />
        </g>
      ) : (
        /* Tricolor shield */
        <g>
          <clipPath id={gid("shield")}>
            <path d="M 88 88 h 24 v 12 c 0 8 -6 13 -12 15 c -6 -2 -12 -7 -12 -15 Z" />
          </clipPath>
          <g clipPath={`url(#${gid("shield")})`}>
            <rect x={88} y={88} width={8} height={28} fill="#1e40af" />
            <rect x={96} y={88} width={8} height={28} fill="#facc15" />
            <rect x={104} y={88} width={8} height={28} fill="#dc2626" />
          </g>
          <path
            d="M 88 88 h 24 v 12 c 0 8 -6 13 -12 15 c -6 -2 -12 -7 -12 -15 Z"
            fill="none"
            stroke="#0c0e11"
            strokeWidth={1.5}
          />
        </g>
      )}
    </svg>
  );
}
