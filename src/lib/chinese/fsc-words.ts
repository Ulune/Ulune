import { fengShuiCyclesWords } from "@/lib/i18n/catalog/fengshui-cycles-words";

/*
 * Feng Shui's Cycles' words (lib/i18n/catalog/fengshui-cycles-words.ts), read
 * as cnWord reads the Chinese traditions' (words.ts): by the page's own code,
 * so they load with it and not with "/" (review of 2.0's week 3).
 */
export type FscWordKey = keyof typeof fengShuiCyclesWords;

export function fscWord(locale: string, key: FscWordKey, vars?: Record<string, string | number>): string {
  let text: string = fengShuiCyclesWords[key][locale === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
