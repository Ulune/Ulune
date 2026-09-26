/**
 * How a chart's local birth time was read, for display and export: the zone
 * and the offset from UTC in force (or Local Mean Time / a fixed offset),
 * and the Universal Time the chart was cast for.
 */
import { translate, type AppLocale } from "@/lib/i18n/messages";
import type { NatalChart } from "./types";

type Meta = NatalChart["meta"];

/** "Europe/Oslo · UTC+02:00 CEST (summer time)"; "Local Mean Time · UTC−05:15:31"; "UTC+05:30 (fixed offset)". */
export function birthZoneLine(meta: Meta, locale: AppLocale): string {
  const bt = meta.birthTime;
  if (!bt) return meta.timezone;
  if (bt.basis === "offset") return `UTC${bt.offsetLabel} (${translate(locale, "tzFixedOffset")})`;
  if (bt.basis === "lmt") return `${translate(locale, "tzLmtShort")} · UTC${bt.offsetLabel}`;
  // Numeric abbreviations ("+03", "-01") only repeat the offset.
  const abbr = /^[+-]\d/.test(bt.abbr) ? "" : ` ${bt.abbr}`;
  const summer = bt.dst ? ` (${translate(locale, "tzSummerTime")})` : "";
  const flag =
    bt.local === "ambiguous"
      ? ` · ${translate(locale, bt.fold === 0 ? "tzRepeatedFirst" : "tzRepeatedSecond")}`
      : bt.local === "nonexistent"
        ? ` · ${translate(locale, "tzSkipped")}`
        : "";
  return `${bt.zone.replace(/_/g, " ")} · UTC${bt.offsetLabel}${abbr}${summer}${flag}`;
}

/** "1990-06-15 12:30:00 UT" (tenths of a second when the offset had them, as Local Mean Time does). */
export function universalTimeLine(meta: Meta): string {
  const m = /^([+-]?\d+-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d+))?Z$/.exec(meta.utc);
  if (!m) return meta.utc;
  const tenths = m[3] && Number(m[3]) !== 0 ? `.${m[3].slice(0, 1)}` : "";
  return `${m[1]} ${m[2]}${tenths} UT`;
}

/** "JD 2448058.020833 · ΔT 56.9 s" when the chart carries them. */
export function julianDayLine(meta: Meta): string | null {
  if (meta.jdUt == null) return null;
  const dt = meta.deltaT != null ? ` · ΔT ${meta.deltaT.toFixed(1)} s` : "";
  return `JD ${meta.jdUt.toFixed(6)}${dt}`;
}
