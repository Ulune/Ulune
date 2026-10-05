import { Ellipsis, Table2 } from "lucide-react";
import { useDrawnView } from "@/studio/stage/drawn-view";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { lazyNamed } from "@/lib/lazy-component";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { SubModeSwitch } from "@/studio/shell/SubModeSwitch";
import { AspectSlotContext, ExportSlotContext, MoreSlotsContext, RingsSlotContext, TableTabsSlotContext, ZoomSlotContext, type MoreSlots } from "@/studio/stage/stage-slots";
import { MODE_GROUPS, groupOf } from "@/studio/url";
import { ExportMenu } from "@/studio/stage/ExportMenu";
import { KeepOffer } from "@/components/space/keep-offer";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";

function ViewToggle() {
  const { t } = useI18n();
  const view = useStudioStore((s) => s.view);
  const { setView } = useStudioUrl({ hydrate: false });
  const drawn = useDrawnView();
  return (
    <SegmentedToggle
      ariaLabel={drawn.switch}
      value={view}
      onChange={setView}
      options={[
        {
          value: "wheel",
          testId: "view-wheel",
          ariaLabel: drawn.name,
          title: drawn.name,
          icon: (
            <span className="inline-flex items-center gap-1.5">
              <drawn.Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
              <span className="ob-view-label">{drawn.name}</span>
            </span>
          ),
        },
        {
          value: "table",
          testId: "view-table",
          ariaLabel: t("viewTable"),
          title: t("viewTable"),
          icon: (
            <span className="inline-flex items-center gap-1.5">
              <Table2 className="size-3.5" strokeWidth={1.75} aria-hidden />
              <span className="ob-view-label">{t("viewTable")}</span>
            </span>
          ),
        },
      ]}
    />
  );
}

/** The phone's toolbar end (UI plan, part 96): ⋯, its menu loaded when first opened (MorePanel.tsx). */
function MoreButton({
  open,
  setOpen,
  viewIntent,
  anchor,
}: {
  open: boolean;
  setOpen: (next: boolean) => void;
  viewIntent?: () => void;
  anchor: RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useI18n();
  // On a phone the menu's code comes once the page is idle, so its first
  // opening shows it at once rather than after a fetch (5 Oct).
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023.98px)").matches) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = idle(() => void loadMore());
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
  }, []);
  return (
    <span className="ob-more">
      <button
        ref={anchor}
        type="button"
        className="ob-icon-btn ob-more-btn"
        data-testid="stage-more"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("stageMore")}
        title={t("stageMore")}
        onPointerDown={() => {
          viewIntent?.();
          void loadMore();
        }}
        onClick={() => setOpen(!open)}
      >
        <Ellipsis className="size-5" strokeWidth={1.75} aria-hidden />
      </button>
    </span>
  );
}

const loadMore = () => import("@/studio/stage/MorePanel");
const MorePanel = lazyNamed(loadMore, "MorePanel");

/**
 * Stage frame (UI plan, part 93): one toolbar (the page's sub-mode or, on a
 * page without one, the chart's details · the mode's own controls · the
 * rings · Wheel / Table · Export) / the figure, with zoom in its corner /
 * a footer (caption, the aspect key where it doesn't fit beside the wheel).
 * `form` hides the toolbar's tools and the footer, keeping the mode switch
 * when the form stands in for a mode (`nav`: no chart yet).
 */
export function Stage({
  children,
  caption,
  extraControls,
  testId,
  table = false,
  form = false,
  nav = false,
  foot = true,
  swapKey,
  viewIntent,
  overlay,
}: {
  children: ReactNode;
  caption?: ReactNode;
  extraControls?: ReactNode;
  testId?: string;
  table?: boolean;
  form?: boolean;
  /** With `form`: keep the mode switch above it (a mode was asked for before any chart). */
  nav?: boolean;
  foot?: boolean;
  swapKey?: string;
  /** The view switch is pointed at or focused: fetch the table's code ahead. */
  viewIntent?: () => void;
  /** Something standing over the figure for a moment (the offer to keep Ulune here). */
  overlay?: ReactNode;
}) {
  const [zoomSlot, setZoomSlot] = useState<HTMLElement | null>(null);
  const [aspectSlot, setAspectSlot] = useState<HTMLElement | null>(null);
  const [ringsSlot, setRingsSlot] = useState<HTMLElement | null>(null);
  const [exportSlot, setExportSlot] = useState<HTMLElement | null>(null);
  const [tabsSlot, setTabsSlot] = useState<HTMLElement | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreRings, setMoreRings] = useState<HTMLElement | null>(null);
  const [moreTools, setMoreTools] = useState<HTMLElement | null>(null);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  const moreRef = useRef<HTMLButtonElement>(null);
  const moreSlots: MoreSlots = useMemo(() => ({ rings: moreRings, tools: moreTools, close: closeMore }), [moreRings, moreTools, closeMore]);
  const view = useStudioStore((s) => s.view);
  const page = useStudioStore((s) => s.navPage ?? s.page);
  // A page with no sub-mode (the Chart) shows the chart's details where the switch would be.
  const single = (MODE_GROUPS.find((g) => g.id === groupOf(page))?.pages.length ?? 0) <= 1;
  const capInBar = single && Boolean(caption);
  const tools = !form && foot;
  // Store view comes from localStorage; only publish it once hydrated.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // On a phone the stage scrolls (a full-width wheel with its controls): each
  // mode and view starts at the top.
  const stageRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (stageRef.current) stageRef.current.scrollTop = 0;
  }, [swapKey]);
  // Held upright on a tablet with the sheet folded, the wheel takes the whole width and the
  // stage scrolls to its controls. When giving up a little of that width (up to 12%) lets the
  // controls row fit above the sheet, the wheel does (shell.css reads --ob-port-fit); phones
  // keep the full width.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const fit = () => {
      frame = 0;
      const port = stage.querySelector<HTMLElement>(".ob-figure .ulune-wheel-port");
      // The box the port's width is a share of (a wrapper may draw no box of its own).
      let holder = port?.parentElement ?? null;
      while (holder && getComputedStyle(holder).display === "contents") holder = holder.parentElement;
      let cap = "";
      if (port && holder && stage.clientWidth >= 600 && getComputedStyle(stage).overflowY === "auto") {
        const box = getComputedStyle(holder);
        const side = holder.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight);
        const rest = stage.scrollHeight - port.getBoundingClientRect().height;
        const room = stage.clientHeight - rest;
        if (rest + side > stage.clientHeight + 0.5 && room >= side * 0.88) cap = `${Math.floor(room)}px`;
      }
      if (stage.style.getPropertyValue("--ob-port-fit") !== cap) {
        if (cap) stage.style.setProperty("--ob-port-fit", cap);
        else stage.style.removeProperty("--ob-port-fit");
      }
    };
    const soon = () => {
      if (!frame) frame = requestAnimationFrame(fit);
    };
    const watch = new ResizeObserver(soon);
    watch.observe(stage);
    for (const child of stage.children) watch.observe(child);
    soon();
    return () => {
      watch.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [swapKey]);
  return (
    <ZoomSlotContext.Provider value={zoomSlot}>
    <AspectSlotContext.Provider value={aspectSlot}>
    <RingsSlotContext.Provider value={ringsSlot}>
    <ExportSlotContext.Provider value={exportSlot}>
    <MoreSlotsContext.Provider value={moreSlots}>
    <TableTabsSlotContext.Provider value={table ? tabsSlot : null}>
      <section
        ref={stageRef}
        className={cn("ob-stage", table && "ob-stage--table", form && "ob-stage--form")}
        data-testid={testId ?? "studio-stage"}
        data-view={mounted ? view : undefined}
      >
        {form && !nav ? null : (
          <div className="ob-strip" data-testid="stage-toolbar">
            {capInBar && tools ? (
              <div className="ob-strip-cap ulune-stage-caption" data-testid="stage-details">
                {caption}
              </div>
            ) : (
              <SubModeSwitch />
            )}
            {tools && (extraControls || table) ? (
              <div className="ob-strip-extra">
                {extraControls}
                {/* A table's part links, from TablePage (part 97). */}
                {table ? <div ref={setTabsSlot} className="ob-strip-tabs" /> : null}
              </div>
            ) : (
              <span className="ob-strip-fill" />
            )}
            {tools ? (
              <div className="ob-strip-end">
                <div ref={setRingsSlot} className="ob-rings-slot" />
                <span className="contents" onPointerEnter={viewIntent} onFocusCapture={viewIntent}>
                  <ViewToggle />
                </span>
                <ExportMenu extraSlot={setExportSlot} />
                <MoreButton open={moreOpen} setOpen={setMoreOpen} viewIntent={viewIntent} anchor={moreRef} />
                {moreOpen ? (
                  <Suspense fallback={null}>
                    <MorePanel
                      anchor={moreRef}
                      close={closeMore}
                      setRings={setMoreRings}
                      setTools={setMoreTools}
                      setExportSlot={setExportSlot}
                    />
                  </Suspense>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
        <div key={swapKey} className="ob-figure ulune-stage-figure ob-swap">
          {children}
          {overlay}
          <div ref={setZoomSlot} className="ob-zoom-slot ob-zoom-corner" />
        </div>
        {form || !foot ? null : (
          <div className="ob-foot">
            {caption && !capInBar ? (
              <div className="ob-foot-cap ulune-stage-caption">
                {caption}
                <KeepOffer />
              </div>
            ) : (
              <div className="ob-foot-cap">
                <KeepOffer />
              </div>
            )}
            <div ref={setAspectSlot} className="ob-aspect-slot" data-testid="aspect-slot" />
          </div>
        )}
      </section>
    </TableTabsSlotContext.Provider>
    </MoreSlotsContext.Provider>
    </ExportSlotContext.Provider>
    </RingsSlotContext.Provider>
    </AspectSlotContext.Provider>
    </ZoomSlotContext.Provider>
  );
}
