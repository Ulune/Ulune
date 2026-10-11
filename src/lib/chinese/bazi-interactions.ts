/*
 * The interactions inside a BaZi chart (languages plan, part 14: "stem
 * combinations, branch harmonies, trines, seasonal trios, clashes, harms,
 * punishments, destructions, each with whether its transformation
 * conditions are met"). The branch relations themselves are part 8's
 * (relations.ts); this module places them on the four pillars, adds the
 * stems' combinations and clashes, the half trines and the seasonal trios,
 * and asks the transformation question with conditions the reader can
 * check one by one:
 *
 *   - neighbours: the two pillars stand side by side (a combination at a
 *     distance binds without transforming);
 *   - in season: the month branch supports the phase it would make (the
 *     month is that phase, or one of its season's three branches);
 *   - unbroken: no other stem (or branch) of the chart clashes either of
 *     them;
 *   - uncontested: no third stem (or branch) seeks the same partner.
 *
 * A trine or seasonal trio needs its three branches, the season and no
 * clash; a half trine (two branches with the trine's peak) leans towards
 * its phase without transforming. Schools weigh these differently; Ulune
 * states its conditions rather than hide them. Pure: tested in
 * scripts/chinese-bazi-interactions.test.mjs.
 */
import { BRANCHES, type ChineseName, type PhaseId } from "./names";
import { PUNISHMENT_GROUPS, RELATION_NAMES, SELF_PUNISHING, TRINES, branchRelations } from "./relations";
import type { BaziChart, BaziPlaceId } from "./bazi";

export type InteractionKind =
  | "stem-combination"
  | "stem-clash"
  | "harmony"
  | "trine"
  | "half-trine"
  | "season"
  | "clash"
  | "harm"
  | "punishment"
  | "self-punishment"
  | "destruction";

/** In the order they are read: the stems first, then the branches' meetings, then their tensions. */
export const INTERACTION_KINDS: readonly InteractionKind[] = [
  "stem-combination",
  "stem-clash",
  "season",
  "trine",
  "half-trine",
  "harmony",
  "clash",
  "punishment",
  "self-punishment",
  "harm",
  "destruction",
];

export const INTERACTION_NAMES: Record<InteractionKind, ChineseName> = {
  "stem-combination": { hant: "天干五合", hans: "天干五合", pinyin: "tiāngān wǔhé", en: "Stem combination", fr: "Combinaison de troncs" },
  "stem-clash": { hant: "天干相沖", hans: "天干相冲", pinyin: "tiāngān xiāngchōng", en: "Stem clash", fr: "Choc de troncs" },
  season: { hant: "三會", hans: "三会", pinyin: "sānhuì", en: "Seasonal trio", fr: "Trio saisonnier" },
  trine: RELATION_NAMES.trine,
  "half-trine": { hant: "半合", hans: "半合", pinyin: "bànhé", en: "Half trine", fr: "Demi-trigone" },
  harmony: RELATION_NAMES.harmony,
  clash: RELATION_NAMES.clash,
  punishment: RELATION_NAMES.punishment,
  "self-punishment": RELATION_NAMES["self-punishment"],
  harm: RELATION_NAMES.harm,
  destruction: RELATION_NAMES.destruction,
};

/** Whether an interaction brings together (combinations, trines, harmonies) or rubs (the rest). */
export const interactionTone = (kind: InteractionKind): "meet" | "tension" =>
  kind === "stem-combination" || kind === "season" || kind === "trine" || kind === "half-trine" || kind === "harmony" ? "meet" : "tension";

export type ConditionId = "neighbours" | "season" | "unbroken" | "uncontested" | "complete";

export type Condition = {
  id: ConditionId;
  met: boolean;
  /** For "season": the month branch. For "unbroken": who clashes whom. For "uncontested": the rival and the one it seeks. */
  month?: number;
  breaker?: { place: BaziPlaceId; item: number; target: number };
  rival?: { place: BaziPlaceId; item: number; target: number };
};

export type Interaction = {
  /** "harmony:year-month": the kind and the places it joins, in the chart's order. */
  id: string;
  kind: InteractionKind;
  level: "stem" | "branch";
  places: BaziPlaceId[];
  /** The stems or branches it joins, place by place. */
  items: number[];
  /** Two pillars side by side (always false for three). */
  neighbours: boolean;
  /** The phase a combination, harmony, trine or trio makes. */
  phase?: PhaseId;
  /** The punishment's group, for the punishments. */
  group?: "ungrateful" | "power" | "uncivil";
  /** The transformation's conditions, for the combinations, harmonies, trines and trios. */
  conditions?: Condition[];
  /** All its conditions met (combinations, harmonies, trines, trios). */
  transforms?: boolean;
};

const PLACE_ORDER: readonly BaziPlaceId[] = ["year", "month", "day", "hour"];
const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The five stem combinations (天干五合): Jia-Ji Earth, Yi-Geng Metal, Bing-Xin Water, Ding-Ren Wood, Wu-Gui Fire, the stems five apart. */
export const STEM_COMBINATION_PHASE: readonly PhaseId[] = ["earth", "metal", "water", "wood", "fire"];
export const stemCombination = (a: number, b: number): PhaseId | null =>
  Math.abs(a - b) === 5 ? STEM_COMBINATION_PHASE[Math.min(a, b)]! : null;

/** The four stem clashes (天干四沖): Jia-Geng, Yi-Xin, Bing-Ren, Ding-Gui; the Earth stems, in the centre, clash with none. */
export const stemClash = (a: number, b: number): boolean => Math.abs(a - b) === 6 && Math.min(a, b) < 4;

/** The phase each of the six harmonies (六合) makes, by its lower branch: Zi-Chou Earth, Yin-Hai Wood, Mao-Xu Fire, Chen-You Metal, Si-Shen Water, Wu-Wei Fire (Earth in some books). */
export function harmonyPhase(a: number, b: number): PhaseId | null {
  if ((mod12(a) + mod12(b)) % 12 !== 1 || mod12(a) === mod12(b)) return null;
  const pair = [mod12(a), mod12(b)].sort((x, y) => x - y).join("-");
  return ({ "0-1": "earth", "2-11": "wood", "3-10": "fire", "4-9": "metal", "5-8": "water", "6-7": "fire" } as Record<string, PhaseId>)[pair] ?? null;
}

/** The four seasonal trios (三會, the directional combinations): Yin-Mao-Chen Wood (east, spring), Si-Wu-Wei Fire, Shen-You-Xu Metal, Hai-Zi-Chou Water. */
export const SEASONS: readonly { branches: readonly [number, number, number]; phase: PhaseId }[] = [
  { branches: [2, 3, 4], phase: "wood" },
  { branches: [5, 6, 7], phase: "fire" },
  { branches: [8, 9, 10], phase: "metal" },
  { branches: [11, 0, 1], phase: "water" },
];

/** Whether a month branch supports a phase: the month is that phase, or one of its season's branches (Earth's are the four storehouses, Chen, Xu, Chou and Wei). */
export function monthSupports(month: number, phase: PhaseId): boolean {
  const m = mod12(month);
  if (BRANCHES[m]!.phase === phase) return true;
  if (phase === "earth") return [4, 10, 1, 7].includes(m);
  return SEASONS.find((s) => s.phase === phase)!.branches.includes(m);
}

type Placed = { place: BaziPlaceId; item: number };

const neighbours = (a: BaziPlaceId, b: BaziPlaceId) => Math.abs(PLACE_ORDER.indexOf(a) - PLACE_ORDER.indexOf(b)) === 1;

/** The interactions of a chart's four (or three) pillars, in INTERACTION_KINDS's order, then the places' order. */
export function baziInteractions(c: BaziChart): Interaction[] {
  const stems: Placed[] = c.pillars.map((p) => ({ place: p.id, item: p.stem }));
  const branches: Placed[] = c.pillars.map((p) => ({ place: p.id, item: p.branch }));
  const month = c.pillars.find((p) => p.id === "month")!.branch;
  const out: Interaction[] = [];
  const idOf = (kind: InteractionKind, places: BaziPlaceId[]) => `${kind}:${places.join("-")}`;

  /** The conditions for a pair to transform into a phase. */
  const pairConditions = (level: "stem" | "branch", all: Placed[], a: Placed, b: Placed, phase: PhaseId): Condition[] => {
    const clashes = level === "stem" ? stemClash : (x: number, y: number) => mod12(x - y) === 6;
    const joins = level === "stem" ? (x: number, y: number) => stemCombination(x, y) != null : (x: number, y: number) => harmonyPhase(x, y) != null;
    const others = all.filter((o) => o.place !== a.place && o.place !== b.place);
    const breaker = others.flatMap((o) => [a, b].filter((t) => clashes(o.item, t.item)).map((t) => ({ place: o.place, item: o.item, target: t.item })))[0];
    const rival = others.flatMap((o) => [a, b].filter((t) => joins(o.item, t.item)).map((t) => ({ place: o.place, item: o.item, target: t.item })))[0];
    return [
      { id: "neighbours", met: neighbours(a.place, b.place) },
      { id: "season", met: monthSupports(month, phase), month },
      breaker ? { id: "unbroken", met: false, breaker } : { id: "unbroken", met: true },
      rival ? { id: "uncontested", met: false, rival } : { id: "uncontested", met: true },
    ];
  };

  const pairs = <T>(list: Placed[], f: (a: Placed, b: Placed) => T | null | undefined | false): [Placed, Placed, T][] => {
    const res: [Placed, Placed, T][] = [];
    for (let i = 0; i < list.length; i += 1) for (let j = i + 1; j < list.length; j += 1) {
      const v = f(list[i]!, list[j]!);
      if (v) res.push([list[i]!, list[j]!, v]);
    }
    return res;
  };

  // The stems: combinations, then clashes.
  for (const [a, b, phase] of pairs(stems, (a, b) => stemCombination(a.item, b.item))) {
    const conditions = pairConditions("stem", stems, a, b, phase);
    out.push({ id: idOf("stem-combination", [a.place, b.place]), kind: "stem-combination", level: "stem", places: [a.place, b.place], items: [a.item, b.item], neighbours: neighbours(a.place, b.place), phase, conditions, transforms: conditions.every((x) => x.met) });
  }
  for (const [a, b] of pairs(stems, (a, b) => stemClash(a.item, b.item))) {
    out.push({ id: idOf("stem-clash", [a.place, b.place]), kind: "stem-clash", level: "stem", places: [a.place, b.place], items: [a.item, b.item], neighbours: neighbours(a.place, b.place) });
  }

  // The branches' groups of three: seasonal trios, whole trines, half trines.
  const threeOf = (group: readonly number[]) => group.map((g) => branches.find((x) => x.item === g)).filter((x): x is Placed => x != null);
  const inOrder = (list: Placed[]) => [...list].sort((x, y) => PLACE_ORDER.indexOf(x.place) - PLACE_ORDER.indexOf(y.place));
  const groupConditions = (members: Placed[], phase: PhaseId): Condition[] => {
    const outside = branches.filter((o) => !members.some((m) => m.place === o.place));
    const breaker = outside.flatMap((o) => members.filter((m) => mod12(o.item - m.item) === 6).map((m) => ({ place: o.place, item: o.item, target: m.item })))[0];
    return [
      { id: "complete", met: true },
      { id: "season", met: monthSupports(month, phase), month },
      breaker ? { id: "unbroken", met: false, breaker } : { id: "unbroken", met: true },
    ];
  };
  for (const s of SEASONS) {
    const found = threeOf(s.branches);
    if (found.length < 3) continue;
    const members = inOrder(found);
    const conditions = groupConditions(members, s.phase);
    out.push({ id: idOf("season", members.map((m) => m.place)), kind: "season", level: "branch", places: members.map((m) => m.place), items: members.map((m) => m.item), neighbours: false, phase: s.phase, conditions, transforms: conditions.every((x) => x.met) });
  }
  for (const t of TRINES) {
    const found = threeOf(t.branches);
    if (found.length === 3) {
      const members = inOrder(found);
      const conditions = groupConditions(members, t.phase);
      out.push({ id: idOf("trine", members.map((m) => m.place)), kind: "trine", level: "branch", places: members.map((m) => m.place), items: members.map((m) => m.item), neighbours: false, phase: t.phase, conditions, transforms: conditions.every((x) => x.met) });
    } else if (found.length === 2 && found.some((f) => f.item === t.branches[1])) {
      // A half trine holds the trine's peak (Zi, Mao, Wu or You) with its birth or its storehouse.
      const members = inOrder(found);
      out.push({ id: idOf("half-trine", members.map((m) => m.place)), kind: "half-trine", level: "branch", places: members.map((m) => m.place), items: members.map((m) => m.item), neighbours: neighbours(members[0]!.place, members[1]!.place), phase: t.phase, transforms: false });
    }
  }

  // Pairs of branches: harmonies (with their conditions), clashes, harms, destructions.
  for (const [a, b, phase] of pairs(branches, (a, b) => harmonyPhase(a.item, b.item))) {
    const conditions = pairConditions("branch", branches, a, b, phase);
    out.push({ id: idOf("harmony", [a.place, b.place]), kind: "harmony", level: "branch", places: [a.place, b.place], items: [a.item, b.item], neighbours: neighbours(a.place, b.place), phase, conditions, transforms: conditions.every((x) => x.met) });
  }
  for (const kind of ["clash", "harm", "destruction"] as const) {
    for (const [a, b] of pairs(branches, (a, b) => branchRelations(a.item, b.item).includes(kind))) {
      out.push({ id: idOf(kind, [a.place, b.place]), kind, level: "branch", places: [a.place, b.place], items: [a.item, b.item], neighbours: neighbours(a.place, b.place) });
    }
  }
  // Punishments, by group: two or three of a group's branches on different pillars (the same branch twice is a self-punishment, or nothing).
  for (const g of PUNISHMENT_GROUPS) {
    const members = inOrder(branches.filter((b) => g.branches.includes(b.item)));
    if (new Set(members.map((m) => m.item)).size < 2) continue;
    out.push({ id: idOf("punishment", members.map((m) => m.place)), kind: "punishment", level: "branch", places: members.map((m) => m.place), items: members.map((m) => m.item), neighbours: members.length === 2 && neighbours(members[0]!.place, members[1]!.place), group: g.id });
  }
  for (const b of SELF_PUNISHING) {
    const members = inOrder(branches.filter((x) => x.item === b));
    if (members.length < 2) continue;
    out.push({ id: idOf("self-punishment", members.map((m) => m.place)), kind: "self-punishment", level: "branch", places: members.map((m) => m.place), items: members.map((m) => m.item), neighbours: members.length === 2 && neighbours(members[0]!.place, members[1]!.place) });
  }

  return out.sort((x, y) => INTERACTION_KINDS.indexOf(x.kind) - INTERACTION_KINDS.indexOf(y.kind) || PLACE_ORDER.indexOf(x.places[0]!) - PLACE_ORDER.indexOf(y.places[0]!));
}

