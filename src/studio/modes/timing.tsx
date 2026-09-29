import { Suspense, useMemo } from "react";
import { CalendarBar, CalendarScope } from "@/components/calendar-bar";
import { CalendarLegend, CalendarMonth } from "@/components/calendar-month";
import { CalendarNow } from "@/components/calendar-now";
import { CalendarDay } from "@/components/calendar-day";
import { TimingYearGrid } from "@/components/timing-calendar";
import { LoadingLines } from "@/components/loading-lines";
import { localizeError } from "@/lib/i18n/errors";
import { useI18n } from "@/lib/i18n/locale";
import { timingNoNatal } from "@/lib/i18n/timing-ui";
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
  const pick = useStudioStore((s) => s.pick);
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
      <CalendarBar
        scope={timing.scope}
        civil={timing.civil}
        onShift={timing.shift}
        onToday={timing.goToday}
        zone={timing.prefs.zone}
        zones={timing.zones}
        onZone={(zone) => timing.updatePrefs({ zone })}
        nowMs={timing.nowMs}
        showSky={timing.prefs.sky}
        showYours={timing.prefs.yours}
        onSky={(sky) => timing.updatePrefs({ sky })}
        onYours={(yours) => timing.updatePrefs({ yours })}
      />
      {timing.scope === "day" && timing.dayView ? (
        <CalendarDay
          ov={timing.dayView}
          civil={timing.civil}
          tz={timing.tz}
          nowMs={timing.nowMs}
          events={timing.allEvents}
          showSky={timing.prefs.sky}
          showYours={timing.prefs.yours}
          selectedId={selectedId}
          onSelect={pick}
        />
      ) : null}
      {timing.scope === "month" ? (
        <>
          <CalendarMonth
            civil={timing.civil}
            tz={timing.tz}
            events={timing.events}
            wins={timing.wins}
            hits={timing.scoped}
            showSky={timing.prefs.sky}
            showYours={timing.prefs.yours}
            selectedDay={selectedId?.startsWith("day:") ? selectedId.slice(4) : null}
            todayKey={timing.todayKey}
            onPickDay={timing.pickDay}
          />
          <CalendarLegend />
        </>
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

function TimingControls() {
  const timing = useModeData("timing");
  if (!timing?.enabled) return null;
  return <CalendarScope scope={timing.scope} onScope={timing.changeScope} />;
}

function TimingHelloEmpty() {
  const w = useWheelView();
  const timing = useModeData("timing");
  if (!timing) return null;
  return (
    <CalendarNow
      nowMs={timing.nowMs}
      tz={timing.tz}
      events={timing.nowEvents}
      wins={timing.nowWins}
      hits={timing.nowHits}
      windows={timing.windows}
      showSky={timing.prefs.sky}
      showYours={timing.prefs.yours}
      selectedId={w.selectedId}
      onSelect={w.pick}
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
  Controls: TimingControls,
  Figure: TimingFigure,
  HelloEmpty: TimingHelloEmpty,
  Data: TimingData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useTimingRuntime,
};
