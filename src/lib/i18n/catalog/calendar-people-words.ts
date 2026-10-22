/**
 * calendar-people-words: [English, French]. The Calendar's birthdays and
 * returns of the charts you keep (share and compare plan, idea B10): their
 * marks in the month, the day and the year, the table, the calendar file's
 * question and the readings. Kept out of the app's catalog (index.ts): only
 * the layer's own code says them, loaded when the layer is on
 * (src/components/calendar-people.tsx). Read through cpWord.
 * scripts/i18n-catalog.test.mjs holds them to the catalog's rules.
 */
export const calendarPeopleWords = {
  cplTitleBirthday: ["{name}’s birthday", "Anniversaire {deName}"],
  cplTitleSolar: ["{name}’s solar return", "Retour solaire {deName}"],
  cplTitleSaturn1: ["{name}’s first Saturn return", "Premier retour de Saturne {deName}"],
  cplTitleSaturn2: ["{name}’s second Saturn return", "Deuxième retour de Saturne {deName}"],
  cplTitleSaturn3: ["{name}’s third Saturn return", "Troisième retour de Saturne {deName}"],
  cplTitleUranus: ["{name}’s Uranus opposition", "Opposition d’Uranus {deName}"],
  cplTitleChiron: ["{name}’s Chiron return", "Retour de Chiron {deName}"],
  cplShortBirthday: ["birthday", "anniversaire"],
  cplShortSolar: ["solar return", "retour solaire"],
  cplShortSaturn: ["Saturn return", "retour de Saturne"],
  cplShortUranus: ["Uranus opposition", "opposition d’Uranus"],
  cplShortChiron: ["Chiron return", "retour de Chiron"],
  cplTurns: ["turns {n}", "{n} ans"],
  cplAge: ["at {n}", "à {n} ans"],
  cplAround: ["around {date}", "vers le {date}"],
  cplAtBirthplace: ["{time} in {city}", "{time} à {city}"],
  cplLeadBirthday: [
    "{name} turns {n} on {date}: a good day to celebrate with them, and to read their chart again for the year it opens.",
    "{name} a {n} ans le {date}\u202f: un beau jour pour lui faire signe, et pour relire son thème pour l’année qui s’ouvre.",
  ],
  cplLeadSolar: [
    "The Sun comes back to its place at {name}’s birth ({lon}) on {date} at {time}: the moment astrologers cast the solar return chart, read as the tone of the year ahead. A moment to set an intention, or to send {name} a word.",
    "Le Soleil revient à sa place de la naissance {deName} ({lon}) le {date} à {time}\u202f: le moment où l’on dresse la révolution solaire, lue comme le ton de l’année qui vient. Un moment pour poser une intention, ou envoyer un mot à {name}.",
  ],
  cplLeadSolarDay: [
    "The Sun comes back to its place at {name}’s birth ({lon}) around {date}; without a birth time the moment can be a day out. The solar return is read as the tone of the year ahead.",
    "Le Soleil revient à sa place de la naissance {deName} ({lon}) vers le {date}\u202f; sans heure de naissance, le moment peut varier d’un jour. La révolution solaire se lit comme le ton de l’année qui vient.",
  ],
  cplLeadSaturn: [
    "Saturn comes back to its place at {name}’s birth ({lon}), exact on {date}: the Saturn return, around 29 and again around 58, is read as a time of taking stock and building what lasts. Support tends to help more than advice.",
    "Saturne revient à sa place de la naissance {deName} ({lon}), exact le {date}\u202f: le retour de Saturne, vers 29 ans puis vers 58, se lit comme un temps de bilan et de construction durable. Le soutien aide souvent plus que les conseils.",
  ],
  cplLeadUranus: [
    "Uranus stands opposite its place at {name}’s birth ({lon}), exact on {date}: the Uranus opposition, around 40, is read as a wish for change and for more freedom, the questions of midlife. Room to try something new tends to help.",
    "Uranus s’oppose à sa place de la naissance {deName} ({lon}), exact le {date}\u202f: l’opposition d’Uranus, vers 40 ans, se lit comme un désir de changement et de liberté, les questions du milieu de la vie. De la place pour essayer du nouveau aide souvent.",
  ],
  cplLeadChiron: [
    "Chiron comes back to its place at {name}’s birth ({lon}), exact on {date}: the Chiron return, around 50, is read as a time when old sore points come back into view, with the skill to tend them that the years have brought.",
    "Chiron revient à sa place de la naissance {deName} ({lon}), exact le {date}\u202f: le retour de Chiron, vers 50 ans, se lit comme un temps où les vieux points sensibles reviennent au premier plan, avec l’art de les soigner que les années ont apporté.",
  ],
  cplWindow: ["Within 1° from {from} to {to}, exact {n} times: {passes}.", "À moins de 1° du {from} au {to}, exact {n} fois\u202f: {passes}."],
  cplWindowOne: ["Within 1° from {from} to {to}, exact once.", "À moins de 1° du {from} au {to}, exact une fois."],
  cplOpen: ["Open {name}’s chart", "Ouvrir le thème {deName}"],
  cplSky: ["See {name}’s transits at that moment", "Voir les transits {deName} à ce moment"],
  cplFactExact: ["Exact", "Exact"],
  cplFactBirthplace: ["At the birthplace", "Au lieu de naissance"],
  cplFactNatal: ["Natal place", "Place natale"],
  cplFactWindow: ["Within 1°", "À moins de 1°"],
  cplAboutTitle: ["About birthdays and returns", "À propos des anniversaires et des retours"],
  cplAbout1: [
    "The Calendar puts on their days the birthdays and returns of the charts you keep: each solar return at its exact moment, found on this device in the sky’s chunks, and the big returns of a life when the period shown holds them. Everything is worked out here; the names stay on this device, and go into a calendar file only if you include them.",
    "Le Calendrier pose sur leurs jours les anniversaires et les retours des thèmes que vous gardez\u202f: chaque retour solaire à son moment exact, trouvé sur cet appareil dans les tranches du ciel, et les grands retours d’une vie quand la période montrée les contient. Tout est calculé ici\u202f; les noms restent sur cet appareil, et n’entrent dans un fichier de calendrier que si vous les y mettez.",
  ],
  cplAbout2: [
    "A return is a moving planet coming back to its place at the birth, or, for Uranus, standing opposite it: astrology reads each as a chapter of life to meet with care, never as a verdict.",
    "Un retour, c’est une planète en mouvement qui revient à sa place de la naissance, ou, pour Uranus, qui lui fait face\u202f: l’astrologie lit chacun comme un chapitre de vie à accueillir avec soin, jamais comme un verdict.",
  ],
  cplGroupLabel: ["Whose", "De qui"],
  cplGroupAll: ["All kept charts", "Tous les thèmes gardés"],
  cplIcsInclude: ["Include birthdays in the calendar file?", "Inclure les anniversaires dans le fichier\u202f?"],
  cplIcsHint: ["Off: the file holds no names", "Non\u202f: le fichier ne contient aucun nom"],
  cplIcsOn: ["Yes: with their names", "Oui\u202f: avec leurs noms"],
  cplLegend: ["a birthday or a return", "un anniversaire ou un retour"],
} as const satisfies Record<string, readonly [string, string]>;

export type CalendarPeopleWordKey = keyof typeof calendarPeopleWords;

/** A word of the layer in the reader's language, with its {placeholders} filled. */
export function cpWord(locale: string, key: CalendarPeopleWordKey, vars?: Record<string, string | number>): string {
  let text: string = calendarPeopleWords[key][locale === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
