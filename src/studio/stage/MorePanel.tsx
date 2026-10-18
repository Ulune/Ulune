import { Check, Presentation } from "lucide-react";
import { useCallback, type RefObject } from "react";
import { AnchoredPopover } from "@/components/anchored-popover";
import { useI18n } from "@/lib/i18n/locale";
import { ExportItems } from "@/studio/stage/export-items";
import { useExportShown } from "@/studio/stage/export-shown";
import { useDrawnView } from "@/studio/stage/drawn-view";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";
import { toast } from "@/lib/toast";
import { canCompare as comparableHere, toggleCompare } from "@/studio/compare/comparable";
import { enterShowMode } from "@/studio/show/show-state";

/**
 * The phone's ⋯ menu (UI plan, part 96): the rings' choices, Wheel / Table
 * and Compare, Export, then 3D and the pointer tools, in that order. The rings and the
 * tools draw themselves into its slots; its own code comes when it first
 * opens, not with the page.
 */
export function MorePanel({
  anchor,
  close,
  setRings,
  setTools,
  setExportSlot,
}: {
  anchor: RefObject<HTMLButtonElement | null>;
  close: () => void;
  setRings: (el: HTMLElement | null) => void;
  setTools: (el: HTMLElement | null) => void;
  setExportSlot: (el: HTMLElement | null) => void;
}) {
  const { t } = useI18n();
  const view = useStudioStore((s) => s.view);
  const hasChart = useStudioStore((s) => s.chart != null);
  const compareOn = useStudioStore((s) => s.compare.on);
  const canCompare = useStudioStore(comparableHere);
  const exportShown = useExportShown();
  const { setView } = useStudioUrl({ hydrate: false });
  const drawn = useDrawnView();
  const done = useCallback(() => close(), [close]);
  const viewItem = (value: "wheel" | "table", label: string) => (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={view === value}
      className="ob-menu-item"
      data-testid={`more-view-${value}`}
      onClick={() => {
        setView(value);
        done();
      }}
    >
      <Check className="ob-more-check size-4" strokeWidth={2} aria-hidden style={{ visibility: view === value ? "visible" : "hidden" }} />
      <span>{label}</span>
    </button>
  );
  return (
    <AnchoredPopover open anchorRef={anchor} onClose={done} hideLabel={t("hidePanel")} align="end" width={288} testId="stage-more-menu">
      <div role="menu" aria-label={t("stageMore")} className="ob-menu ob-more-menu">
        <div ref={setRings} className="ob-more-part" />
        <div role="group" aria-label={drawn.switch} className="ob-more-part">
          <p className="ob-menu-head">{drawn.switch}</p>
          {viewItem("wheel", drawn.name)}
          {viewItem("table", t("viewTable"))}
          {/* Compare (studio/compare), as the toolbar's button on a computer: on a page it does not show, it says why. */}
          {hasChart ? (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={compareOn && canCompare}
              aria-disabled={canCompare ? undefined : true}
              className="ob-menu-item"
              data-testid="more-compare"
              onClick={() => {
                if (canCompare) toggleCompare();
                else toast(t("compareNotHere"));
                done();
              }}
            >
              <Check className="ob-more-check size-4" strokeWidth={2} aria-hidden style={{ visibility: compareOn && canCompare ? "visible" : "hidden" }} />
              <span>{t("compare")}</span>
            </button>
          ) : null}
          {/* Show mode (share and compare plan, idea B2), as the toolbar's button on a computer. */}
          <button
            type="button"
            role="menuitem"
            className="ob-menu-item"
            data-testid="more-show"
            onClick={() => {
              done();
              enterShowMode();
            }}
          >
            <Presentation className="ob-more-check size-4" strokeWidth={1.75} aria-hidden />
            <span>{t("showMode")}</span>
          </button>
        </div>
        {/* Only when there is a way out (a home without a chart has none but its table's, FS13). */}
        {exportShown ? (
          <div role="group" aria-label={t("exportMenu")} className="ob-more-part" data-testid="export-panel">
            <p className="ob-menu-head">{t("exportMenu")}</p>
            <ExportItems close={done} extraSlot={setExportSlot} />
          </div>
        ) : null}
        <div ref={setTools} className="ob-more-part" />
      </div>
    </AnchoredPopover>
  );
}
