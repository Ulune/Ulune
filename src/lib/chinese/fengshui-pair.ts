/*
 * Feng Shui's Relationship lens, the pure part (the languages plan's "Two
 * people in one home: in Pair, both Kua numbers on one compass, the
 * directions they share and the ones they don't"; review items FS5 and
 * FS32; the reorganisation plan's Feng Shui › Pair, "Two people's directions
 * on one compass"): two people's Eight Mansions direction by direction, each
 * direction supportive for both, challenging for both or mixed (supportive
 * for one, challenging for the other), and the directions the practical
 * lines for two suggest: a desk both use, a bed both share, each one's side
 * for a room or a corner of their own.
 *
 *   - Two Kua of one group share their four supportive directions, and so
 *     their four challenging ones; of two groups, every direction is one's
 *     supportive and the other's challenging (fengshui.ts: each Kua's four
 *     supportive directions are its group's).
 *   - "Most supportive for both" weighs a direction by the lower-placed of
 *     the two mansions (MANSION_IDS's order, Sheng Qi first), then by both
 *     together, then clockwise from the north: no person comes first.
 *   - Of two groups, the gentlest middle is where the one it challenges
 *     finds Huo Hai, the mildest of the four; there are always two, one
 *     supportive for each person.
 *   - A bed: the Kua page suggests the head towards Tian Yi or Yan Nian; for
 *     two, the direction nearest that for both, by the same weighing. Of two
 *     groups, when two middles suit a bed equally, the bed takes the one the
 *     desk does not lean towards, so neither person has both.
 *
 * Pure; tested in scripts/chinese-fengshui-pair.test.mjs. Nothing is sent.
 */
import { DIRECTION_IDS, type DirectionId, type FengShui, type MansionId } from "./fengshui";

export type PairPerson = "a" | "b";
/** Supportive for both, challenging for both, or supportive for one of them. */
export type PairKind = "both-good" | "both-hard" | "mixed";

/** One person's mansion in a direction: its name, its place from Sheng Qi (0) to Jue Ming (7), its kind. */
export type PairSide = { mansion: MansionId; rank: number; supportive: boolean };

export type PairDirection = {
  direction: DirectionId;
  a: PairSide;
  b: PairSide;
  kind: PairKind;
  /** For a mixed direction, the person it supports; null otherwise. */
  good: PairPerson | null;
};

export type FengShuiPair = {
  a: FengShui;
  b: FengShui;
  /** Both of the East group, or both of the West. */
  sameGroup: boolean;
  /** The same Kua: the same mansion in every direction. */
  sameKua: boolean;
  /** The eight directions, clockwise from the north. */
  directions: PairDirection[];
  /** Supportive for both, the most supportive for both first. */
  shared: DirectionId[];
  /** Challenging for both, the mildest first. */
  hard: DirectionId[];
  /** Supportive for one of them, the gentlest middle first. */
  mixed: DirectionId[];
  /** A desk both use: the shared direction most supportive for both, else the gentlest middle. */
  desk: DirectionId;
  /** A bed both share: towards Tian Yi or Yan Nian for both where it can, else the nearest to it. */
  bed: DirectionId;
  /** Each one's four supportive directions, clockwise, for a room or a corner of their own. */
  sides: Record<PairPerson, DirectionId[]>;
};

const sideOf = (fs: FengShui, d: DirectionId): PairSide => {
  const row = fs.directions.find((x) => x.direction === d)!;
  return { mansion: row.mansion, rank: row.rank, supportive: row.supportive };
};

/** A bed's weight for one person: Tian Yi or Yan Nian first (the Kua page's bed), then Fu Wei, Sheng Qi, then the challenging four by their rank. */
const BED_RANK: Readonly<Record<MansionId, number>> = {
  "tian-yi": 0,
  "yan-nian": 0,
  "fu-wei": 1,
  "sheng-qi": 2,
  "huo-hai": 4,
  "wu-gui": 5,
  "liu-sha": 6,
  "jue-ming": 7,
};

/** A direction's weight for two: the lower-placed of the two, then both together, then their ranks together. */
const weightOf = (x: PairDirection, weight: (s: PairSide) => number): number[] => [Math.max(weight(x.a), weight(x.b)), weight(x.a) + weight(x.b), x.a.rank + x.b.rank];
const same = (x: readonly number[], y: readonly number[]) => x.every((v, i) => v === y[i]);

/** Directions in order of a weight for each person (weightOf), clockwise from the north between equals. */
function byBoth(list: readonly PairDirection[], weight: (s: PairSide) => number): PairDirection[] {
  return [...list].sort((x, y) => {
    const kx = [...weightOf(x, weight), DIRECTION_IDS.indexOf(x.direction)];
    const ky = [...weightOf(y, weight), DIRECTION_IDS.indexOf(y.direction)];
    for (let i = 0; i < kx.length; i += 1) if (kx[i] !== ky[i]) return kx[i]! - ky[i]!;
    return 0;
  });
}

const rankOf = (s: PairSide) => s.rank;
const bedOf = (s: PairSide) => BED_RANK[s.mansion];
const ids = (list: readonly PairDirection[]) => list.map((x) => x.direction);

/** Two people's directions on one compass: A the chart shown, B the second person. */
export function fengShuiPair(a: FengShui, b: FengShui): FengShuiPair {
  const directions: PairDirection[] = DIRECTION_IDS.map((d) => {
    const sa = sideOf(a, d);
    const sb = sideOf(b, d);
    const kind: PairKind = sa.supportive && sb.supportive ? "both-good" : !sa.supportive && !sb.supportive ? "both-hard" : "mixed";
    return { direction: d, a: sa, b: sb, kind, good: kind === "mixed" ? (sa.supportive ? "a" : "b") : null };
  });
  const of = (kind: PairKind) => directions.filter((x) => x.kind === kind);
  const shared = byBoth(of("both-good"), rankOf);
  const mixed = byBoth(of("mixed"), rankOf);
  const desk = shared[0] ?? mixed[0]!;
  const beds = byBoth(shared.length ? shared : mixed, bedOf);
  // Of two groups, the gentlest middles come in twos, one supportive for each: when two suit a bed
  // equally, the bed takes the one the desk does not lean towards, so neither person has both.
  const fair = !shared.length && beds[1] && same(weightOf(beds[0]!, bedOf), weightOf(beds[1], bedOf)) && beds[0]!.good === desk.good && beds[1].good !== desk.good;
  return {
    a,
    b,
    sameGroup: a.group === b.group,
    sameKua: a.kua === b.kua,
    directions,
    shared: ids(shared),
    hard: ids(byBoth(of("both-hard"), rankOf)),
    mixed: ids(mixed),
    desk: desk.direction,
    bed: (fair ? beds[1]! : beds[0]!).direction,
    sides: {
      a: directions.filter((x) => x.a.supportive).map((x) => x.direction),
      b: directions.filter((x) => x.b.supportive).map((x) => x.direction),
    },
  };
}

/** One direction of the pair. */
export const pairDirection = (p: FengShuiPair, d: DirectionId): PairDirection => p.directions.find((x) => x.direction === d)!;
