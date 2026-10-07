import { pickerWords } from "@/lib/i18n/catalog/picker-words";

/*
 * The language picker's words (src/lib/i18n/catalog/picker-words.ts), read
 * here rather than through the app's catalog: only the picker and the palette
 * say them, so they load with those instead of with every page.
 */
export type PickerWordKey = keyof typeof pickerWords;

export function pickerWord(locale: string, key: PickerWordKey, vars?: Record<string, string>): string {
  let text: string = pickerWords[key][locale === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
  return text;
}
