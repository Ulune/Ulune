import { hasGlyphSvg } from "./glyph-svg";
import { ASPECT_IDS, SIGN_IDS, type AspectId, type SignId } from "./types";
import { ANGLE_IDS, PLANET_IDS } from "./types";

/**
 * Text-presentation selector. Stops iOS/Android from swapping ♈ ☉ for
 * color emoji, which a Latin typeface then cannot draw.
 */
export const TEXT_VS = "\uFE0E";

export const GLYPH_FAMILY_IDS = [
  "astronomicon",
  "noto",
  "starfont-sans",
  "starfont-serif",
] as const;

export type GlyphFamily = (typeof GLYPH_FAMILY_IDS)[number];

export const DEFAULT_GLYPH_FAMILY: GlyphFamily = "astronomicon";

export const GLYPH_FONT_STACK: Record<GlyphFamily, string> = {
  noto: '"Noto Sans Symbols", "Noto Sans Symbols 2", sans-serif',
  astronomicon: '"Astronomicon", "Noto Sans Symbols", "Noto Sans Symbols 2", sans-serif',
  "starfont-sans": '"StarFont Sans", "Noto Sans Symbols", "Noto Sans Symbols 2", sans-serif',
  "starfont-serif": '"StarFont Serif", "Noto Sans Symbols", "Noto Sans Symbols 2", sans-serif',
};

export function isGlyphFamily(value: unknown): value is GlyphFamily {
  return typeof value === "string" && (GLYPH_FAMILY_IDS as readonly string[]).includes(value);
}

/**
 * Astronomicon (SIL OFL) letter map from Astrolog `xgeneral.cpp`.
 */
export const ASTRONOMICON_GLYPH: Record<string, string> = {
  sun: "Q",
  moon: "R",
  mercury: "S",
  venus: "T",
  mars: "U",
  jupiter: "V",
  saturn: "W",
  uranus: "X",
  neptune: "Y",
  pluto: "Z",
  chiron: "q",
  ceres: "l",
  pallas: "m",
  juno: "n",
  vesta: "o",
  northnode: "g",
  southnode: "i",
  lilith: "z",
  fortune: "?",
  vertex: "k",
  ascendant: "c",
  midheaven: "d",
  ic: "e",
  descendant: "f",
  aries: "A",
  taurus: "B",
  gemini: "C",
  cancer: "D",
  leo: "E",
  virgo: "F",
  libra: "G",
  scorpio: "H",
  sagittarius: "I",
  capricorn: "J",
  aquarius: "K",
  pisces: "L",
  conjunction: "!",
  opposition: '"',
  square: "#",
  trine: "$",
  sextile: "%",
  quincunx: "&",
  semisextile: "'",
  semisquare: "(",
  retrograde: "M",
};

/**
 * StarFont Sans/Serif letter map (CTAN starfont + Astrolog).
 */
export const STARFONT_GLYPH: Record<string, string> = {
  sun: "s",
  moon: "d",
  mercury: "f",
  venus: "g",
  mars: "h",
  jupiter: "j",
  saturn: "S",
  uranus: "F",
  neptune: "G",
  pluto: "J",
  chiron: "D",
  ceres: ".",
  pallas: ",",
  juno: ";",
  vesta: "_",
  northnode: "k",
  southnode: "?",
  lilith: "\u00d8",
  fortune: "K",
  vertex: "!",
  ascendant: "1",
  descendant: "2",
  midheaven: "3",
  ic: "4",
  retrograde: "5",
  aries: "x",
  taurus: "c",
  gemini: "v",
  cancer: "b",
  leo: "n",
  virgo: "m",
  libra: "X",
  scorpio: "C",
  sagittarius: "V",
  capricorn: "B",
  aquarius: "N",
  pisces: "M",
  conjunction: "q",
  opposition: "p",
  square: "t",
  trine: "u",
  sextile: "r",
  quincunx: "o",
  semisextile: "w",
  semisquare: "e",
};

export function mappedGlyph(id: string, family: GlyphFamily): string | undefined {
  if (family === "astronomicon") return ASTRONOMICON_GLYPH[id];
  if (family === "starfont-sans" || family === "starfont-serif") return STARFONT_GLYPH[id];
  return undefined;
}

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

export const NOTO_SYMBOLS_STACK = '"Noto Sans Symbols", "Noto Sans Symbols 2"';

/**
 * Look sans first so Classic / Editorial / Clean still shape marks the face
 * actually contains. Noto sits before generics as a CSS safety net; the Glyph
 * component paints SVG when measurement says the Look face is missing the
 * mark, so Noto should not steal pairing appearance.
 */
export function glyphFontStack(lookSansStack: string): string {
  const parts = lookSansStack
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const named: string[] = [];
  const generics: string[] = [];
  for (const part of parts) {
    const key = part.replace(/['"]/g, "").toLowerCase();
    if (GENERIC_FAMILIES.has(key)) generics.push(part);
    else named.push(part);
  }
  const stack = [
    ...(named[0] ? [named[0]] : []),
    '"Noto Sans Symbols"',
    '"Noto Sans Symbols 2"',
    ...named.slice(1),
    ...generics,
  ];
  if (!generics.length) stack.push("sans-serif");
  return stack.join(", ");
}

export function isLookFaceInStack(stack: string): boolean {
  return /outfit|source sans|ibm plex/i.test(stack);
}

/**
 * Semantic chart id → standard Unicode.
 *
 * Split across two self-hosted Noto faces (see public/fonts) when a Look
 * pairing does not cover the slot. Glyph still prefers the Look face when
 * measurement says it inks.
 */
export const UNICODE_GLYPH: Record<string, string> = {
  sun: "\u2609",
  moon: "\u263D",
  mercury: "\u263F",
  venus: "\u2640",
  mars: "\u2642",
  jupiter: "\u2643",
  saturn: "\u2644",
  uranus: "\u2645",
  neptune: "\u2646",
  pluto: "\u2647",
  chiron: "\u26B7",
  northnode: "\u260A",
  southnode: "\u260B",
  lilith: "\u26B8",
  ceres: "\u26B3",
  pallas: "\u26B4",
  juno: "\u26B5",
  vesta: "\u26B6",
  eris: "\u2BF0",
  sedna: "\u2BF2",
  aries: "\u2648",
  taurus: "\u2649",
  gemini: "\u264A",
  cancer: "\u264B",
  leo: "\u264C",
  virgo: "\u264D",
  libra: "\u264E",
  scorpio: "\u264F",
  sagittarius: "\u2650",
  capricorn: "\u2651",
  aquarius: "\u2652",
  pisces: "\u2653",
  conjunction: "\u260C",
  opposition: "\u260D",
  square: "\u25A1",
  trine: "\u25B3",
  sextile: "\u26B9",
  quincunx: "\u26BB",
  semisextile: "\u26BA",
  quintile: "\u2B20",
  "house-1": "1",
  "house-2": "2",
  "house-3": "3",
  "house-4": "4",
  "house-5": "5",
  "house-6": "6",
  "house-7": "7",
  "house-8": "8",
  "house-9": "9",
  "house-10": "10",
  "house-11": "11",
  "house-12": "12",
};

/** Ids with no standard codepoint — always the SVG path. */
export const SVG_ONLY_IDS = [
  "vertex",
  "antivertex",
  "fortune",
  "spirit",
  "ascendant",
  "midheaven",
  "descendant",
  "ic",
  "semisquare",
  "retrograde",
] as const;

export const SVG_FALLBACK_IDS = SVG_ONLY_IDS;

export type SvgFallbackId = (typeof SVG_ONLY_IDS)[number];

export type GlyphPaint =
  | { kind: "font"; text: string }
  | { kind: "svg" }
  | { kind: "none" };

/**
 * Candidate paint: Unicode (Look may have it) else SVG path. The Glyph
 * component measures the live Look face and demotes font → SVG when the
 * face is missing the mark.
 */
export function resolveGlyph(id: string, family: GlyphFamily = DEFAULT_GLYPH_FAMILY): GlyphPaint {
  const mapped = mappedGlyph(id, family);
  if (mapped) return { kind: "font", text: mapped };
  const uni = UNICODE_GLYPH[id];
  if (uni) {
    const text = /^\d+$/.test(uni) ? uni : `${uni}${TEXT_VS}`;
    return { kind: "font", text };
  }
  if (hasGlyphSvg(id)) return { kind: "svg" };
  return { kind: "none" };
}

export function unicodeGlyphText(id: string): string | null {
  const ch = UNICODE_GLYPH[id];
  if (!ch) return null;
  if (/^\d+$/.test(ch)) return ch;
  return `${ch}${TEXT_VS}`;
}

export function isSignId(id: string): id is SignId {
  return (SIGN_IDS as readonly string[]).includes(id);
}

export function isAspectId(id: string): id is AspectId {
  return (ASPECT_IDS as readonly string[]).includes(id);
}

export function catalogIds(): string[] {
  return [...PLANET_IDS, ...ANGLE_IDS, ...SIGN_IDS, ...ASPECT_IDS];
}
