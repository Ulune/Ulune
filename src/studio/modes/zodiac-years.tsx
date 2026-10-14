import { Suspense, useMemo, useRef, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimalGlyph } from "@/components/animal-glyph";
import { LoadingLines } from "@/components/loading-lines";
import { BRANCHES, SIXTY, STEMS, phaseWord } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { relationTone } from "@/lib/chinese/relations";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { animalOf, cnWord } from "@/lib/chinese/words";
import type { ZodiacChart } from "@/lib/chinese/zodiac";
import { PLACE_WORD } from "@/lib/chinese/zodiac-reading";
import { FIRST_YEAR, LAST_YEAR, yearAhead, yearAheadOf, type MeetKind, type YearAhead } from "@/lib/chinese/zodiac-time";
import { meetName, monthRef, yearRef, yearsReading } from "@/lib/chinese/zodiac-time-reading";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useZodiacOf } from "@/studio/modes/hooks/useZodiac";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useKeptScroll } from "@/studio/return-parts";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/zodiac-time.css";

/*
 * Chinese astrology's Cycles (languages plan, part 11: "the year ahead for
 * your animals: your own year (Ben Ming Nian), clashing or harming the
 * year's ruler (Tai Sui), the trine and harmony years, month by month after
 * each solar term"), at /chinese-astrology/cycles. The year the toolbar's
 * steps are on, from Lichun to Lichun: its pillar and animal, how each of
 * the reader's animals meets it, and its twelve solar months, each with its
 * animal and how it meets the year animal. Every row opens its reading; with
 * nothing chosen the dock reads the year. Worked out here; nothing is sent.
 */

export type ZodiacYearsState = {
  zodiac: ZodiacChart | null;
  ahead: YearAhead | null;
  enabled: boolean;
};

// The year stepped to (null: this year), for this tab only, as numerology's Cycles keeps its own.
let chosen: number | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
function setYear(year: number | null) {
  const now = yearAheadOf(Date.now());
  const next = year == null || year === now ? null : Math.min(LAST_YEAR, Math.max(FIRST_YEAR, Math.trunc(year)));
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

/** The tone of a way to meet: the same animal and the meetings warm, the tensions marked, nothing plain. */
function toneOf(kinds: readonly MeetKind[]): "same" | "meet" | "tension" | undefined {
  const k = kinds[0];
  if (!k) return undefined;
  return k === "same" ? "same" : relationTone(k);
}

function useDayFormat(opts: Intl.DateTimeFormatOptions) {
  const { locale } = useI18n();
  const tz = useStudioStore((s) => s.chart?.meta.timezone);
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: tz || "UTC", ...opts });
    return (ms: number) => fmt.format(new Date(ms)).replace(/\.$/, "");
  }, [locale, tz]); // eslint-disable-line react-hooks/exhaustive-deps
}

function YearsFigure() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("zodiac-years");
  const short = useDayFormat({ day: "numeric", month: "short" });
  const long = useDayFormat({ day: "numeric", month: "short", year: "numeric" });
  const y = data?.ahead;
  const z = data?.zodiac;
  // Its own scroll comes back where it was when the studio does (reorganisation R6; part 28).
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, "zodiac-years-scroll", Boolean(y && z));
  if (!y || !z) return null;
  const pair = chineseLabel(SIXTY[y.pillar.cycle]!, locale, prefs);
  const now = Date.now();
  const kind = (k: MeetKind) => chineseLabel(meetName(k, true), locale, prefs).name;
  return (
    <div ref={scroller} className="ulune-zky" data-testid="zodiac-years" data-chart-pick>
      <button
        type="button"
        className={cn("ulune-zky-year", w.selectedId === yearRef && "is-on")}
        data-testid="zodiac-year"
        data-phase={BRANCHES[y.pillar.branch]!.phase}
        aria-pressed={w.selectedId === yearRef}
        onClick={() => w.choose(yearRef)}
        {...previewProps(yearRef)}
      >
        <AnimalGlyph animal={y.pillar.branch} size={48} className="ulune-zky-year-glyph" />
        <span className="ulune-zky-year-text">
          <span className="ulune-zky-k">
            {y.year} · {long(y.fromMs)} – {long(y.toMs)}
          </span>
          <span className="ulune-zky-year-name">{pair.name}</span>
          {/* The card's colour is the branch's phase: in words too when the name says only the stem's (part 30). */}
          {STEMS[SIXTY[y.pillar.cycle]!.stem]!.phase !== BRANCHES[y.pillar.branch]!.phase ? (
            <span className="sr-only">, {phaseWord(BRANCHES[y.pillar.branch]!.phase, locale)}</span>
          ) : null}
          {pair.pinyin || pair.hanzi ? <span className="ulune-zky-py">{[pair.pinyin, pair.hanzi].filter(Boolean).join(" ")}</span> : null}
        </span>
      </button>

      <section className="ulune-zky-sec" aria-labelledby="zky-yours">
        <h2 id="zky-yours" className="ulune-zky-h">
          {cnWord(locale, "zkYearYours")}
        </h2>
        <ul className="ulune-zky-yours" data-testid="zodiac-year-yours">
          {y.yours.map((m) => (
            <li key={m.place} className="ulune-zky-mine" data-testid={`zodiac-year-${m.place}`} data-tone={toneOf(m.kinds)}>
              <span className="ulune-zky-k">{cnWord(locale, PLACE_WORD[m.place])}</span>
              <span className="ulune-zky-animal">
                <AnimalGlyph animal={m.branch} size={20} />
                {chineseLabel(BRANCHES[m.branch]!, locale, prefs).name}
              </span>
              <span className="ulune-zky-kinds">{m.kinds.length ? m.kinds.map(kind).join(", ") : cnWord(locale, "zkMeetNone")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ulune-zky-sec" aria-labelledby="zky-months">
        <h2 id="zky-months" className="ulune-zky-h">
          {cnWord(locale, "zkMonthsHead", { year: y.year })}
        </h2>
        <div className="ulune-zky-months" role="group" aria-label={cnWord(locale, "zkMonthsHead", { year: y.year })} data-testid="zodiac-months">
          {y.months.map((m) => {
            const ref = monthRef(m.index);
            const on = w.selectedId === ref;
            const mine = m.yours.find((p) => p.place === "year")!;
            const name = chineseLabel(BRANCHES[m.pillar.branch]!, locale, prefs).name;
            const isNow = now >= m.fromMs && now < m.toMs;
            return (
              <button
                key={m.index}
                type="button"
                className={cn("ulune-zky-month", on && "is-on")}
                data-testid={`zodiac-month-${m.index}`}
                data-now={isNow ? "1" : undefined}
                data-tone={toneOf(mine.kinds)}
                aria-pressed={on}
                aria-label={`${cnWord(locale, "zkNowMonth", { animal: animalOf(m.pillar.branch, locale) })}, ${long(m.fromMs)} – ${long(m.toMs)}${mine.kinds.length ? `: ${mine.kinds.map(kind).join(", ")}` : ""}`}
                onClick={() => w.choose(ref)}
                {...previewProps(ref)}
              >
                <span className="ulune-zky-k">{short(m.fromMs)}</span>
                <AnimalGlyph animal={m.pillar.branch} size={26} />
                <span className="ulune-zky-month-name">{name}</span>
                <span className="ulune-zky-month-kind">{mine.kinds.length ? kind(mine.kinds[0]!) : "·"}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** The year shown, in the stage's toolbar: ‹ 2026 ›, the middle back to this year. */
function YearsControls() {
  const { locale } = useI18n();
  const data = useModeData("zodiac-years");
  const y = data?.ahead;
  if (!y) return null;
  const now = yearAheadOf(Date.now());
  return (
    <div className="ulune-zky-stepper">
      <button
        type="button"
        className="ulune-zky-step"
        data-testid="zodiac-years-prev"
        aria-label={cnWord(locale, "zkYearPrev")}
        disabled={y.year <= FIRST_YEAR}
        onClick={() => setYear(y.year - 1)}
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="ulune-zky-year-n"
        data-testid="zodiac-years-year"
        data-now={y.year === now ? "1" : undefined}
        aria-label={y.year === now ? String(y.year) : cnWord(locale, "zkYearBack", { year: y.year })}
        title={y.year === now ? undefined : cnWord(locale, "zkYearBack", { year: y.year })}
        onClick={() => setYear(null)}
      >
        {y.year}
      </button>
      <button
        type="button"
        className="ulune-zky-step"
        data-testid="zodiac-years-next"
        aria-label={cnWord(locale, "zkYearNext")}
        disabled={y.year >= LAST_YEAR}
        onClick={() => setYear(y.year + 1)}
      >
        <ChevronRight className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function YearsHelloEmpty() {
  return <LoadingLines lines={4} />;
}

const loadTable = () => import("@/studio/tables/zodiac-years-table");
const ZodiacYearsTable = lazyNamed(loadTable, "ZodiacYearsTable");

/** The table view: the twelve months with their dates, pillars, animals and how each of your animals meets them. */
function YearsData() {
  const data = useModeData("zodiac-years");
  const w = useWheelView();
  if (!data?.ahead || !data.zodiac) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <ZodiacYearsTable y={data.ahead} name={w.chart?.meta.name ?? ""} tz={w.chart?.meta.timezone} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function useYearsRuntime(): ModeRuntime<ZodiacYearsState> {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const chart = useStudioStore((s) => s.chart);
  const page = useStudioStore((s) => s.page);
  const selectedId = useStudioStore((s) => s.selectedId);
  const stepped = useSteppedYear();
  const enabled = page === "zodiac-years" && Boolean(chart);
  const zodiac = useZodiacOf(chart, prefs, enabled);
  const year = stepped ?? yearAheadOf(Date.now());
  const ahead = useMemo(() => (zodiac ? yearAhead(zodiac, year) : null), [zodiac, year]);
  // With nothing chosen, the dock reads the year.
  const reading = useMemo(
    () =>
      zodiac && ahead
        ? (yearsReading(zodiac, ahead, selectedId, locale, prefs, chart?.meta.timezone) ?? yearsReading(zodiac, ahead, yearRef, locale, prefs, chart?.meta.timezone))
        : null,
    [zodiac, ahead, selectedId, locale, prefs, chart],
  );
  const data = useMemo(() => ({ zodiac, ahead, enabled }), [zodiac, ahead, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const zodiacYearsMode: ModeDef = {
  ...MODE_META["zodiac-years"],
  emptyText: (locale) => cnWord(locale, "zkEmpty"),
  Controls: YearsControls,
  Figure: YearsFigure,
  HelloEmpty: YearsHelloEmpty,
  Data: YearsData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useYearsRuntime,
};
