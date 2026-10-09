import type { LanguageId } from "@/studio/map";

/**
 * Each language's mark, drawn small (16 px) beside its name: the Sun's
 * circle and point for astrology, the head and the G centre of a bodygraph
 * for Human Design, the tetractys (the ten points of Pythagoras) for
 * numerology. Lines in the text colour, so they follow both themes.
 */
export function LanguageMark({ id, className }: { id: LanguageId; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
      {id === "astrology" ? (
        <>
          <circle cx="8" cy="8" r="5.8" />
          <circle cx="8" cy="8" r="1.7" fill="currentColor" stroke="none" />
        </>
      ) : id === "human-design" ? (
        <path d="M8 1.8 11.2 6.2H4.8ZM8 7.8 11.2 11 8 14.2 4.8 11Z" />
      ) : id === "bazi" ? (
        // The four pillars side by side.
        <path d="M2.6 3v10M6.2 3v10M9.8 3v10M13.4 3v10" strokeLinecap="round" />
      ) : id === "chinese-astrology" ? (
        // The wheel of the twelve, its four cardinal animals marked (Rat, Rabbit, Horse, Rooster).
        <>
          <circle cx="8" cy="8" r="4.6" />
          <path d="M8 1v2.2M15 8h-2.2M8 15v-2.2M1 8h2.2" strokeLinecap="round" />
        </>
      ) : (
        <g fill="currentColor" stroke="none">
          {TETRACTYS.map(([x, y]) => (
            <circle key={`${x},${y}`} cx={x} cy={y} r="1.15" />
          ))}
        </g>
      )}
    </svg>
  );
}

/** One point, then two, three and four: the rows of the tetractys. */
const TETRACTYS: [number, number][] = [1, 2, 3, 4].flatMap((n, row) =>
  Array.from({ length: n }, (_, i): [number, number] => [8 + (i - (n - 1) / 2) * 3.3, 2.6 + row * 3.4]),
);
