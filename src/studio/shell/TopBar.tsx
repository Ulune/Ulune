import { Search } from "lucide-react";
import { AiAccountsButton } from "@/components/ai-accounts";
import { useI18n } from "@/lib/i18n/locale";
import { AccountMenu } from "@/studio/shell/AccountMenu";
import { SpaceButton } from "@/components/space/space-button";
import { ChartPicker } from "@/studio/shell/ChartPicker";
import { UluneMark } from "@/studio/shell/PageTopBar";

/** Studio top bar, left half: wordmark (wide) + chart switcher. */
export function TopLeft() {
  return (
    <div className="ob-top ob-top-l" data-testid="top-left">
      <h1 className="ob-brand">
        <UluneMark className="ob-brand-mark" />
        <span className="ob-brand-word">Ulune</span>
      </h1>
      <ChartPicker />
    </div>
  );
}

/** Studio top bar, right half: AI + one account menu. */
function PaletteButton() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="ob-icon-btn ob-palette-btn"
      data-testid="palette-open"
      aria-label={t("paletteTitle")}
      title={`${t("paletteTitle")} (⌘K)`}
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => window.dispatchEvent(new Event("ulune:palette"))}
    >
      <Search className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

export function TopRight() {
  return (
    <div className="ob-top ob-top-r" data-testid="top-right">
      <PaletteButton />
      <AiAccountsButton />
      <SpaceButton />
      <AccountMenu />
    </div>
  );
}
