/**
 * Path marks for every chart id. Wheel / mixer / table share these so a Look
 * typeface can never replace a body with tofu or a missing box.
 *
 * Classic planets, nodes, Lilith, and signs come from the existing sheet in
 * scripts/glyph-sheet.html. Lots, angles, asteroids, and aspects keep the
 * same 24×24 stroke language as the PR #7 SVG fallbacks.
 */

const ST =
  'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const ST_LIGHT =
  'fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"';

function svg(inner: string): string {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

/** House numbers 1–12 — path fallback when the Look face is missing the digit. */
const HOUSE_DIGIT: Record<string, string> = {
  "1": `<path d="M10.2 6.2 13.6 4.8v14.4" ${ST} />`,
  "2": `<path d="M7.6 8.2c.4-2.4 2.2-3.6 4.4-3.6 2.4 0 4.2 1.4 4.2 3.6 0 4.2-8.6 5.4-8.6 11h8.8" ${ST} />`,
  "3": `<path d="M8 6.4h7.4l-3.8 5.2c2.4.2 4.2 1.6 4.2 4.2 0 2.8-2.2 4.4-5.2 4.4-2.2 0-3.8-.8-4.6-2" ${ST} />`,
  "4": `<path d="M13.8 4.8 7.4 14.8h9.4M14.6 4.8v14.4" ${ST} />`,
  "5": `<path d="M15.6 4.8H8.4l-.6 6.4c.8-.6 2-.9 3.4-.9 3.2 0 5.2 1.8 5.2 5 0 3-2.2 5-5.4 5-2.2 0-4-.8-4.8-2.1" ${ST} />`,
  "6": `<path d="M15.2 6.2C14 5.2 12.6 4.6 11 4.6 8 4.6 6.2 7.2 6.2 12s1.8 7.4 5.2 7.4 5.2-2.2 5.2-5.2S14.4 9 11.4 9c-1.6 0-2.8.4-3.6 1.1" ${ST} />`,
  "7": `<path d="M7.2 5h9.6L10.4 19.2" ${ST} />`,
  "8": `<path d="M12 4.6c2.4 0 4.2 1.4 4.2 3.6S14.2 11.6 12 11.6 7.8 10.4 7.8 8.2 9.6 4.6 12 4.6Zm0 7c2.8 0 4.8 1.6 4.8 4.2S14.6 19.8 12 19.8 7.2 18 7.2 15.8 9.2 11.6 12 11.6Z" ${ST} />`,
  "9": `<path d="M8.8 17.8c1.2 1 2.6 1.6 4.2 1.6 3 0 4.8-2.6 4.8-7.4S16 4.6 12.6 4.6 7.4 6.8 7.4 9.8 9.6 15 12.6 15c1.6 0 2.8-.4 3.6-1.1" ${ST} />`,
  "10": `<path d="M6.4 6.2 9 4.8v14.4M17.6 12a4.6 4.6 0 1 1-9.2 0 4.6 4.6 0 0 1 9.2 0Z" ${ST} />`,
  "11": `<path d="M7.6 6.2 10.8 4.8v14.4M13.4 6.2 16.6 4.8v14.4" ${ST} />`,
  "12": `<path d="M6.2 6.2 9.2 4.8v14.4M12.6 8.2c.4-2.4 2-3.6 4-3.6 2.2 0 3.8 1.4 3.8 3.6 0 4.2-7.8 5.4-7.8 11h8" ${ST} />`,
};

export const GLYPH_SVG: Record<string, string> = {
  sun: svg(
    `<circle cx="12" cy="12" r="6.1" ${ST} /><circle cx="12" cy="12" r="1.5" fill="currentColor" />`,
  ),
  /** The Earth (Human Design's columns): a circle and a cross that reaches its rim (the Part of Fortune's cross stops short). */
  earth: svg(`<circle cx="12" cy="12" r="6.6" ${ST} /><path d="M12 5.4v13.2M5.4 12h13.2" ${ST} />`),
  moon: svg(`<path fill="currentColor" d="M14.9 4.7A7.5 7.5 0 1 0 14.9 19.3 5.45 5.45 0 1 1 14.9 4.7Z"/>`),
  mercury: svg(
    `<path d="M7.35 9.35a4.65 4.65 0 0 1 9.3 0" ${ST} /><circle cx="12" cy="13.15" r="3.45" ${ST} /><path d="M12 16.6v4.7M9.2 19.15h5.6" ${ST} />`,
  ),
  venus: svg(`<circle cx="12" cy="8.45" r="4.4" ${ST} /><path d="M12 12.85v7M8.5 16.55h7" ${ST} />`),
  mars: svg(
    `<circle cx="10.05" cy="14.05" r="4.5" ${ST} /><path d="M13.35 10.7 19.55 4.5M19.55 4.5h-5.5M19.55 4.5v5.5" ${ST} />`,
  ),
  jupiter: svg(
    `<path d="M6.8 8.05h10.1" ${ST} /><path d="M15.05 5.1v10.85c0 3.35-2.15 5.2-5.95 5.2" ${ST} /><path d="M6.1 13.85h11.6" ${ST} />`,
  ),
  saturn: svg(
    `<path d="M9.2 4.4v12c0 2.4 1.55 4.05 3.8 4.05" ${ST} /><path d="M9.2 4.4c5.15 0 7.95 2.35 7.95 7.05" ${ST} /><path d="M5.3 14.85h13.6" ${ST} />`,
  ),
  uranus: svg(
    `<path d="M6.2 5v10.2M17.8 5v10.2M6.2 10.1h11.6" ${ST} /><circle cx="12" cy="10.1" r="2.15" ${ST} /><path d="M12 12.25v6.9" ${ST} />`,
  ),
  neptune: svg(
    `<path d="M12 4.35v15.3M7.6 19.65h8.8" ${ST} /><path d="M5.8 11.4 12 4.35 18.2 11.4" ${ST} />`,
  ),
  pluto: svg(
    `<path d="M8.3 5v14.7" ${ST} /><path d="M8.3 5h4.2a4 4 0 1 1 0 8H8.3" ${ST} /><path d="M8.3 19.7h7.3" ${ST} />`,
  ),
  chiron: svg(
    `<circle cx="12" cy="7.05" r="3.15" ${ST} /><path d="M12 10.2v9.5M12 14.2 17.7 19.95" ${ST} />`,
  ),
  northnode: svg(
    `<path d="M5.15 6.9a6.85 6.85 0 0 1 13.7 0" ${ST} /><circle cx="5.15" cy="6.9" r="1.6" fill="currentColor" /><circle cx="18.85" cy="6.9" r="1.6" fill="currentColor" />`,
  ),
  southnode: svg(
    `<path d="M5.15 17.1a6.85 6.85 0 0 0 13.7 0" ${ST} /><circle cx="5.15" cy="17.1" r="1.6" fill="currentColor" /><circle cx="18.85" cy="17.1" r="1.6" fill="currentColor" />`,
  ),
  lilith: svg(
    `<path fill="currentColor" d="M15.35 4.55a5.6 5.6 0 1 0 0 9.85 4.25 4.25 0 0 1 0-9.85Z"/><path d="M12 14.7v5.6M9.2 17.7h5.6" ${ST} />`,
  ),
  vertex: svg(
    `<path d="M5 5l7 14 7-14" ${ST} /><path d="M16.5 16.5h4.2v4.2" ${ST} />`,
  ),
  antivertex: svg(
    `<path d="M5 5l7 14 7-14" ${ST} /><circle cx="18.4" cy="18.4" r="2.6" ${ST} />`,
  ),
  fortune: svg(
    `<circle cx="12" cy="12" r="7.2" ${ST} /><path d="M12 6.4v11.2M6.4 12h11.2" ${ST} />`,
  ),
  spirit: svg(
    `<circle cx="12" cy="12" r="7.2" ${ST} /><path fill="currentColor" d="M12 6.8l1.15 3.55h3.73l-3.02 2.2 1.16 3.55L12 13.9l-3.02 2.2 1.16-3.55-3.02-2.2h3.73z"/>`,
  ),
  ceres: svg(
    `<circle cx="12" cy="9.1" r="5.15" ${ST} /><path d="M12 14.25v6.1M8.5 17.5h7" ${ST} />`,
  ),
  pallas: svg(
    `<path d="M12 3.6 16.4 11H7.6z" ${ST} /><path d="M12 11v9.2M8.4 16.2h7.2" ${ST} />`,
  ),
  juno: svg(
    `<path fill="currentColor" d="M12 3.4l1.35 4.15h4.35l-3.52 2.56 1.34 4.15L12 11.7 8.48 14.26l1.34-4.15-3.52-2.56h4.35z"/><path d="M12 14.4v5.8M8.8 17.5h6.4" ${ST} />`,
  ),
  vesta: svg(
    `<path d="M12 3.5 16.5 10.8H7.5z" ${ST} /><rect x="6.6" y="12.1" width="10.8" height="8" rx="1.1" ${ST} />`,
  ),
  // Eris and Sedna as Unicode draws them (⯰, ⯲), a little lighter: the Classic set has no
  // glyph of its own for them, and its asteroids are drawn fine.
  eris: svg(
    `<path d="M12 5v14M6.2 6.2a5.8 5.8 0 0 1 0 11.6M17.8 6.2a5.8 5.8 0 0 0 0 11.6" ${ST_LIGHT} />`,
  ),
  sedna: svg(
    `<circle cx="7.6" cy="6.3" r="1.9" ${ST_LIGHT} /><path d="M5.8 8.1h9.4M11.8 4.2v6.4M11.8 10.6a6.2 9.2 0 0 1 6.2 9.2" ${ST_LIGHT} />`,
  ),
  ascendant: svg(`<path d="M5 20L12 4.8 19 20M8.1 13.6h7.8" ${ST} />`),
  midheaven: svg(`<path d="M4.4 20V5.2L12 14.2 19.6 5.2V20" ${ST} />`),
  descendant: svg(`<path d="M5 20L12 4.8 19 20M8.1 13.6h7.8" ${ST} />`),
  ic: svg(`<path d="M4.4 20V5.2L12 14.2 19.6 5.2V20" ${ST} />`),
  aries: svg(
    `<path d="M4.7 19.2C4.7 10.4 7.6 4.2 12 4.2c1.85 0 1.7 6.1 0 10.3M19.3 19.2C19.3 10.4 16.4 4.2 12 4.2c-1.85 0-1.7 6.1 0 10.3" ${ST} />`,
  ),
  taurus: svg(
    `<circle cx="12" cy="14.7" r="5.05" ${ST} /><path d="M5.2 5.25C7.7 9.15 9.7 10.55 12 10.55s4.3-1.4 6.8-5.3" ${ST} />`,
  ),
  gemini: svg(`<path d="M8.05 5.1v13.8M15.95 5.1v13.8M5.3 5.1h13.4M5.3 18.9h13.4" ${ST} />`),
  cancer: svg(
    `<circle cx="7.9" cy="8.7" r="3.25" ${ST} /><path d="M11.15 8.7c4.05 0 6.85-1.7 8.15-4.15" ${ST} /><circle cx="16.1" cy="15.3" r="3.25" ${ST} /><path d="M12.85 15.3c-4.05 0-6.85 1.7-8.15 4.15" ${ST} />`,
  ),
  leo: svg(
    `<path d="M6.55 17.55c0-5.7 2.35-9.55 5.9-9.55 2.65 0 3.65 2.05 3.65 4.05 0 4.35-5.2 4.55-5.2 8.05 0 1.65 1.4 2.4 3 2.05M5.85 8.35C7.7 5.4 10.45 4 13.5 4" ${ST} />`,
  ),
  virgo: svg(
    `<path d="M5.15 4.6v13.2M9.85 4.6v13.2M14.55 4.6v9.2c0 3.4 2.5 5.8 5.55 5.8M14.55 14.2c2.15 3.9 4.8 4.95 7.1 3.45" ${ST} />`,
  ),
  libra: svg(
    `<path d="M4.35 18.45h15.3" ${ST} /><path d="M4.35 14.35h3.9" ${ST} /><path d="M15.75 14.35h3.9" ${ST} /><path d="M8.25 14.35a3.75 3.75 0 1 1 7.5 0" ${ST} />`,
  ),
  scorpio: svg(
    `<path d="M4.7 4.6v13.2M9.4 4.6v13.2M14.1 4.6v9.4c0 2.9 1.95 5.05 4.8 5.05M16.7 16.2 19.35 20.1 22.1 16.35" ${ST} />`,
  ),
  sagittarius: svg(`<path d="M7.05 17.1 18.95 5.2M12.15 5.2h6.8v6.8M6.2 10.5l6.15 6.15" ${ST} />`),
  capricorn: svg(
    `<path d="M5.05 5.4v9.85c0 2.75 1.9 4.5 4.15 4.5 2.9 0 3.55-3.5 5.4-8.3 1.6 6.35 3.75 9.3 6.95 8.25" ${ST} />`,
  ),
  aquarius: svg(
    `<path d="M4.15 9.85 7 7.55 9.8 10.35 12.55 7.55 15.35 10.35 18.1 7.55 20.7 9.55M4.15 16.5 7 14.2 9.8 17 12.55 14.2 15.35 17 18.1 14.2 20.7 16.2" ${ST} />`,
  ),
  pisces: svg(
    `<path d="M6.05 4.55c3.55 3.4 3.55 11.5 0 14.9M17.95 4.55c-3.55 3.4-3.55 11.5 0 14.9M5.35 12h13.3" ${ST} />`,
  ),
  conjunction: svg(
    `<circle cx="9.1" cy="12" r="5.2" ${ST} /><circle cx="14.9" cy="12" r="5.2" ${ST} />`,
  ),
  opposition: svg(
    `<circle cx="6.2" cy="12" r="3.15" ${ST} /><circle cx="17.8" cy="12" r="3.15" ${ST} /><path d="M9.4 12h5.2" ${ST} />`,
  ),
  square: svg(`<rect x="5.1" y="5.1" width="13.8" height="13.8" ${ST} />`),
  trine: svg(`<path d="M12 4.2 20.4 18.8H3.6z" ${ST} />`),
  sextile: svg(`<path d="M12 4.1v15.8M5.15 8.05l13.7 7.9M5.15 15.95l13.7-7.9" ${ST} />`),
  quincunx: svg(`<path d="M5.2 18.5 18.8 5.6M13.2 5.6h5.6v5.6" ${ST} />`),
  semisextile: svg(`<path d="M5.2 18.2 12 5.8 18.8 18.2" ${ST} />`),
  semisquare: svg(`<path d="M5 17h9V8" ${ST} />`),
  quintile: svg(`<path d="M12 4.1l5.05 3.7-1.9 5.9H8.85L6.95 7.8z" ${ST} />`),
  retrograde: svg(
    `<path d="M8.2 6.2h5.1a3.4 3.4 0 1 1 0 6.8H8.2V18M8.2 12.8h5.4" ${ST} /><path d="M14.8 15.4l3.6 3.4M16.2 20.6l2.2-1.8" ${ST} />`,
  ),
  ...Object.fromEntries(
    Object.entries(HOUSE_DIGIT).map(([n, inner]) => [`house-${n}`, svg(inner)]),
  ),
};

export function hasGlyphSvg(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(GLYPH_SVG, id);
}

export function houseNumGlyphId(n: number): string {
  return `house-${n}`;
}
