/**
 * Export the figure on stage as a standalone SVG or PNG. The live SVG is
 * styled by CSS variables and classes, so the clone gets the computed
 * paint inlined, and the glyph fonts it uses are embedded as data URLs.
 */

const PAINT_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "paint-order",
  "visibility",
  "display",
  "color",
  "vector-effect",
] as const;

export function findFigureSvg(root: ParentNode = document): SVGSVGElement | null {
  return (
    root.querySelector<SVGSVGElement>(".ob-figure svg.ulune-wheel:not([data-depth-plane], .ulune-wheel-ghost)") ??
    root.querySelector<SVGSVGElement>(".ob-figure svg.ulune-hd-svg:not([data-depth-plane])") ??
    root.querySelector<SVGSVGElement>(".ob-figure svg:not([data-depth-plane])")
  );
}

/** Copy the computed paint of `src` (and its subtree) onto its clone `dst`. */
export function inlinePaint(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  const style: string[] = [];
  for (const p of PAINT_PROPS) {
    const v = cs.getPropertyValue(p);
    if (v) style.push(`${p}:${v}`);
  }
  // Non-scaling strokes are device pixels on screen; keep that look at export size.
  dst.setAttribute("style", style.join(";"));
  dst.removeAttribute("class");
  const a = src.children;
  const b = dst.children;
  for (let i = 0; i < a.length && i < b.length; i += 1) inlinePaint(a[i], b[i]);
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const fontCssCache = new Map<string, Promise<string>>();

/** @font-face rules for the families the SVG actually uses, with inlined sources (cached). */
export function fontFaces(families: Set<string>): Promise<string> {
  const key = [...families].sort().join("|");
  let hit = fontCssCache.get(key);
  if (!hit) {
    hit = loadFontFaces(families);
    fontCssCache.set(key, hit);
  }
  return hit;
}

async function loadFontFaces(families: Set<string>): Promise<string> {
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(list)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const fam = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
      if (!families.has(fam)) continue;
      const src = rule.style.getPropertyValue("src");
      const m = /url\(["']?([^"')]+)["']?\)/.exec(src);
      if (!m) continue;
      const data = await toDataUrl(new URL(m[1], sheet.href ?? location.href).href);
      if (!data) continue;
      rules.push(`@font-face{font-family:"${fam}";src:url(${data});font-weight:${rule.style.getPropertyValue("font-weight") || "400"};font-style:${rule.style.getPropertyValue("font-style") || "normal"}}`);
    }
  }
  return rules.join("\n");
}

/** A band under an exported wheel saying whose chart and which moment (review 3 Oct, C8). */
export type FigureCaption = { title: string; line: string };
/** The band's height, in the wheel's own units (its viewBox is about 760 wide). */
const CAPTION_BAND = 64;

export async function serializeFigure(svg: SVGSVGElement, size = 1600, caption: FigureCaption | null = null): Promise<string> {
  // Pieces lifted in 3D are hidden on the base while their copies float; the
  // export is the flat chart, so show them for the length of the copy.
  const lifted = [...svg.querySelectorAll("[data-depth-hidden]")];
  for (const el of lifted) el.removeAttribute("data-depth-hidden");
  const view3d = svg.getAttribute("data-view3d");
  if (view3d) svg.removeAttribute("data-view3d");
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlinePaint(svg, clone);
  for (const el of lifted) el.setAttribute("data-depth-hidden", "1");
  if (view3d) svg.setAttribute("data-view3d", view3d);
  clone.removeAttribute("data-depth-base");
  const families = new Set<string>();
  clone.querySelectorAll("[style]").forEach((el) => {
    const m = /font-family:([^;]+)/.exec(el.getAttribute("style") ?? "");
    if (m) for (const f of m[1].split(",")) families.add(f.replace(/["']/g, "").trim());
  });
  const vb = svg.viewBox.baseVal;
  const band = caption && vb && vb.width ? CAPTION_BAND * (vb.width / 760) : 0;
  const ratio = vb && vb.width ? (vb.height + band) / vb.width : 1;
  if (band && vb) clone.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height + band}`);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(Math.round(size * ratio)));
  clone.removeAttribute("style");
  const bg = getComputedStyle(document.body).backgroundColor || "#fff";
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  if (vb && vb.width) {
    rect.setAttribute("x", String(vb.x));
    rect.setAttribute("y", String(vb.y));
    rect.setAttribute("width", String(vb.width));
    rect.setAttribute("height", String(vb.height + band));
  } else {
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
  }
  rect.setAttribute("fill", bg);
  clone.insertBefore(rect, clone.firstChild);
  if (band && vb && caption) {
    const body = getComputedStyle(document.body);
    const ink = body.color || "#111";
    const family = body.fontFamily || "sans-serif";
    families.add(family.split(",")[0].replace(/["']/g, "").trim());
    const k = vb.width / 760;
    const cx = vb.x + vb.width / 2;
    const top = vb.y + vb.height;
    const text = (words: string, y: number, sizeU: number, weight: number, opacity: number) => {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", String(cx));
      t.setAttribute("y", String(y));
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("fill", ink);
      t.setAttribute("opacity", String(opacity));
      t.setAttribute("style", `font-family:${family};font-size:${sizeU}px;font-weight:${weight}`);
      t.textContent = words;
      clone.appendChild(t);
    };
    text(caption.title, top + 26 * k, 20 * k, 600, 1);
    text(caption.line, top + 48 * k, 13 * k, 400, 0.72);
  }
  const css = await fontFaces(families);
  if (css) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
  }
  // Strokes were measured on screen at the rendered size; scale them to the export.
  const scale = size / (svg.getBoundingClientRect().width || size);
  clone.querySelectorAll<SVGElement>("[style*='vector-effect: non-scaling-stroke'], [style*='vector-effect:non-scaling-stroke']").forEach((el) => {
    const st = el.getAttribute("style") ?? "";
    const w = /stroke-width:\s*([\d.]+)px/.exec(st);
    if (w) el.setAttribute("style", st.replace(w[0], `stroke-width:${(Number(w[1]) * scale).toFixed(2)}px`));
  });
  return new XMLSerializer().serializeToString(clone);
}

export async function figurePng(svgText: string, width: number, height: number): Promise<Blob | null> {
  const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
