/**
 * Birth place + local birth time → the UTC instant a chart is cast for, on
 * Ulune's server.
 *
 * The zone comes from the coordinates (geo-tz, the full timezone-boundary-
 * builder polygons that keep one zone per country, so pre-1970 history
 * survives), with the geocoder's zone for the place as a tie-break. The rest
 * (the offset from the bundled tz database with its pre-1970 history, the
 * reader's overrides: Local Mean Time of the birthplace, a fixed offset) is
 * the code the reader's device runs too (lib/engine/birth-time.ts, on-device
 * plan, step 3); the device gets its zone from the place search, or asks this
 * server for the zone of typed coordinates alone (lib/engine/zone-lookup.ts).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import tzlookup from "tz-lookup";
import { canonicalZone } from "../engine/civil-time";
import { resolveBirthMomentIn, type BirthMoment, type ZoneLookup } from "../engine/birth-time";
import type { BirthInput } from "./types";

export { formatLocalMinute, parseTimeZoneChoice } from "../engine/birth-time";
export type { BirthMoment, TimeZoneChoice, ZoneLookup } from "../engine/birth-time";

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

/** Resolve a birth's local date/time and place to UTC, with how it was done. */
export async function resolveBirthMoment(input: BirthInput): Promise<BirthMoment> {
  const place = await zoneAt(input.latitude, input.longitude, input.zone);
  return resolveBirthMomentIn(input, place);
}
