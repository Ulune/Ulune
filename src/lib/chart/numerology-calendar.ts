/*
 * Numerology in the Calendar (part 62 of the launch plan): the personal day,
 * month and year of any date, and the long cycles' changes as events on the
 * birthdays they fall on. From the birth date alone (no name), worked out on
 * the device like everything else in the calendar.
 */
import {
  cycleChanges,
  lifeCyclesOf,
  lifePathOf,
  parseChartDate,
  personalDayNumber,
  personalYearNumber,
  type BirthDate,
  type CycleChange,
} from "./numerology-cycles";
import { digitalRoot } from "./numerology-reduce";
import type { NatalChart } from "./types";

export type NumerologyCalendar = {
  birth: BirthDate;
  /** Every change of period, pinnacle and challenge over the life, on its birthday. */
  changes: (CycleChange & { day: string })[];
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "2031-06-15": a date as the calendar keys its days. */
export function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * The birthday in a given year. Someone born on 29 February turns a year
 * older on 1 March when the year has no 29th (as ageOn counts).
 */
export function birthdayIn(b: BirthDate, year: number): { year: number; month: number; day: number } {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (b.month === 2 && b.day === 29 && !leap) return { year, month: 3, day: 1 };
  return { year, month: b.month, day: b.day };
}

export function numerologyCalendarOf(chart: NatalChart | null | undefined): NumerologyCalendar | null {
  const b = chart ? parseChartDate(chart.meta.date) : null;
  if (!b) return null;
  const life = lifeCyclesOf(b, lifePathOf(b).digit ?? 0);
  const changes = cycleChanges(b, life).map((c) => {
    const d = birthdayIn(b, c.year);
    return { ...c, day: dayKey(d.year, d.month, d.day) };
  });
  return { birth: b, changes };
}

/** The changes whose birthday falls between two day keys (both included). */
export function changesBetween(nc: NumerologyCalendar, fromKey: string, toKey: string) {
  return nc.changes.filter((c) => c.day >= fromKey && c.day <= toKey);
}

/** The changes on one day, keyed by day for a month's cells. */
export function changesByDay(nc: NumerologyCalendar, fromKey: string, toKey: string): Map<string, NumerologyCalendar["changes"]> {
  const out = new Map<string, NumerologyCalendar["changes"]>();
  for (const c of changesBetween(nc, fromKey, toKey)) out.set(c.day, [...(out.get(c.day) ?? []), c]);
  return out;
}

export function personalDayOn(nc: NumerologyCalendar, year: number, month: number, day: number): number {
  return personalDayNumber(nc.birth, year, month, day);
}

export function personalMonthOn(nc: NumerologyCalendar, year: number, month: number): number {
  return digitalRoot(personalYearNumber(nc.birth, year) + digitalRoot(month));
}

export function personalYearOn(nc: NumerologyCalendar, year: number): number {
  return personalYearNumber(nc.birth, year);
}

/** A change's id, for its reading and its row: "numcycle:pinnacle:2". */
export function changeId(c: Pick<CycleChange, "kind" | "index">): string {
  return `numcycle:${c.kind}:${c.index}`;
}
