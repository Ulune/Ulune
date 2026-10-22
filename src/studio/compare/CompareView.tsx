import { FileImage, Download } from "lucide-react";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { LoadingLines } from "@/components/loading-lines";
import { lazyNamed } from "@/lib/lazy-component";
import { chartDisplayName, type SavedChart } from "@/lib/chart/library";
import type { CompareMoment } from "@/lib/space/records";
import { compareWords } from "@/lib/i18n/catalog/compare-words";
import { importWithRetry } from "@/lib/lazy-retry";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { isWide, setSheetOnWide } from "@/studio/dock/dock-layout";
import { useModeData } from "@/studio/modes/data";
import { MODE_META } from "@/studio/modes/meta";
import { useModeDef } from "@/studio/modes/registry";
import { ChartScopeContext, type ChartScope, type ScopeMoment } from "@/studio/scope";
import { useChartScopeHandle } from "@/studio/scope-handle";
import { ChartScopeProvider } from "@/studio/scope-provider";
import { ScopeStage } from "@/studio/stage/ScopeStage";
import { ExportSlotContext, useExportSlot } from "@/studio/stage/stage-slots";
import { dropPinLetGo, pinLetGo } from "@/studio/return-parts";
import { DRAWN_LARGER } from "@/studio/show/drawn-larger";
import { useShowMode } from "@/studio/show/show-state";
import { useStudioStore, type DockTab } from "@/studio/store";
import type { StudioPage } from "@/studio/url";
import { useStudioUrl } from "@/studio/use-studio-url";
import { trapTab } from "@/components/share/trap-tab";
import { comparablePage } from "@/studio/compare/comparable";
import { CompareBar } from "@/studio/compare/compare-bar";
import { arrange, momentOf, panesOf, readingBeside, startMoment, wayOf, type CompareMode } from "@/studio/compare/compare-modes";
import { CompareReading } from "@/studio/compare/CompareReading";
import { mergedPage } from "@/studio/compare/meet";
import { addSomeoneAsB, chooseIn, letGo, relink, setLangPage, setMoment, useCompare, useScopeData, useScopeReading } from "@/studio/compare/compare-store";
import { WHO, type Who } from "@/studio/compare/linked";
import { MergedTable, TablesChoice } from "@/studio/compare/merged";
import { PaneLabel } from "@/studio/compare/pane-label";
import { momentWords, pageWords } from "@/studio/compare/pane-words";
import { smallSummaryNow } from "@/studio/compare/small";
import "@/studio/modes/styles/pair.css";
import "@/studio/compare/compare.css";

/*
 * Compare: charts side by side (share and compare plan, feature 2, "Work"
 * step 2, with every language of step 3, and ideas B7 and B8). Drawn by the
 * workspace over the page's figure, under the toolbar (Stage's `beside`),
 * once Compare is on. Each pane is a page drawn in a chart scope of its own
 * (studio/scope.tsx). The page stays under Compare as it was, its choice,
 * zoom and scroll kept, and comes back as it was when Compare is left.
 *
 * Three ways, chosen in the bar (compare-modes.ts):
 *   - people: A, the chart shown, beside B (the switcher's "Compare with…",
 *     the list, or someone added), and a third and a fourth if asked for,
 *     drawn smaller; every pane follows the toolbar (language, page, Wheel or
 *     Table, the Look, the one time), and linked selection chooses in all;
 *   - one person, two languages: A's chart as the toolbar shows it, beside
 *     the same chart in another language and page, chosen in B's label; no
 *     linked selection (the two share no elements), but "Where they agree";
 *   - one chart, two moments: A's chart as the toolbar shows it, beside its
 *     language's Cycles page at a moment of B's own, which B's own dial moves
 *     (the one exception to the one time: B's scope has its own moment).
 *
 * The layout (the owner's rule): the reading stays in the side panel only
 * while each chart keeps its room (about 420 px of figure for two, 300 for
 * three or four); else it comes up from the bottom, the Dock's phone sheet.
 * Three or four stand in a row or a grid of two by two, whichever draws each
 * larger. Held upright on a phone, they stand one above the other (three or
 * four scroll, two to a screen); a press on a chart's label shows it full
 * size for a moment.
 */

/** A figure's summary in a pane too small to read it (small.ts): its own download, fetched when first needed. */
const SmallSummary = lazyNamed(() => import("@/studio/compare/small-summary"), "SmallSummary");

/** The side panel at its usual width (styles.css, --ob-panel-w); Compare keeps it there. */
const PANEL_W = 380;
/** Each of two panes' box beside the side panel: about 420 px of figure, with the pane's padding and the wheel's margin. */
const PANE_MIN = 490;
/** Narrower than this, the charts stand one above the other (a phone held upright). */
const STACK_UNDER = 600;
/** The toolbar's and Compare's bar's height, about, over the panes. */
const BARS_H = 110;
/** Narrower than this, a pane of one person's two languages or moments labels itself by its letter alone. */
const NARROW_LABEL = 460;

/** B: the one chosen, else Relationship's second person, else the chart kept last; never A. */
function pickB(rows: SavedChart[], aId: string | null, chosen: string | null, partner: string | null): string | null {
  const ok = (id: string | null): id is string => Boolean(id && id !== aId && rows.some((r) => r.id === id));
  if (ok(chosen)) return chosen;
  if (ok(partner)) return partner;
  return [...rows].filter((r) => r.id !== aId).sort((x, y) => y.savedAt - x.savedAt)[0]?.id ?? null;
}

type Layout = { beside: boolean; stacked: boolean; sheet: boolean; cols: number; rows: number };

/** Where the reading stands and how the charts stand, from the studio's width and the view's own. */
function useCompareLayout(root: RefObject<HTMLDivElement | null>, n: number): Layout {
  const [layout, setLayout] = useState<Layout>(() => ({ beside: isWide() && window.innerWidth - PANEL_W >= PANE_MIN * 2, stacked: false, sheet: false, cols: Math.min(n, 2), rows: n > 2 ? 2 : 1 }));
  useLayoutEffect(() => {
    const el = root.current;
    const body = el?.closest<HTMLElement>(".ob-body");
    if (!el || !body) return;
    let was = false;
    const measure = () => {
      const wide = isWide();
      const panes = el.querySelector<HTMLElement>(":scope > .ob-compare-panes");
      // The height the charts have, whichever side the reading is on: the body's, under the toolbar and
      // Compare's bar (a set allowance: their own heights change with the side the reading takes).
      const beside = wide && readingBeside(n, body.clientWidth, body.clientHeight - BARS_H, PANEL_W, PANE_MIN, was);
      was = beside;
      const stacked = el.clientWidth > 0 && el.clientWidth < STACK_UNDER;
      const sheet = wide && !beside;
      const fit = stacked ? { cols: 1, rows: n } : arrange(n, panes?.clientWidth || el.clientWidth, panes?.clientHeight || el.clientHeight);
      setLayout((l) =>
        l.beside === beside && l.stacked === stacked && l.sheet === sheet && l.cols === fit.cols && l.rows === fit.rows ? l : { beside, stacked, sheet, cols: fit.cols, rows: fit.rows },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    ro.observe(el);
    return () => ro.disconnect();
  }, [root, n]);
  // A wide screen without room for the side panel: the reading comes up from the bottom (the Dock's
  // phone sheet, dock-layout.ts), folded to start with; the panel as it was once Compare is left.
  useLayoutEffect(() => {
    if (!layout.sheet) return;
    const body = root.current?.closest<HTMLElement>(".ob-body");
    if (!body) return;
    body.setAttribute("data-compare-sheet", "");
    setSheetOnWide(true);
    const was = useStudioStore.getState().dockOpen;
    useStudioStore.setState({ dockOpen: false });
    return () => {
      body.removeAttribute("data-compare-sheet");
      setSheetOnWide(false);
      useStudioStore.setState({ dockOpen: was });
    };
  }, [layout.sheet, root]);
  useEffect(() => {
    useCompare.setState({ beside: layout.beside, stacked: layout.stacked });
  }, [layout.beside, layout.stacked]);
  return layout;
}

/**
 * Over the page, under the toolbar: the page's figure and footer wait hidden under Compare (compare.css),
 * where the stage was scrolled is kept, and all comes back as it was when Compare goes.
 */
function useOverPage(root: RefObject<HTMLDivElement | null>): void {
  useLayoutEffect(() => {
    const el = root.current;
    const section = el?.parentElement;
    if (!el || !section) return;
    const strip = section.querySelector<HTMLElement>(":scope > .ob-strip");
    section.setAttribute("data-compare", "");
    const top = section.scrollTop;
    section.scrollTop = 0;
    const place = () => el.style.setProperty("--cmp-top", `${strip ? strip.offsetTop + strip.offsetHeight : 0}px`);
    place();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    if (strip) ro?.observe(strip);
    return () => {
      ro?.disconnect();
      section.removeAttribute("data-compare");
      section.scrollTop = top;
    };
  }, [root]);
}

/**
 * The page as Compare found it: its choice (or the one a press on the toolbar let go of on the way in,
 * return-parts.ts) and its panel's tab, given back when Compare is left (not when it steps aside for a
 * moment, the birth form of someone new). Kept here, across the view's own comings and goings.
 */
let found: { selectedId: string | null; dock: DockTab; dockOpen: boolean } | null = null;

function useFoundPage(): void {
  useEffect(() => {
    const s = useStudioStore.getState();
    if (!found) found = { selectedId: s.selectedId ?? pinLetGo()?.id ?? null, dock: s.dock, dockOpen: s.dockOpen };
    // Put aside while Compare is on: the page's own card and the Reading tab's name are the charts' now.
    if (s.selectedId) useStudioStore.setState({ selectedId: null });
    return () => {
      const now = useStudioStore.getState();
      // A page Compare does not show (a Relationship page, the Calendar, a home): Compare is left.
      if (now.compare.on && !comparablePage(now.page)) useStudioStore.setState({ compare: { ...now.compare, on: false } });
      if (useStudioStore.getState().compare.on || !found) return;
      const was = found;
      found = null;
      dropPinLetGo();
      useStudioStore.setState({ selectedId: now.selectedId ?? was.selectedId, dock: was.dock, dockOpen: was.dockOpen });
    };
  }, []);
}

/** "Now" for B's moment while it follows the clock: once a minute, while the tab is shown (as the live sky). */
function useLiveTick(on: boolean): void {
  useEffect(() => {
    if (!on) return;
    const tick = () => document.visibilityState === "visible" && useCompare.setState({ liveAt: Date.now() });
    useCompare.setState({ liveAt: Date.now() });
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [on]);
}

/**
 * B's own moment in two moments (idea B7), as kept with Compare; started (and kept) when there is none
 * for its page, a step on when A shows the same page; and how B's dials move it.
 */
function useMomentB(mode: CompareMode, page: StudioPage, pageB: StudioPage | null) {
  const kept = useStudioStore((s) => s.compare.moment);
  const liveAt = useCompare((s) => s.liveAt);
  const on = mode === "moments" && pageB != null;
  const read = useMemo(() => (on ? momentOf(kept, liveAt) : null), [on, kept, liveAt]);
  const moment: CompareMoment | null = read && read.page === pageB ? read : null;
  const latest = useRef(moment);
  latest.current = moment;
  // None kept for B's page, or A just came to B's page while B shows now: B starts afresh.
  const at = useRef<string | null>(null);
  useEffect(() => {
    if (!on || !pageB) {
      at.current = null;
      return;
    }
    const where = `${page}|${pageB}`;
    const cameTo = at.current !== null && at.current !== where && page === pageB;
    at.current = where;
    const m = latest.current;
    if (m && !(cameTo && m.live && m.year == null)) return;
    useStudioStore.setState((s) => ({ compare: { ...s.compare, moment: startMoment(page, pageB, Date.now()) } }));
  }, [on, page, pageB]);
  useLiveTick(Boolean(moment?.live));
  const scopeMoment = useMemo<ScopeMoment | undefined>(
    () => (moment ? { at: moment.at, live: moment.live, progressionTarget: moment.progressionTarget, year: moment.year, month: moment.month } : undefined),
    [moment],
  );
  const set = useCallback((patch: Partial<ScopeMoment>) => {
    if (latest.current) setMoment(patch, latest.current);
  }, []);
  // B's Cycles page where its language has two (astrology's): the moment goes with it.
  const setPage = useCallback((next: StudioPage) => {
    if (latest.current) setMoment({ page: next }, latest.current);
  }, []);
  return { moment: scopeMoment, setMoment: set, setMomentPage: setPage };
}

export function CompareView() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const view = useStudioStore((s) => s.view);
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const record = useStudioStore((s) => s.compare);
  const partnerId = useStudioStore((s) => s.pair.partnerId);
  const plain = useShowMode((s) => s.on);
  const table = view === "table";
  const { setPage } = useStudioUrl({ hydrate: false });

  const rowA = rows.find((r) => r.id === activeId) ?? null;
  const bPerson = pickB(rows, activeId, record.partnerId, partnerId);
  const way = useMemo(() => wayOf(record, page, rows.map((r) => r.id), activeId, bPerson), [record, page, rows, activeId, bPerson]);
  const { mode } = way;
  const shown = useMemo(() => panesOf(mode, way.more.length), [mode, way.more.length]);
  const n = shown.length;
  const paneRows = useMemo<Record<Who, SavedChart | null>>(() => {
    const of = (id: string | null | undefined) => rows.find((r) => r.id === id) ?? null;
    const people = mode === "people";
    return { a: rowA, b: people ? of(bPerson) : rowA, c: people ? of(way.more[0]) : null, d: people ? of(way.more[1]) : null };
  }, [rows, rowA, bPerson, way.more, mode]);
  const pageB = mode === "languages" ? way.langPage : mode === "moments" ? way.momentPage : null;
  const pages = useMemo<Record<Who, StudioPage>>(() => ({ a: page, b: pageB ?? page, c: page, d: page }), [page, pageB]);
  const names = useMemo(() => {
    const out = {} as Record<Who, string>;
    for (const w of WHO) out[w] = paneRows[w] ? chartDisplayName(paneRows[w]!.input, t("untitled")) : "";
    return out;
  }, [paneRows, t]);

  // The second person found here is kept as Compare's (sealed in the space with it).
  useEffect(() => {
    if (bPerson && bPerson !== record.partnerId) useStudioStore.setState((s) => ({ compare: { ...s.compare, partnerId: bPerson } }));
  }, [bPerson, record.partnerId]);

  const rootRef = useRef<HTMLDivElement>(null);
  useFoundPage();
  useOverPage(rootRef);
  const { beside, stacked, cols, rows: gridRows } = useCompareLayout(rootRef, n);
  const { moment, setMoment: setMomentB, setMomentPage } = useMomentB(mode, page, pageB);

  const sel = useCompare((s) => s.sel);
  const merged = useCompare((s) => s.merged);
  const openReading = useCallback(() => useStudioStore.getState().openDock("reading"), []);
  const common = (who: Who) => ({
    id: who,
    row: shown.includes(who) ? paneRows[who] : null,
    selectedId: sel[who],
    onSelect: (next: string | null, how: "pick" | "choose" | "clear") => chooseIn(who, next, how),
    readingBeside: beside,
    openReading,
  });
  const scopeA = useChartScopeHandle(common("a"));
  const scopeB = useChartScopeHandle({ ...common("b"), page: pageB ?? undefined, moment: mode === "moments" ? moment : undefined, setMoment: setMomentB });
  const scopeC = useChartScopeHandle(common("c"));
  const scopeD = useChartScopeHandle(common("d"));
  const scopes = useMemo<Record<Who, ChartScope>>(() => ({ a: scopeA, b: scopeB, c: scopeC, d: scopeD }), [scopeA, scopeB, scopeC, scopeD]);
  useLayoutEffect(() => {
    const shownRows = { a: paneRows.a, b: paneRows.b, c: shown.includes("c") ? paneRows.c : null, d: shown.includes("d") ? paneRows.d : null };
    useCompare.setState({ scopes, rows: shownRows, shown, mode, pages });
  }, [scopes, paneRows, shown, mode, pages]);
  // Other panes (another person, one more or one fewer, another way): with linked selection, they take the choice again.
  const panesKey = `${mode}|${shown.map((w) => paneRows[w]?.id ?? "").join(",")}|${pageB ?? ""}`;
  const shownKey = useRef(panesKey);
  useEffect(() => {
    if (shownKey.current === panesKey) return;
    shownKey.current = panesKey;
    relink();
  }, [panesKey]);
  // Compare left (not a moment's form for someone new): the next one starts with nothing chosen.
  useEffect(
    () => () => {
      if (!useStudioStore.getState().compare.on) {
        letGo();
        useCompare.setState({ scopes: { a: null, b: null, c: null, d: null }, rows: { a: null, b: null, c: null, d: null } });
      }
    },
    [],
  );

  useSharedLayer(scopes, shown);

  // One chart full size for a moment (a phone held upright): its label opens it, ✕ or Escape closes it.
  const [full, setFull] = useState<Who | null>(null);
  const labelRefs = useRef<Record<Who, HTMLButtonElement | null>>({ a: null, b: null, c: null, d: null });
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasFull = useRef<Who | null>(null);
  useEffect(() => {
    if (full) closeRef.current?.focus();
    else if (wasFull.current) labelRefs.current[wasFull.current]?.focus();
    wasFull.current = full;
  }, [full]);
  useEffect(() => {
    if (!stacked || (full && !shown.includes(full))) setFull(null);
  }, [stacked, full, shown]);

  // Escape: the chart full size goes back first; then the charts' choices are let go.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (full) {
        e.preventDefault();
        setFull(null);
        return;
      }
      const at = e.target instanceof Element ? e.target : null;
      if (at?.closest("input, textarea, select, [role=menu], [role=dialog], [role=alertdialog], [role=listbox]")) return;
      if (document.querySelector("[role=menu], [role=alertdialog], [data-testid=chart-picker], [data-testid=command-palette]")) return;
      const now = useCompare.getState().sel;
      if (WHO.some((w) => now[w])) letGo();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [full]);

  // Numerology's and BaZi's one table, a column for each person: for people only.
  const mergedOn = table && mode === "people" && Boolean(paneRows.b) && mergedPage(page);
  const region = mode === "languages" ? T("cmpWayLanguagesHint") : mode === "moments" ? T("cmpWayMomentsHint") : n > 2 ? T("cmpRegionMany", { n }) : T("cmpRegion");
  const panesStyle = { "--cmp-cols": cols, "--cmp-rows": gridRows } as CSSProperties;
  return (
    <div
      ref={rootRef}
      className="ob-compare"
      data-testid="compare"
      data-page={page}
      data-view={view}
      data-mode={mode}
      data-count={n}
      data-layout={stacked ? "stacked" : "side"}
      data-reading={beside ? "beside" : "sheet"}
      data-full={full ?? undefined}
      role="region"
      aria-label={region}
    >
      {/* Each chart's runtimes (modes/data.tsx), whatever the panes show. */}
      {shown.map((w) => (paneRows[w] || w === "b" ? <ChartScopeProvider key={w} scope={scopes[w]} /> : null))}
      <CompareBar mode={mode} rows={rows} rowA={rowA} rowB={mode === "people" ? paneRows.b : null} more={[paneRows.c, paneRows.d].filter((r): r is SavedChart => Boolean(r) && mode === "people")} names={names} />
      {mergedOn ? <TablesChoice /> : null}
      {mergedOn && merged ? <MergedTable people={shown.filter((w) => paneRows[w]).map((w) => ({ who: w, scope: scopes[w], name: names[w] }))} /> : null}
      <div
        className="ob-compare-panes"
        data-testid="compare-panes"
        data-count={n}
        data-arrange={n > 2 && !stacked ? (cols === 2 ? "grid" : "row") : undefined}
        style={panesStyle}
        hidden={mergedOn && merged}
      >
        {shown.map((who) => (
          <Pane
            key={who}
            who={who}
            scope={scopes[who]}
            row={paneRows[who]}
            name={names[who]}
            mode={mode}
            page={pages[who]}
            otherPage={who === "a" ? pages.b : pages.a}
            moment={who === "b" ? moment : undefined}
            onPage={
              mode === "languages"
                ? who === "a"
                  ? (p) => setPage(p)
                  : who === "b"
                    ? setLangPage
                    : undefined
                : mode === "moments" && who === "b"
                  ? setMomentPage
                  : undefined
            }
            count={n}
            plain={plain}
            table={table}
            stacked={stacked}
            full={full === who}
            onFull={setFull}
            labelRef={(el) => {
              labelRefs.current[who] = el;
            }}
            closeRef={full === who ? closeRef : undefined}
          />
        ))}
      </div>
      <CompareCard beside={beside} />
      <ReadingHost />
      <ExportAll names={names} shown={shown} pages={pages} />
    </div>
  );
}

/**
 * Human Design's layer (Personality, Design or both) is the toolbar's, as on the page: every
 * bodygraph shown follows it (each pane keeps its own otherwise, modes/hooks/useHumanDesign.ts).
 */
function useSharedLayer(scopes: Record<Who, ChartScope>, shown: Who[]): void {
  const page = useStudioStore((s) => s.page);
  const main = useModeData("design");
  type Layer = { view?: string; setView?: (v: never) => void } | undefined;
  const da = useScopeData(scopes.a, "design") as Layer;
  const db = useScopeData(scopes.b, "design") as Layer;
  const dc = useScopeData(scopes.c, "design") as Layer;
  const dd = useScopeData(scopes.d, "design") as Layer;
  const want = main?.view;
  useEffect(() => {
    if (page !== "design" || !want) return;
    const data: Record<Who, Layer> = { a: da, b: db, c: dc, d: dd };
    for (const w of shown) {
      const d = data[w];
      // A pane drawing another page (two languages, two moments) keeps its own.
      if ((scopes[w].page ?? page) === "design" && d?.setView && d.view !== want) d.setView(want as never);
    }
  }, [page, want, da, db, dc, dd, shown, scopes]);
}

function Pane({
  who,
  scope,
  row,
  name,
  mode,
  page,
  otherPage,
  moment,
  onPage,
  count,
  plain,
  table,
  stacked,
  full,
  onFull,
  labelRef,
  closeRef,
}: {
  who: Who;
  scope: ChartScope;
  row: SavedChart | null;
  name: string;
  mode: CompareMode;
  page: StudioPage;
  otherPage: StudioPage;
  moment?: ScopeMoment;
  onPage?: (page: StudioPage) => void;
  count: number;
  plain: boolean;
  table: boolean;
  stacked: boolean;
  full: boolean;
  onFull: (who: Who | null) => void;
  labelRef: (el: HTMLButtonElement | null) => void;
  closeRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const { def } = useModeDef(page);
  const letter = who.toUpperCase();
  const title = row ? `${letter} · ${name}` : letter;
  // A figure too small to read in a pane of three or four: its summary instead (small.ts says which).
  const ref = useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setSize((s) => (s.width === el.clientWidth && s.height === el.clientHeight ? s : { width: el.clientWidth, height: el.clientHeight }));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  const small = !table && !full && smallSummaryNow(page, count, width, height);
  // One person in a narrow pane (a phone, a tablet's half): its label keeps the letter, so the page's list fits beside it.
  const short = mode !== "people" && (stacked || (width > 0 && width < NARROW_LABEL));
  // What the pane shows, for a screen reader: "Chart B: Camille, Human Design · Natal" (or its moment).
  const what = mode === "languages" ? pageWords(page, t, T) : mode === "moments" ? [pageWords(page, t, T), moment ? momentWords(page, moment, locale, T) : ""].filter(Boolean).join(", ") : "";
  const regionName = row ? (what ? T("cmpPaneWhat", { letter, name, what }) : T("cmpPane", { letter, name })) : letter;
  let body: ReactNode;
  if (!row) body = who === "b" ? <ChooseB /> : null;
  else if (!def) body = <LoadingLines lines={4} />;
  else if (table) body = <div className="ulune-table-view min-w-0">{def.Data ? <def.Data /> : null}</div>;
  else if (small)
    body = (
      <div className="ob-compare-small-box">
        <p className="ob-compare-small" data-testid={`compare-small-${who}`}>
          {T("cmpSmallTable")}
        </p>
        <Suspense fallback={<LoadingLines lines={4} />}>
          <SmallSummary page={page as "design" | "numerology"} testId={`compare-summary-${who}`} />
        </Suspense>
      </div>
    );
  else body = <def.Figure />;
  // B's own page (two languages, two moments) brings its own controls into its bar: the toolbar's are A's.
  const controls = who === "b" && mode !== "people" && row && def?.Controls && !plain ? <def.Controls /> : null;
  return (
    <ChartScopeContext.Provider value={scope}>
      {/* A pane's table keeps its Copy and CSV to its own parts: the toolbar's menu is the page's and Compare's. */}
      <ExportSlotContext.Provider value={null}>
        <div
          ref={ref}
          className="ob-compare-pane"
          data-testid={`compare-pane-${who}`}
          data-pane={who}
          data-chart={row?.id ?? ""}
          data-page={page}
          data-selected={scope.state.selectedId ?? ""}
          data-small={small ? "" : undefined}
          // Show mode draws the pages drawn at a set size larger, two to a screen (compare.css).
          data-larger={count <= 2 && DRAWN_LARGER.has(page) ? "" : undefined}
          data-full={full ? "" : undefined}
          role={full ? "dialog" : "region"}
          aria-modal={full || undefined}
          aria-label={regionName}
          // Full size, a dialog of its own: Tab goes round within it until it closes (✕, Escape).
          onKeyDown={full ? (e) => trapTab(e, e.currentTarget) : undefined}
        >
          <ScopeStage
            testId={`compare-stage-${who}`}
            table={table && Boolean(row)}
            controls={controls}
            label={
              <PaneLabel
                who={who}
                title={title}
                mode={mode}
                page={page}
                otherPage={otherPage}
                moment={moment}
                onPage={onPage}
                plain={plain}
                stacked={stacked && Boolean(row)}
                short={short}
                full={full}
                onFull={onFull}
                labelRef={labelRef}
                closeRef={closeRef}
              />
            }
            caption={!table && !small && row && def?.Caption ? <def.Caption /> : null}
          >
            {body}
          </ScopeStage>
        </div>
      </ExportSlotContext.Provider>
    </ChartScopeContext.Provider>
  );
}

/** Pane B without a second person yet: pick one above, or add someone. */
function ChooseB() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  return (
    <div className="ob-compare-empty" data-testid="compare-choose">
      <p className="ob-compare-empty-h">{T("cmpChoose")}</p>
      <p className="ob-compare-empty-p">{T("cmpChooseHint")}</p>
      <button type="button" className="ob-btn" data-testid="compare-add" onClick={addSomeoneAsB}>
        {t("pairAddSomeone")}
      </button>
    </div>
  );
}

/**
 * With the reading from the bottom, what was chosen in the charts in one line over the folded
 * sheet's tabs (as the page's own pick card, components/pick-card.tsx), and Read.
 */
function CompareCard({ beside }: { beside: boolean }) {
  const { t } = useI18n();
  const page = useStudioStore((s) => s.page);
  const dockOpen = useStudioStore((s) => s.dockOpen);
  const sel = useCompare((s) => s.sel);
  const scopes = useCompare((s) => s.scopes);
  const who: Who | null = sel.last ?? WHO.find((w) => sel[w]) ?? null;
  const reading = useScopeReading(who ? scopes[who] : null, page);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost(document.querySelector<HTMLElement>(".ob-body .ob-panel-head"));
  }, [beside]);
  if (beside || dockOpen || !who || !reading || !host) return null;
  return createPortal(
    <div className="ulune-pick-card" data-testid="compare-card" role="status" data-chart-pick>
      <span className="ulune-pick-card-text" onClick={() => useStudioStore.getState().openDock("reading")}>
        {reading.title}
      </span>
      <button type="button" className="ulune-pick-card-read" data-testid="compare-card-read" onClick={() => useStudioStore.getState().openDock("reading")}>
        {t("pickRead")}
      </button>
      <button type="button" className="ulune-pick-card-close" data-testid="compare-card-close" aria-label={t("pickClose")} onClick={letGo}>
        <X className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>,
    host,
  );
}

/** The reading for two or more, in the panel's Reading tab, over the page's own reading (which waits under it as it was). */
function ReadingHost() {
  const dock = useStudioStore((s) => s.dock);
  const [host, setHost] = useState<HTMLElement | null>(null);
  // The panel's pane is drawn anew for each tab (Dock.tsx): found again once it is the Reading tab's.
  useLayoutEffect(() => {
    setHost(dock === "reading" ? document.querySelector<HTMLElement>(".ob-body > .ob-panel .ob-panel-pane") : null);
  }, [dock]);
  return host ? createPortal(<CompareReading />, host) : null;
}

const CAPTION_KEY = "ulune.export.caption";

/**
 * "Both side by side" ("All side by side" for three or four, idea B8) in the toolbar's Share and
 * export (or ⋯), where every pane's page is one drawing (decision C5).
 */
function ExportAll({ names, shown, pages }: { names: Record<Who, string>; shown: Who[]; pages: Record<Who, StudioPage> }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const slot = useExportSlot();
  const view = useStudioStore((s) => s.view);
  const [busy, setBusy] = useState(false);
  // The names and births under the pictures as the single export's: off until asked for (ExportMenu.tsx).
  const [withCaption, setWithCaption] = useState(() => {
    try {
      return window.localStorage.getItem(CAPTION_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (!slot || view !== "wheel" || shown.some((w) => MODE_META[pages[w]].noPicture)) return null;
  const all = shown.length > 2;
  const run = (kind: "png" | "svg") => {
    setBusy(true);
    const people = [...new Set(shown.map((w) => names[w]))];
    const what = [...new Set(shown.map((w) => pages[w]))];
    void importWithRetry(() => import("@/studio/compare/export-both"))
      .then((m) => m.exportBoth(kind, { panes: shown, withCaption, locale, t, file: `${people.join("-")}-${what.join("-")}-${T("cmpExportFile")}` }))
      .finally(() => setBusy(false));
  };
  const item = (kind: "png" | "svg", icon: ReactNode, label: string) => (
    <button type="button" role="menuitem" className="ob-menu-item" data-testid={`compare-export-${kind}`} disabled={busy} onClick={() => run(kind)}>
      {icon}
      <span>{label}</span>
    </button>
  );
  return createPortal(
    <div role="group" aria-label={all ? T("cmpRegionMany", { n: shown.length }) : T("cmpRegion")} className="ob-compare-export" data-testid="compare-export">
      {item("png", <FileImage className="size-4" strokeWidth={1.75} aria-hidden />, T(all ? "cmpExportAllPng" : "cmpExportPng"))}
      {item("svg", <Download className="size-4" strokeWidth={1.75} aria-hidden />, T(all ? "cmpExportAllSvg" : "cmpExportSvg"))}
      <label className="ob-menu-item ob-menu-check" data-testid="compare-export-caption">
        <input
          type="checkbox"
          checked={withCaption}
          onChange={(e) => {
            setWithCaption(e.target.checked);
            try {
              window.localStorage.setItem(CAPTION_KEY, e.target.checked ? "1" : "0");
            } catch {
              /* this visit only */
            }
          }}
        />
        <span>{t("exportCaption")}</span>
      </label>
    </div>,
    slot,
  );
}

