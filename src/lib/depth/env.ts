/** What the device can do: reduced motion, a real hover pointer. */

function media(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return media("(prefers-reduced-motion: reduce)");
}

/** A mouse or trackpad: hover exists, so the chart may lean toward the pointer. */
export function hasFinePointer(): boolean {
  return media("(hover: hover) and (pointer: fine)");
}

export function onReducedMotionChange(fn: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}
