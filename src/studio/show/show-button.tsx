import { Presentation } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale";
import { showAhead } from "./show-load";
import { enterShowMode } from "./show-state";

/** Show mode (share and compare plan, idea B2), at the toolbar's end on a computer: the F key does the same (shell/CommandPalette.tsx). */
export function ShowButton() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="ob-icon-btn"
      data-testid="show-open"
      aria-label={t("showMode")}
      aria-keyshortcuts="F"
      title={`${t("showMode")} (F)`}
      onPointerEnter={showAhead}
      onFocus={showAhead}
      onClick={enterShowMode}
    >
      <Presentation className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
