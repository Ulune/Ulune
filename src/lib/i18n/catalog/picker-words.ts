/**
 * picker-words: [English, French]. The language picker's own words (page
 * reorganisation plan, R3): each card's line and what it needs, the headings
 * of the traditions, the link to a language's home in the encyclopedia, and
 * the palette's heading for languages.
 *
 * Read by src/studio/shell/picker-words.ts, not spread into this folder's
 * index: only the picker and the palette say them, and both are downloaded
 * when opened, so they stay out of every page's first download.
 * scripts/i18n-catalog.test.mjs checks them as it checks the others.
 */
export const pickerWords = {
  langAstrologyLine: [
    "The sky at your birth: planets, signs, houses and aspects.",
    "Le ciel de votre naissance : planètes, signes, maisons et aspects.",
  ],
  langHumanDesignLine: [
    "Your type, strategy and authority, on the bodygraph.",
    "Votre type, votre stratégie et votre autorité, sur le bodygraph.",
  ],
  langNumerologyLine: [
    "The numbers in your birth date and your name.",
    "Les nombres de votre date de naissance et de votre nom.",
  ],
  langNeedsTime: ["Needs the birth time", "Demande l’heure de naissance"],
  langNeedsName: ["Needs a name and a date", "Demande un nom et une date"],
  langAbout: ["{name} in the encyclopedia", "{name} dans l’encyclopédie"],
  traditionWestern: ["Western traditions", "Traditions occidentales"],
  traditionChinese: ["Chinese traditions", "Traditions chinoises"],
  paletteLanguages: ["Languages", "Langages"],
} as const satisfies Record<string, readonly [string, string]>;
