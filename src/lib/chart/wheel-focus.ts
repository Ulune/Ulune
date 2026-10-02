import { aspectVisible, type AspectFilter } from "./aspect-filter";
import {
  layerShowsCross,
  layerShowsNatal,
  layerShowsOuter,
  type AspectLayer,
} from "./chart-view";
import type { AspectLink, NatalChart, SignId } from "./types";
import { houseOfLongitude } from "./wheel-rank";
import { tipsPath, type Pt } from "./aspect-taper";
import type { LineTheme } from "./wheel-style";

export type WheelFocus = {
  id: string | null;
  kind: "" | "natal" | "transit";
  bodies: Set<string>;
  aspects: Set<string>;
  signs: Set<string>;
  decans: Set<string>;
  /** The houses the focus itself stands in (the rest step back): "1" … "12". */
  houses: Set<string>;
  transit: string | null;
  partners: Set<string>;
  tick: string | null;
};

type BodyLite = { id: string; sign: SignId; ecliptic: number };
type PlanetLite = { id: string; house: number };
type StarLite = { id: string; conjunct?: { body: string } | null };
type MidLite = { id: string; a: string; b: string };

export type WheelFocusCtx = {
  chart: NatalChart;
  visible: Set<string>;
  filter: AspectFilter;
  bodies: BodyLite[];
  shownPlanets: PlanetLite[];
  shownStars: StarLite[];
  shownMids: MidLite[];
  configMembers: Set<string> | null;
  crossAspects?: AspectLink[] | null;
  outerAspects?: AspectLink[] | null;
  outerKind?: "transit" | "synastry" | "progressions";
  aspectLayer?: AspectLayer;
  /** Outer-ring bodies (transits, partner, progressions), for where they sit. */
  outerBodies?: BodyLite[];
};

const EMPTY: WheelFocus = {
  id: null,
  kind: "",
  bodies: new Set(),
  aspects: new Set(),
  signs: new Set(),
  decans: new Set(),
  houses: new Set(),
  transit: null,
  partners: new Set(),
  tick: null,
};

const ANGLE_HOUSE: Record<string, number> = { ascendant: 1, ic: 4, descendant: 7, midheaven: 10 };

/**
 * The houses a focus stands in: a body's own house (an angle's is the house
 * it opens), both ends' for an aspect, the house itself; a sign, a decan or
 * an aspect family stands in none. The other houses step back.
 */
function coreHouses(kind: string, key: string, f: WheelFocus, ctx: WheelFocusCtx): Set<string> {
  const out = new Set<string>();
  const natal = (id: string) => {
    const p = ctx.shownPlanets.find((x) => x.id === id);
    const b = p ? null : ctx.bodies.find((x) => x.id === id);
    const n = p ? p.house : (ANGLE_HOUSE[id] ?? (b ? houseOfLongitude(b.ecliptic, ctx.chart.houses) : null));
    if (n != null) out.add(String(n));
  };
  const outer = (id: string) => {
    const b = ctx.outerBodies?.find((x) => x.id === id);
    const n = b ? houseOfLongitude(b.ecliptic, ctx.chart.houses) : null;
    if (n != null) out.add(String(n));
  };
  if (kind === "house") out.add(key);
  else if (kind === "planet" || kind === "angle") natal(key);
  else if (kind === "aspect" || kind === "reception") for (const id of f.bodies) natal(id);
  else if (kind === "saspect" || kind === "taspect" || kind === "paspect") {
    for (const id of f.bodies) natal(id);
    for (const id of f.partners) outer(id);
  } else if (kind === "oaspect") for (const id of f.partners) outer(id);
  else if (kind === "partner" || kind === "transit" || kind === "progressed") outer(key);
  else if (kind === "star") {
    const star = ctx.shownStars.find((x) => x.id === key);
    if (star?.conjunct) natal(star.conjunct.body);
  } else if (kind === "mp") {
    const mp = ctx.shownMids.find((x) => x.id === key);
    if (mp) for (const id of [mp.a, mp.b]) natal(id);
  }
  return out;
}

function faceIndex(ecliptic: number) {
  return Math.floor((((ecliptic % 30) + 30) % 30) / 10);
}

function collect(
  core: string[],
  ctx: WheelFocusCtx,
): Pick<WheelFocus, "bodies" | "aspects"> {
  const coreSet = new Set(core);
  const bodies = new Set(core);
  const aspects = new Set<string>();
  for (const a of ctx.chart.aspects) {
    if (!coreSet.has(a.a) && !coreSet.has(a.b)) continue;
    if (!ctx.visible.has(a.a) || !ctx.visible.has(a.b)) continue;
    if (!aspectVisible(a, ctx.filter)) continue;
    aspects.add(a.id);
    bodies.add(a.a);
    bodies.add(a.b);
  }
  return { bodies, aspects };
}

function collectProgressed(
  core: string[],
  side: "moving" | "natal",
  ctx: WheelFocusCtx,
): Pick<WheelFocus, "bodies" | "aspects" | "partners"> {
  const coreSet = new Set(core);
  const bodies = new Set<string>();
  const partners = new Set<string>();
  const aspects = new Set<string>();
  if (side === "natal") for (const id of core) bodies.add(id);
  else for (const id of core) partners.add(id);
  for (const a of ctx.crossAspects ?? []) {
    const mine = side === "moving" ? a.a : a.b;
    if (!coreSet.has(mine)) continue;
    if (!ctx.visible.has(a.a) || !ctx.visible.has(a.b)) continue;
    if (!aspectVisible(a, ctx.filter)) continue;
    aspects.add(a.id);
    bodies.add(a.b);
    partners.add(a.a);
  }
  return { bodies, aspects, partners };
}

function collectCross(
  core: string[],
  side: "a" | "b",
  ctx: WheelFocusCtx,
): Pick<WheelFocus, "bodies" | "aspects" | "partners"> {
  const coreSet = new Set(core);
  const bodies = new Set<string>();
  const partners = new Set<string>();
  const aspects = new Set<string>();
  if (side === "a") for (const id of core) bodies.add(id);
  else for (const id of core) partners.add(id);
  for (const a of ctx.crossAspects ?? []) {
    const mine = side === "a" ? a.a : a.b;
    if (!coreSet.has(mine)) continue;
    if (!ctx.visible.has(a.a) || !ctx.visible.has(a.b)) continue;
    if (!aspectVisible(a, ctx.filter)) continue;
    aspects.add(a.id);
    bodies.add(a.a);
    partners.add(a.b);
  }
  return { bodies, aspects, partners };
}

function collectOuter(
  core: string[],
  ctx: WheelFocusCtx,
): Pick<WheelFocus, "aspects" | "partners"> {
  const coreSet = new Set(core);
  const aspects = new Set<string>();
  const partners = new Set<string>();
  for (const a of ctx.outerAspects ?? []) {
    if (!coreSet.has(a.a) && !coreSet.has(a.b)) continue;
    if (!ctx.visible.has(a.a) || !ctx.visible.has(a.b)) continue;
    if (!aspectVisible(a, ctx.filter)) continue;
    aspects.add(a.id);
    partners.add(a.a);
    partners.add(a.b);
  }
  return { aspects, partners };
}

function mergeFocus(
  into: { bodies: Set<string>; aspects: Set<string>; partners?: Set<string> },
  extra: { bodies?: Set<string>; aspects: Set<string>; partners?: Set<string> },
) {
  for (const id of extra.aspects) into.aspects.add(id);
  if (extra.bodies) for (const id of extra.bodies) into.bodies.add(id);
  if (extra.partners) {
    into.partners ??= new Set();
    for (const id of extra.partners) into.partners.add(id);
  }
}

function withSigns(focus: WheelFocus, ctx: WheelFocusCtx, extraSign?: string | null, extraDecan?: string | null): WheelFocus {
  if (focus.kind !== "natal" && focus.kind !== "transit") return focus;
  const signs = new Set<string>();
  const decans = new Set<string>();
  if (extraSign) signs.add(extraSign);
  if (extraDecan) decans.add(extraDecan);
  for (const b of ctx.bodies) {
    if (!focus.bodies.has(b.id) && !focus.partners.has(b.id)) continue;
    signs.add(b.sign);
    decans.add(`${b.sign}-${faceIndex(b.ecliptic)}`);
  }
  return { ...focus, signs, decans };
}

export function resolveWheelFocus(focusId: string | null, ctx: WheelFocusCtx): WheelFocus {
  const f = resolveFocus(focusId, ctx);
  if (!focusId || f === EMPTY) return f;
  const sep = focusId.indexOf(":");
  // A reception's bodies are its two planets (its aspects' ends are not).
  const core = focusId.startsWith("reception:")
    ? { ...f, bodies: new Set(focusId.slice(sep + 1).split("-").filter(Boolean)) }
    : f;
  return { ...f, houses: coreHouses(focusId.slice(0, sep), focusId.slice(sep + 1), core, ctx) };
}

function resolveFocus(focusId: string | null, ctx: WheelFocusCtx): WheelFocus {
  if (focusId) {
    const sep = focusId.indexOf(":");
    const kind = focusId.slice(0, sep);
    const key = focusId.slice(sep + 1);
    if (kind === "saspect" || kind === "paspect" || kind === "taspect") {
      const a = (ctx.crossAspects ?? []).find((x) => x.id === key);
      if (!a) return EMPTY;
      const natalId = kind === "saspect" ? a.a : a.b;
      const outerId = kind === "saspect" ? a.b : a.a;
      return withSigns(
        {
          ...EMPTY,
          id: focusId,
          kind: "natal",
          bodies: new Set([natalId]),
          aspects: new Set([a.id]),
          transit: outerId,
          partners: new Set([outerId]),
        },
        ctx,
      );
    }
    if (kind === "oaspect") {
      const a = (ctx.outerAspects ?? []).find((x) => x.id === key);
      if (!a) return EMPTY;
      return withSigns(
        {
          ...EMPTY,
          id: focusId,
          kind: "transit",
          aspects: new Set([a.id]),
          partners: new Set([a.a, a.b]),
          transit: a.a,
        },
        ctx,
      );
    }
    if (kind === "aspect") {
      const a = ctx.chart.aspects.find((x) => x.id === key);
      if (!a) return EMPTY;
      return withSigns(
        { ...EMPTY, id: focusId, kind: "natal", bodies: new Set([a.a, a.b]), aspects: new Set([a.id]) },
        ctx,
      );
    }
    if (kind === "planet" || kind === "angle") {
      const layer = ctx.aspectLayer ?? "both";
      const acc = { bodies: new Set<string>([key]), aspects: new Set<string>(), partners: new Set<string>() };
      if (layerShowsNatal(layer)) mergeFocus(acc, collect([key], ctx));
      if (ctx.crossAspects && layerShowsCross(layer)) {
        if (ctx.outerKind === "synastry") mergeFocus(acc, collectCross([key], "a", ctx));
        else mergeFocus(acc, collectProgressed([key], "natal", ctx));
      }
      return withSigns({ ...EMPTY, id: focusId, kind: "natal", ...acc }, ctx);
    }
    if (kind === "partner") {
      const layer = ctx.aspectLayer ?? "both";
      const acc = { bodies: new Set<string>(), aspects: new Set<string>(), partners: new Set<string>([key]) };
      if (layerShowsCross(layer)) mergeFocus(acc, collectCross([key], "b", ctx));
      if (layerShowsOuter(layer)) mergeFocus(acc, collectOuter([key], ctx));
      return withSigns({ ...EMPTY, id: focusId, kind: "transit", transit: key, ...acc }, ctx);
    }
    if (kind === "progressed" || kind === "transit") {
      const layer = ctx.aspectLayer ?? "both";
      const acc = { bodies: new Set<string>(), aspects: new Set<string>(), partners: new Set<string>([key]) };
      if (layerShowsCross(layer)) mergeFocus(acc, collectProgressed([key], "moving", ctx));
      if (layerShowsOuter(layer)) mergeFocus(acc, collectOuter([key], ctx));
      return withSigns({ ...EMPTY, id: focusId, kind: "transit", transit: key, ...acc }, ctx);
    }
    if (kind === "sign" || kind === "decan" || kind === "house") {
      const layer = ctx.aspectLayer ?? "both";
      const members =
        kind === "sign"
          ? ctx.bodies.filter((b) => b.sign === key).map((b) => b.id)
          : kind === "house"
            ? ctx.shownPlanets.filter((p) => String(p.house) === key).map((p) => p.id)
            : (() => {
                const dash = key.lastIndexOf("-");
                const s = key.slice(0, dash);
                const face = Number(key.slice(dash + 1));
                return ctx.bodies
                  .filter((b) => b.sign === s && faceIndex(b.ecliptic) === face)
                  .map((b) => b.id);
              })();
      const acc = { bodies: new Set<string>(members), aspects: new Set<string>(), partners: new Set<string>() };
      if (layerShowsNatal(layer)) mergeFocus(acc, collect(members, ctx));
      if (ctx.crossAspects && layerShowsCross(layer)) {
        if (ctx.outerKind === "synastry") mergeFocus(acc, collectCross(members, "a", ctx));
        else mergeFocus(acc, collectProgressed(members, "natal", ctx));
      }
      return withSigns(
        { ...EMPTY, id: focusId, kind: "natal", ...acc },
        ctx,
        kind === "sign" ? key : null,
        kind === "decan" ? key : null,
      );
    }
    if (kind === "atype") {
      // One aspect family (the count strip): every line of that type on the
      // wheel, and the bodies at their ends.
      const layer = ctx.aspectLayer ?? "both";
      const acc = { bodies: new Set<string>(), aspects: new Set<string>(), partners: new Set<string>() };
      const shown = (a: AspectLink) =>
        a.type === key && ctx.visible.has(a.a) && ctx.visible.has(a.b) && aspectVisible(a, ctx.filter);
      if (layerShowsNatal(layer)) {
        for (const a of ctx.chart.aspects) {
          if (!shown(a)) continue;
          acc.aspects.add(a.id);
          acc.bodies.add(a.a);
          acc.bodies.add(a.b);
        }
      }
      if (ctx.crossAspects && layerShowsCross(layer)) {
        const synastry = ctx.outerKind === "synastry";
        for (const a of ctx.crossAspects) {
          if (!shown(a)) continue;
          acc.aspects.add(a.id);
          acc.bodies.add(synastry ? a.a : a.b);
          acc.partners.add(synastry ? a.b : a.a);
        }
      }
      if (ctx.outerAspects && layerShowsOuter(layer)) {
        for (const a of ctx.outerAspects) {
          if (!shown(a)) continue;
          acc.aspects.add(a.id);
          acc.partners.add(a.a);
          acc.partners.add(a.b);
        }
      }
      if (!acc.aspects.size) return EMPTY;
      return withSigns({ ...EMPTY, id: focusId, kind: acc.bodies.size ? "natal" : "transit", ...acc }, ctx);
    }
    if (kind === "star") {
      const star = ctx.shownStars.find((s) => s.id === key);
      const core = star?.conjunct ? [star.conjunct.body] : [];
      return withSigns(
        { ...EMPTY, id: focusId, kind: "natal", tick: focusId, ...collect(core, ctx) },
        ctx,
      );
    }
    if (kind === "mp") {
      const mp = ctx.shownMids.find((m) => m.id === key);
      const core = mp ? [mp.a, mp.b] : [];
      return withSigns(
        { ...EMPTY, id: focusId, kind: "natal", tick: focusId, ...collect(core, ctx) },
        ctx,
      );
    }
    if (kind === "reception") {
      return withSigns(
        { ...EMPTY, id: focusId, kind: "natal", ...collect(key.split("-").filter(Boolean), ctx) },
        ctx,
      );
    }
  }
  if (ctx.configMembers) {
    return withSigns({ ...EMPTY, id: null, kind: "natal", ...collect([...ctx.configMembers], ctx) }, ctx);
  }
  return EMPTY;
}

/**
 * What decides whether a node is in a focus: its data attributes, read once
 * (the painter's nodes, and the 3D view's bodies and tubes, which it keeps
 * without painting the hidden live chart).
 */
export type FocusKey = {
  hl: string | null;
  house: string | null;
  body: string | null;
  aspect: string | null;
  sign: string | null;
  decan: string | null;
  transit: string | null;
  bodyA: string | null;
  bodyB: string | null;
  reception: boolean;
};

/** A node's focus key, off its attributes. */
export function focusKeyOf(el: Element): FocusKey {
  const id = el.getAttribute("data-hl");
  return {
    hl: id,
    house: id?.startsWith("house:") ? id.slice(6) : null,
    body: el.getAttribute("data-body"),
    aspect: el.getAttribute("data-aspect"),
    sign: el.getAttribute("data-sign"),
    decan: el.getAttribute("data-decan"),
    transit: el.getAttribute("data-transit"),
    bodyA: el.getAttribute("data-body-a"),
    bodyB: el.getAttribute("data-body-b"),
    reception: el.getAttribute("data-kind") === "reception",
  };
}

/** Is a node in the focus? (What the painter writes as data-in-focus="1".) */
export function inWheelFocus(k: FocusKey, f: WheelFocus): boolean {
  return isOn(k, f);
}

/** One node the focus paints, read once when the cache is built. */
type HlNode = {
  el: Element;
  hl: string | null;
  /** The house number of a house's own nodes ("house:7" → "7"). */
  house: string | null;
  body: string | null;
  aspect: string | null;
  sign: string | null;
  decan: string | null;
  transit: string | null;
  bodyA: string | null;
  bodyB: string | null;
  reception: boolean;
  /** What was last written (null: not yet), so only changes are written. */
  inFocus: string | null;
  exact: string | null;
  /** A body's glyph (a planet or an outer body): it grows when it is what the focus is about. */
  glyph: "natal" | "outer" | null;
  grow: string | null;
};

type Emphasis = "base" | "lit" | "dim";

/** An aspect line or its tapered ends: its width and opacity per emphasis. */
type LineNode = {
  el: SVGElement;
  node: HlNode;
  /** The line itself (not its tapered ends). */
  isLine: boolean;
  w: Record<Emphasis, string | null>;
  /** Opacity per emphasis, per theme (the light theme's are its own: data-ol-*). */
  o: Record<LineTheme, Record<Emphasis, string | null>>;
  /**
   * The tapered ends (one path, aspect-taper.ts): where they run, and their
   * outline per line width (a width is written as its outline, `d`).
   */
  taper: { p1: Pt; p2: Pt; t: number; d: Map<string, string> } | null;
  mode: Emphasis | null;
};

type CuspNode = { el: SVGElement; n: number; on: string | null };
type OlongNode = { el: SVGElement; transit: string | null; op: string | null };

/** Where the painter keeps what it draws for the aspects of one root: their lit copies and marks. */
type ExtrasLayer = { tops: Element | null; marks: Element | null; templates: Map<string, Element> };

/**
 * An aspect as the painter draws its extras, made only while they show
 * (performance plan 2.1: every line used to carry a hidden copy and a hidden
 * mark, 16 nodes): its copy above every line while it is lit, its glyph while
 * it shows.
 */
type AspectNode = {
  hl: string;
  aspect: string;
  type: string;
  layer: ExtrasLayer;
  line: Element;
  tips: LineNode | null;
  dir: Element | null;
  /** A conjunction's yoke: under the glyphs, or hanging from the degrees. */
  yoke: string | null;
  conj: boolean;
  /** The wheel found its glyph a place at rest (shown there when the glyphs are switched on). */
  rest: boolean;
  markAt: string | null;
  color: string;
  litW: string;
  litO: Record<LineTheme, string>;
  top: Element | null;
  mark: SVGElement | null;
  markOn: string | null;
};

function isOn(n: FocusKey, f: WheelFocus): boolean {
  if (!f.kind) return false;
  if (n.hl && n.hl === f.id) return true;
  if (n.house && f.houses.has(n.house)) return true;
  if (n.body && f.bodies.has(n.body)) return true;
  if (n.aspect && f.aspects.has(n.aspect)) return true;
  if (n.sign && f.signs.has(n.sign)) return true;
  if (n.decan && f.decans.has(n.decan)) return true;
  if (n.transit && (f.transit === n.transit || f.partners.has(n.transit))) return true;
  if (n.bodyA || n.bodyB) {
    const aOn = Boolean(n.bodyA && f.bodies.has(n.bodyA));
    const bOn = Boolean(n.bodyB && f.bodies.has(n.bodyB));
    return n.reception ? aOn && bOn : aOn || bOn;
  }
  return false;
}

/**
 * Everything the focus painter touches, read once (attributes included):
 * a paint then only compares and writes what changes (performance plan 2.3).
 */
export type WheelPaintCache = {
  hl: HlNode[];
  lines: LineNode[];
  aspects: AspectNode[];
  cusps: CuspNode[];
  olongs: OlongNode[];
  signs: SVGElement[];
  /** The sign paths' fill-opacity is set (once per cache). */
  signsDone: boolean;
  /** The roots' own focus attributes, as last written. */
  roots: { el: Element; kind: string | null; id: string | null }[];
  /** The page's theme the lines' opacities were last written for. */
  theme: LineTheme | null;
};

/** The page's theme, as the lines' opacities follow it (theme.tsx sets the class). */
function pageTheme(el: Element): LineTheme {
  return el.ownerDocument.documentElement.classList.contains("light") ? "light" : "dark";
}

const MODES: Emphasis[] = ["base", "lit", "dim"];
const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(doc: Document, tag: string, attrs: Record<string, string | number | null | undefined>): SVGElement {
  const el = doc.createElementNS(SVG_NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  return el;
}

/** `el` into `parent` right after `after` (first when there is none), where it is not already. */
function placeAfter(parent: Element, el: Element, after: Element | null) {
  const next = after ? after.nextSibling : parent.firstChild;
  if (next !== el) parent.insertBefore(el, next);
}

function parseTaper(el: Element): LineNode["taper"] {
  const v = (el.getAttribute("data-taper") ?? "").split(" ").map(Number);
  if (v.length !== 5 || !v.every(Number.isFinite)) return null;
  return { p1: { x: v[0], y: v[1] }, p2: { x: v[2], y: v[3] }, t: v[4], d: new Map() };
}

/** The tapered ends' outline for a line width (cut once per width). */
function tipsFor(taper: NonNullable<LineNode["taper"]>, w: string): string {
  let d = taper.d.get(w);
  if (!d) {
    d = tipsPath(taper.p1, taper.p2, taper.t, Number(w));
    taper.d.set(w, d);
  }
  return d;
}

/** The lit copy of an aspect's line, drawn above every line on a band of the ground's colour. */
function makeTop(a: AspectNode, theme: LineTheme): Element {
  const doc = a.line.ownerDocument;
  const litO = a.litO[theme];
  const g = svgEl(doc, "g", { class: "ulune-aspect-top", "data-top-of": a.hl, "data-on": "1" });
  const w = Number(a.litW);
  // Under the glyphs a yoke lies on the disc; everything else on the aspect circle.
  const ground = a.yoke === "glyphs" ? "var(--color-bg-elevated)" : "var(--color-bg)";
  if (a.yoke) {
    const d = a.line.getAttribute("d");
    g.append(
      svgEl(doc, "path", { d, fill: "none", stroke: ground, "stroke-width": w + 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }),
      svgEl(doc, "path", { d, fill: "none", stroke: a.color, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: litO }),
    );
  } else {
    const at = { x1: a.line.getAttribute("x1"), y1: a.line.getAttribute("y1"), x2: a.line.getAttribute("x2"), y2: a.line.getAttribute("y2") };
    g.append(
      svgEl(doc, "line", { ...at, stroke: ground, "stroke-width": w + 2.2, "stroke-linecap": "round" }),
      svgEl(doc, "line", { ...at, stroke: a.color, "stroke-width": w, "stroke-dasharray": a.line.getAttribute("stroke-dasharray"), "stroke-linecap": "round", opacity: litO }),
    );
    if (a.tips?.taper) g.append(svgEl(doc, "path", { d: tipsFor(a.tips.taper, a.litW), fill: a.color, opacity: litO }));
  }
  if (a.dir) {
    const c = a.dir.cloneNode(true) as Element;
    for (const k of ["class", "data-dir", "opacity"]) c.removeAttribute(k);
    g.append(c);
  }
  return g;
}

/** An aspect's glyph mark, from its type's template (chart-wheel.tsx). */
function makeMark(a: AspectNode): SVGElement | null {
  const tpl = a.layer.templates.get(a.type);
  if (!tpl || !a.markAt) return null;
  const g = svgEl(a.line.ownerDocument, "g", {
    class: "ulune-aspect-mark pointer-events-none",
    "data-aspect-mark": "",
    "data-aspect": a.aspect,
    "data-mark-of": a.hl,
    "data-conj": a.conj ? "1" : null,
    // A yoke under the glyphs stands on the planets' ring, not the aspect circle: its disc takes that face (styles.css).
    "data-face": a.yoke === "glyphs" ? "ring" : null,
    "data-rest": a.rest ? "1" : null,
    transform: `translate(${a.markAt})`,
  });
  g.style.color = a.color;
  for (const c of tpl.children) g.append(c.cloneNode(true));
  return g;
}

function layerOf(root: Element): ExtrasLayer {
  const templates = new Map<string, Element>();
  for (const t of root.querySelectorAll("[data-mark-template]")) templates.set(t.getAttribute("data-mark-template") ?? "", t);
  return {
    tops: root.querySelector('[data-kind="aspect-top"][data-painted]'),
    marks: root.querySelector('[data-kind="aspect-marks"][data-painted]'),
    templates,
  };
}

function aspectNode(g: Element, layer: ExtrasLayer, lineBy: Map<Element, LineNode>): AspectNode | null {
  const line = g.querySelector(":scope > [data-aspect-line]");
  const hl = g.getAttribute("data-hl");
  if (!line || !hl) return null;
  const tipsEl = g.querySelector(":scope > [data-aspect-tip]");
  return {
    hl,
    aspect: g.getAttribute("data-aspect") ?? "",
    type: g.getAttribute("data-type") ?? "",
    layer,
    line,
    tips: tipsEl ? (lineBy.get(tipsEl) ?? null) : null,
    dir: g.querySelector(":scope > .ulune-aspect-dir"),
    yoke: line.getAttribute("data-yoke"),
    conj: g.getAttribute("data-type") === "conjunction",
    rest: g.getAttribute("data-rest") === "1",
    markAt: g.getAttribute("data-mark-at"),
    color: line.getAttribute("stroke") ?? "currentColor",
    litW: line.getAttribute("data-w-lit") ?? line.getAttribute("stroke-width") ?? "1.5",
    litO: {
      dark: line.getAttribute("data-o-lit") ?? "1",
      light: line.getAttribute("data-ol-lit") ?? line.getAttribute("data-o-lit") ?? "1",
    },
    top: null,
    mark: null,
    markOn: null,
  };
}

/**
 * Everything the focus painter touches. `extra` are other roots showing
 * copies of the wheel (the 3D view's strata and sprites): they are painted
 * with the same focus so every copy agrees.
 */
export function cacheWheelPaint(svg: SVGSVGElement, extra: Element[] = []): WheelPaintCache {
  const rootEls: Element[] = [svg, ...extra];
  const all = <T extends Element>(sel: string) => rootEls.flatMap((r) => [...r.querySelectorAll<T>(sel)]);
  const byEl = new Map<Element, HlNode>();
  const hl = all("[data-hl]").map((el) => {
    const kind = el.getAttribute("data-kind");
    const n: HlNode = {
      el,
      ...focusKeyOf(el),
      inFocus: el.getAttribute("data-in-focus"),
      exact: el.getAttribute("data-exact"),
      glyph: kind === "planet" ? "natal" : kind === "transit" ? "outer" : null,
      grow: el.getAttribute("data-grow"),
    };
    byEl.set(el, n);
    return n;
  });
  const lineBy = new Map<Element, LineNode>();
  const lineOf = (el: SVGElement): LineNode | null => {
    const node = byEl.get(el);
    if (!node) return null;
    const w = {} as Record<Emphasis, string | null>;
    const o = { dark: {}, light: {} } as LineNode["o"];
    for (const m of MODES) {
      w[m] = el.getAttribute(`data-w-${m}`);
      o.dark[m] = el.getAttribute(`data-o-${m}`);
      o.light[m] = el.getAttribute(`data-ol-${m}`) ?? o.dark[m];
    }
    const taper = el.hasAttribute("data-aspect-tip") ? parseTaper(el) : null;
    // The outline drawn now is the resting width's.
    if (taper && w.base) taper.d.set(w.base, el.getAttribute("d") ?? "");
    const l: LineNode = { el, node, isLine: el.hasAttribute("data-aspect-line"), w, o, taper, mode: null };
    lineBy.set(el, l);
    return l;
  };
  const lines = [...all<SVGElement>("[data-aspect-line]"), ...all<SVGElement>("[data-aspect-tip]")]
    .map(lineOf)
    .filter((l): l is LineNode => l !== null);
  const aspects: AspectNode[] = [];
  for (const root of rootEls) {
    const layer = layerOf(root);
    const mine: AspectNode[] = [];
    for (const g of root.querySelectorAll("g[data-aspect][data-hl]")) {
      const a = aspectNode(g, layer, lineBy);
      if (a) mine.push(a);
    }
    // What is already drawn (a copy of the wheel keeps its original's) is
    // taken over; anything that no longer matches a line goes.
    const byHl = new Map(mine.map((a) => [a.hl, a]));
    for (const el of [...(layer.tops?.children ?? [])]) {
      const a = byHl.get(el.getAttribute("data-top-of") ?? "");
      if (a && !a.top) a.top = el;
      else el.remove();
    }
    for (const el of [...(layer.marks?.children ?? [])]) {
      if (el.hasAttribute("data-mark-temp")) continue;
      const a = byHl.get(el.getAttribute("data-mark-of") ?? "");
      if (a && !a.mark) {
        a.mark = el as SVGElement;
        a.markOn = el.getAttribute("data-on");
      } else el.remove();
    }
    aspects.push(...mine);
  }
  return {
    hl,
    lines,
    aspects,
    cusps: all<SVGElement>("[data-cusp-house]").map((el) => ({ el, n: Number(el.getAttribute("data-cusp-house")), on: el.getAttribute("data-in-focus") })),
    olongs: all<SVGElement>("[data-kind='olong']").map((el) => ({ el, transit: el.getAttribute("data-transit"), op: el.getAttribute("opacity") })),
    signs: all<SVGElement>("[data-kind='sign']"),
    signsDone: false,
    roots: rootEls.map((el) => ({ el, kind: el.getAttribute("data-focus-kind"), id: el.getAttribute("data-focus-id") })),
    theme: null,
  };
}

/**
 * A mark for an aspect, made for a moment (the 3D view draws its glyphs from
 * them): kept out of the painter's sight (`data-mark-temp`), for the caller
 * to remove.
 */
export function tempAspectMark(svg: SVGSVGElement, hl: string): SVGElement | null {
  const layer = layerOf(svg);
  const g = [...svg.querySelectorAll("g[data-aspect][data-hl]")].find((x) => x.getAttribute("data-hl") === hl);
  const a = g ? aspectNode(g, layer, new Map()) : null;
  const mark = a ? makeMark(a) : null;
  if (!mark || !layer.marks) return null;
  mark.setAttribute("data-mark-temp", "");
  mark.setAttribute("opacity", "0");
  layer.marks.append(mark);
  return mark;
}

/**
 * Marks for several aspects at once (the 3D view's atlas): the same as
 * `tempAspectMark` for each, in one pass over the chart. The caller removes them.
 */
export function tempAspectMarks(svg: SVGSVGElement, hls: Iterable<string>): Map<string, SVGElement> {
  const want = new Set(hls);
  const out = new Map<string, SVGElement>();
  if (!want.size) return out;
  const layer = layerOf(svg);
  if (!layer.marks) return out;
  const lines = new Map<Element, LineNode>();
  for (const g of svg.querySelectorAll("g[data-aspect][data-hl]")) {
    const hl = g.getAttribute("data-hl");
    if (!hl || !want.has(hl) || out.has(hl)) continue;
    const a = aspectNode(g, layer, lines);
    const mark = a ? makeMark(a) : null;
    if (!mark) continue;
    mark.setAttribute("data-mark-temp", "");
    mark.setAttribute("opacity", "0");
    layer.marks.append(mark);
    out.set(hl, mark);
  }
  return out;
}

/** What the chart's own switches ask of the paint (wheel-prefs.ts). */
export type WheelPaintOpts = {
  /** Every line shows its glyph at rest (where the wheel found it room), dimmed while something else is in focus. */
  marks?: boolean;
};

/** An aspect's focus, by its id (natal, cross or outer). */
const ASPECT_FOCUS = /^(aspect|saspect|taspect|paspect|oaspect):/;

export function paintWheelFocus(
  svg: SVGSVGElement,
  cache: WheelPaintCache,
  f: WheelFocus,
  _selectedId: string | null = null,
  _extra: Element[] = [],
  opts: WheelPaintOpts = {},
) {
  const kind = f.kind;
  const id = f.id ?? "";
  for (const r of cache.roots) {
    if (r.kind !== kind) {
      r.el.setAttribute("data-focus-kind", kind);
      r.kind = kind;
    }
    if (r.id !== id) {
      r.el.setAttribute("data-focus-id", id);
      r.id = id;
    }
  }
  const exact = f.id;
  // What grows: what you point at, and for a line the two bodies it joins.
  const aspectFocus = Boolean(exact && ASPECT_FOCUS.test(exact));
  for (const n of cache.hl) {
    const nextOn = isOn(n, f) ? "1" : "0";
    if (n.inFocus !== nextOn) {
      n.el.setAttribute("data-in-focus", nextOn);
      n.inFocus = nextOn;
    }
    const isExact = Boolean(exact && n.hl === exact);
    const nextExact = isExact ? "1" : "0";
    if (n.exact !== nextExact) {
      n.el.setAttribute("data-exact", nextExact);
      n.exact = nextExact;
    }
    if (n.glyph) {
      const end =
        aspectFocus &&
        (n.glyph === "natal" ? Boolean(n.body && f.bodies.has(n.body)) : Boolean(n.transit && f.partners.has(n.transit)));
      const nextGrow = isExact || end ? "1" : "0";
      if (n.grow !== nextGrow) {
        n.el.setAttribute("data-grow", nextGrow);
        n.grow = nextGrow;
      }
    }
  }
  // The lines' opacities are the page theme's own: after a theme switch
  // every line takes the new theme's for what it shows, and the lit copies
  // are made again (theme.tsx repaints inside the switch's cross-fade).
  const theme = pageTheme(svg);
  if (cache.theme !== theme) {
    cache.theme = theme;
    for (const l of cache.lines) {
      const o = l.mode ? l.o[theme][l.mode] : null;
      if (o) l.el.setAttribute("opacity", o);
    }
    for (const a of cache.aspects) {
      a.top?.remove();
      a.top = null;
    }
  }
  const lit = new Set<string>();
  for (const l of cache.lines) {
    const mode: Emphasis = !kind ? "base" : l.node.inFocus === "1" ? "lit" : "dim";
    if (mode === "lit" && l.isLine && l.node.hl) lit.add(l.node.hl);
    if (l.mode === mode) continue;
    l.mode = mode;
    const w = l.w[mode];
    const o = l.o[theme][mode];
    if (w) {
      if (l.taper) {
        const d = tipsFor(l.taper, w);
        if (l.el.getAttribute("d") !== d) l.el.setAttribute("d", d);
      } else l.el.setAttribute("stroke-width", w);
    }
    if (o) l.el.setAttribute("opacity", o);
  }
  // A lit line's copy above every line: no dimmed line crosses it. Made
  // while it is lit, in the lines' own order (the tightest on top).
  const topAfter = new Map<ExtrasLayer, Element | null>();
  for (const a of cache.aspects) {
    const tops = a.layer.tops;
    if (!tops) continue;
    if (lit.has(a.hl)) {
      if (!a.top) a.top = makeTop(a, theme);
      placeAfter(tops, a.top, topAfter.get(a.layer) ?? null);
      topAfter.set(a.layer, a.top);
    } else if (a.top) {
      a.top.remove();
      a.top = null;
    }
  }
  // A cusp stays with either house it bounds.
  for (const c of cache.cusps) {
    const on = f.houses.has(String(c.n)) || f.houses.has(String(c.n === 1 ? 12 : c.n - 1));
    const next = on ? "1" : "0";
    if (c.on === next) continue;
    c.on = next;
    c.el.setAttribute("data-in-focus", next);
  }
  const showMarks = Boolean(f.id);
  const allMarks = Boolean(opts.marks);
  const exactKey = f.id ? f.id.slice(f.id.indexOf(":") + 1) : null;
  const markAfter = new Map<ExtrasLayer, Element | null>();
  for (const a of cache.aspects) {
    const marks = a.layer.marks;
    if (!marks) continue;
    // A conjunction's arc is its own sign; its glyph shows only when that
    // conjunction itself is the focus (in a stellium the marks would pile up).
    const on = showMarks && f.aspects.has(a.aspect) && (!a.conj || exactKey === a.aspect);
    // With the glyphs switched on, every line the wheel found room on shows
    // its glyph at rest (chart-wheel.tsx places them), a little smaller, and
    // dimmed with its line while something else is in focus.
    const rest = !on && allMarks && a.rest;
    const next = on ? "1" : rest ? (kind ? "dim" : "rest") : null;
    if (!next) {
      if (a.mark) {
        a.mark.remove();
        a.mark = null;
        a.markOn = null;
      }
      continue;
    }
    if (!a.mark) {
      a.mark = makeMark(a);
      a.markOn = null;
      if (!a.mark) continue;
    }
    placeAfter(marks, a.mark, markAfter.get(a.layer) ?? null);
    markAfter.set(a.layer, a.mark);
    if (a.markOn === next) continue;
    a.markOn = next;
    a.mark.setAttribute("data-on", next);
    // SVG presentation + inline style: CSS class opacity on <g> is unreliable
    // in Safari and would leave the marks invisible after a refresh.
    const op = on ? "1" : next === "dim" ? "0.22" : "0.92";
    a.mark.setAttribute("opacity", op);
    a.mark.style.opacity = op;
  }
  for (const o of cache.olongs) {
    const op = f.transit && o.transit === f.transit ? "0.45" : "0";
    if (o.op === op) continue;
    o.op = op;
    o.el.setAttribute("opacity", op);
  }
  if (!cache.signsDone) {
    cache.signsDone = true;
    for (const el of cache.signs) {
      if (el.getAttribute("fill-opacity") !== "1") el.setAttribute("fill-opacity", "1");
    }
  }
  // (A decan fill pass that matched nothing — the cells are "decan-cell",
  // styled by CSS — was dropped with its query.)
}
