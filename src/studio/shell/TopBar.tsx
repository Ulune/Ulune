import { Search } from "lucide-react";
import { useStudioStore } from "@/studio/store";
import { Suspense } from "react";
import { AI_ENABLED } from "@/lib/features";
import { lazyNamed } from "@/lib/lazy-component";
import { useI18n } from "@/lib/i18n/locale";
import { AccountMenu } from "@/studio/shell/AccountMenu";
import { SpaceButton } from "@/components/space/space-button";
import { ChartPicker } from "@/studio/shell/ChartPicker";
import { UluneMark } from "@/studio/shell/ulune-mark";

// The AI accounts' button while AI readings are on (lib/features.ts): its own download, none of it in the first while they are off (the 2.0 fixes, item 3).
const AiAccountsButton = lazyNamed(() => import("@/components/ai-accounts"), "AiAccountsButton");

/** Studio top bar, left half: wordmark (wide) + chart switcher. */
export function TopLeft() {
  return (
    <div className="ob-top ob-top-l" data-testid="top-left">
      {/* The wordmark, not a heading: each screen has its own (the form's title, or the chart's). */}
      <div className="ob-brand">
        <UluneMark className="ob-brand-mark" />
        <span className="ob-brand-word">Ulune</span>
      </div>
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
  const hasChart = useStudioStore((s) => s.chart != null);
  return (
    <div className="ob-top ob-top-r" data-testid="top-right">
      <PaletteButton />
      {AI_ENABLED ? (
        <Suspense fallback={null}>
          <AiAccountsButton />
        </Suspense>
      ) : null}
      <SpaceButton unkept={hasChart} />
      <AccountMenu />
    </div>
  );
}
