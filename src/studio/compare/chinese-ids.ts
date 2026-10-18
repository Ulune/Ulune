import type { DirectionId, FsCount } from "@/lib/chinese/fengshui";
import type { ChineseWordKey } from "@/lib/chinese/words";
import type { ZodiacPlaceId } from "@/lib/chinese/zodiac";

/*
 * The words and ids Chinese astrology's and Feng Shui's pages give what
 * Compare names and chooses in both charts (zodiac-places.ts,
 * fengshui-reading.ts; held equal to theirs by scripts/compare.test.mjs).
 * Named here, so Compare's download leaves those files in the pages' own: a
 * page's file shared with Compare would come out of the page's as a file of its
 * own, one more in the list the first download carries of what each page
 * brings. (BaZi's are its own files' own: shared-bazi.ts takes all of them.)
 */

/** The four places' words (zodiac-places.ts, PLACE_WORD). */
export const PLACE_WORD: Record<ZodiacPlaceId, ChineseWordKey> = { year: "zkYear", month: "zkMonth", day: "zkDay", hour: "zkHour" };

/** Feng Shui's Kua and a direction of the rose, in a count (fengshui-reading.ts, fsKuaRef and fsDirRef). */
export const kuaRef = (count: FsCount): string => `fs:${count}:kua`;
export const dirRef = (count: FsCount, d: DirectionId): string => `fs:${count}:dir:${d}`;
/** A direction of Feng Shui's Cycles under the year, in a count (fengshui-cycles-reading.ts, fscDirRef). */
export const cyclesDirRef = (count: FsCount, d: DirectionId): string => `fsc:${count}:dir:${d}`;
