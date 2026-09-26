/** Panel width + open persistence (localStorage only). Two widths, no free drag. */
export const DOCK_W_KEY = "ulune.dock.w";
export const DOCK_OPEN_KEY = "ulune.dock.open";

export type PanelWidth = "normal" | "wide";

/** Old saved widths were pixel snaps; anything ≥ 480 reads as wide. */
export function loadPanelWidth(): PanelWidth {
  if (typeof window === "undefined") return "normal";
  try {
    const raw = window.localStorage.getItem(DOCK_W_KEY);
    if (raw === "wide" || raw === "normal") return raw;
    const n = Number(raw);
    if (raw != null && Number.isFinite(n) && n >= 480) return "wide";
  } catch {
    /* ignore */
  }
  return "normal";
}

export function savePanelWidth(w: PanelWidth) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOCK_W_KEY, w);
  } catch {
    /* quota */
  }
}

export function loadDockOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(DOCK_OPEN_KEY);
    if (raw == null) return true;
    return raw !== "0" && raw !== "false";
  } catch {
    return true;
  }
}

export function saveDockOpen(open: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOCK_OPEN_KEY, open ? "1" : "0");
  } catch {
    /* quota */
  }
}

/** Wide layout breakpoint — the one JS-side media query the shell uses. */
export const WIDE_QUERY = "(min-width: 1024px)";

export function isWide(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(WIDE_QUERY).matches;
}
