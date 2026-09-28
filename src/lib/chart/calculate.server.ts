import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import SwissEPH from "sweph-wasm";
import createModule from "sweph-wasm/wasm/swisseph";
import { formatDegree } from "../utils";
import { formatLocalMinute, resolveBirthMoment, zoneAt } from "./birth-time.server";
import {
  CALC_VERSION,
  STATION_DAYS,
  HOUSE_LABELS,
  HOUSE_SYSTEM_SWE,
  MAJOR_ASPECT_IDS,
  PLANET_META,
  STAR_META,
  signFromEcliptic,
} from "./constants";
import {
  aspectTarget,
  aspectPoles,
  daysToIso,
  applyingFromExactDays,
  findExactDays,
  findExactsFromSamples,
  isTransitTablePair,
  residualForType,
  sampleStepDays,
  timingExactId,
  transitSearchDays,
  TRANSIT_TABLE_MOVING,
  TRANSIT_TABLE_NATAL,
  type LonSample,
} from "./transit-exact";
import {
  isProgressionTablePair,
  lifeExactIso,
  NAIBOD_DEG_PER_YEAR,
  progressedArmc,
  progressedUtcFromNatal,
  TROPICAL_YEAR_DAYS,
  yearsOfLife,
} from "./progressions";
import {
  altitudeFromEquatorial,
  arabicLot,
  computeAspects,
  computeCrossAspects,
  computeMidpoints,
  computeStars,
  houseFromCusps,
  wrap180,
  wrap360,
} from "./anatomy";
import { buildPatterns, isDayChart } from "./patterns";
import type {
  AngleId,
  AspectLink,
  BirthInput,
  BodyId,
  HouseCusp,
  HouseSystemId,
  NatalChart,
  Placement,
  PlanetId,
  ProgressedSky,
  StarId,
  TimingCast,
  TimingHit,
  TransitSky,
} from "./types";
import { ANGLE_IDS, HOUSE_SYSTEM_IDS, PLANET_IDS, STAR_IDS } from "./types";
import { makePlacement } from "./placement";
import { chunkStart, WINDOW_SAMPLES, WINDOW_STEP_HOURS, type SkyWindow } from "./sky-window";
import {
  activationOf,
  buildHumanDesignChart,
  HD_BODY_IDS,
  type HdActivation,
  type HdArrowId,
  type HdBodyId,
  type HumanDesignChart,
} from "./human-design";
import { HD_ARROWS, hdArrowLeft, hdFineOf } from "./hd-variable";
import { hdUncertainOf } from "./hd-uncertain";

type WasmMod = {
  FS: {
    mkdir: (p: string) => void;
    unlink: (p: string) => void;
    createDataFile: (
      parent: string,
      name: string,
      data: Uint8Array,
      canRead: boolean,
      canWrite: boolean,
      canOwn: boolean,
    ) => void;
    analyzePath: (p: string, dontResolveLastLink?: boolean) => { exists: boolean };
    stat: (p: string) => { size: number };
  };
  _malloc: (n: number) => number;
  _free: (p: number) => void;
  stringToUTF8: (s: string, ptr: number, max: number) => void;
  getValue: (ptr: number, type: string) => number;
  setValue: (ptr: number, value: number, type: string) => void;
  UTF8ToString: (ptr: number) => string;
  _swe_set_ephe_path: (ptr: number) => void;
  _swe_calc_ut: (tjdUt: number, ipl: number, iflag: number, xx: number, serr: number) => number;
  _swe_fixstar2_ut: (star: number, tjdUt: number, iflag: number, xx: number, serr: number) => number;
};

let engine: SwissEPH | null = null;
let engineWasm: WasmMod | null = null;
let enginePromise: Promise<SwissEPH> | null = null;

function here(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function wasmFile(): string {
  const found = firstExisting([
    join(process.cwd(), "node_modules/sweph-wasm/dist/wasm/swisseph.wasm"),
    join(process.cwd(), "swisseph.wasm"),
    join(here(), "swisseph.wasm"),
  ]);
  if (!found) {
    throw new Error("The chart engine could not be loaded on this server.");
  }
  return found;
}

/** The engine cannot run without the planetary and lunar files for 1800–2400. */
const REQUIRED_EPHE = ["sepl_18.se1", "semo_18.se1"];

/** Swiss Ephemeris's fixed-star catalogue, read by swe_fixstar2_ut. */
const STAR_CATALOGUE = "sefstars.txt";

/**
 * Where the ephemeris files live: the app's own ephe/ (exactly what a
 * deploy ships), then the copies next to the built server; the package's
 * full set in node_modules only if none of those is usable — so a dev server
 * computes from the same files as production, never from more.
 */
function epheCandidates(): string[] {
  return [
    join(process.cwd(), "ephe"),
    join(here(), "ephe"),
    join(here(), "../../../ephe"),
    join(here(), "../../../../ephe"),
    join(process.cwd(), "node_modules/sweph-wasm/dist/ephe"),
  ].filter((p) => existsSync(p));
}

/** A directory's usable files: real `.se1` files (not LFS pointers) and the star catalogue. */
function usableFiles(dir: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".se1") && name !== STAR_CATALOGUE) continue;
    const path = join(dir, name);
    try {
      if (statSync(path).size >= 1024) found.set(name, path);
    } catch {
      /* unreadable */
    }
  }
  return found;
}

function collectEpheFiles(): Map<string, string> {
  for (const dir of epheCandidates()) {
    const files = usableFiles(dir);
    if (REQUIRED_EPHE.every((name) => files.has(name))) return files;
  }
  return new Map();
}

function mountEpheFile(wasm: WasmMod, name: string, bytes: Uint8Array) {
  const dest = `/ephe/${name}`;
  if (wasm.FS.analyzePath(dest).exists) wasm.FS.unlink(dest);
  wasm.FS.createDataFile("/ephe", name, bytes, true, true, true);
  const size = wasm.FS.stat(dest).size;
  if (size < 1024) {
    throw new Error(`Ephemeris file ${name} failed to mount (${size} bytes).`);
  }
}

function resetEngine() {
  engine = null;
  engineWasm = null;
  enginePromise = null;
}

type SweCalc = {
  /** longitude, latitude, distance, and their daily speeds (or RA/Dec with SEFLG_EQUATORIAL). */
  xx: number[];
  /** The flags Swiss actually computed with: SEFLG_MOSEPH instead of SEFLG_SWIEPH means no file covered the date. */
  flag: number;
  warning: string;
};

/**
 * swe_calc_ut that keeps what the packaged wrapper drops: the flags Swiss
 * really used. When no .se1 file covers a date Swiss silently falls back to
 * its Moshier approximation (~1″ for planets, but ~1′ for the true node and
 * several ′ for osculating Lilith); the return flag is the only trace of it.
 */
function calcUt(swe: SwissEPH, tjdUt: number, ipl: number, iflag: number): SweCalc {
  const wasm = engineWasm;
  if (!wasm) {
    const xx = swe.swe_calc_ut(tjdUt, ipl, iflag);
    return { xx: Array.from(xx, Number), flag: iflag, warning: "" };
  }
  const xxPtr = wasm._malloc(6 * 8);
  const serrPtr = wasm._malloc(256);
  try {
    wasm.setValue(serrPtr, 0, "i8");
    const flag = wasm._swe_calc_ut(tjdUt, ipl, iflag, xxPtr, serrPtr);
    const warning = wasm.UTF8ToString(serrPtr);
    if (flag < 0) throw new Error(warning || `Swiss Ephemeris could not compute body ${ipl}.`);
    const xx: number[] = [];
    for (let i = 0; i < 6; i += 1) xx.push(wasm.getValue(xxPtr + i * 8, "double"));
    return { xx, flag, warning };
  } finally {
    wasm._free(xxPtr);
    wasm._free(serrPtr);
  }
}

/**
 * swe_fixstar2_ut with a name buffer Swiss can write into: it returns the
 * star's full "traditional,nomenclature" name in place, which overruns the
 * packaged wrapper's buffer (sized to the name passed in) and corrupts the
 * wasm heap. Longitude, latitude, distance and speeds, apparent of date.
 */
function fixstarUt(tjdUt: number, name: string, iflag: number): number[] {
  const wasm = engineWasm;
  if (!wasm) throw new Error("The chart engine is not ready.");
  const NAME_BYTES = 1024;
  const starPtr = wasm._malloc(NAME_BYTES);
  const xxPtr = wasm._malloc(6 * 8);
  const serrPtr = wasm._malloc(256);
  try {
    wasm.stringToUTF8(name, starPtr, NAME_BYTES);
    wasm.setValue(serrPtr, 0, "i8");
    const flag = wasm._swe_fixstar2_ut(starPtr, tjdUt, iflag, xxPtr, serrPtr);
    if (flag < 0) throw new Error(wasm.UTF8ToString(serrPtr) || `Star ${name} not found.`);
    const xx: number[] = [];
    for (let i = 0; i < 6; i += 1) xx.push(wasm.getValue(xxPtr + i * 8, "double"));
    return xx;
  } finally {
    wasm._free(starPtr);
    wasm._free(xxPtr);
    wasm._free(serrPtr);
  }
}

/** Swiss fell back to Moshier for this result (no ephemeris file covers the date). */
function usedMoshier(swe: SwissEPH, calc: SweCalc): boolean {
  return (calc.flag & swe.SEFLG_SWIEPH) === 0 && (calc.flag & swe.SEFLG_MOSEPH) !== 0;
}

const MOSHIER_WARNING =
  "No Swiss Ephemeris file covers this date, so positions come from the Moshier approximation built into Swiss Ephemeris (planets within about 1″; the true node within about 1′ and osculating Lilith within a few ′).";

/*
 * A chart's warnings travel as codes the page translates (lib/chart/method-notes.ts):
 * `W:moshier`, `W:body.skipped|<body id>`, `W:star.unplaced|<star id>`. The
 * server's log keeps the English sentence with the engine's reason.
 */
const W_MOSHIER = "W:moshier";

function isEpheFault(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ephemeris file|damaged|not found|could not be loaded/i.test(msg);
}

async function getEngine(): Promise<SwissEPH> {
  if (engine) {
    try {
      engine.swe_calc_ut(2451545.0, engine.SE_SUN, engine.SEFLG_SWIEPH);
      return engine;
    } catch {
      resetEngine();
    }
  }
  enginePromise ??= (async () => {
    const files = collectEpheFiles();
    if (!REQUIRED_EPHE.every((name) => files.has(name))) {
      throw new Error("The chart engine could not be loaded on this server.");
    }
    const wasmBinary = readFileSync(wasmFile());
    const wasm = (await createModule({ wasmBinary })) as WasmMod;
    try {
      wasm.FS.mkdir("/ephe");
    } catch {
      /* exists */
    }
    for (const [name, path] of files) {
      const buf = readFileSync(path);
      mountEpheFile(wasm, name, Uint8Array.from(buf));
    }
    const swe = new SwissEPH(wasm as never);
    const pathBuf = "/ephe";
    const ptr = wasm._malloc(pathBuf.length + 1);
    wasm.stringToUTF8(pathBuf, ptr, pathBuf.length + 1);
    wasm._swe_set_ephe_path(ptr);
    wasm._free(ptr);
    engineWasm = wasm;
    const probe = calcUt(swe, 2451545.0, swe.SE_SUN, swe.SEFLG_SWIEPH);
    if (!Number.isFinite(probe.xx[0]) || usedMoshier(swe, probe)) {
      throw new Error("Swiss Ephemeris failed to initialize.");
    }
    engine = swe;
    return swe;
  })().catch((err) => {
    resetEngine();
    throw err;
  });
  return enginePromise;
}

async function withEngine<T>(fn: (swe: SwissEPH) => T | Promise<T>): Promise<T> {
  try {
    return await fn(await getEngine());
  } catch (err) {
    if (!isEpheFault(err)) throw err;
    resetEngine();
    return await fn(await getEngine());
  }
}

const SWE_BODY: Record<PlanetId, (swe: SwissEPH) => number> = {
  sun: (s) => s.SE_SUN,
  moon: (s) => s.SE_MOON,
  mercury: (s) => s.SE_MERCURY,
  venus: (s) => s.SE_VENUS,
  mars: (s) => s.SE_MARS,
  jupiter: (s) => s.SE_JUPITER,
  saturn: (s) => s.SE_SATURN,
  uranus: (s) => s.SE_URANUS,
  neptune: (s) => s.SE_NEPTUNE,
  pluto: (s) => s.SE_PLUTO,
  chiron: (s) => s.SE_CHIRON,
  northnode: (s) => s.SE_TRUE_NODE,
  southnode: (s) => s.SE_TRUE_NODE,
  lilith: (s) => s.SE_OSCU_APOG,
  vertex: () => -1,
  antivertex: () => -1,
  fortune: () => -1,
  spirit: () => -1,
  ceres: (s) => s.SE_CERES,
  pallas: (s) => s.SE_PALLAS,
  juno: (s) => s.SE_JUNO,
  vesta: (s) => s.SE_VESTA,
  eris: (s) => s.SE_AST_OFFSET + 136199,
  sedna: (s) => s.SE_AST_OFFSET + 90377,
};

/**
 * Bodies the chart cannot be drawn without. Everything else (Chiron, the
 * asteroids, Eris, Sedna) is skipped with a warning when its `.se1` file is
 * absent, rather than failing the whole cast.
 */
const REQUIRED_BODIES = new Set<PlanetId>([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "northnode",
  "southnode",
]);

/** Placidus and Koch are undefined inside the polar circles; Porphyry is not. */
const POLAR_FALLBACK_SYSTEM: HouseSystemId = "porphyry";

/** Mark an angle/Vertex/lot as a noon placeholder when the birth time is unknown. */
function uncertainIf(placement: Placement, timeUnknown: boolean): Placement {
  return timeUnknown ? { ...placement, uncertain: true } : placement;
}

function jdUt(swe: SwissEPH, utc: Date): number {
  const hour = utc.getUTCHours();
  const minute = utc.getUTCMinutes();
  const second = utc.getUTCSeconds() + utc.getUTCMilliseconds() / 1000;
  const [, ut] = swe.swe_utc_to_jd(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate(),
    hour,
    minute,
    second,
    swe.SE_GREG_CAL,
  );
  return ut;
}

type SweHouses = {
  cusps: ArrayLike<number>;
  ascmc: ArrayLike<number>;
};

type HouseFrame = {
  raw: SweHouses;
  cusps: number[];
  /** The system the cusps were actually built with. */
  houseSystem: HouseSystemId;
  /** What the chart asked for; differs from `houseSystem` only on a fallback. */
  requested: HouseSystemId;
};

/**
 * Cusps + ASC/MC/Vertex for one moment. Placidus and Koch throw (or return
 * non-finite cusps) inside the polar circles — fall back to Porphyry for that
 * chart instead of failing it, and record which system actually ran.
 */
function housesAt(
  swe: SwissEPH,
  ut: number,
  latitude: number,
  longitude: number,
  requested: HouseSystemId,
): HouseFrame {
  const attempt = (id: HouseSystemId): { raw: SweHouses; cusps: number[] } | null => {
    let raw: SweHouses;
    try {
      raw = swe.swe_houses(ut, latitude, longitude, HOUSE_SYSTEM_SWE[id]) as SweHouses;
    } catch {
      return null;
    }
    const cusps: number[] = [];
    for (let i = 1; i <= 12; i += 1) {
      const lon = Number(raw.cusps[i]);
      if (!Number.isFinite(lon)) return null;
      cusps.push(wrap360(lon));
    }
    if (!Number.isFinite(Number(raw.ascmc[0])) || !Number.isFinite(Number(raw.ascmc[1]))) return null;
    return { raw, cusps };
  };

  const direct = attempt(requested);
  if (direct) return { ...direct, houseSystem: requested, requested };

  if (requested !== POLAR_FALLBACK_SYSTEM) {
    const fallback = attempt(POLAR_FALLBACK_SYSTEM);
    if (fallback) {
      // No log line: it would carry the birth latitude.
      return { ...fallback, houseSystem: POLAR_FALLBACK_SYSTEM, requested };
    }
  }
  throw new Error("E:chart.houses.failed");
}

function swissBodyAt(
  swe: SwissEPH,
  utc: Date,
  id: PlanetId,
  flag: number,
): { lon: number; speed: number } {
  const ipl = SWE_BODY[id](swe);
  const pos = calcUt(swe, jdUt(swe, utc), ipl, flag).xx;
  let lon = wrap360(Number(pos[0]));
  if (id === "southnode") lon = wrap360(lon + 180);
  return { lon, speed: Number(pos[3]) };
}

/** Vertex in the chart's own house system — never locked to Placidus. */
function vertexAt(
  swe: SwissEPH,
  utc: Date,
  latitude: number,
  longitude: number,
  houseSystem: HouseSystemId,
): number {
  const frame = housesAt(swe, jdUt(swe, utc), latitude, longitude, houseSystem);
  return wrap360(Number(frame.raw.ascmc[3]));
}

function angleLonAt(
  swe: SwissEPH,
  utc: Date,
  id: AngleId,
  latitude: number,
  longitude: number,
  houseSystem: HouseSystemId,
): number {
  const frame = housesAt(swe, jdUt(swe, utc), latitude, longitude, houseSystem);
  const asc = wrap360(Number(frame.raw.ascmc[0]));
  const mc = wrap360(Number(frame.raw.ascmc[1]));
  if (id === "ascendant") return asc;
  if (id === "midheaven") return mc;
  if (id === "descendant") return wrap360(asc + 180);
  return wrap360(mc + 180);
}

/** Ascendant, Midheaven and Vertex for an ARMC, as Swiss's house code gives them. */
function ascmcFromArmc(
  swe: SwissEPH,
  armc: number,
  latitude: number,
  eps: number,
  houseSystem: HouseSystemId,
): { asc: number; mc: number; vertex: number } {
  const attempt = (id: HouseSystemId) => {
    try {
      const raw = swe.swe_houses_armc(wrap360(armc), latitude, eps, HOUSE_SYSTEM_SWE[id]) as SweHouses;
      const asc = wrap360(Number(raw.ascmc[0]));
      const mc = wrap360(Number(raw.ascmc[1]));
      const vertex = wrap360(Number(raw.ascmc[3]));
      return Number.isFinite(asc) && Number.isFinite(mc) && Number.isFinite(vertex) ? { asc, mc, vertex } : null;
    } catch {
      return null;
    }
  };
  const got = attempt(houseSystem) ?? (houseSystem !== POLAR_FALLBACK_SYSTEM ? attempt(POLAR_FALLBACK_SYSTEM) : null);
  if (!got) throw new Error("E:chart.houses.failed");
  return got;
}

type ProgressedAngles = {
  asc: number;
  mc: number;
  vertex: number;
  /** Degrees per year of life (a day of the ephemeris), as for the bodies. */
  ascSpeed: number;
  mcSpeed: number;
  vertexSpeed: number;
};

/**
 * The progressed Ascendant, Midheaven and Vertex at the birthplace: the
 * progressed ARMC (the Naibod arc, see `progressedArmc`) with the true
 * obliquity of the progressed moment; speeds from an hour of the ephemeris
 * later, like the bodies'.
 */
function progressedAnglesAt(
  swe: SwissEPH,
  ut: number,
  years: number,
  latitude: number,
  longitude: number,
  houseSystem: HouseSystemId,
): ProgressedAngles {
  const eps = trueObliquity(swe, ut);
  if (eps == null) throw new Error("E:chart.houses.failed");
  const armc = progressedArmc(wrap360(swe.swe_sidtime(ut) * 15 + longitude), years);
  const now = ascmcFromArmc(swe, armc, latitude, eps, houseSystem);
  const later = ascmcFromArmc(swe, armc + NAIBOD_DEG_PER_YEAR / 24, latitude, eps, houseSystem);
  return {
    ...now,
    ascSpeed: wrap180(later.asc - now.asc) * 24,
    mcSpeed: wrap180(later.mc - now.mc) * 24,
    vertexSpeed: wrap180(later.vertex - now.vertex) * 24,
  };
}

function progressedLon(p: ProgressedAngles, id: AngleId | "vertex"): { lon: number; speed: number } {
  if (id === "vertex") return { lon: p.vertex, speed: p.vertexSpeed };
  if (id === "ascendant") return { lon: p.asc, speed: p.ascSpeed };
  if (id === "descendant") return { lon: wrap360(p.asc + 180), speed: p.ascSpeed };
  if (id === "midheaven") return { lon: p.mc, speed: p.mcSpeed };
  return { lon: wrap360(p.mc + 180), speed: p.mcSpeed };
}

/**
 * Longitude and speed of a body `days` of the ephemeris after `origin`. With
 * `progressedYears` (the years of life at `origin`), the angles and the
 * Vertex are the progressed ones; otherwise the sky's own.
 */
function lonAtFor(
  swe: SwissEPH,
  origin: Date,
  id: BodyId,
  flag: number,
  latitude: number,
  longitude: number,
  houseSystem: HouseSystemId,
  progressedYears?: number,
): ((days: number) => { lon: number; speed: number }) | null {
  const isAngle = id === "ascendant" || id === "midheaven" || id === "descendant" || id === "ic";
  if (progressedYears != null && (isAngle || id === "vertex")) {
    return (days: number) => {
      const ut = jdUt(swe, new Date(origin.getTime() + days * 86_400_000));
      return progressedLon(
        progressedAnglesAt(swe, ut, progressedYears + days, latitude, longitude, houseSystem),
        id as AngleId | "vertex",
      );
    };
  }
  if (id === "vertex") {
    return (days: number) => {
      const at = new Date(origin.getTime() + days * 86_400_000);
      const lon = vertexAt(swe, at, latitude, longitude, houseSystem);
      const later = vertexAt(swe, new Date(at.getTime() + 3_600_000), latitude, longitude, houseSystem);
      return { lon, speed: wrap180(later - lon) * 24 };
    };
  }
  if (isAngle) {
    return (days: number) => {
      const at = new Date(origin.getTime() + days * 86_400_000);
      const lon = angleLonAt(swe, at, id, latitude, longitude, houseSystem);
      const later = angleLonAt(
        swe,
        new Date(at.getTime() + 3_600_000),
        id,
        latitude,
        longitude,
        houseSystem,
      );
      return { lon, speed: wrap180(later - lon) * 24 };
    };
  }
  if (id === "fortune" || id === "spirit" || id === "antivertex") return null;
  if (!(id in SWE_BODY)) return null;
  const planet = id as PlanetId;
  if (SWE_BODY[planet](swe) < 0) return null;
  return (days: number) => {
    const at = new Date(origin.getTime() + days * 86_400_000);
    return swissBodyAt(swe, at, planet, flag);
  };
}

function attachExactDates(
  swe: SwissEPH,
  origin: Date,
  flag: number,
  latitude: number,
  longitude: number,
  houseSystem: HouseSystemId,
  moving: Placement[],
  natal: Placement[],
  aspects: AspectLink[],
): AspectLink[] {
  const movingLon = new Map(moving.map((p) => [p.id, p.ecliptic]));
  const natalLon = new Map(natal.map((p) => [p.id, p.ecliptic]));
  return aspects.map((link) => {
    const here = movingLon.get(link.a);
    const natalEcl = natalLon.get(link.b);
    const pos =
      here != null && natalEcl != null ? { movingLon: here, natalLon: natalEcl } : undefined;
    const orb = pos ? Number(residualForType(pos.movingLon, pos.natalLon, link.type).toFixed(4)) : link.orb;
    const next = { ...link, orb };
    if (!isTransitTablePair(next, pos)) {
      return { ...next, exactUtc: next.exactUtc ?? null };
    }
    const lonAt = lonAtFor(swe, origin, link.a, flag, latitude, longitude, houseSystem);
    if (!lonAt || natalEcl == null) return { ...next, applying: false, exactUtc: null };
    try {
      const days = findExactDays({
        lonAt,
        natalLon: natalEcl,
        target: aspectTarget(link.type),
        applying: next.applying,
        maxDays: transitSearchDays(next.a),
      });
      return {
        ...next,
        applying: applyingFromExactDays(days, next.applying),
        exactUtc: days == null ? null : daysToIso(origin, days),
      };
    } catch {
      return { ...next, applying: false, exactUtc: null };
    }
  });
}

const DERIVED_IDS = new Set<PlanetId>(["vertex", "antivertex", "fortune", "spirit"]);

/**
 * The station nearest a moment, within `span` days: the body's speed from
 * Swiss Ephemeris every six hours around it, then halved down to a second
 * where it changes sign. `days` is the station's offset from `ut`; `direct`
 * tells that the body turns direct there (its speed goes from minus to plus).
 */
function stationNear(
  swe: SwissEPH,
  ut: number,
  id: PlanetId,
  flag: number,
  span: number,
): { days: number; direct: boolean; lon: number } | null {
  const ipl = SWE_BODY[id](swe);
  if (ipl < 0) return null;
  const at = (t: number) => calcUt(swe, t, ipl, flag).xx;
  const speedAt = (t: number) => Number(at(t)[3]);
  const step = 0.25;
  let best: { at: number; direct: boolean } | null = null;
  let t0 = ut - span;
  let v0 = speedAt(t0);
  for (let t1 = t0 + step; t1 <= ut + span + 1e-9; t1 += step) {
    const v1 = speedAt(t1);
    if (v0 < 0 !== v1 < 0) {
      let a = t0;
      let b = t1;
      let va = v0;
      while (b - a > 1 / 86_400) {
        const m = (a + b) / 2;
        const vm = speedAt(m);
        if (vm < 0 === va < 0) {
          a = m;
          va = vm;
        } else b = m;
      }
      const mid = (a + b) / 2;
      if (!best || Math.abs(mid - ut) < Math.abs(best.at - ut)) best = { at: mid, direct: v0 < 0 };
    }
    t0 = t1;
    v0 = v1;
  }
  if (!best) return null;
  return { days: best.at - ut, direct: best.direct, lon: wrap360(Number(at(best.at)[0])) };
}

/**
 * The station of a stationary body, for its row: searched within twice its
 * stationary span (STATION_DAYS), since the speed test is a median and a
 * slow station can sit a little further off.
 */
function stationOf(swe: SwissEPH, ut: number, utc: Date, p: Placement, flag: number): Placement["station"] {
  const span = STATION_DAYS[p.id];
  if (!p.stationary || span == null) return undefined;
  try {
    const hit = stationNear(swe, ut, p.id as PlanetId, flag, 2 * span);
    return hit ? { utc: daysToIso(utc, hit.days), direct: hit.direct } : undefined;
  } catch {
    return undefined;
  }
}

/** The station nearest a moment within `span` days (tests: stations against a published calendar). */
export async function stationNearUtc(
  utc: Date,
  id: PlanetId,
  span: number,
): Promise<{ utc: string; direct: boolean; lon: number } | null> {
  const swe = await withEngine((s) => s);
  const ut = jdUt(swe, utc);
  const hit = stationNear(swe, ut, id, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED, span);
  return hit ? { utc: daysToIso(utc, hit.days), direct: hit.direct, lon: hit.lon } : null;
}

/**
 * Without a birth time: where each cast body stands at the start and at the
 * end of the birth day (the noon stand-in ± 12 hours).
 */
function dayRangeOf(swe: SwissEPH, ut: number, flag: number, planets: Placement[]): Partial<Record<PlanetId, [number, number]>> {
  const out: Partial<Record<PlanetId, [number, number]>> = {};
  const r7 = (x: number) => Math.round(x * 1e7) / 1e7;
  for (const p of planets) {
    const id = p.id as PlanetId;
    if (DERIVED_IDS.has(id)) continue;
    const ipl = SWE_BODY[id](swe);
    if (ipl < 0) continue;
    try {
      const lonAt = (t: number) => {
        const lon = wrap360(Number(calcUt(swe, t, ipl, flag).xx[0]));
        return id === "southnode" ? wrap360(lon + 180) : lon;
      };
      out[id] = [r7(lonAt(ut - 0.5)), r7(lonAt(ut + 0.5))];
    } catch {
      // A body Swiss could not place at the day's edges is simply left out.
    }
  }
  return out;
}

/**
 * Every Swiss body for one moment, housed against `cusps`. A body whose
 * ephemeris file is missing is skipped with a warning unless it is one of the
 * ten classical bodies or a node — those still fail the cast.
 */
function collectSwissBodies(
  swe: SwissEPH,
  ut: number,
  flag: number,
  cusps: number[],
  opts: { equatorialFlag?: number } = {},
): { planets: Placement[]; warnings: string[] } {
  const planets: Placement[] = [];
  const warnings: string[] = [];
  let moshier = false;
  for (const id of PLANET_IDS) {
    if (DERIVED_IDS.has(id)) continue;
    const ipl = SWE_BODY[id](swe);
    try {
      const calc = calcUt(swe, ut, ipl, flag);
      if (usedMoshier(swe, calc)) moshier = true;
      const pos = calc.xx;
      let lon = wrap360(Number(pos[0]));
      if (!Number.isFinite(lon)) throw new Error("Swiss returned no longitude");
      const speed = Number(pos[3]);
      let lat = Number(pos[1]);
      let declination: number | undefined;
      if (opts.equatorialFlag != null) {
        try {
          const eq = calcUt(swe, ut, ipl, opts.equatorialFlag);
          declination = Number(eq.xx[1]);
        } catch {
          declination = undefined;
        }
      }
      if (id === "southnode") {
        lon = wrap360(lon + 180);
        if (Number.isFinite(lat)) lat = -lat;
        if (declination != null && Number.isFinite(declination)) declination = -declination;
      }
      planets.push(
        makePlacement(
          id,
          lon,
          houseFromCusps(lon, cusps),
          Number.isFinite(speed) && speed < 0,
          speed,
          opts.equatorialFlag == null
            ? undefined
            : {
                latitude: Number.isFinite(lat) ? lat : undefined,
                declination: Number.isFinite(declination) ? declination : undefined,
              },
        ),
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      if (REQUIRED_BODIES.has(id)) {
        throw new Error(`Swiss Ephemeris failed for ${id}: ${reason}`);
      }
      warnings.push(`W:body.skipped|${id}`);
      console.warn(`[ulune] ${PLANET_META[id]?.name ?? id} could not be placed and was left out (${reason}).`);
    }
  }
  if (moshier) {
    warnings.unshift(W_MOSHIER);
    console.warn(`[ulune] ${MOSHIER_WARNING}`);
  }
  return { planets, warnings };
}

function houseSystemOf(input: BirthInput): HouseSystemId {
  const raw = input.houseSystem;
  return raw && (HOUSE_SYSTEM_IDS as readonly string[]).includes(raw) ? raw : "placidus";
}

/** True obliquity of the ecliptic at a moment (degrees) — the out-of-bounds limit. */
function trueObliquity(swe: SwissEPH, ut: number): number | undefined {
  try {
    const eps = calcUt(swe, ut, swe.SE_ECL_NUT, 0).xx[0];
    return Number.isFinite(eps) ? eps : undefined;
  } catch {
    return undefined;
  }
}

export async function calculateNatal(input: BirthInput): Promise<NatalChart> {
  const dateParts = input.date.split("-").map(Number);
  const year = dateParts[0];
  const month = dateParts[1];
  const day = dateParts[2];
  if (!year || !month || !day) {
    throw new Error("E:birth.date.missing");
  }
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new Error("E:birth.place.missing");
  }

  const swe = await withEngine((s) => s);
  const { utc, info: birthTime } = await resolveBirthMoment(input);
  const timezone = birthTime.zone;
  const ut = jdUt(swe, utc);
  const flag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const eqFlag = swe.SEFLG_SWIEPH | swe.SEFLG_EQUATORIAL | swe.SEFLG_SPEED;
  const timeUnknown = input.timeUnknown === true;

  const frame = housesAt(swe, ut, input.latitude, input.longitude, houseSystemOf(input));
  const houseSystem = frame.houseSystem;
  const cuspEcl = frame.cusps;
  const houseRaw = frame.raw;
  const houses: HouseCusp[] = cuspEcl.map((ecliptic, i) => {
    const id = i + 1;
    return {
      id,
      label: HOUSE_LABELS[i] ?? `House ${id}`,
      sign: signFromEcliptic(ecliptic),
      ecliptic,
      formatted: formatDegree(ecliptic),
      ...(timeUnknown ? { uncertain: true as const } : {}),
    };
  });

  const collected = collectSwissBodies(swe, ut, flag, cuspEcl, { equatorialFlag: eqFlag });
  const planets = collected.planets.map((p) => {
    const station = stationOf(swe, ut, utc, p, flag);
    return station ? { ...p, station } : p;
  });
  const warnings = collected.warnings;
  const dayRange = timeUnknown ? dayRangeOf(swe, ut, flag, planets) : undefined;

  const ascEcl = wrap360(Number(houseRaw.ascmc[0]));
  const mcEcl = wrap360(Number(houseRaw.ascmc[1]));
  const vertexEcl = wrap360(Number(houseRaw.ascmc[3]));
  const dscEcl = wrap360(ascEcl + 180);
  const icEcl = wrap360(mcEcl + 180);
  const antiEcl = wrap360(vertexEcl + 180);
  // House numbers come from the cusps: under whole-sign or equal houses the MC
  // is routinely house 9 or 11, so 1/10/7/4 cannot be assumed.
  const angles: NatalChart["angles"] = {
    ascendant: uncertainIf(
      makePlacement("ascendant", ascEcl, houseFromCusps(ascEcl, cuspEcl), false),
      timeUnknown,
    ),
    midheaven: uncertainIf(
      makePlacement("midheaven", mcEcl, houseFromCusps(mcEcl, cuspEcl), false),
      timeUnknown,
    ),
    descendant: uncertainIf(
      makePlacement("descendant", dscEcl, houseFromCusps(dscEcl, cuspEcl), false),
      timeUnknown,
    ),
    ic: uncertainIf(makePlacement("ic", icEcl, houseFromCusps(icEcl, cuspEcl), false), timeUnknown),
  };
  planets.push(
    uncertainIf(makePlacement("vertex", vertexEcl, houseFromCusps(vertexEcl, cuspEcl), false), timeUnknown),
  );
  planets.push(
    uncertainIf(makePlacement("antivertex", antiEcl, houseFromCusps(antiEcl, cuspEcl), false), timeUnknown),
  );

  const sun = planets.find((p) => p.id === "sun");
  const moon = planets.find((p) => p.id === "moon");
  const armc = Number(houseRaw.ascmc[2]);
  let sunAlt: number | undefined;
  if (sun?.declination != null) {
    try {
      const sunEq = calcUt(swe, ut, swe.SE_SUN, eqFlag).xx;
      sunAlt = altitudeFromEquatorial(input.latitude, Number(sunEq[0]), Number(sunEq[1]), armc);
    } catch {
      sunAlt = undefined;
    }
  }
  const isDay = isDayChart(sun, sunAlt);
  if (sun && moon) {
    const fortuneEcl = arabicLot(isDay, ascEcl, sun.ecliptic, moon.ecliptic, "fortune");
    const spiritEcl = arabicLot(isDay, ascEcl, sun.ecliptic, moon.ecliptic, "spirit");
    planets.push(
      uncertainIf(
        makePlacement("fortune", fortuneEcl, houseFromCusps(fortuneEcl, cuspEcl), false),
        timeUnknown,
      ),
    );
    planets.push(
      uncertainIf(
        makePlacement("spirit", spiritEcl, houseFromCusps(spiritEcl, cuspEcl), false),
        timeUnknown,
      ),
    );
  }
  planets.sort((a, b) => PLANET_IDS.indexOf(a.id as PlanetId) - PLANET_IDS.indexOf(b.id as PlanetId));

  const aspects = computeAspects([...planets, ...Object.values(angles)]);
  const utcIso = utc.toISOString().replace(".000Z", "Z");
  const starBodies = [...planets.filter((p) => ["sun", "moon", "mercury", "venus", "mars"].includes(p.id)), ...Object.values(angles)];
  const obliquity = trueObliquity(swe, ut);
  const stars = fixedStarLongitudes(swe, ut, warnings);

  return {
    meta: {
      name: input.name.trim() || "Natal chart",
      date: input.date,
      time: input.time,
      placeLabel: input.placeLabel,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone,
      utc: utcIso,
      houseSystem,
      ...(frame.requested === houseSystem ? {} : { houseSystemRequested: frame.requested }),
      zodiac: "tropical",
      ephemeris: "swiss",
      lilith: "true",
      ...(timeUnknown ? { timeUnknown: true as const } : {}),
      ...(warnings.length ? { warnings } : {}),
      birthTime,
      calc: CALC_VERSION,
      ...(obliquity != null ? { obliquity } : {}),
      jdUt: ut,
      deltaT: Number((swe.swe_deltat(ut) * 86400).toFixed(2)),
      ...(Number.isFinite(armc) ? { armc } : {}),
      ...(sunAlt != null && Number.isFinite(sunAlt) ? { sunAltitude: sunAlt } : {}),
      ...(dayRange ? { dayRange } : {}),
    },
    angles,
    planets,
    houses,
    aspects,
    patterns: buildPatterns(planets, houses, angles, aspects, { isDay, obliquity, timeUnknown }),
    stars: computeStars(stars, starBodies),
    midpoints: computeMidpoints(planets, angles),
  };
}

/**
 * Apparent ecliptic longitudes of the charted fixed stars at a moment, from
 * Swiss Ephemeris's catalogue (proper motion, precession, nutation and
 * aberration applied) — the same frame as the planets.
 */
function fixedStarLongitudes(swe: SwissEPH, ut: number, warnings: string[]): Partial<Record<StarId, number>> {
  const out: Partial<Record<StarId, number>> = {};
  for (const id of STAR_IDS) {
    try {
      const lon = wrap360(Number(fixstarUt(ut, STAR_META[id].swiss, swe.SEFLG_SWIEPH)[0]));
      if (Number.isFinite(lon)) out[id] = lon;
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      warnings.push(`W:star.unplaced|${id}`);
      console.warn(`[ulune] ${STAR_META[id].name} could not be placed (${reason}).`);
    }
  }
  return out;
}

export type TransitNatalBody = {
  id: BodyId;
  name: string;
  ecliptic: number;
};

export async function calculateTransits(input: {
  utc: Date;
  latitude: number;
  longitude: number;
  natalCusps: number[];
  natalBodies: TransitNatalBody[];
  /** The natal chart's system — the transit Vertex must not fall back to Placidus. */
  houseSystem?: HouseSystemId;
}): Promise<TransitSky> {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new Error("E:birth.place.missing");
  }
  if (input.natalCusps.length !== 12) {
    throw new Error("E:chart.houses.failed");
  }

  const swe = await withEngine((s) => s);
  const utc = input.utc;
  if (Number.isNaN(utc.getTime())) {
    throw new Error("E:chart.moment.invalid");
  }
  const timezone = (await zoneAt(input.latitude, input.longitude)).zone;
  const ut = jdUt(swe, utc);
  const flag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const cuspEcl = input.natalCusps.map((n) => wrap360(n));
  const requested =
    input.houseSystem && (HOUSE_SYSTEM_IDS as readonly string[]).includes(input.houseSystem)
      ? input.houseSystem
      : "placidus";

  const collected = collectSwissBodies(swe, ut, flag, cuspEcl);
  const planets = collected.planets;

  const frame = housesAt(swe, ut, input.latitude, input.longitude, requested);
  const vertexEcl = wrap360(Number(frame.raw.ascmc[3]));
  planets.push(makePlacement("vertex", vertexEcl, houseFromCusps(vertexEcl, cuspEcl), false));
  planets.sort((a, b) => PLANET_IDS.indexOf(a.id as PlanetId) - PLANET_IDS.indexOf(b.id as PlanetId));

  const natal: Placement[] = input.natalBodies.map((row) =>
    makePlacement(row.id, row.ecliptic, houseFromCusps(row.ecliptic, cuspEcl), false, 0),
  );

  const aspects = attachExactDates(
    swe,
    utc,
    flag,
    input.latitude,
    input.longitude,
    frame.houseSystem,
    planets,
    natal,
    computeCrossAspects(planets, natal),
  );

  return {
    meta: {
      utc: utc.toISOString().replace(".000Z", "Z"),
      timezone,
      local: formatLocalMinute(utc, timezone),
      latitude: input.latitude,
      longitude: input.longitude,
      houseSystem: frame.houseSystem,
      ...(collected.warnings.length ? { warnings: collected.warnings } : {}),
    },
    planets,
    aspects,
  };
}

/**
 * One chunk of the scrub window (sky-window.ts): the longitude and speed of
 * every Swiss body the casts use, the apparent sidereal time at Greenwich and
 * the true obliquity, every 12 hours over 32 days from `t0` (a chunk
 * boundary). The same for everyone at that moment, so it can be kept at the
 * edge. A body whose file is missing is left out, as the casts leave it out.
 */
export async function calculateSkyWindow(t0: number): Promise<SkyWindow> {
  if (!Number.isFinite(t0) || chunkStart(t0) !== t0) {
    throw new Error("E:window.start");
  }
  const swe = await withEngine((s) => s);
  const flag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const n = WINDOW_SAMPLES;
  const stepMs = WINDOW_STEP_HOURS * 3_600_000;
  const r7 = (x: number) => Math.round(x * 1e7) / 1e7;
  const uts: number[] = [];
  for (let i = 0; i < n; i += 1) uts.push(jdUt(swe, new Date(t0 + i * stepMs)));
  const st: number[] = [];
  const eps: number[] = [];
  let prev = NaN;
  for (const ut of uts) {
    const raw = wrap360(swe.swe_sidtime(ut) * 15);
    // Twelve hours of sidereal time are about 180.49°: always the forward way round.
    const next = Number.isFinite(prev) ? prev + ((((raw - wrap360(prev)) % 360) + 360) % 360) : raw;
    st.push(r7(next));
    prev = next;
    eps.push(r7(Number(calcUt(swe, ut, swe.SE_ECL_NUT, 0).xx[0])));
  }
  const bodies: Partial<Record<PlanetId, number[]>> = {};
  for (const id of PLANET_IDS) {
    if (DERIVED_IDS.has(id)) continue;
    const ipl = SWE_BODY[id](swe);
    const series: number[] = [];
    try {
      for (const ut of uts) {
        const pos = calcUt(swe, ut, ipl, flag).xx;
        let lon = wrap360(Number(pos[0]));
        const speed = Number(pos[3]);
        if (!Number.isFinite(lon) || !Number.isFinite(speed)) throw new Error("Swiss returned no longitude");
        if (id === "southnode") lon = wrap360(lon + 180);
        series.push(r7(lon), r7(speed));
      }
    } catch (err) {
      if (REQUIRED_BODIES.has(id)) throw err;
      continue;
    }
    bodies[id] = series;
  }
  return { v: CALC_VERSION, t0, step: WINDOW_STEP_HOURS, n, st, eps, bodies };
}

const TIMING_PAIR_SKIP = new Set([
  "northnode|southnode",
  "southnode|northnode",
  "ascendant|descendant",
  "descendant|ascendant",
  "midheaven|ic",
  "ic|midheaven",
]);

/**
 * Every major exact of a moving body to this natal inside [from, to).
 * Same Swiss engine as transits — tropical, true node, osculating Lilith.
 * Never invents a time: a crossing that will not lock to 1′ is dropped.
 */
export async function calculateTiming(input: {
  from: Date;
  to: Date;
  latitude: number;
  longitude: number;
  natalBodies: TransitNatalBody[];
  houseSystem?: HouseSystemId;
}): Promise<TimingCast> {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new Error("E:birth.place.missing");
  }
  const from = input.from;
  const to = input.to;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to.getTime() <= from.getTime()) {
    throw new Error("E:timing.window.invalid");
  }
  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  if (spanDays > 370) {
    throw new Error("E:timing.window.long");
  }

  const swe = await withEngine((s) => s);
  const timezone = (await zoneAt(input.latitude, input.longitude)).zone;
  const flag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const natal = input.natalBodies.filter((row) => TRANSIT_TABLE_NATAL.has(row.id));
  const houseSystem =
    input.houseSystem && (HOUSE_SYSTEM_IDS as readonly string[]).includes(input.houseSystem)
      ? input.houseSystem
      : "placidus";
  const pad = 1.5;
  const fromDays = -pad;
  const toDays = spanDays + pad;
  const hits: TimingHit[] = [];

  for (const movingId of TRANSIT_TABLE_MOVING) {
    const lonAt = lonAtFor(swe, from, movingId, flag, input.latitude, input.longitude, houseSystem);
    if (!lonAt) continue;
    const step = sampleStepDays(movingId);
    const samples: LonSample[] = [];
    for (let d = fromDays; d <= toDays + 1e-9; d += step) {
      const pos = lonAt(d);
      if (!Number.isFinite(pos.lon)) break;
      samples.push({ days: d, lon: pos.lon, speed: pos.speed });
    }
    const end = lonAt(toDays);
    if (Number.isFinite(end.lon) && (samples[samples.length - 1]?.days ?? -Infinity) < toDays - 1e-6) {
      samples.push({ days: toDays, lon: end.lon, speed: end.speed });
    }
    if (samples.length < 2) continue;

    for (const natalBody of natal) {
      if (TIMING_PAIR_SKIP.has(`${movingId}|${natalBody.id}`)) continue;
      if (!Number.isFinite(natalBody.ecliptic)) continue;
      for (const type of MAJOR_ASPECT_IDS) {
        const target = aspectTarget(type);
        for (const pole of aspectPoles(target)) {
          const daysHits = findExactsFromSamples({
            samples,
            lonAt,
            natalLon: natalBody.ecliptic,
            target,
            pole,
            minDays: 0,
            maxDays: spanDays,
          });
          for (const days of daysHits) {
            if (days < -1e-6 || days >= spanDays) continue;
            const exactUtc = daysToIso(from, days);
            hits.push({
              id: timingExactId(movingId, type, natalBody.id, exactUtc),
              moving: movingId,
              natal: natalBody.id,
              type,
              exactUtc,
            });
          }
        }
      }
    }
  }

  hits.sort((a, b) => Date.parse(a.exactUtc) - Date.parse(b.exactUtc) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const unique = hits.filter((h) => {
    const key = `${h.moving}|${h.type}|${h.natal}|${h.exactUtc.slice(0, 16)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    meta: {
      from: from.toISOString().replace(/\.\d{3}Z$/, "Z"),
      to: to.toISOString().replace(/\.\d{3}Z$/, "Z"),
      timezone,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    hits: unique,
  };
}

function attachProgressedExacts(
  swe: SwissEPH,
  progressedOrigin: Date,
  targetUtc: Date,
  years: number,
  flag: number,
  latitude: number,
  longitude: number,
  houseSystem: HouseSystemId,
  moving: Placement[],
  natal: Placement[],
  aspects: AspectLink[],
): AspectLink[] {
  const movingLon = new Map(moving.map((p) => [p.id, p.ecliptic]));
  const natalLon = new Map(natal.map((p) => [p.id, p.ecliptic]));
  return aspects.map((link) => {
    const here = movingLon.get(link.a);
    const natalEcl = natalLon.get(link.b);
    const pos =
      here != null && natalEcl != null ? { movingLon: here, natalLon: natalEcl } : undefined;
    const orb = pos ? Number(residualForType(pos.movingLon, pos.natalLon, link.type).toFixed(4)) : link.orb;
    const next = { ...link, orb };
    if (!isProgressionTablePair(next, pos)) {
      return { ...next, exactUtc: next.exactUtc ?? null };
    }
    const lonAt = lonAtFor(swe, progressedOrigin, link.a, flag, latitude, longitude, houseSystem, years);
    if (!lonAt || natalEcl == null) return { ...next, applying: false, exactUtc: null };
    try {
      const days = findExactDays({
        lonAt,
        natalLon: natalEcl,
        target: aspectTarget(link.type),
        applying: next.applying,
        maxDays: transitSearchDays(next.a),
      });
      return {
        ...next,
        applying: applyingFromExactDays(days, next.applying),
        exactUtc: days == null ? null : lifeExactIso(targetUtc, days),
      };
    } catch {
      return { ...next, applying: false, exactUtc: null };
    }
  });
}

/**
 * Secondary progressions (day-for-a-year). Swiss tropical, true node, osculating
 * Lilith. Progressed UT = natal UT + (target − birth) / 365.24219. The angles
 * and the Vertex advance at the Naibod rate in right ascension (0°59′08″ a
 * year of life), with the houses of the birthplace.
 * Exact dates are life-calendar moments — never invented if the pass will not lock to 1′.
 */
export async function calculateProgressions(input: {
  natalUtc: Date;
  targetUtc: Date;
  latitude: number;
  longitude: number;
  natalCusps: number[];
  natalBodies: TransitNatalBody[];
  houseSystem?: HouseSystemId;
}): Promise<ProgressedSky> {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new Error("A birth place is required to house this progression.");
  }
  if (input.natalCusps.length !== 12) {
    throw new Error("E:chart.houses.failed");
  }
  const natalUtc = input.natalUtc;
  const targetUtc = input.targetUtc;
  if (Number.isNaN(natalUtc.getTime()) || Number.isNaN(targetUtc.getTime())) {
    throw new Error("E:chart.moment.invalid");
  }

  const swe = await withEngine((s) => s);
  const progressed = progressedUtcFromNatal(natalUtc, targetUtc);
  const years = yearsOfLife(natalUtc, targetUtc);
  const timezone = (await zoneAt(input.latitude, input.longitude)).zone;
  const requested =
    input.houseSystem && (HOUSE_SYSTEM_IDS as readonly string[]).includes(input.houseSystem)
      ? input.houseSystem
      : "placidus";
  const ut = jdUt(swe, progressed);
  const flag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const cuspEcl = input.natalCusps.map((n) => wrap360(n));

  const collected = collectSwissBodies(swe, ut, flag, cuspEcl);
  const planets = collected.planets;

  // The system the houses can be built with here (Porphyry inside the polar
  // circles); the progressed angles and Vertex come from the Naibod ARMC.
  const frame = housesAt(swe, ut, input.latitude, input.longitude, requested);
  const houseSystem = frame.houseSystem;
  const prog = progressedAnglesAt(swe, ut, years, input.latitude, input.longitude, houseSystem);
  const vertexEcl = prog.vertex;
  planets.push(makePlacement("vertex", vertexEcl, houseFromCusps(vertexEcl, cuspEcl), false));
  planets.sort((a, b) => PLANET_IDS.indexOf(a.id as PlanetId) - PLANET_IDS.indexOf(b.id as PlanetId));

  const ascEcl = prog.asc;
  const mcEcl = prog.mc;
  const ascSpeed = prog.ascSpeed;
  const mcSpeed = prog.mcSpeed;
  const dscEcl = wrap360(ascEcl + 180);
  const icEcl = wrap360(mcEcl + 180);
  // Progressed angles are housed against the natal cusps, same rule as bodies.
  const angles: ProgressedSky["angles"] = {
    ascendant: makePlacement("ascendant", ascEcl, houseFromCusps(ascEcl, cuspEcl), ascSpeed < 0, ascSpeed),
    midheaven: makePlacement("midheaven", mcEcl, houseFromCusps(mcEcl, cuspEcl), mcSpeed < 0, mcSpeed),
    descendant: makePlacement("descendant", dscEcl, houseFromCusps(dscEcl, cuspEcl), ascSpeed < 0, ascSpeed),
    ic: makePlacement("ic", icEcl, houseFromCusps(icEcl, cuspEcl), mcSpeed < 0, mcSpeed),
  };

  const natal: Placement[] = input.natalBodies.map((row) =>
    makePlacement(row.id, row.ecliptic, houseFromCusps(row.ecliptic, cuspEcl), false, 0),
  );
  const moving: Placement[] = [...planets, ...ANGLE_IDS.map((id) => angles[id])];
  const aspects = attachProgressedExacts(
    swe,
    progressed,
    targetUtc,
    years,
    flag,
    input.latitude,
    input.longitude,
    houseSystem,
    moving,
    natal,
    computeCrossAspects(moving, natal, { idPrefix: "p", skipAxes: false }),
  );

  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  return {
    meta: {
      natalUtc: iso(natalUtc),
      targetUtc: iso(targetUtc),
      progressedUtc: iso(progressed),
      timezone,
      local: formatLocalMinute(targetUtc, timezone),
      latitude: input.latitude,
      longitude: input.longitude,
      tropicalYearDays: TROPICAL_YEAR_DAYS,
      method: "secondary",
      yearsOfLife: years,
      houseSystem,
      ...(frame.requested === houseSystem ? {} : { houseSystemRequested: frame.requested }),
      ...(collected.warnings.length ? { warnings: collected.warnings } : {}),
    },
    planets,
    angles,
    aspects,
  };
}

function swissLonAt(swe: SwissEPH, jd: number, ipl: number, flag: number): number {
  const pos = calcUt(swe, jd, ipl, flag).xx;
  const lon = wrap360(Number(pos[0]));
  if (!Number.isFinite(lon)) {
    throw new Error("Swiss returned no usable longitude for this body.");
  }
  return lon;
}

function hdPlanetIpl(swe: SwissEPH, id: HdBodyId): number | null {
  switch (id) {
    case "sun":
      return swe.SE_SUN;
    case "moon":
      return swe.SE_MOON;
    case "mercury":
      return swe.SE_MERCURY;
    case "venus":
      return swe.SE_VENUS;
    case "mars":
      return swe.SE_MARS;
    case "jupiter":
      return swe.SE_JUPITER;
    case "saturn":
      return swe.SE_SATURN;
    case "uranus":
      return swe.SE_URANUS;
    case "neptune":
      return swe.SE_NEPTUNE;
    case "pluto":
      return swe.SE_PLUTO;
    default:
      return null;
  }
}

function hdBodiesAt(swe: SwissEPH, jd: number, flag: number, layer: "personality" | "design"): HdActivation[] {
  const rows: HdActivation[] = [];
  // The true node, as Jovian Archive's charts use it (a third-party check
  // against a real Jovian chart matched all four node rows with the true
  // node and none with the mean one; GOLDENS.md). The same node as the
  // birth chart's, so the bodygraph and the natal table agree.
  const node = swissLonAt(swe, jd, swe.SE_TRUE_NODE, flag);
  const sun = swissLonAt(swe, jd, swe.SE_SUN, flag);
  for (const id of HD_BODY_IDS) {
    let lon: number;
    // Sun and Earth come from the one Sun evaluation, so they are exactly
    // opposite and can never land 1 ulp apart on a gate boundary; the same
    // for the two Nodes.
    if (id === "sun") lon = sun;
    else if (id === "earth") lon = wrap360(sun + 180);
    else if (id === "northnode") lon = node;
    else if (id === "southnode") lon = wrap360(node + 180);
    else {
      const ipl = hdPlanetIpl(swe, id);
      if (ipl == null) continue;
      lon = swissLonAt(swe, jd, ipl, flag);
    }
    rows.push(activationOf(id, layer, lon));
  }
  return rows;
}

/** The Design moment sits this far back in solar longitude, never in days. */
const HD_DESIGN_ARC_DEG = 88;

/**
 * Accepted residual on that arc. The search runs on the millisecond grid that
 * `designUtc` is published on, so all that is left is half a millisecond of
 * solar motion (~6e-9°); 1e-6° keeps two orders of margin. The old gate was
 * 1″ — 3600× looser, wide enough to hide a bad bracket.
 */
const HD_DESIGN_TOLERANCE_DEG = 1e-6;

/** Sun longitude and its daily longitude speed at a UTC instant. */
function hdSunAt(swe: SwissEPH, ms: number, flag: number): { lon: number; speed: number } {
  const pos = calcUt(swe, jdUt(swe, new Date(ms)), swe.SE_SUN, flag).xx;
  const lon = wrap360(Number(pos[0]));
  const speed = Number(pos[3]);
  if (!Number.isFinite(lon) || !Number.isFinite(speed) || speed <= 0) {
    throw new Error("Swiss returned no usable Sun for the Design search.");
  }
  return { lon, speed };
}

/**
 * The instant the Sun sat on `target`, solved in epoch milliseconds rather
 * than in Julian days.
 *
 * Solving in JD and converting back to a `Date` afterwards reports a moment we
 * never evaluated: `Date` carries only whole milliseconds, and
 * `(designJd - personalityJd) × 86400000` is the elapsed UTC time only if
 * Swiss's UTC→JD conversion has no leap second inside the ~89-day span.
 * Searching on the published grid makes the timestamp and the longitudes come
 * from the same evaluation, which the golden round-trip then enforces.
 */
function hdDesignMs(swe: SwissEPH, personalityMs: number, target: number, flag: number): { ms: number; residual: number } {
  const day = 86_400_000;
  const diffAt = (ms: number) => wrap180(hdSunAt(swe, ms, flag).lon - target);
  // 88° of solar arc takes 86.4 days near perihelion and 92.0 near aphelion,
  // so 80–100 days back always straddles the root. Check it rather than
  // trust it: a silently one-sided bracket is what lets bisection converge
  // confidently onto the wrong instant.
  let lo = personalityMs - 100 * day;
  let hi = personalityMs - 80 * day;
  if (diffAt(lo) >= 0 || diffAt(hi) <= 0) {
    throw new Error("The Design Sun search window does not contain 88° of solar arc.");
  }

  let ms = Math.round((lo + hi) / 2);
  // Newton against the Sun's own reported longitude speed. The Sun moves a
  // smooth ~1°/day, so this reaches the millisecond in three or four Swiss
  // calls where the old blind bisection spent sixty and still stalled on
  // float resolution. The bracket is kept as the guard rail: any step that
  // leaves it falls back to bisection, which alone needs 31 halvings here.
  for (let i = 0; i < 40 && hi - lo > 1; i += 1) {
    const { lon, speed } = hdSunAt(swe, ms, flag);
    const diff = wrap180(lon - target);
    if (diff < 0) lo = ms;
    else hi = ms;
    let next = Math.round(ms - (diff / speed) * day);
    if (next <= lo || next >= hi) next = Math.round((lo + hi) / 2);
    if (next <= lo || next >= hi) break;
    ms = next;
  }

  // Down to two adjacent milliseconds straddling the arc; publish the closer.
  const dLo = Math.abs(diffAt(lo));
  const dHi = Math.abs(diffAt(hi));
  return dLo <= dHi ? { ms: lo, residual: dLo } : { ms: hi, residual: dHi };
}

/** Both layers for one birth instant: the Design moment solved, then 13 bodies at each. */
function hdCastAt(swe: SwissEPH, flag: number, natalMs: number) {
  const personalityJd = jdUt(swe, new Date(natalMs));
  const personalitySun = swissLonAt(swe, personalityJd, swe.SE_SUN, flag);
  const target = wrap360(personalitySun - HD_DESIGN_ARC_DEG);
  const solved = hdDesignMs(swe, natalMs, target, flag);
  if (solved.residual > HD_DESIGN_TOLERANCE_DEG) {
    throw new Error("The Design Sun could not be locked to 88° of solar arc.");
  }
  const designJd = jdUt(swe, new Date(solved.ms));
  const designSun = swissLonAt(swe, designJd, swe.SE_SUN, flag);
  const activations = [...hdBodiesAt(swe, personalityJd, flag, "personality"), ...hdBodiesAt(swe, designJd, flag, "design")];
  return { designMs: solved.ms, personalitySun, designSun, activations };
}

/** An arrow keeps its colour and side this far either side of the birth time, or it is marked. */
const HD_TONE_WINDOW_MS = 30 * 60_000;
/** Without a birth time, the day is sampled this often. */
const HD_SPAN_STEP_MS = 60 * 60_000;

/**
 * Human Design Personality + Design from natal UT.
 * Design is the UT when the Sun was exactly 88° of ecliptic longitude before
 * the personality Sun (88° solar arc — not a frozen 88 days).
 *
 * With `spanMinutes` (no birth time: the chart is cast at noon and the day is
 * ±12 h), the day is cast every hour as well, and `uncertain` lists what
 * could differ: the rows whose gate or line changes, the keys, the defined
 * channels. With a birth time, `toneSteady` says whether each arrow keeps its
 * colour and its side half an hour either side.
 */
export async function calculateHumanDesign(input: { natalUtc: Date; spanMinutes?: number }): Promise<HumanDesignChart> {
  const natalUtc = input.natalUtc;
  if (Number.isNaN(natalUtc.getTime())) {
    throw new Error("Could not read this birth moment.");
  }
  const swe = await withEngine((s) => s);
  const flag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const natalMs = natalUtc.getTime();
  const main = hdCastAt(swe, flag, natalMs);

  const chart = buildHumanDesignChart({
    personalityUtc: natalUtc.toISOString().replace(".000Z", "Z"),
    designUtc: new Date(main.designMs).toISOString().replace(".000Z", "Z"),
    personalitySun: main.personalitySun,
    designSun: main.designSun,
    activations: main.activations,
  });

  const span = Math.max(0, Math.min(720, Math.round(input.spanMinutes ?? 0))) * 60_000;
  if (span > 0) {
    const others: HumanDesignChart[] = [];
    for (let dt = -span; dt <= span; dt += HD_SPAN_STEP_MS) {
      if (dt === 0) continue;
      const at = hdCastAt(swe, flag, natalMs + dt);
      others.push(
        buildHumanDesignChart({
          personalityUtc: chart.personalityUtc,
          designUtc: chart.designUtc,
          personalitySun: at.personalitySun,
          designSun: at.designSun,
          activations: at.activations,
        }),
      );
    }
    chart.uncertain = hdUncertainOf(chart, others, span / 60_000);
  } else {
    // An arrow is steady when half an hour either side it keeps its colour
    // and its side (left for tones 1 to 3, right for 4 to 6): the Sun moves
    // one tone in about 38 minutes, but one side in about two hours.
    const steady: Partial<Record<HdArrowId, boolean>> = {};
    const around = [hdCastAt(swe, flag, natalMs - HD_TONE_WINDOW_MS), hdCastAt(swe, flag, natalMs + HD_TONE_WINDOW_MS)];
    for (const arrow of HD_ARROWS) {
      const arrowAt = (acts: HdActivation[]) => {
        const row = acts.find((r) => r.layer === arrow.layer && r.body === arrow.body);
        if (!row) return "";
        const fine = hdFineOf(row.ecliptic);
        return `${fine.color}${hdArrowLeft(fine.tone) ? "L" : "R"}`;
      };
      const here = arrowAt(main.activations);
      steady[arrow.id] = around.every((c) => arrowAt(c.activations) === here);
    }
    chart.toneSteady = steady as Record<HdArrowId, boolean>;
  }
  return chart;
}
