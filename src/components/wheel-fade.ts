/**
 * The flat wheel's focus fades, run by the compositor (performance plan 2.2).
 *
 * A focus used to fade node by node: every line, tip, glyph and sign of the
 * wheel ran its own opacity transition, hundreds at once, and each frame of
 * them restyled and repainted the whole wheel on the main thread (a busy
 * bi-wheel swept at 10 frames a second). Now the live wheel snaps to the new
 * focus, and a copy of the wheel showing what was on screen fades out over
 * it: one layer's opacity, which the compositor animates on its own.
 *
 * The copy (the "ghost") is the live wheel cloned when the page is idle and
 * painted with the focus the live wheel last showed; it has the page's
 * background under it, so fading it out is an exact cross-fade to the live
 * wheel. What each focus looks like is unchanged: the live wheel is painted as
 * before, only without its per-node transitions (styles.css,
 * `.ulune-wheel[data-fades="layer"]`): a glyph growing into focus, or an
 * aspect's mark popping in, is part of the cross-fade too.
 *
 * Until a ghost is ready (just after the wheel changed, while it rebuilds at
 * idle, never during the wheel's entrance or a theme cross-fade), a new focus
 * shows at once. Reduced motion never fades.
 */
import { cleanClone } from "@/components/depth/relief";
import { whenIdle } from "@/lib/lazy-component";
import {
  cacheWheelPaint,
  paintWheelFocus,
  type WheelFocus,
  type WheelPaintCache,
} from "@/lib/chart/wheel-focus";

/** A focus as painted: what the painter was given. */
export type ShownFocus = { focus: WheelFocus; selected: string | null };

/** How the fades run: the wheel's own chart easing (styles.css `--chart-ease`). */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/**
 * A fade still showing more than this much of the old focus is caught up by
 * the next one (it fades on from where it stands); a fade almost over is let
 * finish at once, and the next fades from what the live wheel shows.
 */
const RETARGET = 0.3;
/** How long the wheel stays unchanged before its ghost is rebuilt (ms). */
const REBUILD_AFTER = 300;

/** Attributes that change what an element draws, as React writes them (never the focus paint). */
const DRAWN = [
  "d",
  "transform",
  "points",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "href",
  "viewBox",
  "fill",
  "stroke",
  "class",
  "font-size",
  "font-family",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "stroke-dasharray",
  "letter-spacing",
  "visibility",
  "display",
];

const ROOT_DROP = [
  "data-depth-base",
  "data-entering",
  "data-gliding",
  "data-focus-fade",
  "data-view3d",
  "data-fades",
  "role",
  "aria-label",
];

export class WheelFade {
  private readonly live: SVGSVGElement;
  private ghost: SVGSVGElement | null = null;
  private cache: WheelPaintCache | null = null;
  /** What the ghost is painted with (null: as cloned, i.e. what the live wheel showed then). */
  private ghostShows: ShownFocus | null = null;
  /** What the live wheel is painted with. */
  private liveShows: ShownFocus | null = null;
  private anim: Animation | null = null;
  /** The ghost's opacity when its animation started, and that animation's length. */
  private from = 1;
  private stopRebuild: () => void = () => {};
  private stopCatchUp: () => void = () => {};
  private rebuildTimer = 0;
  private off = false;

  constructor(live: SVGSVGElement) {
    this.live = live;
    // The live wheel's focus paint snaps from now on: the ghost fades it.
    live.setAttribute("data-fades", "layer");
    this.stale();
  }

  /** The live wheel was re-rendered: the ghost no longer matches it. A new one is made once it rests. */
  stale() {
    if (this.off) return;
    this.dropGhost();
    window.clearTimeout(this.rebuildTimer);
    this.stopRebuild();
    this.rebuildTimer = window.setTimeout(() => {
      this.stopRebuild = whenIdle(() => this.build(), 1500);
    }, REBUILD_AFTER);
  }

  /** The 3D view took over (or reduced motion): no ghost until `resume`. */
  suspend() {
    this.off = true;
    window.clearTimeout(this.rebuildTimer);
    this.stopRebuild();
    this.dropGhost();
  }

  resume() {
    if (!this.off) return;
    this.off = false;
    this.stale();
  }

  /**
   * Watch the live wheel for changes its own re-render did not announce (a
   * glyph re-drawn by itself once its font loads): the ghost is then rebuilt.
   * The focus paint's own attributes are not watched. Returns the stop.
   *
   * The page's theme and Look (classes and custom properties on <html>)
   * restyle every node of the wheel, and every node of the ghost with them:
   * the ghost steps aside as soon as they change, so a theme switch or a Look
   * slider costs what it did without it, and is made again once the page has
   * settled.
   */
  watch(): () => void {
    if (typeof MutationObserver === "undefined") return () => {};
    // The focus paint's own drawing is not a change of the wheel: the lit
    // copies and marks it makes ([data-painted]), and a tapered end re-cut
    // for a lit line's width.
    const paint = (r: MutationRecord) => {
      const t = r.target as Element;
      if (r.type === "attributes" && r.attributeName === "d" && t.hasAttribute("data-aspect-tip")) return true;
      const host = t.nodeType === Node.ELEMENT_NODE ? t : t.parentElement;
      return Boolean(host?.closest("[data-painted]"));
    };
    const mo = new MutationObserver((records) => {
      if (records.some((r) => !paint(r))) this.stale();
    });
    mo.observe(this.live, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: DRAWN });
    const page = new MutationObserver(() => this.stale());
    page.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      mo.disconnect();
      page.disconnect();
    };
  }

  destroy() {
    this.suspend();
    this.live.removeAttribute("data-fades");
  }

  /**
   * About to paint the live wheel with `next` (every paint comes through
   * here): set the ghost to show what is on screen now, over the live wheel.
   * Returns whether a fade will run (then call `run` after the paint); false
   * (or `allowed` false: 3D, reduced motion) paints the live wheel as is.
   */
  begin(next: ShownFocus, allowed = true): boolean {
    const shown = this.liveShows;
    this.liveShows = next;
    const ghost = this.ghost;
    if (!allowed || !ghost || !this.cache || this.off || !shown) {
      if (this.anim) this.dropGhost();
      return false;
    }
    if (shown.focus === next.focus && shown.selected === next.selected) return false;
    if (this.live.hasAttribute("data-entering")) return false;
    this.stopCatchUp();
    const w = this.weight();
    if (this.anim && w >= RETARGET) {
      // Mid-fade: the ghost keeps the older focus and fades on from here.
      this.anim.cancel();
      this.anim = null;
      this.from = w;
      ghost.style.opacity = String(w);
      return true;
    }
    if (this.anim) {
      this.anim.cancel();
      this.anim = null;
    }
    // The ghost takes what the live wheel shows now, and covers it.
    if (!this.ghostMatches(shown)) {
      paintWheelFocus(ghost, this.cache, shown.focus, shown.selected);
      this.ghostShows = shown;
    }
    this.from = 1;
    ghost.style.opacity = "1";
    return true;
  }

  /** After the live wheel's paint: the ghost fades out over `ms`. */
  run(ms: number) {
    const ghost = this.ghost;
    if (!ghost) return;
    const a = ghost.animate([{ opacity: this.from }, { opacity: 0 }], { duration: ms, easing: EASE, fill: "forwards" });
    this.anim = a;
    a.onfinish = () => {
      if (this.anim !== a) return;
      this.anim = null;
      ghost.style.opacity = "0";
      a.cancel();
      // Ready for the next focus: the ghost takes the live wheel's paint while the page rests.
      this.stopCatchUp = whenIdle(() => this.catchUp(), 400);
    };
  }

  /** The ghost's share of the picture now (1 − the fade's progress), from its own animation: no style read. */
  private weight(): number {
    const a = this.anim;
    if (!a) return Number.parseFloat(this.ghost?.style.opacity ?? "0") || 0;
    const p = a.effect?.getComputedTiming().progress;
    if (p == null) return 0;
    return Math.max(0, Math.min(1, this.from * (1 - p)));
  }

  private ghostMatches(s: ShownFocus): boolean {
    const g = this.ghostShows;
    return Boolean(g && g.focus === s.focus && g.selected === s.selected);
  }

  private catchUp() {
    const s = this.liveShows;
    if (!this.ghost || !this.cache || this.anim || !s || this.ghostMatches(s)) return;
    paintWheelFocus(this.ghost, this.cache, s.focus, s.selected);
    this.ghostShows = s;
  }

  private build() {
    if (this.off || !this.live.isConnected) return;
    // Not while the wheel makes its entrance (a task that size would drop its
    // frames), nor while the theme cross-fades (theme.tsx: its end restyles
    // the page again).
    if (this.live.hasAttribute("data-entering") || document.documentElement.classList.contains("theme-switching")) {
      this.stale();
      return;
    }
    this.dropGhost();
    const ghost = cleanClone(this.live) as SVGSVGElement;
    for (const a of ROOT_DROP) ghost.removeAttribute(a);
    ghost.classList.add("ulune-wheel-ghost");
    ghost.setAttribute("aria-hidden", "true");
    ghost.setAttribute("inert", "");
    ghost.style.cursor = "";
    ghost.style.opacity = "0";
    this.live.after(ghost);
    this.ghost = ghost;
    this.cache = cacheWheelPaint(ghost);
    // A clone carries the live wheel's paint as it stands.
    this.ghostShows = this.liveShows;
  }

  private dropGhost() {
    this.stopCatchUp();
    this.anim?.cancel();
    this.anim = null;
    this.ghost?.remove();
    this.ghost = null;
    this.cache = null;
    this.ghostShows = null;
  }
}
