import { Suspense, useMemo } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { NumerologyFirstRead } from "@/components/numerology-first";
import { chartNameOf } from "@/lib/chart/library";
import { valueOfCore } from "@/lib/chart/numerology";
import { WHEEL_CORES } from "@/lib/chart/numerology-focus";
import { wholeText } from "@/lib/chart/numerology-reduce";
import { focusField } from "@/lib/focus-field";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import {
  numerologyCoreLabel,
  numerologyNoNatal,
  numerologyWheelText,
} from "@/lib/i18n/numerology-ui";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useNumerology } from "@/studio/modes/hooks/useNumerology";
import { MODE_META } from "@/studio/modes/meta";
import { NumerologyYSwitch } from "@/studio/modes/numerology-controls";
import { NumerologyWheel } from "@/studio/modes/numerology-wheel";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useScopeId, useScoped } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/num.css";

const loadTable = () => import("@/studio/tables/numerology-table");
const NumerologyTable = lazyNamed(loadTable, "NumerologyTable");

export type NumerologyState = ReturnType<typeof useNumerology>;

function NumerologyFigure() {
  const { locale } = useI18n();
  const w = useWheelView();
  const clear = useScoped((s) => s.clear);
  const numerology = useModeData("numerology");
  const numbers = numerology?.numbers ?? null;
  if (!numbers || numbers.lifePath.number == null) return null;
  // This year, always: other years are the Cycles page's (its year steps).
  return (
    <div className="ulune-num-stage">
      <NumerologyWheel chart={numbers} isNow selectedId={w.selectedId} onSelect={w.choose} onClear={clear} />
      <NumerologyYSwitch numbers={numbers} selectedId={w.selectedId} locale={locale} />
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
              onClick={() => w.choose(`core:${id}`)}
              {...previewProps(`core:${id}`)}
              className={cn("ulune-num-tile", on && "is-on")}
            >
              <span className="ulune-num-tile-n">{value.number == null ? "—" : wholeText(value)}</span>
              <span className="ulune-num-tile-k">{numerologyCoreLabel(locale, id)}</span>
            </button>
          );
        })}
      </div>
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
  const openDock = useStudioStore((s) => s.openDock);
  // The birth form is the main page's chart's: a Compare pane only reads its own.
  const main = useScopeId() === "main";
  const numbers = numerology?.numbers;
  if (!numbers) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <NumerologyTable
        chart={numbers}
        name={w.chart ? chartNameOf(w.chart, t("untitled")) : ""}
        nameFrom={numerology?.nameFrom ?? null}
        selectedId={w.selectedId}
        onSelect={w.pick}
        openBirth={() => {
          if (!main) return;
          // The birth form's names for numerology, the full name at birth first.
          openDock("birth");
          focusField("birth-full-name");
        }}
      />
    </Suspense>
  );
}

function useNumerologyRuntime(): ModeRuntime<NumerologyState> {
  const numerology = useNumerology("numerology");
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
