/*
 * The four pillars (四柱) of a birth: year, month, day and hour, each a
 * Heavenly Stem over an Earthly Branch, a place 0–59 in the sixty-cycle
 * (0 = Jia-Zi 甲子, 1 = Yi-Chou 乙丑 … 59 = Gui-Hai 癸亥).
 *
 * Year and month are read from the instant against the solar terms, so no
 * clock or time zone can move them: the year turns at the exact moment of
 * Lichun (the Sun at 315°), each month at its jie. Day and hour follow the
 * birthplace's own clock: true solar time by default (the Sun's hour at that
 * longitude), local mean time or the civil clock on request. The day turns
 * at 23:00 by default, the start of the Rat hour, as the Zi Ping school
 * counts; midnight and the split Rat hour are there for readers of other
 * schools. README.md sets out each choice.
 */
import { DAY_MS, equationOfTimeMinutes } from "./astro";
import { JDN_OF_DAY_0, dayNumberOf, lunarDateOfDay, lunarNewYearDay, yearCycleOf, type LunarDate } from "./lunar";
import { LICHUN, jieAfter, jieAtOrBefore, termMs } from "./terms";

export type Pillar = {
  /** Place in the sixty-cycle, 0 (Jia-Zi) to 59 (Gui-Hai). */
  cycle: number;
  /** Heavenly Stem, 0 (Jia 甲) to 9 (Gui 癸). */
  stem: number;
  /** Earthly Branch, 0 (Zi 子, Rat) to 11 (Hai 亥, Pig). */
  branch: number;
};

/** A place in the sixty-cycle as its stem and branch. */
export const pillarOf = (cycle: number): Pillar => {
  const c = ((cycle % 60) + 60) % 60;
  return { cycle: c, stem: c % 10, branch: c % 12 };
};

/** The place of a stem and branch in the sixty-cycle; only pairs of the same polarity exist (both even or both odd). */
export function cycleOf(stem: number, branch: number): number {
  if ((stem - branch) % 2 !== 0) throw new Error(`Stem ${stem} and branch ${branch} never meet in the sixty-cycle.`);
  return (((6 * stem - 5 * branch) % 60) + 60) % 60;
}

// ── Year and month: instants against the terms ──────────────────────────────

const utYear = (ms: number): number => new Date(ms).getUTCFullYear();

/** The Gregorian year whose Lichun opened the solar year an instant is in. */
export function solarYearOf(ms: number): number {
  const year = utYear(ms);
  return ms >= termMs(year, LICHUN) ? year : year - 1;
}

/** The year pillar: changes at the exact instant of Lichun. */
export const yearPillarAt = (ms: number): Pillar => pillarOf(yearCycleOf(solarYearOf(ms)));

export type SolarMonth = {
  /** The solar year the month belongs to (the Ox month, from Xiaohan, ends the year that began at the last Lichun). */
  year: number;
  /** 0 = the Tiger month (寅, from Lichun) … 10 = the Rat month (子, from Daxue), 11 = the Ox month (丑, from Xiaohan). */
  index: number;
  /** The jie that opened it and the one that closes it, UT ms. */
  fromMs: number;
  toMs: number;
};

/** The solar month of an instant, between two jie. */
export function solarMonthAt(ms: number): SolarMonth {
  const open = jieAtOrBefore(ms);
  const close = jieAfter(ms);
  // Lichun (term 0) opens month 0, Jingzhe (2) month 1 … Xiaohan (22) month 11.
  return { year: solarYearOf(ms), index: open.term / 2, fromMs: open.ms, toMs: close.ms };
}

/**
 * The month pillar. The branches run from Yin (Tiger) at Lichun; the stems
 * follow from the year's by the classical rule of the "five tigers" (五虎遁:
 * a Jia or Ji year opens with Bing-Yin, Yi or Geng with Wu-Yin, and so on),
 * which is the same as counting months unbroken through the sixty-cycle,
 * twelve a year, from Bing-Yin in the Tiger month of 1984.
 */
const monthPillarOf = (m: SolarMonth): Pillar => pillarOf(12 * (m.year - 1984) + m.index + 2);

export const monthPillarAt = (ms: number): Pillar => monthPillarOf(solarMonthAt(ms));

// ── Day and hour: the birthplace's clock ────────────────────────────────────

/**
 * The clock the day and hour are read on.
 * - "true-solar": the Sun's own time at the birthplace (local mean time
 *   corrected by the equation of time), as the classical texts mean the hours.
 * - "local-mean": 4 minutes per degree of longitude from Greenwich.
 * - "civil": the time on the birth certificate (needs `utcOffsetMinutes`).
 */
export type Clock = "true-solar" | "local-mean" | "civil";

/**
 * When the day pillar changes.
 * - "23:00": at the start of the Rat hour (子時); 23:00–01:00 is the Rat hour
 *   of the next day, for both pillars (the Zi Ping rule, the default).
 * - "split": at midnight, but 23:00–24:00 is the "late Rat" (夜子時): the day
 *   pillar stays, the hour pillar is already the next day's Rat hour.
 * - "midnight": at midnight, and the hours restart with it: 23:00–24:00 is a
 *   Rat hour counted from the same day, like 00:00–01:00.
 */
export type DayBoundary = "23:00" | "split" | "midnight";

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** Local mean time at a longitude (degrees, east positive), as milliseconds on that clock. */
export const localMeanMs = (ms: number, longitude: number): number => ms + longitude * 4 * MINUTE_MS;

/** True solar time at a longitude, as milliseconds on that clock: noon is the Sun's crossing of the meridian. */
export const trueSolarMs = (ms: number, longitude: number): number =>
  localMeanMs(ms, longitude) + equationOfTimeMinutes(ms) * MINUTE_MS;

/**
 * The day pillar of a day number (days from 1 January 1970): the Julian day
 * number + 49, modulo 60, the count that makes 1 January 2000 Wu-Wu (54) and
 * 1 October 1949 Jia-Zi (0), as published.
 */
export const dayPillarOfDay = (day: number): Pillar => pillarOf(day + JDN_OF_DAY_0 + 49);

/** The Earthly Branch of the double hour a clock time falls in: Zi from 23:00 to 01:00, Chou from 01:00, … Hai from 21:00. */
export function hourBranchOf(localMs: number): number {
  const minutes = (((localMs % DAY_MS) + DAY_MS) % DAY_MS) / MINUTE_MS;
  return Math.floor((minutes + 60) / 120) % 12;
}

/**
 * The hour pillar of a double hour in a day: its stem follows the day's by
 * the rule of the "five rats" (五鼠遁: a Jia or Ji day starts with Jia-Zi, Yi
 * or Geng with Bing-Zi…), the same as counting hours unbroken through the
 * sixty-cycle, twelve a day.
 */
export const hourPillarOf = (day: Pillar, branch: number): Pillar => pillarOf(12 * day.cycle + branch);

// ── A birth ─────────────────────────────────────────────────────────────────

/**
 * A birth as the engine needs it. There is no latitude: the southern
 * hemisphere is read like the northern (the mainstream view, and the owner's
 * choice), with the seasons of the terms as they are.
 */
export type BirthMoment = {
  /** The birth instant, milliseconds since 1970 (UT), from the time-zone history as for a natal chart. */
  ms: number;
  /** The birthplace's longitude, degrees, east positive. */
  longitude: number;
  /** The civil clock's offset from UT at the birth, minutes east (+60 for Paris in winter). Needed for the civil clock; also dates the lunar birthday. */
  utcOffsetMinutes?: number;
  /** No birth time: `ms` is the day's noon, as for a natal chart, and the hour pillar is left out. */
  timeUnknown?: boolean;
};

export type PillarOptions = {
  clock?: Clock;
  dayBoundary?: DayBoundary;
  /** A pillar this close to a change (minutes) is marked uncertain. */
  nearMinutes?: number;
};

/** How close to a boundary a birth is marked uncertain, by default: birth times are seldom known closer. */
export const NEAR_MINUTES = 5;

export type FourPillars = {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  /** Null without a birth time. */
  hour: Pillar | null;
  /** The Gregorian year whose Lichun opened the pillar year. */
  solarYear: number;
  /** 0 = Tiger month (from Lichun) … 11 = Ox month (from Xiaohan). */
  solarMonth: number;
  clock: Clock;
  dayBoundary: DayBoundary;
  /** The birth on the chosen clock, as milliseconds (the instant moved by the clock's offset). */
  localMs: number;
  /** The equation of time at the birth, minutes (true solar time minus local mean time). */
  equationOfTime: number;
  /** The birthplace's calendar date (civil clock if known, otherwise local mean time) in the Chinese calendar: the lunar birthday. */
  lunar: LunarDate;
  /** The year's animal as a branch (0 = Rat): by Lichun, as BaZi and Feng Shui count, and by Lunar New Year, as most people learned it. */
  animal: { lichun: number; lunarNewYear: number };
  /**
   * Minutes from the nearest change of each kind, signed (positive: the birth
   * is after it): Lichun, the nearest jie, the day's turn, the hour's edge,
   * and the local midnight that begins Lunar New Year. Null where it does not
   * apply (no birth time).
   */
  margins: { year: number; month: number; day: number | null; hour: number | null; lunarYear: number };
  /** Pillars another reading of the birth time could change: within `nearMinutes` of a change, or anywhere in the day without a birth time. */
  uncertain: { year: boolean; month: boolean; day: boolean; hour: boolean; lunarYear: boolean };
};

/** The clock's time for an instant, as milliseconds on that clock. */
function clockMs(birth: BirthMoment, clock: Clock, ms = birth.ms): number {
  if (clock === "civil") {
    if (birth.utcOffsetMinutes === undefined) throw new Error("The civil clock needs the birth's UTC offset.");
    return ms + birth.utcOffsetMinutes * MINUTE_MS;
  }
  return clock === "local-mean" ? localMeanMs(ms, birth.longitude) : trueSolarMs(ms, birth.longitude);
}

/** The day pillar's day number for a clock time under a boundary rule. */
const pillarDay = (localMs: number, boundary: DayBoundary): number =>
  Math.floor((localMs + (boundary === "23:00" ? HOUR_MS : 0)) / DAY_MS);

/** The hour pillar for a clock time under a boundary rule. */
function hourPillarAt(localMs: number, boundary: DayBoundary): Pillar {
  const branch = hourBranchOf(localMs);
  // The late Rat hour of the split school already belongs to tomorrow's hours.
  const day = boundary === "midnight" ? pillarDay(localMs, "midnight") : pillarDay(localMs, "23:00");
  return hourPillarOf(dayPillarOfDay(day), branch);
}

/** Signed minutes from the nearer of two boundaries around an instant. */
const nearest = (ms: number, before: number, after: number): number =>
  ms - before <= after - ms ? (ms - before) / MINUTE_MS : (ms - after) / MINUTE_MS;

/** The four pillars of a birth. */
export function fourPillars(birth: BirthMoment, options: PillarOptions = {}): FourPillars {
  const clock = options.clock ?? "true-solar";
  const dayBoundary = options.dayBoundary ?? "23:00";
  const near = options.nearMinutes ?? NEAR_MINUTES;
  const { ms } = birth;
  const local = clockMs(birth, clock);

  const solarYear = solarYearOf(ms);
  const month = solarMonthAt(ms);
  const day = dayPillarOfDay(pillarDay(local, dayBoundary));
  const hour = birth.timeUnknown ? null : hourPillarAt(local, dayBoundary);

  // The lunar birthday is the birthplace's calendar date (on the civil clock
  // when it is known), looked up in China's calendar, as a reader would.
  const dateOffset = birth.utcOffsetMinutes ?? birth.longitude * 4;
  const lunar = lunarDateOfDay(dayNumberOf(ms, dateOffset));

  // How far the birth is from each change, in minutes.
  const yearMargin = nearest(ms, termMs(solarYear, LICHUN), termMs(solarYear + 1, LICHUN));
  const monthMargin = nearest(ms, month.fromMs, month.toMs);
  const shift = dayBoundary === "23:00" ? HOUR_MS : 0;
  const dayStart = Math.floor((local + shift) / DAY_MS) * DAY_MS - shift;
  const dayMargin = nearest(local, dayStart, dayStart + DAY_MS);
  const hourStart = Math.floor((local + HOUR_MS) / (2 * HOUR_MS)) * 2 * HOUR_MS - HOUR_MS;
  const hourMargin = nearest(local, hourStart, hourStart + 2 * HOUR_MS);
  const dateMs = ms + dateOffset * MINUTE_MS;
  const lunarYearMargin = nearest(
    dateMs,
    lunarNewYearDay(lunar.year) * DAY_MS,
    lunarNewYearDay(lunar.year + 1) * DAY_MS,
  );

  let uncertain: FourPillars["uncertain"];
  if (birth.timeUnknown) {
    // Without a time, `ms` is the day's noon and the birth may be anywhere
    // in the twelve hours either side: a pillar is uncertain if it changes there.
    const inDay = (margin: number) => Math.abs(margin) < 12 * 60;
    const from = clockMs(birth, clock, ms - 12 * HOUR_MS);
    const to = clockMs(birth, clock, ms + 12 * HOUR_MS - 1);
    uncertain = {
      year: inDay(yearMargin),
      month: inDay(monthMargin),
      day: pillarDay(from, dayBoundary) !== pillarDay(to, dayBoundary),
      hour: true,
      lunarYear: inDay(lunarYearMargin),
    };
  } else {
    const close = (margin: number) => Math.abs(margin) <= near;
    uncertain = {
      year: close(yearMargin),
      month: close(monthMargin),
      day: close(dayMargin),
      hour: close(hourMargin),
      lunarYear: close(lunarYearMargin),
    };
  }

  return {
    year: pillarOf(yearCycleOf(solarYear)),
    month: monthPillarOf(month),
    day,
    hour,
    solarYear,
    solarMonth: month.index,
    clock,
    dayBoundary,
    localMs: local,
    equationOfTime: equationOfTimeMinutes(ms),
    lunar,
    animal: { lichun: yearCycleOf(solarYear) % 12, lunarNewYear: lunar.yearCycle % 12 },
    margins: {
      year: yearMargin,
      month: monthMargin,
      day: birth.timeUnknown ? null : dayMargin,
      hour: birth.timeUnknown ? null : hourMargin,
      lunarYear: lunarYearMargin,
    },
    uncertain,
  };
}
