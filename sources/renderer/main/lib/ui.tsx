/**
 * Small shared UI atoms, themed on a pan-European driving standard.
 * Centralised so every view uses the same surfaces, buttons and badges (DRY).
 *
 * Brand system — every color is semantic, drawn from two official sources:
 *   EU flag (official spec):   Reflex Blue #003399, Golden Yellow #FFCC00
 *   Vienna Convention signs:   prohibitory red, mandatory blue, warning gold
 *
 * Mapping:
 *   EU_BLUE  -> primary brand, actions, Driver Level/XP, EU pack accent
 *   EU_GOLD  -> stars, mastery, achievements (the flag's star color)
 *   SIGNAL_RED (legislatierutiera.ro) -> errors, wrong answers, hearts ONLY
 *   OFF_WHITE/INK -> neutral canvas that never fights any member country
 * Packs differentiate by accent; the app chrome stays European.
 */
import type { ReactNode, CSSProperties } from "react";

export const EU_BLUE = "#003399";
export const EU_GOLD = "#ffcc00";
export const SIGNAL_RED = "#c7081b";
export const OFF_WHITE = "#fbfaf7";
export const INK = "#2d2d2d";
export const AMBER = "#b45309"; // RO pack accent

export type PackAccent = { color: string; accent: string; soft: string };

export const PACK_ACCENT: Record<string, PackAccent> = {
  eu: { color: EU_BLUE, accent: EU_BLUE, soft: "rgba(0,51,153,0.10)" },
  ro: { color: "#7c2d12", accent: AMBER, soft: "rgba(180,83,9,0.10)" },
};

export function accentFor(country: string): PackAccent {
  return PACK_ACCENT[country] ?? { color: EU_BLUE, accent: EU_BLUE, soft: "rgba(0,51,153,0.10)" };
}

/** Frosted card surface: soft blur, hairline border, warm shadow. */
export function GlassCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/60 bg-white/55 shadow-[0_8px_30px_rgba(45,45,45,0.10)] backdrop-blur-xl ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  accent,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  accent?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,51,153,0.28)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 motion-safe:hover:opacity-90 ${className}`}
      style={{ backgroundColor: accent ?? EU_BLUE }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#2d2d2d]/20 bg-white/40 px-4 py-2 text-sm font-medium text-[#2d2d2d] transition-colors disabled:opacity-40 motion-safe:hover:bg-white/70 ${className}`}
    >
      {children}
    </button>
  );
}

/** Star rating (0-3) in EU gold. */
export function Stars({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill={i < count ? EU_GOLD : "none"}
          stroke={i < count ? "#d4a017" : "#2d2d2d55"}
          strokeWidth="1.6"
        >
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}

/** Heart in signal red (prohibitory/warning semantics). */
export function Heart({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${className}`}
      fill={filled ? SIGNAL_RED : "none"}
      stroke={filled ? SIGNAL_RED : "#2d2d2d55"}
      strokeWidth="1.8"
    >
      <path d="M12 21s-7.5-4.7-10-9.3C.6 8.6 2.4 4.5 6.2 4.5c2.2 0 3.7 1.2 4.8 3 1.1-1.8 2.6-3 4.8-3 3.8 0 5.6 4.1 4.2 7.2C19.5 16.3 12 21 12 21z" />
    </svg>
  );
}
