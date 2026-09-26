import { Suspense, useMemo } from "react";
import { ChartWheel } from "@/components/chart-wheel";
import { LoadingLines } from "@/components/loading-lines";
import { NatalHello } from "@/components/natal-hello";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { mergeGrokIntoDossier } from "@/lib/chart/dossier";
import { usePack } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { WheelPort } from "@/studio/stage/WheelPort";
import { useStudioStore } from "@/studio/store";
import { loadStudioView } from "@/studio/url";

// The table view loads when it is opened (or ahead, on hover of its switch).
export const loadNatalTable = () => import("@/studio/tables/natal-table");
const NatalTable = lazyNamed(loadNatalTable, "NatalTable");
// A reader who left the table view open gets it straight away.
if (typeof window !== "undefined" && loadStudioView() === "table") prefetch(loadNatalTable);

function NatalFigure() {
  const w = useWheelView();
  const activeId = useStudioStore((s) => s.activeId);
  if (!w.chart) return null;
  return (
    <WheelPort dim={w.casting}>
      <ChartWheel
        chart={w.chart}
        selectedId={w.selectedId}
        visible={w.visible}
        aspectFilter={w.aspectFilter}
        overlays={w.overlays}
        starVisible={w.starVisible}
        midpointVisible={w.midpointVisible}
        onSelect={w.pick}
        firstView={activeId ?? undefined}
      />
    </WheelPort>
  );
}

function NatalCaption() {
  const { t } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const input = useStudioStore((s) => s.input);
  const timeUnknown = useStudioStore((s) => s.timeUnknown);
  if (!chart) return null;
  const caption = [
    input.date,
    timeUnknown ? t("timeUnknown") : input.time,
    input.placeLabel,
    t(HOUSE_SYSTEM_LABEL[chart.meta.houseSystem ?? input.houseSystem ?? "placidus"]),
    chart.patterns.isDay ? t("tableDay") : t("tableNight"),
  ]
    .filter(Boolean)
    .join(" · ");
  return <>{caption}</>;
}

function NatalHelloEmpty() {
  const w = useWheelView();
  if (!w.chart) return null;
  return <NatalHello chart={w.chart} selectedId={w.selectedId} onSelect={w.pick} />;
}

function NatalData() {
  const chart = useStudioStore((s) => s.chart);
  const selectedId = useStudioStore((s) => s.selectedId);
  const pick = useStudioStore((s) => s.pick);
  if (!chart) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <NatalTable chart={chart} selectedId={selectedId} onSelect={pick} />
    </Suspense>
  );
}

function useNatalRuntime(): ModeRuntime {
  const { locale } = useI18n();
  const dossier = useStudioStore((s) => s.dossier);
  const grok = useStudioStore((s) => s.grok);
  const selectedId = useStudioStore((s) => s.selectedId);
  // The reading text: the workspace fetches it once the wheel is up; a click
  // before that asks for it at once.
  const astro = usePack("astro", locale, Boolean(selectedId));
  const merged = useMemo(
    () => (dossier ? (grok ? mergeGrokIntoDossier(dossier, grok) : dossier) : null),
    [dossier, grok],
  );
  const selected = selectedId && merged ? (merged.byId[selectedId] ?? null) : null;
  const reading = useMemo(
    () => (selected && astro ? astro.withClickNote(selected, locale) : null),
    [selected, astro, locale],
  );
  return useMemo(() => ({ data: null, reading }), [reading]);
}

export const natalMode: ModeDef = {
  ...MODE_META.natal,
  Figure: NatalFigure,
  Caption: NatalCaption,
  HelloEmpty: NatalHelloEmpty,
  Data: NatalData,
  preloadData: () => prefetch(loadNatalTable),
  useRuntime: useNatalRuntime,
};
