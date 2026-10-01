import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { dateFormat } from "@/lib/intl-cache";
import type { TimingScope } from "./transit-exact";

export type CivilDate = {
  year: number;
  month: number;
  day: number;
};

export type CivilStamp = CivilDate & {
  hour: number;
  minute: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function civilFromUtc(utc: Date, tz: string): CivilStamp {
  const z = toZonedTime(utc, tz);
  return {
    year: z.getFullYear(),
    month: z.getMonth() + 1,
    day: z.getDate(),
    hour: z.getHours(),
    minute: z.getMinutes(),
  };
}

export function utcFromCivil(civil: CivilStamp, tz: string): Date {
  const stamp = `${civil.year}-${pad(civil.month)}-${pad(civil.day)}T${pad(civil.hour)}:${pad(civil.minute)}:00`;
  return fromZonedTime(stamp, tz);
}

export function addCivilDays(civil: CivilDate, days: number): CivilDate {
  const utc = Date.UTC(civil.year, civil.month - 1, civil.day + days);
  const d = new Date(utc);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function civilKey(civil: CivilDate): string {
  return `${civil.year}-${pad(civil.month)}-${pad(civil.day)}`;
}

export function monthKey(civil: Pick<CivilDate, "year" | "month">): string {
  return `${civil.year}-${pad(civil.month)}`;
}

export function parseCivilKey(key: string): CivilDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Monday = 0 … Sunday = 6 for this civil date (noon UTC, DST-safe). */
export function mondayIndex(civil: CivilDate): number {
  const utc = Date.UTC(civil.year, civil.month - 1, civil.day, 12);
  const sun = new Date(utc).getUTCDay();
  return (sun + 6) % 7;
}

export function scopeBounds(
  scope: TimingScope,
  civil: CivilDate,
  tz: string,
): { from: Date; to: Date } {
  if (scope === "day") {
    const from = utcFromCivil({ ...civil, hour: 0, minute: 0 }, tz);
    const next = addCivilDays(civil, 1);
    const to = utcFromCivil({ ...next, hour: 0, minute: 0 }, tz);
    return { from, to };
  }
  if (scope === "month") {
    const from = utcFromCivil({ year: civil.year, month: civil.month, day: 1, hour: 0, minute: 0 }, tz);
    const nextMonth = civil.month === 12 ? { year: civil.year + 1, month: 1 } : { year: civil.year, month: civil.month + 1 };
    const to = utcFromCivil({ year: nextMonth.year, month: nextMonth.month, day: 1, hour: 0, minute: 0 }, tz);
    return { from, to };
  }
  const from = utcFromCivil({ year: civil.year, month: 1, day: 1, hour: 0, minute: 0 }, tz);
  const to = utcFromCivil({ year: civil.year + 1, month: 1, day: 1, hour: 0, minute: 0 }, tz);
  return { from, to };
}

export function yearBounds(year: number, tz: string): { from: Date; to: Date } {
  return scopeBounds("year", { year, month: 1, day: 1 }, tz);
}

/**
 * The period before or after: a day, or the same day of the next month or
 * year (the 31st becomes the month's last day). If that period holds
 * `today`, it lands on today, so a reader going back and forth finds today
 * again and the day view opens on it.
 */
export function shiftCivil(scope: TimingScope, civil: CivilDate, dir: 1 | -1, today?: CivilDate): CivilDate {
  if (scope === "day") return addCivilDays(civil, dir);
  let { year, month } = civil;
  if (scope === "month") {
    month += dir;
    if (month < 1) {
      year -= 1;
      month = 12;
    } else if (month > 12) {
      year += 1;
      month = 1;
    }
  } else {
    year += dir;
  }
  if (today && today.year === year && (scope === "year" || today.month === month)) return { ...today };
  return { year, month, day: Math.min(civil.day, daysInMonth(year, month)) };
}

/** A month or year opened: today if the period holds it, else the date given. */
export function landOnToday(scope: TimingScope, civil: CivilDate, today: CivilDate): CivilDate {
  if (scope === "day") return civil;
  if (today.year === civil.year && (scope === "year" || today.month === civil.month)) return { ...today };
  return civil;
}

export function hitsInScope<T extends { exactUtc: string }>(
  hits: T[],
  fromMs: number,
  toMs: number,
): T[] {
  // Each time is parsed once, not twice per comparison inside the sort.
  const inScope: Array<{ t: number; hit: T }> = [];
  for (const hit of hits) {
    const t = Date.parse(hit.exactUtc);
    if (Number.isFinite(t) && t >= fromMs && t < toMs) inScope.push({ t, hit });
  }
  inScope.sort((a, b) => a.t - b.t || a.hit.exactUtc.localeCompare(b.hit.exactUtc));
  return inScope.map((row) => row.hit);
}

export function localHourFraction(exactUtc: string, tz: string): number | null {
  const t = Date.parse(exactUtc);
  if (!Number.isFinite(t)) return null;
  const c = civilFromUtc(new Date(t), tz);
  return (c.hour + c.minute / 60) / 24;
}

export function timingWhen(
  iso: string,
  tz: string,
  locale: "en" | "fr",
  kind: "time" | "day" | "table",
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const time = () =>
    dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  const day = () => dateFormat(loc, { timeZone: tz, day: "numeric", month: "short" }).format(d);
  if (kind === "time") return time();
  if (kind === "day") return day();
  return `${day()} · ${time()}`;
}
