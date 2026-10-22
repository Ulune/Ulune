import type { HumanDesignChart } from "@/lib/chart/human-design";
import type { NatalChart, SignId } from "@/lib/chart/types";
import type { BaziChart, BaziPlaceId } from "@/lib/chinese/bazi";
import { PILLAR_WORD, branchCellRef, stemRef } from "@/lib/chinese/bazi-reading";
import { BRANCHES, PHASES, STEMS } from "@/lib/chinese/names";
import { cnWord } from "@/lib/chinese/words";
import type { ZodiacChart } from "@/lib/chinese/zodiac";
import { bodyLabel, signName } from "@/lib/i18n/astro";
import { languageOf, type LanguageId } from "@/studio/map";
import type { StudioPage } from "@/studio/url";
import { PLACE_WORD } from "@/studio/compare/chinese-ids";
import type { SharedItem, SharedSay } from "@/studio/compare/shared";

/*
 * Where they agree (share and compare plan, idea B7): with one person's chart
 * in two languages side by side, the few places where the two say the same
 * thing because they read the same fact. Kept small and honest: a pair of
 * languages has a list only where a real correspondence exists, and an item
 * is listed only when the two charts, worked out, do agree.
 *
 *   - Astrology and Human Design: Human Design's Personality side is the
 *     birth chart's planets, so each of its gates lies where the planet
 *     stands (the Sun and the Moon: Gate 12 in Gemini).
 *   - Astrology and the Chinese languages: the Chinese solar month turns
 *     when the Sun reaches 15° of a sign (Lichun at 15° Aquarius), so the
 *     month's animal follows the Sun's place.
 *   - Chinese astrology and BaZi: the four animals are BaZi's four branches,
 *     from the same calendar; and the year's element (a "Metal Horse") is
 *     named beside the Day Master's when they are the same phase.
 *
 * Numerology and Feng Shui have no such correspondence with the others, and
 * no list: the panel says so in one line. Each item chooses its element in
 * both panes. Pure, no browser; its own download, fetched when the two
 * languages are shown (CompareReading.tsx).
 */

/** One pane: its page, its chart and the page's data (modes/data.tsx). */
export type AgreeSide = { page: StudioPage; chart: NatalChart; data: unknown };

/** Why the two agree, in one line over the list (Compare's book). */
export type AgreeWhy = "cmpAgreeWhyHd" | "cmpAgreeWhyMonth" | "cmpAgreeWhyBranches";

export type AgreeList = { why: AgreeWhy; items: SharedItem[] };

type Pair = { astro?: AgreeSide; hd?: AgreeSide; zodiac?: AgreeSide; bazi?: AgreeSide };

const named = (x: { en: string; fr: string }, locale: string) => (locale === "fr" ? x.fr : x.en);
const SIGNS: readonly SignId[] = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const signAt = (lon: number): SignId => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)]!;

/** The animal of the Chinese solar month the Sun stands in: the Tiger's from 15° Aquarius (Lichun), each 30° on. */
export function solarMonthBranch(sunLon: number): number {
  const k = Math.floor((((sunLon - 315) % 360) + 360) % 360 / 30);
  return BRANCHES.find((b) => b.solarMonth === k)!.index;
}

/** The page a pane shows, by language, where this file has words for it (the Natal pages; astrology's three). */
function sideOf(side: AgreeSide, pair: Pair): void {
  const lang: LanguageId | undefined = languageOf(side.page);
  if (lang === "astrology") pair.astro = side;
  else if (side.page === "design") pair.hd = side;
  else if (side.page === "zodiac") pair.zodiac = side;
  else if (side.page === "bazi") pair.bazi = side;
}

function hdItems(astro: AgreeSide, hd: HumanDesignChart, locale: "en" | "fr", say: SharedSay): SharedItem[] {
  const out: SharedItem[] = [];
  for (const body of ["sun", "moon"] as const) {
    const planet = astro.chart.planets.find((p) => p.id === body);
    const act = hd.activations.find((x) => x.body === body && x.layer === "personality");
    if (!planet || !act || signAt(act.ecliptic) !== planet.sign) continue;
    out.push({
      key: `agree-hd-${body}`,
      label: say("cmpAgreeGate", { body: bodyLabel(body, locale), sign: signName(planet.sign, locale), gate: `${act.gate}.${act.line}` }),
      ids: { a: `planet:${body}`, b: `gate:${act.gate}` },
    });
  }
  return out;
}

/** The Sun's degree in its sign, as "24°". */
const degreeOf = (lon: number) => `${Math.floor((((lon % 360) + 360) % 360) % 30)}°`;

function monthItem(astro: AgreeSide, branch: number | undefined, id: string, word: string, locale: "en" | "fr", say: SharedSay): SharedItem[] {
  const sun = astro.chart.planets.find((p) => p.id === "sun");
  if (!sun || branch == null || solarMonthBranch(sun.ecliptic) !== branch) return [];
  const where = say("cmpAgreeSun", { deg: degreeOf(sun.ecliptic), sign: signName(sun.sign, locale) });
  return [{ key: "agree-month", label: `${where} · ${say("cmpKey", { label: word, value: named(BRANCHES[branch]!, locale) })}`, ids: { a: "planet:sun", b: id } }];
}

function branchItems(z: ZodiacChart, c: BaziChart, locale: "en" | "fr", say: SharedSay): SharedItem[] {
  const out: SharedItem[] = [];
  for (const place of z.places) {
    const pillar = c.pillars.find((p) => p.id === place.id);
    if (!pillar || pillar.branch !== place.branch || place.uncertain || pillar.uncertain) continue;
    const what = say("cmpKey", { label: cnWord(locale, PLACE_WORD[place.id]), value: named(BRANCHES[place.branch]!, locale) });
    out.push({ key: `agree-${place.id}`, label: say("cmpInBoth", { what }), ids: { a: `zk:${place.id}`, b: branchCellRef(place.id as BaziPlaceId) } });
  }
  // The year's element (the "Metal" of a Metal Horse) and the Day Master's, when they are one phase.
  const year = z.places.find((p) => p.id === "year");
  const dm = STEMS[c.dayMaster];
  if (year && dm && year.stemPhase === dm.phase) {
    out.push({
      key: "agree-element",
      label: say("cmpAgreeElement", { phase: named(PHASES.find((p) => p.id === dm.phase)!, locale) }),
      ids: { a: "zk:year", b: stemRef("day") },
    });
  }
  return out;
}

/** The ids of an item as each pane names them (the list above is worked out as astrology, Human Design, Chinese astrology, BaZi). */
function facing(items: SharedItem[], flip: boolean): SharedItem[] {
  return flip ? items.map((it) => ({ ...it, ids: { a: it.ids.b, b: it.ids.a } })) : items;
}

/**
 * Where A's and B's pages agree: null for a pair of languages (or pages)
 * without a list, else the line saying why and the items that hold for this
 * chart (none, when nothing does).
 */
export function agreeItems(a: AgreeSide, b: AgreeSide, locale: "en" | "fr", say: SharedSay): AgreeList | null {
  const pair: Pair = {};
  sideOf(a, pair);
  sideOf(b, pair);
  const of = <T>(side: AgreeSide | undefined, key: string) => (side?.data as Record<string, T | null | undefined> | undefined)?.[key] ?? null;
  // Which side came first in the list's own order: the ids are flipped to the panes' when B holds it.
  const first = (side: AgreeSide | undefined) => side === b;
  if (pair.astro && pair.hd) {
    const hd = of<HumanDesignChart>(pair.hd, "hd");
    return { why: "cmpAgreeWhyHd", items: hd ? facing(hdItems(pair.astro, hd, locale, say), first(pair.astro)) : [] };
  }
  if (pair.astro && pair.zodiac) {
    const z = of<ZodiacChart>(pair.zodiac, "zodiac");
    const month = z?.places.find((p) => p.id === "month");
    return { why: "cmpAgreeWhyMonth", items: facing(monthItem(pair.astro, month?.branch, "zk:month", cnWord(locale, PLACE_WORD.month), locale, say), first(pair.astro)) };
  }
  if (pair.astro && pair.bazi) {
    const c = of<BaziChart>(pair.bazi, "bazi");
    const month = c?.pillars.find((p) => p.id === "month");
    return { why: "cmpAgreeWhyMonth", items: facing(monthItem(pair.astro, month?.branch, branchCellRef("month"), cnWord(locale, PILLAR_WORD.month), locale, say), first(pair.astro)) };
  }
  if (pair.zodiac && pair.bazi) {
    const z = of<ZodiacChart>(pair.zodiac, "zodiac");
    const c = of<BaziChart>(pair.bazi, "bazi");
    return { why: "cmpAgreeWhyBranches", items: z && c ? facing(branchItems(z, c, locale, say), first(pair.zodiac)) : [] };
  }
  return null;
}
