/**
 * A chart's geometry: longitudes, aspects (with applying or separating),
 * midpoints, fixed-star contacts, houses of a longitude, the lots. The first
 * page needs its aspects and midpoints; the chart's patterns (flags,
 * configurations, balance) live in patterns.ts, which only the cast, the
 * composite and the table load, with the dignity tables.
 */
import {
  ASPECT_META,
  aspectOrb,
  bodyName,
  MAJOR_ASPECT_IDS,
  MIDPOINT_DEFS,
  STAR_CONJUNCT_ORB,
  STAR_META,
} from "./constants";
import { formatDegree } from "../utils";
import { ASPECT_IDS, SIGN_IDS, STAR_IDS } from "./types";
import type { AngleId, AspectId, AspectLink, BodyId, MidpointHit, NatalChart, Placement, StarHit, StarId } from "./types";

const MAJOR_SET = new Set<string>(MAJOR_ASPECT_IDS);

const ASPECT_SKIP = new Set([
  "northnode|southnode",
  "southnode|northnode",
  "ascendant|descendant",
  "descendant|ascendant",
  "midheaven|ic",
  "ic|midheaven",
  "vertex|antivertex",
  "antivertex|vertex",
]);

export function wrap360(n: number): number {
  return ((n % 360) + 360) % 360;
}

export function wrap180(n: number): number {
  return ((n + 180) % 360 + 360) % 360 - 180;
}

export function sep180(a: number, b: number): number {
  return Math.abs((((a - b + 540) % 360) - 180));
}

export function midpointLon(a: number, b: number): number {
  const d = wrap360(b - a);
  return wrap360(a + (d <= 180 ? d / 2 : (d - 360) / 2));
}

/** Geometric altitude in degrees; positive = above the true horizon. */
export function altitudeFromEquatorial(
  latitudeDeg: number,
  raDeg: number,
  decDeg: number,
  armcDeg: number,
): number {
  const phi = (latitudeDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const ha = (wrap180(armcDeg - raDeg) * Math.PI) / 180;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha);
  return (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;
}

/**
 * Each charted star with the body it conjoins (tightest within
 * STAR_CONJUNCT_ORB). `positions` are the stars' apparent ecliptic
 * longitudes of the date, from Swiss Ephemeris (calculate.server.ts).
 */
export function computeStars(positions: Partial<Record<StarId, number>>, bodies: Placement[]): StarHit[] {
  const hits: StarHit[] = [];
  for (const id of STAR_IDS) {
    const meta = STAR_META[id];
    const ecliptic = positions[id];
    if (ecliptic == null || !Number.isFinite(ecliptic)) continue;
    let conjunct: StarHit["conjunct"] = null;
    for (const b of bodies) {
      const orb = sep180(ecliptic, b.ecliptic);
      if (orb <= STAR_CONJUNCT_ORB && (!conjunct || orb < conjunct.orb)) {
        conjunct = { body: b.id, orb: Number(orb.toFixed(4)) };
      }
    }
    hits.push({ id, name: meta.name, ecliptic, conjunct });
  }
  return hits;
}

function lonOf(id: BodyId, planets: Placement[], angles: NatalChart["angles"]): number | null {
  if (id in angles) return angles[id as AngleId].ecliptic;
  return planets.find((p) => p.id === id)?.ecliptic ?? null;
}

export function computeMidpoints(
  planets: Placement[],
  angles: NatalChart["angles"],
): MidpointHit[] {
  const out: MidpointHit[] = [];
  for (const def of MIDPOINT_DEFS) {
    const a = lonOf(def.a, planets, angles);
    const b = lonOf(def.b, planets, angles);
    if (a == null || b == null) continue;
    const ecliptic = midpointLon(a, b);
    out.push({
      id: def.id,
      a: def.a,
      b: def.b,
      ecliptic,
      sign: SIGN_IDS[Math.floor(ecliptic / 30) % 12] ?? "aries",
      formatted: formatDegree(ecliptic),
    });
  }
  return out;
}

/**
 * Applying or separating at the chart's instant: the sign of the orb's rate
 * of change, from the two speeds. (A step forward in time, however short,
 * misreads an aspect that perfects within the step: with 72 minutes, an
 * aspect 7 minutes from exact read "separating".) Null when the orb does not
 * move, or the aspect is exact.
 */
function applyingOf(a: Placement, b: Placement, target: number, movingOnly = false): boolean | null {
  const rel = (a.speed ?? 0) - (movingOnly ? 0 : (b.speed ?? 0));
  const d = ((((a.ecliptic - b.ecliptic + 180) % 360) + 360) % 360) - 180;
  const off = Math.abs(d) - target;
  if (d === 0 || off === 0) return null;
  const orbRate = Math.sign(off) * Math.sign(d) * rel;
  // Under 2e-7°/day the orb stands still (the threshold the step-based reading used).
  if (Math.abs(orbRate) <= 2e-7) return null;
  return orbRate < 0;
}

function bestAspect(sep: number, a?: BodyId, b?: BodyId): { type: AspectId; orb: number } | null {
  let best: { type: AspectId; orb: number } | null = null;
  for (const type of ASPECT_IDS) {
    const target = ASPECT_META[type].angle;
    const orb = Math.abs(sep - target);
    const max = aspectOrb(type, a, b);
    if (orb <= max && (!best || orb < best.orb)) best = { type, orb };
  }
  return best;
}

export function computeAspects(points: Placement[]): AspectLink[] {
  const seen = new Set<string>();
  const aspects: AspectLink[] = [];
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (!a || !b) continue;
      if (ASPECT_SKIP.has(`${a.id}|${b.id}`)) continue;
      const sep = sep180(a.ecliptic, b.ecliptic);
      const best = bestAspect(sep, a.id, b.id);
      if (!best) continue;
      const dedupe = [a.id, b.id].sort().join("|") + "|" + best.type;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      const target = ASPECT_META[best.type].angle;
      aspects.push({
        id: `${a.id}_${best.type}_${b.id}`,
        type: best.type,
        label: best.type,
        level: MAJOR_SET.has(best.type) ? "major" : "minor",
        a: a.id,
        b: b.id,
        aName: a.name || bodyName(a.id),
        bName: b.name || bodyName(b.id),
        orb: Number(best.orb.toFixed(4)),
        applying: applyingOf(a, b, target),
      });
    }
  }
  aspects.sort((x, y) => {
    if (x.level !== y.level) return x.level === "major" ? -1 : 1;
    return Math.abs(x.orb) - Math.abs(y.orb);
  });
  return aspects;
}

export function computeCrossAspects(
  moving: Placement[],
  natal: Placement[],
  opts?: { idPrefix?: string; skipAxes?: boolean },
): AspectLink[] {
  const prefix = opts?.idPrefix ?? "t";
  const skipAxes = opts?.skipAxes !== false;
  const aspects: AspectLink[] = [];
  for (const a of moving) {
    for (const b of natal) {
      if (skipAxes && ASPECT_SKIP.has(`${a.id}|${b.id}`)) continue;
      const sep = sep180(a.ecliptic, b.ecliptic);
      const best = bestAspect(sep, a.id, b.id);
      if (!best) continue;
      const target = ASPECT_META[best.type].angle;
      aspects.push({
        id: `${prefix}${a.id}_${best.type}_${b.id}`,
        type: best.type,
        label: best.type,
        level: MAJOR_SET.has(best.type) ? "major" : "minor",
        a: a.id,
        b: b.id,
        aName: a.name || bodyName(a.id),
        bName: b.name || bodyName(b.id),
        orb: Number(best.orb.toFixed(4)),
        applying: applyingOf(a, b, target, true),
      });
    }
  }
  aspects.sort((x, y) => {
    if (x.level !== y.level) return x.level === "major" ? -1 : 1;
    return Math.abs(x.orb) - Math.abs(y.orb);
  });
  return aspects;
}

/**
 * Inter-chart aspects for two natal skies. Applying uses both natal speeds
 * (same convention as a single natal), not transit-style moving-only.
 * Axis pairs are kept — A's node to B's south node is a real contact.
 */
export function computeSynastryAspects(aPoints: Placement[], bPoints: Placement[]): AspectLink[] {
  const aspects: AspectLink[] = [];
  for (const a of aPoints) {
    for (const b of bPoints) {
      const sep = sep180(a.ecliptic, b.ecliptic);
      const best = bestAspect(sep, a.id, b.id);
      if (!best) continue;
      const target = ASPECT_META[best.type].angle;
      aspects.push({
        id: `s${a.id}_${best.type}_${b.id}`,
        type: best.type,
        label: best.type,
        level: MAJOR_SET.has(best.type) ? "major" : "minor",
        a: a.id,
        b: b.id,
        aName: a.name || bodyName(a.id),
        bName: b.name || bodyName(b.id),
        orb: Number(best.orb.toFixed(4)),
        applying: applyingOf(a, b, target, false),
      });
    }
  }
  aspects.sort((x, y) => {
    if (x.level !== y.level) return x.level === "major" ? -1 : 1;
    return Math.abs(x.orb) - Math.abs(y.orb);
  });
  return aspects;
}

/**
 * Longitudes that land within this many degrees of a cusp are snapped onto it
 * (0.36 mas). Swiss returns the Ascendant and cusp 1 from the same computation,
 * but a progressed or precessed longitude can miss by a float ulp and fall into
 * the previous house.
 */
const CUSP_EPSILON = 1e-7;

/**
 * The single house-of-a-longitude rule for the whole app — natal, transits,
 * progressions, composite. Cusps are `[cusp1 … cusp12]` in zodiacal order and
 * may wrap through 0° Aries any number of times.
 */
export function houseFromCusps(ecliptic: number, cusps: number[]): number {
  if (!Number.isFinite(ecliptic) || cusps.length < 12) return 1;
  let lon = wrap360(ecliptic);
  for (let i = 0; i < 12; i += 1) {
    const cusp = wrap360(cusps[i] ?? 0);
    if (Math.abs(wrap180(lon - cusp)) <= CUSP_EPSILON) {
      lon = cusp;
      break;
    }
  }
  for (let i = 0; i < 12; i += 1) {
    const from = wrap360(cusps[i] ?? 0);
    const span = wrap360(wrap360(cusps[(i + 1) % 12] ?? 0) - from) || 360;
    if (wrap360(lon - from) < span) return i + 1;
  }
  return 1;
}

export function arabicLot(
  isDay: boolean,
  asc: number,
  sun: number,
  moon: number,
  kind: "fortune" | "spirit",
): number {
  const fortune = isDay ? wrap360(asc + moon - sun) : wrap360(asc + sun - moon);
  if (kind === "fortune") return fortune;
  return isDay ? wrap360(asc + sun - moon) : wrap360(asc + moon - sun);
}

export function starIdKey(id: StarId): string {
  return `star:${id}`;
}

export function midpointIdKey(id: string): string {
  return `mp:${id}`;
}

export function minutesApart(a: number, b: number): number {
  return sep180(a, b) * 60;
}
