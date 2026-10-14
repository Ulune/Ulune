/*
 * Contrast, measured in the page (languages plan, part 30; the review's T4):
 * every visible word against what is really painted behind it, and the
 * parts of a control a reader needs to see (a field's edge, an icon that is
 * the whole button, the focus ring), in the theme on screen. Made here, with
 * no library:
 *
 *   - the colours are the ones the browser computed (rgb, oklch, oklab,
 *     color(), lab…), turned into sRGB by the maths below;
 *   - what is behind a word is asked of the browser itself
 *     (elementsFromPoint, every element made hittable for the moment): the
 *     backgrounds under it in paint order, an SVG shape's fill, a ::before or
 *     ::after that paints there, each with its opacity, composited as the
 *     browser composites them; a word clipped away or covered by an opaque
 *     surface is not measured; a word an SVG halo (paint-order: stroke)
 *     surrounds stands on its halo;
 *   - WCAG 2.2's ratio: 4.5:1 for text, 3:1 for large text (24 px, or
 *     18.66 px bold) and for what identifies a control (1.4.3, 1.4.11).
 *
 * One approximation (the part's review): a box faded as a whole (opacity
 * on a box that paints its own background) fades the words in it toward
 * that background, not the box toward the page behind it, so a word in
 * such a box is measured a little off, either way. Fades in motion are
 * waited out (settled, below).
 *
 * Decorative paint (a tint, a hatching) is never measured for itself, only
 * the words on it. Text in a disabled control, text hidden or read by a
 * screen reader alone is skipped, as WCAG allows. A word scrolled out of its
 * box is scrolled into view (instantly) to be measured, and its box put back.
 *
 * contrastScan(page, opts) returns { checked, issues }; formatIssue(issue)
 * one line a person can act on (the element, its colours, the ratio and the
 * ratio needed). Its maths check themselves on known pairs when this file
 * loads, so a wrong conversion fails the suite instead of passing it.
 */

/* ------------------------------------------------------------ colour maths */

/** sRGB transfer, both ways (channels 0–1). */
function srgbEncode(c) {
  const s = c < 0 ? -1 : 1;
  const a = Math.abs(c);
  return s * (a <= 0.0031308 ? 12.92 * a : 1.055 * Math.pow(a, 1 / 2.4) - 0.055);
}
function srgbDecode(c) {
  const s = c < 0 ? -1 : 1;
  const a = Math.abs(c);
  return s * (a <= 0.04045 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4));
}

/** Linear sRGB from CIE XYZ (D65). */
function xyzToLinearSrgb([x, y, z]) {
  return [
    3.2409699419045226 * x - 1.537383177570094 * y - 0.4986107602930034 * z,
    -0.9692436362808796 * x + 1.8759675015077202 * y + 0.04155505740717559 * z,
    0.05563007969699366 * x - 0.20397695888897652 * y + 1.0569715142428786 * z,
  ];
}

/** XYZ D50 to D65 (Bradford), for lab(), lch() and color(xyz-d50). */
function d50ToD65([x, y, z]) {
  return [
    0.9554734527042182 * x - 0.023098536874261423 * y + 0.0632593086610217 * z,
    -0.028369706963208136 * x + 1.0099954580058226 * y + 0.021041398966943008 * z,
    0.012314001688319899 * x - 0.020507696433477912 * y + 1.3303659366080753 * z,
  ];
}

/** Linear sRGB from OKLab. */
function oklabToLinearSrgb(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** XYZ D50 from CIE Lab. */
function labToXyzD50(L, a, b) {
  const e = 216 / 24389;
  const k = 24389 / 27;
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const xr = fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k;
  const yr = L > k * e ? ((L + 16) / 116) ** 3 : L / k;
  const zr = fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k;
  return [xr * 0.9642956764295677, yr, zr * 0.8251046025104602];
}

/**
 * A computed CSS colour as { r, g, b, a }, the channels sRGB-encoded 0–1
 * (clipped to the screen's gamut, as an sRGB screen shows it), or null for
 * what is not a colour (none, url(…), currentcolor left unresolved).
 */
function parseColour(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const clip = (v) => Math.min(1, Math.max(0, v));
  const done = (r, g, b, a) => ({ r: clip(r), g: clip(g), b: clip(b), a: clip(Number.isFinite(a) ? a : 1) });
  const num = (t, hundred) => (t === "none" ? 0 : t.endsWith("%") ? (parseFloat(t) / 100) * hundred : t.endsWith("deg") ? parseFloat(t) : parseFloat(t));
  const alphaOf = (t) => (t === undefined ? 1 : t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t));
  let m = /^rgba?\(([^)]*)\)$/.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    const ch = (t) => (t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t) / 255);
    return done(ch(p[0]), ch(p[1]), ch(p[2]), alphaOf(p[3]));
  }
  m = /^(oklab|oklch|lab|lch|color)\((.*)\)$/.exec(s);
  if (!m) {
    m = /^#([0-9a-f]{3,8})$/.exec(s);
    if (!m) return null;
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const v = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    return done(v(0), v(2), v(4), h.length === 8 ? v(6) : 1);
  }
  const fn = m[1];
  let body = m[2].trim();
  let alpha = 1;
  const slash = body.lastIndexOf("/");
  if (slash >= 0) {
    alpha = alphaOf(body.slice(slash + 1).trim());
    body = body.slice(0, slash).trim();
  }
  const p = body.split(/\s+/);
  let lin;
  if (fn === "oklab") lin = oklabToLinearSrgb(num(p[0], 1), num(p[1], 0.4), num(p[2], 0.4));
  else if (fn === "oklch") {
    const h = (num(p[2], 1) * Math.PI) / 180;
    lin = oklabToLinearSrgb(num(p[0], 1), num(p[1], 0.4) * Math.cos(h), num(p[1], 0.4) * Math.sin(h));
  } else if (fn === "lab") lin = xyzToLinearSrgb(d50ToD65(labToXyzD50(num(p[0], 100), num(p[1], 125), num(p[2], 125))));
  else if (fn === "lch") {
    const h = (num(p[2], 1) * Math.PI) / 180;
    lin = xyzToLinearSrgb(d50ToD65(labToXyzD50(num(p[0], 100), num(p[1], 150) * Math.cos(h), num(p[1], 150) * Math.sin(h))));
  } else {
    const space = p.shift();
    const v = p.map((t) => num(t, 1));
    if (space === "srgb") return done(v[0], v[1], v[2], alpha);
    if (space === "srgb-linear") lin = v;
    else if (space === "display-p3") {
      const [r, g, b] = v.map(srgbDecode);
      lin = xyzToLinearSrgb([
        0.4865709486482162 * r + 0.26566769316909306 * g + 0.1982172852343625 * b,
        0.2289745640697488 * r + 0.6917385218365064 * g + 0.079286914093745 * b,
        0.04511338185890264 * g + 1.043944368900976 * b,
      ]);
    } else if (space === "xyz" || space === "xyz-d65") lin = xyzToLinearSrgb(v);
    else if (space === "xyz-d50") lin = xyzToLinearSrgb(d50ToD65(v));
    else return null;
  }
  return done(srgbEncode(lin[0]), srgbEncode(lin[1]), srgbEncode(lin[2]), alpha);
}

/** WCAG relative luminance of an opaque colour. */
function luminance(c) {
  return 0.2126 * srgbDecode(c.r) + 0.7152 * srgbDecode(c.g) + 0.0722 * srgbDecode(c.b);
}

/** WCAG contrast ratio of two opaque colours (1–21). */
function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `top` painted over `bottom`, as browsers composite (source-over, in encoded sRGB). */
function over(top, bottom) {
  const a = top.a + bottom.a * (1 - top.a);
  if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  const ch = (t, b) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
  return { r: ch(top.r, bottom.r), g: ch(top.g, bottom.g), b: ch(top.b, bottom.b), a };
}

/** A colour with its alpha multiplied (opacity, fill-opacity). */
function fade(c, k) {
  return { r: c.r, g: c.g, b: c.b, a: c.a * k };
}

/** `a` seen through a group at opacity `t` over `b` (both opaque). */
function mixColour(a, b, t) {
  return { r: a.r * t + b.r * (1 - t), g: a.g * t + b.g * (1 - t), b: a.b * t + b.b * (1 - t), a: 1 };
}

/** #rrggbb (and its alpha, when not opaque). */
function hex(c) {
  const h = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}${c.a < 0.999 ? h(c.a) : ""}`;
}

const MATHS = [srgbEncode, srgbDecode, xyzToLinearSrgb, d50ToD65, oklabToLinearSrgb, labToXyzD50, parseColour, luminance, contrastRatio, over, fade, mixColour, hex];
const MATHS_SRC = `window.__ulxMaths = (() => {\n${MATHS.map(String).join("\n")}\nreturn { parseColour, luminance, contrastRatio, over, fade, mixColour, hex };\n})();`;

/** The maths against pairs whose answers are known; throws on a wrong conversion. */
export function selfCheck() {
  const near = (got, want, tol, what) => {
    if (!(Math.abs(got - want) <= tol)) throw new Error(`contrast maths: ${what} is ${got}, not ${want}`);
  };
  const white = parseColour("rgb(255, 255, 255)");
  const black = parseColour("#000");
  near(contrastRatio(white, black), 21, 1e-9, "black on white");
  near(contrastRatio(parseColour("rgb(119, 119, 119)"), white), 4.48, 0.005, "#777 on white");
  near(contrastRatio(parseColour("#767676"), white), 4.54, 0.005, "#767676 on white");
  // OKLab and OKLCH: white, black and sRGB red (oklch(0.628 0.2577 29.23)).
  near(parseColour("oklch(1 0 0)").g, 1, 0.002, "oklch white");
  near(parseColour("oklab(0 0 0)").r, 0, 1e-9, "oklab black");
  const red = parseColour("oklch(0.62796 0.25768 29.2339)");
  near(red.r, 1, 0.003, "oklch red r");
  near(red.g, 0, 0.003, "oklch red g");
  // CIE Lab D50: lab(53.24 80.09 67.2) is sRGB red only in D65, so check the grey axis and D50 white.
  near(parseColour("lab(100 0 0)").b, 1, 0.003, "lab white");
  near(parseColour("lab(50 0 0)").r, parseColour("lab(50 0 0)").b, 0.003, "lab grey stays grey");
  near(parseColour("color(display-p3 1 1 1)").r, 1, 0.003, "p3 white");
  near(parseColour("color(srgb 0.5 0.25 1 / 0.5)").a, 0.5, 1e-9, "color() alpha");
  near(parseColour("oklab(0.5 0.1 0.02 / 0.505)").a, 0.505, 1e-9, "oklab alpha");
  // Half black over white is the middle of the encoded scale, as browsers paint it.
  near(over(fade(black, 0.5), white).r, 0.5, 1e-9, "50% black over white");
  if (parseColour("url(#hatch)") !== null || parseColour("none") !== null) throw new Error("contrast maths: a paint server read as a colour");
  return true;
}
selfCheck();

/* --------------------------------------------------------- in the page */

/**
 * Runs in the page (window.__ulxMaths installed first). Everything it needs
 * is declared inside: Playwright sends its source.
 */
function pageScan(opts) {
  const M = window.__ulxMaths;
  const root = (opts.root && document.querySelector(opts.root)) || document.body;
  const exclude = opts.exclude || "";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const WHITE = { r: 1, g: 1, b: 1, a: 1 };
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE", "DESC", "OPTION", "OPTGROUP", "DATALIST", "TEXTAREA"]);
  const GEOM = new Set(["path", "circle", "rect", "ellipse", "polygon", "polyline", "line"]);
  const issues = [];
  const seen = new Map();
  let checked = 0;
  let clipped = 0;
  let covered = 0;
  let offscreen = 0;
  const skipped = [];
  const styles = new Map();
  const cs = (el) => {
    let s = styles.get(el);
    if (!s) {
      s = getComputedStyle(el);
      styles.set(el, s);
    }
    return s;
  };

  // Every element hittable while we ask what is under a point (a constructed sheet: no CSP applies).
  const sheet = new CSSStyleSheet();
  sheet.replaceSync("*, *::before, *::after { pointer-events: auto !important; }");
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  const scrolled = [];
  const windowAt = { x: window.scrollX, y: window.scrollY };

  const describe = (el) => {
    const parts = [];
    for (let a = el, depth = 0; a && a.nodeType === 1 && depth < 4; a = a.parentElement, depth += 1) {
      const tid = a.getAttribute("data-testid");
      const cls = (a.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 3);
      parts.unshift(`${a.tagName.toLowerCase()}${cls.length ? `.${cls.join(".")}` : ""}${tid ? `[${tid}]` : ""}`);
      if (tid) break;
    }
    return parts.join(" > ");
  };
  const testidOf = (el) => el.closest("[data-testid]")?.getAttribute("data-testid") ?? "";
  const record = (issue, el) => {
    const key = `${issue.kind}|${issue.sel.replace(/\d+/g, "#")}|${issue.fg}|${issue.bg}`;
    const had = seen.get(key);
    if (had) {
      had.count += 1;
      return;
    }
    const entry = { ...issue, testid: testidOf(el), count: 1 };
    seen.set(key, entry);
    issues.push(entry);
  };
  const visible = (el) => {
    if (typeof el.checkVisibility === "function" && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    return true;
  };
  const disabled = (el) => Boolean(el.closest(":disabled, [aria-disabled='true'], [inert]"));
  /**
   * Brings a box into view in each of its scroll boxes, the innermost first,
   * then in the window when the page scrolls as a whole; instantly, and put
   * back at the end. A box already shown is left alone.
   */
  const intoView = (el, rectOf) => {
    for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const s = cs(a);
      const sy = /(auto|scroll)/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 1;
      const sx = /(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1;
      if (!sy && !sx) continue;
      const ar = a.getBoundingClientRect();
      const top = ar.top + a.clientTop;
      const left = ar.left + a.clientLeft;
      const r = rectOf();
      const outY = sy && (r.top < top - 0.5 || r.bottom > top + a.clientHeight + 0.5);
      const outX = sx && (r.left < left - 0.5 || r.right > left + a.clientWidth + 0.5);
      if (!outY && !outX) continue;
      if (!scrolled.some((x) => x.el === a)) scrolled.push({ el: a, top: a.scrollTop, left: a.scrollLeft });
      a.scrollTo({
        top: outY ? a.scrollTop + (r.top + r.height / 2) - (top + a.clientHeight / 2) : a.scrollTop,
        left: outX ? a.scrollLeft + (r.left + r.width / 2) - (left + a.clientWidth / 2) : a.scrollLeft,
        behavior: "instant",
      });
    }
    // A page that scrolls as a whole (the encyclopedia): the window, put back at the end.
    const r = rectOf();
    if (r.top < 0 || r.bottom > vh) window.scrollBy({ top: r.top + r.height / 2 - vh / 2, behavior: "instant" });
    return rectOf();
  };
  const inViewport = (r) => r.width > 0 && r.height > 0 && r.left >= -0.5 && r.top >= -0.5 && r.right <= vw + 0.5 && r.bottom <= vh + 0.5;
  /** The opacity of `el` and every ancestor up to (not including) `stop`. */
  const opacityUpTo = (el, stop) => {
    let o = 1;
    for (let a = el; a && a !== stop && a.nodeType === 1; a = a.parentElement) o *= parseFloat(cs(a).opacity) || 0;
    return o;
  };
  const commonAncestor = (a, b) => {
    for (let x = a; x; x = x.parentElement) if (x.contains(b)) return x;
    return null;
  };
  /** A ::before or ::after that paints a background where (x, y) is. */
  const pseudoLayers = (el, x, y) => {
    const out = [];
    for (const which of ["::before", "::after"]) {
      const p = getComputedStyle(el, which);
      if (!p || p.content === "none" || p.content === "normal" || p.display === "none" || p.visibility === "hidden") continue;
      const bg = M.parseColour(p.backgroundColor);
      if (!bg || bg.a <= 0) continue;
      const r = el.getBoundingClientRect();
      const s = cs(el);
      const px = (v) => parseFloat(v) || 0;
      let box;
      if (p.position === "absolute" || p.position === "fixed") {
        const left = r.left + px(s.borderLeftWidth) + px(p.left) + px(p.marginLeft);
        const top = r.top + px(s.borderTopWidth) + px(p.top) + px(p.marginTop);
        const w = px(p.width) + (p.boxSizing === "border-box" ? 0 : px(p.paddingLeft) + px(p.paddingRight) + px(p.borderLeftWidth) + px(p.borderRightWidth));
        const h = px(p.height) + (p.boxSizing === "border-box" ? 0 : px(p.paddingTop) + px(p.paddingBottom) + px(p.borderTopWidth) + px(p.borderBottomWidth));
        box = { left, top, right: left + w, bottom: top + h };
      } else box = r;
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) out.push(M.fade(bg, parseFloat(p.opacity) || 1));
    }
    return out;
  };
  /**
   * What is painted at (x, y) under `el` (el and its own children left out),
   * composited bottom up; `notes` collects what could not be read exactly.
   */
  const backdrop = (el, x, y, notes) => {
    const stack = document.elementsFromPoint(x, y);
    const at = stack.findIndex((n) => n === el || el.contains(n));
    let bg = WHITE;
    // From the bottom of the stack up to the element (what is above it is judged by coveredAt).
    for (let i = stack.length - 1; i > at; i -= 1) {
      const n = stack[i];
      if (n === el || el.contains(n)) continue;
      const s = cs(n);
      const shared = commonAncestor(n, el);
      const k = opacityUpTo(n, shared);
      if (n instanceof SVGElement && GEOM.has(n.tagName.toLowerCase())) {
        let paint = null;
        let o = 1;
        let pt = null;
        try {
          pt = new DOMPoint(x, y).matrixTransform(n.getScreenCTM().inverse());
        } catch {
          pt = null;
        }
        const inFill = pt && typeof n.isPointInFill === "function" ? n.isPointInFill(pt) : true;
        const inStroke = pt && typeof n.isPointInStroke === "function" ? n.isPointInStroke(pt) : false;
        if (inStroke && s.stroke !== "none") {
          paint = M.parseColour(s.stroke);
          o = parseFloat(s.strokeOpacity) || 0;
          if (!paint && /url\(/.test(s.stroke)) notes.add("pattern");
        } else if (inFill && s.fill !== "none") {
          paint = M.parseColour(s.fill);
          o = parseFloat(s.fillOpacity) || 0;
          if (!paint && /url\(/.test(s.fill)) notes.add("pattern");
        }
        if (paint) bg = M.over(M.fade(paint, o * k), bg);
        continue;
      }
      if (n instanceof HTMLCanvasElement || n instanceof HTMLImageElement || n instanceof HTMLVideoElement) notes.add(n.tagName.toLowerCase());
      const own = M.parseColour(s.backgroundColor);
      if (own && own.a > 0) bg = M.over(M.fade(own, k), bg);
      if (s.backgroundImage && s.backgroundImage !== "none") notes.add("background-image");
      if (s.mixBlendMode !== "normal" || (s.backdropFilter && s.backdropFilter !== "none")) notes.add("blend");
      for (const layer of pseudoLayers(n, x, y)) bg = M.over(M.fade(layer, k), bg);
    }
    return { bg: M.over(bg, WHITE), stack, at };
  };
  /** True when something opaque, not the element nor its own, is painted above it at the point. */
  const coveredAt = (el, stack, at) => {
    for (let i = 0; i < at; i += 1) {
      const n = stack[i];
      if (el.contains(n) || n.contains(el)) continue;
      const s = cs(n);
      if (n instanceof SVGElement) {
        if (!GEOM.has(n.tagName.toLowerCase())) continue;
        const f = M.parseColour(s.fill);
        if (f && f.a * (parseFloat(s.fillOpacity) || 0) * opacityUpTo(n, commonAncestor(n, el)) > 0.9) return true;
        continue;
      }
      if (n instanceof HTMLImageElement || n instanceof HTMLCanvasElement || n instanceof HTMLVideoElement) return true;
      const bg = M.parseColour(s.backgroundColor);
      if (bg && bg.a * opacityUpTo(n, commonAncestor(n, el)) > 0.9) return true;
    }
    return false;
  };
  const sizeOf = (el) => {
    const s = cs(el);
    let px = parseFloat(s.fontSize) || 16;
    if (el instanceof SVGElement) {
      const m = el.getScreenCTM?.();
      if (m) px *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    }
    const weight = parseInt(s.fontWeight, 10) || 400;
    return { px, weight, large: px >= 23.95 || (weight >= 700 && px >= 18.6) };
  };

  /* ---- words ---- */
  const texts = new Map();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.nodeValue || !t.nodeValue.trim()) continue;
    const el = t.parentElement;
    if (!el || texts.has(el) || SKIP.has(el.tagName)) continue;
    texts.set(el, t);
  }
  // A field's own words (its value, a select's chosen option).
  for (const f of root.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]), select")) {
    const value = f.tagName === "SELECT" ? (f.selectedOptions?.[0]?.textContent ?? "") : f.value;
    if (value && value.trim()) texts.set(f, null);
  }
  for (const [el, t] of texts) {
    if ((exclude && el.closest(exclude)) || !visible(el) || disabled(el) || el.closest("[aria-hidden='true'] .sr-only, .sr-only")) continue;
    const rectOf = () => {
      if (!t) return el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(t);
      const rs = range.getClientRects();
      return rs.length ? rs[0] : range.getBoundingClientRect();
    };
    let r = rectOf();
    if (r.width < 1 || r.height < 1) continue;
    r = intoView(el, rectOf);
    const notes = new Set();
    if (!inViewport(r)) {
      offscreen += 1;
      if (opts.debug) skipped.push(`offscreen ${describe(el)}`);
      continue;
    }
    // Three points along the first line, the worst one counts.
    const s = cs(el);
    const svg = el instanceof SVGElement;
    let fg = M.parseColour(svg ? s.fill : s.webkitTextFillColor && s.webkitTextFillColor !== s.color ? s.webkitTextFillColor : s.color);
    // Ink made transparent is either not shown or painted another way (a gradient clipped to the words).
    if (!fg || fg.a <= 0.01) continue;
    if (svg) fg = M.fade(fg, parseFloat(s.fillOpacity) || 0);
    let halo = null;
    if (svg && /^stroke/.test(s.paintOrder || "") && s.stroke !== "none") {
      const h = M.parseColour(s.stroke);
      const m = el.getScreenCTM?.();
      const scale = m ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 1;
      if (h && (parseFloat(s.strokeWidth) || 0) * scale >= 1.5) halo = M.fade(h, parseFloat(s.strokeOpacity) || 0);
    }
    const o = opacityUpTo(el, null);
    let worst = null;
    for (const fx of [0.5, 0.2, 0.8]) {
      const x = r.left + r.width * fx;
      const y = r.top + r.height / 2;
      const b = backdrop(el, x, y, notes);
      if (b.at < 0) {
        worst = worst ?? "clipped";
        continue;
      }
      if (coveredAt(el, b.stack, b.at)) {
        worst = worst ?? "covered";
        continue;
      }
      // A field's words stand on its own background.
      let ground = b.bg;
      if (!t) {
        const own = M.parseColour(s.backgroundColor);
        if (own && own.a > 0) ground = M.over(own, ground);
      }
      if (halo) ground = M.over(halo, ground);
      let ink = M.over(fg, ground);
      if (o < 0.999) ink = M.mixColour(ink, ground, o);
      const ratio = M.contrastRatio(ink, ground);
      if (!worst || typeof worst === "string" || ratio < worst.ratio) worst = { ratio, ink, ground };
    }
    if (!worst) continue;
    if (worst === "clipped" || worst === "covered") {
      if (worst === "clipped") clipped += 1;
      else covered += 1;
      if (opts.debug) skipped.push(`${worst} ${describe(el)} “${(t?.nodeValue ?? "").trim().slice(0, 20)}”`);
      continue;
    }
    checked += 1;
    const size = sizeOf(el);
    const need = size.large ? 3 : 4.5;
    if (worst.ratio + 0.005 < need) {
      record(
        {
          kind: "text",
          sel: describe(el),
          text: ((t ? t.nodeValue : el.value || el.selectedOptions?.[0]?.textContent) || "").trim().replace(/\s+/g, " ").slice(0, 40),
          fg: M.hex(worst.ink),
          bg: M.hex(worst.ground),
          ratio: Math.round(worst.ratio * 100) / 100,
          need,
          px: Math.round(size.px * 10) / 10,
          weight: size.weight,
          // A word drawn in an SVG figure (a chart's glyph or degree) rather than the page's own text.
          svg: el instanceof SVGElement,
          notes: [...notes].join(","),
        },
        el,
      );
    }
  }

  if (opts.ui !== false) {
    /* ---- a field's edge (1.4.11): its border, or its own background, 3:1 against what surrounds it ---- */
    for (const f of root.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]):not([type=submit]):not([type=button]):not([type=reset]), select, textarea")) {
      if ((exclude && f.closest(exclude)) || !visible(f) || disabled(f)) continue;
      const r = intoView(f, () => f.getBoundingClientRect());
      if (!inViewport(r) || r.width < 4 || r.height < 4) continue;
      const notes = new Set();
      const b = backdrop(f, r.left + r.width / 2, r.top + r.height / 2, notes);
      if (b.at < 0 || coveredAt(f, b.stack, b.at)) continue;
      checked += 1;
      const s = cs(f);
      const outside = b.bg;
      const fill = M.over(M.parseColour(s.backgroundColor) || { r: 0, g: 0, b: 0, a: 0 }, outside);
      let best = M.contrastRatio(fill, outside);
      let edge = fill;
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        if ((parseFloat(s[`border${side}Width`]) || 0) < 0.5 || /none|hidden/.test(s[`border${side}Style`])) continue;
        const c = M.parseColour(s[`border${side}Color`]);
        if (!c) continue;
        const shown = M.over(c, outside);
        const ratio = M.contrastRatio(shown, outside);
        if (ratio > best) {
          best = ratio;
          edge = shown;
        }
      }
      for (const m of (s.boxShadow || "").matchAll(/(rgba?\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|color\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+([\d.]+)px/g)) {
        if ((parseFloat(m[5]) || 0) < 1) continue;
        const c = M.parseColour(m[1]);
        if (!c) continue;
        const shown = M.over(c, outside);
        const ratio = M.contrastRatio(shown, outside);
        if (ratio > best) {
          best = ratio;
          edge = shown;
        }
      }
      if (best + 0.005 < 3) {
        record({ kind: "field", sel: describe(f), text: f.getAttribute("aria-label") || f.name || f.id || "", fg: M.hex(edge), bg: M.hex(outside), ratio: Math.round(best * 100) / 100, need: 3, notes: [...notes].join(",") }, f);
      }
    }
    // A native check box, radio or range coloured by accent-color: that colour against the ground.
    for (const f of root.querySelectorAll("input[type=checkbox], input[type=radio], input[type=range]")) {
      if ((exclude && f.closest(exclude)) || !visible(f) || disabled(f)) continue;
      const s = cs(f);
      if (!s.accentColor || s.accentColor === "auto") continue;
      const accent = M.parseColour(s.accentColor);
      if (!accent) continue;
      const r = intoView(f, () => f.getBoundingClientRect());
      if (!inViewport(r)) continue;
      const notes = new Set();
      const b = backdrop(f, r.left + r.width / 2, r.top + r.height / 2, notes);
      if (b.at < 0) continue;
      checked += 1;
      const ratio = M.contrastRatio(M.over(accent, b.bg), b.bg);
      if (ratio + 0.005 < 3) record({ kind: "accent", sel: describe(f), text: f.getAttribute("aria-label") || f.name || "", fg: M.hex(accent), bg: M.hex(b.bg), ratio: Math.round(ratio * 100) / 100, need: 3, notes: "" }, f);
    }

    /* ---- an icon that is the whole control, or an image with a name: its ink 3:1 against its ground ---- */
    const CONTROL = "button, a[href], [role=button], [role=tab], [role=menuitem], [role=menuitemradio], [role=option], [role=switch], [role=checkbox], [role=radio], summary, label";
    for (const icon of root.querySelectorAll("svg")) {
      if ((exclude && icon.closest(exclude)) || icon.ownerSVGElement || !visible(icon) || disabled(icon)) continue;
      const r0 = icon.getBoundingClientRect();
      if (r0.width < 6 || r0.height < 6 || r0.width > 40 || r0.height > 40) continue;
      const control = icon.closest(CONTROL);
      const named = icon.getAttribute("role") === "img" && (icon.getAttribute("aria-label") || icon.getAttribute("aria-labelledby"));
      let meaningful = Boolean(named);
      if (control && !meaningful) {
        // The control shows nothing else: no word on screen beside the icon.
        const words = [...control.querySelectorAll("*"), control].some((n) => {
          if (n === icon || icon.contains(n) || n instanceof SVGElement) return false;
          return [...n.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim() && !n.closest(".sr-only") && visible(n));
        });
        meaningful = !words;
      }
      if (!meaningful) continue;
      const shape = [...icon.querySelectorAll("path, circle, rect, ellipse, polygon, polyline, line, text")].find((n) => {
        if (n.closest("defs, clipPath, mask, pattern, marker, symbol")) return false;
        const s = cs(n);
        return s.visibility !== "hidden" && s.display !== "none" && ((s.stroke !== "none" && M.parseColour(s.stroke)?.a > 0) || (s.fill !== "none" && M.parseColour(s.fill)?.a > 0));
      });
      if (!shape) continue;
      const ss = cs(shape);
      const strokeInk = ss.stroke !== "none" ? M.parseColour(ss.stroke) : null;
      const ink0 = strokeInk && strokeInk.a > 0 ? M.fade(strokeInk, parseFloat(ss.strokeOpacity) || 0) : M.fade(M.parseColour(ss.fill), parseFloat(ss.fillOpacity) || 0);
      const r = intoView(icon, () => icon.getBoundingClientRect());
      if (!inViewport(r)) continue;
      const notes = new Set();
      const b = backdrop(icon, r.left + r.width / 2, r.top + r.height / 2, notes);
      if (b.at < 0 || coveredAt(icon, b.stack, b.at)) continue;
      checked += 1;
      const o = opacityUpTo(shape, null);
      let ink = M.over(ink0, b.bg);
      if (o < 0.999) ink = M.mixColour(ink, b.bg, o);
      const ratio = M.contrastRatio(ink, b.bg);
      if (ratio + 0.005 < 3) {
        record({ kind: "icon", sel: describe(control || icon), text: (control || icon).getAttribute("aria-label") || icon.getAttribute("aria-label") || "", fg: M.hex(ink), bg: M.hex(b.bg), ratio: Math.round(ratio * 100) / 100, need: 3, notes: [...notes].join(",") }, control || icon);
      }
    }
  }

  for (const x of scrolled.reverse()) x.el.scrollTo({ top: x.top, left: x.left, behavior: "instant" });
  window.scrollTo({ top: windowAt.y, left: windowAt.x, behavior: "instant" });
  document.adoptedStyleSheets = document.adoptedStyleSheets.filter((x) => x !== sheet);
  return { checked, clipped, covered, offscreen, skipped, issues };
}

/**
 * Runs in the page: each control that takes the keyboard's focus, focused in
 * turn (the keyboard's modality set by the caller), its ring's colour against
 * the ground it is drawn on (3:1), and a control whose look does not change
 * at all when focused.
 */
function pageRings(opts) {
  const M = window.__ulxMaths;
  const root = (opts.root && document.querySelector(opts.root)) || document.body;
  const exclude = opts.exclude || "";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const WHITE = { r: 1, g: 1, b: 1, a: 1 };
  const GEOM = "path, circle, rect, ellipse, polygon, polyline";
  const issues = [];
  const seen = new Map();
  let checked = 0;
  const describe = (el) => {
    const parts = [];
    for (let a = el, depth = 0; a && a.nodeType === 1 && depth < 4; a = a.parentElement, depth += 1) {
      const tid = a.getAttribute("data-testid");
      const cls = (a.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 3);
      parts.unshift(`${a.tagName.toLowerCase()}${cls.length ? `.${cls.join(".")}` : ""}${tid ? `[${tid}]` : ""}`);
      if (tid) break;
    }
    return parts.join(" > ");
  };
  const record = (issue, el) => {
    const key = `${issue.kind}|${issue.sel.replace(/\d+/g, "#")}|${issue.fg}|${issue.bg}`;
    const had = seen.get(key);
    if (had) {
      had.count += 1;
      return;
    }
    const entry = { ...issue, testid: el.closest("[data-testid]")?.getAttribute("data-testid") ?? "", count: 1 };
    seen.set(key, entry);
    issues.push(entry);
  };
  const sheet = new CSSStyleSheet();
  sheet.replaceSync("*, *::before, *::after { pointer-events: auto !important; }");
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  const before = document.activeElement;
  /** The ground under `el` at its centre, el and its own left out, composited bottom up. */
  const ground = (el, x, y, withOwn) => {
    const stack = document.elementsFromPoint(x, y);
    let bg = WHITE;
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const n = stack[i];
      if ((n === el && !withOwn) || (n !== el && el.contains(n))) continue;
      if (!n.contains(el) && n !== el) continue; // only what the control stands on
      const s = getComputedStyle(n);
      const c = M.parseColour(n instanceof SVGElement ? (s.fill === "none" ? "transparent" : s.fill) : s.backgroundColor);
      if (c && c.a > 0 && !(n instanceof SVGSVGElement)) bg = M.over(M.fade(c, parseFloat(s.opacity) || 1), bg);
    }
    return M.over(bg, WHITE);
  };
  const look = (el) => {
    const s = getComputedStyle(el);
    const child = el instanceof SVGElement ? el.querySelector(GEOM) : null;
    const cs2 = child ? getComputedStyle(child) : null;
    return {
      outline: s.outlineStyle !== "none" && (parseFloat(s.outlineWidth) || 0) >= 1 ? { style: s.outlineStyle, colour: s.outlineColor, offset: parseFloat(s.outlineOffset) || 0, width: parseFloat(s.outlineWidth) } : null,
      shadow: s.boxShadow,
      paint: `${s.backgroundColor} ${s.color} ${s.borderTopColor} ${s.borderBottomColor} ${s.borderTopWidth} ${s.textDecorationLine}`,
      stroke: cs2 ? `${cs2.stroke} ${cs2.strokeWidth}` : "",
      strokeColour: cs2 ? cs2.stroke : "",
      child,
    };
  };
  /** The rings a box-shadow draws: each shadow with a spread and (nearly) no blur. */
  const shadowRings = (value) => {
    const out = [];
    const re = /(rgba?\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|lab\([^)]*\)|lch\([^)]*\)|color\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px(\s+inset)?/g;
    for (const m of (value || "").matchAll(re)) {
      if ((parseFloat(m[5]) || 0) < 1 || (parseFloat(m[4]) || 0) > 2) continue;
      const colour = M.parseColour(m[1]);
      if (colour && colour.a > 0) out.push({ colour, inside: Boolean(m[6]) });
    }
    return out;
  };
  const focusables = [...root.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, summary, [tabindex]")].filter((el) => {
    if (exclude && el.closest(exclude)) return false;
    if (el.tabIndex < 0 || el.closest(":disabled, [inert], [aria-hidden='true']")) return false;
    if (typeof el.checkVisibility === "function" && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 2 && r.height >= 2;
  });
  for (const el of focusables.slice(0, opts.max || 400)) {
    // The control and two of its boxes: a ring may be drawn around the row or card it sits in (:focus-within).
    const levels = [el, el.parentElement, el.parentElement?.parentElement].filter((n) => n && n !== document.body && n !== document.documentElement);
    const calm = levels.map(look);
    el.focus({ preventScroll: true });
    if (document.activeElement !== el || !el.matches(":focus-visible")) continue;
    const lit = levels.map(look);
    const r = el.getBoundingClientRect();
    const onScreen = r.left >= 0 && r.top >= 0 && r.right <= vw && r.bottom <= vh;
    const x = Math.min(vw - 1, Math.max(0, r.left + r.width / 2));
    const y = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
    checked += 1;
    const candidates = [];
    levels.forEach((n, i) => {
      const a = calm[i];
      const b = lit[i];
      if (b.outline && (i === 0 || JSON.stringify(b.outline) !== JSON.stringify(a.outline))) {
        // The browser's own ring (outline-style: auto) is drawn in two tones, one of which always stands out.
        if (b.outline.style === "auto") candidates.push({ node: n, auto: true });
        const colour = M.parseColour(b.outline.colour);
        if (colour && colour.a > 0 && b.outline.style !== "auto") candidates.push({ node: n, colour, inside: b.outline.offset < -b.outline.width / 2 });
      }
      if (b.shadow !== a.shadow) for (const ring of shadowRings(b.shadow)) candidates.push({ node: n, ...ring });
      if (i === 0 && b.child && b.stroke !== a.stroke && b.strokeColour !== "none") {
        const colour = M.parseColour(b.strokeColour);
        if (colour && colour.a > 0) candidates.push({ node: b.child, colour, inside: true, svg: true });
      }
    });
    const text = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    if (candidates.length) {
      if (!onScreen) continue;
      let best = null;
      for (const c of candidates) {
        if (c.auto) {
          best = { ratio: 21 };
          break;
        }
        const g = ground(c.node, x, y, c.inside || c.svg);
        const ratio = M.contrastRatio(M.over(c.colour, g), g);
        if (!best || ratio > best.ratio) best = { ratio, ink: M.over(c.colour, g), g, inside: c.inside };
      }
      if (best.ratio + 0.005 < 3) record({ kind: "ring", sel: describe(el), text, fg: M.hex(best.ink), bg: M.hex(best.g), ratio: Math.round(best.ratio * 100) / 100, need: 3, svg: el instanceof SVGElement, notes: best.inside ? "inside" : "" }, el);
    } else {
      const changed = levels.some((n, i) => calm[i].paint !== lit[i].paint || calm[i].shadow !== lit[i].shadow || calm[i].stroke !== lit[i].stroke);
      if (!changed) record({ kind: "no-ring", sel: describe(el), text, fg: "", bg: "", ratio: 0, need: 3, notes: "" }, el);
    }
  }
  if (before instanceof HTMLElement || before instanceof SVGElement) before.focus({ preventScroll: true });
  else document.activeElement?.blur?.();
  document.adoptedStyleSheets = document.adoptedStyleSheets.filter((x) => x !== sheet);
  return { checked, issues };
}

/* ------------------------------------------------------------- for suites */

/**
 * Waits (up to `ms`) for every animation and transition that ends to have
 * ended: a page fading in, a figure building itself or the themes
 * cross-fading would otherwise be measured half-way. Endless ones (a live
 * dot's pulse) are left running.
 */
async function settled(page, ms = 5000) {
  await page.evaluate(async (ms) => {
    const until = Date.now() + ms;
    for (;;) {
      const running = document.getAnimations().filter((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming?.().endTime ?? Infinity));
      if (!running.length || Date.now() > until) return;
      await Promise.race([Promise.all(running.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, Math.max(0, until - Date.now())))]);
      await new Promise((r) => requestAnimationFrame(() => r()));
    }
  }, ms);
}

/**
 * Measures the page as it is on screen. Options: `root` (a selector, the
 * body by default), `exclude` (a selector whose insides are not measured),
 * `ui` (fields, icons; true by default), `rings` (focus rings; true by
 * default). Returns { checked, issues }, each issue { kind (text, field,
 * accent, icon, ring, no-ring), sel, testid, text, fg, bg, ratio, need, px,
 * weight, svg (a word or ring drawn inside an SVG figure), count, notes }.
 */
export async function contrastScan(page, opts = {}) {
  await settled(page);
  await page.evaluate(MATHS_SRC);
  const words = await page.evaluate(pageScan, { root: opts.root ?? null, exclude: opts.exclude ?? "", ui: opts.ui !== false, debug: Boolean(opts.debug) });
  let rings = { checked: 0, issues: [] };
  if (opts.rings !== false) {
    // The keyboard's modality, so a focus made by script shows its ring (a modifier changes nothing on the page).
    await page.keyboard.press("Shift");
    rings = await page.evaluate(pageRings, { root: opts.root ?? null, exclude: opts.exclude ?? "", max: opts.maxRings ?? 400 });
  }
  return { checked: words.checked + rings.checked, rings: rings.checked, clipped: words.clipped, covered: words.covered, offscreen: words.offscreen, skipped: words.skipped, issues: [...words.issues, ...rings.issues] };
}

/** One issue as a line: what, where, its colours, the ratio found and the ratio needed. */
export function formatIssue(i) {
  if (i.kind === "no-ring") return `no focus indicator: ${i.sel}${i.text ? ` “${i.text}”` : ""}${i.count > 1 ? ` (×${i.count})` : ""}`;
  const what = i.kind === "text" ? `text ${i.px}px/${i.weight}` : i.kind;
  return `${what} ${i.ratio}:1 < ${i.need}:1 — ${i.fg} on ${i.bg} — ${i.sel}${i.text ? ` “${i.text}”` : ""}${i.count > 1 ? ` (×${i.count})` : ""}${i.notes ? ` [${i.notes}]` : ""}`;
}
