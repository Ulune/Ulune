import { chineseFirst } from "@/lib/i18n/catalog/chinese-first-words";
import { ANIMALS } from "./names";

/*
 * The few Chinese words the pages outside the Chinese languages say (the
 * bug-fix round, item 5): the Calendar's solar terms, day animal and flying
 * stars, the wheel's ring of terms in the Look tab, the birth form's yin or
 * yang count. Read from their own small book (catalog/chinese-first-words.ts),
 * so the code "/" fetches at idle no longer brings the whole Chinese book
 * (words.ts reads that one, for the Chinese pages).
 */
export type ChineseFirstWordKey = keyof typeof chineseFirst;

export function cnWord(locale: string, key: ChineseFirstWordKey, vars?: Record<string, string | number>): string {
  let text: string = chineseFirst[key][locale === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

/** The goat is the one feminine animal in French: « du Tigre », « de la Chèvre ». */
export function animalOf(animal: number, locale: string): string {
  const a = ANIMALS[((animal % 12) + 12) % 12]!;
  if (locale !== "fr") return a.en;
  return a.id === "goat" ? `de la ${a.fr}` : `du ${a.fr}`;
}
