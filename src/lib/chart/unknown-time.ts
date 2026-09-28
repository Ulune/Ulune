/**
 * Without a birth time a chart is cast for 12:00, a stand-in. The light part
 * of the checks (day-checks.ts has the rest): where a body goes over the
 * birth day, whether its place is only roughly known, whether it stays in its
 * sign. Kept apart, without the dignity tables, for the first page's panels.
 *
 * Across one day each body's longitude follows a parabola through its three
 * known places: at the day's start, at noon and at its end (meta.dayRange,
 * else a straight line from its speed). The angles, the Vertex and the lots
 * hang on the time itself.
 */
import type { NatalChart, Placement, PlanetId } from "./types";

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

export function strayOf(id: string): { place: number; speed: number } {
  return STRAY[id] ?? { place: 0.0005, speed: 0.001 };
}

/** −180 ≤ x < 180. */
export function wrap180(x: number): number {
  return ((((x + 180) % 360) + 360) % 360) - 180;
}

export function timeUnknown(chart: NatalChart): boolean {
  return chart.meta.timeUnknown === true;
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
export function slope(s: DaySpan): number {
  return s.end - s.start;
}
export function bend(s: DaySpan): number {
  return 2 * (s.start + s.end - 2 * s.noon);
}
export function valueAt(s: DaySpan, t: number): number {
  return s.noon + slope(s) * t + bend(s) * t * t;
}

/** When, inside the day, the motion turns (a station, or two speeds crossing); null if it does not. */
export function turnOf(s: DaySpan): number | null {
  const c = bend(s);
  if (Math.abs(c) < 1e-12) return null;
  const t = -slope(s) / (2 * c);
  return t > -0.5 && t < 0.5 ? t : null;
}

/** The lowest and highest values over the day, widened by `room` each way. */
export function extent(s: DaySpan, room = 0): [number, number] {
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
