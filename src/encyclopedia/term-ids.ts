/*
 * The encyclopedia's entry for a thing the studio already names by its id
 * (encyclopedia plan, part 7: "structured places know their term already"):
 * a body, a sign, a house, an aspect, a pattern, an element or a modality,
 * a dignity, a line of the birth grid. No text is matched; a thing with no entry gives null, and the
 * word stays plain. scripts/encyclopedia.test.mjs checks that every id given
 * here has its entry.
 */

const BODY: Record<string, string> = {
  sun: "sun",
  moon: "moon",
  mercury: "mercury",
  venus: "venus",
  mars: "mars",
  jupiter: "jupiter",
  saturn: "saturn",
  uranus: "uranus",
  neptune: "neptune",
  pluto: "pluto",
  chiron: "chiron",
  northnode: "north-node",
  southnode: "south-node",
  lilith: "lilith",
  vertex: "vertex",
  fortune: "part-of-fortune",
  spirit: "lot",
  ceres: "ceres",
  pallas: "pallas",
  juno: "juno",
  vesta: "vesta",
  eris: "eris",
  sedna: "sedna",
  ascendant: "ascendant",
  midheaven: "midheaven",
  descendant: "descendant",
  ic: "imum-coeli",
};

const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

const ASPECT: Record<string, string> = {
  conjunction: "conjunction",
  opposition: "opposition",
  trine: "trine",
  square: "square",
  sextile: "sextile",
  quincunx: "quincunx",
  semisextile: "semi-sextile",
  semisquare: "semi-square",
  quintile: "quintile",
  parallel: "parallel",
};

const PATTERN: Record<string, string> = {
  tsquare: "t-square",
  grandTrine: "grand-trine",
  grandCross: "grand-cross",
  yod: "yod",
  kite: "kite",
  mysticRectangle: "mystic-rectangle",
  stellium: "stellium",
};

const DIGNITY: Record<string, string> = {
  domicile: "domicile",
  exaltation: "exaltation",
  detriment: "detriment",
  fall: "fall",
  peregrine: "peregrine",
  triplicity: "triplicity",
  term: "term",
  face: "face",
};

/** The birth grid's eight lines in Phillips's layout, by their digits in order; a Lo Shu line with the same three digits shares its entry. */
const GRID_LINES = ["3-6-9", "2-5-8", "1-4-7", "1-2-3", "4-5-6", "7-8-9", "1-5-9", "3-5-7"];
const gridKey = (id: string) => id.split("-").map(Number).sort((a, b) => a - b).join("-");

export type TermKind = "body" | "sign" | "house" | "aspect" | "pattern" | "element" | "modality" | "dignity" | "gridline";

/** The entry's id for a thing of the studio, or null when it has none. */
export function termId(kind: TermKind, id: string | number | null | undefined): string | null {
  if (id == null) return null;
  const key = String(id);
  switch (kind) {
    case "body":
      return BODY[key] ?? null;
    case "sign":
      return SIGNS.includes(key) ? key : null;
    case "house": {
      const n = Number(key);
      return Number.isInteger(n) && n >= 1 && n <= 12 ? `house-${n}` : null;
    }
    case "aspect":
      return ASPECT[key] ?? null;
    case "pattern":
      return PATTERN[key] ?? null;
    case "element":
      return ["fire", "earth", "air", "water"].includes(key) ? `element-${key}` : null;
    case "modality":
      return ["cardinal", "fixed", "mutable"].includes(key) ? `modality-${key}` : null;
    case "dignity":
      return DIGNITY[key] ?? null;
    case "gridline": {
      const line = GRID_LINES.find((l) => gridKey(l) === gridKey(key));
      return line ? `grid-${line}` : null;
    }
  }
}

/** Every id this file can give (the test's list). */
export function allTermIds(): string[] {
  return [
    ...Object.values(BODY),
    ...SIGNS,
    ...Array.from({ length: 12 }, (_, i) => `house-${i + 1}`),
    ...Object.values(ASPECT),
    ...Object.values(PATTERN),
    ...["fire", "earth", "air", "water"].map((e) => `element-${e}`),
    ...["cardinal", "fixed", "mutable"].map((m) => `modality-${m}`),
    ...Object.values(DIGNITY),
    ...GRID_LINES.map((l) => `grid-${l}`),
  ];
}
