import { BRANCHES, PHASES, SIXTY, STEMS } from "@/lib/chinese/names";
import { cnWord } from "@/lib/chinese/words";
import { DAY_MASTER_NAME, tenGodById, type BaziChart, type BaziPillar } from "@/lib/chinese/bazi";
import type { BaziBalance } from "@/lib/chinese/bazi-balance";
import { PILLAR_WORD, STRENGTH_REF, branchCellRef, phaseRef, stemRef, strengthWord } from "@/lib/chinese/bazi-reading";
import { luckAt, type Luck } from "@/lib/chinese/bazi-luck";
import { luckRef } from "@/lib/chinese/bazi-luck-reading";
import type { StudioPage } from "@/studio/url";
import { both, type SharedItem, type SharedSay, type SharedSide } from "@/studio/compare/shared";

/*
 * What two people share in BaZi (idea B9; shared.ts): the Day Master (or its
 * phase), the pillars or branches that are the same, the strongest phase and
 * the strength; on its Cycles page, the luck pillar each is in now, when they
 * are the same (each in its own count). BaZi's own helpers, all of the file
 * the BaZi pages share (bazi-luck-reading.ts, bazi-luck.ts and what they
 * bring): taking the whole of it, Compare leaves it as it is (chinese-ids.ts
 * says why); the merged pillars table takes its words from here too.
 */

const named = (x: { en: string; fr: string }, locale: string) => (locale === "fr" ? x.fr : x.en);
const dataOf = <T>(side: SharedSide) => side.data as T | undefined;

/** A pillar's stem god, or the Day Master on the day's own stem (bazi-table.ts, stemGodName). */
export const pillarGod = (p: BaziPillar) => (p.god ? tenGodById(p.god) : DAY_MASTER_NAME);

function baziItems(a: SharedSide, b: SharedSide, locale: string, say: SharedSay): SharedItem[] {
  const da = dataOf<{ bazi: BaziChart | null; balance: BaziBalance | null }>(a);
  const db = dataOf<{ bazi: BaziChart | null; balance: BaziBalance | null }>(b);
  const ca = da?.bazi;
  const cb = db?.bazi;
  if (!ca || !cb) return [];
  const out: SharedItem[] = [];
  const dm = named(DAY_MASTER_NAME, locale);
  const stemA = STEMS[ca.dayMaster]!;
  const stemB = STEMS[cb.dayMaster]!;
  if (stemA.index === stemB.index) out.push(both("bz-dm", say("cmpKey", { label: dm, value: named(stemA, locale) }), stemRef("day")));
  else if (stemA.phase === stemB.phase) {
    out.push(both("bz-dm-phase", say("cmpKey", { label: dm, value: named(PHASES.find((p) => p.id === stemA.phase)!, locale) }), stemRef("day")));
  }
  for (const p of ca.pillars) {
    if (p.id === "day") continue;
    const q = cb.pillars.find((x) => x.id === p.id);
    if (!q) continue;
    const word = cnWord(locale, PILLAR_WORD[p.id]);
    if (q.pillar.cycle === p.pillar.cycle) out.push(both(`bz-${p.id}`, say("cmpKey", { label: word, value: named(SIXTY[p.pillar.cycle]!, locale) }), stemRef(p.id)));
    else if (q.branch === p.branch) out.push(both(`bz-${p.id}-branch`, say("cmpKey", { label: word, value: named(BRANCHES[p.branch]!, locale) }), branchCellRef(p.id)));
  }
  const ba = da?.balance;
  const bb = db?.balance;
  if (ba && bb) {
    // The strongest phase, when one stands above the others (a tie names none).
    const top = (x: BaziBalance) => {
      const [first, second] = [...x.phases].sort((m, n) => n.points - m.points);
      return first && (!second || first.points > second.points) ? first.phase : undefined;
    };
    const ta = top(ba);
    if (ta && ta === top(bb)) out.push(both("bz-top", say("cmpKey", { label: say("cmpStrongest"), value: named(PHASES.find((p) => p.id === ta)!, locale) }), phaseRef(ta)));
    if (ba.strength === bb.strength) out.push(both("bz-strength", say("cmpKey", { label: cnWord(locale, "bzStrength"), value: strengthWord(ba, locale) }), STRENGTH_REF));
  }
  return out;
}

function luckItems(a: SharedSide, b: SharedSide, locale: string, say: SharedSay): SharedItem[] {
  const la = dataOf<{ lucks: Luck[] }>(a)?.lucks?.[0];
  const lb = dataOf<{ lucks: Luck[] }>(b)?.lucks?.[0];
  if (!la || !lb) return [];
  const now = Date.now();
  const pa = luckAt(la, now);
  const pb = luckAt(lb, now);
  if (!pa || !pb) return [];
  const ids = { a: luckRef(la.count, pa.index), b: luckRef(lb.count, pb.index) };
  const word = cnWord(locale, "bzlInLuck");
  if (pa.pillar.cycle === pb.pillar.cycle) return [{ key: "bzl-now", label: say("cmpKey", { label: word, value: named(SIXTY[pa.pillar.cycle]!, locale) }), ids }];
  const phase = STEMS[pa.stem]!.phase;
  if (phase === STEMS[pb.stem]!.phase) return [{ key: "bzl-now", label: say("cmpKey", { label: word, value: named(PHASES.find((p) => p.id === phase)!, locale) }), ids }];
  return [];
}

export function sharedItems(page: StudioPage, a: SharedSide, b: SharedSide, locale: "en" | "fr", say: SharedSay): SharedItem[] {
  if (page === "bazi") return baziItems(a, b, locale, say);
  if (page === "bazi-luck") return luckItems(a, b, locale, say);
  return [];
}
