import { Suspense, useMemo } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { NumerologyFirstRead } from "@/components/numerology-first";
import { chartNameOf } from "@/lib/chart/library";
import { valueOfCore } from "@/lib/chart/numerology";
import { WHEEL_CORES } from "@/lib/chart/numerology-focus";
import { wholeText } from "@/lib/chart/numerology-reduce";
import { useDepthPrefs } from "@/lib/depth/prefs";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import {
  numerologyCoreLabel,
  numerologyNoNatal,
  numerologySystemLabel,
  numerologyWheelText,
} from "@/lib/i18n/numerology-ui";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useNumerology } from "@/studio/modes/hooks/useNumerology";
import { MODE_META } from "@/studio/modes/meta";
import { NumerologyYSwitch, NumerologyYearStepper } from "@/studio/modes/numerology-controls";
import { NumerologyWheel } from "@/studio/modes/numerology-wheel";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/num.css";

const loadTable = () => import("@/studio/tables/numerology-table");
const NumerologyTable = lazyNamed(loadTable, "NumerologyTable");

export type NumerologyState = ReturnType<typeof useNumerology>;

function NumerologyFigure() {
  const { locale } = useI18n();
  const w = useWheelView();
  const clear = useStudioStore((s) => s.clear);
  const numerology = useModeData("numerology");
  const depth = useDepthPrefs();
  const numbers = numerology?.numbers ?? null;
  if (!numbers || numbers.lifePath.number == null) return null;
  const isNow = numbers.calendarYear === new Date().getFullYear();
  return (
    <div className="ulune-num-stage" data-depth={depth.lift ? "on" : "off"}>
      <NumerologyWheel chart={numbers} isNow={isNow} selectedId={w.selectedId} onSelect={w.pick} onClear={clear} />
      <NumerologyYSwitch numbers={numbers} selectedId={w.selectedId} locale={locale} />
      <NumerologyYearStepper numbers={numbers} locale={locale} selectedId={w.selectedId} onSelect={w.pick} />
      <div className="ulune-num-tiles" role="group" aria-label={numerologyWheelText(locale, "tiles")} data-testid="num-tiles">
        {WHEEL_CORES.map((id) => {
          const value = valueOfCore(numbers, id);
          const on = w.selectedId === `core:${id}`;
          return (
            <button
              key={id}
              type="button"
              data-testid={`numerology-tile-${id}`}
              aria-pressed={on}
              disabled={value.number == null}
              onClick={() => w.pick(`core:${id}`)}
              {...previewProps(`core:${id}`)}
              className={cn("ulune-num-tile", on && "is-on")}
            >
              <span className="ulune-num-tile-n">{value.number == null ? "—" : wholeText(value)}</span>
              <span className="ulune-num-tile-k">{numerologyCoreLabel(locale, id)}</span>
            </button>
          );
        })}
      </div>
      <p data-testid="numerology-system" className="ulune-num-system">
        {numerologySystemLabel(locale)}
      </p>
    </div>
  );
}

/**
 * With nothing chosen: the first read for a newcomer (part 63), otherwise the
 * Life Path's reading (useNumerology); until its text has come, a quiet stand-in.
 */
function NumerologyHelloEmpty() {
  const w = useWheelView();
  const numerology = useModeData("numerology");
  if (numerology?.first && numerology.numbers) return <NumerologyFirstRead chart={numerology.numbers} onSelect={w.pick} />;
  return <LoadingLines lines={4} />;
}

function NumerologyData() {
  const { t } = useI18n();
  const w = useWheelView();
  const numerology = useModeData("numerology");
  const rows = useStudioStore((s) => s.rows);
  const activeId = useStudioStore((s) => s.activeId);
  const openDock = useStudioStore((s) => s.openDock);
  const numbers = numerology?.numbers;
  if (!numbers) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <NumerologyTable
        chart={numbers}
        name={w.chart ? chartNameOf(w.chart, t("untitled")) : ""}
        rows={rows}
        activeId={activeId}
        selectedId={w.selectedId}
        onSelect={w.pick}
        openBirth={() => openDock("birth")}
      />
    </Suspense>
  );
}

function useNumerologyRuntime(): ModeRuntime<NumerologyState> {
  const numerology = useNumerology();
  return useMemo(() => ({ data: numerology, reading: numerology.reading }), [numerology]);
}

export const numerologyMode: ModeDef = {
  ...MODE_META.numerology,
  emptyText: numerologyNoNatal,
  Figure: NumerologyFigure,
  HelloEmpty: NumerologyHelloEmpty,
  Data: NumerologyData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useNumerologyRuntime,
};
