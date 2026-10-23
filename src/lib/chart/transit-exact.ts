import { ASPECT_META, aspectOrb, MAJOR_ASPECT_IDS, MEAN_SPEED, STATION_SPEED, SWIFT_BODIES } from "./constants";
import type { AspectId, AspectLink, BodyId, TimingHit } from "./types";

// Built on first use, not while this module loads: in the server's bundle this
// module can run before constants.ts has (their chunks import each other), and a
// set built then would be empty (scripts/chunk-cycles.mjs checks every build).
let major: Set<string> | undefined;
const MAJOR = { has: (type: string) => (major ??= new Set<string>(MAJOR_ASPECT_IDS)).has(type) };

/** Moving bodies shown in Hello-now and the transit-to-natal table. */
export const TRANSIT_TABLE_MOVING: ReadonlySet<BodyId> = new Set([
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
  "chiron",
  "northnode",
  "southnode",
  "lilith",
]);

/** Natal bodies those transits are scored against (planets + angles). */
export const TRANSIT_TABLE_NATAL: ReadonlySet<BodyId> = new Set([
  ...TRANSIT_TABLE_MOVING,
  "ascendant",
  "midheaven",
  "descendant",
  "ic",
]);

function sep180(a: number, b: number): number {
  return Math.abs((((a - b + 540) % 360) - 180));
}

/** Unsigned residual of a declared aspect type, degrees. Not the nearest-aspect orb. */
export function residualForType(movingLon: number, natalLon: number, type: AspectId): number {
  return Math.abs(sep180(movingLon, natalLon) - ASPECT_META[type].angle);
}

export type TableLonPair = { movingLon: number; natalLon: number };

/**
 * Major table rows must sit inside that pair’s major orb. Planet-to-planet
 * stays 8° conjunction/opposition/square/trine and 6° sextile. Planet-to-angle
 * is Quill’s lock: trine 6°, sextile 4°. Residual is recomputed from
 * longitudes for the declared type — a stored orb cannot keep an out-of-orb
 * hit, and an in-orb hit (e.g. noon-Paris Pluto trine MC at ~5.6°) must stay.
 */
export function inMajorTableOrb(
  a: Pick<AspectLink, "type" | "orb" | "a" | "b">,
  pos?: TableLonPair,
): boolean {
  if (!MAJOR.has(a.type)) return false;
  const max = aspectOrb(a.type, a.a, a.b);
  const orb = pos ? residualForType(pos.movingLon, pos.natalLon, a.type) : a.orb;
  return Number.isFinite(orb) && Number.isFinite(max) && orb <= max + 1e-9;
}

export function isTransitTablePair(a: AspectLink, pos?: TableLonPair): boolean {
  return (
    a.level === "major" &&
    MAJOR.has(a.type) &&
    TRANSIT_TABLE_MOVING.has(a.a) &&
    TRANSIT_TABLE_NATAL.has(a.b) &&
    inMajorTableOrb(a, pos)
  );
}

export function transitRowTestId(a: Pick<AspectLink, "a" | "type" | "b">): string {
  return `transit-row-t${a.a}_${a.type}_${a.b}`;
}

/**
 * Local copy on purpose: `anatomy.ts` imports `motionFlags` from this module,
 * so importing its `wrap180` back would close an import cycle. Keep the two in
 * step — this is the only surviving duplicate.
 */
function wrap180(n: number): number {
  return ((n + 180) % 360 + 360) % 360 - 180;
}

/** Residual of a locked aspect pole, degrees in (−180, 180]. Zero is exact. */
export function lockedAspectResidual(
  movingLon: number,
  natalLon: number,
  target: number,
  pole: 1 | -1,
): number {
  const offset = target === 0 || target === 180 ? target : pole * target;
  return wrap180(movingLon - natalLon - offset);
}

/** Which of ±target the current longitudes sit on. Conjunction / opposition have one pole. */
export function aspectPole(movingLon: number, natalLon: number, target: number): 1 | -1 {
  if (target === 0 || target === 180) return 1;
  const signed = wrap180(movingLon - natalLon);
  const pos = Math.abs(wrap180(signed - target));
  const neg = Math.abs(wrap180(signed + target));
  return pos <= neg ? 1 : -1;
}

export function aspectTarget(type: AspectId): number {
  return ASPECT_META[type].angle;
}

/**
 * How a body moves: retrograde (going backward), stationary (within a few
 * days of a station, by its own speed: STATION_SPEED), and for the seven
 * traditional planets moving forward, swift (`fast`: faster than its mean
 * daily motion) or slow (slower), as Lilly counted them. The nodes, Lilith,
 * the asteroids, the angles and the lots are neither stationary nor swift.
 */
export function motionFlags(id: BodyId, speed: number): {
  retrograde: boolean;
  stationary: boolean;
  fast: boolean;
  slow: boolean;
} {
  const limit = STATION_SPEED[id];
  const stationary = limit != null && Math.abs(speed) < limit;
  const mean = Math.abs(MEAN_SPEED[id] ?? 0);
  const measured = SWIFT_BODIES.includes(id) && mean > 0 && !stationary && speed >= 0;
  return {
    retrograde: speed < 0,
    stationary,
    fast: measured && speed > mean,
    slow: measured && speed <= mean,
  };
}

/** How far (days) to look for a perfecting of this body. */
export function transitSearchDays(id: BodyId): number {
  switch (id) {
    case "moon":
      return 40;
    case "sun":
    case "mercury":
    case "venus":
      return 160;
    case "mars":
      return 500;
    case "jupiter":
    case "chiron":
    case "ceres":
    case "pallas":
    case "juno":
    case "vesta":
      return 900;
    case "saturn":
      return 1600;
    case "uranus":
    case "neptune":
    case "pluto":
    case "eris":
    case "sedna":
      return 2800;
    case "northnode":
    case "southnode":
      return 800;
    case "lilith":
      return 400;
    case "vertex":
    case "antivertex":
      return 2;
    default:
      return 400;
  }
}

const EXACT_DEG = 1 / 60;
const FINE_DEG = 1 / 3600;
/** One minute of day-fraction — inside this, the hit is treated as currently exact. */
const EXACT_NOW_DAYS = 1 / 1440;
/** Two minutes — duplicate exacts from adjacent samples collapse. */
const DUP_DAYS = 2 / 1440;
/** Below this, Newton is unsafe (true station). Slow outers are still Newton'd. */
const NEWTON_MIN_SPEED = 1e-5;
/**
 * An exact is polished until the arc is within this (0.00036″) or the time
 * step within POLISH_DAYS (≈ 9 ms). Stopping at 1″ left outer-planet exacts
 * up to a quarter of an hour off: Neptune crawls 1″ in ~20 minutes.
 */
const POLISH_DEG = 1e-7;
const POLISH_DAYS = 1e-7;

export type LonAt = (days: number) => { lon: number; speed: number };

/**
 * Newton on the real ephemeris from an approximate exact, kept inside a
 * sign-change bracket when one is known (bisection whenever a step would
 * leave it). Returns the best time found — never a worse one than it was
 * given, so a station that defeats Newton keeps the search's own answer.
 */
export function polishExact(
  lonAt: LonAt,
  natalLon: number,
  target: number,
  pole: 1 | -1,
  days: number,
  bracket?: [number, number],
): number {
  const residual = (d: number) => {
    const st = lonAt(d);
    return { r: lockedAspectResidual(st.lon, natalLon, target, pole), speed: st.speed };
  };
  let lo = bracket ? Math.min(bracket[0], bracket[1]) : NaN;
  let hi = bracket ? Math.max(bracket[0], bracket[1]) : NaN;
  let rLo = bracket ? residual(lo).r : NaN;
  const rHi = bracket ? residual(hi).r : NaN;
  const bracketed = Number.isFinite(rLo) && Number.isFinite(rHi) && rLo * rHi <= 0 && hi > lo;
  const start = residual(days);
  if (!Number.isFinite(start.r)) return days;
  let best = days;
  let bestR = Math.abs(start.r);
  let d = days;
  let cur = start;
  for (let i = 0; i < 48; i += 1) {
    if (!Number.isFinite(cur.r)) break;
    if (Math.abs(cur.r) < bestR) {
      best = d;
      bestR = Math.abs(cur.r);
    }
    if (Math.abs(cur.r) < POLISH_DEG) return d;
    if (bracketed) {
      if (cur.r === 0) return d;
      if (cur.r * rLo < 0) hi = d;
      else {
        lo = d;
        rLo = cur.r;
      }
    }
    let next =
      Number.isFinite(cur.speed) && Math.abs(cur.speed) >= NEWTON_MIN_SPEED ? d - cur.r / cur.speed : Number.NaN;
    if (bracketed && !(next > lo && next < hi)) next = (lo + hi) / 2;
    if (!Number.isFinite(next)) break;
    // Unbracketed Newton that runs off (a station) is abandoned.
    if (!bracketed && Math.abs(next - days) > 30) break;
    if (Math.abs(next - d) < POLISH_DAYS) {
      const last = residual(next);
      if (Number.isFinite(last.r) && Math.abs(last.r) < bestR) return next;
      return best;
    }
    d = next;
    cur = residual(d);
  }
  return best;
}

export type LonSample = { days: number; lon: number; speed: number };

export type TimingScope = "day" | "month" | "year";

export type { TimingHit };

/** Conjunction / opposition occupy one pole; the rest have ±target. */
export function aspectPoles(target: number): Array<1 | -1> {
  if (target === 0 || target === 180) return [1];
  return [1, -1];
}

/**
 * Sample stride so residual of one locked pole cannot jump over a zero
 * without a sign change. Capped so stations still get several looks a week.
 */
export function sampleStepDays(id: BodyId): number {
  const mean = Math.abs(MEAN_SPEED[id] ?? 0.5);
  const step = 6 / Math.max(mean, 0.08);
  if (id === "moon") return 0.35;
  return Math.min(Math.max(step, 0.25), 5);
}

export function timingExactId(moving: BodyId, type: AspectId, natal: BodyId, exactUtc: string): string {
  return `t${moving}_${type}_${natal}_${exactUtc.replace(/[:.]/g, "")}`;
}

export function timingRowTestId(hit: Pick<TimingHit, "moving" | "type" | "natal" | "exactUtc">): string {
  return `timing-row-${timingExactId(hit.moving, hit.type, hit.natal, hit.exactUtc)}`;
}

/**
 * Walk pre-sampled longitudes, bisect every residual sign-change, then Newton
 * on the real ephemeris. Hits that never reach 1′ are dropped — never invented.
 */
export function findExactsFromSamples(opts: {
  samples: LonSample[];
  lonAt: LonAt;
  natalLon: number;
  target: number;
  pole: 1 | -1;
  minDays: number;
  maxDays: number;
}): number[] {
  const { samples, natalLon, target, pole, minDays, maxDays } = opts;
  if (samples.length < 2) return [];
  // The ephemeris at a sample's own day is the sample (the very numbers
  // lonAt gave for it), and a day just evaluated is kept: the bracket ends and
  // the last Newton step cost no second call. Same inputs, same answers.
  const known = sampleIndex(samples);
  const recent = new Map<number, { lon: number; speed: number }>();
  const lonAt: LonAt = (days) => {
    const hit = known.get(days) ?? recent.get(days);
    if (hit) return hit;
    const v = opts.lonAt(days);
    if (recent.size >= 16) recent.clear();
    recent.set(days, v);
    return v;
  };
  const residualOf = (lon: number) => lockedAspectResidual(lon, natalLon, target, pole);
  const residualAt = (days: number) => residualOf(lonAt(days).lon);
  const hits: number[] = [];

  const push = (days: number | null) => {
    if (days == null || !Number.isFinite(days)) return;
    if (days < minDays - EXACT_NOW_DAYS || days > maxDays + EXACT_NOW_DAYS) return;
    const r = residualAt(days);
    if (!Number.isFinite(r) || Math.abs(r) >= EXACT_DEG) return;
    if (hits.some((h) => Math.abs(h - days) < DUP_DAYS)) return;
    hits.push(days);
  };

  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const cur = samples[i];
    if (!prev || !cur) continue;
    const r0 = residualOf(prev.lon);
    const r1 = residualOf(cur.lon);
    if (!Number.isFinite(r0) || !Number.isFinite(r1)) continue;
    if (Math.abs(r0) < EXACT_DEG) {
      const near = refineExactDays(lonAt, natalLon, target, pole, prev.days, maxDays);
      push(near == null ? null : polishExact(lonAt, natalLon, target, pole, near));
      continue;
    }
    if (r0 * r1 > 0 || Math.abs(r0) + Math.abs(r1) >= 180) continue;
    // The crossing on the cubic through both samples' positions and speeds
    // (no ephemeris calls: within a fraction of an arcsecond), then Newton on
    // the real ephemeris; bisecting the ephemeris itself when a sample lacks
    // its speed.
    const mid = hermiteCrossing(prev, cur, natalLon, target, pole) ?? bisectZero(residualAt, prev.days, cur.days, r0, r1);
    const found = refineExactDays(lonAt, natalLon, target, pole, mid, maxDays) ?? mid;
    push(polishExact(lonAt, natalLon, target, pole, found, [prev.days, cur.days]));
  }

  hits.sort((a, b) => a - b);
  return hits;
}

const sampleIndexes = new WeakMap<LonSample[], Map<number, { lon: number; speed: number }>>();

/** A body's samples by day (built once per sample run, shared by every natal body and aspect). */
function sampleIndex(samples: LonSample[]): Map<number, { lon: number; speed: number }> {
  let map = sampleIndexes.get(samples);
  if (!map) {
    map = new Map();
    for (const smp of samples) map.set(smp.days, { lon: smp.lon, speed: smp.speed });
    sampleIndexes.set(samples, map);
  }
  return map;
}

/**
 * Where the locked aspect's residual crosses zero between two samples, on the
 * cubic Hermite curve through both positions and both speeds. Null when a
 * speed is missing or the curve shows no crossing (the ephemeris decides).
 */
export function hermiteCrossing(
  a: LonSample,
  b: LonSample,
  natalLon: number,
  target: number,
  pole: 1 | -1,
): number | null {
  const h = b.days - a.days;
  if (!(h > 0) || !Number.isFinite(a.speed) || !Number.isFinite(b.speed)) return null;
  const r0 = lockedAspectResidual(a.lon, natalLon, target, pole);
  const p1 = a.lon + wrap180(b.lon - a.lon);
  const at = (u: number) => {
    const u2 = u * u;
    const u3 = u2 * u;
    const lon = (2 * u3 - 3 * u2 + 1) * a.lon + (u3 - 2 * u2 + u) * h * a.speed + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * h * b.speed;
    return r0 + (lon - a.lon);
  };
  let lo = 0;
  let hi = 1;
  let fLo = at(0);
  const fHi = at(1);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    const f = at(mid);
    if (f === 0) return a.days + mid * h;
    if (fLo * f < 0) hi = mid;
    else {
      lo = mid;
      fLo = f;
    }
  }
  return a.days + ((lo + hi) / 2) * h;
}

function refineExactDays(
  lonAt: LonAt,
  natalLon: number,
  target: number,
  pole: 1 | -1,
  startDays: number,
  maxAbsDays: number,
): number | null {
  let days = startDays;
  let state = lonAt(days);
  for (let i = 0; i < 8; i += 1) {
    const r = lockedAspectResidual(state.lon, natalLon, target, pole);
    if (Math.abs(r) < FINE_DEG) return days;
    if (!Number.isFinite(state.speed) || Math.abs(state.speed) < NEWTON_MIN_SPEED) {
      return Math.abs(r) < EXACT_DEG ? days : null;
    }
    const step = -r / state.speed;
    if (!Number.isFinite(step) || Math.abs(days + step - startDays) > 8) {
      return Math.abs(r) < EXACT_DEG ? days : null;
    }
    if (Math.abs(days + step) > Math.abs(maxAbsDays) + 2) {
      return Math.abs(r) < EXACT_DEG ? days : null;
    }
    days += step;
    state = lonAt(days);
    if (!Number.isFinite(state.lon)) return null;
  }
  const r = lockedAspectResidual(state.lon, natalLon, target, pole);
  return Math.abs(r) < EXACT_DEG ? days : null;
}

function bisectZero(
  residualAt: (days: number) => number,
  d0: number,
  d1: number,
  r0: number,
  r1: number,
): number {
  let left = d0;
  let right = d1;
  let leftR = r0;
  void r1;
  for (let i = 0; i < 28; i += 1) {
    const mid = (left + right) / 2;
    const r = residualAt(mid);
    if (!Number.isFinite(r) || Math.abs(r) < FINE_DEG) return mid;
    if (leftR * r <= 0) {
      right = mid;
    } else {
      left = mid;
      leftR = r;
    }
  }
  return (left + right) / 2;
}

/**
 * Three next exacts inside the current day / month / year.
 * Live scopes skip what has already perfected; past or future scopes take the
 * earliest three of that window. Never Sun/Moon/Asc filler.
 * Month and year skip the transiting Moon so Hello-next is not a wall of lunar
 * exacts. Day keeps the Moon. The table still lists Moon rows.
 */
export function nextHelloExacts(
  hits: TimingHit[],
  scopeFromMs: number,
  scopeToMs: number,
  nowMs: number,
  n = 3,
  scope: TimingScope = "day",
): TimingHit[] {
  const inScope = hits
    .filter((h) => {
      const t = Date.parse(h.exactUtc);
      return Number.isFinite(t) && t >= scopeFromMs && t < scopeToMs;
    })
    .sort((a, b) => Date.parse(a.exactUtc) - Date.parse(b.exactUtc) || a.id.localeCompare(b.id));
  const live = nowMs >= scopeFromMs && nowMs < scopeToMs;
  const remaining = live ? inScope.filter((h) => Date.parse(h.exactUtc) >= nowMs - 60_000) : inScope;
  const skipMoon = scope !== "day";
  const pool = skipMoon ? remaining.filter((h) => h.moving !== "moon") : remaining;
  return pool.slice(0, n);
}

/* ── Every passage, near a station too (the bug-fix round, item 1) ───────
 *
 * A slow planet near a station can make an aspect exact once, three times or
 * more (Pluto passed 1°29′ Aquarius five times in 2024–2025). The search
 * used to start Newton from the moment shown; near a station the planet's
 * speed is almost nothing, so its first step leapt months away and landed on
 * whichever passage lay nearest the leap: the date changed from one moment
 * to the next (4 Nov 2025, then 21 Sep 2025 ten minutes later).
 *
 * Now the passages are bracketed one by one. The sky is read on a grid of
 * whole steps counted from 1970, the same for every moment. Between two grid
 * samples a body moves one way unless it stations: where the speeds' signs
 * differ, the station is found first and each side searched on its own. Each
 * change of sign is solved on the sky itself to the millisecond (Newton kept
 * inside its bracket), and a station that turns within 1′ of the point
 * without crossing it counts once, at the station. Every reading is taken at
 * a whole millisecond of absolute time, so two moments find the very same
 * passages.
 *
 * The one shown follows the body's motion at the moment: while it closes on
 * the point, the next passage (applying); while it draws away, the last one
 * (separating); with no last one, the next (neither: it turns back to it
 * later). Within a minute of the moment, it is exact now. The passages
 * listed with it are those of its pass: the stretch around it in which the
 * body stays within the aspect's orb.
 */

/** A body's place and speed at a moment, ms UTC (read at a whole millisecond). */
export type PlaceAt = (ms: number) => { lon: number; speed: number };

const DAY_MS = 86_400_000;
/** Within this of the moment, a passage is the moment's own (one minute, as EXACT_NOW_DAYS). */
const EXACT_NOW_MS = 60_000;
/** Two passages closer than this are one (two minutes, as DUP_DAYS). */
const DUP_MS = 120_000;

/**
 * The search's step, days. Between two samples a planet stations at most
 * once at these steps (a retrograde lasts three weeks for Mercury, months for
 * the others); the true node's and Lilith's speeds turn within days, so they
 * are read finer.
 */
export function passStepDays(id: BodyId): number {
  switch (id) {
    case "jupiter":
    case "saturn":
    case "chiron":
      return 15;
    case "uranus":
    case "neptune":
    case "pluto":
      return 30;
    case "northnode":
    case "southnode":
      return 2;
    case "lilith":
      return 0.25;
    default:
      return sampleStepDays(id);
  }
}

/**
 * A pass: the stretch around an exact in which the body stays within 8° of
 * it (the widest major orb). The same for every aspect, so an axis's twins
 * (a trine to the North Node, a sextile to the South Node) read alike.
 */
export const PASS_ORB = 8;

type Place = { lon: number; speed: number };
type Knot = { t: number; lon: number; speed: number; r: number };

/** A body's grid samples by ms, and the station found between two of them (by the first one's ms; null: unreadable). */
export type PassCache = { knots: Map<number, Place>; stations: Map<number, (Place & { t: number }) | null> };

export function passCache(): PassCache {
  return { knots: new Map(), stations: new Map() };
}

export type PassSearch = {
  /** The body's place and speed at a moment (ms UTC). */
  at: PlaceAt;
  /** The moment read (ms UTC). */
  momentMs: number;
  natalLon: number;
  /** The aspect's angle (0, 60, 90, 120, 180). */
  target: number;
  /** The grid's step, days (passStepDays). */
  stepDays: number;
  /** The search's reach each way from the moment, days (transitSearchDays). */
  maxDays: number;
  /** A pass ends where the body is further than this from exact, degrees (PASS_ORB). */
  bound: number;
  /** What was read of this body already (passCache): shared by its aspects in one cast. */
  cache?: PassCache;
  /** The motion at the instant (the aspect's own), said of an exact within a minute of the moment. */
  fallback?: boolean | null;
};

/**
 * The passage a table shows for an aspect at the moment, whether it is
 * applying (true), separating (false) or neither (null), and every passage
 * of its pass (ms UTC, ascending). Never invents a passage: none within the
 * reach is no exact (and not applying).
 */
export function exactOfPass(opts: PassSearch): { exactMs: number | null; applying: boolean | null; passes: number[] } {
  const { at, momentMs: moment, natalLon, target, bound } = opts;
  const cache = opts.cache ?? passCache();
  const none = { exactMs: null, applying: false, passes: [] as number[] };
  // The moment's own place, read once for all of a body's aspects.
  let now = cache.knots.get(moment);
  if (!now) {
    now = at(moment);
    cache.knots.set(moment, now);
  }
  if (!Number.isFinite(now.lon) || !Number.isFinite(now.speed)) return none;
  const pole = aspectPole(now.lon, natalLon, target);
  const res = (lon: number) => lockedAspectResidual(lon, natalLon, target, pole);
  const stepMs = Math.max(60_000, Math.round(opts.stepDays * DAY_MS));
  const reach = opts.maxDays * DAY_MS;

  const knotOf = (t: number, p: Place): Knot | null =>
    Number.isFinite(p.lon) && Number.isFinite(p.speed) ? { t, lon: p.lon, speed: p.speed, r: res(p.lon) } : null;
  const read = (t: number): Knot | null => knotOf(t, at(t));
  const knot = (k: number): Knot | null => {
    const t = k * stepMs;
    let p = cache.knots.get(t);
    if (!p) {
      p = at(t);
      cache.knots.set(t, p);
    }
    return knotOf(t, p);
  };

  /** The moment the residual is zero inside [a, b], whose ends lie either side of it: Newton kept in the bracket, to the millisecond. */
  const solve = (a: Knot, b: Knot): number | null => {
    if (a.r === 0) return a.t;
    if (b.r === 0) return b.t;
    let lo = a;
    let hi = b;
    let best = Math.abs(a.r) <= Math.abs(b.r) ? a : b;
    // A first guess on the chord between the ends.
    let t = Math.round(a.t + ((b.t - a.t) * a.r) / (a.r - b.r));
    for (let i = 0; i < 80; i += 1) {
      if (!(t > lo.t && t < hi.t)) t = Math.round((lo.t + hi.t) / 2);
      if (t <= lo.t || t >= hi.t) break;
      const s = read(t);
      if (!s) return null;
      if (Math.abs(s.r) < Math.abs(best.r)) best = s;
      if (s.r === 0) return s.t;
      if ((s.r < 0) === (lo.r < 0)) lo = s;
      else hi = s;
      const step = Math.abs(s.speed) > 1e-12 ? (-s.r / s.speed) * DAY_MS : Number.NaN;
      // Newton's next step under half a millisecond: this is the moment.
      if (Math.abs(step) < 0.5 || hi.t - lo.t <= 1) break;
      let next = Number.isFinite(step) ? Math.round(s.t + step) : Number.NaN;
      if (!(next > lo.t && next < hi.t)) next = Math.round((lo.t + hi.t) / 2);
      t = next;
    }
    return Math.abs(best.r) < EXACT_DEG ? best.t : null;
  };

  /**
   * The station inside [a, b] (the speeds' signs differ at its ends), to the
   * minute, found once per body: the speed's zero by regula falsi, its stale
   * end halved (Illinois) so it closes from both sides.
   */
  const stationIn = (a: Knot, b: Knot): Knot | null => {
    if (!cache.stations.has(a.t)) {
      let lo: Place & { t: number } = a;
      let hi: Place & { t: number } = b;
      let fLo = a.speed;
      let fHi = b.speed;
      let side = 0;
      let ok = true;
      for (let i = 0; i < 60 && hi.t - lo.t > 60_000; i += 1) {
        let t = Math.round((lo.t * fHi - hi.t * fLo) / (fHi - fLo));
        if (!(t > lo.t && t < hi.t)) t = Math.round((lo.t + hi.t) / 2);
        const p = at(t);
        if (!Number.isFinite(p.lon) || !Number.isFinite(p.speed)) {
          ok = false;
          break;
        }
        if ((p.speed < 0) === (fLo < 0)) {
          lo = { t, lon: p.lon, speed: p.speed };
          fLo = p.speed;
          if (side === -1) fHi /= 2;
          side = -1;
        } else {
          hi = { t, lon: p.lon, speed: p.speed };
          fHi = p.speed;
          if (side === 1) fLo /= 2;
          side = 1;
        }
        // Within half a minute of the zero on the line through the bracket's ends: it is found.
        if (Math.abs((p.speed * (hi.t - lo.t)) / (hi.speed - lo.speed)) < 30_000) break;
      }
      const s = Math.abs(lo.speed) <= Math.abs(hi.speed) ? lo : hi;
      cache.stations.set(a.t, ok ? { t: s.t, lon: s.lon, speed: s.speed } : null);
    }
    const s = cache.stations.get(a.t);
    return s ? knotOf(s.t, s) : null;
  };

  /** One stretch the body moves one way along: its passage, if it crosses. */
  const crossing = (a: Knot, b: Knot): number | null =>
    (a.r <= 0) !== (b.r <= 0) || a.r === 0 || b.r === 0 ? (Math.abs(b.r - a.r) < 90 ? solve(a, b) : null) : null;

  /** The passages between grid samples k and k + 1 (null: the sky cannot be read there). */
  const found = new Map<number, number[] | null>();
  const passagesIn = (k: number): number[] | null => {
    if (found.has(k)) return found.get(k) ?? null;
    const a = knot(k);
    const b = a ? knot(k + 1) : null;
    let out: number[] | null = null;
    if (a && b) {
      const hits: (number | null)[] = [];
      if ((a.speed < 0) === (b.speed < 0)) hits.push(crossing(a, b));
      else {
        // A station between the two samples: each side on its own; a turn within 1′ of the point is its
        // passage. Both ends on one side of the point and the body first drawing away from it, or too far
        // to reach it before it turns (its speed falls to nothing there): no passage, no station to find.
        const oneSide = (a.r < 0) === (b.r < 0) && a.r !== 0 && b.r !== 0;
        const near = 2 * Math.max(Math.abs(a.speed), Math.abs(b.speed)) * ((b.t - a.t) / DAY_MS) + EXACT_DEG;
        if (!(oneSide && (a.r * a.speed > 0 || Math.min(Math.abs(a.r), Math.abs(b.r)) > near))) {
          const s = stationIn(a, b);
          if (s) {
            const one = crossing(a, s);
            const two = crossing(s, b);
            hits.push(one, two);
            if (one == null && two == null && Math.abs(s.r) < EXACT_DEG) hits.push(s.t);
          }
        }
      }
      out = [];
      for (const t of hits) if (t != null && !out.some((x) => Math.abs(x - t) < DUP_MS)) out.push(t);
      out.sort((x, y) => x - y);
    }
    found.set(k, out);
    return out;
  };

  const k0 = Math.floor(moment / stepMs);
  const inReach = (t: number) => Math.abs(t - moment) <= reach + EXACT_NOW_MS;
  /** The first passage after the moment, within the reach. */
  const nextAfter = (): number | null => {
    for (let k = k0; k * stepMs - moment <= reach; k += 1) {
      const got = passagesIn(k);
      if (!got) return null;
      const t = got.find((x) => x > moment);
      if (t != null) return inReach(t) ? t : null;
    }
    return null;
  };
  /** The last passage before the moment, within the reach. */
  const lastBefore = (): number | null => {
    for (let k = k0; moment - (k + 1) * stepMs <= reach; k -= 1) {
      const got = passagesIn(k);
      if (!got) return null;
      const t = [...got].reverse().find((x) => x < moment);
      if (t != null) return inReach(t) ? t : null;
    }
    return null;
  };
  /** Every passage of the pass around `t` (a moment or a passage): out both ways while the body stays within the orb, within the reach. */
  const passOf = (t: number): number[] => {
    const all = new Set<number>();
    const kt = Math.floor(t / stepMs);
    for (let k = kt; ; k += 1) {
      for (const x of passagesIn(k) ?? []) if (inReach(x)) all.add(x);
      const far = knot(k + 1);
      if (!far || Math.abs(far.r) > bound || far.t - moment > reach) break;
    }
    const start = knot(kt);
    if (start && Math.abs(start.r) <= bound) {
      for (let k = kt - 1; ; k -= 1) {
        for (const x of passagesIn(k) ?? []) if (inReach(x)) all.add(x);
        const far = knot(k);
        if (!far || Math.abs(far.r) > bound || moment - far.t > reach) break;
      }
    }
    const out: number[] = [];
    for (const x of [...all].sort((p, q) => p - q)) if (!out.some((y) => Math.abs(y - x) < DUP_MS)) out.push(x);
    return out;
  };
  const pick = (exactMs: number, applying: boolean | null, passes?: number[]) => ({ exactMs, applying, passes: passes ?? passOf(exactMs) });

  // The pass the moment is in: exact within a minute of the moment is exact now; before the pass's
  // first exact it is applying, after its last separating, and between two the motion decides.
  const pass = passOf(moment);
  const atNow = pass.find((x) => Math.abs(x - moment) <= EXACT_NOW_MS);
  if (atNow != null) return pick(atNow, opts.fallback ?? null, pass);
  const closing = res(now.lon) * now.speed < 0;
  const after = pass.find((x) => x > moment);
  const before = [...pass].reverse().find((x) => x < moment);
  if (after != null && (before == null || closing)) return pick(after, true, pass);
  if (before != null) return pick(before, false, pass);
  // No exact in this pass (a turn short of the point): closing, the next pass's first; else the last pass's last.
  if (closing) {
    const next = nextAfter();
    if (next != null) return pick(next, true);
    const last = lastBefore();
    return last != null ? pick(last, false) : none;
  }
  const last = lastBefore();
  if (last != null) return pick(last, false);
  const next = nextAfter();
  return next != null ? pick(next, null) : none;
}

/**
 * The same for a body read `days` from the moment (lonAt), in days from it:
 * the tests' straight lines. `applying` is the motion at the instant, said
 * of an exact within a minute of it.
 */
export function findExactDays(opts: {
  lonAt: LonAt;
  natalLon: number;
  target: number;
  applying: boolean | null;
  maxDays: number;
  stepDays?: number;
  bound?: number;
}): number | null {
  const found = exactOfPass({
    at: (ms) => opts.lonAt(ms / DAY_MS),
    momentMs: 0,
    natalLon: opts.natalLon,
    target: opts.target,
    stepDays: opts.stepDays ?? 1,
    maxDays: opts.maxDays,
    bound: opts.bound ?? 10,
    fallback: opts.applying,
  });
  return found.exactMs == null ? null : found.exactMs / DAY_MS;
}

/** A passage's moment as the tables give it: ISO, to the nearest second. */
export function passIso(ms: number): string {
  return new Date(Math.round(ms / 1000) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** The instant `days` after `from`, to the nearest second (ISO, no milliseconds). */
export function daysToIso(from: Date, days: number): string {
  const ms = from.getTime() + days * 86_400_000;
  return new Date(Math.round(ms / 1000) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Applying means the orb is still shrinking toward a future exact.
 * Missing Exact never defaults to applying — that is S (or not a row).
 */
export function applyingFromExactDays(
  days: number | null,
  fallback: boolean | null = null,
): boolean | null {
  if (days == null || !Number.isFinite(days)) return false;
  if (days > EXACT_NOW_DAYS) return true;
  if (days < -EXACT_NOW_DAYS) return false;
  return fallback;
}

/** An axis's far end, and the end it is named by. */
const AXIS_HEAD: Partial<Record<BodyId, BodyId>> = { descendant: "ascendant", ic: "midheaven", southnode: "northnode" };
/** The same aspect seen from the axis's other end. */
const AXIS_TURN: Partial<Record<AspectId, AspectId>> = { conjunction: "opposition", opposition: "conjunction", sextile: "trine", trine: "sextile" };

/**
 * One line for an axis: a square to the Ascendant is also a square to the
 * Descendant, and a conjunction with the MC an opposition to the IC. The
 * twins share this key; the one to the axis's named end (Ascendant, MC)
 * leads.
 */
function axisKey(a: AspectLink): string {
  const head = AXIS_HEAD[a.b];
  return head ? `${a.a}>${head}|${AXIS_TURN[a.type] ?? a.type}` : `${a.a}>${a.b}|${a.type}`;
}

/** Tightest applying majors: smallest orb, residual shrinking. Separating and minors skipped, an axis named once. */
export function tightestApplyingMajors(aspects: AspectLink[], n = 3): AspectLink[] {
  const tail = (a: AspectLink) => (AXIS_HEAD[a.b] ? 1 : 0);
  const sorted = aspects
    .filter((a) => isTransitTablePair(a) && a.applying === true)
    .sort((a, b) => Math.round((a.orb - b.orb) * 1e6) || tail(a) - tail(b) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const out: AspectLink[] = [];
  for (const a of sorted) {
    const key = axisKey(a);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
    if (out.length === n) break;
  }
  return out;
}

/**
 * About when a transit is within `orb` of exact on this pass (review 3 Oct,
 * R1): the moving body's speed at the moment shown carried both ways from
 * the exact moment. Null near a station or for a crawl that one span would
 * misstate (more than four months each side).
 */
export function inOrbSpan(exactUtc: string | null | undefined, speed: number | undefined, orb = 1): { from: number; to: number } | null {
  if (!exactUtc || speed == null || !Number.isFinite(speed) || Math.abs(speed) < 0.005) return null;
  const at = Date.parse(exactUtc);
  if (!Number.isFinite(at)) return null;
  const half = (orb / Math.abs(speed)) * 86_400_000;
  if (half > 120 * 86_400_000) return null;
  return { from: at - half, to: at + half };
}
