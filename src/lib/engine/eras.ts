/**
 * The ephemeris files Ulune ships (ephe/, Astrodienst's files built on JPL's
 * DE441) and which of them a calculation needs (on-device plan, steps 1–2).
 *
 * Swiss Ephemeris keeps each body family in files of 600 years, named by the
 * century they start in: planets (sepl), the Moon (semo), Chiron and the main
 * asteroids (seas), "_18" for 1800–2399, "_12" for 1200–1799 and so on down
 * to "m06" for 600 BC–1 BC (swi_gen_filename). Eris, Sedna and the fixed-star
 * catalogue are one file each, for every date.
 *
 * On the server every file is mounted when the engine starts. A device starts
 * with 1800–2399 and the three single files, about 2.1 MB with the engine, and
 * fetches an earlier era (about 1.8 MB) only when a date needs it: before a
 * calculation from the dates it will touch (filesForSpan), and in any case
 * when Swiss asks for a file it was not given (swiss.ts tracks the attempts,
 * and the calculation runs again with the file), so a result never depends on
 * which files a device happened to hold.
 */

/** The first year of each 600-year era shipped (600 BC is astronomical year −599… see eraOfYear). */
export const ERA_STARTS = [-600, 0, 600, 1200, 1800] as const;
export type EraStart = (typeof ERA_STARTS)[number];

/** Eris (136199) and Sedna (90377), and Swiss's fixed-star catalogue: one file each, every date. */
export const SINGLE_FILES = ["s136199s.se1", "se90377s.se1", "sefstars.txt"] as const;

/** The two files the engine cannot start without (the planets and the Moon, 1800–2399). */
export const REQUIRED_FILES = ["sepl_18.se1", "semo_18.se1"] as const;

/** Swiss's suffix for an era: "_18" for 1800, "m06" for −600. */
function eraSuffix(start: number): string {
  const centuries = String(Math.abs(start) / 100).padStart(2, "0");
  return `${start < 0 ? "m" : "_"}${centuries}`;
}

/** An era's three files: the planets, the Moon, Chiron and the asteroids. */
export function eraFiles(start: EraStart): string[] {
  const s = eraSuffix(start);
  return [`sepl${s}.se1`, `semo${s}.se1`, `seas${s}.se1`];
}

/** What a device mounts when its engine starts: 1800–2399 and the single files. */
export const STARTUP_FILES: readonly string[] = [...eraFiles(1800), ...SINGLE_FILES];

/** Every file Ulune ships, in the order a device would want them (newest era first). */
export const ALL_FILES: readonly string[] = [
  ...STARTUP_FILES,
  ...[...ERA_STARTS]
    .reverse()
    .filter((s) => s !== 1800)
    .flatMap((s) => eraFiles(s)),
];

/**
 * The era a year falls in, as Swiss names its files (the start century,
 * rounded down to a multiple of six; year 0 is 1 BC, −1 is 2 BC).
 */
export function eraOfYear(year: number): number {
  let century = Math.trunc(year / 100);
  if (year < 0 && year % 100 !== 0) century -= 1;
  return Math.floor(century / 6) * 6 * 100;
}

const DAY_MS = 86_400_000;

/**
 * The era files the instants in [fromMs, toMs] read, with `marginDays` either
 * side (the calendar Swiss names a file by is Julian before 1582, a few days
 * off the proleptic Gregorian one here; the margin covers it). Only eras
 * Ulune ships are listed: a date outside them is computed from Swiss's own
 * Moshier approximation, the same everywhere.
 */
export function filesForSpan(fromMs: number, toMs: number, marginDays = 40): string[] {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return [];
  const lo = Math.min(fromMs, toMs) - marginDays * DAY_MS;
  const hi = Math.max(fromMs, toMs) + marginDays * DAY_MS;
  const first = eraOfYear(new Date(lo).getUTCFullYear());
  const last = eraOfYear(new Date(hi).getUTCFullYear());
  const out: string[] = [];
  for (const start of ERA_STARTS) {
    if (start >= first && start <= last) out.push(...eraFiles(start));
  }
  return out;
}
