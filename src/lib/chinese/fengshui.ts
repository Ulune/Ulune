/*
 * Feng Shui, the personal half (languages plan, language 3, part 21: "Kua,
 * Eight Mansions and the compass rose"): the Kua number (命卦 mìngguà) from
 * the solar year of birth and the tradition's yin or yang count, its
 * trigram and its group (East or West), and the eight directions of the
 * Eight Mansions school (八宅 bāzhái) for that Kua: four supportive (Sheng
 * Qi, Tian Yi, Yan Nian, Fu Wei), four challenging (Huo Hai, Wu Gui, Liu Sha,
 * Jue Ming).
 *
 *   - The solar year turns at Lichun, as BaZi's and the zodiac's.
 *   - The Kua: the year's digits added up and reduced to one (the same as
 *     the year's remainder by 9); for a yang count 11 minus it, for a yin
 *     count 4 plus it, reduced again (0 counts as 9). A Kua of 5 has no
 *     trigram: the yang count takes 2 (Kun), the yin count 8 (Gen), as most
 *     schools do.
 *   - The eight mansions of each Kua: the classical table, tested for its
 *     symmetry (the bond between two trigrams is the same both ways) and
 *     for each Kua's four supportive directions being its own group's.
 *
 * Pure: tested in scripts/chinese-fengshui.test.mjs. Nothing is sent.
 */
import type { ChineseName, PhaseId } from "./names";
import { birthMomentOf, type ZodiacBirth } from "./zodiac";
import { solarYearOf } from "./pillars";
import { termMs, LICHUN } from "./terms";

export type FsCount = "yang" | "yin";
export type DirectionId = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
/** Clockwise from the north. */
export const DIRECTION_IDS: readonly DirectionId[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

export type Direction = ChineseName & { id: DirectionId; short: { en: string; fr: string }; degrees: number };

/** The eight directions, each the 45° around its compass bearing. */
export const DIRECTIONS: readonly Direction[] = [
  { id: "n", degrees: 0, hant: "北", hans: "北", pinyin: "běi", en: "North", fr: "Nord", short: { en: "N", fr: "N" } },
  { id: "ne", degrees: 45, hant: "東北", hans: "东北", pinyin: "dōngběi", en: "North-East", fr: "Nord-Est", short: { en: "NE", fr: "NE" } },
  { id: "e", degrees: 90, hant: "東", hans: "东", pinyin: "dōng", en: "East", fr: "Est", short: { en: "E", fr: "E" } },
  { id: "se", degrees: 135, hant: "東南", hans: "东南", pinyin: "dōngnán", en: "South-East", fr: "Sud-Est", short: { en: "SE", fr: "SE" } },
  { id: "s", degrees: 180, hant: "南", hans: "南", pinyin: "nán", en: "South", fr: "Sud", short: { en: "S", fr: "S" } },
  { id: "sw", degrees: 225, hant: "西南", hans: "西南", pinyin: "xīnán", en: "South-West", fr: "Sud-Ouest", short: { en: "SW", fr: "SO" } },
  { id: "w", degrees: 270, hant: "西", hans: "西", pinyin: "xī", en: "West", fr: "Ouest", short: { en: "W", fr: "O" } },
  { id: "nw", degrees: 315, hant: "西北", hans: "西北", pinyin: "xīběi", en: "North-West", fr: "Nord-Ouest", short: { en: "NW", fr: "NO" } },
];
export const directionById = (id: DirectionId): Direction => DIRECTIONS.find((d) => d.id === id)!;

export type Kua = 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9;
export type TrigramId = "kan" | "kun" | "zhen" | "xun" | "qian" | "dui" | "gen" | "li";

/** A trigram's three lines from the bottom up, as the tradition counts them: true for a whole (yang) line, false for a broken (yin) one. */
export type TrigramLines = readonly [boolean, boolean, boolean];

export type Trigram = ChineseName & { id: TrigramId; kua: Kua; symbol: string; lines: TrigramLines; image: { en: string; fr: string }; phase: PhaseId; direction: DirectionId; group: "east" | "west" };

/**
 * The eight trigrams in the Later Heaven order (後天八卦), each with its Kua, its direction and its group.
 * `lines` draws it (components/trigram-mark.tsx, review fix FS7): the symbol stays for text and screen readers.
 */
export const TRIGRAMS: readonly Trigram[] = [
  { id: "kan", kua: 1, symbol: "☵", lines: [false, true, false], hant: "坎", hans: "坎", pinyin: "kǎn", en: "Kan", fr: "Kan", image: { en: "Water", fr: "l’Eau" }, phase: "water", direction: "n", group: "east" },
  { id: "kun", kua: 2, symbol: "☷", lines: [false, false, false], hant: "坤", hans: "坤", pinyin: "kūn", en: "Kun", fr: "Kun", image: { en: "Earth", fr: "la Terre" }, phase: "earth", direction: "sw", group: "west" },
  { id: "zhen", kua: 3, symbol: "☳", lines: [true, false, false], hant: "震", hans: "震", pinyin: "zhèn", en: "Zhen", fr: "Zhen", image: { en: "Thunder", fr: "le Tonnerre" }, phase: "wood", direction: "e", group: "east" },
  { id: "xun", kua: 4, symbol: "☴", lines: [false, true, true], hant: "巽", hans: "巽", pinyin: "xùn", en: "Xun", fr: "Xun", image: { en: "Wind", fr: "le Vent" }, phase: "wood", direction: "se", group: "east" },
  { id: "qian", kua: 6, symbol: "☰", lines: [true, true, true], hant: "乾", hans: "乾", pinyin: "qián", en: "Qian", fr: "Qian", image: { en: "Heaven", fr: "le Ciel" }, phase: "metal", direction: "nw", group: "west" },
  { id: "dui", kua: 7, symbol: "☱", lines: [true, true, false], hant: "兌", hans: "兑", pinyin: "duì", en: "Dui", fr: "Dui", image: { en: "Lake", fr: "le Lac" }, phase: "metal", direction: "w", group: "west" },
  { id: "gen", kua: 8, symbol: "☶", lines: [false, false, true], hant: "艮", hans: "艮", pinyin: "gèn", en: "Gen", fr: "Gen", image: { en: "Mountain", fr: "la Montagne" }, phase: "earth", direction: "ne", group: "west" },
  { id: "li", kua: 9, symbol: "☲", lines: [true, false, true], hant: "離", hans: "离", pinyin: "lí", en: "Li", fr: "Li", image: { en: "Fire", fr: "le Feu" }, phase: "fire", direction: "s", group: "east" },
];
export const trigramOfKua = (kua: Kua): Trigram => TRIGRAMS.find((t) => t.kua === kua)!;
export const trigramOfDirection = (d: DirectionId): Trigram => TRIGRAMS.find((t) => t.direction === d)!;

export type MansionId = "sheng-qi" | "tian-yi" | "yan-nian" | "fu-wei" | "huo-hai" | "wu-gui" | "liu-sha" | "jue-ming";
/** From the most supportive to the most challenging. */
export const MANSION_IDS: readonly MansionId[] = ["sheng-qi", "tian-yi", "yan-nian", "fu-wei", "huo-hai", "wu-gui", "liu-sha", "jue-ming"];

/**
 * The eight mansions (八宅) by their classical names, with Ulune's English and
 * French: what each is for, never what it threatens. Tian Yi's classical name
 * ("the heavenly doctor") is kept in the readings, never as a promise of health.
 */
export const MANSIONS: Readonly<Record<MansionId, ChineseName & { supportive: boolean }>> = {
  "sheng-qi": { supportive: true, hant: "生氣", hans: "生气", pinyin: "shēngqì", en: "Growth", fr: "Croissance" },
  "tian-yi": { supportive: true, hant: "天醫", hans: "天医", pinyin: "tiānyī", en: "Restoration", fr: "Ressourcement" },
  "yan-nian": { supportive: true, hant: "延年", hans: "延年", pinyin: "yánnián", en: "Harmony", fr: "Harmonie" },
  "fu-wei": { supportive: true, hant: "伏位", hans: "伏位", pinyin: "fúwèi", en: "Stability", fr: "Stabilité" },
  "huo-hai": { supportive: false, hant: "禍害", hans: "祸害", pinyin: "huòhài", en: "Friction", fr: "Friction" },
  "wu-gui": { supportive: false, hant: "五鬼", hans: "五鬼", pinyin: "wǔguǐ", en: "Restlessness", fr: "Agitation" },
  "liu-sha": { supportive: false, hant: "六煞", hans: "六煞", pinyin: "liùshà", en: "Entanglement", fr: "Enchevêtrement" },
  "jue-ming": { supportive: false, hant: "絕命", hans: "绝命", pinyin: "juémìng", en: "Depletion", fr: "Épuisement" },
};

/** Each Kua's directions, in MANSION_IDS's order (Sheng Qi first, Jue Ming last). */
export const EIGHT_MANSIONS: Readonly<Record<Kua, readonly DirectionId[]>> = {
  1: ["se", "e", "s", "n", "w", "ne", "nw", "sw"],
  2: ["ne", "w", "nw", "sw", "e", "se", "s", "n"],
  3: ["s", "n", "se", "e", "sw", "nw", "ne", "w"],
  4: ["n", "s", "e", "se", "nw", "sw", "w", "ne"],
  6: ["w", "ne", "sw", "nw", "se", "e", "n", "s"],
  7: ["nw", "sw", "ne", "w", "n", "s", "se", "e"],
  8: ["sw", "nw", "w", "ne", "s", "n", "e", "se"],
  9: ["e", "se", "n", "s", "ne", "w", "sw", "nw"],
};

/** A number's digits added up until one is left (the same as its remainder by 9, with 9 for 0). */
export function digitRoot(n: number): number {
  const r = Math.abs(Math.trunc(n)) % 9;
  return r === 0 ? 9 : r;
}

/** The Kua of a solar year for a count, with the steps that give it. */
export function kuaOf(solarYear: number, count: FsCount): { kua: Kua; root: number; raw: number; five: boolean } {
  const root = digitRoot(solarYear);
  const raw = count === "yang" ? 11 - root : 4 + root;
  const n = digitRoot(raw);
  const five = n === 5;
  const kua = (five ? (count === "yang" ? 2 : 8) : n) as Kua;
  return { kua, root, raw, five };
}

export type FengShui = {
  count: FsCount;
  solarYear: number;
  kua: Kua;
  steps: { root: number; raw: number; five: boolean };
  trigram: Trigram;
  group: "east" | "west";
  /** The eight directions, clockwise from the north, each with its mansion. */
  directions: { direction: DirectionId; mansion: MansionId; rank: number; supportive: boolean }[];
  /** The direction of each mansion. */
  of: Record<MansionId, DirectionId>;
  /** Without a birth time on Lichun's day, the year (and so the Kua) could be the one before. */
  uncertain: boolean;
};

/** A birth's Kua and Eight Mansions, for one count. */
export function fengShuiOf(birth: ZodiacBirth, count: FsCount): FengShui | null {
  const moment = birthMomentOf(birth);
  if (!moment) return null;
  const solarYear = solarYearOf(moment.ms);
  const { kua, root, raw, five } = kuaOf(solarYear, count);
  const trigram = trigramOfKua(kua);
  const list = EIGHT_MANSIONS[kua];
  const of = Object.fromEntries(MANSION_IDS.map((m, i) => [m, list[i]!])) as Record<MansionId, DirectionId>;
  const directions = DIRECTION_IDS.map((d) => {
    const rank = list.indexOf(d);
    const mansion = MANSION_IDS[rank]!;
    return { direction: d, mansion, rank, supportive: MANSIONS[mansion].supportive };
  });
  // Lichun's own day without a time: noon may fall on the wrong side of the term.
  const lichun = termMs(new Date(moment.ms).getUTCFullYear(), LICHUN);
  const uncertain = Boolean(moment.timeUnknown) && Math.abs(lichun - moment.ms) < 86_400_000;
  return { count, solarYear, kua, steps: { root, raw, five }, trigram, group: trigram.group, directions, of, uncertain };
}
