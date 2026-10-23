/**
 * chineseFirst: [English, French]. The few Chinese words the pages outside
 * the Chinese languages say (the bug-fix round, item 5): the birth form's yin
 * or yang count, the Calendar's solar terms, day animal and flying stars, the
 * solar terms' ring on the wheel (the Look tab). A book of their own, so "/"
 * (whose Calendar and Look tab it fetches at idle) no longer downloads the
 * whole Chinese book (chinese.ts, about 38 KB gz) for them; the Chinese pages
 * read them through that book, which takes them in (src/lib/chinese/words.ts;
 * the light reader is src/lib/chinese/first-words.ts).
 */
export const chineseFirst = {
  // The birth form's yin or yang count (birth-chinese-count.tsx).
  cnCount: ["Yin or yang count (Chinese traditions)", "Compte yin ou yang (traditions chinoises)"],
  cnCountNone: ["Not given", "Non indiqué"],
  cnCountNote: [
    "Classical Chinese traditions count a birth as yang or yin by sex. Only two calculations read it: the direction of BaZi’s luck pillars and Feng Shui’s Kua number. Left empty, both versions are shown. Kept with the chart on this device, never sent.",
    "Les traditions chinoises classiques comptent une naissance comme yang ou yin selon le sexe. Deux calculs seulement le lisent\u202f: le sens des piliers de chance du BaZi et le nombre Kua du Feng Shui. Laissé vide, les deux versions sont montrées. Gardé avec le thème sur cet appareil, jamais envoyé.",
  ],
  cnCountYang: ["Yang: the tradition’s count for a man", "Yang\u202f: le compte de la tradition pour un homme"],
  cnCountYin: ["Yin: the tradition’s count for a woman", "Yin\u202f: le compte de la tradition pour une femme"],
  // The solar terms in the Calendar (its month, year and now) and their ring on the wheel (the Look tab).
  cnTerm: ["Solar term", "Terme solaire"],
  cnTerms: ["Solar terms", "Termes solaires"],
  cnTermNext: ["Next solar term", "Prochain terme solaire"],
  cnTermSun: ["The Sun at {degree}", "Le Soleil à {degree}"],
  cnTermOpens: ["Opens the {animal} month", "Ouvre le mois {animal}"],
  cnTermMiddle: ["The middle of the {animal} month", "Le milieu du mois {animal}"],
  cnTermRing: ["The ring of the terms", "L’anneau des termes"],
  cnTermRingHint: [
    "The 24 Chinese solar terms round the zodiac: the Sun’s own steps through the year",
    "Les 24 termes solaires chinois autour du zodiaque\u202f: les pas du Soleil dans l’année",
  ],
  // The Calendar's day animal (its month and day).
  zkDayTitle: ["Day of the {animal}", "Jour {animal}"],
  zkDayClashes: ["Clashes with", "En choc avec"],
  zkCalClash: ["a clash day for your year animal", "un jour de choc pour votre animal de l’année"],
  // The Calendar's flying stars (its month and day).
  fsyCalDay: ["The year’s {y} and the month’s {m} in the centre", "Celle de l’année, {y}, et celle du mois, {m}, au centre"],
  fsyCalDayTitle: ["Flying stars", "Étoiles volantes"],
  fsyCalLegend: [
    "the month’s flying star from that day; boxed, the year’s at Lichun",
    "l’étoile volante du mois dès ce jour\u202f; encadrée, celle de l’année à Lichun",
  ],
  fsyCalMonth: ["Month star {n} to the centre", "Étoile du mois {n} au centre"],
  fsyCalYear: ["Year star {n} to the centre", "Étoile de l’année {n} au centre"],
} as const satisfies Record<string, readonly [string, string]>;
