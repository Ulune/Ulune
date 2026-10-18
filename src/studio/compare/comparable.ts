import { lensOf } from "@/studio/map";
import { MODE_META } from "@/studio/modes/meta";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";

/*
 * Which pages Compare shows (share and compare plan, feature 2, "In each
 * language"; studio/compare). Every page that reads one person's chart: each
 * language's Natal and Cycles pages. Not the Calendar (not one person's
 * chart) nor Feng Shui's Home (a home, not a person; ModeMeta.mainOnly), and
 * not a Relationship page, which already shows two people: from Compare,
 * "See how they meet" leads there instead. The first download's toolbar
 * reads it, and so do the unit tests (scripts/compare.test.mjs); with it the
 * one switch the toolbar's button, the C key (shell/CommandPalette.tsx), ⋯
 * and Show mode's bar use.
 */

/** Compare can show this page: two charts, side by side, each with its own reading. */
export function comparablePage(page: StudioPage): boolean {
  return !MODE_META[page].mainOnly && lensOf(page) !== "relationship";
}

type StudioView = ReturnType<typeof useStudioStore.getState>;

/** Compare can be switched on here: a chart, on a page it shows (the one being opened, if one is). */
export const canCompare = (s: StudioView): boolean => s.chart != null && comparablePage(s.navPage ?? s.page);

/** Compare on, where it shows the page; or off again. */
export function toggleCompare(): void {
  const s = useStudioStore.getState();
  if (s.compare.on || canCompare(s)) useStudioStore.setState({ compare: { ...s.compare, on: !s.compare.on } });
}
