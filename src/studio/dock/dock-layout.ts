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

/**
 * Compare's layout (studio/compare; share and compare plan, feature 2) brings the reading up from
 * the bottom on a wide screen too, when two charts and the side panel do not fit side by side.
 */
let sheetOnWide = false;
export function setSheetOnWide(on: boolean): void {
  sheetOnWide = on;
}

/** The panel stands beside the stage (a computer's side panel), not as a sheet from the bottom. */
export function panelBeside(): boolean {
  return !sheetOnWide && isWide();
}
