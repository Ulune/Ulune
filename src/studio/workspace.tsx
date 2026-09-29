import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { LoadFailed, LoadingLines } from "@/components/loading-lines";
import { OfflineOffer } from "@/components/offline-offer";
import { usePack } from "@/lib/content/packs";
import { canPrefetchAhead, prefetch, whenIdle } from "@/lib/lazy-component";
import { inferGrokLocale } from "@/lib/chart/grok-locale";
import { AI_ENABLED } from "@/lib/features";
import { useI18n } from "@/lib/i18n/locale";
import { keepOfflineChoice } from "@/lib/offline";
import { Guide } from "@/components/first-screen/Guide";
import { SiteFooter } from "@/components/first-screen/SiteFooter";
import { sampleBirth } from "@/lib/chart/sample";
import { useSpace } from "@/lib/space/state";
import { startTour } from "@/lib/tour/state";
import { BirthTab } from "@/studio/dock/BirthTab";
import { Dock } from "@/studio/dock/Dock";
import { isWide } from "@/studio/dock/dock-layout";
import { ModeRuntimes } from "@/studio/modes/data";
import { MODE_META, PAGE_LABEL } from "@/studio/modes/meta";
import { loadNatalTable } from "@/studio/modes/natal";
import { prefetchModesAtIdle, useModeDef } from "@/studio/modes/registry";
import { Stage } from "@/studio/stage/Stage";
import { bindStudioI18n, setStudioLocale, useStudioStore } from "@/studio/store";

export function StudioWorkspace() {
  const { locale, t, subscribeUserLocale } = useI18n();
  bindStudioI18n({
    locale,
    untitled: t("untitled"),
    couldNotCast: t("couldNotCast"),
    couldNotSaveLocal: t("couldNotSaveLocal"),
  });
  setStudioLocale(locale);

  const page = useStudioStore((s) => s.page);
  const view = useStudioStore((s) => s.view);
  const chart = useStudioStore((s) => s.chart);
  const creating = useStudioStore((s) => s.creating);
  const addingPartnerFor = useStudioStore((s) => s.pair.addingPartnerFor);
  const showChart = Boolean(chart) && (!creating || Boolean(addingPartnerFor));
  const meta = MODE_META[page];
  const { def, error: modeError, retry: retryMode } = useModeDef(page);
  const table = view === "table";
  const hasChart = Boolean(chart);

  useEffect(() => {
    // An AI reading on screen is written again in the new language (AI readings wait for v1.1).
    if (!AI_ENABLED) return;
    return subscribeUserLocale((next) => {
      const s = useStudioStore.getState();
      if (!s.chart || s.creating) return;
      const g = s.grok;
      if (!g) return;
      const written = g.locale ?? inferGrokLocale(g);
      if (written === next) return;
      void s.compose(next, { quiet: true });
    });
  }, [subscribeUserLocale]);

  // The reading text is its own download, in the reader's language: fetched
  // once the wheel is up and the page is idle (a click asks for it sooner).
  const [readingsWanted, setReadingsWanted] = useState(false);
  useEffect(() => {
    if (!hasChart || readingsWanted) return;
    return whenIdle(() => setReadingsWanted(true), 1500);
  }, [hasChart, readingsWanted]);
  const astro = usePack("astro", locale, readingsWanted);

  useEffect(() => {
    const { chart: current, creating: isCreating, dossier } = useStudioStore.getState();
    if (!current || isCreating || !astro) return;
    // Same chart and language: the store already holds this dossier.
    const next = astro.dossierFor(current, locale);
    if (next !== dossier) useStudioStore.setState({ dossier: next });
  }, [chart, locale, creating, astro]);

  // Keep Ulune on this device only as the visitor chose (lib/offline.ts).
  useEffect(() => whenIdle(keepOfflineChoice, 5000), []);

  // The other modes (and the table view) download at idle on a good
  // connection, so switching to them is instant.
  useEffect(() => {
    if (!hasChart) return;
    const stopModes = prefetchModesAtIdle();
    const stopTable = canPrefetchAhead() ? whenIdle(() => prefetch(loadNatalTable), 6000) : () => {};
    return () => {
      stopModes();
      stopTable();
    };
  }, [hasChart]);

  const panelOn = Boolean(chart) && !creating && !addingPartnerFor;
  // With no chart, every page is the form: a link to a mode asks for a birth chart first.
  const formOnStage = Boolean(addingPartnerFor) || creating || !chart;
  const rows = useStudioStore((s) => s.rows);
  const cast = useStudioStore((s) => s.cast);
  const spaceStatus = useSpace((s) => s.status);
  // The guide stands under the first visit's form only (BirthTab: firstVisit).
  const showGuide = !chart && !addingPartnerFor && rows.length === 0 && spaceStatus !== "locked";

  // Compact: a fresh chart, mode or view starts with the sheet at peek so the
  // figure (or the table, which the open sheet squeezed) is the first thing seen.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (isWide()) return;
    if (panelOn) useStudioStore.setState({ dockOpen: false });
  }, [panelOn, page, view]);

  // Why the form stands where a mode or the table was asked for.
  const modeLine = chart
    ? null
    : page !== "natal"
      ? t("firstModeLine", { mode: t(PAGE_LABEL[page]) })
      : table
        ? t("firstTableLine")
        : null;

  let body: ReactNode;
  if (formOnStage) {
    body = (
      <>
        <BirthTab onStage modeLine={modeLine} />
        {showGuide ? (
          <>
            <Guide onTour={startTour} onSample={() => void cast(sampleBirth(t("sampleName")))} />
            <SiteFooter />
          </>
        ) : null}
      </>
    );
  } else if (!chart) {
    body = null;
  } else if (!def) {
    // The mode is still downloading (or its download failed).
    body = modeError ? (
      <LoadFailed onRetry={retryMode} testId="mode-load-failed" error={modeError} />
    ) : (
      <LoadingLines testId="mode-loading" lines={4} />
    );
  } else if (table) {
    body = <div className="ulune-table-view min-w-0">{def.Data ? <def.Data /> : null}</div>;
  } else {
    body = <def.Figure />;
  }

  return (
    <>
      <ModeRuntimes />
      <div
        className="ob-body"
        data-panel={panelOn ? "on" : "off"}
        data-form={formOnStage ? "1" : undefined}
        data-guide={formOnStage && showGuide ? "1" : undefined}
      >
        {/* The page's heading when a chart is on screen (the first screen's is the form's title). */}
        {!formOnStage && chart ? <h1 className="sr-only">{`${t(PAGE_LABEL[page])} · ${chart.meta.name}`}</h1> : null}
        <Stage
          testId={
            showChart && !formOnStage ? (table ? "studio-table" : meta.stageTestId) : "studio-stage"
          }
          extraControls={panelOn && def?.Controls ? <def.Controls /> : undefined}
          caption={!table && panelOn && def?.Caption ? <def.Caption /> : undefined}
          table={table && panelOn}
          form={formOnStage}
          nav={formOnStage && !chart && !addingPartnerFor}
          foot={panelOn}
          swapKey={`${formOnStage ? "form" : page}:${table ? "table" : "wheel"}`}
          viewIntent={def?.preloadData}
          overlay={panelOn ? <OfflineOffer /> : null}
        >
          {body}
        </Stage>
        {panelOn ? <Dock /> : null}
      </div>
    </>
  );
}
