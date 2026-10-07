/**
 * picker-words: [English, French]. The language picker's own words (page
 * reorganisation plan, R3): each card's line and what it needs, the headings
 * of the traditions, the link to a language's home in the encyclopedia, the
 * palette's heading for languages, and the language button's one-time hint
 * for readers who knew 1.x (R8).
 *
 * Read by src/studio/shell/picker-words.ts, not spread into this folder's
 * index: only the picker, the palette and the hint say them, and each is
 * downloaded when opened or shown, so they stay out of every page's first
 * download.
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
  // The language button's one-time hint for readers of 1.x (page reorganisation, R8; src/studio/shell/LanguageHint.tsx).
  langHintTitle: ["New in Ulune 2.0", "Nouveau dans Ulune 2.0"],
  langHintBody: [
    "Human Design and numerology are now languages, like astrology: choose them here. Time is now Cycles, Pair is Relationship, and the Calendar has a section of its own.",
    "Le Human Design et la numérologie sont désormais des langages, comme l’astrologie : choisissez-les ici. Temps devient Cycles, Duo devient Relation, et le calendrier a sa propre section.",
  ],
  langHintOk: ["Got it", "Compris"],
} as const satisfies Record<string, readonly [string, string]>;
