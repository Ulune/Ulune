import { useSyncExternalStore } from "react";
import { create } from "zustand";
import type { SavedChart } from "@/lib/chart/library";
import type { ElementReading } from "@/lib/chart/types";
import type { ChartScope, SlotStore } from "@/studio/scope";
import type { ScopeSelectHow } from "@/studio/scope-handle";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";
import { countsOf, linkedId, other, type Who } from "@/studio/compare/linked";

/*
 * What Compare's parts share while it is on (share and compare plan, feature
 * 2): the two chart scopes (the view makes them, the reading panel reads them),
 * each pane's choice, and how the view is laid out. Compare's own download;
 * what lasts (on, B, linked selection) is the studio's store's `compare`.
 */

export type CompareSel = {
  a: string | null;
  b: string | null;
  /** The chart chosen in last: with linked selection off, the reading follows it. */
  last: Who | null;
  /** Chosen in both at once ("What they share"): both readings, linked or not. */
  together?: boolean;
};

type CompareRuntime = {
  scopes: { a: ChartScope | null; b: ChartScope | null };
  rows: { a: SavedChart | null; b: SavedChart | null };
  sel: CompareSel;
  /** The reading beside the charts (a wide screen's side panel), else from the bottom. */
  beside: boolean;
  /** The two one above the other (a phone held upright). */
  stacked: boolean;
  /** Numerology's and BaZi's tables as one, with A and B columns (else two tables). */
  merged: boolean;
};

export const useCompare = create<CompareRuntime>(() => ({
  scopes: { a: null, b: null },
  rows: { a: null, b: null },
  sel: { a: null, b: null, last: null },
  beside: true,
  stacked: false,
  merged: false,
}));

/** The second person of a chart, for a count's own ids (Feng Shui, BaZi's luck): the counts it shows. */
const countsIn = (who: Who) => countsOf(useCompare.getState().rows[who]?.input.chineseCount);

/**
 * A choice in one chart (its figure, list or table, or a reading's link): its
 * own, and with linked selection the same in the other (linked.ts). The panel
 * answers as it does for the page's own choice (studio/store.ts): a list's or
 * a table's row opens the reading, a choice on the figure turns an open panel
 * to it.
 */
export function chooseIn(who: Who, next: string | null, how: ScopeSelectHow): void {
  const { compare, dockOpen } = useStudioStore.getState();
  const was = useCompare.getState().sel;
  const sel: CompareSel = { ...was, [who]: next, together: false };
  const o = other(who);
  if (compare.linked) {
    sel[o] = next == null ? null : linkedId(next, countsIn(o));
    sel.last = next == null ? null : who;
  } else {
    sel.last = next != null ? who : sel[o] ? o : null;
  }
  useCompare.setState({ sel });
  if (next && how === "pick") useStudioStore.setState({ dock: "reading", dockOpen: true });
  else if (next && how === "choose" && dockOpen) useStudioStore.setState({ dock: "reading" });
}

/** One element in both charts, by its id in each ("What they share"): chosen, its reading opened. */
export function chooseBoth(ids: { a: string; b: string }): void {
  useCompare.setState({ sel: { a: ids.a, b: ids.b, last: "a", together: true } });
  useStudioStore.setState({ dock: "reading", dockOpen: true });
}

/** Both charts let go (Escape, the card's ✕). */
export function letGo(): void {
  useCompare.setState({ sel: { a: null, b: null, last: null } });
}

/** Linked selection switched: on, the other chart follows the one chosen in last. */
export function setLinked(on: boolean): void {
  useStudioStore.setState((s) => ({ compare: { ...s.compare, linked: on } }));
  if (!on) return;
  const { sel } = useCompare.getState();
  const from = sel.last ?? (sel.a ? "a" : sel.b ? "b" : null);
  if (!from) return;
  const o = other(from);
  const id = sel[from];
  useCompare.setState({ sel: { ...sel, [o]: id == null ? null : linkedId(id, countsIn(o)), last: from } });
}

/** Another second person: with linked selection, B takes A's choice again in its own terms. */
export function relinkB(): void {
  const { sel } = useCompare.getState();
  if (!useStudioStore.getState().compare.linked || !sel.a) return;
  useCompare.setState({ sel: { ...sel, b: linkedId(sel.a, countsIn("b")) } });
}

/**
 * "Add someone…" as B: the birth form, as on a Relationship page (store.beginAddPartner); once
 * the new chart is cast it is B, and Compare comes back with it (discarded, B stays as it was).
 */
export function addSomeoneAsB(): void {
  const s = useStudioStore.getState();
  const before = new Set(s.rows.map((r) => r.id));
  s.beginAddPartner(s.page);
  const stop = useStudioStore.subscribe((now) => {
    if (now.pair.addingPartnerFor) return;
    stop();
    const added = now.rows.find((r) => !before.has(r.id));
    if (added) useStudioStore.setState({ compare: { ...now.compare, partnerId: added.id } });
  });
}

const NO_SLOTS: Pick<SlotStore, "get" | "subscribe"> = { subscribe: () => () => {}, get: () => undefined };

/** A pane's reading (modes/data.tsx's, read outside its pane): none until its scope is there. */
export function useScopeReading(scope: ChartScope | null, page: StudioPage): ElementReading | null {
  const slots = scope?.slots ?? NO_SLOTS;
  return useSyncExternalStore(
    slots.subscribe,
    () => slots.get(page)?.reading ?? null,
    () => null,
  );
}

/** A pane's page data, read outside its pane. */
export function useScopeData(scope: ChartScope | null, page: StudioPage): unknown {
  const slots = scope?.slots ?? NO_SLOTS;
  return useSyncExternalStore(
    slots.subscribe,
    () => slots.get(page)?.data,
    () => undefined,
  );
}

/** A and B change places (Swap): the chart shown becomes B's, B's the chart shown; their choices go with them. */
export function swapPeople(): void {
  const { rows, sel } = useCompare.getState();
  const a = rows.a;
  const b = rows.b;
  if (!a || !b) return;
  useCompare.setState({ sel: { a: sel.b, b: sel.a, last: sel.last ? other(sel.last) : null } });
  useStudioStore.setState((s) => ({ compare: { ...s.compare, partnerId: a.id } }));
  useStudioStore.getState().select(b.id);
}
