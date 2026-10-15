/*
 * The eight trigrams as Ulune draws them (languages plan, part 27, the
 * review's fix FS7): three bars, whole (yang) or broken (yin), from each
 * trigram's own lines (fengshui.ts, TRIGRAMS). The symbols ☰ ☱ ☲ ☳ ☴ ☵ ☶ ☷
 * come from the device's fonts, and some Windows and Android fonts draw
 * them tiny or as empty boxes; drawn, they look the same everywhere. The
 * symbol itself stays wherever it is text (sentences, a table's copy, what a
 * screen reader hears).
 *
 * Pure geometry: the figures draw the bars in their own SVG and running text
 * draws them at its own size (components/trigram-mark.tsx); a reading's mark
 * takes them as the inner markup of a 24 × 24 box (`markSvg`). Tested in
 * scripts/chinese-fengshui.test.mjs.
 */
import { TRIGRAMS, type Trigram, type TrigramLines } from "./fengshui";

/** One bar of a trigram (a broken line is two). */
export type TrigramBar = { x: number; y: number; w: number; h: number };

/** The trigram symbols, one each: ☰ (U+2630) to ☷ (U+2637). */
export const TRIGRAM_SYMBOLS = /[☰-☷]/u;

/** The trigram a symbol stands for, or undefined. */
export const trigramOfSymbol = (symbol: string): Trigram | undefined => TRIGRAMS.find((t) => t.symbol === symbol);

/**
 * A trigram's bars in a box (its top line first, as it is drawn): three bars
 * as thick as the gaps between them, a broken line cut in its middle by a
 * quarter of the width. The box's height should be about 0.8 of its width.
 */
export function trigramBars(lines: TrigramLines, box: { x: number; y: number; w: number; h: number }): TrigramBar[] {
  const t = box.h / 5;
  const cut = box.w * 0.24;
  const half = (box.w - cut) / 2;
  const bars: TrigramBar[] = [];
  for (let row = 0; row < 3; row += 1) {
    // The lines count from the bottom: the top row is the third line.
    const whole = lines[2 - row];
    const y = box.y + row * 2 * t;
    if (whole) bars.push({ x: box.x, y, w: box.w, h: t });
    else bars.push({ x: box.x, y, w: half, h: t }, { x: box.x + half + cut, y, w: half, h: t });
  }
  return bars;
}

const n = (v: number) => Number(v.toFixed(2));

/** A trigram as a reading's mark: the inner markup of a 24 × 24 box, in the text's colour. */
export function trigramSvgInner(lines: TrigramLines): string {
  return trigramBars(lines, { x: 2.5, y: 4.5, w: 19, h: 15 })
    .map((b) => `<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" rx="0.5" fill="currentColor"/>`)
    .join("");
}
