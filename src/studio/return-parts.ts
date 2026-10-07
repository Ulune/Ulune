/*
 * Back to the same place (page reorganisation plan, R6; the encyclopedia
 * plan's part 6): the parts' side. Leaving the studio for a page outside it
 * (an encyclopedia page, Settings, the guide) takes the studio off the page.
 * Its store keeps the chart, the language, the lens and sub-mode, the view,
 * the panel and the pin; what the parts hold themselves (the figure's zoom,
 * the 3D camera, where the stage, the panel and a table were scrolled, the
 * Calendar's day and scope, the phone's sheet) is kept here as they go, and
 * given back when the studio comes back to the same page, view and chart,
 * whichever way the reader returns (the browser's Back, "Back to your chart",
 * the Charts section, the mark). Memory only, for the tab: nothing is written
 * to the device. Nothing here reads the studio's store (the figures use it
 * outside the studio too): the studio says where it is (return-memory.ts).
 */
import { useLayoutEffect, useRef, type RefObject } from "react";
import { isStudioPath } from "@/studio/map";

/** Where the studio is (its page, view and chart), told by the studio itself. */
let placeOf: () => string = () => "";
export function setPlaceSource(fn: () => string): void {
  placeOf = fn;
}
const here = () => placeOf();

/** What each part held last, and the place it held it in. */
const parts = new Map<string, { key: string; value: unknown }>();
/** The place the studio was left from: set while it is away, and while its return is under way. */
let left: string | null = null;

/** The return is over (the reader did something, the place changed): what was kept is let go. */
export function endReturn(): void {
  left = null;
  parts.clear();
}

/** The studio is taken off the page from here: what its parts keep now waits for its return. */
export function leaveStudio(): string {
  left = here();
  return left;
}

/** The place the studio was left from, while it is away or coming back (else null). */
export function returnPlace(): string | null {
  return left;
}

/** A part keeps its state as it goes (the studio left, or the part replaced). */
export function keepPart(id: string, value: unknown): void {
  parts.set(id, { key: here(), value });
}

/** The studio is coming back to the place it was left from (its parts take back what they kept). */
export function isReturning(): boolean {
  return left !== null && here() === left;
}

/** The state a part kept, when the studio comes back to the place it was left from (else undefined). */
export function keptPart<T>(id: string): T | undefined {
  if (left === null || here() !== left) return undefined;
  const kept = parts.get(id);
  return kept && kept.key === left ? (kept.value as T) : undefined;
}

/** A part's kept state on the studio's return, else `initial` (for a useState initializer). */
export function keptOr<T>(id: string, initial: T | (() => T)): T {
  const kept = keptPart<T>(id);
  if (kept !== undefined) return kept;
  return typeof initial === "function" ? (initial as () => T)() : initial;
}

/** Keeps a part's state for the studio's return, as the part goes: `useState(() => keptOr(id, …))` gives it back. */
export function useKeep(id: string, value: unknown): void {
  const latest = useRef(value);
  latest.current = value;
  useLayoutEffect(() => () => keepPart(id, latest.current), [id]);
}

const INPUTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * Scrolls `el` back to `top` once its content is tall enough (a reading's
 * text, a table's code, a month's days may come a moment later), then holds
 * it there a moment while the page settles (a bar moving into the toolbar
 * shifts what is above), unless the reader scrolls or presses first. `onEnd`
 * hears when it is done either way; the returned stop cancels it quietly.
 */
export function scrollBack(el: HTMLElement, top: number, onEnd?: () => void): () => void {
  let frame = 0;
  const start = performance.now();
  let reached = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    for (const type of INPUTS) el.removeEventListener(type, taken);
  };
  const taken = () => {
    stop();
    onEnd?.();
  };
  const step = () => {
    frame = 0;
    const now = performance.now();
    const room = el.scrollHeight - el.clientHeight;
    if (!reached && (room >= top - 1 || now - start > 4000)) reached = now;
    if (reached) {
      if (Math.abs(el.scrollTop - Math.min(top, room)) > 1) el.scrollTop = top;
      if (now - reached > 600) {
        taken();
        return;
      }
    }
    frame = requestAnimationFrame(step);
  };
  for (const type of INPUTS) el.addEventListener(type, taken, { passive: true });
  step();
  return stop;
}

/**
 * A scroller that comes back where it was. With `resetOn`, it starts at its
 * top each time that changes (a new mode, view or scope), as before. A
 * position still on its way back is the one kept, should the part go first
 * (React's development mode mounts everything twice).
 */
export function useKeptScroll(ref: RefObject<HTMLElement | null>, id: string, resetOn?: unknown): void {
  const box = useRef<{ el: HTMLElement | null; key: unknown; pending: number | null }>({ el: null, key: undefined, pending: null });
  useLayoutEffect(() => {
    const el = ref.current;
    const k = box.current;
    if (!el) return;
    const changed = k.el === el && !Object.is(k.key, resetOn);
    k.el = el;
    k.key = resetOn;
    if (changed) {
      k.pending = null;
      el.scrollTop = 0;
      return;
    }
    const top = keptPart<number>(id);
    if (!top) return;
    k.pending = top;
    return scrollBack(el, top, () => {
      k.pending = null;
    });
  }, [ref, id, resetOn]);
  useLayoutEffect(() => {
    const k = box.current;
    return () => {
      if (k.el) keepPart(id, k.pending ?? k.el.scrollTop);
    };
  }, [id]);
}

/*
 * The pin. A press off the chart lets go of it (chart-wheel.tsx). A press on
 * a control (the search, a menu, the language button) may be the way out of
 * the studio: the pin let go there is noted, and comes back with the studio
 * when nothing else happened in it before it was left. A press on the page's
 * ground is a choice to let go, and stays one.
 */
let letGo: { id: string; key: string } | null = null;

export function notePinLetGo(id: string): void {
  letGo = { id, key: here() };
}

/** The note of a pin let go on the way out, for the studio to check (or drop) as things change. */
export function pinLetGo(): { id: string; key: string } | null {
  return letGo;
}
export function dropPinLetGo(): void {
  letGo = null;
}

/** A link from the studio to a page outside it (an encyclopedia page, Settings, the guide). */
export function leavesStudio(node: Element): boolean {
  const a = node.closest("a[href]");
  if (!(a instanceof HTMLAnchorElement)) return false;
  try {
    const url = new URL(a.href, window.location.href);
    return url.origin === window.location.origin && !isStudioPath(url.pathname);
  } catch {
    return false;
  }
}
