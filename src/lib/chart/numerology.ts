import type { BirthInput, NatalChart } from "./types";
import {
  MASTERS,
  NO_MASTERS,
  absent,
  digitalRoot,
  digitSum,
  fromTerms,
  gapOf,
  present,
  reduceKeepMasters,
  term,
  type KarmicDebt,
  type NumerologyValue,
} from "./numerology-reduce";
import {
  chaldeanOf,
  lettersOf,
  nameDetail,
  nameNumbersOf,
  parseName,
  type ChaldeanNumber,
  type NameDetail,
  type NameLetter,
  type ParsedName,
  type YRole,
} from "./numerology-name";
import {
  ageOn,
  attitudeOf,
  birthdayOf,
  cyclesAt,
  letterCycleSources,
  lifeCyclesOf,
  lifePathOf,
  personalDayOf,
  personalMonthOf,
  personalYearOf,
  universalYearOf,
  yearRow,
  type BirthDate,
  type CyclesAt,
  type LetterCycleId,
  type LifeCycles,
  type NumerologyYearRow,
} from "./numerology-cycles";
import { birthGrid, type BirthGrid } from "./numerology-grid";

/*
 * Numerology, worked out on the device from the birth date and the name
 * (nothing here is sent anywhere). The arithmetic is in numerology-reduce.ts,
 * the name in numerology-name.ts, the cycles in numerology-cycles.ts and the
 * birth grid in numerology-grid.ts; this file puts a whole reading together.
 * Rules: Hans Decoz (World Numerology), as the numerology plan of part 59 sets
 * out; the Chaldean number (Cheiro) stands beside, never mixed in.
 */

export { digitSum, digitalRoot, reduceBirthday, reduceKeepMasters, type NumerologyValue } from "./numerology-reduce";
export { PYTHAGOREAN_VALUE, foldLetter, lettersOf, nameNumbers, sumLetters, type YRole } from "./numerology-name";

export const NUMEROLOGY_DASH = "—";

export type NumerologyCoreId =
  | "lifepath"
  | "expression"
  | "soulurge"
  | "personality"
  | "birthday"
  | "maturity"
  | "personalYear";

/** A name read letter by letter, with every number it gives. */
export type NumerologyName = {
  text: string;
  parsed: ParsedName;
  expression: NumerologyValue;
  soulUrge: NumerologyValue;
  personality: NumerologyValue;
  detail: NameDetail;
  chaldean: ChaldeanNumber | null;
};

/** A core number that went through 13, 14, 16 or 19. */
export type NumerologyDebt = { id: NumerologyCoreId; debt: KarmicDebt };

export type NumerologyChart = {
  year: number;
  month: number;
  day: number;
  calendarYear: number;
  calendarMonth: number;
  calendarDay: number;
  /** Completed years on the calendar day (negative before the birth). */
  age: number;
  /** The full name at birth, as typed; null without one. */
  name: string | null;
  /** The name used now, when it differs from the birth name. */
  currentName: string | null;
  lifePath: NumerologyValue;
  expression: NumerologyValue;
  soulUrge: NumerologyValue;
  personality: NumerologyValue;
  birthday: NumerologyValue;
  maturity: NumerologyValue;
  attitude: NumerologyValue;
  rationalThought: NumerologyValue;
  balance: NumerologyValue;
  subconsciousSelf: NumerologyValue;
  personalYear: NumerologyValue;
  personalMonth: NumerologyValue;
  personalDay: NumerologyValue;
  universalYear: NumerologyValue;
  /** The birth name (the core numbers) and the name used now (its minor numbers). */
  names: { birth: NumerologyName | null; current: NumerologyName | null };
  debts: NumerologyDebt[];
  /** The gaps between two core numbers, 0 to 8. */
  bridges: { lifePathExpression: NumerologyValue; soulUrgePersonality: NumerologyValue };
  /** Pinnacles, challenges and period cycles over the whole life. */
  life: LifeCycles;
  /** The letters each letter cycle walks through (null without a name). */
  letterSources: Record<LetterCycleId, NameLetter[]> | null;
  /** Every cycle running on the calendar day (null before the birth). */
  cycles: CyclesAt | null;
  grid: BirthGrid;
};

export function parseChartDate(date: string): BirthDate | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * Use only a typed birth name. Never invent one from place, date, or "Untitled".
 */
export function givenBirthName(raw: string | null | undefined, chart: NatalChart): string | null {
  const name = (raw ?? "").trim();
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower === "natal chart" || lower === "untitled" || lower === "sans titre") return null;
  const place = chart.meta.placeLabel.split(",")[0]?.trim() ?? "";
  if (place && chart.meta.date && name === `${place} · ${chart.meta.date}`) return null;
  if (place && name === place) return null;
  if (name === chart.meta.date) return null;
  if (!lettersOf(name).length) return null;
  return name;
}

/**
 * The name options a chart's input gives: its typed birth name, and the Y's
 * switched by hand for that very name (another name leaves them aside).
 */
export function numerologyOptionsOf(
  input: Pick<BirthInput, "name" | "numerologyY">,
  chart: NatalChart,
): { name: string | null; yRoles: YRole[] | null } {
  const name = givenBirthName(input.name, chart);
  const y = input.numerologyY;
  const yRoles = name && y && y.name === name && /^[vc]+$/.test(y.roles) ? (y.roles.split("") as YRole[]) : null;
  return { name, yRoles };
}

/** Life Path as a number alone (month, day and year reduced apart; masters kept). */
export function lifePathFromParts(month: number, day: number, year: number): number {
  return reduceKeepMasters(reduceKeepMasters(month) + reduceKeepMasters(day) + reduceKeepMasters(year));
}

/** The yearly cycles reduce fully to 1–9 (no masters): PY = month + day + year. */
export function personalYearFromParts(month: number, day: number, calendarYear: number): number {
  return digitalRoot(month + day + calendarYear);
}

export function personalMonthFromParts(personalYear: number, calendarMonth: number): number {
  return digitalRoot(personalYear + calendarMonth);
}

export function personalDayFromParts(personalMonth: number, calendarDay: number): number {
  return digitalRoot(personalMonth + calendarDay);
}

/** Collective backdrop: reduce the calendar year's digits to 1–9. */
export function universalYearFromYear(calendarYear: number): number {
  return digitalRoot(digitSum(calendarYear));
}

/** A name's letters, numbers and finer numbers; null when it holds no letter. */
export function readName(text: string, yRoles?: readonly YRole[] | null): NumerologyName | null {
  const parsed = parseName(text, yRoles);
  if (!parsed.letters.length) return null;
  return { text: parsed.text, parsed, ...nameNumbersOf(parsed), detail: nameDetail(parsed), chaldean: chaldeanOf(parsed) };
}

/** Rational thought: the first name and the day of birth, reduced to 1–9. */
function rationalThoughtOf(name: NumerologyName | null, b: BirthDate): NumerologyValue {
  const first = name?.parsed.words[0];
  if (!first) return absent();
  const raw = first.letters.reduce((s, l) => s + l.value, 0);
  return fromTerms([term(first.text, raw, NO_MASTERS), term("day", b.day, NO_MASTERS)], NO_MASTERS, false);
}

function gapOrAbsent(a: NumerologyValue, b: NumerologyValue): NumerologyValue {
  return a.number != null && b.number != null ? gapOf(a.number, b.number) : absent();
}

export type NumerologyOptions = {
  now?: Date;
  /** The full name at birth (when left out, the chart's own name if it is a typed one). */
  name?: string | null;
  /** The name used now, if it differs (its numbers are the minor numbers). */
  currentName?: string | null;
  /** Each Y of the birth name as a vowel or a consonant, in order (switched by hand). */
  yRoles?: readonly YRole[] | null;
  currentYRoles?: readonly YRole[] | null;
  calendarYear?: number;
  calendarMonth?: number;
  calendarDay?: number;
};

export function castNumerology(chart: NatalChart, opts?: NumerologyOptions): NumerologyChart | null {
  const b = parseChartDate(chart.meta.date);
  if (!b) return null;
  const now = opts?.now ?? new Date();
  const calendarYear = opts?.calendarYear ?? now.getFullYear();
  const calendarMonth = opts?.calendarMonth ?? now.getMonth() + 1;
  const calendarDay = opts?.calendarDay ?? now.getDate();
  const typed = opts?.name !== undefined ? opts.name : givenBirthName(chart.meta.name, chart);
  const birth = typed ? readName(typed, opts?.yRoles) : null;
  const currentTyped = (opts?.currentName ?? "").trim();
  const sameName = birth != null && lettersOf(currentTyped).join("") === lettersOf(birth.text).join("");
  const current = currentTyped && !sameName ? readName(currentTyped, opts?.currentYRoles) : null;

  const lifePath = lifePathOf(b);
  const birthday = birthdayOf(b);
  const expression = birth?.expression ?? absent();
  const soulUrge = birth?.soulUrge ?? absent();
  const personality = birth?.personality ?? absent();
  const maturity =
    lifePath.number != null && expression.number != null
      ? fromTerms([term("lifePath", lifePath.number, MASTERS), term("expression", expression.number, MASTERS)], MASTERS, false)
      : absent();
  const cores: [NumerologyCoreId, NumerologyValue][] = [
    ["lifepath", lifePath],
    ["expression", expression],
    ["soulurge", soulUrge],
    ["personality", personality],
    ["birthday", birthday],
  ];
  const debts = cores.flatMap(([id, v]) => (v.debt ? [{ id, debt: v.debt }] : []));

  const personalYear = personalYearOf(b, calendarYear);
  const personalMonth = personalMonthOf(personalYear.number ?? 0, calendarMonth);
  const personalDay = personalDayOf(personalMonth.number ?? 0, calendarDay);
  const life = lifeCyclesOf(b, lifePath.digit ?? 0);
  const letterSources = letterCycleSources(birth?.parsed ?? null);
  const age = ageOn(b, calendarYear, calendarMonth, calendarDay);

  return {
    ...b,
    calendarYear,
    calendarMonth,
    calendarDay,
    age,
    name: birth ? typed : null,
    currentName: current ? currentTyped : null,
    lifePath,
    expression,
    soulUrge,
    personality,
    birthday,
    maturity,
    attitude: attitudeOf(b),
    rationalThought: rationalThoughtOf(birth, b),
    balance: birth?.detail.balance ?? absent(),
    subconsciousSelf: birth ? present(birth.detail.subconsciousSelf) : absent(),
    personalYear,
    personalMonth,
    personalDay,
    universalYear: universalYearOf(calendarYear),
    names: { birth, current },
    debts,
    bridges: {
      lifePathExpression: gapOrAbsent(lifePath, expression),
      soulUrgePersonality: gapOrAbsent(soulUrge, personality),
    },
    life,
    letterSources,
    cycles: cyclesAt(life, letterSources, age),
    grid: birthGrid(b),
  };
}

/** One calendar year of a reading: its personal year, and the cycles from the birthday on. */
export function numerologyYear(chart: NumerologyChart, year: number): NumerologyYearRow {
  return yearRow(chart, chart.life, chart.letterSources, year);
}

export function formatNumerologyNumber(value: NumerologyValue, dash = NUMEROLOGY_DASH): string {
  return value.number == null ? dash : String(value.number);
}

/** Masters show root beside the value (11/2). */
export function formatNumerologyMaster(value: NumerologyValue, dash = NUMEROLOGY_DASH): string {
  if (value.number == null || value.digit == null) return dash;
  if (value.number === 11 || value.number === 22 || value.number === 33) {
    return `${value.number}/${value.digit}`;
  }
  return String(value.number);
}

export function formatNumerologyDigit(value: NumerologyValue, dash = NUMEROLOGY_DASH): string {
  return value.digit == null ? dash : String(value.digit);
}

export function valueOfCore(chart: NumerologyChart, id: NumerologyCoreId): NumerologyValue {
  switch (id) {
    case "lifepath":
      return chart.lifePath;
    case "expression":
      return chart.expression;
    case "soulurge":
      return chart.soulUrge;
    case "personality":
      return chart.personality;
    case "birthday":
      return chart.birthday;
    case "maturity":
      return chart.maturity;
    case "personalYear":
      return chart.personalYear;
  }
}
