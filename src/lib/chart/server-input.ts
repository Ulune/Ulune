import { z } from "zod";
import { ANGLE_IDS, HOUSE_SYSTEM_IDS, PLANET_IDS } from "./types";

/*
 * What Ulune's server accepts from a page (lib/chart/functions.ts). Every
 * string has a length, every number is a finite number in its range, every
 * list has a size, every moment falls inside the ephemeris: anything else is
 * refused before a calculation starts, so no request can hold the server for
 * long or make it answer more than a chart. The limits are the app's own,
 * with room to spare. (Zod's numbers already refuse NaN and Infinity.)
 */

/** The ephemeris files shipped cover 600 BC to 2399 AD (as /api/sky-window). */
export const FIRST_MOMENT_MS = Date.UTC(-599, 0, 1);
export const LAST_MOMENT_MS = Date.UTC(2399, 11, 31, 23, 59, 59);

/** Every body and angle a chart can hold, each at most once. */
export const BODY_IDS = [...PLANET_IDS, ...ANGLE_IDS] as const;

export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);
/** An ecliptic longitude in degrees (0–360, with room either side). */
const eclipticSchema = z.number().min(-360).max(720);

/** A moment as the page sends it (Date.toISOString), inside the ephemeris. */
export const momentSchema = z
  .string()
  .min(1)
  .max(40)
  .refine((text) => {
    const t = Date.parse(text);
    return Number.isFinite(t) && t >= FIRST_MOMENT_MS && t <= LAST_MOMENT_MS;
  }, "E:moment.range");

const houseSystemSchema = z.enum(HOUSE_SYSTEM_IDS).optional();
const localeSchema = z.enum(["en", "fr"]).optional();

const natalBodySchema = z.object({
  id: z.enum(BODY_IDS),
  name: z.string().max(40),
  ecliptic: eclipticSchema,
});

/** A chart's bodies and angles, each once. */
export const natalBodiesSchema = z
  .array(natalBodySchema)
  .max(BODY_IDS.length)
  .refine((rows) => new Set(rows.map((row) => row.id)).size === rows.length, "E:bodies.repeated");

export const natalCuspsSchema = z.array(eclipticSchema).length(12);

/** How the local birth time is read (types.ts BirthInput: zone / tz / fold). */
const birthTimeFields = {
  zone: z.string().max(64).optional(),
  tz: z.string().max(64).optional(),
  fold: z.union([z.literal(0), z.literal(1)]).optional(),
};

/** A cast: a date, a time and coordinates (never a name or a place's name). */
export const birthSchema = z.object({
  date: z.string().max(40),
  time: z.string().max(20),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  locale: localeSchema,
  houseSystem: houseSystemSchema,
  timeUnknown: z.boolean().optional(),
  ...birthTimeFields,
});

export const transitSchema = z.object({
  at: momentSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  natalCusps: natalCuspsSchema,
  natalBodies: natalBodiesSchema,
  houseSystem: houseSystemSchema,
});

/** A Timing window (the calculation itself refuses one longer than 370 days). */
export const timingSchema = z.object({
  from: momentSchema,
  to: momentSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  natalBodies: natalBodiesSchema,
});

export const progressionSchema = z.object({
  natalUtc: momentSchema,
  targetUtc: momentSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  natalCusps: natalCuspsSchema,
  natalBodies: natalBodiesSchema,
  houseSystem: houseSystemSchema,
});

export const humanDesignSchema = z.object({
  natalUtc: momentSchema,
});

/** Longest place name looked up: a place, not a paragraph. */
export const MAX_PLACE_QUERY = 100;

/** The place search's input, trimmed and cut to length (never refused). */
export function placeQuery(data: unknown): { q: string; locale: "en" | "fr" } {
  const input = (data ?? {}) as { q?: unknown; locale?: unknown };
  return {
    q: (typeof input.q === "string" ? input.q : "").slice(0, MAX_PLACE_QUERY * 4).trim().slice(0, MAX_PLACE_QUERY),
    locale: input.locale === "fr" ? "fr" : "en",
  };
}
