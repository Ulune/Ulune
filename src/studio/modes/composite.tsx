import { Suspense, useMemo } from "react";
import { RingsMenu } from "@/components/rings-menu";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import { ChartWheel } from "@/components/chart-wheel";
import { CompositeHello } from "@/components/composite-hello";
import { LoadingLines } from "@/components/loading-lines";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { NOW_REF } from "@/lib/chart/pair-now";
import { registerPack, usePack } from "@/lib/content/packs";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useI18n } from "@/lib/i18n/locale";
import {
  compositeAddSecond,
  compositeMixedHouses,
  compositeNoNatal,
} from "@/lib/i18n/composite-ui";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { usePairCharts } from "@/studio/modes/hooks/usePairCharts";
import { usePairNowSky, type PairNowSky } from "@/studio/modes/hooks/usePairNowSky";
import { MODE_META } from "@/studio/modes/meta";
import { PairSelects } from "@/studio/modes/pair-selects";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { WheelPort } from "@/studio/stage/WheelPort";
import { useScoped } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/pair.css";

// "You two, now"'s reading text (lib/content/packs.ts), shared with the other astrology Relationship page: its loaders arrive with the page, not in the first download.
registerPack("pairnow", {
  en: () => import("@/lib/content/pack-pair-now?lang=en"),
  fr: () => import("@/lib/content/pack-pair-now?lang=fr"),
});

const loadTable = () => import("@/studio/tables/composite-table");
const CompositeTable = lazyNamed(loadTable, "CompositeTable");
// "You two, now" (share and compare plan, feature 5e): a chunk of its own, with its style sheet (this page is fetched at idle with the first one).
const AstroNow = lazyNamed(() => import("@/studio/modes/pair-now/astro-now"), "AstroNow");

export type CompositeState = ReturnType<typeof usePairCharts> & {
  /** "You two, now": today's sky over the relationship's chart shown, the composite or the Davison (feature 5e). */
  now: PairNowSky;
};

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
  // The page's choice, shared by every scope (both of Compare's panes follow it).
  const kind = useScoped((s) => s.pair.compositeKind);
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
  const partnerBirth = useScoped((s) => s.pair.addingPartnerFor === "composite");
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

/** Under the chart: only the note when the two charts' houses differ (part 95: the method line went; Rings says it). */
function CompositeCaption() {
  const composite = useModeData("composite");
  if (!composite?.composite) return null;
  return <MixedHousesNote />;
}

function CompositeHelloEmpty() {
  const w = useWheelView();
  const composite = useModeData("composite");
  if (!composite?.composite) return null;
  return (
    <>
      <MixedHousesNote />
      <CompositeHello chart={composite.composite} selectedId={w.selectedId} onSelect={w.pick} />
      {/* "You two, now" (feature 5e): the relationship chart's transits today, under the first read. */}
      <Suspense fallback={null}>
        <AstroNow page="composite" now={composite.now} davison={composite.kind === "davison"} />
      </Suspense>
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
        <CompositeTable
          chart={composite.composite}
          selectedId={w.selectedId}
          onSelect={w.pick}
          davison={composite.kind === "davison"}
          now={{ contacts: composite.now.contacts, at: composite.now.at, ready: Boolean(composite.now.sky), failed: Boolean(composite.now.error) }}
        />
      </Suspense>
    </>
  );
}

function useCompositeRuntime(): ModeRuntime<CompositeState> {
  const { locale } = useI18n();
  const page = useStudioStore((s) => s.page);
  const composite = usePairCharts("composite", page === "composite");
  const selectedId = useScoped((s) => s.selectedId);
  const astro = usePack("astro", locale, composite.enabled);
  // "You two, now" (feature 5e): today's sky over the relationship's chart shown (the composite or the Davison),
  // cast through the door while the page is shown; its texts are a pack of their own.
  const relChart = composite.enabled ? composite.composite : null;
  const now = usePairNowSky(Boolean(relChart), relChart);
  const nowPack = usePack("pairnow", locale, Boolean(now.sky));
  const selected =
    selectedId && composite.compositeDossier ? (composite.compositeDossier.byId[selectedId] ?? null) : null;
  const reading = useMemo(() => {
    if (selectedId?.startsWith("two:")) {
      if (!nowPack || !relChart || !now.sky) return null;
      const ctx = { chart: relChart, at: now.at, kind: composite.kind };
      if (selectedId === NOW_REF) return nowPack.pairNowSummary(now.contacts, ctx, locale);
      const contact = now.contacts.find((c) => c.ref === selectedId);
      return contact ? nowPack.pairNowReading(contact, ctx, locale) : null;
    }
    return selected && astro ? astro.withClickNote(selected, locale) : null;
  }, [selectedId, selected, astro, locale, nowPack, relChart, now, composite.kind]);
  const data = useMemo(() => ({ ...composite, now }), [composite, now]);
  return useMemo(() => ({ data, reading }), [data, reading]);
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
