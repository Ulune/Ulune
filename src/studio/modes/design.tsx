import { Suspense, useEffect, useMemo, useState } from "react";
import { HumanDesignGraph } from "@/components/humandesign-graph";
import { HdCard } from "@/components/hd-card";
import { HumanDesignHello } from "@/components/humandesign-hello";
import { LoadingLines } from "@/components/loading-lines";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { hdHelloCells, type HdHelloId } from "@/lib/i18n/hd-hello";
import { hdAuthorityLabel, hdCaption, hdNoNatal, hdStrategyLabel, hdTypeLabel, hdViewLabel } from "@/lib/i18n/hd-ui";
import type { HumanDesignChart } from "@/lib/chart/human-design";
import { localizeError } from "@/lib/i18n/errors";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useModeData } from "@/studio/modes/data";
import { useHumanDesign } from "@/studio/modes/hooks/useHumanDesign";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { isWide } from "@/studio/dock/dock-layout";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/hd.css";

const loadTable = () => import("@/studio/tables/hd-table");
const HumanDesignTable = lazyNamed(loadTable, "HumanDesignTable");

export type DesignState = ReturnType<typeof useHumanDesign>;

function DesignControls() {
  const { locale } = useI18n();
  const hd = useModeData("design");
  if (!hd) return null;
  return (
    <div data-testid="hd-control" className="ulune-hd-control min-w-0 flex-1">
      <SegmentedToggle
        ariaLabel="Human Design layer"
        value={hd.view}
        onChange={hd.setView}
        options={[
          { value: "personality", testId: "hd-view-personality", label: hdViewLabel(locale, "personality") },
          { value: "design", testId: "hd-view-design", label: hdViewLabel(locale, "design") },
          { value: "both", testId: "hd-view-both", label: hdViewLabel(locale, "both") },
        ]}
      />
    </div>
  );
}

function mastValue(chart: HumanDesignChart, id: HdHelloId, locale: "en" | "fr") {
  if (id === "type") return hdTypeLabel(locale, chart.type);
  if (id === "strategy") return hdStrategyLabel(locale, chart.strategy);
  return hdAuthorityLabel(locale, chart.authority);
}

/** Wide screens read beside the chart; on a phone the reading is a sheet over it. */
function useWide(): boolean {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const on = () => setWide(isWide());
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return wide;
}

function DesignFigure() {
  const { locale, t } = useI18n();
  const w = useWheelView();
  const wide = useWide();
  const hd = useModeData("design");
  if (!hd) return null;
  if (hd.error) {
    return (
      <div className="px-5 py-10" role="alert">
        <p className="font-display text-2xl text-fg">{localizeError(hd.error, locale)}</p>
        <button type="button" className="mt-2 text-sm underline" onClick={hd.retry}>
          {t("errorSlotRetry")}
        </button>
      </div>
    );
  }
  const chart = hd.hd;
  if (!chart) {
    return (
      <section data-testid="studio-humandesign-loading" className="px-6 py-16 text-center" aria-busy="true">
        <span className="mx-auto block size-8 animate-pulse rounded-full bg-bg-subtle" />
      </section>
    );
  }
  // On a phone, choosing a piece keeps the chart whole: the reading waits
  // behind the card's button instead of a sheet rising over the chart.
  const select = (id: string) => {
    if (wide) w.pick(id);
    else useStudioStore.setState((s) => ({ selectedId: s.selectedId === id ? null : id }));
  };
  return (
    <div className="ulune-hd-figure flex h-full min-h-0 w-full flex-col items-center justify-start overflow-auto" style={{ opacity: hd.busy ? 0.7 : 1 }}>
      <div className="ulune-hd-mast" data-testid="hd-mast">
        {hdHelloCells(locale).map((cell) => (
          <div key={cell.id}>
            <p className="ulune-hd-mast-k">{cell.label}</p>
            <p className="ulune-hd-mast-v">{mastValue(chart, cell.id, locale)}</p>
          </div>
        ))}
      </div>
      <HumanDesignGraph
        chart={chart}
        view={hd.view}
        selectedId={w.selectedId}
        onSelect={select}
        onClear={() => useStudioStore.getState().clear()}
      />
      {wide ? null : <HdCard chart={chart} view={hd.view} />}
    </div>
  );
}

function DesignCaption() {
  const { locale } = useI18n();
  const hd = useModeData("design");
  if (!hd?.hd) return null;
  return (
    <p data-testid="hd-caption" className="ulune-hd-caption text-center text-xs text-fg-muted">
      {hdCaption(locale, hd.hd.profile, hd.hd.definition)}
    </p>
  );
}

function DesignHelloEmpty() {
  const { locale } = useI18n();
  const w = useWheelView();
  const hd = useModeData("design");
  if (!hd?.hd) return <p className="px-4 py-3 text-sm text-fg-muted">{hdNoNatal(locale)}</p>;
  return <HumanDesignHello chart={hd.hd} selectedId={w.selectedId} onSelect={w.pick} />;
}

function DesignData() {
  const w = useWheelView();
  const hd = useModeData("design");
  if (!hd?.hd) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <HumanDesignTable chart={hd.hd} view={hd.view} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function useDesignRuntime(): ModeRuntime<DesignState> {
  const hd = useHumanDesign();
  return useMemo(() => ({ data: hd, reading: hd.reading }), [hd]);
}

export const designMode: ModeDef = {
  ...MODE_META.design,
  emptyText: hdNoNatal,
  Controls: DesignControls,
  Figure: DesignFigure,
  Caption: DesignCaption,
  HelloEmpty: DesignHelloEmpty,
  Data: DesignData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useDesignRuntime,
};
