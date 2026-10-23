/*
 * The one switch that links the Chinese terms to the encyclopedia (languages
 * plan, part 29: "every term ready to link"): the families of terms whose
 * entries the encyclopedia has written, filled family by family by
 * encyclopedia parts 23–26 (the phases and yin and yang first, part 23's
 * pilot); a family goes in once every entry of it has its page,
 * and then every word of it links, in the tables, in the readings' "In the
 * encyclopedia" and in their running text. scripts/chinese-term-ids.test.mjs
 * refuses a family here with an entry missing, and asks for one whose entries
 * are all written.
 *
 * Small on purpose, apart from the registry (term-ids.ts): the reading card,
 * which comes with every page's first download, reads it to know whether a
 * Chinese reading has anything to offer from the encyclopedia, and the
 * language picker which Chinese language has its home there (LIVE_HOMES).
 */
import type { ChineseFamily } from "./term-ids";

export const LIVE_FAMILIES: ReadonlySet<ChineseFamily> = new Set<ChineseFamily>([
  // Encyclopedia part 23's pilot: the five phases and yin and yang.
  "phase",
  "polarity",
  // Part 23's first batch: the ten Heavenly Stems and the twelve Earthly Branches.
  "stem",
  "branch",
  // Part 24: the twelve animals, and the zodiac's own ideas (the four animals, the own year).
  "animal",
  "zodiac-concept",
  // Part 23's second batch: the shared ideas (hidden stems, Tai Sui, solar month, Lo Shu) and the relations.
  "chinese-concept",
  "relation",
  // Part 23's third batch: the twenty-four solar terms.
  "solar-term",
  // Part 25's first family: BaZi's Ten Gods.
  "ten-god",
  // Part 25's others: the life stages, the symbolic stars, the structures and BaZi's ideas; the sixty pillars and the thirty Na Yin.
  "life-stage",
  "shen-sha",
  "structure",
  "bazi-concept",
  "pillar",
  "na-yin",
  // Part 26: the eight trigrams, then Feng Shui's own families, the Kua and the Eight Mansions, the 24
  // mountains, the Flying Stars with their formations, periods and 45 pairings, the year's afflictions
  // and Feng Shui's key ideas.
  "trigram",
  "kua",
  "mansion",
  "mountain",
  "flying-star",
  "formation",
  "affliction",
  "period",
  "pairing",
  "fengshui-concept",
]);

/**
 * The Chinese languages whose home in the encyclopedia is written
 * (encyclopedia plan, part 23), by their address in each language: the
 * language picker's ⓘ leads there (studio/map.ts, languageHomePath). A home
 * exists once its introduction is written (content/encyclopedia/<tradition>/_home.<lang>.md)
 * or its first entry; scripts/encyclopedia-chinese.test.mjs keeps this list
 * equal to the homes the encyclopedia builds.
 */
export const LIVE_HOMES: Readonly<Partial<Record<"chinese-astrology" | "bazi" | "feng-shui", { en: string; fr: string }>>> = {
  "chinese-astrology": { en: "chinese-astrology", fr: "astrologie-chinoise" },
  bazi: { en: "bazi", fr: "bazi" },
  "feng-shui": { en: "feng-shui", fr: "feng-shui" },
};

/** A Chinese reading's id: a place or an animal of the zodiac, a cell of BaZi's board, a palace of the Flying Stars, two people's Kua (Feng Shui's Pair), a direction under the year (Feng Shui's Cycles), the Calendar's day animal or solar term… */
export const CHINESE_READING = /^(?:zk|zky|zkp|cnday|bz|bzp|fs|fsh|fss|fsy|fsp|fsc):|^sky:term-/;
