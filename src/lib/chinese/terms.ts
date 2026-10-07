/*
 * The solar terms and the new moons of any year, as instants (UT
 * milliseconds since 1970, like a JavaScript date): from the time table
 * (Swiss Ephemeris, to the second) for 1799–2201, from the analytic Sun and
 * Moon of astro.ts (within about 20 s of it) before and after. Everything else
 * in the Chinese engine asks here, so the calendar, the pillars and the pages
 * all see the same instants.
 */
import { DAY_MS, MEEUS_K0_JDE, SYNODIC_DAYS, jdFromMs, newMoonMs, sunCrossingMs } from "./astro";
import {
  MOON_COUNT,
  MOON_FIRST,
  MOON_FIRST_K,
  MOON_REMAINDERS,
  TABLE_CODE,
  TERM_FIRST_ROW,
  TERM_FIRST_YEAR,
  TERM_LAST_YEAR,
  TERM_REMAINDERS,
} from "./time-table";

/**
 * A solar term by its traditional place in the year: 0 is Lichun (立春, the
 * Sun at 315°, about 4 February), then every 15° to 23, Dahan (大寒, 300°).
 * Even numbers are the jie (節), which open the solar months; odd numbers
 * are the zhongqi (中氣), the principal terms the lunar months are named by.
 */
export type TermIndex = number;

export const LICHUN = 0;
export const CHUNFEN = 3;
export const XIAZHI = 9;
export const QIUFEN = 15;
export const DONGZHI = 21;
export const XIAOHAN = 22;

/** The Sun's apparent longitude at a term, degrees. */
export const termLongitude = (term: TermIndex): number => (315 + 15 * term) % 360;
/** Whether a term opens a solar month (jie) rather than naming a lunar one (zhongqi). */
export const isJie = (term: TermIndex): boolean => term % 2 === 0;

/** Within a Gregorian year the terms run from Xiaohan (early January) to Dongzhi (late December). */
const gregorianSlot = (term: TermIndex): number => (term + 2) % 24;
const termOfSlot = (slot: number): TermIndex => (slot + 22) % 24;

/** The span where every answer comes from the table alone: 1 January 1800 to 1 January 2201, UT. */
export const TABLE_FROM_MS = Date.UTC(1800, 0, 1);
export const TABLE_TO_MS = Date.UTC(2201, 0, 1);
export const isTabulated = (ms: number): boolean => ms >= TABLE_FROM_MS && ms < TABLE_TO_MS;

// ── Decoding the table (once, on first use) ─────────────────────────────────

/** Base64 of int16 values, the low bytes of all values first, then the high bytes. */
function unpackInt16(text: string): Int16Array {
  const bin = atob(text.replace(/\s+/g, ""));
  const n = bin.length / 2;
  const out = new Int16Array(n);
  // An Int16Array stores 0x8000–0xffff as the negative values they encode.
  for (let i = 0; i < n; i += 1) out[i] = bin.charCodeAt(i) | (bin.charCodeAt(n + i) << 8);
  return out;
}

let termTable: Float64Array | null = null;
let moonTable: Float64Array | null = null;

/** Every tabulated term, ms, by (year − TERM_FIRST_YEAR) × 24 + Gregorian slot. */
function terms(): Float64Array {
  if (termTable) return termTable;
  const years = TERM_LAST_YEAR - TERM_FIRST_YEAR + 1;
  const rest = unpackInt16(TERM_REMAINDERS);
  const seconds = new Float64Array(years * 24);
  seconds.set(TERM_FIRST_ROW);
  for (let i = 24; i < seconds.length; i += 1) seconds[i] = seconds[i - 24] + TABLE_CODE.yearSeconds + rest[i - 24];
  for (let i = 0; i < seconds.length; i += 1) seconds[i] *= 1000;
  termTable = seconds;
  return seconds;
}

/** Every tabulated new moon, ms, in order. */
function moons(): Float64Array {
  if (moonTable) return moonTable;
  const rest = unpackInt16(MOON_REMAINDERS);
  const { lagA, lagB, monthSeconds } = TABLE_CODE;
  const span = lagA + lagB;
  const lengths = new Float64Array(rest.length);
  const out = new Float64Array(MOON_COUNT);
  out[0] = MOON_FIRST;
  for (let i = 0; i < rest.length; i += 1) {
    lengths[i] = i >= span ? rest[i] + lengths[i - lagA] + lengths[i - lagB] - lengths[i - span] : rest[i];
    out[i + 1] = out[i] + monthSeconds + lengths[i];
  }
  for (let i = 0; i < out.length; i += 1) out[i] *= 1000;
  moonTable = out;
  return out;
}

// ── Solar terms ─────────────────────────────────────────────────────────────

/** Midnight UT of a proleptic Gregorian date, for any year (Date.UTC reads years 0–99 as 1900–1999). */
export function utcMs(year: number, month: number, day: number): number {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return d.getTime();
}

/** Years outside the table, computed once each (24 Newton solutions, a few milliseconds). */
const farYears = new Map<number, Float64Array>();

function farYear(year: number): Float64Array {
  let row = farYears.get(year);
  if (row) return row;
  row = new Float64Array(24);
  // Proleptic Gregorian: Xiaohan stays within a few days of 6 January for all of years 1–2400.
  const jan6 = utcMs(year, 1, 6);
  for (let slot = 0; slot < 24; slot += 1) {
    row[slot] = sunCrossingMs((285 + 15 * slot) % 360, jan6 + 15.2184 * slot * DAY_MS);
  }
  if (farYears.size > 64) farYears.clear();
  farYears.set(year, row);
  return row;
}

/** The instant (UT ms) of solar term `term` in Gregorian year `year`. */
export function termMs(year: number, term: TermIndex): number {
  const slot = gregorianSlot(term);
  if (year >= TERM_FIRST_YEAR && year <= TERM_LAST_YEAR) return terms()[(year - TERM_FIRST_YEAR) * 24 + slot];
  return farYear(year)[slot];
}

export type TermMoment = { year: number; term: TermIndex; ms: number };

/** The 24 terms of a Gregorian year in the order they come, Xiaohan first. */
export function termsOfYear(year: number): TermMoment[] {
  const out: TermMoment[] = [];
  for (let slot = 0; slot < 24; slot += 1) {
    const term = termOfSlot(slot);
    out.push({ year, term, ms: termMs(year, term) });
  }
  return out;
}

/** The Gregorian (UT) year of an instant. */
const utYear = (ms: number): number => new Date(ms).getUTCFullYear();

/** The last term at or before an instant. */
export function termAtOrBefore(ms: number): TermMoment {
  const year = utYear(ms);
  for (let slot = 23; slot >= 0; slot -= 1) {
    const term = termOfSlot(slot);
    const at = termMs(year, term);
    if (at <= ms) return { year, term, ms: at };
  }
  return { year: year - 1, term: DONGZHI, ms: termMs(year - 1, DONGZHI) };
}

/** The first term after an instant. */
export function termAfter(ms: number): TermMoment {
  const year = utYear(ms);
  for (let slot = 0; slot < 24; slot += 1) {
    const term = termOfSlot(slot);
    const at = termMs(year, term);
    if (at > ms) return { year, term, ms: at };
  }
  return { year: year + 1, term: XIAOHAN, ms: termMs(year + 1, XIAOHAN) };
}

/** The last jie (a term that opens a solar month) at or before an instant. */
export function jieAtOrBefore(ms: number): TermMoment {
  const t = termAtOrBefore(ms);
  if (isJie(t.term)) return t;
  // A zhongqi never opens a Gregorian year (Xiaohan, a jie, does), so the
  // jie just before it is the term before it in the same year.
  return { year: t.year, term: t.term - 1, ms: termMs(t.year, t.term - 1) };
}

/** The first jie after an instant. */
export function jieAfter(ms: number): TermMoment {
  const t = termAfter(ms);
  if (isJie(t.term)) return t;
  // After a zhongqi comes a jie, in the next year only after Dongzhi.
  const year = t.term === DONGZHI ? t.year + 1 : t.year;
  const term = (t.term + 1) % 24;
  return { year, term, ms: termMs(year, term) };
}

// ── New moons ───────────────────────────────────────────────────────────────

/**
 * The new moon of lunation `k` (Meeus's count: 0 is 6 January 2000), UT ms.
 * From the table when it holds that lunation, otherwise from astro.ts.
 */
export function moonMs(k: number): number {
  const i = k - MOON_FIRST_K;
  if (i >= 0 && i < MOON_COUNT) return moons()[i];
  return newMoonMs(k);
}

/** The lunation number of the last new moon at or before an instant. */
export function moonAtOrBefore(ms: number): number {
  // The mean lunation lands within a day of the true one; step to the exact one.
  let k = Math.floor((jdFromMs(ms) - MEEUS_K0_JDE) / SYNODIC_DAYS);
  while (moonMs(k + 1) <= ms) k += 1;
  while (moonMs(k) > ms) k -= 1;
  return k;
}
