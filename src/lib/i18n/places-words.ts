import { placesWords } from "@/lib/i18n/catalog/places-words";

/*
 * The switcher's homes' words (src/lib/i18n/catalog/places-words.ts), read
 * here rather than through the app's catalog: only the switcher's homes and
 * the palette say them, so they load with that code instead of with every
 * page (reorganisation plan, R9).
 */
export type PlaceWordKey = keyof typeof placesWords;

export function placeWord(locale: string, key: PlaceWordKey, vars?: Record<string, string>): string {
  let text: string = placesWords[key][locale === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
  return text;
}
