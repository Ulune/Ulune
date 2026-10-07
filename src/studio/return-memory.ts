/*
 * Back to the same place (page reorganisation plan, R6): the studio's side.
 * It tells the parts where it is (return-parts.ts), keeps what they hold as it
 * leaves the page, gives it back when it returns to the same place (the pin
 * included), and publishes where it is for the pages outside it ("Back to your
 * chart", return-target.ts).
 */
import { useLayoutEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isStudioPath } from "@/studio/map";
import { dropPinLetGo, endReturn, keepPart, keptPart, leaveStudio, pinLetGo, returnPlace, setPlaceSource } from "@/studio/return-parts";
import { historyIndex, setStudioReturn } from "@/studio/return-target";
import { useStudioStore } from "@/studio/store";

type Place = { page: string; view: string; activeId: string | null };
const placeKey = (s: Place) => `${s.page}|${s.view}|${s.activeId ?? ""}`;
setPlaceSource(() => placeKey(useStudioStore.getState()));

const INPUTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * Where the studio is, published for the pages outside it ("Back to your
 * chart", return-target.ts) before the reader leaves: those pages are drawn
 * before the studio is taken down. In a component of its own, so the studio
 * is not drawn again at each change of address.
 */
export function StudioReturnTracker(): null {
  const loc = useRouterState({ select: (s) => s.location });
  useLayoutEffect(() => {
    if (!isStudioPath(loc.pathname)) return;
    const index = historyIndex();
    const publish = () => {
      const s = useStudioStore.getState();
      setStudioReturn({ href: loc.href, index, calendar: s.page === "timing", chart: Boolean(s.chart) });
    };
    publish();
    return useStudioStore.subscribe(publish);
  }, [loc.href, loc.pathname]);
  return null;
}

/**
 * The studio's side of the return, in its layout (studio-page.tsx): what it
 * holds is kept as it leaves the page, and given back when it comes back to
 * the same place, until the reader does anything (a press, a key, a scroll)
 * or the place changes.
 */
export function useStudioReturn(): void {
  useLayoutEffect(() => {
    const from = returnPlace();
    if (from !== null && placeKey(useStudioStore.getState()) !== from) endReturn();
    // The pin, as it was when the studio was left.
    const pin = keptPart<string>("pin");
    if (typeof pin === "string" && !useStudioStore.getState().selectedId) useStudioStore.setState({ selectedId: pin });
    dropPinLetGo();
    const over = () => {
      if (returnPlace() !== null) endReturn();
    };
    const opts = { capture: true, passive: true } as const;
    for (const type of INPUTS) window.addEventListener(type, over, opts);
    const unsubscribe = useStudioStore.subscribe((s, prev) => {
      const key = placeKey(s);
      const away = returnPlace();
      if (away !== null && key !== away) endReturn();
      // Anything else done in the studio: a pin let go on the way stays let go.
      const note = pinLetGo();
      if (note && (s.selectedId || key !== note.key || s.creating !== prev.creating || s.chart !== prev.chart)) dropPinLetGo();
    });
    return () => {
      for (const type of INPUTS) window.removeEventListener(type, over, opts);
      unsubscribe();
      const at = leaveStudio();
      const note = pinLetGo();
      if (!useStudioStore.getState().selectedId && note?.key === at) keepPart("pin", note.id);
      dropPinLetGo();
    };
  }, []);
}
