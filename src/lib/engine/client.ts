/**
 * The page's side of the calculations on the device (on-device plan, steps 2
 * and 5): one background worker (worker.ts) holding one engine, started on
 * the first request, and a typed way to ask it, each answer the same as the
 * matching server function's (protocol.ts). Every request can be cancelled
 * with an AbortSignal: it then rejects at once with an AbortError, and the
 * worker drops it (or stops it at its next step).
 *
 * While the engine's files come over the network the worker says how far
 * they have got (onEngineProgress), and a worker that falls silent while it
 * starts (a download stalled, nothing arriving for 25 s) is let go: its
 * requests fail with "E:engine.timeout", and the "calculate" door offers
 * Ulune's server (door.ts).
 *
 * Loaded by the door (door.ts) when a chart is first calculated on the
 * device, never in a page's first load.
 */
import type {
  EngineAnswers,
  EngineJob,
  EngineProgress,
  FromEngine,
  HumanDesignRequest,
  NatalRequest,
  ProgressionsRequest,
  TimingRequest,
  ToEngine,
  TransitsRequest,
} from "./protocol";
// The worker built on its own (/assets/engine-worker-<hash>.js, vite.config.ts), by its address.
import workerScript from "./worker.ts?worker&url";

export type { EngineProgress, EngineStatus, NatalAnswer, NatalRequest } from "./protocol";

type Pending = { resolve: (value: unknown) => void; reject: (err: Error) => void; done: () => void };

let worker: Worker | null = null;
let seq = 0;
const waiting = new Map<number, Pending>();

/** How long a starting worker may stay silent (no file arriving, no answer) before it is let go. */
const STALL_MS = 25_000;
let stall: ReturnType<typeof setTimeout> | null = null;
/** The worker has answered once: its engine is up, and its silences are calculations. */
let answered = false;

const progressListeners = new Set<(p: EngineProgress) => void>();

/** What a calculation on this device needs: workers that load modules, and WebAssembly. */
export function deviceEngineSupported(): boolean {
  return (
    typeof Worker === "function" &&
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiate === "function" &&
    typeof URL === "function"
  );
}

/** Told how far the engine's files have got while they come over the network; returns the way to stop. */
export function onEngineProgress(fn: (p: EngineProgress) => void): () => void {
  progressListeners.add(fn);
  return () => {
    progressListeners.delete(fn);
  };
}

function abortError(): Error {
  return typeof DOMException === "function" ? new DOMException("Aborted", "AbortError") : Object.assign(new Error("Aborted"), { name: "AbortError" });
}

function quiet() {
  if (stall) clearTimeout(stall);
  stall = null;
}

/** While the engine starts, silence for STALL_MS lets the worker go. */
function watch() {
  quiet();
  if (answered || !worker) return;
  stall = setTimeout(() => failAll("E:engine.timeout"), STALL_MS);
}

/** Every waiting request fails with `code`, and the next one starts a new worker. */
function failAll(code: string) {
  quiet();
  const all = [...waiting.values()];
  waiting.clear();
  worker?.terminate();
  worker = null;
  answered = false;
  for (const fn of progressListeners) fn({ loaded: 0, total: 0, done: true });
  for (const p of all) {
    p.done();
    p.reject(new Error(code));
  }
}

function spawn(): Worker {
  if (worker) return worker;
  const w = new Worker(workerScript, { type: "module", name: "ulune-engine" });
  w.onmessage = (event: MessageEvent<FromEngine>) => {
    const msg = event.data;
    if ("progress" in msg) {
      watch();
      for (const fn of progressListeners) fn(msg.progress);
      return;
    }
    answered = true;
    quiet();
    const p = waiting.get(msg.id);
    if (!p) return;
    waiting.delete(msg.id);
    p.done();
    if (msg.ok) p.resolve(msg.result);
    else p.reject(msg.cancelled ? abortError() : new Error(msg.error));
  };
  // A worker that cannot load (no module workers, a script refused) or crashes.
  w.onerror = (event) => {
    event.preventDefault?.();
    failAll("E:engine.worker");
  };
  worker = w;
  answered = false;
  watch();
  return w;
}

function ask<K extends EngineJob["kind"]>(job: Extract<EngineJob, { kind: K }>, signal?: AbortSignal): Promise<EngineAnswers[K]> {
  if (signal?.aborted) return Promise.reject(abortError());
  let w: Worker;
  try {
    w = spawn();
  } catch {
    return Promise.reject(new Error("E:engine.worker"));
  }
  const id = (seq += 1);
  return new Promise<EngineAnswers[K]>((resolve, reject) => {
    const onAbort = () => {
      if (!waiting.delete(id)) return;
      w.postMessage({ id, cancel: true } satisfies ToEngine);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    waiting.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      done: () => signal?.removeEventListener("abort", onAbort),
    });
    w.postMessage({ id, job } satisfies ToEngine);
  });
}

type Opts = { signal?: AbortSignal };

/**
 * The device's engine. Each method answers as its server counterpart:
 * natal ↔ castChart, transits ↔ castTransits, progressions ↔ castProgressions,
 * humanDesign ↔ castHumanDesign, skyWindow ↔ /api/sky-window, skyYear ↔
 * /api/sky-year; timing is the Timing table of a window up to 370 days.
 */
export const deviceEngine = {
  /** Start the engine and fetch its first files now (before the first chart is asked for). */
  warm: (opts: Opts = {}) => ask({ kind: "warm" }, opts.signal),
  natal: (data: NatalRequest, opts: Opts = {}) => ask({ kind: "natal", data }, opts.signal),
  transits: (data: TransitsRequest, opts: Opts = {}) => ask({ kind: "transits", data }, opts.signal),
  progressions: (data: ProgressionsRequest, opts: Opts = {}) => ask({ kind: "progressions", data }, opts.signal),
  humanDesign: (data: HumanDesignRequest, opts: Opts = {}) => ask({ kind: "humanDesign", data }, opts.signal),
  skyWindow: (t0: number, opts: Opts = {}) => ask({ kind: "skyWindow", t0 }, opts.signal),
  skyYear: (year: number, opts: Opts = {}) => ask({ kind: "skyYear", year }, opts.signal),
  timing: (data: TimingRequest, opts: Opts = {}) => ask({ kind: "timing", data }, opts.signal),
  /** Let the worker and its engine go (about 16 MB); the next request starts them again. */
  stop: () => failAll("E:engine.stopped"),
};

export type DeviceEngine = typeof deviceEngine;

/**
 * The page's own files the calculations need besides those the worker keeps (the engine and the
 * ephemeris, in its cache): the worker's script and the code that starts it. Kept by the offline
 * worker (public/sw.js) once a chart has been calculated here, so a chart is calculated offline too.
 */
export function engineCodeFiles(): string[] {
  return [new URL(workerScript, location.href).href, import.meta.url];
}
