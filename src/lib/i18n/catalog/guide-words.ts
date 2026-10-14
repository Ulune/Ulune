/**
 * guide-words: [English, French]. The answers to the guide's questions (the
 * first screen's guide and /guide; the questions themselves are in guide.ts).
 * Read by src/components/first-screen/GuideAnswer.tsx, not spread into this
 * folder's index: an answer shows only when the guide does, folded under its
 * question, so the answers load with the guide (the server's page holds them
 * for search engines) and stay out of every page's first download, which a
 * returning reader's studio pays for (languages plan, part 29).
 * scripts/i18n-catalog.test.mjs checks them as it checks the others.
 */
export const guideWords = {
  faqTimeA: [
    "Tick “I don’t know the time”. Ulune uses noon: the planets move little in half a day, except the Moon, which can be up to about 7½° off. The houses and the Ascendant depend on the exact time, so they are marked approximate.",
    "Cochez «\u202fJe ne connais pas l’heure\u202f». Ulune prend midi\u202f: les planètes bougent peu en une demi-journée, sauf la Lune, qui peut s’écarter jusqu’à 7,5° environ. Les maisons et l’Ascendant dépendent de l’heure exacte\u202f: ils sont marqués comme approximatifs.",
  ],
  faqHousesA: [
    "Placidus, the default, is the most common; whole sign is the oldest. Each has a line in the form’s options, and you can change it later by editing the chart.",
    "Placidus, le système par défaut, est le plus courant\u202f; celui des signes entiers est le plus ancien. Chacun a sa ligne dans les options du formulaire, et vous pouvez en changer plus tard en modifiant le thème.",
  ],
  faqNameA: [
    "The full name at birth, as on the birth certificate: every given name and the family name. Type it under “Names for numerology” in the form, with the name used now if it differs: a married or chosen name adds its minor numbers. If the full name at birth is left empty, numerology reads the chart’s name. Both names stay on this device.",
    "Le nom complet de naissance, comme sur l’acte de naissance\u202f: tous les prénoms et le nom de famille. Saisissez-le sous «\u202fNoms pour la numérologie\u202f» dans le formulaire, avec le nom utilisé aujourd’hui s’il diffère\u202f: un nom d’usage ou choisi ajoute ses nombres mineurs. Si le nom complet de naissance est laissé vide, la numérologie lit le nom du thème. Les deux noms restent sur cet appareil.",
  ],
  // The Chinese languages' answers (languages plan, part 29; decisions 1 and 4 of 6 October 2026).
  faqYearA: [
    "Lichun, the start of spring (around 4 February), is when BaZi and Feng Shui turn the year, so all of Ulune’s Chinese pages count from it and agree. Many people learned their animal from Chinese New Year, which falls between 21 January and 20 February: when the two give different animals, Chinese astrology’s page says which one New Year would give.",
    "Lichun, le début du printemps (vers le 4 février), est le moment où le BaZi et le Feng Shui changent d’année\u202f: toutes les pages chinoises d’Ulune comptent donc depuis Lichun, et s’accordent. Beaucoup ont appris leur animal d’après le Nouvel An chinois, qui tombe entre le 21 janvier et le 20 février\u202f: quand les deux donnent des animaux différents, la page de l’astrologie chinoise dit lequel donnerait le Nouvel An.",
  ],
  faqCountA: [
    "An optional choice in the birth form’s Options: classical Chinese traditions count a birth as yang or yin by sex. Only two calculations read it: the direction of BaZi’s luck pillars and Feng Shui’s Kua number; without it, both versions are shown. It is kept with the chart on this device, never sent.",
    "Un choix facultatif dans les Options du formulaire de naissance\u202f: les traditions chinoises classiques comptent une naissance comme yang ou yin selon le sexe. Deux calculs seulement le lisent\u202f: le sens des piliers de chance du BaZi et le nombre Kua du Feng Shui\u202f; sans lui, les deux versions sont montrées. Il est gardé avec le thème sur cet appareil, jamais envoyé.",
  ],
  faqFreeA: [
    "Yes: every chart, language and reading, with no account, subscription or advertising.",
    "Oui\u202f: chaque thème, chaque langage et chaque lecture, sans compte, sans abonnement ni publicité.",
  ],
  faqKeptA: [
    "While you look, in the open tab only. In a private space, on this device, sealed; Ulune has no copy, so download a backup from the private space now and then.",
    "Tant que vous regardez, dans l’onglet ouvert seulement. Dans un espace privé, sur cet appareil, scellés\u202f; Ulune n’en a aucune copie, alors téléchargez de temps en temps une sauvegarde depuis l’espace privé.",
  ],
  faqTrustA: [
    "They come from the Swiss Ephemeris, which follows NASA JPL’s DE441 to a fraction of an arc-second, and Ulune’s tests compare them with reference charts. If one looks wrong, use “Report a problem”.",
    "Elles viennent de la Swiss Ephemeris, qui suit DE441 (NASA JPL) à une fraction de seconde d’arc près, et les tests d’Ulune les comparent à des thèmes de référence. Si l’une vous semble fausse, utilisez «\u202fSignaler un problème\u202f».",
  ],
  faqAiA: [
    "No. The readings that come with every chart are fixed texts, the same for everyone with that placement.",
    "Non. Les lectures qui accompagnent chaque thème sont des textes fixes, les mêmes pour tous ceux qui ont ce placement.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
