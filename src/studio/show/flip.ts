import type { SavedChart } from "@/lib/chart/library";
import { useStudioStore } from "@/studio/store";
import { NO_HISTORY, adoptFlip, flipTarget, moveFlip } from "./flip-history";

/*
 * Flip between the last two charts (share and compare plan, idea B3): the
 * studio's store followed with flip-history.ts, from the first page on. The
 * P key (shell/CommandPalette.tsx), the switcher's "Back to…" row
 * (picker-extras.tsx), ⌘K and Show mode's bar flip to the chart open
 * before, on the same page and lens. In memory; studio/space-sync.ts seals
 * the previous chart with the library's record while a private space is
 * open, and gives it back when the space opens. Small on purpose: it comes
 * with every page's first download.
 */

let history = NO_HISTORY;

type StudioView = ReturnType<typeof useStudioStore.getState>;

const idsOf = (s: StudioView) => new Set(s.rows.map((r) => r.id));

useStudioStore.subscribe((s, prev) => {
  if (s.activeId !== prev.activeId) history = moveFlip(history, s.activeId, idsOf(s));
});

/** The chart open before this one, while it is still kept (what the private space keeps, studio/space-sync.ts). */
export const previousChartId = (s: StudioView = useStudioStore.getState()): string | null => flipTarget(history, s.activeId, idsOf(s));

/** The chart to flip to, while one can be (not while a chart is being made or a second person added). */
export function flipRow(s: StudioView = useStudioStore.getState()): SavedChart | null {
  const id = s.creating || s.pair.addingPartnerFor ? null : previousChartId(s);
  return s.rows.find((r) => r.id === id) ?? null;
}

/** Opens the chart open before this one, on the same page; false when there is none to open. */
export function flipToPrevious(): boolean {
  const row = flipRow();
  if (row) useStudioStore.getState().select(row.id);
  return Boolean(row);
}

/** The private space's previous chart, taken when this tab has none of its own (studio/space-sync.ts). */
export function adoptPreviousChart(id: string | null | undefined): void {
  const s = useStudioStore.getState();
  history = adoptFlip(history, id, s.activeId, idsOf(s));
}
