/*
 * The Chinese lunisolar calendar (農曆), by the rules of the modern calendar
 * (in use since 1645, written down as the Chinese standard GB/T 33661-2017):
 *
 *  1. A month begins on the day of a new moon, the day counted in China's
 *     standard time (UTC+8, the 120° E meridian; Beijing's mean time for
 *     1913–1928, see calendarOffsetMinutes).
 *  2. The month that holds the winter solstice (Dongzhi, the Sun at 270°)
 *     is month 11.
 *  3. When the span from one month 11 to the next holds 13 months, the first
 *     of them with no principal term (zhongqi, the Sun at a multiple of 30°)
 *     is a leap month, and takes the number of the month before it.
 *  4. Lunar New Year is the first day of month 1.
 *
 * Applied with the exact terms and new moons of terms.ts, these rules give
 * the calendar China publishes, including the leap month after month 11 in
 * 2033 that older shortcuts get wrong. Before 1645 China used other rules,
 * and the Qing observatory's calendars (to that of 1912) were computed with
 * the astronomy of the time; dates there follow the modern rules applied
 * backwards, which differ now and then by a day (README.md).
 *
 * Days are numbered from 1 January 1970 (day 0), so a day number times a
 * day in milliseconds is that date's midnight UTC; the Julian day number is
 * the day number + 2440588.
 */
import { DAY_MS } from "./astro";
import { DONGZHI, moonAtOrBefore, moonMs, termMs } from "./terms";

/** China's standard time, minutes east of Greenwich: the clock of the calendar's days (120° E). */
export const CALENDAR_OFFSET_MINUTES = 480;
/** Beijing's mean time (the observatory at 116°25′ E): the clock of the calendars of 1913–1928. */
export const BEIJING_OFFSET_MINUTES = (116 + 25 / 60) * 4;
/** 1 January 1913, 0h Beijing mean time: the first calendar computed by the Republic's observatory. */
export const BEIJING_FROM_MS = Date.UTC(1912, 11, 31, 24) - BEIJING_OFFSET_MINUTES * 60_000;
/** 1 January 1929, 0h China's standard time: from here the calendar is reckoned at 120° E. */
export const BEIJING_TO_MS = Date.UTC(1928, 11, 31, 16);

/**
 * The calendar's clock at an instant, minutes east of Greenwich: China's
 * standard time (120° E), except for 1913–1928, whose calendars the
 * Republic's Central Observatory computed for Beijing's meridian. That is
 * what the Hong Kong Observatory's tables show: Lunar New Year 1916 on
 * 3 February (the new moon came at 23:51 in Beijing, 00:05 at 120° E), and
 * the tenth month of 1914 and of 1920 a day earlier than 120° E would give.
 * The Qing calendars before 1913 were computed with the astronomy of their
 * day; the rules at 120° E match them better than Beijing's meridian
 * (README.md).
 */
export const calendarOffsetMinutes = (ms: number): number =>
  ms >= BEIJING_FROM_MS && ms < BEIJING_TO_MS ? BEIJING_OFFSET_MINUTES : CALENDAR_OFFSET_MINUTES;

/** The calendar day (day number) an instant falls on in China's clock. */
export const calendarDayOf = (ms: number): number =>
  Math.floor((ms + calendarOffsetMinutes(ms) * 60_000) / DAY_MS);

/** The day number of an instant's date on a clock `offsetMinutes` east of Greenwich. */
export const dayNumberOf = (ms: number, offsetMinutes = 0): number =>
  Math.floor((ms + offsetMinutes * 60_000) / DAY_MS);

/** The Julian day number of day 0 (1 January 1970). */
export const JDN_OF_DAY_0 = 2440588;

export type LunarMonth = {
  /** Day number of the month's first day. */
  start: number;
  /** 29 or 30 days. */
  length: number;
  /** 1–12. */
  month: number;
  /** A leap month repeats the number of the month before it. */
  leap: boolean;
  /** The lunar year the month belongs to, named by the Gregorian year its New Year falls in. */
  year: number;
};

export type LunarDate = {
  /** The lunar year, named by the Gregorian year its New Year falls in (2026 for the year that began on 17 February 2026). */
  year: number;
  /** 1–12. */
  month: number;
  leap: boolean;
  /** 1–30. */
  day: number;
  /** 29 or 30. */
  monthLength: number;
  /** The year's place in the sixty-cycle, 0 (Jia-Zi) to 59. */
  yearCycle: number;
};

/** The sixty-cycle place of a year: 1984 was Jia-Zi (0). */
export const yearCycleOf = (year: number): number => (((year - 1984) % 60) + 60) % 60;

/** Lunation number (terms.ts) of the new moon that starts month 11 of the year whose winter solstice falls in Gregorian year `year`. */
function month11(year: number): number {
  const solstice = termMs(year, DONGZHI);
  const day = calendarDayOf(solstice);
  let k = moonAtOrBefore(solstice);
  // A new moon later on the solstice's own day still starts the month that holds it.
  while (calendarDayOf(moonMs(k + 1)) <= day) k += 1;
  return k;
}

/** The principal terms from Dongzhi of `year` to Xiaoxue of the next: the twelve a suì can hold. */
function zhongqiDays(year: number): number[] {
  const days = [calendarDayOf(termMs(year, DONGZHI))];
  // Dahan (23), then Yushui (1) to Xiaoxue (19): the odd terms of the next Gregorian year.
  days.push(calendarDayOf(termMs(year + 1, 23)));
  for (let term = 1; term <= 19; term += 2) days.push(calendarDayOf(termMs(year + 1, term)));
  return days;
}

const suiCache = new Map<number, LunarMonth[]>();

/**
 * The months of a suì: from the month 11 that holds the winter solstice of
 * Gregorian year `year` up to (not including) the next month 11. 12 or 13
 * months; with 13, one is a leap month.
 */
export function suiMonths(year: number): LunarMonth[] {
  const cached = suiCache.get(year);
  if (cached) return cached;
  const k0 = month11(year);
  const k1 = month11(year + 1);
  const starts: number[] = [];
  for (let k = k0; k <= k1; k += 1) starts.push(calendarDayOf(moonMs(k)));
  const count = k1 - k0;
  let leapAt = -1;
  if (count === 13) {
    const zq = zhongqiDays(year);
    for (let i = 1; i < count; i += 1) {
      if (!zq.some((d) => d >= starts[i] && d < starts[i + 1])) {
        leapAt = i;
        break;
      }
    }
  }
  const months: LunarMonth[] = [];
  let number = 11;
  let seenFirst = false;
  for (let i = 0; i < count; i += 1) {
    const leap = i === leapAt;
    if (i > 0 && !leap) number = (number % 12) + 1;
    if (number === 1 && !leap) seenFirst = true;
    months.push({
      start: starts[i],
      length: starts[i + 1] - starts[i],
      month: number,
      leap,
      year: seenFirst ? year + 1 : year,
    });
  }
  if (suiCache.size > 200) suiCache.clear();
  suiCache.set(year, months);
  return months;
}

/** The Gregorian (proleptic) year of a day number. */
const yearOfDay = (day: number): number => new Date(day * DAY_MS).getUTCFullYear();

/** The lunar month a day falls in. */
export function lunarMonthOfDay(day: number): LunarMonth {
  let months = suiMonths(yearOfDay(day));
  if (day < months[0].start) months = suiMonths(yearOfDay(day) - 1);
  for (let i = months.length - 1; i >= 0; i -= 1) {
    if (day >= months[i].start) return months[i];
  }
  throw new Error(`No lunar month holds day ${day}.`);
}

/** The lunar date of a calendar day (day number). The date-to-date conversion a printed table gives. */
export function lunarDateOfDay(day: number): LunarDate {
  const m = lunarMonthOfDay(day);
  return {
    year: m.year,
    month: m.month,
    leap: m.leap,
    day: day - m.start + 1,
    monthLength: m.length,
    yearCycle: yearCycleOf(m.year),
  };
}

/** The lunar date of an instant, the day counted on the calendar's clock (UTC+8; Beijing's for 1913–1928). */
export const lunarDateAt = (ms: number): LunarDate => lunarDateOfDay(calendarDayOf(ms));

/** The months of lunar year `year`, from its New Year to the day before the next. */
export function lunarYearMonths(year: number): LunarMonth[] {
  return [...suiMonths(year - 1), ...suiMonths(year)].filter((m) => m.year === year);
}

/** The day number of Lunar New Year (month 1, day 1) of lunar year `year`. */
export function lunarNewYearDay(year: number): number {
  const first = suiMonths(year - 1).find((m) => m.month === 1 && !m.leap);
  if (!first) throw new Error(`No first month found for ${year}.`);
  return first.start;
}

/** The day number of a lunar date, or null if that date does not exist (a leap month that year lacks, a day 30 in a short month). */
export function dayOfLunarDate(year: number, month: number, day: number, leap = false): number | null {
  const m = lunarYearMonths(year).find((x) => x.month === month && x.leap === leap);
  if (!m || day < 1 || day > m.length) return null;
  return m.start + day - 1;
}

/** The leap month of lunar year `year` (its number), or 0 if the year has none. */
export function leapMonthOf(year: number): number {
  return lunarYearMonths(year).find((m) => m.leap)?.month ?? 0;
}
