import { useEffect, useSyncExternalStore } from "react";
import { canPrefetchAhead, whenIdle } from "@/lib/lazy-component";
import { importWithRetry } from "@/lib/lazy-retry";
import { natalMode } from "@/studio/modes/natal";
import type { ModeDef } from "@/studio/modes/types";
import type { StudioPage } from "@/studio/url";
import { recoverFromStaleChunk } from "@/lib/stale-chunks";

/*
 * The modes load on demand: the natal chart ships with the studio, every
 * other mode is its own download, fetched on hover or focus of its button,
 * at idle on a good connection, or when it is opened. A mode that has loaded
 * stays loaded (its hooks keep their state, see data.tsx).
 */

type LazyPage = Exclude<StudioPage, "natal">;

const LOADERS: Record<LazyPage, () => Promise<ModeDef>> = {
  transits: () => import("@/studio/modes/transits").then((m) => m.transitsMode),
  timing: () => import("@/studio/modes/timing").then((m) => m.timingMode),
  progressions: () => import("@/studio/modes/progressions").then((m) => m.progressionsMode),
  synastry: () => import("@/studio/modes/synastry").then((m) => m.synastryMode),
  composite: () => import("@/studio/modes/composite").then((m) => m.compositeMode),
  design: () => import("@/studio/modes/design").then((m) => m.designMode),
  numerology: () => import("@/studio/modes/numerology").then((m) => m.numerologyMode),
};

/** Idle prefetch order on a good connection: time modes first, then pair, then systems. */
const AHEAD: LazyPage[] = ["transits", "timing", "progressions", "synastry", "composite", "design", "numerology"];

const defs = new Map<StudioPage, ModeDef>([["natal", natalMode]]);
const inflight = new Map<StudioPage, Promise<ModeDef>>();
const failed = new Map<StudioPage, unknown>();
let loaded: ModeDef[] = [natalMode];
const subs = new Set<() => void>();

function notify() {
  for (const fn of subs) fn();
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function loadMode(page: StudioPage): Promise<ModeDef> {
  const have = defs.get(page);
  if (have) return Promise.resolve(have);
  const pending = inflight.get(page);
  if (pending) return pending;
  const job = importWithRetry(LOADERS[page as LazyPage], { attempts: 2 }).then(
    (def) => {
      inflight.delete(page);
      failed.delete(page);
      defs.set(page, def);
      loaded = [...loaded, def];
      notify();
      return def;
    },
    (err: unknown) => {
      inflight.delete(page);
      failed.set(page, err);
      notify();
      throw err;
    },
  );
  inflight.set(page, job);
  return job;
}

/** Fetch a mode ahead of use (hover, focus, idle); errors wait for the real open. */
export function preloadMode(page: StudioPage): void {
  if (defs.has(page) || inflight.has(page)) return;
  loadMode(page).catch(() => {});
}

/** The mode's definition once loaded (null meanwhile); opening it starts the download. */
export function useModeDef(page: StudioPage): { def: ModeDef | null; error: unknown; retry: () => void } {
  const def = useSyncExternalStore(
    subscribe,
    () => defs.get(page) ?? null,
    () => defs.get(page) ?? null,
  );
  const error = useSyncExternalStore(
    subscribe,
    () => failed.get(page) ?? null,
    () => null,
  );
  useEffect(() => {
    if (def || failed.has(page)) return;
    loadMode(page).catch(() => {});
  }, [page, def]);
  // The mode's code gone after a deploy: reload once onto the new version.
  useEffect(() => {
    if (error) recoverFromStaleChunk(error);
  }, [error]);
  return {
    def,
    error,
    retry: () => {
      failed.delete(page);
      notify();
      loadMode(page).catch(() => {});
    },
  };
}

/** Every mode loaded so far (the natal chart first). */
export function useLoadedModes(): ModeDef[] {
  return useSyncExternalStore(
    subscribe,
    () => loaded,
    () => loaded,
  );
}

/**
 * Once the studio is idle, fetch the other modes one after another on a good
 * connection (never with Save-Data), so switching feels instant.
 */
export function prefetchModesAtIdle(): () => void {
  if (!canPrefetchAhead()) return () => {};
  let stop = false;
  const cancel = whenIdle(() => {
    const next = async () => {
      for (const page of AHEAD) {
        if (stop) return;
        if (defs.has(page)) continue;
        try {
          await loadMode(page);
        } catch {
          return;
        }
      }
    };
    void next();
  }, 4000);
  return () => {
    stop = true;
    cancel();
  };
}
