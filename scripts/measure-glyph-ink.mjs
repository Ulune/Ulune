/**
 * Measure where every SVG glyph actually inks, from pixels, and write
 * src/lib/chart/glyph-ink.ts: each glyph drawn by the browser at 40 px a
 * unit in its 24×24 box, its inked extent read back off the canvas. The
 * wheel centres a glyph's ink in its disc from this table (glyphs.tsx).
 *
 * Re-run after changing a glyph in glyph-svg.ts:
 *   node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/measure-glyph-ink.mjs
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { GLYPH_SVG } from "../src/lib/chart/glyph-svg.ts";

const OUT = new URL("../src/lib/chart/glyph-ink.ts", import.meta.url);

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let ink;
try {
  const page = await browser.newPage();
  ink = await page.evaluate(async (glyphs) => {
    const S = 40;
    const PAD = 4;
    const N = (24 + PAD * 2) * S;
    const inner = (raw) => raw.replace(/^[\s\S]*?<svg[^>]*>/i, "").replace(/<\/svg>[\s\S]*$/i, "");
    const out = {};
    for (const [id, raw] of Object.entries(glyphs)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${N}" height="${N}" viewBox="${-PAD} ${-PAD} ${24 + PAD * 2} ${24 + PAD * 2}" style="color:#000">${inner(raw)}</svg>`;
      const img = new Image();
      img.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      await img.decode();
      const c = document.createElement("canvas");
      c.width = N;
      c.height = N;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, N, N).data;
      let x0 = N;
      let y0 = N;
      let x1 = -1;
      let y1 = -1;
      for (let y = 0; y < N; y += 1)
        for (let x = 0; x < N; x += 1)
          if (d[(y * N + x) * 4 + 3] > 127) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      if (x1 < 0) continue;
      out[id] = [x0 / S - PAD, y0 / S - PAD, (x1 + 1) / S - PAD, (y1 + 1) / S - PAD].map((v) => Math.round(v * 100) / 100);
    }
    return out;
  }, GLYPH_SVG);
} finally {
  await browser.close();
}

const rows = Object.entries(ink)
  .map(([id, box]) => `  ${/^[a-z]+$/.test(id) ? id : JSON.stringify(id)}: [${box.join(", ")}],`)
  .join("\n");
writeFileSync(
  OUT,
  `/**
 * Where each SVG glyph (glyph-svg.ts) inks in its 24×24 box: [x0, y0, x1, y1],
 * measured from pixels (scripts/measure-glyph-ink.mjs — generated, re-run it
 * after changing a glyph). A glyph is drawn so the middle of its ink, not of
 * its box, sits on the point it marks.
 */
export const GLYPH_INK: Record<string, readonly [number, number, number, number]> = {
${rows}
};

/** How far to move a glyph's drawing (box units) so its ink is centred in its box; null when it is already. */
export function glyphShift(id: string): { dx: number; dy: number } | null {
  const box = GLYPH_INK[id];
  if (!box) return null;
  const dx = Math.round((12 - (box[0] + box[2]) / 2) * 100) / 100;
  const dy = Math.round((12 - (box[1] + box[3]) / 2) * 100) / 100;
  return dx || dy ? { dx, dy } : null;
}
`,
);
console.log(`measured ${Object.keys(ink).length} glyphs → ${OUT.pathname}`);
