/**
 * hd-pair-words: [English, French]. The words of Human Design's connection
 * chart, its Relationship page (share and compare plan, feature 5a): the
 * figure's legend and side lists, the first read's steps, the line under the
 * chart, the table. Read with bookT by src/studio/modes/design-pair.tsx,
 * src/studio/tables/hd-pair-table.tsx and src/lib/chart/hd-pair-table.ts,
 * not spread into this folder's index: they load with the page, never with
 * the first download. The readings' own words are in
 * src/lib/content/hd-pair.ts (the Human Design reading pack).
 * scripts/i18n-catalog.test.mjs checks them as it checks the others.
 */
export const hdPairWords = {
  hdpAdd: ["Add a second person", "Ajouter une deuxième personne"],
  hdpAnd: [" and ", " et "],
  hdpAria: [
    "Connection chart of {a} and {b}: one bodygraph with both people’s gates, the channels they form by kind and the centres they define.",
    "Carte de connexion {deA} et {deB}\u202f: un seul bodygraph avec les portes des deux personnes, les canaux qu’elles forment par catégorie et les centres qu’elles définissent.",
  ],
  hdpBoth: ["both", "les deux"],
  hdpCentresHead: ["Centres between you", "Centres entre vous"],
  hdpChannelsN: ["{n} channels", "{n} canaux"],
  hdpChannelsNone: ["no channel", "aucun canal"],
  hdpChannelsOne: ["1 channel", "1 canal"],
  hdpColBetween: ["Between you", "Entre vous"],
  hdpColCentre: ["Centre", "Centre"],
  hdpColCentres: ["Centres", "Centres"],
  hdpColChannel: ["Channel", "Canal"],
  hdpColConditioning: ["Conditioning", "Conditionnement"],
  hdpColGate: ["Gate", "Porte"],
  hdpColKind: ["Kind", "Nature"],
  hdpConditioning: ["{giver} → {receiver}", "{giver} → {receiver}"],
  hdpConditioningAria: [
    "Centres {giver} defines and {receiver} has open: {list}. Open the reading.",
    "Centres que {giver} définit et que {receiver} a ouverts\u202f: {list}. Ouvrir la lecture.",
  ],
  hdpDefinitionTogether: ["Definition together", "Définition à deux"],
  hdpEmpty: [
    "Cast a birth chart, then add a second person: Human Design’s connection chart reads how your two bodygraphs meet.",
    "Calculez un thème natal, puis ajoutez une deuxième personne\u202f: la carte de connexion du Human Design lit la rencontre de vos deux bodygraphs.",
  ],
  hdpFirstTitle: ["The two of you, step by step", "Vous deux, pas à pas"],
  hdpKindAria: ["{kind}: {count}. {line}. Open the reading.", "{kind}\u202f: {count}. {line}. Ouvrir la lecture."],
  hdpKindCompanionship: ["Companionship", "Compagnonnage"],
  hdpKindCompanionshipLine: ["Both have it whole: shared ground", "Vous l’avez tous les deux en entier\u202f: un terrain commun"],
  hdpKindCompromise: ["Compromise", "Compromis"],
  hdpKindCompromiseLine: ["One has it whole, the other one gate", "L’un l’a en entier, l’autre une seule porte"],
  hdpKindDominance: ["Dominance", "Dominance"],
  hdpKindDominanceLine: ["One has it whole, the other neither gate", "L’un l’a en entier, l’autre aucune de ses portes"],
  hdpKindElectromagnetic: ["Electromagnetic", "Électromagnétique"],
  hdpKindElectromagneticLine: ["One gate each: together you complete it", "Une porte chacun\u202f: ensemble, vous le complétez"],
  hdpKindsHead: ["Channels between you", "Canaux entre vous"],
  hdpLead: [
    "Human Design’s connection chart lays two bodygraphs over each other: the channels you complete together, the centres one defines for the other, and what stays open between you.",
    "La carte de connexion du Human Design superpose deux bodygraphs\u202f: les canaux que vous complétez ensemble, les centres que l’un définit pour l’autre, et ce qui reste ouvert entre vous.",
  ],
  hdpMarkBoth: ["defined by both", "définis chez les deux"],
  hdpMarkOne: ["defined by {name}", "définis chez {name}"],
  hdpMarkOpen: ["open between you", "ouverts entre vous"],
  hdpMarkTogether: ["defined only together", "définis seulement à deux"],
  hdpNone: ["none", "aucun"],
  hdpNotFormed: ["not formed", "non formé"],
  hdpOpenGround: ["Open between you", "Ouvert entre vous"],
  hdpPartCentresHint: [
    "Each centre in each of your charts and between you, and who conditions whom there.",
    "Chaque centre dans chacun de vos schémas et entre vous, et qui y conditionne qui.",
  ],
  hdpPartChannelsHint: [
    "Every channel the two of you form, by kind, then the ones with a single gate between you.",
    "Chaque canal que vous formez, par catégorie, puis ceux qui n’ont qu’une porte entre vous.",
  ],
  hdpPartGates: ["Gates", "Portes"],
  hdpPartGatesHint: ["Every gate either of you activates, and by which planet.", "Chaque porte que l’un de vous active, et par quelle planète."],
  hdpPeople: ["The two people", "Les deux personnes"],
  hdpPersonAria: ["{name}: {type}, profile {profile}, {definition}. Open the reading.", "{name}\u202f: {type}, profil {profile}, {definition}. Ouvrir la lecture."],
  hdpSayBoth: ["both of you", "vous deux"],
  hdpSayNeither: ["neither of you", "aucun de vous"],
  hdpStateBoth: ["defined by both", "défini chez les deux"],
  hdpStateOne: ["defined by {who}, open for {other}", "défini chez {who}, ouvert chez {other}"],
  hdpStateOpen: ["open between you", "ouvert entre vous"],
  hdpStateTogether: ["defined only together", "défini seulement à deux"],
  hdpStepSummary: ["What you form", "Ce que vous formez"],
  hdpUnformedRow: ["Not formed: one gate between you", "Non formé\u202f: une seule porte entre vous"],
  hdpUnknown: [
    "No birth time for {name}: what could differ at another hour of that day is marked ~.",
    "Pas d’heure de naissance pour {name}\u202f: ce qui pourrait changer à une autre heure de ce jour-là est marqué ~.",
  ],
  hdpWhole: ["whole", "en entier"],
} as const satisfies Record<string, readonly [string, string]>;

export type HdPairWordKey = keyof typeof hdPairWords;
