import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { importWithRetry } from "@/lib/lazy-retry";

// Any props, as React.lazy itself takes.
type AnyComponent = ComponentType<any>;

/**
 * React.lazy over a named export. A failed download is tried once more
 * before the error reaches the nearest error boundary (the studio's error
 * slot, which reloads the page once when the files changed under it).
 */
export function lazyNamed<M extends Record<K, AnyComponent>, K extends keyof M>(
  load: () => Promise<M>,
  name: K,
): LazyExoticComponent<M[K]> {
  return lazy(() => importWithRetry(load, { attempts: 2 }).then((m) => ({ default: m[name] })));
}

/**
 * Start a download without waiting for it (hover, focus, idle). Errors are
 * dropped here: the real use tries again and shows them.
 */
export function prefetch(load: () => Promise<unknown>): void {
  void load().catch(() => {});
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

/** Run once the page is idle (after the first paint), or after `timeout` ms at the latest. */
export function whenIdle(fn: () => void, timeout = 2000): () => void {
  if (typeof window === "undefined") return () => {};
  const w = window as IdleWindow;
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(run, { timeout });
    return () => {
      done = true;
      (w as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    };
  }
  const id = window.setTimeout(run, Math.min(timeout, 600));
  return () => {
    done = true;
    window.clearTimeout(id);
  };
}

type NetInfo = { saveData?: boolean; effectiveType?: string };

/** Prefetching ahead of need is for good connections only (never with Save-Data). */
export function canPrefetchAhead(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as Navigator & { connection?: NetInfo }).connection;
  if (!c) return true;
  if (c.saveData) return false;
  return !c.effectiveType || c.effectiveType === "4g";
}
