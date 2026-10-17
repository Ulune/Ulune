/**
 * The Swiss Ephemeris engine (sweph-wasm's WebAssembly build) with its
 * ephemeris files mounted: one engine for Ulune's server and for a reader's
 * device (on-device plan, step 1). Only the way files are read differs,
 * handed in as an EngineFiles: the server reads its disk and mounts every
 * file at once (lib/chart/calculate.server.ts); a browser's worker reads its
 * cache or Ulune's own address and starts with 1800–2399 (files-browser.ts).
 * No Node built-ins and no server code here.
 *
 * Swiss opens an ephemeris file only when a date needs it. The engine
 * watches those openings: when Swiss asked for a file the source has but the
 * engine had not mounted (an earlier era, on a device), the calculation runs
 * again with it (`run`), so a result never depends on which files were held.
 *
 * Every calculation also starts from the same state: Swiss keeps the last
 * file and the last stretch of coefficients it read for each body, and near
 * the start of an era (1800, 1200…) two files overlap by weeks and a slow
 * body's stretch reaches years past it, so an answer there used to depend on
 * the requests before it (up to 0.007″ for an asteroid, a few seconds on a
 * slow body's exact time). Setting the ephemeris path again lets all of that
 * go (the fixed stars' catalogue stays read), at no measurable cost: an answer
 * is now a function of its request alone, on the server and on every device.
 */
import SwissEPH from "sweph-wasm";
import createModule from "sweph-wasm/wasm/swisseph";
import { REQUIRED_FILES } from "./eras";

export type WasmMod = {
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
    open: (path: unknown, flags?: unknown, mode?: unknown) => unknown;
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
  _swe_sol_eclipse_when_glob: (tjdStart: number, ifl: number, ifltype: number, tret: number, backward: number, serr: number) => number;
  _swe_lun_eclipse_when: (tjdStart: number, ifl: number, ifltype: number, tret: number, backward: number, serr: number) => number;
  _swe_sol_eclipse_where: (tjdUt: number, ifl: number, geopos: number, attr: number, serr: number) => number;
  _swe_lun_eclipse_how: (tjdUt: number, ifl: number, geopos: number, attr: number, serr: number) => number;
};

/** Where the engine's files come from. */
export type EngineFiles = {
  /** swisseph.wasm: its bytes, or a module already compiled (a browser compiles it as it downloads). */
  wasm(): Promise<Uint8Array | WebAssembly.Module>;
  /** The ephemeris files this source has, by Swiss's own names (sepl_18.se1, sefstars.txt…). */
  names(): Promise<readonly string[]>;
  /** One of them, whole. */
  read(name: string): Promise<Uint8Array>;
  /** Mounted when the engine starts: every file the source has (the server), or these (a device). */
  startup: "all" | readonly string[];
  /** Read several at once (a browser fetches them side by side); one by one otherwise. */
  readMany?(names: readonly string[]): Promise<Uint8Array[]>;
};

/** The message an engine without its files fails with (the server's casts translate it). */
export const ENGINE_UNAVAILABLE = "The chart engine could not be loaded on this server.";

const EPHE_DIR = "/ephe";

/** The sweph-wasm wrapper's own WebAssembly module (public on the class; typed here). */
export function wasmOf(swe: SwissEPH): WasmMod {
  return (swe as unknown as { wasm: WasmMod }).wasm;
}

function mountFile(wasm: WasmMod, name: string, bytes: Uint8Array) {
  const dest = `${EPHE_DIR}/${name}`;
  if (wasm.FS.analyzePath(dest).exists) wasm.FS.unlink(dest);
  wasm.FS.createDataFile(EPHE_DIR, name, bytes, true, true, true);
  const size = wasm.FS.stat(dest).size;
  if (size < 1024) {
    throw new Error(`Ephemeris file ${name} failed to mount (${size} bytes).`);
  }
}

/** The probe every calculation starts from: the Sun at J2000 from the files (the engine is alive). */
function probe(swe: SwissEPH) {
  swe.swe_calc_ut(2451545.0, swe.SE_SUN, swe.SEFLG_SWIEPH);
}

/** Point Swiss at the mounted files; done again, it closes them and forgets what it read from them. */
function setEphePath(wasm: WasmMod) {
  const ptr = wasm._malloc(EPHE_DIR.length + 1);
  wasm.stringToUTF8(EPHE_DIR, ptr, EPHE_DIR.length + 1);
  wasm._swe_set_ephe_path(ptr);
  wasm._free(ptr);
}

/**
 * Swiss fell back to its Moshier approximation for this result: the flags it
 * really computed with say so (no file covered the date).
 */
function moshierFlag(swe: SwissEPH, flag: number): boolean {
  return (flag & swe.SEFLG_SWIEPH) === 0 && (flag & swe.SEFLG_MOSEPH) !== 0;
}

/** One engine: the WebAssembly module, its files, and the calculations' runner. */
export class Ephemeris {
  readonly swe: SwissEPH;
  readonly wasm: WasmMod;
  private readonly files: EngineFiles;
  private readonly have: Set<string>;
  private readonly mounted = new Set<string>();
  /** Ephemeris files Swiss tried to open and did not find, since the last `run` began. */
  private readonly asked = new Set<string>();

  private constructor(swe: SwissEPH, files: EngineFiles, have: readonly string[]) {
    this.swe = swe;
    this.wasm = wasmOf(swe);
    this.files = files;
    this.have = new Set(have);
  }

  /**
   * Start an engine: the required files checked, the WebAssembly
   * instantiated, the startup files mounted, then a probe that must come from
   * the files (not Moshier) or the engine is refused.
   */
  static async start(files: EngineFiles): Promise<Ephemeris> {
    const have = await files.names();
    if (!REQUIRED_FILES.every((name) => have.includes(name))) throw new Error(ENGINE_UNAVAILABLE);
    const startup = files.startup === "all" ? have : files.startup.filter((name) => have.includes(name));
    const [binary, bytes] = await Promise.all([files.wasm(), readAll(files, startup)]);
    // The glue's hook for a module compiled already has no way to fail: a refusal ends the start here.
    let refused: (err: unknown) => void = () => {};
    const refusal = new Promise<never>((_, reject) => {
      refused = reject;
    });
    const options =
      binary instanceof WebAssembly.Module
        ? {
            instantiateWasm: (imports: WebAssembly.Imports, receive: (instance: WebAssembly.Instance) => void) => {
              WebAssembly.instantiate(binary, imports).then((instance) => receive(instance), refused);
              return {};
            },
          }
        : { wasmBinary: binary };
    const wasm = (await Promise.race([createModule(options as never), refusal])) as unknown as WasmMod;
    try {
      wasm.FS.mkdir(EPHE_DIR);
    } catch {
      /* exists */
    }
    const swe = new SwissEPH(wasm as never);
    const engine = new Ephemeris(swe, files, have);
    startup.forEach((name, i) => engine.mountOne(name, bytes[i]));
    engine.watchOpenings();
    setEphePath(wasm);
    const first = calcUt(swe, 2451545.0, swe.SE_SUN, swe.SEFLG_SWIEPH);
    if (!Number.isFinite(first.xx[0]) || moshierFlag(swe, first.flag)) {
      throw new Error("Swiss Ephemeris failed to initialize.");
    }
    return engine;
  }

  /** Still answering (a probe that throws means a broken module: start another). */
  alive(): boolean {
    try {
      probe(this.swe);
      return true;
    } catch {
      return false;
    }
  }

  /** The files mounted so far. */
  held(): string[] {
    return [...this.mounted];
  }

  /** Mount these files, those the source has and the engine does not hold yet. */
  async mount(names: readonly string[]): Promise<void> {
    const want = [...new Set(names)].filter((name) => this.have.has(name) && !this.mounted.has(name));
    if (!want.length) return;
    const bytes = await readAll(this.files, want);
    want.forEach((name, i) => this.mountOne(name, bytes[i]));
  }

  /**
   * Run a calculation on this engine, from Swiss's starting state (no file
   * open, nothing remembered, then the probe). When Swiss asked for an
   * ephemeris file the source has but the engine had not mounted, the file is
   * mounted and the calculation runs again from that same state: its result
   * is then the one an engine holding every file gives. On the server every
   * file is mounted, so it runs once.
   */
  async run<T>(compute: (swe: SwissEPH) => T | Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      setEphePath(this.wasm);
      probe(this.swe);
      this.asked.clear();
      let out: T;
      try {
        out = await compute(this.swe);
      } catch (err) {
        const need = this.missing();
        if (!need.length || attempt >= 3) throw err;
        await this.mount(need);
        continue;
      }
      const need = this.missing();
      if (!need.length || attempt >= 3) return out;
      await this.mount(need);
    }
  }

  private missing(): string[] {
    return [...this.asked].filter((name) => this.have.has(name) && !this.mounted.has(name));
  }

  private mountOne(name: string, bytes: Uint8Array) {
    mountFile(this.wasm, name, bytes);
    this.mounted.add(name);
  }

  /** Note every ephemeris file Swiss tries to open that is not there. */
  private watchOpenings() {
    const fs = this.wasm.FS;
    const open = fs.open;
    const asked = this.asked;
    fs.open = function (path: unknown, flags?: unknown, mode?: unknown) {
      try {
        return open.call(fs, path, flags, mode);
      } catch (err) {
        if (typeof path === "string" && path.startsWith(`${EPHE_DIR}/`)) asked.add(path.slice(EPHE_DIR.length + 1));
        throw err;
      }
    };
  }
}

async function readAll(files: EngineFiles, names: readonly string[]): Promise<Uint8Array[]> {
  if (!names.length) return [];
  if (files.readMany) return files.readMany(names);
  const out: Uint8Array[] = [];
  for (const name of names) out.push(await files.read(name));
  return out;
}

export type SweCalc = {
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
export function calcUt(swe: SwissEPH, tjdUt: number, ipl: number, iflag: number): SweCalc {
  const wasm = wasmOf(swe);
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
export function fixstarUt(swe: SwissEPH, tjdUt: number, name: string, iflag: number): number[] {
  const wasm = wasmOf(swe);
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
export function usedMoshier(swe: SwissEPH, calc: SweCalc): boolean {
  return moshierFlag(swe, calc.flag);
}
