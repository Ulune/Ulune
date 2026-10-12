/*
 * BaZi's Pair (languages plan, part 19: "two BaZi charts side by side, Day
 * Master relationship, each chart's day branch (the 'partner palace') with
 * the other's, and complementary phases"). Pure: from two cast charts.
 *
 *   - The Day Masters: what each is to the other among the Ten Gods (B's
 *     Day Master to A, A's to B), how their phases meet (the same, one
 *     producing or controlling the other), and whether the two stems
 *     combine or clash.
 *   - The partner palace (夫妻宮): the day branches, A's and B's, and how
 *     they meet (the same branch, a harmony, a trine, a clash…).
 *   - Every meeting between B's pillars and A's, by the same rules as a
 *     pillar arriving in time (bazi-luck.ts's meetingsOf), two branches of
 *     one trine counting too, as between two people's animals.
 *   - The phases each brings the other: the phases one chart favours (by
 *     balance) or holds little of, that the other holds plenty of (a fifth
 *     of its points or more).
 */
import { STEMS, type PhaseId } from "./names";
import { familyOf, tenGodOf, type BaziChart, type BaziPlaceId, type GodFamily, type TenGodId } from "./bazi";
import { baziBalance, type BaziBalance } from "./bazi-balance";
import { harmonyPhase, stemClash, stemCombination } from "./bazi-interactions";
import { meetingsOf, type Meeting } from "./bazi-luck";
import { branchRelations, type RelationKind } from "./relations";

/** A phase one chart holds "plenty" of, for the other: a fifth of its points or more. */
export const PAIR_PLENTY = 0.2;
/** Under this share, a phase is one the chart holds little of (bazi-reading.ts's PHASE_LITTLE). */
const LITTLE = 0.06;

export type PairGift = { phase: PhaseId; why: "favoured" | "lacking"; share: number };

export type BaziPair = {
  dm: {
    a: number;
    b: number;
    /** B's Day Master as one of A's Ten Gods, and A's as one of B's. */
    godAB: TenGodId;
    godBA: TenGodId;
    /** How B's Day Master's phase meets A's: the same, the one A produces, controls, is controlled by, or is produced by. */
    family: GodFamily;
    combination: PhaseId | null;
    clash: boolean;
  };
  palace: { a: number; b: number; same: boolean; kinds: RelationKind[]; phase: PhaseId | null };
  /** B's pillars, each with what it meets among A's. */
  meetings: { from: BaziPlaceId; meets: Meeting[] }[];
  balance: { a: BaziBalance; b: BaziBalance };
  /** What B brings A, and what A brings B. */
  gifts: { toA: PairGift[]; toB: PairGift[] };
};

function giftsTo(to: BaziBalance, from: BaziBalance): PairGift[] {
  const out: PairGift[] = [];
  for (const phase of to.favourable.good) {
    const share = from.phases.find((p) => p.phase === phase)!.share;
    if (share >= PAIR_PLENTY) out.push({ phase, why: "favoured", share });
  }
  for (const p of to.phases) {
    if (p.share >= LITTLE || out.some((g) => g.phase === p.phase)) continue;
    const share = from.phases.find((x) => x.phase === p.phase)!.share;
    if (share >= PAIR_PLENTY) out.push({ phase: p.phase, why: "lacking", share });
  }
  return out;
}

export function baziPair(a: BaziChart, b: BaziChart): BaziPair {
  const dayA = a.pillars.find((p) => p.id === "day")!;
  const dayB = b.pillars.find((p) => p.id === "day")!;
  const placedA = a.pillars.map((p) => ({ place: p.id, stem: p.stem, branch: p.branch }));
  const balance = { a: baziBalance(a), b: baziBalance(b) };
  return {
    dm: {
      a: a.dayMaster,
      b: b.dayMaster,
      godAB: tenGodOf(a.dayMaster, b.dayMaster).id,
      godBA: tenGodOf(b.dayMaster, a.dayMaster).id,
      family: familyOf(STEMS[a.dayMaster]!.phase, STEMS[b.dayMaster]!.phase),
      combination: stemCombination(a.dayMaster, b.dayMaster),
      clash: stemClash(a.dayMaster, b.dayMaster),
    },
    palace: {
      a: dayA.branch,
      b: dayB.branch,
      same: dayA.branch === dayB.branch,
      kinds: [...(harmonyPhase(dayA.branch, dayB.branch) ? (["harmony"] as const) : []), ...branchRelations(dayA.branch, dayB.branch).filter((k) => k !== "harmony")],
      phase: harmonyPhase(dayA.branch, dayB.branch),
    },
    meetings: b.pillars.map((p) => ({ from: p.id, meets: meetingsOf(p.stem, p.branch, placedA, { pairTrines: true }) })),
    balance,
    gifts: { toA: giftsTo(balance.a, balance.b), toB: giftsTo(balance.b, balance.a) },
  };
}
