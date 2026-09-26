/**
 * How much each part of the wheel is involved in a focus — the ranking behind
 * the pop-out (Depth v2, see the depth v2 plan §3).
 *
 *   tier 0  the thing itself (the Sun you clicked)
 *   tier 1  directly involved (its sign, its house, its aspects)
 *   tier 2  touched (the bodies at the other end of its aspects, their signs
 *           and houses)
 *
 * Aspects carry a strength from their orb: the tightest is the strongest, on
 * the same scale the wheel already uses to draw lines. The ranking is computed
 * from the focus the wheel has resolved (so layers, filters and hidden bodies
 * are already respected) and is shared by the 2D relief and the 3D view.
 */
import type { WheelFocus, WheelFocusCtx } from "./wheel-focus";
import type { AspectLink } from "./types";

export type Tier = 0 | 1 | 2;
export type Ranked = { tier: Tier; weight: number };
export type AspectRank = Ranked & {
  orb: number;
  /** 0..1 from the orb: tightest = 1. */
  strength: number;
  /** 0 = the tightest aspect of this focus. */
  order: number;
  /** Which list the aspect comes from. */
  source: "natal" | "cross" | "outer";
};

export type WheelRanking = {
  id: string | null;
  bodies: Map<string, Ranked>;
  partners: Map<string, Ranked>;
  signs: Map<string, Ranked>;
  houses: Map<number, Ranked>;
  decans: Map<string, Ranked>;
  aspects: Map<string, AspectRank>;
};

/** Orb at which an aspect counts as weakest (the wheel's own line scale). */
export function orbCap(level: AspectLink["level"]): number {
  return level === "minor" ? 3.2 : 10;
}

/** 0.12..1 from the orb: 1 is exact. */
export function orbStrength(a: Pick<AspectLink, "orb" | "level">): number {
  return Math.max(0.12, Math.min(1, 1 - a.orb / orbCap(a.level)));
}

const ANGLE_HOUSE: Record<string, number> = { ascendant: 1, ic: 4, descendant: 7, midheaven: 10 };

function faceIndex(ecliptic: number) {
  return Math.floor((((ecliptic % 30) + 30) % 30) / 10);
}

/** The house whose cusps hold a longitude. */
export function houseOfLongitude(ecliptic: number, houses: { id: number; ecliptic: number }[]): number | null {
  for (let i = 0; i < houses.length; i += 1) {
    const h = houses[i];
    const next = houses[(i + 1) % houses.length];
    const span = (((next.ecliptic - h.ecliptic) % 360) + 360) % 360;
    const off = (((ecliptic - h.ecliptic) % 360) + 360) % 360;
    if (off < span) return h.id;
  }
  return null;
}

export function emptyRanking(id: string | null = null): WheelRanking {
  return {
    id,
    bodies: new Map(),
    partners: new Map(),
    signs: new Map(),
    houses: new Map(),
    decans: new Map(),
    aspects: new Map(),
  };
}

/** Keep the strongest rank: the lowest tier, then the highest weight. */
function put<K>(map: Map<K, Ranked>, key: K | null | undefined, tier: Tier, weight: number) {
  if (key == null || key === "") return;
  const w = Math.max(0, Math.min(1, weight));
  const had = map.get(key);
  if (!had || tier < had.tier || (tier === had.tier && w > had.weight)) map.set(key, { tier, weight: w });
}

type Where = { sign: string | null; house: number | null; decan: string | null };

export function rankWheelFocus(focus: WheelFocus, ctx: WheelFocusCtx): WheelRanking {
  const r = emptyRanking(focus.id);
  if (!focus.id || !focus.kind) return r;
  const sep = focus.id.indexOf(":");
  const kind = focus.id.slice(0, sep);
  const key = focus.id.slice(sep + 1);

  // Where things are.
  const natal = new Map(ctx.bodies.map((b) => [b.id, b]));
  const natalHouse = new Map<string, number>();
  for (const p of ctx.shownPlanets) natalHouse.set(p.id, p.house);
  const outer = new Map((ctx.outerBodies ?? []).map((b) => [b.id, b]));
  const houses = ctx.chart.houses;
  const whereNatal = (id: string): Where => {
    const b = natal.get(id);
    if (!b) return { sign: null, house: null, decan: null };
    const house = natalHouse.get(id) ?? ANGLE_HOUSE[id] ?? houseOfLongitude(b.ecliptic, houses);
    return { sign: b.sign, house, decan: `${b.sign}-${faceIndex(b.ecliptic)}` };
  };
  const whereOuter = (id: string): Where => {
    const b = outer.get(id);
    if (!b) return { sign: null, house: null, decan: null };
    return { sign: b.sign, house: houseOfLongitude(b.ecliptic, houses), decan: `${b.sign}-${faceIndex(b.ecliptic)}` };
  };

  // The focus's aspects, strongest first.
  // Outer-ring aspects can share an id with a natal one: look where the focus
  // lives first.
  const outerFirst = kind === "oaspect" || kind === "transit" || kind === "progressed" || kind === "partner";
  const lists: [AspectRank["source"], AspectLink[] | null | undefined][] = outerFirst
    ? [
        ["outer", ctx.outerAspects],
        ["cross", ctx.crossAspects],
        ["natal", ctx.chart.aspects],
      ]
    : [
        ["natal", ctx.chart.aspects],
        ["cross", ctx.crossAspects],
        ["outer", ctx.outerAspects],
      ];
  const links: { link: AspectLink; source: AspectRank["source"] }[] = [];
  const seen = new Set<string>();
  for (const [source, list] of lists) {
    for (const a of list ?? []) {
      if (!focus.aspects.has(a.id) || seen.has(a.id)) continue;
      seen.add(a.id);
      links.push({ link: a, source });
    }
  }
  links.sort((x, y) => x.link.orb - y.link.orb);
  const ends = (x: { link: AspectLink; source: AspectRank["source"] }) => {
    // Natal–natal: both natal. Cross: a is the outer body, b the natal one
    // (synastry keeps a natal). Outer: both on the outer ring.
    if (x.source === "natal") return { natal: [x.link.a, x.link.b], outer: [] as string[] };
    if (x.source === "outer") return { natal: [] as string[], outer: [x.link.a, x.link.b] };
    const synastry = ctx.outerKind === "synastry";
    return synastry ? { natal: [x.link.a], outer: [x.link.b] } : { natal: [x.link.b], outer: [x.link.a] };
  };
  const rankAspects = (tier: Tier) => {
    links.forEach((x, order) => {
      const strength = orbStrength(x.link);
      const had = r.aspects.get(x.link.id);
      if (had && had.tier <= tier) return;
      r.aspects.set(x.link.id, { tier, weight: strength, orb: x.link.orb, strength, order, source: x.source });
    });
  };
  const placeNatal = (id: string, tier: Tier, weight: number, withDecan = false) => {
    if (!ctx.visible.has(id)) return;
    put(r.bodies, id, tier, weight);
    const w = whereNatal(id);
    const at: Tier = tier === 0 ? 1 : 2;
    put(r.signs, w.sign, at, weight);
    put(r.houses, w.house, at, weight);
    if (withDecan) put(r.decans, w.decan, at, weight);
  };
  const placeOuter = (id: string, tier: Tier, weight: number) => {
    put(r.partners, id, tier, weight);
    const w = whereOuter(id);
    const at: Tier = tier === 0 ? 1 : 2;
    put(r.signs, w.sign, at, weight);
    put(r.houses, w.house, at, weight);
  };
  /** The bodies at the other end of the focus's aspects, weighted by the strongest link. */
  const otherEnds = (mine: Set<string>, mineOuter: Set<string>) => {
    for (const x of links) {
      const s = orbStrength(x.link);
      const e = ends(x);
      for (const id of e.natal) if (!mine.has(id)) placeNatal(id, 2, s);
      for (const id of e.outer) if (!mineOuter.has(id)) placeOuter(id, 2, s);
    }
  };

  if (kind === "planet" || kind === "angle") {
    placeNatal(key, 0, 1, true);
    rankAspects(1);
    otherEnds(new Set([key]), new Set());
  } else if (kind === "transit" || kind === "progressed" || kind === "partner") {
    placeOuter(key, 0, 1);
    rankAspects(1);
    otherEnds(new Set(), new Set([key]));
  } else if (kind === "aspect" || kind === "taspect" || kind === "saspect" || kind === "paspect" || kind === "oaspect") {
    rankAspects(0);
    for (const x of links) {
      const e = ends(x);
      for (const id of e.natal) placeNatal(id, 1, 1);
      for (const id of e.outer) placeOuter(id, 1, 1);
    }
  } else if (kind === "sign" || kind === "house" || kind === "decan") {
    if (kind === "sign") put(r.signs, key, 0, 1);
    if (kind === "house") {
      const n = Number(key);
      put(r.houses, n, 0, 1);
      const cusp = houses.find((h) => h.id === n);
      put(r.signs, cusp?.sign, 1, 1);
    }
    if (kind === "decan") {
      put(r.decans, key, 0, 1);
      put(r.signs, key.slice(0, key.lastIndexOf("-")), 1, 1);
    }
    // Members: the bodies the wheel put in focus that sit in this place.
    const members = new Set<string>();
    for (const id of focus.bodies) {
      const w = whereNatal(id);
      const inside =
        kind === "sign" ? w.sign === key : kind === "house" ? String(w.house) === key : w.decan === key;
      if (inside) members.add(id);
    }
    for (const id of members) {
      if (!ctx.visible.has(id)) continue;
      put(r.bodies, id, 1, 1);
      const w = whereNatal(id);
      if (kind !== "house") put(r.houses, w.house, 2, 0.8);
      if (kind === "house") put(r.signs, w.sign, 2, 0.8);
    }
    rankAspects(2);
    for (const x of links) {
      const s = orbStrength(x.link);
      const e = ends(x);
      for (const id of e.natal) if (!members.has(id) && ctx.visible.has(id)) put(r.bodies, id, 2, s);
      for (const id of e.outer) put(r.partners, id, 2, s);
    }
  } else if (kind === "atype") {
    // One aspect family: its lines first, the bodies they join next.
    rankAspects(1);
    for (const x of links) {
      const e = ends(x);
      const s = orbStrength(x.link);
      for (const id of e.natal) placeNatal(id, 2, s);
      for (const id of e.outer) placeOuter(id, 2, s);
    }
  } else if (kind === "star" || kind === "mp" || kind === "reception") {
    // The mark itself is the focus element; the bodies it touches come next.
    const core =
      kind === "reception"
        ? key.split("-").filter(Boolean)
        : kind === "mp"
          ? (() => {
              const m = ctx.shownMids.find((x) => x.id === key);
              return m ? [m.a, m.b] : [];
            })()
          : (() => {
              const s = ctx.shownStars.find((x) => x.id === key);
              return s?.conjunct ? [s.conjunct.body] : [];
            })();
    for (const id of core) placeNatal(id, 1, 1);
    rankAspects(2);
    otherEnds(new Set(core), new Set());
  }
  return r;
}

/** Everything the ranking lifts, as the ids the wheel paints with (data-hl). */
export function rankedIds(r: WheelRanking, outerPrefix: "transit" | "partner" | "progressed" = "transit"): Map<string, Ranked> {
  const out = new Map<string, Ranked>();
  for (const [id, v] of r.bodies) out.set(`${id in ANGLE_HOUSE ? "angle" : "planet"}:${id}`, v);
  for (const [id, v] of r.partners) out.set(`${outerPrefix}:${id}`, v);
  for (const [id, v] of r.signs) out.set(`sign:${id}`, v);
  for (const [id, v] of r.houses) out.set(`house:${id}`, v);
  for (const [id, v] of r.decans) out.set(`decan:${id}`, v);
  return out;
}
