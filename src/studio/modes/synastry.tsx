import { Suspense, useMemo } from "react";
import { BiWheelFrame } from "@/components/aspect-layer-toggle";
import { RingsKey } from "@/components/rings-menu";
import { ChartWheel } from "@/components/chart-wheel";
import { SynastryHello } from "@/components/synastry-hello";
import { LoadingLines } from "@/components/loading-lines";
import { buildComposite } from "@/lib/chart/composite";
import { chartDisplayName } from "@/lib/chart/library";
import { NOW_REF } from "@/lib/chart/pair-now";
import type { NatalChart } from "@/lib/chart/types";
import { registerPack, usePack } from "@/lib/content/packs";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useI18n } from "@/lib/i18n/locale";
import { synastryAddSecond, synastryLegend, synastryNoNatal } from "@/lib/i18n/synastry-ui";
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

const loadTable = () => import("@/studio/tables/synastry-table");
const SynastryTable = lazyNamed(loadTable, "SynastryTable");
// "You two, now" (share and compare plan, feature 5e): a chunk of its own, with its style sheet (this page is fetched at idle with the first one).
const AstroNow = lazyNamed(() => import("@/studio/modes/pair-now/astro-now"), "AstroNow");

export type SynastryState = ReturnType<typeof usePairCharts> & {
  /** "You two, now": today's sky over the two people's composite chart (feature 5e). */
  now: PairNowSky;
  nowChart: NatalChart | null;
};

function SynastryControls() {
  return <PairSelects mode="synastry" />;
}

/** A person's name as the library shows it, for the Rings key. */
function displayName(
  m: { name: string; date: string; time: string; latitude: number; longitude: number; placeLabel: string },
  untitled: string,
): string {
  return chartDisplayName(
    { name: m.name, date: m.date, time: m.time, latitude: m.latitude, longitude: m.longitude, placeLabel: m.placeLabel },
    untitled,
  );
}

function SynastryFigure() {
  const { locale, t } = useI18n();
  const w = useWheelView();
  const synastry = useModeData("synastry");
  const partnerBirth = useScoped((s) => s.pair.addingPartnerFor === "synastry");
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
      legend={
        <RingsKey
          inner={`${synastryLegend(locale, "inner")} · ${displayName(synastry.inner.meta, t("untitled"))}`}
          outer={`${synastryLegend(locale, "outer")} · ${displayName(synastry.chartB.meta, t("untitled"))}`}
        />
      }
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
    <>
      <SynastryHello
        a={synastry.inner}
        b={synastry.chartB ?? undefined}
        majors={synastry.synastry?.majors ?? []}
        selectedId={w.selectedId}
        onSelect={w.pick}
      />
      {/* "You two, now" (feature 5e): the composite's transits today, under the first read. */}
      <Suspense fallback={null}>
        <AstroNow page="synastry" now={synastry.now} davison={false} />
      </Suspense>
    </>
  );
}

function SynastryData() {
  const w = useWheelView();
  const synastry = useModeData("synastry");
  if (!synastry?.inner || !synastry.chartB || !synastry.synastry) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <SynastryTable
        a={synastry.inner}
        b={synastry.chartB}
        pair={synastry.synastry}
        selectedId={w.selectedId}
        onSelect={w.pick}
        now={{ contacts: synastry.now.contacts, at: synastry.now.at, ready: Boolean(synastry.now.sky), failed: Boolean(synastry.now.error) }}
      />
    </Suspense>
  );
}

function useSynastryRuntime(): ModeRuntime<SynastryState> {
  const { locale } = useI18n();
  const page = useStudioStore((s) => s.page);
  const synastry = usePairCharts("synastry", page === "synastry");
  const selectedId = useScoped((s) => s.selectedId);
  const astro = usePack("astro", locale, synastry.enabled);
  // "You two, now" (feature 5e): today's sky over the two people's composite chart (the midpoints), cast
  // through the door while the page is shown with both of them; its texts are a pack of their own.
  const both = synastry.enabled && Boolean(synastry.inner && synastry.chartB);
  const nowChart = useMemo(
    () => (both && synastry.inner && synastry.chartB ? buildComposite(synastry.inner, synastry.chartB) : null),
    [both, synastry.inner, synastry.chartB],
  );
  const now = usePairNowSky(both, nowChart);
  const nowPack = usePack("pairnow", locale, Boolean(now.sky));
  const selected =
    selectedId && synastry.synastryDossier ? (synastry.synastryDossier.byId[selectedId] ?? null) : null;
  const reading = useMemo(() => {
    if (selectedId?.startsWith("two:")) {
      if (!nowPack || !nowChart || !now.sky) return null;
      const ctx = { chart: nowChart, at: now.at, kind: "composite" as const };
      if (selectedId === NOW_REF) return nowPack.pairNowSummary(now.contacts, ctx, locale);
      const contact = now.contacts.find((c) => c.ref === selectedId);
      return contact ? nowPack.pairNowReading(contact, ctx, locale) : null;
    }
    return selected && astro ? astro.withClickNote(selected, locale) : null;
  }, [selectedId, selected, astro, locale, nowPack, nowChart, now]);
  const data = useMemo(() => ({ ...synastry, now, nowChart }), [synastry, now, nowChart]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const synastryMode: ModeDef = {
  ...MODE_META.synastry,
  emptyText: synastryNoNatal,
  Controls: SynastryControls,
  Figure: SynastryFigure,
  HelloEmpty: SynastryHelloEmpty,
  Data: SynastryData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useSynastryRuntime,
};

