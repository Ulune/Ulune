import { importWithRetry } from "@/lib/lazy-retry";

/*
 * The 3D view (WebGL) is its own download: fetched when 3D is turned on, or
 * ahead of that when the 3D button is pointed at or focused. The flat chart
 * never needs it.
 */

type View3DModule = typeof import("./wheel-view3d");

let ready: View3DModule | null = null;
let pending: Promise<View3DModule> | null = null;

/** The 3D view's code if it has loaded (null otherwise). */
export function view3dNow(): View3DModule | null {
  return ready;
}

export function loadView3D(): Promise<View3DModule> {
  if (ready) return Promise.resolve(ready);
  pending ??= importWithRetry(() => import("./wheel-view3d"), { attempts: 2 }).then(
    (mod) => {
      ready = mod;
      return mod;
    },
    (err: unknown) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

/**
 * Fetch ahead of use (hover, focus); errors wait for the real use. Once it has
 * loaded, the view's WebGL context and programs are made at idle, so the
 * first entry has nothing to compile.
 */
export function preloadView3D(): void {
  loadView3D().then(
    (mod) => {
      const w = window as Window & { requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(() => mod.warmView3D(), { timeout: 1500 });
      else window.setTimeout(() => mod.warmView3D(), 200);
    },
    () => {},
  );
}
