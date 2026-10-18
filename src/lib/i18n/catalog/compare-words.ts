/**
 * compare-words: [English, French]. The words of Compare, two charts side by
 * side (share and compare plan, feature 2, and idea B9, "What they share"):
 * its bar, its two panes, the reading for two, what the two have in common
 * and its picture (src/studio/compare). Kept out of the app's catalog
 * (index.ts) so they load with Compare's own code, not with every page's
 * first download; read through bookT (src/lib/i18n/words-book.ts). The
 * toolbar's button and the switcher's words are the catalog's (shell.ts:
 * compare, compareWith, compareNotHere).
 * scripts/compare.test.mjs holds them to the catalog's rules.
 */
export const compareWords = {
  cmpRegion: ["Two charts side by side", "Deux thèmes côte à côte"],
  cmpFullOpen: ["Show {name}’s chart full size", "Afficher le thème de {name} en grand"],
  cmpFullClose: ["Back to both charts", "Revenir aux deux thèmes"],
  cmpLeave: ["Leave Compare", "Quitter la comparaison"],
  cmpLink: ["Link selection", "Lier la sélection"],
  cmpLinkHint: [
    "On, choosing in one chart chooses the same in the other.",
    "Activée, un choix dans un thème choisit la même chose dans l’autre.",
  ],
  cmpMeet: ["See how they meet", "Voir leur relation"],
  cmpMeetHint: ["{page}, with {a} and {b}", "{page}, avec {a} et {b}"],
  cmpAbout: [
    "Compare shows two charts as they are, each with its own reading; Relationship reads how two people meet.",
    "Comparer montre deux thèmes tels qu’ils sont, chacun avec sa lecture\u202f; Relation lit la rencontre de deux personnes.",
  ],
  cmpChoose: ["Choose a second person", "Choisissez une deuxième personne"],
  cmpChooseHint: [
    "Pick one of your charts in the list above, or add someone.",
    "Choisissez l’un de vos thèmes dans la liste ci-dessus, ou ajoutez quelqu’un.",
  ],
  cmpLacks: ["Not in {name}’s chart.", "Absent du thème de {name}."],
  cmpJump: ["Each person’s reading", "La lecture de chacun"],
  cmpPickHint: [
    "Choose something in either chart: its reading for both comes here.",
    "Choisissez un élément dans l’un des deux thèmes\u202f: sa lecture pour les deux s’affiche ici.",
  ],
  cmpOneAtATime: [
    "Linked selection is off: the reading follows the chart you choose in.",
    "La sélection liée est désactivée\u202f: la lecture suit le thème où vous choisissez.",
  ],
  cmpShared: ["What they share", "Ce qu’ils ont en commun"],
  cmpSharedHint: ["Choose one to see it in both charts.", "Choisissez-en un pour le voir dans les deux thèmes."],
  cmpSharedNone: ["Nothing on this page is the same in both charts.", "Rien sur cette page n’est identique dans les deux thèmes."],
  cmpSharedMore: ["and {n} more", "et {n} de plus"],
  cmpFirstRead: ["{name}’s chart at a glance", "Le thème de {name} en bref"],
  cmpExportPng: ["Both side by side, PNG", "Les deux côte à côte, PNG"],
  cmpExportSvg: ["Both side by side, SVG", "Les deux côte à côte, SVG"],
  cmpExportFile: ["compare", "comparaison"],
  cmpTables: ["How the tables stand", "Disposition des tableaux"],
  cmpTablesTwo: ["Two tables", "Deux tableaux"],
  cmpTablesOne: ["One table, A | B", "Un tableau, A | B"],
  cmpMergedCore: ["The core numbers, side by side", "Les nombres principaux, côte à côte"],
  cmpMergedPillars: ["The four pillars, side by side", "Les quatre piliers, côte à côte"],
  // What they share (idea B9), item by item.
  cmpInSign: ["{body} in {sign}", "{body} en {sign}"],
  cmpKey: ["{label}: {value}", "{label}\u202f: {value}"],
  cmpGate: ["Gate {n}", "Porte {n}"],
  cmpChannel: ["Channel {id}", "Canal {id}"],
  cmpStrongest: ["Strongest phase", "Phase la plus forte"],
  cmpBothAnimal: ["{animal}, in both charts", "{animal}, dans les deux thèmes"],
} as const satisfies Record<string, readonly [string, string]>;
