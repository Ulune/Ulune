/**
 * A chart's patterns (ChartPatterns): each body's flags (dignity, sect,
 * combust, out of bounds, motion…), receptions, configurations, stelliums,
 * the void-of-course Moon, the weighted balance and the ranking. Computed with
 * the cast (calculate.server.ts), for a composite (composite.ts), and by the
 * table for a chart cast before they existed (hydratePatterns). Apart from
 * anatomy.ts so that the first page, which needs only aspects and midpoints,
 * does not load the dignity tables.
 */
import {
  ANGULAR_ORB,
  ARIES_POINT_ORB,
  BALANCE_WEIGHT,
  CAZIMI_ORB,
  CLASSIC_BODIES,
  CLASSICAL_PLANETS,
  COMBUST_ORB,
  DIGNITY_SCORE,
  OOB_DECLINATION,
  SIGN_META,
  SIGN_RULER,
  TRADITIONAL_RULER,
} from "./constants";
import { sep180, wrap180, wrap360 } from "./anatomy";
import { signDignity } from "./dignities";
import { motionFlags } from "./transit-exact";
import { SIGN_IDS } from "./types";
import type {
  AspectConfiguration,
  AspectId,
  AspectLink,
  BodyId,
  ChartPatterns,
  ConfigType,
  DignityKind,
  ElementId,
  HouseCusp,
  HouseTempo,
  ModalityId,
  NatalChart,
  Placement,
  PlanetId,
  RankedBody,
  SignId,
  TightestAspect,
  WeightedBalance,
} from "./types";

const CLASSIC = new Set<string>(CLASSIC_BODIES);
const CLASSICAL = new Set<string>(CLASSICAL_PLANETS);
const SECT_DAY: BodyId[] = ["sun", "jupiter", "saturn"];
const SECT_NIGHT: BodyId[] = ["moon", "venus", "mars"];
export function houseTempo(house: number): HouseTempo {
  const r = (house - 1) % 3;
  return r === 0 ? "angular" : r === 1 ? "succedent" : "cadent";
}

/**
 * A planet's essential state in one word (dignities.ts signDignity): peregrine
 * only when it holds none of the five dignities where it stands.
 */
export function traditionalDignity(id: PlanetId, lon: number, isDay: boolean): DignityKind | null {
  return signDignity(id, lon, isDay);
}

export function isDayChart(sun: Placement | undefined, sunAltitude?: number): boolean {
  if (typeof sunAltitude === "number" && Number.isFinite(sunAltitude)) return sunAltitude > 0;
  if (!sun) return true;
  return sun.house >= 7 && sun.house <= 12;
}

function mercuryMorningStar(mercury: Placement | undefined, sun: Placement | undefined): boolean {
  if (!mercury || !sun) return false;
  return wrap360(sun.ecliptic - mercury.ecliptic) < 180;
}

export function inSectOf(
  id: BodyId,
  isDay: boolean,
  mercury?: Placement,
  sun?: Placement,
): boolean | null {
  if (SECT_DAY.includes(id)) return isDay;
  if (SECT_NIGHT.includes(id)) return !isDay;
  if (id === "mercury") {
    const morning = mercuryMorningStar(mercury, sun);
    return isDay ? morning : !morning;
  }
  return null;
}

function angularTo(lon: number, angles: NatalChart["angles"]): boolean {
  for (const key of ["ascendant", "midheaven", "descendant", "ic"] as const) {
    if (sep180(lon, angles[key].ecliptic) <= ANGULAR_ORB) return true;
  }
  return false;
}

function majorPairs(aspects: AspectLink[], type: AspectId): [BodyId, BodyId][] {
  const pairs: [BodyId, BodyId][] = [];
  for (const x of aspects) {
    if (x.type !== type) continue;
    if (type === "quincunx") {
      pairs.push([x.a, x.b]);
      continue;
    }
    if (x.level !== "major") continue;
    pairs.push([x.a, x.b]);
  }
  return pairs;
}

function configId(type: ConfigType, members: BodyId[]): string {
  return `${type}:${[...members].sort().join("-")}`;
}

function findConfigurations(aspects: AspectLink[], pool: Set<BodyId>): AspectConfiguration[] {
  const usable = aspects.filter((a) => pool.has(a.a) && pool.has(a.b));
  const found: AspectConfiguration[] = [];
  const seen = new Set<string>();

  const add = (type: ConfigType, members: BodyId[], apex: BodyId | null) => {
    const uniq = [...new Set(members)];
    const id = configId(type, uniq);
    if (seen.has(id)) return;
    seen.add(id);
    found.push({ id, type, members: uniq, apex });
  };

  const opps = majorPairs(usable, "opposition");
  const squares = majorPairs(usable, "square");
  const trines = majorPairs(usable, "trine");
  const sextiles = majorPairs(usable, "sextile");
  const quincunxes = usable.filter((a) => a.type === "quincunx").map((a) => [a.a, a.b] as [BodyId, BodyId]);

  const linked = (pairs: [BodyId, BodyId][], a: BodyId, b: BodyId) =>
    pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

  for (const [a, b] of opps) {
    const apices = new Set<BodyId>();
    for (const [x, y] of squares) {
      const third = x === a || x === b ? y : y === a || y === b ? x : null;
      if (!third || third === a || third === b) continue;
      if (linked(squares, a, third) && linked(squares, b, third)) apices.add(third);
    }
    for (const apex of apices) add("tsquare", [a, b, apex], apex);
  }

  for (let i = 0; i < trines.length; i += 1) {
    const [a, b] = trines[i];
    for (let j = i + 1; j < trines.length; j += 1) {
      const [c, d] = trines[j];
      const nodes = new Set([a, b, c, d]);
      if (nodes.size !== 3) continue;
      const [x, y, z] = [...nodes] as BodyId[];
      if (linked(trines, x, y) && linked(trines, y, z) && linked(trines, z, x)) {
        add("grandTrine", [x, y, z], null);
      }
    }
  }

  for (let i = 0; i < opps.length; i += 1) {
    for (let j = i + 1; j < opps.length; j += 1) {
      const [a, b] = opps[i];
      const [c, d] = opps[j];
      const members = [a, b, c, d];
      if (new Set(members).size !== 4) continue;
      const allSquare =
        linked(squares, a, c) &&
        linked(squares, a, d) &&
        linked(squares, b, c) &&
        linked(squares, b, d);
      if (allSquare) add("grandCross", members, null);
      const mystic =
        (linked(sextiles, a, c) && linked(sextiles, b, d) && linked(trines, a, d) && linked(trines, b, c)) ||
        (linked(sextiles, a, d) && linked(sextiles, b, c) && linked(trines, a, c) && linked(trines, b, d));
      if (mystic) add("mysticRectangle", members, null);
    }
  }

  for (const grand of found.filter((c) => c.type === "grandTrine")) {
    const [x, y, z] = grand.members;
    if (!x || !y || !z) continue;
    for (const [p, q] of opps) {
      const inTri = (id: BodyId) => grand.members.includes(id);
      let apex: BodyId | null = null;
      let tail: BodyId | null = null;
      if (inTri(p) && !inTri(q)) {
        apex = p;
        tail = q;
      } else if (inTri(q) && !inTri(p)) {
        apex = q;
        tail = p;
      }
      if (!apex || !tail) continue;
      const others = grand.members.filter((m) => m !== apex);
      if (others.every((o) => linked(sextiles, tail, o))) {
        add("kite", [...grand.members, tail], apex);
      }
    }
  }

  const qMap = new Map<BodyId, BodyId[]>();
  for (const [a, b] of quincunxes) {
    qMap.set(a, [...(qMap.get(a) ?? []), b]);
    qMap.set(b, [...(qMap.get(b) ?? []), a]);
  }
  for (const [apex, arms] of qMap) {
    if (arms.length < 2) continue;
    for (let i = 0; i < arms.length; i += 1) {
      for (let j = i + 1; j < arms.length; j += 1) {
        const p = arms[i];
        const q = arms[j];
        if (p && q && linked(sextiles, p, q)) add("yod", [apex, p, q], apex);
      }
    }
  }

  return found;
}

function timeToSignedTarget(current: number, target: number, rel: number): number | null {
  const gap = wrap180(target - current);
  if (Math.abs(rel) < 1e-12) return Math.abs(gap) < 1e-8 ? 0 : null;
  let t = gap / rel;
  if (t < -1e-8) t = (gap + (rel > 0 ? 360 : -360)) / rel;
  return t >= -1e-8 ? Math.max(0, t) : null;
}

/** True if the Moon will not perfect a major aspect to a classical/outer planet before leaving its sign. */
export function isMoonVoidOfCourse(moon: Placement | undefined, others: Placement[]): boolean {
  if (!moon || !Number.isFinite(moon.speed)) return false;
  const moonSpeed = moon.speed ?? 0;
  if (Math.abs(moonSpeed) < 1e-8) return false;
  const lon = wrap360(moon.ecliptic);
  const signStart = Math.floor(lon / 30) * 30;
  const daysLeft =
    moonSpeed > 0 ? (signStart + 30 - lon) / moonSpeed : (lon - signStart) / Math.abs(moonSpeed);
  if (!(daysLeft > 0)) return true;

  const pool = others.filter((p) => CLASSIC.has(p.id) && p.id !== "moon");
  const offsets = [0, 60, -60, 90, -90, 120, -120, 180];
  for (const b of pool) {
    const rel = moonSpeed - (b.speed ?? 0);
    const cur = wrap180(moon.ecliptic - b.ecliptic);
    for (const target of offsets) {
      const t = timeToSignedTarget(cur, target, rel);
      if (t != null && t > 1e-6 && t <= daysLeft) return false;
    }
  }
  return true;
}

function emptyWeights(): WeightedBalance {
  return {
    elements: { fire: 0, earth: 0, air: 0, water: 0 },
    modalities: { cardinal: 0, fixed: 0, mutable: 0 },
    polarity: { positive: 0, negative: 0 },
    hemisphere: { east: 0, west: 0, north: 0, south: 0 },
    quadrants: [0, 0, 0, 0],
    angularity: { angular: 0, succedent: 0, cadent: 0 },
  };
}

function emptyPatterns(planets: Placement[], houses: HouseCusp[], angles: NatalChart["angles"]): ChartPatterns {
  const classic = planets.filter((p) => CLASSIC.has(p.id));
  const cuspSigns = houses.map((h) => h.sign);
  const intercepted = SIGN_IDS.filter((s) => !cuspSigns.includes(s));
  const duplicated = SIGN_IDS.filter((s) => cuspSigns.filter((c) => c === s).length > 1);

  const byHouse = new Map<number, BodyId[]>();
  const bySign = new Map<SignId, BodyId[]>();
  for (const p of classic) {
    const h = byHouse.get(p.house) ?? [];
    h.push(p.id);
    byHouse.set(p.house, h);
    const s = bySign.get(p.sign) ?? [];
    s.push(p.id);
    bySign.set(p.sign, s);
  }
  const stelliums: ChartPatterns["stelliums"] = [];
  for (const [house, members] of byHouse) {
    if (members.length >= 3) stelliums.push({ place: `House ${house}`, members });
  }
  for (const [sign, members] of bySign) {
    if (members.length >= 3) stelliums.push({ place: SIGN_META[sign].name, members });
  }
  const elementCounts: Record<ElementId, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalityCounts: Record<ModalityId, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of classic) {
    elementCounts[SIGN_META[p.sign].element] += 1;
    modalityCounts[SIGN_META[p.sign].modality] += 1;
  }
  const modern = SIGN_RULER[angles.ascendant.sign];
  const traditional = TRADITIONAL_RULER[angles.ascendant.sign];
  return {
    chartRuler: traditional,
    chartRulerTraditional: traditional,
    chartRulerModern: modern,
    intercepted,
    duplicated,
    stelliums,
    elementCounts,
    modalityCounts,
    retrogrades: planets.filter((p) => p.retrograde).map((p) => p.id),
    isDay: true,
    vocMoon: false,
    flags: {},
    receptions: [],
    configurations: [],
    hemisphere: { east: [], west: [], north: [], south: [] },
    quadrants: [[], [], [], []],
    weights: emptyWeights(),
    ranking: [],
    tightest: null,
    dominant: null,
  };
}

function weightOf(id: BodyId): number {
  return BALANCE_WEIGHT[id] ?? 0;
}

export function rankBodies(
  flags: ChartPatterns["flags"],
  ids: BodyId[] = CLASSICAL_PLANETS,
): RankedBody[] {
  const rows: RankedBody[] = [];
  for (const id of ids) {
    const flag = flags[id];
    if (!flag) continue;
    const dignity = flag.dignity;
    const base = dignity ? DIGNITY_SCORE[dignity] : 2;
    const sect = flag.inSect === true ? 1 : flag.inSect === false ? -1 : 0;
    rows.push({ id, score: base + sect, dignity, inSect: flag.inSect });
  }
  rows.sort((a, b) => b.score - a.score || CLASSICAL_PLANETS.indexOf(a.id) - CLASSICAL_PLANETS.indexOf(b.id));
  return rows;
}

function meanConfigOrb(config: AspectConfiguration, aspects: AspectLink[]): number {
  const members = new Set(config.members);
  const orbs = aspects
    .filter((a) => a.level === "major" && members.has(a.a) && members.has(a.b))
    .map((a) => a.orb);
  if (!orbs.length) return 99;
  return orbs.reduce((s, n) => s + n, 0) / orbs.length;
}

export function dominantConfiguration(
  configs: AspectConfiguration[],
  aspects: AspectLink[],
): AspectConfiguration | null {
  if (!configs.length) return null;
  const ranked = [...configs].sort((a, b) => {
    if (b.members.length !== a.members.length) return b.members.length - a.members.length;
    return meanConfigOrb(a, aspects) - meanConfigOrb(b, aspects);
  });
  return ranked[0] ?? null;
}

export function tightestMajor(aspects: AspectLink[]): TightestAspect | null {
  const major = aspects.filter((a) => a.level === "major");
  const best = major[0];
  if (!best) return null;
  return { a: best.a, b: best.b, type: best.type, orb: best.orb, applying: best.applying };
}

export function buildPatterns(
  planets: Placement[],
  houses: HouseCusp[],
  angles: NatalChart["angles"],
  aspects: AspectLink[],
  opts?: { isDay?: boolean; obliquity?: number; timeUnknown?: boolean; vocMoon?: boolean },
): ChartPatterns {
  const base = emptyPatterns(planets, houses, angles);
  // Out of bounds: declination beyond the Sun's own greatest reach — the true
  // obliquity of the ecliptic on the chart's date (23.44° is only its value
  // around 2000; it was 23.45° in 1900 and 23.47° in 1800).
  const oobLimit = opts?.obliquity != null && Number.isFinite(opts.obliquity) ? opts.obliquity : OOB_DECLINATION;
  const sun = planets.find((p) => p.id === "sun");
  const moon = planets.find((p) => p.id === "moon");
  const mercury = planets.find((p) => p.id === "mercury");
  const isDay = opts?.isDay ?? isDayChart(sun);
  base.isDay = isDay;

  const all: Placement[] = [...planets, ...Object.values(angles)];
  const majorPlanetOf = (id: BodyId) =>
    aspects.filter(
      (a) => a.level === "major" && (a.a === id || a.b === id) && CLASSIC.has(a.a) && CLASSIC.has(a.b),
    );

  const flags: ChartPatterns["flags"] = {};
  for (const p of all) {
    const speed = p.speed ?? 0;
    const motion = motionFlags(p.id, speed);
    const dignity =
      p.kind === "planet" || p.id === "sun" || p.id === "moon"
        ? traditionalDignity(p.id as PlanetId, p.ecliptic, isDay)
        : null;
    const elong = sun ? sep180(p.ecliptic, sun.ecliptic) : 999;
    const planetLike = p.kind === "planet";
    flags[p.id] = {
      angular: angularTo(p.ecliptic, angles),
      tempo: houseTempo(p.house),
      dignity,
      inSect: inSectOf(p.id, isDay, mercury, sun),
      cazimi: planetLike && p.id !== "sun" && elong <= CAZIMI_ORB,
      combust: planetLike && p.id !== "sun" && elong > CAZIMI_ORB && elong <= COMBUST_ORB,
      anaretic: p.signDegree >= 29,
      ariesPoint: p.ecliptic <= ARIES_POINT_ORB || p.ecliptic >= 360 - ARIES_POINT_ORB,
      oob: p.declination != null && Math.abs(p.declination) > oobLimit,
      fast: motion.fast,
      slow: motion.slow,
      stationary: motion.stationary,
      unaspected: CLASSIC.has(p.id) && majorPlanetOf(p.id).length === 0,
    };
  }
  base.flags = flags;

  // The cast's own search on the ephemeris (meta.moonCourse) when it has one; else from the speeds.
  base.vocMoon = opts?.vocMoon ?? isMoonVoidOfCourse(moon, planets);

  const receptions: ChartPatterns["receptions"] = [];
  const classical = planets.filter((p) => CLASSICAL.has(p.id));
  for (let i = 0; i < classical.length; i += 1) {
    for (let j = i + 1; j < classical.length; j += 1) {
      const a = classical[i];
      const b = classical[j];
      if (TRADITIONAL_RULER[a.sign] === b.id && TRADITIONAL_RULER[b.sign] === a.id) {
        receptions.push({ a: a.id, b: b.id });
      }
    }
  }
  base.receptions = receptions;

  const pool = new Set<BodyId>([...CLASSIC_BODIES, "ascendant", "midheaven", "chiron"]);
  base.configurations = findConfigurations(aspects, pool);

  const east: BodyId[] = [];
  const west: BodyId[] = [];
  const north: BodyId[] = [];
  const south: BodyId[] = [];
  const quadrants: [BodyId[], BodyId[], BodyId[], BodyId[]] = [[], [], [], []];
  for (const p of planets.filter((x) => CLASSIC.has(x.id))) {
    if ([10, 11, 12, 1, 2, 3].includes(p.house)) east.push(p.id);
    else west.push(p.id);
    if (p.house >= 7) south.push(p.id);
    else north.push(p.id);
    const q = Math.floor((p.house - 1) / 3);
    quadrants[q]?.push(p.id);
  }
  const weights = emptyWeights();
  // Without a birth time the angles are only a noon stand-in: the balance is
  // weighed on the bodies alone.
  for (const p of opts?.timeUnknown ? planets : all) {
    const w = weightOf(p.id);
    if (!(w > 0)) continue;
    const element = SIGN_META[p.sign].element;
    const modality = SIGN_META[p.sign].modality;
    weights.elements[element] += w;
    weights.modalities[modality] += w;
    if (element === "fire" || element === "air") weights.polarity.positive += w;
    else weights.polarity.negative += w;
    weights.angularity[houseTempo(p.house)] += w;
    if ([10, 11, 12, 1, 2, 3].includes(p.house)) weights.hemisphere.east += w;
    else weights.hemisphere.west += w;
    if (p.house >= 7) weights.hemisphere.south += w;
    else weights.hemisphere.north += w;
    const q = Math.floor((p.house - 1) / 3);
    if (q >= 0 && q < 4) weights.quadrants[q] += w;
  }
  base.hemisphere = { east, west, north, south };
  base.quadrants = quadrants;
  base.weights = weights;
  base.ranking = rankBodies(flags);
  base.tightest = tightestMajor(aspects);
  base.dominant = dominantConfiguration(base.configurations, aspects);

  return base;
}

/** Fill ranking / weights on charts cast before those fields existed. */
export function hydratePatterns(chart: NatalChart): ChartPatterns {
  const p = chart.patterns;
  if (p.weights && Array.isArray(p.ranking) && "tightest" in p) return p;
  return buildPatterns(chart.planets, chart.houses, chart.angles, chart.aspects, {
    isDay: p.isDay,
    obliquity: chart.meta.obliquity,
    timeUnknown: chart.meta.timeUnknown === true,
    vocMoon: chart.meta.moonCourse ? chart.meta.moonCourse.next == null : undefined,
  });
}
