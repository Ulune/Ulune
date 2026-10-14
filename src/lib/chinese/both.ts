/*
 * One text in English and in French, and the helper that says it in the
 * reader's language: every Chinese text file and reading uses them. In a
 * module of their own (languages plan, part 30) so BaZi's and Feng Shui's
 * pages no longer fetch Chinese astrology's texts (zodiac-texts.ts) for one
 * line of code; scripts/perf/budgets.mjs (the `chinese` area) keeps each
 * language's download in check.
 */

/** One text in English and in French. */
export type Both = readonly [en: string, fr: string];

/** The text in the reader's language: French for "fr", English for any other. */
export const said = (t: Both, locale: string): string => t[locale === "fr" ? 1 : 0];
