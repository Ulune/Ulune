import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { prefersReducedMotion } from "@/lib/depth/env";
import { useI18n } from "@/lib/i18n/locale";
import { useZoomSlot } from "@/studio/stage/stage-slots";

const ZOOM_MIN = 1;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

type Pt = { x: number; y: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const roundZoom = (n: number) => Math.round(n / ZOOM_STEP) * ZOOM_STEP;

/** Does something around the figure scroll? Then a plain mouse wheel scrolls it. */
function wheelScrolls(port: HTMLElement): boolean {
  for (let el = port.parentElement; el; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
  }
  const doc = document.scrollingElement ?? document.documentElement;
  return doc.scrollHeight > doc.clientHeight + 1;
}

/**
 * Zoom for a flat figure (the bodygraph): + and − in the stage footer (the
 * wheel's bar, without its 3D), Ctrl or ⌘ with the mouse wheel, a pinch on a
 * phone; once zoomed, a drag moves the figure. The figure is only scaled and
 * moved as one piece (a transform on its box), so what is clicked is always
 * what is drawn there.
 */
export function FigureZoom({ children, testId }: { children: ReactNode; testId: string }) {
  const { t } = useI18n();
  const zoomSlot = useZoomSlot();
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const zoomRef = useRef(ZOOM_MIN);
  const panRef = useRef<Pt>({ x: 0, y: 0 });
  const portRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Pt>());
  const pinch0 = useRef<{ dist: number; zoom: number } | null>(null);
  const drag0 = useRef<{ x: number; y: number; pan: Pt } | null>(null);
  const panning = useRef(false);
  const didPan = useRef(false);
  const glideTimer = useRef(0);

  /** Keep the figure on screen: it may move at most as far as it grew. */
  const clampPan = useCallback((p: Pt, z: number): Pt => {
    const port = portRef.current;
    if (!port) return p;
    const mx = ((z - 1) * port.clientWidth) / 2;
    const my = ((z - 1) * port.clientHeight) / 2;
    return { x: clamp(p.x, -mx, mx), y: clamp(p.y, -my, my) };
  }, []);

  const paint = useCallback((glide = false) => {
    const el = innerRef.current;
    if (!el) return;
    if (glide && !prefersReducedMotion()) {
      el.style.transition = "transform 360ms var(--chart-ease)";
      window.clearTimeout(glideTimer.current);
      glideTimer.current = window.setTimeout(() => {
        el.style.transition = "";
      }, 420);
    } else {
      el.style.transition = "";
    }
    const z = zoomRef.current;
    const { x, y } = panRef.current;
    el.style.transform = z <= ZOOM_MIN + 0.001 ? "" : `translate3d(${x}px, ${y}px, 0) scale(${z})`;
  }, []);

  const setZoomNow = useCallback(
    (next: number, glide = false) => {
      const z = clamp(next, ZOOM_MIN, ZOOM_MAX);
      zoomRef.current = z;
      panRef.current = z <= ZOOM_MIN + 0.001 ? { x: 0, y: 0 } : clampPan(panRef.current, z);
      setZoom(z);
      paint(glide);
    },
    [clampPan, paint],
  );

  useEffect(() => {
    const el = portRef.current;
    if (!el) return;
    let scrolls: { value: boolean; at: number } | null = null;
    const pageScrolls = () => {
      const now = performance.now();
      if (!scrolls || now - scrolls.at > 1000) scrolls = { value: wheelScrolls(el), at: now };
      return scrolls.value;
    };
    const onWheel = (e: WheelEvent) => {
      const zoomed = zoomRef.current > ZOOM_MIN + 0.001;
      if (!e.ctrlKey && !e.metaKey && !zoomed && pageScrolls()) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight || 600 : 1;
      const dy = clamp(e.deltaY * unit, -240, 240);
      const z = zoomRef.current;
      const next = clamp(z * 2 ** (-dy / (e.ctrlKey ? 110 : 400)), ZOOM_MIN, ZOOM_MAX);
      if (Math.abs(next - z) < 1e-4) return;
      // Around the pointer: what is under it stays under it.
      const r = el.getBoundingClientRect();
      const cx = e.clientX - (r.left + r.width / 2);
      const cy = e.clientY - (r.top + r.height / 2);
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
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [setZoomNow]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch0.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: zoomRef.current };
      drag0.current = null;
      didPan.current = true;
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
      setZoomNow(pinch0.current.zoom * (dist / pinch0.current.dist));
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
    panRef.current = clampPan({ x: drag.pan.x + dx, y: drag.pan.y + dy }, zoomRef.current);
    paint();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch0.current = null;
    if (pointers.current.size === 0) {
      drag0.current = null;
      portRef.current?.removeAttribute("data-panning");
    }
  };

  const bar = (
    <div className="ulune-wheel-zoom-bar" data-testid={`${testId}-bar`} onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="ulune-wheel-zoom-btn"
        data-testid={`${testId}-out`}
        aria-label={t("zoomOut")}
        disabled={zoom <= ZOOM_MIN + 0.001}
        onClick={() => setZoomNow(roundZoom(zoomRef.current - ZOOM_STEP), true)}
      >
        <Minus className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="ulune-wheel-zoom-fit"
        data-testid={`${testId}-fit`}
        aria-label={t("zoomFit")}
        onClick={() => setZoomNow(ZOOM_MIN, true)}
      >
        <span className="ulune-wheel-zoom-fit-label">{t("zoomFit")}</span>
      </button>
      <button
        type="button"
        className="ulune-wheel-zoom-btn"
        data-testid={`${testId}-in`}
        aria-label={t("zoomIn")}
        disabled={zoom >= ZOOM_MAX - 0.001}
        onClick={() => setZoomNow(roundZoom(zoomRef.current + ZOOM_STEP), true)}
      >
        <Plus className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );

  return (
    <div
      ref={portRef}
      className="ulune-figure-zoom"
      data-testid={testId}
      data-zoom={zoom.toFixed(2)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={innerRef} className="ulune-figure-zoom-inner">
        {children}
      </div>
      {zoomSlot ? createPortal(bar, zoomSlot) : bar}
    </div>
  );
}
