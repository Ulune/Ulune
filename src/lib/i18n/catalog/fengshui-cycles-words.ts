/**
 * fengshui-cycles-words: [English, French]. The words of Feng Shui's Cycles
 * (share and compare plan, feature 5d): its figure and legend, its dials, its
 * first read, its readings' headings and its table (studio/modes/fengshui-cycles.tsx,
 * lib/chinese/fengshui-cycles-reading.ts, lib/chinese/fengshui-cycles-table.ts,
 * studio/tables/fengshui-cycles-table.tsx), and the two of Compare's "What they
 * share" (studio/compare/shared-fengshui.ts). A book of their own (review of
 * 2.0's week 3), out of the Chinese traditions' words (chinese.ts), which "/"
 * fetches at idle for the Calendar's few: they load with the page's own code.
 * Read through fscWord (src/lib/chinese/fsc-words.ts); held to the catalog's
 * rules by scripts/i18n-catalog.test.mjs and scripts/chinese-fengshui-cycles.test.mjs.
 */
export const fengShuiCyclesWords = {
  fscRose: ["Your directions under the year’s stars", "Vos directions sous les étoiles de l’année"],
  fscRoseSky: ["The year’s stars in the eight directions", "Les étoiles de l’année dans les huit directions"],
  fscLegendStars: ["In each direction, the year’s star in the disc and the month’s in the small ring.", "Dans chaque direction, l’étoile de l’année dans le disque et celle du mois dans le petit cercle."],
  fscLegendRim: [
    "On the rim: the Grand Duke, solid; the Year Breaker, dashed; the Three Killings, dotted.",
    "Sur le bord\u202f: le Grand Duc en trait plein, le Briseur de l’année en tirets, les Trois Sha en pointillés.",
  ],
  fscLegendStates: [
    "Outlined: strengthened this year. Framed in dashes: a year to rest it.",
    "Contour plein\u202f: renforcée cette année. Cadre en tirets\u202f: une année pour la laisser reposer.",
  ],
  fscLegendSky: ["Framed in dashes: a direction the year asks to rest.", "Cadre en tirets\u202f: une direction que l’année invite à laisser reposer."],
  fscStrengthened: ["strengthened", "renforcée"],
  fscSteady: ["steady", "stable"],
  fscRest: ["resting", "au repos"],
  fscStateStrengthened: ["strengthened this year", "renforcée cette année"],
  fscStateSteady: ["steady this year", "stable cette année"],
  fscStateRest: ["resting this year", "au repos cette année"],
  fscYearStarAria: ["year’s star {star}", "étoile de l’année {star}"],
  fscMonthStarAria: ["month’s star {star}", "étoile du mois {star}"],
  fscYouHead: ["This year for you", "Cette année pour vous"],
  fscBest: ["Face {dir} ({mansion}) for what you begin this year.", "Tournez-vous vers {dir} ({mansion}) pour ce que vous commencez cette année."],
  fscBestNone: [
    "This year your four supportive directions all rest: lean on what is already under way rather than starting anew.",
    "Cette année, vos quatre directions favorables se reposent toutes\u202f: appuyez-vous sur ce qui est déjà en cours plutôt que de recommencer.",
  ],
  fscRestLine: ["Rest {list} this year rather than starting work there.", "Laissez reposer {list} cette année plutôt que d’y entamer des travaux."],
  fscRestNone: ["None of your supportive directions asks for rest this year.", "Aucune de vos directions favorables ne demande de repos cette année."],
  fscMonthHead: ["The month", "Le mois"],
  fscMonthLine: ["From {from} to {to}, the month’s star in the centre is the {star}.", "Du {from} au {to}, l’étoile du mois au centre est le {star}."],
  fscMonthFive: ["Its 5 Yellow visits {where}.", "Son 5 Jaune visite {where}."],
  fscMonthFiveMark: ["the month’s 5 Yellow", "le 5 Jaune du mois"],
  fscMonthPrev: ["Previous month", "Mois précédent"],
  fscMonthNext: ["Next month", "Mois suivant"],
  fscMonthBack: ["Back to this month", "Revenir à ce mois-ci"],
  fscNow: ["now", "en ce moment"],
  fscCalendar: ["The flying stars month by month, in the Calendar", "Les étoiles volantes mois par mois, dans le calendrier"],
  fscCalendarHint: ["Opens the Calendar with its Flying stars layer on.", "Ouvre le calendrier avec son calque Étoiles volantes."],
  fscInvite: [
    "The year’s stars are the same for everyone. With a birth chart, Ulune lays your own eight directions under them: which of your supportive sides the year strengthens, and which it asks you to rest.",
    "Les étoiles de l’année sont les mêmes pour tous. Avec un thème natal, Ulune pose vos huit directions sous elles\u202f: lesquels de vos côtés favorables l’année renforce, et lesquels elle vous invite à laisser reposer.",
  ],
  fscFormLine: [
    "Cast your chart and your Kua joins the year’s stars: which of your directions the year strengthens, and which to rest.",
    "Calculez votre thème et votre Kua rejoindra les étoiles de l’année\u202f: lesquelles de vos directions l’année renforce, et lesquelles laisser reposer.",
  ],
  fscFormBack: ["Back to the year’s stars", "Retour aux étoiles de l’année"],
  fscFirstTitle: ["First read: your directions this year", "Première lecture\u202f: vos directions cette année"],
  fscLead: [
    "The year’s and the month’s flying stars over your eight directions: which of your supportive directions the year strengthens, and which it asks you to rest. Suggestions about timing, never about a place.",
    "Les étoiles volantes de l’année et du mois sur vos huit directions\u202f: lesquelles de vos directions favorables l’année renforce, et lesquelles elle vous invite à laisser reposer. Des suggestions de moment, jamais sur un lieu.",
  ],
  fscLeadSky: ["The year’s and the month’s flying stars, the same for everyone, and where the year asks for quiet.", "Les étoiles volantes de l’année et du mois, les mêmes pour tous, et où l’année demande le calme."],
  fscStepBest: ["Strengthened for you", "Renforcée pour vous"],
  fscStepRest: ["To rest this year", "À laisser reposer cette année"],
  fscShareBest: ["To face this year", "Vers où se tourner cette année"],
  fscDirTitle: ["{dir} in {year}", "{dir} en {year}"],
  fscDirLead: ["In {year}, the year’s {star} visits {dir}, your {mansion} direction.", "En {year}, le {star} de l’année visite {dir}, votre direction {deMansion}."],
  fscDirLeadSky: ["In {year}, the year’s {star} visits {dir}.", "En {year}, le {star} de l’année visite {dir}."],
  fscDirMonth: ["From {from} to {to}, the month’s {star} visits it.", "Du {from} au {to}, le {star} du mois la visite."],
  fscStarHead: ["The year’s star there", "L’étoile de l’année"],
  fscHowReadHead: ["How Ulune reads it", "Comment Ulune la lit"],
  fscStateCol: ["This year", "Cette année"],
  fscQuietCol: ["Leave quiet", "Au calme"],
  fscPracticeTitle: ["This year in practice", "Cette année, en pratique"],
  fscPracticeDesk: [
    "For a desk or a long task this year, face {dir}: your {mansion} direction, with the year’s {star}.",
    "Pour un bureau ou une longue tâche cette année, tournez-vous vers {dir}\u202f: votre direction {deMansion}, avec le {star} de l’année.",
  ],
  fscPartYear: ["The year and the month", "L’année et le mois"],
  fscPartDirsHint: [
    "Each direction with the year’s and the month’s stars, what falls there, and what the year makes of it for you.",
    "Chaque direction avec les étoiles de l’année et du mois, ce qui y tombe, et ce que l’année en fait pour vous.",
  ],
  fscPartYou: ["For you", "Pour vous"],
  fscPartYouHint: ["This year’s direction for new starts, and the ones to rest.", "La direction de l’année pour les commencements, et celles à laisser reposer."],
  fscNone: ["none", "aucune"],
} as const satisfies Record<string, readonly [string, string]>;
