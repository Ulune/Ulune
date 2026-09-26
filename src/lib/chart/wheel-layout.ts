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

/**
 * Place degree labels so none touches another label or a glyph: each tries
 * its ring (level), then the second ring (level), then its ring turned along
 * the radius; if all three touch something, the one touching least wins.
 * `centre` is the wheel's centre (for the radial turn).
 */
export function placeLabels(
  items: LabelItem[],
  polar: PolarFn,
  centre: Pt,
  opts: { r1: number; r2: number; discs: Disc[]; pad?: number },
): Map<string, LabelPlace> {
  const pad = opts.pad ?? 1.5;
  const placed: OBox[] = [];
  const out = new Map<string, LabelPlace>();
  const order = [...items].sort((a, b) => norm(a.angle) - norm(b.angle));
  for (const it of order) {
    const p1 = polar(it.angle, opts.r1);
    const p2 = polar(it.angle, opts.r2);
    // Radial: centred a little further out so its inner end clears the glyph.
    const pr = polar(it.angle, opts.r1 + Math.max(0, (it.w - it.h) / 2));
    const phi = (Math.atan2(pr.y - centre.y, pr.x - centre.x) * 180) / Math.PI;
    // Read left to right on both halves of the wheel.
    const rot = Math.cos((phi * Math.PI) / 180) >= 0 ? phi : phi + 180;
    const cands: { box: OBox; place: LabelPlace }[] = [
      { box: { cx: p1.x, cy: p1.y, hw: it.w / 2, hh: it.h / 2, rot: 0 }, place: { x: p1.x, y: p1.y, rot: 0, at: 0 } },
      { box: { cx: p2.x, cy: p2.y, hw: it.w / 2, hh: it.h / 2, rot: 0 }, place: { x: p2.x, y: p2.y, rot: 0, at: 1 } },
      { box: { cx: pr.x, cy: pr.y, hw: it.w / 2, hh: it.h / 2, rot }, place: { x: pr.x, y: pr.y, rot, at: "radial" } },
    ];
    let best = cands[0];
    let bestHits = Infinity;
    for (const c of cands) {
      let hits = 0;
      for (const b of placed) if (boxesOverlap(c.box, b, pad)) hits += 1;
      for (const d of opts.discs) if (discGap(d, c.box) < pad / 2) hits += 1;
      if (hits === 0) {
        best = c;
        bestHits = 0;
        break;
      }
      if (hits < bestHits) {
        best = c;
        bestHits = hits;
      }
    }
    placed.push(best.box);
    out.set(it.id, best.place);
  }
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
