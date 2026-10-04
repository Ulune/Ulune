/**
 * The Davison chart (review 3 Oct, P6): Ronald Davison's relationship
 * chart, a real moment and place: the moment halfway between the two births
 * (in universal time) and the place halfway between the two birthplaces (the
 * mean of the latitudes and of the longitudes, the shorter way round, as
 * Davison set it out). Cast like a birth chart, so motion, declination and
 * dignities hold on it, unlike the composite's midpoints.
 */
import type { NatalChart } from "./types";

const wrap180 = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;

export type DavisonMoment = {
  utc: Date;
  latitude: number;
  longitude: number;
  /** Either birth time unknown: the moment is a noon placeholder's midpoint. */
  timeUnknown: boolean;
};

export function davisonMoment(a: NatalChart, b: NatalChart): DavisonMoment | null {
  const ta = Date.parse(a.meta.utc);
  const tb = Date.parse(b.meta.utc);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  const d = wrap180(b.meta.longitude - a.meta.longitude);
  return {
    utc: new Date(Math.round((ta + tb) / 2 / 1000) * 1000),
    latitude: (a.meta.latitude + b.meta.latitude) / 2,
    longitude: wrap180(a.meta.longitude + d / 2),
    timeUnknown: a.meta.timeUnknown === true || b.meta.timeUnknown === true,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The cast's date and time, in universal time ("+00:00"), to the second. */
export function davisonCastInput(m: DavisonMoment) {
  const u = m.utc;
  return {
    date: `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}`,
    time: `${pad(u.getUTCHours())}:${pad(u.getUTCMinutes())}:${pad(u.getUTCSeconds())}`,
    latitude: Number(m.latitude.toFixed(6)),
    longitude: Number(m.longitude.toFixed(6)),
    tz: "+00:00",
  };
}
