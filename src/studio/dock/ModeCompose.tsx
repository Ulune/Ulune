import { useEffect, useRef, useState } from "react";
import { importWithRetry } from "@/lib/lazy-retry";
import { ComposeProgress } from "@/components/reading-panel";
import { AiStarGlyph } from "@/components/reading-ai-star";
import { usePack } from "@/lib/content/packs";
import type { LocalDossier, NatalChart } from "@/lib/chart/types";
import { aiAccountNow, useAiAccount } from "@/lib/ai/use-ai-account";
import { providerName } from "@/lib/ai/providers";
import { aiFailureText } from "@/lib/ai/failure-text";
import { useI18n } from "@/lib/i18n/locale";
import { useModeData } from "@/studio/modes/data";
import { aiHiddenWords, useStudioStore } from "@/studio/store";
import { whenSpaceLocks } from "@/lib/space/state";

type ComposeMode = "transits" | "progressions" | "synastry" | "composite";
const LABEL = {
  transits: "modeComposeTransits",
  progressions: "modeComposeProgressions",
  synastry: "modeComposeSynastry",
  composite: "modeComposeComposite",
} as const;

/** Written texts survive switching modes, not a reload (memory only), nor the private space locking. */
const written = new Map<string, string>();
whenSpaceLocks(() => written.clear());

function aspectLines(dossier: LocalDossier | null | undefined, limit = 8): string[] {
  if (!dossier) return [];
  const out: string[] = [];
  for (const id of dossier.order) {
    const r = dossier.byId[id];
    if (r?.kind !== "aspect") continue;
    out.push(`${r.title} — ${r.kicker}`.slice(0, 200));
    if (out.length >= limit) break;
  }
  return out;
}

export function isComposeMode(page: string): page is ComposeMode {
  return page === "transits" || page === "progressions" || page === "synastry" || page === "composite";
}

/**
 * Mode-aware compose: a transit outlook, a progression chapter, a synastry
 * dynamic or a composite portrait, written from what this mode lists.
 */
export function ModeCompose({ mode, chart }: { mode: ComposeMode; chart: NatalChart }) {
  const { locale, t } = useI18n();
  const ai = useAiAccount();
  const transits = useModeData("transits");
  const progressions = useModeData("progressions");
  const synastry = useModeData("synastry");
  const composite = useModeData("composite");
  // The prompt's chart summary comes with the reading text.
  const astro = usePack("astro", locale);
  const name = ai.active ? providerName(ai.active) : "AI";

  let dossier: LocalDossier | null | undefined = null;
  let stamp = "";
  if (mode === "transits") {
    dossier = transits?.dossier;
    stamp = transits ? new Date(transits.atMs).toISOString().slice(0, 10) : "";
  } else if (mode === "progressions") {
    dossier = progressions?.dossier;
    stamp = String(progressions?.at ?? "");
  } else if (mode === "synastry") {
    dossier = synastry?.synastryDossier;
    stamp = synastry?.chartB?.meta.name ?? "";
  } else {
    dossier = composite?.compositeDossier;
    stamp = composite?.chartB?.meta.name ?? "";
  }
  const lines = aspectLines(dossier);
  const key = `${mode}|${locale}|${chart.meta.date}|${chart.meta.time}|${chart.meta.latitude}|${stamp}|${lines.join("|").length}`;
  const [text, setText] = useState<string | null>(() => written.get(key) ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gen = useRef(0);
  const houseSystem = useStudioStore((s) => s.chart?.meta.houseSystem);

  useEffect(() => {
    setText(written.get(key) ?? null);
    setError(null);
    setPending(false);
    gen.current += 1;
  }, [key]);

  if (!lines.length || !astro) return null;
  const pack = astro;

  async function run() {
    const account = aiAccountNow();
    if (!account) return;
    const g = ++gen.current;
    setPending(true);
    setError(null);
    try {
      const { askAboutFocus } = await importWithRetry(() => import("@/lib/ai/run"));
      const res = await askAboutFocus(
        {
          locale,
          dump: pack.dumpChartForPrompt(chart, locale, true),
          focus: {
            id: `mode:${mode}`,
            kind: "mode",
            title: t(LABEL[mode], { name }),
            kicker: stamp,
            paragraphs: lines,
          },
          question: "",
          mode,
          houseSystem,
        },
        account,
        aiHiddenWords(locale),
      );
      if (g !== gen.current) return;
      if (!res.ok) {
        setError(aiFailureText(res.kind, t, providerName(account.provider), "askFailed"));
        return;
      }
      written.set(key, res.value.text);
      setText(res.value.text);
    } catch {
      if (g === gen.current) setError(t("askFailed"));
    } finally {
      if (g === gen.current) setPending(false);
    }
  }

  return (
    <section className="ob-mode-compose" data-testid="mode-compose-section" aria-busy={pending}>
      {text ? (
        <div className="ob-rc-sec ob-rc-ai" data-testid="mode-compose-text">
          <h3 className="ob-rc-h">{t("modeComposeTitle", { name })}</h3>
          {text.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="ob-rc-p">
              {p}
            </p>
          ))}
        </div>
      ) : null}
      {pending ? <ComposeProgress label={t("modeComposeWorking")} /> : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {!pending ? (
        <button
          type="button"
          className="ob-rc-ask-btn"
          data-testid="mode-compose"
          disabled={!ai.ready}
          title={ai.ready ? undefined : t("aiNeedKey")}
          onClick={() => void run()}
        >
          <AiStarGlyph className="size-4" />
          <span>{text ? t("modeComposeAgain") : t(LABEL[mode], { name })}</span>
        </button>
      ) : null}
      {!ai.ready ? <p className="text-xs text-fg-muted">{t("aiNeedKey")}</p> : null}
    </section>
  );
}
