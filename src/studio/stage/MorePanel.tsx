import { Check } from "lucide-react";
import { useCallback, type RefObject } from "react";
import { AnchoredPopover } from "@/components/anchored-popover";
import { useI18n } from "@/lib/i18n/locale";
import { ExportItems } from "@/studio/stage/ExportMenu";
import { useDrawnView } from "@/studio/stage/drawn-view";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";

/**
 * The phone's ⋯ menu (UI plan, part 96): the rings' choices, Wheel / Table,
 * Export, then 3D and the pointer tools, in that order. The rings and the
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
        </div>
        <div role="group" aria-label={t("exportMenu")} className="ob-more-part" data-testid="export-panel">
          <p className="ob-menu-head">{t("exportMenu")}</p>
          <ExportItems close={done} extraSlot={setExportSlot} />
        </div>
        <div ref={setTools} className="ob-more-part" />
      </div>
    </AnchoredPopover>
  );
}
