import { useSyncExternalStore } from "react";
import { create } from "zustand";
import type { SavedChart } from "@/lib/chart/library";
import type { ElementReading } from "@/lib/chart/types";
import type { CompareMoment } from "@/lib/space/records";
import type { ChartScope, SlotStore } from "@/studio/scope";
import type { ScopeSelectHow } from "@/studio/scope-handle";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";
import type { CompareMode } from "@/studio/compare/compare-modes";
import { MAX_PEOPLE } from "@/studio/compare/compare-modes";
import { countsOf, linkedId, other, WHO, type Who } from "@/studio/compare/linked";

/*
 * What Compare's parts share while it is on (share and compare plan, feature
 * 2, ideas B7 and B8): the chart scopes of the panes shown (the view makes
 * them, the reading panel reads them), each pane's choice, its page, and how
 * the view is laid out. Compare's own download; what lasts (on, B, linked
 * selection, the way of comparing and its choices) is the studio's store's
 * `compare`, sealed in the space.
 */

export type CompareSel = Record<Who, string | null> & {
  /** The chart chosen in last: with linked selection off, the reading follows it. */
  last: Who | null;
  /** Chosen in several at once ("What they share", "Where they agree"): their readings, linked or not. */
  together?: boolean;
};

const NO_SEL: CompareSel = { a: null, b: null, c: null, d: null, last: null };
const NONE = { a: null, b: null, c: null, d: null };

type CompareRuntime = {
  scopes: Record<Who, ChartScope | null>;
  rows: Record<Who, SavedChart | null>;
  /** The panes shown, in order: A and B, with C and D for three or four people (idea B8). */
  shown: Who[];
  /** The way of comparing (compare-modes.ts): people, one person in two languages, one chart at two moments. */
  mode: CompareMode;
  /** The page each pane draws (its own in the mixed ways, the studio's otherwise). */
  pages: Record<Who, StudioPage | null>;
  sel: CompareSel;
  /** The reading beside the charts (a wide screen's side panel), else from the bottom. */
  beside: boolean;
  /** The charts one above the other (a phone held upright). */
  stacked: boolean;
  /** Numerology's and BaZi's tables as one, with a column for each person (else a table each). */
  merged: boolean;
  /** "Now" for B's moment while it follows the clock (two moments): it ticks here, not in the space. */
  liveAt: number;
};

export const useCompare = create<CompareRuntime>(() => ({
  scopes: { ...NONE },
  rows: { ...NONE },
  shown: ["a", "b"],
  mode: "people",
  pages: { ...NONE },
  sel: NO_SEL,
  beside: true,
  stacked: false,
  merged: false,
  liveAt: Date.now(),
}));

/** The yin or yang counts a pane's chart shows, for a count's own ids (Feng Shui, BaZi's luck). */
const countsIn = (who: Who) => countsOf(useCompare.getState().rows[who]?.input.chineseCount);

/** Linked selection holds: switched on, and not between two languages (they share no ids: idea B7). */
export function linkedNow(): boolean {
  return useStudioStore.getState().compare.linked && useCompare.getState().mode !== "languages";
}

/** Every pane shown but `who` takes `id` in its own terms (none: let go). */
function follow(sel: CompareSel, who: Who, id: string | null): void {
  for (const o of useCompare.getState().shown) if (o !== who) sel[o] = id == null ? null : linkedId(id, countsIn(o));
}

/**
 * A choice in one chart (its figure, list or table, or a reading's link): its
 * own, and with linked selection the same in every other pane (linked.ts). The
 * panel answers as it does for the page's own choice (studio/store.ts): a
 * list's or a table's row opens the reading, a choice on the figure turns an
 * open panel to it.
 */
export function chooseIn(who: Who, next: string | null, how: ScopeSelectHow): void {
  const { dockOpen } = useStudioStore.getState();
  const { sel: was, shown } = useCompare.getState();
  const sel: CompareSel = { ...was, [who]: next, together: false };
  if (linkedNow()) {
    follow(sel, who, next);
    sel.last = next == null ? null : who;
  } else {
    sel.last = next != null ? who : (shown.find((o) => o !== who && sel[o]) ?? null);
  }
  useCompare.setState({ sel });
  if (next && how === "pick") useStudioStore.setState({ dock: "reading", dockOpen: true });
  else if (next && how === "choose" && dockOpen) useStudioStore.setState({ dock: "reading" });
}

/** One element in several charts, by its id in each ("What they share", "Where they agree"): chosen, its readings opened. */
export function chooseAll(ids: Partial<Record<Who, string>>): void {
  const sel: CompareSel = { ...NO_SEL, together: true };
  for (const w of WHO) sel[w] = ids[w] ?? null;
  sel.last = WHO.find((w) => sel[w]) ?? null;
  useCompare.setState({ sel });
  useStudioStore.setState({ dock: "reading", dockOpen: true });
}

/** One element in both of two charts (B9's list for two). */
export const chooseBoth = (ids: { a: string; b: string }): void => chooseAll(ids);

/** Every chart let go (Escape, the card's ✕). */
export function letGo(): void {
  useCompare.setState({ sel: NO_SEL });
}

/** Linked selection switched: on, the others follow the one chosen in last. */
export function setLinked(on: boolean): void {
  useStudioStore.setState((s) => ({ compare: { ...s.compare, linked: on } }));
  if (!on || !linkedNow()) return;
  const { sel } = useCompare.getState();
  const from = sel.last ?? WHO.find((w) => sel[w]) ?? null;
  if (!from) return;
  const next: CompareSel = { ...sel, last: from, together: false };
  follow(next, from, sel[from]);
  useCompare.setState({ sel: next });
}

/**
 * The panes changed (another person, one more or one fewer, another way): with
 * linked selection, the others take A's choice (or the last one's) again in
 * their own terms; a pane no longer shown lets go of its own.
 */
export function relink(): void {
  const { sel, shown } = useCompare.getState();
  const next: CompareSel = { ...sel };
  for (const w of WHO) if (!shown.includes(w)) next[w] = null;
  if (next.last && !shown.includes(next.last)) next.last = null;
  if (linkedNow()) {
    const from = next.a ? "a" : next.last;
    if (from && next[from]) follow(next, from, next[from]);
  }
  useCompare.setState({ sel: next });
}

/**
 * "Add someone…" for a pane (B, C or D): the birth form, as on a Relationship
 * page (store.beginAddPartner); once the new chart is cast it takes that
 * place, and Compare comes back with it (discarded, the pane stays as it was).
 */
export function addSomeoneAs(who: Exclude<Who, "a">): void {
  const s = useStudioStore.getState();
  const before = new Set(s.rows.map((r) => r.id));
  s.beginAddPartner(s.page);
  const stop = useStudioStore.subscribe((now) => {
    if (now.pair.addingPartnerFor) return;
    stop();
    const added = now.rows.find((r) => !before.has(r.id));
    if (!added) return;
    if (who === "b") useStudioStore.setState({ compare: { ...now.compare, partnerId: added.id } });
    else setMore(who, added.id);
  });
}

/** B, kept as the store's second person of Compare. */
export const addSomeoneAsB = (): void => addSomeoneAs("b");

/** C or D (idea B8): another chart in that place, or none (the place goes, D moving up to C). */
export function setMore(who: "c" | "d", id: string | null): void {
  useStudioStore.setState((s) => {
    const more = [...(s.compare.more ?? [])];
    const at = who === "c" ? 0 : 1;
    if (id) more[at] = id;
    else more.splice(at, 1);
    return { compare: { ...s.compare, more: more.filter(Boolean).slice(0, MAX_PEOPLE - 2) } };
  });
}

/** One more person (C, then D): the chart given. */
export function addMore(id: string): void {
  useStudioStore.setState((s) => ({ compare: { ...s.compare, more: [...(s.compare.more ?? []), id].slice(0, MAX_PEOPLE - 2) } }));
}

/** Another way of comparing (ideas B7 and B8): kept with Compare; the choices made in the panes let go. */
export function setMode(mode: CompareMode): void {
  useStudioStore.setState((s) => ({ compare: { ...s.compare, mode } }));
  letGo();
}

/** B's page beside A in two languages (idea B7). */
export function setLangPage(page: StudioPage): void {
  useStudioStore.setState((s) => ({ compare: { ...s.compare, langPage: page } }));
  useCompare.setState((r) => ({ sel: { ...r.sel, b: null, last: r.sel.last === "b" ? null : r.sel.last } }));
}

/**
 * B's moment moved (two moments, idea B7): kept with Compare. Following the
 * clock, "now" ticks in the view's runtime only, so the space is not written
 * every minute for a moment that is simply now.
 */
export function setMoment(patch: Partial<CompareMoment>, base: CompareMoment): void {
  if (patch.live) useCompare.setState({ liveAt: patch.at ?? Date.now() });
  // Still following the clock: nothing to keep.
  if (patch.live && base.live && Object.keys(patch).every((k) => k === "at" || k === "live")) return;
  useStudioStore.setState((s) => ({ compare: { ...s.compare, moment: { ...base, ...patch } } }));
}

const NO_SLOTS: Pick<SlotStore, "get" | "subscribe"> = { subscribe: () => () => {}, get: () => undefined };

/** A pane's reading (modes/data.tsx's, read outside its pane): none until its scope is there. */
export function useScopeReading(scope: ChartScope | null, page: StudioPage): ElementReading | null {
  const slots = scope?.slots ?? NO_SLOTS;
  const at = scope?.page ?? page;
  return useSyncExternalStore(
    slots.subscribe,
    () => slots.get(at)?.reading ?? null,
    () => null,
  );
}

/** A pane's page data, read outside its pane. */
export function useScopeData(scope: ChartScope | null, page: StudioPage): unknown {
  const slots = scope?.slots ?? NO_SLOTS;
  const at = scope?.page ?? page;
  return useSyncExternalStore(
    slots.subscribe,
    () => slots.get(at)?.data,
    () => undefined,
  );
}

/** A and B change places (Swap): the chart shown becomes B's, B's the chart shown; their choices go with them. */
export function swapPeople(): void {
  const { rows, sel } = useCompare.getState();
  const a = rows.a;
  const b = rows.b;
  if (!a || !b) return;
  const last = sel.last === "a" || sel.last === "b" ? other(sel.last) : sel.last;
  useCompare.setState({ sel: { ...sel, a: sel.b, b: sel.a, last } });
  useStudioStore.setState((s) => ({ compare: { ...s.compare, partnerId: a.id } }));
  useStudioStore.getState().select(b.id);
}
