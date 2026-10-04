import { Suspense, useMemo } from "react";
import { BiWheelFrame } from "@/components/aspect-layer-toggle";
import { ChartWheel } from "@/components/chart-wheel";
import { SynastryHello } from "@/components/synastry-hello";
import { LoadingLines } from "@/components/loading-lines";
import { chartDisplayName } from "@/lib/chart/library";
import { usePack } from "@/lib/content/packs";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useI18n } from "@/lib/i18n/locale";
import { synastryAddSecond, synastryLegend, synastryNoNatal } from "@/lib/i18n/synastry-ui";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { usePairCharts } from "@/studio/modes/hooks/usePairCharts";
import { MODE_META } from "@/studio/modes/meta";
import { PairSelects } from "@/studio/modes/pair-selects";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { WheelPort } from "@/studio/stage/WheelPort";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/pair.css";

const loadTable = () => import("@/studio/tables/synastry-table");
const SynastryTable = lazyNamed(loadTable, "SynastryTable");

export type SynastryState = ReturnType<typeof usePairCharts>;

function SynastryControls() {
  return <PairSelects mode="synastry" />;
}

function SynastryFigure() {
  const { locale } = useI18n();
  const w = useWheelView();
  const synastry = useModeData("synastry");
  const partnerBirth = useStudioStore((s) => s.pair.addingPartnerFor === "synastry");
  if (!synastry) return null;
  if (!synastry.inner) {
    return <p className="px-5 py-10 font-display text-2xl text-fg">{synastryNoNatal(locale)}</p>;
  }
  if (!synastry.chartB || !synastry.synastry) {
    if (partnerBirth) {
      return <div data-testid="synastry-need-second" className="hidden" />;
    }
    return (
      <div data-testid="synastry-need-second" className="grid min-h-[12rem] place-items-center px-4 text-center">
        <button
          type="button"
          data-testid="synastry-add-second-wheel"
          onClick={synastry.addSecond}
          className={cn(
            "inline-flex min-h-[var(--btn-h)] items-center justify-center rounded-md px-4",
            "font-display text-2xl leading-none text-fg hover:text-fg-muted",
          )}
        >
          {synastryAddSecond(locale)}
        </button>
      </div>
    );
  }
  return (
    <BiWheelFrame
      kind="synastry"
      value={w.aspectLayer}
      onChange={w.setAspectLayer}
      names={{ a: synastry.inner.meta.name || "A", b: synastry.chartB.meta.name || "B" }}
    >
      <WheelPort dim={w.casting}>
        <ChartWheel
          chart={synastry.inner}
          selectedId={w.selectedId}
          visible={w.visible}
          aspectFilter={w.aspectFilter}
          overlays={w.overlays}
          starVisible={w.starVisible}
          midpointVisible={w.midpointVisible}
          onSelect={w.choose}
          transits={synastry.outerBodies}
          crossAspects={synastry.synastry.aspects}
          outerKind="synastry"
          aspectLayer={w.aspectLayer}
        />
      </WheelPort>
    </BiWheelFrame>
  );
}

function SynastryCaption() {
  const { locale, t } = useI18n();
  const synastry = useModeData("synastry");
  if (!synastry?.inner || !synastry.chartB) return null;
  const aName = chartDisplayName(
    {
      name: synastry.inner.meta.name,
      date: synastry.inner.meta.date,
      time: synastry.inner.meta.time,
      latitude: synastry.inner.meta.latitude,
      longitude: synastry.inner.meta.longitude,
      placeLabel: synastry.inner.meta.placeLabel,
    },
    t("untitled"),
  );
  const bName = chartDisplayName(
    {
      name: synastry.chartB.meta.name,
      date: synastry.chartB.meta.date,
      time: synastry.chartB.meta.time,
      latitude: synastry.chartB.meta.latitude,
      longitude: synastry.chartB.meta.longitude,
      placeLabel: synastry.chartB.meta.placeLabel,
    },
    t("untitled"),
  );
  return (
    <p data-testid="synastry-caption" className="ulune-kicker flex justify-center gap-[var(--space-4)] text-fg-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full border border-fg-muted bg-bg-elevated" />
        {synastryLegend(locale, "inner")} · {aName}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full border border-dashed border-fg-muted" />
        {synastryLegend(locale, "outer")} · {bName}
      </span>
    </p>
  );
}

function SynastryHelloEmpty() {
  const { locale } = useI18n();
  const w = useWheelView();
  const synastry = useModeData("synastry");
  if (!synastry?.inner) return null;
  // With one person only, nothing can meet yet (review 3 Oct, P3): the panel
  // asks for the second instead of saying the two Suns make no aspect.
  if (!synastry.chartB || !synastry.synastry) {
    return (
      <section data-testid="synastry-hello" data-empty="1" className="ob-glance">
        <button
          type="button"
          data-testid="synastry-add-second-panel"
          onClick={synastry.addSecond}
          className="inline-flex min-h-11 items-center rounded-md font-display text-xl leading-tight text-fg hover:text-fg-muted"
        >
          {synastryAddSecond(locale)}
        </button>
      </section>
    );
  }
  return (
    <SynastryHello
      a={synastry.inner}
      b={synastry.chartB ?? undefined}
      majors={synastry.synastry?.majors ?? []}
      selectedId={w.selectedId}
      onSelect={w.pick}
    />
  );
}

function SynastryData() {
  const w = useWheelView();
  const synastry = useModeData("synastry");
  if (!synastry?.inner || !synastry.chartB || !synastry.synastry) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <SynastryTable a={synastry.inner} b={synastry.chartB} pair={synastry.synastry} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function useSynastryRuntime(): ModeRuntime<SynastryState> {
  const { locale } = useI18n();
  const page = useStudioStore((s) => s.page);
  const synastry = usePairCharts("synastry", page === "synastry");
  const selectedId = useStudioStore((s) => s.selectedId);
  const astro = usePack("astro", locale, synastry.enabled);
  const selected =
    selectedId && synastry.synastryDossier ? (synastry.synastryDossier.byId[selectedId] ?? null) : null;
  const reading = useMemo(
    () => (selected && astro ? astro.withClickNote(selected, locale) : null),
    [selected, astro, locale],
  );
  return useMemo(() => ({ data: synastry, reading }), [synastry, reading]);
}

export const synastryMode: ModeDef = {
  ...MODE_META.synastry,
  emptyText: synastryNoNatal,
  Controls: SynastryControls,
  Figure: SynastryFigure,
  Caption: SynastryCaption,
  HelloEmpty: SynastryHelloEmpty,
  Data: SynastryData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useSynastryRuntime,
};

