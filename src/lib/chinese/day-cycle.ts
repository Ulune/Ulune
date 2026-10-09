/*
 * The day's place in the sixty-day cycle, alone: no table, no terms, so the
 * Calendar's month can draw each day's animal without the engine (the day's
 * readings load it when they are asked for). The same count as pillars.ts's
 * `dayPillarOfDay` (the Julian day number + 49, modulo 60: 1 January 2000 is
 * Wu-Wu, 54), kept equal by scripts/chinese-time.test.mjs.
 */

/** The cycle place (0 = Jia-Zi … 59 = Gui-Hai) of a calendar date. */
export function dayCycleOf(year: number, month: number, day: number): number {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  const days = Math.round(d.getTime() / 86_400_000);
  return (((days + 2440588 + 49) % 60) + 60) % 60;
}

/** The day's animal (its branch, 0 = Rat … 11 = Pig) and the animal it clashes with, opposite. */
export function dayAnimalAt(year: number, month: number, day: number): { cycle: number; branch: number; clashes: number } {
  const cycle = dayCycleOf(year, month, day);
  const branch = cycle % 12;
  return { cycle, branch, clashes: (branch + 6) % 12 };
}
