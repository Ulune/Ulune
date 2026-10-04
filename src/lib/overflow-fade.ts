import { useEffect, type RefObject } from "react";

/**
 * A row that scrolls sideways (a tab strip) says so (review 3 Oct, C13/T10):
 * `data-fade` is "end", "start" or "both" while there is more to see that
 * way, and absent when all of it shows; the edge it names fades
 * (styles.css, [data-fade]).
 */
/** `ready`: re-attach when the row mounts later (it is not there on an empty panel). */
export function useOverflowFade(ref: RefObject<HTMLElement | null>, ready = true): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mark = () => {
      const more = el.scrollWidth - el.clientWidth;
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft >= more - 1;
      const fade = more <= 1 ? null : atStart ? "end" : atEnd ? "start" : "both";
      if (fade) el.setAttribute("data-fade", fade);
      else el.removeAttribute("data-fade");
    };
    mark();
    el.addEventListener("scroll", mark, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(mark);
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", mark);
      ro?.disconnect();
    };
  }, [ref, ready]);
}
