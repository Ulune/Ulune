/**
 * Pictures of parts of the wheel for the 3D view.
 *
 * Safari repaints live SVG very slowly once it is tipped into perspective, so
 * the big flat layers of the 3D view (the plate, the zodiac ring, the aspect
 * web, the outer ring) are drawn once into canvases, which the browser then
 * only has to move.
 *
 * They are drawn straight from the live chart with the Canvas 2D API: each
 * shape's geometry, its transform (getScreenCTM, relative to the chart) and
 * its computed paint. No serializing, no SVG-as-image, no font embedding —
 * the canvas uses the page's own fonts — so it is fast and it does not depend
 * on how a browser loads SVG images (the first version did, and Safari drew
 * nothing). Supports what the wheel uses: g, nested svg, path, line, circle,
 * ellipse, rect, polyline, polygon and text.
 */

export type ViewBox = { x: number; y: number; w: number; h: number };

type Paint = {
  alpha: number;
};

const SHAPES = new Set(["path", "line", "circle", "ellipse", "rect", "polyline", "polygon"]);

function num(el: Element, attr: string): number {
  const v = Number.parseFloat(el.getAttribute(attr) ?? "");
  return Number.isFinite(v) ? v : 0;
}

function lengthPx(v: string, fontPx: number): number {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  if (v.endsWith("em")) return n * fontPx;
  return n;
}

function pointsPath(el: Element, close: boolean): Path2D {
  const nums = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
  const p = new Path2D();
  for (let i = 0; i + 1 < nums.length; i += 2) {
    if (i === 0) p.moveTo(nums[i], nums[i + 1]);
    else p.lineTo(nums[i], nums[i + 1]);
  }
  if (close) p.closePath();
  return p;
}

function shapePath(el: Element, tag: string): Path2D | null {
  switch (tag) {
    case "path": {
      const d = el.getAttribute("d");
      return d ? new Path2D(d) : null;
    }
    case "line": {
      const p = new Path2D();
      p.moveTo(num(el, "x1"), num(el, "y1"));
      p.lineTo(num(el, "x2"), num(el, "y2"));
      return p;
    }
    case "circle": {
      const r = num(el, "r");
      if (r <= 0) return null;
      const p = new Path2D();
      p.arc(num(el, "cx"), num(el, "cy"), r, 0, Math.PI * 2);
      return p;
    }
    case "ellipse": {
      const rx = num(el, "rx");
      const ry = num(el, "ry");
      if (rx <= 0 || ry <= 0) return null;
      const p = new Path2D();
      p.ellipse(num(el, "cx"), num(el, "cy"), rx, ry, 0, 0, Math.PI * 2);
      return p;
    }
    case "rect": {
      const x = num(el, "x");
      const y = num(el, "y");
      const w = num(el, "width");
      const h = num(el, "height");
      if (w <= 0 || h <= 0) return null;
      let rx = num(el, "rx");
      let ry = el.hasAttribute("ry") ? num(el, "ry") : rx;
      if (!el.hasAttribute("rx")) rx = ry;
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      const p = new Path2D();
      if (rx > 0 || ry > 0) {
        p.moveTo(x + rx, y);
        p.lineTo(x + w - rx, y);
        p.ellipse(x + w - rx, y + ry, rx, ry, 0, -Math.PI / 2, 0);
        p.lineTo(x + w, y + h - ry);
        p.ellipse(x + w - rx, y + h - ry, rx, ry, 0, 0, Math.PI / 2);
        p.lineTo(x + rx, y + h);
        p.ellipse(x + rx, y + h - ry, rx, ry, 0, Math.PI / 2, Math.PI);
        p.lineTo(x, y + ry);
        p.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, Math.PI * 1.5);
        p.closePath();
      } else {
        p.rect(x, y, w, h);
      }
      return p;
    }
    case "polyline":
      return pointsPath(el, false);
    case "polygon":
      return pointsPath(el, true);
    default:
      return null;
  }
}

function usable(color: string): boolean {
  return Boolean(color) && color !== "none" && !color.startsWith("url(") && color !== "transparent" && color !== "rgba(0, 0, 0, 0)";
}

function dashes(cs: CSSStyleDeclaration, scale: number): number[] {
  const v = cs.getPropertyValue("stroke-dasharray");
  if (!v || v === "none") return [];
  const list = v.split(/[\s,]+/).map((s) => Number.parseFloat(s) * scale).filter((n) => Number.isFinite(n) && n >= 0);
  return list.length && list.some((n) => n > 0) ? list : [];
}

/**
 * Jump every CSS animation and transition running in `root` to its end, so a
 * picture shows the chart at rest. A chart that has just been drawn fades in
 * (and new aspects and bodies ease in): drawn at that moment, the aspect web
 * came out empty.
 */
export function settleAnimations(root: Element) {
  let list: Animation[] = [];
  try {
    list = root.getAnimations({ subtree: true });
  } catch {
    try {
      list = document.getAnimations().filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        return target instanceof Element && root.contains(target);
      });
    } catch {
      list = [];
    }
  }
  for (const a of list) {
    try {
      a.finish();
    } catch {
      /* an endless animation has no end: leave it */
    }
  }
}

/**
 * Draw `roots` (and their subtrees, minus anything `skip` matches) of the live
 * chart `svg` into a canvas `px` wide, showing `crop` (viewBox units): `reuse`
 * if given (cleared first; redrawing the same canvas keeps memory flat while
 * the chart changes under the 3D view), else a new one.
 * `k` is how many CSS px one viewBox unit takes on screen: non-scaling strokes
 * were set in screen px and keep that weight.
 */
export type RenderStyle = {
  /** Draw what the page hides (the chart is hidden behind its pictures in 3D). */
  ignoreHidden?: boolean;
  /** Elements drawn at full strength whatever their own opacity (an aspect mark shown only on focus). */
  force?: (el: Element) => boolean;
};

export function renderLayer(
  svg: SVGSVGElement,
  roots: Element[],
  skip: (el: Element) => boolean,
  crop: ViewBox,
  px: number,
  k: number,
  reuse: HTMLCanvasElement | null = null,
  style: RenderStyle = {},
): HTMLCanvasElement | null {
  const w = Math.max(1, Math.round(px));
  const h = Math.max(1, Math.round((px * crop.h) / crop.w));
  const canvas = reuse ?? document.createElement("canvas");
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  const rootCtm = svg.getScreenCTM();
  if (!ctx || !rootCtm) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  const toRoot = rootCtm.inverse();
  // viewBox units → canvas px
  const d = w / crop.w;
  const base = new DOMMatrix([d, 0, 0, d, -crop.x * d, -crop.y * d]);
  // A non-scaling stroke of 1 CSS px is this many canvas px.
  const screenPx = d / (k || 1);

  const draw = (el: Element, paint: Paint) => {
    if (skip(el)) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none") return;
    let alpha = paint.alpha;
    // Pieces the depth layer hides under a lifted copy still belong in the
    // picture; so do pieces asked for at full strength.
    if (!el.hasAttribute("data-depth-hidden") && !style.force?.(el)) {
      const o = Number.parseFloat(cs.opacity);
      if (Number.isFinite(o)) alpha *= o;
    }
    if (alpha <= 0.003) return;
    const tag = el.tagName.toLowerCase();
    if (tag === "defs" || tag === "title" || tag === "desc" || tag === "style" || tag === "metadata") return;
    if ((style.ignoreHidden || cs.visibility !== "hidden") && (SHAPES.has(tag) || tag === "text")) {
      const ctm = (el as SVGGraphicsElement).getScreenCTM?.();
      if (ctm) paintElement(ctx, el, tag, cs, base.multiply(toRoot.multiply(ctm)), alpha, screenPx);
    }
    if (tag === "text") return;
    for (const child of el.children) draw(child, { alpha });
  };

  for (const r of roots) {
    // The chart's own root is only a frame here (it is see-through in 3D).
    if (r === svg) for (const c of svg.children) draw(c, { alpha: 1 });
    else draw(r, { alpha: 1 });
  }
  return canvas;
}

/** Give a canvas's memory back now (Safari keeps it until collected otherwise). */
export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

function paintElement(
  ctx: CanvasRenderingContext2D,
  el: Element,
  tag: string,
  cs: CSSStyleDeclaration,
  m: DOMMatrix,
  alpha: number,
  screenPx: number,
) {
  const fill = cs.getPropertyValue("fill");
  const stroke = cs.getPropertyValue("stroke");
  const fillAlpha = alpha * (Number.parseFloat(cs.getPropertyValue("fill-opacity")) || 0);
  const strokeAlpha = alpha * (Number.parseFloat(cs.getPropertyValue("stroke-opacity")) || 0);
  const sw = Number.parseFloat(cs.getPropertyValue("stroke-width")) || 0;
  const nonScaling = cs.getPropertyValue("vector-effect") === "non-scaling-stroke";
  const strokeFirst = /^\s*stroke/.test(cs.getPropertyValue("paint-order"));
  const doFill = usable(fill) && fillAlpha > 0.003;
  const doStroke = usable(stroke) && strokeAlpha > 0.003 && sw > 0;
  if (!doFill && !doStroke) return;

  if (tag === "text") {
    const text = el.textContent ?? "";
    if (!text.trim()) return;
    const size = Number.parseFloat(cs.fontSize) || 12;
    ctx.setTransform(m);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    const anchor = cs.getPropertyValue("text-anchor");
    ctx.textAlign = anchor === "middle" ? "center" : anchor === "end" ? "right" : "left";
    const baseline = cs.getPropertyValue("dominant-baseline");
    ctx.textBaseline =
      baseline === "central" || baseline === "middle"
        ? "middle"
        : baseline === "hanging" || baseline === "text-before-edge"
          ? "hanging"
          : baseline === "text-after-edge" || baseline === "ideographic"
            ? "bottom"
            : "alphabetic";
    const spacing = cs.letterSpacing;
    const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if ("letterSpacing" in c) c.letterSpacing = spacing && spacing !== "normal" ? spacing : "0px";
    const x = num(el, "x") + lengthPx(el.getAttribute("dx") ?? "0", size);
    const y = num(el, "y") + lengthPx(el.getAttribute("dy") ?? "0", size);
    const strokeText = () => {
      ctx.globalAlpha = strokeAlpha;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = nonScaling ? sw * screenPx / Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : sw;
      ctx.lineJoin = (cs.getPropertyValue("stroke-linejoin") as CanvasLineJoin) || "miter";
      ctx.strokeText(text, x, y);
    };
    const fillText = () => {
      ctx.globalAlpha = fillAlpha;
      ctx.fillStyle = fill;
      ctx.fillText(text, x, y);
    };
    if (strokeFirst) {
      if (doStroke) strokeText();
      if (doFill) fillText();
    } else {
      if (doFill) fillText();
      if (doStroke) strokeText();
    }
    return;
  }

  const path = shapePath(el, tag);
  if (!path) return;
  const fillShape = () => {
    ctx.setTransform(m);
    ctx.globalAlpha = fillAlpha;
    ctx.fillStyle = fill;
    ctx.fill(path, (cs.getPropertyValue("fill-rule") as CanvasFillRule) === "evenodd" ? "evenodd" : "nonzero");
  };
  const strokeShape = () => {
    ctx.globalAlpha = strokeAlpha;
    ctx.strokeStyle = stroke;
    ctx.lineCap = (cs.getPropertyValue("stroke-linecap") as CanvasLineCap) || "butt";
    ctx.lineJoin = (cs.getPropertyValue("stroke-linejoin") as CanvasLineJoin) || "miter";
    if (nonScaling) {
      // The geometry follows the transform; the stroke keeps its screen weight.
      const p = new Path2D();
      p.addPath(path, m);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.setLineDash(dashes(cs, screenPx));
      ctx.lineWidth = sw * screenPx;
      ctx.stroke(p);
    } else {
      ctx.setTransform(m);
      ctx.lineWidth = sw;
      ctx.setLineDash(dashes(cs, 1));
      ctx.stroke(path);
    }
    ctx.setLineDash([]);
  };
  if (strokeFirst) {
    if (doStroke) strokeShape();
    if (doFill) fillShape();
  } else {
    if (doFill) fillShape();
    if (doStroke) strokeShape();
  }
}
