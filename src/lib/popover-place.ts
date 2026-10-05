/** Shared floating-panel placement (header AI, birth calendar, place list, compose). */

export const POPOVER_PAD = 16;
export const POPOVER_GAP = 8;
/** The least a panel may be squeezed to when the screen has little room (about two rows). */
const MIN_HEIGHT = 96;

/** The part of the page the reader sees, in the page's own coordinates (what `getBoundingClientRect` and `position: fixed` use). */
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
  opts: { width: number; height?: number; align?: "start" | "end"; view?: PopoverView } = { width: 320 },
): PopoverPlacement {
  const view = opts.view ?? visibleArea();
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
  const above = roomBelow < want && roomAbove > roomBelow;
  const room = above ? roomAbove : roomBelow;
  const maxHeight = Math.max(MIN_HEIGHT, Math.min(view.height * 0.7, room));
  const height = Math.min(want, maxHeight);
  const top = above ? Math.max(view.top + pad, trigger.top - POPOVER_GAP - height) : trigger.bottom + POPOVER_GAP;
  return { top, left, width, maxHeight, above };
}
