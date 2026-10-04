/**
 * The other modes' tables (part 52 of the launch plan): a moving sky against
 * the birth chart (transits, progressions) and one birth chart against
 * another (synastry). Each aspect with its orb beside the orb it is allowed,
 * how strong that makes it, applying or separating and, for a moving sky,
 * when it is exact; where the moving bodies stand and which of your houses
 * they cross; the progressed angles and the progressed Moon's phase; each
 * person's bodies in the other's houses. The pages, their Copy buttons and
 * their CSV read from here.
 *
 * Without a birth time a birth chart is cast for noon, a stand-in: a value
 * that may be different at another hour of that day is marked (the same
 * ~ as the chart table), from where each body goes over the day
 * (unknown-time.ts). A progressed sky moves with the birth time too: an
 * hour earlier at birth is an hour earlier in the progressed sky.
 */
import { houseFromCusps } from "./anatomy";
import { ASPECT_META, aspectOrb, MEAN_SPEED } from "./constants";
import { isProgressionTablePair } from "./progressions";
import { houseRing } from "./synastry";
import { bodyRank, crossTwinKey, twinRank } from "./table-aspects";
import { ASPECT_IDS } from "./types";
import { chartPoints, motionOf, POINT_GROUPS, type Cell, type Motion, type PointGroupId } from "./table-cells";
import { MOON_PHASES, moonPhase, type MoonPhaseId } from "./table-facts";
import { isTransitTablePair, motionFlags, TRANSIT_TABLE_NATAL } from "./transit-exact";
import { daySpan, extent, isRough, RANGE_WORTH, strayOf, timeUnknown, wrap180, type DaySpan } from "./unknown-time";
import type { AngleId, AspectId, AspectLink, BodyId, NatalChart, Placement, ProgressedSky, SignId, SynastryPair, TransitSky } from "./types";
import type { AppLocale } from "@/lib/i18n/messages";
import { formatDegree, formatDegreeSeconds, formatSignedDms, formatSignedDmsSeconds } from "@/lib/utils";

/* ── Where a point may be ───────────────────────────────────────────── */

/** A signed separation (a − b) or a longitude: the least and the most it may be, unwrapped around its value now. */
export type Range = { lo: number; hi: number };

const wrap360 = (x: number) => ((x % 360) + 360) % 360;

/**
 * Whether an aspect keeps both its orb and its side of exact while the
 * separation (a − b) stays within `r`: out of orb or exact somewhere inside,
 * it could be read otherwise at another hour.
 */
export function rangeHolds(type: AspectId, allowed: number, r: Range): boolean {
  // Wider than any day of the Moon's twice over: nothing can be said.
  if (!(r.hi - r.lo < 50)) return false;
  const angle = ASPECT_META[type].angle;
  const exacts = angle === 0 ? [0] : angle === 180 ? [180] : [angle, -angle];
  for (const e of exacts) {
    const k = Math.ceil((r.lo - e) / 360);
    if (e + 360 * k <= r.hi) return false;
  }
  const residual = (d: number) => Math.abs(Math.abs(wrap180(d)) - angle);
  return residual(r.lo) <= allowed && residual(r.hi) <= allowed;
}

/** Where a birth chart's point may stand over its birth day: its place with a birth time, null when it hangs on the hour. */
export function birthRange(chart: NatalChart, p: Placement): Range | null {
  if (!timeUnknown(chart)) return { lo: p.ecliptic, hi: p.ecliptic };
  const s = daySpan(chart, p);
  if (!s) return null;
  const [lo, hi] = extent(s, strayOf(p.id).place);
  return { lo, hi };
}

/** A separation's range put around its value now (−180 to 180). */
function around(r: Range, now: number): Range {
  const off = wrap180(now) - now;
  return { lo: r.lo + off, hi: r.hi + off };
}

const ANGLES = new Set<string>(["ascendant", "midheaven", "descendant", "ic"]);
/** Points that hang on the hour itself: the angles, the Vertex and the lots. */
const ON_THE_HOUR = new Set<string>([...ANGLES, "vertex", "antivertex", "fortune", "spirit"]);

function pointOf(chart: NatalChart, id: string): Placement | undefined {
  if (ANGLES.has(id)) return chart.angles[id as AngleId];
  return chart.planets.find((p) => p.id === id);
}

/* ── Aspects ────────────────────────────────────────────────────────── */

export type CrossAspectRow = {
  link: AspectLink;
  /** The orb now, from the two longitudes (degrees). */
  orb: number;
  /** The orb this pair is allowed (degrees). */
  allowed: number;
  /** 1 when exact, 0 at the edge of the orb. */
  strength: number;
  /** The same contact seen from the other end of an axis, folded under this row. */
  twins: AspectLink[];
  /** Without a birth time: out of orb, or exact, at another hour of that day. */
  uncertain: boolean;
  /** Without a birth time: the moment it is exact moves with the hour. */
  exactUncertain: boolean;
};

type Check = { uncertain: boolean; exactUncertain: boolean };

/** The residual of a declared aspect from two longitudes (degrees). */
function residual(a: number, b: number, type: AspectId): number {
  return Math.abs(Math.abs(wrap180(a - b)) - ASPECT_META[type].angle);
}

/**
 * The rows: tightest first, and an aspect to one end of an axis shown once
 * with its mirror (the same contact to the other end) folded under it.
 */
function crossRows(
  links: readonly AspectLink[],
  lonA: (id: string) => number | undefined,
  lonB: (id: string) => number | undefined,
  check: (link: AspectLink) => Check,
): CrossAspectRow[] {
  const groups = new Map<string, AspectLink[]>();
  for (const l of links) {
    const key = crossTwinKey(l.a, l.b, l.type);
    const g = groups.get(key);
    if (g) g.push(l);
    else groups.set(key, [l]);
  }
  const rows: CrossAspectRow[] = [];
  for (const g of groups.values()) {
    const [head, ...twins] = [...g].sort((x, y) => twinRank(x.a, x.b) - twinRank(y.a, y.b));
    if (!head) continue;
    const a = lonA(head.a);
    const b = lonB(head.b);
    const orb = a != null && b != null ? residual(a, b, head.type) : head.orb;
    const allowed = aspectOrb(head.type, head.a, head.b);
    rows.push({ link: head, orb, allowed, strength: Math.max(0, Math.min(1, 1 - orb / allowed)), twins, ...check(head) });
  }
  return rows.sort((x, y) => x.orb - y.orb);
}

/** How an aspects table between two charts is sorted (review 3 Oct, B1): by orb, either side's body, or aspect. */
export type CrossSort = "orb" | "a" | "b" | "aspect";

export type CrossOptions = {
  sort: CrossSort;
  /** Only within this orb (degrees); null: all. */
  orbMax: number | null;
  /** The minor aspects too. */
  minors: boolean;
};

export const DEFAULT_CROSS_OPTIONS: CrossOptions = { sort: "orb", orbMax: null, minors: true };

/** The rows a table shows under its options: filtered, then sorted (ties by orb). */
export function crossView(rows: readonly CrossAspectRow[], opts: CrossOptions): CrossAspectRow[] {
  const rank = bodyRank();
  const r = (id: string) => rank.get(id) ?? 999;
  const kept = rows.filter((x) => (opts.minors || x.link.level !== "minor") && (opts.orbMax == null || x.orb <= opts.orbMax));
  const byOrb = (x: CrossAspectRow, y: CrossAspectRow) => x.orb - y.orb;
  const cmp =
    opts.sort === "a"
      ? (x: CrossAspectRow, y: CrossAspectRow) => r(x.link.a) - r(y.link.a) || r(x.link.b) - r(y.link.b) || byOrb(x, y)
      : opts.sort === "b"
        ? (x: CrossAspectRow, y: CrossAspectRow) => r(x.link.b) - r(y.link.b) || r(x.link.a) - r(y.link.a) || byOrb(x, y)
        : opts.sort === "aspect"
          ? (x: CrossAspectRow, y: CrossAspectRow) => ASPECT_IDS.indexOf(x.link.type) - ASPECT_IDS.indexOf(y.link.type) || byOrb(x, y)
          : byOrb;
  return [...kept].sort(cmp);
}

/** A birth chart's own facts: nothing moves with the hour when its time is known. */
const SURE: Check = { uncertain: false, exactUncertain: false };

/** How a transit to a birth chart without a birth time may read at another hour. */
export function transitCheck(sky: TransitSky, chart: NatalChart): (link: AspectLink) => Check {
  if (!timeUnknown(chart)) return () => SURE;
  const moving = new Map(sky.planets.map((p) => [p.id as string, p]));
  return (link) => {
    const m = moving.get(link.a);
    const n = pointOf(chart, link.b);
    const r = m && n ? birthRange(chart, n) : null;
    if (!m || !n || !r) return { uncertain: true, exactUncertain: true };
    const range = around({ lo: m.ecliptic - r.hi, hi: m.ecliptic - r.lo }, m.ecliptic - n.ecliptic);
    const speed = Math.abs(m.speed ?? 0);
    // The exact moment moves by the natal point's half-range over the transit's speed: a minute or more is marked.
    const drift = speed > 1e-9 ? (r.hi - r.lo) / 2 / speed : Infinity;
    return {
      uncertain: !rangeHolds(link.type, aspectOrb(link.type, link.a, link.b), range),
      exactUncertain: drift * 1440 >= 1,
    };
  };
}

/** The transits the table lists: the majors of the moving planets to the birth chart, within their orbs. */
export function transitLinks(sky: TransitSky, chart: NatalChart): AspectLink[] {
  const moving = new Map(sky.planets.map((p) => [p.id as string, p]));
  return sky.aspects.filter((a) => {
    const m = moving.get(a.a);
    const n = pointOf(chart, a.b);
    return isTransitTablePair(a, m && n ? { movingLon: m.ecliptic, natalLon: n.ecliptic } : undefined);
  });
}

export function transitAspectRows(sky: TransitSky, chart: NatalChart): CrossAspectRow[] {
  const moving = new Map(sky.planets.map((p) => [p.id as string, p]));
  return crossRows(
    transitLinks(sky, chart),
    (id) => moving.get(id)?.ecliptic,
    (id) => pointOf(chart, id)?.ecliptic,
    transitCheck(sky, chart),
  );
}

function progressedOf(sky: ProgressedSky, id: string): Placement | undefined {
  if (ANGLES.has(id)) return sky.angles[id as AngleId];
  return sky.planets.find((p) => p.id === id);
}

/** A progressed point over the birth day: an hour earlier at birth is an hour earlier in the progressed sky. */
function progressedSpan(p: Placement): DaySpan | null {
  if (ON_THE_HOUR.has(p.id) || p.speed == null || !Number.isFinite(p.speed)) return null;
  return { start: p.ecliptic - p.speed / 2, noon: p.ecliptic, end: p.ecliptic + p.speed / 2 };
}

/** How a progression of a chart without a birth time may read at another hour. */
export function progressionCheck(sky: ProgressedSky, chart: NatalChart): (link: AspectLink) => Check {
  if (!timeUnknown(chart)) return () => SURE;
  return (link) => {
    const m = progressedOf(sky, link.a);
    const n = pointOf(chart, link.b);
    const ps = m ? progressedSpan(m) : null;
    const ns = n ? daySpan(chart, n) : null;
    // The exact date moves with the birth time, by up to half a year either way.
    if (!m || !n || !ps || !ns) return { uncertain: true, exactUncertain: true };
    // The two move together: the same hour shifts both.
    const d: DaySpan = { start: ps.start - ns.start, noon: ps.noon - ns.noon, end: ps.end - ns.end };
    const [lo, hi] = extent(d, strayOf(link.a).place + strayOf(link.b).place);
    return {
      uncertain: !rangeHolds(link.type, aspectOrb(link.type, link.a, link.b), around({ lo, hi }, d.noon)),
      exactUncertain: true,
    };
  };
}

/** The progressions the table lists: the majors of the progressed bodies and angles to the birth chart, within their orbs. */
export function progressionLinks(sky: ProgressedSky, chart: NatalChart): AspectLink[] {
  return sky.aspects.filter((a) => {
    const m = progressedOf(sky, a.a);
    const n = pointOf(chart, a.b);
    return isProgressionTablePair(a, m && n ? { movingLon: m.ecliptic, natalLon: n.ecliptic } : undefined);
  });
}

export function progressionAspectRows(sky: ProgressedSky, chart: NatalChart): CrossAspectRow[] {
  return crossRows(
    progressionLinks(sky, chart),
    (id) => progressedOf(sky, id)?.ecliptic,
    (id) => pointOf(chart, id)?.ecliptic,
    progressionCheck(sky, chart),
  );
}

/** How a contact between two charts, one or both without a birth time, may read at another hour of those days. */
export function synastryCheck(a: NatalChart, b: NatalChart): (link: AspectLink) => Check {
  if (!timeUnknown(a) && !timeUnknown(b)) return () => SURE;
  return (link) => {
    const pa = pointOf(a, link.a);
    const pb = pointOf(b, link.b);
    const ra = pa ? birthRange(a, pa) : null;
    const rb = pb ? birthRange(b, pb) : null;
    if (!pa || !pb || !ra || !rb) return { uncertain: true, exactUncertain: false };
    // Two births, two unknown hours: each may be anywhere in its own range.
    const range = around({ lo: ra.lo - rb.hi, hi: ra.hi - rb.lo }, pa.ecliptic - pb.ecliptic);
    return { uncertain: !rangeHolds(link.type, aspectOrb(link.type, link.a, link.b), range), exactUncertain: false };
  };
}

export function synastryAspectRows(pair: SynastryPair, a: NatalChart, b: NatalChart): CrossAspectRow[] {
  return crossRows(
    pair.majors,
    (id) => pointOf(a, id)?.ecliptic,
    (id) => pointOf(b, id)?.ecliptic,
    synastryCheck(a, b),
  );
}

/** A contact between the main bodies (the planets, Chiron, the nodes, Lilith and the angles), not the asteroids, the Vertex or the lots. */
export function isMainPair(link: Pick<AspectLink, "a" | "b">): boolean {
  return TRANSIT_TABLE_NATAL.has(link.a) && TRANSIT_TABLE_NATAL.has(link.b);
}

/* ── The grid ───────────────────────────────────────────────────────── */

/** The bodies of a grid, as the natal grid has them: ten planets, Chiron and the North Node. */
export const GRID_BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode"] as const;

/** Rows × columns: each pair's aspect, if any. */
export function crossGridCells(links: readonly AspectLink[]): Map<string, AspectLink> {
  const out = new Map<string, AspectLink>();
  for (const l of links) out.set(`${l.a}|${l.b}`, l);
  return out;
}

/* ── Positions ──────────────────────────────────────────────────────── */

/** A position within its sign: to the second, or to the minute and marked when the hour may move it. */
export function positionCell(lon: number, rough: boolean, unknown: boolean): Cell {
  return { text: unknown ? formatDegree(lon) : formatDegreeSeconds(lon), uncertain: rough };
}

export type SkyRow = { point: Placement; motion: Motion | null; house: Cell };

/** Where each moving body is now, how it moves and which house of the birth chart it crosses, in the Points' groups. */
export function skyGroups(sky: TransitSky, chart: NatalChart, locale: AppLocale): { id: PointGroupId; rows: SkyRow[] }[] {
  const unknown = timeUnknown(chart);
  const byId = new Map(sky.planets.map((p) => [p.id as string, p]));
  return POINT_GROUPS.map((g) => ({
    id: g.id,
    rows: g.ids
      .map((id) => byId.get(id))
      .filter((p): p is Placement => Boolean(p))
      .map((p) => ({
        point: p,
        motion: motionOf(p, motionFlags(p.id, p.speed ?? 0), locale),
        house: { text: String(p.house), uncertain: unknown },
      })),
  })).filter((g) => g.rows.length > 0);
}

export type ProgressedRow = {
  point: Placement;
  natal: Placement | null;
  position: Cell;
  natalPosition: Cell | null;
  /** How far it has gone since birth: the Moon laps the zodiac about every 27 years. */
  moved: Cell | null;
  /** The same in degrees, signed. */
  movedDeg: number | null;
  /** A year of life is a day of the ephemeris: its motion a year, retrograde or stationary. */
  motion: Motion | null;
  house: Cell;
};

/** The arc from the birth place to the progressed one, signed; the Moon's with its laps. */
export function movedArc(id: string, progressed: number, natal: number, years: number): number {
  if (id === "moon") {
    const ahead = wrap360(progressed - natal);
    const laps = Math.round((years * (MEAN_SPEED.moon ?? 13.1764) - ahead) / 360);
    return ahead + 360 * Math.max(0, laps);
  }
  return wrap180(progressed - natal);
}

function progressedRow(p: Placement, chart: NatalChart, years: number, locale: AppLocale): ProgressedRow {
  const unknown = timeUnknown(chart);
  const natal = pointOf(chart, p.id) ?? null;
  const onHour = ON_THE_HOUR.has(p.id);
  const speed = p.speed ?? 0;
  const rough = unknown && (onHour || Math.abs(speed) >= RANGE_WORTH);
  const flags = motionFlags(p.id, speed);
  const moved = natal ? movedArc(p.id, p.ecliptic, natal.ecliptic, years) : null;
  // Both move with the same hour: the arc between them changes by the difference of their speeds.
  const movedRough = unknown && (onHour || Math.abs(speed - (natal?.speed ?? 0)) >= RANGE_WORTH);
  return {
    point: p,
    natal,
    position: positionCell(p.ecliptic, rough, unknown),
    natalPosition: natal ? positionCell(natal.ecliptic, isRough(chart, natal), unknown) : null,
    moved: moved == null ? null : { text: (unknown ? formatSignedDms : formatSignedDmsSeconds)(moved), uncertain: movedRough },
    movedDeg: moved,
    motion: onHour ? null : motionOf(p, { stationary: flags.stationary, fast: false, slow: false }, locale),
    house: { text: String(p.house), uncertain: unknown },
  };
}

/** The progressed bodies (not the angles and the Vertex), in the Points' groups. */
export function progressedGroups(sky: ProgressedSky, chart: NatalChart, locale: AppLocale): { id: PointGroupId; rows: ProgressedRow[] }[] {
  const byId = new Map(sky.planets.map((p) => [p.id as string, p]));
  return POINT_GROUPS.filter((g) => g.id !== "angles" && g.id !== "lots")
    .map((g) => ({
      id: g.id,
      rows: g.ids
        .map((id) => byId.get(id))
        .filter((p): p is Placement => Boolean(p))
        .map((p) => progressedRow(p, chart, sky.meta.yearsOfLife, locale)),
    }))
    .filter((g) => g.rows.length > 0);
}

/** The progressed angles and Vertex beside the birth ones. */
export function progressedAngleRows(sky: ProgressedSky, chart: NatalChart, locale: AppLocale): ProgressedRow[] {
  const vertex = sky.planets.find((p) => p.id === "vertex");
  const list = [sky.angles.ascendant, sky.angles.midheaven, sky.angles.descendant, sky.angles.ic, vertex].filter((p): p is Placement => Boolean(p));
  return list.map((p) => progressedRow(p, chart, sky.meta.yearsOfLife, locale));
}

export type ProgressedMoon = {
  /** How far the progressed Moon is ahead of the progressed Sun (0 to 360). */
  angle: number;
  phase: MoonPhaseId;
  waxing: boolean;
  sign: SignId;
  house: number;
  /** The next phase and the years of life until it begins, at the two bodies' present pace. */
  next: { phase: MoonPhaseId; years: number } | null;
  /** Without a birth time: it moves about 6° either way with the hour. */
  uncertain: boolean;
};

/** The progressed lunation: the progressed Moon's phase against the progressed Sun, a cycle of about 29 and a half years. */
export function progressedMoon(sky: ProgressedSky, chart: NatalChart): ProgressedMoon | null {
  const sun = sky.planets.find((p) => p.id === "sun");
  const moon = sky.planets.find((p) => p.id === "moon");
  if (!sun || !moon) return null;
  const ph = moonPhase(sun.ecliptic, moon.ecliptic, moon.latitude ?? 0);
  // A year of life is a day of the ephemeris: the speeds are degrees a year.
  const gain = (moon.speed ?? 0) - (sun.speed ?? 0);
  const step = Math.min(7, Math.floor(ph.angle / 45)) + 1;
  const next =
    gain > 0 ? { phase: MOON_PHASES[step % 8] ?? "new", years: (step * 45 - ph.angle) / gain } : null;
  return { angle: ph.angle, phase: ph.phase, waxing: ph.waxing, sign: moon.sign, house: moon.house, next, uncertain: timeUnknown(chart) };
}

/* ── Two charts ─────────────────────────────────────────────────────── */

/** One person's bodies that go in the other's houses and beside each other (the axes' other ends and the lots left out). */
const PAIR_POINTS = new Set<string>(POINT_GROUPS.flatMap((g) => g.ids).filter((id) => !["descendant", "ic", "antivertex", "fortune", "spirit"].includes(id)));

export type OverlayRow = { point: Placement; house: number; uncertain: boolean };

/** Whether a point stays inside one house of a ring all day. */
function staysIn(r: Range, cusps: readonly number[]): boolean {
  for (const c of cusps) {
    // The first time the cusp comes after `lo`: inside the range, the point may cross it.
    if (r.lo + wrap360(c - r.lo) <= r.hi) return false;
  }
  return true;
}

/**
 * Where each of the owner's bodies falls in the host's houses. Without the
 * host's birth time the houses are the noon stand-in's; without the owner's,
 * a body that may cross a cusp that day is marked. Empty when the host has
 * no usable ring of houses.
 */
export function overlayRows(owner: NatalChart, host: NatalChart): OverlayRow[] {
  const ring = houseRing(host);
  if (!ring) return [];
  const hostUnknown = timeUnknown(host);
  const ownerUnknown = timeUnknown(owner);
  const rank = new Map(POINT_GROUPS.flatMap((g) => g.ids).map((id, i) => [id, i]));
  return chartPoints(owner)
    .filter((p) => PAIR_POINTS.has(p.id))
    .sort((x, y) => (rank.get(x.id) ?? 99) - (rank.get(y.id) ?? 99))
    .map((p) => {
      const r = ownerUnknown ? birthRange(owner, p) : null;
      return {
        point: p,
        house: houseFromCusps(p.ecliptic, ring),
        uncertain: hostUnknown || (ownerUnknown && (!r || !staysIn(r, ring))),
      };
    });
}

export type BothRow = {
  id: BodyId;
  a: Placement | null;
  b: Placement | null;
  aPosition: Cell | null;
  bPosition: Cell | null;
  aHouse: Cell | null;
  bHouse: Cell | null;
};

/** The two charts side by side, body by body, in the Points' groups. */
export function bothGroups(a: NatalChart, b: NatalChart): { id: PointGroupId; rows: BothRow[] }[] {
  const ua = timeUnknown(a);
  const ub = timeUnknown(b);
  const cell = (chart: NatalChart, unknown: boolean, p: Placement | undefined) => (p ? positionCell(p.ecliptic, isRough(chart, p), unknown) : null);
  return POINT_GROUPS.map((g) => ({
    id: g.id,
    rows: g.ids
      .filter((id) => PAIR_POINTS.has(id))
      .map((id): BothRow | null => {
        const pa = pointOf(a, id);
        const pb = pointOf(b, id);
        if (!pa && !pb) return null;
        return {
          id: id as BodyId,
          a: pa ?? null,
          b: pb ?? null,
          aPosition: cell(a, ua, pa),
          bPosition: cell(b, ub, pb),
          aHouse: pa ? { text: String(pa.house), uncertain: ua } : null,
          bHouse: pb ? { text: String(pb.house), uncertain: ub } : null,
        };
      })
      .filter((r): r is BothRow => r != null),
  })).filter((g) => g.rows.length > 0);
}
