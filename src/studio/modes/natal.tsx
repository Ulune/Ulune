import { Info } from "lucide-react";
import { Suspense, useMemo } from "react";
import { ChartWheel } from "@/components/chart-wheel";
import { LoadingLines } from "@/components/loading-lines";
import { NatalHello } from "@/components/natal-hello";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { formatEuropeanDate } from "@/lib/chart/parse-birth";
import { methodNotes } from "@/lib/chart/method-notes";
import { mergeGrokIntoDossier } from "@/lib/chart/dossier";
import { usePack } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { WheelPort } from "@/studio/stage/WheelPort";
import { useScopeId, useScoped } from "@/studio/scope";
import { loadStudioView } from "@/studio/url";

// The table view loads when it is opened (or ahead, on hover of its switch).
export const loadNatalTable = () => import("@/studio/tables/natal-table");
const NatalTable = lazyNamed(loadNatalTable, "NatalTable");
// A reader who left the table view open gets it straight away.
if (typeof window !== "undefined" && loadStudioView() === "table") prefetch(loadNatalTable);

function NatalFigure() {
  const w = useWheelView();
  const activeId = useScoped((s) => s.activeId);
  // The wheel kept for the next visit's first view is the main page's only.
  const main = useScopeId() === "main";
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
        onSelect={w.choose}
        firstView={main ? (activeId ?? undefined) : undefined}
      />
    </WheelPort>
  );
}

function NatalCaption() {
  const { t, locale } = useI18n();
  const chart = useScoped((s) => s.chart);
  const input = useScoped((s) => s.input);
  const timeUnknown = useScoped((s) => s.timeUnknown);
  if (!chart) return null;
  // The date as the form writes it (15/06/1990), not as it is stored.
  const caption = [
    formatEuropeanDate(input.date),
    timeUnknown ? t("timeUnknown") : input.time,
    input.placeLabel,
    t(HOUSE_SYSTEM_LABEL[chart.meta.houseSystem ?? input.houseSystem ?? "placidus"]),
    chart.patterns.isDay ? t("tableDay") : t("tableNight"),
  ]
    .filter(Boolean)
    .join(" · ");
  // When the engine changed its method (polar houses, Moshier, a body left
  // out), the chart says so under its caption (lib/chart/method-notes.ts).
  const notes = methodNotes(chart.meta, t, locale);
  return (
    <>
      {caption}
      {notes.map((note) => (
        <span key={note} className="ulune-method-note" role="note" data-testid="method-note">
          <Info className="ulune-method-note-icon" strokeWidth={1.75} aria-hidden />
          {note}
        </span>
      ))}
    </>
  );
}

function NatalHelloEmpty() {
  const w = useWheelView();
  if (!w.chart) return null;
  return <NatalHello chart={w.chart} selectedId={w.selectedId} onSelect={w.pick} />;
}

function NatalData() {
  const chart = useScoped((s) => s.chart);
  const selectedId = useScoped((s) => s.selectedId);
  const pick = useScoped((s) => s.pick);
  if (!chart) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <NatalTable chart={chart} selectedId={selectedId} onSelect={pick} />
    </Suspense>
  );
}

function useNatalRuntime(): ModeRuntime {
  const { locale } = useI18n();
  const dossier = useScoped((s) => s.dossier);
  const grok = useScoped((s) => s.grok);
  const selectedId = useScoped((s) => s.selectedId);
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
