/**
 * The Moon as it looks at an elongation from the Sun (0 new, 180 full): lit
 * on the right while it waxes, as seen from the northern hemisphere. The lit
 * share follows the elongation: (1 − cos e) / 2.
 */
export function MoonGlyph({
  elong,
  size = 16,
  className,
  title,
}: {
  elong: number;
  size?: number;
  className?: string;
  /** Spoken name; without it the drawing is hidden from screen readers. */
  title?: string;
}) {
  const r = size / 2 - 0.75;
  const c = size / 2;
  const e = ((elong % 360) + 360) % 360;
  const rx = Math.abs(Math.cos((e * Math.PI) / 180)) * r;
  const waxing = e < 180;
  const gibbous = e > 90 && e < 270;
  // The bright limb on the lit side, then the terminator back as a half-ellipse.
  const limb = waxing ? 1 : 0;
  const terminator = waxing ? (gibbous ? 1 : 0) : gibbous ? 0 : 1;
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${limb} ${c} ${c + r} A ${rx.toFixed(3)} ${r} 0 0 ${terminator} ${c} ${c - r} Z`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className ? `ulune-moon ${className}` : "ulune-moon"}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <circle cx={c} cy={c} r={r} className="ulune-moon-dark" />
      <path d={d} className="ulune-moon-lit" />
    </svg>
  );
}
