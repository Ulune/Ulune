/**
 * sections: [English, French]. The 2.0 map (page reorganisation, parts R2 to
 * R4): the three sections, the languages and their picker, the lenses.
 */
export const sections = {
  sectionsNav: ["Sections", "Sections"],
  sectionCharts: ["Charts", "Thèmes"],
  sectionCalendar: ["Calendar", "Calendrier"],
  sectionEncyclopedia: ["Encyclopedia", "Encyclopédie"],
  lensesLabel: ["Lenses", "Prismes"],
  lensNatal: ["Natal", "Natal"],
  lensCycles: ["Cycles", "Cycles"],
  lensRelationship: ["Relationship", "Relation"],
  // Between a lens and its sub-mode when they share a tab ("Cycles: Transits").
  lensColon: [": ", " : "],
  lensFold: ["{lens}: {page}", "{lens} : {page}"],
  langAstrology: ["Astrology", "Astrologie"],
  langAstrologyShort: ["Astro", "Astro"],
  langHumanDesign: ["Human Design", "Human Design"],
  langHumanDesignShort: ["HD", "HD"],
  langNumerology: ["Numerology", "Numérologie"],
  langChineseAstrology: ["Chinese astrology", "Astrologie chinoise"],
  langChineseAstrologyShort: ["Chinese", "Chinoise"],
  langButton: ["{name}, choose another language", "{name}, choisir un autre langage"],
  langPicker: ["Choose a language", "Choisir un langage"],
  // The skip link on the Calendar (Shell.tsx), beside "Skip to the form" and "Skip to the chart".
  skipToCalendar: ["Skip to the calendar", "Aller au calendrier"],
} as const satisfies Record<string, readonly [string, string]>;
