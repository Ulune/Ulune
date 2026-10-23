import { aiAccountNow } from "@/lib/ai/use-ai-account";
import { providerName } from "@/lib/ai/providers";
import { aiFailureText } from "@/lib/ai/failure-text";
import { personalWords, type Hidden } from "@/lib/ai/scrub";
import { saveLocalLibrary } from "@/lib/chart/library";
import { loadPack } from "@/lib/content/packs";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { bookT } from "@/lib/i18n/words-book";
import { aiWords } from "@/lib/i18n/catalog/ai-words";
import { importWithRetry } from "@/lib/lazy-retry";
import { useStudioStore } from "@/studio/store";

/*
 * The studio's AI readings (lib/features.ts): the natal reading composed by the reader's own AI, and the
 * names and birthplaces it must never see. Out of the studio's store (store.ts), which loads it when a
 * reading is composed, so none of the AI plumbing (the keys' store, the providers, the scrubbing, the
 * failures' words) is in a page's first download while AI readings are off (the 2.0 fixes, item 3);
 * the ask box and the modes' composers (ask-grok.tsx, ModeCompose.tsx) read the hidden words here too.
 */

/**
 * The names and birthplaces an AI must not see: the chart in view first
 * ("Person A"), then the synastry and composite partners, then every other
 * saved chart (lib/ai/scrub.ts).
 */
export function aiHiddenWords(lang: AppLocale): Hidden[] {
  const s = useStudioStore.getState();
  const byId = (id: string | null) => (id ? s.rows.find((r) => r.id === id)?.chart : undefined);
  const charts = [s.chart, byId(s.pair.partnerId), byId(s.pair.compositePartnerId)];
  const seen = new Set(charts);
  for (const row of s.rows) if (!seen.has(row.chart)) charts.push(row.chart);
  // Numerology's names (part 64) stand for their person too.
  const names = charts.map((chart) => {
    const input = chart && chart === s.chart ? s.input : s.rows.find((r) => r.chart === chart)?.input;
    return input ? [input.birthName, input.currentName] : undefined;
  });
  return personalWords(charts, lang, names);
}

/**
 * The natal reading composed for the chart in view, as the store's `compose` asks: `begin` starts this
 * attempt (later ones overtake it) and says whether it is still the one that counts.
 */
export async function composeNatal(lang: "en" | "fr", quiet: boolean, begin: () => () => boolean): Promise<void> {
  const store = useStudioStore;
  const chart = store.getState().chart;
  if (!chart) return;
  const account = aiAccountNow();
  const t = bookT(aiWords, (key, vars) => translate(lang, key, vars), lang);
  if (!account) {
    if (!quiet) store.setState({ composeError: t("aiNeedKey") });
    return;
  }
  const live = begin();
  const targetId = store.getState().activeId;
  store.setState({ composing: true, composeError: null });
  try {
    const [{ composeNatalReading }, astro] = await Promise.all([importWithRetry(() => import("@/lib/ai/run")), loadPack("astro", lang)]);
    const outcome = await composeNatalReading({
      chart,
      locale: lang,
      account,
      dump: astro.dumpChartForPrompt,
      hidden: aiHiddenWords(lang),
    });
    if (!live()) return;
    if (outcome.ok) {
      store.setState({ grok: outcome.value });
      if (targetId && targetId === store.getState().activeId) {
        const next = store.getState().rows.map((row) => (row.id === targetId ? { ...row, grok: outcome.value } : row));
        store.setState({ rows: next });
        saveLocalLibrary(next, targetId);
      }
    } else {
      store.setState({ composeError: aiFailureText(outcome.kind, t, providerName(account.provider), "couldNotCompose") });
    }
  } catch {
    if (!live()) return;
    store.setState({ composeError: t("couldNotCompose") });
  } finally {
    if (live()) store.setState({ composing: false });
  }
}
