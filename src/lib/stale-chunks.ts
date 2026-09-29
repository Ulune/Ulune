/**
 * After a deploy, a page opened before it may ask for code files the new
 * version no longer has. Instead of an error, the page reloads once (the
 * guard is per tab, in sessionStorage) and comes back on the new version,
 * with the charts of an open private space. Charts kept only in this tab
 * would be lost by a reload, so then the page says a new version is out and
 * leaves the reload to the visitor (isStaleVersion). A page that has run a
 * minute since is fine again, so a later deploy may reload it once more.
 * Vercel's Skew Protection, once on, keeps most of these from happening.
 */
import { reportError } from "@/lib/error-report";
import { clearReloadGuard, isChunkLoadError, reloadStaleChunkOnce } from "@/lib/lazy-retry";

export const STALE_RELOAD_KEY = "ulune:stale-reload";

let wouldLoseCharts: () => boolean = () => false;

/** The studio says here whether a reload would lose charts kept only in this tab. */
export function setStaleReloadCheck(fn: () => boolean): void {
  wouldLoseCharts = fn;
}

/** Reload once for a missing code file; false when it isn't one, the reload already happened, or it would lose charts. */
export function recoverFromStaleChunk(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  reportError("chunk", error);
  let lose = false;
  try {
    lose = wouldLoseCharts();
  } catch {
    lose = false;
  }
  if (lose) return false;
  return reloadStaleChunkOnce(STALE_RELOAD_KEY);
}

/** A missing code file while online: the files changed under the page (a new version is out). */
export function isStaleVersion(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

let installed = false;

export function installStaleChunkRecovery(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // Vite's own signal that a code file (or its styles) failed to preload.
  window.addEventListener("vite:preloadError", (event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    if (recoverFromStaleChunk(payload ?? new Error("Failed to fetch dynamically imported module"))) {
      event.preventDefault();
    }
  });
  window.setTimeout(() => clearReloadGuard(STALE_RELOAD_KEY), 60_000);
}
