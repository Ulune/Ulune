import { useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useStudioStore } from "@/studio/store";
import {
  isStudioPage,
  isStudioView,
  loadStudioPage,
  loadStudioView,
  saveStudioPage,
  saveStudioView,
  studioSearch,
  type StudioPage,
  type StudioView,
} from "@/studio/url";
import { coerceBodiesPage } from "@/studio/bodies-pages";
import { coerceLookPage } from "@/studio/look-pages";
import { coerceNumerologyPage } from "@/studio/numerology-pages";

/** Shared across hook instances so StageControls setView isn’t clobbered by Shell hydrate. */
const pendingNav: { current: { page: StudioPage; view: StudioView } | null } = {
  current: null,
};

export function useStudioUrl(opts?: { hydrate?: boolean }) {
  const hydrate = opts?.hydrate !== false;
  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  const urlPage = isStudioPage(search.studio) ? search.studio : undefined;
  const urlView = isStudioView(search.view) ? search.view : undefined;
  const hydrated = useRef(false);

  useLayoutEffect(() => {
    if (!hydrate) return;
    const pending = pendingNav.current;
    if (pending) {
      const caughtUp =
        (urlPage ?? "natal") === pending.page && (urlView ?? pending.view) === pending.view;
      if (!caughtUp) {
        const s = useStudioStore.getState();
        if (s.page !== pending.page) s.setPage(pending.page);
        if (s.view !== pending.view) s.setView(pending.view);
        return;
      }
      pendingNav.current = null;
    }
    const s = useStudioStore.getState();
    const page = urlPage ?? (hydrated.current ? s.page : loadStudioPage());
    const view = urlView ?? (hydrated.current ? s.view : loadStudioView());
    if (s.page !== page) s.setPage(page);
    if (s.view !== view) s.setView(view);
  }, [urlPage, urlView, hydrate]);

  useEffect(() => {
    if (!hydrate) return;
    const pending = pendingNav.current;
    const urlCaughtUp =
      pending == null ||
      ((urlPage ?? "natal") === pending.page && (urlView ?? pending.view) === pending.view);
    if (pending && !urlCaughtUp) return;
    if (pending && urlCaughtUp) pendingNav.current = null;

    if (urlPage) {
      saveStudioPage(urlPage);
      if (urlView) saveStudioView(urlView);
      hydrated.current = true;
      return;
    }
    if (hydrated.current) return;
    hydrated.current = true;
    const local = loadStudioPage();
    const view = urlView ?? loadStudioView();
    if (local === "natal" && view === "wheel") return;
    pendingNav.current = { page: local, view };
    void navigate({
      to: "/",
      search: studioSearch(
        local,
        view,
        undefined,
        coerceBodiesPage(search.bodies),
        coerceLookPage(search.look),
        coerceNumerologyPage(search.num) ?? search.num,
        search.numa,
        search.numb,
      ),
      replace: true,
    });
  }, [urlPage, urlView, navigate, hydrate, search.bodies, search.look, search.num, search.numa, search.numb]);

  function setPage(next: StudioPage) {
    const view = useStudioStore.getState().view;
    pendingNav.current = { page: next, view };
    saveStudioPage(next);
    useStudioStore.getState().setPage(next);
    void navigate({
      to: "/",
      search: studioSearch(
        next,
        view,
        undefined,
        coerceBodiesPage(search.bodies),
        coerceLookPage(search.look),
        coerceNumerologyPage(search.num) ?? search.num,
        search.numa,
        search.numb,
      ),
      replace: true,
    });
  }

  function setView(view: StudioView) {
    const page = useStudioStore.getState().page;
    pendingNav.current = { page, view };
    saveStudioView(view);
    useStudioStore.getState().setView(view);
    void navigate({
      to: "/",
      search: studioSearch(
        page,
        view,
        undefined,
        coerceBodiesPage(search.bodies),
        coerceLookPage(search.look),
        coerceNumerologyPage(search.num) ?? search.num,
        search.numa,
        search.numb,
      ),
      replace: true,
    });
  }

  return { setPage, setView };
}
