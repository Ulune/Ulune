import { Suspense, useMemo } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { chartNameOf } from "@/lib/chart/library";
import { personalMonthOf } from "@/lib/chart/numerology-cycles";
import { focusField } from "@/lib/focus-field";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { numerologyNoNatal, numerologyPageText as p } from "@/lib/i18n/numerology-ui";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useNumerology } from "@/studio/modes/hooks/useNumerology";
import { MODE_META } from "@/studio/modes/meta";
import type { NumerologyState } from "@/studio/modes/numerology";
import { NumerologyYearStepper, NumerologyYearSteps } from "@/studio/modes/numerology-controls";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioStore } from "@/studio/store";
import { NumerologyLifeLine } from "@/studio/tables/numerology-life";
import "@/studio/modes/styles/num.css";

/*
 * Numerology's Cycles (page reorganisation plan, from R3: numerology's Time
 * lens, at /numerology/cycles): the year the toolbar's steps are on, with its
 * personal year and the long cycles running then; its twelve personal months
 * (and today's personal day in the year we are in); the whole life's
 * pinnacles, challenges and periods to scale. Every number opens its reading;
 * with nothing chosen the dock reads the year. The Table view holds the same
 * as the numerology table's Cycles and Years parts.
 */

const loadTable = () => import("@/studio/tables/numerology-table");
const NumerologyTable = lazyNamed(loadTable, "NumerologyTable");
const TABLE_PARTS = ["cycles", "years"] as const;

function CyclesFigure() {
  const { locale } = useI18n();
  const w = useWheelView();
  const numerology = useModeData("numerology-cycles");
  const numbers = numerology?.numbers ?? null;
  const year = numbers?.calendarYear ?? 0;
  const py = numbers?.personalYear.number ?? null;
  const months = useMemo(() => {
    if (py == null) return [];
    const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", month: "short" });
    const long = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", month: "long", year: "numeric" });
    return Array.from({ length: 12 }, (_, i) => {
      const at = new Date(Date.UTC(year, i, 1));
      return { m: i + 1, short: fmt.format(at).replace(/\.$/, ""), long: long.format(at), value: personalMonthOf(py, i + 1) };
    });
  }, [py, year, locale]);
  if (!numbers || numbers.lifePath.number == null) return null;
  const today = new Date();
  const isNow = year === today.getFullYear();
  const nowMonth = today.getMonth() + 1;
  return (
    <div className="ulune-numc" data-testid="num-cycles" data-chart-pick>
      <NumerologyYearStepper numbers={numbers} locale={locale} selectedId={w.selectedId} onSelect={w.choose} stepper={false} />
      <section className="ulune-numc-sec" aria-labelledby="numc-months">
        <h2 id="numc-months" className="ulune-numc-h">
          {p(locale, "cyclesMonthsHead", { year })}
        </h2>
        <div className="ulune-numc-months" role="group" aria-label={p(locale, "cyclesMonthsGroup", { year })} data-testid="num-months">
          {months.map(({ m, short, long, value }) => {
            const ref = `month:${m}`;
            const on = w.selectedId === ref;
            return (
              <button
                key={m}
                type="button"
                className={cn("ulune-numc-month", on && "is-on")}
                data-testid={`num-month-${m}`}
                data-now={isNow && m === nowMonth ? "1" : undefined}
                aria-pressed={on}
                aria-label={`${long}: ${p(locale, "personalMonth")} ${value.number}`}
                onClick={() => w.choose(ref)}
                {...previewProps(ref)}
              >
                <span className="ulune-numc-month-k">{short}</span>
                <b>{value.number}</b>
              </button>
            );
          })}
        </div>
        {isNow && numbers.personalDay.number != null ? (
          <button
            type="button"
            className={cn("ulune-num-chip ulune-numc-today", w.selectedId === "time:day" && "is-on")}
            data-testid="num-today"
            aria-pressed={w.selectedId === "time:day"}
            onClick={() => w.choose("time:day")}
            {...previewProps("time:day")}
          >
            {p(locale, "cyclesToday", { n: numbers.personalDay.number })}
          </button>
        ) : null}
      </section>
      <section className="ulune-numc-sec" aria-labelledby="numc-life">
        <h2 id="numc-life" className="ulune-numc-h">
          {p(locale, "cyclesLifeHead")}
        </h2>
        <NumerologyLifeLine chart={numbers} locale={locale} selectedId={w.selectedId} onSelect={w.choose} />
      </section>
    </div>
  );
}

/** The year shown, in the stage's toolbar (moved here from the numbers wheel). */
function CyclesControls() {
  const { locale } = useI18n();
  const numerology = useModeData("numerology-cycles");
  const numbers = numerology?.numbers ?? null;
  if (!numbers || numbers.lifePath.number == null) return null;
  return <NumerologyYearSteps year={numbers.calendarYear} locale={locale} />;
}

/** Until the year's reading has come, a quiet stand-in. */
function CyclesHelloEmpty() {
  return <LoadingLines lines={4} />;
}

function CyclesData() {
  const { t } = useI18n();
  const w = useWheelView();
  const numerology = useModeData("numerology-cycles");
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const openDock = useStudioStore((s) => s.openDock);
  const numbers = numerology?.numbers;
  if (!numbers) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <NumerologyTable
        chart={numbers}
        only={TABLE_PARTS}
        name={w.chart ? chartNameOf(w.chart, t("untitled")) : ""}
        nameFrom={numerology?.nameFrom ?? null}
        rows={rows}
        activeId={activeId}
        selectedId={w.selectedId}
        onSelect={w.pick}
        openBirth={() => {
          openDock("birth");
          focusField("birth-full-name");
        }}
      />
    </Suspense>
  );
}

function useCyclesRuntime(): ModeRuntime<NumerologyState> {
  const numerology = useNumerology("numerology-cycles");
  return useMemo(() => ({ data: numerology, reading: numerology.reading }), [numerology]);
}

export const numerologyCyclesMode: ModeDef = {
  ...MODE_META["numerology-cycles"],
  emptyText: numerologyNoNatal,
  Controls: CyclesControls,
  Figure: CyclesFigure,
  HelloEmpty: CyclesHelloEmpty,
  Data: CyclesData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useCyclesRuntime,
};
