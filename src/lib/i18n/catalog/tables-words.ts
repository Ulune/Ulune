/**
 * tables-words: [English, French]. The table view's words for the chart's
 * balance and patterns (the first-load trim's second pass, languages plan,
 * part 30): the modalities, polarity, hemispheres, quadrants and houses'
 * tempo, the configurations, stelliums, unaspected bodies, the Moon void of
 * course and the retrogrades, and the Sun above or below the horizon. Read by
 * src/lib/chart/table-cells.ts, not spread into this folder's index: they load
 * with the table's code, at idle or when the table opens, so every page's
 * first download leaves them out. The table's other words stay in tables.ts
 * and table-ui.json. scripts/i18n-catalog.test.mjs checks them as it checks
 * the others.
 */
export const tablesWords = {
  hemiEast: ["East (ASC)", "Est (ASC)"],
  hemiNorth: ["North (IC)", "Nord (FC)"],
  hemiSouth: ["South (MC)", "Sud (MC)"],
  hemiWest: ["West (DSC)", "Ouest (DSC)"],
  noConfigs: ["No major configurations.", "Pas de configuration majeure."],
  noRx: ["No retrogrades.", "Aucune rétrograde."],
  noStelliums: ["No stelliums.", "Pas de stellium."],
  noUnaspected: ["No unaspected planets among the ten.", "Aucune des dix planètes n’est sans aspect."],
  patternConfigs: ["Configurations", "Configurations"],
  patternRx: ["Retrogrades", "Rétrogrades"],
  patternStelliums: ["Stelliums", "Stelliums"],
  patternUnaspected: ["Unaspected planets", "Planètes sans aspect"],
  patternVoc: ["Void-of-course Moon", "Lune vide de course"],
  polarityNegative: ["Negative (earth + water)", "Négatif (terre + eau)"],
  polarityPositive: ["Positive (fire + air)", "Positif (feu + air)"],
  quad1: ["Q1 (houses 1–3)", "Q1 (maisons 1–3)"],
  quad2: ["Q2 (houses 4–6)", "Q2 (maisons 4–6)"],
  quad3: ["Q3 (houses 7–9)", "Q3 (maisons 7–9)"],
  quad4: ["Q4 (houses 10–12)", "Q4 (maisons 10–12)"],
  tableModalities: ["Modalities", "Modalités"],
  tablePolarity: ["Polarity", "Polarité"],
  tableSunAbove: ["Sun above the horizon", "Soleil au-dessus de l’horizon"],
  tableSunBelow: ["Sun below the horizon", "Soleil sous l’horizon"],
  tempoAngular: ["Angular", "Angulaires"],
  tempoCadent: ["Cadent", "Cadentes"],
  tempoSuccedent: ["Succedent", "Succédentes"],
  vocNo: [
    "The Moon makes a major aspect before leaving its sign.",
    "La Lune forme un aspect majeur avant de quitter son signe.",
  ],
  vocYes: [
    "The Moon makes no major aspect before leaving its sign.",
    "La Lune ne forme aucun aspect majeur avant de quitter son signe.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
