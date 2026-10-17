/**
 * Ulune's calculations on the reader's device (on-device plan, step 2): a
 * background worker holding one Swiss Ephemeris engine, so the page stays
 * fluid while it works. It starts on its first request: the engine and the
 * 1800–2399 files (about 2.1 MB with brotli) fetched from Ulune's own
 * address and kept by the browser; an earlier era is fetched only when a date
 * needs it. Then it answers the page's requests one at a time, each with the
 * server's answer to the last digit (requests.ts, calculate.ts).
 *
 * A request the page no longer wants (cancel) is dropped if it has not
 * started; a long one (a Timing year, a year's sky file) stops at its next
 * step. Messages: protocol.ts. Started by client.ts only, never in the first
 * load.
 */
import { ENGINE_URLS } from "./assets";
import { Calculator } from "./calculate";
import { browserFiles, type BrowserFiles } from "./files-browser";
import type { EngineJob, EngineStatus, FromEngine, ToEngine } from "./protocol";
import { answer } from "./requests";

type Scope = {
  onmessage: ((event: MessageEvent<ToEngine>) => void) | null;
  postMessage(message: FromEngine): void;
};
const scope = self as unknown as Scope;

let files: BrowserFiles = browserFiles(ENGINE_URLS);
let calc = new Calculator(files);
/** The engine's start, timed once (the first request pays it). */
let started: Promise<number> | null = null;
let startMs = 0;

const queue: { id: number; job: EngineJob }[] = [];
const cancelled = new Set<number>();
let busy = false;
/** The job being calculated now. */
let current: number | null = null;

/** An error that means the kept files are damaged or missing: they are fetched again next time. */
const FILE_FAULT = /ephemeris file|damaged|failed to mount|could not be loaded|failed to initialize|E:engine\.files/i;

class Stopped extends Error {
  constructor() {
    super("E:engine.cancelled");
  }
}

function start(): Promise<number> {
  started ??= (async () => {
    const t0 = performance.now();
    await calc.ready();
    startMs = performance.now() - t0;
    return startMs;
  })().catch((err) => {
    started = null;
    throw err;
  });
  return started;
}

/** Between two steps of a long calculation: messages are read, and a cancelled job stops. */
function pauseFor(id: number) {
  return () =>
    new Promise<void>((resolve, reject) => {
      setTimeout(() => (cancelled.has(id) ? reject(new Stopped()) : resolve()), 0);
    });
}

function status(): EngineStatus {
  const t = files.traffic();
  return { files: calc.held().sort(), startMs: Math.round(startMs * 10) / 10, network: t.network, kept: t.kept };
}

async function run(id: number, job: EngineJob): Promise<unknown> {
  await start();
  if (job.kind === "warm") return status();
  return answer(calc, job, { pause: pauseFor(id) });
}

async function pump() {
  if (busy) return;
  busy = true;
  try {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const { id, job } = next;
      if (cancelled.delete(id)) continue;
      current = id;
      const t0 = performance.now();
      try {
        const result = await run(id, job);
        if (cancelled.delete(id)) continue;
        scope.postMessage({ id, ok: true, result, ms: Math.round((performance.now() - t0) * 100) / 100 });
      } catch (err) {
        const stopped = err instanceof Stopped || cancelled.delete(id);
        const message = err instanceof Error ? err.message : String(err);
        if (!stopped && FILE_FAULT.test(message)) {
          // A damaged or missing copy: let the kept files go, and start afresh next time.
          await files.forget();
          files = browserFiles(ENGINE_URLS);
          calc = new Calculator(files);
          started = null;
        }
        scope.postMessage({ id, ok: false, error: stopped ? "E:engine.cancelled" : message || "E:engine.failed", ...(stopped ? { cancelled: true } : {}) });
      } finally {
        current = null;
        cancelled.delete(id);
      }
    }
  } finally {
    busy = false;
  }
}

scope.onmessage = (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object" || typeof msg.id !== "number") return;
  if ("cancel" in msg) {
    const i = queue.findIndex((q) => q.id === msg.id);
    if (i >= 0) {
      queue.splice(i, 1);
      scope.postMessage({ id: msg.id, ok: false, error: "E:engine.cancelled", cancelled: true });
    } else if (current === msg.id) cancelled.add(msg.id);
    return;
  }
  queue.push({ id: msg.id, job: msg.job });
  void pump();
};
