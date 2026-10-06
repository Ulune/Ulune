import { useOverflowFade } from "@/lib/overflow-fade";
import { useCallback, useLayoutEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { BodyMixer } from "@/components/body-mixer";
import { PlanetStrip } from "@/components/planet-strip";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { HOUSE_SYSTEM_IDS, type HouseSystemId } from "@/lib/chart/types";
import { useChartView } from "@/lib/chart/use-chart-view";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import {
  BODIES_PAGE_LABEL,
  BODIES_PAGES,
  BODIES_STRIP_PAGES,
  bodiesMixerPage,
  bodiesPageBadge,
  coerceBodiesPage,
  loadBodiesPage,
  saveBodiesPage,
  type BodiesPage,
} from "@/studio/bodies-pages";
import { coerceLookPage } from "@/studio/look-pages";
import { useStudioStore } from "@/studio/store";
import { studioSearch } from "@/studio/url";
import { onTablistKeyDown } from "@/lib/a11y/tablist";

export function BodiesTab() {
  const { t } = useI18n();
  const view = useChartView();
  const chart = useStudioStore((s) => s.chart);
  const selectedId = useStudioStore((s) => s.selectedId);
  const pick = useStudioStore((s) => s.pick);
  const studioPage = useStudioStore((s) => s.page);
  const studioView = useStudioStore((s) => s.view);
  const input = useStudioStore((s) => s.input);
  const setInput = useStudioStore((s) => s.setInput);
  const cast = useStudioStore((s) => s.cast);
  const casting = useStudioStore((s) => s.casting);

  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const urlBodies = coerceBodiesPage(search.bodies);

  const [page, setPageState] = useState<BodiesPage>(() => urlBodies ?? loadBodiesPage());

  useLayoutEffect(() => {
    if (urlBodies && urlBodies !== page) setPageState(urlBodies);
  }, [urlBodies, page]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const setPage = useCallback(
    (next: BodiesPage) => {
      setPageState(next);
      // The new page starts at its top, tabs and all (the old offset left a shorter page scrolled past them).
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      saveBodiesPage(next);
      void navigate({
        to: "/",
        search: studioSearch(studioPage, studioView, undefined, next, coerceLookPage(search.look)),
        replace: true,
      });
    },
    [navigate, studioPage, studioView, search.look],
  );

  const onHouseSystem = useCallback(
    (houseSystem: HouseSystemId) => {
      const next = { ...input, houseSystem };
      setInput(next);
      void cast(next);
    },
    [input, setInput, cast],
  );

  const badgeOpts = useMemo(
    () => ({
      visible: view.visible as Set<string>,
      starVisible: view.starVisible as Set<string>,
      midpointVisible: view.midpointVisible as Set<string>,
      aspectTypes: view.aspectFilter.types as Set<string>,
      overlayOn: view.overlays.on as Set<string>,
    }),
    [
      view.visible,
      view.starVisible,
      view.midpointVisible,
      view.aspectFilter.types,
      view.overlays.on,
    ],
  );

  const tabsRef = useRef<HTMLDivElement>(null);
  useOverflowFade(tabsRef, Boolean(chart));

  if (!chart) {
    return (
      <section data-testid="bodies-empty" className="px-[var(--stage-pad)] py-10">
        <p className="font-display text-2xl leading-none text-fg">{t("bodiesEmpty")}</p>
        <p className="mt-[var(--space-2)] text-sm text-fg-muted">{t("bodiesEmptyHint")}</p>
      </section>
    );
  }

  const mixerPage = bodiesMixerPage(page);
  const showStrip = BODIES_STRIP_PAGES.has(page);
  const houseSystem: HouseSystemId =
    chart.meta.houseSystem ?? input.houseSystem ?? "placidus";

  return (
    <div
      ref={scrollRef}
      data-testid="bodies-tab"
      data-bodies-page={page}
      className="ulune-dock-scroll flex min-h-0 min-w-0 flex-col gap-[var(--space-3)] px-[var(--stage-pad)] py-[var(--space-3)]"
    >
      {/* Stuck to the top of the scrolling panel: switching pages never leaves the pages out of sight. */}
      <div className="ulune-dock-tabs">
        <div
          ref={tabsRef}
          className="ulune-wrap-tabs min-w-0"
          role="tablist"
          aria-label={t("dockBodies")}
          onKeyDown={(e) => onTablistKeyDown(e, true)}
        >
          {BODIES_PAGES.map((id) => {
            const on = page === id;
            const badge = bodiesPageBadge(id, badgeOpts);
            return (
              <button
                key={id}
                type="button"
                role="tab"
                data-testid={`bodies-page-${id}`}
                aria-selected={on}
                tabIndex={on ? 0 : -1}
                onClick={() => setPage(id)}
                className={cn(
                  "inline-flex min-h-[var(--ctl-h)] items-center justify-center gap-1 px-3 text-sm",
                  on
                    ? "ob-subtab-on"
                    : "text-fg-muted",
                )}
              >
                <span>{t(BODIES_PAGE_LABEL[id])}</span>
                {badge ? (
                  <span
                    data-testid={`bodies-badge-${id}`}
                    className="shrink-0 ulune-micro tabular-nums text-fg-subtle"
                  >
                    {badge.on}/{badge.total}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>


      <div className="flex min-h-0 flex-col gap-[var(--space-4)]">
        {page === "angles" ? (
          <div
            data-testid="bodies-house-system"
            className="ulune-section rounded-md border border-border bg-bg-elevated px-3 py-3"
          >
            <label htmlFor="bodies-house-system" className="ulune-kicker text-fg-subtle">
              {t("houseSystem")}
            </label>
            <select
              id="bodies-house-system"
              data-testid="bodies-house-system-select"
              aria-label={t("houseSystem")}
              disabled={casting}
              value={houseSystem}
              onChange={(e) => onHouseSystem(e.target.value as HouseSystemId)}
              className={cn(
                "block h-[var(--btn-h)] w-full min-w-0 rounded-md border border-border-field bg-bg px-3 text-base text-fg md:text-sm",
                "focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-50",
              )}
            >
              {HOUSE_SYSTEM_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(HOUSE_SYSTEM_LABEL[id])}
                </option>
              ))}
            </select>
            <p className="text-xs text-fg-muted">{t(HOUSE_SYSTEM_LABEL[houseSystem])}</p>
          </div>
        ) : null}

        {mixerPage ? (
          <BodyMixer
            page={mixerPage}
            chart={chart}
            visible={view.visible}
            onChange={view.setVisible}
            aspectFilter={view.aspectFilter}
            onAspectFilterChange={view.setAspectFilter}
            overlays={view.overlays}
            onOverlaysChange={view.setOverlays}
            starVisible={view.starVisible}
            onStarVisibleChange={view.setStarVisible}
            midpointVisible={view.midpointVisible}
            onMidpointVisibleChange={view.setMidpointVisible}
            activePreset={view.activePreset}
          />
        ) : null}

        {showStrip ? (
          <PlanetStrip
            chart={chart}
            selectedId={selectedId}
            visible={view.visible}
            onSelect={pick}
          />
        ) : null}
      </div>
    </div>
  );
}
