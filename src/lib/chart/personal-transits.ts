/**
 * Your transits worked out on this device (part 54 of the launch plan): the
 * exact moments with the search the server ran until then
 * (transit-exact.ts), on the shared sky chunks' 12-hour samples
 * (sky-window.ts) instead of Swiss, and the slow bodies' long windows on the
 * year files' daily samples (sky-year.ts). Your chart never leaves the
 * device for this: the files are the same for everyone, asked for by date.
 */
import { MAJOR_ASPECT_IDS } from "./constants";
import { bodyAt, type SkyWindow } from "./sky-window";
import { SKY_SLOW_BODIES, slowAt, type SkyYear, type SlowBody } from "./sky-year";
import {
  aspectPoles,
  aspectTarget,
  daysToIso,
  findExactsFromSamples,
  timingExactId,
  TRANSIT_TABLE_NATAL,
  type LonAt,
  type LonSample,
} from "./transit-exact";
import type { AspectId, BodyId, PlanetId, TimingHit } from "./types";

const DAY_MS = 86_400_000;
/** Samples searched beyond each end, as the server did. */
const PAD_MS = 1.5 * DAY_MS;

/**
 * Moving bodies. Not Lilith: its osculating point jitters (233 exacts a year
 * for the test chart). Not the South Node: it is the North Node's mirror.
 */
export const CALENDAR_MOVERS = [
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
] as const satisfies readonly PlanetId[];

/** A point and its partner opposite: every aspect to one is an aspect to the other, at the same moment. */
export const TWIN_OF: Partial<Record<BodyId, BodyId>> = { descendant: "ascendant", ic: "midheaven", southnode: "northnode" };

export type NatalPoint = { id: BodyId; ecliptic: number };

/** Natal points the calendar aims at: planets, Chiron, the nodes, Lilith and the angles. */
function targetsOf(natal: readonly NatalPoint[]): NatalPoint[] {
  return natal.filter((p) => TRANSIT_TABLE_NATAL.has(p.id) && Number.isFinite(p.ecliptic));
}

type Series = { base: number; samples: LonSample[]; lonAt: LonAt };

/** The chunks' own samples of a body over [from, to] and the Hermite curve between them, in days from `base`. */
function chunkSeries(wins: readonly SkyWindow[], body: PlanetId, from: number, to: number, base: number): Series | null {
  const sorted = [...wins].sort((a, b) => a.t0 - b.t0);
  const samples: LonSample[] = [];
  let last = -Infinity;
  for (const w of sorted) {
    const s = w.bodies[body];
    if (!s) return null;
    const stepMs = w.step * 3_600_000;
    for (let i = 0; i < w.n; i += 1) {
      const ms = w.t0 + i * stepMs;
      if (ms < from || ms > to || ms <= last) continue;
      const lon = s[2 * i];
      const speed = s[2 * i + 1];
      if (lon == null || speed == null) continue;
      samples.push({ days: (ms - base) / DAY_MS, lon, speed });
      last = ms;
    }
  }
  const lonAt: LonAt = (days) => {
    const ms = base + days * DAY_MS;
    const w = sorted.find((x) => ms >= x.t0 && ms <= x.t0 + (x.n - 1) * x.step * 3_600_000);
    return (w && bodyAt(w, body, ms)) ?? { lon: Number.NaN, speed: Number.NaN };
  };
  return { base, samples, lonAt };
}

/** Whether the chunks hold every sample from `from` to `to` without a gap. */
export function windowsCover(wins: readonly SkyWindow[], from: number, to: number): boolean {
  const sorted = [...wins].sort((a, b) => a.t0 - b.t0);
  let reach = from;
  for (const w of sorted) {
    const end = w.t0 + (w.n - 1) * w.step * 3_600_000;
    if (w.t0 <= reach && end >= reach) reach = end;
  }
  return reach >= to;
}

/**
 * Every exact major aspect of a moving body to your chart in [from, to), from
 * the chunks (which must cover it and a day and a half each side). Paired
 * points are all listed; foldTwins keeps one of each pair.
 */
export function transitsFromWindows(
  wins: readonly SkyWindow[],
  natal: readonly NatalPoint[],
  from: number,
  to: number,
  movers: readonly PlanetId[] = CALENDAR_MOVERS,
): TimingHit[] {
  const lo = from - PAD_MS;
  const hi = to + PAD_MS;
  if (!windowsCover(wins, lo, hi)) return [];
  const spanDays = (to - from) / DAY_MS;
  const start = new Date(from);
  const targets = targetsOf(natal);
  const hits: TimingHit[] = [];
  for (const moving of movers) {
    const series = chunkSeries(wins, moving, lo, hi, from);
    if (!series || series.samples.length < 2) continue;
    for (const target of targets) {
      // The node's own mirror is not a transit.
      if (moving === "northnode" && target.id === "southnode") continue;
      for (const type of MAJOR_ASPECT_IDS) {
        const angle = aspectTarget(type);
        for (const pole of aspectPoles(angle)) {
          const days = findExactsFromSamples({
            samples: series.samples,
            lonAt: series.lonAt,
            natalLon: target.ecliptic,
            target: angle,
            pole,
            minDays: 0,
            maxDays: spanDays,
          });
          for (const d of days) {
            if (d < -1e-6 || d >= spanDays) continue;
            const exactUtc = daysToIso(start, d);
            hits.push({ id: timingExactId(moving, type, target.id, exactUtc), moving, natal: target.id, type, exactUtc });
          }
        }
      }
    }
  }
  hits.sort((a, b) => Date.parse(a.exactUtc) - Date.parse(b.exactUtc) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = `${h.moving}|${h.type}|${h.natal}|${h.exactUtc.slice(0, 16)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * One row per moment when a body aspects a pair of opposite points (the
 * Ascendant and the Descendant, the Midheaven and the IC, the two nodes):
 * the partner's (Ascendant, Midheaven, North Node) is kept.
 */
export function foldTwins<T extends Pick<TimingHit, "moving" | "natal" | "exactUtc">>(hits: readonly T[]): T[] {
  const primary = new Map<string, number[]>();
  for (const h of hits) {
    if (TWIN_OF[h.natal]) continue;
    const key = `${h.moving}|${h.natal}`;
    const list = primary.get(key) ?? [];
    list.push(Date.parse(h.exactUtc));
    primary.set(key, list);
  }
  return hits.filter((h) => {
    const partner = TWIN_OF[h.natal];
    if (!partner) return true;
    const t = Date.parse(h.exactUtc);
    return !(primary.get(`${h.moving}|${partner}`) ?? []).some((p) => Math.abs(p - t) < 60_000);
  });
}

/** A slow transit as a period: while within 1° of exact, with each exact pass. */
export type TransitWindow = {
  moving: SlowBody;
  natal: BodyId;
  type: AspectId;
  /** Within 1° from … to …, ms UTC (to the day's sample, interpolated). */
  from: number;
  to: number;
  /** Exact passes inside, ms UTC. None: a near miss (it turns back before exact). */
  passes: number[];
  /** The closest it comes, degrees (0 when it passes exact). */
  minOrb: number;
  /** It was already within 1° at the first day the files hold, or still is at the last. */
  openStart: boolean;
  openEnd: boolean;
};

export const SLOW_WINDOW_ORB = 1;

/**
 * The slow bodies' periods within 1° of an exact aspect to your chart that
 * overlap [from, to), from the year files (contiguous years). Paired points
 * count once (the Ascendant, the Midheaven, the North Node).
 */
export function slowWindowsFromYears(years: readonly SkyYear[], natal: readonly NatalPoint[], from: number, to: number): TransitWindow[] {
  const sorted = [...years].sort((a, b) => a.y - b.y);
  if (!sorted.length) return [];
  for (let i = 1; i < sorted.length; i += 1) if (sorted[i]!.y !== sorted[i - 1]!.y + 1) return [];
  const base = sorted[0]!.t0;
  const targets = targetsOf(natal).filter((p) => !TWIN_OF[p.id]);
  const out: TransitWindow[] = [];
  for (const moving of SKY_SLOW_BODIES) {
    const samples: LonSample[] = [];
    let last = -Infinity;
    for (const y of sorted) {
      const s = y.bodies[moving];
      if (!s) continue;
      for (let i = 0; i < y.n; i += 1) {
        const ms = y.t0 + i * y.step * 3_600_000;
        if (ms <= last) continue;
        samples.push({ days: (ms - base) / DAY_MS, lon: s[2 * i]!, speed: s[2 * i + 1]! });
        last = ms;
      }
    }
    if (samples.length < 2) continue;
    const lonAt: LonAt = (days) => {
      const ms = base + days * DAY_MS;
      const y = sorted.find((x) => ms >= x.t0 && ms <= x.t0 + (x.n - 1) * x.step * 3_600_000);
      return (y && slowAt(y, moving, ms)) ?? { lon: Number.NaN, speed: Number.NaN };
    };
    const lastDay = samples[samples.length - 1]!.days;
    for (const target of targets) {
      for (const type of MAJOR_ASPECT_IDS) {
        const angle = aspectTarget(type);
        const orbOf = (lon: number) => Math.abs(Math.abs(((((lon - target.ecliptic) % 360) + 540) % 360) - 180) - angle);
        const orbs = samples.map((s) => orbOf(s.lon));
        let i = 0;
        while (i < orbs.length) {
          if (orbs[i]! > SLOW_WINDOW_ORB) {
            i += 1;
            continue;
          }
          let j = i;
          while (j + 1 < orbs.length && orbs[j + 1]! <= SLOW_WINDOW_ORB) j += 1;
          // Edges between the samples, by the line through their orbs.
          const edge = (a: number, b: number) => {
            const oa = orbs[a]!;
            const ob = orbs[b]!;
            const u = oa === ob ? 0 : (SLOW_WINDOW_ORB - oa) / (ob - oa);
            return samples[a]!.days + (samples[b]!.days - samples[a]!.days) * Math.min(1, Math.max(0, u));
          };
          const d0 = i > 0 ? edge(i - 1, i) : samples[0]!.days;
          const d1 = j + 1 < orbs.length ? edge(j + 1, j) : lastDay;
          const wFrom = base + d0 * DAY_MS;
          const wTo = base + d1 * DAY_MS;
          if (wTo >= from && wFrom < to) {
            const passes: number[] = [];
            for (const pole of aspectPoles(angle)) {
              for (const d of findExactsFromSamples({
                samples: samples.slice(Math.max(0, i - 1), Math.min(samples.length, j + 2)),
                lonAt,
                natalLon: target.ecliptic,
                target: angle,
                pole,
                minDays: d0,
                maxDays: d1,
              })) {
                if (d >= d0 - 1e-6 && d <= d1 + 1e-6) passes.push(Math.round(base + d * DAY_MS));
              }
            }
            passes.sort((a, b) => a - b);
            const unique = passes.filter((p, k) => k === 0 || p - passes[k - 1]! > 60_000);
            out.push({
              moving,
              natal: target.id,
              type,
              from: Math.round(wFrom),
              to: Math.round(wTo),
              passes: unique,
              minOrb: unique.length ? 0 : Math.min(...orbs.slice(i, j + 1)),
              openStart: i === 0,
              openEnd: j === orbs.length - 1,
            });
          }
          i = j + 1;
        }
      }
    }
  }
  return out.sort((a, b) => a.from - b.from || a.moving.localeCompare(b.moving));
}

/** Give the page a moment between two slices of work. */
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * transitsFromWindows a body at a time, handing the page back between two
 * (a year is some 150 ms of work in all), then paired points folded. Null
 * when aborted.
 */
export async function transitsInSlices(
  wins: readonly SkyWindow[],
  natal: readonly NatalPoint[],
  from: number,
  to: number,
  signal?: AbortSignal,
): Promise<TimingHit[] | null> {
  const all: TimingHit[] = [];
  for (const moving of CALENDAR_MOVERS) {
    await pause();
    if (signal?.aborted) return null;
    all.push(...transitsFromWindows(wins, natal, from, to, [moving]));
  }
  all.sort((a, b) => Date.parse(a.exactUtc) - Date.parse(b.exactUtc) || a.id.localeCompare(b.id));
  return foldTwins(all);
}
