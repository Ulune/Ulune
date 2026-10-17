import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useKeptScroll } from "@/studio/return-parts";
import { useScopeId, useScopeKey } from "@/studio/scope";
import { AspectSlotContext, RingsSlotContext, TableTabsSlotContext, ZoomSlotContext } from "@/studio/stage/stage-slots";

/*
 * The stage of one scope's pane (share and compare plan, feature 2, the
 * foundation): what Stage.tsx gives a figure (its zoom bar's corner, the
 * aspect key's foot, the rings' and the table parts' places in a bar above
 * it) without the toolbar's tools, which stay the page's one toolbar. It is
 * a stage size container like the main one (shell.css, `stage`), so a figure
 * lays itself out by the pane's width, and it marks its region with the
 * scope's letter (scope.tsx): presses and previews inside it are this
 * scope's. Draw it inside a ChartScopeProvider.
 */
export function ScopeStage({
  children,
  label,
  controls,
  caption,
  table = false,
  testId,
}: {
  children: ReactNode;
  /** Who the pane shows ("A · Camille"). */
  label?: ReactNode;
  /** The page's own controls for this scope (its Controls), in the pane's bar. */
  controls?: ReactNode;
  /** The figure's caption, under it. */
  caption?: ReactNode;
  table?: boolean;
  testId?: string;
}) {
  const scopeId = useScopeId();
  const [zoomSlot, setZoomSlot] = useState<HTMLElement | null>(null);
  const [aspectSlot, setAspectSlot] = useState<HTMLElement | null>(null);
  const [ringsSlot, setRingsSlot] = useState<HTMLElement | null>(null);
  const [tabsSlot, setTabsSlot] = useState<HTMLElement | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  useKeptScroll(stageRef, useScopeKey("stage"));
  return (
    <ZoomSlotContext.Provider value={zoomSlot}>
      <AspectSlotContext.Provider value={aspectSlot}>
        <RingsSlotContext.Provider value={ringsSlot}>
          <TableTabsSlotContext.Provider value={table ? tabsSlot : null}>
            <section
              ref={stageRef}
              className={cn("ob-stage ob-stage--scope", table && "ob-stage--table")}
              data-chart-scope={scopeId === "main" ? undefined : scopeId}
              data-testid={testId}
              data-view={table ? "table" : "wheel"}
            >
              <div className="ob-strip" data-testid={testId ? `${testId}-bar` : undefined}>
                {label ? <span className="ob-scope-label">{label}</span> : null}
                <div className="ob-strip-extra">
                  {controls}
                  {table ? <div ref={setTabsSlot} className="ob-strip-tabs" /> : null}
                </div>
                <div className="ob-strip-end">
                  <div ref={setRingsSlot} className="ob-rings-slot" />
                </div>
              </div>
              <div className="ob-figure ulune-stage-figure">
                {children}
                <div ref={setZoomSlot} className="ob-zoom-slot ob-zoom-corner" />
              </div>
              <div className="ob-foot">
                <div className="ob-foot-cap ulune-stage-caption">{caption}</div>
                <div ref={setAspectSlot} className="ob-aspect-slot" />
              </div>
            </section>
          </TableTabsSlotContext.Provider>
        </RingsSlotContext.Provider>
      </AspectSlotContext.Provider>
    </ZoomSlotContext.Provider>
  );
}
