/**
 * "You two, now" for astrology's Relationship pages (share and compare plan,
 * feature 5e, decision R5): today's transits to the relationship's own chart,
 * the composite (the midpoints of the two charts) or the Davison (the moment
 * and place halfway), on Composite as the page shows it and on Synastry as
 * the midpoints. The sky is cast through the "calculate" door like any
 * transits (on this device by default), with the relationship's chart in
 * place of a birth chart; this file only chooses what the part shows.
 *
 *   - Major aspects only (conjunction, sextile, square, trine, opposition).
 *   - Tight orbs: within 2° for the slow movers (Jupiter to Pluto, Chiron and
 *     the North Node), whose contacts last weeks to years; within 1° for the
 *     Sun, Mercury, Venus and Mars, which pass in days. Not the Moon: its
 *     contacts last hours, the day view's weather rather than the pair's.
 *   - The points of the relationship's chart: the Sun to Pluto, and the
 *     Ascendant and Midheaven when both birth times are known (a composite's
 *     angles rest on them).
 *   - The slow movers first, slowest first, then by orb; six at most.
 *
 * Pure; scripts/pair-now.test.mjs checks it. Nothing here is sent anywhere.
 */
import type { AspectId, AspectLink, BodyId, NatalChart, Placement, TransitSky } from "./types";

/** The moving bodies read, slowest first. */
export const NOW_MOVERS = ["pluto", "neptune", "uranus", "saturn", "chiron", "jupiter", "northnode", "mars", "sun", "venus", "mercury"] as const;
export type NowMover = (typeof NOW_MOVERS)[number];

/** The slow movers: their contacts last weeks to years. */
export const NOW_SLOW: ReadonlySet<string> = new Set(["pluto", "neptune", "uranus", "saturn", "chiron", "jupiter", "northnode"]);

/** The relationship chart's points read. */
export const NOW_POINTS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "ascendant", "midheaven"] as const;
const ANGLES = new Set<string>(["ascendant", "midheaven"]);

export const NOW_ASPECTS: readonly AspectId[] = ["conjunction", "sextile", "square", "trine", "opposition"];

/** The widest orb read, by mover. */
export const nowOrb = (moving: string): number => (NOW_SLOW.has(moving) ? 2 : 1);

/** How many contacts the part shows. */
export const NOW_LIMIT = 6;

/** The part as a whole (its first-read line and its reading). */
export const NOW_REF = "two:now";

/** One contact's reading: "two:asp:saturn:square:sun". */
export const nowRef = (link: Pick<AspectLink, "a" | "type" | "b">): string => `two:asp:${link.a}:${link.type}:${link.b}`;

export type NowContact = {
  ref: string;
  link: AspectLink;
  /** The moving body as cast, and the relationship chart's point. */
  moving: Placement | null;
  point: Placement | null;
  slow: boolean;
};

/** Where a body stands in the relationship's chart. */
export function pointOf(chart: NatalChart, id: string): Placement | null {
  if (id in chart.angles) return chart.angles[id as keyof NatalChart["angles"]] ?? null;
  return chart.planets.find((p) => p.id === id) ?? null;
}

/** Whether the relationship chart's angles can be read: a Davison or composite of two known birth times. */
export function anglesKnown(chart: NatalChart): boolean {
  return chart.meta.timeUnknown !== true;
}

/** The contacts the part shows, slow movers first. */
export function nowContacts(sky: TransitSky, chart: NatalChart, limit = NOW_LIMIT): NowContact[] {
  const withAngles = anglesKnown(chart);
  const out: NowContact[] = [];
  const seen = new Set<string>();
  for (const link of sky.aspects) {
    if (!(NOW_MOVERS as readonly string[]).includes(link.a)) continue;
    if (!(NOW_POINTS as readonly string[]).includes(link.b)) continue;
    if (ANGLES.has(link.b) && !withAngles) continue;
    if (!NOW_ASPECTS.includes(link.type)) continue;
    if (!(Math.abs(link.orb) <= nowOrb(link.a))) continue;
    const ref = nowRef(link);
    if (seen.has(ref)) continue;
    seen.add(ref);
    out.push({ ref, link, moving: sky.planets.find((p) => p.id === link.a) ?? null, point: pointOf(chart, link.b), slow: NOW_SLOW.has(link.a) });
  }
  const rank = (c: NowContact) => (NOW_MOVERS as readonly string[]).indexOf(c.link.a);
  return out.sort((x, y) => rank(x) - rank(y) || Math.abs(x.link.orb) - Math.abs(y.link.orb)).slice(0, limit);
}

/** A contact's reading id read back: the moving body, the aspect, the point (null for anything else). */
export function parseNowRef(id: string | null | undefined): { a: BodyId; type: AspectId; b: BodyId } | null {
  const m = /^two:asp:([a-z]+):([a-z]+):([a-z]+)$/.exec(id ?? "");
  if (!m) return null;
  if (!(NOW_MOVERS as readonly string[]).includes(m[1]!) || !NOW_ASPECTS.includes(m[2] as AspectId) || !(NOW_POINTS as readonly string[]).includes(m[3]!)) return null;
  return { a: m[1] as BodyId, type: m[2] as AspectId, b: m[3] as BodyId };
}

/** The moment the part reads: now, to the ten minutes (so a page and its table share one cast). */
export function nowMoment(ms: number): number {
  return Math.floor(ms / 600_000) * 600_000;
}
