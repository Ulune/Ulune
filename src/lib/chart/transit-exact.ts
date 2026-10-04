import { ASPECT_META, aspectOrb, MAJOR_ASPECT_IDS, MEAN_SPEED, STATION_SPEED, SWIFT_BODIES } from "./constants";
import type { AspectId, AspectLink, BodyId, TimingHit } from "./types";

const MAJOR = new Set<string>(MAJOR_ASPECT_IDS);

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

/**
 * Whether |residual| shrinks a few days ahead. Station uses a longer probe so a
 * 0.05-day linear step cannot freeze the hit as applying.
 */
export function residualIsShrinking(
  lonAt: LonAt,
  natalLon: number,
  target: number,
  pole: 1 | -1,
): boolean | null {
  const s0 = lockedAspectResidual(lonAt(0).lon, natalLon, target, pole);
  const r0 = Math.abs(s0);
  const speed = Math.abs(lonAt(0).speed);
  const toward = r0 / Math.max(speed, 1e-6);
  const cap = speed >= 0.1 ? 0.5 : speed >= 0.01 ? 4 : 12;
  const probe = Math.min(cap, Math.max(0.02, 0.35 * toward));
  const later = lonAt(probe);
  if (!Number.isFinite(later.lon)) return null;
  const s1 = lockedAspectResidual(later.lon, natalLon, target, pole);
  // Exact within the probe (the Moon a few minutes short of it): it perfects
  // ahead, though the residual at the probe's end is larger than now.
  if (s0 !== 0 && Math.sign(s1) !== Math.sign(s0) && Math.abs(s1 - s0) < 90) return true;
  const r1 = Math.abs(s1);
  if (r1 < r0 - 1e-6) return true;
  if (r1 > r0 + 1e-6) return false;
  return null;
}

/**
 * Days from the sample epoch at which the locked pole is exact.
 * Applying searches forward; separating searches backward. Never invents a date.
 * A shrinking residual that never perfects returns null — not a past exact.
 */
export function findExactDays(opts: {
  lonAt: LonAt;
  natalLon: number;
  target: number;
  applying: boolean | null;
  maxDays: number;
}): number | null {
  const { lonAt, natalLon, target, applying, maxDays } = opts;
  const t0 = lonAt(0);
  if (!Number.isFinite(t0.lon)) return null;
  const pole = aspectPole(t0.lon, natalLon, target);
  const residualAt = (days: number) =>
    lockedAspectResidual(lonAt(days).lon, natalLon, target, pole);

  const r0 = residualAt(0);
  const polish = (days: number | null, bracket?: [number, number]) =>
    days == null ? null : polishExact(lonAt, natalLon, target, pole, days, bracket);
  const polishBracketed = (hit: BracketHit | null) => (hit ? polish(hit.days, hit.bracket) : null);
  // Within 1′ now: the perfecting is at hand — but for a slow body that can
  // still be a day or more away, so it is solved, not assumed to be now.
  if (Math.abs(r0) < EXACT_DEG) {
    const near = polish(0);
    return near != null && Math.abs(near) <= 30 ? near : 0;
  }

  const shrinking = residualIsShrinking(lonAt, natalLon, target, pole);
  const wantFuture =
    shrinking === true ? true : shrinking === false ? false : applying;

  const newton = newtonExact(lonAt, natalLon, target, pole, maxDays, t0);
  const newtonOk = newton != null && Math.abs(residualAt(newton)) < EXACT_DEG;
  if (newtonOk && newton != null) {
    const past = newton < -EXACT_NOW_DAYS;
    const future = newton > EXACT_NOW_DAYS;
    if (!(wantFuture === true && past) && !(wantFuture === false && future)) {
      return polish(newton);
    }
  }

  if (wantFuture === true) return polishBracketed(bracketExact(residualAt, 1, maxDays, r0));
  if (wantFuture === false) return polishBracketed(bracketExact(residualAt, -1, maxDays, r0));

  const fwd = polishBracketed(bracketExact(residualAt, 1, maxDays, r0));
  const back = polishBracketed(bracketExact(residualAt, -1, maxDays, r0));
  if (fwd == null) return back;
  if (back == null) return fwd;
  return Math.abs(fwd) <= Math.abs(back) ? fwd : back;
}

type BracketHit = { days: number; bracket?: [number, number] };

function newtonExact(
  lonAt: LonAt,
  natalLon: number,
  target: number,
  pole: 1 | -1,
  maxDays: number,
  start: { lon: number; speed: number },
): number | null {
  let days = 0;
  let lon = start.lon;
  let speed = start.speed;
  for (let i = 0; i < 12; i += 1) {
    const r = lockedAspectResidual(lon, natalLon, target, pole);
    if (Math.abs(r) < FINE_DEG) return days;
    if (!Number.isFinite(speed) || Math.abs(speed) < NEWTON_MIN_SPEED) return null;
    const step = -r / speed;
    if (!Number.isFinite(step) || Math.abs(days + step) > maxDays) return null;
    days += step;
    const next = lonAt(days);
    if (!Number.isFinite(next.lon)) return null;
    lon = next.lon;
    speed = next.speed;
  }
  const r = lockedAspectResidual(lon, natalLon, target, pole);
  return Math.abs(r) < EXACT_DEG ? days : null;
}

function bracketExact(
  residualAt: (days: number) => number,
  dir: 1 | -1,
  maxDays: number,
  r0: number,
): BracketHit | null {
  let step = Math.min(1, Math.max(maxDays / 80, 0.02));
  let prevD = 0;
  let prevR = r0;
  for (let d = step; d <= maxDays + 1e-9; d += step) {
    const r = residualAt(dir * d);
    if (!Number.isFinite(r)) return null;
    if (Math.abs(r) < EXACT_DEG) {
      // Inside 1′ at a sample: the root is near; bracket it if the step crossed it.
      const crossed = prevR * r <= 0;
      return { days: dir * d, bracket: crossed ? [dir * prevD, dir * d] : undefined };
    }
    // A change of sign is a root, unless the residual jumped round the circle
    // (from −180° to +180°: the other pole of the aspect, not an exact).
    if ((prevR === 0 || r === 0 || prevR * r < 0) && Math.abs(r - prevR) < 180) {
      return { days: dir * bisectAbs(residualAt, dir, prevD, d, prevR, r), bracket: [dir * prevD, dir * d] };
    }
    prevD = d;
    prevR = r;
    if (d > 16) step = Math.min(step * 1.12, Math.max(8, maxDays / 40));
  }
  return null;
}

function bisectAbs(
  residualAt: (days: number) => number,
  dir: 1 | -1,
  d0: number,
  d1: number,
  r0: number,
  r1: number,
): number {
  let left = d0;
  let right = d1;
  let leftR = r0;
  let rightR = r1;
  for (let i = 0; i < 48; i += 1) {
    const mid = (left + right) / 2;
    const r = residualAt(dir * mid);
    if (!Number.isFinite(r) || Math.abs(r) < FINE_DEG) return mid;
    if (leftR * r <= 0) {
      right = mid;
      rightR = r;
    } else {
      left = mid;
      leftR = r;
    }
    void rightR;
  }
  return (left + right) / 2;
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
