/*
 * The one switch that links the Chinese terms to the encyclopedia (languages
 * plan, part 29: "every term ready to link"): the families of terms whose
 * entries the encyclopedia has written. Empty until encyclopedia parts 23–26
 * write their pages; a family goes in once every entry of it has its page,
 * and then every word of it links, in the tables, in the readings' "In the
 * encyclopedia" and in their running text. scripts/chinese-term-ids.test.mjs
 * refuses a family here with an entry missing, and asks for one whose entries
 * are all written.
 *
 * Small on purpose, apart from the registry (term-ids.ts): the reading card,
 * which comes with every page's first download, reads it to know whether a
 * Chinese reading has anything to offer from the encyclopedia.
 */
import type { ChineseFamily } from "./term-ids";

export const LIVE_FAMILIES: ReadonlySet<ChineseFamily> = new Set<ChineseFamily>([]);

/** A Chinese reading's id: a place or an animal of the zodiac, a cell of BaZi's board, a palace of the Flying Stars, the Calendar's day animal or solar term… */
export const CHINESE_READING = /^(?:zk|zky|zkp|cnday|bz|bzp|fs|fsh|fss|fsy):|^sky:term-/;
