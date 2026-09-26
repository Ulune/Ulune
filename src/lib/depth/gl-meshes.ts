/**
 * Geometry for the wheel's 3D view (WebGL): real solids, built in chart
 * units from the wheel's own polar layout — sectors of the zodiac, the houses
 * and the decans as prisms, rings as annular solids, and one canonical tube
 * (a capsule swept along a curve in the vertex shader).
 *
 * Vertex formats (Float32, non-indexed triangles):
 *  - top:   x, y, zSel                      (zSel 1 = the top face)
 *  - wall:  x, y, zSel, nx, ny, nz, r, g, b (zSel 0 = bottom, 1 = top)
 *  - tube:  u, cosθ, sinθ, s                (u along the curve 0..1; s the cap
 *                                            offset −1..1 along the tangent)
 * Heights are uniforms (z0 at zSel 0, z1 at zSel 1), so a block rises
 * without rebuilding anything.
 */

export type Polar = { cx: number; cy: number; asc: number };
export type RGB = [number, number, number];

/** The wheel's own mapping (chart-wheel.tsx `polar`): Ascendant on the left, signs counter-clockwise. */
export function polarXY(p: Polar, ecliptic: number, r: number): [number, number] {
  const ccw = ((((ecliptic - p.asc) % 360) + 360) % 360) * (Math.PI / 180);
  return [p.cx - r * Math.cos(ccw), p.cy + r * Math.sin(ccw)];
}

/** Unit direction of increasing longitude at `ecliptic` (screen axes, y down). */
function along(p: Polar, ecliptic: number): [number, number] {
  const ccw = ((((ecliptic - p.asc) % 360) + 360) % 360) * (Math.PI / 180);
  return [Math.sin(ccw), Math.cos(ccw)];
}

function spanOf(ecl0: number, ecl1: number): number {
  const s = (((ecl1 - ecl0) % 360) + 360) % 360;
  return s < 1e-9 ? 360 : s;
}

function steps(span: number, stepDeg: number): number {
  return Math.max(1, Math.ceil(span / stepDeg));
}

export type SectorWalls = { outer?: RGB | null; inner?: RGB | null; sides?: RGB | null };

/** The top face of an annular sector (a full ring when the span is 360°). */
export function sectorTop(p: Polar, ecl0: number, ecl1: number, r0: number, r1: number, stepDeg = 2): Float32Array {
  const span = spanOf(ecl0, ecl1);
  const n = steps(span, stepDeg);
  const out = new Float32Array(n * 6 * 3);
  let o = 0;
  const put = (x: number, y: number) => {
    out[o++] = x;
    out[o++] = y;
    out[o++] = 1;
  };
  for (let i = 0; i < n; i += 1) {
    const a = ecl0 + (span * i) / n;
    const b = ecl0 + (span * (i + 1)) / n;
    const ia = polarXY(p, a, r0);
    const oa = polarXY(p, a, r1);
    const ib = polarXY(p, b, r0);
    const ob = polarXY(p, b, r1);
    put(...ia);
    put(...oa);
    put(...ob);
    put(...ia);
    put(...ob);
    put(...ib);
  }
  return out;
}

/**
 * The walls of an annular sector prism: the outer arc facing out, the inner
 * arc facing the centre, the two radial sides (not for a full ring). Each wall
 * carries its own colour; a null colour leaves that wall out.
 */
export function sectorWalls(p: Polar, ecl0: number, ecl1: number, r0: number, r1: number, walls: SectorWalls, stepDeg = 2): Float32Array {
  const span = spanOf(ecl0, ecl1);
  const n = steps(span, stepDeg);
  const full = span >= 359.999;
  const quads: number[] = [];
  // A vertical quad from (a) to (b) at the bottom and top, normal (nx, ny, 0).
  const quad = (a: [number, number], b: [number, number], na: [number, number], nb: [number, number], c: RGB) => {
    const v = (q: [number, number], z: number, nn: [number, number]) => quads.push(q[0], q[1], z, nn[0], nn[1], 0, c[0], c[1], c[2]);
    v(a, 0, na);
    v(b, 0, nb);
    v(b, 1, nb);
    v(a, 0, na);
    v(b, 1, nb);
    v(a, 1, na);
  };
  const radial = (ecl: number, sign: number): [number, number] => {
    const [x, y] = polarXY(p, ecl, 1);
    return [sign * (x - p.cx), sign * (y - p.cy)];
  };
  for (let i = 0; i < n; i += 1) {
    const a = ecl0 + (span * i) / n;
    const b = ecl0 + (span * (i + 1)) / n;
    if (walls.outer) quad(polarXY(p, a, r1), polarXY(p, b, r1), radial(a, 1), radial(b, 1), walls.outer);
    if (walls.inner && r0 > 0) quad(polarXY(p, a, r0), polarXY(p, b, r0), radial(a, -1), radial(b, -1), walls.inner);
  }
  if (!full && walls.sides) {
    const t0 = along(p, ecl0);
    const n0: [number, number] = [-t0[0], -t0[1]];
    quad(polarXY(p, ecl0, r0), polarXY(p, ecl0, r1), n0, n0, walls.sides);
    const n1 = along(p, ecl0 + span);
    quad(polarXY(p, ecl0 + span, r0), polarXY(p, ecl0 + span, r1), n1, n1, walls.sides);
  }
  return new Float32Array(quads);
}

/** A flat rectangle in the chart plane (for the plate picture), zSel 0. */
export function rectTop(x: number, y: number, w: number, h: number): Float32Array {
  return new Float32Array([x, y, 0, x + w, y, 0, x + w, y + h, 0, x, y, 0, x + w, y + h, 0, x, y + h, 0]);
}

/** Point on a quadratic Bézier and its (unnormalised) tangent. */
export function bezier(a: ArrayLike<number>, c: ArrayLike<number>, b: ArrayLike<number>, u: number): { p: number[]; t: number[] } {
  const v = 1 - u;
  const p = [0, 1, 2].map((i) => v * v * a[i] + 2 * u * v * c[i] + u * u * b[i]);
  const t = [0, 1, 2].map((i) => 2 * v * (c[i] - a[i]) + 2 * u * (b[i] - c[i]));
  return { p, t };
}

/** Length of a quadratic Bézier (sampled). */
export function bezierLength(a: ArrayLike<number>, c: ArrayLike<number>, b: ArrayLike<number>, n = 16): number {
  let len = 0;
  let prev = a;
  for (let i = 1; i <= n; i += 1) {
    const { p } = bezier(a, c, b, i / n);
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
    prev = p;
  }
  return len;
}

/**
 * `Math.hypot` of two or three numbers without its argument array (V8 builds
 * one on every call, a frame's worth of garbage in the 3D view): the same
 * algorithm as V8's (Kahan sum of the squares, scaled by the largest), so the
 * same bits in Chrome; in other engines within a rounding of their own.
 */
export function hypot2(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  const nan = Number.isNaN(a) || Number.isNaN(b);
  let max = 0;
  if (a > max) max = a;
  if (b > max) max = b;
  if (max === Infinity) return Infinity;
  if (nan) return Number.NaN;
  if (max === 0) return 0;
  let sum = 0;
  let comp = 0;
  let n = a / max;
  let s = n * n - comp;
  let p = sum + s;
  comp = p - sum - s;
  sum = p;
  n = b / max;
  s = n * n - comp;
  p = sum + s;
  sum = p;
  return Math.sqrt(sum) * max;
}

export function hypot3(a: number, b: number, c: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  c = Math.abs(c);
  const nan = Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c);
  let max = 0;
  if (a > max) max = a;
  if (b > max) max = b;
  if (c > max) max = c;
  if (max === Infinity) return Infinity;
  if (nan) return Number.NaN;
  if (max === 0) return 0;
  let sum = 0;
  let comp = 0;
  let n = a / max;
  let s = n * n - comp;
  let p = sum + s;
  comp = p - sum - s;
  sum = p;
  n = b / max;
  s = n * n - comp;
  p = sum + s;
  comp = p - sum - s;
  sum = p;
  n = c / max;
  s = n * n - comp;
  p = sum + s;
  sum = p;
  return Math.sqrt(sum) * max;
}

/** Point on a quadratic Bézier into `out` (nothing allocated; the same arithmetic as `bezier`). */
export function bezierInto(a: ArrayLike<number>, c: ArrayLike<number>, b: ArrayLike<number>, u: number, out: Float64Array) {
  const v = 1 - u;
  out[0] = v * v * a[0] + 2 * u * v * c[0] + u * u * b[0];
  out[1] = v * v * a[1] + 2 * u * v * c[1] + u * u * b[1];
  out[2] = v * v * a[2] + 2 * u * v * c[2] + u * u * b[2];
}

/** `bezierLength`, nothing allocated (the same samples and sums). */
export function bezierLengthOf(a: ArrayLike<number>, c: ArrayLike<number>, b: ArrayLike<number>, n = 16): number {
  let len = 0;
  let p0 = a[0];
  let p1 = a[1];
  let p2 = a[2];
  for (let i = 1; i <= n; i += 1) {
    const u = i / n;
    const v = 1 - u;
    const q0 = v * v * a[0] + 2 * u * v * c[0] + u * u * b[0];
    const q1 = v * v * a[1] + 2 * u * v * c[1] + u * u * b[1];
    const q2 = v * v * a[2] + 2 * u * v * c[2] + u * u * b[2];
    len += hypot3(q0 - p0, q1 - p1, q2 - p2);
    p0 = q0;
    p1 = q1;
    p2 = q2;
  }
  return len;
}

/** `tubeBinormal` into `out`, nothing allocated (the same arithmetic). */
export function tubeBinormalOf(a: ArrayLike<number>, c: ArrayLike<number>, b: ArrayLike<number>, out: Float32Array | Float64Array) {
  const d0 = b[0] - a[0];
  const d1 = b[1] - a[1];
  const d2 = b[2] - a[2];
  const e0 = c[0] - a[0];
  const e1 = c[1] - a[1];
  const e2 = c[2] - a[2];
  const dd = hypot3(d0, d1, d2) || 1;
  let w0 = d1 * e2 - d2 * e1;
  let w1 = d2 * e0 - d0 * e2;
  let w2 = d0 * e1 - d1 * e0;
  if (hypot3(w0, w1, w2) < 1e-6 * dd * dd) {
    // × (0, 0, 1)
    w0 = d1 * 1 - d2 * 0;
    w1 = d2 * 0 - d0 * 1;
    w2 = d0 * 0 - d1 * 0;
  }
  if (hypot3(w0, w1, w2) < 1e-9) {
    // × (1, 0, 0)
    w0 = d1 * 0 - d2 * 0;
    w1 = d2 * 1 - d0 * 0;
    w2 = d0 * 0 - d1 * 1;
  }
  const n = hypot3(w0, w1, w2) || 1;
  out[0] = w0 / n;
  out[1] = w1 / n;
  out[2] = w2 / n;
}

/**
 * The plane a tube bends in: its binormal (unit, perpendicular to both the
 * chord and the bend). A straight tube bends in no plane: then any
 * perpendicular works — horizontal if it can, so the shading reads the same.
 */
export function tubeBinormal(a: ArrayLike<number>, c: ArrayLike<number>, b: ArrayLike<number>): [number, number, number] {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cross = (u: number[], v: number[]) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const dd = Math.hypot(d[0], d[1], d[2]) || 1;
  let w = cross(d, e);
  if (Math.hypot(w[0], w[1], w[2]) < 1e-6 * dd * dd) w = cross(d, [0, 0, 1]);
  if (Math.hypot(w[0], w[1], w[2]) < 1e-9) w = cross(d, [1, 0, 0]);
  const n = Math.hypot(w[0], w[1], w[2]) || 1;
  return [w[0] / n, w[1] / n, w[2] / n];
}

/**
 * The canonical tube: `along` segments down its length, `around` sides, and a
 * rounded cap at each end (`capRings` rings each). Swept by the vertex shader.
 */
export function tubeMesh(along = 24, around = 10, capRings = 3): Float32Array {
  const out: number[] = [];
  const ring = (u: number, s: number) => {
    const pts: number[][] = [];
    for (let j = 0; j <= around; j += 1) {
      const th = (j / around) * Math.PI * 2;
      pts.push([u, Math.cos(th), Math.sin(th), s]);
    }
    return pts;
  };
  const strip = (r0: number[][], r1: number[][]) => {
    for (let j = 0; j < around; j += 1) {
      out.push(...r0[j], ...r1[j], ...r1[j + 1], ...r0[j], ...r1[j + 1], ...r0[j + 1]);
    }
  };
  // Start cap: from the pole (s = −1) to the body (s = 0).
  let prev = ring(0, -1);
  for (let i = 1; i <= capRings; i += 1) {
    const s = -Math.cos(((i / capRings) * Math.PI) / 2);
    const next = ring(0, Math.abs(s) < 1e-9 ? 0 : s);
    strip(prev, next);
    prev = next;
  }
  for (let i = 1; i <= along; i += 1) {
    const next = ring(i / along, 0);
    strip(prev, next);
    prev = next;
  }
  for (let i = 1; i <= capRings; i += 1) {
    const next = ring(1, Math.sin(((i / capRings) * Math.PI) / 2));
    strip(prev, next);
    prev = next;
  }
  return new Float32Array(out);
}

/**
 * The same tube as `tubeMesh`, indexed: each ring's vertices once (429 for
 * the view's tube instead of 2,304 drawn), and the very same triangles in the
 * same order, so it draws exactly the same picture.
 */
export function tubeMeshIndexed(along = 24, around = 10, capRings = 3): { vertices: Float32Array; indices: Uint16Array } {
  const verts: number[] = [];
  const idx: number[] = [];
  let n = 0;
  const ring = (u: number, s: number) => {
    const at: number[] = [];
    for (let j = 0; j <= around; j += 1) {
      const th = (j / around) * Math.PI * 2;
      verts.push(u, Math.cos(th), Math.sin(th), s);
      at.push(n);
      n += 1;
    }
    return at;
  };
  const strip = (r0: number[], r1: number[]) => {
    for (let j = 0; j < around; j += 1) idx.push(r0[j], r1[j], r1[j + 1], r0[j], r1[j + 1], r0[j + 1]);
  };
  let prev = ring(0, -1);
  for (let i = 1; i <= capRings; i += 1) {
    const s = -Math.cos(((i / capRings) * Math.PI) / 2);
    const next = ring(0, Math.abs(s) < 1e-9 ? 0 : s);
    strip(prev, next);
    prev = next;
  }
  for (let i = 1; i <= along; i += 1) {
    const next = ring(i / along, 0);
    strip(prev, next);
    prev = next;
  }
  for (let i = 1; i <= capRings; i += 1) {
    const next = ring(1, Math.sin(((i / capRings) * Math.PI) / 2));
    strip(prev, next);
    prev = next;
  }
  return { vertices: new Float32Array(verts), indices: new Uint16Array(idx) };
}

/** A unit quad for billboards and flat quads: two triangles over (−1..1)². */
export function unitQuad(): Float32Array {
  return new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
}

/** Is a chart point inside an annular sector? (For picking raised blocks.) */
export function inSector(p: Polar, x: number, y: number, ecl0: number, ecl1: number, r0: number, r1: number): boolean {
  const r = Math.hypot(x - p.cx, y - p.cy);
  if (r < r0 || r > r1) return false;
  // Back from screen to longitude (the inverse of polarXY).
  const ccw = (Math.atan2(y - p.cy, p.cx - x) * 180) / Math.PI;
  const ecl = (((p.asc + ccw) % 360) + 360) % 360;
  const off = (((ecl - ecl0) % 360) + 360) % 360;
  return off <= spanOf(ecl0, ecl1);
}

/**
 * A graduation tick standing up out of the chart as a solid fin: the flat
 * tick from (x0, y0) to (x1, y1), `w` thick, `h` of the comb's height (0..1:
 * the wall format's zSel, so one mesh holds fins of every height and the
 * whole comb grows with its two z uniforms).
 */
export type Fin = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  w: number;
  h: number;
  /** Its top: the flat mark's colour. */
  color: RGB;
  /** Its sides (defaults to the top's). */
  side?: RGB;
};

/** Solid fins (wall format): two sides, two ends and a top each; the bottom sits on the surface. */
export function finMesh(fins: Fin[]): Float32Array {
  const out = new Float32Array(fins.length * 30 * 9);
  let o = 0;
  const v = (x: number, y: number, z: number, nx: number, ny: number, nz: number, c: RGB) => {
    out[o++] = x;
    out[o++] = y;
    out[o++] = z;
    out[o++] = nx;
    out[o++] = ny;
    out[o++] = nz;
    out[o++] = c[0];
    out[o++] = c[1];
    out[o++] = c[2];
  };
  for (const f of fins) {
    const len = Math.hypot(f.x1 - f.x0, f.y1 - f.y0) || 1;
    const dx = (f.x1 - f.x0) / len;
    const dy = (f.y1 - f.y0) / len;
    const nx = -dy;
    const ny = dx;
    const hw = f.w / 2;
    const A: [number, number] = [f.x0 - nx * hw, f.y0 - ny * hw];
    const B: [number, number] = [f.x1 - nx * hw, f.y1 - ny * hw];
    const C: [number, number] = [f.x1 + nx * hw, f.y1 + ny * hw];
    const D: [number, number] = [f.x0 + nx * hw, f.y0 + ny * hw];
    const h = f.h;
    const sc = f.side ?? f.color;
    // An upright face from p to q, facing (fx, fy).
    const side = (p: [number, number], q: [number, number], fx: number, fy: number) => {
      v(p[0], p[1], 0, fx, fy, 0, sc);
      v(q[0], q[1], 0, fx, fy, 0, sc);
      v(q[0], q[1], h, fx, fy, 0, sc);
      v(p[0], p[1], 0, fx, fy, 0, sc);
      v(q[0], q[1], h, fx, fy, 0, sc);
      v(p[0], p[1], h, fx, fy, 0, sc);
    };
    side(A, B, -nx, -ny);
    side(D, C, nx, ny);
    side(B, C, dx, dy);
    side(A, D, -dx, -dy);
    v(A[0], A[1], h, 0, 0, 1, f.color);
    v(B[0], B[1], h, 0, 0, 1, f.color);
    v(C[0], C[1], h, 0, 0, 1, f.color);
    v(A[0], A[1], h, 0, 0, 1, f.color);
    v(C[0], C[1], h, 0, 0, 1, f.color);
    v(D[0], D[1], h, 0, 0, 1, f.color);
  }
  return out;
}

/**
 * The solid stretches of a dashed tube `total` long, for a dash pattern (on,
 * off, on, off…, an odd one repeated as SVG does), laid from one end and
 * centred so both ends look alike. Each is shrunk by the tube's radius at both
 * ends (its rounded caps fill that back in); one shorter than its caps becomes
 * a dot (d0 = d1: the capsule closes into a ball).
 */
export function dashSegments(total: number, pattern: number[], r: number): [number, number][] {
  const pat = pattern.length % 2 ? [...pattern, ...pattern] : pattern;
  const period = pat.reduce((s, n) => s + Math.max(0, n), 0);
  if (!(total > 0)) return [];
  if (!(period > 0)) return [[Math.min(r, total / 2), Math.max(total - r, total / 2)]];
  const raw: [number, number][] = [];
  let d = 0;
  for (let i = 0; d < total - 1e-9 && raw.length < 4096; i = (i + 2) % pat.length) {
    const on = Math.max(0, pat[i]);
    const off = Math.max(0, pat[i + 1]);
    if (raw.length && d + on > total + 1e-9) break;
    raw.push([d, Math.min(total, d + on)]);
    d += on + off;
  }
  const used = raw.length ? raw[raw.length - 1][1] : 0;
  const shift = Math.max(0, (total - used) / 2);
  return raw.map(([a, b]) => {
    let d0 = a + shift + r;
    let d1 = b + shift - r;
    if (d1 < d0) {
      const mid = (a + b) / 2 + shift;
      d0 = mid;
      d1 = mid;
    }
    return [Math.max(0, Math.min(total, d0)), Math.max(0, Math.min(total, d1))] as [number, number];
  });
}
