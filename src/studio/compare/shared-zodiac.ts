import { BRANCHES } from "@/lib/chinese/names";
import { cnWord } from "@/lib/chinese/words";
import type { ZodiacChart } from "@/lib/chinese/zodiac";
import type { StudioPage } from "@/studio/url";
import { both, type SharedItem, type SharedSay, type SharedSide } from "@/studio/compare/shared";
import { PLACE_WORD } from "@/studio/compare/chinese-ids";

/*
 * What two people share in Chinese astrology (idea B9; shared.ts): the
 * animals, place by place (on the year ahead, the year's), then the same
 * animal at other places of the two charts, chosen where each has it.
 */

const named = (x: { en: string; fr: string }, locale: string) => (locale === "fr" ? x.fr : x.en);
const dataOf = <T>(side: SharedSide) => side.data as T | undefined;

function zodiacItems(page: StudioPage, a: SharedSide, b: SharedSide, locale: string, say: SharedSay): SharedItem[] {
  const za = dataOf<{ zodiac: ZodiacChart | null }>(a)?.zodiac;
  const zb = dataOf<{ zodiac: ZodiacChart | null }>(b)?.zodiac;
  if (!za || !zb) return [];
  const out: SharedItem[] = [];
  for (const p of za.places) {
    const q = zb.places.find((x) => x.id === p.id);
    if (!q || q.branch !== p.branch) continue;
    const label = say("cmpKey", { label: cnWord(locale, PLACE_WORD[p.id]), value: named(BRANCHES[p.branch]!, locale) });
    // The year ahead reads each person's year animal against the year: the same animal, the same reading's ground.
    if (page === "zodiac-years") {
      if (p.id === "year") out.push(both("zk-year", label, "zky:year"));
      continue;
    }
    out.push(both(`zk-${p.id}`, label, `zk:${p.id}`));
  }
  if (page !== "zodiac") return out;
  // The same animal in other places of the two charts (A's hour, B's day): once each animal.
  const matched = new Set(za.places.filter((p) => zb.places.find((q) => q.id === p.id)?.branch === p.branch).map((p) => p.branch));
  const seen = new Set<number>();
  for (const p of za.places) {
    if (matched.has(p.branch) || seen.has(p.branch)) continue;
    const q = zb.places.find((x) => x.branch === p.branch);
    if (!q) continue;
    seen.add(p.branch);
    out.push({ key: `zk-animal-${p.branch}`, label: say("cmpBothAnimal", { animal: named(BRANCHES[p.branch]!, locale) }), ids: { a: `zk:${p.id}`, b: `zk:${q.id}` } });
  }
  return out;
}

export function sharedItems(page: StudioPage, a: SharedSide, b: SharedSide, locale: "en" | "fr", say: SharedSay): SharedItem[] {
  return zodiacItems(page, a, b, locale, say);
}
