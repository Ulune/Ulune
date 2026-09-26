/**
 * The scrub window's chunks in the browser (sky-window.ts): fetched once from
 * /api/sky-window (the edge and the browser keep them), held in memory, and
 * looked up synchronously while time moves. Nothing personal goes out: a chunk
 * is asked for by its start time only.
 */
import { CALC_VERSION } from "./constants";
import { chunkStart, chunksAround, covers, type SkyWindow } from "./sky-window";

/** About three years of chunks (32 days each), ~1 MB of numbers at most. */
const MAX_CHUNKS = 36;
const RETRY_MS = 30_000;

const loaded = new Map<number, SkyWindow>();
const inflight = new Map<number, Promise<SkyWindow | null>>();
const failedAt = new Map<number, number>();
const listeners = new Set<(t0: number) => void>();
/** Set when the server has no window route (an old deploy): stop asking this session. */
let unavailable = false;
/** Set once a chunk has arrived: provisional skies work here. */
let working = false;

function keep(win: SkyWindow) {
  loaded.delete(win.t0);
  loaded.set(win.t0, win);
  while (loaded.size > MAX_CHUNKS) {
    const oldest = loaded.keys().next().value;
    if (oldest == null) break;
    loaded.delete(oldest);
  }
}

function valid(win: unknown, t0: number): win is SkyWindow {
  const w = win as SkyWindow;
  return (
    Boolean(w) &&
    w.t0 === t0 &&
    Number.isInteger(w.n) &&
    w.n >= 2 &&
    Array.isArray(w.st) &&
    w.st.length === w.n &&
    Array.isArray(w.eps) &&
    w.eps.length === w.n &&
    typeof w.bodies === "object" &&
    Object.values(w.bodies).every((s) => Array.isArray(s) && s.length === 2 * w.n)
  );
}

/** The chunk holding `ms`, if it is here. */
export function windowAt(ms: number): SkyWindow | null {
  const win = loaded.get(chunkStart(ms));
  return win && covers(win, ms) ? win : null;
}

/** Whether provisional skies can be drawn in this session (a chunk has come). */
export function windowsWork(): boolean {
  return working && !unavailable;
}

/** Called with a chunk's start whenever one arrives. */
export function onWindow(fn: (t0: number) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function loadWindow(t0: number): Promise<SkyWindow | null> {
  const have = loaded.get(t0);
  if (have) return Promise.resolve(have);
  const pending = inflight.get(t0);
  if (pending) return pending;
  if (unavailable || typeof window === "undefined") return Promise.resolve(null);
  const failed = failedAt.get(t0);
  if (failed != null && Date.now() - failed < RETRY_MS) return Promise.resolve(null);
  const run = (async () => {
    try {
      const res = await fetch(`/api/sky-window?t0=${t0}&v=${CALC_VERSION}`);
      if (res.status === 404) {
        unavailable = true;
        return null;
      }
      if (!res.ok) throw new Error(String(res.status));
      const win: unknown = await res.json();
      if (!valid(win, t0)) throw new Error("bad window");
      keep(win);
      working = true;
      failedAt.delete(t0);
      for (const fn of listeners) fn(t0);
      return win;
    } catch {
      failedAt.set(t0, Date.now());
      return null;
    } finally {
      inflight.delete(t0);
    }
  })();
  inflight.set(t0, run);
  return run;
}

/** Ask for the chunk holding `ms`, and its neighbour when `ms` is near an edge. */
export function prefetchWindows(ms: number, marginDays = 8): void {
  if (!Number.isFinite(ms)) return;
  for (const t0 of chunksAround(ms, marginDays)) void loadWindow(t0);
}
