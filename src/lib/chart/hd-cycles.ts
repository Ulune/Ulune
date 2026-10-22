/**
 * Human Design's life cycles and the solar return (share and compare plan,
 * feature 5b, decision R2; studio/modes/design-cycles.tsx): the moments a
 * slow planet comes back to its place in your chart (Saturn, about 29 and
 * 59; Chiron, about 50) or stands opposite it (Uranus, about 38 to 45), and
 * the moment the Sun comes back to its own each year. Every passage is
 * found exactly, to the second: the sky is sampled every 30 days, each
 * crossing is found on the curve through the samples' positions and speeds,
 * then polished on the sky itself, Newton kept inside its bracket. A slow
 * planet can pass its point up to three times (five for Chiron), turning
 * back and forward again: every passage is listed, with its direction.
 *
 * Pure, no browser: the sky comes in (studio/modes/hooks/useHdCycles.ts: the
 * door's casts on this device, the shared year files and chunks when the
 * reader chose Ulune's server), so scripts/hd-cycles.test.mjs runs the same
 * search on the engine and checks it to the minute.
 *
 * Where each cycle is looked for, by age, with room either side of what a
 * scan of births from 1900 to 2020 gave (Saturn 28.4 to 29.9, Uranus 38.7 to
 * 45.3, Chiron 48.4 to 51.7, Saturn again 58.2 to 59.7); nothing found
 * there, the window widens once by three years.
 */
import { hermite } from "./sky-window";
import { eclipticToGate, wrap360, type HumanDesignChart } from "./human-design";
import type { HdTransit, LifeCycleRefId } from "./hd-transit";

export type CycleBody = "saturn" | "uranus" | "chiron";
export type LifeCycleId = LifeCycleRefId;

export type LifeCycleDef = {
  id: LifeCycleId;
  body: CycleBody;
  /** 0: the planet's return to its own place; 180: its opposition to it. */
  offset: 0 | 180;
  /** The ages searched (years). */
  ages: readonly [number, number];
  /** The ages Human Design gives for it (years), as the page says them. */
  about: readonly [number, number];
};

/** In the order of life. */
export const LIFE_CYCLES: readonly LifeCycleDef[] = [
  { id: "saturn1", body: "saturn", offset: 0, ages: [27.5, 31], about: [28, 30] },
  { id: "uranus", body: "uranus", offset: 180, ages: [37, 47], about: [38, 44] },
  { id: "chiron", body: "chiron", offset: 0, ages: [46.5, 53.5], about: [50, 51] },
  { id: "saturn2", body: "saturn", offset: 0, ages: [57, 61], about: [57, 60] },
];

export const DAY_MS = 86_400_000;
/** A year of life, as ages are counted (the mean Gregorian year). */
export const YEAR_MS = 365.2425 * DAY_MS;
/** The samples' step, days: the curve between two samples stays within about 0.001° of the sky for these planets. */
export const SCAN_STEP_DAYS = 30;
/** Samples start on multiples of the step from this day, whoever is asked about. */
const GRID_EPOCH = Date.UTC(2000, 0, 1);
/** A season of life: a cycle is "now" from a year before its first exact passage to a year after its last. */
export const SEASON_MS = YEAR_MS;
/** The ephemeris's reach (as the server's inputs and the door's casts allow). */
export const SKY_FIRST_MS = Date.UTC(-599, 0, 1);
export const SKY_LAST_MS = Date.UTC(2399, 11, 31, 23, 59, 59);

export type SkyPoint = { lon: number; speed: number };
/** The sky at a moment: the bodies asked for (null when it cannot be had there). */
export type SkyAt = (ms: number) => Promise<Partial<Record<string, SkyPoint>> | null>;

export type Passage = {
  /** The exact moment, ms UTC. */
  at: number;
  /** Made moving backwards. */
  retrograde: boolean;
};

export type LifeCycle = {
  id: LifeCycleId;
  body: CycleBody;
  /** The planet's place at birth, and the point it comes back to (or opposite it), degrees. */
  natal: number;
  target: number;
  /** That point's gate and line. */
  gate: { gate: number; line: number };
  passages: Passage[];
  /** From a year before the first passage to a year after the last (null without a passage). */
  season: { from: number; to: number } | null;
  /** Its window runs past the ephemeris (2399): what lies beyond is not known. */
  beyond: boolean;
};

export type CycleStatus = "past" | "now" | "coming";

const wrap180 = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;

function abortError(): Error {
  return typeof DOMException === "function" ? new DOMException("Aborted", "AbortError") : Object.assign(new Error("Aborted"), { name: "AbortError" });
}

type Sample = { t: number; lon: number; speed: number };

/** One body's sample at a moment (null when the sky lacks it there). */
async function sampleOf(sky: SkyAt, body: string, t: number): Promise<Sample | null> {
  const s = await sky(t);
  const p = s?.[body];
  return p && Number.isFinite(p.lon) && Number.isFinite(p.speed) ? { t, lon: p.lon, speed: p.speed } : null;
}

/**
 * The exact passage inside a bracket whose ends lie either side of the point
 * (or the best moment near it), polished on the sky: Newton on the body's own
 * speed while it stays inside the bracket, halving it otherwise, to a
 * millisecond or 1e-8°. Null when the body never comes within 1′ (a turn
 * just short of the point).
 */
async function polish(sky: SkyAt, body: string, target: number, lo: Sample, hi: Sample, guess: number): Promise<Passage | null> {
  const res = (s: Sample) => wrap180(s.lon - target);
  let a = lo;
  let b = hi;
  let ra = res(a);
  const rb = res(b);
  const bracketed = ra * rb <= 0;
  let t = Math.min(Math.max(guess, a.t), b.t);
  let best: Sample | null = null;
  for (let i = 0; i < 60; i += 1) {
    const s = await sampleOf(sky, body, t);
    if (!s) return null;
    const r = res(s);
    if (!best || Math.abs(r) < Math.abs(res(best))) best = s;
    if (Math.abs(r) < 1e-8) break;
    if (bracketed) {
      if (ra * r < 0) b = s;
      else {
        a = s;
        ra = r;
      }
    }
    let next = Math.abs(s.speed) > 1e-6 ? t - (r / s.speed) * DAY_MS : Number.NaN;
    if (bracketed && !(next > a.t && next < b.t)) next = (a.t + b.t) / 2;
    if (!Number.isFinite(next)) break;
    // Without a bracket (a turn grazing the point), Newton that runs off is let go: the best moment stays.
    if (!bracketed && Math.abs(next - guess) > 2 * DAY_MS) break;
    if (Math.abs(next - t) < 1 || (bracketed && b.t - a.t < 1)) {
      t = next;
      break;
    }
    t = next;
  }
  if (!best || Math.abs(res(best)) >= 1 / 60) return null;
  return { at: Math.round(best.t), retrograde: best.speed < 0 };
}

/**
 * Every moment the body stands exactly on `target` between `from` and `to`
 * (ms), in order. `batch` samples are asked for at once (the device's engine
 * answers one after another, so other calculations still find their turn).
 */
export async function findPassages(
  sky: SkyAt,
  body: string,
  target: number,
  from: number,
  to: number,
  opts: { stepDays?: number; batch?: number; signal?: AbortSignal } = {},
): Promise<Passage[]> {
  const stepMs = (opts.stepDays ?? SCAN_STEP_DAYS) * DAY_MS;
  const batch = Math.max(1, opts.batch ?? 6);
  const first = Math.max(SKY_FIRST_MS, GRID_EPOCH + Math.floor((from - GRID_EPOCH) / stepMs) * stepMs);
  const times: number[] = [];
  for (let t = first; t <= Math.min(SKY_LAST_MS, to + stepMs); t += stepMs) times.push(t);
  const samples: (Sample | null)[] = new Array(times.length).fill(null);
  for (let i = 0; i < times.length; i += batch) {
    if (opts.signal?.aborted) throw abortError();
    const got = await Promise.all(times.slice(i, i + batch).map((t) => sampleOf(sky, body, t)));
    got.forEach((s, k) => {
      samples[i + k] = s;
    });
  }
  if (opts.signal?.aborted) throw abortError();
  const res = (lon: number) => wrap180(lon - target);
  const out: Passage[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    const p = samples[i - 1];
    const q = samples[i];
    if (!p || !q) continue;
    const h = (q.t - p.t) / DAY_MS;
    // The curve through both samples, a day at a time: a turn between two samples can cross twice.
    const n = Math.max(2, Math.ceil(h));
    let u0 = 0;
    let r0 = res(p.lon);
    for (let k = 1; k <= n; k += 1) {
      const u1 = k / n;
      const r1 = k === n ? res(q.lon) : res(hermite(p.lon, p.speed, q.lon, q.speed, u1, h).lon);
      if (r0 * r1 <= 0 && Math.abs(r1 - r0) < 90 && !(r0 === 0 && k > 1)) {
        // The crossing on the curve, then on the sky itself, inside a bracket a day wider each side.
        let lo = u0;
        let hi = u1;
        let rl = r0;
        for (let j = 0; j < 40; j += 1) {
          const mid = (lo + hi) / 2;
          const rm = res(hermite(p.lon, p.speed, q.lon, q.speed, mid, h).lon);
          if (rl * rm <= 0) hi = mid;
          else {
            lo = mid;
            rl = rm;
          }
        }
        const guess = p.t + ((lo + hi) / 2) * h * DAY_MS;
        const a = await sampleOf(sky, body, Math.max(SKY_FIRST_MS, p.t + u0 * h * DAY_MS - DAY_MS));
        const b = await sampleOf(sky, body, Math.min(SKY_LAST_MS, p.t + u1 * h * DAY_MS + DAY_MS));
        if (a && b) {
          const found = await polish(sky, body, target, a, b, guess);
          if (found && found.at >= from - DAY_MS && found.at <= to + DAY_MS && !out.some((x) => Math.abs(x.at - found.at) < 60_000)) out.push(found);
        }
      }
      u0 = u1;
      r0 = r1;
    }
  }
  return out.sort((x, y) => x.at - y.at);
}

/** The point a cycle comes to: the planet's natal place, or opposite it. */
export const cycleTarget = (def: LifeCycleDef, natal: number): number => wrap360(natal + def.offset);

/**
 * The four life cycles of a birth (`birth` ms UTC; the natal places of
 * Saturn, Uranus and Chiron, degrees), each with every exact passage. A cycle
 * whose planet has no place (Chiron outside its ephemeris) is left out.
 */
export async function lifeCycles(
  sky: SkyAt,
  birth: number,
  natal: Partial<Record<CycleBody, number>>,
  opts: { signal?: AbortSignal; batch?: number; stepDays?: number; only?: readonly LifeCycleId[] } = {},
): Promise<LifeCycle[]> {
  const out: LifeCycle[] = [];
  for (const def of LIFE_CYCLES) {
    if (opts.only && !opts.only.includes(def.id)) continue;
    const place = natal[def.body];
    if (place == null || !Number.isFinite(place)) continue;
    const target = cycleTarget(def, place);
    const windowOf = (pad: number) => {
      const from = birth + (def.ages[0] - pad) * YEAR_MS;
      const to = birth + (def.ages[1] + pad) * YEAR_MS;
      return { from, to, beyond: to > SKY_LAST_MS };
    };
    let w = windowOf(0);
    let passages = w.from > SKY_LAST_MS ? [] : await findPassages(sky, def.body, target, w.from, Math.min(w.to, SKY_LAST_MS), opts);
    if (!passages.length && !w.beyond) {
      w = windowOf(3);
      if (w.from <= SKY_LAST_MS) passages = await findPassages(sky, def.body, target, w.from, Math.min(w.to, SKY_LAST_MS), opts);
    }
    const firstAt = passages[0]?.at;
    const lastAt = passages[passages.length - 1]?.at;
    out.push({
      id: def.id,
      body: def.body,
      natal: wrap360(place),
      target,
      gate: eclipticToGate(target),
      passages,
      season: firstAt != null && lastAt != null ? { from: firstAt - SEASON_MS, to: lastAt + SEASON_MS } : null,
      beyond: w.beyond && !passages.length,
    });
  }
  return out;
}

/** Where a cycle stands at a moment: behind, in its season, or ahead. */
export function cycleStatus(c: Pick<LifeCycle, "season" | "passages">, at: number): CycleStatus | null {
  if (!c.season) return null;
  if (at > c.season.to) return "past";
  if (at >= c.season.from) return "now";
  return "coming";
}

/** Age at a moment, in whole years and months (the months 0 to 11). */
export function ageAt(birth: number, at: number): { years: number; months: number } {
  const total = Math.floor(((at - birth) / YEAR_MS) * 12 + 1e-9);
  return { years: Math.floor(total / 12), months: ((total % 12) + 12) % 12 };
}

/**
 * The solar return of a year: the moment the Sun comes back to `natalSun`
 * (degrees) near the birthday in `year`, found on the sky (Newton on the
 * Sun's own speed, from the birthday's same clock time UTC). Null when the
 * sky cannot say.
 */
export async function solarReturn(sky: SkyAt, birth: number, natalSun: number, year: number): Promise<number | null> {
  const b = new Date(birth);
  const guess = new Date(0);
  guess.setUTCFullYear(year, b.getUTCMonth(), b.getUTCDate());
  guess.setUTCHours(b.getUTCHours(), b.getUTCMinutes(), 0, 0);
  let t = guess.getTime();
  if (t < SKY_FIRST_MS + 3 * DAY_MS || t > SKY_LAST_MS - 3 * DAY_MS) return null;
  for (let i = 0; i < 12; i += 1) {
    const s = await sampleOf(sky, "sun", t);
    if (!s || !(s.speed > 0)) return null;
    const r = wrap180(s.lon - natalSun);
    const dt = (-r / s.speed) * DAY_MS;
    if (Math.abs(r) < 1e-8 || Math.abs(dt) < 1) return Math.round(t + dt);
    t += dt;
    if (Math.abs(t - guess.getTime()) > 4 * DAY_MS) return null;
  }
  return Math.round(t);
}

/**
 * What the page's readings, first read and table read (the reading pack's
 * interpret-hd-cycles.ts, the table's hd-cycles-table.ts): the person's
 * bodygraph under the moment, its life cycles and the year's solar return.
 */
export type HdCyclesContext = {
  /** The person's own bodygraph. */
  hd: HumanDesignChart;
  name: string;
  /** Birth, ms UTC (ages are counted from it). */
  birth: number;
  /** The moment on the dial, ms UTC, and the bodygraph under it (null until the sky is here). */
  at: number;
  transit: HdTransit | null;
  /** How long the Sun and the Moon stay in their gates around the moment (null until the chunks are here). */
  week: { gate: number; line: number; from: number; to: number } | null;
  moon: { gate: number; line: number; from: number; to: number } | null;
  /** The life cycles (null while they are worked out). */
  cycles: LifeCycle[] | null;
  /** The chosen year's solar return: its moment (null when the sky could not say) and the bodygraph under it. */
  solar: { year: number; at: number | null; transit: HdTransit | null } | null;
  /** The birthplace's zone (the cycles' dates and the solar return are said there) and its name ("Paris"). */
  zone: string;
  place: string;
  /** The dial's clock (the moment's times are said there). */
  clock: string;
  /** No birth time: the places at birth are taken at noon. */
  timeUnknown: boolean;
};
