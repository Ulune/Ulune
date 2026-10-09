/*
 * The four places' words (the year, the month, the day, the hour), apart
 * from the readings so that the Calendar's day reading (part 11) can say
 * them without loading the natal page's texts and drawings.
 */
import type { ChineseWordKey } from "./words";
import type { ZodiacPlaceId } from "./zodiac";

export const PLACE_WORD: Record<ZodiacPlaceId, ChineseWordKey> = { year: "zkYear", month: "zkMonth", day: "zkDay", hour: "zkHour" };
export const PLACE_ANIMAL: Record<ZodiacPlaceId, ChineseWordKey> = {
  year: "zkYearAnimal",
  month: "zkMonthAnimal",
  day: "zkDayAnimal",
  hour: "zkHourAnimal",
};
