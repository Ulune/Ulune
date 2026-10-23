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

const online = () => typeof navigator === "undefined" || navigator.onLine !== false;

/**
 * Code files that failed to download while the device was offline, by
 * address ("" when the browser's error names none, as Safari's). Chromium
 * keeps such a failure for the page's life: "Try again" can't fetch the file
 * once the connection is back, only a reload can (the bug-fix round, item 6).
 */
const missedOffline = new Set<string>();
const addressOf = (error: unknown): string => /https?:\/\/[^\s'"]+/.exec(error instanceof Error ? error.message : String(error ?? ""))?.[0] ?? "";

/** A code file failed: noted with the connection of that moment (offline, it stays failed until a reload). */
export function noteChunkFailure(error: unknown): void {
  if (isChunkLoadError(error) && !online()) missedOffline.add(addressOf(error));
}

/**
 * What a failed download says: "offline" (no connection now), "reconnected"
 * (it failed offline and the connection is back: a reload brings it),
 * "stale" (online, the files changed under the page: a new version is out),
 * or null (not a code file).
 */
export function chunkFailure(error: unknown): "offline" | "reconnected" | "stale" | null {
  if (!isChunkLoadError(error)) return null;
  if (!online()) return "offline";
  const address = addressOf(error);
  return missedOffline.has(address) || (!address && missedOffline.size > 0) ? "reconnected" : "stale";
}

/** Reload once for a missing code file; false when it isn't one, there is no connection, the reload already happened, or it would lose charts. */
export function recoverFromStaleChunk(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  noteChunkFailure(error);
  // Offline, a reload brings nothing (and without Ulune kept, the browser's own offline page instead of the app).
  if (!online()) return false;
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

/** A missing code file while online that never failed offline: the files changed under the page (a new version is out). */
export function isStaleVersion(error: unknown): boolean {
  return chunkFailure(error) === "stale";
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
