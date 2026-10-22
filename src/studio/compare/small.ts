import type { StudioPage } from "@/studio/url";

/*
 * Figures drawn small (share and compare plan, idea B8): three or four charts
 * side by side leave each pane about 320 × 300 px on a laptop with its side
 * panel (1024 px), 530 × 370 at 1440, 770 × 440 at 1920. Checked at each:
 *   - the wheels (astrology's, Chinese astrology's) thin their fine ticks
 *     under 430 px and stay readable; BaZi's pillars, its luck pillars, Feng
 *     Shui's rose and the Cycles pages' cards read too, their pane scrolling
 *     to what lies below;
 *   - Human Design's bodygraph does not: under its keys it is drawn a few
 *     dozen pixels high in a narrow pane, and cut off by a low one (it needs
 *     its keys and a bodygraph of some 400 px); nor numerology's wheel in a
 *     narrow pane, where it runs over its own cards of numbers.
 * Those two pages' panes, narrower than SMALL_UNDER (or, Human Design's,
 * lower than its SMALL_UNDER_HIGH), show the figure's summary instead
 * (small-summary.tsx: Human Design's keys and cross, numerology's six core
 * numbers, each row choosing as the figure does), with a line saying why.
 * Two charts side by side, a chart full size (a phone's label) and a larger
 * pane draw the figure as ever.
 */

export const SMALL_SUMMARY: ReadonlySet<StudioPage> = new Set<StudioPage>(["design", "numerology"]);

/** A pane narrower than this (px) shows the summary of a page listed above, when three or four share the screen. */
export const SMALL_UNDER = 360;

/** The height (px) under which a pane of three or four shows the summary: Human Design's keys and bodygraph need it. */
export const SMALL_UNDER_HIGH: Partial<Record<StudioPage, number>> = { design: 560 };

/** `height` 0: not measured (the width decides alone). */
export function smallSummaryNow(page: StudioPage, count: number, width: number, height = 0): page is "design" | "numerology" {
  if (count <= 2 || width <= 0 || !SMALL_SUMMARY.has(page)) return false;
  return width < SMALL_UNDER || (height > 0 && height < (SMALL_UNDER_HIGH[page] ?? 0));
}
