/** Shared floating-panel placement (header AI, birth calendar, place list, compose). */

export const POPOVER_PAD = 16;
export const POPOVER_GAP = 8;
/** The least a panel may be squeezed to when the screen has little room (about two rows). */
const MIN_HEIGHT = 96;

/** The part of the page the reader sees, in the coordinates `position: fixed` uses (the layout viewport's). */
export type PopoverView = { top: number; left: number; width: number; height: number };

/**
 * What of the page is in view. On a phone with its keyboard up, the layout
 * viewport still reaches under the keyboard and the page may be scrolled
 * inside it: only the visual viewport says where the reader's screen is.
 */
export function visibleArea(): PopoverView {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) return { top: vv.offsetTop, left: vv.offsetLeft, width: vv.width, height: vv.height };
  return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
}

let probe: HTMLElement | null = null;

/**
 * Where `position: fixed`'s top left corner is, in the coordinates
 * `getBoundingClientRect` and `elementFromPoint` use. Chromium measures both
 * from the layout viewport (0, 0 here); Safari measures rects from the visual
 * viewport, so on an iPhone with its keyboard up and the page panned, a rect
 * is that pan higher than a fixed panel placed at its numbers (2.0.2: the
 * place list stood over the field it belonged under). Read from a fixed,
 * empty, invisible element, so no browser is guessed by its name.
 */
export function layoutOrigin(): { x: number; y: number } {
  if (typeof document === "undefined" || !document.body) return { x: 0, y: 0 };
  if (!probe || !probe.isConnected) {
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.dataset.uluneOrigin = "";
    probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;contain:strict";
    document.body.appendChild(probe);
  }
  const r = probe.getBoundingClientRect();
  return { x: r.left, y: r.top };
}

/** What of the page is in view, in `getBoundingClientRect`'s coordinates (see layoutOrigin). */
export function visibleClientArea(): PopoverView {
  const view = visibleArea();
  const o = layoutOrigin();
  return { ...view, top: view.top + o.y, left: view.left + o.x };
}

/** A rect from `getBoundingClientRect`, in the coordinates `position: fixed` uses. */
function toLayout(rect: DOMRect): DOMRect {
  const o = layoutOrigin();
  if (o.x === 0 && o.y === 0) return rect;
  return new DOMRect(rect.left - o.x, rect.top - o.y, rect.width, rect.height);
}

export type PopoverPlacement = {
  top: number;
  left: number;
  width: number;
  /** The tallest it may be where it stands: the room it has, so it never runs off the visible screen. */
  maxHeight: number;
  /** It stands over its trigger, not under it. */
  above: boolean;
};

export function popoverPlacement(
  trigger: DOMRect,
  opts: {
    width: number;
    height?: number;
    align?: "start" | "end";
    view?: PopoverView;
    /**
     * A list following a field being typed in stays under it whenever this
     * much room is there (a few rows), even if its whole height is not: read
     * from its top, under the letters typed, the best match comes first. On a
     * phone with its keyboard up, a list turned over the field ran off the
     * top of the screen, its best match first to go.
     */
    minBelow?: number;
  } = { width: 320 },
): PopoverPlacement {
  // Measured live (no view given), the trigger's rect is turned into fixed positioning's coordinates.
  const view = opts.view ?? visibleArea();
  if (!opts.view) trigger = toLayout(trigger);
  const pad = view.width < 480 ? 8 : POPOVER_PAD;
  const width = Math.max(120, Math.min(opts.width, view.width - pad * 2));
  const maxLeft = view.left + view.width - pad - width;
  const minLeft = view.left + pad;
  const left =
    opts.align === "end"
      ? Math.max(minLeft, Math.min(trigger.right - width, maxLeft))
      : Math.max(minLeft, Math.min(trigger.left, maxLeft));
  // What it would like: its own height, within most of the screen.
  const want = Math.min(opts.height ?? 280, view.height * 0.7);
  const roomBelow = view.top + view.height - trigger.bottom - POPOVER_GAP - pad;
  const roomAbove = trigger.top - view.top - POPOVER_GAP - pad;
  // Under the trigger unless it does not fit there and there is more room over it.
  const fitsBelow = roomBelow >= (opts.minBelow !== undefined ? Math.min(want, opts.minBelow) : want);
  const above = !fitsBelow && roomAbove > roomBelow;
  const room = above ? roomAbove : roomBelow;
  const maxHeight = Math.max(MIN_HEIGHT, Math.min(view.height * 0.7, room));
  const height = Math.min(want, maxHeight);
  const top = above ? Math.max(view.top + pad, trigger.top - POPOVER_GAP - height) : trigger.bottom + POPOVER_GAP;
  return { top, left, width, maxHeight, above };
}
