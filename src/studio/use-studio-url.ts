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
import { loadMode, modeReady } from "@/studio/modes/registry";
import { swapTransition } from "@/lib/swap-transition";
import { MODE_GROUPS } from "@/studio/url";

/** Every page in the order of the bars (groups left to right, then their row): a switch comes from the side it moves toward. */
const PAGE_ORDER: StudioPage[] = MODE_GROUPS.flatMap((g) => g.pages as readonly StudioPage[]);
function dirOf(from: StudioPage, to: StudioPage): -1 | 0 | 1 {
  const a = PAGE_ORDER.indexOf(from);
  const b = PAGE_ORDER.indexOf(to);
  return a < 0 || b < 0 || a === b ? 0 : b > a ? 1 : -1;
}
/** A switch waits at most this long for a mode's code, then shows what is there. */
const CODE_WAIT_MS = 250;
/** The latest switch asked for: one still waiting for its code gives way to a later one. */
let switchSeq = 0;

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
      ),
      replace: true,
    });
  }, [urlPage, urlView, navigate, hydrate, search.bodies, search.look]);

  function setPage(next: StudioPage) {
    const view = useStudioStore.getState().view;
    pendingNav.current = { page: next, view };
    saveStudioPage(next);
    const from = useStudioStore.getState().page;
    const seq = ++switchSeq;
    // The bars answer the press at once (their pill starts its glide on the
    // compositor); the page itself is drawn two frames later, so the work of
    // drawing it never holds the press back.
    useStudioStore.getState().setNavPage(from === next ? null : next);
    const go = () => {
      if (seq !== switchSeq) return;
      swapTransition(() => useStudioStore.getState().setPage(next), { part: "figure", dir: dirOf(from, next) });
      navigateTo(next, view);
    };
    const afterPaint = new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    // The switch starts once the mode's code is here (fetched on the press,
    // usually ahead): no empty frame between the two pages.
    if (from === next || modeReady(next)) void afterPaint.then(go);
    else {
      const late = new Promise((r) => window.setTimeout(r, CODE_WAIT_MS));
      void Promise.all([afterPaint, Promise.race([loadMode(next), late])]).then(go, go);
    }
  }

  function navigateTo(next: StudioPage, view: StudioView) {
    void navigate({
      to: "/",
      search: studioSearch(
        next,
        view,
        undefined,
        coerceBodiesPage(search.bodies),
        coerceLookPage(search.look),
      ),
      replace: true,
    });
  }

  function setView(view: StudioView) {
    const page = useStudioStore.getState().page;
    pendingNav.current = { page, view };
    saveStudioView(view);
    const from = useStudioStore.getState().view;
    swapTransition(() => useStudioStore.getState().setView(view), {
      part: "figure",
      dir: from === view ? 0 : view === "table" ? 1 : -1,
    });
    void navigate({
      to: "/",
      search: studioSearch(
        page,
        view,
        undefined,
        coerceBodiesPage(search.bodies),
        coerceLookPage(search.look),
      ),
      replace: true,
    });
  }

  return { setPage, setView };
}
