/**
 * Euro-plate device: the app's identity element. A European registration
 * plate — white field, blue EU band on the left with the 12-star ring and
 * country code, characters in DIN Condensed (ships with macOS, the plate
 * font's closest system cousin to FE-Schrift).
 *
 * Used large for the landing headline and small as pack identity chips.
 * Text is decorative here; pass ariaLabel for the accessible name.
 */

interface EuroPlateProps {
  /** Country code in the blue band ("EU", "RO"). */
  code: string;
  /** Main characters on the white field. */
  text: string;
  /** Accessible name (the plate is decorative imagery to screen readers). */
  ariaLabel: string;
  size?: "lg" | "sm";
  className?: string;
}

const STARS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 * Math.PI) / 180;
  return { x: 20 + 12.5 * Math.sin(angle), y: 20 - 12.5 * Math.cos(angle) };
});

/** Five-point star path centred on (0,0), outer r 3, inner r 1.2. */
function starPath(): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 3 : 1.2;
    const a = ((i * 36 - 90) * Math.PI) / 180;
    pts.push(`${(20 + r * Math.sin(a) * 1).toFixed(2)},${(20 - r * Math.cos(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

const STAR_D = starPath();

export function EuroPlate({ code, text, ariaLabel, size = "lg", className = "" }: EuroPlateProps) {
  const lg = size === "lg";
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={`inline-flex select-none items-stretch overflow-hidden rounded-md border border-[#15171b] bg-gradient-to-b from-[#f8f9fa] to-[#dfe3e8] ${
        lg ? "h-[92px] rounded-lg" : "h-7"
      } ${className}`}
      style={{
        boxShadow: lg
          ? "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.12)"
          : "0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      {/* Blue EU band: star ring over the country code */}
      <span
        className="flex shrink-0 flex-col items-center justify-center gap-0.5"
        style={{
          backgroundColor: "#003399",
          width: lg ? 56 : 22,
          borderRight: "1px solid rgba(0,0,0,0.35)",
        }}
        aria-hidden
      >
        <svg viewBox="0 0 40 40" className={lg ? "h-9 w-9" : "h-3 w-3"} fill="#ffcc00">
          {STARS.map((s, i) => (
            <path key={i} d={STAR_D} transform={`translate(${s.x - 20} ${s.y - 20})`} />
          ))}
        </svg>
        <span
          className={`font-bold leading-none text-[#ffcc00] ${lg ? "text-sm tracking-[0.2em]" : "text-[7px] tracking-widest"}`}
          style={{ fontFamily: '"DIN Condensed", "DIN Alternate", system-ui' }}
        >
          {code}
        </span>
      </span>

      {/* White field with the characters (two rivets top/bottom, plate-style) */}
      <span
        className="relative flex items-center justify-center px-3"
        style={{ paddingInline: lg ? 22 : 8 }}
        aria-hidden
      >
        {lg ? (
          <span className="absolute left-1/2 top-[3px] h-1 w-1 -translate-x-1/2 rounded-full bg-[#9aa0a8] shadow-[inset_0_1px_1px_rgba(0,0,0,0.4)]" />
        ) : null}
        <span
          className={`font-bold uppercase leading-none text-[#1a1d21] ${
            lg ? "text-[56px] tracking-[0.06em]" : "text-[13px] tracking-[0.08em]"
          }`}
          style={{
            fontFamily: '"DIN Condensed", "DIN Alternate", system-ui',
            textShadow: lg ? "0 1px 0 rgba(255,255,255,0.8)" : "none",
          }}
        >
          {text}
        </span>
        {lg ? (
          <span className="absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#9aa0a8] shadow-[inset_0_1px_1px_rgba(0,0,0,0.4)]" />
        ) : null}
      </span>
    </span>
  );
}
