/**
 * guide: [English, French]. The first screen's words: the form's first-visit
 * title and line, the guide under it (also on /guide), its questions, and the
 * footer. The tour's words ship with the tour (src/lib/tour/steps.ts), and
 * the answers to the guide's questions with the guide (guide-words.ts). The
 * Chinese languages joined the guide with the languages plan, part 29: their
 * lines in what you can do, the lenses' Home, the Calendar's layers, the
 * Chinese calendar's precision and two questions. These words are in every
 * page's first download, so they stay short.
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

  guideWhatTitle: ["What Ulune is", "Ce qu’est Ulune"],
  guideWhatBody: [
    "Ulune casts your birth chart and explains it: where the Sun, the Moon and the planets stood when and where you were born, the houses they fell in and the angles between them. Human Design, numerology, Chinese astrology, BaZi and Feng Shui read the same birth data in languages of their own; the Calendar follows the sky day by day, and the encyclopedia explains the words.",
    "Ulune calcule votre thème natal et l’explique\u202f: où se trouvaient le Soleil, la Lune et les planètes au moment et au lieu de votre naissance, les maisons où ils tombaient et les angles qu’ils formaient entre eux. Le Human Design, la numérologie, l’astrologie chinoise, le BaZi et le Feng Shui lisent les mêmes données de naissance dans leur propre langage\u202f; le calendrier suit le ciel jour après jour, et l’encyclopédie explique les mots.",
  ],
  // What you can do, in the 2.0 map’s words (page reorganisation, R8; the Chinese languages since languages plan, part 29): the six languages, the lenses, the Calendar, the encyclopedia.
  guideDoTitle: ["What you can do", "Ce que vous pouvez faire"],
  guideDoAstrology: [
    "Your birth chart as a wheel or a table, with a written reading for each planet, house and aspect.",
    "Votre thème natal en roue ou en tableau, avec une lecture écrite pour chaque planète, maison et aspect.",
  ],
  guideDoHumanDesign: [
    "Your bodygraph, with your type, strategy, authority and profile.",
    "Votre bodygraph, avec votre type, votre stratégie, votre autorité et votre profil.",
  ],
  guideDoNumerology: [
    "The numbers of your birth date and full name at birth, and their cycles through life.",
    "Les nombres de votre date de naissance et de votre nom complet de naissance, et leurs cycles au fil de la vie.",
  ],
  guideDoChineseAstrology: [
    "The wheel of the twelve animals and your four, of the year, the month, the day and the hour, with the harmonies and clashes between them.",
    "La roue des douze animaux et vos quatre animaux, de l’année, du mois, du jour et de l’heure, avec leurs harmonies et leurs chocs.",
  ],
  guideDoBazi: [
    "The Four Pillars of your birth: your Day Master, the Ten Gods, the balance of the five phases and your luck pillars.",
    "Les Quatre Piliers de votre naissance\u202f: votre Maître du jour, les Dix Dieux, l’équilibre des cinq phases et vos piliers de chance.",
  ],
  guideDoFengShui: [
    "Your Kua number and your eight directions; with Home, a home’s Flying Stars, from its facing and the year it was built.",
    "Votre nombre Kua et vos huit directions\u202f; avec Logement, les Étoiles volantes d’un logement, d’après son orientation et son année de construction.",
  ],
  guideDoLenses: [
    "The tabs beside the language, as each has them: Natal, the birth chart itself; Cycles, the chart through time (transits, progressions; numerology’s years and life cycles; BaZi’s luck pillars); Relationship, beside a second person’s; Home, a place, for Feng Shui.",
    "Les onglets à côté du langage, selon ceux qu’il a\u202f: Natal, le thème natal lui-même\u202f; Cycles, le thème au fil du temps (transits, progressions\u202f; les années et les cycles de vie de la numérologie\u202f; les piliers de chance du BaZi)\u202f; Relation, à côté de celui d’une autre personne\u202f; Logement, un lieu, pour le Feng Shui.",
  ],
  // The Calendar's layers by language (src/lib/chart/calendar-layers.ts): those on by default, then those kept off until asked for.
  guideDoCalendar: [
    "Day by day, in layers by language: the sky, your transits and the solar terms; in View, you can add your personal year, month and day, the day’s animal and Feng Shui’s flying stars. It works without a chart too.",
    "Jour après jour, en calques par langage\u202f: le ciel, vos transits et les termes solaires\u202f; dans Affichage, vous pouvez ajouter votre année, votre mois et votre jour personnels, l’animal du jour et les étoiles volantes du Feng Shui. Il fonctionne aussi sans thème.",
  ],
  // The Chinese languages' pages come with the encyclopedia plan's parts 23 to 26: name them here then.
  guideDoEncyclopedia: [
    "A page for each word of astrology, Human Design and numerology, from Saturn to the life path, in English and French.",
    "Une page pour chaque mot de l’astrologie, du Human Design et de la numérologie, de Saturne au chemin de vie, en français et en anglais.",
  ],
  guideBeginTitle: ["How to begin", "Pour commencer"],
  guideBegin1: [
    "Type the date, the time and the birthplace. The name is optional and never leaves this device.",
    "Saisissez la date, l’heure et le lieu de naissance. Le nom est facultatif et ne quitte jamais cet appareil.",
  ],
  guideBegin2: [
    "Pick the place from the list, so its coordinates and time-zone history are exact.",
    "Choisissez le lieu dans la liste, pour que ses coordonnées et l’historique de son fuseau horaire soient exacts.",
  ],
  guideBegin3: [
    "Cast. The chart opens with its reading; above it, the language and its tabs lead to the rest.",
    "Calculez. Le thème s’ouvre avec sa lecture\u202f; au-dessus, le langage et ses onglets mènent au reste.",
  ],
  guideBeginNoTime: [
    "No birth time? Tick “I don’t know the time”: Ulune uses noon and marks the houses as approximate.",
    "Pas d’heure de naissance\u202f? Cochez «\u202fJe ne connais pas l’heure\u202f»\u202f: Ulune prend midi et marque les maisons comme approximatives.",
  ],
  guideNewTitle: ["New to charts?", "Vous découvrez les thèmes\u202f?"],
  guideNewBody: [
    "A one-minute tour shows what each part of the screen does, on the chart you have open or on a sample. Or open the sample chart (1 January 2000, noon, Greenwich) and look around.",
    "Une visite d’une minute montre à quoi sert chaque partie de l’écran, sur le thème ouvert ou sur un exemple. Ou ouvrez le thème d’exemple (1er janvier 2000, midi, Greenwich) et explorez.",
  ],
  guideNewTour: ["Take the tour", "Faire la visite"],
  guideNewSample: ["See the sample chart", "Voir le thème d’exemple"],
  guideDataTitle: ["Your data stays yours", "Vos données restent à vous"],
  guideData1: [
    "No account, no cookies, no analytics, no advertising.",
    "Pas de compte, pas de cookies, pas de mesure d’audience, pas de publicité.",
  ],
  guideData2: [
    "To draw a chart, its date, time and coordinates go to Ulune’s server, which calculates, answers and keeps nothing. The names stay on this device.",
    "Pour tracer un thème, sa date, son heure et ses coordonnées partent vers le serveur d’Ulune, qui calcule, répond et ne garde rien. Les noms restent sur cet appareil.",
  ],
  guideData3: [
    "While you look, charts stay in the open tab and go when it closes.",
    "Tant que vous regardez, les thèmes restent dans l’onglet ouvert et sont effacés à sa fermeture.",
  ],
  guideData4: [
    "To keep them, “Sign in” opens a private space on this device, sealed with AES-256-GCM under your passphrase, a passkey or a recovery code. Ulune never receives it.",
    "Pour les garder, «\u202fSe connecter\u202f» ouvre un espace privé sur cet appareil, scellé avec AES-256-GCM sous votre phrase secrète, une clé d’accès ou un code de récupération. Ulune ne le reçoit jamais.",
  ],
  guideDataLink: ["Read the privacy notice", "Lire la politique de confidentialité"],
  guidePreciseTitle: ["Precise, and open about it", "Précis, et transparent"],
  guidePrecise1: [
    "Positions come from the Swiss Ephemeris, built from NASA JPL’s DE441; the table shows them to the arc-second.",
    "Les positions viennent de la Swiss Ephemeris, tirée de DE441 (NASA JPL)\u202f; le tableau les donne à la seconde d’arc.",
  ],
  guidePrecise2: [
    "A birth time is read with the birthplace’s full time-zone history, summer time included; before standard time, with its Local Mean Time; before 15 October 1582, in the Julian calendar.",
    "Une heure de naissance est lue avec tout l’historique du fuseau du lieu, heure d’été comprise\u202f; avant l’heure légale, avec son temps moyen local\u202f; avant le 15 octobre 1582, dans le calendrier julien.",
  ],
  guidePrecise3: [
    "Ten house systems, Placidus by default. When the method has to change, a note under the chart says so: Porphyry houses inside the polar circles, for example.",
    "Dix systèmes de maisons, Placidus par défaut. Quand la méthode doit changer, une note sous le thème le dit\u202f: les maisons de Porphyre dans les cercles polaires, par exemple.",
  ],
  guidePreciseProgressions: [
    "Progressions: a day for a year, the angles advancing at the Naibod rate (0°59′08″ of right ascension a year).",
    "Progressions\u202f: un jour pour une année, les angles avançant au rythme de Naibod (0°59′08″ d’ascension droite par an).",
  ],
  guidePreciseNumerology: [
    "Numerology follows Hans Decoz’s Pythagorean method: each name added on its own, a Y counted by its place, master numbers and karmic debts kept. The Chaldean number stands beside it, labelled, never mixed in.",
    "La numérologie suit la méthode pythagoricienne de Hans Decoz\u202f: chaque nom additionné à part, un Y compté selon sa place, les nombres maîtres et les dettes karmiques gardés. Le nombre chaldéen se tient à côté, nommé, jamais mêlé.",
  ],
  // The Chinese calendar engine (src/lib/chinese/README.md) and its defaults (src/lib/chinese/prefs.ts).
  guidePreciseChinese: [
    "The Chinese languages share one calendar: the solar terms and new moons, computed with the Swiss Ephemeris into a table for 1800 to 2200 that your device reads. The year turns at Lichun; the hour is read in true solar time and the day turns at 23:00, unless you choose otherwise in Settings.",
    "Les langages chinois partagent un calendrier\u202f: les termes solaires et les nouvelles lunes, calculés avec la Swiss Ephemeris dans une table de 1800 à 2200 que lit votre appareil. L’année change à Lichun\u202f; l’heure se lit en temps solaire vrai et le jour change à 23\u202fh, sauf autre choix dans les Réglages.",
  ],
  guidePrecise4: ["Ulune’s code is public, under the GNU AGPL.", "Le code d’Ulune est public, sous licence GNU AGPL."],
  guideSource: ["Source code", "Code source"],
  whatsNew: ["What’s new", "Nouveautés"],
  guideFaqTitle: ["Questions", "Questions"],
  // The questions: their answers load with the guide itself, apart from every page's first download (guide-words.ts, said by GuideAnswer.tsx).
  faqTimeQ: ["I don’t know my birth time.", "Je ne connais pas mon heure de naissance."],
  faqHousesQ: ["Which house system should I choose?", "Quel système de maisons choisir\u202f?"],
  faqFreeQ: ["Is Ulune free?", "Ulune est-il gratuit\u202f?"],
  faqKeptQ: ["Where are my charts kept?", "Où sont gardés mes thèmes\u202f?"],
  faqTrustQ: ["Can I trust the positions?", "Puis-je me fier aux positions\u202f?"],
  faqNameQ: ["Which name does numerology read?", "Quel nom la numérologie lit-elle\u202f?"],
  // The Chinese languages' questions (languages plan, part 29; decisions 1 and 4 of 6 October 2026).
  faqYearQ: [
    "Why does the year animal change at Lichun, not Chinese New Year?",
    "Pourquoi l’animal de l’année change-t-il à Lichun, pas au Nouvel An chinois\u202f?",
  ],
  faqCountQ: ["What is the yin or yang count?", "Qu’est-ce que le compte yin ou yang\u202f?"],
  faqAiQ: ["Does Ulune use AI?", "Ulune utilise-t-il l’IA\u202f?"],
  guidePage: ["Guide", "Guide"],
  guidePageLead: [
    "What Ulune is, what it does, and what happens to your data.",
    "Ce qu’est Ulune, ce qu’il fait, et ce que deviennent vos données.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
