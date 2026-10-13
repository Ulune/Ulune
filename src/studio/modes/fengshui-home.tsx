import { Suspense, useEffect, useId, useMemo, useState } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { fengShuiOf, type FengShui, type FsCount } from "@/lib/chinese/fengshui";
import { SPREAD_WARN, averageBearing, homeOf, periodOf } from "@/lib/chinese/fengshui-home";
import {
  FSH_FACING_REF,
  FSH_HOW_REF,
  FSH_PERIOD_REF,
  edgeLine,
  facingLine,
  fmtDecl,
  fmtDeg,
  fshHouseRef,
  homeReading,
  homeStars,
  houseLine,
  howLines,
  matchLines,
  mountainCode,
  periodLines,
  type HomeContext,
} from "@/lib/chinese/fengshui-home-reading";
import { countLabel } from "@/lib/chinese/fengshui-reading";
import type { FlyingChart } from "@/lib/chinese/fengshui-stars";
import { chartName, formationName, fssChartRef, fssFormationRef, type ChartVariant } from "@/lib/chinese/fengshui-stars-reading";
import { declination, decimalYear } from "@/lib/chinese/geomag";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioStore } from "@/studio/store";
import { compassSupported, useCompass } from "@/studio/modes/hooks/useCompass";
import { parseFacing, parseYear, useHomeInput } from "@/studio/modes/fengshui-home-state";
import { FigurePane } from "@/studio/modes/fengshui-home-figures";
import "@/studio/modes/styles/zodiac.css";
import "@/studio/modes/styles/first-read.css";
import "@/studio/modes/styles/fengshui.css";
import "@/studio/modes/styles/fengshui-home.css";

/*
 * Feng Shui, the home (languages plan, part 22: "the phone compass and the
 * facing input"), at /feng-shui/home, Feng Shui's Home lens. The facing,
 * typed from a compass or a map (a map's true bearing turned magnetic by the
 * declination at the chart's place), or read with the phone's compass: three
 * readings, their average and spread, a calibration hint, a reminder to
 * stand away from metal. A dial of the 24 mountains shows the facing and the
 * sitting (north or south at the top, as the rose); the cards say the
 * mountain, how near its edge the facing stands, the house's trigram and
 * group beside the reader's Kua, and the period from the year it was built.
 * Everything is worked out here; the compass is read only on request, only
 * while this page is open, and nothing is sent or kept beyond this visit.
 */

export type FengShuiHomeState = { ctx: HomeContext; enabled: boolean };

/** The phone's compass: start, heading, three readings, their average. Only where a finger is the pointer. */
function CompassBlock({ compass }: { compass: ReturnType<typeof useCompass> }) {
  const { locale } = useI18n();
  const readings = useHomeInput((s) => s.readings);
  const addReading = useHomeInput((s) => s.addReading);
  const clearReadings = useHomeInput((s) => s.clearReadings);
  const setTyped = useHomeInput((s) => s.setTyped);
  const avg = readings.length === 3 ? averageBearing(readings) : null;
  const { state, heading, accuracy } = compass;
  if (state === "idle" || state === "denied" || state === "none") {
    return (
      <div className="ulune-fsh-compass" data-testid="fengshui-home-compass" data-state={state}>
        <button type="button" className="ulune-fsh-btn is-main" data-testid="fengshui-home-compass-start" onClick={() => void compass.start()}>
          {cnWord(locale, "fshUseCompass")}
        </button>
        <p className="ulune-fsh-small">{cnWord(locale, state === "denied" ? "fshCompassDenied" : state === "none" ? "fshCompassNone" : "fshCompassAsk")}</p>
      </div>
    );
  }
  return (
    <div className="ulune-fsh-compass" data-testid="fengshui-home-compass" data-state={state}>
      <p className="ulune-fsh-heading" aria-live="polite">
        <span className="ulune-fs-h">{cnWord(locale, "fshHeading")}</span>{" "}
        <b data-testid="fengshui-home-heading">{heading == null ? cnWord(locale, "fshCompassWait") : fmtDeg(Math.round(heading), locale, 0)}</b>
      </p>
      {accuracy != null && accuracy > 15 ? <p className="ulune-fsh-small is-warn">{cnWord(locale, "fshCalibrate")}</p> : null}
      <p className="ulune-fsh-small">{cnWord(locale, "fshStep2")}</p>
      {readings.length < 3 ? (
        <button type="button" className="ulune-fsh-btn is-main" data-testid="fengshui-home-take" disabled={heading == null} onClick={() => heading != null && addReading(Math.round(heading * 10) / 10)}>
          {cnWord(locale, "fshTake", { n: readings.length + 1 })}
        </button>
      ) : null}
      {readings.length ? (
        <p className="ulune-fsh-small" data-testid="fengshui-home-readings">
          {cnWord(locale, "fshReadings", { list: readings.map((r) => fmtDeg(r, locale)).join(", ") })}
        </p>
      ) : null}
      {avg ? (
        <>
          <p className="ulune-fsh-avg" data-testid="fengshui-home-average">
            {cnWord(locale, "fshAverage", { deg: fmtDeg(avg.mean, locale), spread: fmtDeg(avg.spread, locale) })}
          </p>
          {avg.spread > SPREAD_WARN ? <p className="ulune-fsh-small is-warn">{cnWord(locale, "fshSpreadWarn")}</p> : null}
          <div className="ulune-fsh-row">
            <button
              type="button"
              className="ulune-fsh-btn is-main"
              data-testid="fengshui-home-use"
              onClick={() => {
                setTyped(String(Math.round(avg.mean * 10) / 10), "phone");
                clearReadings();
                compass.stop();
              }}
            >
              {cnWord(locale, "fshUseAverage")}
            </button>
            <button type="button" className="ulune-fsh-btn" onClick={clearReadings}>
              {cnWord(locale, "fshAgain")}
            </button>
          </div>
        </>
      ) : null}
      <p className="ulune-fsh-small">{cnWord(locale, "fshCheck")}</p>
      <button type="button" className="ulune-fsh-btn" data-testid="fengshui-home-compass-stop" onClick={compass.stop}>
        {cnWord(locale, "fshCompassStop")}
      </button>
    </div>
  );
}

function useCoarse(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const on = () => setCoarse(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return coarse;
}

function HomeForm({ compass }: { compass: ReturnType<typeof useCompass> }) {
  const { locale } = useI18n();
  const data = useModeData("fengshui-home");
  const typed = useHomeInput((s) => s.typed);
  const source = useHomeInput((s) => s.source);
  const year = useHomeInput((s) => s.year);
  const setTyped = useHomeInput((s) => s.setTyped);
  const setSource = useHomeInput((s) => s.setSource);
  const setYear = useHomeInput((s) => s.setYear);
  const coarse = useCoarse();
  const id = useId();
  const badFacing = typed.trim() !== "" && parseFacing(typed) == null;
  const badYear = year.trim() !== "" && parseYear(year) == null;
  const ctx = data?.ctx;
  return (
    <section className="ulune-fsh-form" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="ulune-fs-h">
        {cnWord(locale, "fshFormHead")}
      </h2>
      <label className="ulune-fsh-field" htmlFor={`${id}-deg`}>
        <span className="ulune-fsh-label">{cnWord(locale, "fshFacingLabel")}</span>
        <span className="ulune-fsh-input">
          <input
            id={`${id}-deg`}
            data-testid="fengshui-home-facing"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={typed}
            aria-invalid={badFacing || undefined}
            aria-describedby={`${id}-deg-hint`}
            onChange={(e) => setTyped(e.target.value)}
          />
          <span aria-hidden>°</span>
        </span>
        <span id={`${id}-deg-hint`} className={cn("ulune-fsh-small", badFacing && "is-warn")}>
          {cnWord(locale, badFacing ? "fshFacingInvalid" : "fshFacingHint")}
        </span>
      </label>
      <fieldset className="ulune-fsh-source">
        <legend className="ulune-fsh-label">{cnWord(locale, "fshSourceLabel")}</legend>
        {(["compass", "map"] as const).map((s) => (
          <label key={s} className="ulune-fsh-radio">
            <input type="radio" name={`${id}-src`} value={s} data-testid={`fengshui-home-source-${s}`} checked={s === "compass" ? source !== "map" : source === "map"} onChange={() => setSource(s)} />
            <span>{cnWord(locale, s === "compass" ? "fshSourceCompass" : "fshSourceMap")}</span>
          </label>
        ))}
      </fieldset>
      {source === "map" ? <p className="ulune-fsh-small">{cnWord(locale, "fshSourceMapHint")}</p> : null}
      {ctx?.declination != null ? (
        <p className="ulune-fsh-small" data-testid="fengshui-home-declination">
          {cnWord(locale, "fshDecl", { place: ctx.place, deg: fmtDecl(ctx.declination, locale) })}
        </p>
      ) : null}
      {coarse && compassSupported() ? <CompassBlock compass={compass} /> : null}
      <label className="ulune-fsh-field" htmlFor={`${id}-year`}>
        <span className="ulune-fsh-label">{cnWord(locale, "fshYear")}</span>
        <span className="ulune-fsh-input is-year">
          <input
            id={`${id}-year`}
            data-testid="fengshui-home-year"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={year}
            aria-invalid={badYear || undefined}
            aria-describedby={`${id}-year-hint`}
            onChange={(e) => setYear(e.target.value)}
          />
        </span>
        <span id={`${id}-year-hint`} className={cn("ulune-fsh-small", badYear && "is-warn")}>
          {cnWord(locale, badYear ? "fshYearInvalid" : "fshYearHint")}
        </span>
      </label>
    </section>
  );
}

function Card({ refId, testId, title, lines, tone }: { refId: string; testId: string; title: string; lines: string[]; tone?: "warn" }) {
  const w = useWheelView();
  return (
    <button
      type="button"
      className={cn("ulune-fs-card", w.selectedId === refId && "is-on", tone === "warn" && "is-warn")}
      data-testid={testId}
      aria-pressed={w.selectedId === refId}
      onClick={() => w.choose(refId)}
      {...previewProps(refId)}
    >
      <span className="ulune-fs-h">{title}</span>
      {lines.map((l, i) => (
        <span key={i} className="ulune-fs-card-line">
          {l}
        </span>
      ))}
    </button>
  );
}

function HomeCards() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const data = useModeData("fengshui-home");
  const ctx = data?.ctx;
  if (!ctx) return null;
  const home = ctx.home;
  return (
    <div className="ulune-fsh-cards">
      {home ? (
        <>
          <Card refId={FSH_FACING_REF} testId="fengshui-home-facing-card" title={cnWord(locale, "fshFacingHead")} lines={[facingLine(home, locale, prefs), edgeLine(home, locale, prefs)]} tone={home.edge.level === "clear" ? undefined : "warn"} />
          {ctx.people.map((fs) => (
            <Card
              key={fs.count}
              refId={fshHouseRef(fs.count)}
              testId={`fengshui-home-house-${fs.count}`}
              title={`${cnWord(locale, "fshHouseHead")}${ctx.people.length > 1 ? ` · ${countLabel(fs.count, locale)}` : ""}`}
              lines={[houseLine(home, locale, prefs), ...matchLines(home, fs, locale)]}
            />
          ))}
        </>
      ) : (
        <p className="ulune-fs-note" data-testid="fengshui-home-none">
          {cnWord(locale, "fshNoFacing")}
        </p>
      )}
      <Card refId={FSH_PERIOD_REF} testId="fengshui-home-period" title={cnWord(locale, "fshPeriodHead")} lines={periodLines(ctx, locale)} />
      {home ? <StarsCard /> : null}
    </div>
  );
}

function StarsCard() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("fengshui-home");
  const stars = data?.ctx.stars;
  if (!stars) {
    return (
      <section className="ulune-fsh-form ulune-fss" data-testid="fengshui-stars-none">
        <h2 className="ulune-fs-h">{cnWord(locale, "fssHead")}</h2>
        <p className="ulune-fsh-small">{cnWord(locale, "fssNeedYear")}</p>
      </section>
    );
  }
  const charts = ([["main", stars.main], ["ti", stars.ti]] as const).filter((x): x is readonly [ChartVariant, FlyingChart] => Boolean(x[1]));
  return (
    <section className="ulune-fsh-form ulune-fss" data-testid="fengshui-stars" aria-labelledby="fss-h">
      <h2 id="fss-h" className="ulune-fs-h">
        {cnWord(locale, "fssHead")}
      </h2>
      {stars.ti ? <p className="ulune-fsh-small is-warn">{cnWord(locale, "fssTiNote")}</p> : null}
      <div className={cn("ulune-fss-charts", charts.length > 1 && "is-two")}>
        {charts.map(([v, c]) => (
          <div key={v} className="ulune-fss-chart" data-testid={`fengshui-stars-chart-${v}`}>
            <button type="button" className={cn("ulune-fss-name", w.selectedId === fssChartRef(v) && "is-on")} data-testid={`fengshui-stars-name-${v}`} onClick={() => w.choose(fssChartRef(v))} {...previewProps(fssChartRef(v))}>
              {charts.length > 1 ? <span className="ulune-fs-h">{cnWord(locale, v === "ti" ? "fssTi" : "fssMain")}</span> : null}
              <span>{chartName(c, locale, prefs)}</span>
            </button>
            <ul className="ulune-fss-forms">
              {c.formations.length ? (
                c.formations.map((f) => (
                  <li key={f}>
                    <button type="button" className={cn("ulune-fs-row", w.selectedId === fssFormationRef(f) && "is-on")} data-testid={`fengshui-stars-formation-${v}-${f}`} onClick={() => w.choose(fssFormationRef(f))} {...previewProps(fssFormationRef(f))}>
                      <span className="ulune-fs-row-name">{formationName(f, locale, prefs)}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="ulune-fsh-small">{cnWord(locale, "fssNoFormation")}</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeFigure() {
  const data = useModeData("fengshui-home");
  const compass = useCompass();
  if (!data?.enabled) return null;
  return (
    <div className="ulune-fs ulune-fsh" data-testid="fengshui-home" data-chart-pick>
      <div className="ulune-fsh-body">
        <FigurePane live={compass.state === "live" ? compass.heading : null} />
        <div className="ulune-fs-side">
          <HomeForm compass={compass} />
          <HomeCards />
        </div>
      </div>
    </div>
  );
}

/** The side panel with nothing chosen: how to find the facing, then what it says. */
function HomeHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("fengshui-home");
  const ctx = data?.ctx;
  if (!ctx) return null;
  type Step = { id: string; ref: string; label: string; value: string; text: string };
  const home = ctx.home;
  const steps: Step[] = home
    ? [
        { id: "facing", ref: FSH_FACING_REF, label: cnWord(locale, "fshFacingHead"), value: `${fmtDeg(home.facing.degrees, locale)} · ${mountainCode(home.facingMountain, locale)}`, text: facingLine(home, locale, prefs) },
        { id: "edge", ref: FSH_FACING_REF, label: cnWord(locale, "fshMountainsHead"), value: "", text: edgeLine(home, locale, prefs) },
        ...ctx.people.map((fs) => ({
          id: `house-${fs.count}`,
          ref: fshHouseRef(fs.count),
          label: `${cnWord(locale, "fshHouseHead")}${ctx.people.length > 1 ? ` · ${countLabel(fs.count, locale)}` : ""}`,
          value: `${home.house.symbol} ${chineseLabel(home.house, locale, { ...prefs, show: "names" }).name}`,
          text: matchLines(home, fs, locale)[0]!,
        })),
        { id: "period", ref: FSH_PERIOD_REF, label: cnWord(locale, "fshPeriodHead"), value: ctx.period ? cnWord(locale, "fshPeriodN", { n: ctx.period.period }) : "", text: periodLines(ctx, locale)[0]! },
        ...(ctx.stars
          ? [
              {
                id: "stars",
                ref: fssChartRef("main"),
                label: cnWord(locale, "fssHead"),
                value: ctx.stars.main.formations.map((f) => formationName(f, locale, { ...prefs, show: "names" })).join(" · "),
                text: chartName(ctx.stars.main, locale, prefs),
              },
            ]
          : []),
      ]
    : howLines(locale).map((text, i) => ({ id: `how-${i + 1}`, ref: FSH_HOW_REF, label: cnWord(locale, "fshHowHead"), value: "", text }));
  return (
    <section className="ulune-hd-first ulune-fs-first" data-testid="fengshui-home-hello" aria-labelledby="ulune-fsh-first-title">
      <h3 id="ulune-fsh-first-title" className="ulune-kicker ulune-hd-first-title">
        {cnWord(locale, "fshFirstTitle")}
      </h3>
      <p className="ulune-zk-hello-p">{cnWord(locale, "fshLead")}</p>
      <ol className="ulune-hd-steps">
        {steps.map((st, i) => (
          <li key={st.id}>
            <button
              type="button"
              data-testid={`fengshui-home-hello-${st.id}`}
              className={cn("ulune-hd-step", w.selectedId === st.ref && "is-on")}
              aria-label={`${i + 1}. ${st.label}${st.value ? `: ${st.value}` : ""}. ${st.text}`}
              onClick={() => w.pick(st.ref)}
              {...previewProps(st.ref)}
            >
              <span className="ulune-hd-step-n" aria-hidden>
                {i + 1}
              </span>
              <span className="ulune-hd-step-body">
                <span className="ulune-hd-step-head">
                  <span className="ulune-kicker ulune-hd-step-k">{st.label}</span>
                  {st.value ? <span className="ulune-hd-step-v">{st.value}</span> : null}
                </span>
                <span className="ulune-hd-step-text">{st.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="ulune-zk-hello-note">{cnWord(locale, "fshAbout2")}</p>
    </section>
  );
}

const loadTable = () => import("@/studio/tables/fengshui-home-table");
const FengShuiHomeTable = lazyNamed(loadTable, "FengShuiHomeTable");

function HomeData() {
  const data = useModeData("fengshui-home");
  const w = useWheelView();
  if (!data?.enabled) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <FengShuiHomeTable ctx={data.ctx} name={w.chart?.meta.name ?? ""} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function useHomeRuntime(): ModeRuntime<FengShuiHomeState> {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const chart = useStudioStore((s) => s.chart);
  const page = useStudioStore((s) => s.page);
  const selectedId = useStudioStore((s) => s.selectedId);
  const count = useStudioStore((s) => s.input.chineseCount);
  const typed = useHomeInput((s) => s.typed);
  const source = useHomeInput((s) => s.source);
  const yearTyped = useHomeInput((s) => s.year);
  const enabled = page === "fengshui-home" && Boolean(chart);
  const people = useMemo(() => {
    if (!enabled || !chart) return [];
    const birth = { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown };
    const counts: FsCount[] = count === "yang" || count === "yin" ? [count] : ["yang", "yin"];
    return counts.map((n) => fengShuiOf(birth, n)).filter((x): x is FengShui => Boolean(x));
  }, [enabled, chart, count]);
  const decl = useMemo(() => {
    if (!chart || !Number.isFinite(chart.meta.latitude) || !Number.isFinite(chart.meta.longitude)) return null;
    return declination(chart.meta.latitude, chart.meta.longitude, decimalYear(Date.now()));
  }, [chart]);
  const ctx = useMemo<HomeContext>(() => {
    const deg = parseFacing(typed);
    const y = parseYear(yearTyped);
    const home = deg == null ? null : homeOf(deg, source, decl);
    const period = y == null ? null : { year: y, ...periodOf(y) };
    return {
      home,
      period,
      people,
      place: chart?.meta.placeLabel?.split(",")[0]?.trim() || "—",
      declination: decl,
      stars: homeStars(home, period, new Date().getFullYear()),
    };
  }, [typed, source, yearTyped, people, decl, chart]);
  const reading = useMemo(() => (enabled ? homeReading(ctx, selectedId, locale, prefs) : null), [enabled, ctx, selectedId, locale, prefs]);
  const data = useMemo(() => ({ ctx, enabled }), [ctx, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const fengShuiHomeMode: ModeDef = {
  ...MODE_META["fengshui-home"],
  emptyText: (locale) => cnWord(locale, "fshEmpty"),
  Figure: HomeFigure,
  HelloEmpty: HomeHello,
  Data: HomeData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useHomeRuntime,
};
