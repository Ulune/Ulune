import { Suspense, useMemo } from "react";
import { BiWheelFrame } from "@/components/aspect-layer-toggle";
import { BirthDateField } from "@/components/birth-date-field";
import { ChartWheel } from "@/components/chart-wheel";
import { TransitHello } from "@/components/transit-hello";
import { LoadingLines } from "@/components/loading-lines";
import { MaskedInput } from "@/components/masked-input";
import { usePack } from "@/lib/content/packs";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { maskBirthTime } from "@/lib/chart/parse-birth";
import { useI18n } from "@/lib/i18n/locale";
import { localizeError } from "@/lib/i18n/errors";
import { transitClockLabel, transitNoNatal } from "@/lib/i18n/transits-ui";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useTransitSky } from "@/studio/modes/hooks/useTransitSky";
import { MODE_META } from "@/studio/modes/meta";
import { euroFromMs, msFromEuro, timeFromMs } from "@/studio/modes/euro-date";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { WheelPort } from "@/studio/stage/WheelPort";
import { TimeDial } from "@/studio/modes/time-dial";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/transits.css";

/** The dates the ephemeris files cover (calculate.server.ts). */
const SKY_MIN = Date.UTC(1800, 0, 1);
const SKY_MAX = Date.UTC(2399, 11, 31);

const loadTable = () => import("@/studio/tables/transit-table");
const TransitTable = lazyNamed(loadTable, "TransitTable");

export type TransitsState = ReturnType<typeof useTransitSky>;

function TransitsControls() {
  const { locale, t } = useI18n();
  const at = useStudioStore((s) => s.time.at);
  const live = useStudioStore((s) => s.time.live);
  const pin = useStudioStore((s) => s.pin);
  const now = useStudioStore((s) => s.now);
  const date = euroFromMs(at);
  const time = timeFromMs(at);

  function pinDate(nextDate: string) {
    const ms = msFromEuro(nextDate, time);
    if (ms != null) pin(ms);
  }
  function pinTime(nextTime: string) {
    const ms = msFromEuro(date, nextTime);
    if (ms != null) pin(ms);
  }

  return (
    <div data-testid="transit-clock" data-live={live ? "1" : "0"} className="ulune-transit-clock-bar min-w-0 flex-1">
      <label className="ulune-transit-clock-field">
        <span className="sr-only">{transitClockLabel(locale, "date")}</span>
        <BirthDateField
          id="transit-date"
          name="transit-date"
          testId="transit-date"
          value={date}
          placeholder={t("datePlaceholder")}
          calendarLabel={t("openCalendar")}
          locale={locale}
          onTyped={pinDate}
          onBlur={() => {}}
        />
      </label>
      <label className="ulune-transit-clock-field">
        <span className="sr-only">{transitClockLabel(locale, "time")}</span>
        <MaskedInput
          id="transit-time"
          data-testid="transit-time"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t("timePlaceholder")}
          value={time}
          mask={maskBirthTime}
          onTyped={pinTime}
          className="h-11 w-full min-w-0"
        />
      </label>
      <button type="button" data-testid="transit-now" onClick={() => now()} className="ulune-transit-now">
        {/* On a phone the live dot sits here and the Live / Pinned word is for screen readers only. */}
        <span className={cn("ulune-transit-now-dot", live && "is-live")} aria-hidden />
        {transitClockLabel(locale, "now")}
      </button>
      <span
        className={cn(
          "ulune-transit-live ulune-kicker inline-flex items-center gap-[var(--space-2)]",
          live ? "text-fg" : "text-fg-muted",
        )}
      >
        <span className={cn("size-1.5 rounded-full", live ? "ulune-live-dot" : "bg-fg-subtle")} />
        {live ? t("skyLive") : t("skyPinned")}
      </span>
    </div>
  );
}

function TransitsFigure() {
  const { locale, t } = useI18n();
  const w = useWheelView();
  const transits = useModeData("transits");
  const pin = useStudioStore((s) => s.pin);
  if (!w.chart || !transits) return null;
  return (
    <BiWheelFrame
      kind="transit"
      value={w.aspectLayer}
      onChange={w.setAspectLayer}
      banner={
        transits.error ? (
          <p className="text-sm text-danger">
            {localizeError(transits.error, locale, "couldNotCastSky")}{" "}
            <button type="button" className="underline" onClick={transits.retry}>
              {t("errorSlotRetry")}
            </button>
          </p>
        ) : null
      }
      footer={
        <TimeDial
          value={transits.atMs}
          min={SKY_MIN}
          max={SKY_MAX}
          onChange={pin}
          storageKey="ulune.scrub.unit"
          testId="transit-scrubber"
          label={t("scrubSky")}
          smooth={transits.smooth}
        />
      }
    >
      <WheelPort dim={transits.busy || w.casting}>
        <ChartWheel
          chart={w.chart}
          selectedId={w.selectedId}
          visible={w.visible}
          aspectFilter={w.aspectFilter}
          overlays={w.overlays}
          starVisible={w.starVisible}
          midpointVisible={w.midpointVisible}
          onSelect={w.choose}
          transits={transits.shownTransits}
          crossAspects={transits.sky?.aspects}
          outerKind="transit"
          aspectLayer={w.aspectLayer}
        />
      </WheelPort>
    </BiWheelFrame>
  );
}

function TransitsCaption() {
  const { t } = useI18n();
  return (
    <p className="ulune-kicker flex justify-center gap-[var(--space-4)] text-fg-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full border border-fg-muted bg-bg-elevated" />
        {t("transitLegendInner")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full border border-dashed border-fg-muted" />
        {t("transitLegendOuter")}
      </span>
    </p>
  );
}

function TransitsHelloEmpty() {
  const { t } = useI18n();
  const w = useWheelView();
  const transits = useModeData("transits");
  if (!w.chart || !transits?.sky) {
    return (
      <section data-testid="transits-hello" className="ulune-hello ulune-panel" aria-busy="true">
        <div className="ulune-hello-cell">
          <span className="ulune-hello-copy">{t("castingSky")}</span>
        </div>
        <div className="ulune-hello-cell">
          <span className="ulune-hello-copy">{t("castingSky")}</span>
        </div>
        <div className="ulune-hello-cell">
          <span className="ulune-hello-copy">{t("castingSky")}</span>
        </div>
      </section>
    );
  }
  return (
    <TransitHello sky={transits.sky} chart={w.chart} selectedId={w.selectedId} onSelect={w.pick} />
  );
}

function TransitsData() {
  const w = useWheelView();
  const transits = useModeData("transits");
  if (!w.chart || !transits?.sky) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <TransitTable sky={transits.sky} chart={w.chart} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function useTransitsRuntime(): ModeRuntime<TransitsState> {
  const { locale } = useI18n();
  const transits = useTransitSky();
  const selectedId = useStudioStore((s) => s.selectedId);
  const natal = useStudioStore((s) => s.dossier);
  const astro = usePack("astro", locale, transits.enabled);
  const selected =
    selectedId && transits.enabled
      ? (transits.dossier?.byId[selectedId] ?? natal?.byId[selectedId] ?? null)
      : null;
  const reading = useMemo(
    () => (selected && astro ? astro.withClickNote(selected, locale) : null),
    [selected, astro, locale],
  );
  return useMemo(() => ({ data: transits, reading }), [transits, reading]);
}

export const transitsMode: ModeDef = {
  ...MODE_META.transits,
  emptyText: transitNoNatal,
  Controls: TransitsControls,
  Figure: TransitsFigure,
  Caption: TransitsCaption,
  HelloEmpty: TransitsHelloEmpty,
  Data: TransitsData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useTransitsRuntime,
};
