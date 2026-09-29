/**
 * The events table's parts (part 52 of the launch plan): a year's rows by
 * month, a month's by week (Monday to Sunday, cut at the month's ends), a
 * day's in one part, all in the calendar's time zone. The table page's bar
 * links to each part.
 */
import type { AppLocale } from "@/lib/i18n/messages";
import { dateFormat } from "@/lib/intl-cache";
import type { TimingScope } from "./transit-exact";

export type Period = {
  /** "m09" for September, "w2" for a month's second week, "day". */
  id: string;
  /** The bar's words: "Sep", "7–13 Sep", "Tue 29 Sep". */
  label: string;
  /** The part's heading: "September 2026", "7–13 September 2026", "Tuesday 29 September 2026". */
  heading: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The calendar date of an instant in a time zone: year, month (1–12), day, weekday (0 Monday). */
export function civilOf(ms: number, tz: string): { y: number; m: number; d: number; wd: number } {
  const parts = dateFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), wd: WEEKDAYS.indexOf(get("weekday")) };
}

const upper = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

/**
 * The week of a month a day falls in, Monday to Sunday: its number (0 for
 * the week of the 1st) and its first and last days, cut at the month's ends.
 */
export function weekOfMonth(d: number, wd: number, lastDay: number): { index: number; from: number; to: number } {
  // The weekday of the 1st: `d - 1` days before this one.
  const first = (((wd - (d - 1)) % 7) + 7) % 7;
  const index = Math.floor((d - 1 + first) / 7);
  return { index, from: Math.max(1, index * 7 - first + 1), to: Math.min(lastDay, index * 7 - first + 7) };
}

/** The part a row at `ms` belongs to. `monthEndMs` is an instant inside the month's last day (for a week's end). */
export function periodOf(ms: number, scope: TimingScope, tz: string, locale: AppLocale, monthEndMs: number): Period {
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const date = new Date(ms);
  if (scope === "year") {
    const { m } = civilOf(ms, tz);
    return {
      id: `m${String(m).padStart(2, "0")}`,
      label: upper(dateFormat(loc, { timeZone: tz, month: "short" }).format(date)).replace(/\.$/, ""),
      heading: upper(dateFormat(loc, { timeZone: tz, month: "long", year: "numeric" }).format(date)),
    };
  }
  if (scope === "month") {
    const c = civilOf(ms, tz);
    const last = civilOf(monthEndMs, tz).d;
    const w = weekOfMonth(c.d, c.wd, last);
    const month = (style: "short" | "long") => dateFormat(loc, { timeZone: tz, month: style }).format(date);
    const days = w.from === w.to ? String(w.from) : `${w.from}–${w.to}`;
    const year = dateFormat(loc, { timeZone: tz, year: "numeric" }).format(date);
    return { id: `w${w.index}`, label: `${days} ${month("short")}`, heading: `${days} ${month("long")} ${year}` };
  }
  return {
    id: "day",
    label: dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(date),
    heading: upper(dateFormat(loc, { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date)),
  };
}
