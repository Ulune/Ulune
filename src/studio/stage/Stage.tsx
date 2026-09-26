import { Circle, Table2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { SubModeSwitch } from "@/studio/shell/SubModeSwitch";
import { AspectSlotContext, ZoomSlotContext } from "@/studio/stage/stage-slots";
import { ExportMenu } from "@/studio/stage/ExportMenu";
import { KeepOffer } from "@/components/space/keep-offer";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";

function ViewToggle() {
  const { t } = useI18n();
  const view = useStudioStore((s) => s.view);
  const { setView } = useStudioUrl({ hydrate: false });
  return (
    <SegmentedToggle
      ariaLabel={t("viewSwitch")}
      value={view}
      onChange={setView}
      options={[
        {
          value: "wheel",
          testId: "view-wheel",
          ariaLabel: t("viewWheel"),
          title: t("viewWheel"),
          icon: (
            <span className="inline-flex items-center gap-1.5">
              <Circle className="size-3.5" strokeWidth={1.75} aria-hidden />
              <span className="ob-view-label">{t("viewWheel")}</span>
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

/**
 * Stage frame: strip (sub-modes + mode controls) / figure / footer
 * (caption · view toggle · zoom). `form` hides the strip controls and footer.
 */
export function Stage({
  children,
  caption,
  extraControls,
  testId,
  table = false,
  form = false,
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
  foot?: boolean;
  swapKey?: string;
  /** The view switch is pointed at or focused: fetch the table's code ahead. */
  viewIntent?: () => void;
  /** Something standing over the figure for a moment (the offer to keep Ulune here). */
  overlay?: ReactNode;
}) {
  const [zoomSlot, setZoomSlot] = useState<HTMLElement | null>(null);
  const [aspectSlot, setAspectSlot] = useState<HTMLElement | null>(null);
  const view = useStudioStore((s) => s.view);
  // Store view comes from localStorage; only publish it once hydrated.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <ZoomSlotContext.Provider value={zoomSlot}>
    <AspectSlotContext.Provider value={aspectSlot}>
      <section
        className={cn("ob-stage", table && "ob-stage--table", form && "ob-stage--form")}
        data-testid={testId ?? "studio-stage"}
        data-view={mounted ? view : undefined}
      >
        {form ? null : (
          <div className="ob-strip">
            <SubModeSwitch />
            {extraControls ? <div className="ob-strip-extra">{extraControls}</div> : null}
          </div>
        )}
        <div key={swapKey} className="ob-figure ulune-stage-figure ob-swap">
          {children}
          {overlay}
        </div>
        {form || !foot ? null : (
          <div className="ob-foot">
            {caption ? (
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
            <div className="ob-foot-ctrls">
              <span className="contents" onPointerEnter={viewIntent} onFocusCapture={viewIntent}>
                <ViewToggle />
              </span>
              <div ref={setZoomSlot} className="ob-zoom-slot" />
              <ExportMenu />
            </div>
          </div>
        )}
      </section>
    </AspectSlotContext.Provider>
    </ZoomSlotContext.Provider>
  );
}
