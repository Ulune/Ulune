import { Suspense, useMemo, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LoadingLines } from "@/components/loading-lines";
import { BRANCHES, SIXTY, STEMS } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { baziChart, tenGodById, type BaziChart } from "@/lib/chinese/bazi";
import { interactionTone } from "@/lib/chinese/bazi-interactions";
import { flowDay, flowYear, flowYearOf, luckPillars, type FlowYear, type Luck, type LuckCount, type Meeting } from "@/lib/chinese/bazi-luck";
import {
  FLOW_DAY_REF,
  FLOW_YEAR_REF,
  LUCK_HOW_REF,
  ageWords,
  countWord,
  dateIn,
  flowMonthRef,
  luckReading,
  luckRef,
  meetingShort,
  type LuckContext,
} from "@/lib/chinese/bazi-luck-reading";
import { dayCycleOf } from "@/lib/chinese/day-cycle";
import { hanziLang } from "@/lib/chinese/animal-chars";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/zodiac.css";
import "@/studio/modes/styles/zodiac-time.css";
import "@/studio/modes/styles/bazi-luck.css";

/*
 * BaZi's Cycles (languages plan, part 16: "luck pillars as ten-year blocks,
 * the years inside them, and a slider that moves through life as the
 * transits slider does, with the chart's interactions lighting up as you
 * go"), at /bazi/cycles. The luck pillars as a band of ten-year blocks
 * (both directions when the birth has no yin or yang count), a slider and
 * the toolbar's steps through the years, the year shown with its Ten God,
 * what it meets in the four pillars and in the luck pillar it falls in, its
 * twelve months, and today. Every block and row opens its reading; with
 * nothing chosen the dock reads the year. Worked out here; nothing is sent.
 */

export type BaziLuckState = {
  bazi: BaziChart | null;
  lucks: Luck[];
  year: FlowYear | null;
  /** The years the slider spans: the birth's to ninety-nine years later. */
  firstYear: number;
  lastYear: number;
  /** Today's pillar, its god and what it meets. */
  day: ReturnType<typeof flowDay> | null;
  enabled: boolean;
};

// The year stepped to (null: this year), for this tab only, as Chinese astrology's Cycles keeps its own.
let chosen: number | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
function setYear(year: number | null, first: number, last: number) {
  const now = flowYearOf(Date.now());
  const next = year == null || year === now ? null : Math.min(last, Math.max(first, Math.trunc(year)));
  if (next === chosen) return;
  chosen = next;
  for (const fn of listeners) fn();
}
const useSteppedYear = () =>
  useSyncExternalStore(
    subscribe,
    () => chosen,
    () => null,
  );

/** A meeting's tone, for its chip. */
const toneOf = (m: Meeting) => interactionTone(m.kind);

function Meets({ list, testId }: { list: Meeting[]; testId: string }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  if (!list.length) return <p className="ulune-bzl-none">{cnWord(locale, "bzlMeetsNone")}</p>;
  return (
    <ul className="ulune-bzl-meets" data-testid={testId}>
      {list.map((m, i) => (
        <li key={i} className="ulune-bzl-meet" data-tone={toneOf(m)}>
          {meetingShort(m, locale, prefs)}
        </li>
      ))}
    </ul>
  );
}

/** A pillar written small: its characters (or its name), coloured by the stem's and the branch's phases. */
function Pair({ cycle }: { cycle: number }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const pair = SIXTY[cycle]!;
  const stem = STEMS[pair.stem]!;
  const branch = BRANCHES[pair.branch]!;
  if (prefs.show === "full") {
    return (
      <span className="ulune-bzl-pair" lang={hanziLang(prefs.script)}>
        <span data-phase={stem.phase}>{stem[prefs.script]}</span>
        <span data-phase={branch.phase}>{branch[prefs.script]}</span>
      </span>
    );
  }
  return <span className="ulune-bzl-pair is-words">{chineseLabel(pair, locale, { ...prefs, show: prefs.show === "pinyin" ? "pinyin" : "names" }).pinyin ?? chineseLabel(pair, locale, prefs).name}</span>;
}

function Band({ luck, both, year }: { luck: Luck; both: boolean; year: FlowYear }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const tz = w.chart?.meta.timezone;
  const now = Date.now();
  const mid = (year.fromMs + year.toMs) / 2;
  const dir = cnWord(locale, luck.direction === "forward" ? "bzlForward" : "bzlBackward");
  return (
    <section className="ulune-bzl-sec" aria-label={`${cnWord(locale, "bzlBand")}${both ? ` · ${countWord(luck.count, locale)}` : ""}`} data-testid={`bazi-luck-band-${luck.count}`}>
      <p className="ulune-bzl-line" data-testid={`bazi-luck-start-${luck.count}`}>
        {both ? <b>{countWord(luck.count, locale)} · </b> : null}
        {cnWord(locale, "bzlFrom", { age: ageWords(luck.start, locale), date: dateIn(luck.startMs, locale, tz) })} · {dir}
      </p>
      <ol className="ulune-bzl-band">
        {luck.pillars.map((p) => {
          const ref = luckRef(luck.count, p.index);
          const isNow = now >= p.fromMs && now < p.toMs;
          const isYear = mid >= p.fromMs && mid < p.toMs;
          const god = chineseLabel(tenGodById(p.god), locale, { ...prefs, show: "names" }).name;
          return (
            <li key={p.index}>
              <button
                type="button"
                className={cn("ulune-bzl-block", w.selectedId === ref && "is-on", isYear && "is-year")}
                data-testid={`bazi-luck-${luck.count}-${p.index}`}
                data-now={isNow ? "1" : undefined}
                data-tension={p.meets.some((m) => toneOf(m) === "tension") ? "1" : undefined}
                aria-pressed={w.selectedId === ref}
                aria-label={`${cnWord(locale, "bzlInLuck")} ${p.index}, ${cnWord(locale, "bzlAges", { from: Math.floor(p.fromAge), to: Math.floor(p.toAge) })}: ${chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs).text}, ${god}`}
                onClick={() => w.choose(ref)}
                {...previewProps(ref)}
              >
                <span className="ulune-bzl-ages">{cnWord(locale, "bzlAges", { from: Math.floor(p.fromAge), to: Math.floor(p.toAge) })}</span>
                <span className="ulune-bzl-when">{new Date(p.fromMs).getUTCFullYear()}</span>
                <Pair cycle={p.pillar.cycle} />
                <span className="ulune-bzl-god">{god}</span>
                {isNow ? <span className="ulune-bzl-now">{cnWord(locale, "bzlNow")}</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function LuckFigure() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("bazi-luck");
  const tz = w.chart?.meta.timezone;
  const c = data?.bazi;
  const y = data?.year;
  if (!c || !y || !data) return null;
  const both = data.lucks.length > 1;
  const now = Date.now();
  const thisYear = flowYearOf(now);
  const birthMs = c.birthMs;
  const age = Math.floor(((y.fromMs + y.toMs) / 2 - birthMs) / (365.2425 * 86_400_000));
  const yearGod = chineseLabel(tenGodById(y.god), locale, { ...prefs, show: "names" }).name;
  const day = y.year === thisYear ? data.day : null;
  return (
    <div className="ulune-bzl" data-testid="bazi-luck" data-chart-pick>
      <header className="ulune-bzl-head">
        <h2 className="ulune-bzl-title">{cnWord(locale, "bzlTitle")}</h2>
        <button type="button" className="ulune-bz-how" data-testid="bazi-luck-how" aria-pressed={w.selectedId === LUCK_HOW_REF} onClick={() => w.choose(LUCK_HOW_REF)}>
          {cnWord(locale, "bzBalHow")}
        </button>
      </header>
      {both ? (
        <p className="ulune-bzl-note" data-testid="bazi-luck-both">
          {cnWord(locale, "bzlBothNote")}
        </p>
      ) : null}
      {data.lucks.map((l) => (
        <Band key={l.count} luck={l} both={both} year={y} />
      ))}

      <label className="ulune-bzl-slider">
        <span className="ulune-bzl-k">
          {cnWord(locale, "bzlSlider")} · <b data-testid="bazi-luck-slider-year">{y.year}</b> · {cnWord(locale, "bzlAgeAt", { n: Math.max(0, age) })}
        </span>
        <input
          type="range"
          min={data.firstYear}
          max={data.lastYear}
          step={1}
          value={y.year}
          data-testid="bazi-luck-slider"
          onChange={(e) => setYear(Number(e.target.value), data.firstYear, data.lastYear)}
        />
      </label>

      <section className="ulune-bzl-sec" aria-labelledby="bzl-year-h">
        <h2 id="bzl-year-h" className="ulune-zky-h">
          {cnWord(locale, "bzlYearHead", { year: y.year })}
        </h2>
        <button
          type="button"
          className={cn("ulune-bzl-card", w.selectedId === FLOW_YEAR_REF && "is-on")}
          data-testid="bazi-flow-year"
          aria-pressed={w.selectedId === FLOW_YEAR_REF}
          onClick={() => w.choose(FLOW_YEAR_REF)}
          {...previewProps(FLOW_YEAR_REF)}
        >
          <Pair cycle={y.pillar.cycle} />
          <span className="ulune-bzl-card-text">
            <span className="ulune-bzl-card-name">{chineseLabel(SIXTY[y.pillar.cycle]!, locale, { ...prefs, show: "names" }).name}</span>
            <span className="ulune-bzl-god" data-testid="bazi-flow-year-god">
              {yearGod}
            </span>
          </span>
        </button>
        <Meets list={y.meets} testId="bazi-flow-year-meets" />
        {y.luck.map((l) => (
          <p key={l.count} className="ulune-bzl-line" data-testid={`bazi-flow-year-luck-${l.count}`}>
            <b>
              {cnWord(locale, "bzlInLuck")}
              {both ? ` · ${countWord(l.count, locale)}` : ""}
            </b>{" "}
            {l.pillar ? chineseLabel(SIXTY[l.pillar.pillar.cycle]!, locale, prefs).text : cnWord(locale, "bzlBeforeLuck")}
            {l.meets.length ? ` · ${l.meets.map((m) => meetingShort(m, locale, prefs)).join(", ")}` : ""}
          </p>
        ))}
      </section>

      <section className="ulune-bzl-sec" aria-labelledby="bzl-months-h">
        <h2 id="bzl-months-h" className="ulune-zky-h">
          {cnWord(locale, "bzlMonthsHead")}
        </h2>
        <div className="ulune-bzl-months" data-testid="bazi-flow-months">
          {y.months.map((m) => {
            const ref = flowMonthRef(m.index);
            const isNow = now >= m.fromMs && now < m.toMs;
            return (
              <button
                key={m.index}
                type="button"
                className={cn("ulune-bzl-month", w.selectedId === ref && "is-on")}
                data-testid={`bazi-flow-month-${m.index}`}
                data-now={isNow ? "1" : undefined}
                data-tension={m.meets.some((x) => toneOf(x) === "tension") ? "1" : undefined}
                aria-pressed={w.selectedId === ref}
                onClick={() => w.choose(ref)}
                {...previewProps(ref)}
              >
                <span className="ulune-zky-k">{dateIn(m.fromMs, locale, tz, { day: "numeric", month: "short" })}</span>
                <Pair cycle={m.pillar.cycle} />
                <span className="ulune-bzl-god">{chineseLabel(tenGodById(m.god), locale, { ...prefs, show: "names" }).name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {day ? (
        <section className="ulune-bzl-sec" aria-labelledby="bzl-day-h">
          <h2 id="bzl-day-h" className="ulune-zky-h">
            {cnWord(locale, "bzlToday")}
          </h2>
          <button
            type="button"
            className={cn("ulune-bzl-card", w.selectedId === FLOW_DAY_REF && "is-on")}
            data-testid="bazi-flow-day"
            aria-pressed={w.selectedId === FLOW_DAY_REF}
            onClick={() => w.choose(FLOW_DAY_REF)}
          >
            <Pair cycle={day.pillar.cycle} />
            <span className="ulune-bzl-card-text">
              <span className="ulune-bzl-card-name">{chineseLabel(SIXTY[day.pillar.cycle]!, locale, { ...prefs, show: "names" }).name}</span>
              <span className="ulune-bzl-god">{chineseLabel(tenGodById(day.god), locale, { ...prefs, show: "names" }).name}</span>
            </span>
          </button>
        </section>
      ) : null}
    </div>
  );
}

/** The year shown, in the stage's toolbar: ‹ 2026 ›, the middle back to this year. */
function LuckControls() {
  const { locale } = useI18n();
  const data = useModeData("bazi-luck");
  const y = data?.year;
  if (!y || !data) return null;
  const now = flowYearOf(Date.now());
  return (
    <div className="ulune-zky-stepper">
      <button
        type="button"
        className="ulune-zky-step"
        data-testid="bazi-luck-prev"
        aria-label={cnWord(locale, "bzlYearPrev")}
        disabled={y.year <= data.firstYear}
        onClick={() => setYear(y.year - 1, data.firstYear, data.lastYear)}
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="ulune-zky-year-n"
        data-testid="bazi-luck-year"
        data-now={y.year === now ? "1" : undefined}
        aria-label={y.year === now ? String(y.year) : cnWord(locale, "bzlYearBack", { year: y.year })}
        title={y.year === now ? undefined : cnWord(locale, "bzlYearBack", { year: y.year })}
        onClick={() => setYear(null, data.firstYear, data.lastYear)}
      >
        {y.year}
      </button>
      <button
        type="button"
        className="ulune-zky-step"
        data-testid="bazi-luck-next"
        aria-label={cnWord(locale, "bzlYearNext")}
        disabled={y.year >= data.lastYear}
        onClick={() => setYear(y.year + 1, data.firstYear, data.lastYear)}
      >
        <ChevronRight className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function LuckHelloEmpty() {
  return <LoadingLines lines={4} />;
}

const loadTable = () => import("@/studio/tables/bazi-luck-table");
const BaziLuckTable = lazyNamed(loadTable, "BaziLuckTable");

function LuckData() {
  const data = useModeData("bazi-luck");
  const w = useWheelView();
  if (!data?.bazi || !data.year) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <BaziLuckTable lucks={data.lucks} year={data.year} name={w.chart?.meta.name ?? ""} tz={w.chart?.meta.timezone} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function useLuckRuntime(): ModeRuntime<BaziLuckState> {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const chart = useStudioStore((s) => s.chart);
  const count = useStudioStore((s) => s.input.chineseCount);
  const page = useStudioStore((s) => s.page);
  const selectedId = useStudioStore((s) => s.selectedId);
  const stepped = useSteppedYear();
  const enabled = page === "bazi-luck" && Boolean(chart);
  const bazi = useMemo(
    () =>
      enabled && chart
        ? baziChart(
            { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown },
            { clock: prefs.clock, dayBoundary: prefs.dayBoundary },
          )
        : null,
    [enabled, chart, prefs.clock, prefs.dayBoundary],
  );
  const lucks = useMemo(() => {
    if (!bazi) return [];
    const counts: LuckCount[] = count === "yang" || count === "yin" ? [count] : ["yang", "yin"];
    return counts.map((n) => luckPillars(bazi, n));
  }, [bazi, count]);
  const firstYear = bazi ? flowYearOf(bazi.birthMs) : 0;
  const lastYear = firstYear + 99;
  const yearN = stepped == null ? flowYearOf(Date.now()) : stepped;
  const shown = bazi ? Math.min(lastYear, Math.max(firstYear, yearN)) : yearN;
  const year = useMemo(() => (bazi ? flowYear(bazi, shown, lucks) : null), [bazi, shown, lucks]);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const day = useMemo(() => {
    if (!bazi) return null;
    const [yy, mm, dd] = todayKey.split("-").map(Number);
    return flowDay(bazi, dayCycleOf(yy!, mm!, dd!));
  }, [bazi, todayKey]);
  const reading = useMemo(() => {
    if (!bazi || !year) return null;
    const x: LuckContext = { c: bazi, lucks, year, day: year.year === flowYearOf(Date.now()) ? day : null, tz: chart?.meta.timezone };
    return luckReading(x, selectedId, locale, prefs) ?? luckReading(x, null, locale, prefs);
  }, [bazi, lucks, year, day, selectedId, locale, prefs, chart]);
  const data = useMemo(() => ({ bazi, lucks, year, firstYear, lastYear, day, enabled }), [bazi, lucks, year, firstYear, lastYear, day, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const baziLuckMode: ModeDef = {
  ...MODE_META["bazi-luck"],
  emptyText: (locale) => cnWord(locale, "bzlEmpty"),
  Controls: LuckControls,
  Figure: LuckFigure,
  HelloEmpty: LuckHelloEmpty,
  Data: LuckData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useLuckRuntime,
};
