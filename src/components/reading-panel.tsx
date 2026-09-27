import { AspectGlyph, PlanetGlyph, SignGlyph } from "./glyphs";
import { AiAccountsPanel } from "./ai-accounts";
import { AiReadingFocus } from "./ai-reading-focus";
import { useAiAccount } from "@/lib/ai/use-ai-account";
import { providerName } from "@/lib/ai/providers";
import { AI_ENABLED } from "@/lib/features";
import type { AspectId, ElementReading, GrokReading, NatalChart, SignId } from "@/lib/chart/types";
import { ASPECT_IDS } from "@/lib/chart/types";
import { SIGN_IDS, decanOf } from "@/lib/chart/constants";
import type { ReadingDepth } from "@/lib/chart/chart-view";
import { useI18n } from "@/lib/i18n/locale";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnchoredPopover } from "./anchored-popover";
import { ReadingCard, useCardDepth } from "./reading-card";
import type { AskMode } from "./ask-grok";
import { LoadingLines } from "./loading-lines";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { AiStarGlyph } from "./reading-ai-star";

export { ReadingMark } from "./reading-card";


export function ReadingPanel({
  reading,
  grokPending,
  chart,
  depth = "full",
  onGo,
  back,
  onBack,
  mode = "natal",
}: {
  reading: ElementReading | null;
  grokPending: boolean;
  chart?: NatalChart | null;
  depth?: ReadingDepth;
  mode?: AskMode;
  onGo?: (ref: string) => void;
  back?: string | null;
  onBack?: () => void;
}) {
  const { t } = useI18n();
  const [cardDepth, setCardDepth] = useCardDepth(depth);
  if (!reading) {
    return (
      <div data-reading-depth={depth}>
        <AiReadingFocus chart={chart} reading={null} />
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
      <AiReadingFocus chart={chart} reading={reading} />
      <ReadingCard
        reading={reading}
        chart={chart}
        depth={cardDepth}
        onDepth={setCardDepth}
        onGo={onGo}
        back={back}
        onBack={onBack}
      />
      {AI_ENABLED && chart ? <AskAbout key={`${mode}:${reading.id}`} chart={chart} reading={reading} mode={mode} /> : null}
    </div>
  );
}

// The question box is its own download, fetched when "Ask" is pointed at.
const loadAsk = () => import("./ask-grok");
const AskGrokBox = lazyNamed(loadAsk, "AskGrokBox");
const askAhead = () => prefetch(loadAsk);

/** "Ask about this": a question thread under the current reading (memory only). */
function AskAbout({ chart, reading, mode }: { chart: NatalChart; reading: ElementReading; mode: AskMode }) {
  const { t } = useI18n();
  const ai = useAiAccount();
  const [open, setOpen] = useState(false);
  const name = ai.active ? providerName(ai.active) : t("aiAccounts");
  return (
    <div className="ob-rc-ask">
      <button
        type="button"
        className="ob-rc-ask-btn"
        data-testid="reading-ask"
        aria-expanded={open}
        onPointerEnter={askAhead}
        onFocus={askAhead}
        onClick={() => setOpen((v) => !v)}
      >
        <AiStarGlyph className="size-4" />
        <span>{open ? t("readingAskClose") : t("readingAsk", { name })}</span>
      </button>
      {open ? (
        <Suspense fallback={<LoadingLines testId="ask-loading" lines={2} />}>
          <AskGrokBox chart={chart} reading={reading} mode={mode} bare />
        </Suspense>
      ) : null}
    </div>
  );
}

/** Honest progress: the request has no stages to report, so show time spent. */
export function ComposeProgress({ rewriting, label }: { rewriting?: boolean; label?: string }) {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="ob-progress" aria-live="polite" data-testid="compose-progress">
      <div className="ob-progress-line">
        <span>{label ?? (rewriting ? t("rewritingReading") : t("composeWait"))}</span>
        <span className="ob-progress-time">{t("composeElapsed", { s: elapsed })}</span>
      </div>
      <div className="ob-progress-track" role="progressbar" aria-label={label ?? t("composeWait")} aria-busy="true">
        <span className="ob-progress-bar" />
      </div>
    </div>
  );
}

export function ComposeToolbar({
  grok,
  pending,
  error,
  onCompose,
}: {
  grok: GrokReading | null;
  pending: boolean;
  error: string | null;
  onCompose: () => void;
}) {
  const { t } = useI18n();
  const ai = useAiAccount();
  const [showKeys, setShowKeys] = useState(false);
  const closeKeys = useCallback(() => setShowKeys(false), []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (pending || (grok && !error)) return null;

  if (!ai.ready) {
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          data-testid="compose-grok"
          onClick={() => setShowKeys((v) => !v)}
          className="min-h-11 rounded-md bg-accent px-3 text-xs font-medium text-accent-fg md:px-5 md:text-sm"
        >
          {t("aiOpenAccounts")}
        </button>
        <AnchoredPopover
          open={showKeys}
          anchorRef={triggerRef}
          onClose={closeKeys}
          hideLabel={t("hidePanel")}
          align="end"
          width={22 * 16}
        >
          <AiAccountsPanel />
        </AnchoredPopover>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="compose-grok"
      onClick={onCompose}
      className="min-h-11 rounded-md bg-accent px-3 text-xs font-medium text-accent-fg md:px-5 md:text-sm"
    >
      {error
        ? t("retryCompose")
        : t("composeWithAi", { name: providerName(ai.active ?? "grok") })}
    </button>
  );
}

export function FullReading({
  grok,
  pending,
  error,
}: {
  grok: GrokReading | null;
  pending: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  return (
    <div aria-busy={pending} className="flex flex-col gap-3">
      {error && (
        <p className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {pending && <ComposeProgress rewriting={Boolean(grok)} />}

      {grok && !pending && (
        <>
          <div className="ob-rc-sec ob-rc-ai" data-testid="portrait">
            <h3 className="ob-rc-h">{grok.portraitTitle || t("readingComposed")}</h3>
            {grok.portrait
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((p, i) => (
                <p key={i} className="ob-rc-p">
                  {p}
                </p>
              ))}
          </div>
          {grok.sections?.map((s) => (
            <details key={s.title} className="ob-rc-about">
              <summary>{s.title}</summary>
              {s.body
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i} className="ob-rc-p">
                    {p}
                  </p>
                ))}
            </details>
          ))}
        </>
      )}
    </div>
  );
}
