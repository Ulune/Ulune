import { Suspense, useMemo } from "react";
import { RingsMenu } from "@/components/rings-menu";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import { ChartWheel } from "@/components/chart-wheel";
import { CompositeHello } from "@/components/composite-hello";
import { LoadingLines } from "@/components/loading-lines";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { usePack } from "@/lib/content/packs";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useI18n } from "@/lib/i18n/locale";
import {
  compositeAddSecond,
  compositeMethodLabel,
  compositeMixedHouses,
  compositeNoNatal,
} from "@/lib/i18n/composite-ui";
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

const loadTable = () => import("@/studio/tables/composite-table");
const CompositeTable = lazyNamed(loadTable, "CompositeTable");

export type CompositeState = ReturnType<typeof usePairCharts>;

function CompositeControls() {
  return <PairSelects mode="composite" />;
}

/**
 * Composite or Davison (review 3 Oct, P6), with one line saying what the
 * chart is: the midpoints, or the real moment and place halfway.
 */
function RelationshipKind() {
  const { t } = useI18n();
  const composite = useModeData("composite");
  const kind = useStudioStore((s) => s.pair.compositeKind);
  if (!composite?.inner || !composite.chartB) return null;
  const chart = composite.composite;
  const dms = (x: number, pos: string, neg: string) => {
    const a = Math.abs(x);
    const d = Math.floor(a);
    const m = Math.round((a - d) * 60);
    return `${d}°${String(m).padStart(2, "0")}′ ${x >= 0 ? pos : neg}`;
  };
  const line =
    kind === "davison"
      ? chart
        ? t("relDavisonLine", {
            when: `${formatEuropeanDate(chart.meta.utc.slice(0, 10)) || chart.meta.utc.slice(0, 10)} ${chart.meta.utc.slice(11, 16)}`,
            where: `${dms(chart.meta.latitude, "N", "S")}, ${dms(chart.meta.longitude, "E", "W")}`,
          })
        : ""
      : t("relCompositeLine");
  return (
    <RingsMenu
      testId="relationship"
      ariaLabel={t("relKind")}
      value={kind}
      onChange={(next) => useStudioStore.setState((s) => ({ pair: { ...s.pair, compositeKind: next } }))}
      options={[
        { value: "composite", label: t("relComposite"), line: kind === "composite" ? line : t("relCompositeLine") },
        { value: "davison", label: t("relDavison"), line: kind === "davison" && line ? line : t("relDavisonShort") },
      ]}
    />
  );
}

function CompositeFigure() {
  const { locale } = useI18n();
  const w = useWheelView();
  const composite = useModeData("composite");
  const partnerBirth = useStudioStore((s) => s.pair.addingPartnerFor === "composite");
  if (!composite) return null;
  if (!composite.inner) {
    return <p className="px-5 py-10 font-display text-2xl text-fg">{compositeNoNatal(locale)}</p>;
  }
  if (composite.davisonPending || composite.davisonError) {
    return (
      <div className="ulune-biwheel">
        <RelationshipKind />
        {composite.davisonError ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted" role="alert">
            {composite.davisonError}
          </p>
        ) : (
          <LoadingLines testId="davison-loading" lines={4} />
        )}
      </div>
    );
  }
  if (!composite.composite) {
    if (partnerBirth) {
      return <div data-testid="composite-need-second" className="hidden" />;
    }
    return (
      <div data-testid="composite-need-second" className="grid min-h-[12rem] place-items-center px-4 text-center">
        <button
          type="button"
          data-testid="composite-add-second-wheel"
          onClick={composite.addSecond}
          className={cn(
            "inline-flex min-h-[var(--btn-h)] items-center justify-center rounded-md px-4",
            "font-display text-2xl leading-none text-fg hover:text-fg-muted",
          )}
        >
          {compositeAddSecond(locale)}
        </button>
      </div>
    );
  }
  return (
    <div data-testid="composite-wheel" data-kind={composite.kind} className="ulune-biwheel">
      <RelationshipKind />
      <WheelPort dim={w.casting}>
        <ChartWheel
          chart={composite.composite}
          selectedId={w.selectedId}
          visible={w.visible}
          aspectFilter={w.aspectFilter}
          overlays={w.overlays}
          starVisible={w.starVisible}
          midpointVisible={w.midpointVisible}
          onSelect={w.choose}
        />
      </WheelPort>
    </div>
  );
}

function MixedHousesNote() {
  const { locale, t } = useI18n();
  const composite = useModeData("composite");
  const a = composite?.inner;
  const b = composite?.chartB;
  if (!a || !b || a.meta.houseSystem === b.meta.houseSystem) return null;
  const aName = t(HOUSE_SYSTEM_LABEL[a.meta.houseSystem] ?? "housePlacidus");
  const bName = t(HOUSE_SYSTEM_LABEL[b.meta.houseSystem] ?? "housePlacidus");
  return (
    <p data-testid="composite-mixed-houses" className="text-sm text-fg-muted">
      {compositeMixedHouses(locale, aName, bName)}
    </p>
  );
}

function CompositeCaption() {
  const { locale, t } = useI18n();
  const composite = useModeData("composite");
  if (!composite?.composite) return null;
  return (
    <>
      <p data-testid="composite-method" className="text-center text-xs tracking-wide text-fg-muted">
        {composite.kind === "davison" ? t("relDavisonCaption") : compositeMethodLabel(locale)}
      </p>
      <MixedHousesNote />
    </>
  );
}

function CompositeHelloEmpty() {
  const w = useWheelView();
  const composite = useModeData("composite");
  if (!composite?.composite) return null;
  return (
    <>
      <MixedHousesNote />
      <CompositeHello chart={composite.composite} selectedId={w.selectedId} onSelect={w.pick} />
    </>
  );
}

function CompositeData() {
  const w = useWheelView();
  const composite = useModeData("composite");
  if (!composite?.composite) return null;
  return (
    <>
      <RelationshipKind />
      <MixedHousesNote />
      <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
        <CompositeTable chart={composite.composite} selectedId={w.selectedId} onSelect={w.pick} davison={composite.kind === "davison"} />
      </Suspense>
    </>
  );
}

function useCompositeRuntime(): ModeRuntime<CompositeState> {
  const { locale } = useI18n();
  const page = useStudioStore((s) => s.page);
  const composite = usePairCharts("composite", page === "composite");
  const selectedId = useStudioStore((s) => s.selectedId);
  const astro = usePack("astro", locale, composite.enabled);
  const selected =
    selectedId && composite.compositeDossier ? (composite.compositeDossier.byId[selectedId] ?? null) : null;
  const reading = useMemo(
    () => (selected && astro ? astro.withClickNote(selected, locale) : null),
    [selected, astro, locale],
  );
  return useMemo(() => ({ data: composite, reading }), [composite, reading]);
}

export const compositeMode: ModeDef = {
  ...MODE_META.composite,
  emptyText: compositeNoNatal,
  Controls: CompositeControls,
  Figure: CompositeFigure,
  Caption: CompositeCaption,
  HelloEmpty: CompositeHelloEmpty,
  Data: CompositeData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useCompositeRuntime,
};
