import { useEffect, useRef } from "react";

/**
 * `setInterval` that sleeps while the tab is hidden. When the tab shows again
 * and a tick was missed, it runs once to catch up, then keeps its rhythm.
 * The live sky and the Timing clock used to refetch and redraw every minute
 * in background tabs.
 */
export function useVisibleInterval(callback: () => void, ms: number, enabled = true) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    let id: number | undefined;
    let last = Date.now();
    const run = () => {
      last = Date.now();
      saved.current();
    };
    const start = () => {
      if (id == null) id = window.setInterval(run, ms);
    };
    const stop = () => {
      if (id != null) window.clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        stop();
        return;
      }
      if (Date.now() - last >= ms) run();
      start();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ms, enabled]);
}
