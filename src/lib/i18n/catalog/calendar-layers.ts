/**
 * calendar-layers: [English, French]. The Calendar as a section of its own
 * (page reorganisation plan, R5): the words its page head and the studio's
 * form say. The layers' own words are in calendar-layer-words.ts, read only by the
 * calendar's code (src/lib/i18n/calendar-layer-words.ts), so they stay out of every
 * page's first download.
 */
export const calendarLayers = {
  calFormLine: [
    "Cast your chart and your transits join the Calendar.",
    "Calculez votre thème et vos transits rejoindront le calendrier.",
  ],
  calBackToSky: ["Back to the Calendar", "Retour au calendrier"],
  calendarPageTitle: ["Calendar · Ulune", "Calendrier · Ulune"],
  calendarPageDescription: [
    "The sky day by day: Moon phases, eclipses, retrogrades and planets changing sign, in your time zone. Cast a chart to add your transits. Free, no account.",
    "Le ciel jour après jour\u202f: phases de la Lune, éclipses, rétrogradations et changements de signe, à votre heure. Calculez un thème pour y ajouter vos transits. Gratuit, sans compte.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
