/**
 * The Patterns part's configurations (part 50 of the launch plan): one shape
 * however many ways bodies in conjunction make it, with the orbs that hold
 * it together, the dominant shape first. The same T-square found four times
 * because Jupiter conjoins Chiron and Uranus conjoins Neptune is one T-square
 * whose corners are "Jupiter or Chiron" and "Neptune or Uranus".
 */
import { bodyBare } from "@/lib/i18n/astro";
import type { AppLocale } from "@/lib/i18n/messages";
import { patternsWord } from "@/lib/i18n/table-ui";
import { formatArc } from "@/lib/utils";
import { membersHold } from "./day-checks";
import { CONFIG_LABEL } from "./overlay-filter";
import { dominantConfiguration } from "./patterns";
import type { AspectConfiguration, AspectLink, BodyId, ChartPatterns, NatalChart } from "./types";

export type MergedShape = {
  type: AspectConfiguration["type"];
  /** The tightest way the shape is made. */
  representative: AspectConfiguration;
  /** Each corner but the focal one: the body, then those in conjunction that make the shape in its place. */
  corners: BodyId[][];
  /** The focal corner (the apex of a T-square, yod or kite), with its stand-ins. */
  focal: BodyId[] | null;
  /** How many of the found configurations it gathers. */
  ways: number;
  /** The aspects that make the representative, tightest first. */
  aspects: AspectLink[];
  orbs: [number, number];
  dominant: boolean;
  uncertain: boolean;
};

const SHAPE_ASPECT = new Set(["conjunction", "opposition", "trine", "square", "sextile", "quincunx"]);

/** The aspects among a configuration's members that make its shape (the majors, and the yod's quincunxes). */
function shapeAspects(c: AspectConfiguration, aspects: readonly AspectLink[]): AspectLink[] {
  const members = new Set<string>(c.members);
  return aspects
    .filter((a) => members.has(a.a) && members.has(a.b) && SHAPE_ASPECT.has(a.type) && (a.level === "major" || a.type === "quincunx"))
    .sort((x, y) => x.orb - y.orb);
}

function meanOrb(list: readonly AspectLink[]): number {
  return list.length ? list.reduce((s, a) => s + a.orb, 0) / list.length : 99;
}

/** Every ordering of a short list (four members at most: 24). */
function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [xs.slice()];
  const out: T[][] = [];
  xs.forEach((x, i) => {
    for (const rest of permutations([...xs.slice(0, i), ...xs.slice(i + 1)])) out.push([x, ...rest]);
  });
  return out;
}

/**
 * The same shape made another way: a one-to-one match of the members where
 * each pair is the same body or two bodies in conjunction, the focal corner
 * matching the focal corner. Returns the match (a's member → b's), or null.
 */
function sameShape(a: AspectConfiguration, b: AspectConfiguration, conjunct: (x: string, y: string) => boolean): Map<BodyId, BodyId> | null {
  if (a.type !== b.type || a.members.length !== b.members.length) return null;
  for (const order of permutations(b.members)) {
    const ok = a.members.every((m, i) => m === order[i] || conjunct(m, order[i] as string));
    if (!ok) continue;
    const match = new Map(a.members.map((m, i) => [m, order[i] as BodyId]));
    if ((a.apex == null) !== (b.apex == null)) continue;
    if (a.apex != null && match.get(a.apex) !== b.apex) continue;
    return match;
  }
  return null;
}

/** The chart's configurations as shapes: near-duplicates merged, the dominant first, then the larger and tighter. */
export function mergedShapes(chart: NatalChart, patterns: ChartPatterns): MergedShape[] {
  const configs = patterns.configurations;
  if (!configs.length) return [];
  const conj = new Set<string>();
  for (const a of chart.aspects) if (a.type === "conjunction") conj.add(`${a.a}|${a.b}`).add(`${a.b}|${a.a}`);
  const conjunct = (x: string, y: string) => conj.has(`${x}|${y}`);

  // Group the configurations that are the same shape (any two alike join, and so do their groups).
  const parent = configs.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i] as number)));
  for (let i = 0; i < configs.length; i += 1) {
    for (let j = i + 1; j < configs.length; j += 1) {
      if (sameShape(configs[i] as AspectConfiguration, configs[j] as AspectConfiguration, conjunct)) parent[root(j)] = root(i);
    }
  }
  const byRoot = new Map<number, AspectConfiguration[]>();
  configs.forEach((c, i) => byRoot.set(root(i), [...(byRoot.get(root(i)) ?? []), c]));
  const groups = [...byRoot.values()];

  const dominant = dominantConfiguration(configs, chart.aspects);
  const shapes = groups.map((group): MergedShape => {
    const ranked = [...group].sort((x, y) => meanOrb(shapeAspects(x, chart.aspects)) - meanOrb(shapeAspects(y, chart.aspects)));
    const rep = ranked[0] as AspectConfiguration;
    const slots = new Map<BodyId, BodyId[]>(rep.members.map((m) => [m, [m]]));
    for (const other of ranked.slice(1)) {
      const match = sameShape(rep, other, conjunct);
      if (!match) continue;
      for (const [mine, theirs] of match) {
        const slot = slots.get(mine);
        if (slot && !slot.includes(theirs)) slot.push(theirs);
      }
    }
    const aspects = shapeAspects(rep, chart.aspects);
    const orbs = aspects.map((a) => a.orb);
    return {
      type: rep.type,
      representative: rep,
      corners: rep.members.filter((m) => m !== rep.apex).map((m) => slots.get(m) ?? [m]),
      focal: rep.apex ? (slots.get(rep.apex) ?? [rep.apex]) : null,
      ways: group.length,
      aspects,
      orbs: [Math.min(...orbs), Math.max(...orbs)],
      dominant: dominant != null && group.some((c) => c.id === dominant.id),
      uncertain: !group.every((c) => membersHold(chart, c.members)),
    };
  });
  return shapes.sort(
    (x, y) =>
      Number(y.dominant) - Number(x.dominant) ||
      y.representative.members.length - x.representative.members.length ||
      meanOrb(x.aspects) - meanOrb(y.aspects),
  );
}

/** "Jupiter or Chiron". */
function slotText(ids: readonly BodyId[], locale: AppLocale): string {
  return ids.map((id) => bodyBare(id, locale)).join(patternsWord(locale, "or"));
}

/** A shape in words: "Kite · Jupiter or Chiron, Pluto, Moon, Neptune · focal Jupiter or Chiron · orbs 0°28' to 6°32'". */
export function shapeText(s: MergedShape, locale: AppLocale): { name: string; members: string; focal: string; orbs: string; ways: string } {
  return {
    name: CONFIG_LABEL[s.type][locale],
    members: s.corners.map((c) => slotText(c, locale)).join(", "),
    focal: s.focal ? patternsWord(locale, "focal", { name: slotText(s.focal, locale) }) : "",
    orbs: patternsWord(locale, "orbs", { from: formatArc(s.orbs[0]), to: formatArc(s.orbs[1]) }),
    ways: s.ways > 1 ? patternsWord(locale, "ways", { n: String(s.ways) }) : "",
  };
}

/** The shape as one line of text. */
export function shapeLine(s: MergedShape, locale: AppLocale): string {
  const t = shapeText(s, locale);
  return [t.name, t.members, t.focal, t.orbs, t.ways, s.dominant ? patternsWord(locale, "dominant") : ""].filter(Boolean).join(" · ");
}
