/*
 * Where the studio was left (page reorganisation plan, R6, "Back to the same
 * place"): its address and its entry in the tab's history, so a page outside
 * the studio (an encyclopedia page) can offer "Back to your chart" and land on
 * that very entry, as the browser's Back would. Kept in memory for the tab;
 * nothing is stored. Light on purpose, with no import: the encyclopedia's
 * pages read it without loading the studio (src/studio/return-memory.ts
 * writes it).
 */
export type StudioReturn = {
  /** The studio's address when it was left (`/astrology/transits?view=table`). */
  href: string;
  /** Its entry in the tab's history (the router's index), when known. */
  index: number | null;
  /** The Calendar was left (its own words on the way back). */
  calendar: boolean;
  /** A chart was on screen. */
  chart: boolean;
};

let target: StudioReturn | null = null;

export function setStudioReturn(next: StudioReturn | null): void {
  target = next;
}

/** Where "Back" leads from a page outside the studio: null when the studio was not open in this tab. */
export function studioReturn(): StudioReturn | null {
  return target;
}

/** The entry the tab is on in its history (TanStack Router keeps an index in history.state). */
export function historyIndex(): number | null {
  if (typeof window === "undefined") return null;
  const at = (window.history.state as { __TSR_index?: unknown } | null)?.__TSR_index;
  return typeof at === "number" ? at : null;
}
