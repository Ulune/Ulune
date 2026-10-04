import { markSeen, seenBefore } from "@/lib/seen-once";
import { settleIn } from "@/lib/settle";
import { prefersReducedMotion } from "@/lib/depth/env";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HumanDesignGraph } from "@/components/humandesign-graph";
import { HdCard } from "@/components/hd-card";
import { HdFacts } from "@/components/hd-facts";
import { HdLayerHint } from "@/components/hd-layer-hint";
import { HumanDesignHello } from "@/components/humandesign-hello";
import { LoadingLines } from "@/components/loading-lines";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { hdMomentLabel } from "@/lib/i18n/hd-moment";
import { hdNoNatal, hdUnknownText, hdViewLabel } from "@/lib/i18n/hd-ui";
import { localizeError } from "@/lib/i18n/errors";
import { chartNameOf } from "@/lib/chart/library";
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

/** The bodygraph's entrance (hd.css): the whole build, and the settle of one seen before. */
const HD_BUILD_MS = 1300;
/** A build on screen this long counts as seen; cut shorter by a quick switch, it plays whole next time. */
const HD_SEEN_AFTER_MS = 600;

function DesignFigure() {
  const { locale, t } = useI18n();
  const w = useWheelView();
  const wide = useWide();
  const hd = useModeData("design");
  const natal = useStudioStore((s) => s.chart);
  // The bodygraph builds itself the first time this chart's is shown in a
  // visit (hd.css, data-build); after that it settles in as one piece
  // (lib/settle.ts).
  const sightKey = natal ? `hd|${natal.meta.date}|${natal.meta.time}|${natal.meta.latitude}|${natal.meta.longitude}` : "hd";
  const entrance = useRef<{ node: HTMLDivElement; started: number; timer: number; stop: (() => void) | null } | null>(null);
  const entranceRef = useCallback(
    (node: HTMLDivElement | null) => {
      const was = entrance.current;
      if (was && was.node !== node) {
        window.clearTimeout(was.timer);
        was.node.removeAttribute("data-build");
        was.stop?.();
        if (was.timer && performance.now() - was.started >= HD_SEEN_AFTER_MS) markSeen(sightKey);
        entrance.current = null;
      }
      if (!node || entrance.current || prefersReducedMotion()) return;
      if (seenBefore(sightKey)) {
        entrance.current = { node, started: performance.now(), timer: 0, stop: settleIn(node) };
        return;
      }
      node.setAttribute("data-build", "");
      const timer = window.setTimeout(() => {
        node.removeAttribute("data-build");
        markSeen(sightKey);
      }, HD_BUILD_MS);
      entrance.current = { node, started: performance.now(), timer, stop: null };
    },
    [sightKey],
  );
  const hdChart = hd?.hd ?? null;
  const tz = natal?.meta.timezone;
  const withTime = !natal?.meta.timeUnknown;
  // When each column was taken, in the birth place's time.
  const moments = useMemo(
    () =>
      hdChart
        ? {
            design: hdMomentLabel(hdChart.designUtc, tz, locale, withTime),
            personality: hdMomentLabel(hdChart.personalityUtc, tz, locale, withTime),
          }
        : { design: "", personality: "" },
    [hdChart, tz, locale, withTime],
  );
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
  // On a phone, choosing a piece of the chart keeps it whole: the reading
  // waits behind the card's button instead of a sheet rising over the chart.
  // What is only words (the layers) opens its reading at once.
  const select = (id: string) => {
    if (id.startsWith("hello:")) w.pick(id);
    else if (wide) w.choose(id);
    else useStudioStore.setState((s) => ({ selectedId: s.selectedId === id ? null : id }));
  };
  return (
    <div
      ref={entranceRef}
      className="ulune-hd-figure flex h-full min-h-0 w-full flex-col items-center justify-start overflow-auto"
      style={{ opacity: hd.busy ? 0.7 : 1 }}
    >
      <HdFacts chart={chart} selectedId={w.selectedId} onSelect={w.pick} />
      {/* Under the facts, in the flow (review 3 Oct, H7: it covered four of them). */}
      <HdLayerHint view={hd.view} />
      {chart.uncertain ? (
        <p className="ulune-hd-unknown" data-testid="hd-unknown" role="note">
          {hdUnknownText(locale, "line")}
        </p>
      ) : null}
      <HumanDesignGraph
        chart={chart}
        view={hd.view}
        selectedId={w.selectedId}
        onSelect={select}
        onClear={() => useStudioStore.getState().clear()}
        moments={moments}
      />
      {wide ? null : <HdCard chart={chart} view={hd.view} />}
    </div>
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
  const { t } = useI18n();
  const w = useWheelView();
  const hd = useModeData("design");
  if (!hd?.hd) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <HumanDesignTable
        chart={hd.hd}
        view={hd.view}
        name={w.chart ? chartNameOf(w.chart, t("untitled")) : ""}
        selectedId={w.selectedId}
        onSelect={w.pick}
      />
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
  HelloEmpty: DesignHelloEmpty,
  Data: DesignData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useDesignRuntime,
};
