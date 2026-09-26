/**
 * The 2D relief: a lifted focus drawn as low solid pieces standing out of a
 * flat figure (see the 2D polish plan).
 *
 * Each piece has
 *  - a top: a copy of the figure's own element, exactly where it was drawn
 *    (nothing moves under the pointer; glyphs pop a little on a pin),
 *  - sides: one small SVG holding its floor (the silhouette again, h·W lower)
 *    and the walls joining it to the top's edges that face the viewer, each
 *    facet shaded by where it faces. Pieces stand low, so their sides cover
 *    little of what lies next to them. What the focus only touches (tier 2)
 *    has no sides, just its shadow,
 *  - a soft shadow, drawn with the other shadows of its group in one blurred
 *    layer.
 * A rise is one slide per piece (its sides come out from under its top; a
 * line's side stretches down from the line) and a fade of the shadow layers:
 * transforms and opacity only, so the compositor runs it while the page is
 * busy, Safari included.
 *
 * Painter's order (the viewer looks from the front, above): shadows on the
 * plate, lines (aspects, channels), blocks (signs, houses, decans, centres),
 * shadows on the blocks, then the bodies standing on them or on the plate.
 * Within a group, farther pieces are painted first.
 */
import {
  bandFace,
  boundsOf,
  centroid,
  depthKey,
  discBand,
  floorAt,
  insidePoly,
  lineBand,
  lineFrame,
  shadowAt,
  strokeOutline,
  toLineLocal,
  wallBands,
  wallLight,
  WALL,
  type Box,
  type Pt,
} from "@/lib/depth/relief-geom";

const SVG_NS = "http://www.w3.org/2000/svg";

export type LiftMode = "hover" | "pinned" | "preview";
export type Tier = 0 | 1 | 2;
export type ReliefLayer = "line" | "slab" | "body";

export type ReliefShape =
  | { kind: "poly"; pts: Pt[]; d?: string; color: string }
  | { kind: "disc"; cx: number; cy: number; r: number; color: string }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; w: number; color: string };

export type ReliefItem = {
  /** Unique within its request (e.g. "sign:gemini"). */
  key: string;
  /** Styling hook for the top (sign, house, decan, body, aspect, center, gate, channel…). */
  kind: string;
  tier: Tier;
  layer: ReliefLayer;
  /** Height above what it stands on, px on a 700 px figure. */
  z: number;
  /** The item it stands on (a raised block under a planet), if any. */
  on?: string | null;
  /** When it starts to rise, ms. */
  delay: number;
  /** The figure's elements it stands for (hidden while it is up). */
  els: Element[];
  /** Copied onto its top, in order (defaults to `els`). */
  tops?: Element[];
  shapes: ReliefShape[];
  /** How much its glyphs grow on the top. */
  glyph?: number;
  /** Aspects: 0..1 from the orb (tightest = 1). */
  strength?: number;
  /**
   * A solid face under a see-through top (its colour), so its own sides and
   * what lies under it do not show through; none when the top is opaque.
   */
  base?: string | null;
  /**
   * The print on a raised block (a house's degree ticks, cusps, the angle
   * axes): copied onto its face, cut to its outline, right after the first
   * top element. The originals stay where they are.
   */
  inlay?: Element[];
  /**
   * Stands flush on the block it rides (a planet in a raised house): drawn
   * as it is, dimmed or not, never popping; its copy eases from where the
   * original's paint stands to the paint's target.
   */
  rider?: boolean;
  /** Attributes for its top's SVG (the figure's focus state, so its CSS dims what it dims). */
  topAttrs?: Record<string, string>;
};

export type ReliefRequest = {
  /** Identity of the focus: the same key never re-rises. */
  key: string;
  mode: LiftMode;
  items: ReliefItem[];
};

/** How chart units map to CSS px inside the stack (the base SVG's own mapping). */
export type ReliefFrame = { k: number; ox: number; oy: number; vb: { x: number; y: number; w: number; h: number } };

/* Quick to answer, soft to land: a pin settles, a hover just eases out (no
   bounce under a moving pointer); letting go is quicker still. */
const RISE_MS: Record<LiftMode, number> = { pinned: 420, hover: 260, preview: 260 };
const RISE_EASE: Record<LiftMode, string> = {
  pinned: "cubic-bezier(0.25, 1.12, 0.4, 1)",
  hover: "cubic-bezier(0.22, 1, 0.36, 1)",
  preview: "cubic-bezier(0.22, 1, 0.36, 1)",
};
const SINK_MS: Record<LiftMode, number> = { pinned: 260, hover: 180, preview: 180 };
const SINK_EASE = "cubic-bezier(0.4, 0, 0.9, 0.6)";
const SHADE_EASE = "cubic-bezier(0.33, 1, 0.68, 1)";
/** A fresh piece's sides fade in over this part of its rise (their first, tucked frames never show). */
const FADE_PART = 0.3;
/** Walls start this far (in height) under the top, so no hairline shows between them. */
const TUCK = 0.7;
/** Walls: one facet per edge of the outline (arcs are already fine polylines). */
const WALL_TURN = 1;
/** How much of the material's colour a wall keeps (toward the relief shade), in shade … in the light. */
const WALL_LIGHT = { lo: 0.62, hi: 0.94 };
/** The floor shows only in slivers next to the walls: as the walls in shade. */
const FLOOR_LIGHT = WALL_LIGHT.lo;
/** Room around a top for glyph pops, halos and strokes, units. */
const TOP_PAD = 16;

const STRIP_ATTRS = ["id", "data-testid", "tabindex", "role", "focusable", "aria-label", "aria-pressed", "data-depth-hidden"];

/** Deep clone for a copy: no ids, no tab stops, no tooltips. */
export function cleanClone(el: Element): Element {
  const c = el.cloneNode(true) as Element;
  const of = el.getAttribute("data-testid");
  const all = [c, ...c.querySelectorAll("*")];
  for (const n of all) {
    for (const a of STRIP_ATTRS) if (n.hasAttribute(a)) n.removeAttribute(a);
  }
  for (const t of c.querySelectorAll("title")) t.remove();
  c.setAttribute("data-depth-clone", "1");
  // Which original this copy stands for (the test id itself is not repeated).
  if (of) c.setAttribute("data-clone-of", of);
  return c;
}

/** A side's colour: the material toward the relief shade. */
function shadeOf(color: string, light: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, light)) * 100);
  return `color-mix(in oklab, ${color} ${pct}%, var(--relief-shade))`;
}

/** How much colour a wall facing `n` keeps: never near black, never a glare. */
function sideLight(n: Pt): number {
  const t = Math.max(0, Math.min(1, (wallLight(n) - 0.46) / 0.54));
  return WALL_LIGHT.lo + (WALL_LIGHT.hi - WALL_LIGHT.lo) * t;
}

type PolyShape = Extract<ReliefShape, { kind: "poly" }>;
type DiscShape = Extract<ReliefShape, { kind: "disc" }>;
type LineShape = Extract<ReliefShape, { kind: "line" }>;

/** One SVG of a piece's sides and where it stands for a height x (units). */
type Side = { el: SVGSVGElement; at: (x: number) => string };

type Built = {
  item: ReliefItem;
  /** Target height above its base, units. */
  h: number;
  /** Height its rise starts from (0 for a fresh piece). */
  from: number;
  /** The height its sides are drawn at (they slide or stretch from there). */
  full: number;
  /** Its sides' opacity when its rise starts (a piece caught fading in). */
  o0: number;
  sides: Side[];
  top: SVGSVGElement;
  anim: Animation | null;
};

let gradSeq = 0;

function px(n: number) {
  return `${n.toFixed(3)}px`;
}

function num(n: number) {
  return String(Math.round(n * 1000) / 1000);
}

function setBox(el: HTMLElement | SVGElement, b: Box) {
  el.style.left = px(b.x);
  el.style.top = px(b.y);
  el.style.width = px(Math.max(0.01, b.w));
  el.style.height = px(Math.max(0.01, b.h));
}

function svgRoot(cls: string, box: Box): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", cls);
  svg.setAttribute("viewBox", `${num(box.x)} ${num(box.y)} ${num(box.w)} ${num(box.h)}`);
  setBox(svg, box);
  return svg;
}

function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, typeof v === "number" ? num(v) : v);
  return el;
}

function ptsPath(pts: Pt[]): string {
  return `M ${pts.map((p) => `${num(p.x)} ${num(p.y)}`).join(" L ")} Z`;
}

function add(p: Pt, q: Pt): Pt {
  return { x: p.x + q.x, y: p.y + q.y };
}

function scale(p: Pt, k: number): Pt {
  return { x: p.x * k, y: p.y * k };
}

function unit(p: Pt): Pt {
  const l = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / l, y: p.y / l };
}

function shapePoints(s: ReliefShape): Pt[] {
  if (s.kind === "poly") return s.pts;
  if (s.kind === "disc") {
    return [
      { x: s.cx - s.r, y: s.cy - s.r },
      { x: s.cx + s.r, y: s.cy + s.r },
    ];
  }
  const h = s.w / 2;
  return [
    { x: Math.min(s.x1, s.x2) - h, y: Math.min(s.y1, s.y2) - h },
    { x: Math.max(s.x1, s.x2) + h, y: Math.max(s.y1, s.y2) + h },
  ];
}

function itemCentre(item: ReliefItem): Pt {
  const pts = item.shapes.flatMap((s) =>
    s.kind === "poly" ? [centroid(s.pts)] : s.kind === "disc" ? [{ x: s.cx, y: s.cy }] : [{ x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 }],
  );
  return pts.length ? centroid(pts) : { x: 0, y: 0 };
}

/** The union of the top elements' boxes (their own user space: no transforms of their own). */
function topBox(els: Element[], shapes: ReliefShape[]): Box {
  const pts: Pt[] = shapes.flatMap(shapePoints);
  for (const el of els) {
    try {
      const b = (el as SVGGraphicsElement).getBBox();
      if (b.width || b.height) {
        pts.push({ x: b.x, y: b.y }, { x: b.x + b.width, y: b.y + b.height });
      }
    } catch {
      /* not rendered */
    }
  }
  return boundsOf(pts, TOP_PAD);
}

/** A shape as an SVG element (lines as round-capped strokes). */
function shapeEl(s: ReliefShape): SVGElement {
  if (s.kind === "poly") return node("path", { d: s.d ?? ptsPath(s.pts) });
  if (s.kind === "disc") return node("circle", { cx: s.cx, cy: s.cy, r: s.r });
  const el = node("line", { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, "stroke-width": Math.max(0.8, s.w) });
  el.setAttribute("data-line", "");
  return el;
}

/** Can the browser run Web Animations here (tests without them just show the end state)? */
function canAnimate(el: Element): boolean {
  return typeof (el as HTMLElement).animate === "function";
}

/** An element's opacity as the page paints it (a style read: flushes the page's pending styles). */
function opacityNow(el: Element): number {
  const o = Number.parseFloat(getComputedStyle(el).opacity);
  return Number.isFinite(o) ? o : 1;
}

/** An animation this slot started, with the keyframes it was given. */
type Own = { a: Animation; frames: Keyframe[] };

/**
 * The opacity an animation gives its element now, from its keyframes and its
 * progress (timing only: no style read), or null when it does not move
 * opacity or is not in effect (finished without fill, cancelled, waiting
 * without backwards fill).
 */
function animatedOpacity({ a, frames }: Own): number | null {
  const stops: { off: number; o: number }[] = [];
  frames.forEach((f, i) => {
    if (f.opacity == null) return;
    const off = f.offset ?? (frames.length > 1 ? i / (frames.length - 1) : 0);
    stops.push({ off, o: Number(f.opacity) });
  });
  if (stops.length < 2) return null;
  const p = a.effect?.getComputedTiming().progress;
  if (p == null) return null;
  let i = 0;
  while (i < stops.length - 2 && p > stops[i + 1].off) i += 1;
  const s0 = stops[i];
  const s1 = stops[i + 1];
  const span = s1.off - s0.off;
  const t = span > 0 ? (p - s0.off) / span : 1;
  return Math.max(0, Math.min(1, s0.o + (s1.o - s0.o) * t));
}

export class ReliefSlot {
  readonly root: HTMLDivElement;
  req: ReliefRequest | null = null;
  /** Originals this slot hid (the controller counts them). */
  hidden: Element[] = [];
  sinking = false;
  private built: Built[] = [];
  /** The shadow layers (one per group that has shadows). */
  private shades: SVGSVGElement[] = [];
  /** Shadow layers of the previous build, fading out under the new ones. */
  private fading = new Set<SVGSVGElement>();
  private planeClass: string;
  private done: (() => void) | null = null;
  /** Rider copies waiting to take the figure's paint (build → release). */
  private eased: SVGElement[] = [];
  /**
   * The Web Animations this slot started, by element, with their keyframes.
   * They are cancelled from here, and the opacity they give a piece is worked
   * out from them: asking the page (`getAnimations()`, `getComputedStyle`)
   * flushes its styles, the whole figure's after a focus change.
   */
  private anims = new Map<Element, Own[]>();

  constructor(host: HTMLElement, planeClass: string, before: Node | null = null) {
    this.planeClass = planeClass;
    this.root = document.createElement("div");
    this.root.className = "ulune-relief";
    this.root.setAttribute("aria-hidden", "true");
    host.insertBefore(this.root, before && before.parentNode === host ? before : null);
  }

  /** Map chart units onto the stack (the base SVG's mapping). */
  place(f: ReliefFrame) {
    this.root.style.width = px(f.vb.w);
    this.root.style.height = px(f.vb.h);
    this.root.style.transform = `translate(${px(f.ox)}, ${px(f.oy)}) scale(${f.k.toFixed(6)}) translate(${px(-f.vb.x)}, ${px(-f.vb.y)})`;
  }

  /**
   * Build the pieces of a request, standing at their full height (rise()
   * animates them). `unitsOf` turns a height in px on a 700 px figure into
   * chart units. `from` gives the heights pieces already stand at (a focus
   * changing mode, or redrawn mid-rise): they grow or shrink from there, and
   * the previous shadows fade out under the new ones. `at` builds pieces
   * standing at given heights instead of their own (a slot about to sink).
   */
  build(
    req: ReliefRequest,
    unitsOf: (zPx: number) => number,
    hide: (el: Element) => void,
    from: Map<string, number> = new Map(),
    at: Map<string, number> | null = null,
  ) {
    const old = from.size ? this.shades.map((el) => ({ el, group: el.parentElement?.getAttribute("data-relief-group") ?? "", o: this.opacityOf(el) })) : [];
    // Pieces caught fading in carry on from their opacity.
    const oldO = new Map<string, number>();
    if (from.size) for (const b of this.built) if (b.sides[0]) oldO.set(b.item.key, this.opacityOf(b.sides[0].el));
    this.reset();
    this.req = req;
    this.root.setAttribute("data-mode", req.mode);
    this.root.setAttribute("data-relief-key", req.key);
    const items = [...req.items].sort((a, b) => depthKey(itemCentre(a)) - depthKey(itemCentre(b)));
    const byKey = new Map(items.map((it) => [it.key, it]));
    // Everything read off the figure is read here, before the first write:
    // a box or an opacity read after hiding the previous piece forced the
    // browser to restyle and lay out the whole figure again, piece by piece.
    const boxes = new Map(items.map((it) => [it.key, topBox(it.tops ?? it.els, it.shapes)]));
    // A rider's copy starts from its original's opacity, unless that original
    // is hidden, already or by a piece built before it in this pass.
    const riderO = new Map<Element, number>();
    const hiddenBefore = new Set<Element>();
    for (const it of items) {
      if (it.rider) {
        for (const el of it.tops ?? it.els) {
          if (el.getAttribute("data-depth-hidden") !== "1" && !hiddenBefore.has(el)) riderO.set(el, opacityNow(el));
        }
      }
      for (const el of it.els) hiddenBefore.add(el);
    }
    const onBlock = (it: ReliefItem) => Boolean(it.on && byKey.has(it.on));
    const frag = document.createDocumentFragment();
    const groups = new Map<string, HTMLDivElement>();
    const group = (name: string) => {
      const g = document.createElement("div");
      g.className = "ulune-relief-group";
      g.setAttribute("data-relief-group", name);
      frag.appendChild(g);
      groups.set(name, g);
      return g;
    };
    const gPlateShadow = group("plate-shadows");
    const gLineSides = group("line-sides");
    const gLineTops = group("line-tops");
    const gSlabSides = group("slab-sides");
    const gSlabTops = group("slab-tops");
    const gRaisedShadow = group("raised-shadows");
    const gBodySides = group("body-sides");
    const gBodyTops = group("body-tops");
    const plate: Built[] = [];
    const raised: Built[] = [];
    for (const item of items) {
      const h = at?.get(item.key) ?? unitsOf(item.z);
      const f = at ? h : Math.max(0, from.get(item.key) ?? 0);
      const full = Math.max(h, f);
      const sidesParent = item.layer === "line" ? gLineSides : item.layer === "slab" ? gSlabSides : gBodySides;
      const topsParent = item.layer === "line" ? gLineTops : item.layer === "slab" ? gSlabTops : gBodyTops;
      const sides = item.tier < 2 && full > 0.05 ? this.sides(item, full, sidesParent) : [];
      const top = this.top(item, topsParent, req.mode, boxes.get(item.key) ?? topBox(item.tops ?? item.els, item.shapes), riderO);
      top.setAttribute("data-h", h.toFixed(2));
      // Standing at the target height until rise() animates it.
      for (const s of sides) s.el.style.transform = s.at(h);
      const b: Built = { item, h, from: f, full, sides, top, anim: null, o0: f > 0.001 ? (oldO.get(item.key) ?? 1) : 0 };
      this.built.push(b);
      if (h > 0.05) (onBlock(item) ? raised : plate).push(b);
      for (const el of item.els) {
        hide(el);
        this.hidden.push(el);
      }
    }
    this.shade(plate, gPlateShadow);
    this.shade(raised, gRaisedShadow);
    this.root.appendChild(frag);
    this.release();
    // The previous shadows fade out under the new ones (which fade in).
    for (const s of old) {
      const g = groups.get(s.group);
      if (!g) continue;
      g.insertBefore(s.el, g.firstChild);
      s.el.style.opacity = String(s.o);
      this.fading.add(s.el);
      if (!canAnimate(s.el)) {
        this.fade(s.el);
        continue;
      }
      const a = this.play(s.el, [{ opacity: s.o }, { opacity: 0 }], { duration: RISE_MS[req.mode], easing: SHADE_EASE, fill: "forwards" });
      a.onfinish = () => this.fade(s.el);
    }
  }

  /** A shadow layer of an earlier build is gone. */
  private fade(el: SVGSVGElement) {
    this.cancelOwn(el);
    el.remove();
    this.fading.delete(el);
  }

  /**
   * The sides of a piece at height `full`: polygons and discs in one SVG that
   * slides out from under the top; each line in its own frame, stretched down
   * from the line.
   */
  private sides(item: ReliefItem, full: number, parent: HTMLElement): Side[] {
    const out: Side[] = [];
    const polys = item.shapes.filter((s): s is PolyShape => s.kind === "poly");
    // An aspect's mark rides on its rod: only the rod has sides.
    const discs = item.layer === "line" ? [] : item.shapes.filter((s): s is DiscShape => s.kind === "disc");
    const lines = item.shapes.filter((s): s is LineShape => s.kind === "line");
    const off = floorAt(full);
    const tuck = floorAt(TUCK);
    if (polys.length || discs.length) {
      const pts = [...polys.flatMap((s) => s.pts), ...discs.flatMap(shapePoints)];
      const box = boundsOf([...pts, ...pts.map((p) => add(p, off)), ...pts.map((p) => add(p, scale(tuck, -1)))], 1);
      const svg = svgRoot("ulune-relief-sides", box);
      svg.setAttribute("data-key", item.key);
      const defs = discs.length ? node("defs", {}) : null;
      if (defs) svg.appendChild(defs);
      // A coin's side is round: lit along its width like a cylinder.
      const discFill = new Map<DiscShape, string>();
      for (const s of discs) {
        const band = discBand({ x: s.cx, y: s.cy }, s.r);
        const id = `ulune-relief-g${(gradSeq += 1)}`;
        const grad = node("linearGradient", { id, gradientUnits: "userSpaceOnUse", x1: band.a.x, y1: band.a.y, x2: band.b.x, y2: band.b.y });
        const d = unit({ x: band.b.x - band.a.x, y: band.b.y - band.a.y });
        const face = bandFace(band);
        for (const u of [-1, -0.6, 0, 0.6, 1]) {
          const w = Math.sqrt(Math.max(0, 1 - u * u));
          const stop = node("stop", { offset: (u + 1) / 2 });
          stop.style.stopColor = shadeOf(s.color, sideLight({ x: u * d.x + w * face.x, y: u * d.y + w * face.y }));
          grad.appendChild(stop);
        }
        defs!.appendChild(grad);
        discFill.set(s, `url(#${id})`);
      }
      // The floor first (it shows only in slivers under the walls' lower
      // edge), then the walls, farther first.
      const floor = node("g", { transform: `translate(${num(off.x)} ${num(off.y)})` });
      for (const s of polys) {
        const p = shapeEl(s);
        p.style.fill = shadeOf(s.color, FLOOR_LIGHT);
        floor.appendChild(p);
      }
      for (const s of discs) {
        const c = shapeEl(s);
        c.style.fill = discFill.get(s)!;
        floor.appendChild(c);
      }
      svg.appendChild(floor);
      const walls: { pts: Pt[]; fill: string; depth: number }[] = [];
      const wall = (a: Pt, b: Pt) => [add(a, scale(tuck, -1)), add(b, scale(tuck, -1)), add(b, off), add(a, off)];
      for (const s of polys) {
        for (const band of wallBands(s.pts, WALL_TURN)) {
          // An edge another shape of the piece covers is inside the solid.
          const n = unit(add(band.n0, band.n1));
          const probe = { x: (band.a.x + band.b.x) / 2 + n.x * 0.6, y: (band.a.y + band.b.y) / 2 + n.y * 0.6 };
          if (polys.some((o) => o !== s && insidePoly(probe, o.pts))) continue;
          walls.push({ pts: wall(band.a, band.b), fill: shadeOf(s.color, sideLight(n)), depth: band.depth });
        }
      }
      for (const s of discs) {
        const band = discBand({ x: s.cx, y: s.cy }, s.r);
        walls.push({ pts: wall(band.a, band.b), fill: discFill.get(s)!, depth: band.depth });
      }
      walls.sort((p, q) => p.depth - q.depth);
      for (const w of walls) {
        const poly = node("polygon", { points: w.pts.map((p) => `${num(p.x)},${num(p.y)}`).join(" ") });
        poly.setAttribute("data-wall", "");
        poly.style.fill = w.fill;
        svg.appendChild(poly);
      }
      parent.appendChild(svg);
      out.push({ el: svg, at: (x) => `translate(${px((x - full) * WALL.x)}, ${px((x - full) * WALL.y)})` });
    }
    for (const s of lines) {
      const side = this.lineSide(item, s, full, parent);
      if (side) out.push(side);
    }
    return out;
  }

  /** A raised line's side: the ribbon down to its floor rod, in the line's own frame. */
  private lineSide(item: ReliefItem, s: LineShape, full: number, parent: HTMLElement): Side | null {
    const p1 = { x: s.x1, y: s.y1 };
    const p2 = { x: s.x2, y: s.y2 };
    if (Math.hypot(p2.x - p1.x, p2.y - p1.y) < 0.5) return null;
    const w = Math.max(0.8, s.w);
    const off = floorAt(full);
    const band = lineBand(p1, p2);
    const fill = shadeOf(s.color, band ? sideLight(bandFace(band)) : FLOOR_LIGHT);
    if (!band) {
      // Seen end-on (it runs along W): its side is the floor rod, sliding.
      const rod = strokeOutline(add(p1, off), add(p2, off), w);
      const box = boundsOf([...rod, p1, p2], 1);
      const svg = svgRoot("ulune-relief-sides", box);
      svg.setAttribute("data-key", item.key);
      const path = node("path", { d: ptsPath(rod) });
      path.style.fill = fill;
      svg.appendChild(path);
      parent.appendChild(svg);
      return { el: svg, at: (x) => `translate(${px((x - full) * WALL.x)}, ${px((x - full) * WALL.y)})` };
    }
    const f = lineFrame(band.a, band.b);
    const depth = full * f.wPerp;
    const rod = strokeOutline(add(band.a, off), add(band.b, off), w).map((q) => toLineLocal(f, q));
    const ribbon: Pt[] = [
      { x: -w / 2, y: 0 },
      { x: f.len + w / 2, y: 0 },
      { x: f.len + w / 2, y: depth },
      { x: -w / 2, y: depth },
    ];
    const box = boundsOf([...rod, ...ribbon], 1);
    const svg = svgRoot("ulune-relief-sides", { x: f.a.x + box.x, y: f.a.y + box.y, w: box.w, h: box.h });
    svg.setAttribute("viewBox", `${num(box.x)} ${num(box.y)} ${num(box.w)} ${num(box.h)}`);
    svg.setAttribute("data-key", item.key);
    svg.style.transformOrigin = `${px(-box.x)} ${px(-box.y)}`;
    const floor = node("path", { d: ptsPath(rod) });
    floor.style.fill = fill;
    svg.appendChild(floor);
    const poly = node("polygon", { points: ribbon.map((p) => `${num(p.x)},${num(p.y)}`).join(" ") });
    poly.setAttribute("data-wall", "");
    poly.style.fill = fill;
    svg.appendChild(poly);
    parent.appendChild(svg);
    const turn = `rotate(${f.rotate.toFixed(5)}rad) skewX(${f.skew.toFixed(5)}rad)`;
    return { el: svg, at: (x) => `${turn} scaleY(${Math.max(0.001, x / full).toFixed(5)})` };
  }

  /** The shadows of a group's pieces, in one blurred layer. */
  private shade(list: Built[], parent: HTMLElement) {
    if (!list.length) return;
    const pts: Pt[] = [];
    let hMax = 0;
    for (const b of list) {
      const o = shadowAt(b.h);
      for (const p of b.item.shapes.flatMap(shapePoints)) pts.push(add(p, o));
      hMax = Math.max(hMax, b.h);
    }
    const blur = 0.9 + 0.22 * hMax;
    const svg = svgRoot("ulune-relief-shade", boundsOf(pts, blur * 3 + 2));
    svg.style.setProperty("--relief-blur", px(blur));
    svg.setAttribute("data-dy", shadowAt(hMax).y.toFixed(2));
    for (const b of list) {
      const o = shadowAt(b.h);
      const g = node("g", { transform: `translate(${num(o.x)} ${num(o.y)})` });
      g.setAttribute("data-tier", String(b.item.tier));
      for (const s of b.item.shapes) g.appendChild(shapeEl(s));
      svg.appendChild(g);
    }
    parent.appendChild(svg);
    this.shades.push(svg);
  }

  private top(
    item: ReliefItem,
    parent: HTMLElement,
    mode: LiftMode,
    box: Box,
    riderO: Map<Element, number>,
  ): SVGSVGElement {
    const els = item.tops ?? item.els;
    const svg = svgRoot(`${this.planeClass} ulune-relief-top`, box);
    svg.setAttribute("data-kind", item.kind);
    svg.setAttribute("data-tier", String(item.tier));
    svg.setAttribute("data-mode", mode);
    // For QA: which piece, and how high it stands (units above its base).
    svg.setAttribute("data-key", item.key);
    svg.style.setProperty("--glyph-s", String(item.glyph ?? 1));
    svg.style.setProperty("--relief-delay", `${Math.round(item.delay)}ms`);
    svg.style.setProperty("--relief-dur", `${RISE_MS[mode]}ms`);
    for (const [k, v] of Object.entries(item.topAttrs ?? {})) svg.setAttribute(k, v);
    if (item.rider) svg.setAttribute("data-rider", "");
    if (item.base) {
      for (const s of item.shapes) {
        if (s.kind === "line") continue;
        const base = shapeEl(s);
        base.setAttribute("class", "ulune-relief-base");
        base.style.fill = item.base;
        svg.appendChild(base);
      }
    }
    // A rider's copy starts from the original's paint as it stands (the
    // figure may be fading to a new focus) and eases on to the target once
    // the build is in the page (see build()).
    els.forEach((el, i) => {
      const c = cleanClone(el);
      const o = item.rider ? riderO.get(el) : undefined;
      if (o != null) {
        (c as SVGElement).style.opacity = String(o);
        this.eased.push(c as SVGElement);
      }
      this.dress(c, item);
      svg.appendChild(c);
      if (i === 0 && item.inlay?.length) svg.appendChild(this.inlay(item));
    });
    parent.appendChild(svg);
    return svg;
  }

  /** Riders' copies take the figure's paint from where it stood (their styles resolved in the page first). */
  private release() {
    if (!this.eased.length) return;
    for (const c of this.eased) void getComputedStyle(c).opacity;
    for (const c of this.eased) c.style.opacity = "";
    this.eased = [];
  }

  /** Start an animation this slot owns (see `anims`). */
  private play(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation {
    const a = (el as HTMLElement).animate(frames, opts);
    const own = { a, frames };
    const list = this.anims.get(el);
    if (list) list.push(own);
    else this.anims.set(el, [own]);
    return a;
  }

  /**
   * A piece's opacity now (its sides, a shadow layer): from the latest of
   * this slot's animations that moves it, else its inline opacity, else 1.
   * Never a style read (see `anims`).
   */
  private opacityOf(el: Element): number {
    const list = this.anims.get(el);
    if (list) {
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const o = animatedOpacity(list[i]);
        if (o != null) return o;
      }
    }
    const inline = Number.parseFloat((el as HTMLElement | SVGElement).style.opacity);
    return Number.isFinite(inline) ? inline : 1;
  }

  /** Cancel what this slot started on `el`. */
  private cancelOwn(el: Element) {
    const list = this.anims.get(el);
    if (!list) return;
    this.anims.delete(el);
    for (const { a } of list) a.cancel();
  }

  /** The print copied onto a block's face, cut to its outline. */
  private inlay(item: ReliefItem): SVGGElement {
    const id = `ulune-relief-clip${(gradSeq += 1)}`;
    const g = node("g", { "clip-path": `url(#${id})` });
    g.setAttribute("class", "ulune-relief-inlay");
    const clip = node("clipPath", { id });
    for (const s of item.shapes) if (s.kind !== "line") clip.appendChild(shapeEl(s));
    g.appendChild(clip);
    for (const el of item.inlay ?? []) g.appendChild(cleanClone(el));
    return g;
  }

  /** Wrappers the top's CSS grows glyphs by, and an aspect's weight. */
  private dress(c: Element, item: ReliefItem) {
    // Glyphs that carry a placement transform get a wrapper to grow in.
    for (const g of c.querySelectorAll('[data-kind="sign-glyph"], [data-kind="decan-glyph"]')) {
      const wrap = document.createElementNS(SVG_NS, "g");
      wrap.setAttribute("class", "ulune-relief-glyph");
      while (g.firstChild) wrap.appendChild(g.firstChild);
      g.appendChild(wrap);
    }
    if (c.getAttribute("data-kind") === "decan-glyph") {
      const wrap = document.createElementNS(SVG_NS, "g");
      wrap.setAttribute("class", "ulune-relief-glyph");
      while (c.firstChild) wrap.appendChild(c.firstChild);
      c.appendChild(wrap);
    }
    if (item.strength != null) this.weighAspect(c, item.strength);
  }

  /** Tighter aspects draw a little thicker and stronger (matte: no glow). */
  private weighAspect(c: Element, s: number) {
    const line = c.querySelector("[data-aspect-line]");
    if (!line) return;
    const w = Number.parseFloat(line.getAttribute("stroke-width") ?? "1.5") || 1.5;
    line.setAttribute("stroke-width", (w * (1 + 0.3 * s)).toFixed(2));
    line.setAttribute("opacity", (0.6 + 0.4 * s).toFixed(3));
  }

  /**
   * Show the pieces: rising from where build() said they stand ("rise": from
   * the flat state, or from their heights before a change of mode), or
   * straight at their height ("hold").
   */
  rise(how: "rise" | "hold", reduced: boolean) {
    const mode = this.req?.mode ?? "hover";
    const animate = how === "rise" && !reduced && canAnimate(this.root);
    let moving = false;
    let lastDelay = 0;
    for (const b of this.built) {
      b.anim = null;
      const fresh = b.from <= 0.001;
      for (const s of b.sides) {
        this.cancelOwn(s.el);
        s.el.style.transform = s.at(b.h);
        s.el.style.opacity = "";
      }
      const changes = Math.abs(b.h - b.from) > 0.01;
      if (animate && changes) {
        moving = true;
        const delay = fresh ? b.item.delay : 0;
        lastDelay = Math.max(lastDelay, delay);
        for (const s of b.sides) {
          const frames: Keyframe[] =
            b.o0 < 0.99
              ? [
                  { transform: s.at(b.from), opacity: b.o0, offset: 0 },
                  { opacity: 1, offset: FADE_PART },
                  { transform: s.at(b.h), opacity: 1, offset: 1 },
                ]
              : [{ transform: s.at(b.from) }, { transform: s.at(b.h) }];
          const a = this.play(s.el, frames, { duration: RISE_MS[mode], delay, easing: RISE_EASE[mode], fill: "backwards" });
          b.anim ??= a;
        }
      }
      // Glyphs pop only when something is pinned: a hover stays calm. What
      // only rides on a raised block never pops.
      b.top.toggleAttribute("data-pop", animate && fresh && mode === "pinned" && !b.item.rider);
    }
    for (const s of this.shades) {
      this.cancelOwn(s);
      if (!moving) continue;
      // The shadows darken as the pieces rise, the cascade included.
      this.play(s, [{ opacity: 0 }, { opacity: 1 }], { duration: RISE_MS[mode] + lastDelay * 0.6, easing: SHADE_EASE, fill: "backwards" });
    }
    if (!moving) for (const el of [...this.fading]) this.fade(el);
  }

  /** Where each piece is now (between where its rise started and its target), units. */
  heightsNow(): Map<string, number> {
    const m = new Map<string, number>();
    for (const b of this.built) m.set(b.item.key, this.heightOf(b));
    return m;
  }

  private heightOf(b: Built): number {
    const a = b.anim;
    if (!a || a.playState === "finished" || a.playState === "idle") return b.h;
    const p = a.effect?.getComputedTiming().progress;
    if (p == null) return b.h;
    return b.from + (b.h - b.from) * p;
  }

  /** Let go: the sides slide back under the tops, shadows and tops fade to the originals. */
  sink(reduced: boolean, done: () => void) {
    this.sinking = true;
    this.done = done;
    if (reduced || !canAnimate(this.root)) {
      this.finish();
      return;
    }
    // A hover lets go quicker than a pin: the next focus is already on its way.
    const ms = SINK_MS[this.req?.mode ?? "hover"];
    const timing: KeyframeAnimationOptions = { duration: ms, easing: SINK_EASE, fill: "forwards" };
    // Where everything stands is read first, in one pass (one style
    // resolution); cancelling a piece's animation before reading the next
    // one's opacity used to restyle the page once per piece.
    const pieces = this.built.map((b) => ({
      b,
      now: this.heightOf(b),
      sides: b.sides.map((side) => ({ side, o: this.opacityOf(side.el) })),
    }));
    const shades = [...this.shades, ...this.fading].map((el) => ({ el, o: this.opacityOf(el) }));
    let last: Animation | null = null;
    for (const { b, now, sides } of pieces) {
      for (const { side, o } of sides) {
        this.cancelOwn(side.el);
        side.el.style.transform = side.at(now);
        last = this.play(
          side.el,
          [
            { transform: side.at(now), opacity: o },
            { transform: side.at(0), opacity: 0 },
          ],
          timing,
        );
      }
      b.anim = null;
      b.top.removeAttribute("data-pop");
      last = this.play(b.top, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: "linear", fill: "forwards" });
    }
    for (const { el, o } of shades) {
      this.cancelOwn(el);
      last = this.play(el, [{ opacity: o }, { opacity: 0 }], timing);
    }
    if (!last) {
      this.finish();
      return;
    }
    last.onfinish = () => this.finish();
    last.oncancel = () => this.finish();
  }

  private finish() {
    const done = this.done;
    this.done = null;
    this.clear();
    this.root.remove();
    done?.();
  }

  /** Stop every animation and drop every piece (the root stays). */
  private reset() {
    for (const list of this.anims.values()) {
      for (const { a } of list) {
        a.onfinish = null;
        a.oncancel = null;
        a.cancel();
      }
    }
    this.anims.clear();
    this.built = [];
    this.shades = [];
    this.eased = [];
    this.fading.clear();
    this.root.replaceChildren();
  }

  /** Remove every piece (the controller unhides the originals). */
  clear() {
    this.reset();
    this.req = null;
  }

  /** The items now standing, for tests and QA. */
  items(): { key: string; tier: Tier; h: number; mode: LiftMode | null }[] {
    return this.built.map((b) => ({ key: b.item.key, tier: b.item.tier, h: b.h, mode: this.req?.mode ?? null }));
  }
}
