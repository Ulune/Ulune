/**
 * The Stars part of the chart table (part 51 of the launch plan): the six
 * fixed stars charted and the five midpoints, each with its position and
 * the bodies on it: within 1° of a star (the conjunction the wheel marks),
 * within 1°30' of a midpoint or of its opposite point (a midpoint is an
 * axis). Positions from the cast (Swiss Ephemeris's star catalogue, apparent
 * places of the date). The page, its Copy button and the CSV read from here.
 */
import { midpointLon } from "./anatomy";
import { STAR_CONJUNCT_ORB } from "./constants";
import { chartPoints } from "./table-cells";
import { daySpan, extent, strayOf, timeUnknown, wrap180, type DaySpan } from "./unknown-time";
import type { BodyId, MidpointId, NatalChart, Placement, SignId, StarId } from "./types";
import { SIGN_IDS } from "./types";

/** A body within this much of a midpoint (or its opposite point) is on it. */
export const MIDPOINT_ORB = 1.5;

export type Contact = {
  body: BodyId;
  orb: number;
  /** On the opposite point of the midpoint's axis. */
  opposite: boolean;
  /** Without a birth time: it may not hold all day. */
  uncertain: boolean;
};

export type StarRow = {
  id: StarId;
  ecliptic: number;
  sign: SignId;
  contacts: Contact[];
};

export type MidpointRow = {
  id: MidpointId;
  a: BodyId;
  b: BodyId;
  ecliptic: number;
  sign: SignId;
  /** It hangs on the birth time (a midpoint with an angle), without one. */
  uncertain: boolean;
  contacts: Contact[];
};

const signOf = (lon: number): SignId => SIGN_IDS[Math.floor((((lon % 360) + 360) % 360) / 30)] ?? "aries";
const sep = (a: number, b: number) => Math.abs(wrap180(a - b));

/** The points that may sit on a star or a midpoint: every body, point and angle but the lots. */
function contactPoints(chart: NatalChart): Placement[] {
  return chartPoints(chart).filter((p) => p.id !== "fortune" && p.id !== "spirit");
}

/** Whether a distance over the day (a span of target − body) stays within an orb of 0 or, for an axis's far end, of 180°. */
function staysWithin(d: DaySpan, orb: number, room: number, opposite: boolean): boolean {
  const centre = opposite ? 180 : 0;
  const noon = centre + wrap180(d.noon - centre);
  const s: DaySpan = { start: noon + wrap180(d.start - d.noon), noon, end: noon + wrap180(d.end - d.noon) };
  const [lo, hi] = extent(s, room);
  return lo >= centre - orb && hi <= centre + orb;
}

export function starRows(chart: NatalChart): StarRow[] {
  const unknown = timeUnknown(chart);
  const points = contactPoints(chart);
  return chart.stars.map((star) => {
    const contacts: Contact[] = [];
    for (const p of points) {
      const orb = sep(p.ecliptic, star.ecliptic);
      if (orb > STAR_CONJUNCT_ORB) continue;
      let uncertain = false;
      if (unknown) {
        const s = daySpan(chart, p);
        uncertain = !s || !staysWithin({ start: star.ecliptic - s.start, noon: star.ecliptic - s.noon, end: star.ecliptic - s.end }, STAR_CONJUNCT_ORB, strayOf(p.id).place, false);
      }
      contacts.push({ body: p.id, orb, opposite: false, uncertain });
    }
    contacts.sort((x, y) => x.orb - y.orb);
    return { id: star.id, ecliptic: star.ecliptic, sign: signOf(star.ecliptic), contacts };
  });
}

/** A midpoint over the birth day, from its two members' spans; null when one hangs on the time. */
function midpointSpan(chart: NatalChart, a: Placement, b: Placement, noon: number): DaySpan | null {
  const sa = daySpan(chart, a);
  const sb = daySpan(chart, b);
  if (!sa || !sb) return null;
  const start = noon + wrap180(midpointLon(sa.start, sb.start) - noon);
  const end = noon + wrap180(midpointLon(sa.end, sb.end) - noon);
  // The pair crossing 180° apart turns the midpoint round to its other end: not the same point all day.
  if (Math.abs(start - noon) > 20 || Math.abs(end - noon) > 20) return null;
  return { start, noon, end };
}

/** One midpoint's row: where it falls, and the bodies on it or on its opposite point. */
function midpointRow(chart: NatalChart, points: Placement[], byId: Map<string, Placement>, id: string, a: BodyId, b: BodyId, ecliptic: number) {
  const unknown = timeUnknown(chart);
  const pa = byId.get(a);
  const pb = byId.get(b);
  const span = unknown && pa && pb ? midpointSpan(chart, pa, pb, ecliptic) : null;
  const rowUncertain = unknown && !span;
  const contacts: Contact[] = [];
  for (const p of points) {
    if (p.id === a || p.id === b) continue;
    const near = sep(p.ecliptic, ecliptic);
    const opposite = near > 90;
    const orb = opposite ? 180 - near : near;
    if (orb > MIDPOINT_ORB) continue;
    let uncertain = rowUncertain;
    if (unknown && !uncertain && span) {
      const s = daySpan(chart, p);
      uncertain =
        !s ||
        !staysWithin(
          { start: span.start - s.start, noon: span.noon - s.noon, end: span.end - s.end },
          MIDPOINT_ORB,
          strayOf(p.id).place + (strayOf(a).place + strayOf(b).place) / 2,
          opposite,
        );
    }
    contacts.push({ body: p.id, orb, opposite, uncertain });
  }
  contacts.sort((x, y) => x.orb - y.orb);
  return { id, a, b, ecliptic, sign: signOf(ecliptic), uncertain: rowUncertain, contacts };
}

export function midpointRows(chart: NatalChart): MidpointRow[] {
  const points = contactPoints(chart);
  const byId = new Map(points.map((p) => [p.id as string, p]));
  return chart.midpoints.map((m) => midpointRow(chart, points, byId, m.id, m.a, m.b, m.ecliptic) as MidpointRow);
}

/** The bodies of the full midpoint list: the planets, the North Node and the two main angles. */
export const MIDPOINT_LIST_BODIES: readonly BodyId[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "northnode", "ascendant", "midheaven"];

export type MidpointListRow = Omit<MidpointRow, "id"> & { id: string };

/**
 * Every midpoint of those bodies (review 3 Oct, B7), in zodiac order, each
 * with the bodies on it; `body` keeps those with that body as a member.
 */
export function midpointList(chart: NatalChart, body: BodyId | null = null): MidpointListRow[] {
  const points = contactPoints(chart);
  const byId = new Map(points.map((p) => [p.id as string, p]));
  const ids = MIDPOINT_LIST_BODIES.filter((id) => byId.has(id));
  const out: MidpointListRow[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i]!;
      const b = ids[j]!;
      if (body && a !== body && b !== body) continue;
      const lon = midpointLon(byId.get(a)!.ecliptic, byId.get(b)!.ecliptic);
      out.push(midpointRow(chart, points, byId, `${a}-${b}`, a, b, lon));
    }
  }
  return out.sort((x, y) => x.ecliptic - y.ecliptic);
}
