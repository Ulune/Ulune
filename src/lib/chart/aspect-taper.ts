/**
 * An aspect line's tapered ends. A line lands exactly on its bodies' degrees;
 * over its last `taper` units at each end it narrows in steps to a fine
 * point, so the lines meeting at one body stay apart right up to its dot.
 *
 * The steps used to be six short butt-capped strokes per line; they are now
 * one path per line, each step the rectangle its stroke covered (performance
 * plan 2.1: an aspect was 27 SVG nodes).
 */

export type Pt = { x: number; y: number };

export type Taper = {
  /** The line proper runs between these (the tapered ends take the rest). */
  a: Pt;
  b: Pt;
  /** The steps of both tapered ends, each a short straight piece and the share of the line's width it keeps. */
  steps: { x1: number; y1: number; x2: number; y2: number; k: number }[];
};

/** The steps of a taper, from the line's end inward: [from, to] as fractions of the taper, and the width kept. */
export const TAPER_STEPS: readonly (readonly [number, number, number])[] = [
  [0, 1 / 3, 0.2],
  [1 / 3, 2 / 3, 0.4],
  [2 / 3, 1, 0.64],
];

/** An aspect line from p1 to p2 whose last `taper` units at each end narrow in steps to its bodies' degrees. */
export function taperGeo(p1: Pt, p2: Pt, taper: number): Taper {
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const t = Math.min(taper, len / 4);
  const ux = (p2.x - p1.x) / len;
  const uy = (p2.y - p1.y) / len;
  const from = (end: Pt, dir: number, d: number) => ({ x: end.x + ux * d * dir, y: end.y + uy * d * dir });
  const steps: Taper["steps"] = [];
  for (const [end, dir] of [
    [p1, 1],
    [p2, -1],
  ] as const) {
    for (const [f0, f1, k] of TAPER_STEPS) {
      const q0 = from(end, dir, f0 * t);
      const q1 = from(end, dir, f1 * t);
      steps.push({ x1: q0.x, y1: q0.y, x2: q1.x, y2: q1.y, k });
    }
  }
  return { a: from(p1, 1, t), b: from(p2, -1, t), steps };
}

/** A tapered end's width in px: a share of the line's, never under what still draws. */
export const tipWidth = (w: number, k: number) => Number(Math.max(0.5, w * k).toFixed(2));

const f = (n: number) => String(Math.round(n * 1000) / 1000);

/**
 * Both tapered ends of a line of width `w` as one path (filled in the line's
 * colour): each step is the rectangle a butt-capped stroke of its width
 * covers, so the ends are drawn exactly as the strokes drew them.
 */
export function tipsPath(p1: Pt, p2: Pt, taper: number, w: number): string {
  const { steps } = taperGeo(p1, p2, taper);
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const nx = -(p2.y - p1.y) / len;
  const ny = (p2.x - p1.x) / len;
  let d = "";
  for (const s of steps) {
    const h = tipWidth(w, s.k) / 2;
    const ox = nx * h;
    const oy = ny * h;
    d += `M${f(s.x1 + ox)} ${f(s.y1 + oy)}L${f(s.x2 + ox)} ${f(s.y2 + oy)}L${f(s.x2 - ox)} ${f(s.y2 - oy)}L${f(s.x1 - ox)} ${f(s.y1 - oy)}Z`;
  }
  return d;
}
