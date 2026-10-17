/**
 * Local birth time → the UTC instant a chart is cast for, once the
 * birthplace's zone is known (on-device plan, step 3). The same code on
 * Ulune's server and on the reader's device; only where the zone comes from
 * differs, handed in as a ZoneLookup:
 * - on the server, from the coordinates (geo-tz's full boundary map, with the
 *   geocoder's zone for the place as a tie-break: lib/chart/birth-time.server.ts);
 * - on the device, from the place search, or for typed coordinates from
 *   Ulune's server asked for that zone alone (lib/engine/zone-lookup.ts), or
 *   from the chart's own record when it is cast again.
 * The offset then comes from Ulune's own tz table with its pre-1970 history
 * (civil-time.ts). The person casting can override both: Local Mean Time of
 * the birthplace, or a fixed offset from UTC — for the cases no database gets
 * right (war time kept locally, a certificate in another zone's time), which
 * a professional has to be able to enter.
 */
import {
  canonicalZone,
  civilFromDays,
  daysFromCivil,
  daysFromJulian,
  formatUtcOffset,
  isJulianDate,
  lmtOffsetNear,
  monthLength,
  resolveWallTime,
  TZDB_VERSION,
  zoneTypeAt,
  type Wall,
} from "./civil-time";
import type { BirthInput, BirthTimeInfo } from "../chart/types";

/** A birthplace's zone and where it came from (BirthTimeInfo.zoneSource, less "chosen"). */
export type ZoneLookup = { zone: string; source: "coordinates" | "place" | "approximate" };

export type TimeZoneChoice =
  | { kind: "auto" }
  | { kind: "lmt" }
  | { kind: "offset"; seconds: number }
  | { kind: "zone"; zone: string };

/** "auto" (default), "lmt", a fixed offset "+05:30" / "-04:00" (to ±15:00), or an IANA zone; anything else is an error. */
export function parseTimeZoneChoice(raw: string | null | undefined): TimeZoneChoice {
  const s = (raw ?? "").trim().replace(/−/g, "-");
  if (!s || s === "auto") return { kind: "auto" };
  if (s.toLowerCase() === "lmt") return { kind: "lmt" };
  const m = /^(?:UTC|GMT)?\s*([+-])(\d{1,2})(?::?(\d{2}))?(?::(\d{2}))?$/i.exec(s);
  if (m) {
    const h = Number(m[2]);
    const min = Number(m[3] ?? 0);
    const sec = Number(m[4] ?? 0);
    if (h <= 15 && min < 60 && sec < 60) {
      const v = h * 3600 + min * 60 + sec;
      return { kind: "offset", seconds: m[1] === "-" ? -v : v };
    }
  }
  const zone = canonicalZone(s);
  if (zone) return { kind: "zone", zone: s };
  // An override that means nothing is refused, never silently read as "auto".
  throw new Error(`E:tz.invalid|${s.slice(0, 40)}`);
}

/**
 * The birth's wall-clock reading and the day it names. Dates before
 * 15 Oct 1582 are Julian-calendar dates (isJulianDate); the returned wall is
 * the same day in the proleptic Gregorian calendar the tz data runs on.
 */
function wallOf(date: string, time: string): { wall: Wall; days: number; julian: boolean } {
  const [year, month, day] = date.split("-").map(Number);
  const [h = "0", m = "0", sec = "0"] = time.split(":");
  const hour = Number(h);
  const minute = Number(m);
  const second = Number(sec);
  const julian = Number.isInteger(year) && isJulianDate(year, month, day);
  const ok =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= monthLength(year, month, julian) &&
    hour >= 0 &&
    hour <= 24 &&
    minute >= 0 &&
    minute < 60 &&
    second >= 0 &&
    second < 61;
  if (!ok) throw new Error("E:chart.moment.invalid");
  const days = julian ? daysFromJulian(year, month, day) : daysFromCivil(year, month, day);
  const g = civilFromDays(days);
  return { wall: { year: g.year, month: g.month, day: g.day, hour, minute, second }, days, julian };
}

export type BirthMoment = { utc: Date; info: BirthTimeInfo };

/** Resolve a birth's local date/time to UTC in the birthplace's zone, with how it was done. */
export function resolveBirthMomentIn(input: BirthInput, place: ZoneLookup): BirthMoment {
  const { wall, days, julian } = wallOf(input.date, input.time);
  const choice = parseTimeZoneChoice(input.tz);
  const localSeconds = days * 86400 + wall.hour * 3600 + wall.minute * 60 + wall.second;
  const calendar = julian ? ("julian" as const) : ("gregorian" as const);

  let utcSeconds: number;
  let info: BirthTimeInfo;
  if (choice.kind === "offset" || choice.kind === "lmt") {
    // LMT on the side of the date line the place's calendar kept then (the
    // zone's own offset around that date is the reference).
    const offset =
      choice.kind === "lmt"
        ? lmtOffsetNear(input.longitude, zoneTypeAt(place.zone, localSeconds).offset)
        : choice.seconds;
    utcSeconds = localSeconds - offset;
    info = {
      zone: place.zone,
      zoneSource: place.source,
      offset: Number(offset.toFixed(3)),
      offsetLabel: formatUtcOffset(offset),
      abbr: choice.kind === "lmt" ? "LMT" : `UTC${formatUtcOffset(offset)}`,
      dst: false,
      basis: choice.kind,
      choice: choice.kind === "lmt" ? "lmt" : formatUtcOffset(offset).replace("−", "-"),
      local: "normal",
      calendar,
      tzdb: TZDB_VERSION,
    };
  } else {
    const zone = choice.kind === "zone" ? choice.zone : place.zone;
    // An ambiguous time defaults to its second reading (after the clocks went
    // back: standard time), the app's rule since its first release; `fold: 0`
    // picks the first. Either way the chart says it was ambiguous.
    const fold = input.fold === 0 ? 0 : 1;
    const r = resolveWallTime(zone, wall, { lmtLongitude: input.longitude, fold });
    utcSeconds = r.utcSeconds;
    info = {
      zone,
      zoneSource: choice.kind === "zone" ? "chosen" : place.source,
      offset: Number(r.offset.toFixed(3)),
      offsetLabel: formatUtcOffset(r.offset),
      abbr: r.abbr,
      dst: r.dst,
      basis: r.abbr === "LMT" ? "lmt" : "zone",
      ...(choice.kind === "zone" ? { choice: zone } : {}),
      local: r.kind,
      ...(r.kind === "ambiguous"
        ? {
            fold,
            readings: r.readings.map((x) => ({
              offset: Number(x.offset.toFixed(3)),
              offsetLabel: formatUtcOffset(x.offset),
              abbr: x.abbr,
              dst: x.dst,
            })),
          }
        : {}),
      calendar,
      tzdb: TZDB_VERSION,
    };
  }
  const utc = new Date(Math.round(utcSeconds * 1000));
  if (Number.isNaN(utc.getTime())) throw new Error("E:chart.moment.invalid");
  return { utc, info };
}

/** Local wall time "YYYY-MM-DD HH:mm" of a UTC instant in a zone (bundled tzdb). */
export function formatLocalMinute(utc: Date, zone: string): string {
  const t = utc.getTime() / 1000;
  const { offset } = zoneTypeAt(canonicalZone(zone) ? zone : "Etc/UTC", Math.floor(t));
  const local = Math.floor(t + offset);
  const days = Math.floor(local / 86400);
  const secs = local - days * 86400;
  const d = civilFromDays(days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.year}-${p(d.month)}-${p(d.day)} ${p(Math.floor(secs / 3600))}:${p(Math.floor((secs % 3600) / 60))}`;
}
