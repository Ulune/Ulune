/**
 * What this visit has already seen built (the motion plan): a chart's full
 * entrance plays the first time it is shown, and later it only settles in.
 * A build cut short (another mode chosen a moment after) does not count: it
 * plays whole the next time. In memory only, for this page's life; nothing
 * is stored.
 */
const seen = new Set<string>();

/** Whether a key's build has been seen in this visit. */
export function seenBefore(key: string): boolean {
  return seen.has(key);
}

/** A key's build seen (played to its end, or most of the way). */
export function markSeen(key: string): void {
  seen.add(key);
}

/** True the first time a key is asked for in this visit (and marks it seen). */
export function firstSight(key: string): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}
