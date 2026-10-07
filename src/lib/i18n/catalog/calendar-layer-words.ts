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
  calLayerNeedsChart: ["Needs a birth chart", "Nécessite un thème natal"],
  calInvite: ["Cast a chart to add your transits", "Calculez un thème pour ajouter vos transits"],
} as const satisfies Record<string, readonly [string, string]>;
