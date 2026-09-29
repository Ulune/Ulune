import { useEffect } from "react";
import { LoadingLines } from "@/components/loading-lines";
import type { NumerologyChart } from "@/lib/chart/numerology";
import { usePack } from "@/lib/content/packs";
import { previewChartId } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { numerologyCoreLabel, numerologyReadingText as r } from "@/lib/i18n/numerology-ui";
import { endNumerologyFirstRead, setNumerologyFirstStep, useNumerologyFirstStep } from "@/studio/numerology-first";

/**
 * The first read (part 63 of the launch plan): for a newcomer, before
 * anything is chosen, five steps in the side panel: the Life Path, the
 * Expression, the Soul Urge, the Personality and this year. Each lights its
 * part of the wheel while it shows, opens its full reading on request, and
 * can be skipped; done or skipped, the Life Path's reading opens as before.
 */
export function NumerologyFirstRead({ chart, onSelect }: { chart: NumerologyChart; onSelect: (id: string) => void }) {
  const { locale } = useI18n();
  const pack = usePack("num", locale, true);
  const steps = pack?.FIRST_READ_STEPS ?? [];
  const at = Math.min(useNumerologyFirstStep(), Math.max(0, steps.length - 1));
  const core = steps[at];
  const ref = core ? `core:${core}` : null;

  // The wheel lights the step's part (as pointing at it would) while it shows.
  useEffect(() => {
    if (!ref) return;
    previewChartId(ref);
    return () => previewChartId(null);
  }, [ref]);

  if (!pack || !core || !ref) return <LoadingLines lines={4} />;
  const info = pack.numerologyFirstStep(chart, core, locale);
  const last = at === steps.length - 1;
  const label = core === "personalYear" ? `${r(locale, "thisYear")} · ${numerologyCoreLabel(locale, core)}` : numerologyCoreLabel(locale, core);
  return (
    <section className="ulune-num-first" data-testid="numerology-first" data-step={core} aria-labelledby="ulune-num-first-title">
      <header className="ulune-num-first-head">
        <h3 id="ulune-num-first-title" className="ulune-kicker ulune-num-first-title">
          {r(locale, "firstTitle")} · <span data-testid="numerology-first-count">{r(locale, "stepOf", { n: at + 1, total: steps.length })}</span>
        </h3>
        <button
          type="button"
          className="ulune-num-first-skip"
          data-testid="numerology-first-skip"
          title={r(locale, "firstSkipHint")}
          onClick={endNumerologyFirstRead}
        >
          {r(locale, "skip")}
        </button>
      </header>
      {at === 0 ? <p className="ulune-num-first-intro">{r(locale, "firstIntro")}</p> : null}
      <div className="ulune-num-first-step" aria-live="polite" data-testid={`numerology-first-${core}`}>
        <span className="ulune-num-first-n" aria-hidden>
          {info?.value ?? "—"}
        </span>
        <div className="ulune-num-first-body">
          <p className="ulune-num-first-k">
            {label} <b>{info?.value ?? "—"}</b>
          </p>
          {info?.text ? <p className="ulune-num-first-text">{info.text}</p> : null}
          {info ? (
            <button type="button" className="ulune-num-first-open" data-testid="numerology-first-open" onClick={() => onSelect(ref)}>
              {r(locale, "open")}
            </button>
          ) : null}
        </div>
      </div>
      <footer className="ulune-num-first-foot">
        <ol className="ulune-num-first-dots" aria-hidden>
          {steps.map((id, i) => (
            <li key={id} data-on={i === at ? "1" : undefined} />
          ))}
        </ol>
        {at > 0 ? (
          <button type="button" className="ulune-num-first-btn" data-testid="numerology-first-back" onClick={() => setNumerologyFirstStep(at - 1)}>
            {r(locale, "back")}
          </button>
        ) : null}
        <button
          type="button"
          className="ulune-num-first-btn is-main"
          data-testid="numerology-first-next"
          title={last ? r(locale, "firstDoneHint") : undefined}
          onClick={last ? endNumerologyFirstRead : () => setNumerologyFirstStep(at + 1)}
        >
          {last ? r(locale, "done") : r(locale, "next")}
        </button>
      </footer>
    </section>
  );
}
