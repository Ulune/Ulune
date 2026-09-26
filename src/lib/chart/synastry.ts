/**
 * Inter-chart synastry: A's sky against B's sky.
 *
 * Aspects come from `computeSynastryAspects` in `anatomy.ts` — the same
 * `bestAspect` / `aspectOrb` pair the natal chart uses. There is no synastry
 * orb table: a planet-to-angle trine is 6° here exactly as it is natally.
 *
 * House overlays are read with the shared `houseFromCusps`, against the host
 * chart's own cusps (so its own house system, including a polar fallback,
 * drives the overlay). Overlays into a chart whose birth time is unknown are
 * placeholders — that chart's `meta.timeUnknown` and `houses[i].uncertain`
 * already say so, and callers must carry the flag rather than re-derive it.
 */
import { computeSynastryAspects, houseFromCusps, wrap360 } from "./anatomy";
import type { AspectLink, BodyId, HouseOverlay, NatalChart, Placement, SynastryPair } from "./types";

export function chartPoints(chart: NatalChart): Placement[] {
  return [...chart.planets, ...Object.values(chart.angles)];
}

export function cuspLongitudes(chart: NatalChart): number[] {
  return chart.houses.map((h) => h.ecliptic);
}

/**
 * The chart's cusps as a usable zodiacal ring, or `null`.
 *
 * `houseFromCusps` answers 1 for anything it cannot place, so a chart saved
 * before cusps existed — or one whose ring has been scrambled — would silently
 * report every body in the first house. A ring is usable only when all twelve
 * cusps are finite and each span is positive and they sum to exactly one turn.
 * Shared with `composite.ts`; do not inline a second copy.
 */
export function houseRing(chart: NatalChart): number[] | null {
  const raw = chart.houses;
  if (!Array.isArray(raw) || raw.length < 12) return null;
  const cusps = raw.slice(0, 12).map((h) => wrap360(h.ecliptic));
  if (cusps.some((c) => !Number.isFinite(c))) return null;
  let turn = 0;
  for (let i = 0; i < 12; i += 1) {
    const span = wrap360((cusps[(i + 1) % 12] ?? 0) - (cusps[i] ?? 0));
    if (!(span > 0)) return null;
    turn += span;
  }
  return Math.abs(turn - 360) < 1e-6 ? cusps : null;
}

/** Empty when the host chart has no usable ring — never a wall of "house 1". */
export function overlayInHouses(bodies: Placement[], cusps: number[]): HouseOverlay[] {
  if (cusps.length < 12) return [];
  return bodies.map((p) => ({
    body: p.id,
    house: houseFromCusps(p.ecliptic, cusps),
  }));
}

export function buildSynastry(a: NatalChart, b: NatalChart): SynastryPair {
  const aPoints = chartPoints(a);
  const bPoints = chartPoints(b);
  const aspects = computeSynastryAspects(aPoints, bPoints);
  const majors = aspects.filter((x) => x.level === "major");
  const aRing = houseRing(a);
  const bRing = houseRing(b);
  return {
    aspects,
    majors,
    overlays: {
      aInB: bRing ? overlayInHouses(aPoints, bRing) : [],
      bInA: aRing ? overlayInHouses(bPoints, aRing) : [],
    },
  };
}

/** True when one of the two charts has no birth time, so every overlay is a noon placeholder. */
export function overlaysUncertain(a: NatalChart, b: NatalChart): boolean {
  return a.meta.timeUnknown === true || b.meta.timeUnknown === true;
}

export function meetingAspect(majors: AspectLink[], id: BodyId): AspectLink | null {
  return majors.find((row) => row.a === id && row.b === id) ?? null;
}

export function synastryRowTestId(link: AspectLink): string {
  return `synastry-row-${link.id}`;
}

export function partnerBodies(chart: NatalChart): NatalChart["planets"] {
  return chartPoints(chart);
}
