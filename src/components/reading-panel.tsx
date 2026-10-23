import { AI_ENABLED } from "@/lib/features";
import type { ElementReading, NatalChart } from "@/lib/chart/types";
import type { ReadingDepth } from "@/lib/chart/chart-view";
import { useI18n } from "@/lib/i18n/locale";
import { Suspense } from "react";
import { ReadingCard, useCardDepth } from "./reading-card";
import type { AskMode } from "./ask-grok";
import { lazyNamed } from "@/lib/lazy-component";

export { ReadingMark } from "./reading-card";

/*
 * The side panel's reading: its card, and while AI readings are on (lib/features.ts) what they add, the
 * reading the AI is told about and "Ask about this" (reading-ai.tsx). Those are their own downloads,
 * fetched only while AI readings are on, so none of them is in a page's first download while they are
 * off (the 2.0 fixes, item 3).
 */
const AiReadingFocus = lazyNamed(() => import("./ai-reading-focus"), "AiReadingFocus");
const AskAbout = lazyNamed(() => import("./reading-ai"), "AskAbout");

export function ReadingPanel({
  reading,
  grokPending,
  chart,
  depth = "full",
  onGo,
  back,
  onBack,
  mode = "natal",
  tradition,
}: {
  reading: ElementReading | null;
  grokPending: boolean;
  chart?: NatalChart | null;
  depth?: ReadingDepth;
  mode?: AskMode;
  onGo?: (ref: string) => void;
  back?: string | null;
  onBack?: () => void;
  /** The language the reading belongs to (its words link to that tradition's entries). */
  tradition?: string;
}) {
  const { t } = useI18n();
  const [cardDepth, setCardDepth] = useCardDepth(depth);
  if (!reading) {
    return (
      <div data-reading-depth={depth}>
        {AI_ENABLED ? (
          <Suspense fallback={null}>
            <AiReadingFocus chart={chart} reading={null} />
          </Suspense>
        ) : null}
        <p className="max-w-[61.8ch] text-base leading-[var(--leading-phi)] text-fg-muted">{t("clickHint")}</p>
        {grokPending && (
          <p className="mt-4 text-xs tracking-wide text-fg-subtle uppercase">
            {t("composingGrok")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-reading-depth={cardDepth}>
      {/* What Your AI reads about, while AI readings are on (lib/features.ts): off, none of it is downloaded. */}
      {AI_ENABLED ? (
        <Suspense fallback={null}>
          <AiReadingFocus chart={chart} reading={reading} />
        </Suspense>
      ) : null}
      <ReadingCard
        reading={reading}
        chart={chart}
        depth={cardDepth}
        onDepth={setCardDepth}
        onGo={onGo}
        back={back}
        onBack={onBack}
        tradition={tradition}
      />
      {AI_ENABLED && chart ? (
        <Suspense fallback={null}>
          <AskAbout key={`${mode}:${reading.id}`} chart={chart} reading={reading} mode={mode} />
        </Suspense>
      ) : null}
    </div>
  );
}
