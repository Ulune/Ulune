import type { ReactNode, SVGProps } from "react";
import type { TrigramLines } from "@/lib/chinese/fengshui";
import { TRIGRAM_SYMBOLS, trigramBars, trigramOfSymbol, trigramSvgInner } from "@/lib/chinese/fengshui-trigram";

/*
 * Feng Shui's trigrams drawn by Ulune (languages plan, part 27, the review's
 * fix FS7; the geometry in lib/chinese/fengshui-trigram.ts), never left to a
 * font that may draw ☰…☷ tiny or as empty boxes:
 *
 *   - TrigramBars: inside a figure's own SVG (the compass rose, the luopan),
 *     the bars centred on a point, painted by the figure's own class.
 *   - TrigramGlyph: in running text (the Kua card, the house card, the first
 *     read, the tables), the bars at the text's size, the symbol kept for
 *     screen readers and for a copy of the text.
 *   - withTrigrams: a line of text with every symbol in it drawn.
 */

const f = (v: number) => v.toFixed(2);

/** A trigram's bars centred on (cx, cy), `w` wide and 0.8 of that tall, in a figure's SVG. */
export function TrigramBars({ lines, cx, cy, w, ...rest }: { lines: TrigramLines; cx: number; cy: number; w: number } & Omit<SVGProps<SVGGElement>, "children">) {
  const h = w * 0.8;
  return (
    <g data-trigram="" {...rest}>
      {trigramBars(lines, { x: cx - w / 2, y: cy - h / 2, w, h }).map((b, i) => (
        <rect key={i} x={f(b.x)} y={f(b.y)} width={f(b.w)} height={f(b.h)} rx={f(b.h * 0.18)} />
      ))}
    </g>
  );
}

/** A trigram in running text: drawn at the text's size and colour; its symbol is what is read aloud and copied. */
export function TrigramGlyph({ symbol, className }: { symbol: string; className?: string }) {
  const trigram = trigramOfSymbol(symbol);
  if (!trigram) return <>{symbol}</>;
  return (
    <span className={className} data-trigram={trigram.id} style={{ whiteSpace: "nowrap" }}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        style={{ display: "inline-block", width: "1.25em", height: "1.25em", verticalAlign: "-0.28em" }}
        dangerouslySetInnerHTML={{ __html: trigramSvgInner(trigram.lines) }}
      />
      <span className="sr-only">{symbol}</span>
    </span>
  );
}

/** A line of text with each trigram symbol in it drawn ("A Kan ☵ house…"); the text unchanged when it has none. */
export function withTrigrams(text: string): ReactNode {
  if (!TRIGRAM_SYMBOLS.test(text)) return text;
  return text.split(/([☰-☷])/u).map((part, i) => (i % 2 ? <TrigramGlyph key={i} symbol={part} /> : part || null));
}
