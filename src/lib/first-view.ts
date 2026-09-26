import { getDepthPrefs } from "@/lib/depth/prefs";

/*
 * The first view (performance plan 1.13): a returning reader sees their
 * chart's zodiac and houses before the app has started.
 *
 * When the natal wheel rests, its zodiac, decans, ticks, houses and angles
 * are copied, without the planets and aspects, with the place the wheel had
 * on the page. On the next visit an inline script (lib/boot.ts,
 * firstViewScript) draws that copy at the same place, if nothing it depends
 * on has changed: the same theme, Look and window size, on the natal page's
 * flat wheel. When the app is ready the real wheel takes its place without a
 * seam and only the planets and lines fly in (`html[data-first-view]` skips
 * the zodiac's entrance, shell.css). Switching charts or modes, and casting,
 * keep the full entrance.
 *
 * The copy is kept only where the charts are: in a private space that stays
 * unlocked on this device, sealed like them (studio/space-sync.ts sets the
 * sink). While just looking, or in a space that locks, nothing is kept and
 * the next visit starts as before. It goes away with its chart.
 */

/** Where versions before the private space kept the copy, in the clear (read, never written now). */
export const FIRST_VIEW_KEY = "orbis.firstview.v1";
/** The copy's record in the private space (sealed like the charts). */
export const FIRST_VIEW_RECORD = "view/first";
/** The copy's element: a custom tag, so React's hydration of <body> steps over it. */
export const FIRST_VIEW_TAG = "ulune-first-view";
/** On <html> while the first view stands in and the real wheel's entrance runs. */
export const FIRST_VIEW_ATTR = "data-first-view";

export type FirstViewSnapshot = {
  v: 1;
  /** The saved chart it shows. */
  id: string;
  theme: "light" | "dark";
  /** The Look as the boot script applies it for that theme (lib/boot.ts). */
  look: string;
  /** Window size, and the wheel's box on the page, in CSS px. */
  w: number;
  h: number;
  x: number;
  y: number;
  s: number;
  /** The zodiac and houses: an <svg class="ulune-wheel"> without bodies or lines. */
  html: string;
};

/** Where a copy is kept: the private space, while it stays unlocked on this device. */
export type FirstViewSink = { save: (snap: FirstViewSnapshot) => void; forget: () => void };

let sink: FirstViewSink | null = null;

/** Top-level wheel parts that are the chart's frame, not its bodies or lines. */
const FRAME_KINDS = new Set([
  "tick-fine",
  "tick-mid",
  "tick-coarse",
  "aspect-ring",
  "cusp-degs",
  "house-num",
  "angle",
]);

function isFrame(el: Element): boolean {
  const kind = el.getAttribute("data-kind");
  if (kind) return FRAME_KINDS.has(kind);
  // Backdrop, rim, the zodiac (g[data-pinwheel]), the houses (g[data-house]).
  return !el.hasAttribute("data-aspect") && !el.hasAttribute("data-body");
}

/** Only what the picture needs: no focus handles, tooltips or entrance order. */
const DROP_ATTRS = ["tabindex", "role", "aria-label", "aria-hidden", "data-hl"];

function frameMarkup(svg: SVGSVGElement): string {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  // Bodies and lines go, and so does what the page's CSS hides here (the 1°
  // ticks on a small wheel): the copy is drawn outside the wheel's frame.
  const parts = Array.from(copy.children);
  Array.from(svg.children).forEach((el, i) => {
    if (!isFrame(el) || getComputedStyle(el).display === "none") parts[i]?.remove();
  });
  for (const el of Array.from(copy.querySelectorAll("title"))) el.remove();
  copy.removeAttribute("data-entering");
  for (const el of [copy, ...Array.from(copy.querySelectorAll("*"))]) {
    for (const a of DROP_ATTRS) el.removeAttribute(a);
    const style = el.getAttribute("style");
    if (style && style.includes("--enter")) {
      const rest = style.replace(/--enter:[^;]*;?/g, "").trim();
      if (rest) el.setAttribute("style", rest);
      else el.removeAttribute("style");
    }
  }
  return copy.outerHTML;
}

/**
 * What decides the frame's shape: the view box, the cusps, where the zodiac
 * starts, the angles and the glyph face. The real wheel must match the copy
 * on these to take over without a seam.
 */
function shapeOf(svg: Element | null): string {
  if (!svg) return "";
  const cusps = Array.from(svg.querySelectorAll(":scope > [data-house]"), (g) =>
    g.getAttribute("data-cusp"),
  ).join(",");
  const band = svg.querySelector('[data-kind="sign-band"] path')?.getAttribute("d") ?? "";
  const angles = Array.from(
    svg.querySelectorAll(':scope > [data-kind="angle"] [data-kind="angle-axis"]'),
    (a) => `${a.getAttribute("x1")},${a.getAttribute("y1")},${a.getAttribute("x2")},${a.getAttribute("y2")}`,
  ).join(";");
  const face = svg.querySelector("[data-glyph-face]")?.getAttribute("data-glyph-face") ?? "";
  return `${svg.getAttribute("viewBox")}|${cusps}|${band.slice(0, 64)}|${angles}|${face}`;
}

const WIDE = "(min-width: 1024px)"; // studio/dock/dock-layout.ts, WIDE_QUERY

/**
 * The wheel shows what the next visit will: nothing in focus, no entrance
 * running, flat, not zoomed, and on a phone the reading sheet at its peek
 * (where it opens on arrival).
 */
function atRest(svg: SVGSVGElement): boolean {
  if (svg.hasAttribute("data-entering") || svg.hasAttribute("data-focus-fade")) return false;
  if (svg.getAttribute("data-focus-kind")) return false;
  if (getDepthPrefs().view !== "flat") return false;
  const port = svg.closest(".ulune-wheel-zoom-port");
  if (port) {
    if (port.getAttribute("data-zoom") !== "1.00") return false;
    const lens = port.getAttribute("data-lens-zoom");
    if (lens && lens !== "1.00") return false;
  }
  if (!window.matchMedia(WIDE).matches) {
    const panel = document.querySelector(".ob-panel");
    if (panel && panel.getAttribute("data-detent") !== "peek") return false;
  }
  return true;
}

/** The chart the kept copy shows, if one is kept. */
let storedId: string | null = null;

/** Keep copies with `next` from now on (null: keep none); `current` is the chart of the copy it holds. */
export function setFirstViewSink(next: FirstViewSink | null, current: string | null = null): void {
  sink = next;
  storedId = next ? current : null;
}

/** The chart the kept copy shows, or null. */
export function firstViewChart(): string | null {
  return storedId;
}

export function forgetFirstView(): void {
  if (storedId !== null) sink?.forget();
  storedId = null;
}

/** The library changed: a copy of a chart that is gone goes too. */
export function keepFirstViewFor(ids: readonly string[]): void {
  if (storedId && !ids.includes(storedId)) forgetFirstView();
}

/**
 * Copy the resting natal wheel for the next visit. Called when its entrance
 * has ended and the page is idle, and when the page is hidden or left.
 * Not at rest: a copy of another chart is dropped, one of this chart kept.
 * Returns whether the copy was made.
 */
export function captureFirstView(svg: SVGSVGElement, chartId: string): boolean {
  if (!sink) return false;
  try {
    if (!svg.isConnected) return false;
    if (!atRest(svg)) {
      if (storedId !== chartId) forgetFirstView();
      return false;
    }
    const r = svg.getBoundingClientRect();
    if (r.width < 64 || Math.abs(r.width - r.height) > 1) return false;
    const theme = document.documentElement.classList.contains("light") ? "light" : "dark";
    const snap: FirstViewSnapshot = {
      v: 1,
      id: chartId,
      theme,
      look: window.localStorage.getItem(`ulune.boot.look.${theme}`) ?? "",
      w: window.innerWidth,
      h: window.innerHeight,
      x: r.left + window.scrollX,
      y: r.top + window.scrollY,
      s: r.width,
      html: frameMarkup(svg),
    };
    sink.save(snap);
    storedId = chartId;
    return true;
  } catch {
    /* storage full or blocked: the next visit starts as before */
    return false;
  }
}

function leave(view: Element, fade: boolean): void {
  if (!fade) {
    view.remove();
    return;
  }
  view.setAttribute("data-leaving", "");
  window.setTimeout(() => view.remove(), 320);
}

/**
 * idle: the page may still hand over to a natal wheel; claimed: a wheel took
 * over and its entrance runs; over: the first view is done for this page.
 */
let phase: "idle" | "claimed" | "over" = "idle";
let owner: SVGSVGElement | null = null;
let ending = 0;

/** Set once the page is past its first view, so one still on its way (lib/boot.ts) is not drawn late. */
export const FIRST_VIEW_OVER = "__uluneFirstViewOver";

function finish(): void {
  phase = "over";
  owner = null;
  (window as unknown as Record<string, boolean>)[FIRST_VIEW_OVER] = true;
  document.documentElement.removeAttribute(FIRST_VIEW_ATTR);
}

/** Ends once the wheel's entrance is over or the wheel is gone. Deferred a
 *  task, so a wheel remounted in place (React's strict mode runs effects
 *  twice) keeps its hand-over. */
const handle = {
  done(): void {
    if (phase !== "claimed" || ending) return;
    ending = window.setTimeout(() => {
      ending = 0;
      finish();
    }, 0);
  },
};

/**
 * The real natal wheel has mounted. When the first view stands in, it takes
 * over: the copy goes once the wheel has painted under it at the same place
 * with the same shape, or fades out if the page came out differently.
 * Returns a handle when the entrance should skip the zodiac; its `done` must
 * be called when the entrance ends or the wheel goes.
 */
export function claimFirstView(svg: SVGSVGElement): { done: () => void } | null {
  if (typeof document === "undefined" || phase === "over") return null;
  if (phase === "claimed") {
    if (owner !== svg) return null;
    window.clearTimeout(ending);
    ending = 0;
    return handle;
  }
  const view = document.querySelector(FIRST_VIEW_TAG);
  if (!view || !document.documentElement.hasAttribute(FIRST_VIEW_ATTR)) {
    view?.remove();
    finish();
    return null;
  }
  phase = "claimed";
  owner = svg;
  const shape = shapeOf(view.querySelector("svg"));
  let frames = 0;
  const check = () => {
    if (!view.isConnected) return;
    if (!svg.isConnected) return leave(view, true);
    const a = svg.getBoundingClientRect();
    const b = view.getBoundingClientRect();
    const here =
      Math.abs(a.left - b.left) <= 1 && Math.abs(a.top - b.top) <= 1 && Math.abs(a.width - b.width) <= 1;
    if (here && shapeOf(svg) === shape) return leave(view, false);
    // The fit can settle a frame or two late; then it did not land here.
    if (++frames >= 10) return leave(view, true);
    requestAnimationFrame(check);
  };
  // Two frames: the real wheel paints once under the copy before it goes.
  requestAnimationFrame(() => requestAnimationFrame(check));
  return handle;
}

/**
 * The studio has restored the reader's library. If it will not show the
 * natal wheel (a form, an empty library), or the wheel does not come soon,
 * the first view steps aside.
 */
export function settleFirstView(wheelExpected: boolean): void {
  if (typeof document === "undefined" || phase !== "idle") return;
  const drop = () => {
    if (phase !== "idle") return;
    const view = document.querySelector(FIRST_VIEW_TAG);
    if (view) leave(view, true);
    finish();
  };
  if (!document.querySelector(FIRST_VIEW_TAG)) finish();
  else if (!wheelExpected) drop();
  else window.setTimeout(drop, 1200);
}
