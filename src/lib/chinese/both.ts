/*
 * One text in English and in French, and the helper that says it in the
 * reader's language: every Chinese text file and reading uses them. In a
 * module of their own (languages plan, part 30) so BaZi's and Feng Shui's
 * pages no longer fetch Chinese astrology's texts (zodiac-texts.ts) for one
 * line of code; scripts/perf/budgets.mjs (the `chinese` area) keeps each
 * language's download in check. With them, French's two small rules the
 * readings and tables share: « de » elided, and the space before « ; ».
 */

/** One text in English and in French. */
export type Both = readonly [en: string, fr: string];

/** The text in the reader's language: French for "fr", English for any other. */
export const said = (t: Both, locale: string): string => t[locale === "fr" ? 1 : 0];

/**
 * French "de X", elided before a vowel, an h or a y that sounds as a vowel:
 * « d’Anna », « d’Eau », « d’oct. 2017 », « d’Yves », but « de Yann »
 * (languages plan, part 20; shared by the three languages since its review).
 * English never asks for it.
 */
export const deFr = (s: string): string => (/^(?:[aeiouhéèêëàâîïôûœæ]|y(?![aeiouéèêëàâîïôû]))/iu.test(s) ? `d’${s}` : `de ${s}`);

/** Items of a list joined in a sentence or a table's cell: "a; b", « a ; b » with French's narrow no-break space. */
export const semicolon = (locale: string): string => (locale === "fr" ? "\u202f; " : "; ");
