import { useSyncExternalStore } from "react";

/*
 * The year the numerology wheel shows (its year stepper, part 60): this year
 * unless the reader steps to another, for this tab only. The personal year's
 * disc, its reading and the year's cycles follow it. A Compare pane with a
 * moment of its own steps its own year instead (studio/scope-time.ts).
 */

export const NUMEROLOGY_FIRST_YEAR = 1900;
export const NUMEROLOGY_LAST_YEAR = 2100;

let chosen: number | null = null;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** A year as the stepper keeps it: within its range, null for this year. */
export function numerologyYearOf(year: number | null): number | null {
  return year == null || year === new Date().getFullYear()
    ? null
    : Math.min(NUMEROLOGY_LAST_YEAR, Math.max(NUMEROLOGY_FIRST_YEAR, Math.trunc(year)));
}

/** Another year (null: back to this year), kept within the stepper's range. */
export function setNumerologyYear(year: number | null) {
  const next = numerologyYearOf(year);
  if (next === chosen) return;
  chosen = next;
  for (const fn of listeners) fn();
}

/** The year stepped to, or null for this year. */
export function useNumerologyYear(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => chosen,
    () => null,
  );
}
