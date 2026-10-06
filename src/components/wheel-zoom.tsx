import { Box, Minus, Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { prefersReducedMotion } from "@/lib/depth/env";
import { useI18n } from "@/lib/i18n/locale";
import { requestDepthReset, setDepthPrefs, useDepthPrefs } from "@/lib/depth/prefs";
import { supportsWebGL } from "./depth/gl/support";
import { preloadView3D } from "./depth/load-view3d";
import { whenIdle } from "@/lib/lazy-component";
import { useAspectSlot, useMoreSlots, useZoomSlot } from "@/studio/stage/stage-slots";

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;
const FIT_INSET = 28;
/** Smallest wheel worth fitting; below this we keep the port box instead. */
const MIN_D = 140;
/** Chrome may never take more than this share of the port. */
const CHROME_FLOOR = 0.55;
/** Re-layout only on a real change — otherwise a resize can chase itself. */
const FIT_EPS = 1;
/** Wheel diameter (px) under which the 1° tick band stops being readable. */
const FINE_TICK_D = 430;
/** Chrome the wheel must not be painted under. */
const CHROME = [".ob-strip", ".ob-foot"];
/** Free width beside the wheel that takes the legend (the aspect count strip) as a column, px. */
const LEGEND_SIDE_MIN = 92;
/** Free width at which that column also spells each aspect's name, px. */
const LEGEND_NAMES_MIN = 176;
/**
 * Height the column needs beside the wheel (nine aspects and the menu), px:
 * in a shorter box (a phone with the sheet open) it went above the stage.
 */
const LEGEND_SIDE_MIN_H = 320;
/** The aside is never taller than this share of the wheel: a companion, not a second chart. */
const ASIDE_SHARE = 0.72;
/** A rectangle in the stage box's own coordinates (what scrolling leaves alone). */
export type AsideRect = { l: number; t: number; r: number; b: number };
/**
 * What the aside is given, all in the stage box's coordinates: the stage's edges it may use, the
 * wheel's disc it must stay clear of, the zoom bar (when it stands in the stage) it must not
 * touch, and `report`, by which it says where it finally stands (so the zoomed wheel can tell
 * whether it covers it).
 */
export type AsideRoom = {
  top: number;
  right: number;
  bottom: number;
  maxSize: number;
  circle: { cx: number; cy: number; r: number };
  bar: AsideRect | null;
  report: (rect: AsideRect | null) => void;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function roundZoom(n: number) {
  return Math.round(n / ZOOM_STEP) * ZOOM_STEP;
}

type Pt = { x: number; y: number };
type Box = { l: number; t: number; r: number; b: number };

const boxW = (b: Box) => b.r - b.l;
const boxH = (b: Box) => b.b - b.t;
const overlaps = (a: Box, b: Box) =>
  a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;

function rectBox(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { l: r.left, t: r.top, r: r.right, b: r.bottom };
}

/** Crop `box` clear of `hit` on whichever single side costs the least area. */
function cropAway(box: Box, hit: Box): Box {
  if (!overlaps(box, hit)) return box;
  const cuts: [keyof Box, number, Box][] = [
    ["l", hit.r - box.l, { ...box, l: hit.r }],
    ["r", box.r - hit.l, { ...box, r: hit.l }],
    ["t", hit.b - box.t, { ...box, t: hit.b }],
    ["b", box.b - hit.t, { ...box, b: hit.t }],
  ];
  let best = box;
  let bestLoss = Infinity;
  for (const [, loss, next] of cuts) {
    if (loss < 0 || loss >= bestLoss) continue;
    bestLoss = loss;
    best = next;
  }
  return best;
}

/**
 * The box the wheel can actually be seen in. The port alone is not enough:
 * on desktop the shell clips at `100dvh - chrome`, so a port that grew past
 * the fold would paint the bottom of the wheel into nothing. Cropping here
 * (rather than resizing the port) keeps the stage's own flow untouched, so
 * this cannot fight the layout that produced the port in the first place.
 */
function fitBox(port: HTMLElement): Box {
  const portBox = rectBox(port);
  let box = { ...portBox };
  for (let el = port.parentElement; el; el = el.parentElement) {
    const cs = getComputedStyle(el);
    const clipX = cs.overflowX === "hidden" || cs.overflowX === "clip";
    const clipY = cs.overflowY === "hidden" || cs.overflowY === "clip";
    if (!clipX && !clipY) continue;
    const er = rectBox(el);
    if (clipX) {
      box.l = Math.max(box.l, er.l);
      box.r = Math.min(box.r, er.r);
    }
    if (clipY) {
      box.t = Math.max(box.t, er.t);
      box.b = Math.min(box.b, er.b);
    }
  }
  const doc = document.documentElement;
  // A page that cannot scroll makes the viewport a hard edge too. When it can
  // scroll (mobile), content below the fold is reachable and must not shrink
  // the wheel.
  if (doc.scrollWidth <= doc.clientWidth + 1) box.r = Math.min(box.r, doc.clientWidth);
  if (doc.scrollHeight <= doc.clientHeight + 1) box.b = Math.min(box.b, doc.clientHeight);
  const clipped = { ...box };
  for (const sel of CHROME) {
    for (const el of document.querySelectorAll(sel)) {
      if (el.contains(port)) continue;
      box = cropAway(box, rectBox(el));
    }
  }
  const portW = boxW(portBox);
  if (portW <= 430) {
    for (const el of port.querySelectorAll(".ulune-wheel-zoom-bar")) {
      box = cropAway(box, rectBox(el));
    }
  }
  // Chrome that would swallow the wheel is a layout bug elsewhere; draw the
  // wheel small rather than not at all.
  const floor = CHROME_FLOOR * Math.min(boxW(clipped), boxH(clipped));
  if (Math.min(boxW(box), boxH(box)) < floor) return clipped;
  return box;
}

/**
 * The 3D view's own zoom (its camera lens): while it is on, the zoom buttons
 * and a pinch drive it instead of scaling the stage — a scaled stage would
 * blur the canvas and turn every orbit drag into a pan.
 */
export type WheelLens = {
  zoom: number;
  min: number;
  max: number;
  /** One step in (1) or out (−1), around the middle of the view. */
  step: (dir: 1 | -1) => void;
  /** Zoom by a factor around a client point (a pinch). */
  zoomAt: (factor: number, clientX: number, clientY: number) => void;
  /** Move the zoomed view (a two-finger drag), client px. */
  pan: (dx: number, dy: number) => void;
  /** The camera's angle: from the top, tilted or low (the bar's angle button cycles them). */
  angle?: { at: WheelAngle; set: (a: WheelAngle) => void };
};

export type WheelAngle = "top" | "tilt" | "low";
const NEXT_ANGLE: Record<WheelAngle, WheelAngle> = { top: "tilt", tilt: "low", low: "top" };
const ANGLE_LABEL = { top: "cameraTop", tilt: "cameraTilt", low: "cameraLow" } as const;

/** The chart's disc as the camera sees it: round from above, flatter as it tips. */
function AngleIcon({ at }: { at: WheelAngle }) {
  const ry = at === "top" ? 5.2 : at === "tilt" ? 3.4 : 1.8;
  return (
    <svg className="size-4" viewBox="0 0 16 16" aria-hidden>
      <ellipse cx={8} cy={9} rx={6.4} ry={ry} fill="none" stroke="currentColor" strokeWidth={1.6} />
      <line x1={8} y1={9} x2={8} y2={9 - ry - 2.2} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

/**
 * Does something around the chart scroll (the page, a panel)? Then a plain
 * mouse wheel is for scrolling it; where nothing scrolls (the desktop studio),
 * the wheel zooms the chart.
 */
function wheelScrolls(port: HTMLElement): boolean {
  for (let el = port.parentElement; el; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
  }
  const doc = document.scrollingElement ?? document.documentElement;
  return doc.scrollHeight > doc.clientHeight + 1;
}

export function WheelZoom({
  children,
  lens = null,
  legend = null,
  aside = null,
  tools = null,
  onFit,
}: {
  children: ReactNode;
  lens?: WheelLens | null;
  /** The chart's own switches (wheel-toggles.tsx), at the bar's end. */
  tools?: ReactNode;
  /** The wheel's legend (the aspect count strip): beside the wheel when there is room, else in the stage footer. */
  legend?: ReactNode;
  /**
   * A companion for wide stages (the aspect grid), drawn in the free room right of the wheel,
   * clear of the wheel, the zoom bar and the stage's edge: it is handed that room and sizes itself
   * to it. It stands aside (fades out) while the zoomed wheel covers its place.
   */
  aside?: ((room: AsideRoom) => ReactNode) | null;
  /** The wheel's detail band changed: "sm" under FINE_TICK_D px (labels get shorter and bigger), else "lg". */
  onFit?: (fit: "sm" | "lg") => void;
}) {
  const onFitRef = useRef(onFit);
  onFitRef.current = onFit;
  const { t } = useI18n();
  const aspectSlot = useAspectSlot();
  const aspectSlotRef = useRef<HTMLElement | null>(null);
  aspectSlotRef.current = aspectSlot;
  /** Where the legend goes: a column in the free margin left of the wheel, or the footer. */
  const [legendAt, setLegendAt] = useState<{ x: number; y: number; names: boolean } | null>(null);
  /** Where the aside goes: the free margin right of the wheel, bottom corner (null: no room). */
  const [asideRoom, setAsideRoom] = useState<Omit<AsideRoom, "report"> | null>(null);
  const asideElRef = useRef<HTMLDivElement | null>(null);
  /** Where the aside stands (it reports it), in the stage box's coordinates. */
  const asideRectRef = useRef<AsideRect | null>(null);
  const barElRef = useRef<HTMLDivElement | null>(null);
  /** The wheel's place in the outer box's own coordinates (not the screen's: scrolling leaves them as they are). */
  const geomRef = useRef<{ cx: number; cy: number; d: number; top: number; right: number; bottom: number } | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef(lens);
  lensRef.current = lens;
  const lensOn = lens !== null;
  const zoomSlot = useZoomSlot();
  const more = useMoreSlots();
  const depth = useDepthPrefs();
  /**
   * The 3D view needs WebGL: checked once the page is idle (the server cannot
   * know, and the probe costs a context); the button shows meanwhile.
   */
  const [can3d, setCan3d] = useState(true);
  useEffect(() => whenIdle(() => setCan3d(supportsWebGL()), 3000), []);
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const zoomRef = useRef(ZOOM_MIN);
  const panRef = useRef<Pt>({ x: 0, y: 0 });
  const innerRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Pt>());
  const pinch0 = useRef<{ dist: number; zoom: number; last: number; cx: number; cy: number } | null>(null);
  const drag0 = useRef<{ x: number; y: number; pan: Pt } | null>(null);
  const panning = useRef(false);
  const didPan = useRef(false);
  /** Offset from the port centre to the centre of the visible box. */
  const fitRef = useRef<Pt>({ x: 0, y: 0 });

  const glideTimer = useRef(0);

  /**
   * Is the aside's place free? The zoomed wheel (or the 3D lens) can cover it: then it steps
   * aside (fades, ignores the pointer) rather than being drawn over the chart.
   */
  const syncAside = useCallback(() => {
    const el = asideElRef.current;
    const port = portRef.current;
    const inner = innerRef.current;
    const outer = outerRef.current;
    const at = asideRectRef.current;
    if (!el || !port || !inner || !outer || !at) return;
    let clear = true;
    const l = lensRef.current;
    if (l) {
      clear = l.zoom <= l.min + 0.001;
    } else if (zoomRef.current > ZOOM_MIN + 0.001) {
      const or = outer.getBoundingClientRect();
      const pr = port.getBoundingClientRect();
      const { x: fx, y: fy } = fitRef.current;
      const { x: px, y: py } = panRef.current;
      const cx = pr.left + pr.width / 2 + fx + px - or.left;
      const cy = pr.top + pr.height / 2 + fy + py - or.top;
      const R = (inner.offsetWidth * zoomRef.current) / 2 + 10;
      clear = Math.hypot(clamp(cx, at.l, at.r) - cx, clamp(cy, at.t, at.b) - cy) >= R;
    }
    if (clear) el.removeAttribute("data-away");
    else el.setAttribute("data-away", "");
  }, []);

  const reportAside = useCallback(
    (rect: AsideRect | null) => {
      asideRectRef.current = rect;
      syncAside();
    },
    [syncAside],
  );

  /**
   * The aside's room (what it may fill and must keep clear of), from where the wheel stands and
   * where the zoom bar is (a bar in the corner or one in the stage's own slot).
   */
  const placeAside = useCallback(() => {
    const g = geomRef.current;
    const outer = outerRef.current;
    if (!g || !outer) return;
    const or = outer.getBoundingClientRect();
    const b = barElRef.current?.getBoundingClientRect();
    const bar = b && b.width > 0 && b.height > 0 ? { l: Math.round(b.left - or.left), t: Math.round(b.top - or.top), r: Math.round(b.right - or.left), b: Math.round(b.bottom - or.top) } : null;
    const next = {
      top: Math.round(g.top),
      right: Math.round(g.right),
      bottom: Math.round(g.bottom),
      maxSize: Math.round(g.d * ASIDE_SHARE),
      circle: { cx: Math.round(g.cx), cy: Math.round(g.cy), r: Math.round(g.d / 2) },
      bar,
    };
    setAsideRoom((cur) => (cur && JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
  }, []);

  /**
   * Place the wheel. "glide" eases there (the zoom buttons and Fit: a
   * cinematic move); "direct" follows at once (pinch, pan, wheel), cutting any
   * glide; nothing leaves a running glide alone (a re-render).
   */
  const paint = useCallback((how?: "glide" | "direct") => {
    const el = innerRef.current;
    if (!el) return;
    const { x, y } = panRef.current;
    const fit = fitRef.current;
    if (how === "glide" && !prefersReducedMotion()) {
      // Quick enough that taps on + run together rather than queue (the motion plan).
      el.style.transition = "transform 340ms var(--ease-glide)";
      window.clearTimeout(glideTimer.current);
      glideTimer.current = window.setTimeout(() => {
        el.style.transition = "";
      }, 400);
    } else if (how === "direct") {
      window.clearTimeout(glideTimer.current);
      el.style.transition = "";
    }
    el.style.transform = `translate3d(${x + fit.x}px, ${y + fit.y}px, 0) scale(${zoomRef.current})`;
    syncAside();
  }, [syncAside]);

  const setZoomNow = useCallback(
    (next: number, how: "glide" | "direct" = "direct") => {
      const z = clamp(next, ZOOM_MIN, ZOOM_MAX);
      zoomRef.current = z;
      if (z <= ZOOM_MIN + 0.001) panRef.current = { x: 0, y: 0 };
      setZoom(z);
      paint(how);
    },
    [paint],
  );

  useEffect(() => {
    paint();
  }, [paint, zoom]);

  // The 3D view zooms with its own lens: the stage goes back to its fit.
  useEffect(() => {
    if (lensOn && zoomRef.current > ZOOM_MIN + 0.001) {
      panRef.current = { x: 0, y: 0 };
      setZoomNow(ZOOM_MIN, "glide");
    }
  }, [lensOn, setZoomNow]);

  // Default Fit: the wheel square is sized and centred on the box the user can
  // actually see, so the first paint is never clipped and "Fit" is a no-op.
  useEffect(() => {
    const port = portRef.current;
    const inner = innerRef.current;
    if (!port || !inner) return;
    let last = { d: 0, x: 0, y: 0, w: 0, h: 0 };
    let frame = 0;
    const applySize = () => {
      // The stage moving with the sheet scales the wheel's frame for a moment
      // (stage-flip.ts): what is on screen then is not its room. It asks again
      // once the move is over.
      if (port.closest("[data-flipping]")) return;
      const portRect = port.getBoundingClientRect();
      if (portRect.width < 8) return;
      const inset =
        Number.parseFloat(getComputedStyle(port).getPropertyValue("--wheel-fit-inset")) ||
        FIT_INSET;
      const box = fitBox(port);
      const avail = Math.min(boxW(box), boxH(box));
      const d = Math.max(MIN_D, Math.round(avail - inset));
      const x = Math.round((box.l + box.r) / 2 - (portRect.left + portRect.right) / 2);
      const y = Math.round((box.t + box.b) / 2 - (portRect.top + portRect.bottom) / 2);
      // The box's width counts too: the side panel opening or closing leaves a
      // height-bound wheel as it was, but the legend's margin changes.
      const w = Math.round(boxW(box));
      const h = Math.round(boxH(box));
      if (
        Math.abs(d - last.d) < FIT_EPS &&
        Math.abs(x - last.x) < FIT_EPS &&
        Math.abs(y - last.y) < FIT_EPS &&
        Math.abs(w - last.w) < FIT_EPS &&
        Math.abs(h - last.h) < FIT_EPS
      ) {
        return;
      }
      last = { d, x, y, w, h };
      fitRef.current = { x, y };
      // The legend takes the free margin left of the wheel when it is wide
      // enough (a wide stage); otherwise it goes to the footer.
      // The margin is judged as if the footer had no strip row (a strip in the
      // footer shortens the port): both placements weigh the same number, so
      // the legend does not flip back and forth.
      const outer = outerRef.current;
      const slot = aspectSlotRef.current;
      const stripH = slot && slot.childElementCount ? slot.getBoundingClientRect().height + 4 : 0;
      const dFree = Math.max(MIN_D, Math.round(Math.min(boxW(box), boxH(box) + stripH) - inset));
      const side = (boxW(box) - dFree) / 2;
      const or = outer?.getBoundingClientRect();
      setLegendAt((cur) => {
        if (!or || side < (cur ? LEGEND_SIDE_MIN - 8 : LEGEND_SIDE_MIN)) return null;
        if (h + stripH < (cur ? LEGEND_SIDE_MIN_H - 8 : LEGEND_SIDE_MIN_H)) return null;
        // Bottom-left, level with the wheel's foot: the circle leaves that
        // corner free (the ASC's label sits at mid-height on the left).
        const foot = Math.min(box.b, (box.t + box.b) / 2 + d / 2);
        const next = { x: Math.round(box.l - or.left + 12), y: Math.round(foot - or.top - 8), names: side >= LEGEND_NAMES_MIN };
        return cur && cur.x === next.x && cur.y === next.y && cur.names === next.names ? cur : next;
      });
      // The aside mirrors it on the right: its room is worked out from where the wheel
      // stands (placeAside), clear of the bar and the edges.
      if (or) {
        const foot = Math.min(box.b, (box.t + box.b) / 2 + d / 2);
        geomRef.current = {
          cx: (box.l + box.r) / 2 - or.left,
          cy: (box.t + box.b) / 2 - or.top,
          d,
          top: box.t - or.top + 8,
          right: box.r - or.left - 12,
          bottom: foot - or.top - 8,
        };
        placeAside();
      } else {
        geomRef.current = null;
        setAsideRoom(null);
      }
      // Detail band for the wheel: below this the 1° ticks are closer together
      // than they are wide, so styles.css drops them.
      const fitBand = d < FINE_TICK_D ? "sm" : "lg";
      if (port.dataset.wheelFit !== fitBand) {
        port.dataset.wheelFit = fitBand;
        onFitRef.current?.(fitBand);
      }
      inner.style.width = `${d}px`;
      inner.style.height = `${d}px`;
      paint();
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        applySize();
      });
    };
    applySize();
    const ro = new ResizeObserver(schedule);
    ro.observe(port);
    if (port.ownerDocument.body) ro.observe(port.ownerDocument.body);
    window.addEventListener("resize", schedule);
    // The stage moving with the sheet (stage-flip.ts) needs the wheel's new
    // size at once, to play the move from the old one.
    port.addEventListener("ulune:refit", applySize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      port.removeEventListener("ulune:refit", applySize);
    };
  }, [paint, placeAside]);

  // The bar or the lens changed (a render): the aside's room and whether it is covered are asked again.
  useEffect(() => {
    placeAside();
    syncAside();
  });

  useEffect(() => {
    const el = portRef.current;
    if (!el) return;
    // Whether the page around scrolls, looked up at most once a second: the
    // lookup reads every ancestor's style and height, which forced a layout
    // on each wheel tick while scrolling past the chart.
    let scrolls: { value: boolean; at: number } | null = null;
    const pageScrolls = () => {
      const now = performance.now();
      if (!scrolls || now - scrolls.at > 1000) scrolls = { value: wheelScrolls(el), at: now };
      return scrolls.value;
    };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (scrolls = null)) : null;
    ro?.observe(el);
    if (el.ownerDocument.body) ro?.observe(el.ownerDocument.body);
    const onWheel = (e: WheelEvent) => {
      // The 3D view takes the wheel itself (over the chart); elsewhere the page scrolls.
      if (lensRef.current) return;
      const zoomed = zoomRef.current > ZOOM_MIN + 0.001;
      if (!e.ctrlKey && !zoomed && pageScrolls()) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight || 600 : 1;
      const dy = clamp(e.deltaY * unit, -240, 240);
      // Around the pointer: what is under it stays under it.
      const z = zoomRef.current;
      const next = clamp(z * 2 ** (-dy / (e.ctrlKey ? 110 : 400)), ZOOM_MIN, ZOOM_MAX);
      if (Math.abs(next - z) < 1e-4) return;
      const r = el.getBoundingClientRect();
      const fit = fitRef.current;
      const cx = e.clientX - (r.left + r.width / 2) - fit.x;
      const cy = e.clientY - (r.top + r.height / 2) - fit.y;
      const pan = panRef.current;
      panRef.current = { x: cx - (next / z) * (cx - pan.x), y: cy - (next / z) * (cy - pan.y) };
      setZoomNow(next);
    };
    const onClickCapture = (e: MouseEvent) => {
      if (!didPan.current) return;
      e.stopPropagation();
      e.preventDefault();
      didPan.current = false;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("click", onClickCapture, true);
    return () => {
      ro?.disconnect();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [setZoomNow]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      pinch0.current = { dist: dist || 1, zoom: zoomRef.current, last: dist || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      drag0.current = null;
      panning.current = true;
      didPan.current = true;
      portRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    didPan.current = false;
    if (zoomRef.current > ZOOM_MIN + 0.001) {
      drag0.current = { x: e.clientX, y: e.clientY, pan: { ...panRef.current } };
      panning.current = false;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch0.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const lensNow = lensRef.current;
      if (lensNow) {
        // The 3D view: the lens follows the fingers (spread to zoom, move to pan).
        const p = pinch0.current;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        lensNow.pan(cx - p.cx, cy - p.cy);
        lensNow.zoomAt(dist / p.last, cx, cy);
        p.last = dist;
        p.cx = cx;
        p.cy = cy;
        didPan.current = true;
        return;
      }
      const next = clamp(pinch0.current.zoom * (dist / pinch0.current.dist), ZOOM_MIN, ZOOM_MAX);
      zoomRef.current = next;
      didPan.current = true;
      setZoom(next);
      if (next <= ZOOM_MIN + 0.001) panRef.current = { x: 0, y: 0 };
      paint("direct");
      return;
    }
    const drag = drag0.current;
    if (!drag || zoomRef.current <= ZOOM_MIN + 0.001) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!panning.current && Math.hypot(dx, dy) < 8) return;
    if (!panning.current) portRef.current?.setAttribute("data-panning", "");
    panning.current = true;
    didPan.current = true;
    portRef.current?.setPointerCapture(e.pointerId);
    panRef.current = { x: drag.pan.x + dx, y: drag.pan.y + dy };
    paint("direct");
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch0.current = null;
    if (pointers.current.size === 0) {
      drag0.current = null;
      portRef.current?.removeAttribute("data-panning");
      if (zoomRef.current <= ZOOM_MIN + 0.001) panRef.current = { x: 0, y: 0 };
      paint();
    }
  };

  const fit = () => {
    panRef.current = { x: 0, y: 0 };
    setZoomNow(ZOOM_MIN, "glide");
    requestDepthReset();
  };

  // 3D and its camera angle: in the bar on a computer, in the ⋯ menu on a phone (part 96).
  const depthButtons = (
    <>
      {can3d ? (
      <button
        type="button"
        className="ulune-wheel-zoom-btn ulune-wheel-depth-btn"
        data-testid="wheel-depth-3d"
        aria-pressed={depth.view === "3d"}
        aria-label={t("depthView3d")}
        title={t("depthView3dHint")}
        onPointerEnter={preloadView3D}
        // A finger has no hover: the download starts as it touches.
        onPointerDown={preloadView3D}
        onFocus={preloadView3D}
        onClick={() => setDepthPrefs({ view: depth.view === "3d" ? "flat" : "3d" })}
      >
        <Box className="size-4" strokeWidth={1.75} aria-hidden />
        <span aria-hidden>3D</span>
      </button>
      ) : null}
      {/* After 3D, not before it: 3D stays where it was pressed, so a second
          press leaves 3D (the angle button used to slide in under it). */}
      {lens?.angle ? (
        <button
          type="button"
          className="ulune-wheel-zoom-btn ulune-wheel-angle-btn"
          data-testid="wheel-camera-angle"
          data-angle={lens.angle.at}
          aria-label={t("cameraAngle", { angle: t(ANGLE_LABEL[lens.angle.at]), next: t(ANGLE_LABEL[NEXT_ANGLE[lens.angle.at]]) })}
          title={t("cameraAngle", { angle: t(ANGLE_LABEL[lens.angle.at]), next: t(ANGLE_LABEL[NEXT_ANGLE[lens.angle.at]]) })}
          onClick={() => lens.angle?.set(NEXT_ANGLE[lens.angle.at])}
        >
          <AngleIcon at={lens.angle.at} />
        </button>
      ) : null}
    </>
  );
  const zoomed = lens ? lens.zoom > lens.min + 0.001 : zoom > ZOOM_MIN + 0.001;

  const bar = (
    <div
      ref={barElRef}
      className="ulune-wheel-zoom-bar"
      data-testid="wheel-zoom-bar"
      data-zoomed={zoomed ? "" : undefined}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="ulune-wheel-zoom-btn"
        data-testid="wheel-zoom-out"
        aria-label={t("zoomOut")}
        disabled={lens ? lens.zoom <= lens.min + 0.001 : zoom <= ZOOM_MIN + 0.001}
        onClick={() => (lens ? lens.step(-1) : setZoomNow(roundZoom(zoomRef.current - ZOOM_STEP), "glide"))}
      >
        <Minus className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="ulune-wheel-zoom-fit"
        data-testid="wheel-zoom-fit"
        aria-label={t("zoomFit")}
        onClick={fit}
      >
        <span className="ulune-wheel-zoom-fit-label">{t("zoomFit")}</span>
      </button>
      <button
        type="button"
        className="ulune-wheel-zoom-btn"
        data-testid="wheel-zoom-in"
        aria-label={t("zoomIn")}
        disabled={lens ? lens.zoom >= lens.max - 0.001 : zoom >= ZOOM_MAX - 0.001}
        onClick={() => (lens ? lens.step(1) : setZoomNow(roundZoom(zoomRef.current + ZOOM_STEP), "glide"))}
      >
        <Plus className="size-4" strokeWidth={1.75} />
      </button>
      {depthButtons}
      {tools}
    </div>
  );

  const legendEl = legend ? (
    legendAt ? (
      <div
        className="ulune-wheel-legend"
        data-place="side"
        data-names={legendAt.names ? "1" : undefined}
        style={{ left: `${legendAt.x}px`, top: `${legendAt.y}px` }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {legend}
      </div>
    ) : aspectSlot ? (
      createPortal(
        <div className="ulune-wheel-legend" data-place="foot">
          {legend}
        </div>,
        aspectSlot,
      )
    ) : (
      <div className="ulune-wheel-legend" data-place="below">
        {legend}
      </div>
    )
  ) : null;

  return (
    <div ref={outerRef} className="ulune-wheel-zoom" data-testid="wheel-zoom">
      <div
        ref={portRef}
        className="ulune-wheel-zoom-port"
        data-zoom={zoom.toFixed(2)}
        data-lens-zoom={lens ? lens.zoom.toFixed(2) : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={innerRef} className="ulune-wheel-zoom-inner">
          {children}
        </div>
      </div>
      {zoomSlot ? createPortal(bar, zoomSlot) : bar}
      {more.tools && (can3d || tools)
        ? createPortal(
            <div className="ulune-more-tools" data-testid="wheel-more-tools" onClick={(e) => (e.target as HTMLElement).closest("button") && more.close()}>
              {depthButtons}
              {tools}
            </div>,
            more.tools,
          )
        : null}
      {legendEl}
      {aside && asideRoom ? (
        <div ref={asideElRef} className="ulune-wheel-aside" data-testid="wheel-aside" onPointerDown={(e) => e.stopPropagation()}>
          {aside({ ...asideRoom, report: reportAside })}
        </div>
      ) : null}
    </div>
  );
}
