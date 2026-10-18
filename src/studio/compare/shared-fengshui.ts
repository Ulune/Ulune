import { cnWord } from "@/lib/chinese/words";
import { fscWord } from "@/lib/chinese/fsc-words";
import { MANSIONS, directionById, type DirectionId, type FengShui } from "@/lib/chinese/fengshui";
import type { PersonYear } from "@/lib/chinese/fengshui-cycles";
import type { StudioPage } from "@/studio/url";
import type { SharedItem, SharedSay, SharedSide } from "@/studio/compare/shared";
import { cyclesDirRef, dirRef, kuaRef } from "@/studio/compare/chinese-ids";

/*
 * What two people share in Feng Shui (idea B9; shared.ts): the same Kua, or
 * else its group, and the same best direction (Sheng Qi), each named in each
 * person's own count. On the Cycles page (feature 5d), the year both are
 * shown: the same direction to face for new starts, and the supportive
 * directions both are asked to rest.
 */

const named = (x: { en: string; fr: string }, locale: string) => (locale === "fr" ? x.fr : x.en);
const dataOf = <T>(side: SharedSide) => side.data as T | undefined;

function fengShuiItems(a: SharedSide, b: SharedSide, locale: string, say: SharedSay): SharedItem[] {
  const fa = dataOf<{ list: FengShui[] }>(a)?.list?.[0];
  const fb = dataOf<{ list: FengShui[] }>(b)?.list?.[0];
  if (!fa || !fb) return [];
  const out: SharedItem[] = [];
  const kua = { a: kuaRef(fa.count), b: kuaRef(fb.count) };
  if (fa.kua === fb.kua) out.push({ key: "fs-kua", label: `Kua ${fa.kua}`, ids: kua });
  else if (fa.group === fb.group) out.push({ key: "fs-group", label: cnWord(locale, fa.group === "east" ? "fsGroupEast" : "fsGroupWest"), ids: kua });
  const best = fa.of["sheng-qi"];
  if (best === fb.of["sheng-qi"]) {
    out.push({ key: "fs-best", label: say("cmpKey", { label: named(MANSIONS["sheng-qi"], locale), value: named(directionById(best), locale) }), ids: { a: dirRef(fa.count, best), b: dirRef(fb.count, best) } });
  }
  return out;
}

function cyclesItems(a: SharedSide, b: SharedSide, locale: string, say: SharedSay): SharedItem[] {
  const pa = dataOf<{ ctx: { people: readonly PersonYear[] } | null }>(a)?.ctx?.people[0];
  const pb = dataOf<{ ctx: { people: readonly PersonYear[] } | null }>(b)?.ctx?.people[0];
  if (!pa || !pb) return [];
  const ids = (d: DirectionId) => ({ a: cyclesDirRef(pa.fs.count, d), b: cyclesDirRef(pb.fs.count, d) });
  const out: SharedItem[] = [];
  if (pa.best && pa.best === pb.best) out.push({ key: "fsc-best", label: say("cmpKey", { label: fscWord(locale, "fscShareBest"), value: named(directionById(pa.best), locale) }), ids: ids(pa.best) });
  for (const d of pa.resting.filter((x) => pb.resting.includes(x))) {
    out.push({ key: `fsc-rest-${d}`, label: say("cmpKey", { label: fscWord(locale, "fscStepRest"), value: named(directionById(d), locale) }), ids: ids(d) });
  }
  return out;
}

export function sharedItems(page: StudioPage, a: SharedSide, b: SharedSide, locale: "en" | "fr", say: SharedSay): SharedItem[] {
  return page === "fengshui" ? fengShuiItems(a, b, locale, say) : page === "fengshui-cycles" ? cyclesItems(a, b, locale, say) : [];
}
