/**
 * Depth controller: the pop-out of what you point at, and the camera of the
 * 3D view.
 *
 * A flat chart stays flat and still: nothing tilts, drifts or moves under the
 * pointer. What is in focus stands out of it as low solid pieces (relief.ts):
 * the tops are copies exactly where the figure drew them, their sides come out
 * from under them toward the viewer and shadows fall on what they stand on —
 * ranked, so the focus stands highest and what it touches less. The rise runs
 * on the compositor (transforms and opacity only), so it stays smooth while
 * the page is busy — Safari included. A focus that changes mode (hover → pin)
 * grows from where it stands. Only the explicit 3D view turns on the camera
 * and the frame loop.
 *
 *   .ulune-depth            the scene
 *   ├ .ulune-depth-stack    the figure's box
 *   │ ├ base <svg>          the figure itself, untouched
 *   │ └ .ulune-relief       (2D) a lifted focus: shadows, sides, tops
 *   └ canvas.ulune-depth-gl (3D view) the chart as a solid, drawn with WebGL
 *
 * The camera (tilt, turn, perspective, fit, and the WebGL view's lens: zoom
 * and pan) lives here: the WebGL view draws with it and the pointer is mapped
 * back through it (unproject). A
 * figure can also be turned with CSS (cssCamera), but the wheel draws its 3D
 * in WebGL and keeps its stack flat, so the live chart underneath still takes
 * the pointer everywhere on the stage.
 */
import { fitScale, planeMatrix, stackTransformCss, unprojectPoint, type SceneState } from "@/lib/depth/math";
import { SPRINGS, aim, isAtRest, makeSpring, settle, stepSpring, type SpringParams } from "@/lib/depth/spring";
import { ReliefSlot, type ReliefFrame, type ReliefRequest } from "./relief";

export { cleanClone } from "./relief";
export type { LiftMode, ReliefItem, ReliefRequest, ReliefShape, Tier } from "./relief";

export type DepthAdapter = {
  /** Classes for the copies' SVGs so the figure's CSS styles them. */
  planeClass: string;
  /** Multiplies every height (a small figure needs more to read as depth). */
  heightScale?: number;
  /** Dim the figure under a lift (for figures without their own focus paint). */
  dimBase?: boolean;
};

/** Heights are given in px on a figure this wide (they scale with the figure). */
const REFERENCE_PX = 700;
/** Perspective as a multiple of the figure's width (3D view only). */
const PERSPECTIVE_K = 1.6;
/** How far the 3D view's lens zooms in (1 = the chart fits the stage). */
export const LENS_MIN = 1;
export const LENS_MAX = 3;
/** Lens steps per doubling (the zoom buttons). */
const LENS_STEPS_PER_2X = 3;
/** Frames slower than this count toward the lite-mode watchdog. */
const SLOW_FRAME_MS = 40;
const SLOW_FRAMES_TO_LITE = 20;

export type DepthOptions = {
  reducedMotion: () => boolean;
  /** Turn the stack with CSS when the camera is on (false: a WebGL view draws the 3D). */
  cssCamera?: boolean;
};

export class DepthController {
  readonly scene: HTMLElement;
  readonly stack: HTMLElement;
  private adapter: DepthAdapter;
  private opts: DepthOptions;
  private base: SVGSVGElement | null = null;
  /** The pinned or hovered focus, and a lower panel preview beside it. */
  private active: ReliefSlot | null = null;
  private aux: ReliefSlot | null = null;
  /** Slots letting go (they sink, then remove themselves). */
  private sinking = new Set<ReliefSlot>();
  private hideCount = new Map<Element, number>();
  private resizeObs: ResizeObserver | null = null;
  /**
   * Layout sizes of the base SVG and the scene, kept by the ResizeObserver.
   * Read live, they forced a full layout right after a focus was painted
   * (62 ms on a busy bi-wheel pin).
   */
  private baseSize: { w: number; h: number } | null = null;
  private sceneSize: { w: number; h: number } | null = null;
  private rx = makeSpring(0, SPRINGS.view);
  private rz = makeSpring(0, SPRINGS.view);
  /** Extra work driven by the same loop (the 3D view). */
  private extras = new Set<(now: number, dt: number) => boolean>();
  /** Last camera styles written (unchanged frames write nothing). */
  private lastTransform = "";
  private lastPerspective = "";
  private raf = 0;
  private last = 0;
  private slow = 0;
  private cameraOn = false;
  lite = false;
  /** The 3D view's camera; null keeps the chart flat. */
  private camera: { rx: number; rz: number } | null = null;
  private rxMin = 0;
  private rxMax = 90;
  /**
   * The WebGL view's lens: 100·ln(zoom) on a spring, and its pan (scene px).
   * While it zooms, the pan follows an anchor: the point under the pointer
   * (or the middle of the view) stays where it is.
   */
  private lens = makeSpring(0, SPRINGS.lens);
  private pan = { x: 0, y: 0 };
  private anchor: { cx: number; cy: number; sx: number; sy: number } | null = null;
  private lensSubs = new Set<(zoom: number) => void>();

  constructor(scene: HTMLElement, stack: HTMLElement, adapter: DepthAdapter, opts: DepthOptions) {
    this.scene = scene;
    this.stack = stack;
    this.adapter = adapter;
    this.opts = opts;
  }

  // ─── base ─────────────────────────────────────────────────────────────

  /** Attach (or re-attach after a remount) the base SVG. */
  setBase(svg: SVGSVGElement | null) {
    if (svg === this.base) {
      this.syncViewBox();
      return;
    }
    this.clearAll();
    this.resizeObs?.disconnect();
    this.base = svg;
    this.baseSize = null;
    if (!svg) return;
    svg.setAttribute("data-depth-base", "");
    if (typeof ResizeObserver !== "undefined") {
      // A lifted focus is placed in px: follow the figure when it changes size.
      this.resizeObs ??= new ResizeObserver(() => this.measure());
      this.resizeObs.observe(svg);
      this.resizeObs.observe(this.scene);
    }
  }

  /** The ResizeObserver's turn (layout is fresh there): keep the sizes, re-place the pieces. */
  private measure() {
    const base = this.base;
    this.baseSize = base ? { w: base.clientWidth, h: base.clientHeight } : null;
    this.sceneSize = { w: this.scene.clientWidth, h: this.scene.clientHeight };
    this.syncViewBox();
  }

  private sceneW(): number {
    return this.sceneSize?.w ?? this.scene.clientWidth;
  }

  private sceneH(): number {
    return this.sceneSize?.h ?? this.scene.clientHeight;
  }

  getBase() {
    return this.base;
  }

  /** The figure's box or viewBox changed: place the lifted pieces again. */
  syncViewBox() {
    const f = this.frame();
    if (!f) return;
    for (const s of this.slots()) s.place(f);
  }

  private slots(): ReliefSlot[] {
    return [...(this.active ? [this.active] : []), ...(this.aux ? [this.aux] : []), ...this.sinking];
  }

  /** How chart units map to px in the stack: the base SVG's own mapping (viewBox, meet). */
  private frame(): ReliefFrame | null {
    const base = this.base;
    const vbv = base?.viewBox.baseVal;
    if (!base || !vbv || !vbv.width) return null;
    const size = this.baseSize ?? { w: base.clientWidth, h: base.clientHeight };
    const w = size.w || this.sceneW();
    const h = size.h || w;
    if (!w) return null;
    const k = Math.min(w / vbv.width, h / vbv.height);
    return { k, ox: (w - vbv.width * k) / 2, oy: (h - vbv.height * k) / 2, vb: { x: vbv.x, y: vbv.y, w: vbv.width, h: vbv.height } };
  }

  // ─── geometry ─────────────────────────────────────────────────────────

  size(): number {
    return this.sceneW() || 1;
  }

  perspectivePx(): number {
    return Math.max(320, this.size() * PERSPECTIVE_K);
  }

  sceneState(): SceneState {
    const w = this.sceneW() || 1;
    const h = this.sceneH() || w;
    return {
      width: w,
      height: h,
      perspective: this.perspectivePx(),
      originX: w / 2,
      originY: h / 2,
      rx: this.rx.x,
      ry: 0,
      rz: this.rz.x,
      // The tipped chart shrinks a little so it and its planets stay on stage.
      scale: fitScale(this.rx.x),
      zoom: this.zoomNow(),
      panX: this.pan.x,
      panY: this.pan.y,
    };
  }

  /** True when the camera is level: the plain 2D pointer mapping is exact. */
  isFlat(): boolean {
    return Math.abs(this.rx.x) < 0.01 && Math.abs(this.rz.x) < 0.01;
  }

  /** The chart point (viewBox units) under a client point, on the plane at height z. */
  unproject(clientX: number, clientY: number, z = 0): { x: number; y: number; unitsPerPx: number } | null {
    const base = this.base;
    const vb = base?.viewBox.baseVal;
    if (!base || !vb || !vb.width) return null;
    const rect = this.scene.getBoundingClientRect();
    const w = this.sceneW() || 1;
    if (rect.width < 1) return null;
    const f = rect.width / w;
    const sx = (clientX - rect.left) / f;
    const sy = (clientY - rect.top) / f;
    const st = this.sceneState();
    const m = planeMatrix(st, { z, scale: 1, originX: 0, originY: 0 });
    const p = unprojectPoint(m, sx, sy);
    if (!p) return null;
    // The SVG's own mapping (viewBox, centred): the same frame the 3D view
    // places its layers and sprites in.
    const bw = (this.baseSize?.w ?? base.clientWidth) || w;
    const bh = (this.baseSize?.h ?? base.clientHeight) || bw;
    const k = Math.min(bw / vb.width, bh / vb.height);
    const ox = (bw - vb.width * k) / 2;
    const oy = (bh - vb.height * k) / 2;
    return { x: vb.x + (p.x - ox) / k, y: vb.y + (p.y - oy) / k, unitsPerPx: 1 / (k * f) };
  }

  // ─── lifting ──────────────────────────────────────────────────────────

  activeKey(): string | null {
    return this.active?.req?.key ?? null;
  }

  /** A height in px on the reference figure, in chart units. */
  private unitsOf = (zPx: number): number => {
    const vb = this.base?.viewBox.baseVal;
    const w = vb && vb.width ? vb.width : REFERENCE_PX;
    return zPx * (w / REFERENCE_PX) * (this.adapter.heightScale ?? 1);
  };

  private newSlot(req: ReliefRequest): ReliefSlot | null {
    const f = this.frame();
    if (!f) return null;
    const t0 = performance.now();
    const slot = new ReliefSlot(this.stack, this.adapter.planeClass);
    slot.place(f);
    slot.build(req, this.unitsOf, (el) => this.hide(el));
    this.noteBuild(t0);
    return slot;
  }

  /** How long the last relief took to build, ms (on the scene, for QA). */
  private noteBuild(t0: number) {
    this.scene.dataset.reliefMs = (performance.now() - t0).toFixed(1);
  }

  /** Let a slot go: the originals come back under it while its pieces sink and fade. */
  private sinkSlot(slot: ReliefSlot) {
    for (const el of slot.hidden) this.unhide(el);
    slot.hidden = [];
    this.sinking.add(slot);
    slot.sink(this.opts.reducedMotion(), () => this.sinking.delete(slot));
  }

  private dropSlot(slot: ReliefSlot) {
    for (const el of slot.hidden) this.unhide(el);
    slot.hidden = [];
    slot.clear();
    slot.root.remove();
  }

  /** Lift a new focus (or let go with null). */
  lift(req: ReliefRequest | null) {
    if (!this.base) return;
    const reduced = this.opts.reducedMotion();
    if (!req || !req.items.length) {
      if (this.active) this.sinkSlot(this.active);
      this.active = null;
      this.syncDim();
      return;
    }
    const cur = this.active;
    if (cur?.req?.key === req.key) {
      if (cur.req.mode !== req.mode) {
        this.retarget(cur, req);
        this.syncDim();
      }
      return;
    }
    if (cur) this.sinkSlot(cur);
    const slot = this.newSlot(req);
    this.active = slot;
    slot?.rise("rise", reduced);
    this.syncDim();
  }

  /** A second, lower lift for a panel preview while something is pinned. */
  preview(req: ReliefRequest | null) {
    if (!this.base) return;
    if (!req || !req.items.length) {
      if (this.aux) this.sinkSlot(this.aux);
      this.aux = null;
      return;
    }
    if (this.aux?.req?.key === req.key) return;
    if (this.aux) this.sinkSlot(this.aux);
    const slot = this.newSlot(req);
    this.aux = slot;
    slot?.rise("rise", this.opts.reducedMotion());
  }

  /**
   * The DOM of the base changed (re-render): take the copies again. The same
   * focus stays up, and a rise under way carries on from where it is.
   */
  refresh(req: ReliefRequest | null) {
    if (!this.active) {
      if (req) this.lift(req);
      return;
    }
    if (!req || !req.items.length || this.active.req?.key !== req.key) {
      this.lift(req);
      return;
    }
    this.retarget(this.active, req);
    this.syncDim();
  }

  /**
   * The same focus with other pieces or heights (a change of mode, a redraw):
   * every piece grows or shrinks from where it stands now, new pieces rise,
   * pieces no longer wanted sink.
   */
  private retarget(cur: ReliefSlot, req: ReliefRequest) {
    const reduced = this.opts.reducedMotion();
    const heights = cur.heightsNow();
    const prev = cur.req;
    const keep = new Set(req.items.map((it) => it.key));
    const gone = prev ? prev.items.filter((it) => !keep.has(it.key)) : [];
    if (prev && gone.length) {
      const f = this.frame();
      if (f) {
        // They sink from where they stand, under the pieces that stay.
        const ghost = new ReliefSlot(this.stack, this.adapter.planeClass, cur.root);
        ghost.place(f);
        ghost.build({ key: `${prev.key}~`, mode: prev.mode, items: gone }, this.unitsOf, (el) => this.hide(el), undefined, heights);
        this.sinkSlot(ghost);
      }
    }
    this.rebuild(cur, req, heights);
    cur.rise("rise", reduced);
  }

  private rebuild(slot: ReliefSlot, req: ReliefRequest, from?: Map<string, number>) {
    const t0 = performance.now();
    for (const el of slot.hidden) this.unhide(el);
    slot.hidden = [];
    const f = this.frame();
    if (f) slot.place(f);
    slot.build(req, this.unitsOf, (el) => this.hide(el), from);
    this.noteBuild(t0);
  }

  private hide(el: Element) {
    const n = this.hideCount.get(el) ?? 0;
    this.hideCount.set(el, n + 1);
    if (n === 0) el.setAttribute("data-depth-hidden", "1");
  }

  private unhide(el: Element) {
    const n = this.hideCount.get(el) ?? 0;
    if (n <= 1) {
      this.hideCount.delete(el);
      el.removeAttribute("data-depth-hidden");
    } else {
      this.hideCount.set(el, n - 1);
    }
  }

  private clearAll() {
    for (const s of this.slots()) this.dropSlot(s);
    this.active = null;
    this.aux = null;
    this.sinking.clear();
    for (const el of this.hideCount.keys()) el.removeAttribute("data-depth-hidden");
    this.hideCount.clear();
    this.syncDim();
  }

  private syncDim() {
    if (!this.adapter.dimBase) return;
    const on = Boolean(this.active?.req && this.active.req.mode !== "preview");
    if (on) this.scene.setAttribute("data-lifting", "");
    else this.scene.removeAttribute("data-lifting");
  }

  // ─── 3D camera ────────────────────────────────────────────────────────

  // ─── 3D lens ──────────────────────────────────────────────────────────

  /** Does this figure's 3D view have a lens (the WebGL view; the CSS camera has none)? */
  private hasLens(): boolean {
    return this.opts.cssCamera === false;
  }

  /** The lens zoom now (1 when there is none). */
  private zoomNow(): number {
    return this.hasLens() ? Math.exp(this.lens.x / 100) : 1;
  }

  /** Where the lens is going (what the zoom buttons show). */
  lensZoom(): number {
    return this.hasLens() ? Math.exp(this.lens.target / 100) : 1;
  }

  /** Follow the lens's zoom (its target), e.g. for the zoom buttons. */
  onLens(fn: (zoom: number) => void): () => void {
    this.lensSubs.add(fn);
    return () => {
      this.lensSubs.delete(fn);
    };
  }

  private emitLens() {
    const z = this.lensZoom();
    for (const fn of this.lensSubs) fn(z);
  }

  /** Zoom the 3D view by a factor around a client point (the wheel, a pinch), or the middle of the view. */
  zoomLens(factor: number, at?: { x: number; y: number } | null, params: SpringParams = SPRINGS.lens) {
    if (!this.camera || !this.hasLens() || !Number.isFinite(factor) || factor <= 0) return;
    this.lensTo(this.lensZoom() * factor, at ?? null, params);
  }

  /** One step in or out (the zoom buttons), around the middle of the view. */
  stepLens(dir: 1 | -1) {
    if (!this.camera || !this.hasLens()) return;
    const n = Math.round(LENS_STEPS_PER_2X * Math.log2(this.lensZoom())) + dir;
    this.lensTo(2 ** (n / LENS_STEPS_PER_2X), null, SPRINGS.view);
  }

  private lensTo(goal: number, at: { x: number; y: number } | null, params: SpringParams) {
    const z = this.zoomNow();
    const target = Math.max(LENS_MIN, Math.min(LENS_MAX, goal));
    const c = at ? this.fromOrigin(at) : { x: 0, y: 0 };
    // The unzoomed point now under c stays under c while the lens moves.
    this.anchor = { cx: c.x, cy: c.y, sx: (c.x - this.pan.x) / z, sy: (c.y - this.pan.y) / z };
    if (this.opts.reducedMotion()) settle(this.lens, 100 * Math.log(target));
    else aim(this.lens, 100 * Math.log(target), params);
    this.followAnchor();
    this.emitLens();
    this.kick();
  }

  /** Move the zoomed view by a drag (client px). */
  panLens(dx: number, dy: number) {
    if (!this.camera || !this.hasLens()) return;
    const f = this.cssScale();
    this.anchor = null;
    this.pan = this.clampPan(this.pan.x + dx / f, this.pan.y + dy / f, this.zoomNow());
    this.kick();
  }

  /** Back to the whole chart: the zoom and the pan reach 1 and 0 together. */
  resetLens(params: SpringParams = SPRINGS.view) {
    const z = this.zoomNow();
    if (Math.abs(z - 1) < 1e-4) {
      this.anchor = null;
      this.pan = { x: 0, y: 0 };
      settle(this.lens, 0);
    } else {
      // pan = c·(1 − zoom): c is the point that stays put on the way out.
      const cx = this.pan.x / (1 - z);
      const cy = this.pan.y / (1 - z);
      this.anchor = { cx, cy, sx: cx, sy: cy };
      if (this.opts.reducedMotion()) settle(this.lens, 0);
      else aim(this.lens, 0, params);
      this.followAnchor();
    }
    this.emitLens();
    this.kick();
  }

  private followAnchor() {
    const a = this.anchor;
    if (!a) return;
    const z = this.zoomNow();
    this.pan = this.clampPan(a.cx - a.sx * z, a.cy - a.sy * z, z);
  }

  /** The zoomed picture always covers the stage: no pan past its edges. */
  private clampPan(x: number, y: number, z: number): { x: number; y: number } {
    const w = this.sceneW() || 1;
    const h = this.sceneH() || w;
    const mx = (Math.max(0, z - 1) * w) / 2;
    const my = (Math.max(0, z - 1) * h) / 2;
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  }

  /** How much the page scales the scene (a zoomed stage): client px per scene px. */
  private cssScale(): number {
    const w = this.sceneW() || 1;
    const r = this.scene.getBoundingClientRect().width;
    return r > 0 ? r / w : 1;
  }

  /** A client point in scene px from the lens origin (the middle of the scene). */
  private fromOrigin(p: { x: number; y: number }): { x: number; y: number } {
    const rect = this.scene.getBoundingClientRect();
    const f = this.cssScale();
    const w = this.sceneW() || 1;
    const h = this.sceneH() || w;
    return { x: (p.x - rect.left) / f - w / 2, y: (p.y - rect.top) / f - h / 2 };
  }

  /** The 3D view's camera (null lays the chart flat again). */
  setCamera(cam: { rx: number; rz: number } | null, params: SpringParams = SPRINGS.view) {
    const rx = cam?.rx ?? 0;
    // Turn the shortest way round: after orbiting a few times, leaving 3D or
    // resetting must not unwind every turn (a whole turn looks the same).
    const want = cam?.rz ?? 0;
    const rz = want + 360 * Math.round((this.rz.x - want) / 360);
    this.camera = cam ? { rx, rz } : null;
    if (this.opts.reducedMotion()) {
      settle(this.rx, rx);
      settle(this.rz, rz);
    } else {
      aim(this.rx, rx, params);
      aim(this.rz, rz, params);
    }
    // Leaving the 3D view: the lens comes back out with it.
    if (!cam) this.resetLens(params);
    this.kick();
  }

  /** Drag-orbit: move the camera without springing (it follows the finger). */
  dragCamera(rx: number, rz: number) {
    if (!this.camera) return;
    this.camera = { rx, rz };
    settle(this.rx, rx);
    settle(this.rz, rz);
    this.kick();
  }

  getCamera() {
    return this.camera;
  }

  /**
   * An orbit drag was let go while moving: the camera glides on from the
   * drag's speed (deg/s) and eases to a stop, as if the chart had weight.
   */
  glideCamera(vrx: number, vrz: number) {
    if (!this.camera || this.opts.reducedMotion()) return;
    // A critically damped spring launched at v comes to rest v·2/ω further on.
    const w = Math.sqrt(SPRINGS.glide.k);
    const rx = Math.max(this.rxMin, Math.min(this.rxMax, this.rx.x + (vrx * 2) / w));
    const rz = this.rz.x + (vrz * 2) / w;
    this.camera = { rx, rz };
    aim(this.rx, rx, SPRINGS.glide);
    aim(this.rz, rz, SPRINGS.glide);
    this.rx.v = vrx;
    this.rz.v = vrz;
    this.kick();
  }

  /** The camera's tilt range (the glide never tips past it). */
  setTiltRange(min: number, max: number) {
    this.rxMin = min;
    this.rxMax = max;
  }

  // ─── frame loop ───────────────────────────────────────────────────────

  addExtra(fn: (now: number, dt: number) => boolean): () => void {
    this.extras.add(fn);
    this.kick();
    return () => {
      this.extras.delete(fn);
    };
  }

  kick() {
    if (this.raf || typeof window === "undefined") return;
    this.last = performance.now();
    this.raf = window.requestAnimationFrame(this.tick);
    this.stack.classList.add("is-moving");
  }

  private tick = (now: number) => {
    this.raf = 0;
    const t0 = performance.now();
    const dtMs = now - this.last;
    this.last = now;
    if (dtMs > SLOW_FRAME_MS && !document.hidden) {
      this.slow += 1;
      const noLite = (window as unknown as { __uluneDepthNoLite?: boolean }).__uluneDepthNoLite;
      if (this.slow >= SLOW_FRAMES_TO_LITE && !this.lite && !noLite) this.enterLite();
    } else {
      this.slow = 0;
    }
    const dt = dtMs / 1000;
    let busy = false;
    busy = stepSpring(this.rx, dt, now) || busy;
    busy = stepSpring(this.rz, dt, now) || busy;
    busy = stepSpring(this.lens, dt, now) || busy;
    if (this.anchor) {
      this.followAnchor();
      if (isAtRest(this.lens)) this.anchor = null;
    }
    // Back flat after orbiting: a whole number of turns is no turn at all.
    if (!this.camera && this.rz.target !== 0 && isAtRest(this.rz)) settle(this.rz, 0);
    // Flat again: no lens left over.
    if (!this.camera && this.isFlat() && (this.lens.x !== 0 || this.pan.x || this.pan.y)) {
      settle(this.lens, 0);
      this.pan = { x: 0, y: 0 };
      this.anchor = null;
    }
    for (const fn of this.extras) busy = fn(now, dt) || busy;
    this.apply();
    // Opt-in frame-cost probe for QA (window.__uluneDepthProfile = []).
    const probe = (window as unknown as { __uluneDepthProfile?: number[] }).__uluneDepthProfile;
    if (probe) probe.push(performance.now() - t0);
    if (busy) {
      this.raf = window.requestAnimationFrame(this.tick);
    } else {
      this.stack.classList.remove("is-moving");
    }
  };

  private enterLite() {
    this.lite = true;
    this.scene.setAttribute("data-depth-lite", "1");
  }

  /** Write the current spring values to the DOM. */
  apply() {
    // The perspective camera exists only while the 3D view is on (or easing
    // out): a flat chart is plain 2D, crisp and exactly where it is drawn.
    const cam = this.camera !== null || !this.isFlat();
    if (cam !== this.cameraOn) {
      this.cameraOn = cam;
      if (cam) {
        this.scene.setAttribute("data-depth-camera", "");
      } else {
        this.scene.removeAttribute("data-depth-camera");
        this.scene.style.perspective = "";
        this.scene.style.perspectiveOrigin = "";
        this.stack.style.transform = "";
        this.lastPerspective = "";
        this.lastTransform = "";
      }
    }
    if (cam && this.opts.cssCamera !== false) {
      const st = this.sceneState();
      const perspective = `${st.perspective.toFixed(1)}px`;
      if (perspective !== this.lastPerspective) {
        this.lastPerspective = perspective;
        this.scene.style.perspective = perspective;
        this.scene.style.perspectiveOrigin = "50% 50%";
      }
      const transform = stackTransformCss(st);
      if (transform !== this.lastTransform) {
        this.lastTransform = transform;
        this.stack.style.transform = transform;
      }
    }
  }

  destroy() {
    if (this.raf) window.cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lensSubs.clear();
    this.clearAll();
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    this.baseSize = null;
    this.sceneSize = null;
    this.extras.clear();
    this.base?.removeAttribute("data-depth-base");
    this.scene.removeAttribute("data-depth-camera");
    this.scene.removeAttribute("data-lifting");
    this.scene.style.perspective = "";
    this.scene.style.perspectiveOrigin = "";
    this.stack.style.transform = "";
  }
}
