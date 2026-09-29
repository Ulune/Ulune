/**
 * Facts the chart table derives from a cast, exactly (no ephemeris needed):
 * the Moon's phase, the local sidereal time, the nearest angle, the distance
 * to the Sun, the excess over the Sun's greatest declination.
 */
import { ANGULAR_ORB, OOB_DECLINATION } from "./constants";
import type { AngleId, NatalChart, Placement } from "./types";

const RAD = Math.PI / 180;

function wrap360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** The shorter arc between two longitudes, 0–180°. */
export function separation(a: number, b: number): number {
  return Math.abs(wrap360(a - b + 180) - 180);
}

/** The eight phases of the lunation (Rudhyar), each 45° of the Moon's lead on the Sun. */
export const MOON_PHASES = [
  "new",
  "crescent",
  "firstQuarter",
  "gibbous",
  "full",
  "disseminating",
  "lastQuarter",
  "balsamic",
] as const;
export type MoonPhaseId = (typeof MOON_PHASES)[number];

/** The Sun's and the Moon's mean distances from the Earth (km): enough for the phase angle to 0.01°. */
const SUN_KM = 149_597_870.7;
const MOON_KM = 384_400;

/**
 * The Moon's phase: how far it is ahead of the Sun (0–360°), which of the
 * eight phases that is, the lit share of its disc, and whether it is waxing.
 * The lit share comes from the phase angle (Sun–Moon–Earth), found from the
 * true elongation (the Moon's latitude included) and the two distances, as
 * Swiss Ephemeris's swe_pheno does: for the test chart 58.63% against its
 * 58.62% (the elongation alone would say 58.50%).
 */
export function moonPhase(sunLon: number, moonLon: number, moonLat = 0): {
  angle: number;
  phase: MoonPhaseId;
  lit: number;
  waxing: boolean;
} {
  const angle = wrap360(moonLon - sunLon);
  const phase = MOON_PHASES[Math.min(7, Math.floor(angle / 45))] ?? "new";
  const elongation = Math.acos(Math.max(-1, Math.min(1, Math.cos(moonLat * RAD) * Math.cos(angle * RAD))));
  const phaseAngle = Math.atan2(SUN_KM * Math.sin(elongation), MOON_KM - SUN_KM * Math.cos(elongation));
  return { angle, phase, lit: (1 + Math.cos(phaseAngle)) / 2, waxing: angle < 180 };
}

/**
 * The right ascension of the MC (ARMC, degrees): from the cast when it
 * carries it, else from the MC's longitude and the true obliquity (the MC
 * lies on the ecliptic, so the conversion is exact).
 */
export function armcOf(chart: NatalChart): number | null {
  if (chart.meta.armc != null && Number.isFinite(chart.meta.armc)) return wrap360(chart.meta.armc);
  const eps = chart.meta.obliquity;
  const mc = chart.angles.midheaven?.ecliptic;
  if (eps == null || mc == null) return null;
  return wrap360(Math.atan2(Math.sin(mc * RAD) * Math.cos(eps * RAD), Math.cos(mc * RAD)) / RAD);
}

/** Local (apparent) sidereal time in hours. */
export function localSiderealHours(chart: NatalChart): number | null {
  const armc = armcOf(chart);
  return armc == null ? null : armc / 15;
}

const ANGLES: AngleId[] = ["ascendant", "midheaven", "descendant", "ic"];

/** The angle a longitude is closest to, if within the angular orb (8°). */
export function nearestAngle(lon: number, angles: NatalChart["angles"]): { id: AngleId; distance: number } | null {
  let best: { id: AngleId; distance: number } | null = null;
  for (const id of ANGLES) {
    const a = angles[id];
    if (!a) continue;
    const d = separation(lon, a.ecliptic);
    if (d <= ANGULAR_ORB && (!best || d < best.distance)) best = { id, distance: d };
  }
  return best;
}

/** Points on the ecliptic by definition, whose declination follows from the longitude alone. */
const ON_ECLIPTIC = new Set<string>(["ascendant", "midheaven", "descendant", "ic", "vertex", "antivertex"]);

/**
 * The declination of an ecliptic point (latitude 0) at a longitude, from the
 * true obliquity of the date: sin δ = sin ε sin λ (the equatorial conversion
 * with no latitude, as Swiss Ephemeris's swe_cotrans gives it).
 */
export function eclipticDeclination(lon: number, obliquity: number): number {
  return Math.asin(Math.sin(obliquity * RAD) * Math.sin(lon * RAD)) / RAD;
}

/**
 * A point's declination: the cast's own for a body (from Swiss Ephemeris),
 * derived from the longitude for the angles and the Vertex, which lie on the
 * ecliptic. None for the lots (a lot is an arc, not a place in the sky), nor
 * without the obliquity.
 */
export function declinationOf(p: Placement, chart: NatalChart): number | null {
  if (p.declination != null && Number.isFinite(p.declination)) return p.declination;
  const eps = chart.meta.obliquity;
  if (!ON_ECLIPTIC.has(p.id) || eps == null || !Number.isFinite(eps)) return null;
  return eclipticDeclination(p.ecliptic, eps);
}

/** How far beyond the Sun's greatest declination (the true obliquity of the date) a body is. */
export function outOfBoundsBy(declination: number | undefined, obliquity: number | undefined): number | null {
  if (declination == null) return null;
  const over = Math.abs(declination) - (obliquity ?? OOB_DECLINATION);
  return over > 0 ? over : null;
}
