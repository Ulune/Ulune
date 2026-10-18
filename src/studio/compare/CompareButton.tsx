import { Columns2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale";
import { canCompare, toggleCompare } from "@/studio/compare/comparable";
import { useStudioStore } from "@/studio/store";

/*
 * The toolbar's Compare button (share and compare plan, feature 2), beside the
 * view switch, in the first download (Stage.tsx); a phone has it in ⋯
 * (MorePanel.tsx).
 */

/** Compare, beside the view switch, once there is a chart: pressed while on; on a page it does not show, it says why. */
export function CompareButton() {
  const { t } = useI18n();
  const on = useStudioStore((s) => s.compare.on);
  const can = useStudioStore(canCompare);
  const hasChart = useStudioStore((s) => s.chart != null);
  if (!hasChart) return null;
  return (
    <button
      type="button"
      className="ob-icon-btn ob-compare-btn"
      data-testid="compare-toggle"
      // Not a press off the chart: the page's choice stays (chart-wheel.tsx), to come back after Compare.
      data-chart-pick
      aria-pressed={on && can}
      aria-disabled={can ? undefined : true}
      aria-keyshortcuts="C"
      aria-label={t("compare")}
      title={can ? `${t("compare")} (C)` : t("compareNotHere")}
      onClick={() => can && toggleCompare()}
    >
      <Columns2 className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
