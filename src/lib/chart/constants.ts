import type {
  AngleId,
  AspectId,
  BodyId,
  DignityKind,
  ElementId,
  HouseSystemId,
  ModalityId,
  PlanetId,
  SignId,
} from "./types";
import type { MessageKey } from "@/lib/i18n/messages";
import { SIGN_IDS } from "./types";

export { SIGN_IDS };

export const SIGN_META: Record<
  SignId,
  {
    name: string;
    glyph: string;
    element: ElementId;
    modality: ModalityId;
    ruler: PlanetId;
  }
> = {
  aries: {
    name: "Aries",
    glyph: "♈",
    element: "fire",
    modality: "cardinal",
    ruler: "mars",
  },
  taurus: {
    name: "Taurus",
    glyph: "♉",
    element: "earth",
    modality: "fixed",
    ruler: "venus",
  },
  gemini: {
    name: "Gemini",
    glyph: "♊",
    element: "air",
    modality: "mutable",
    ruler: "mercury",
  },
  cancer: {
    name: "Cancer",
    glyph: "♋",
    element: "water",
    modality: "cardinal",
    ruler: "moon",
  },
  leo: {
    name: "Leo",
    glyph: "♌",
    element: "fire",
    modality: "fixed",
    ruler: "sun",
  },
  virgo: {
    name: "Virgo",
    glyph: "♍",
    element: "earth",
    modality: "mutable",
    ruler: "mercury",
  },
  libra: {
    name: "Libra",
    glyph: "♎",
    element: "air",
    modality: "cardinal",
    ruler: "venus",
  },
  scorpio: {
    name: "Scorpio",
    glyph: "♏",
    element: "water",
    modality: "fixed",
    ruler: "pluto",
  },
  sagittarius: {
    name: "Sagittarius",
    glyph: "♐",
    element: "fire",
    modality: "mutable",
    ruler: "jupiter",
  },
  capricorn: {
    name: "Capricorn",
    glyph: "♑",
    element: "earth",
    modality: "cardinal",
    ruler: "saturn",
  },
  aquarius: {
    name: "Aquarius",
    glyph: "♒",
    element: "air",
    modality: "fixed",
    ruler: "uranus",
  },
  pisces: {
    name: "Pisces",
    glyph: "♓",
    element: "water",
    modality: "mutable",
    ruler: "neptune",
  },
};

export const PLANET_META: Record<
  PlanetId,
  {
    name: string;
    kind: "planet" | "point" | "asteroid";
    asks: string;
    dignity: string;
  }
> = {
  sun: {
    name: "Sun",
    kind: "planet",
    asks: "who you are when the lights are on",
    dignity: "the center of the chart's gravity",
  },
  moon: {
    name: "Moon",
    kind: "planet",
    asks: "what you require to feel at home",
    dignity: "the night-side of the self",
  },
  mercury: {
    name: "Mercury",
    kind: "planet",
    asks: "how you think, name, and connect",
    dignity: "the messenger between inner and outer",
  },
  venus: {
    name: "Venus",
    kind: "planet",
    asks: "what you love and how you make peace",
    dignity: "the principle of harmony",
  },
  mars: {
    name: "Mars",
    kind: "planet",
    asks: "how you act when something matters",
    dignity: "the principle of heat",
  },
  jupiter: {
    name: "Jupiter",
    kind: "planet",
    asks: "where you say yes too large",
    dignity: "the greater fortune",
  },
  saturn: {
    name: "Saturn",
    kind: "planet",
    asks: "where you grow up",
    dignity: "the greater malefic, teacher of form",
  },
  uranus: {
    name: "Uranus",
    kind: "planet",
    asks: "where life insists on freedom",
    dignity: "the awakener",
  },
  neptune: {
    name: "Neptune",
    kind: "planet",
    asks: "where you dissolve",
    dignity: "the mystic",
  },
  pluto: {
    name: "Pluto",
    kind: "planet",
    asks: "where you are remade",
    dignity: "the underworld",
  },
  chiron: {
    name: "Chiron",
    kind: "point",
    asks: "where hurt turns into craft",
    dignity: "the wounded healer",
  },
  northnode: {
    name: "North Node",
    kind: "point",
    asks: "the growth edge",
    dignity: "the dragon's head",
  },
  southnode: {
    name: "South Node",
    kind: "point",
    asks: "the comfort that can become a trap",
    dignity: "the dragon's tail",
  },
  lilith: {
    name: "True Lilith",
    kind: "point",
    asks: "where you will not be domesticated",
    dignity: "the true black moon, osculating apogee",
  },
  vertex: {
    name: "Vertex",
    kind: "point",
    asks: "who walks in from the other side of the sky",
    dignity: "the electric ascendant",
  },
  antivertex: {
    name: "Anti-Vertex",
    kind: "point",
    asks: "the self that answers unplanned encounters",
    dignity: "the electric descendant",
  },
  fortune: {
    name: "Lot of Fortune",
    kind: "point",
    asks: "where luck and livelihood tend to land",
    dignity: "the lot of fortune",
  },
  spirit: {
    name: "Lot of Spirit",
    kind: "point",
    asks: "where meaning wants to be enacted",
    dignity: "the lot of spirit",
  },
  ceres: {
    name: "Ceres",
    kind: "asteroid",
    asks: "what must be tended, and what must be let go",
    dignity: "the grain mother",
  },
  pallas: {
    name: "Pallas",
    kind: "asteroid",
    asks: "where wit and tactics shape what courage alone cannot",
    dignity: "the spear of wisdom",
  },
  juno: {
    name: "Juno",
    kind: "asteroid",
    asks: "what you require of a committed other",
    dignity: "the sovereign consort",
  },
  vesta: {
    name: "Vesta",
    kind: "asteroid",
    asks: "where you withdraw to tend the fire",
    dignity: "the keeper of the flame",
  },
  eris: {
    name: "Eris",
    kind: "asteroid",
    asks: "where you refuse a false peace",
    dignity: "the strife-bearer",
  },
  sedna: {
    name: "Sedna",
    kind: "asteroid",
    asks: "what was thrown overboard, and how it still governs the cold",
    dignity: "the arctic soul",
  },
};

export const ANGLE_META: Record<AngleId, { name: string }> = {
  ascendant: {
    name: "Ascendant",
  },
  midheaven: {
    name: "Midheaven",
  },
  descendant: {
    name: "Descendant",
  },
  ic: {
    name: "Imum Coeli",
  },
};

export const HOUSE_META: Record<
  number,
  { name: string }
> = {
  1: {
    name: "First house",
  },
  2: {
    name: "Second house",
  },
  3: {
    name: "Third house",
  },
  4: {
    name: "Fourth house",
  },
  5: {
    name: "Fifth house",
  },
  6: {
    name: "Sixth house",
  },
  7: {
    name: "Seventh house",
  },
  8: {
    name: "Eighth house",
  },
  9: {
    name: "Ninth house",
  },
  10: {
    name: "Tenth house",
  },
  11: {
    name: "Eleventh house",
  },
  12: {
    name: "Twelfth house",
  },
};

export const ASPECT_META: Record<
  AspectId,
  {
    name: string;
    angle: number;
    kind: "harmonious" | "tense" | "neutral";
    verb: string;
    gist: string;
  }
> = {
  conjunction: {
    name: "Conjunction",
    angle: 0,
    kind: "neutral",
    verb: "fuses with",
    gist: "two principles occupying the same room, amplifying and complicating each other",
  },
  opposition: {
    name: "Opposition",
    angle: 180,
    kind: "tense",
    verb: "faces",
    gist: "a polarity that asks for both sides, often first lived as projection",
  },
  trine: {
    name: "Trine",
    angle: 120,
    kind: "harmonious",
    verb: "flows toward",
    gist: "an easy circuit of talent that can go unused because it does not demand",
  },
  square: {
    name: "Square",
    angle: 90,
    kind: "tense",
    verb: "presses against",
    gist: "friction that produces motion — the chart's engine of becoming",
  },
  sextile: {
    name: "Sextile",
    angle: 60,
    kind: "harmonious",
    verb: "opens a door to",
    gist: "an opportunity that works when you actually take it",
  },
  quincunx: {
    name: "Quincunx",
    angle: 150,
    kind: "neutral",
    verb: "adjusts to",
    gist: "an awkward angle that never quite lines up, asking for constant recalibration",
  },
  semisextile: {
    name: "Semi-sextile",
    angle: 30,
    kind: "neutral",
    verb: "neighbours",
    gist: "a quiet adjacency — two functions that can help each other if they learn a shared language",
  },
  semisquare: {
    name: "Semi-square",
    angle: 45,
    kind: "tense",
    verb: "niggles at",
    gist: "a low-grade irritation that keeps a theme from going to sleep",
  },
  quintile: {
    name: "Quintile",
    angle: 72,
    kind: "harmonious",
    verb: "crafts with",
    gist: "a signature of style and ingenuity, talent with a fingerprint",
  },
};

export const ELEMENT_COLOR: Record<ElementId, string> = {
  fire: "var(--el-fire)",
  earth: "var(--el-earth)",
  air: "var(--el-air)",
  water: "var(--el-water)",
};

/** Original (essential) element of a planet — not the natal sign it occupies. Dual rulers are omitted. */
export const PLANET_ELEMENT: Partial<Record<PlanetId, ElementId>> = {
  sun: "fire",
  moon: "water",
  mars: "fire",
  jupiter: "fire",
  saturn: "earth",
  uranus: "air",
  neptune: "water",
  pluto: "water",
};

export const ASPECT_COLOR: Record<AspectId, string> = {
  conjunction: "var(--aspect-conj)",
  opposition: "var(--aspect-hard)",
  square: "var(--aspect-hard)",
  semisquare: "var(--aspect-hard)",
  trine: "var(--aspect-soft)",
  sextile: "var(--aspect-soft)",
  quintile: "var(--aspect-soft)",
  quincunx: "var(--aspect-minor)",
  semisextile: "var(--aspect-minor)",
};

/** Transit / progressed / partner chords — dedicated `--aspect-outer-*` families (Look-editable). */
export const OUTER_ASPECT_COLOR: Record<AspectId, string> = {
  conjunction: "var(--aspect-outer-conj)",
  opposition: "var(--aspect-outer-hard)",
  square: "var(--aspect-outer-hard)",
  semisquare: "var(--aspect-outer-hard)",
  trine: "var(--aspect-outer-soft)",
  sextile: "var(--aspect-outer-soft)",
  quintile: "var(--aspect-outer-soft)",
  quincunx: "var(--aspect-outer-minor)",
  semisextile: "var(--aspect-outer-minor)",
};

export const HOUSE_LABELS = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth",
  "Tenth",
  "Eleventh",
  "Twelfth",
];

export const LUMINARY_BODIES: BodyId[] = ["sun", "moon"];

export const CLASSICAL_BODIES: BodyId[] = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

export const CLASSIC_BODIES: BodyId[] = [...LUMINARY_BODIES, ...CLASSICAL_BODIES];

export const POINT_BODIES: BodyId[] = [
  "chiron",
  "northnode",
  "southnode",
  "lilith",
  "vertex",
  "antivertex",
  "fortune",
  "spirit",
];

export const ASTEROID_BODIES: BodyId[] = ["ceres", "pallas", "juno", "vesta", "eris", "sedna"];

export const ANGLE_BODIES: BodyId[] = ["ascendant", "midheaven", "descendant", "ic"];

export const BODY_GROUPS: { id: "planets" | "points" | "asteroids" | "angles"; bodies: BodyId[] }[] = [
  { id: "planets", bodies: CLASSIC_BODIES },
  { id: "points", bodies: POINT_BODIES },
  { id: "asteroids", bodies: ASTEROID_BODIES },
  { id: "angles", bodies: ANGLE_BODIES },
];

export const DEFAULT_VISIBLE: BodyId[] = [...CLASSIC_BODIES, ...ANGLE_BODIES];

export const MAJOR_ASPECT_IDS: AspectId[] = [
  "conjunction",
  "opposition",
  "trine",
  "square",
  "sextile",
];

/** Orb at or under which an aspect is treated as "tight" on the wheel. */
export const TIGHT_ORB = 2;

/** Slider range for the wheel's max-orb filter. */
export const ORB_MIN = 0.5;
export const ORB_MAX = 8;
export const ORB_STEP = 0.5;

export const ASPECT_ORBS: Record<AspectId, number> = {
  conjunction: 8,
  opposition: 8,
  trine: 8,
  square: 8,
  sextile: 6,
  quincunx: 3,
  semisextile: 2.5,
  semisquare: 2.5,
  quintile: 2,
};

/**
 * Quill’s Ulune defaults for a planet (or point) to an angle.
 * Trine and sextile are not the same orb — do not reuse planet–planet 8°/6°.
 */
export const ANGLE_ASPECT_ORBS: Partial<Record<AspectId, number>> = {
  trine: 6,
  sextile: 4,
};

export function involvesAngle(a?: BodyId, b?: BodyId): boolean {
  return (
    (a != null && (ANGLE_BODIES as readonly string[]).includes(a)) ||
    (b != null && (ANGLE_BODIES as readonly string[]).includes(b))
  );
}

/** Major orb for this pair. Planet-to-angle trine is 6°, sextile 4°. */
export function aspectOrb(type: AspectId, a?: BodyId, b?: BodyId): number {
  if (involvesAngle(a, b)) {
    const angleOrb = ANGLE_ASPECT_ORBS[type];
    if (angleOrb != null) return angleOrb;
  }
  return ASPECT_ORBS[type];
}

export const SIGN_RULER: Record<SignId, PlanetId> = Object.fromEntries(
  SIGN_IDS.map((id) => [id, SIGN_META[id].ruler]),
) as Record<SignId, PlanetId>;

/** Traditional (Hellenistic) domicile rulers — used for sect/dignity/reception overlays. */
export const TRADITIONAL_RULER: Record<SignId, PlanetId> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter",
};

export const MEAN_SPEED: Partial<Record<BodyId, number>> = {
  sun: 0.9856,
  moon: 13.1764,
  mercury: 1.3833,
  venus: 1.2,
  mars: 0.524,
  jupiter: 0.0831,
  saturn: 0.0335,
  uranus: 0.0117,
  neptune: 0.006,
  pluto: 0.004,
  chiron: 0.02,
  northnode: -0.053,
  southnode: -0.053,
  lilith: 0.111,
  ceres: 0.21,
  pallas: 0.23,
  juno: 0.25,
  vesta: 0.27,
  eris: 0.001,
  sedna: 0.0005,
};

export const HOUSE_SYSTEM_SWE: Record<HouseSystemId, "P" | "W" | "E" | "K" | "O" | "C" | "R" | "B" | "M" | "T"> = {
  placidus: "P",
  whole: "W",
  equal: "E",
  koch: "K",
  porphyry: "O",
  campanus: "C",
  regiomontanus: "R",
  alcabitius: "B",
  morinus: "M",
  topocentric: "T",
};

export const HOUSE_SYSTEM_LABEL: Record<HouseSystemId, MessageKey> = {
  placidus: "housePlacidus",
  whole: "houseWhole",
  equal: "houseEqual",
  koch: "houseKoch",
  porphyry: "housePorphyry",
  campanus: "houseCampanus",
  regiomontanus: "houseRegiomontanus",
  alcabitius: "houseAlcabitius",
  morinus: "houseMorinus",
  topocentric: "houseTopocentric",
};

/**
 * The fixed stars charted. Positions come from Swiss Ephemeris's own star
 * catalogue (sefstars.txt: ICRS positions with proper motion), computed as
 * apparent positions of the chart's date — precession, nutation, aberration
 * and proper motion included. `swiss` is the catalogue's Bayer name, which
 * Swiss looks stars up by exactly (a leading comma).
 */
export const STAR_META: Record<import("./types").StarId, { name: string; swiss: string }> = {
  algol: { name: "Algol", swiss: ",bePer" },
  aldebaran: { name: "Aldebaran", swiss: ",alTau" },
  regulus: { name: "Regulus", swiss: ",alLeo" },
  spica: { name: "Spica", swiss: ",alVir" },
  antares: { name: "Antares", swiss: ",alSco" },
  fomalhaut: { name: "Fomalhaut", swiss: ",alPsA" },
};

/**
 * The calculation rules a chart was cast with. Bump when a change moves any
 * published number; saved charts cast under an older version are recast when
 * opened (visibility.needsSwissUpgrade).
 * 2 — historical time zones (tzdb with backzone), birthplace LMT, Julian
 *     dates before 1582-10-15, Swiss fixed stars, ephemeris files 600 BC–2400 AD.
 */
export const CALC_VERSION = 2;

export const MIDPOINT_DEFS: {
  id: import("./types").MidpointId;
  a: BodyId;
  b: BodyId;
}[] = [
  { id: "sun-moon", a: "sun", b: "moon" },
  { id: "sun-ascendant", a: "sun", b: "ascendant" },
  { id: "moon-ascendant", a: "moon", b: "ascendant" },
  { id: "venus-mars", a: "venus", b: "mars" },
  { id: "mars-saturn", a: "mars", b: "saturn" },
];

export const STATIONARY_SPEED = 0.05;
export const FAST_RATIO = 1.35;
export const ANGULAR_ORB = 8;
export const CAZIMI_ORB = 17 / 60;
export const COMBUST_ORB = 8;
export const ARIES_POINT_ORB = 1;
export const STAR_CONJUNCT_ORB = 1;
export const OOB_DECLINATION = 23.44;

/** Personal planets and angles weigh more in element / hemisphere tallies. */
export const BALANCE_WEIGHT: Partial<Record<BodyId, number>> = {
  sun: 3,
  moon: 3,
  ascendant: 3,
  mercury: 2,
  venus: 2,
  mars: 2,
  midheaven: 2,
  jupiter: 1,
  saturn: 1,
  descendant: 1,
  ic: 1,
  uranus: 0.5,
  neptune: 0.5,
  pluto: 0.5,
};

export const DIGNITY_SCORE: Record<DignityKind, number> = {
  domicile: 5,
  exalted: 4,
  peregrine: 2,
  detriment: 1,
  fall: 0,
};

export const CLASSICAL_PLANETS: BodyId[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
];

export function signFromEcliptic(ecliptic: number): SignId {
  const n = Math.floor((((ecliptic % 360) + 360) % 360) / 30);
  return SIGN_IDS[n] ?? "aries";
}

export function bodyName(id: BodyId): string {
  if (id in PLANET_META) return PLANET_META[id as PlanetId].name;
  return ANGLE_META[id as AngleId].name;
}

export const ASPECT_KEY_ALIASES: Record<string, AspectId> = {
  conjunction: "conjunction",
  opposition: "opposition",
  trine: "trine",
  square: "square",
  sextile: "sextile",
  quincunx: "quincunx",
  "semi-sextile": "semisextile",
  semisextile: "semisextile",
  "semi-square": "semisquare",
  semisquare: "semisquare",
  quintile: "quintile",
};

export const ELEMENT_TRIPLICITY: Record<ElementId, SignId[]> = {
  fire: ["aries", "leo", "sagittarius"],
  earth: ["taurus", "virgo", "capricorn"],
  air: ["gemini", "libra", "aquarius"],
  water: ["cancer", "scorpio", "pisces"],
};

export const EXALTATION: Partial<Record<PlanetId, SignId>> = {
  sun: "aries",
  moon: "taurus",
  mercury: "virgo",
  venus: "pisces",
  mars: "capricorn",
  jupiter: "cancer",
  saturn: "libra",
};

export function oppositeSign(sign: SignId): SignId {
  const i = SIGN_IDS.indexOf(sign);
  return SIGN_IDS[(i + 6) % 12] ?? sign;
}

export type Decan = {
  face: 1 | 2 | 3;
  sign: SignId;
  faceSign: SignId;
  ruler: PlanetId;
};

export function decanOf(ecliptic: number): Decan {
  const sign = signFromEcliptic(ecliptic);
  const deg = ((ecliptic % 30) + 30) % 30;
  const face = (deg < 10 ? 1 : deg < 20 ? 2 : 3) as 1 | 2 | 3;
  const triple = ELEMENT_TRIPLICITY[SIGN_META[sign].element];
  const start = triple.indexOf(sign);
  const faceSign = triple[(start + face - 1) % 3] ?? sign;
  return { face, sign, faceSign, ruler: SIGN_RULER[faceSign] };
}

export function faceLabel(face: 1 | 2 | 3): string {
  return face === 1 ? "1st" : face === 2 ? "2nd" : "3rd";
}

/** Traditional essential dignity. Classical seven only; no-dignity planets are peregrine. */
export function dignityOf(id: PlanetId, sign: SignId): DignityKind | null {
  if (!CLASSICAL_PLANETS.includes(id)) return null;
  if (TRADITIONAL_RULER[sign] === id) return "domicile";
  if (EXALTATION[id] === sign) return "exalted";
  const homes = SIGN_IDS.filter((s) => TRADITIONAL_RULER[s] === id);
  if (homes.some((h) => oppositeSign(h) === sign)) return "detriment";
  const exalt = EXALTATION[id];
  if (exalt && oppositeSign(exalt) === sign) return "fall";
  return "peregrine";
}
