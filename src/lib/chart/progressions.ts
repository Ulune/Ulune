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

/**
 * How far secondary progressions move the Midheaven in a year of life: the
 * Naibod rate, the Sun's mean daily motion, 0°59′08″ of right ascension. It is
 * what the sidereal time gains on a whole turn each day (360.98564736629° a
 * day), so the progressed angles keep that and not the turn.
 */
export const NAIBOD_DEG_PER_YEAR = 0.98564736629;

/**
 * The progressed ARMC (local sidereal time, degrees) from the one at the
 * progressed moment. That moment lies `years` days after birth, so its
 * sidereal time has turned once for each whole year and once more for the
 * part of a year: taking the turns back leaves ARMC(birth) + the Naibod arc.
 * Houses cast at the progressed moment itself sent the Ascendant round the
 * zodiac once a year of life; at birthdays the two agree.
 */
export function progressedArmc(armcAtMoment: number, years: number): number {
  const part = years - Math.floor(years);
  const armc = (armcAtMoment - 360 * part) % 360;
  return armc < 0 ? armc + 360 : armc;
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
