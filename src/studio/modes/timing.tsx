import { Suspense, useMemo } from "react";
import { CalendarBar, CalendarScope } from "@/components/calendar-bar";
import { CalendarLegend, CalendarMonth } from "@/components/calendar-month";
import { CalendarNow } from "@/components/calendar-now";
import { CalendarDay } from "@/components/calendar-day";
import { CalendarYear, CalendarYearPanel } from "@/components/calendar-year";
import { LoadingLines } from "@/components/loading-lines";
import type { NumRow } from "@/lib/chart/calendar-rows";
import { changesBetween, dayKey, personalDayOn, personalMonthOn, personalYearOn, type NumerologyCalendar } from "@/lib/chart/numerology-calendar";
import type { CivilDate } from "@/lib/chart/timing-window";
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

const loadTable = () => import("@/studio/tables/calendar-table");
const CalendarTable = lazyNamed(loadTable, "CalendarTable");

export type TimingState = ReturnType<typeof useTiming>;

const NO_ROWS: readonly NumRow[] = [];

/** A day's numerology for the day view: its personal day, month and year, and a long cycle changing that day. */
function numDayOf(num: NumerologyCalendar, civil: CivilDate) {
  const key = dayKey(civil.year, civil.month, civil.day);
  return {
    pd: personalDayOn(num, civil.year, civil.month, civil.day),
    pm: personalMonthOn(num, civil.year, civil.month),
    py: personalYearOn(num, civil.year),
    changes: changesBetween(num, key, key),
  };
}

/** The calendar's bar, over the figure and over the table. */
function TimingBar({ table = false }: { table?: boolean }) {
  const timing = useModeData("timing");
  const selectedId = useStudioStore((s) => s.selectedId);
  const pick = useStudioStore((s) => s.pick);
  if (!timing) return null;
  return (
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
      onExport={timing.exportIcs}
      table={table}
      num={timing.numTitle}
      numOn={!!timing.numTitle && selectedId === timing.numTitle.id}
      onNum={pick}
    />
  );
}

function TimingFigure() {
  const { locale } = useI18n();
  const timing = useModeData("timing");
  const selectedId = useStudioStore((s) => s.selectedId);
  const pick = useStudioStore((s) => s.pick);
  if (!timing) return null;
  if (!timing.enabled && !timing.cast) {
    return <p className="px-5 py-10 font-display text-2xl text-fg">{timingNoNatal(locale)}</p>;
  }
  // Your numerology rides with your transits.
  const num = timing.prefs.yours ? timing.numCal : null;
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
      <TimingBar />
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
          num={num && timing.dayView ? numDayOf(num, timing.civil) : null}
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
            onShiftMonth={timing.shift}
            num={num}
          />
          <CalendarLegend num={!!num} />
        </>
      ) : null}
      {timing.scope === "year" && timing.yearView ? (
        <CalendarYear
          layout={timing.yearView}
          tz={timing.tz}
          nowMs={timing.nowMs}
          showSky={timing.prefs.sky}
          showYours={timing.prefs.yours}
          selectedId={selectedId}
          onSelect={pick}
          onOpenMonth={(month) => timing.pickMonth({ year: timing.civil.year, month, day: 1 })}
          num={num}
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
  if (timing.scope === "year" && timing.yearView) {
    return (
      <CalendarYearPanel
        layout={timing.yearView}
        tz={timing.tz}
        showSky={timing.prefs.sky}
        showYours={timing.prefs.yours}
        selectedId={w.selectedId}
        onSelect={w.pick}
        num={timing.prefs.yours ? timing.numCal : null}
      />
    );
  }
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
      num={timing.prefs.yours ? timing.numCal : null}
    />
  );
}

function TimingData() {
  const w = useWheelView();
  const timing = useModeData("timing");
  if (!timing?.cast) return null;
  return (
    <div className="ulune-cal-tableview">
      <TimingBar table />
      <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
        <CalendarTable
          events={timing.allEvents}
          hits={timing.hits}
          windows={timing.allWindows}
          wins={timing.wins}
          from={timing.bounds.from.getTime()}
          to={timing.bounds.to.getTime()}
          scope={timing.scope}
          tz={timing.tz}
          nowMs={timing.nowMs}
          fileName={timing.fileName}
          selectedId={w.selectedId}
          onSelect={w.pick}
          num={timing.prefs.yours ? timing.numRows : NO_ROWS}
        />
      </Suspense>
    </div>
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
