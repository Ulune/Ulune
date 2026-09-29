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
import type { AspectLink, BodyId, NatalChart, Placement } from "./types";
import { bend, daySpan, extent, signHolds, slope, strayOf, timeUnknown, turnOf, valueAt, wrap180, type DaySpan } from "./unknown-time";

export { daySpan, isRough, RANGE_WORTH, signHolds, timeUnknown, type DaySpan } from "./unknown-time";

function pointOf(chart: NatalChart, id: string): Placement | undefined {
  return chart.planets.find((p) => p.id === id) ?? (chart.angles as Record<string, Placement | undefined>)[id];
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

/** A point's declination over the birth day, from the cast's day ends (meta.dayDecl); null when it hangs on the time. */
function declSpan(chart: NatalChart, p: Placement, noon: number): DaySpan | null {
  if (p.uncertain) return null;
  const ends = chart.meta.dayDecl?.[p.id as keyof NonNullable<NatalChart["meta"]["dayDecl"]>];
  return ends ? { start: ends[0], noon, end: ends[1] } : null;
}

/**
 * A parallel (or contra-parallel) within 1° holds all day: neither
 * declination crosses the equator (which would turn one kind into the
 * other), and the difference of their sizes stays within 1° from the day's
 * start to its end. Declinations too follow a parabola through their three
 * known values.
 */
export function parallelHolds(chart: NatalChart, a: Placement, b: Placement, declA: number, declB: number, orb = 1): boolean {
  if (!timeUnknown(chart)) return true;
  const sa = declSpan(chart, a, declA);
  const sb = declSpan(chart, b, declB);
  if (!sa || !sb) return false;
  const [aLo, aHi] = extent(sa, strayOf(a.id).place);
  const [bLo, bHi] = extent(sb, strayOf(b.id).place);
  if ((aLo <= 0 && aHi >= 0) || (bLo <= 0 && bHi >= 0)) return false;
  const ka = Math.sign(sa.noon);
  const kb = Math.sign(sb.noon);
  const d: DaySpan = {
    start: ka * sa.start - kb * sb.start,
    noon: ka * sa.noon - kb * sb.noon,
    end: ka * sa.end - kb * sb.end,
  };
  const [lo, hi] = extent(d, strayOf(a.id).place + strayOf(b.id).place);
  return lo >= -orb && hi <= orb;
}

/** Every body weighing in the elements, modes and polarity stays in its sign all day. */
export function signsHold(chart: NatalChart, ids: readonly BodyId[]): boolean {
  if (!timeUnknown(chart)) return true;
  return ids.every((id) => {
    const p = pointOf(chart, id);
    return !p || signHolds(chart, p);
  });
}
