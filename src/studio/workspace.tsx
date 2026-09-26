import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { LoadFailed, LoadingLines } from "@/components/loading-lines";
import { OfflineOffer } from "@/components/offline-offer";
import { usePack } from "@/lib/content/packs";
import { canPrefetchAhead, prefetch, whenIdle } from "@/lib/lazy-component";
import { inferGrokLocale } from "@/lib/chart/grok-locale";
import { useI18n } from "@/lib/i18n/locale";
import { keepOfflineChoice } from "@/lib/offline";
import { BirthTab } from "@/studio/dock/BirthTab";
import { Dock } from "@/studio/dock/Dock";
import { isWide } from "@/studio/dock/dock-layout";
import { ModeRuntimes } from "@/studio/modes/data";
import { MODE_META } from "@/studio/modes/meta";
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
  const formOnStage =
    Boolean(addingPartnerFor) || (creating && !addingPartnerFor) || (!chart && page === "natal");
  const startNew = useStudioStore((s) => s.startNew);

  // Compact: a fresh chart or mode starts with the sheet at peek so the
  // figure is the first thing seen.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (isWide()) return;
    if (panelOn) useStudioStore.setState({ dockOpen: false });
  }, [panelOn, page]);

  // Each mode says what it needs in its own words (loaded with the mode).
  const emptyText = page === "natal" ? t("blankSky") : (def?.emptyText?.(locale) ?? "");

  let body: ReactNode;
  if (formOnStage) {
    body = <BirthTab onStage />;
  } else if (!chart) {
    body = table ? (
      <section data-testid="studio-table-empty" className="ob-empty">
        <p className="ob-empty-title">{t("tableEmpty")}</p>
        <p className="ob-empty-body">{t("tableEmptyHint")}</p>
        <button
          type="button"
          className="ob-btn ob-btn--primary"
          data-testid="empty-cast"
          onClick={() => startNew()}
        >
          {t("castANatal")}
        </button>
      </section>
    ) : (
      <section data-testid={meta.emptyTestId} role="tabpanel" className="ob-empty">
        <p className="ob-empty-title">{emptyText || "\u00a0"}</p>
        <button
          type="button"
          className="ob-btn ob-btn--primary"
          data-testid="empty-cast"
          onClick={() => startNew()}
        >
          {t("castANatal")}
        </button>
      </section>
    );
  } else if (!def) {
    // The mode is still downloading (or its download failed).
    body = modeError ? (
      <LoadFailed onRetry={retryMode} testId="mode-load-failed" />
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
      >
        <Stage
          testId={
            showChart && !formOnStage ? (table ? "studio-table" : meta.stageTestId) : "studio-stage"
          }
          extraControls={panelOn && def?.Controls ? <def.Controls /> : undefined}
          caption={!table && panelOn && def?.Caption ? <def.Caption /> : undefined}
          table={table && panelOn}
          form={formOnStage}
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
