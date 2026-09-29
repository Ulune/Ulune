/**
 * Marks the glyph fonts do not carry: the parallel (∥, two strokes) and the
 * contra-parallel (#, the same crossed), drawn to sit with the aspect glyphs.
 */
export function ParallelGlyph({ kind, size = 12, className }: { kind: "parallel" | "contra"; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className={className} data-parallel={kind}>
      <g fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
        <path d="M6 13.5 8.5 2.5M9.5 13.5 12 2.5" />
        {kind === "contra" ? <path d="M3 6.2h11M2.2 9.8h11" /> : null}
      </g>
    </svg>
  );
}
