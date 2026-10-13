import type { ChineseName } from "./names";

/**
 * The Chinese languages' own names, for the language picker's cards
 * (languages plan, part 28), written as the reader chose in Settings →
 * Chinese traditions: Chinese astrology is the twelve animals, 生肖
 * shēngxiào; BaZi, the eight characters, 八字 bāzì; Feng Shui, wind and
 * water, 風水 fēngshuǐ (风水 in Simplified). Keyed by the language's id in
 * the map (src/studio/map.ts); the English and French names are the
 * picker's own (scripts/studio-nav.test.mjs keeps them the same).
 *
 * A file of its own, re-exported by names.ts, so the picker's download
 * carries these three and not the calendar's tables.
 */
export const LANGUAGE_NAMES: Readonly<Record<string, ChineseName>> = {
  "chinese-astrology": { hant: "生肖", hans: "生肖", pinyin: "shēngxiào", en: "Chinese astrology", fr: "Astrologie chinoise" },
  bazi: { hant: "八字", hans: "八字", pinyin: "bāzì", en: "BaZi", fr: "BaZi" },
  "feng-shui": { hant: "風水", hans: "风水", pinyin: "fēngshuǐ", en: "Feng Shui", fr: "Feng Shui" },
};
