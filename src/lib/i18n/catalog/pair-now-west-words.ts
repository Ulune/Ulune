/**
 * pair-now-west-words: [English, French]. "You two, now" on the Western
 * languages' Relationship pages (share and compare plan, feature 5e):
 * astrology's Synastry and Composite (today's transits to the relationship's
 * chart) and Human Design's connection chart (the moment's gates over it),
 * their lines, readings and table parts. Their heading is the common book's
 * (pair-now-words.ts), which the Chinese pages read alone. Kept out of the
 * app's catalog so they load with those pages' own code; read through
 * pnwWord. scripts/i18n-catalog.test.mjs holds them to the catalog's rules
 * and to the code that loads them.
 */
export const pairNowWestWords = {
  ptnToday: ["Today, {date}", "Aujourd’hui, {date}"],
  ptnTodayAt: ["Today at {time}", "Aujourd’hui à {time}"],
  ptnAbout: ["About “You two, now”", "À propos de «\u202fVous deux, maintenant\u202f»"],
  ptnRetry: ["Try again", "Réessayer"],
  // Astrology: today's transits to the relationship's chart.
  ptnAstroLead: [
    "Today’s sky on your relationship’s own chart: the major aspects within a tight orb, the slow planets first.",
    "Le ciel du jour sur le thème propre de votre relation\u202f: les aspects majeurs à orbe serré, les planètes lentes d’abord.",
  ],
  ptnAstroQuiet: [
    "No planet makes a major aspect within a tight orb to your relationship’s chart today: a quiet sky for the two of you.",
    "Aucune planète ne forme d’aspect majeur à orbe serré avec le thème de votre relation aujourd’hui\u202f: un ciel calme pour vous deux.",
  ],
  ptnAstroFailed: ["Today’s sky could not be read.", "Le ciel du jour n’a pas pu être lu."],
  ptnAstroOn: ["On the composite chart", "Sur le thème composite"],
  ptnAstroOnDavison: ["On the Davison chart", "Sur le thème Davison"],
  ptnPoint: ["the relationship’s {point}", "{point} de la relation"],
  ptnApplying: ["applying", "applicatif"],
  ptnSeparating: ["separating", "séparatif"],
  ptnExactOn: ["exact {date}", "exact le {date}"],
  ptnContacts: ["{n} contacts", "{n} contacts"],
  ptnContactOne: ["one contact", "un contact"],
  ptnColContact: ["Contact", "Contact"],
  ptnColOrb: ["Orb", "Orbe"],
  ptnColMotion: ["Motion", "Mouvement"],
  ptnColExact: ["Exact", "Exact"],
  ptnPartAstroHint: [
    "Today’s transits to the relationship’s chart within a tight orb, the slow planets first.",
    "Les transits du jour au thème de la relation à orbe serré, les planètes lentes d’abord.",
  ],
  // Human Design: the moment's gates over the connection chart.
  ptnHdLead: [
    "The planets’ gates at this moment over your connection chart: the channels they complete for the two of you, and the centres they define between you.",
    "Les portes des planètes en ce moment sur votre carte de connexion\u202f: les canaux qu’elles complètent pour vous deux, et les centres qu’elles définissent entre vous.",
  ],
  ptnHdQuiet: [
    "At this moment the planets complete no channel for the two of you.",
    "En ce moment, les planètes ne complètent aucun canal pour vous deux.",
  ],
  ptnHdWith: ["with {name}’s gate {h}", "avec la porte {h} {deName}"],
  ptnHdWithBoth: ["with gate {h}, which you both hold", "avec la porte {h}, que vous avez tous les deux"],
  ptnHdSky: ["the moment alone, the same for everyone", "le moment seul, le même pour tout le monde"],
  ptnHdBodies: ["{bodies} in {g}", "{bodies} en {g}"],
  ptnHdCentres: ["Defined between you for now: {list}.", "Définis entre vous pour l’instant\u202f: {list}."],
  ptnHdFailed: ["The moment’s gates could not be read.", "Les portes du moment n’ont pas pu être lues."],
  ptnColChannel: ["Channel", "Canal"],
  ptnColWith: ["Completed", "Complété"],
  ptnColCentres: ["Centres", "Centres"],
  ptnPartHdHint: [
    "The channels the planets complete for the two of you at this moment, and the centres they define between you.",
    "Les canaux que les planètes complètent pour vous deux en ce moment, et les centres qu’elles définissent entre vous.",
  ],
} as const satisfies Record<string, readonly [string, string]>;

export type PairNowWestWordKey = keyof typeof pairNowWestWords;

/** A word of the Western pages' "You two, now" in the reader's language, with its {placeholders} filled. */
export function pnwWord(locale: string, key: PairNowWestWordKey, vars?: Record<string, string | number>): string {
  let text: string = pairNowWestWords[key][locale === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
