/**
 * The scrub window: Swiss positions and speeds of every body at fixed steps,
 * so a sky can be drawn at any moment in between without asking the server
 * (dragging the time scrubber, Play, the progressions slider). Between two
 * samples a body follows the cubic Hermite curve through both positions and
 * both speeds: at 12-hour steps it stays within 0.03″ of Swiss for the Moon
 * and far closer for everything slower (osculating Lilith, the jumpiest
 * point, within about 0.5″). The angles and the Vertex are not interpolated:
 * they are rebuilt from the interpolated sidereal time and obliquity with the
 * same formulas Swiss uses. Every number that stays on screen still comes
 * from Swiss: the exact cast replaces the provisional sky once time settles.
 *
 * A window carries no personal data (the sky is the same for everyone), so
 * the server hands out fixed chunks that the edge and the browser can keep.
 */
import { computeCrossAspects, houseFromCusps, wrap180, wrap360 } from "./anatomy";
import { makePlacement } from "./placement";
import { NAIBOD_DEG_PER_YEAR, progressedArmc } from "./progressions";
import type { AngleId, BodyId, Placement, PlanetId, ProgressedSky, TransitSky } from "./types";
import { PLANET_IDS } from "./types";

/** Hours between samples. */
export const WINDOW_STEP_HOURS = 12;
/** Days per chunk (a chunk holds both ends: 65 samples). */
export const WINDOW_CHUNK_DAYS = 32;
const DAY_MS = 86_400_000;
const CHUNK_MS = WINDOW_CHUNK_DAYS * DAY_MS;
const STEP_MS = WINDOW_STEP_HOURS * 3_600_000;
/** Chunks start on multiples of 32 days from this epoch (UTC midnight, 1 Jan 2000). */
const EPOCH_MS = Date.UTC(2000, 0, 1);
export const WINDOW_SAMPLES = (WINDOW_CHUNK_DAYS * 24) / WINDOW_STEP_HOURS + 1;

/** One chunk as the server sends it. */
export type SkyWindow = {
  /** The calculation version it was made with (constants.ts CALC_VERSION). */
  v: number;
  /** First sample, ms UTC (a chunk boundary). */
  t0: number;
  /** Hours between samples. */
  step: number;
  /** Samples per series. */
  n: number;
  /** Apparent sidereal time at Greenwich, degrees, unwrapped (increasing). */
  st: number[];
  /** True obliquity of the ecliptic, degrees. */
  eps: number[];
  /** Per body: [lon0, speed0, lon1, speed1, …], degrees and degrees per day. */
  bodies: Partial<Record<PlanetId, number[]>>;
};

/** Where the chunk holding `ms` starts. */
export function chunkStart(ms: number): number {
  return EPOCH_MS + Math.floor((ms - EPOCH_MS) / CHUNK_MS) * CHUNK_MS;
}

/** Whether `ms` lies inside this chunk (its last sample included). */
export function covers(win: SkyWindow, ms: number): boolean {
  return ms >= win.t0 && ms <= win.t0 + (win.n - 1) * win.step * 3_600_000;
}

/** Sample index and fraction for a moment inside the chunk. */
function locate(win: SkyWindow, ms: number): { i: number; u: number; h: number } {
  const stepMs = win.step * 3_600_000;
  const x = (ms - win.t0) / stepMs;
  const i = Math.min(win.n - 2, Math.max(0, Math.floor(x)));
  return { i, u: x - i, h: stepMs / DAY_MS };
}

/**
 * Cubic Hermite between two samples (positions unwrapped across 0°):
 * position and speed at a fraction `u` of a step `h` days long.
 */
export function hermite(lon0: number, v0: number, lon1: number, v1: number, u: number, h: number): { lon: number; speed: number } {
  const p1 = lon0 + wrap180(lon1 - lon0);
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  const lon = h00 * lon0 + h10 * h * v0 + h01 * p1 + h11 * h * v1;
  // d/du of the same curve, per day.
  const d00 = 6 * u2 - 6 * u;
  const d10 = 3 * u2 - 4 * u + 1;
  const d01 = -6 * u2 + 6 * u;
  const d11 = 3 * u2 - 2 * u;
  const speed = (d00 * lon0 + d10 * h * v0 + d01 * p1 + d11 * h * v1) / h;
  return { lon: wrap360(lon), speed };
}

/** A body's longitude and speed at `ms`, or null when the chunk lacks it. */
export function bodyAt(win: SkyWindow, id: PlanetId, ms: number): { lon: number; speed: number } | null {
  const s = win.bodies[id];
  if (!s) return null;
  const { i, u, h } = locate(win, ms);
  const lon0 = s[2 * i];
  const v0 = s[2 * i + 1];
  const lon1 = s[2 * i + 2];
  const v1 = s[2 * i + 3];
  if (![lon0, v0, lon1, v1].every(Number.isFinite)) return null;
  return hermite(lon0, v0, lon1, v1, u, h);
}

/** Apparent sidereal time at Greenwich (degrees) and true obliquity at `ms`. */
export function frameAt(win: SkyWindow, ms: number): { st: number; eps: number } {
  const { i, u } = locate(win, ms);
  const st = win.st[i] + (win.st[i + 1] - win.st[i]) * u;
  const eps = win.eps[i] + (win.eps[i + 1] - win.eps[i]) * u;
  return { st: wrap360(st), eps };
}

// —— The angles, as Swiss computes them (swehouse.c: Asc1, Asc2, CalcH) ——

const VERY_SMALL = 1e-10;
const RAD = Math.PI / 180;
const sind = (x: number) => Math.sin(x * RAD);
const cosd = (x: number) => Math.cos(x * RAD);
const tand = (x: number) => Math.tan(x * RAD);
const atand = (x: number) => Math.atan(x) / RAD;

function asc2(x: number, f: number, sine: number, cose: number): number {
  let ass = -tand(f) * sine + cose * cosd(x);
  if (Math.abs(ass) < VERY_SMALL) ass = 0;
  let sinx = sind(x);
  if (Math.abs(sinx) < VERY_SMALL) sinx = 0;
  if (sinx === 0) {
    ass = ass < 0 ? -VERY_SMALL : VERY_SMALL;
  } else if (ass === 0) {
    ass = sinx < 0 ? -90 : 90;
  } else {
    ass = atand(sinx / ass);
  }
  if (ass < 0) ass = 180 + ass;
  return ass;
}

function asc1(x1In: number, f: number, sine: number, cose: number): number {
  const x1 = wrap360(x1In);
  const n = Math.floor(x1 / 90 + 1);
  if (Math.abs(90 - f) < VERY_SMALL) return 180;
  if (Math.abs(90 + f) < VERY_SMALL) return 0;
  let ass: number;
  if (n === 1) ass = asc2(x1, f, sine, cose);
  else if (n === 2) ass = 180 - asc2(180 - x1, -f, sine, cose);
  else if (n === 3) ass = 180 + asc2(x1 - 180, -f, sine, cose);
  else ass = 360 - asc2(360 - x1, f, sine, cose);
  ass = wrap360(ass);
  if (Math.abs(ass - 90) < VERY_SMALL) ass = 90;
  if (Math.abs(ass - 180) < VERY_SMALL) ass = 180;
  if (Math.abs(ass - 270) < VERY_SMALL) ass = 270;
  if (Math.abs(ass - 360) < VERY_SMALL) ass = 0;
  return ass;
}

/**
 * Ascendant, Midheaven and Vertex from the local sidereal time (ARMC,
 * degrees), the latitude and the true obliquity, as Swiss's house code does.
 * Inside the polar circles Swiss may turn the Ascendant round to the eastern
 * horizon; callers there keep the exact cast (see `anglesSafe`).
 */
export function anglesFromArmc(armc: number, lat: number, eps: number): { asc: number; mc: number; vertex: number } {
  const th = wrap360(armc);
  const sine = sind(eps);
  const cose = cosd(eps);
  let mc: number;
  if (Math.abs(th - 90) > VERY_SMALL && Math.abs(th - 270) > VERY_SMALL) {
    mc = atand(tand(th) / cose);
    if (th > 90 && th <= 270) mc = wrap360(mc + 180);
  } else {
    mc = Math.abs(th - 90) <= VERY_SMALL ? 90 : 270;
  }
  mc = wrap360(mc);
  const asc = asc1(th + 90, lat, sine, cose);
  const f = lat >= 0 ? 90 - lat : -90 - lat;
  let vertex = asc1(th - 90, f, sine, cose);
  // Between the tropics the formula can land on the Antivertex: Swiss keeps
  // the Vertex west of the Midheaven.
  if (Math.abs(lat) <= eps && wrap180(vertex - mc) > 0) vertex = wrap360(vertex + 180);
  return { asc, mc, vertex };
}

/** Outside the polar circles (with a margin) the formulas above are Swiss's to the last digits. */
export function anglesSafe(lat: number, eps: number): boolean {
  return Math.abs(lat) < 90 - eps - 0.5;
}

/** ARMC at `ms` for a place: the sidereal time at Greenwich plus the east longitude. */
export function armcAt(win: SkyWindow, ms: number, longitude: number): { armc: number; eps: number } {
  const f = frameAt(win, ms);
  return { armc: wrap360(f.st + longitude), eps: f.eps };
}

/**
 * The transit sky's bodies at `ms` (Swiss bodies in the server's order, then
 * the Vertex). With `years` (of life, for a progressed moment) the Vertex is
 * the progressed one, from the Naibod ARMC as the server builds it.
 */
function transitPlanets(
  win: SkyWindow,
  ms: number,
  latitude: number,
  longitude: number,
  cusps: number[],
  years?: number,
): Placement[] | null {
  const planets: Placement[] = [];
  for (const id of PLANET_IDS) {
    if (!(id in win.bodies)) continue;
    const at = bodyAt(win, id, ms);
    if (!at) return null;
    planets.push(makePlacement(id, at.lon, houseFromCusps(at.lon, cusps), at.speed < 0, at.speed));
  }
  const { armc, eps } = armcAt(win, ms, longitude);
  if (!anglesSafe(latitude, eps)) return null;
  const vertex = anglesFromArmc(years == null ? armc : progressedArmc(armc, years), latitude, eps).vertex;
  planets.push(makePlacement("vertex", vertex, houseFromCusps(vertex, cusps), false));
  planets.sort((a, b) => PLANET_IDS.indexOf(a.id as PlanetId) - PLANET_IDS.indexOf(b.id as PlanetId));
  return planets;
}

export type NatalRow = { id: BodyId; name: string; ecliptic: number };

/**
 * A transit sky at `ms` from the window: positions within a fraction of an
 * arcsecond of Swiss, the aspects to the natal chart as the server finds them
 * (the same code), and no exact times (`meta.provisional`: they come with the
 * exact cast). Null when the window or the place can't give it exactly
 * enough (a missing sample, inside the polar circles).
 */
export function provisionalTransitSky(
  win: SkyWindow,
  ms: number,
  base: Pick<TransitSky["meta"], "timezone" | "latitude" | "longitude" | "houseSystem">,
  natalCusps: number[],
  natalBodies: NatalRow[],
): TransitSky | null {
  if (!covers(win, ms)) return null;
  const cusps = natalCusps.map((c) => wrap360(c));
  const planets = transitPlanets(win, ms, base.latitude, base.longitude, cusps);
  if (!planets) return null;
  const natal = natalBodies.map((row) => makePlacement(row.id, row.ecliptic, houseFromCusps(row.ecliptic, cusps), false, 0));
  const aspects = computeCrossAspects(planets, natal).map((link) => ({ ...link, exactUtc: undefined }));
  return {
    meta: {
      utc: new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z"),
      timezone: base.timezone,
      local: "",
      latitude: base.latitude,
      longitude: base.longitude,
      houseSystem: base.houseSystem,
      provisional: true,
    },
    planets,
    aspects,
  };
}

/**
 * A progressed sky at the progressed moment `progMs` from the window, with
 * the angles rebuilt as the server builds them (the Naibod ARMC at the birth
 * place, speeds from an hour of the ephemeris later) and no exact dates.
 */
export function provisionalProgressedSky(
  win: SkyWindow,
  progMs: number,
  meta: Omit<ProgressedSky["meta"], "warnings" | "houseSystemRequested">,
  natalCusps: number[],
  natalBodies: NatalRow[],
): ProgressedSky | null {
  if (!covers(win, progMs)) return null;
  const cusps = natalCusps.map((c) => wrap360(c));
  const planets = transitPlanets(win, progMs, meta.latitude, meta.longitude, cusps, meta.yearsOfLife);
  if (!planets) return null;
  const now = armcAt(win, progMs, meta.longitude);
  const armc = progressedArmc(now.armc, meta.yearsOfLife);
  const a = anglesFromArmc(armc, meta.latitude, now.eps);
  const b = anglesFromArmc(armc + NAIBOD_DEG_PER_YEAR / 24, meta.latitude, now.eps);
  const ascSpeed = wrap180(b.asc - a.asc) * 24;
  const mcSpeed = wrap180(b.mc - a.mc) * 24;
  const dsc = wrap360(a.asc + 180);
  const ic = wrap360(a.mc + 180);
  const angles: Record<AngleId, Placement> = {
    ascendant: makePlacement("ascendant", a.asc, houseFromCusps(a.asc, cusps), ascSpeed < 0, ascSpeed),
    midheaven: makePlacement("midheaven", a.mc, houseFromCusps(a.mc, cusps), mcSpeed < 0, mcSpeed),
    descendant: makePlacement("descendant", dsc, houseFromCusps(dsc, cusps), ascSpeed < 0, ascSpeed),
    ic: makePlacement("ic", ic, houseFromCusps(ic, cusps), mcSpeed < 0, mcSpeed),
  };
  const natal = natalBodies.map((row) => makePlacement(row.id, row.ecliptic, houseFromCusps(row.ecliptic, cusps), false, 0));
  const moving = [...planets, angles.ascendant, angles.midheaven, angles.descendant, angles.ic];
  const aspects = computeCrossAspects(moving, natal, { idPrefix: "p", skipAxes: false }).map((link) => ({
    ...link,
    exactUtc: undefined,
  }));
  return { meta: { ...meta, provisional: true }, planets, angles, aspects };
}

/** Chunk starts to have at hand around `ms` (the one holding it, and a neighbour near an edge). */
export function chunksAround(ms: number, marginDays = 8): number[] {
  const start = chunkStart(ms);
  const out = [start];
  if (ms - start < marginDays * DAY_MS) out.push(start - CHUNK_MS);
  if (start + CHUNK_MS - ms < marginDays * DAY_MS) out.push(start + CHUNK_MS);
  return out;
}

export const WINDOW_TIMES = { DAY_MS, CHUNK_MS, STEP_MS, EPOCH_MS };
