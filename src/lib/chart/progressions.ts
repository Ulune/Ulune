import { ANGLE_BODIES } from "./constants";
import {
  inMajorTableOrb,
  TRANSIT_TABLE_MOVING,
  TRANSIT_TABLE_NATAL,
  type TableLonPair,
} from "./transit-exact";
import type { AspectLink, BodyId } from "./types";

/**
 * Mean tropical year in days (IAU). Secondary progressions: one day of
 * ephemeris equals one tropical year of life.
 * Progressed UT = natal UT + (target − birth) / TROPICAL_YEAR_DAYS.
 */
export const TROPICAL_YEAR_DAYS = 365.24219;

export const MS_PER_DAY = 86_400_000;

export const PROGRESSION_METHOD = "secondary" as const;

/** Moving bodies on the progressed-to-natal table (planets + progressed angles). */
export const PROGRESSION_TABLE_MOVING: ReadonlySet<BodyId> = new Set([
  ...TRANSIT_TABLE_MOVING,
  ...ANGLE_BODIES,
]);

/** Natal bodies those progressions are scored against (planets + angles). */
export const PROGRESSION_TABLE_NATAL: ReadonlySet<BodyId> = TRANSIT_TABLE_NATAL;

export function yearsOfLife(natalUtc: Date, targetUtc: Date): number {
  return (targetUtc.getTime() - natalUtc.getTime()) / (TROPICAL_YEAR_DAYS * MS_PER_DAY);
}

export function lifeMsFromYears(natalUtc: Date, years: number): number {
  return natalUtc.getTime() + years * TROPICAL_YEAR_DAYS * MS_PER_DAY;
}

/**
 * Secondary (day-for-a-year): advance the ephemeris by one day for each
 * tropical year lived. Same convention as the UI label
 * “Secondary · day for a year”.
 */
export function progressedUtcFromNatal(natalUtc: Date, targetUtc: Date): Date {
  const years = yearsOfLife(natalUtc, targetUtc);
  return new Date(natalUtc.getTime() + years * MS_PER_DAY);
}

/** Life-calendar UTC of an exact that falls `ephDays` from the progressed epoch. */
export function lifeExactIso(targetUtc: Date, ephDays: number): string {
  const ms = targetUtc.getTime() + ephDays * TROPICAL_YEAR_DAYS * MS_PER_DAY;
  return new Date(Math.round(ms / 1000) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Invert a life-calendar exact back to the ephemeris moment. */
export function progressedUtcAtLife(natalUtc: Date, lifeUtc: Date): Date {
  return progressedUtcFromNatal(natalUtc, lifeUtc);
}

export function isProgressionTablePair(a: AspectLink, pos?: TableLonPair): boolean {
  return (
    a.level === "major" &&
    PROGRESSION_TABLE_MOVING.has(a.a) &&
    PROGRESSION_TABLE_NATAL.has(a.b) &&
    inMajorTableOrb(a, pos)
  );
}

export function progressionRowTestId(a: Pick<AspectLink, "a" | "type" | "b">): string {
  return `progression-row-p${a.a}_${a.type}_${a.b}`;
}
