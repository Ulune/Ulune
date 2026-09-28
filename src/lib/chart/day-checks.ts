/**
 * Without a birth time a chart is cast for 12:00, a stand-in. These checks
 * say which of its facts hold all day long, from the start to the end of
 * the birth day (the stand-in ± 12 hours), and so which ones the table
 * marks ~.
 *
 * Across one day each body's longitude follows a parabola through its three
 * known places: at the day's start, at noon and at its end (meta.dayRange,
 * else a straight line from its speed). A parabola bends, so a body that
 * turns at a station within the day, or two bodies whose speeds cross, are
 * seen for what they do. The angles, the Vertex and the lots hang on the
 * time itself: nothing about them holds. With a known birth time every
 * check holds.
 */
import {
  ARIES_POINT_ORB,
  ASPECT_META,
  aspectOrb,
  CAZIMI_ORB,
  CLASSIC_BODIES,
  COMBUST_ORB,
  MAJOR_ASPECT_IDS,
} from "./constants";
import { degreeRulers, EGYPTIAN_TERMS, essentialDignity, isTraditionalPlanet } from "./dignities";
import type { AspectLink, BodyId, NatalChart, Placement, PlanetId } from "./types";

/** A longitude (or a distance) at the start, the middle (the stand-in) and the end of the birth day, unwrapped around the middle. */
export type DaySpan = { start: number; noon: number; end: number };

/** A body's day range is worth showing (and its position a ~) when it moves at least this much in the day (degrees). */
export const RANGE_WORTH = 0.5;

/**
 * How far a body's place (degrees) and speed (degrees a day) can stray from
 * its parabola within a day, with room: measured on two-hourly casts of 60
 * days over 1900–2050, the osculating Lilith strays by up to 0.009° and
 * 0.08°/day, the Moon by 0.009° and 0.032°/day, Mercury by 0.0012° and
 * 0.0042°/day, the Sun by 0.0005° and 0.0021°/day, the true node by 0.0002°
 * and 0.0018°/day, the slow bodies by less. A check holds only with this much
 * to spare.
 */
const STRAY: Record<string, { place: number; speed: number }> = {
  lilith: { place: 0.02, speed: 0.12 },
  moon: { place: 0.02, speed: 0.05 },
  sun: { place: 0.003, speed: 0.006 },
  mercury: { place: 0.003, speed: 0.006 },
  venus: { place: 0.003, speed: 0.006 },
  mars: { place: 0.003, speed: 0.006 },
  northnode: { place: 0.001, speed: 0.004 },
  southnode: { place: 0.001, speed: 0.004 },
};

function strayOf(id: string): { place: number; speed: number } {
  return STRAY[id] ?? { place: 0.0005, speed: 0.001 };
}

/** −180 ≤ x < 180. */
function wrap180(x: number): number {
  return ((((x + 180) % 360) + 360) % 360) - 180;
}

export function timeUnknown(chart: NatalChart): boolean {
  return chart.meta.timeUnknown === true;
}

function pointOf(chart: NatalChart, id: string): Placement | undefined {
  return chart.planets.find((p) => p.id === id) ?? (chart.angles as Record<string, Placement | undefined>)[id];
}

/** Where a point goes over the birth day; null for the points that hang on the time itself. */
export function daySpan(chart: NatalChart, p: Placement): DaySpan | null {
  if (p.uncertain) return null;
  const noon = p.ecliptic;
  const range = chart.meta.dayRange?.[p.id as PlanetId];
  if (range) return { start: noon + wrap180(range[0] - noon), noon, end: noon + wrap180(range[1] - noon) };
  if (p.speed != null && Number.isFinite(p.speed)) return { start: noon - p.speed / 2, noon, end: noon + p.speed / 2 };
  return null;
}

/* The parabola through a span's three places, t from −½ (the day's start) to ½ (its end). */
function slope(s: DaySpan): number {
  return s.end - s.start;
}
function bend(s: DaySpan): number {
  return 2 * (s.start + s.end - 2 * s.noon);
}
function valueAt(s: DaySpan, t: number): number {
  return s.noon + slope(s) * t + bend(s) * t * t;
}

/** When, inside the day, the motion turns (a station, or two speeds crossing); null if it does not. */
function turnOf(s: DaySpan): number | null {
  const c = bend(s);
  if (Math.abs(c) < 1e-12) return null;
  const t = -slope(s) / (2 * c);
  return t > -0.5 && t < 0.5 ? t : null;
}

/** The lowest and highest values over the day, widened by `room` each way. */
function extent(s: DaySpan, room = 0): [number, number] {
  const values = [s.start, s.end];
  const t = turnOf(s);
  if (t != null) values.push(valueAt(s, t));
  return [Math.min(...values) - room, Math.max(...values) + room];
}

/**
 * Without a birth time, whether a point's own position is only roughly
 * known: it moves half a degree or more over the day (the Moon, the Sun, the
 * inner planets), or it hangs on the time itself (the angles, Vertex, lots).
 */
export function isRough(chart: NatalChart, p: Placement): boolean {
  if (!timeUnknown(chart)) return false;
  const s = daySpan(chart, p);
  if (!s) return true;
  const [lo, hi] = extent(s);
  return hi - lo >= RANGE_WORTH;
}

/** The point stays in its sign all day. */
export function signHolds(chart: NatalChart, p: Placement): boolean {
  if (!timeUnknown(chart)) return true;
  const s = daySpan(chart, p);
  if (!s) return false;
  const [lo, hi] = extent(s, strayOf(p.id).place);
  return Math.floor(lo / 30) === Math.floor(hi / 30);
}

/** Anaretic (29° of its sign) all day. */
export function anareticHolds(chart: NatalChart, p: Placement): boolean {
  if (!timeUnknown(chart)) return true;
  const s = daySpan(chart, p);
  if (!s) return false;
  const base = Math.floor(s.noon / 30) * 30;
  const [lo, hi] = extent(s, strayOf(p.id).place);
  return lo >= base + 29 && hi < base + 30;
}

/** Within the orb of 0° Aries all day. */
export function ariesPointHolds(chart: NatalChart, p: Placement): boolean {
  if (!timeUnknown(chart)) return true;
  const s = daySpan(chart, p);
  if (!s) return false;
  const centre = s.noon > 180 ? 360 : 0;
  const [lo, hi] = extent(s, strayOf(p.id).place);
  return lo >= centre - ARIES_POINT_ORB && hi <= centre + ARIES_POINT_ORB;
}

/** The signed distance from one point to another across the day, unwrapped around noon. */
function relative(a: DaySpan, b: DaySpan): DaySpan {
  const noon = wrap180(a.noon - b.noon);
  return {
    start: noon + (a.start - a.noon) - (b.start - b.noon),
    noon,
    end: noon + (a.end - a.noon) - (b.end - b.noon),
  };
}

function relativeOf(chart: NatalChart, a: Placement, b: Placement): DaySpan | null {
  const sa = daySpan(chart, a);
  const sb = daySpan(chart, b);
  return sa && sb ? relative(sa, sb) : null;
}

/** How far a separation is from an aspect's exact angle, the separation given as a signed distance. */
function orbAt(distance: number, angle: number): number {
  return Math.abs(Math.abs(wrap180(distance)) - angle);
}

/** The signed distance (give or take `room`) reaches the aspect's exact angle during the day. */
function perfects(d: DaySpan, angle: number, room: number): boolean {
  const [lo, hi] = extent(d, room);
  return [angle, -angle].some((target) => lo < target && target < hi);
}

/** The nearest the distance comes to the aspect's exact angle over the day, less `room`. */
function closestOrb(d: DaySpan, angle: number, room: number): number {
  if (perfects(d, angle, room)) return 0;
  const t = turnOf(d);
  const orbs = [orbAt(d.start, angle), orbAt(d.end, angle)];
  if (t != null) orbs.push(orbAt(valueAt(d, t), angle));
  return Math.max(0, Math.min(...orbs) - room);
}

/**
 * Whether the orb shrinks (negative) or grows (positive) at a moment of the
 * day, from the parabola's slope there.
 */
function orbRateAt(d: DaySpan, angle: number, t: number): number {
  const x = wrap180(valueAt(d, t));
  const off = Math.abs(x) - angle;
  return Math.sign(off) * Math.sign(x) * (slope(d) + 2 * bend(d) * t);
}

/** Cazimi, or combust, the same all day (as it is at noon). */
export function sunContactHolds(chart: NatalChart, p: Placement): boolean {
  if (!timeUnknown(chart)) return true;
  const sun = pointOf(chart, "sun");
  const d = sun ? relativeOf(chart, p, sun) : null;
  if (!d) return false;
  const [lo, hi] = extent(d, strayOf(p.id).place + strayOf("sun").place);
  const min = lo < 0 && hi > 0 ? 0 : Math.min(Math.abs(lo), Math.abs(hi));
  const max = Math.max(Math.abs(lo), Math.abs(hi));
  const noon = Math.abs(d.noon);
  if (noon <= CAZIMI_ORB) return max <= CAZIMI_ORB;
  if (noon <= COMBUST_ORB) return min > CAZIMI_ORB && max <= COMBUST_ORB;
  return min > COMBUST_ORB;
}

/**
 * The aspect holds all day: in orb from the day's start to its end, and
 * applying (or separating) all day long: it neither perfects in the day nor
 * turns, as when two bodies' speeds cross.
 */
export function aspectHolds(chart: NatalChart, a: Pick<AspectLink, "a" | "b" | "type">): boolean {
  if (!timeUnknown(chart)) return true;
  const pa = pointOf(chart, a.a);
  const pb = pointOf(chart, a.b);
  const d = pa && pb ? relativeOf(chart, pa, pb) : null;
  if (!pa || !pb || !d) return false;
  const angle = ASPECT_META[a.type].angle;
  const allowed = aspectOrb(a.type, a.a, a.b);
  const room = { place: strayOf(a.a).place + strayOf(a.b).place, speed: strayOf(a.a).speed + strayOf(a.b).speed };
  if (perfects(d, angle, room.place)) return false;
  // The orb moves one way all day, clear of standing still: at noon (from the
  // two speeds, as the chart reads it) and at both ends of the day.
  const noonRate = Math.sign(Math.abs(d.noon) - angle) * Math.sign(d.noon) * ((pa.speed ?? 0) - (pb.speed ?? 0));
  const rates = [noonRate, orbRateAt(d, angle, -0.5), orbRateAt(d, angle, 0.5)];
  if (!rates.every((r) => Math.abs(r) > room.speed && Math.sign(r) === Math.sign(noonRate))) return false;
  // Moving one way, its orb is largest at one end of the day.
  return orbAt(d.start, angle) <= allowed - room.place && orbAt(d.end, angle) <= allowed - room.place;
}

/**
 * An unaspected planet stays so all day: no other of the ten planets comes
 * within a major aspect's orb of it at any hour.
 */
export function unaspectedHolds(chart: NatalChart, p: Placement): boolean {
  if (!timeUnknown(chart)) return true;
  if (!daySpan(chart, p)) return false;
  for (const id of CLASSIC_BODIES) {
    if (id === p.id) continue;
    const q = pointOf(chart, id);
    if (!q) continue;
    const d = relativeOf(chart, p, q);
    if (!d) return false;
    const room = strayOf(p.id).place + strayOf(id).place;
    for (const type of MAJOR_ASPECT_IDS) {
      if (closestOrb(d, ASPECT_META[type].angle, room) <= aspectOrb(type, p.id, q.id)) return false;
    }
  }
  return true;
}

/**
 * A traditional planet's essential dignities hold all day: the same at every
 * stretch of the day between two boundaries of sign, term or face, and the
 * same whether the chart is by day or by night (its sect needs the time).
 */
export function dignityHolds(chart: NatalChart, p: Placement): boolean {
  if (!timeUnknown(chart)) return true;
  const planet = p.id;
  if (!isTraditionalPlanet(planet)) return true;
  const s = daySpan(chart, p);
  if (!s) return false;
  const [lo, hi] = extent(s, strayOf(p.id).place);
  const samples = [lo, hi];
  for (let b = Math.ceil(lo); b < hi; b += 1) {
    const deg = ((b % 30) + 30) % 30;
    if (deg % 10 === 0 || EGYPTIAN_TERMS[degreeRulers(b).sign].some(([, end]) => end % 30 === deg)) samples.push(b + 1e-6);
  }
  const state = (lon: number, isDay: boolean) => {
    const d = essentialDignity(planet, lon, isDay);
    return `${d.own.join()}|${d.debilities.join()}|${d.peregrine}|${d.score}`;
  };
  const first = state(p.ecliptic, true);
  return samples.every((lon) => state(lon, true) === first && state(lon, false) === first);
}

/** A configuration holds all day: none of its members hangs on the time, and every aspect among them holds. */
export function membersHold(chart: NatalChart, members: readonly BodyId[]): boolean {
  if (!timeUnknown(chart)) return true;
  const set = new Set<string>(members);
  for (const id of members) {
    const p = pointOf(chart, id);
    if (!p || p.uncertain) return false;
  }
  return chart.aspects.every((a) => !(set.has(a.a) && set.has(a.b)) || aspectHolds(chart, a));
}

/** Every body weighing in the elements, modes and polarity stays in its sign all day. */
export function signsHold(chart: NatalChart, ids: readonly BodyId[]): boolean {
  if (!timeUnknown(chart)) return true;
  return ids.every((id) => {
    const p = pointOf(chart, id);
    return !p || signHolds(chart, p);
  });
}
