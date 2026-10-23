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
  lensHome: ["Home", "Logement"],
  // A phone's lens tabs (review of 2.0's week 3): Feng Shui's four lenses cut "Relationship" at 390 px.
  // Relationship's short names are its 1.x names (Pair, Duo); "Logis" keeps Logement's root.
  lensRelationshipShort: ["Pair", "Duo"],
  lensHomeShort: ["Home", "Logis"],
  // Between a lens and its sub-mode when they share a tab ("Cycles: Transits").
  lensColon: [": ", " : "],
  lensFold: ["{lens}: {page}", "{lens} : {page}"],
  langAstrology: ["Astrology", "Astrologie"],
  langAstrologyShort: ["Astro", "Astro"],
  langHumanDesign: ["Human Design", "Human Design"],
  langHumanDesignShort: ["HD", "HD"],
  langNumerology: ["Numerology", "Numérologie"],
  // Its short name on a narrower toolbar's chips and beside the lens tabs (the bug-fix round, item 7: the chip
  // read "Numerol…" at a 900 px stage): the numbers it reads, as "Zodiac" says what Chinese astrology reads.
  langNumerologyShort: ["Numbers", "Nombres"],
  langChineseAstrology: ["Chinese astrology", "Astrologie chinoise"],
  // The short names a narrow toolbar gives beside the lens tabs and on the chips (languages plan,
  // part 28): Chinese astrology reads the Chinese zodiac's animals, as the privacy notice says;
  // "Chinoise" alone read as an unfinished phrase. BaZi and Feng Shui are short already.
  langChineseAstrologyShort: ["Zodiac", "Zodiaque"],
  langBazi: ["BaZi", "BaZi"],
  langBaziShort: ["BaZi", "BaZi"],
  langFengShui: ["Feng Shui", "Feng Shui"],
  langFengShuiShort: ["Feng Shui", "Feng Shui"],
  langButton: ["{name}, choose another language", "{name}, choisir un autre langage"],
  langPicker: ["Choose a language", "Choisir un langage"],
  // The skip link on the Calendar (Shell.tsx), beside "Skip to the form" and "Skip to the chart".
  skipToCalendar: ["Skip to the calendar", "Aller au calendrier"],
} as const satisfies Record<string, readonly [string, string]>;
