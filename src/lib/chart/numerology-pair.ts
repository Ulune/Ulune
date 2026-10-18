/*
 * Numerology's Relationship (share and compare plan, feature 5c; decision
 * R3: dynamics, never a score): two people's numbers side by side, worked out
 * on the device from each person's birth date and full name at birth (the
 * numerology pages' own rules, numerology.ts), nothing sent.
 *
 *   - The core numbers side by side: Life Path, Expression, Soul Urge,
 *     Personality, Birthday and Maturity (the wheel's six).
 *   - The pairs read as dynamics: each number with the same number of the
 *     other person, then the four crossed pairs numerologists read (A's Soul
 *     Urge with B's Personality and the other way round: what one longs for
 *     beside how the other comes across; A's Life Path with B's Expression
 *     and the other way round: one person's road beside the other's talents).
 *     A pair's text is keyed by its two numbers, unordered ("3-4"); a karmic
 *     debt reads as its number (13/4 is a 4); a master number beside a number
 *     of 1 to 9 reads through its root's pair (11 → 2, 22 → 4, 33 → 6), with
 *     a note on what the master adds; two masters have their own pair ("11-22").
 *   - The bridge of each pair: the gap between the two numbers' digits, 0 to
 *     8 (a master counting as its root), as a person's own bridges.
 *   - The relationship number: the two Life Paths, each as its page shows it
 *     (11, 22 and 33 kept), added and reduced, 11, 22 and 33 kept: 4 + 3 = 7,
 *     11 + 11 = 22. Its total is never read as a karmic debt (debts are a
 *     person's own numbers').
 *   - The shared digits: the digits 1 to 9 both people's six numbers hold (a
 *     master by its root), and where each holds it.
 *   - The year: both personal years for the same calendar year, and the
 *     relationship's year, the two added and reduced to 1–9 as personal years
 *     are ("You two, now", the plan's 5e for numerology).
 *
 * Pure; tested in scripts/numerology-pair.test.mjs.
 */
import { valueOfCore, type NumerologyChart } from "./numerology";
import { MASTERS, NO_MASTERS, fromTerms, gapOf, isMaster, term, type NumerologyValue } from "./numerology-reduce";

export type PairPerson = "a" | "b";
export const PAIR_PEOPLE: readonly PairPerson[] = ["a", "b"];

/** The numbers set side by side: the wheel's six. */
export const PAIR_CORES = ["lifepath", "expression", "soulurge", "personality", "birthday", "maturity"] as const;
export type PairCoreId = (typeof PAIR_CORES)[number];

/** Each pair read: the same number in both people, then the crossed pairs (A's first, B's second). */
export const PAIR_SPECS = [
  { id: "lifepath", a: "lifepath", b: "lifepath" },
  { id: "expression", a: "expression", b: "expression" },
  { id: "soulurge", a: "soulurge", b: "soulurge" },
  { id: "personality", a: "personality", b: "personality" },
  { id: "birthday", a: "birthday", b: "birthday" },
  { id: "maturity", a: "maturity", b: "maturity" },
  { id: "su-pe", a: "soulurge", b: "personality" },
  { id: "pe-su", a: "personality", b: "soulurge" },
  { id: "lp-ex", a: "lifepath", b: "expression" },
  { id: "ex-lp", a: "expression", b: "lifepath" },
] as const satisfies readonly { id: string; a: PairCoreId; b: PairCoreId }[];
export type PairId = (typeof PAIR_SPECS)[number]["id"];
export const PAIR_IDS: readonly PairId[] = PAIR_SPECS.map((s) => s.id);
export const isCross = (id: PairId): boolean => id.includes("-");

/** A number as the pairs read it: 1 to 9, or a master kept whole. */
export type PairNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;
export type MasterNumber = 11 | 22 | 33;
export const PAIR_NUMBERS: readonly PairNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

/** The 1–9 the pairs read a master through. */
export const masterRoot = (n: number): number => (n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n);

/** An unordered pair's key, the smaller first: "3-4", "4-11", "11-22". */
export function pairKey(x: number, y: number): string {
  return x <= y ? `${x}-${y}` : `${y}-${x}`;
}

/**
 * The text a pair reads through: two numbers of 1–9 their own pair; a master beside a 1–9 its root's
 * pair ("4-11" through "2-4"); two masters their own ("11-22").
 */
export function textKey(x: number, y: number): string {
  if (isMaster(x) && isMaster(y)) return pairKey(x, y);
  return pairKey(masterRoot(x), masterRoot(y));
}

/** Every key a pair of numbers can read through: the 45 pairs of 1–9 and the 6 of masters. */
export function allTextKeys(): string[] {
  const keys = new Set<string>();
  for (const x of PAIR_NUMBERS) for (const y of PAIR_NUMBERS) keys.add(textKey(x, y));
  return [...keys];
}

export type PairSide = { core: PairCoreId; value: NumerologyValue };

export type PairRow = {
  id: PairId;
  cross: boolean;
  a: PairSide;
  b: PairSide;
  /** Both numbers there (a name gives the name's numbers): the pair's own key, and the key its text is read through. */
  key: string | null;
  text: string | null;
  /** The masters in the pair, each once, beside a number of 1–9 (two masters read their own pair's text). */
  masters: MasterNumber[];
  /** The bridge between the two numbers (their digits' gap, 0–8). */
  gap: NumerologyValue | null;
  /** The very same number, written whole (11/2 is not 2). */
  same: boolean;
};

export type SharedDigit = { digit: number; a: PairCoreId[]; b: PairCoreId[] };

export type NumerologyPair = {
  a: NumerologyChart;
  b: NumerologyChart;
  /** The six numbers side by side, with each one's bridge. */
  cores: { id: PairCoreId; a: NumerologyValue; b: NumerologyValue; gap: NumerologyValue | null }[];
  /** The ten pairs: the same number in both first, then the crossed ones. */
  rows: PairRow[];
  relationship: NumerologyValue;
  shared: SharedDigit[];
  /** The calendar year both charts were cast for, both personal years and the relationship's year. */
  year: { year: number; a: NumerologyValue; b: NumerologyValue; together: NumerologyValue };
};

/** A number of a chart as the pairs read it (a debt by its number, a master whole), or null without one. */
export const pairNumberOf = (v: NumerologyValue): PairNumber | null => (v.number == null ? null : (v.number as PairNumber));

/** The relationship number: the two Life Paths added and reduced, 11, 22 and 33 kept (never a karmic debt). */
export function relationshipNumber(a: NumerologyChart, b: NumerologyChart): NumerologyValue {
  const la = a.lifePath.number;
  const lb = b.lifePath.number;
  if (la == null || lb == null) return { number: null, digit: null };
  return fromTerms([term("a", la, MASTERS), term("b", lb, MASTERS)], MASTERS, false);
}

/** The relationship's year: the two personal years (1–9) added and reduced to 1–9. */
export function relationshipYear(a: NumerologyValue, b: NumerologyValue): NumerologyValue {
  if (a.number == null || b.number == null) return { number: null, digit: null };
  return fromTerms([term("a", a.number, NO_MASTERS), term("b", b.number, NO_MASTERS)], NO_MASTERS, false);
}

function row(spec: (typeof PAIR_SPECS)[number], a: NumerologyChart, b: NumerologyChart): PairRow {
  const va = valueOfCore(a, spec.a);
  const vb = valueOfCore(b, spec.b);
  const na = pairNumberOf(va);
  const nb = pairNumberOf(vb);
  const both = na != null && nb != null;
  const masters = both && !(isMaster(na) && isMaster(nb)) ? ([...new Set([na, nb].filter(isMaster))] as MasterNumber[]) : [];
  return {
    id: spec.id,
    cross: isCross(spec.id),
    a: { core: spec.a, value: va },
    b: { core: spec.b, value: vb },
    key: both ? pairKey(na, nb) : null,
    text: both ? textKey(na, nb) : null,
    masters,
    gap: both ? gapOf(na, nb) : null,
    same: both && na === nb,
  };
}

/** The digits 1–9 each person's six numbers hold (a master by its root), and where. */
function digitsOf(c: NumerologyChart): Map<number, PairCoreId[]> {
  const out = new Map<number, PairCoreId[]>();
  for (const id of PAIR_CORES) {
    const d = valueOfCore(c, id).digit;
    if (d == null) continue;
    out.set(d, [...(out.get(d) ?? []), id]);
  }
  return out;
}

/**
 * Two people's numbers read together. Both charts are cast for the same calendar year (their
 * personal years are that year's): the page casts them so.
 */
export function numerologyPair(a: NumerologyChart, b: NumerologyChart): NumerologyPair {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const shared = [...da.keys()]
    .filter((d) => db.has(d))
    .sort((x, y) => x - y)
    .map((digit) => ({ digit, a: da.get(digit)!, b: db.get(digit)! }));
  const cores = PAIR_CORES.map((id) => {
    const va = valueOfCore(a, id);
    const vb = valueOfCore(b, id);
    return { id, a: va, b: vb, gap: va.number != null && vb.number != null ? gapOf(va.number, vb.number) : null };
  });
  return {
    a,
    b,
    cores,
    rows: PAIR_SPECS.map((s) => row(s, a, b)),
    relationship: relationshipNumber(a, b),
    shared,
    year: { year: a.calendarYear, a: a.personalYear, b: b.personalYear, together: relationshipYear(a.personalYear, b.personalYear) },
  };
}

export const pairRow = (p: NumerologyPair, id: PairId): PairRow => p.rows.find((r) => r.id === id)!;
