import { clsx, type ClassValue } from "clsx";

/**
 * Class names joined (conditionals dropped). Plain clsx: tailwind-merge cost
 * 8 KB gz and ~12 ms on every page load to resolve one real conflict (two
 * table buttons, now given their own size); a run of every e2e suite found
 * no other merge but duplicates.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Degrees, minutes and seconds of arc for display: rounded to the nearest
 * unit shown, but never into the next degree — the convention of Swiss
 * Ephemeris's swe_split_deg (ROUND_MIN / ROUND_SEC with KEEP_DEG). A body at
 * 14°59′40″ is in the 15th degree and reads 14°59′, never "15°00′"; one at
 * 24°02′59.9″ reads 24°03′. `maxDeg` caps the degree (29 within a sign) so
 * the sign never rolls over either. The degree itself absorbs float noise
 * (14.999999999999998 is 15).
 */
function arcParts(
  absDeg: number,
  unitSeconds: 60 | 1,
  maxDeg = Infinity,
): { deg: number; minutes: number; seconds: number } {
  const x = Math.max(0, absDeg);
  const deg = Math.min(Math.floor(x + 1e-9), maxDeg);
  const within = Math.max(0, (x - deg) * 3600);
  const units = Math.min(Math.round(within / unitSeconds), 3600 / unitSeconds - 1);
  const total = units * unitSeconds;
  return { deg, minutes: Math.floor(total / 60), seconds: total % 60 };
}

/** Position within its sign as DD°MM' (nearest minute, never rolling into the next degree or sign). */
export function formatDegree(ecliptic: number): string {
  const inSign = ((ecliptic % 30) + 30) % 30;
  const { deg, minutes } = arcParts(inSign, 60, 29);
  return `${deg}°${String(minutes).padStart(2, "0")}'`;
}

/** Position within its sign as DD°MM'SS" (nearest second, never rolling into the next degree) — tables and exports. */
export function formatDegreeSeconds(ecliptic: number): string {
  const inSign = ((ecliptic % 30) + 30) % 30;
  const { deg, minutes, seconds } = arcParts(inSign, 1, 29);
  return `${deg}°${String(minutes).padStart(2, "0")}'${String(seconds).padStart(2, "0")}"`;
}

/** Equatorial declination / altitude as ±DD°MM′. */
export function formatSignedDms(deg: number): string {
  const sign = deg < 0 ? "−" : "+";
  const { deg: d, minutes } = arcParts(Math.abs(deg), 60);
  return `${sign}${d}°${String(minutes).padStart(2, "0")}'`;
}

/** Declination / latitude as ±DD°MM'SS". */
export function formatSignedDmsSeconds(deg: number): string {
  const sign = deg < 0 ? "−" : "+";
  const { deg: d, minutes, seconds } = arcParts(Math.abs(deg), 1);
  return `${sign}${d}°${String(minutes).padStart(2, "0")}'${String(seconds).padStart(2, "0")}"`;
}

export function formatSpeed(speed: number): string {
  const n = Number.isFinite(speed) ? speed : 0;
  const abs = Math.abs(n).toFixed(4);
  return `${n < 0 ? "−" : "+"}${abs}°/d`;
}

export function hashBirth(input: {
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  houseSystem?: string;
}): string {
  const lat = input.latitude.toFixed(4);
  const lng = input.longitude.toFixed(4);
  const houses = input.houseSystem || "placidus";
  return `${input.date}|${input.time}|${lat}|${lng}|${houses}|tropical`;
}
