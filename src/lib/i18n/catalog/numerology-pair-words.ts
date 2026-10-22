/**
 * numerology-pair-words: [English, French]. The words of numerology's
 * Relationship page (share and compare plan, feature 5c): its figure, cards,
 * table, first read and the readings' headings (studio/modes/numerology-pair.tsx,
 * studio/tables/numerology-pair-table.tsx, lib/chart/interpret-numerology-pair.ts,
 * lib/chart/numerology-pair-table.ts). Kept out of the app's catalog (index.ts)
 * so they load with the page's own code; read through npWord, or bookT
 * (src/lib/i18n/words-book.ts). The page's name in the bars is the catalog's
 * (shell.ts, pageNumerologyPair). scripts/numerology-pair.test.mjs holds them to
 * the catalog's rules.
 */
export const numPairWords = {
  npFigure: ["Two people’s numbers", "Les nombres de deux personnes"],
  npWheelAria: [
    "The nine numbers: {a}’s inside the band, {b}’s outside, the relationship number in the centre",
    "Les neuf nombres\u202f: ceux {deA} à l’intérieur de la bande, ceux {deB} à l’extérieur, le nombre de la relation au centre",
  ],
  npKeyInside: ["{a}, inside", "{a}, à l’intérieur"],
  npKeyOutside: ["{b}, outside", "{b}, à l’extérieur"],
  npKeyShared: ["A digit both hold is ringed; the centre is the relationship number.", "Un chiffre que tous deux portent est cerclé\u202f; au centre, le nombre de la relation."],
  npSayHint: ["Point at a number to see the pair it belongs to.", "Pointez un nombre pour voir la paire à laquelle il appartient."],
  npSayHintTouch: ["Tap a number to see the pair it belongs to.", "Touchez un nombre pour voir la paire à laquelle il appartient."],
  npRelHead: ["Relationship number", "Nombre de la relation"],
  npCentre: ["Relationship", "Relation"],
  npRelTitle: ["Relationship number {n}", "Nombre de la relation {n}"],
  npRelSteps: ["Life Paths {steps}", "Chemins de vie {steps}"],
  npSideHead: ["Side by side", "Côte à côte"],
  npCrossHead: ["Crossed pairs", "Paires croisées"],
  npCrossLabel: ["{a}’s {pa} · {b}’s {pb}", "{pa} {deA} · {pb} {deB}"],
  npSharedHead: ["Shared digits", "Chiffres en commun"],
  npSharedNone: [
    "No digit in common among your six numbers: each brings what the other’s numbers lack.",
    "Aucun chiffre en commun entre vos six nombres\u202f: chacun apporte ce qui manque aux nombres de l’autre.",
  ],
  npDigitTitle: ["Both have a {d}", "Tous deux ont un {d}"],
  npDigitLead: ["The {d}: for {a}, {aList}; for {b}, {bList}.", "Le {d}\u202f: chez {a}, {aList}\u202f; chez {b}, {bList}."],
  npDigitShared: ["A digit both hold is common ground; the {d} brings {brings}.", "Un chiffre porté par les deux est un terrain commun\u202f; le {d} apporte {brings}."],
  npNowHead: ["You two, now", "Vous deux, maintenant"],
  npYearLine: [
    "In {year}, a {pa} year for {a} beside a {pb} year for {b}: the relationship’s year is a {pt}.",
    "En {year}, une année {pa} pour {a} à côté d’une année {pb} pour {b}\u202f: l’année de la relation est une année {pt}.",
  ],
  npYearTitle: ["You two in {year}", "Vous deux en {year}"],
  npYearOf: ["{name}’s personal year", "Année personnelle {deName}"],
  npYearTogether: ["The relationship’s year", "L’année de la relation"],
  npGap: ["gap {n}", "écart {n}"],
  npSame: ["the same number", "le même nombre"],
  npPairTitle: ["{label}: {na} and {nb}", "{label}\u202f: {na} et {nb}"],
  npBringsHead: ["What each brings", "Ce que chacun apporte"],
  npBrings: ["{name}’s {n} brings {brings}.", "Le {n} {deName} apporte {brings}."],
  npRubHead: ["Where they may rub", "Où ils peuvent frotter"],
  npMasterHead: ["A master number in the pair", "Un nombre maître dans la paire"],
  npBridgeHead: ["The bridge between them", "Le pont entre eux"],
  npBridgeLine: ["Between {na} and {nb}, a gap of {n}.", "Entre {na} et {nb}, un écart de {n}."],
  npHowHead: ["How it is worked out", "Comment il se calcule"],
  npWait: ["This pair waits for {name}’s full name at birth, which gives the name’s numbers.", "Cette paire attend le nom complet de naissance {deName}, qui donne les nombres du nom."],
  npAddName: ["Add the full name at birth", "Ajouter le nom complet de naissance"],
  npNameWaits: ["{name}’s name numbers wait for a full name at birth.", "Les nombres du nom {deName} attendent un nom complet de naissance."],
  npNameWaitsB: [
    "{name}’s name numbers wait for a full name at birth, added in {name}’s own chart.",
    "Les nombres du nom {deName} attendent un nom complet de naissance, à ajouter dans son propre thème.",
  ],
  npAddSecond: ["Choose or add a second person", "Choisir ou ajouter une deuxième personne"],
  npLead: [
    "Two people’s numbers side by side: how each pair tends to work together, what each brings and where they may rub.",
    "Les nombres de deux personnes côte à côte\u202f: comment chaque paire a tendance à s’accorder, ce que chacun apporte et où ils peuvent frotter.",
  ],
  npNoVerdict: [
    "No two numbers are good or bad together: each pair says where things flow and where a little care helps.",
    "Aucun couple de nombres n’est bon ou mauvais en soi\u202f: chaque paire dit où les choses coulent et où un peu d’attention aide.",
  ],
  npFirstTitle: ["First read: the two of you in numbers", "Première lecture\u202f: vous deux en nombres"],
  npPartSide: ["Side by side", "Côte à côte"],
  npPartSideHint: ["Each person’s six numbers, with the gap between them.", "Les six nombres de chacun, avec l’écart entre eux."],
  npPartPairs: ["The pairs", "Les paires"],
  npPartPairsHint: ["Each pair of numbers, the same and the crossed, read as a dynamic.", "Chaque paire de nombres, les mêmes et les croisées, lue comme une dynamique."],
  npPartShared: ["Relationship and shared digits", "Relation et chiffres en commun"],
  npPartSharedHint: ["The relationship number, and the digits both people’s numbers hold.", "Le nombre de la relation, et les chiffres que portent les nombres des deux."],
  npPartNow: ["You two, now", "Vous deux, maintenant"],
  npPartNowHint: ["Both personal years for the year shown, and the relationship’s year.", "Les deux années personnelles de l’année montrée, et l’année de la relation."],
  npColPair: ["Pair", "Paire"],
  npColDynamic: ["Dynamic", "Dynamique"],
  npColDigit: ["Digit", "Chiffre"],
  npFile: ["{a} and {b} numerology", "{a} et {b} numérologie"],
} as const satisfies Record<string, readonly [string, string]>;

export type NumPairWordKey = keyof typeof numPairWords;

/** A word of the page in the reader's language, with its {placeholders} filled. */
export function npWord(locale: string, key: NumPairWordKey, vars?: Record<string, string | number>): string {
  let text: string = numPairWords[key][locale === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
