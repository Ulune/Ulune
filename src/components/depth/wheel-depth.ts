/**
 * The wheel's side of the depth engine: what stands out of the flat wheel for
 * a focus, how high, and what shape each piece has (Depth v2, see
 * the depth v2 plan §3–4).
 *
 * The ranking (wheel-rank.ts) says who is involved and how much: the focus
 * itself stands highest (tier 0), what it directly involves next (its sign,
 * house and decan), what those touch lowest. Signs, houses and decans rise as
 * blocks; planets as coins. Lines never rise here: aspect and reception lines
 * stay flat, lit by the focus paint, so a crowded bundle keeps reading as
 * separate strokes (the 3D view draws them as tubes). The pieces are read off
 * the painted chart, so depth always agrees with the highlight.
 */
import { flattenPath, insidePoly, type Pt } from "@/lib/depth/relief-geom";
import type { WheelRanking } from "@/lib/chart/wheel-rank";
import type { DepthAdapter, LiftMode, ReliefItem, ReliefRequest, ReliefShape, Tier } from "./depth-controller";

/**
 * How high each piece stands, px on a 700 px wheel. Low on purpose: a raised
 * piece's sides hang toward the viewer over what lies next to it (a sign's
 * over the decans), so they must cover only a sliver of it — the shadow and
 * the sides' shading carry the depth.
 */
type Heights = { focus: number; slab: number; body: number };
const HEIGHTS: Record<LiftMode, Heights> = {
  pinned: { focus: 7, slab: 5, body: 5 },
  hover: { focus: 5, slab: 3.5, body: 3.5 },
  preview: { focus: 4, slab: 3, body: 3 },
};
/** Under a see-through top (a decan's tint, a house's glass): the card the chart is drawn on. */
const CARD = "var(--color-bg-elevated)";

/** How much glyphs grow on a raised top. */
const BODY_GLYPH: Record<Tier, number> = { 0: 1.22, 1: 1.12, 2: 1.06 };
const SIGN_GLYPH: Record<Tier, number> = { 0: 1.18, 1: 1.1, 2: 1.04 };
const MARK_GLYPH: Record<Tier, number> = { 0: 1.16, 1: 1.08, 2: 1.04 };

function esc(v: string) {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(v) : v.replace(/"/g, '\\"');
}

function num(el: Element | null | undefined, attr: string): number {
  return Number(el?.getAttribute(attr) ?? NaN);
}

function translateOf(el: Element | null | undefined): Pt | null {
  const t = el?.getAttribute("transform") ?? "";
  const m = /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/.exec(t);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

/** The points an element's lines, polylines and dots are drawn through (its own user space). */
function pointsOf(el: Element): Pt[] {
  const out: Pt[] = [];
  const nodes = [el, ...el.querySelectorAll("line, polyline, circle")];
  for (const n of nodes) {
    const tag = n.tagName.toLowerCase();
    if (tag === "line") {
      out.push({ x: num(n, "x1"), y: num(n, "y1") }, { x: num(n, "x2"), y: num(n, "y2") });
    } else if (tag === "polyline") {
      for (const p of (n.getAttribute("points") ?? "").trim().split(/\s+/)) {
        const [x, y] = p.split(",").map(Number);
        out.push({ x, y });
      }
    } else if (tag === "circle") {
      out.push({ x: num(n, "cx"), y: num(n, "cy") });
    }
  }
  // Midway along each stretch too: a leader's ends sit on the house's rims.
  const mids: Pt[] = [];
  for (let i = 1; i < out.length; i += 1) mids.push({ x: (out[i - 1].x + out[i].x) / 2, y: (out[i - 1].y + out[i].y) / 2 });
  return [...out, ...mids].filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

/** Arcs flattened this fine: a wall under a chord never shows a gap under the true arc. */
const ARC_STEP = 4;

function polyOf(path: Element | null, color: string): ReliefShape | null {
  const d = path?.getAttribute("d");
  if (!d) return null;
  try {
    const [pts] = flattenPath(d, ARC_STEP);
    return pts && pts.length >= 3 ? { kind: "poly", pts, d, color } : null;
  } catch {
    return null;
  }
}

function rectPoly(r: Element | null, color: string): ReliefShape | null {
  if (!r) return null;
  const x = num(r, "x");
  const y = num(r, "y");
  const w = num(r, "width");
  const h = num(r, "height");
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  let pts: Pt[] = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  // A label turned along the radius: its plate turns with it.
  const m = /rotate\(\s*([-\d.]+)(?:[ ,]+([-\d.]+)[ ,]+([-\d.]+))?\s*\)/.exec(r.getAttribute("transform") ?? "");
  if (m) {
    const a = (Number(m[1]) * Math.PI) / 180;
    const cx = m[2] != null ? Number(m[2]) : 0;
    const cy = m[3] != null ? Number(m[3]) : 0;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pts = pts.map((p) => ({ x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c }));
  }
  return { kind: "poly", pts, color };
}

const mix = (color: string, pct: number, into = "var(--color-bg-elevated)") => `color-mix(in oklab, ${color} ${pct}%, ${into})`;

export type WheelReliefOptions = {
  /** Prefix of the outer ring's ids: transit, partner or progressed. */
  outerPrefix: "transit" | "partner" | "progressed";
  /** The natal house a body sits in (it stands on that house when it is raised). */
  houseOf: (id: string) => number | null;
  /**
   * A pin's slower fade is on (the figure's `data-focus-fade` when it is not
   * given: a figure whose fades are composited does not carry it).
   */
  pinFade?: boolean;
};

/**
 * Describe what stands out of the wheel for a ranked focus. Returns null when
 * nothing does.
 */
export function collectWheelRelief(
  svg: SVGSVGElement,
  rank: WheelRanking,
  mode: LiftMode,
  opts: WheelReliefOptions,
): ReliefRequest | null {
  if (!rank.id) return null;
  const H = HEIGHTS[mode];
  const items: ReliefItem[] = [];
  const pinned = mode === "pinned";
  const pace = pinned ? 1 : 0.6;
  // The cascade: the focus at once, what it involves after it.
  const delayOf = (tier: Tier, layer: ReliefItem["layer"]) => (tier === 0 ? 0 : (layer === "slab" ? 80 : 140) * pace);
  const heightOf = (tier: Tier, layer: ReliefItem["layer"]) => (tier === 0 ? H.focus : layer === "slab" ? H.slab : H.body);
  // Only the focus and what it directly involves rise (its sign, house and
  // decan); what it only touches (tier 2: the bodies at the other end of its
  // aspects, their signs and houses) is lit flat by the focus paint, pinned
  // too (performance plan 2.4: a busy bi-wheel's pin raised 62 pieces).
  const skip = (tier: Tier) => tier === 2;

  // ── blocks: signs, houses, decans ──
  for (const [sign, r] of rank.signs) {
    if (skip(r.tier)) continue;
    const el = svg.querySelector(`g[data-kind="sign-band"][data-sign="${esc(sign)}"]`);
    if (!el) continue;
    const glyph = el.querySelector('[data-kind="sign-glyph"]') as HTMLElement | null;
    const color = glyph?.style?.color || "var(--color-fg-muted)";
    // A sign is a block of its element's colour with the glyph panel inlaid
    // on top: its sides are coloured all round.
    const shapes = [
      polyOf(el.querySelector('path[data-kind="sign"]'), color),
      polyOf(el.querySelector('path[data-kind="sign-color"]'), color),
    ].filter((s): s is ReliefShape => Boolean(s));
    if (!shapes.length) continue;
    items.push({
      key: `sign:${sign}`,
      kind: "sign",
      tier: r.tier,
      layer: "slab",
      z: heightOf(r.tier, "slab"),
      delay: delayOf(r.tier, "slab"),
      els: [el],
      shapes,
      glyph: SIGN_GLYPH[r.tier],
    });
  }
  // What the figure's CSS dims by (copies of what rides on a raised house
  // must dim the same way), and whether a pin's slower fade is on.
  const focusAttrs: Record<string, string> = { "data-focus-kind": svg.getAttribute("data-focus-kind") ?? "" };
  if (opts.pinFade ?? svg.hasAttribute("data-focus-fade")) focusAttrs["data-focus-fade"] = "";
  // A raised house is a slab carrying its print: the degree ticks, the
  // cusps, the angle axes, the aspect circle's rim and any overlay wash are
  // copied onto it, cut to its outline (else they sank under its frosted top).
  const print = [
    ...svg.querySelectorAll("[data-overlay-washes]"),
    ...svg.querySelectorAll('circle[data-kind="aspect-ring"]'),
    ...[...svg.querySelectorAll('path[data-kind^="tick-"]')].filter((el) => !el.closest('[data-kind="outer-ring"]')),
    ...svg.querySelectorAll('line[data-kind="cusp"]'),
    ...svg.querySelectorAll('[data-kind="cusp-deg"]'),
    ...svg.querySelectorAll('g[data-kind="angle"]'),
  ];
  const housePolys = new Map<number, Pt[]>();
  for (const [n, r] of rank.houses) {
    if (skip(r.tier)) continue;
    const path = svg.querySelector(`path[data-kind="house"][data-hl="house:${n}"]`);
    if (!path) continue;
    const shape = polyOf(path, "var(--relief-glass)");
    if (!shape || shape.kind !== "poly") continue;
    housePolys.set(n, shape.pts);
    const label = svg.querySelector(`g[data-kind="house-num"][data-hl="house:${n}"]`);
    items.push({
      key: `house:${n}`,
      kind: "house",
      tier: r.tier,
      layer: "slab",
      z: heightOf(r.tier, "slab"),
      delay: delayOf(r.tier, "slab"),
      els: label ? [path, label] : [path],
      shapes: [shape],
      glyph: MARK_GLYPH[r.tier],
      base: CARD,
      inlay: print,
      topAttrs: focusAttrs,
    });
  }
  for (const [key, r] of rank.decans) {
    if (skip(r.tier)) continue;
    const glyph = svg.querySelector(`[data-kind="decan-glyph"][data-decan="${esc(key)}"]`) as HTMLElement | null;
    const group = glyph?.parentElement;
    if (!glyph || !group) continue;
    const shape = polyOf(group.querySelector(":scope > path"), mix(glyph.style?.color || "var(--color-fg-muted)", 70, "var(--relief-bg-wall)"));
    if (!shape) continue;
    items.push({
      key: `decan:${key}`,
      kind: "decan",
      tier: r.tier,
      layer: "slab",
      z: heightOf(r.tier, "slab"),
      delay: delayOf(r.tier, "slab"),
      els: [group],
      shapes: [shape],
      glyph: MARK_GLYPH[r.tier],
      base: CARD,
    });
  }

  // ── bodies: coins with their degree plates ──
  const leadOf = (el: Element) => {
    const hl = el.getAttribute("data-hl");
    return hl ? svg.querySelector(`[data-kind="lead"][data-hl="${esc(hl)}"]`) : null;
  };
  const body = (el: Element | null, key: string, tier: Tier, on: string | null) => {
    if (!el || skip(tier)) return;
    const kind = el.getAttribute("data-kind");
    const color = (el as HTMLElement).style?.color || "var(--color-fg-muted)";
    const shapes: ReliefShape[] = [];
    if (kind === "planet" || kind === "transit") {
      const halo = el.querySelector(":scope > .ulune-wheel-halo");
      const cx = num(halo, "cx");
      const cy = num(halo, "cy");
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      shapes.push({ kind: "disc", cx, cy, r: kind === "planet" ? 12.6 : 10.6, color: mix(color, 85) });
      const plate = rectPoly(el.querySelector(":scope > rect"), "var(--relief-bg-wall)");
      if (plate) shapes.push(plate);
    } else if (kind === "angle") {
      // The angle's tip is a small stud (its label is plain text: no plate).
      // (ASC and MC end in an arrowhead, the others in a dot.)
      const tip = el.querySelector(":scope > circle");
      const arrow = el.querySelector(":scope > polygon");
      if (tip) shapes.push({ kind: "disc", cx: num(tip, "cx"), cy: num(tip, "cy"), r: 4.2, color: mix("var(--color-fg)", 60, "var(--color-bg)") });
      else if (arrow) {
        const pts = (arrow.getAttribute("points") ?? "")
          .trim()
          .split(/\s+/)
          .map((p) => p.split(",").map(Number))
          .filter((p) => p.length === 2 && p.every(Number.isFinite))
          .map(([x, y]) => ({ x, y }));
        if (pts.length >= 3) shapes.push({ kind: "poly", pts, color: mix("var(--color-fg)", 60, "var(--color-bg)") });
      }
    } else if (kind === "star" || kind === "mp") {
      const g = [...el.querySelectorAll(":scope > g")].pop();
      const t = translateOf(g);
      if (t) shapes.push({ kind: "disc", cx: t.x + 5.5, cy: t.y + 5.5, r: 6.5, color: mix(color, 55) });
    }
    if (!shapes.length) return;
    const layer = "body" as const;
    // A planet's leader (to its degree on the ring) comes up with it, so a
    // raised house never buries it.
    const lead = kind === "planet" ? leadOf(el) : null;
    items.push({
      key,
      kind: "body",
      tier,
      layer,
      z: heightOf(tier, layer),
      on,
      delay: delayOf(tier, layer),
      els: lead ? [el, lead] : [el],
      shapes,
      glyph: BODY_GLYPH[tier],
    });
  };
  const raisedHouse = (id: string) => {
    const h = opts.houseOf(id);
    return h != null && rank.houses.has(h) && !skip(rank.houses.get(h)!.tier) ? `house:${h}` : null;
  };
  for (const [id, r] of rank.bodies) {
    const angle = svg.querySelector(`[data-kind="angle"][data-hl="angle:${esc(id)}"]`);
    if (angle) {
      body(angle, `angle:${id}`, r.tier, null);
      continue;
    }
    body(svg.querySelector(`[data-kind="planet"][data-hl="planet:${esc(id)}"]`), `planet:${id}`, r.tier, raisedHouse(id));
  }
  for (const [id, r] of rank.partners) {
    const hl = `${opts.outerPrefix}:${id}`;
    body(svg.querySelector(`[data-kind="transit"][data-hl="${esc(hl)}"]`), hl, r.tier, null);
  }
  // A star or midpoint in focus is the focus itself (a reception is a line:
  // it stays flat, its two planets rise).
  const kind = rank.id.slice(0, rank.id.indexOf(":"));
  if (kind === "star" || kind === "mp") {
    body(svg.querySelector(`[data-hl="${esc(rank.id)}"][data-kind="${kind}"]`), rank.id, 0, null);
  }

  // ── riders: what is drawn in a raised house rides on it ──
  // Planets (with their labels and leaders), midpoints, transit pins, the
  // degree dots and the conjunction yokes under the glyphs drawn in a raised
  // house stand flush on it, exactly as the flat chart paints them (dimmed or not); under its
  // frosted top they vanished.
  if (housePolys.size) {
    const taken = new Set(items.map((it) => it.key));
    const houseAt = (pts: Pt[]) => {
      for (const [n, poly] of housePolys) if (pts.some((p) => insidePoly(p, poly))) return n;
      return null;
    };
    const ride = (key: string, els: Element[], shapes: ReliefShape[], pts: Pt[]) => {
      if (taken.has(key) || !shapes.length) return;
      const n = houseAt(pts);
      if (n == null) return;
      taken.add(key);
      items.push({
        key,
        kind: "body",
        tier: 2,
        layer: "body",
        z: 0,
        on: `house:${n}`,
        delay: 0,
        els,
        shapes,
        glyph: 1,
        rider: true,
        topAttrs: focusAttrs,
      });
    };
    for (const el of svg.querySelectorAll('[data-kind="planet"][data-hl]')) {
      const halo = el.querySelector(":scope > .ulune-wheel-halo");
      const c = { x: num(halo, "cx"), y: num(halo, "cy") };
      if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) continue;
      const plate = rectPoly(el.querySelector(":scope > rect"), "var(--relief-bg-wall)");
      const lead = leadOf(el);
      const pts: Pt[] = [c, ...(plate?.kind === "poly" ? plate.pts : []), ...(lead ? pointsOf(lead) : [])];
      const shapes: ReliefShape[] = [{ kind: "disc", cx: c.x, cy: c.y, r: 12.6, color: "var(--color-fg-muted)" }];
      if (plate) shapes.push(plate);
      ride(el.getAttribute("data-hl")!, lead ? [el, lead] : [el], shapes, pts);
    }
    for (const el of svg.querySelectorAll('[data-kind="mp"][data-hl]')) {
      const t = translateOf([...el.querySelectorAll(":scope > g")].pop());
      if (!t) continue;
      const c = { x: t.x + 5.5, y: t.y + 5.5 };
      ride(el.getAttribute("data-hl")!, [el], [{ kind: "disc", cx: c.x, cy: c.y, r: 6.5, color: "var(--color-fg-muted)" }], [c, ...pointsOf(el)]);
    }
    // Each body's degree dot on the aspect circle (its lines land on it).
    for (const el of svg.querySelectorAll('[data-kind="degree-dot"][data-hl]')) {
      const c = { x: num(el, "cx"), y: num(el, "cy") };
      if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) continue;
      ride(`dot:${el.getAttribute("data-hl")}`, [el], [{ kind: "disc", cx: c.x, cy: c.y, r: 2.4, color: "var(--color-fg-muted)" }], [c]);
    }
    // A conjunction's yoke under the glyphs, with its lit copy and its glyph.
    for (const g of svg.querySelectorAll('g[data-aspect][data-hl][data-type="conjunction"]')) {
      const path = g.querySelector('[data-aspect-line][data-yoke="glyphs"]');
      if (!path) continue;
      const pts: Pt[] = (path.getAttribute("data-pts") ?? "")
        .trim()
        .split(/\s+/)
        .map((q) => q.split(",").map(Number))
        .filter((q) => q.length === 2 && q.every(Number.isFinite))
        .map(([x, y]) => ({ x, y }));
      if (pts.length < 2) continue;
      const hl = g.getAttribute("data-hl")!;
      const top = svg.querySelector(`[data-top-of="${esc(hl)}"]`);
      const mark = svg.querySelector(`[data-aspect-mark][data-mark-of="${esc(hl)}"][data-on="1"]`);
      const shapes: ReliefShape[] = [];
      for (let i = 1; i < pts.length; i += 1) {
        shapes.push({ kind: "line", x1: pts[i - 1].x, y1: pts[i - 1].y, x2: pts[i].x, y2: pts[i].y, w: 2, color: "var(--color-fg-muted)" });
      }
      ride(`yoke:${hl}`, [g, ...(top ? [top] : []), ...(mark ? [mark] : [])], shapes, pts);
    }
    for (const el of svg.querySelectorAll('[data-kind="tpin"][data-hl]')) {
      const pts = pointsOf(el);
      if (pts.length < 2) continue;
      const [a, b] = [pts[0], pts[pts.length - 1]];
      ride(`pin:${el.getAttribute("data-hl")}`, [el], [{ kind: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y, w: 1.8, color: "var(--color-fg-muted)" }], pts);
    }
  }
  if (!items.length) return null;
  return { key: rank.id, mode, items };
}

export const WHEEL_DEPTH_ADAPTER: DepthAdapter = {
  planeClass: "ulune-wheel",
};
