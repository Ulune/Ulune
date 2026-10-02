/**
 * An aspect line's tapered ends. A line lands exactly on its bodies' degrees;
 * over its last `taper` units at each end it narrows smoothly to a point
 * (part 87: one wedge per end, no steps), so the lines meeting at one body
 * stay apart right up to its dot.
 *
 * The line is a stroke whose width is in screen px (non-scaling); the wedges
 * are filled shapes in the wheel's units, so they are cut for the px a unit
 * covers (`k`, units per px: wheel-focus.ts measures it), meeting the line at
 * exactly its width. Each wedge reaches a little back under the line: the two
 * are drawn as one piece (their group carries the opacity), so the overlap
 * never shows and no seam opens between them.
 */

export type Pt = { x: number; y: number };

export type Taper = {
  /** The line proper runs between these (the tapered ends take the rest). */
  a: Pt;
  b: Pt;
};

/** How far a wedge reaches back under its line (units): hides the seam where they meet. */
export const TAPER_OVERLAP = 1.5;

/** An aspect line from p1 to p2 whose last `taper` units at each end narrow to its bodies' degrees. */
export function taperGeo(p1: Pt, p2: Pt, taper: number): Taper {
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const t = Math.min(taper, len / 4);
  const ux = (p2.x - p1.x) / len;
  const uy = (p2.y - p1.y) / len;
  return { a: { x: p1.x + ux * t, y: p1.y + uy * t }, b: { x: p2.x - ux * t, y: p2.y - uy * t } };
}

const f = (n: number) => String(Math.round(n * 1000) / 1000);

/**
 * Both tapered ends of a line `w` px wide, as one path filled in the line's
 * colour: from the line's full width where it stops to a point on each
 * body's degree. `k` is the wheel's units per screen px.
 */
export function tipsPath(p1: Pt, p2: Pt, taper: number, w: number, k = 1): string {
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const t = Math.min(taper, len / 4);
  const ux = (p2.x - p1.x) / len;
  const uy = (p2.y - p1.y) / len;
  const h = (Math.max(0.5, w) * k) / 2;
  const ox = -uy * h;
  const oy = ux * h;
  const back = Math.min(TAPER_OVERLAP, Math.max(0, len / 2 - t));
  let d = "";
  for (const [end, dir] of [
    [p1, 1],
    [p2, -1],
  ] as const) {
    // Where the line stops, and a little back under it.
    const jx = end.x + ux * t * dir;
    const jy = end.y + uy * t * dir;
    const bx = jx + ux * back * dir;
    const by = jy + uy * back * dir;
    d += `M${f(end.x)} ${f(end.y)}L${f(jx + ox)} ${f(jy + oy)}L${f(bx + ox)} ${f(by + oy)}L${f(bx - ox)} ${f(by - oy)}L${f(jx - ox)} ${f(jy - oy)}Z`;
  }
  return d;
}
