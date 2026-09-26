/** Shared floating-panel placement (header AI, birth calendar, place list, compose). */

export const POPOVER_PAD = 16;
export const POPOVER_GAP = 8;

export function popoverPlacement(
  trigger: DOMRect,
  opts: { width: number; height?: number; align?: "start" | "end" } = { width: 320 },
): { top: number; left: number; width: number } {
  const width = Math.min(opts.width, window.innerWidth - POPOVER_PAD * 2);
  const maxLeft = window.innerWidth - POPOVER_PAD - width;
  const left =
    opts.align === "end"
      ? Math.max(POPOVER_PAD, Math.min(trigger.right - width, maxLeft))
      : Math.max(POPOVER_PAD, Math.min(trigger.left, maxLeft));
  const estH = opts.height ?? 280;
  const below = trigger.bottom + POPOVER_GAP;
  const above = trigger.top - POPOVER_GAP - estH;
  const top =
    below + Math.min(estH, window.innerHeight * 0.7) > window.innerHeight - POPOVER_PAD && above > POPOVER_PAD
      ? Math.max(POPOVER_PAD, above)
      : Math.max(POPOVER_PAD, below);
  return { top, left, width };
}
