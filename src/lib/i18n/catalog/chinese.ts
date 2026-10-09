/**
 * chinese: [English, French]. The Chinese traditions' interface words
 * (languages plan, part 6 onwards): their Settings card, the birth form's yin
 * or yang count, the solar terms in the Calendar and on the wheel. The terms'
 * own names come with the engine (src/lib/chinese/names.ts).
 *
 * Read by src/lib/chinese/words.ts, not spread into this folder's index:
 * everything that says them is downloaded when used, so they stay out of every
 * page's first download. scripts/i18n-catalog.test.mjs checks them as it
 * checks the others.
 */
export const chinese = {
  // Settings → Chinese traditions (decisions 2, 3 and 5).
  cnSettings: ["Chinese traditions", "Traditions chinoises"],
  cnSettingsLead: [
    "How Chinese terms are written and the Chinese calendar is read. Kept on this device only.",
    "Comment les termes chinois s’écrivent et comment le calendrier chinois se lit. Gardé sur cet appareil uniquement.",
  ],
  cnShow: ["Chinese terms", "Termes chinois"],
  cnShowFull: ["Name, pinyin and characters", "Nom, pinyin et caractères"],
  cnShowPinyin: ["Name and pinyin", "Nom et pinyin"],
  cnShowNames: ["Name only", "Le nom seul"],
  cnShowSample: ["For example: {term}", "Par exemple\u202f: {term}"],
  cnScript: ["Characters", "Caractères"],
  cnScriptHant: ["Traditional", "Traditionnels"],
  cnScriptHantHint: ["As in the classical texts and most Feng Shui practice", "Comme dans les textes classiques et la plupart des pratiques du Feng Shui"],
  cnScriptHans: ["Simplified", "Simplifiés"],
  cnScriptHansHint: ["As mainland China writes them today", "Comme on les écrit aujourd’hui en Chine continentale"],
  cnClock: ["The clock for the hour of birth", "L’horloge de l’heure de naissance"],
  cnClockLead: [
    "Only the day and hour pillars depend on it, and only near the edge of an hour. The year and the month follow the solar terms, which no clock moves.",
    "Seuls les piliers du jour et de l’heure en dépendent, et seulement près du bord d’une heure. L’année et le mois suivent les termes solaires, qu’aucune horloge ne déplace.",
  ],
  cnClockSolar: ["True solar time", "Temps solaire vrai"],
  cnClockSolarHint: [
    "The Sun’s own hour at the birthplace: its longitude and the time of year",
    "L’heure du Soleil au lieu de naissance\u202f: sa longitude et le moment de l’année",
  ],
  cnClockMean: ["Local mean time", "Temps moyen local"],
  cnClockMeanHint: ["The birthplace’s longitude only, 4 minutes a degree", "La longitude du lieu seule, 4 minutes par degré"],
  cnClockCivil: ["The clock on the wall", "L’heure de la pendule"],
  cnClockCivilHint: ["The legal time of the birth, as the certificate gives it", "L’heure légale de la naissance, celle de l’acte"],
  cnDay: ["When the day turns", "Quand le jour change"],
  cnDayLead: [
    "Schools disagree for births between 23:00 and 01:00; a chart born then says so.",
    "Les écoles divergent pour les naissances entre 23\u202fh et 1\u202fh\u202f; un thème né à ce moment-là le signale.",
  ],
  cnDay23: ["At 23:00", "À 23\u202fh"],
  cnDay23Hint: ["The Rat hour opens the next day (the Zi Ping rule)", "L’heure du Rat ouvre le jour suivant (la règle du Zi Ping)"],
  cnDaySplit: ["Split Rat hour", "Heure du Rat partagée"],
  cnDaySplitHint: [
    "From 23:00 to midnight, the next day’s hour within the same day",
    "De 23\u202fh à minuit, l’heure du jour suivant dans le même jour",
  ],
  cnDayMidnight: ["At midnight", "À minuit"],
  cnDayMidnightHint: ["As the civil calendar turns", "Comme le calendrier civil"],

  // The birth form's yin or yang count (decision 4): used by three calculations only.
  cnCount: ["Yin or yang count (Chinese traditions)", "Compte yin ou yang (traditions chinoises)"],
  cnCountNone: ["Not given", "Non indiqué"],
  cnCountYang: ["Yang: the tradition’s count for a man", "Yang\u202f: le compte de la tradition pour un homme"],
  cnCountYin: ["Yin: the tradition’s count for a woman", "Yin\u202f: le compte de la tradition pour une femme"],
  cnCountNote: [
    "Classical Chinese traditions count a birth as yang or yin by sex. Only three calculations read it: the direction of BaZi’s luck pillars, Feng Shui’s Kua number and Zi Wei Dou Shu. Left empty, both versions are shown. Kept with the chart on this device, never sent.",
    "Les traditions chinoises classiques comptent une naissance comme yang ou yin selon le sexe. Trois calculs seulement le lisent\u202f: le sens des piliers de chance du BaZi, le nombre Kua du Feng Shui et le Zi Wei Dou Shu. Laissé vide, les deux versions sont montrées. Gardé avec le thème sur cet appareil, jamais envoyé.",
  ],

  // The solar terms, in the Calendar (its layer) and on the wheel (a Look switch).
  cnTerm: ["Solar term", "Terme solaire"],
  cnTerms: ["Solar terms", "Termes solaires"],
  cnTermSun: ["The Sun at {degree}", "Le Soleil à {degree}"],
  cnTermOpens: ["Opens the {animal} month", "Ouvre le mois {animal}"],
  cnTermMiddle: ["The middle of the {animal} month", "Le milieu du mois {animal}"],
  cnTermNext: ["Next solar term", "Prochain terme solaire"],
  cnTermLead: [
    "One of the twenty-four solar terms of the Chinese calendar: the Sun reaches another 15° of its path, and the season turns a step. The twelve that open a solar month set the month in the Four Pillars, and the first of them, Lichun, starts the year; the twelve principal terms name the lunar months.",
    "Un des vingt-quatre termes solaires du calendrier chinois\u202f: le Soleil atteint 15° de plus sur sa route, et la saison avance d’un pas. Les douze qui ouvrent un mois solaire fixent le mois des Quatre Piliers, et le premier d’entre eux, Lichun, ouvre l’année\u202f; les douze termes principaux nomment les mois lunaires.",
  ],
  cnTermSunLabel: ["The Sun", "Le Soleil"],
  cnTermRing: ["The ring of the terms", "L’anneau des termes"],
  cnTermRingHint: [
    "The 24 Chinese solar terms round the zodiac: the Sun’s own steps through the year",
    "Les 24 termes solaires chinois autour du zodiaque\u202f: les pas du Soleil dans l’année",
  ],
  // Chinese astrology's page (languages plan, part 7): the four animals and their wheel.
  zkTitle: ["Your four animals", "Vos quatre animaux"],
  zkLead: [
    "Chinese astrology reads a birth through four animals: the year’s, which most people know, then the month’s, the day’s and the hour’s.",
    "L’astrologie chinoise lit une naissance à travers quatre animaux\u202f: celui de l’année, que l’on connaît le plus souvent, puis ceux du mois, du jour et de l’heure.",
  ],
  zkYear: ["Year", "Année"],
  zkMonth: ["Month", "Mois"],
  zkDay: ["Day", "Jour"],
  zkHour: ["Hour", "Heure"],
  zkYearAnimal: ["Year animal", "Animal de l’année"],
  zkMonthAnimal: ["Month animal", "Animal du mois"],
  zkDayAnimal: ["Day animal", "Animal du jour"],
  zkHourAnimal: ["Hour animal", "Animal de l’heure"],
  zkRoleYear: [
    "In the tradition, the year animal is how others see you, and your roots: your family and the generation you share it with.",
    "Dans la tradition, l’animal de l’année est la façon dont les autres vous voient, et vos racines\u202f: votre famille et la génération qui le partage.",
  ],
  zkRoleMonth: [
    "The month animal is the inner animal: your temperament, the self you grow into. The tradition also reads the parents here.",
    "L’animal du mois est l’animal intérieur\u202f: votre tempérament, la personne que vous devenez. La tradition y lit aussi les parents.",
  ],
  zkRoleDay: [
    "The day animal is the self: who you are with those closest to you, and with a partner above all.",
    "L’animal du jour, c’est soi\u202f: qui vous êtes avec vos proches, et d’abord avec un partenaire.",
  ],
  zkRoleHour: [
    "The hour animal is the secret animal: the private self, shown to few. The tradition also reads the children here.",
    "L’animal de l’heure est l’animal secret\u202f: la part intime, montrée à peu de gens. La tradition y lit aussi les enfants.",
  ],
  zkNoHour: [
    "Without a birth time the hour animal stays unknown: the time adds the fourth.",
    "Sans heure de naissance, l’animal de l’heure reste inconnu\u202f: l’heure ajoute le quatrième.",
  ],
  zkNewYear: [
    "Counted from Chinese New Year, as most people learned it, your year animal would be {theAnimal}. Ulune counts from Lichun, the start of spring, as the Four Pillars and Feng Shui do: births between the two dates get two answers.",
    "Compté depuis le Nouvel An chinois, comme on l’apprend le plus souvent, votre animal de l’année serait {theAnimal}. Ulune compte depuis Lichun, le début du printemps, comme les Quatre Piliers et le Feng Shui\u202f: les naissances entre les deux dates ont deux réponses.",
  ],
  zkUncertainNear: [
    "Your birth falls within a few minutes of this animal’s change: a birth time a little off would give the next one.",
    "Votre naissance tombe à quelques minutes du changement de cet animal\u202f: une heure un peu différente donnerait le suivant.",
  ],
  zkUncertainDay: [
    "Without a birth time, this animal may be the next one: it changes during your birth day.",
    "Sans heure de naissance, cet animal peut être le suivant\u202f: il change pendant votre jour de naissance.",
  ],
  zkClockLine: ["The hour on {clock}; the day turns {day}.", "L’heure en {clock}\u202f; le jour change {day}."],
  zkDayAt23: ["at 23:00", "à 23\u202fh"],
  zkDaySplit: ["at midnight, the Rat hour split", "à minuit, l’heure du Rat partagée"],
  zkDayMidnight: ["at midnight", "à minuit"],
  zkSettingsLink: ["Change in Settings", "Modifier dans les Réglages"],
  zkNowYear: ["The year of the {animal}", "L’année {animal}"],
  zkNowMonth: ["the {animal} month", "le mois {animal}"],
  zkNowLine: ["{year}, {month}: marked on the wheel’s rim.", "{year}, {month}\u202f: marqués au bord de la roue."],
  zkStem: ["Heavenly Stem", "Tronc céleste"],
  zkBranch: ["Earthly Branch", "Branche terrestre"],
  zkAnimalPhase: ["The animal’s phase", "Phase de l’animal"],
  zkNaYin: ["Na Yin", "Na Yin"],
  zkPolarity: ["Yin or yang", "Yin ou yang"],
  zkPillar: ["Pillar", "Pilier"],
  zkPlace: ["Place", "Place"],
  zkAnimal: ["Animal", "Animal"],
  zkWheel: [
    "The twelve animals in their compass places, the Rat at the north, at the top",
    "Les douze animaux à leur place sur la boussole, le Rat au nord, en haut",
  ],
  zkSectorYours: ["yours: {places}", "les vôtres\u202f: {places}"],
  zkSectorNow: ["this year’s", "celui de l’année en cours"],
  zkSectorNowMonth: ["this month’s", "celui du mois en cours"],
  zkEmpty: ["Cast a birth chart to see your four animals.", "Calculez un thème natal pour voir vos quatre animaux."],
  zkBranchLead: [
    "{TheAnimal} is the branch {branch}, of the phase {phase}: its double hour runs from {from} to {to}, and its month is the solar month that opens at {term}.",
    "{TheAnimal} est la branche {branch}, de la phase {phase}\u202f: sa double heure va de {from} à {to}, et son mois est le mois solaire qui s’ouvre à {term}.",
  ],
  zkAboutTitle: ["About the four animals", "À propos des quatre animaux"],
  zkAbout1: [
    "Each pillar of a birth is a Heavenly Stem over an Earthly Branch, and each branch has its animal. The year turns at Lichun, the start of spring (around 4 February), each month at its solar term, the day and the hour on the birthplace’s clock.",
    "Chaque pilier d’une naissance est un Tronc céleste au-dessus d’une Branche terrestre, et chaque branche a son animal. L’année change à Lichun, le début du printemps (vers le 4 février), chaque mois à son terme solaire, le jour et l’heure à l’horloge du lieu de naissance.",
  ],
  zkAbout2: [
    "The full readings of each animal, its relations with the others and the year ahead come next; for now this page shows where your animals stand.",
    "Les lectures complètes de chaque animal, leurs relations et l’année à venir arrivent ensuite\u202f; pour l’instant cette page montre où se trouvent vos animaux.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
