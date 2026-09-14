// Porsche-like steering wheel icon - clean, smooth, professional
// Silver/dark grey rim with subtle gold accent on the hub
// Background: solid blue (no square visible)

interface WheelSvgProps {
  className?: string;
}

export function WheelSvg({ className = "" }: WheelSvgProps) {
  const style = { width: "100%", height: "100%", maxWidth: 280, maxHeight: 280 };
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      style={style}
    >
      {/* Solid blue background */}
      <rect x={0} y={0} width={200} height={200} fill="#1e3a8a" />

      {/* Outer rim - smooth silver/dark grey */}
      <circle
        cx={100}
        cy={100}
        r={72}
        fill="none"
        stroke="#c8cdd6"
        strokeWidth={6}
        opacity={0.95}
      />

      {/* Inner rim - subtle shadow */}
      <circle
        cx={100}
        cy={100}
        r={66}
        fill="none"
        stroke="#a0a5b0"
        strokeWidth={2}
        opacity={0.5}
      />

      {/* Three spokes - smooth, clean */}
      {[
        { a: 0 },
        { a: 120 },
        { a: 240 },
      ].map(({ a }) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 100 + Math.cos(rad) * 22;
        const y1 = 100 + Math.sin(rad) * 22;
        const x2 = 100 + Math.cos(rad) * 66;
        const y2 = 100 + Math.sin(rad) * 66;
        return (
          <line
            key={a}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#d0d4da"
            strokeWidth={3.5}
            opacity={0.85}
          />
        );
      })}

      {/* Center hub - clean, subtle */}
      <circle
        cx={100}
        cy={100}
        r={20}
        fill="#e8ebef"
        opacity={0.95}
      />
      <circle
        cx={100}
        cy={100}
        r={14}
        fill="#1e3a8a"
        opacity={0.9}
      />
      <circle
        cx={100}
        cy={100}
        r={8}
        fill="#e8ebef"
        opacity={0.85}
      />

      {/* Hub top marker - subtle gold accent */}
      <circle
        cx={100}
        cy={82}
        r={3.5}
        fill="#c9a23a"
        opacity={0.7}
      />
    </svg>
  );
}
