/**
 * pair-now-words: [English, French]. "You two, now" on the Relationship pages
 * (share and compare plan, feature 5e, decision R5): its heading, said on
 * every one of them, and the Chinese pages' table parts (Chinese astrology's
 * and Feng Shui's Pair). The Western pages' lines (astrology's Synastry and
 * Composite, Human Design's connection chart) are a book of their own
 * (pair-now-west-words.ts), so the Chinese pages fetch only these few (the
 * 2.0 week 4 review: 1.1 KB gz less for each Chinese language). Kept out of
 * the app's catalog (index.ts) so they load with those pages' own code; read
 * through pnWord. scripts/i18n-catalog.test.mjs holds them to the catalog's
 * rules and to the code that loads them.
 */
export const pairNowWords = {
  ptnHead: ["You two, now", "Vous deux, maintenant"],
  ptnColWho: ["Who", "Qui"],
  ptnColMeets: ["How it meets the year", "Sa rencontre avec l’année"],
  ptnPartZodiacHint: [
    "The year’s animal for both of you: how each one’s year animal meets it, the month we are in, and what the two of you make of it.",
    "L’animal de l’année pour vous deux\u202f: la façon dont l’animal de l’année de chacun le rencontre, le mois en cours, et ce que vous en faites à deux.",
  ],
  ptnColStars: ["Year · month stars", "Étoiles de l’année · du mois"],
  ptnColState: ["This year", "Cette année"],
  ptnPartFsHint: [
    "The year’s and the month’s flying stars over the directions you share: the side to face together this year, and those to rest.",
    "Les étoiles volantes de l’année et du mois sur les directions que vous partagez\u202f: le côté vers lequel vous tourner ensemble cette année, et ceux à laisser reposer.",
  ],
} as const satisfies Record<string, readonly [string, string]>;

export type PairNowWordKey = keyof typeof pairNowWords;

/** A word of "You two, now" in the reader's language, with its {placeholders} filled. */
export function pnWord(locale: string, key: PairNowWordKey, vars?: Record<string, string | number>): string {
  let text: string = pairNowWords[key][locale === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
