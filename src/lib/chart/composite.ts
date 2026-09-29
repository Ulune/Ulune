/**
 * Midpoint composite (not Davison).
 *
 * Positions: circular mean on the 360° ecliptic of each matching body/angle
 * from natal charts A and B (`midpointLon` — shorter-arc mean of two points).
 * Speeds, latitude, and declination are arithmetic means. Nothing is recast
 * through Swiss at a midpoint time or place.
 *
 * Houses: the ring is *derived* from the composite axes under the charts'
 * own house system — never by averaging the twelve natal cusps one at a time.
 * Independent per-cusp midpoints look right for two charts cast an hour apart
 * and fall apart for two charts whose Ascendants are far from each other: each
 * cusp picks its own shorter arc, the ring stops being monotonic, the spans
 * stop summing to one turn, and `houseFromCusps` then drops almost every body
 * into house 1. So instead:
 *
 * - Quadrant systems (Placidus, Koch, Porphyry, Campanus, Regiomontanus,
 *   Alcabitius, Topocentric): cusps 1/4/7/10 are the midpoint ASC/IC/DSC/MC,
 *   and the two intermediate cusps of each quadrant sit at the mean of where
 *   the two natal charts put them *within* that quadrant. Composite(A, A)
 *   reproduces A's ring exactly.
 * - Equal: cusp 1 is the midpoint ASC, then every 30°. The MC floats.
 * - Whole sign: cusp 1 is 0° of the midpoint ASC's sign. The MC floats.
 * - Morinus: its cusp 1 is not the Ascendant, so the ring is anchored on the
 *   midpoint of the two natal first cusps and shaped by the mean cusp offsets.
 *
 * Angle house numbers come from `houseFromCusps` like everywhere else — under
 * whole-sign, equal or Morinus the composite MC is routinely house 9 or 11,
 * and it is not hardcoded to 10.
 */
import { formatDegree } from "../utils";
import {
  HOUSE_LABELS,
  STAR_CONJUNCT_ORB,
  signFromEcliptic,
} from "./constants";
import { computeAspects, computeMidpoints, houseFromCusps, midpointLon, sep180, wrap360 } from "./anatomy";
import { buildPatterns, isDayChart } from "./patterns";
import { motionFlags } from "./transit-exact";
import { houseRing } from "./synastry";
import { PLANET_IDS } from "./types";
import type {
  AspectLink,
  BodyId,
  HouseCusp,
  HouseSystemId,
  NatalChart,
  Placement,
  PlanetId,
  StarHit,
} from "./types";

export const COMPOSITE_HOUSE_METHOD =
  "midpoint-axes: the ring is derived from the midpoint ASC/MC under the charts' own house system, not averaged cusp by cusp. Not Davison.";

/** Systems whose natal cusps 1/4/7/10 are the ASC/IC/DSC/MC. */
const QUADRANT_SYSTEMS = new Set<HouseSystemId>([
  "placidus",
  "koch",
  "porphyry",
  "campanus",
  "regiomontanus",
  "alcabitius",
  "topocentric",
]);

/** Indices of cusps 1, 4, 7, 10 — the quadrant boundaries. */
const QUADRANT_STARTS = [0, 3, 6, 9] as const;

export type CompositeChart = NatalChart;

function mean(a: number | undefined, b: number | undefined): number | undefined {
  if (a == null && b == null) return undefined;
  if (a == null) return b;
  if (b == null) return a;
  return (a + b) / 2;
}

function retarget(
  src: Placement,
  ecliptic: number,
  house: number,
  speed: number,
  extra?: {
    latitude?: number;
    declination?: number;
    uncertain?: boolean;
  },
): Placement {
  const lon = wrap360(ecliptic);
  // fast / stationary are read off the speed, and the composite speed is the
  // mean of two — A's flags would be stale here.
  const motion = motionFlags(src.id, speed);
  const next: Placement = {
    ...src,
    ecliptic: lon,
    sign: signFromEcliptic(lon),
    signDegree: ((lon % 30) + 30) % 30,
    formatted: formatDegree(lon),
    house,
    speed,
    retrograde: motion.retrograde,
    fast: motion.fast,
    slow: motion.slow,
    stationary: motion.stationary,
    latitude: extra?.latitude,
    declination: extra?.declination,
  };
  if (extra?.uncertain) next.uncertain = true;
  else delete next.uncertain;
  // A station's moment belongs to one sky, not to a midpoint of two.
  delete next.station;
  return next;
}

function midpointPlacement(a: Placement, b: Placement, cusps: number[]): Placement {
  const lon = midpointLon(a.ecliptic, b.ecliptic);
  const speed = mean(a.speed, b.speed) ?? 0;
  const latitude = mean(a.latitude, b.latitude);
  const declination = mean(a.declination, b.declination);
  const house = houseFromCusps(lon, cusps);
  return retarget(a, lon, house, speed, {
    latitude,
    declination,
    // Vertex, Anti-Vertex and the lots depend on the birth time; a midpoint of
    // a placeholder is still a placeholder.
    uncertain: a.uncertain === true || b.uncertain === true,
  });
}

/**
 * Where cusps 2/3 sit inside the ASC→IC quadrant, 5/6 inside IC→DSC, and so
 * on, as fractions of that quadrant's arc. `null` when the ring is not a
 * quadrant ring (the boundaries must be the angles, in order).
 */
function quadrantFractions(cusps: number[]): number[][] | null {
  const out: number[][] = [];
  for (const q of QUADRANT_STARTS) {
    const from = cusps[q] ?? 0;
    const arc = wrap360((cusps[(q + 3) % 12] ?? 0) - from);
    if (!(arc > 1e-9) || arc >= 180) return null;
    const fractions: number[] = [];
    for (let k = 1; k <= 2; k += 1) {
      const f = wrap360((cusps[(q + k) % 12] ?? 0) - from) / arc;
      if (!(f > 0) || !(f < 1)) return null;
      fractions.push(f);
    }
    if (!((fractions[0] ?? 1) < (fractions[1] ?? 0))) return null;
    out.push(fractions);
  }
  return out;
}

/** Cusps 1/4/7/10 on the composite axes, intermediates at the mean quadrant fraction. */
function quadrantRing(
  asc: number,
  mc: number,
  fa: number[][],
  fb: number[][],
): number[] | null {
  const bounds = [asc, wrap360(mc + 180), wrap360(asc + 180), mc];
  const cusps = new Array<number>(12).fill(0);
  for (let qi = 0; qi < 4; qi += 1) {
    const from = bounds[qi] ?? 0;
    const arc = wrap360((bounds[(qi + 1) % 4] ?? 0) - from);
    // Opposite quadrants sum to 180°, so a quadrant arc of 180° or more means
    // the two midpoint axes disagree about which way round the chart runs.
    if (!(arc > 1e-9) || arc >= 180) return null;
    const start = QUADRANT_STARTS[qi] ?? 0;
    cusps[start] = from;
    for (let k = 1; k <= 2; k += 1) {
      const f = mean(fa[qi]?.[k - 1], fb[qi]?.[k - 1]) ?? k / 3;
      cusps[start + k] = wrap360(from + f * arc);
    }
  }
  return cusps;
}

function equalRing(asc: number): number[] {
  return Array.from({ length: 12 }, (_, i) => wrap360(asc + 30 * i));
}

function wholeSignRing(asc: number): number[] {
  const start = Math.floor(wrap360(asc) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => wrap360(start + 30 * i));
}

/** Mean cusp offsets from each chart's own first cusp — for rings that are not tied to the ASC. */
function offsetRing(aCusps: number[], bCusps: number[]): number[] {
  const first = midpointLon(aCusps[0] ?? 0, bCusps[0] ?? 0);
  const cusps = [first];
  for (let i = 1; i < 12; i += 1) {
    const offset =
      mean(
        wrap360((aCusps[i] ?? 0) - (aCusps[0] ?? 0)),
        wrap360((bCusps[i] ?? 0) - (bCusps[0] ?? 0)),
      ) ?? 30 * i;
    cusps.push(wrap360(first + offset));
  }
  return cusps;
}

function compositeRing(
  a: NatalChart,
  b: NatalChart,
  system: HouseSystemId,
  asc: number,
  mc: number,
  warnings: string[],
): number[] {
  if (system === "whole") return wholeSignRing(asc);
  if (system === "equal") return equalRing(asc);

  const aCusps = houseRing(a);
  const bCusps = houseRing(b);
  if (!aCusps || !bCusps) {
    warnings.push(
      "One of the two charts has no usable house ring; the composite houses are equal houses from the composite Ascendant.",
    );
    return equalRing(asc);
  }

  if (!QUADRANT_SYSTEMS.has(system)) {
    // Morinus: cusp 1 is not the Ascendant, so there is no quadrant to divide.
    return offsetRing(aCusps, bCusps);
  }

  const fa = quadrantFractions(aCusps);
  const fb = quadrantFractions(bCusps);
  const ring = fa && fb ? quadrantRing(asc, mc, fa, fb) : null;
  if (ring) return ring;
  warnings.push(
    "The midpoint Ascendant and Midheaven do not form a quadrant — the two charts' angles are close to opposite, so each midpoint took a different way round. The composite houses are equal houses from the composite Ascendant.",
  );
  return equalRing(asc);
}

function housesFromCusps(cusps: number[], uncertain: boolean): HouseCusp[] {
  return cusps.map((ecliptic, i) => {
    const id = i + 1;
    const lon = wrap360(ecliptic);
    return {
      id,
      label: HOUSE_LABELS[i] ?? `House ${id}`,
      sign: signFromEcliptic(lon),
      ecliptic: lon,
      formatted: formatDegree(lon),
      ...(uncertain ? { uncertain: true as const } : {}),
    };
  });
}

/**
 * Midpoint of each star's longitude in the two charts. Stars are precessed per
 * chart, so this is the star at the mean epoch — the same midpoint model the
 * bodies use. Conjunction orb is the shared `STAR_CONJUNCT_ORB`.
 */
function compositeStars(a: NatalChart, b: NatalChart, bodies: Placement[]): StarHit[] {
  const other = new Map((b.stars ?? []).map((s) => [s.id, s]));
  const hits: StarHit[] = [];
  for (const sa of a.stars ?? []) {
    const sb = other.get(sa.id);
    if (!sb) continue;
    const ecliptic = midpointLon(sa.ecliptic, sb.ecliptic);
    let conjunct: StarHit["conjunct"] = null;
    for (const body of bodies) {
      const orb = sep180(ecliptic, body.ecliptic);
      if (orb <= STAR_CONJUNCT_ORB && (!conjunct || orb < conjunct.orb)) {
        conjunct = { body: body.id, orb: Number(orb.toFixed(4)) };
      }
    }
    hits.push({ id: sa.id, name: sa.name, ecliptic, conjunct });
  }
  return hits;
}

export function buildComposite(a: NatalChart, b: NatalChart): CompositeChart {
  const warnings: string[] = [];
  // No birth time on either side means the composite axes and the whole ring
  // are noon placeholders. Bodies keep their noon longitudes unflagged, the
  // same call the natal chart makes.
  const timeUnknown = a.meta.timeUnknown === true || b.meta.timeUnknown === true;

  const system = a.meta.houseSystem;
  if (b.meta.houseSystem !== system) {
    warnings.push(
      `The two charts use different house systems (${system} and ${b.meta.houseSystem}); the composite ring uses ${system}.`,
    );
  }

  const ascLon = midpointLon(a.angles.ascendant.ecliptic, b.angles.ascendant.ecliptic);
  const mcLon = midpointLon(a.angles.midheaven.ecliptic, b.angles.midheaven.ecliptic);
  const dscLon = wrap360(ascLon + 180);
  const icLon = wrap360(mcLon + 180);
  const cusps = compositeRing(a, b, system, ascLon, mcLon, warnings);
  const houses = housesFromCusps(cusps, timeUnknown);

  const angles: NatalChart["angles"] = {
    ascendant: retarget(a.angles.ascendant, ascLon, houseFromCusps(ascLon, cusps), 0, {
      uncertain: timeUnknown,
    }),
    midheaven: retarget(a.angles.midheaven, mcLon, houseFromCusps(mcLon, cusps), 0, {
      uncertain: timeUnknown,
    }),
    descendant: retarget(a.angles.descendant, dscLon, houseFromCusps(dscLon, cusps), 0, {
      uncertain: timeUnknown,
    }),
    ic: retarget(a.angles.ic, icLon, houseFromCusps(icLon, cusps), 0, {
      uncertain: timeUnknown,
    }),
  };

  const planets: Placement[] = [];
  const dropped: BodyId[] = [];
  for (const id of PLANET_IDS) {
    const pa = a.planets.find((p) => p.id === id);
    const pb = b.planets.find((p) => p.id === id);
    if (!pa || !pb) {
      // A body Swiss skipped in one chart has no midpoint. Say so rather than
      // quietly shipping an 11-body composite.
      if (pa || pb) dropped.push(id);
      continue;
    }
    planets.push(midpointPlacement(pa, pb, cusps));
  }
  if (dropped.length) {
    warnings.push(
      `Only one of the two charts has ${dropped.join(", ")}; skipped in the composite.`,
    );
  }
  planets.sort((x, y) => PLANET_IDS.indexOf(x.id as PlanetId) - PLANET_IDS.indexOf(y.id as PlanetId));

  const aspects = computeAspects([...planets, ...Object.values(angles)]);
  const sun = planets.find((p) => p.id === "sun");
  // A composite has no place and no horizon, so sect is read off the houses.
  // `patterns.isDay` gets the same value — captions must read it from there.
  const isDay = isDayChart(sun);
  const starBodies = [
    ...planets.filter((p) => ["sun", "moon", "mercury", "venus", "mars"].includes(p.id)),
    ...Object.values(angles),
  ];

  const aName = a.meta.name.trim() || "A";
  const bName = b.meta.name.trim() || "B";

  return {
    meta: {
      name: `${aName} · ${bName}`,
      date: a.meta.date,
      time: "midpoint",
      placeLabel: "Midpoint composite",
      latitude: a.meta.latitude,
      longitude: a.meta.longitude,
      timezone: a.meta.timezone,
      utc: a.meta.utc,
      houseSystem: system,
      zodiac: "tropical",
      ephemeris: "swiss",
      lilith: "true",
      ...(timeUnknown ? { timeUnknown: true as const } : {}),
      ...(timeUnknown ? compositeDay(a, b, planets) : {}),
      ...(warnings.length ? { warnings } : {}),
    },
    angles,
    planets,
    houses,
    aspects,
    patterns: buildPatterns(planets, houses, angles, aspects, { isDay }),
    stars: compositeStars(a, b, starBodies),
    midpoints: computeMidpoints(planets, angles),
  };
}

/**
 * Without a birth time on one side or both, where each composite body goes
 * over the unknown day: the midpoint of the two bodies at the day's start
 * and at its end, a birth with a known time staying put (its declination the
 * same way, as a mean). Exact with one time unknown; with both, the two days
 * are read start with start and end with end. A body left out goes by its
 * speed (unknown-time.ts).
 */
function compositeDay(a: NatalChart, b: NatalChart, planets: Placement[]): Pick<NatalChart["meta"], "dayRange" | "dayDecl"> {
  const ends = (chart: NatalChart, p: Placement | undefined, key: "dayRange" | "dayDecl"): [number, number] | null => {
    if (!p) return null;
    const now = key === "dayRange" ? p.ecliptic : p.declination;
    if (now == null) return null;
    if (chart.meta.timeUnknown !== true) return [now, now];
    return chart.meta[key]?.[p.id as PlanetId] ?? null;
  };
  const dayRange: NonNullable<NatalChart["meta"]["dayRange"]> = {};
  const dayDecl: NonNullable<NatalChart["meta"]["dayDecl"]> = {};
  for (const p of planets) {
    if (p.uncertain) continue;
    const pa = a.planets.find((x) => x.id === p.id);
    const pb = b.planets.find((x) => x.id === p.id);
    const ra = ends(a, pa, "dayRange");
    const rb = ends(b, pb, "dayRange");
    if (ra && rb) dayRange[p.id as PlanetId] = [midpointLon(ra[0], rb[0]), midpointLon(ra[1], rb[1])];
    const da = ends(a, pa, "dayDecl");
    const db = ends(b, pb, "dayDecl");
    if (da && db) dayDecl[p.id as PlanetId] = [(da[0] + db[0]) / 2, (da[1] + db[1]) / 2];
  }
  return { dayRange, dayDecl };
}

export function compositeMajors(chart: CompositeChart): AspectLink[] {
  return chart.aspects.filter((row) => row.level === "major");
}
