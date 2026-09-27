/**
 * After a deploy, a page opened before it may ask for code files the new
 * version no longer has. Instead of an error, the page reloads once (the
 * guard is per tab, in sessionStorage) and comes back on the new version;
 * the chart stays in the address or in the private space. A page that has
 * run a minute since is fine again, so a later deploy may reload it once more.
 * Vercel's Skew Protection, once on, keeps most of these from happening.
 */
import { reportError } from "@/lib/error-report";
import { clearReloadGuard, isChunkLoadError, reloadStaleChunkOnce } from "@/lib/lazy-retry";

export const STALE_RELOAD_KEY = "ulune:stale-reload";

/** Reload once for a missing code file; false when it isn't one, or the reload already happened. */
export function recoverFromStaleChunk(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  reportError("chunk", error);
  return reloadStaleChunkOnce(STALE_RELOAD_KEY);
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
