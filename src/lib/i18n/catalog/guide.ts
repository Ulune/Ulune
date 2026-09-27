/**
 * guide: [English, French]. The first screen's words: the form's first-visit
 * title and line, the guide under it (also on /guide), its questions, and the
 * footer. The tour's words ship with the tour (src/lib/tour/steps.ts).
 */
export const guide = {
  firstTitle: ["Cast a birth chart", "Calculer un thème natal"],
  firstLine: [
    "Positions to the arc-second, from the Swiss Ephemeris. Free, with no account, and nothing about you is kept.",
    "Des positions à la seconde d’arc, par la Swiss Ephemeris. Gratuit, sans compte, et rien de vous n’est gardé.",
  ],
  firstLocked: [
    "Your private space is locked: unlock it to see your charts.",
    "Votre espace privé est verrouillé : déverrouillez-le pour voir vos thèmes.",
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
  noScript: ["Ulune needs JavaScript to draw charts.", "Ulune a besoin de JavaScript pour tracer les thèmes."],
  skipToForm: ["Skip to the form", "Aller au formulaire"],
  skipToChart: ["Skip to the chart", "Aller au thème"],

  guideWhatTitle: ["What Ulune is", "Ce qu’est Ulune"],
  guideWhatBody: [
    "Ulune calculates your birth chart and explains it: where the Sun, the Moon and the planets stood when and where you were born, the houses they fell in and the angles between them. Human Design and numerology sit alongside, from the same birth details.",
    "Ulune calcule votre thème natal et l’explique : où se trouvaient le Soleil, la Lune et les planètes au moment et au lieu de votre naissance, les maisons où ils tombaient et les angles qu’ils formaient entre eux. Le Human Design et la numérologie l’accompagnent, à partir des mêmes données de naissance.",
  ],
  guideDoTitle: ["What you can do", "Ce que vous pouvez faire"],
  guideDoChart: [
    "Your birth chart as a wheel or a table, with a written reading for each planet, house and aspect.",
    "Votre thème natal en roue ou en tableau, avec une lecture écrite pour chaque planète, maison et aspect.",
  ],
  guideDoTime: [
    "Today’s sky against your chart (transits), the aspects of the day, month and year (timing), and your progressed chart.",
    "Le ciel du jour sur votre thème (transits), les aspects du jour, du mois et de l’année (moments), et votre thème progressé.",
  ],
  guideDoPair: [
    "Two charts compared contact by contact (synastry), and the chart of the relationship itself (composite).",
    "Deux thèmes comparés contact par contact (synastrie), et le thème de la relation elle-même (composite).",
  ],
  guideDoSystems: [
    "Your Human Design type, strategy and bodygraph, and the numbers drawn from your birth date and name.",
    "Votre type, votre stratégie et votre bodygraph en Human Design, et les nombres tirés de votre date de naissance et de votre nom.",
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
    "Cast. The chart opens with its reading, and the tabs lead to the rest.",
    "Calculez. Le thème s’ouvre avec sa lecture, et les onglets mènent au reste.",
  ],
  guideBeginNoTime: [
    "No birth time? Tick “I don’t know the time”: Ulune uses noon and marks the houses as approximate.",
    "Pas d’heure de naissance ? Cochez « Je ne connais pas l’heure » : Ulune prend midi et marque les maisons comme approximatives.",
  ],
  guideNewTitle: ["New to charts?", "Vous découvrez les thèmes ?"],
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
    "To draw a chart, its date, time and coordinates go to Ulune’s server, which calculates, answers and keeps nothing. The name stays on this device.",
    "Pour tracer un thème, sa date, son heure et ses coordonnées partent vers le serveur d’Ulune, qui calcule, répond et ne garde rien. Le nom reste sur cet appareil.",
  ],
  guideData3: [
    "While you look, charts stay in the open tab and go when it closes.",
    "Tant que vous regardez, les thèmes restent dans l’onglet ouvert et partent à sa fermeture.",
  ],
  guideData4: [
    "To keep them, “Sign in” opens a private space on this device, sealed with AES-256-GCM under your passphrase, a passkey or a recovery code. Ulune never receives it.",
    "Pour les garder, « Connexion » ouvre un espace privé sur cet appareil, scellé avec AES-256-GCM sous votre phrase secrète, une clé d’accès ou un code de récupération. Ulune ne le reçoit jamais.",
  ],
  guideDataLink: ["Read the privacy notice", "Lire la politique de confidentialité"],
  guidePreciseTitle: ["Precise, and open about it", "Précis, et transparent"],
  guidePrecise1: [
    "Positions come from the Swiss Ephemeris, built from NASA JPL’s DE441; the table shows them to the arc-second.",
    "Les positions viennent de la Swiss Ephemeris, tirée de DE441 (NASA JPL) ; le tableau les donne à la seconde d’arc.",
  ],
  guidePrecise2: [
    "A birth time is read with the birthplace’s full time-zone history, summer time included; before standard time, with its Local Mean Time; before 15 October 1582, in the Julian calendar.",
    "Une heure de naissance est lue avec tout l’historique du fuseau du lieu, heure d’été comprise ; avant l’heure légale, avec son temps moyen local ; avant le 15 octobre 1582, dans le calendrier julien.",
  ],
  guidePrecise3: [
    "Ten house systems, Placidus by default. When the method has to change, a note under the chart says so: Porphyry houses inside the polar circles, for example.",
    "Dix systèmes de maisons, Placidus par défaut. Quand la méthode doit changer, une note sous le thème le dit : les maisons de Porphyre dans les cercles polaires, par exemple.",
  ],
  guidePreciseProgressions: [
    "Progressions: a day for a year, the angles advancing at the Naibod rate (0°59′08″ of right ascension a year).",
    "Progressions\u202f: un jour pour une année, les angles avançant au rythme de Naibod (0°59′08″ d’ascension droite par an).",
  ],
  guidePrecise4: ["Ulune’s code is public, under the GNU AGPL.", "Le code d’Ulune est public, sous licence GNU AGPL."],
  guideSource: ["Source code", "Code source"],
  guideFaqTitle: ["Questions", "Questions"],
  faqTimeQ: ["I don’t know my birth time.", "Je ne connais pas mon heure de naissance."],
  faqTimeA: [
    "Tick “I don’t know the time”. Ulune uses noon: the planets move little in half a day, except the Moon, which can be up to about 7½° off. The houses and the Ascendant depend on the exact time, so they are marked approximate.",
    "Cochez « Je ne connais pas l’heure ». Ulune prend midi : les planètes bougent peu en une demi-journée, sauf la Lune, qui peut s’écarter jusqu’à 7,5° environ. Les maisons et l’Ascendant dépendent de l’heure exacte : ils sont marqués comme approximatifs.",
  ],
  faqHousesQ: ["Which house system should I choose?", "Quel système de maisons choisir ?"],
  faqHousesA: [
    "Placidus, the default, is the most common; whole sign is the oldest. Each has a line in the form’s options, and you can change it later by editing the chart.",
    "Placidus, le système par défaut, est le plus courant ; les signes entiers sont le plus ancien. Chacun a sa ligne dans les options du formulaire, et vous pouvez en changer plus tard en modifiant le thème.",
  ],
  faqFreeQ: ["Is Ulune free?", "Ulune est-il gratuit ?"],
  faqFreeA: [
    "Yes: every chart, mode and reading, with no account, subscription or advertising.",
    "Oui : chaque thème, chaque mode et chaque lecture, sans compte, sans abonnement ni publicité.",
  ],
  faqKeptQ: ["Where are my charts kept?", "Où sont gardés mes thèmes ?"],
  faqKeptA: [
    "While you look, in the open tab only. In a private space, on this device, sealed; Ulune has no copy, so download a backup from the private space now and then.",
    "Tant que vous regardez, dans l’onglet ouvert seulement. Dans un espace privé, sur cet appareil, scellés ; Ulune n’en a aucune copie, alors téléchargez de temps en temps une sauvegarde depuis l’espace privé.",
  ],
  faqTrustQ: ["Can I trust the positions?", "Puis-je me fier aux positions ?"],
  faqTrustA: [
    "They come from the Swiss Ephemeris, which follows NASA JPL’s DE441 to a fraction of an arc-second, and Ulune’s tests compare them with reference charts. If one looks wrong, use “Report a problem”.",
    "Elles viennent de la Swiss Ephemeris, qui suit DE441 (NASA JPL) à une fraction de seconde d’arc près, et les tests d’Ulune les comparent à des thèmes de référence. Si l’une vous semble fausse, utilisez « Signaler un problème ».",
  ],
  faqAiQ: ["Does Ulune use AI?", "Ulune utilise-t-il l’IA ?"],
  faqAiA: [
    "No. The readings that come with every chart are fixed texts, the same for everyone with that placement.",
    "Non. Les lectures qui accompagnent chaque thème sont des textes fixes, les mêmes pour tous ceux qui ont ce placement.",
  ],
  guidePage: ["Guide", "Guide"],
  guidePageLead: [
    "What Ulune is, what it does, and what happens to your data.",
    "Ce qu’est Ulune, ce qu’il fait, et ce que deviennent vos données.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
