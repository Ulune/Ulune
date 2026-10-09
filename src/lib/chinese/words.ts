import { chinese } from "@/lib/i18n/catalog/chinese";
import { ANIMALS } from "./names";

/*
 * The Chinese traditions' interface words (src/lib/i18n/catalog/chinese.ts),
 * read here rather than through the app's catalog: only the code that says
 * them (the Settings card, the birth form's count, the Calendar's terms, the
 * wheel's ring) loads them, so they stay out of every page's first download.
 */
export type ChineseWordKey = keyof typeof chinese;

export function cnWord(locale: string, key: ChineseWordKey, vars?: Record<string, string | number>): string {
  let text: string = chinese[key][locale === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

/** The goat is the one feminine animal in French: « du Tigre », « de la Chèvre ». */
export function animalOf(animal: number, locale: string): string {
  const a = ANIMALS[((animal % 12) + 12) % 12]!;
  if (locale !== "fr") return a.en;
  return a.id === "goat" ? `de la ${a.fr}` : `du ${a.fr}`;
}

/** An animal with its article: "the Horse", « le Cheval », « la Chèvre »; capitalised to open a sentence. */
export function theAnimal(animal: number, locale: string, capital = false): string {
  const a = ANIMALS[((animal % 12) + 12) % 12]!;
  const art = locale === "fr" ? (a.id === "goat" ? "la" : "le") : "the";
  const word = `${art} ${locale === "fr" ? a.fr : a.en}`;
  return capital ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}
