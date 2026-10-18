/**
 * The one "calculate" door (on-device plan, steps 4 and 5): every calculation the studio asks
 * for — a chart, transits, progressions, Human Design, the sky's chunks and year files — goes
 * through here, to this device's engine (client.ts, a worker) or to Ulune's server (the server
 * functions and the /api/sky-* routes), with the same request and the same answer.
 *
 * Where: as Settings › "Where charts are calculated" says (choice.ts), on this device by
 * default. When the device can't (no workers or WebAssembly, its files did not load, it fell
 * silent while starting, a chart's deadline ran out), the door never turns to the server by
 * itself: it asks the reader (the engine's notice: "Use the server once", "Always use the
 * server", Cancel) and does as answered; a cancelled calculation fails with "E:engine.declined".
 * Offline, a device whose files are not kept yet says the connection is missing (E:net.offline):
 * the server could not be reached either.
 *
 * The birthplace's zone on the device: the place search's (each place found comes with the zone
 * of the server's own map, W1-9), else Ulune's server is asked for the zone of the coordinates
 * alone (lookupZone: typed coordinates, or a zone Ulune's table does not know). A zone chosen in
 * the form needs neither: the place's own zone plays no part then. Transits, progressions and
 * Timing take the natal chart's zone (`timezone`, its meta.timezone).
 *
 * The sky's chunks and year files worked out here are kept by the browser under the same keys
 * as the server's answers (the offline worker's "ulune-sky-v1"), the same for everyone, so the
 * Calendar opens at once the next time.
 *
 * Development builds only: each calculation is announced on `window` ("ulune:calculated", for
 * the end-to-end tests), and `window.__uluneCalcGate` can hold a device's answer back.
 */
import type { z } from "zod";
import type { birthSchema, humanDesignSchema, progressionSchema, transitSchema } from "../chart/server-input";
import type { HumanDesignChart } from "../chart/human-design";
import type { SkyWindow } from "../chart/sky-window";
import type { SkyYear } from "../chart/sky-year";
import type { ProgressedSky, TransitSky } from "../chart/types";
import type { ZoneLookup } from "./birth-time";
import type { CalculateOn } from "./choice";
import type { EngineProgress, NatalAnswer } from "./protocol";
import { setEngineNotice, type ServerAnswer } from "./status";

export type { CalculateOn };

type Call<D> = { data: D; signal?: AbortSignal };
type BirthData = z.input<typeof birthSchema>;
type TransitData = z.input<typeof transitSchema>;
type ProgressionData = z.input<typeof progressionSchema>;
type HumanDesignData = z.input<typeof humanDesignSchema>;
/** The zone the answer's local times are written in: the natal chart's (meta.timezone). */
type InZone = { timezone: string };
type Opts = { signal?: AbortSignal };
/** A sky file's request: `v`, the versions it is asked for and kept under (the calculation's and the file's format). */
type SkyOpts = Opts & { v: string };

/** What the device's engine answers (client.ts, deviceEngine). */
export type DeviceCalculations = {
  natal(data: BirthData & { place: ZoneLookup }, opts?: Opts): Promise<NatalAnswer>;
  transits(data: TransitData & InZone, opts?: Opts): Promise<TransitSky>;
  progressions(data: ProgressionData & InZone, opts?: Opts): Promise<ProgressedSky>;
  humanDesign(data: HumanDesignData, opts?: Opts): Promise<HumanDesignChart>;
  skyWindow(t0: number, opts?: Opts): Promise<SkyWindow>;
  skyYear(year: number, opts?: Opts): Promise<SkyYear>;
};

/** What the door reaches: the server, the zone lookup, the device's engine, the reader. */
export type DoorDeps = {
  server: {
    castChart(call: Call<BirthData>): Promise<NatalAnswer>;
    castTransits(call: Call<TransitData>): Promise<TransitSky>;
    castProgressions(call: Call<ProgressionData>): Promise<ProgressedSky>;
    castHumanDesign(call: Call<HumanDesignData>): Promise<HumanDesignChart>;
    skyWindow(t0: number, v: string, signal?: AbortSignal): Promise<SkyWindow>;
    skyYear(year: number, v: string, signal?: AbortSignal): Promise<SkyYear>;
  };
  lookupZone(call: Call<{ latitude: number; longitude: number }>): Promise<ZoneLookup>;
  device(): Promise<{ supported(): boolean; engine: DeviceCalculations }>;
  where(): CalculateOn | Promise<CalculateOn>;
  /** This device can't calculate: the reader's answer (the engine's notice). */
  ask(err: Error): Promise<ServerAnswer>;
  /** "Use the server once" (this visit) or "Always use the server" (the setting). */
  useServer(how: "once" | "always"): void | Promise<void>;
  /** The sky's files worked out here, kept by the browser (absent: none kept). */
  kept?: { get(key: string): Promise<unknown>; put(key: string, value: unknown): void };
};

/** Why a device's calculation failed, when it means the device can't (rather than a request the server would refuse too). */
const CANT = /^E:engine\.(?:unsupported|worker|files|offline|timeout|stopped|failed)\b/;
const ENGINE_FAULT = /ephemeris file|damaged|failed to mount|could not be loaded|failed to initiali[sz]e|could not be compiled/i;

const isZoneRefusal = (err: unknown) => err instanceof Error && err.message.startsWith("E:engine.zone");
const isAbort = (err: unknown) => err instanceof Error && err.name === "AbortError";
const offlineNow = () => typeof navigator !== "undefined" && navigator.onLine === false;
/** A deadline that ran out (AbortSignal.timeout), not a reader who left. */
const timedOut = (signal?: AbortSignal) => Boolean(signal?.aborted && (signal.reason as Error | undefined)?.name === "TimeoutError");

function deviceCant(err: unknown, signal?: AbortSignal): boolean {
  if (isAbort(err)) return timedOut(signal);
  if (err instanceof Error && err.name === "TimeoutError") return true;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.startsWith("E:engine.offline") && offlineNow()) return false;
  return CANT.test(msg) || ENGINE_FAULT.test(msg);
}

function abortError(): Error {
  return typeof DOMException === "function" ? new DOMException("Aborted", "AbortError") : Object.assign(new Error("Aborted"), { name: "AbortError" });
}

/** A zone chosen in the form (BirthInput.tz names one): the place's own zone plays no part in the chart then. */
function chosenZone(tz: string | undefined): string | null {
  const s = (tz ?? "").trim();
  if (!s || s === "auto" || s.toLowerCase() === "lmt" || /^(?:UTC|GMT)?\s*[+\-−]/i.test(s)) return null;
  return s;
}

/*
 * The door is a chunk of its own, loaded with the views that calculate (never with the first
 * load), and the engine's page side another (vite.config.ts). It imports only types and
 * status.ts; the setting (choice.ts), the server functions, the zone lookup and the engine load
 * when used. It holds none of lib/chart's constants either: a module the first load holds,
 * imported here as a whole, would come into the first load whole (the sky's versions come with
 * each request instead).
 */
const choice = () => import("./choice");

/**
 * Where the server answers a chunk of the scrub window and a year's sky, and the keys they are kept
 * under; `v`, the versions they are asked for (the calculation's and the file's format), as the
 * caller has them (window-cache.ts, year-cache.ts).
 */
export const skyWindowAddress = (t0: number, v: string) => `/api/sky-window?t0=${t0}&v=${v}`;
export const skyYearAddress = (year: number, v: string) => `/api/sky-year?y=${year}&v=${v}`;

/** Development only: the end-to-end tests hear each calculation and can hold a device's answer back. */
type DevHooks = { __uluneCalcGate?: (kind: string) => Promise<void> | void };
async function devGate(kind: string) {
  if (!import.meta.env?.DEV) return;
  await (globalThis as DevHooks).__uluneCalcGate?.(kind);
}
function devTell(kind: string, on: CalculateOn, answer: unknown) {
  if (!import.meta.env?.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ulune:calculated", { detail: { kind, on, answer } }));
}

/** The door over given parts (tests hand in their own); `door` below is the app's. */
export function makeDoor(deps: DoorDeps) {
  // One question at a time: the calculations that fail meanwhile wait for the same answer.
  let asking: Promise<ServerAnswer> | null = null;
  const ask = (err: Error) =>
    (asking ??= deps.ask(err).finally(() => {
      asking = null;
    }));
  // After Cancel, only a new chart asks again in this visit: the views that follow (a sky
  // recalculated as time moves, the Calendar's chunks) fail quietly rather than ask at each step.
  let declined = false;

  async function device(): Promise<DeviceCalculations> {
    const d = await deps.device();
    if (!d.supported()) throw new Error("E:engine.unsupported");
    return d.engine;
  }

  /**
   * One calculation: on the server when it is chosen; else on this device, and on the server
   * only when the device can't and the reader says so.
   */
  async function calculate<T>(kind: string, onDevice: (engine: DeviceCalculations) => Promise<T>, onServer: (signal?: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if ((await deps.where()) === "server") {
      const answer = await onServer(signal);
      devTell(kind, "server", answer);
      return answer;
    }
    try {
      const answer = await onDevice(await device());
      await devGate(kind);
      devTell(kind, "device", answer);
      return answer;
    } catch (err) {
      if (!deviceCant(err, signal)) {
        if (err instanceof Error && err.message.startsWith("E:engine.offline")) throw new Error("E:net.offline");
        throw err;
      }
      if (declined && kind !== "natal") throw new Error("E:engine.declined");
      const answer = await ask(err instanceof Error ? err : new Error(String(err)));
      if (answer === "cancel") {
        declined = true;
        throw new Error("E:engine.declined");
      }
      declined = false;
      if (signal?.aborted && !timedOut(signal)) throw abortError();
      await deps.useServer(answer);
      // A deadline that ran out on the device starts again for the server.
      const result = await onServer(signal?.aborted ? undefined : signal);
      devTell(kind, "server", result);
      return result;
    }
  }

  /** The server's zone for coordinates alone (typed coordinates, or a zone the table does not know). */
  const zoneOf = (data: { latitude: number; longitude: number }, signal?: AbortSignal) =>
    deps.lookupZone({ data: { latitude: data.latitude, longitude: data.longitude }, signal });

  /**
   * A sky over a natal chart, its times written in the chart's zone; a chart whose zone Ulune's
   * table does not know (one kept from long ago) takes the zone the server would use, that of
   * its coordinates.
   */
  async function inChartZone<D extends InZone & { latitude: number; longitude: number }, T>(data: D, signal: AbortSignal | undefined, run: (zoned: D) => Promise<T>): Promise<T> {
    try {
      return await run(data);
    } catch (err) {
      if (!isZoneRefusal(err)) throw err;
      return run({ ...data, timezone: (await zoneOf(data, signal)).zone });
    }
  }

  async function keptOr<T>(key: string, work: () => Promise<T>): Promise<T> {
    const have = deps.kept ? await deps.kept.get(key).catch(() => null) : null;
    if (have) return have as T;
    const made = await work();
    deps.kept?.put(key, made);
    return made;
  }

  return {
    castChart({ data, signal }: Call<BirthData>): Promise<NatalAnswer> {
      return calculate(
        "natal",
        async (engine) => {
          const chosen = chosenZone(data.tz);
          const searched = data.zone ? { zone: data.zone, source: "place" as const } : null;
          const place = chosen ? { zone: chosen, source: "place" as const } : (searched ?? (await zoneOf(data, signal)));
          try {
            return await engine.natal({ ...data, place }, { signal });
          } catch (err) {
            if (place.source !== "place" || !isZoneRefusal(err)) throw err;
            return engine.natal({ ...data, place: await zoneOf(data, signal) }, { signal });
          }
        },
        (s) => deps.server.castChart({ data, signal: s }),
        signal,
      );
    },
    castTransits({ data, signal }: Call<TransitData & InZone>): Promise<TransitSky> {
      return calculate(
        "transits",
        (engine) => inChartZone(data, signal, (zoned) => engine.transits(zoned, { signal })),
        (s) => deps.server.castTransits({ data: withoutZone(data), signal: s }),
        signal,
      );
    },
    castProgressions({ data, signal }: Call<ProgressionData & InZone>): Promise<ProgressedSky> {
      return calculate(
        "progressions",
        (engine) => inChartZone(data, signal, (zoned) => engine.progressions(zoned, { signal })),
        (s) => deps.server.castProgressions({ data: withoutZone(data), signal: s }),
        signal,
      );
    },
    castHumanDesign({ data, signal }: Call<HumanDesignData>): Promise<HumanDesignChart> {
      return calculate(
        "humanDesign",
        (engine) => engine.humanDesign(data, { signal }),
        (s) => deps.server.castHumanDesign({ data, signal: s }),
        signal,
      );
    },
    /** A chunk of the scrub window (sky-window.ts): the same for everyone, asked for by its start. */
    skyWindow(t0: number, { v, signal }: SkyOpts): Promise<SkyWindow> {
      return calculate(
        "skyWindow",
        (engine) => keptOr(skyWindowAddress(t0, v), () => engine.skyWindow(t0, { signal })),
        (s) => deps.server.skyWindow(t0, v, s),
        signal,
      );
    },
    /** A year's sky file (sky-year.ts): the same for everyone, asked for by its year. */
    skyYear(year: number, { v, signal }: SkyOpts): Promise<SkyYear> {
      return calculate(
        "skyYear",
        (engine) => keptOr(skyYearAddress(year, v), () => engine.skyYear(year, { signal })),
        (s) => deps.server.skyYear(year, v, s),
        signal,
      );
    },
  };
}

export type Door = ReturnType<typeof makeDoor>;

/** The server looks a zone up itself: its requests carry none. */
function withoutZone<T extends InZone>(data: T): Omit<T, "timezone"> {
  const { timezone: _zone, ...rest } = data;
  return rest;
}

/** A sky file from the server's route; an old deploy without it says so (E:sky.unavailable). */
async function skyFile<T>(address: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(address, { signal });
  if (res.status === 404) throw new Error("E:sky.unavailable");
  if (!res.ok) throw new Error(res.status >= 500 ? "E:server.failed" : `E:sky.status|${res.status}`);
  return (await res.json()) as T;
}

/** The sky files worked out here, kept as the offline worker keeps the server's (public/sw.js, "ulune-sky-v1", 120 at most). */
const SKY_CACHE = "ulune-sky-v1";
const MAX_SKY = 120;
const skyCache = () => (typeof caches === "undefined" ? null : caches.open(SKY_CACHE));
const keptSky: NonNullable<DoorDeps["kept"]> = {
  async get(key) {
    try {
      const hit = await (await skyCache())?.match(new URL(key, location.href).href);
      return hit ? await hit.json() : null;
    } catch {
      return null;
    }
  },
  put(key, value) {
    void (async () => {
      try {
        const c = await skyCache();
        if (!c) return;
        await c.put(new URL(key, location.href).href, new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } }));
        const keys = await c.keys();
        for (let i = 0; i < keys.length - MAX_SKY; i += 1) await c.delete(keys[i]);
      } catch {
        /* a full disk, or no cache: worked out again next time */
      }
    })();
  },
};

/** The engine's notices (the download, the question), loaded when one shows (and asked again once, as a phone's network blinks). */
let notices: Promise<void> | null = null;
function showNotices(): Promise<void> {
  const load = () => import("@/components/engine/engine-ui");
  notices ??= load()
    .catch(() => new Promise<void>((resolve) => setTimeout(resolve, 400)).then(load))
    .then((m) => m.mountEngineUi())
    .catch((err) => {
      notices = null;
      throw err;
    });
  return notices;
}

function onProgress(p: EngineProgress) {
  if (p.done || !p.total) {
    setEngineNotice({ progress: null });
    return;
  }
  setEngineNotice({ progress: { loaded: p.loaded, total: p.total } });
  void showNotices().catch(() => {});
}

let listening = false;
const serverCalls = () => import("./server-calls");

/** The app's door: the server functions and routes, the zone lookup, the device's engine loaded on first use, the reader's notices. */
export const door = makeDoor({
  server: {
    castChart: async (call) => (await serverCalls()).castChart(call),
    castTransits: async (call) => (await serverCalls()).castTransits(call),
    castProgressions: async (call) => (await serverCalls()).castProgressions(call),
    castHumanDesign: async (call) => (await serverCalls()).castHumanDesign(call) as Promise<HumanDesignChart>,
    skyWindow: (t0, v, signal) => skyFile<SkyWindow>(skyWindowAddress(t0, v), signal),
    skyYear: (year, v, signal) => skyFile<SkyYear>(skyYearAddress(year, v), signal),
  },
  lookupZone: async (call) => (await import("./zone-lookup")).lookupZone(call),
  device: async () => {
    const { deviceEngine, deviceEngineSupported, onEngineProgress } = await import("./client");
    if (!listening) {
      listening = true;
      onEngineProgress(onProgress);
    }
    return { supported: deviceEngineSupported, engine: deviceEngine as DeviceCalculations };
  },
  where: async () => (await choice()).calculateOn(),
  ask: (err) =>
    new Promise<ServerAnswer>((resolve) => {
      setEngineNotice({
        question: {
          why: err.message.startsWith("E:") ? err.message.split("|")[0] : err.name === "AbortError" || err.name === "TimeoutError" ? "E:engine.timeout" : "E:engine.failed",
          answer: (answer) => {
            setEngineNotice({ question: null });
            resolve(answer);
          },
        },
      });
      // Without its notice (its code could not load), nothing is sent: as if cancelled.
      showNotices().catch(() => {
        setEngineNotice({ question: null });
        resolve("cancel");
      });
    }),
  useServer: async (how) => {
    const c = await choice();
    if (how === "always") c.setCalculateOn("server");
    else c.calculateOnServerForNow();
  },
  kept: keptSky,
});

/**
 * With Ulune kept on this device (public/sw.js), once a chart has been calculated here: the
 * offline worker keeps the code that starts the engine and the worker's script, so a chart is
 * calculated offline too (its engine and files are kept in the worker's own cache already).
 * Asked as Settings turns keeping on (`turnedOn`: the offline worker may not run this page yet),
 * and a moment after the door loads on a page the offline worker runs, so a chart calculated
 * before Ulune was kept has its code kept at the next visit (none of this is in the first load).
 */
export async function keepEngineOffline(turnedOn = false): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker || typeof caches === "undefined") return;
  const sw = navigator.serviceWorker;
  if (!sw.controller && !turnedOn) return;
  // Not before a first chart here: the worker keeps the engine's files in its own cache then.
  if (!(await caches.has("ulune-engine-v1"))) return;
  const offline = sw.controller ?? (await sw.ready).active;
  const [{ engineCodeFiles }, { CHOICE_FILE }] = await Promise.all([import("./client"), choice()]);
  // The worker's script and the engine's page side, this door and the setting: what a chart needs offline.
  offline?.postMessage({ type: "engine-keep", urls: [...engineCodeFiles(), import.meta.url, CHOICE_FILE] });
}

if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
  window.setTimeout(() => void keepEngineOffline().catch(() => {}), 8000);
}
