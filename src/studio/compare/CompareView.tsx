import { FileImage, Download, Link2, Maximize2, Users, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { LoadingLines } from "@/components/loading-lines";
import { chartDisplayName, type SavedChart } from "@/lib/chart/library";
import { compareWords } from "@/lib/i18n/catalog/compare-words";
import { importWithRetry } from "@/lib/lazy-retry";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { cn } from "@/lib/utils";
import { isWide, setSheetOnWide } from "@/studio/dock/dock-layout";
import { useModeData } from "@/studio/modes/data";
import { MODE_META, PAGE_LABEL } from "@/studio/modes/meta";
import { PairSelects, type PairPick } from "@/studio/modes/pair-selects";
import { useModeDef } from "@/studio/modes/registry";
import type { ModeDef } from "@/studio/modes/types";
import { ChartScopeContext, type ChartScope } from "@/studio/scope";
import { useChartScopeHandle } from "@/studio/scope-handle";
import { ChartScopeProvider } from "@/studio/scope-provider";
import { ScopeStage } from "@/studio/stage/ScopeStage";
import { ExportSlotContext, useExportSlot } from "@/studio/stage/stage-slots";
import { dropPinLetGo, pinLetGo } from "@/studio/return-parts";
import { useStudioStore, type DockTab } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";
import { trapTab } from "@/components/share/trap-tab";
import { comparablePage } from "@/studio/compare/comparable";
import { CompareReading } from "@/studio/compare/CompareReading";
import { mergedPage, relationshipPageOf } from "@/studio/compare/meet";
import { addSomeoneAsB, chooseIn, letGo, relinkB, setLinked, swapPeople, useCompare, useScopeData, useScopeReading } from "@/studio/compare/compare-store";
import { leaveCompare } from "@/studio/compare/gate";
import type { Who } from "@/studio/compare/linked";
import { MergedTable, TablesChoice } from "@/studio/compare/merged";
import "@/studio/modes/styles/pair.css";
import "@/studio/compare/compare.css";

/*
 * Compare: two charts side by side (share and compare plan, feature 2, "Work"
 * step 2, with every language of step 3). Drawn by the workspace over the
 * page's figure, under the toolbar (Stage's `beside`), once Compare is on: A
 * is the chart shown, B the one chosen (the switcher's "Compare with…", the
 * list here, or someone added). Each pane is the page itself drawn in a chart
 * scope of its own (studio/scope.tsx), so both follow the toolbar: the
 * language, the page, Wheel or Table, the Look and the one time (a dial
 * drives both). The page stays under Compare as it was, its choice, zoom and
 * scroll kept, and comes back as it was when Compare is left.
 *
 * The layout (the owner's rule): the reading stays in the side panel only
 * while each chart keeps about 420 px of figure, so from about 1360 px; under
 * that it comes up from the bottom, the Dock's phone sheet. Held upright on a
 * phone, the two stand one above the other, half the height each; a press on
 * a chart's label shows it full size for a moment.
 */

/** The side panel at its usual width (styles.css, --ob-panel-w); Compare keeps it there. */
const PANEL_W = 380;
/** Each pane's box beside the side panel: about 420 px of figure, with the pane's padding and the wheel's margin. */
const PANE_MIN = 490;
/** Narrower than this, the two charts stand one above the other (a phone held upright). */
const STACK_UNDER = 600;

/** B: the one chosen, else Relationship's second person, else the chart kept last; never A. */
function pickB(rows: SavedChart[], aId: string | null, chosen: string | null, partner: string | null): string | null {
  const ok = (id: string | null): id is string => Boolean(id && id !== aId && rows.some((r) => r.id === id));
  if (ok(chosen)) return chosen;
  if (ok(partner)) return partner;
  return [...rows].filter((r) => r.id !== aId).sort((x, y) => y.savedAt - x.savedAt)[0]?.id ?? null;
}

type Layout = { beside: boolean; stacked: boolean; sheet: boolean };

/** Where the reading stands and how the two charts stand, from the studio's width and the view's own. */
function useCompareLayout(root: RefObject<HTMLDivElement | null>): Layout {
  const [layout, setLayout] = useState<Layout>(() => ({ beside: isWide() && window.innerWidth - PANEL_W >= PANE_MIN * 2, stacked: false, sheet: false }));
  useLayoutEffect(() => {
    const el = root.current;
    const body = el?.closest<HTMLElement>(".ob-body");
    if (!el || !body) return;
    const measure = () => {
      const wide = isWide();
      const beside = wide && (body.clientWidth - PANEL_W) / 2 >= PANE_MIN;
      const stacked = el.clientWidth > 0 && el.clientWidth < STACK_UNDER;
      const sheet = wide && !beside;
      setLayout((l) => (l.beside === beside && l.stacked === stacked && l.sheet === sheet ? l : { beside, stacked, sheet }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    ro.observe(el);
    return () => ro.disconnect();
  }, [root]);
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
    // Put aside while Compare is on: the page's own card and the Reading tab's name are the two charts' now.
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

export function CompareView() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const view = useStudioStore((s) => s.view);
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const chosenB = useStudioStore((s) => s.compare.partnerId);
  const partnerId = useStudioStore((s) => s.pair.partnerId);
  const { def } = useModeDef(page);
  const table = view === "table";
  const rowA = rows.find((r) => r.id === activeId) ?? null;
  const bId = pickB(rows, activeId, chosenB, partnerId);
  const rowB = rows.find((r) => r.id === bId) ?? null;
  const nameA = rowA ? chartDisplayName(rowA.input, t("untitled")) : "";
  const nameB = rowB ? chartDisplayName(rowB.input, t("untitled")) : "";

  // The second person found here is kept as Compare's (sealed in the space with it).
  useEffect(() => {
    if (bId && bId !== chosenB) useStudioStore.setState((s) => ({ compare: { ...s.compare, partnerId: bId } }));
  }, [bId, chosenB]);

  const rootRef = useRef<HTMLDivElement>(null);
  useFoundPage();
  useOverPage(rootRef);
  const { beside, stacked } = useCompareLayout(rootRef);

  const sel = useCompare((s) => s.sel);
  const merged = useCompare((s) => s.merged);
  const openReading = useCallback(() => useStudioStore.getState().openDock("reading"), []);
  const scopeA = useChartScopeHandle({ id: "a", row: rowA, selectedId: sel.a, onSelect: (next, how) => chooseIn("a", next, how), readingBeside: beside, openReading });
  const scopeB = useChartScopeHandle({ id: "b", row: rowB, selectedId: sel.b, onSelect: (next, how) => chooseIn("b", next, how), readingBeside: beside, openReading });
  useLayoutEffect(() => {
    useCompare.setState({ scopes: { a: scopeA, b: scopeB }, rows: { a: rowA, b: rowB } });
  }, [scopeA, scopeB, rowA, rowB]);
  // Another B: with linked selection it takes A's choice again, in its own terms.
  const shownB = useRef(bId);
  useEffect(() => {
    if (shownB.current === bId) return;
    shownB.current = bId;
    relinkB();
  }, [bId]);
  // Compare left (not a moment's form for someone new): the next one starts with nothing chosen.
  useEffect(
    () => () => {
      if (!useStudioStore.getState().compare.on) {
        letGo();
        useCompare.setState({ scopes: { a: null, b: null }, rows: { a: null, b: null } });
      }
    },
    [],
  );

  useSharedLayer(scopeA, scopeB);

  // One chart full size for a moment (a phone held upright): its label opens it, ✕ or Escape closes it.
  const [full, setFull] = useState<Who | null>(null);
  const labelRefs = useRef<Record<Who, HTMLButtonElement | null>>({ a: null, b: null });
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasFull = useRef<Who | null>(null);
  useEffect(() => {
    if (full) closeRef.current?.focus();
    else if (wasFull.current) labelRefs.current[wasFull.current]?.focus();
    wasFull.current = full;
  }, [full]);
  useEffect(() => {
    if (!stacked) setFull(null);
  }, [stacked]);

  // Escape: the chart full size goes back first; then the two charts' choice is let go.
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
      const { a, b } = useCompare.getState().sel;
      if (a || b) letGo();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [full]);

  const shown = (who: Who) => (who === "a" ? { scope: scopeA, row: rowA, name: nameA } : { scope: scopeB, row: rowB, name: nameB });

  return (
    <div
      ref={rootRef}
      className="ob-compare"
      data-testid="compare"
      data-page={page}
      data-view={view}
      data-layout={stacked ? "stacked" : "side"}
      data-reading={beside ? "beside" : "sheet"}
      data-full={full ?? undefined}
      role="region"
      aria-label={T("cmpRegion")}
    >
      {/* Each chart's runtimes (modes/data.tsx), whatever the panes show. */}
      <ChartScopeProvider scope={scopeA} />
      <ChartScopeProvider scope={scopeB} />
      <CompareBar rowA={rowA} rowB={rowB} rows={rows} nameA={nameA} nameB={nameB} />
      {table && rowB && mergedPage(page) ? <TablesChoice /> : null}
      {table && rowB && mergedPage(page) && merged ? <MergedTable a={scopeA} b={scopeB} nameA={nameA} nameB={nameB} /> : null}
      <div className="ob-compare-panes" data-testid="compare-panes" hidden={table && Boolean(rowB) && mergedPage(page) && merged}>
        {(["a", "b"] as const).map((who) => {
          const s = shown(who);
          return (
            <Pane
              key={who}
              who={who}
              scope={s.scope}
              row={s.row}
              name={s.name}
              def={def}
              table={table}
              stacked={stacked}
              full={full === who}
              onFull={setFull}
              labelRef={(el) => {
                labelRefs.current[who] = el;
              }}
              closeRef={full === who ? closeRef : undefined}
            />
          );
        })}
      </div>
      <CompareCard beside={beside} />
      <ReadingHost />
      <ExportBoth nameA={nameA} nameB={nameB} />
    </div>
  );
}

/**
 * Human Design's layer (Personality, Design or both) is the toolbar's, as on the page: both
 * bodygraphs follow it (each pane keeps its own otherwise, modes/hooks/useHumanDesign.ts).
 */
function useSharedLayer(a: ChartScope, b: ChartScope): void {
  const page = useStudioStore((s) => s.page);
  const main = useModeData("design");
  const da = useScopeData(a, "design") as { view?: string; setView?: (v: never) => void } | undefined;
  const db = useScopeData(b, "design") as { view?: string; setView?: (v: never) => void } | undefined;
  const want = main?.view;
  useEffect(() => {
    if (page !== "design" || !want) return;
    for (const d of [da, db]) if (d?.setView && d.view !== want) d.setView(want as never);
  }, [page, want, da, db]);
}

function Pane({
  who,
  scope,
  row,
  name,
  def,
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
  def: ModeDef | null;
  table: boolean;
  stacked: boolean;
  full: boolean;
  onFull: (who: Who | null) => void;
  labelRef: (el: HTMLButtonElement | null) => void;
  closeRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const letter = who.toUpperCase();
  const title = row ? `${letter} · ${name}` : letter;
  const mark = <span className={cn("ob-compare-mark", `is-${who}`)} aria-hidden />;
  const label = full ? (
    <span className="ob-compare-label">
      {mark}
      <span className="ob-compare-name">{title}</span>
      <button
        ref={closeRef}
        type="button"
        className="ob-icon-btn ob-compare-full-close"
        data-testid="compare-full-close"
        aria-label={T("cmpFullClose")}
        title={T("cmpFullClose")}
        onClick={() => onFull(null)}
      >
        <X className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </span>
  ) : stacked && row ? (
    <button
      ref={labelRef}
      type="button"
      className="ob-compare-label is-button"
      data-testid={`compare-label-${who}`}
      aria-label={T("cmpFullOpen", { name: title })}
      title={T("cmpFullOpen", { name: title })}
      onClick={() => onFull(who)}
    >
      {mark}
      <span className="ob-compare-name">{title}</span>
      <Maximize2 className="ob-compare-grow size-3.5" strokeWidth={1.75} aria-hidden />
    </button>
  ) : (
    <span className="ob-compare-label" data-testid={`compare-label-${who}`}>
      {mark}
      <span className="ob-compare-name">{title}</span>
    </span>
  );
  let body: ReactNode;
  if (!row) body = <ChooseB />;
  else if (!def) body = <LoadingLines lines={4} />;
  else if (table) body = <div className="ulune-table-view min-w-0">{def.Data ? <def.Data /> : null}</div>;
  else body = <def.Figure />;
  return (
    <ChartScopeContext.Provider value={scope}>
      {/* A pane's table keeps its Copy and CSV to its own parts: the toolbar's menu is the page's and Compare's. */}
      <ExportSlotContext.Provider value={null}>
        <div
          className="ob-compare-pane"
          data-testid={`compare-pane-${who}`}
          data-pane={who}
          data-chart={row?.id ?? ""}
          data-selected={scope.state.selectedId ?? ""}
          data-full={full ? "" : undefined}
          role={full ? "dialog" : "region"}
          aria-modal={full || undefined}
          aria-label={title}
          // Full size, a dialog of its own: Tab goes round within it until it closes (✕, Escape).
          onKeyDown={full ? (e) => trapTab(e, e.currentTarget) : undefined}
        >
          <ScopeStage
            testId={`compare-stage-${who}`}
            table={table && Boolean(row)}
            label={label}
            caption={!table && row && def?.Caption ? <def.Caption /> : null}
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

/** The two people (Relationship's lists, A the chart shown everywhere), Swap, linked selection, the way to Relationship, and out. */
function CompareBar({ rowA, rowB, rows, nameA, nameB }: { rowA: SavedChart | null; rowB: SavedChart | null; rows: SavedChart[]; nameA: string; nameB: string }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const linked = useStudioStore((s) => s.compare.linked);
  const { setPage } = useStudioUrl({ hydrate: false });
  const pick = useMemo<PairPick>(
    () => ({
      rows,
      aId: rowA?.id ?? null,
      resolvedBId: rowB?.id ?? null,
      others: rows.filter((r) => r.id !== rowA?.id),
      selectA: (id) => useStudioStore.getState().select(id),
      selectB: (id) => useStudioStore.setState((s) => ({ compare: { ...s.compare, partnerId: id || null } })),
      addSecond: addSomeoneAsB,
      swap: swapPeople,
    }),
    [rows, rowA, rowB],
  );
  const meet = relationshipPageOf(page);
  const meetHint = meet && rowB ? T("cmpMeetHint", { page: t(PAGE_LABEL[meet]), a: nameA, b: nameB }) : "";
  return (
    // A press here is about Compare, not the charts' choices (chart-wheel.tsx lets go of a pin pressed off it).
    <div className="ob-compare-bar" data-testid="compare-bar" data-chart-pick>
      <PairSelects mode="synastry" pair={pick} prefix="compare" page={page} />
      <div className="ob-compare-tools">
        <button
          type="button"
          role="switch"
          aria-checked={linked}
          className="ob-compare-tool ob-compare-link"
          data-testid="compare-link"
          aria-label={T("cmpLink")}
          title={T("cmpLinkHint")}
          onClick={() => setLinked(!linked)}
        >
          <Link2 className="size-4" strokeWidth={1.75} aria-hidden />
          <span className="ob-compare-tool-word">{T("cmpLink")}</span>
        </button>
        {meet && rowB ? (
          <button
            type="button"
            className="ob-compare-tool"
            data-testid="compare-meet"
            aria-label={`${T("cmpMeet")} · ${meetHint}`}
            title={meetHint}
            onClick={() => {
              // Every Relationship page reads synastry's second person (studio/store.ts, finishAddPartner).
              useStudioStore.getState().setPartner("synastry", rowB.id);
              setPage(meet);
            }}
          >
            <Users className="size-4" strokeWidth={1.75} aria-hidden />
            <span className="ob-compare-tool-word">{T("cmpMeet")}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="ob-icon-btn ob-compare-leave"
          data-testid="compare-leave"
          aria-label={T("cmpLeave")}
          title={T("cmpLeave")}
          onClick={leaveCompare}
        >
          <X className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * With the reading from the bottom, what was chosen in the two charts in one line over the folded
 * sheet's tabs (as the page's own pick card, components/pick-card.tsx), and Read.
 */
function CompareCard({ beside }: { beside: boolean }) {
  const { t } = useI18n();
  const page = useStudioStore((s) => s.page);
  const dockOpen = useStudioStore((s) => s.dockOpen);
  const sel = useCompare((s) => s.sel);
  const scopes = useCompare((s) => s.scopes);
  const who: Who | null = sel.last ?? (sel.a ? "a" : sel.b ? "b" : null);
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

/** The reading for two, in the panel's Reading tab, over the page's own reading (which waits under it as it was). */
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

/** "Both side by side" in the toolbar's Share and export (or ⋯), where the page is one drawing (decision C5). */
function ExportBoth({ nameA, nameB }: { nameA: string; nameB: string }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const slot = useExportSlot();
  const page = useStudioStore((s) => s.page);
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
  if (!slot || view !== "wheel" || MODE_META[page].noPicture) return null;
  const run = (kind: "png" | "svg") => {
    setBusy(true);
    void importWithRetry(() => import("@/studio/compare/export-both"))
      .then((m) => m.exportBoth(kind, { withCaption, locale, t, file: `${nameA}-${nameB}-${page}-${T("cmpExportFile")}` }))
      .finally(() => setBusy(false));
  };
  const item = (kind: "png" | "svg", icon: ReactNode, label: string) => (
    <button type="button" role="menuitem" className="ob-menu-item" data-testid={`compare-export-${kind}`} disabled={busy} onClick={() => run(kind)}>
      {icon}
      <span>{label}</span>
    </button>
  );
  return createPortal(
    <div role="group" aria-label={T("cmpRegion")} className="ob-compare-export" data-testid="compare-export">
      {item("png", <FileImage className="size-4" strokeWidth={1.75} aria-hidden />, T("cmpExportPng"))}
      {item("svg", <Download className="size-4" strokeWidth={1.75} aria-hidden />, T("cmpExportSvg"))}
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
