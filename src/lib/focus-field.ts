/**
 * Put the cursor in a form field that may not be drawn yet (a panel tab just
 * asked for) or may sit in a closed part of the form (numerology's names):
 * wait a few frames for it, open the part that holds it, focus it and bring
 * it into view.
 */
export function focusField(id: string, frames = 12) {
  if (typeof window === "undefined") return;
  const go = (left: number) => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLElement)) {
      if (left > 0) window.requestAnimationFrame(() => go(left - 1));
      return;
    }
    const part = el.closest("details");
    if (part && !part.open) part.open = true;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  window.requestAnimationFrame(() => go(frames));
}
