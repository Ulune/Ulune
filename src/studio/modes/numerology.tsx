import { useMemo } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { NumerologyPanel } from "@/components/numerology-panel";
import { valueOfCore } from "@/lib/chart/numerology";
import { WHEEL_CORES } from "@/lib/chart/numerology-focus";
import { wholeText } from "@/lib/chart/numerology-reduce";
import { useDepthPrefs } from "@/lib/depth/prefs";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
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
      <NumerologyYearStepper numbers={numbers} locale={locale} />
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

/** The Life Path reading opens by default (useNumerology); until its text has come, a quiet stand-in. */
function NumerologyHelloEmpty() {
  return <LoadingLines lines={4} />;
}

function NumerologyData() {
  return <NumerologyPanel />;
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
  useRuntime: useNumerologyRuntime,
};
