import { Suspense, useMemo } from "react";
import {
  TimingDayStrip,
  TimingMonthGrid,
  TimingScopeBar,
  TimingYearGrid,
} from "@/components/timing-calendar";
import { TimingHello } from "@/components/timing-hello";
import { LoadingLines } from "@/components/loading-lines";
import { localizeError } from "@/lib/i18n/errors";
import { useI18n } from "@/lib/i18n/locale";
import { timingCasting, timingNoNatal } from "@/lib/i18n/timing-ui";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useModeData } from "@/studio/modes/data";
import { useTiming } from "@/studio/modes/hooks/useTiming";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/timing.css";

const loadTable = () => import("@/studio/tables/timing-table");
const TimingTable = lazyNamed(loadTable, "TimingTable");

export type TimingState = ReturnType<typeof useTiming>;

function TimingFigure() {
  const { locale } = useI18n();
  const timing = useModeData("timing");
  const selectedId = useStudioStore((s) => s.selectedId);
  if (!timing) return null;
  if (!timing.enabled && !timing.cast) {
    return (
      <p className="px-5 py-10 font-display text-2xl text-fg">{timingNoNatal(locale)}</p>
    );
  }
  return (
    <div
      className="ulune-timing-hero w-full min-w-0 overflow-auto px-[var(--stage-pad)] py-[var(--space-2)]"
      style={{ opacity: timing.busy ? 0.7 : 1 }}
    >
      {timing.error ? (
        <p className="mb-2 text-sm text-danger" role="alert">
          {localizeError(timing.error, locale, "couldNotCastSky")}
        </p>
      ) : null}
      <TimingScopeBar
        scope={timing.scope}
        civil={timing.civil}
        onScope={timing.changeScope}
        onShift={timing.shift}
      />
      {timing.scope === "day" ? (
        <TimingDayStrip
          hits={timing.scoped}
          tz={timing.tz}
          selectedId={selectedId}
          onSelectHit={timing.pickHit}
        />
      ) : null}
      {timing.scope === "month" ? (
        <TimingMonthGrid
          civil={timing.civil}
          hits={timing.scoped}
          tz={timing.tz}
          selectedDay={
            selectedId?.startsWith("day:")
              ? selectedId.slice(4)
              : `${timing.civil.year}-${String(timing.civil.month).padStart(2, "0")}-${String(timing.civil.day).padStart(2, "0")}`
          }
          onPickDay={timing.pickDay}
        />
      ) : null}
      {timing.scope === "year" ? (
        <TimingYearGrid
          year={timing.civil.year}
          hits={timing.scoped}
          tz={timing.tz}
          onPickMonth={timing.pickMonth}
        />
      ) : null}
    </div>
  );
}

function TimingHelloEmpty() {
  const { locale } = useI18n();
  const w = useWheelView();
  const timing = useModeData("timing");
  if (!timing || (timing.busy && !timing.cast)) {
    return (
      <section data-testid="timing-hello" className="ulune-hello ulune-panel" aria-busy="true">
        <div className="ulune-hello-cell">
          <span className="ulune-hello-copy">{timingCasting(locale)}</span>
        </div>
        <div className="ulune-hello-cell">
          <span className="ulune-hello-copy">{timingCasting(locale)}</span>
        </div>
        <div className="ulune-hello-cell">
          <span className="ulune-hello-copy">{timingCasting(locale)}</span>
        </div>
      </section>
    );
  }
  return (
    <TimingHello
      hits={timing.helloHits}
      scope={timing.scope}
      tz={timing.tz}
      selectedId={w.selectedId}
      onSelect={w.pick}
      earlier={timing.scoped.length > 0}
    />
  );
}

function TimingData() {
  const w = useWheelView();
  const timing = useModeData("timing");
  if (!timing?.cast) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <TimingTable
        hits={timing.scoped}
        scope={timing.scope}
        tz={timing.tz}
        selectedId={w.selectedId}
        onSelect={w.pick}
        nowMs={timing.nowMs}
      />
    </Suspense>
  );
}

function useTimingRuntime(): ModeRuntime<TimingState> {
  const timing = useTiming();
  return useMemo(() => ({ data: timing, reading: timing.reading }), [timing]);
}

export const timingMode: ModeDef = {
  ...MODE_META.timing,
  emptyText: timingNoNatal,
  Figure: TimingFigure,
  HelloEmpty: TimingHelloEmpty,
  Data: TimingData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useTimingRuntime,
};
