/**
 * The Ulune tooltip: what an aspect line says when the pointer rests on it
 * (its bodies and type, orb, closing or opening). One element for the whole
 * page, made on first use and moved with the pointer; it reads no layout, so
 * showing it never makes the browser measure the wheel. (Each line used to
 * carry its own hit line and native <title>: two more nodes per aspect.)
 */
let el: HTMLDivElement | null = null;

function tipEl(): HTMLDivElement {
  if (!el || !el.isConnected) {
    el = document.createElement("div");
    el.className = "ulune-wheel-tip";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

/** Show `text` by the point (x, y) in the viewport: below right, or on the side with room. */
export function showWheelTip(text: string, x: number, y: number) {
  if (typeof document === "undefined") return;
  const tip = tipEl();
  if (tip.textContent !== text) tip.textContent = text;
  tip.style.setProperty("--tip-x", `${Math.round(x)}px`);
  tip.style.setProperty("--tip-y", `${Math.round(y)}px`);
  const side = x > window.innerWidth * 0.62 ? "left" : "right";
  const v = y > window.innerHeight - 72 ? "up" : "down";
  if (tip.dataset.side !== side) tip.dataset.side = side;
  if (tip.dataset.v !== v) tip.dataset.v = v;
  if (!tip.hasAttribute("data-show")) tip.setAttribute("data-show", "");
}

export function hideWheelTip() {
  if (el?.hasAttribute("data-show")) el.removeAttribute("data-show");
}
