/*
 * Numerology over a life (part 59 of the launch plan): what the birth date
 * gives (Life Path, Birthday, Attitude, the pinnacles, the challenges, the
 * period cycles), the personal year, month and day, and what the name gives
 * year by year (the letter cycles and their essence). Rules as Hans Decoz
 * gives them (World Numerology): the long cycles change on birthdays, the
 * personal year on 1 January. Decoz calls the letter cycles "transits"; Ulune
 * names them letter cycles so they are never taken for the planets' transits.
 */
import {
  DAY_MASTERS,
  MASTERS,
  NO_MASTERS,
  absent,
  digitalRoot,
  fromTerms,
  gapOf,
  term,
  type NumerologyTerm,
  type NumerologyValue,
} from "./numerology-reduce";
import type { NameLetter, ParsedName } from "./numerology-name";

/** A birth date as numerology reads it: the local date, not the UT one. */
export type BirthDate = { year: number; month: number; day: number };

/** A chart's date ("1990-06-15", the local date of birth) as numerology reads it. */
export function parseChartDate(date: string): BirthDate | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** The birth date's three parts, each reduced (11, 22, 33 kept). */
export function dateTerms(b: BirthDate): [NumerologyTerm, NumerologyTerm, NumerologyTerm] {
  return [term("month", b.month), term("day", b.day), term("year", b.year)];
}

/** Life Path: the month, the day and the year each reduced, then added. */
export function lifePathOf(b: BirthDate): NumerologyValue {
  return fromTerms(dateTerms(b), MASTERS, true);
}

/** Birthday: the day of the month (11 and 22 kept; the 29th is an 11). */
export function birthdayOf(b: BirthDate): NumerologyValue {
  return fromTerms([term("day", b.day, DAY_MASTERS)], DAY_MASTERS, true);
}

/** Attitude: the month and the day added (the first pinnacle's number). */
export function attitudeOf(b: BirthDate): NumerologyValue {
  const [month, day] = dateTerms(b);
  return fromTerms([month, day], MASTERS, false);
}

/** A stretch of life, in years of age: it starts on the birthday of `fromAge`. */
export type AgeSpan = {
  fromAge: number;
  /** The birthday it ends on (the next one starts then); null for the rest of life. */
  toAge: number | null;
};

export type Pinnacle = AgeSpan & { index: 1 | 2 | 3 | 4; value: NumerologyValue };
/** A challenge runs with its pinnacle's years; the third, the main one, also colours the whole life. */
export type Challenge = AgeSpan & { index: 1 | 2 | 3 | 4; value: NumerologyValue; main: boolean };
export type PeriodCycle = AgeSpan & { index: 1 | 2 | 3; value: NumerologyValue };

export type LifeCycles = {
  pinnacles: Pinnacle[];
  challenges: Challenge[];
  periods: PeriodCycle[];
};

/** Where the first pinnacle ends: 36 minus the Life Path's digit (a master counts as its digit). */
export function firstPinnacleEnd(lifePathDigit: number): number {
  return 36 - lifePathDigit;
}

/** The personal year a calendar year is for someone: birth month + birth day + the year, reduced to 1–9. */
export function personalYearNumber(b: BirthDate, year: number): number {
  return digitalRoot(digitalRoot(b.month) + digitalRoot(b.day) + digitalRoot(year));
}

/**
 * Where the first period cycle ends: the first personal year 1 on or after the
 * 27th birthday (the year of that birthday counts). The second lasts 27 years.
 */
export function firstPeriodEnd(b: BirthDate): number {
  let age = 27;
  while (personalYearNumber(b, b.year + age) !== 1) age += 1;
  return age;
}

/** Pinnacles, challenges and period cycles, with the ages they run between. */
export function lifeCyclesOf(b: BirthDate, lifePathDigit: number): LifeCycles {
  const [month, day, year] = dateTerms(b);
  const p1 = fromTerms([month, day], MASTERS, false);
  const p2 = fromTerms([day, year], MASTERS, false);
  const p3 = fromTerms([term("pinnacle1", p1.number ?? 0), term("pinnacle2", p2.number ?? 0)], MASTERS, false);
  const p4 = fromTerms([month, year], MASTERS, false);
  const end = firstPinnacleEnd(lifePathDigit);
  const spans: AgeSpan[] = [
    { fromAge: 0, toAge: end },
    { fromAge: end, toAge: end + 9 },
    { fromAge: end + 9, toAge: end + 18 },
    { fromAge: end + 18, toAge: null },
  ];
  const pinnacles = [p1, p2, p3, p4].map((value, i) => ({ ...spans[i]!, index: (i + 1) as Pinnacle["index"], value }));
  const c1 = gapOf(month.value, day.value);
  const c2 = gapOf(day.value, year.value);
  const c3 = gapOf(c1.number ?? 0, c2.number ?? 0);
  const c4 = gapOf(month.value, year.value);
  const challenges = [c1, c2, c3, c4].map((value, i) => ({
    ...spans[i]!,
    index: (i + 1) as Challenge["index"],
    value,
    main: i === 2,
  }));
  const periodEnd = firstPeriodEnd(b);
  const periods: PeriodCycle[] = [
    { fromAge: 0, toAge: periodEnd, index: 1, value: fromTerms([month], MASTERS, false) },
    { fromAge: periodEnd, toAge: periodEnd + 27, index: 2, value: fromTerms([day], MASTERS, false) },
    { fromAge: periodEnd + 27, toAge: null, index: 3, value: fromTerms([year], MASTERS, false) },
  ];
  return { pinnacles, challenges, periods };
}

/** The one of a run of spans an age falls in. */
export function spanAt<T extends AgeSpan>(spans: readonly T[], age: number): T | null {
  if (age < 0) return null;
  return spans.find((s) => age >= s.fromAge && (s.toAge == null || age < s.toAge)) ?? null;
}

/** Personal year: the birth month, the birth day and the year, reduced to 1–9. */
export function personalYearOf(b: BirthDate, year: number): NumerologyValue {
  return fromTerms(
    [term("month", b.month, NO_MASTERS), term("day", b.day, NO_MASTERS), term("year", year, NO_MASTERS)],
    NO_MASTERS,
    false,
  );
}

/** Personal month: the personal year and the month. */
export function personalMonthOf(personalYear: number, month: number): NumerologyValue {
  return fromTerms([term("personalYear", personalYear, NO_MASTERS), term("month", month, NO_MASTERS)], NO_MASTERS, false);
}

/** Personal day: the personal month and the day of the month. */
export function personalDayOf(personalMonth: number, day: number): NumerologyValue {
  return fromTerms([term("personalMonth", personalMonth, NO_MASTERS), term("day", day, NO_MASTERS)], NO_MASTERS, false);
}

/** Universal year: the year's digits, the same for everyone. */
export function universalYearOf(year: number): NumerologyValue {
  return fromTerms([term("year", year, NO_MASTERS)], NO_MASTERS, false);
}

/** A personal day as a number alone, for a whole month at a time (the Calendar). */
export function personalDayNumber(b: BirthDate, year: number, month: number, day: number): number {
  return digitalRoot(personalYearNumber(b, year) + digitalRoot(month) + digitalRoot(day));
}

/** The calendar years a new nine-year round starts in (a personal year 1). */
export function nineYearStarts(b: BirthDate, fromYear: number, toYear: number): number[] {
  const out: number[] = [];
  for (let y = fromYear; y <= toYear; y += 1) if (personalYearNumber(b, y) === 1) out.push(y);
  return out;
}

export const LETTER_CYCLE_IDS = ["physical", "mental", "spiritual"] as const;
export type LetterCycleId = (typeof LETTER_CYCLE_IDS)[number];

/** A letter's years in a letter cycle: as many years as its value. */
export type LetterSpan = { letter: NameLetter; fromAge: number; toAge: number };

/**
 * The letters each cycle walks through: the first name (physical), the middle
 * names strung together (mental; the last name when there is none) and the
 * last name (spiritual). A single name gives all three.
 */
export function letterCycleSources(parsed: ParsedName | null): Record<LetterCycleId, NameLetter[]> | null {
  const words = parsed?.words ?? [];
  if (!words.length) return null;
  const first = words[0]!.letters;
  const last = words[words.length - 1]!.letters;
  const middle = words.length > 2 ? words.slice(1, -1).flatMap((w) => w.letters) : last;
  return { physical: first, mental: middle, spiritual: last };
}

/** The letter a cycle is on at an age: from birth, each letter for its value in years, round and round. */
export function letterAt(letters: readonly NameLetter[], age: number): LetterSpan | null {
  if (!letters.length || age < 0) return null;
  const round = letters.reduce((s, l) => s + l.value, 0);
  let from = Math.floor(age / round) * round;
  for (const letter of letters) {
    if (age < from + letter.value) return { letter, fromAge: from, toAge: from + letter.value };
    from += letter.value;
  }
  return null;
}

/** Every letter of a cycle from birth to `untilAge` (the life line draws them). */
export function letterSpans(letters: readonly NameLetter[], untilAge: number): LetterSpan[] {
  const out: LetterSpan[] = [];
  if (!letters.length) return out;
  let from = 0;
  for (let i = 0; from < untilAge; i = (i + 1) % letters.length) {
    const letter = letters[i]!;
    out.push({ letter, fromAge: from, toAge: from + letter.value });
    from += letter.value;
  }
  return out;
}

/** The essence: the three letters' values added (11, 22 kept). */
export function essenceOf(spans: Record<LetterCycleId, LetterSpan>): NumerologyValue {
  return fromTerms(
    LETTER_CYCLE_IDS.map((id) => term(id, spans[id].letter.value)),
    MASTERS,
    false,
  );
}

/** Every cycle running at an age. */
export type CyclesAt = {
  age: number;
  pinnacle: Pinnacle;
  challenge: Challenge;
  period: PeriodCycle;
  /** The three letter cycles; null without a name. */
  letters: Record<LetterCycleId, LetterSpan> | null;
  essence: NumerologyValue;
};

export function cyclesAt(
  life: LifeCycles,
  sources: Record<LetterCycleId, NameLetter[]> | null,
  age: number,
): CyclesAt | null {
  const pinnacle = spanAt(life.pinnacles, age);
  const challenge = spanAt(life.challenges, age);
  const period = spanAt(life.periods, age);
  if (!pinnacle || !challenge || !period) return null;
  let letters: Record<LetterCycleId, LetterSpan> | null = null;
  if (sources) {
    const physical = letterAt(sources.physical, age);
    const mental = letterAt(sources.mental, age);
    const spiritual = letterAt(sources.spiritual, age);
    if (physical && mental && spiritual) letters = { physical, mental, spiritual };
  }
  return { age, pinnacle, challenge, period, letters, essence: letters ? essenceOf(letters) : absent() };
}

/** One calendar year: its personal year from 1 January, and the cycles from the birthday on. */
export type NumerologyYearRow = {
  year: number;
  /** The age turned on the birthday that year. */
  age: number;
  personalYear: NumerologyValue;
  universalYear: NumerologyValue;
  /** Null for a year before the birth. */
  cycles: CyclesAt | null;
};

export function yearRow(
  b: BirthDate,
  life: LifeCycles,
  sources: Record<LetterCycleId, NameLetter[]> | null,
  year: number,
): NumerologyYearRow {
  const age = year - b.year;
  return {
    year,
    age,
    personalYear: personalYearOf(b, year),
    universalYear: universalYearOf(year),
    cycles: cyclesAt(life, sources, age),
  };
}

export type CycleKind = "period" | "pinnacle" | "challenge";

/** A long cycle changing, on a birthday: for the Calendar and the life line. */
export type CycleChange = {
  kind: CycleKind;
  /** The birthday it changes on (an age), and that birthday's year. */
  age: number;
  year: number;
  /** The cycle that starts (2 to 4) and its number. */
  index: number;
  value: NumerologyValue;
  /** The number of the cycle that ends. */
  previous: NumerologyValue;
};

export function cycleChanges(b: BirthDate, life: LifeCycles): CycleChange[] {
  const out: CycleChange[] = [];
  const add = (kind: CycleKind, list: readonly (AgeSpan & { index: number; value: NumerologyValue })[]) => {
    list.forEach((c, i) => {
      if (i === 0) return;
      out.push({ kind, age: c.fromAge, year: b.year + c.fromAge, index: c.index, value: c.value, previous: list[i - 1]!.value });
    });
  };
  add("period", life.periods);
  add("pinnacle", life.pinnacles);
  add("challenge", life.challenges);
  const order: Record<CycleKind, number> = { period: 0, pinnacle: 1, challenge: 2 };
  return out.sort((x, y) => x.age - y.age || order[x.kind] - order[y.kind]);
}

/** Completed years on a calendar day (the long cycles change on the birthday). */
export function ageOn(b: BirthDate, year: number, month: number, day: number): number {
  const before = month < b.month || (month === b.month && day < b.day);
  return year - b.year - (before ? 1 : 0);
}
