/**
 * Geometry of the 2D relief (see the 2D polish plan).
 *
 * A raised piece of a figure is drawn as a solid seen slightly from above and
 * in front: its top stays exactly where the figure drew it (nothing moves
 * under the pointer), its floor lies h·W lower on screen, and the walls join
 * the two. The visible walls are the ones facing W. Everything here is in the
 * figure's own units (its viewBox), pure and unit-tested.
 *
 * Every wall is a parallelogram hanging from a straight edge of the top, and
 * the floor is a copy of the silhouette slid by h·W: top ∪ walls ∪ floor is
 * exactly the solid, at any height. A line's side is drawn in its own frame
 * (lineFrame), where stretching it along W is exact growth.
 */
export type Pt = { x: number; y: number };

/** Where the floor of a raised piece lies, per unit of height (down, a touch right). */
export const WALL: Pt = { x: 0.16, y: 0.6 };
/** Where its shadow falls, per unit of height (light from the top left). */
export const SHADOW: Pt = { x: 0.34, y: 0.52 };

const WALL_LEN = Math.hypot(WALL.x, WALL.y);
const WALL_DIR: Pt = { x: WALL.x / WALL_LEN, y: WALL.y / WALL_LEN };

/** Key light on the walls: from the left, high, a little from the front. */
const LIGHT = (() => {
  const v = [-0.62, 0.14, 0.78];
  const n = Math.hypot(v[0], v[1], v[2]);
  return { x: v[0] / n, y: v[1] / n, z: v[2] / n };
})();

// ─── paths ────────────────────────────────────────────────────────────────

class Scanner {
  i = 0;
  readonly s: string;
  constructor(s: string) {
    this.s = s;
  }
  private skip() {
    while (this.i < this.s.length && /[\s,]/.test(this.s[this.i])) this.i += 1;
  }
  done(): boolean {
    this.skip();
    return this.i >= this.s.length;
  }
  command(): string | null {
    this.skip();
    const c = this.s[this.i];
    if (c && /[A-Za-z]/.test(c)) {
      this.i += 1;
      return c;
    }
    return null;
  }
  number(): number {
    this.skip();
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(this.s.slice(this.i));
    if (!m) throw new Error(`path: number expected at ${this.i}`);
    this.i += m[0].length;
    return Number(m[0]);
  }
  /** Arc flags may be packed ("a1 1 0 01 5 5"): one digit each. */
  flag(): number {
    this.skip();
    const c = this.s[this.i];
    if (c !== "0" && c !== "1") throw new Error(`path: flag expected at ${this.i}`);
    this.i += 1;
    return c === "1" ? 1 : 0;
  }
  more(): boolean {
    this.skip();
    const c = this.s[this.i];
    return c !== undefined && /[-+.\d]/.test(c);
  }
}

/**
 * Points along an SVG elliptical arc from (x1, y1) to (x2, y2), end included,
 * start excluded (SVG 1.1 implementation notes, F.6.5), every `stepDeg` or less.
 */
export function arcPoints(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  phiDeg: number,
  large: number,
  sweep: number,
  x2: number,
  y2: number,
  stepDeg = 6,
): Pt[] {
  if (x1 === x2 && y1 === y2) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (!rx || !ry) return [{ x: x2, y: y2 }];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = den ? Math.sqrt(Math.max(0, num / den)) : 0;
  if (large === sweep) co = -co;
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / ((stepDeg * Math.PI) / 180)));
  const out: Pt[] = [];
  for (let k = 1; k <= n; k += 1) {
    if (k === n) {
      out.push({ x: x2, y: y2 });
      break;
    }
    const t = t1 + (dt * k) / n;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    out.push({ x: cos * ex - sin * ey + cx, y: sin * ex + cos * ey + cy });
  }
  return out;
}

/**
 * The subpaths of an SVG path as polygons (arcs and curves flattened; a
 * closing point equal to the first is dropped). Supports M L H V A C Q Z and
 * their relative forms.
 */
export function flattenPath(d: string, stepDeg = 6): Pt[][] {
  const sc = new Scanner(d);
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cmd: string | null = null;
  const close = () => {
    if (cur.length) {
      const a = cur[0];
      const b = cur[cur.length - 1];
      if (cur.length > 1 && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6) cur.pop();
      if (cur.length) out.push(cur);
    }
    cur = [];
  };
  const add = (px: number, py: number) => {
    x = px;
    y = py;
    cur.push({ x, y });
  };
  while (!sc.done()) {
    const c = sc.command();
    if (c) cmd = c;
    else if (!cmd) throw new Error("path: command expected");
    const rel: boolean = cmd === cmd.toLowerCase();
    const C: string = cmd.toUpperCase();
    if (C === "Z") {
      x = sx;
      y = sy;
      close();
      cmd = null;
      continue;
    }
    if (C === "M") {
      const nx = sc.number() + (rel ? x : 0);
      const ny = sc.number() + (rel ? y : 0);
      close();
      sx = nx;
      sy = ny;
      add(nx, ny);
      // Further pairs after a moveto are linetos.
      cmd = rel ? "l" : "L";
      continue;
    }
    if (C === "L") {
      add(sc.number() + (rel ? x : 0), sc.number() + (rel ? y : 0));
    } else if (C === "H") {
      add(sc.number() + (rel ? x : 0), y);
    } else if (C === "V") {
      add(x, sc.number() + (rel ? y : 0));
    } else if (C === "A") {
      const rx = sc.number();
      const ry = sc.number();
      const rot = sc.number();
      const large = sc.flag();
      const sweep = sc.flag();
      const ex = sc.number() + (rel ? x : 0);
      const ey = sc.number() + (rel ? y : 0);
      for (const p of arcPoints(x, y, rx, ry, rot, large, sweep, ex, ey, stepDeg)) add(p.x, p.y);
      x = ex;
      y = ey;
    } else if (C === "C" || C === "Q") {
      const pts: number[] = [];
      const n = C === "C" ? 6 : 4;
      for (let i = 0; i < n; i += 1) pts.push(sc.number() + (rel ? (i % 2 ? y : x) : 0));
      const x0 = x;
      const y0 = y;
      for (let k = 1; k <= 8; k += 1) {
        const t = k / 8;
        const u = 1 - t;
        if (C === "C") {
          add(
            u * u * u * x0 + 3 * u * u * t * pts[0] + 3 * u * t * t * pts[2] + t * t * t * pts[4],
            u * u * u * y0 + 3 * u * u * t * pts[1] + 3 * u * t * t * pts[3] + t * t * t * pts[5],
          );
        } else {
          add(u * u * x0 + 2 * u * t * pts[0] + t * t * pts[2], u * u * y0 + 2 * u * t * pts[1] + t * t * pts[3]);
        }
      }
    } else {
      throw new Error(`path: unsupported command ${cmd}`);
    }
  }
  close();
  return out;
}

/** Shoelace area in screen coordinates (y down): positive runs clockwise on screen. */
export function polygonArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function centroid(pts: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / (pts.length || 1), y: y / (pts.length || 1) };
}

export type Box = { x: number; y: number; w: number; h: number };

export function boundsOf(pts: Pt[], pad = 0): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
}

/** How far along W a point lies: larger is nearer the viewer (painted later). */
export function depthKey(p: Pt): number {
  return p.x * WALL_DIR.x + p.y * WALL_DIR.y;
}

// ─── walls ────────────────────────────────────────────────────────────────

/** A wall hangs from the straight edge a→b of the top and runs toward W. */
export type WallBand = {
  a: Pt;
  b: Pt;
  /** Outward normals of the top's outline where the wall starts and ends (shading). */
  n0: Pt;
  n1: Pt;
  /** Painter key: farther walls first. */
  depth: number;
};

/** A wall shorter than this, seen edge-on, is left to the floor copy. */
const MIN_FACING = 0.08;

/**
 * The walls of a polygonal top: its edges that face W, joined into straight
 * chords while the outline bends outward by less than `maxTurnDeg` (the floor
 * copy fills the sliver under a chord exactly); inward bends keep their own
 * edges. Each chord is oriented so its wall runs toward W.
 */
export function wallBands(pts: Pt[], maxTurnDeg = 14): WallBand[] {
  const n = pts.length;
  if (n < 3) return [];
  const area = polygonArea(pts);
  if (Math.abs(area) < 1e-6) return [];
  const s = Math.sign(area);
  type Edge = { a: Pt; b: Pt; n: Pt; front: boolean };
  const edges: Edge[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const len = Math.hypot(ex, ey);
    if (len < 1e-6) continue;
    const nn = s > 0 ? { x: ey / len, y: -ex / len } : { x: -ey / len, y: ex / len };
    edges.push({ a, b, n: nn, front: nn.x * WALL_DIR.x + nn.y * WALL_DIR.y > MIN_FACING });
  }
  const m = edges.length;
  if (!m || edges.every((e) => e.front)) return [];
  // Start just after a back edge so every run is contiguous.
  const first = edges.findIndex((e, i) => !e.front && edges[(i + 1) % m].front);
  if (first < 0) return [];
  const maxTurn = (maxTurnDeg * Math.PI) / 180;
  const out: WallBand[] = [];
  let run: Edge[] = [];
  const flush = () => {
    if (!run.length) return;
    const a0 = run[0].a;
    const b0 = run[run.length - 1].b;
    let a = a0;
    let b = b0;
    let n0 = run[0].n;
    let n1 = run[run.length - 1].n;
    // Orient: the box's +y (after turning by the chord's angle) must point toward W.
    const th = Math.atan2(b.y - a.y, b.x - a.x);
    if (-Math.sin(th) * WALL.x + Math.cos(th) * WALL.y < 0) {
      a = b0;
      b = a0;
      n0 = run[run.length - 1].n;
      n1 = run[0].n;
    }
    out.push({ a, b, n0, n1, depth: depthKey({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) });
    run = [];
  };
  for (let k = 1; k <= m; k += 1) {
    const e = edges[(first + k) % m];
    if (!e.front) {
      flush();
      continue;
    }
    if (run.length) {
      const prev = run[run.length - 1];
      const cross = (prev.b.x - prev.a.x) * (e.b.y - e.a.y) - (prev.b.y - prev.a.y) * (e.b.x - e.a.x);
      const convex = cross * s > 1e-9;
      const turn = Math.acos(Math.max(-1, Math.min(1, run[0].n.x * e.n.x + run[0].n.y * e.n.y)));
      if (!convex || turn > maxTurn) flush();
    }
    run.push(e);
  }
  flush();
  return out.sort((p, q) => p.depth - q.depth);
}

/** A disc's wall: the band under its diameter across W (a coin's edge). */
export function discBand(c: Pt, r: number): WallBand {
  // Across W: perpendicular to it.
  const px = -WALL_DIR.y;
  const py = WALL_DIR.x;
  let a = { x: c.x - r * px, y: c.y - r * py };
  let b = { x: c.x + r * px, y: c.y + r * py };
  const th = Math.atan2(b.y - a.y, b.x - a.x);
  if (-Math.sin(th) * WALL.x + Math.cos(th) * WALL.y < 0) [a, b] = [b, a];
  const left = { x: a.x - c.x, y: a.y - c.y };
  const n0 = { x: left.x / r, y: left.y / r };
  return { a, b, n0, n1: { x: -n0.x, y: -n0.y }, depth: depthKey(c) };
}

/**
 * A line's wall (a ribbon under a rod): the band under its centre line,
 * oriented toward W. Null when the line runs along W (seen edge-on: its floor
 * copy is the whole of its side).
 */
export function lineBand(p1: Pt, p2: Pt): WallBand | null {
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (len < 1e-6) return null;
  const nx = -(p2.y - p1.y) / len;
  const ny = (p2.x - p1.x) / len;
  const facing = Math.abs(nx * WALL_DIR.x + ny * WALL_DIR.y);
  if (facing < MIN_FACING) return null;
  let a = p1;
  let b = p2;
  let th = Math.atan2(b.y - a.y, b.x - a.x);
  if (-Math.sin(th) * WALL.x + Math.cos(th) * WALL.y < 0) {
    [a, b] = [b, a];
    th = Math.atan2(b.y - a.y, b.x - a.x);
  }
  // The ribbon faces the way it runs: the box's +y.
  const face = { x: -Math.sin(th), y: Math.cos(th) };
  return { a, b, n0: face, n1: face, depth: depthKey({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) };
}

/** The way a wall hanging from a→b faces (the box's +y once oriented toward W). */
export function bandFace(band: Pick<WallBand, "a" | "b">): Pt {
  const th = Math.atan2(band.b.y - band.a.y, band.b.x - band.a.x);
  return { x: -Math.sin(th), y: Math.cos(th) };
}

/**
 * How bright a wall facing `n` (outward, in the screen plane) is: 0.46 in
 * shade … 1 facing the light.
 */
export function wallLight(n: Pt): number {
  const len = Math.hypot(n.x, n.y) || 1;
  const d = (n.x / len) * LIGHT.x + (n.y / len) * LIGHT.y;
  return 0.46 + 0.54 * Math.max(0, d);
}

/** Offset of the floor of a piece raised by h. */
export function floorAt(h: number): Pt {
  return { x: WALL.x * h, y: WALL.y * h };
}

/** Offset of the shadow of a piece raised by h. */
export function shadowAt(h: number): Pt {
  return { x: SHADOW.x * h, y: SHADOW.y * h };
}

/** Is p inside the polygon (even-odd)? */
export function insidePoly(p: Pt, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * The outline of a round-capped stroke from p1 to p2, `w` wide, as a polygon
 * (each cap a half circle of `capSegs` steps).
 */
export function strokeOutline(p1: Pt, p2: Pt, w: number, capSegs = 6): Pt[] {
  const r = w / 2;
  const th = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const out: Pt[] = [];
  const cap = (c: Pt, from: number) => {
    for (let i = 0; i <= capSegs; i += 1) {
      const a = from + (Math.PI * i) / capSegs;
      out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
    }
  };
  // Round the end at p2 (from the left side of the direction to its right), then p1.
  cap(p2, th - Math.PI / 2);
  cap(p1, th + Math.PI / 2);
  return out;
}

/**
 * The frame of a line's side (a ribbon hanging from a→b toward W, oriented as
 * lineBand does): a local point (u, y) sits at a + e·(u + y·tan(skew)) + n·y,
 * u along the line, y down the ribbon. CSS `rotate(rotate) skewX(skew)
 * scaleY(k)` with its origin at a draws the frame at k of its height: a point
 * t·W below the line lands k·t·W below it — exact growth by stretching.
 */
export type LineFrame = {
  a: Pt;
  /** Unit vector along the line. */
  e: Pt;
  /** Unit normal toward W. */
  n: Pt;
  /** Radians. */
  rotate: number;
  /** Radians. */
  skew: number;
  /** W across the line (per unit of height), > 0. */
  wPerp: number;
  /** W along the line (per unit of height). */
  wPar: number;
  len: number;
};

export function lineFrame(a: Pt, b: Pt): LineFrame {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const th = Math.atan2(b.y - a.y, b.x - a.x);
  const e = { x: Math.cos(th), y: Math.sin(th) };
  const n = { x: -e.y, y: e.x };
  const wPar = WALL.x * e.x + WALL.y * e.y;
  const wPerp = Math.max(1e-3, WALL.x * n.x + WALL.y * n.y);
  return { a, e, n, rotate: th, skew: Math.atan2(wPar, wPerp), wPerp, wPar, len };
}

/** A screen point in a line frame's own coordinates (at full height). */
export function toLineLocal(f: LineFrame, q: Pt): Pt {
  const dx = q.x - f.a.x;
  const dy = q.y - f.a.y;
  const y = dx * f.n.x + dy * f.n.y;
  return { x: dx * f.e.x + dy * f.e.y - (f.wPar / f.wPerp) * y, y };
}

/** Where a local point lands with the frame stretched to `k` of its height (the CSS transform). */
export function fromLineLocal(f: LineFrame, p: Pt, k = 1): Pt {
  const y = p.y * k;
  const x = p.x + Math.tan(f.skew) * y;
  return { x: f.a.x + f.e.x * x + f.n.x * y, y: f.a.y + f.e.y * x + f.n.y * y };
}
