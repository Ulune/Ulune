/**
 * The 3D view's camera for WebGL, built from the same numbers as the CSS
 * camera (math.ts): a point drawn by WebGL lands on exactly the screen pixel
 * the CSS scene would have put it on, so the pointer mapping (unproject) and
 * everything measured in the page agree with what is drawn.
 *
 * Spaces:
 *  - chart units: the wheel's viewBox, x right, y down, z up out of the chart
 *    (heights are given in the same units);
 *  - stack px: the depth stack's own box (the frame maps units → px);
 *  - scene px: after the camera (perspective, tilt, turn), what the browser
 *    would show inside the scene box;
 *  - clip space: what WebGL wants, with a depth for the z-buffer.
 * Matrices are 4×4, row-major, acting on column vectors (as in math.ts);
 * toGL() gives the column-major array WebGL expects.
 */
import { lensMatrix, mul, perspective, rotateX, rotateY, rotateZ, scale3, translate, type Mat4, type SceneState } from "./math";

/** How chart units map to stack px: px = o + (u − vb)·k; heights scale by k too. */
export type ChartFrame = { k: number; ox: number; oy: number; vbx: number; vby: number };

export type Vec3 = [number, number, number];

export function frameMatrix(f: ChartFrame): Mat4 {
  return [f.k, 0, 0, f.ox - f.vbx * f.k, 0, f.k, 0, f.oy - f.vby * f.k, 0, 0, f.k, 0, 0, 0, 0, 1];
}

/** The camera's turn (no scale): rotateX · rotateY · rotateZ, as CSS composes it. */
export function rotation(st: Pick<SceneState, "rx" | "ry" | "rz">): Mat4 {
  return mul(mul(rotateX(st.rx), rotateY(st.ry)), rotateZ(st.rz));
}

/** The stack's CSS transform around its centre: T(c) · scale3d(s) · R · T(−c). */
export function stackMatrix(st: SceneState): Mat4 {
  const cx = st.width / 2;
  const cy = st.height / 2;
  const rot = mul(scale3(st.scale ?? 1), rotation(st));
  return mul(mul(translate(cx, cy, 0), rot), translate(-cx, -cy, 0));
}

/** Stack px → homogeneous scene px (X/W, Y/W on screen; W = 1 − z/P), through the lens. */
export function sceneMatrix(st: SceneState): Mat4 {
  const persp = mul(mul(translate(st.originX, st.originY, 0), perspective(st.perspective)), translate(-st.originX, -st.originY, 0));
  return mul(lensMatrix(st), mul(persp, stackMatrix(st)));
}

/** Chart units → homogeneous scene px. */
export function chartToScene(st: SceneState, f: ChartFrame): Mat4 {
  return mul(sceneMatrix(st), frameMatrix(f));
}

/** The part of the scene the canvas shows, scene px. */
export type Viewport = { x: number; y: number; w: number; h: number };

/**
 * Chart units → clip space. Depth: `near`/`far` bound the stack-px z (after
 * the turn) of anything drawn — larger z is nearer the viewer. Both must stay
 * below the perspective distance.
 */
export function clipMatrix(st: SceneState, f: ChartFrame, vp: Viewport, near: number, far: number): Mat4 {
  const m = chartToScene(st, f);
  const P = st.perspective;
  // Rows of m: X, Y, Z (the turned z, stack px), W = 1 − Z/P.
  const rx = m.slice(0, 4);
  const ry = m.slice(4, 8);
  const rz = m.slice(8, 12);
  const rw = m.slice(12, 16);
  const g = (z: number) => z / (1 - z / P);
  const a = -2 / (g(near) - g(far));
  const b = -1 - a * g(near);
  const out = new Array<number>(16);
  for (let c = 0; c < 4; c += 1) {
    out[c] = (2 / vp.w) * rx[c] - ((2 * vp.x) / vp.w + 1) * rw[c];
    out[4 + c] = (-2 / vp.h) * ry[c] + ((2 * vp.y) / vp.h + 1) * rw[c];
    out[8 + c] = a * rz[c] + b * rw[c];
    out[12 + c] = rw[c];
  }
  return out;
}

/** Row-major 4×4 → the column-major array WebGL takes. */
export function toGL(m: Mat4, into = new Float32Array(16)): Float32Array {
  for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) into[c * 4 + r] = m[r * 4 + c];
  return into;
}

/** The rotation part of a row-major 4×4 as a column-major 3×3 (normals → view). */
export function normalGL(m: Mat4, into = new Float32Array(9)): Float32Array {
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) into[c * 3 + r] = m[r * 4 + c];
  return into;
}

/** Where a chart point (units, z up) lands in the scene box, px; w > 0 in front of the eye. */
export function projectChart(m: Mat4, x: number, y: number, z: number): { x: number; y: number; w: number } {
  const X = m[0] * x + m[1] * y + m[2] * z + m[3];
  const Y = m[4] * x + m[5] * y + m[6] * z + m[7];
  const W = m[12] * x + m[13] * y + m[14] * z + m[15];
  return { x: X / W, y: Y / W, w: W };
}

/** `projectChart` into `out` (x, y, w), nothing allocated. */
export function projectInto(m: Mat4, x: number, y: number, z: number, out: Float64Array) {
  const X = m[0] * x + m[1] * y + m[2] * z + m[3];
  const Y = m[4] * x + m[5] * y + m[6] * z + m[7];
  const W = m[12] * x + m[13] * y + m[14] * z + m[15];
  out[0] = X / W;
  out[1] = Y / W;
  out[2] = W;
}

/**
 * The camera's axes in chart space (unit vectors): right and up on screen,
 * and toward the viewer. Billboards are built from them; they are the rows of
 * the turn (its inverse is its transpose).
 */
export function cameraAxes(st: Pick<SceneState, "rx" | "ry" | "rz">): { right: Vec3; up: Vec3; toward: Vec3 } {
  const r = rotation(st);
  return {
    right: [r[0], r[1], r[2]],
    // Screen y points down; up is its opposite.
    up: [-r[4], -r[5], -r[6]],
    toward: [r[8], r[9], r[10]],
  };
}

export function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Smallest power of two ≥ n (textures that can have mipmaps everywhere). */
export function pot(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
