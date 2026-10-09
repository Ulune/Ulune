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
} as const satisfies Record<string, readonly [string, string]>;
