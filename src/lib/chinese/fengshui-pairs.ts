/*
 * The pair of stars in a palace (languages plan, part 27: "the star pairs
 * of mountain and water"): the mountain star and the water star read
 * together. The classics read 45 pairings (a pair is the same pairing
 * whichever star is the mountain's), and the order adds how the two phases
 * meet: which feeds the other, which checks the other, or both the same.
 * So 81 readings in all, from 45 texts and the five meetings.
 *
 * Pure; tested in scripts/chinese-fengshui-readings.test.mjs.
 */
import { PHASES, type PhaseId } from "./names";
import { starOf, type StarNumber } from "./fengshui-stars";

/** A pairing, the smaller number first: the 45 from "1-1" to "9-9". */
export type PairKey =
  "1-1"
  | "1-2"
  | "1-3"
  | "1-4"
  | "1-5"
  | "1-6"
  | "1-7"
  | "1-8"
  | "1-9"
  | "2-2"
  | "2-3"
  | "2-4"
  | "2-5"
  | "2-6"
  | "2-7"
  | "2-8"
  | "2-9"
  | "3-3"
  | "3-4"
  | "3-5"
  | "3-6"
  | "3-7"
  | "3-8"
  | "3-9"
  | "4-4"
  | "4-5"
  | "4-6"
  | "4-7"
  | "4-8"
  | "4-9"
  | "5-5"
  | "5-6"
  | "5-7"
  | "5-8"
  | "5-9"
  | "6-6"
  | "6-7"
  | "6-8"
  | "6-9"
  | "7-7"
  | "7-8"
  | "7-9"
  | "8-8"
  | "8-9"
  | "9-9";

/** The pairing of two stars, smaller first: 4 and 1 are "1-4". */
export const pairKey = (a: StarNumber, b: StarNumber): PairKey => (a <= b ? `${a}-${b}` : `${b}-${a}`) as PairKey;

const NUMBERS: readonly StarNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The 45 pairings, 1-1 to 9-9. */
export const PAIR_KEYS: readonly PairKey[] = NUMBERS.flatMap((a) => NUMBERS.filter((b) => b >= a).map((b) => `${a}-${b}` as PairKey));

/**
 * How the mountain star's phase meets the water star's, along the cycle of
 * production (wood feeds fire, fire earth, earth metal, metal water, water
 * wood) and of control (wood checks earth, earth water, water fire, fire
 * metal, metal wood).
 */
export type Relation = "same" | "m-feeds-w" | "w-feeds-m" | "m-checks-w" | "w-checks-m";

const index = (p: PhaseId) => PHASES.findIndex((x) => x.id === p);

export function phaseStep(from: PhaseId, to: PhaseId): 0 | 1 | 2 | 3 | 4 {
  return ((index(to) - index(from) + 5) % 5) as 0 | 1 | 2 | 3 | 4;
}

export function relationOf(mountain: StarNumber, water: StarNumber): Relation {
  const step = phaseStep(starOf(mountain).phase, starOf(water).phase);
  return step === 0 ? "same" : step === 1 ? "m-feeds-w" : step === 2 ? "m-checks-w" : step === 3 ? "w-checks-m" : "w-feeds-m";
}

/** The four pairs the He Tu diagram joins (1 and 6, 2 and 7, 3 and 8, 4 and 9). */
export const isHeTu = (a: StarNumber, b: StarNumber): boolean => Math.abs(a - b) === 5;
/** A pair adding up to ten (1 and 9, 2 and 8, 3 and 7, 4 and 6, 5 and 5). */
export const isTen = (a: StarNumber, b: StarNumber): boolean => a + b === 10;
