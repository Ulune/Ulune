import { calendarLayerWords } from "@/lib/i18n/catalog/calendar-layer-words";

/*
 * The Calendar's layer words (src/lib/i18n/catalog/calendar-layer-words.ts),
 * read here rather than through the app's catalog: only the calendar's code
 * says them, so they load with it instead of with every page.
 */
export type CalendarWordKey = keyof typeof calendarLayerWords;

export function calWord(locale: string, key: CalendarWordKey): string {
  return calendarLayerWords[key][locale === "fr" ? 1 : 0];
}
