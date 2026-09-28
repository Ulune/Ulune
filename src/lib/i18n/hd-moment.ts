import type { AppLocale } from "./messages";

/**
 * When a column was taken, in the birth place's time: "6 Oct 1999, 02:48 BST".
 * Without a birth time, the day only.
 */
export function hdMomentLabel(utc: string, timezone: string | undefined, locale: AppLocale, withTime: boolean): string {
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return "";
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  const tag = locale === "fr" ? "fr-FR" : "en-GB";
  try {
    return new Intl.DateTimeFormat(tag, { ...opts, timeZone: timezone || "UTC" }).format(d);
  } catch {
    return new Intl.DateTimeFormat(tag, { ...opts, timeZone: "UTC" }).format(d);
  }
}
