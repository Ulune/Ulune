/**
 * The chart calculations on Ulune's server: the engine module every place
 * runs (src/lib/engine/calculate.ts, on-device plan, step 1) with the
 * server's own file access and time zones. The engine reads its WebAssembly
 * and its ephemeris files from this disk, every file mounted when it starts;
 * a birthplace's zone comes from geo-tz's map (birth-time.server.ts). A
 * reader's device runs the same calculations in a worker, its files fetched
 * from Ulune's own address (src/lib/engine/worker.ts), and gets the same
 * results to the last digit.
 *
 * The exports and their signatures are the server's from before the split:
 * the server functions (functions.ts), the sky routes and the tests call them.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Calculator,
  type HumanDesignInput,
  type ProgressionInput,
  type TimingInput,
  type TransitInput,
  type Zones,
} from "../engine/calculate";
import { ENGINE_UNAVAILABLE, type EngineFiles } from "../engine/swiss";
import { zoneAt } from "./birth-time.server";
import type { BirthInput, PlanetId } from "./types";

export type { TransitNatalBody } from "../engine/calculate";

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
    throw new Error(ENGINE_UNAVAILABLE);
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

/** The server's files: read from this disk, all of them mounted when the engine starts. */
function diskFiles(): EngineFiles {
  let found = new Map<string, string>();
  return {
    startup: "all",
    async names() {
      found = collectEpheFiles();
      return [...found.keys()];
    },
    async wasm() {
      return readFileSync(wasmFile());
    },
    async read(name) {
      const path = found.get(name);
      if (!path) throw new Error(`Ephemeris file ${name} not found.`);
      return Uint8Array.from(readFileSync(path));
    },
  };
}

const calculator = new Calculator(diskFiles());

/** A place's zone from geo-tz's map, the geocoder's zone as a tie-break. */
const serverZones: Zones = { zoneAt };

export function calculateNatal(input: BirthInput) {
  return calculator.calculateNatal(input, serverZones);
}

export function calculateTransits(input: TransitInput) {
  return calculator.calculateTransits(input, serverZones);
}

/** One chunk of the scrub window (sky-window.ts), the same for everyone at that moment. */
export function calculateSkyWindow(t0: number) {
  return calculator.calculateSkyWindow(t0);
}

/** The year's sky file (sky-year.ts), the same for everyone. */
export function calculateSkyYear(year: number) {
  return calculator.calculateSkyYear(year);
}

/** Every major exact of a moving body to a natal inside [from, to) (the reference the calendar's tests check). */
export function calculateTiming(input: TimingInput) {
  return calculator.calculateTiming(input, serverZones);
}

export function calculateProgressions(input: ProgressionInput) {
  return calculator.calculateProgressions(input, serverZones);
}

export function calculateHumanDesign(input: HumanDesignInput) {
  return calculator.calculateHumanDesign(input);
}

/** The station nearest a moment within `span` days (tests: stations against a published calendar). */
export function stationNearUtc(utc: Date, id: PlanetId, span: number) {
  return calculator.stationNearUtc(utc, id, span);
}
