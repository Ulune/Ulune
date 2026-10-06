/** Where the aspect grid stands beside the wheel (wheel-aspect-grid.tsx draws it). Pure geometry. */
import type { AsideRoom } from "./wheel-zoom";

/** The smallest a cell is (WCAG 2.2 target size: every cell is a button): a grid that cannot have such cells is not drawn. */
const CELL_MIN = 24;
/** The biggest a cell grows (a very wide stage does not make the grid a second chart). */
const CELL_MAX = 26;
/** Clear space kept between the grid and the wheel, the zoom bar and the stage's edge, px. */
const GAP = 12;

export type Placed = { cell: number; left: number; top: number; size: number };

/**
 * The biggest grid that fits, and where: the stage's top-right corner, its staircase facing the
 * wheel and tucked against the disc's curve as near as the gap allows (the corner is empty: the
 * zoom bar and the legend stand at the foot). One cell size for the whole grid (CELL_MAX down to
 * CELL_MIN); where none fits, none is drawn.
 */
export function placeGrid(n: number, room: Pick<AsideRoom, "top" | "right" | "bottom" | "maxSize" | "circle" | "bar">): Placed | null {
  const { cx, cy, r } = room.circle;
  const need = r + GAP;
  for (let cell = CELL_MAX; cell >= CELL_MIN; cell--) {
    const size = n * cell + (n - 1);
    if (size > room.maxSize || size > room.bottom - room.top) continue;
    const step = cell + 1;
    const top = room.top;
    // Only the cells that exist can touch the disc: row i holds its columns i…n−1, and the first
    // of them is the row's nearest to the centre (the grid starts right of it).
    const clear = (left: number) => {
      for (let i = 0; i < n; i++) {
        const y0 = top + i * step;
        const dx = left + i * step - cx;
        const dy = Math.max(y0 - cy, 0, cy - (y0 + cell));
        if (Math.hypot(Math.max(dx, 0), dy) < need) return false;
      }
      return true;
    };
    let left = Math.ceil(cx);
    const rightMost = room.right - size;
    while (left <= rightMost && !clear(left)) left += 2;
    if (left > rightMost) continue;
    const bar = room.bar;
    if (bar && top + size > bar.t - GAP / 2 && left < bar.r + GAP / 2 && left + size > bar.l - GAP / 2) continue;
    return { cell, left, top, size };
  }
  return null;
}

