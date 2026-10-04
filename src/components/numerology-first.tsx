import "@/studio/modes/styles/first-read.css";
import { LoadingLines } from "@/components/loading-lines";
import type { NumerologyChart } from "@/lib/chart/numerology";
import { usePack } from "@/lib/content/packs";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { useI18n } from "@/lib/i18n/locale";
import { numerologyCoreLabel, numerologyReadingText as r } from "@/lib/i18n/numerology-ui";
import { cn } from "@/lib/utils";
import { endNumerologyFirstRead } from "@/studio/numerology-first";

/**
 * The first read (part 63 of the launch plan), for a newcomer before
 * anything is chosen: the Life Path, the Expression, the Soul Urge, the
 * Personality and this year, in the side panel. Since the review of 3 Oct
 * (N3, N4) it is a list like Human Design's: every step in view at once,
 * each lighting its part of the wheel when pointed at and opening its
 * reading when chosen; the wheel stays whole until then. Done closes it, and
 * the Life Path's reading opens as before.
 */
export function NumerologyFirstRead({ chart, onSelect }: { chart: NumerologyChart; onSelect: (id: string) => void }) {
  const { locale } = useI18n();
  const chartHover = useChartHoverId();
  const pack = usePack("num", locale, true);
  const steps = pack?.FIRST_READ_STEPS ?? [];
  if (!pack || !steps.length) return <LoadingLines lines={4} />;
  return (
    <section className="ulune-num-first ulune-hd-first" data-testid="numerology-first" aria-labelledby="ulune-num-first-title">
      <header className="ulune-num-first-head">
        <h3 id="ulune-num-first-title" className="ulune-kicker ulune-num-first-title">
          {r(locale, "firstTitle")}
        </h3>
        <button
          type="button"
          className="ulune-num-first-skip"
          data-testid="numerology-first-done"
          title={r(locale, "firstDoneHint")}
          onClick={endNumerologyFirstRead}
        >
          {r(locale, "done")}
        </button>
      </header>
      <p className="ulune-num-first-intro">{r(locale, "firstIntro")}</p>
      <ol className="ulune-hd-steps">
        {steps.map((core, i) => {
          const ref = `core:${core}`;
          const info = pack.numerologyFirstStep(chart, core, locale);
          const label = core === "personalYear" ? `${r(locale, "thisYear")} · ${numerologyCoreLabel(locale, core)}` : numerologyCoreLabel(locale, core);
          const value = info?.value ?? "—";
          const text = info?.text ?? "";
          return (
            <li key={core}>
              <button
                type="button"
                data-testid={`numerology-first-${core}`}
                data-step={core}
                onClick={() => onSelect(ref)}
                {...previewProps(ref)}
                data-previewed={chartHover === ref ? "1" : undefined}
                aria-label={`${i + 1}. ${label}: ${value}. ${text}`}
                className={cn("ulune-hd-step")}
              >
                <span className="ulune-hd-step-n" aria-hidden>
                  {i + 1}
                </span>
                <span className="ulune-hd-step-body">
                  <span className="ulune-hd-step-head">
                    <span className="ulune-kicker ulune-hd-step-k">{label}</span>
                    <span className="ulune-hd-step-v">{value}</span>
                  </span>
                  {text ? <span className="ulune-hd-step-text ulune-num-first-text">{text}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
