/**
 * guide: [English, French]. The first screen's words that stay in every
 * page's first download: the form's first-visit title and lines, the ways in
 * under it, the skip links, and the guide's words other parts say too (the
 * menu's tour, Settings' source code line, the footer's What's new, /guide's
 * title). The guide's own words are a book of their own (guide-body-words.ts,
 * languages plan, part 30), its answers another (guide-words.ts); the tour's
 * words ship with the tour (src/lib/tour/steps.ts).
 */
export const guide = {
  firstTitle: ["Cast a birth chart", "Calculer un thème natal"],
  firstLine: [
    "Positions to the arc-second, from the Swiss Ephemeris. Free, with no account, and nothing about you is kept.",
    "Des positions à la seconde d’arc, par la Swiss Ephemeris. Gratuit, sans compte, et rien de vous n’est gardé.",
  ],
  firstLocked: [
    "Your private space is locked: unlock it to see your charts.",
    "Votre espace privé est verrouillé\u202f: déverrouillez-le pour voir vos thèmes.",
  ],
  firstModeLine: ["To open {mode}, cast a birth chart first.", "Pour ouvrir {mode}, calculez d’abord un thème natal."],
  firstTableLine: [
    "To see the table, cast a birth chart first.",
    "Pour voir le tableau, calculez d’abord un thème natal.",
  ],
  firstSample: [
    "See a sample chart (1 Jan 2000, noon, Greenwich)",
    "Voir un thème d’exemple (1er janv. 2000, midi, Greenwich)",
  ],
  firstTour: ["Take the tour (1 min)", "Faire la visite (1 min)"],
  // Under the first screen's form, two ways in without a chart (page reorganisation, R7).
  firstEncyclopedia: ["Browse the encyclopedia", "Parcourir l’encyclopédie"],
  firstCalendar: ["See today’s sky in the Calendar", "Voir le ciel du jour dans le calendrier"],
  noScript: ["Ulune needs JavaScript to draw charts.", "Ulune a besoin de JavaScript pour tracer les thèmes."],
  skipToForm: ["Skip to the form", "Aller au formulaire"],
  skipToChart: ["Skip to the chart", "Aller au thème"],

  guideNewTour: ["Take the tour", "Faire la visite"],
  guidePrecise4: ["Ulune’s code is public, under the GNU AGPL.", "Le code d’Ulune est public, sous licence GNU AGPL."],
  guideSource: ["Source code", "Code source"],
  whatsNew: ["What’s new", "Nouveautés"],
  guidePage: ["Guide", "Guide"],
  guidePageLead: [
    "What Ulune is, what it does, and what happens to your data.",
    "Ce qu’est Ulune, ce qu’il fait, et ce que deviennent vos données.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
