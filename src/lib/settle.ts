import { prefersReducedMotion } from "@/lib/depth/env";

/**
 * A figure seen before in this visit (a wheel, the numerology wheel, the
 * bodygraph) settles in as one piece instead of building itself again: the
 * arrivals its parts would play are finished at once, and it fades in from a
 * hair smaller. Played with the Web Animations API rather than an attribute
 * lifted afterwards: lifting a CSS animation starts the one under it over, so
 * the wheel and its planets used to pop in a second time once the settle
 * ended, and again after each quick switch. Inside a switch (html[data-vt],
 * lib/swap-transition.ts) the view transition already fades it in: only the
 * arrivals are finished.
 */
export const SETTLE_MS = 420;
const SETTLE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

type CssAnimationLike = Animation & { animationName?: string };

/** Finish the CSS arrivals running in a figure (not endless ones, not its transitions or scripted motion). */
export function finishArrivals(el: Element): void {
  if (typeof el.getAnimations !== "function") return;
  for (const a of el.getAnimations({ subtree: true }) as CssAnimationLike[]) {
    if (typeof a.animationName !== "string") continue;
    const iterations = a.effect?.getTiming().iterations;
    if (iterations === Infinity) continue;
    try {
      a.finish();
    } catch {
      /* an animation that cannot end */
    }
  }
}

/**
 * Settle a figure in. Parts that arrive in the next few frames (the wheel's
 * lines come a commit after its rings) are finished too, for as long as the
 * settle lasts. Returns the way to stop it (the figure leaving, an effect run
 * again).
 */
export function settleIn(el: Element, opts: { scale?: number } = {}): () => void {
  finishArrivals(el);
  let anim: Animation | null = null;
  const reduced = prefersReducedMotion();
  const inSwitch = typeof document !== "undefined" && Boolean(document.documentElement.dataset.vt);
  if (!reduced && !inSwitch && typeof el.animate === "function") {
    const from: Keyframe = { opacity: 0 };
    const to: Keyframe = { opacity: 1 };
    if (opts.scale != null) {
      from.transform = `scale(${opts.scale})`;
      to.transform = "none";
    }
    anim = el.animate([from, to], { duration: SETTLE_MS, easing: SETTLE_EASE });
  }
  if (typeof requestAnimationFrame !== "function") return () => anim?.cancel();
  const start = performance.now();
  let raf = requestAnimationFrame(function again(now) {
    finishArrivals(el);
    if (now - start < SETTLE_MS) raf = requestAnimationFrame(again);
  });
  return () => {
    cancelAnimationFrame(raf);
    anim?.cancel();
  };
}
