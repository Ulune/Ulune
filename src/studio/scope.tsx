import { createContext, useContext } from "react";
import { scopeOf } from "@/lib/depth/preview-bus";
import type { ModeRuntime } from "@/studio/modes/types";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";

/*
 * Which chart a page draws (share and compare plan, feature 2, "Work" step 1:
 * the foundation of Compare). Every studio page reads "its" chart, birth and
 * selection through the hooks here instead of the studio's store, so that a
 * page can be drawn twice, for two charts, side by side. Without a scope
 * around it (the studio as it is today) a page is in the "main" scope, which
 * is the store itself: the hooks read it exactly as the pages did before.
 * Inside a ChartScopeProvider (scope-provider.tsx, loaded with Compare only)
 * a page is in scope "a" or "b": its chart is the one the scope was given, its
 * selection is the scope's own, its runtime (modes/data.tsx) runs for that
 * chart. Time (the transits' moment, the progressions' date, the Cycles
 * pages' years), the Look, the language and the page itself stay shared: both
 * panes follow the toolbar.
 *
 * Everything a scope draws stands inside an element marked data-chart-scope="a"
 * to "d" (ScopeStage does it): presses and previews are told apart by that mark
 * (chart-wheel.tsx, lib/depth/preview-bus.ts, the Dock's Escape). What only
 * some pages' figures ask of their scope (the phone's quiet choice, where the
 * reading stands) is in scope-figure.ts, out of the first download.
 *
 * Compare's other ways (ideas B7 and B8) bend two of those rules for their
 * panes alone: a pane may draw a page of its own (one person in two
 * languages: useScopedPage, which every page's runtime reads), and a moment of
 * its own (one chart at two moments: scope-time.ts, which the Cycles pages
 * read). Up to four scopes, "a" to "d", stand side by side (three or four
 * people at once).
 */

export type ScopeId = "main" | "a" | "b" | "c" | "d";

type StudioState = ReturnType<typeof useStudioStore.getState>;

/**
 * What a page reads of its chart, named as the studio's store names it (the
 * main scope is the store; a and b build the same fields for their chart).
 */
export type ScopeState = Pick<
  StudioState,
  | "chart"
  | "input"
  | "timeUnknown"
  | "activeId"
  | "dossier"
  | "grok"
  | "creating"
  | "casting"
  | "composing"
  | "selectedId"
  | "pick"
  | "choose"
  | "clear"
  | "pair"
  | "setPartner"
  | "applySaved"
  | "beginAddPartner"
  | "setNumerologyY"
>;

/** A scope's runtimes (modes/data.tsx): each page's data and reading, for the figure, its panels and its table. */
export type SlotStore = {
  get: (page: StudioPage) => ModeRuntime | undefined;
  set: (page: StudioPage, runtime: ModeRuntime | undefined) => void;
  subscribe: (fn: () => void) => () => void;
};

export function createSlotStore(): SlotStore {
  const slots: Partial<Record<StudioPage, ModeRuntime>> = {};
  const subs = new Set<() => void>();
  return {
    get: (page) => slots[page],
    set: (page, runtime) => {
      if (slots[page] === runtime) return;
      if (runtime) slots[page] = runtime;
      else delete slots[page];
      for (const fn of subs) fn();
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

/**
 * A scope's own moment (Compare's "one chart, two moments", idea B7): what its
 * page reads instead of the studio's one time (the store's `time`, the Cycles
 * pages' years), moved by that pane's dials alone (scope-time.ts).
 */
export type ScopeMoment = {
  /** Transits' moment and whether it follows the clock, and the progressed date (as the store's `time`). */
  at: number;
  live: boolean;
  progressionTarget: number;
  /** A Cycles page's year (numerology's, the year ahead's, BaZi's luck, Feng Shui's) and Feng Shui's solar month; null: now. */
  year: number | null;
  month: number | null;
};

/** A scope other than the main one: what its pages read, and where its runtimes publish. */
export type ChartScope = {
  id: Exclude<ScopeId, "main">;
  state: ScopeState;
  slots: SlotStore;
  /**
   * The reading stands beside the figure (a computer's side panel), not over
   * it: Compare's layout says (the main scope asks the window, as before).
   */
  readingBeside: boolean;
  /** Opens this scope's reading (the pick card's Read), when the view hosting the scope has one. */
  openReading?: () => void;
  /** The page it draws when not the studio's (a pane of Compare's two languages or two moments). */
  page?: StudioPage;
  /** Its own moment and how its dials move it (Compare's two moments); without one, the studio's time. */
  moment?: ScopeMoment;
  setMoment?: (patch: Partial<ScopeMoment>) => void;
};

export const ChartScopeContext = createContext<ChartScope | null>(null);

/** The scope around this part, null in the main one. */
export function useChartScope(): ChartScope | null {
  return useContext(ChartScopeContext);
}

export function useScopeId(): ScopeId {
  return useContext(ChartScopeContext)?.id ?? "main";
}

/** The page this part draws: its scope's own (a pane of Compare's mixed ways), else the studio's. */
export function useScopedPage(): StudioPage {
  const page = useStudioStore((s) => s.page);
  return useContext(ChartScopeContext)?.page ?? page;
}

const nothing = () => null;

/**
 * Reads the chart's state with a store-style selector: from the studio's
 * store in the main scope (subscribed as useStudioStore would be), from the
 * scope otherwise. Select a field or a stable value, as with the store.
 */
export function useScoped<T>(select: (s: ScopeState) => T): T {
  const scope = useContext(ChartScopeContext);
  const fromStore = useStudioStore((scope ? nothing : select) as (s: StudioState) => T);
  return scope ? select(scope.state) : fromStore;
}

/** The chart this part draws (null before one is cast). */
export function useScopedChart() {
  return useScoped((s) => s.chart);
}

const SUFFIX: Record<ScopeId, (base: string) => string> = {
  main: (base) => base,
  a: (base) => `${base}-a`,
  b: (base) => `${base}-b`,
  c: (base) => `${base}-c`,
  d: (base) => `${base}-d`,
};

/**
 * Element ids for this part: the main scope's as they always were (tests,
 * links and labels find them), a scope's with its letter, so that two copies
 * of a page never share one.
 */
export function useDomIds(): (base: string) => string {
  return SUFFIX[useScopeId()];
}

/** A key for what a part keeps for the studio's return (return-parts.ts): the main scope's as before, a scope's its own. */
export function useScopeKey(base: string): string {
  return useDomIds()(base);
}

/** The scope a node of the page belongs to: the region marked data-chart-scope around it, else the main one (preview-bus.ts reads it so too). */
export const scopeOfNode = scopeOf as (node: Element | null) => ScopeId;
