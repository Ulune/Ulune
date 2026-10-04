import { useOverflowFade } from "@/lib/overflow-fade";
import { useCallback, useLayoutEffect, useState, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { LookPanel } from "@/components/look-panel";
import { LookProfiles } from "@/components/look-profiles";
import { useLook } from "@/lib/look-provider";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import {
  LOOK_PAGE_LABEL,
  LOOK_PAGE_TEACH,
  LOOK_PAGES,
  coerceLookPage,
  loadLookPage,
  lookPanelPage,
  saveLookPage,
  type LookPage,
} from "@/studio/look-pages";
import { coerceBodiesPage } from "@/studio/bodies-pages";
import { useStudioStore } from "@/studio/store";
import { studioSearch } from "@/studio/url";
import { onTablistKeyDown } from "@/lib/a11y/tablist";

export function LookTab() {
  const { t } = useI18n();
  const { resetLook } = useLook();
  const studioPage = useStudioStore((s) => s.page);
  const studioView = useStudioStore((s) => s.view);

  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const urlLook = coerceLookPage(search.look);

  const [page, setPageState] = useState<LookPage>(() => urlLook ?? loadLookPage());

  useLayoutEffect(() => {
    if (urlLook && urlLook !== page) setPageState(urlLook);
  }, [urlLook, page]);

  const setPage = useCallback(
    (next: LookPage) => {
      setPageState(next);
      saveLookPage(next);
      void navigate({
        to: "/",
        search: studioSearch(
          studioPage,
          studioView,
          undefined,
          coerceBodiesPage(search.bodies),
          next,
        ),
        replace: true,
      });
    },
    [navigate, studioPage, studioView, search.bodies],
  );

  const panelPage = lookPanelPage(page);

  const tabsRef = useRef<HTMLDivElement>(null);
  useOverflowFade(tabsRef);
  return (
    <div
      data-testid="look-tab"
      data-look-page={page}
      className="ulune-dock-scroll flex min-h-0 min-w-0 flex-col gap-[var(--space-3)] px-[var(--stage-pad)] py-[var(--space-3)]"
    >
      <div
        ref={tabsRef}
        className="ulune-wrap-tabs min-w-0"
        role="tablist"
        aria-label={t("dockLook")}
        onKeyDown={(e) => onTablistKeyDown(e, true)}
      >
        {LOOK_PAGES.map((id) => {
          const on = page === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              data-testid={`look-page-${id}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setPage(id)}
              className={cn(
                "inline-flex min-h-11 items-center justify-center px-3 text-sm",
                on
                  ? "ob-subtab-on"
                  : "text-fg-muted",
              )}
            >
              <span>{t(LOOK_PAGE_LABEL[id])}</span>
            </button>
          );
        })}
      </div>

      <header className="flex flex-col gap-1">
        <h3 className="font-display text-lg leading-none text-fg">{t(LOOK_PAGE_LABEL[page])}</h3>
        <p data-testid="look-teach" className="text-sm text-fg-muted">
          {t(LOOK_PAGE_TEACH[page])}
        </p>
      </header>

      <div className="flex min-h-0 flex-col gap-[var(--space-4)]">
        {page === "profiles" ? (
          <>
            <LookProfiles />
            <div className="border-t border-border pt-[var(--space-3)]">
              <button
                type="button"
                data-look-reset
                onClick={resetLook}
                className="inline-flex min-h-11 items-center ulune-chip-radius border border-border px-2.5 text-xs text-fg-muted hover:border-border-strong hover:text-fg"
              >
                {t("lookReset")}
              </button>
              <p className="mt-2 text-xs text-fg-muted">{t("lookResetHint")}</p>
            </div>
          </>
        ) : null}

        {panelPage ? <LookPanel page={panelPage} /> : null}
      </div>
    </div>
  );
}
