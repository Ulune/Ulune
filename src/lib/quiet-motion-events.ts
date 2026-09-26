/**
 * Transition and animation events from the charts go nowhere: nothing in the
 * app listens to them, but React listens to every event type at its root and
 * walks its tree for each one. A hover restarts hundreds of per-node fades on
 * the wheel (7,000+ events in one sweep over a busy bi-wheel), so they are
 * stopped at the window, before React sees them. Only chart pieces are
 * stopped: other components (a dialog waiting for its exit animation) keep
 * theirs.
 */
const TYPES = [
  "transitionrun",
  "transitionstart",
  "transitionend",
  "transitioncancel",
  "animationstart",
  "animationend",
  "animationiteration",
  "animationcancel",
] as const;

const CHART = ".ulune-wheel, .ulune-relief, .ulune-hd-svg";

let installed = false;

export function quietChartMotionEvents() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const stop = (e: Event) => {
    const target = e.target;
    if (target instanceof Element && target.closest(CHART)) e.stopImmediatePropagation();
  };
  for (const type of TYPES) window.addEventListener(type, stop, { capture: true, passive: true });
}
