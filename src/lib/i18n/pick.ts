import type { AppLocale } from "./messages";

/** One `{ en, fr }` pair → the locale's text, English as the fallback. */
export function pick(pair: { en: string; fr?: string }, locale: AppLocale): string {
  return (locale === "fr" ? pair.fr : pair.en) || pair.en;
}
