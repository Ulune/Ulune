import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Suspense, useMemo, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { LoadingLines } from "@/components/loading-lines";
import { TrigramBars, withTrigrams } from "@/components/trigram-mark";
import { loadCalendarPrefs, saveCalendarPrefs } from "@/lib/chart/calendar-prefs";
import { phaseWord } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { fscWord } from "@/lib/chinese/fsc-words";
import { DIRECTION_IDS, MANSIONS, directionById, fengShuiOf, trigramOfDirection, type DirectionId, type FengShui, type FsCount } from "@/lib/chinese/fengshui";
import { mountainById } from "@/lib/chinese/fengshui-home";
import { countLabel, directionName, mansionName } from "@/lib/chinese/fengshui-reading";
import { starOf } from "@/lib/chinese/fengshui-stars";
import { yearStarsAt, type YearStars } from "@/lib/chinese/fengshui-years";
import { afflictionName, afflictionPlace, yearLine } from "@/lib/chinese/fengshui-years-reading";
import {
  CYCLES_FIRST_YEAR,
  CYCLES_LAST_YEAR,
  CYCLE_AFFLICTIONS,
  directionsOfYear,
  personYear,
  starsOfMonth,
  stepMonth,
  type DirectionYear,
  type PersonDirection,
  type PersonYear,
} from "@/lib/chinese/fengshui-cycles";
import {
  FSC_MONTH_REF,
  FSC_YEAR_REF,
  bestLine,
  cyclesReading,
  directionAria,
  fscAffRef,
  fscDirRef,
  fscYouRef,
  monthFiveLine,
  monthLine,
  restLine,
  stateWord,
  type CyclesContext,
} from "@/lib/chinese/fengshui-cycles-reading";
import { STAR_FOR_YOU } from "@/lib/chinese/fengshui-cycles-texts";
import { said } from "@/lib/chinese/both";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { HowUluneCalculates, MethodNotes } from "@/studio/modes/chinese-notes";
import { useMethodNotes } from "@/studio/modes/hooks/useMethodNotes";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useKeptScroll } from "@/studio/return-parts";
import { useDomIds, useScoped, useScopedPage, useScopeId, useScopeKey } from "@/studio/scope";
import { useScopedDial, useScopedSetDial } from "@/studio/scope-time";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";
import "@/studio/modes/styles/zodiac.css";
import "@/studio/modes/styles/zodiac-time.css";
import "@/studio/modes/styles/first-read.css";
import "@/studio/modes/styles/fengshui.css";
import "@/studio/modes/styles/fengshui-cycles.css";

/*
 * Feng Shui's Cycles, your directions through the years (share and compare
 * plan, feature 5d, decision R4), at /feng-shui/cycles, Feng Shui's Cycles
 * lens (Alt+2). The year's and the month's flying stars (part 25's engine)
 * laid over the reader's eight directions, the Eight Mansions of their Kua
 * (part 21), on the Kua page's compass rose: each direction keeps its
 * trigram (drawn by Ulune), its letter and its mansion, and gains the year's
 * star in a disc and the month's in a small ring; the year's afflictions mark
 * the rim (the Grand Duke solid, the Year Breaker dashed, the Three Killings
 * dotted); a supportive direction the year strengthens is outlined, one it
 * asks to rest framed in dashes. Beside the rose, what the year makes of your
 * supportive and challenging directions, and the direction to face for new
 * starts; over it, the year and the month; under it, where the year asks for
 * quiet and a way to the Calendar's flying stars. A birth without a yin or
 * yang count shows both Kua, as the Kua page does.
 *
 * The year dial is the toolbar's (‹ 2026 ›), the month's in its card: one
 * time for every chart scope, so Compare's two panes read the same month
 * (this page is comparable: two people's directions under one year). The
 * year turns at Lichun and the month at its jie, as the stars do. Without a
 * birth chart the page shows the year alone, the same for everyone, and asks
 * for a chart for the rest (as the Home page does, FS13). Worked out here;
 * nothing is sent.
 */

export type FengShuiCyclesState = {
  /** What the page reads; null while the page is not shown. */
  ctx: CyclesContext | null;
  /** The dial is on the month we are in. */
  isNow: boolean;
  /** Today's solar year and month, for the dial's way back. */
  now: { year: number; month: number } | null;
  hasChart: boolean;
  enabled: boolean;
};

/* The dial: one solar year and month for every chart scope, this tab only (null: now). */
type Dial = { year: number; month: number } | null;
let dial: Dial = null;
const dialSubs = new Set<() => void>();
const dialSubscribe = (fn: () => void) => {
  dialSubs.add(fn);
  return () => {
    dialSubs.delete(fn);
  };
};

/** The month we are in, as the stars count it (Lichun's year, the jie's month). */
function nowMonth(): { year: number; month: number } {
  const y = yearStarsAt(Date.now());
  return { year: y.solarYear, month: y.monthIndex };
}

/** A solar year and month as the dial keeps them: within its years, null for the month we are in. */
function dialOf(next: Dial): Dial {
  const to: Dial = next ? { year: Math.min(CYCLES_LAST_YEAR, Math.max(CYCLES_FIRST_YEAR, Math.trunc(next.year))), month: next.month } : null;
  const now = nowMonth();
  return to && to.year === now.year && to.month === now.month ? null : to;
}

/** Another solar year and month on the dial (back to now when it is the month we are in), within the dial's years. */
export function setCyclesDial(next: Dial): void {
  const to = dialOf(next);
  if (to?.year === dial?.year && to?.month === dial?.month) return;
  dial = to;
  for (const fn of dialSubs) fn();
}

function useDial() {
  const shared = useSyncExternalStore(
    dialSubscribe,
    () => dial,
    () => null,
  );
  // A Compare pane with a moment of its own turns its own dial (Compare's two moments: studio/scope-time.ts).
  return useScopedDial(shared);
}

/** How this part turns the dial: the one every scope shares, or its Compare pane's own. */
const useSetDial = () => useScopedSetDial(setCyclesDial, dialOf);

/* The rose: the Kua page's geometry (fengshui.tsx), the words drawn a little nearer the hub to leave the rim to the stars. */
const C = 200;
const R_OUT = 190;
const R_IN = 64;
const R_WORDS = 118;
const R_STAR = 166;
/** The rim's marks: the Grand Duke's and the Year Breaker's mountains just outside the rose, the Three Killings' whole direction a step further out (both may stand in one direction). */
const R_RIM = 195;
const R_KILLINGS = 203;

const at = (angle: number, r: number) => {
  const a = (angle * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
};
const f = (n: number) => n.toFixed(2);

/** A wedge between two radii, `half` degrees either side of an angle (degrees clockwise from the top). */
function wedge(angle: number, r0: number, r1: number, half = 22.5): string {
  const a0 = at(angle - half, r1);
  const a1 = at(angle + half, r1);
  const b1 = at(angle + half, r0);
  const b0 = at(angle - half, r0);
  return `M ${f(a0.x)} ${f(a0.y)} A ${r1} ${r1} 0 0 1 ${f(a1.x)} ${f(a1.y)} L ${f(b1.x)} ${f(b1.y)} A ${r0} ${r0} 0 0 0 ${f(b0.x)} ${f(b0.y)} Z`;
}

/** An arc of the rim, from one angle to another. */
function arc(from: number, to: number, r: number): string {
  const a = at(from, r);
  const b = at(to, r);
  return `M ${f(a.x)} ${f(a.y)} A ${r} ${r} 0 0 1 ${f(b.x)} ${f(b.y)}`;
}

/** A star's colour word alone, under its number in the hub: "White", « Blanc ». */
const colourOf = (n: number, locale: string) => (locale === "fr" ? starOf(n).fr : starOf(n).en).replace(/^\d+\s/, "");

/** The year's stars over the eight directions: a person's (one count's Kua), or the year's alone. One Tab stop, the arrows walk round it. */
function CyclesRose({ ctx, person, both }: { ctx: CyclesContext; person: PersonYear | null; both: boolean }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const domId = useDomIds();
  const ring = useRef<SVGGElement>(null);
  const count: FsCount | null = person?.fs.count ?? null;
  const turn = prefs.compass === "south" ? 180 : 0;
  const rows: (DirectionYear | PersonDirection)[] = person ? person.directions : [...ctx.dirs];
  const chosen = DIRECTION_IDS.find((d) => w.selectedId === fscDirRef(count, d));
  const stop: DirectionId = chosen ?? person?.best ?? person?.fs.of["sheng-qi"] ?? "n";
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const el = (e.target as Element).closest<SVGGElement>("[data-dir]");
    if (!el) return;
    const i = DIRECTION_IDS.indexOf(el.dataset.dir as DirectionId);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % 8;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i + 7) % 8;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 7;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      w.pick(fscDirRef(count, DIRECTION_IDS[i]!));
      return;
    }
    if (next == null) return;
    e.preventDefault();
    ring.current?.querySelector<SVGGElement>(`[data-dir="${DIRECTION_IDS[next]}"]`)?.focus();
  };
  const hatch = domId(`ulune-fsc-hatch-${count ?? "sky"}`);
  const { y } = ctx;
  const label = `${fscWord(locale, person ? "fscRose" : "fscRoseSky")}${both && count ? ` · ${countLabel(count, locale)}` : ""} · ${y.solarYear}`;
  const a = y.afflictions;
  const rim = (deg: number) => (deg + turn) % 360;
  const taiSui = mountainById(a.taiSui);
  const breaker = mountainById(a.yearBreaker);
  const killings = directionById(a.threeKillings.direction);
  const yearOn = w.selectedId === FSC_YEAR_REF;
  return (
    <svg viewBox="-8 -8 416 416" className="ulune-fs-rose ulune-fsc-rose" role="group" aria-label={label} data-testid={`fengshui-cycles-rose-${count ?? "sky"}`} data-top={prefs.compass}>
      <defs>
        <pattern id={hatch} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" className="ulune-fs-hatch" />
        </pattern>
      </defs>
      <circle cx={C} cy={C} r={R_OUT} className="ulune-fs-rim" />
      <g ref={ring} onKeyDown={onKey}>
        {rows.map((x) => {
          const d = x.direction;
          const dir = directionById(d);
          const angle = (dir.degrees + turn) % 360;
          const ref = fscDirRef(count, d);
          const on = w.selectedId === ref;
          const tri = trigramOfDirection(d);
          const mid = at(angle, R_WORDS);
          const own = "mansion" in x ? x : null;
          const state = own?.state ?? (x.afflictions.length || x.year === 2 ? "rest" : "steady");
          const ys = at(angle, R_STAR);
          const ms = at(angle + 14, R_STAR - 4);
          return (
            <g
              key={d}
              data-dir={d}
              data-state={state}
              data-year-star={x.year}
              data-month-star={x.month}
              data-marks={x.afflictions.join(" ") || undefined}
              data-testid={`fengshui-cycles-wedge-${count ?? "sky"}-${d}`}
              className={cn("ulune-fs-wedge ulune-fsc-wedge", own ? (own.supportive ? "is-good" : "is-hard") : "is-sky", `is-${state}`, on && "is-on")}
              role="button"
              tabIndex={d === stop ? 0 : -1}
              aria-label={directionAria(x, locale, prefs, phaseWord(tri.phase, locale))}
              aria-pressed={on}
              onClick={() => w.choose(ref)}
              {...previewProps(ref)}
            >
              <path d={wedge(angle, R_IN, R_OUT)} className="ulune-fs-cell" style={own && !own.supportive ? { fill: `url(#${hatch})` } : undefined} />
              {state === "strengthened" ? <path d={wedge(angle, R_IN + 5, R_OUT - 5, 20.5)} className="ulune-fsc-strong" /> : null}
              {state === "rest" ? <path d={wedge(angle, R_IN + 6, R_OUT - 6, 20)} className="ulune-fsc-rest" /> : null}
              {/* The trigram drawn (FS7): a font may draw ☰…☷ tiny or as empty boxes. */}
              <TrigramBars lines={tri.lines} cx={mid.x} cy={mid.y - 22} w={17} className="ulune-fs-tri" data-phase={tri.phase} />
              <text x={f(mid.x)} y={f(mid.y)} className="ulune-fs-dir">
                {dir.short[locale === "fr" ? "fr" : "en"]}
              </text>
              {own ? (
                <text x={f(mid.x)} y={f(mid.y + 17)} className="ulune-fs-mansion">
                  {mansionName(own.mansion, locale)}
                </text>
              ) : null}
              <g className={cn("ulune-fsc-ystar", x.year === 5 && "is-five")}>
                <circle cx={f(ys.x)} cy={f(ys.y)} r={12.5} />
                <text x={f(ys.x)} y={f(ys.y)}>
                  {x.year}
                </text>
              </g>
              <g className={cn("ulune-fsc-mstar", x.monthFive && "is-five")}>
                <circle cx={f(ms.x)} cy={f(ms.y)} r={8} />
                <text x={f(ms.x)} y={f(ms.y)}>
                  {x.month}
                </text>
              </g>
            </g>
          );
        })}
      </g>
      {/* The year's afflictions on the rim, each its own stroke (its name is said by its direction's label and in the list beside). */}
      <g className="ulune-fsc-marks" aria-hidden>
        <path d={arc(rim(killings.degrees) - 21, rim(killings.degrees) + 21, R_KILLINGS)} className="ulune-fsc-arc is-killings" data-mark="three-killings" />
        <path d={arc(rim(breaker.degrees) - 6.5, rim(breaker.degrees) + 6.5, R_RIM)} className="ulune-fsc-arc is-breaker" data-mark="year-breaker" />
        <path d={arc(rim(taiSui.degrees) - 6.5, rim(taiSui.degrees) + 6.5, R_RIM)} className="ulune-fsc-arc is-taisui" data-mark="tai-sui" />
      </g>
      {/* The hub: the year's star in the centre; it opens the year (the year's card does the same by keyboard). */}
      <g className={cn("ulune-fs-centre ulune-fsc-centre", yearOn && "is-on")} onClick={() => w.choose(FSC_YEAR_REF)} aria-hidden data-testid={`fengshui-cycles-centre-${count ?? "sky"}`}>
        <circle cx={C} cy={C} r={R_IN - 6} />
        <text x={C} y={C - 27} className="ulune-fs-centre-sub">
          {y.solarYear}
        </text>
        <text x={C} y={C - 2} className="ulune-fs-centre-n">
          {y.year}
        </text>
        <text x={C} y={C + 26} className="ulune-fs-centre-tri">
          {colourOf(y.year, locale)}
        </text>
      </g>
    </svg>
  );
}

/** Under a rose: what its marks say. */
function RoseKey({ person }: { person: boolean }) {
  const { locale } = useI18n();
  return (
    <div className="ulune-fsc-legend" data-testid="fengshui-cycles-legend">
      <p>
        <span className="ulune-fsc-key-star" aria-hidden>
          1
        </span>
        <span className="ulune-fsc-key-month" aria-hidden>
          9
        </span>{" "}
        {fscWord(locale, "fscLegendStars")}
      </p>
      <p>{fscWord(locale, "fscLegendRim")}</p>
      <p>{fscWord(locale, person ? "fscLegendStates" : "fscLegendSky")}</p>
    </div>
  );
}

/** The year and the month on the dial: each opens its reading; the month has its own steps. */
function TimeCards({ data }: { data: FengShuiCyclesState & { ctx: CyclesContext } }) {
  const { locale } = useI18n();
  const w = useWheelView();
  const { y } = data.ctx;
  const setDial = useSetDial();
  const step = (by: number) => setDial(stepMonth(y.solarYear, y.monthIndex, by));
  const firstMonth = y.solarYear <= CYCLES_FIRST_YEAR && y.monthIndex === 0;
  const lastMonth = y.solarYear >= CYCLES_LAST_YEAR && y.monthIndex === 11;
  return (
    <div className="ulune-fsc-times">
      <button
        type="button"
        className={cn("ulune-fs-card", w.selectedId === FSC_YEAR_REF && "is-on")}
        data-testid="fengshui-cycles-year"
        aria-pressed={w.selectedId === FSC_YEAR_REF}
        onClick={() => w.choose(FSC_YEAR_REF)}
        {...previewProps(FSC_YEAR_REF)}
      >
        <span className="ulune-fs-h">{cnWord(locale, "fsyYearTitle", { year: y.solarYear })}</span>
        <span className="ulune-fs-card-line">{yearLine(y, locale)}</span>
      </button>
      <div className={cn("ulune-fs-card ulune-fsc-month", w.selectedId === FSC_MONTH_REF && "is-on")}>
        <div className="ulune-fsc-month-head">
          <span className="ulune-fs-h">{fscWord(locale, "fscMonthHead")}</span>
          {data.isNow ? <span className="ulune-fsc-now">{fscWord(locale, "fscNow")}</span> : null}
          <span className="ulune-fsc-month-steps">
            <button type="button" className="ulune-fsc-step" data-testid="fengshui-cycles-month-prev" aria-label={fscWord(locale, "fscMonthPrev")} title={fscWord(locale, "fscMonthPrev")} disabled={firstMonth} onClick={() => step(-1)}>
              <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
            {data.isNow ? null : (
              <button type="button" className="ulune-fsc-step is-back" data-testid="fengshui-cycles-month-now" onClick={() => setDial(null)}>
                {fscWord(locale, "fscMonthBack")}
              </button>
            )}
            <button type="button" className="ulune-fsc-step" data-testid="fengshui-cycles-month-next" aria-label={fscWord(locale, "fscMonthNext")} title={fscWord(locale, "fscMonthNext")} disabled={lastMonth} onClick={() => step(1)}>
              <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </span>
        </div>
        <button type="button" className="ulune-fsc-month-line" data-testid="fengshui-cycles-month" aria-pressed={w.selectedId === FSC_MONTH_REF} onClick={() => w.choose(FSC_MONTH_REF)} {...previewProps(FSC_MONTH_REF)}>
          {monthLine(y, locale)} {monthFiveLine(y, locale)}
        </button>
      </div>
    </div>
  );
}

/** One list beside the rose: a person's supportive or challenging directions, each with the year's star and what the year makes of it. */
function DirList({ person, good }: { person: PersonYear; good: boolean }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const domId = useDomIds();
  const count = person.fs.count;
  const h = domId(`fsc-${count}-${good ? "good" : "hard"}-h`);
  return (
    <section className={cn("ulune-fs-list", good ? "is-good" : "is-hard")} aria-labelledby={h}>
      <h3 id={h} className="ulune-fs-h">
        <span className="ulune-fs-swatch" aria-hidden /> {cnWord(locale, good ? "fsSupportiveHead" : "fsChallengingHead")}
      </h3>
      <ul>
        {person.byMansion
          .filter((x) => x.supportive === good)
          .map((x) => {
            const ref = fscDirRef(count, x.direction);
            return (
              <li key={x.mansion}>
                <button
                  type="button"
                  className={cn("ulune-fs-row ulune-fsc-row", w.selectedId === ref && "is-on")}
                  data-testid={`fengshui-cycles-dir-${count}-${x.direction}`}
                  data-state={x.state}
                  aria-pressed={w.selectedId === ref}
                  onClick={() => w.choose(ref)}
                  {...previewProps(ref)}
                >
                  <span className="ulune-fs-row-name">{chineseLabel(MANSIONS[x.mansion], locale, prefs).text}</span>
                  <span className="ulune-fsc-row-end">
                    <span className="ulune-fs-row-dir">{directionName(x.direction, locale)}</span>
                    <span className={cn("ulune-fsc-chip", x.year === 5 && "is-five")}>
                      <span className="sr-only">{fscWord(locale, "fscYearStarAria", { star: `${x.year}` })}</span>
                      <span aria-hidden>{x.year}</span>
                    </span>
                    <span className="ulune-fsc-state" data-state={x.state}>
                      {stateWord(x.state, locale)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

/** A person's year: the rose, and beside it what the year makes of their directions. */
function CountBlock({ ctx, person, both }: { ctx: CyclesContext; person: PersonYear; both: boolean }) {
  const { locale } = useI18n();
  const w = useWheelView();
  const count = person.fs.count;
  const ref = fscYouRef(count);
  return (
    <section className="ulune-fs-count" data-testid={`fengshui-cycles-count-${count}`} aria-label={both ? countLabel(count, locale) : undefined} data-best={person.best ?? ""} data-resting={person.resting.join(" ")}>
      {both ? <h2 className="ulune-fs-count-h">{countLabel(count, locale)}</h2> : null}
      <div className="ulune-fs-body">
        <div className="ulune-fsc-figure">
          <div className="ulune-fs-rose-box ulune-fsc-rose-box">
            <CyclesRose ctx={ctx} person={person} both={both} />
          </div>
          <RoseKey person />
        </div>
        <div className="ulune-fs-side">
          <button
            type="button"
            className={cn("ulune-fs-card", w.selectedId === ref && "is-on")}
            data-testid={`fengshui-cycles-you-${count}`}
            aria-pressed={w.selectedId === ref}
            onClick={() => w.choose(ref)}
            {...previewProps(ref)}
          >
            <span className="ulune-fs-h">
              {fscWord(locale, "fscYouHead")} · {cnWord(locale, "fsKuaN", { n: person.fs.kua })}
            </span>
            <span className="ulune-fs-card-line">{bestLine(person, locale)}</span>
            <span className="ulune-fs-card-note">{restLine(person, locale)}</span>
          </button>
          <DirList person={person} good />
          <DirList person={person} good={false} />
        </div>
      </div>
    </section>
  );
}

/** The birth form, asked for from the year alone: the cast brings the reader back here with their Kua (as the Home page's, FS13). */
const castFromCycles = () => useStudioStore.getState().startNew();

/** Without a chart: the year's rose alone, and what a chart would add. */
function SkyBlock({ ctx }: { ctx: CyclesContext }) {
  const { locale } = useI18n();
  const domId = useDomIds();
  return (
    <section className="ulune-fs-count" data-testid="fengshui-cycles-sky">
      <div className="ulune-fs-body">
        <div className="ulune-fsc-figure">
          <div className="ulune-fs-rose-box ulune-fsc-rose-box">
            <CyclesRose ctx={ctx} person={null} both={false} />
          </div>
          <RoseKey person={false} />
        </div>
        <div className="ulune-fs-side">
          <section className="ulune-fs-card ulune-fsc-invite" data-testid="fengshui-cycles-invite" aria-labelledby={domId("fsc-invite-h")}>
            <h2 id={domId("fsc-invite-h")} className="ulune-fs-h">
              {cnWord(locale, "fsRose")}
            </h2>
            <p className="ulune-fs-card-line">{fscWord(locale, "fscInvite")}</p>
            <button type="button" className="ulune-fsc-btn" data-testid="fengshui-cycles-cast" onClick={castFromCycles}>
              {cnWord(locale, "fshCastChart")}
            </button>
          </section>
        </div>
      </div>
    </section>
  );
}

/** Turns the Calendar's flying stars on and opens it: the month's star from each month's jie, the year's at Lichun. */
function openCalendarStars(setPage: (page: "timing") => void): void {
  const prefs = loadCalendarPrefs();
  if (prefs.layers.stars !== true) saveCalendarPrefs({ ...prefs, layers: { ...prefs.layers, stars: true } });
  setPage("timing");
}

/** Where the year asks for quiet, each opening its reading; the way to the Calendar's flying stars. */
function QuietCard({ ctx }: { ctx: CyclesContext }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const domId = useDomIds();
  const { setPage } = useStudioUrl({ hydrate: false });
  // The Calendar is the main page's: a Compare pane leaves the way there to the page under it.
  const main = useScopeId() === "main";
  const h = domId("fsc-quiet-h");
  const { y } = ctx;
  return (
    <section
      className="ulune-fs-card ulune-fsc-quiet"
      aria-labelledby={h}
      data-testid="fengshui-cycles-quiet"
      data-five={y.afflictions.fiveYellow}
      data-tai-sui={y.afflictions.taiSui}
      data-breaker={y.afflictions.yearBreaker}
      data-killings={y.afflictions.threeKillings.direction}
    >
      <h2 id={h} className="ulune-fs-h">
        {cnWord(locale, "fsyQuietHead")}
      </h2>
      <ul>
        {CYCLE_AFFLICTIONS.map((id) => {
          const ref = fscAffRef(id);
          return (
            <li key={id}>
              <button type="button" className={cn("ulune-fs-row", w.selectedId === ref && "is-on")} data-testid={`fengshui-cycles-aff-${id}`} aria-pressed={w.selectedId === ref} onClick={() => w.choose(ref)} {...previewProps(ref)}>
                <span className="ulune-fs-row-name">
                  <span className={`ulune-fsc-swatch is-${id}`} aria-hidden /> {afflictionName(id, locale, prefs)}
                </span>
                <span className="ulune-fs-row-dir">{afflictionPlace(y, id, locale, prefs)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {main ? (
        <button type="button" className="ulune-fsc-cal" data-testid="fengshui-cycles-calendar" title={fscWord(locale, "fscCalendarHint")} onClick={() => openCalendarStars(setPage)}>
          <CalendarDays className="size-4" strokeWidth={1.75} aria-hidden />
          <span>{fscWord(locale, "fscCalendar")}</span>
        </button>
      ) : null}
    </section>
  );
}

function CyclesFigure() {
  const { locale } = useI18n();
  const data = useModeData("fengshui-cycles");
  // Its own scroll comes back where it was when the studio does (reorganisation R6; part 28).
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, useScopeKey("fengshui-cycles-scroll"), Boolean(data?.ctx));
  if (!data?.ctx) return null;
  const ctx = data.ctx;
  const full = { ...data, ctx };
  const both = ctx.people.length > 1;
  return (
    <div
      ref={scroller}
      className="ulune-fs ulune-fsc"
      data-testid="fengshui-cycles"
      data-chart-pick
      data-year={ctx.y.solarYear}
      data-month={ctx.y.monthIndex}
      data-star={ctx.y.year}
      data-month-star={ctx.y.month}
      data-counts={ctx.people.length}
      data-now={data.isNow ? "1" : undefined}
    >
      <TimeCards data={full} />
      {both ? (
        <p className="ulune-fs-note" data-testid="fengshui-cycles-both-note">
          {cnWord(locale, "fsBothNote")}
        </p>
      ) : null}
      <div className="ulune-fs-counts" data-n={Math.max(1, ctx.people.length)}>
        {ctx.people.length ? ctx.people.map((p) => <CountBlock key={p.fs.count} ctx={ctx} person={p} both={both} />) : <SkyBlock ctx={ctx} />}
      </div>
      <QuietCard ctx={ctx} />
    </div>
  );
}

/** The year on the dial, in the stage's toolbar: ‹ 2026 ›, the middle back to now. */
function CyclesControls() {
  const { locale } = useI18n();
  const data = useModeData("fengshui-cycles");
  const setDial = useSetDial();
  const y = data?.ctx?.y;
  if (!y || !data.now) return null;
  const now = data.now;
  const toYear = (year: number) => setDial({ year, month: y.monthIndex });
  const thisYear = y.solarYear === now.year;
  return (
    <div className="ulune-zky-stepper" data-testid="fengshui-cycles-steps">
      <button type="button" className="ulune-zky-step" data-testid="fengshui-cycles-prev" aria-label={cnWord(locale, "zkYearPrev")} disabled={y.solarYear <= CYCLES_FIRST_YEAR} onClick={() => toYear(y.solarYear - 1)}>
        <ChevronLeft className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="ulune-zky-year-n"
        data-testid="fengshui-cycles-year-n"
        data-now={thisYear ? "1" : undefined}
        aria-label={thisYear ? String(y.solarYear) : cnWord(locale, "zkYearBack", { year: y.solarYear })}
        title={thisYear ? undefined : cnWord(locale, "zkYearBack", { year: y.solarYear })}
        onClick={() => setDial(null)}
      >
        {y.solarYear}
      </button>
      <button type="button" className="ulune-zky-step" data-testid="fengshui-cycles-next" aria-label={cnWord(locale, "zkYearNext")} disabled={y.solarYear >= CYCLES_LAST_YEAR} onClick={() => toYear(y.solarYear + 1)}>
        <ChevronRight className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

/**
 * The side panel with nothing chosen (the first read): the year, then for each count the direction the
 * year strengthens for new starts and those it asks to rest, then the month; without a chart, the year,
 * where its 5 Yellow falls and the month, with what a chart would add. First the notes the birth calls
 * for, last how Ulune calculates (part 29, chinese-notes.tsx).
 */
function CyclesHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("fengshui-cycles");
  const notes = useMethodNotes("fengshui-cycles", w.chart);
  const domId = useDomIds();
  const ctx = data?.ctx;
  if (!ctx) return null;
  const { y } = ctx;
  const both = ctx.people.length > 1;
  const colon = locale === "fr" ? "\u202f: " : ": ";
  type Step = { id: string; ref: string; label: string; value: string; text: string };
  const yearStep: Step = { id: "year", ref: FSC_YEAR_REF, label: cnWord(locale, "fsyYearTitle", { year: y.solarYear }), value: chineseLabel(starOf(y.year), locale, { ...prefs, show: "names" }).name, text: yearLine(y, locale) };
  const monthStep: Step = { id: "month", ref: FSC_MONTH_REF, label: fscWord(locale, "fscMonthHead"), value: chineseLabel(starOf(y.month), locale, { ...prefs, show: "names" }).name, text: monthLine(y, locale) };
  const own: Step[] = ctx.people.flatMap((p): Step[] => {
    const tag = both ? ` · ${countLabel(p.fs.count, locale)}` : "";
    const best = p.best;
    return [
      {
        id: `best-${p.fs.count}`,
        ref: best ? fscDirRef(p.fs.count, best) : fscYouRef(p.fs.count),
        label: `${fscWord(locale, "fscStepBest")}${tag}`,
        value: best ? `${directionName(best, locale)} · ${mansionName(p.directions.find((x) => x.direction === best)!.mansion, locale)}` : "",
        text: bestLine(p, locale),
      },
      {
        id: `rest-${p.fs.count}`,
        ref: fscYouRef(p.fs.count),
        label: `${fscWord(locale, "fscStepRest")}${tag}`,
        value: p.resting.length ? p.resting.map((d) => directionName(d, locale)).join(", ") : fscWord(locale, "fscNone"),
        text: restLine(p, locale),
      },
    ];
  });
  const fiveRef = fscAffRef("five-yellow");
  const steps: Step[] = ctx.people.length
    ? [yearStep, ...own, monthStep]
    : [yearStep, { id: "five", ref: fiveRef, label: afflictionName("five-yellow", locale, prefs), value: afflictionPlace(y, "five-yellow", locale, prefs), text: said(STAR_FOR_YOU[5], locale) }, monthStep];
  return (
    <section className="ulune-hd-first ulune-fs-first" data-testid="fengshui-cycles-hello" aria-labelledby={domId("ulune-fsc-first-title")}>
      <MethodNotes notes={notes} />
      <h3 id={domId("ulune-fsc-first-title")} className="ulune-kicker ulune-hd-first-title">
        {fscWord(locale, "fscFirstTitle")}
      </h3>
      <p className="ulune-zk-hello-p">{fscWord(locale, ctx.people.length ? "fscLead" : "fscLeadSky")}</p>
      <ol className="ulune-hd-steps">
        {steps.map((st, i) => (
          <li key={st.id}>
            <button
              type="button"
              data-testid={`fengshui-cycles-hello-${st.id}`}
              className={cn("ulune-hd-step", w.selectedId === st.ref && "is-on")}
              aria-label={`${i + 1}. ${st.label}${st.value ? `${colon}${st.value}` : ""}. ${st.text}`}
              onClick={() => w.pick(st.ref)}
              {...previewProps(st.ref)}
            >
              <span className="ulune-hd-step-n" aria-hidden>
                {i + 1}
              </span>
              <span className="ulune-hd-step-body">
                <span className="ulune-hd-step-head">
                  <span className="ulune-kicker ulune-hd-step-k">{st.label}</span>
                  {st.value ? <span className="ulune-hd-step-v">{withTrigrams(st.value)}</span> : null}
                </span>
                <span className="ulune-hd-step-text">{st.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      {both ? <p className="ulune-zk-hello-p">{cnWord(locale, "fsBothNote")}</p> : null}
      {ctx.people.length ? null : (
        <p className="ulune-zk-hello-p" data-testid="fengshui-cycles-hello-nochart">
          {fscWord(locale, "fscInvite")}{" "}
          <button type="button" className="ob-keep-link" data-testid="fengshui-cycles-hello-cast" onClick={castFromCycles}>
            {cnWord(locale, "fshCastChart")}
          </button>
        </p>
      )}
      <p className="ulune-zk-hello-note" data-testid="fengshui-cycles-compass-line">
        {cnWord(locale, "fsCompassLine", { top: cnWord(locale, prefs.compass === "south" ? "fsTopSouth" : "fsTopNorth") })}{" "}
        <Link to="/settings" hash="chinese" className="ob-keep-link" data-testid="fengshui-cycles-settings-link">
          {cnWord(locale, "zkSettingsLink")}
        </Link>
      </p>
      <HowUluneCalculates page="fengshui-cycles" />
    </section>
  );
}

const loadTable = () => import("@/studio/tables/fengshui-cycles-table");
const FengShuiCyclesTable = lazyNamed(loadTable, "FengShuiCyclesTable");

function CyclesData() {
  const data = useModeData("fengshui-cycles");
  const w = useWheelView();
  if (!data?.ctx) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <FengShuiCyclesTable ctx={data.ctx} name={w.chart?.meta.name ?? ""} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

/** A cast chart's Kua for the count its birth gives, or for both counts (as the Kua page). */
function kuaList(chart: { meta: { utc: string; date: string; time: string; longitude: number; timeUnknown?: boolean } } | null, count: unknown): FengShui[] {
  if (!chart) return [];
  const birth = { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown };
  const counts: FsCount[] = count === "yang" || count === "yin" ? [count] : ["yang", "yin"];
  return counts.map((n) => fengShuiOf(birth, n)).filter((x): x is FengShui => Boolean(x));
}

function useCyclesRuntime(): ModeRuntime<FengShuiCyclesState> {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const chart = useScoped((s) => s.chart);
  const page = useScopedPage();
  const selectedId = useScoped((s) => s.selectedId);
  const count = useScoped((s) => s.input.chineseCount);
  const chosen = useDial();
  // The year alone needs no birth chart (as the Home page, FS13); the Kua part waits for one.
  const enabled = page === "fengshui-cycles";
  // Now, read once a day (a page left open past midnight follows), as the Home page's year card.
  const todayKey = new Date().toDateString();
  const now = useMemo(() => (enabled ? nowMonth() : null), [enabled, todayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const y = useMemo<YearStars | null>(() => (!enabled || !now ? null : starsOfMonth(chosen?.year ?? now.year, chosen?.month ?? now.month)), [enabled, chosen, now]);
  const dirs = useMemo(() => (y ? directionsOfYear(y) : []), [y]);
  const list = useMemo(() => (enabled ? kuaList(chart, count) : []), [enabled, chart, count]);
  const people = useMemo(() => (y ? list.map((fs) => personYear(fs, y, dirs)) : []), [list, y, dirs]);
  const ctx = useMemo<CyclesContext | null>(() => (y ? { y, dirs, people } : null), [y, dirs, people]);
  const reading = useMemo(() => (enabled ? cyclesReading(ctx, selectedId, locale, prefs) : null), [enabled, ctx, selectedId, locale, prefs]);
  const data = useMemo<FengShuiCyclesState>(() => ({ ctx, isNow: chosen == null, now, hasChart: Boolean(chart), enabled }), [ctx, chosen, now, chart, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const fengShuiCyclesMode: ModeDef = {
  ...MODE_META["fengshui-cycles"],
  emptyText: (locale) => cnWord(locale, "fsEmpty"),
  // The birth form asked for from the year alone: what the cast adds, and the way back (as the Home page's, FS13).
  formFrom: (locale) => ({ line: fscWord(locale, "fscFormLine"), back: fscWord(locale, "fscFormBack") }),
  Controls: CyclesControls,
  Figure: CyclesFigure,
  HelloEmpty: CyclesHello,
  Data: CyclesData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useCyclesRuntime,
};
