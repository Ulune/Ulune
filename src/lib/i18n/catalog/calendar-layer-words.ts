/**
 * calendar-layer-words: [English, French]. The Calendar's layers by language (page
 * reorganisation plan, R5): the View menu's switches, their hints and the
 * invitation to cast a chart.
 *
 * Read by src/lib/i18n/calendar-layer-words.ts, not spread into this folder's
 * index: only the calendar's own code says them, and it is downloaded when
 * the Calendar opens, so they stay out of every page's first download.
 * scripts/i18n-catalog.test.mjs checks them as it checks the others.
 */
export const calendarLayerWords = {
  calLayers: ["Layers", "Calques"],
  calLayerLangAstrology: ["Astrology", "Astrologie"],
  calLayerLangNumerology: ["Numerology", "Numérologie"],
  calLayerSky: ["The sky", "Le ciel"],
  calLayerSkyHint: [
    "Moon phases, eclipses, seasons, retrogrades and planets changing sign",
    "Phases de la Lune, éclipses, saisons, rétrogradations et changements de signe",
  ],
  calLayerTransits: ["Your transits", "Vos transits"],
  calLayerTransitsHint: ["The planets of the day on your chart", "Les planètes du jour sur votre thème"],
  calLayerNumerology: ["Personal day, month and year", "Jour, mois et année personnels"],
  calLayerNumerologyHint: ["With your cycles’ changes on your birthdays", "Avec les changements de vos cycles à vos anniversaires"],
  calLayerLangChinese: ["Chinese calendar", "Calendrier chinois"],
  calLayerTerms: ["Solar terms", "Termes solaires"],
  calLayerTermsHint: ["The 24 steps of the Sun’s year, from Lichun", "Les 24 pas de l’année du Soleil, depuis Lichun"],
  calLayerAnimals: ["The day’s animal", "L’animal du jour"],
  calLayerAnimalsHint: [
    "Each day’s pillar and animal, and the days that clash with your year animal",
    "Le pilier et l’animal de chaque jour, et les jours en choc avec votre animal de l’année",
  ],
  calLayerStars: ["Flying stars", "Étoiles volantes"],
  calLayerStarsHint: [
    "Feng Shui’s stars of the month and the year, changing with each month’s solar term and at Lichun",
    "Les étoiles du mois et de l’année du Feng Shui, qui changent à chaque terme solaire du mois et à Lichun",
  ],
  calLayerNeedsChart: ["Needs a birth chart", "Nécessite un thème natal"],
  calInvite: ["Cast a chart to add your transits", "Calculez un thème pour ajouter vos transits"],
} as const satisfies Record<string, readonly [string, string]>;
