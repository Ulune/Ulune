/*
 * The relations between Earthly Branches (languages plan, part 8: "six
 * harmonies, the four trines of three, clashes, harms, punishments and
 * destructions"), the classical set every Chinese language reads: the
 * zodiac between a person's animals and between two people's, BaZi between
 * the pillars, the almanac's clash days. Each is a rule on the branches'
 * places (0 = Zi, the Rat … 11 = Hai, the Pig), so they are computed, not
 * listed, and tested against the classical tables
 * (scripts/chinese-relations.test.mjs). Pure data and arithmetic.
 *
 * Whether a combination "transforms" into a phase is BaZi's question
 * (languages plan, part 14); here a relation is only named.
 */
import type { ChineseName, PhaseId } from "./names";

export type RelationKind = "harmony" | "trine" | "clash" | "harm" | "punishment" | "destruction" | "self-punishment";

/** In the order they are read: the meetings first, then the tensions. */
export const RELATION_KINDS: readonly RelationKind[] = ["harmony", "trine", "clash", "harm", "punishment", "destruction", "self-punishment"];

/** Each relation's name in the tradition (Traditional and Simplified characters, pinyin), with Ulune's English and French. */
export const RELATION_NAMES: Record<RelationKind, ChineseName> = {
  harmony: { hant: "六合", hans: "六合", pinyin: "liùhé", en: "Harmony", fr: "Harmonie" },
  trine: { hant: "三合", hans: "三合", pinyin: "sānhé", en: "Trine", fr: "Trigone" },
  clash: { hant: "沖", hans: "冲", pinyin: "chōng", en: "Clash", fr: "Choc" },
  harm: { hant: "害", hans: "害", pinyin: "hài", en: "Harm", fr: "Nuisance" },
  punishment: { hant: "刑", hans: "刑", pinyin: "xíng", en: "Punishment", fr: "Punition" },
  destruction: { hant: "破", hans: "破", pinyin: "pò", en: "Destruction", fr: "Destruction" },
  "self-punishment": { hant: "自刑", hans: "自刑", pinyin: "zìxíng", en: "Self-punishment", fr: "Autopunition" },
};

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The four trines (三合): the branches four apart, each with its phase: Shen-Zi-Chen Water, Hai-Mao-Wei Wood, Yin-Wu-Xu Fire, Si-You-Chou Metal. */
export const TRINES: readonly { branches: readonly [number, number, number]; phase: PhaseId }[] = [
  { branches: [8, 0, 4], phase: "water" },
  { branches: [11, 3, 7], phase: "wood" },
  { branches: [2, 6, 10], phase: "fire" },
  { branches: [5, 9, 1], phase: "metal" },
];

/** The trine a branch belongs to. */
export const trineOf = (branch: number) => TRINES.find((t) => t.branches.includes(mod12(branch)))!;

/**
 * The three punishments (三刑) and the self-punishment (自刑):
 * Yin, Si and Shen (the "ungrateful" punishment), Chou, Xu and Wei (the
 * punishment "of power"), Zi and Mao (the "uncivil" one); Chen, Wu, You and
 * Hai each punish themselves.
 */
export const PUNISHMENT_GROUPS: readonly { id: "ungrateful" | "power" | "uncivil"; branches: readonly number[] }[] = [
  { id: "ungrateful", branches: [2, 5, 8] },
  { id: "power", branches: [1, 10, 7] },
  { id: "uncivil", branches: [0, 3] },
];
export const SELF_PUNISHING: readonly number[] = [4, 6, 9, 11];

/** The relations between two branches, in RELATION_KINDS's order (two branches can hold more than one: Si and Shen are a harmony, a punishment and a destruction). */
export function branchRelations(a: number, b: number): RelationKind[] {
  const x = mod12(a);
  const y = mod12(b);
  const out: RelationKind[] = [];
  if (x === y) {
    if (SELF_PUNISHING.includes(x)) out.push("self-punishment");
    return out;
  }
  // Six harmonies (六合): Zi-Chou, Yin-Hai, Mao-Xu, Chen-You, Si-Shen, Wu-Wei, the pairs whose places add to 1 (13).
  if ((x + y) % 12 === 1) out.push("harmony");
  // Trines: four places apart.
  if ((x - y) % 4 === 0) out.push("trine");
  // Clashes (沖): opposite, six apart.
  if (mod12(x - y) === 6) out.push("clash");
  // Harms (害): Zi-Wei, Chou-Wu, Yin-Si, Mao-Chen, Shen-Hai, You-Xu, the pairs whose places add to 7 (19).
  if ((x + y) % 12 === 7) out.push("harm");
  // Punishments (刑): two of the same group.
  if (PUNISHMENT_GROUPS.some((g) => g.branches.includes(x) && g.branches.includes(y))) out.push("punishment");
  // Destructions (破): a yang branch and the one three before it: Zi-You, Yin-Hai, Chen-Chou, Wu-Mao, Shen-Si, Xu-Wei.
  const yang = x % 2 === 0 ? x : y;
  const other = yang === x ? y : x;
  if (mod12(yang - 3) === other) out.push("destruction");
  return out;
}

/** Whether a relation brings together (harmony, trine) or rubs (the rest). */
export const relationTone = (kind: RelationKind): "meet" | "tension" => (kind === "harmony" || kind === "trine" ? "meet" : "tension");

export type PlacedRelation<P extends string> = {
  kind: RelationKind;
  /** The two places it joins (the same place twice never: two places with one animal, for a self-punishment). */
  places: [P, P];
  branches: [number, number];
};

/** Every relation between a set of placed branches (a person's four animals), pair by pair, in RELATION_KINDS's order then the places' order. */
export function placedRelations<P extends string>(placed: readonly { id: P; branch: number }[]): PlacedRelation<P>[] {
  const out: PlacedRelation<P>[] = [];
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i]!;
      const b = placed[j]!;
      for (const kind of branchRelations(a.branch, b.branch)) out.push({ kind, places: [a.id, b.id], branches: [a.branch, b.branch] });
    }
  }
  return out.sort((x, y) => RELATION_KINDS.indexOf(x.kind) - RELATION_KINDS.indexOf(y.kind));
}

/** A whole trine among placed branches: three places holding its three different animals. */
export function fullTrines<P extends string>(placed: readonly { id: P; branch: number }[]): { phase: PhaseId; places: P[] }[] {
  return TRINES.flatMap((t) => {
    const places = t.branches.map((b) => placed.find((p) => p.branch === b)?.id).filter((p): p is P => p != null);
    return places.length === 3 ? [{ phase: t.phase, places }] : [];
  });
}
