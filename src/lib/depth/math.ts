/**
 * The small bit of 3D maths behind the depth scene.
 *
 * The scene is plain CSS: a box with `perspective`, a stack inside it with
 * `transform-style: preserve-3d` and `rotateX() rotateY() rotateZ()`, and
 * absolutely-stacked planes (SVGs) moved with `translate3d() scale()`. These
 * helpers rebuild the exact matrices the browser uses, so we can (a) write the
 * CSS strings and (b) invert the mapping to know which chart point is under
 * the pointer when the chart is tilted.
 *
 * Conventions: CSS pixels, y down, z toward the viewer, 4×4 row-major
 * matrices acting on column vectors.
 */

export type Mat4 = number[];

export function identity(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function mul(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) s += a[r * 4 + k] * b[k * 4 + c];
      out[r * 4 + c] = s;
    }
  }
  return out;
}

export function translate(x: number, y: number, z: number): Mat4 {
  return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
}

/** CSS `scale(s)`: x and y only. */
export function scaleXY(s: number): Mat4 {
  return [s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/** CSS `scale3d(s, s, s)`: the whole scene, depth included. */
export function scale3(s: number): Mat4 {
  return [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];
}

const RAD = Math.PI / 180;

/** CSS `rotateX(deg)`: positive tips the top edge away from the viewer. */
export function rotateX(deg: number): Mat4 {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
}

/** CSS `rotateY(deg)`: positive sends the right edge away from the viewer. */
export function rotateY(deg: number): Mat4 {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
}

/** CSS `rotateZ(deg)`: positive turns clockwise on screen. */
export function rotateZ(deg: number): Mat4 {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/** CSS `perspective(P)`: a point at height z looks P / (P − z) larger. */
export function perspective(p: number): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1 / p, 1];
}

export type SceneState = {
  /** Scene box, CSS px. */
  width: number;
  height: number;
  /** CSS `perspective` of the scene, px. */
  perspective: number;
  /** CSS `perspective-origin`, px from the scene's top-left. */
  originX: number;
  originY: number;
  /** Stack rotation, degrees, applied as `rotateX() rotateY() rotateZ()`. */
  rx: number;
  ry: number;
  rz: number;
  /** Uniform scale applied before the rotation (the 3D view shrinks to fit). */
  scale?: number;
  /**
   * The lens after the camera (the WebGL view's zoom): the picture scaled by
   * `zoom` around the origin, then moved by the pan, scene px. The CSS camera
   * has no lens: it stays at 1.
   */
  zoom?: number;
  panX?: number;
  panY?: number;
};

export type PlaneState = {
  /** `translate3d(tx, ty, z)` */
  tx?: number;
  ty?: number;
  z: number;
  /** `scale(s)` */
  scale: number;
  /** `transform-origin`, px from the plane's top-left. */
  originX: number;
  originY: number;
};

/** Scale that keeps a plane at height z exactly on top of the base at zero tilt. */
export function compensation(perspectivePx: number, z: number): number {
  return (perspectivePx - z) / perspectivePx;
}

/** The lens after the camera: scale by `zoom` around the origin, then pan (scene px). */
export function lensMatrix(st: Pick<SceneState, "originX" | "originY" | "zoom" | "panX" | "panY">): Mat4 {
  const z = st.zoom ?? 1;
  return [z, 0, 0, (1 - z) * st.originX + (st.panX ?? 0), 0, z, 0, (1 - z) * st.originY + (st.panY ?? 0), 0, 0, 1, 0, 0, 0, 0, 1];
}

/** The full plane-local → scene-local matrix, as the browser composes it (and the lens). */
export function planeMatrix(scene: SceneState, plane: PlaneState): Mat4 {
  const cx = scene.width / 2;
  const cy = scene.height / 2;
  const persp = mul(
    mul(translate(scene.originX, scene.originY, 0), perspective(scene.perspective)),
    translate(-scene.originX, -scene.originY, 0),
  );
  const rot = mul(scale3(scene.scale ?? 1), mul(mul(rotateX(scene.rx), rotateY(scene.ry)), rotateZ(scene.rz)));
  const stack = mul(mul(translate(cx, cy, 0), rot), translate(-cx, -cy, 0));
  const local = mul(translate(plane.tx ?? 0, plane.ty ?? 0, plane.z), scaleXY(plane.scale));
  const pl = mul(
    mul(translate(plane.originX, plane.originY, 0), local),
    translate(-plane.originX, -plane.originY, 0),
  );
  return mul(lensMatrix(scene), mul(persp, mul(stack, pl)));
}

/** Where a point of the plane (z = 0 in plane space) lands in the scene box. */
export function projectPoint(m: Mat4, x: number, y: number): { x: number; y: number; w: number } {
  const X = m[0] * x + m[1] * y + m[3];
  const Y = m[4] * x + m[5] * y + m[7];
  const W = m[12] * x + m[13] * y + m[15];
  return { x: X / W, y: Y / W, w: W };
}

function invert3(h: number[]): number[] | null {
  const [a, b, c, d, e, f, g, i, j] = h;
  const A = e * j - f * i;
  const B = -(d * j - f * g);
  const C = d * i - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const inv = [
    A,
    -(b * j - c * i),
    b * f - c * e,
    B,
    a * j - c * g,
    -(a * f - c * d),
    C,
    -(a * i - b * g),
    a * e - b * d,
  ];
  return inv.map((v) => v / det);
}

/**
 * Which point of the plane sits under a scene-local point: the inverse of the
 * plane's homography. Returns null when the plane is seen edge-on.
 */
export function unprojectPoint(m: Mat4, sx: number, sy: number): { x: number; y: number } | null {
  const inv = invert3([m[0], m[1], m[3], m[4], m[5], m[7], m[12], m[13], m[15]]);
  if (!inv) return null;
  const X = inv[0] * sx + inv[1] * sy + inv[2];
  const Y = inv[3] * sx + inv[4] * sy + inv[5];
  const W = inv[6] * sx + inv[7] * sy + inv[8];
  if (Math.abs(W) < 1e-12) return null;
  return { x: X / W, y: Y / W };
}

const fx = (n: number) => (Math.abs(n) < 1e-6 ? "0" : n.toFixed(3));

export function stackTransformCss(scene: Pick<SceneState, "rx" | "ry" | "rz" | "scale">): string {
  const s = scene.scale ?? 1;
  const fit = Math.abs(s - 1) < 1e-6 ? "" : `scale3d(${s.toFixed(4)}, ${s.toFixed(4)}, ${s.toFixed(4)}) `;
  return `${fit}rotateX(${fx(scene.rx)}deg) rotateY(${fx(scene.ry)}deg) rotateZ(${fx(scene.rz)}deg)`;
}

/**
 * How much the 3D view shrinks as it tips (1 when flat): a tipped chart's near
 * half comes toward the viewer and grows, and the planets stand up above its
 * far edge, so a chart that fills the stage flat would spill over its edges.
 */
export function fitScale(rxDeg: number, k = 0.12): number {
  return 1 - k * (1 - Math.cos((Math.abs(rxDeg) * Math.PI) / 180));
}

export function planeTransformCss(plane: PlaneState): string {
  return `translate3d(${fx(plane.tx ?? 0)}px, ${fx(plane.ty ?? 0)}px, ${fx(plane.z)}px) scale(${plane.scale.toFixed(5)})`;
}

/** True when the scene is flat and centred: the plain 2D mapping is exact. */
export function isFlat(scene: Pick<SceneState, "rx" | "ry" | "rz">): boolean {
  return Math.abs(scene.rx) < 1e-3 && Math.abs(scene.ry) < 1e-3 && Math.abs(scene.rz) < 1e-3;
}
