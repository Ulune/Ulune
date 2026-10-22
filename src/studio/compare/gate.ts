import { importWithRetry } from "@/lib/lazy-retry";
import { languageOf, lastLanguage, pageFor } from "@/studio/map";
import { comparablePage } from "@/studio/compare/comparable";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";

/*
 * The ways into Compare (share and compare plan, feature 2): what the chart
 * switcher's rows (studio/show/picker-extras.tsx) and ⌘K call.
 * Only the store's `compare` changes here; the view itself (CompareView.tsx
 * and the rest of this folder) is its own download, drawn by the workspace
 * once Compare is on. The toolbar's button, the C key, ⋯ and Show mode's
 * bar switch it with toggleCompare, in the first download (CompareButton.tsx).
 */

/**
 * Where Compare opens when asked for from a page it does not show (a
 * Relationship page, Feng Shui's Home, the Calendar): the same language's
 * Natal page, else the last language's.
 */
export function comparePageFor(page: StudioPage, store?: Parameters<typeof pageFor>[2]): StudioPage {
  if (comparablePage(page)) return page;
  const lang = languageOf(page) ?? lastLanguage(store);
  return pageFor(lang, "natal", store);
}

/**
 * Opens Compare, with this chart as B (null: the one chosen last, else the view picks one), on a page it
 * shows; a chart asked for is compared as a person (ideas B7, B8: not in another of Compare's ways).
 */
export function enterCompare(partnerId: string | null, go: (page: StudioPage) => void): void {
  const s = useStudioStore.getState();
  if (!s.chart) return;
  useStudioStore.setState({ compare: { ...s.compare, on: true, partnerId: partnerId ?? s.compare.partnerId, ...(partnerId ? { mode: "people" as const } : {}) } });
  if (!comparablePage(s.page)) go(comparePageFor(s.page));
}

/**
 * Compare's view, fetched through this small file: the first download then lists this one file for
 * it (the switcher's), not the view's own and those it brings (pair-selects, its style sheets).
 */
export const loadCompareView = () => importWithRetry(() => import("@/studio/compare/CompareView"));

export function leaveCompare(): void {
  useStudioStore.setState((s) => ({ compare: { ...s.compare, on: false } }));
}
