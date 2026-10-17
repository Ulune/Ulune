/**
 * The engine's answers on a device, each one what the matching server
 * function or route answers (on-device plan, step 2): the same input checks
 * (lib/chart/server-input.ts), the same reading of the birth (parse-birth.ts),
 * the same calculation (calculate.ts). Only the zone is handed in rather than
 * looked up, and must be one Ulune's tz table knows (else "E:engine.zone",
 * and the page asks Ulune's server for it).
 *
 *   natal        castChart          transits     castTransits
 *   progressions castProgressions   humanDesign  castHumanDesign
 *   skyWindow    /api/sky-window    skyYear      /api/sky-year
 *   timing       the Timing table (calculateTiming, served by no route)
 */
import { z } from "zod";
import { normalizeBirth } from "../chart/parse-birth";
import {
  birthSchema,
  FIRST_MOMENT_MS,
  humanDesignSchema,
  latitudeSchema,
  longitudeSchema,
  momentSchema,
  natalBodiesSchema,
  progressionSchema,
  transitSchema,
} from "../chart/server-input";
import { chunkStart } from "../chart/sky-window";
import { SKY_YEAR_MAX, SKY_YEAR_MIN } from "../chart/sky-year";
import { HOUSE_SYSTEM_IDS, type BirthInput } from "../chart/types";
import type { ZoneLookup } from "./birth-time";
import { knownZone, type CalcOptions, type Calculator, type TransitNatalBody } from "./calculate";
import { canonicalZone } from "./civil-time";
import type {
  EngineAnswers,
  EngineJob,
  HumanDesignRequest,
  NatalAnswer,
  NatalRequest,
  ProgressionsRequest,
  TimingRequest,
  TransitsRequest,
} from "./protocol";

// The worker's policy allows no eval (lib/security-headers.ts, ENGINE_WORKER_CSP): zod checks
// without compiling its parsers, and without probing for eval (a probe a strict policy reports).
z.config({ jitless: true });

const ZONE_SOURCES = new Set<ZoneLookup["source"]>(["coordinates", "place", "approximate"]);

/** A zone Ulune's table knows, as the server's lookups always give. */
function knownZoneName(zone: unknown): string {
  if (typeof zone !== "string" || !canonicalZone(zone)) throw new Error(`E:engine.zone|${String(zone).slice(0, 64)}`);
  return zone;
}

function placeOf(place: NatalRequest["place"] | undefined): ZoneLookup {
  const zone = knownZoneName(place?.zone);
  const source = place && ZONE_SOURCES.has(place.source) ? place.source : "place";
  return { zone, source };
}

function bodies(rows: readonly { id: string; name: string; ecliptic: number }[]): TransitNatalBody[] {
  return rows.map((row) => ({ id: row.id as TransitNatalBody["id"], name: row.name, ecliptic: row.ecliptic }));
}

/** castChart, on the device. */
export async function castNatal(calc: Calculator, req: NatalRequest): Promise<NatalAnswer> {
  const data = birthSchema.parse(req);
  const place = placeOf(req.place);
  const parsed = normalizeBirth({
    date: data.date,
    time: data.time,
    placeLabel: "",
    latitude: data.latitude,
    longitude: data.longitude,
    timeUnknown: data.timeUnknown,
  });
  const chart = await calc.calculateNatal(
    {
      name: "",
      date: parsed.date,
      time: parsed.timeUnknown ? "12:00" : parsed.time,
      timeUnknown: parsed.timeUnknown,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      placeLabel: "",
      houseSystem: data.houseSystem,
      zone: data.zone,
      tz: data.tz,
      fold: data.fold,
    } as BirthInput,
    knownZone(place),
  );
  if (parsed.timeUnknown) {
    chart.meta.time = "12:00";
  }
  return { chart, timeUnknown: parsed.timeUnknown };
}

/** castTransits, on the device. */
export async function castTransits(calc: Calculator, req: TransitsRequest) {
  const data = transitSchema.parse(req);
  const zone = knownZoneName(req.timezone);
  const utc = new Date(data.at);
  if (Number.isNaN(utc.getTime())) {
    throw new Error("Could not read this moment.");
  }
  return calc.calculateTransits(
    {
      utc,
      latitude: data.latitude,
      longitude: data.longitude,
      natalCusps: data.natalCusps,
      natalBodies: bodies(data.natalBodies),
      houseSystem: data.houseSystem,
    },
    knownZone({ zone, source: "coordinates" }),
  );
}

/** castProgressions, on the device. */
export async function castProgressions(calc: Calculator, req: ProgressionsRequest) {
  const data = progressionSchema.parse(req);
  const zone = knownZoneName(req.timezone);
  const natalUtc = new Date(data.natalUtc);
  const targetUtc = new Date(data.targetUtc);
  if (Number.isNaN(natalUtc.getTime()) || Number.isNaN(targetUtc.getTime())) {
    throw new Error("Could not read this moment.");
  }
  return calc.calculateProgressions(
    {
      natalUtc,
      targetUtc,
      latitude: data.latitude,
      longitude: data.longitude,
      natalCusps: data.natalCusps,
      natalBodies: bodies(data.natalBodies),
      houseSystem: data.houseSystem,
    },
    knownZone({ zone, source: "coordinates" }),
  );
}

/** castHumanDesign, on the device. */
export async function castHumanDesign(calc: Calculator, req: HumanDesignRequest) {
  const data = humanDesignSchema.parse(req);
  const natalUtc = new Date(data.natalUtc);
  if (Number.isNaN(natalUtc.getTime())) {
    throw new Error("Could not read this birth moment.");
  }
  return calc.calculateHumanDesign({ natalUtc, spanMinutes: data.spanMinutes });
}

/** The scrub window's first and last chunk (as /api/sky-window: 600 BC to 2399). */
const WINDOW_MIN_MS = FIRST_MOMENT_MS;
const WINDOW_MAX_MS = Date.UTC(2399, 0, 1);

/** /api/sky-window, on the device. */
export async function skyWindow(calc: Calculator, t0: number) {
  if (!Number.isFinite(t0) || !Number.isInteger(t0) || chunkStart(t0) !== t0 || t0 < WINDOW_MIN_MS || t0 > WINDOW_MAX_MS) {
    throw new Error("E:window.start");
  }
  return calc.calculateSkyWindow(t0);
}

/** /api/sky-year, on the device. */
export async function skyYear(calc: Calculator, year: number, opts: CalcOptions = {}) {
  if (!Number.isInteger(year) || year < SKY_YEAR_MIN || year > SKY_YEAR_MAX) {
    throw new Error("E:year.range");
  }
  return calc.calculateSkyYear(year, opts);
}

const timingSchema = z.object({
  from: momentSchema,
  to: momentSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  natalBodies: natalBodiesSchema,
  houseSystem: z.enum(HOUSE_SYSTEM_IDS).optional(),
});

/** A Timing table, on the device. */
export async function timing(calc: Calculator, req: TimingRequest, opts: CalcOptions = {}) {
  const data = timingSchema.parse(req);
  const zone = knownZoneName(req.timezone);
  return calc.calculateTiming(
    {
      from: new Date(data.from),
      to: new Date(data.to),
      latitude: data.latitude,
      longitude: data.longitude,
      natalBodies: bodies(data.natalBodies),
      houseSystem: data.houseSystem,
    },
    knownZone({ zone, source: "coordinates" }),
    opts,
  );
}

/** One job's answer (worker.ts). `warm` is answered by the worker itself. */
export async function answer<K extends Exclude<EngineJob["kind"], "warm">>(
  calc: Calculator,
  job: Extract<EngineJob, { kind: K }>,
  opts: CalcOptions = {},
): Promise<EngineAnswers[K]> {
  const j = job as EngineJob;
  switch (j.kind) {
    case "natal":
      return (await castNatal(calc, j.data)) as EngineAnswers[K];
    case "transits":
      return (await castTransits(calc, j.data)) as EngineAnswers[K];
    case "progressions":
      return (await castProgressions(calc, j.data)) as EngineAnswers[K];
    case "humanDesign":
      return (await castHumanDesign(calc, j.data)) as EngineAnswers[K];
    case "skyWindow":
      return (await skyWindow(calc, j.t0)) as EngineAnswers[K];
    case "skyYear":
      return (await skyYear(calc, j.year, opts)) as EngineAnswers[K];
    case "timing":
      return (await timing(calc, j.data, opts)) as EngineAnswers[K];
    default:
      throw new Error("E:engine.job");
  }
}
