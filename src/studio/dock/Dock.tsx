import {
  BookOpen,
  CalendarDays,
  ChevronDown,
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
  const dock = useStudioStore((s) => s.dock);
  const dockOpen = useStudioStore((s) => s.dockOpen);
  const openDock = useStudioStore((s) => s.openDock);
  const toggleDock = useStudioStore((s) => s.toggleDock);
  const [width, setWidth] = useState<PanelWidth>("normal");
  const [full, setFull] = useState(false);
  const detent: SheetDetent = !dockOpen ? "peek" : full ? "full" : "half";

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

  const flipWidth = useCallback(() => {
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
      openDock(id);
    },
    [openDock, toggleDock],
  );

  // --- compact sheet drag ---------------------------------------------------
  const sheetRef = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; start: number; moved: boolean; h: number } | null>(null);
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
    if (d === "half") return Math.round(h * 0.56);
    return h;
  }, []);

  const onHeadDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isWide() || e.button !== 0) return;
    const h = sheetRef.current?.parentElement?.getBoundingClientRect().height ?? 0;
    drag.current = { y: e.clientY, start: visibleFor(detent, h), moved: false, h };
  };
  const onHeadMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (!d.moved && Math.abs(dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    showDrag(Math.max(52, Math.min(d.h, d.start + dy)));
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
    showDrag(null);
    const stops: [SheetDetent, number][] = [
      ["peek", visibleFor("peek", d.h)],
      ["half", visibleFor("half", d.h)],
      ["full", visibleFor("full", d.h)],
    ];
    let best = stops[0];
    for (const s of stops) if (Math.abs(s[1] - vis) < Math.abs(best[1] - vis)) best = s;
    const [next] = best;
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
        <div className="ob-panel-tabs" role="tablist" aria-label={t("dockExpand")}>
          {PANEL_TABS.map((tab) => {
            const on = dock === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-testid={`dock-tab-${tab.id}`}
                aria-selected={on}
                aria-label={t(tab.label)}
                title={t(tab.label)}
                onPointerEnter={TAB_AHEAD[tab.id]}
                onFocus={TAB_AHEAD[tab.id]}
                onClick={() => onTab(tab.id)}
                className={cn("ob-panel-tab", on && "is-on")}
              >
                <Icon className="ob-panel-tab-icon" strokeWidth={1.75} />
                <span className="ob-panel-tab-label">{t(tab.label)}</span>
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
            {detent === "full" ? (
              <ChevronDown className="size-4" strokeWidth={1.75} />
            ) : (
              <ChevronUp className="size-4" strokeWidth={1.75} />
            )}
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
