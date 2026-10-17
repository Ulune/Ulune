/**
 * The page's side of the calculations on the device (on-device plan, step 2):
 * one background worker (worker.ts) holding one engine, started on the first
 * request, and a typed way to ask it, each answer the same as the matching
 * server function's (protocol.ts). Every request can be cancelled with an
 * AbortSignal: it then rejects at once with an AbortError, and the worker
 * drops it (or stops it at its next step).
 *
 * Nothing imports this in the first load; the "calculate" door (step 4)
 * will load it when a chart is cast on the device. Not used by any page yet.
 */
import type {
  EngineAnswers,
  EngineJob,
  FromEngine,
  HumanDesignRequest,
  NatalRequest,
  ProgressionsRequest,
  TimingRequest,
  ToEngine,
  TransitsRequest,
} from "./protocol";

export type { EngineStatus, NatalAnswer, NatalRequest } from "./protocol";

type Pending = { resolve: (value: unknown) => void; reject: (err: Error) => void; done: () => void };

let worker: Worker | null = null;
let seq = 0;
const waiting = new Map<number, Pending>();

/** What a calculation on this device needs: workers that load modules, and WebAssembly. */
export function deviceEngineSupported(): boolean {
  return (
    typeof Worker === "function" &&
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiate === "function" &&
    typeof URL === "function"
  );
}

function abortError(): Error {
  return typeof DOMException === "function" ? new DOMException("Aborted", "AbortError") : Object.assign(new Error("Aborted"), { name: "AbortError" });
}

/** Every waiting request fails with `code`, and the next one starts a new worker. */
function failAll(code: string) {
  const all = [...waiting.values()];
  waiting.clear();
  worker?.terminate();
  worker = null;
  for (const p of all) {
    p.done();
    p.reject(new Error(code));
  }
}

function spawn(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "ulune-engine" });
  w.onmessage = (event: MessageEvent<FromEngine>) => {
    const msg = event.data;
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
