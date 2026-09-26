import { ANGLE_BODIES, ASTEROID_BODIES, CLASSICAL_BODIES, MAJOR_ASPECT_IDS, ORB_MAX, ORB_MIN, POINT_BODIES, TIGHT_ORB } from "./constants";
import { ASPECT_IDS, type AspectId, type AspectLink, type BodyId } from "./types";

const KEY = "ulune.wheel.aspects";

const ANGLE_SET = new Set<string>(ANGLE_BODIES);
const NODE_SET = new Set<string>(["northnode", "southnode"]);
const POINT_TARGET_SET = new Set<string>(POINT_BODIES.filter((b) => !NODE_SET.has(b)));
const LUMINARY_SET = new Set<string>(["sun", "moon"]);
const ASTEROID_SET = new Set<string>(ASTEROID_BODIES);
const PLANET_SET = new Set<string>(CLASSICAL_BODIES);

export type AspectFilter = {
  types: Set<AspectId>;
  /** Hide aspects wider than this (degrees). {ORB_MAX} ≈ no extra filter. */
  maxOrb: number;
  /** Draw aspect lines to ASC/MC/DSC/IC. Default on. */
  toAngles: boolean;
  /** Draw aspect lines to the lunar nodes. Default on. */
  toNodes: boolean;
  /** Draw aspect lines to Fortune, Lilith, Vertex, and other mixer points. Default on. */
  toPoints: boolean;
  /** Draw aspect lines to the Sun and Moon. Default on. */
  toLuminaries: boolean;
  /** Draw aspect lines to the mixer asteroids. Default on. */
  toAsteroids: boolean;
  /** Draw aspect lines to Mercury through Pluto. Default on. */
  toPlanets: boolean;
};

export const DEFAULT_ASPECT_FILTER: AspectFilter = {
  types: new Set(MAJOR_ASPECT_IDS),
  maxOrb: 5,
  toAngles: true,
  toNodes: true,
  toPoints: true,
  toLuminaries: true,
  toAsteroids: true,
  toPlanets: true,
};

function isAspectId(id: unknown): id is AspectId {
  return typeof id === "string" && (ASPECT_IDS as readonly string[]).includes(id);
}

function clampOrb(n: number): number {
  if (!Number.isFinite(n)) return ORB_MAX;
  const stepped = Math.round(n * 2) / 2;
  return Math.min(ORB_MAX, Math.max(ORB_MIN, stepped));
}

function boolOr(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function sameAspectIds(a: Set<AspectId>, b: readonly AspectId[]): boolean {
  return a.size === b.length && b.every((id) => a.has(id));
}

export function cloneAspectFilter(filter: AspectFilter): AspectFilter {
  return {
    types: new Set(filter.types),
    maxOrb: filter.maxOrb,
    toAngles: filter.toAngles,
    toNodes: filter.toNodes,
    toPoints: filter.toPoints,
    toLuminaries: filter.toLuminaries,
    toAsteroids: filter.toAsteroids,
    toPlanets: filter.toPlanets,
  };
}

export function loadAspectFilter(): AspectFilter {
  if (typeof window === "undefined") return cloneAspectFilter(DEFAULT_ASPECT_FILTER);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return cloneAspectFilter(DEFAULT_ASPECT_FILTER);
    const parsed = JSON.parse(raw) as {
      types?: unknown;
      tightOnly?: unknown;
      maxOrb?: unknown;
      toAngles?: unknown;
      toNodes?: unknown;
      toPoints?: unknown;
      toLuminaries?: unknown;
      toAsteroids?: unknown;
      toPlanets?: unknown;
    };
    const types = Array.isArray(parsed.types)
      ? new Set(parsed.types.filter(isAspectId))
      : new Set(ASPECT_IDS);
    let maxOrb = ORB_MAX;
    if (typeof parsed.maxOrb === "number") maxOrb = clampOrb(parsed.maxOrb);
    else if (parsed.tightOnly === true) maxOrb = TIGHT_ORB;
    return {
      types,
      maxOrb,
      toAngles: boolOr(parsed.toAngles, true),
      toNodes: boolOr(parsed.toNodes, true),
      toPoints: boolOr(parsed.toPoints, true),
      toLuminaries: boolOr(parsed.toLuminaries, true),
      toAsteroids: boolOr(parsed.toAsteroids, true),
      toPlanets: boolOr(parsed.toPlanets, true),
    };
  } catch {
    return cloneAspectFilter(DEFAULT_ASPECT_FILTER);
  }
}

export function saveAspectFilter(filter: AspectFilter) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        types: [...filter.types],
        maxOrb: filter.maxOrb,
        toAngles: filter.toAngles,
        toNodes: filter.toNodes,
        toPoints: filter.toPoints,
        toLuminaries: filter.toLuminaries,
        toAsteroids: filter.toAsteroids,
        toPlanets: filter.toPlanets,
      }),
    );
  } catch {
    /* quota / private */
  }
}

function endpointBlocked(id: BodyId, filter: AspectFilter): boolean {
  if (LUMINARY_SET.has(id)) return !filter.toLuminaries;
  if (PLANET_SET.has(id)) return !filter.toPlanets;
  if (ASTEROID_SET.has(id)) return !filter.toAsteroids;
  if (ANGLE_SET.has(id)) return !filter.toAngles;
  if (NODE_SET.has(id)) return !filter.toNodes;
  if (POINT_TARGET_SET.has(id)) return !filter.toPoints;
  return false;
}

export function aspectVisible(link: AspectLink, filter: AspectFilter): boolean {
  if (!filter.types.has(link.type)) return false;
  if (link.orb > filter.maxOrb) return false;
  if (endpointBlocked(link.a, filter) || endpointBlocked(link.b, filter)) return false;
  return true;
}

export function isMajorPreset(filter: AspectFilter): boolean {
  return sameAspectIds(filter.types, MAJOR_ASPECT_IDS);
}

export function isAllAspects(filter: AspectFilter): boolean {
  return sameAspectIds(filter.types, ASPECT_IDS);
}
