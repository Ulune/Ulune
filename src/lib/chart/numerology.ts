import type { NatalChart } from "./types";

/**
 * Pythagorean letter map (A=1 … I=9, then J=1 … R=9, S=1 … Z=8):
 *   1 AJS  2 BKT  3 CLU  4 DMV  5 ENW  6 FOX  7 GPY  8 HQZ  9 IR
 */
export const PYTHAGOREAN_VALUE: Readonly<Record<string, number>> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
};

/** House rule: Y is always treated as a vowel (not only when it stands in for one). */
const VOWELS = new Set(["A", "E", "I", "O", "U", "Y"]);

export const NUMEROLOGY_DASH = "—";

export type NumerologyValue = {
  /** Master-aware value (11/22/33 kept). Null when the name is missing. */
  number: number | null;
  /** Always the 1–9 digital root. Null when the name is missing. */
  digit: number | null;
};

export type NumerologyCoreId =
  | "lifepath"
  | "expression"
  | "soulurge"
  | "personality"
  | "birthday"
  | "maturity"
  | "personalYear";

export type NumerologyChart = {
  year: number;
  month: number;
  day: number;
  calendarYear: number;
  calendarMonth: number;
  calendarDay: number;
  name: string | null;
  lifePath: NumerologyValue;
  expression: NumerologyValue;
  soulUrge: NumerologyValue;
  personality: NumerologyValue;
  birthday: NumerologyValue;
  maturity: NumerologyValue;
  personalYear: NumerologyValue;
  personalMonth: NumerologyValue;
  personalDay: NumerologyValue;
  universalYear: NumerologyValue;
};

export function digitSum(n: number): number {
  let s = 0;
  let x = Math.abs(Math.trunc(n));
  if (x === 0) return 0;
  while (x > 0) {
    s += x % 10;
    x = Math.floor(x / 10);
  }
  return s;
}

/** Always 1–9. 11→2, 22→4, 33→6. */
export function digitalRoot(n: number): number {
  let x = Math.abs(Math.trunc(n));
  if (x === 0) return 0;
  while (x > 9) x = digitSum(x);
  return x;
}

/** Reduce by summing digits; keep 11, 22, 33 unreduced. */
export function reduceKeepMasters(n: number): number {
  let x = Math.abs(Math.trunc(n));
  while (x > 9 && x !== 11 && x !== 22 && x !== 33) x = digitSum(x);
  return x;
}

/** Birthday: keep 11 and 22 (including a compound day that reduces to them). Not 33. */
export function reduceBirthday(day: number): number {
  if (day === 11 || day === 22) return day;
  let x = Math.abs(Math.trunc(day));
  while (x > 9 && x !== 11 && x !== 22) x = digitSum(x);
  return x;
}

function present(n: number): NumerologyValue {
  return { number: n, digit: digitalRoot(n) };
}

function absent(): NumerologyValue {
  return { number: null, digit: null };
}

/**
 * Latin letters NFD does not decompose, so stripping combining marks alone
 * leaves them outside A–Z and they would be dropped — losing a letter from the
 * name and quietly changing every name number. These are the standard ASCII
 * transliterations. French `œ` and German `ß` are the two that actually turn
 * up; `ß` already uppercases to `SS` in JS, so only the capital `ẞ` needs a row.
 */
const LIGATURE_FOLD: Readonly<Record<string, string>> = {
  Æ: "AE",
  Œ: "OE",
  ẞ: "SS",
  Ø: "O",
  Ł: "L",
  Đ: "D",
  Ð: "D",
  Þ: "TH",
};

/**
 * One source character → the A–Z letters it counts as. Accents fold (`é` → `E`),
 * ligatures expand (`œ` → `OE`, `ß` → `SS`), and anything with no Latin letter
 * in it returns an empty string rather than a zero-valued letter.
 */
export function foldLetter(ch: string): string {
  const upper = ch.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  let out = "";
  for (const c of upper) {
    const mapped = LIGATURE_FOLD[c];
    if (mapped) out += mapped;
    else if (c >= "A" && c <= "Z") out += c;
  }
  return out;
}

export function lettersOf(name: string): string[] {
  const out: string[] = [];
  for (const ch of name) {
    for (const letter of foldLetter(ch)) out.push(letter);
  }
  return out;
}

export function letterValue(letter: string): number {
  return PYTHAGOREAN_VALUE[letter] ?? 0;
}

export function isVowel(letter: string): boolean {
  return VOWELS.has(letter);
}

export function sumLetters(letters: string[]): number {
  let s = 0;
  for (const ch of letters) s += letterValue(ch);
  return s;
}

export type NameNumbers = {
  expression: NumerologyValue;
  soulUrge: NumerologyValue;
  personality: NumerologyValue;
};

/** Full-name Pythagorean totals. Empty letter list → absent (never a fake 0). */
export function nameNumbers(name: string): NameNumbers {
  const letters = lettersOf(name);
  if (!letters.length) {
    return { expression: absent(), soulUrge: absent(), personality: absent() };
  }
  const vowels = letters.filter(isVowel);
  const consonants = letters.filter((ch) => !isVowel(ch));
  return {
    expression: present(reduceKeepMasters(sumLetters(letters))),
    soulUrge: vowels.length ? present(reduceKeepMasters(sumLetters(vowels))) : absent(),
    personality: consonants.length ? present(reduceKeepMasters(sumLetters(consonants))) : absent(),
  };
}

export function parseChartDate(date: string): { year: number; month: number; day: number } | null {
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

export function localCalendarYear(now: Date = new Date()): number {
  return now.getFullYear();
}

export function lifePathFromParts(month: number, day: number, year: number): number {
  const m = reduceKeepMasters(month);
  const d = reduceKeepMasters(day);
  const y = reduceKeepMasters(year);
  return reduceKeepMasters(m + d + y);
}

/**
 * Timing cycles reduce fully to 1–9 (no masters). Sol lock 2026-09-18:
 * PY = reduce_single(birthMonth + birthDay + calendarYear).
 */
export function reduceSingle(n: number): number {
  return digitalRoot(n);
}

export function personalYearFromParts(month: number, day: number, calendarYear: number): number {
  return reduceSingle(month + day + calendarYear);
}

export function personalMonthFromParts(personalYear: number, calendarMonth: number): number {
  return reduceSingle(personalYear + calendarMonth);
}

export function personalDayFromParts(personalMonth: number, calendarDay: number): number {
  return reduceSingle(personalMonth + calendarDay);
}

/** Collective backdrop: reduce the calendar year’s digits to 1–9. */
export function universalYearFromYear(calendarYear: number): number {
  return reduceSingle(digitSum(calendarYear));
}

export function castNumerology(
  chart: NatalChart,
  opts?: {
    now?: Date;
    name?: string | null;
    calendarYear?: number;
    calendarMonth?: number;
    calendarDay?: number;
  },
): NumerologyChart | null {
  const parts = parseChartDate(chart.meta.date);
  if (!parts) return null;
  const now = opts?.now ?? new Date();
  const calendarYear = opts?.calendarYear ?? localCalendarYear(now);
  const calendarMonth = opts?.calendarMonth ?? now.getMonth() + 1;
  const calendarDay = opts?.calendarDay ?? now.getDate();
  const typed = opts?.name !== undefined ? opts.name : givenBirthName(chart.meta.name, chart);
  const name = typed && lettersOf(typed).length ? typed : null;
  const names = name ? nameNumbers(name) : { expression: absent(), soulUrge: absent(), personality: absent() };
  const lifePath = present(lifePathFromParts(parts.month, parts.day, parts.year));
  const birthday = present(reduceBirthday(parts.day));
  const py = personalYearFromParts(parts.month, parts.day, calendarYear);
  const pm = personalMonthFromParts(py, calendarMonth);
  const pd = personalDayFromParts(pm, calendarDay);
  const personalYear = present(py);
  const personalMonth = present(pm);
  const personalDay = present(pd);
  const universalYear = present(universalYearFromYear(calendarYear));
  const maturity =
    lifePath.number != null && names.expression.number != null
      ? present(reduceKeepMasters(lifePath.number + names.expression.number))
      : absent();
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    calendarYear,
    calendarMonth,
    calendarDay,
    name,
    lifePath,
    expression: names.expression,
    soulUrge: names.soulUrge,
    personality: names.personality,
    birthday,
    maturity,
    personalYear,
    personalMonth,
    personalDay,
    universalYear,
  };
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
