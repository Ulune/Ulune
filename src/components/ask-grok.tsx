import { useEffect, useMemo, useRef, useState } from "react";
import { importWithRetry } from "@/lib/lazy-retry";
import { usePack } from "@/lib/content/packs";
import { aiAccountNow, useAiAccount } from "@/lib/ai/use-ai-account";
import { providerName } from "@/lib/ai/providers";
import { aiFailureText } from "@/lib/ai/failure-text";
import { aiHiddenWords } from "@/studio/store";
import { whenSpaceLocks } from "@/lib/space/state";
import type { ElementReading, NatalChart } from "@/lib/chart/types";
import { useI18n } from "@/lib/i18n/locale";

type Turn = { q: string; a: string };

const threads = new Map<string, Turn[]>();
// The threads are about the charts: they go when the private space locks.
whenSpaceLocks(() => threads.clear());

function threadKey(chart: NatalChart, readingId: string) {
  // The UTC instant too: a time zone override or a repeated-hour choice moves the chart.
  return `${chart.meta.date}|${chart.meta.time}|${chart.meta.latitude}|${chart.meta.longitude}|${chart.meta.utc}|${readingId}`;
}

function focusParagraphs(reading: ElementReading): string[] {
  const out = [reading.note, reading.lead, ...(reading.sections ?? []).flatMap((s) => s.paragraphs)].filter(
    (p): p is string => Boolean(p),
  );
  return (out.length ? out : reading.paragraphs).slice(0, 5).map((p) => p.slice(0, 700));
}

export type AskMode = "natal" | "transits" | "timing" | "progressions" | "synastry" | "composite" | "design" | "numerology";

export function AskGrokBox({
  chart,
  reading,
  mode = "natal",
  bare = false,
}: {
  chart: NatalChart;
  reading: ElementReading;
  mode?: AskMode;
  /** Inside the reading card: no top rule, no extra heading. */
  bare?: boolean;
}) {
  const { locale, t } = useI18n();
  const ai = useAiAccount();
  const model = ai.active ? providerName(ai.active) : "AI";
  const key = `${mode}|${threadKey(chart, reading.id)}`;
  const [turns, setTurns] = useState<Turn[]>(() => threads.get(key) ?? []);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTurns(threads.get(key) ?? []);
    setDraft("");
    setError(null);
    setPending(false);
    genRef.current += 1;
  }, [key]);

  const empty = draft.trim().length === 0;
  const cta = empty
    ? turns.length
      ? t("askDeeperAi", { name: model })
      : t("askElaborateAi", { name: model })
    : t("askSend");

  // The chart summary for the prompt comes with the reading text (its own download).
  const astro = usePack("astro", locale);
  const dump = useMemo(
    () => (astro ? astro.dumpChartForPrompt(chart, locale, true) : ""),
    [astro, chart, locale],
  );

  async function submit() {
    const account = aiAccountNow();
    if (pending || !account || !dump) return;
    const gen = ++genRef.current;
    setPending(true);
    setError(null);
    try {
      const { askAboutFocus } = await importWithRetry(() => import("@/lib/ai/run"));
      const result = await askAboutFocus(
        {
          locale,
          dump,
          focus: {
            id: reading.id,
            kind: reading.kind,
            title: reading.title,
            kicker: reading.kicker,
            paragraphs: focusParagraphs(reading),
          },
          mode,
          houseSystem: chart.meta.houseSystem,
          question: draft.trim(),
          history: (threads.get(key) ?? []).slice(-3),
        },
        account,
        aiHiddenWords(locale),
      );
      if (gen !== genRef.current) return;
      if (!result.ok) {
        setError(aiFailureText(result.kind, t, providerName(account.provider), "askFailed"));
        return;
      }
      const next = [...(threads.get(key) ?? []), { q: result.value.question, a: result.value.text }];
      threads.set(key, next);
      setTurns(next);
      setDraft("");
      window.requestAnimationFrame(() => {
        boxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    } catch {
      if (gen !== genRef.current) return;
      setError(t("askFailed"));
    } finally {
      if (gen === genRef.current) setPending(false);
    }
  }

  return (
    <div
      ref={boxRef}
      data-testid="ask-grok"
      className={bare ? "" : "mt-[var(--space-5)] border-t border-border pt-[var(--space-4)]"}
    >
      {turns.length > 0 ? (
        <ol className="mb-[var(--space-4)] space-y-[var(--space-4)]">
          {turns.map((turn, i) => (
            <li key={`${i}-${turn.q.slice(0, 24)}`} className="space-y-[var(--space-2)]">
              <p className="ulune-kicker text-fg-subtle">
                {t("askYou")}
              </p>
              <p className="text-sm text-fg">{shortQuestion(turn.q, reading.title)}</p>
              <p className="ulune-kicker text-fg-subtle">
                {model}
              </p>
              <p className="max-w-[61.8ch] whitespace-pre-line text-sm leading-[var(--leading-phi)] text-fg-muted">
                {turn.a}
              </p>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="rounded-lg border border-border bg-bg p-[var(--space-3)]">
        {bare ? null : (
          <p className="ulune-kicker text-fg-subtle">
            {t("askAiKicker", { name: model })}
          </p>
        )}
        <p className={bare ? "text-xs text-fg-muted" : "mt-1 text-xs text-fg-muted"}>{t("askHint")}</p>

        {!ai.ready ? <p className="mt-3 text-sm text-fg">{t("aiNeedKey")}</p> : null}

        {ai.ready ? (
          <>
            <label className="sr-only" htmlFor="ask-grok-q">
              {t("askPlaceholder")}
            </label>
            <textarea
              id="ask-grok-q"
              rows={2}
              maxLength={700}
              value={draft}
              disabled={pending}
              placeholder={t("askPlaceholder")}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
              className="mt-3 block min-h-11 w-full resize-y rounded-md border border-border bg-bg-elevated px-3 py-2 text-base text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:text-sm"
            />

            {error ? (
              <p className="mt-2 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}

            {pending ? (
              <div className="mt-3" aria-live="polite">
                <p className="text-xs tracking-wide text-fg-subtle uppercase">{t("askWorking")}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-subtle">
                  <div className="ulune-compose-bar h-full w-2/3 rounded-full bg-accent" />
                </div>
              </div>
            ) : null}

            <button
              type="button"
              data-testid="ask-grok-submit"
              disabled={pending}
              onClick={() => void submit()}
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-[opacity,transform] duration-[var(--motion-press)] ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 sm:w-auto"
            >
              {cta}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Show a short label for the canned elaborate prompt. */
function shortQuestion(q: string, title: string): string {
  const lower = q.toLowerCase();
  if (lower.startsWith("elaborate on") || lower.startsWith("approfondissez")) {
    return title;
  }
  if (lower.startsWith("go deeper") || lower.startsWith("allez plus loin")) {
    return title;
  }
  return q;
}
