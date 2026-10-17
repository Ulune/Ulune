/**
 * The one "calculate" door (on-device plan, step 4, prepared): each of the studio's calculations
 * goes either to this device's engine (client.ts, a worker) or to Ulune's server (functions.ts),
 * with the same request and the same answer, so the studio can call the door where it calls the
 * server functions today: `castChart({ data, signal })` and so on.
 *
 * Where: Ulune's server, always, until step 5's setting ("Where charts are calculated"). In
 * development only, `localStorage["ulune.dev.calculate"] = "device"` sends everything to the device,
 * to try it; a production build never reads the flag. No page uses the door yet.
 *
 * The birthplace's zone on the device (step 3): the place search's zone when the cast has one (the
 * request's `zone`), else Ulune's server is asked for the zone of the coordinates alone
 * (lookupZone); a zone Ulune's table does not know is asked for the same way. Transits,
 * progressions and Timing take the natal chart's zone (`timezone`, the chart's meta.timezone).
 *
 * When the device cannot calculate (no workers or WebAssembly, its files did not load), the door
 * says so with an "E:engine.…" error and never turns to the server by itself: the page asks the
 * reader first (step 5).
 */
import type { z } from "zod";
import type { birthSchema, humanDesignSchema, progressionSchema, transitSchema } from "../chart/server-input";
import type { HumanDesignChart } from "../chart/human-design";
import type { ProgressedSky, TransitSky } from "../chart/types";
import type { ZoneLookup } from "./birth-time";
import type { NatalAnswer } from "./protocol";

export type CalculateOn = "device" | "server";

/** The development flag's key (development builds only). */
export const DEV_CALCULATE_KEY = "ulune.dev.calculate";

/** Where calculations go now: the server, unless development's flag asks for the device. */
export function calculateOn(): CalculateOn {
  if (!import.meta.env?.DEV) return "server";
  try {
    return globalThis.localStorage?.getItem(DEV_CALCULATE_KEY) === "device" ? "device" : "server";
  } catch {
    return "server";
  }
}

type Call<D> = { data: D; signal?: AbortSignal };
type BirthData = z.input<typeof birthSchema>;
type TransitData = z.input<typeof transitSchema>;
type ProgressionData = z.input<typeof progressionSchema>;
type HumanDesignData = z.input<typeof humanDesignSchema>;
/** The zone the answer's local times are written in: the natal chart's (meta.timezone). */
type InZone = { timezone: string };

/** What the door reaches: the server functions, the zone lookup, the device's engine. */
export type DoorDeps = {
  server: {
    castChart(call: Call<BirthData>): Promise<NatalAnswer>;
    castTransits(call: Call<TransitData>): Promise<TransitSky>;
    castProgressions(call: Call<ProgressionData>): Promise<ProgressedSky>;
    castHumanDesign(call: Call<HumanDesignData>): Promise<HumanDesignChart>;
  };
  lookupZone(call: Call<{ latitude: number; longitude: number }>): Promise<ZoneLookup>;
  device(): Promise<{
    supported(): boolean;
    engine: {
      natal(data: BirthData & { place: ZoneLookup }, opts?: { signal?: AbortSignal }): Promise<NatalAnswer>;
      transits(data: TransitData & InZone, opts?: { signal?: AbortSignal }): Promise<TransitSky>;
      progressions(data: ProgressionData & InZone, opts?: { signal?: AbortSignal }): Promise<ProgressedSky>;
      humanDesign(data: HumanDesignData, opts?: { signal?: AbortSignal }): Promise<HumanDesignChart>;
    };
  }>;
  where(): CalculateOn;
};

const isZoneRefusal = (err: unknown) => err instanceof Error && err.message.startsWith("E:engine.zone");

/** The door over given parts (tests hand in their own); `door` below is the app's. */
export function makeDoor(deps: DoorDeps) {
  async function device() {
    const d = await deps.device();
    if (!d.supported()) throw new Error("E:engine.unsupported");
    return d.engine;
  }
  /** The server's zone for coordinates alone (typed coordinates, or a zone the table does not know). */
  const zoneOf = (data: BirthData, signal?: AbortSignal) => deps.lookupZone({ data: { latitude: data.latitude, longitude: data.longitude }, signal });

  return {
    async castChart({ data, signal }: Call<BirthData>): Promise<NatalAnswer> {
      if (deps.where() === "server") return deps.server.castChart({ data, signal });
      const engine = await device();
      const searched = data.zone ? { zone: data.zone, source: "place" as const } : null;
      try {
        return await engine.natal({ ...data, place: searched ?? (await zoneOf(data, signal)) }, { signal });
      } catch (err) {
        if (!searched || !isZoneRefusal(err)) throw err;
        return engine.natal({ ...data, place: await zoneOf(data, signal) }, { signal });
      }
    },
    async castTransits({ data, signal }: Call<TransitData & InZone>): Promise<TransitSky> {
      if (deps.where() === "server") return deps.server.castTransits({ data: withoutZone(data), signal });
      return (await device()).transits(data, { signal });
    },
    async castProgressions({ data, signal }: Call<ProgressionData & InZone>): Promise<ProgressedSky> {
      if (deps.where() === "server") return deps.server.castProgressions({ data: withoutZone(data), signal });
      return (await device()).progressions(data, { signal });
    },
    async castHumanDesign({ data, signal }: Call<HumanDesignData>): Promise<HumanDesignChart> {
      if (deps.where() === "server") return deps.server.castHumanDesign({ data, signal });
      return (await device()).humanDesign(data, { signal });
    },
  };
}

/** The server looks a zone up itself: its requests carry none. */
function withoutZone<T extends InZone>(data: T): Omit<T, "timezone"> {
  const { timezone: _zone, ...rest } = data;
  return rest;
}

/** The app's door: the server functions, the zone lookup, and the device's engine loaded on first use. */
export const door = makeDoor({
  server: {
    castChart: async (call) => (await import("../chart/functions")).castChart(call),
    castTransits: async (call) => (await import("../chart/functions")).castTransits(call),
    castProgressions: async (call) => (await import("../chart/functions")).castProgressions(call),
    castHumanDesign: async (call) => (await import("../chart/functions")).castHumanDesign(call) as Promise<HumanDesignChart>,
  },
  lookupZone: async (call) => (await import("./zone-lookup")).lookupZone(call),
  device: async () => {
    const { deviceEngine, deviceEngineSupported } = await import("./client");
    return { supported: deviceEngineSupported, engine: deviceEngine };
  },
  where: calculateOn,
});
