/**
 * What this visit has already seen built (the motion plan): a chart's full
 * entrance plays the first time it is shown, and later it only settles in.
 * In memory only, for this page's life; nothing is stored.
 */
const seen = new Set<string>();

/** True the first time a key is asked for in this visit. */
export function firstSight(key: string): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}
