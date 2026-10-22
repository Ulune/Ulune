import { Suspense, useMemo, useRef } from "react";
import { CalendarBar, CalendarScope } from "@/components/calendar-bar";
import { CalendarInvite } from "@/components/calendar-layers";
import { CalendarLegend, CalendarMonth } from "@/components/calendar-month";
import { CalendarNow } from "@/components/calendar-now";
import { CalendarDay } from "@/components/calendar-day";
import { CalendarYear, CalendarYearPanel } from "@/components/calendar-year";
import { LoadingLines } from "@/components/loading-lines";
import { layersOn } from "@/lib/chart/calendar-layers";
import type { NumRow } from "@/lib/chart/calendar-rows";
import { changesBetween, dayKey, personalDayOn, personalMonthOn, personalYearOn, type NumerologyCalendar } from "@/lib/chart/numerology-calendar";
import type { CivilDate } from "@/lib/chart/timing-window";
import { localizeError } from "@/lib/i18n/errors";
import { useI18n } from "@/lib/i18n/locale";
import { timingNoNatal } from "@/lib/i18n/timing-ui";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useModeData } from "@/studio/modes/data";
import { civilKey } from "@/lib/chart/timing-window";
import { useTiming } from "@/studio/modes/hooks/useTiming";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioStore } from "@/studio/store";
import { useKeptScroll } from "@/studio/return-parts";
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

/** The birth form, from the Calendar without a chart: the cast brings the reader back here with their transits. */
const castFromCalendar = () => useStudioStore.getState().startNew();

/** The calendar's bar, over the figure and over the table. */
function TimingBar({ table = false }: { table?: boolean }) {
  const timing = useModeData("timing");
  const selectedId = useStudioStore((s) => s.selectedId);
  const pick = useStudioStore((s) => s.pick);
  const choices = timing?.prefs.layers;
  const on = useMemo(() => layersOn(choices), [choices]);
  const { locale } = useI18n();
  if (!timing) return null;
  // The kept charts' birthdays and returns (idea B10): which group, under the layer's switch; the calendar file's question.
  const ppl = timing.people;
  const extras = ppl ? { people: <ppl.mod.PeopleGroupSelect groups={ppl.groups} value={ppl.group} onChange={ppl.setGroup} /> } : undefined;
  const icsPeople = ppl && ppl.rows.length ? { on: ppl.inFile, set: ppl.setInFile, words: ppl.mod.peopleIcsWords(locale) } : null;
  return (
    <CalendarBar
      scope={timing.scope}
      civil={timing.civil}
      onShift={timing.shift}
      onToday={timing.goToday}
      zone={timing.zone}
      zones={timing.zones}
      onZone={(zone) => timing.updatePrefs({ zone })}
      nowMs={timing.nowMs}
      layers={{ on, shown: timing.shown, hasChart: timing.hasChart, onLayer: timing.setLayer, onCast: castFromCalendar, extras }}
      people={icsPeople}
      onExport={timing.exportIcs}
      loading={timing.loading}
      table={table}
      num={timing.numTitle}
      numOn={!!timing.numTitle && selectedId === timing.numTitle.id}
      onNum={pick}
      onJump={timing.setCivil}
      legend={
        timing.scope === "month" ? (
          <CalendarLegend
            sky={timing.shown.sky}
            yours={timing.shown.transits}
            num={!!timing.numShown}
            terms={timing.shown.terms}
            animals={Boolean(timing.animals?.yearBranch != null)}
            stars={Boolean(timing.stars)}
            people={ppl ? <ppl.mod.PeopleLegend /> : null}
          />
        ) : null
      }
    />
  );
}

function TimingFigure() {
  const { locale } = useI18n();
  const timing = useModeData("timing");
  const selectedId = useStudioStore((s) => s.selectedId);
  const pick = useStudioStore((s) => s.pick);
  // Day, month and year each open at their top (review 3 Oct, T6): the day
  // kept the month's scroll, its Moon card under the pinned bar. The month
  // then brings today or the day chosen into view, the year its month.
  const hero = useRef<HTMLDivElement>(null);
  const scope = timing?.scope;
  // …except when the studio comes back from a page outside it: where it was (R6).
  useKeptScroll(hero, "calendar-scroll", scope);
  if (!timing) return null;
  if (!timing.enabled && !timing.cast) {
    return <p className="px-5 py-10 font-display text-2xl text-fg">{timingNoNatal(locale)}</p>;
  }
  // What the layers let through (lib/chart/calendar-layers.ts): the sky, your transits, your numerology.
  const { sky, transits } = timing.shown;
  const num = timing.numShown;
  // The kept charts' birthdays and returns (idea B10), with their layer on.
  const ppl = timing.people;
  return (
    <div
      ref={hero}
      className="ulune-timing-hero w-full min-w-0 overflow-auto px-[var(--stage-pad)] py-[var(--space-2)]"
      style={{ opacity: timing.busy ? 0.7 : 1 }}
    >
      {timing.error ? (
        <p className="mb-2 text-sm text-danger" role="alert">
          {localizeError(timing.error, locale, "couldNotCastSky")}
        </p>
      ) : null}
      {timing.hasChart ? null : <CalendarInvite onCast={castFromCalendar} />}
      {timing.scope === "day" && timing.dayView ? (
        <CalendarDay
          ov={timing.dayView}
          civil={timing.civil}
          tz={timing.tz}
          nowMs={timing.nowMs}
          events={timing.allEvents}
          showSky={sky}
          showYours={transits}
          selectedId={selectedId}
          onSelect={pick}
          num={num && timing.dayView ? numDayOf(num, timing.civil) : null}
          animals={timing.animals}
          stars={timing.stars}
          people={ppl ? <ppl.mod.PeopleDay events={ppl.mod.eventsOfDay(ppl.events, civilKey(timing.civil))} tz={timing.tz} selectedId={selectedId} onSelect={pick} /> : null}
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
            showSky={sky}
            showYours={transits}
            selectedDay={selectedId?.startsWith("day:") ? selectedId.slice(4) : null}
            todayKey={timing.todayKey}
            onPickDay={timing.pickDay}
            onShiftMonth={timing.shift}
            num={num}
            animals={timing.animals}
            stars={timing.stars}
            people={ppl ? { of: (day) => ppl.mod.eventsOfDay(ppl.events, day), Cell: ppl.mod.PeopleCell, say: (ev) => ppl.mod.personShort(ev, locale) } : null}
          />
        </>
      ) : null}
      {timing.scope === "year" && timing.yearView ? (
        <CalendarYear
          layout={timing.yearView}
          tz={timing.tz}
          nowMs={timing.nowMs}
          showSky={sky}
          showYours={transits}
          selectedId={selectedId}
          onSelect={pick}
          onOpenMonth={(month) => timing.pickMonth({ year: timing.civil.year, month, day: 1 })}
          num={num}
          people={
            ppl && ppl.events.length
              ? {
                  lane: (x, pct, heading) => <ppl.mod.PeopleLane events={ppl.events} x={x} pct={pct} tz={timing.tz} heading={heading} selectedId={selectedId} onSelect={pick} />,
                  month: (from, to) => <ppl.mod.PeopleMonthLines events={ppl.events.filter((e) => e.t >= from && e.t < to)} tz={timing.tz} selectedId={selectedId} onSelect={pick} />,
                }
              : null
          }
        />
      ) : null}
    </div>
  );
}

/** The calendar's controls, in the stage's toolbar (UI plan, part 93): the period, View, the file, then day / month / year. */
function TimingControls() {
  const timing = useModeData("timing");
  const view = useStudioStore((s) => s.view);
  if (!timing?.enabled) return null;
  return (
    <>
      <TimingBar table={view === "table"} />
      <CalendarScope scope={timing.scope} onScope={timing.changeScope} />
    </>
  );
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
        showSky={timing.shown.sky}
        showYours={timing.shown.transits}
        selectedId={w.selectedId}
        onSelect={w.pick}
        num={timing.numShown}
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
      showSky={timing.shown.sky}
      showYours={timing.shown.transits}
      selectedId={w.selectedId}
      onSelect={w.pick}
      num={timing.numShown}
    />
  );
}

function TimingData() {
  const w = useWheelView();
  const { locale } = useI18n();
  const timing = useModeData("timing");
  const chartName = useStudioStore((s) => s.chart?.meta.name ?? "");
  if (!timing?.cast) return null;
  // The kept charts' birthdays and returns (idea B10), with their layer on: their rows and words come with its code.
  const ppl = timing.people;
  const Icon = ppl?.mod.PersonIcon ?? (() => null);
  return (
    <div className="ulune-cal-tableview">
      {timing.hasChart ? null : <CalendarInvite onCast={castFromCalendar} />}
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
          layers={timing.shown}
          num={timing.numShown ? timing.numRows : NO_ROWS}
          loading={timing.loading}
          who={chartName}
          people={
            ppl
              ? {
                  rows: ppl.rows,
                  title: (ev) => ppl.mod.personTitle(ev, locale),
                  detail: (ev) => ppl.mod.personDetail(ev, locale, timing.tz),
                  icon: (kind) => <Icon kind={kind} size={14} />,
                  ics: (r) => ppl.mod.personIcsItem(r, locale, timing.tz),
                  include: ppl.inFile,
                  setInclude: ppl.setInFile,
                  words: ppl.mod.peopleIcsWords(locale),
                }
              : null
          }
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
