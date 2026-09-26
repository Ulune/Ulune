/**
 * Birth place + local birth time → the UTC instant a chart is cast for.
 *
 * The zone comes from the coordinates (geo-tz, the full timezone-boundary-
 * builder polygons that keep one zone per country, so pre-1970 history
 * survives), with the geocoder's zone for the place as a tie-break; the
 * offset from the bundled tz database with its pre-1970 history
 * (civil-time.server.ts). The person casting can override both: Local Mean
 * Time of the birthplace, or a fixed offset from UTC — for the cases no
 * database gets right (war time kept locally, a certificate in another
 * zone's time), which a professional has to be able to enter.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import tzlookup from "tz-lookup";
import {
  canonicalZone,
  formatUtcOffset,
  lmtOffsetNear,
  resolveWallTime,
  TZDB_VERSION,
  zoneTypeAt,
  daysFromCivil,
  daysFromJulian,
  civilFromDays,
  isJulianDate,
  monthLength,
  type Wall,
} from "./civil-time.server";
import type { BirthInput, BirthTimeInfo } from "./types";

export type ZoneLookup = { zone: string; source: "coordinates" | "place" | "approximate" };

const GEO_DATA = "timezones.geojson.geo.dat";

/**
 * Where geo-tz's boundary polygons are: next to a deployed server function
 * (scripts/copy-server-assets.mjs copies them to ./geo-tz), or the package.
 */
function geoTzDataDir(): string | undefined {
  return [join(process.cwd(), "geo-tz"), join(process.cwd(), "node_modules/geo-tz/data")].find((dir) =>
    existsSync(join(dir, GEO_DATA)),
  );
}

type FindZones = (lat: number, lon: number) => string[];
let findZones: Promise<FindZones | null> | null = null;

/**
 * geo-tz's comprehensive dataset (one zone per country, pre-1970 history
 * kept), loaded once — and tried again on the next cast if it failed.
 */
async function geoTz(): Promise<FindZones | null> {
  findZones ??= (async () => {
    const dir = geoTzDataDir();
    if (!dir) {
      console.warn("[ulune] geo-tz boundary data not found; time zones fall back to a coarse lookup.");
      return null;
    }
    // geo-tz reads the path once, when it loads.
    process.env.GEO_TZ_DATA_PATH ??= dir;
    try {
      const mod = (await import("geo-tz/all")) as { find: FindZones; default?: { find: FindZones } };
      return mod.find ?? mod.default?.find ?? null;
    } catch (err) {
      console.warn(`[ulune] geo-tz failed to load (${err instanceof Error ? err.message : err}).`);
      return null;
    }
  })();
  const find = await findZones;
  if (!find) findZones = null;
  return find;
}

/** The IANA zone of a place (never throws; UTC only if nothing knows the place). */
export async function zoneAt(latitude: number, longitude: number, hint?: string | null): Promise<ZoneLookup> {
  const placeZone = canonicalZone(hint ?? null) ? (hint as string) : null;
  try {
    const find = await geoTz();
    const found = find ? find(latitude, longitude).filter((z) => canonicalZone(z)) : [];
    if (found.length) {
      // A coastal town's centre can fall a few metres offshore, into a
      // nautical Etc/ zone: the place's own zone is the right one then.
      if (placeZone && (found.includes(placeZone) || found.every((z) => z.startsWith("Etc/")))) {
        return { zone: placeZone, source: "place" };
      }
      return { zone: found[0], source: "coordinates" };
    }
  } catch (err) {
    console.warn(`[ulune] geo-tz lookup failed (${err instanceof Error ? err.message : err}); falling back.`);
  }
  if (placeZone) return { zone: placeZone, source: "place" };
  try {
    const approx = tzlookup(latitude, longitude);
    if (canonicalZone(approx)) return { zone: approx, source: "approximate" };
  } catch {
    /* out of range */
  }
  return { zone: "Etc/UTC", source: "approximate" };
}

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

/** Resolve a birth's local date/time and place to UTC, with how it was done. */
export async function resolveBirthMoment(input: BirthInput): Promise<BirthMoment> {
  const place = await zoneAt(input.latitude, input.longitude, input.zone);
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
