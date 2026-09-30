/**
 * Where the crowded parts of the wheel go (see the chart visibility plan,
 * "Stelliums and crowded placements"):
 *
 *  - labels: each degree label goes where it touches no other label and no
 *    glyph: its usual ring, a second ring further out, or turned radial;
 *  - house numbers: a badge a planet or a yoke would touch slides along its
 *    house, or steps in; a mark beside it takes the free side.
 *
 * Pure geometry in chart units: the wheel passes its own polar mapping.
 */

export type Pt = { x: number; y: number };
/** The wheel's mapping from an ecliptic longitude and a radius to chart units. */
export type PolarFn = (ecliptic: number, r: number) => Pt;

const norm = (a: number) => ((a % 360) + 360) % 360;

// ─── labels ──────────────────────────────────────────────────────────────

/** An oriented box: centre, half extents, rotation (degrees, screen). */
export type OBox = { cx: number; cy: number; hw: number; hh: number; rot: number };
export type Disc = { x: number; y: number; r: number };

function corners(b: OBox): Pt[] {
  const a = (b.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [-b.hw, -b.hh],
    [b.hw, -b.hh],
    [b.hw, b.hh],
    [-b.hw, b.hh],
  ].map(([x, y]) => ({ x: b.cx + x * c - y * s, y: b.cy + x * s + y * c }));
}

/** Do two oriented boxes overlap (by more than `pad` units)? Separating axes. */
export function boxesOverlap(p: OBox, q: OBox, pad = 0): boolean {
  const cp = corners({ ...p, hw: p.hw + pad / 2, hh: p.hh + pad / 2 });
  const cq = corners({ ...q, hw: q.hw + pad / 2, hh: q.hh + pad / 2 });
  for (const b of [p, q]) {
    const a = (b.rot * Math.PI) / 180;
    for (const ax of [
      { x: Math.cos(a), y: Math.sin(a) },
      { x: -Math.sin(a), y: Math.cos(a) },
    ]) {
      const proj = (pts: Pt[]) => pts.map((v) => v.x * ax.x + v.y * ax.y);
      const pp = proj(cp);
      const qq = proj(cq);
      if (Math.max(...pp) <= Math.min(...qq) || Math.max(...qq) <= Math.min(...pp)) return false;
    }
  }
  return true;
}

/** Distance from a disc's centre to an oriented box, minus the radius (≤ 0: they touch). */
export function discGap(d: Disc, b: OBox): number {
  const a = (-b.rot * Math.PI) / 180;
  const dx = d.x - b.cx;
  const dy = d.y - b.cy;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  const ox = Math.max(Math.abs(lx) - b.hw, 0);
  const oy = Math.max(Math.abs(ly) - b.hh, 0);
  return Math.hypot(ox, oy) - d.r;
}

export type LabelItem = {
  id: string;
  /** Longitude its glyph is drawn at (the fanned place). */
  angle: number;
  /** Box size, units. */
  w: number;
  h: number;
};

export type LabelPlace = {
  x: number;
  y: number;
  /** Rotation of the text (degrees): 0 = level. */
  rot: number;
  /** 0 = the label ring, 1 = the second ring, "radial" = turned along the radius. */
  at: 0 | 1 | "radial";
};

/** A box made ready for many overlap tests: its corners (padded), its two axes, how far it reaches. */
type Shape = { cx: number; cy: number; reach: number; pts: number[]; ax: number[] };

function shapeOf(b: OBox, pad: number): Shape {
  const hw = b.hw + pad / 2;
  const hh = b.hh + pad / 2;
  const a = (b.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts: number[] = [];
  for (const [x, y] of [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]) {
    pts.push(b.cx + x * c - y * s, b.cy + x * s + y * c);
  }
  return { cx: b.cx, cy: b.cy, reach: Math.hypot(hw, hh), pts, ax: [c, s, -s, c] };
}

/** Do the two boxes stay apart along this axis? */
function apartOn(p: Shape, q: Shape, ux: number, uy: number): boolean {
  let pMin = Infinity;
  let pMax = -Infinity;
  let qMin = Infinity;
  let qMax = -Infinity;
  for (let i = 0; i < 8; i += 2) {
    const v = p.pts[i] * ux + p.pts[i + 1] * uy;
    const w = q.pts[i] * ux + q.pts[i + 1] * uy;
    if (v < pMin) pMin = v;
    if (v > pMax) pMax = v;
    if (w < qMin) qMin = w;
    if (w > qMax) qMax = w;
  }
  return pMax <= qMin || qMax <= pMin;
}

/** boxesOverlap on shapes: nothing allocated, and boxes far apart are settled at once. */
function shapesOverlap(p: Shape, q: Shape): boolean {
  const dx = p.cx - q.cx;
  const dy = p.cy - q.cy;
  const r = p.reach + q.reach;
  if (dx * dx + dy * dy >= r * r) return false;
  return !(
    apartOn(p, q, p.ax[0], p.ax[1]) ||
    apartOn(p, q, p.ax[2], p.ax[3]) ||
    apartOn(p, q, q.ax[0], q.ax[1]) ||
    apartOn(p, q, q.ax[2], q.ax[3])
  );
}

/** How many labels a crowd may hold and still have every arrangement of it tried (3^6 = 729). */
const CROWD_MAX = 6;
/** What touching costs: within the padding, 1; truly overlapping (or cut by the edge), this much. */
const OVERLAP = 4;

/**
 * Place degree labels so none touches another label, a glyph or the edge of
 * the drawing. Each label has three places: its ring, level (moved out just
 * enough to clear its own glyph, when `own` says where the glyphs sit); the
 * second ring, as far again beyond, level; its ring turned along the radius.
 *
 * In zodiac order, each label takes its first place touching nothing, else
 * the one touching least (coming within the padding counts less than truly
 * overlapping). Then two labels still touching try every pair of their places
 * (the one placed first may be the one to step out). Labels still touching
 * after that are settled as a crowd, with the neighbours they could reach:
 * every arrangement is tried (a stellium's labels all turned, say), the one
 * touching least wins, then the one keeping most labels level on their ring.
 * `centre` is the wheel's centre (for the radial turn); `half`, if given, how
 * far from it a label may reach either way.
 */
export function placeLabels(
  items: LabelItem[],
  polar: PolarFn,
  centre: Pt,
  opts: { r1: number; r2: number; discs: Disc[]; pad?: number; half?: number; own?: { r: number; radius: number } },
): Map<string, LabelPlace> {
  const pad = opts.pad ?? 1.5;
  const { half, own } = opts;
  /** The least radius from `r` at which a level box clears its own glyph (beside the wheel, a little further out). */
  const clearOwn = (angle: number, r: number, hw: number, hh: number) => {
    if (!own) return r;
    const g = polar(angle, own.r);
    const ux = Math.abs(g.x - centre.x) / own.r;
    const uy = Math.abs(g.y - centre.y) / own.r;
    const need = own.radius + pad / 2;
    const gap = (s: number) => Math.hypot(Math.max(ux * s - hw, 0), Math.max(uy * s - hh, 0));
    let lo = r - own.r;
    if (gap(lo) >= need) return r;
    let hi = lo + 2 * (hw + hh + need);
    for (let k = 0; k < 20; k += 1) {
      const mid = (lo + hi) / 2;
      if (gap(mid) >= need) hi = mid;
      else lo = mid;
    }
    return own.r + hi;
  };
  /** What a place touches that never moves: the glyphs, and the drawing's edge (a unit of grace for the box's round corner). */
  const fixedHits = (box: OBox, core: Shape) => {
    let hits = 0;
    for (const d of opts.discs) {
      const gap = discGap(d, box);
      if (gap < 0) hits += OVERLAP;
      else if (gap < pad / 2) hits += 1;
    }
    if (half !== undefined) {
      for (let i = 0; i < 8; i += 2) {
        if (Math.abs(core.pts[i] - centre.x) > half + 1 || Math.abs(core.pts[i + 1] - centre.y) > half + 1) {
          hits += OVERLAP;
          break;
        }
      }
    }
    return hits;
  };
  const order = [...items].sort((a, b) => norm(a.angle) - norm(b.angle));
  const n = order.length;
  const cands = order.map((it) => {
    const hw = it.w / 2;
    const hh = it.h / 2;
    const r1 = clearOwn(it.angle, opts.r1, hw, hh);
    const p1 = polar(it.angle, r1);
    const p2 = polar(it.angle, r1 + opts.r2 - opts.r1);
    // Radial: centred a little further out so its inner end clears the glyph.
    const pr = polar(it.angle, opts.r1 + Math.max(0, (it.w - it.h) / 2));
    const phi = (Math.atan2(pr.y - centre.y, pr.x - centre.x) * 180) / Math.PI;
    // Read left to right on both halves of the wheel.
    const rot = Math.cos((phi * Math.PI) / 180) >= 0 ? phi : phi + 180;
    const places: { box: OBox; place: LabelPlace }[] = [
      { box: { cx: p1.x, cy: p1.y, hw, hh, rot: 0 }, place: { x: p1.x, y: p1.y, rot: 0, at: 0 } },
      { box: { cx: p2.x, cy: p2.y, hw, hh, rot: 0 }, place: { x: p2.x, y: p2.y, rot: 0, at: 1 } },
      { box: { cx: pr.x, cy: pr.y, hw, hh, rot }, place: { x: pr.x, y: pr.y, rot, at: "radial" } },
    ];
    return places.map((c) => {
      const core = shapeOf(c.box, 0);
      return { place: c.place, shape: shapeOf(c.box, pad), core, fixed: fixedHits(c.box, core) };
    });
  });
  type Cand = (typeof cands)[number][number];
  /** What two places cost each other: nothing apart, 1 within the padding, OVERLAP truly overlapping. */
  const clash = (p: Cand, q: Cand) => (!shapesOverlap(p.shape, q.shape) ? 0 : shapesOverlap(p.core, q.core) ? OVERLAP : 1);
  const pick: number[] = [];
  const at = (i: number) => cands[i][pick[i]];
  const meets = (i: number, a: number, j: number, b: number) => clash(cands[i][a], cands[j][b]);

  // In zodiac order: the first place touching nothing, else the one touching least.
  for (let i = 0; i < n; i += 1) {
    let best = 0;
    let bestHits = Infinity;
    for (let k = 0; k < cands[i].length; k += 1) {
      let hits = cands[i][k].fixed;
      for (let j = 0; j < i; j += 1) hits += clash(cands[i][k], at(j));
      if (hits < bestHits) {
        best = k;
        bestHits = hits;
      }
      if (hits === 0) break;
    }
    pick.push(best);
  }

  // Two labels still touching: every pair of their places, the pair touching least.
  /** What label `i` touches at its `k`-th place, the labels in `skip` left out. */
  const touches = (i: number, k: number, skip: (j: number) => boolean) => {
    let hits = cands[i][k].fixed;
    for (let j = 0; j < n; j += 1) if (j !== i && !skip(j)) hits += clash(cands[i][k], at(j));
    return hits;
  };
  for (let round = 0; round < 3; round += 1) {
    let moved = false;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        if (!clash(at(i), at(j))) continue;
        const cost = (a: number, b: number) => touches(i, a, (m) => m === j) + touches(j, b, (m) => m === i) + meets(i, a, j, b);
        let best = [pick[i], pick[j]];
        let bestHits = cost(pick[i], pick[j]);
        for (let a = 0; a < cands[i].length; a += 1) {
          for (let b = 0; b < cands[j].length; b += 1) {
            const hits = cost(a, b);
            if (hits < bestHits) {
              best = [a, b];
              bestHits = hits;
            }
          }
        }
        if (best[0] !== pick[i] || best[1] !== pick[j]) {
          [pick[i], pick[j]] = best;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // Crowds still touching, with the neighbours they could reach: every arrangement.
  const link = Array.from({ length: n }, (_, i) => i);
  const root = (i: number): number => (link[i] === i ? i : (link[i] = root(link[i])));
  const stuck = new Set<number>();
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (!clash(at(i), at(j))) continue;
      link[root(i)] = root(j);
      stuck.add(i).add(j);
    }
  }
  const crowds = new Map<number, number[]>();
  for (const i of stuck) crowds.set(root(i), [...(crowds.get(root(i)) ?? []), i]);
  for (const touching of crowds.values()) {
    const crowd = [...touching];
    for (let j = 0; j < n && crowd.length <= CROWD_MAX; j += 1) {
      if (crowd.includes(j)) continue;
      if (touching.some((i) => cands[i].some((_, a) => cands[j].some((__, b) => meets(i, a, j, b) > 0)))) crowd.push(j);
    }
    if (crowd.length > CROWD_MAX) continue;
    const inCrowd = new Set(crowd);
    const cost = (ks: number[]) => {
      let hits = 0;
      crowd.forEach((i, a) => {
        hits += touches(i, ks[a], (m) => inCrowd.has(m));
        for (let b = a + 1; b < crowd.length; b += 1) hits += meets(i, ks[a], crowd[b], ks[b]);
      });
      return hits;
    };
    const level = (ks: number[]) => ks.filter((k) => k === 0).length;
    let best = crowd.map((i) => pick[i]);
    let bestHits = cost(best);
    let bestLevel = level(best);
    const ks = crowd.map(() => 0);
    for (;;) {
      const hits = cost(ks);
      if (hits < bestHits || (hits === bestHits && level(ks) > bestLevel)) {
        best = [...ks];
        bestHits = hits;
        bestLevel = level(ks);
      }
      let a = 0;
      while (a < ks.length && ks[a] === cands[crowd[a]].length - 1) ks[a++] = 0;
      if (a === ks.length) break;
      ks[a] += 1;
    }
    crowd.forEach((i, a) => (pick[i] = best[a]));
  }

  const out = new Map<string, LabelPlace>();
  order.forEach((it, i) => out.set(it.id, cands[i][pick[i]].place));
  return out;
}

// ─── arcs ────────────────────────────────────────────────────────────────

/** The shortest arc holding every longitude: where it starts and how long it is (degrees). */
export function arcSpan(ecl: number[]): { from: number; len: number } {
  if (!ecl.length) return { from: 0, len: 0 };
  const s = ecl.map(norm).sort((a, b) => a - b);
  // The arc starts after the widest gap between neighbours (round the circle).
  let gapAt = s.length - 1;
  let gap = s[0] + 360 - s[s.length - 1];
  for (let i = 1; i < s.length; i += 1) {
    if (s[i] - s[i - 1] > gap) {
      gap = s[i] - s[i - 1];
      gapAt = i - 1;
    }
  }
  return { from: s[(gapAt + 1) % s.length], len: 360 - gap };
}

// ─── house numbers ───────────────────────────────────────────────────────

export type Badge = {
  id: string;
  /** The house's cusps (longitudes, in zodiac order) and middle. */
  from: number;
  to: number;
  mid: number;
};

/**
 * A small mark beside a badge on its ring (an intercepted sign beside its
 * house number): the first of `steps` degrees either side of the badge where
 * a disc of `radius` touches nothing (else where it touches least), the k-th
 * mark a step further out.
 */
export function placeBeside(
  at: { ecl: number; r: number },
  k: number,
  polar: PolarFn,
  radius: number,
  discs: Disc[],
  steps: number[] = [6.2, 8, 10],
  clear = 1,
): Pt & { ecl: number } {
  const room = (p: Pt) => {
    let min = Infinity;
    for (const d of discs) min = Math.min(min, Math.hypot(d.x - p.x, d.y - p.y) - (d.r + radius + clear));
    return min;
  };
  let best: (Pt & { ecl: number }) | null = null;
  let bestRoom = -Infinity;
  for (const s of steps) {
    for (const sign of [1, -1]) {
      const ecl = at.ecl + sign * (k + 1) * s;
      const p = { ...polar(ecl, at.r), ecl };
      const free = room(p);
      if (free >= 0) return p;
      if (free > bestRoom + 1e-9) {
        bestRoom = free;
        best = p;
      }
    }
  }
  return best ?? { ...polar(at.ecl + (k + 1) * steps[0], at.r), ecl: at.ecl + (k + 1) * steps[0] };
}

/**
 * Where each house number sits: the middle of its house unless something
 * drawn there (a planet's disc, a yoke) would touch it; then the nearest free
 * place along the house (kept `inset` degrees off its cusps), else the same a
 * step inward, else wherever it touches least.
 */
export function placeBadges(
  badges: Badge[],
  polar: PolarFn,
  opts: { r: number; rIn: number; radius: number; discs: Disc[]; clear?: number; inset?: number; step?: number },
): Map<string, Pt & { ecl: number }> {
  const clear = opts.clear ?? 2;
  const inset = opts.inset ?? 3;
  const step = opts.step ?? 1;
  const out = new Map<string, Pt & { ecl: number }>();
  /** How far the badge stays clear of everything (negative: it touches). */
  const room = (p: Pt) => {
    let min = Infinity;
    for (const d of opts.discs) min = Math.min(min, Math.hypot(d.x - p.x, d.y - p.y) - (d.r + opts.radius + clear));
    return min;
  };
  for (const b of badges) {
    const span = norm(b.to - b.from);
    const reach = span / 2 - inset;
    let best: (Pt & { ecl: number }) | null = null;
    let bestRoom = -Infinity;
    search: for (const r of [opts.r, opts.rIn]) {
      for (let k = 0; k <= Math.max(0, reach) + 1e-9; k += step) {
        for (const sign of k === 0 ? [1] : [1, -1]) {
          const ecl = b.mid + sign * k;
          const p = polar(ecl, r);
          const free = room(p);
          if (free >= 0) {
            best = { ...p, ecl };
            break search;
          }
          if (free > bestRoom + 1e-9) {
            bestRoom = free;
            best = { ...p, ecl };
          }
        }
      }
    }
    out.set(b.id, best ?? { ...polar(b.mid, opts.r), ecl: b.mid });
  }
  return out;
}
