/**
 * A quick tap's press, shown (the motion plan). On a touch screen a fast tap
 * often never shows `:active` (iOS applies it late or not at all), so the
 * control under the finger carries `data-pressed` from the touch until the
 * finger lifts, and for at least PRESS_MIN_MS, the shortest press the eye
 * reads. shell.css draws `[data-pressed]` as it draws `:active`.
 */
const PRESS_MIN_MS = 90;
const PRESSABLE = "button, [role='tab'], a[href], summary, label";

let installed = false;

export function installPressFeedback() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  let el: Element | null = null;
  let at = 0;
  let timer = 0;
  const release = () => {
    const target = el;
    el = null;
    if (!target) return;
    const wait = Math.max(0, PRESS_MIN_MS - (performance.now() - at));
    window.clearTimeout(timer);
    timer = window.setTimeout(() => target.removeAttribute("data-pressed"), wait);
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      const target = e.target instanceof Element ? e.target.closest(PRESSABLE) : null;
      if (!target || target.matches(":disabled, [aria-disabled='true']")) return;
      if (el && el !== target) el.removeAttribute("data-pressed");
      window.clearTimeout(timer);
      el = target;
      at = performance.now();
      target.setAttribute("data-pressed", "");
    },
    { passive: true, capture: true },
  );
  // A scroll that starts on a control is not a press of it.
  document.addEventListener("pointercancel", release, { passive: true, capture: true });
  document.addEventListener("pointerup", release, { passive: true, capture: true });
}
