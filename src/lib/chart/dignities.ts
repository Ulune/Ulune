/**
 * Essential dignities, the traditional way: who rules each degree of the
 * zodiac, and which of those rulers a planet is itself.
 *
 * - Domicile and exaltation by sign, as in constants.ts (TRADITIONAL_RULER,
 *   EXALTATION); detriment and fall are the opposite signs.
 * - Triplicity: the Dorothean rulers of each element, by day, by night, and
 *   participating (fire: Sun, Jupiter, Saturn; earth: Venus, Moon, Mars; air:
 *   Saturn, Mercury, Jupiter; water: Venus, Mars, Moon).
 * - Terms (bounds): the Egyptian terms, five unequal spans per sign.
 * - Faces: the Chaldean decans, ten degrees each, running Saturn, Jupiter,
 *   Mars, Sun, Venus, Mercury, Moon from Mars at 0° Aries. These are not the
 *   decans of the readings (the triplicity decans, decanOf in constants.ts):
 *   the tables name them "faces" so the two are never mixed.
 * - Score, Lilly's points: domicile +5, exaltation +4, triplicity +3 (the
 *   ruler of the chart's sect only; the participating ruler is shown but not
 *   scored), term +2, face +1; detriment −5, fall −4; a planet with none of
 *   these, neither dignity nor debility, is peregrine: −5.
 */
import { EXALTATION, SIGN_IDS, SIGN_META, TRADITIONAL_RULER } from "./constants";
import type { ElementId, PlanetId, SignId } from "./types";

export type TraditionalPlanet = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";
export const TRADITIONAL_PLANETS: readonly TraditionalPlanet[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];

/** Each sign's Egyptian terms: [ruler, the degree where the term ends]. */
export const EGYPTIAN_TERMS: Record<SignId, readonly (readonly [TraditionalPlanet, number])[]> = {
  aries: [["jupiter", 6], ["venus", 12], ["mercury", 20], ["mars", 25], ["saturn", 30]],
  taurus: [["venus", 8], ["mercury", 14], ["jupiter", 22], ["saturn", 27], ["mars", 30]],
  gemini: [["mercury", 6], ["jupiter", 12], ["venus", 17], ["mars", 24], ["saturn", 30]],
  cancer: [["mars", 7], ["venus", 13], ["mercury", 19], ["jupiter", 26], ["saturn", 30]],
  leo: [["jupiter", 6], ["venus", 11], ["saturn", 18], ["mercury", 24], ["mars", 30]],
  virgo: [["mercury", 7], ["venus", 17], ["jupiter", 21], ["mars", 28], ["saturn", 30]],
  libra: [["saturn", 6], ["mercury", 14], ["jupiter", 21], ["venus", 28], ["mars", 30]],
  scorpio: [["mars", 7], ["venus", 11], ["mercury", 19], ["jupiter", 24], ["saturn", 30]],
  sagittarius: [["jupiter", 12], ["venus", 17], ["mercury", 21], ["saturn", 26], ["mars", 30]],
  capricorn: [["mercury", 7], ["jupiter", 14], ["venus", 22], ["saturn", 26], ["mars", 30]],
  aquarius: [["mercury", 7], ["venus", 13], ["jupiter", 20], ["mars", 25], ["saturn", 30]],
  pisces: [["venus", 12], ["jupiter", 16], ["mercury", 19], ["mars", 28], ["saturn", 30]],
};

/** The Chaldean order, slowest first: the faces follow it round the zodiac. */
export const CHALDEAN_ORDER: readonly TraditionalPlanet[] = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];

/** Dorothean triplicity rulers: [by day, by night, participating]. */
export const TRIPLICITY: Record<ElementId, readonly [TraditionalPlanet, TraditionalPlanet, TraditionalPlanet]> = {
  fire: ["sun", "jupiter", "saturn"],
  earth: ["venus", "moon", "mars"],
  air: ["saturn", "mercury", "jupiter"],
  water: ["venus", "mars", "moon"],
};

/** The degree of each planet's exaltation (its sign is EXALTATION). */
export const EXALTATION_DEGREE: Record<TraditionalPlanet, number> = {
  sun: 19,
  moon: 3,
  mercury: 15,
  venus: 27,
  mars: 28,
  jupiter: 15,
  saturn: 21,
};

/** Lilly's points. */
export const DIGNITY_POINTS = {
  domicile: 5,
  exaltation: 4,
  triplicity: 3,
  term: 2,
  face: 1,
  detriment: -5,
  fall: -4,
  peregrine: -5,
} as const;

export type EssentialKind = "domicile" | "exaltation" | "triplicity" | "term" | "face";
export type DebilityKind = "detriment" | "fall";

function norm(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

function signAt(lon: number): SignId {
  return SIGN_IDS[Math.floor(norm(lon) / 30) % 12] ?? "aries";
}

function opposite(sign: SignId): SignId {
  return SIGN_IDS[(SIGN_IDS.indexOf(sign) + 6) % 12] ?? sign;
}

function exaltedIn(sign: SignId): TraditionalPlanet | null {
  for (const p of TRADITIONAL_PLANETS) if (EXALTATION[p] === sign) return p;
  return null;
}

/** The term ruler of a longitude. */
export function termRuler(lon: number): TraditionalPlanet {
  const x = norm(lon);
  const deg = x - Math.floor(x / 30) * 30;
  for (const [ruler, end] of EGYPTIAN_TERMS[signAt(x)]) if (deg < end) return ruler;
  return EGYPTIAN_TERMS[signAt(x)][4][0];
}

/** The face (Chaldean decan) ruler of a longitude: Mars at 0° Aries, then the Chaldean order. */
export function faceRuler(lon: number): TraditionalPlanet {
  const n = Math.floor(norm(lon) / 10) % 36;
  return CHALDEAN_ORDER[(n + 2) % 7] ?? "mars";
}

/** Everyone with a say over a degree of the zodiac. */
export type DegreeRulers = {
  sign: SignId;
  domicile: TraditionalPlanet;
  exaltation: TraditionalPlanet | null;
  /** [by day, by night, participating] */
  triplicity: readonly [TraditionalPlanet, TraditionalPlanet, TraditionalPlanet];
  term: TraditionalPlanet;
  face: TraditionalPlanet;
  /** The planet in its detriment here (the ruler of the opposite sign). */
  detriment: TraditionalPlanet;
  /** The planet in its fall here (exalted in the opposite sign), if any. */
  fall: TraditionalPlanet | null;
};

export function degreeRulers(lon: number): DegreeRulers {
  const sign = signAt(lon);
  return {
    sign,
    domicile: TRADITIONAL_RULER[sign] as TraditionalPlanet,
    exaltation: exaltedIn(sign),
    triplicity: TRIPLICITY[SIGN_META[sign].element],
    term: termRuler(lon),
    face: faceRuler(lon),
    detriment: TRADITIONAL_RULER[opposite(sign)] as TraditionalPlanet,
    fall: exaltedIn(opposite(sign)),
  };
}

/** A planet's own condition where it stands. */
export type EssentialDignity = {
  rulers: DegreeRulers;
  /** The dignities it holds, strongest first. */
  own: EssentialKind[];
  /** It rules the element by night (in a day chart) or by day (in a night chart), or participates: shown, not scored. */
  unscoredTriplicity: boolean;
  debilities: DebilityKind[];
  peregrine: boolean;
  score: number;
};

export function isTraditionalPlanet(id: string): id is TraditionalPlanet {
  return (TRADITIONAL_PLANETS as readonly string[]).includes(id);
}

export function essentialDignity(planet: TraditionalPlanet, lon: number, isDay: boolean): EssentialDignity {
  const r = degreeRulers(lon);
  const own: EssentialKind[] = [];
  if (r.domicile === planet) own.push("domicile");
  if (r.exaltation === planet) own.push("exaltation");
  const sectRuler = r.triplicity[isDay ? 0 : 1];
  if (sectRuler === planet) own.push("triplicity");
  if (r.term === planet) own.push("term");
  if (r.face === planet) own.push("face");
  const unscoredTriplicity = sectRuler !== planet && r.triplicity.includes(planet);
  const debilities: DebilityKind[] = [];
  if (r.detriment === planet) debilities.push("detriment");
  if (r.fall === planet) debilities.push("fall");
  const peregrine = own.length === 0 && debilities.length === 0;
  let score = 0;
  for (const k of own) score += DIGNITY_POINTS[k];
  for (const k of debilities) score += DIGNITY_POINTS[k];
  if (peregrine) score += DIGNITY_POINTS.peregrine;
  return { rulers: r, own, unscoredTriplicity, debilities, peregrine, score };
}

/**
 * The one word for a planet's essential state: its sign dignity (domicile,
 * exalted) or debility (detriment, fall); peregrine only when it holds no
 * dignity at all, triplicity, term and face included; null otherwise (a
 * planet with a lesser dignity only).
 */
export function signDignity(
  planet: PlanetId,
  lon: number,
  isDay: boolean,
): "domicile" | "exalted" | "detriment" | "fall" | "peregrine" | null {
  if (!isTraditionalPlanet(planet)) return null;
  const d = essentialDignity(planet, lon, isDay);
  if (d.own.includes("domicile")) return "domicile";
  if (d.own.includes("exaltation")) return "exalted";
  if (d.debilities.includes("detriment")) return "detriment";
  if (d.debilities.includes("fall")) return "fall";
  return d.peregrine ? "peregrine" : null;
}
