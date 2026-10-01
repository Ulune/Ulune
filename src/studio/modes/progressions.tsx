import { Suspense, useMemo } from "react";
import { BiWheelFrame } from "@/components/aspect-layer-toggle";
import { BirthDateField } from "@/components/birth-date-field";
import { ChartWheel } from "@/components/chart-wheel";
import { ProgressionsHello } from "@/components/progressions-hello";
import { LoadingLines } from "@/components/loading-lines";
import { lifeMsFromYears, TROPICAL_YEAR_DAYS } from "@/lib/chart/progressions";
import { usePack } from "@/lib/content/packs";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useI18n } from "@/lib/i18n/locale";
import { localizeError } from "@/lib/i18n/errors";
import { progressionClockLabel, progressionMethodLabel, progressionNoNatal } from "@/lib/i18n/progressions-ui";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import { useModeData } from "@/studio/modes/data";
import { isoFromEuro } from "@/studio/modes/euro-date";
import { dateInZone, natalUtcOf, targetFromIsoDate, useProgressions } from "@/studio/modes/hooks/useProgressions";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { WheelPort } from "@/studio/stage/WheelPort";
import { useStudioStore } from "@/studio/store";
import { progressedScrubTicks } from "@/studio/modes/time-scrub-ticks";
import { dateFormat, numberFormat } from "@/lib/intl-cache";
import "@/studio/modes/styles/progressions.css";
import "@/studio/modes/styles/time.css";

const loadTable = () => import("@/studio/tables/progressions-table");
const ProgressionsTable = lazyNamed(loadTable, "ProgressionsTable");

export type ProgressionsState = ReturnType<typeof useProgressions>;

const MAX_YEARS = 120;
const YEAR_STEP = 1 / TROPICAL_YEAR_DAYS;
const MINUTE_STEP = YEAR_STEP / (24 * 60);

function ProgressionsControls() {
  const { locale, t } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const progressions = useModeData("progressions");
  const setTarget = useStudioStore((s) => s.setProgressionTarget);
  if (!chart || !progressions) return null;
  const value = formatEuropeanDate(dateInZone(new Date(progressions.at), progressions.tz));

  return (
    <div className="ulune-progressions-clock-bar min-w-0 flex-1">
      <label className="ulune-progressions-clock-field">
        <span className="sr-only">{progressionClockLabel(locale, "date")}</span>
        <BirthDateField
          id="progressions-date"
          name="progressions-date"
          testId="progressions-date"
          value={value}
          placeholder={t("datePlaceholder")}
          calendarLabel={t("openCalendar")}
          locale={locale}
          onTyped={(raw) => {
            const iso = isoFromEuro(raw);
            if (!iso) return;
            const next = targetFromIsoDate(iso, chart);
            if (next) setTarget(Math.max(next.getTime(), natalUtcOf(chart).getTime()));
          }}
          onBlur={() => {}}
        />
      </label>
      <button
        type="button"
        data-testid="progressions-today"
        onClick={() => setTarget(Date.now())}
        className="ulune-progressions-today"
      >
        {progressionClockLabel(locale, "today")}
      </button>
    </div>
  );
}

function ProgressionsFigure() {
  const { locale, t } = useI18n();
  const w = useWheelView();
  const progressions = useModeData("progressions");
  const setTarget = useStudioStore((s) => s.setProgressionTarget);
  const yearsNow = progressions?.yearsNow ?? 0;
  const spanMax = Math.max(MAX_YEARS, Math.ceil(yearsNow + 1));
  const sliderYears = Math.min(spanMax, Math.max(0, yearsNow));
  const sliderPct = (sliderYears / spanMax) * 100;
  const ticks = useMemo(() => progressedScrubTicks(spanMax), [spanMax]);
  if (!w.chart || !progressions) return null;
  return (
    <BiWheelFrame
      kind="progressions"
      value={w.aspectLayer}
      onChange={w.setAspectLayer}
      banner={progressions.error ? <p className="text-sm text-danger">{localizeError(progressions.error, locale, "couldNotCastProgressions")}</p> : null}
      footer={
        <div className="ulune-time-scrub" data-testid="progressions-scrub-band">
          <p data-testid="progressions-scrub-readout" className="ulune-scrub-readout ulune-micro text-center text-fg-muted">
            {dateFormat(locale === "fr" ? "fr-FR" : "en-GB", {
              dateStyle: "medium",
              timeZone: progressions.tz || undefined,
            }).format(lifeMsFromYears(progressions.natalUtc, sliderYears))}
          </p>
          <div className="ulune-time-ticks" aria-hidden="true">
            {ticks.map((tick) => (
              <span
                key={`${tick.major ? "M" : "m"}-${tick.pct.toFixed(3)}`}
                className="ulune-time-tick"
                data-major={tick.major ? "1" : "0"}
                style={{ left: `${tick.pct}%` }}
              />
            ))}
          </div>
          <label className="block w-full min-w-0">
            <span className="sr-only">{t("scrubProgressions")}</span>
            <input
              type="range"
              data-testid="progressions-slider"
              min={0}
              max={spanMax}
              step={MINUTE_STEP}
              value={sliderYears}
              onChange={(e) => setTarget(lifeMsFromYears(progressions.natalUtc, Number(e.target.value)))}
              className="ulune-time-slider"
              style={{ ["--pct" as string]: `${sliderPct}%` }}
            />
          </label>
        </div>
      }
    >
      <WheelPort dim={progressions.busy || w.casting}>
        <ChartWheel
          chart={w.chart}
          selectedId={w.selectedId}
          visible={w.visible}
          aspectFilter={w.aspectFilter}
          overlays={w.overlays}
          starVisible={w.starVisible}
          midpointVisible={w.midpointVisible}
          onSelect={w.choose}
          transits={progressions.outer}
          crossAspects={progressions.shownSky?.aspects}
          outerKind="progressions"
          aspectLayer={w.aspectLayer}
        />
      </WheelPort>
    </BiWheelFrame>
  );
}

function ProgressionsCaption() {
  const { locale, t } = useI18n();
  const progressions = useModeData("progressions");
  if (!progressions) return null;
  const spanMax = Math.max(MAX_YEARS, Math.ceil(progressions.yearsNow + 1));
  const sliderYears = Math.min(spanMax, Math.max(0, progressions.yearsNow));
  const yearLabel = numberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(sliderYears);
  return (
    <div className="flex flex-col items-center gap-[var(--space-1)]">
      <p className="ulune-kicker flex justify-center gap-[var(--space-4)] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-fg-muted bg-bg-elevated" />
          {t("transitLegendInner")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-dashed border-fg-muted" />
          {t("progressionLegendOuter")}
        </span>
      </p>
      <p className="ulune-kicker flex justify-center gap-[var(--space-4)] text-fg-muted">
        <span data-testid="progressions-method">{progressionMethodLabel(locale)}</span>
        <span data-testid="progressions-years">{t("progressionYearsOfLife", { n: yearLabel })}</span>
      </p>
    </div>
  );
}

function ProgressionsHelloEmpty() {
  const { t } = useI18n();
  const w = useWheelView();
  const progressions = useModeData("progressions");
  if (!progressions?.shownSky) {
    return (
      <section data-testid="progressions-hello" className="ulune-hello ulune-panel" aria-busy="true">
        <div className="ulune-hello-cell">
          <span className="ulune-hello-copy">{t("castingSky")}</span>
        </div>
      </section>
    );
  }
  return (
    <ProgressionsHello
      sky={progressions.shownSky}
      natal={w.chart}
      selectedId={w.selectedId}
      onSelect={w.pick}
    />
  );
}

function ProgressionsData() {
  const w = useWheelView();
  const progressions = useModeData("progressions");
  if (!w.chart || !progressions?.shownSky) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <ProgressionsTable
        sky={progressions.shownSky}
        chart={w.chart}
        selectedId={w.selectedId}
        onSelect={w.pick}
      />
    </Suspense>
  );
}

function useProgressionsRuntime(): ModeRuntime<ProgressionsState> {
  const { locale } = useI18n();
  const progressions = useProgressions();
  const selectedId = useStudioStore((s) => s.selectedId);
  const natal = useStudioStore((s) => s.dossier);
  const astro = usePack("astro", locale, progressions.enabled);
  const selected =
    selectedId && progressions.enabled
      ? (progressions.dossier?.byId[selectedId] ?? natal?.byId[selectedId] ?? null)
      : null;
  const reading = useMemo(
    () => (selected && astro ? astro.withClickNote(selected, locale) : null),
    [selected, astro, locale],
  );
  return useMemo(() => ({ data: progressions, reading }), [progressions, reading]);
}

export const progressionsMode: ModeDef = {
  ...MODE_META.progressions,
  emptyText: progressionNoNatal,
  Controls: ProgressionsControls,
  Figure: ProgressionsFigure,
  Caption: ProgressionsCaption,
  HelloEmpty: ProgressionsHelloEmpty,
  Data: ProgressionsData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useProgressionsRuntime,
};
