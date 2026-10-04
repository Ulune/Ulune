import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ChevronUp,
  ChevronsLeftRight,
  ChevronsRightLeft,
  Layers,
  Palette,
} from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { LoadingLines } from "@/components/loading-lines";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { BirthTab } from "@/studio/dock/BirthTab";
import { isWide, loadPanelWidth, savePanelWidth, type PanelWidth } from "@/studio/dock/dock-layout";
import { ReadingTab } from "@/studio/dock/ReadingTab";
import { useStudioStore, type DockTab } from "@/studio/store";
import { useModeReading } from "@/studio/modes/data";
import { onTablistKeyDown } from "@/lib/a11y/tablist";
import { SHEET_MOVE_MS, captureStage, dropStage, playStage } from "@/lib/stage-flip";
import { swapTransition } from "@/lib/swap-transition";

export const PANEL_TABS: {
  id: DockTab;
  icon: typeof BookOpen;
  label: "dockReading" | "dockBodies" | "dockLook" | "dockBirth";
}[] = [
  { id: "reading", icon: BookOpen, label: "dockReading" },
  { id: "bodies", icon: Layers, label: "dockBodies" },
  { id: "look", icon: Palette, label: "dockLook" },
  { id: "birth", icon: CalendarDays, label: "dockBirth" },
];

// The Bodies and Look tabs are their own downloads, fetched when their tab
// is pointed at, focused or opened.
const loadBodiesTab = () => import("@/studio/dock/BodiesTab");
const loadLookTab = () => import("@/studio/dock/LookTab");
const BodiesTab = lazyNamed(loadBodiesTab, "BodiesTab");
const LookTab = lazyNamed(loadLookTab, "LookTab");
const TAB_AHEAD: Partial<Record<DockTab, () => void>> = {
  bodies: () => prefetch(loadBodiesTab),
  look: () => prefetch(loadLookTab),
};

export type SheetDetent = "peek" | "half" | "full";

/**
 * One panel. Wide: a side column (normal | wide width, collapses to an icon
 * strip). Compact: a bottom sheet (peek | half | full) whose peek row is the
 * tab strip. Same DOM for both; CSS decides the frame.
 */
export function Dock() {
  const { t } = useI18n();
  const chosen = useStudioStore((s) => s.dock);
  const dockOpen = useStudioStore((s) => s.dockOpen);
  // Human Design and numerology read their own bodies, all of them: the Bodies tab (the
  // wheels' bodies, aspects and stars) is left out there, and comes back with the wheels.
  const studioPage = useStudioStore((s) => s.page);
  const noBodies = studioPage === "design" || studioPage === "numerology";
  const tabs = noBodies ? PANEL_TABS.filter((tab) => tab.id !== "bodies") : PANEL_TABS;
  const dock: DockTab = noBodies && chosen === "bodies" ? "reading" : chosen;
  const openDock = useStudioStore((s) => s.openDock);
  const toggleDock = useStudioStore((s) => s.toggleDock);
  const [width, setWidth] = useState<PanelWidth>("normal");
  const [full, setFull] = useState(false);
  const detent: SheetDetent = !dockOpen ? "peek" : full ? "full" : "half";
  // Something chosen on the chart while the panel is closed: the chart stays
  // whole (store.choose) and the Reading tab carries its name, to open when
  // the reader wants it.
  const selectedId = useStudioStore((s) => s.selectedId);
  const reading = useModeReading();
  const waiting = !dockOpen && selectedId && reading ? reading.title : null;

  const [ready, setReady] = useState(false);
  useEffect(() => {
    setWidth(loadPanelWidth());
    // No slide on mount: the sheet appears where it belongs, then animates.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  // Reopening the sheet always starts at half.
  useEffect(() => {
    if (!dockOpen) setFull(false);
  }, [dockOpen]);

  // The stage moves with the sheet (stage-flip.ts): where it stands is read as
  // the sheet is told to open or close (the page not yet changed), and played
  // back from there once it has.
  useEffect(
    () =>
      useStudioStore.subscribe((s, prev) => {
        if (s.dockOpen !== prev.dockOpen) captureStage();
      }),
    [],
  );
  // The wide/narrow button: the stage and the panel slide together too.
  const shownWidth = useRef(width);
  useLayoutEffect(() => {
    if (shownWidth.current === width) return;
    shownWidth.current = width;
    if (ready && isWide()) playStage(true);
    else dropStage();
  }, [width, ready]);
  const shownDetent = useRef(detent);
  useLayoutEffect(() => {
    if (shownDetent.current === detent) return;
    shownDetent.current = detent;
    const el = sheetRef.current;
    if (!ready || !el) {
      dropStage();
      return;
    }
    // A computer's side panel: the stage and the panel slide together.
    if (isWide()) {
      playStage(true);
      return;
    }
    playStage();
    // While it slides, the sheet keeps its whole body (shell.css): nothing in
    // it is cut off or hidden before it is out of sight.
    el.setAttribute("data-moving", "");
    const id = window.setTimeout(() => el.removeAttribute("data-moving"), SHEET_MOVE_MS + 40);
    return () => {
      window.clearTimeout(id);
      el.removeAttribute("data-moving");
    };
  }, [detent, ready]);

  const flipWidth = useCallback(() => {
    captureStage();
    setWidth((w) => {
      const next = w === "wide" ? "normal" : "wide";
      savePanelWidth(next);
      return next;
    });
  }, []);

  const onTab = useCallback(
    (id: DockTab) => {
      const s = useStudioStore.getState();
      if (!isWide() && s.dockOpen && s.dock === id) {
        toggleDock();
        return;
      }
      // On a phone the birth form opens the sheet whole (review 3 Oct, C12): at
      // half height its button sat over the date field.
      if (!isWide() && id === "birth") setFull(true);
      // Another tab of the open panel: its pane cross-fades in place.
      if (s.dockOpen && s.dock !== id) {
        swapTransition(() => openDock(id), { part: "pane" });
        return;
      }
      openDock(id);
    },
    [openDock, toggleDock],
  );

  // --- compact sheet drag ---------------------------------------------------
  const sheetRef = useRef<HTMLElement>(null);
  const drag = useRef<{
    y: number;
    start: number;
    moved: boolean;
    h: number;
    /** The last moves (time, px shown), for the speed it is let go at. */
    trail: { t: number; v: number }[];
  } | null>(null);
  const suppressClick = useRef(false);
  /**
   * Where the dragged sheet stands (px shown). Written straight onto the sheet
   * (`data-dragging`, `--ob-sheet-drag`), not through React: each pointer move
   * used to re-render the whole dock.
   */
  const dragY = useRef<number | null>(null);
  const showDrag = (y: number | null) => {
    dragY.current = y;
    const el = sheetRef.current;
    if (!el) return;
    if (y == null) {
      el.removeAttribute("data-dragging");
      el.style.removeProperty("--ob-sheet-drag");
    } else {
      el.style.setProperty("--ob-sheet-drag", `${y}px`);
      el.setAttribute("data-dragging", "");
    }
  };

  const visibleFor = useCallback((d: SheetDetent, h: number) => {
    const peek = 52;
    if (d === "peek") return peek;
    // As shell.css shows it (--ob-vis: 50%): a drag starts where the sheet is.
    if (d === "half") return Math.round(h * 0.5);
    return h;
  }, []);

  const onHeadDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isWide() || e.button !== 0) return;
    const h = sheetRef.current?.parentElement?.getBoundingClientRect().height ?? 0;
    drag.current = { y: e.clientY, start: visibleFor(detent, h), moved: false, h, trail: [] };
  };
  const onHeadMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.abs(d.y - e.clientY) < 6) return;
      d.moved = true;
      // From here on the sheet follows the finger (no jump by the few px that
      // told a drag from a tap).
      d.y = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const vis = Math.max(52, Math.min(d.h, d.start + d.y - e.clientY));
    const now = e.timeStamp || performance.now();
    d.trail.push({ t: now, v: vis });
    while (d.trail.length > 2 && now - d.trail[0].t > 100) d.trail.shift();
    showDrag(vis);
  };
  const onHeadUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    suppressClick.current = true;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* released */
    }
    const vis = dragY.current ?? d.start;
    // A flick carries on: the sheet goes where it was heading (its speed over
    // the last tenth of a second, carried a fifth of a second on).
    const first = d.trail[0];
    const last = d.trail[d.trail.length - 1];
    const speed = first && last && last.t > first.t ? (last.v - first.v) / (last.t - first.t) : 0;
    const aimAt = vis + Math.max(-1.5, Math.min(1.5, speed)) * 200;
    const stops: [SheetDetent, number][] = [
      ["peek", visibleFor("peek", d.h)],
      ["half", visibleFor("half", d.h)],
      ["full", visibleFor("full", d.h)],
    ];
    let best = stops[0];
    for (const s of stops) if (Math.abs(s[1] - aimAt) < Math.abs(best[1] - aimAt)) best = s;
    const [next] = best;
    showDrag(null);
    if (next === "peek") {
      if (useStudioStore.getState().dockOpen) toggleDock();
    } else {
      if (!useStudioStore.getState().dockOpen) openDock(useStudioStore.getState().dock);
      setFull(next === "full");
    }
  };
  const onHeadClickCapture = (e: ReactMouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // Escape closes the sheet (compact) — never the wide panel.
  useEffect(() => {
    if (!dockOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || isWide()) return;
      if (document.querySelector("[data-testid=account-menu-panel], [data-testid=chart-picker]"))
        return;
      toggleDock();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dockOpen, toggleDock]);

  // A focused input in the sheet (birth edit) gets the whole screen.
  const onFocusIn = (e: ReactFocusEvent) => {
    if (isWide()) return;
    const el = e.target as HTMLElement;
    if (el.matches("input, textarea, select")) setFull(true);
  };

  return (
    <aside
      ref={sheetRef}
      className="ob-panel"
      data-testid="dock"
      data-chart-pick
      data-dock-open={dockOpen ? "true" : "false"}
      data-detent={detent}
      data-width={width}
      data-ready={ready ? "1" : undefined}
      onFocus={onFocusIn}
    >
      <div
        className="ob-panel-head"
        onPointerDown={onHeadDown}
        onPointerMove={onHeadMove}
        onPointerUp={onHeadUp}
        onPointerCancel={onHeadUp}
        onClickCapture={onHeadClickCapture}
      >
        <span className="ob-sheet-grip" aria-hidden />
        <div className="ob-panel-tabs" role="tablist" aria-label={t("dockExpand")} onKeyDown={(e) => onTablistKeyDown(e, true)}>
          {tabs.map((tab) => {
            const on = dock === tab.id;
            const Icon = tab.icon;
            const named = tab.id === "reading" && waiting ? waiting : null;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-testid={`dock-tab-${tab.id}`}
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                aria-label={named ? `${t(tab.label)} · ${named}` : t(tab.label)}
                title={named ? `${t(tab.label)} · ${named}` : t(tab.label)}
                data-waiting={named ? "" : undefined}
                onPointerEnter={TAB_AHEAD[tab.id]}
                onFocus={TAB_AHEAD[tab.id]}
                onClick={() => onTab(tab.id)}
                className={cn("ob-panel-tab", on && "is-on")}
              >
                <span className="ob-panel-tab-glyph">
                  <Icon className="ob-panel-tab-icon" strokeWidth={1.75} />
                  {named ? <span className="ob-panel-tab-dot" aria-hidden /> : null}
                </span>
                <span className="ob-panel-tab-label">{named ?? t(tab.label)}</span>
              </button>
            );
          })}
        </div>
        <div className="ob-panel-actions">
          <button
            type="button"
            className="ob-icon-btn ob-icon-btn--quiet ob-only-wide"
            data-testid="panel-width"
            aria-label={width === "wide" ? t("panelNarrow") : t("panelWiden")}
            title={width === "wide" ? t("panelNarrow") : t("panelWiden")}
            onClick={flipWidth}
          >
            {width === "wide" ? (
              <ChevronsRightLeft className="size-4" strokeWidth={1.75} />
            ) : (
              <ChevronsLeftRight className="size-4" strokeWidth={1.75} />
            )}
          </button>
          <button
            type="button"
            className="ob-icon-btn ob-icon-btn--quiet ob-only-wide"
            data-testid="dock-collapse"
            aria-label={dockOpen ? t("dockCollapse") : t("dockExpand")}
            title={dockOpen ? t("dockCollapse") : t("dockExpand")}
            aria-expanded={dockOpen}
            onClick={toggleDock}
          >
            <ChevronRight className="ob-collapse-icon size-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="ob-icon-btn ob-icon-btn--quiet ob-only-compact"
            data-testid="sheet-toggle"
            aria-label={detent === "full" ? t("sheetShrink") : t("sheetExpand")}
            title={detent === "full" ? t("sheetShrink") : t("sheetExpand")}
            onClick={() => {
              if (!dockOpen) {
                openDock(dock);
                return;
              }
              setFull((f) => !f);
            }}
          >
            {/* One chevron that turns, never two icons swapped. */}
            <ChevronUp className="ob-sheet-chevron size-4" strokeWidth={1.75} data-flip={detent === "full" ? "1" : undefined} />
          </button>
        </div>
      </div>
      <div className="ob-panel-body">
        <div key={dock} className="ob-panel-pane ob-swap">
          {dock === "reading" ? <ReadingTab /> : null}
          {dock === "bodies" || dock === "look" ? (
            <Suspense fallback={<LoadingLines testId="dock-tab-loading" lines={4} />}>
              {dock === "bodies" ? <BodiesTab /> : <LookTab />}
            </Suspense>
          ) : null}
          {dock === "birth" ? <BirthTab /> : null}
        </div>
      </div>
    </aside>
  );
}
