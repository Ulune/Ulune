/**
 * Where each SVG glyph (glyph-svg.ts) inks in its 24×24 box: [x0, y0, x1, y1],
 * measured from pixels (scripts/measure-glyph-ink.mjs — generated, re-run it
 * after changing a glyph). A glyph is drawn so the middle of its ink, not of
 * its box, sits on the point it marks.
 */
export const GLYPH_INK: Record<string, readonly [number, number, number, number]> = {
  sun: [5, 5, 19, 19],
  moon: [5.68, 4.5, 14.85, 19.5],
  mercury: [6.45, 3.8, 17.55, 22.2],
  venus: [6.7, 3.15, 17.3, 20.75],
  mars: [4.65, 3.6, 20.45, 19.45],
  jupiter: [5.2, 4.2, 18.6, 22.05],
  saturn: [4.4, 3.5, 19.8, 21.35],
  uranus: [5.3, 4.1, 18.7, 20.05],
  neptune: [4.9, 3.45, 19.1, 20.55],
  pluto: [7.4, 4.1, 17.4, 20.6],
  chiron: [7.95, 3, 18.6, 20.85],
  northnode: [3.55, -0.85, 20.45, 8.5],
  southnode: [3.55, 15.5, 20.45, 24.85],
  lilith: [7.07, 3.88, 15.7, 21.2],
  vertex: [4.1, 4.1, 21.6, 21.6],
  antivertex: [4.1, 4.1, 21.9, 21.9],
  fortune: [3.9, 3.9, 20.1, 20.1],
  spirit: [3.9, 3.9, 20.1, 20.1],
  ceres: [5.95, 3.05, 18.05, 21.25],
  pallas: [6.7, 2.7, 17.3, 21.1],
  juno: [6.32, 3.45, 17.68, 21.1],
  vesta: [5.7, 2.6, 18.3, 21],
  eris: [4, 3.1, 20.5, 19.6],
  sedna: [3.1, 6, 21.5, 18],
  ascendant: [4.1, 3.9, 19.9, 20.9],
  midheaven: [3.5, 4.3, 20.5, 20.9],
  descendant: [4.1, 3.9, 19.9, 20.9],
  ic: [3.5, 4.3, 20.5, 20.9],
  aries: [3.8, 3.3, 20.2, 20.1],
  taurus: [4.3, 4.35, 19.7, 20.65],
  gemini: [4.4, 4.2, 19.6, 19.8],
  cancer: [3.75, 3.65, 20.25, 20.35],
  leo: [4.95, 3.1, 17, 23.13],
  virgo: [4.25, 3.7, 22.55, 20.5],
  libra: [3.45, 9.7, 20.55, 19.35],
  scorpio: [3.8, 3.7, 23, 21],
  sagittarius: [5.3, 4.3, 19.85, 18],
  capricorn: [4.15, 4.5, 22.45, 20.8],
  aquarius: [3.25, 6.65, 21.6, 17.9],
  pisces: [4.45, 3.65, 19.55, 20.35],
  conjunction: [3, 5.9, 21, 18.1],
  opposition: [2.15, 7.95, 21.85, 16.05],
  square: [4.2, 4.2, 19.8, 19.8],
  trine: [2.7, 3.3, 21.3, 19.7],
  sextile: [4.25, 3.2, 19.75, 20.8],
  quincunx: [4.3, 4.7, 19.7, 19.4],
  semisextile: [4.3, 4.9, 19.7, 19.1],
  semisquare: [4.1, 7.1, 14.9, 17.9],
  quintile: [6.05, 3.2, 17.95, 14.6],
  retrograde: [7.3, 5.3, 19.3, 21.5],
  "house-1": [9.3, 3.9, 14.5, 20.1],
  "house-2": [6.7, 3.7, 17.3, 20.1],
  "house-3": [5.1, 5.5, 16.7, 21.1],
  "house-4": [6.5, 3.9, 17.7, 20.1],
  "house-5": [5.3, 3.9, 17.3, 21.2],
  "house-6": [5.3, 3.7, 17.5, 20.3],
  "house-7": [6.3, 4.1, 17.7, 20.1],
  "house-8": [6.3, 3.7, 17.7, 20.7],
  "house-9": [6.5, 3.7, 18.7, 20.3],
  "house-10": [5.5, 3.9, 18.5, 20.1],
  "house-11": [6.7, 3.9, 17.5, 20.1],
  "house-12": [5.3, 3.7, 21.5, 20.1],
};

/** How far to move a glyph's drawing (box units) so its ink is centred in its box; null when it is already. */
export function glyphShift(id: string): { dx: number; dy: number } | null {
  const box = GLYPH_INK[id];
  if (!box) return null;
  const dx = Math.round((12 - (box[0] + box[2]) / 2) * 100) / 100;
  const dy = Math.round((12 - (box[1] + box[3]) / 2) * 100) / 100;
  return dx || dy ? { dx, dy } : null;
}
