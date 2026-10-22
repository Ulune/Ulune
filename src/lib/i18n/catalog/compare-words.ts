/**
 * compare-words: [English, French]. The words of Compare, two charts side by
 * side (share and compare plan, feature 2, and idea B9, "What they share"),
 * with its other ways since ideas B7 and B8 (one person in two languages, one
 * chart at two moments, three or four people): its bar, its panes, the
 * reading for two or more, what they have in common, where two languages
 * agree, and its picture (src/studio/compare). Kept out of the app's catalog
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
  cmpTablesEach: ["A table each", "Un tableau chacun"],
  cmpTablesOneMany: ["One table, a column each", "Un tableau, une colonne chacun"],
  cmpMergedCore: ["The core numbers, side by side", "Les nombres principaux, côte à côte"],
  cmpMergedPillars: ["The four pillars, side by side", "Les quatre piliers, côte à côte"],
  // What they share (idea B9), item by item.
  cmpInSign: ["{body} in {sign}", "{body} en {sign}"],
  cmpKey: ["{label}: {value}", "{label}\u202f: {value}"],
  cmpGate: ["Gate {n}", "Porte {n}"],
  cmpChannel: ["Channel {id}", "Canal {id}"],
  cmpStrongest: ["Strongest phase", "Phase la plus forte"],
  cmpBothAnimal: ["{animal}, in both charts", "{animal}, dans les deux thèmes"],
  // Compare's three ways (ideas B7 and B8), in its bar.
  cmpWay: ["How to compare", "Comment comparer"],
  cmpWayPeople: ["People", "Personnes"],
  cmpWayLanguages: ["Languages", "Langages"],
  cmpWayMoments: ["Moments", "Moments"],
  cmpWayPeopleHint: ["Several people’s charts side by side", "Les thèmes de plusieurs personnes côte à côte"],
  cmpWayLanguagesHint: ["One person’s chart in two languages", "Le thème d’une personne dans deux langages"],
  cmpWayMomentsHint: ["One chart at two moments", "Un thème à deux moments"],
  cmpRegionMany: ["{n} charts side by side", "{n} thèmes côte à côte"],
  // The panes' names, for a screen reader: "Chart C: Camille".
  cmpPane: ["Chart {letter}: {name}", "Thème {letter}\u202f: {name}"],
  cmpPaneWhat: ["Chart {letter}: {name}, {what}", "Thème {letter}\u202f: {name}, {what}"],
  // Three or four people (idea B8).
  cmpPersonPick: ["Chart {letter}", "Thème {letter}"],
  cmpAddThird: ["Add a third chart", "Ajouter un troisième thème"],
  cmpAddFourth: ["Add a fourth chart", "Ajouter un quatrième thème"],
  cmpAddShort: ["Add", "Ajouter"],
  cmpRemove: ["Take {name} out of Compare", "Retirer {name} de la comparaison"],
  cmpAboutGroup: ["Compare shows each chart as it is, each with its own reading.", "Comparer montre chaque thème tel qu’il est, chacun avec sa lecture."],
  cmpPickHintGroup: [
    "Choose something in any chart: everyone’s reading of it comes here.",
    "Choisissez un élément dans n’importe quel thème\u202f: la lecture de chacun s’affiche ici.",
  ],
  cmpSharedAll3: ["What all three share", "Ce que les trois ont en commun"],
  cmpSharedAll4: ["What all four share", "Ce que les quatre ont en commun"],
  cmpSharedAllHint: ["Choose one to see it in every chart.", "Choisissez-en un pour le voir dans chaque thème."],
  cmpSharedNoneAll: ["Nothing on this page is the same in every chart.", "Rien sur cette page n’est identique dans tous les thèmes."],
  cmpSharedMost: ["Most of you share", "La plupart d’entre vous partagent"],
  cmpSharedCount: ["{label} · {n} of {of}", "{label} · {n} sur {of}"],
  cmpAnimalAt: ["{animal}, in different places", "{animal}, à des places différentes"],
  cmpEveryone: ["Everyone’s reading", "La lecture de chacun"],
  // One person, two languages (idea B7).
  cmpPagePick: ["Language and page of chart {letter}", "Langage et page du thème {letter}"],
  cmpPageOption: ["{language} · {page}", "{language} · {page}"],
  cmpAboutLanguages: [
    "One person’s chart in two languages, each read in its own terms: choose in either, and its reading comes here.",
    "Le thème d’une personne dans deux langages, chacun lu à sa façon\u202f: choisissez dans l’un ou l’autre, et sa lecture s’affiche ici.",
  ],
  cmpAgree: ["Where they agree", "Là où ils se rejoignent"],
  cmpAgreeHint: ["Choose one to see it in both.", "Choisissez-en un pour le voir dans les deux."],
  cmpAgreeWhyHd: [
    "Human Design’s Personality side is the birth chart’s planets: each gate lies where its planet stands.",
    "Le côté Personnalité du Human Design reprend les planètes du thème natal\u202f: chaque porte se trouve là où est sa planète.",
  ],
  cmpAgreeWhyMonth: [
    "The Chinese solar month turns when the Sun reaches 15° of a sign: the month’s animal follows the Sun.",
    "Le mois solaire chinois change quand le Soleil atteint 15° d’un signe\u202f: l’animal du mois suit le Soleil.",
  ],
  cmpAgreeWhyBranches: [
    "Chinese astrology’s four animals are BaZi’s four branches, read from the same calendar.",
    "Les quatre animaux de l’astrologie chinoise sont les quatre branches du BaZi, tirées du même calendrier.",
  ],
  cmpAgreeNone: [
    "These two languages read the chart in their own terms: nothing they show here is the same fact.",
    "Ces deux langages lisent le thème chacun à sa façon\u202f: rien de ce qu’ils montrent ici n’est le même fait.",
  ],
  cmpAgreeNot: ["Nothing they show here agrees for this chart.", "Rien de ce qu’ils montrent ici ne concorde pour ce thème."],
  cmpAgreeGate: ["{body} in {sign}: Gate {gate}", "{body} en {sign}\u202f: Porte {gate}"],
  cmpAgreeSun: ["Sun at {deg} {sign}", "Soleil à {deg} {sign}"],
  cmpInBoth: ["{what}, in both", "{what}, dans les deux"],
  cmpAgreeElement: ["{phase}: the year’s element and the Day Master’s", "{phase}\u202f: l’élément de l’année et celui du Maître du jour"],
  // One chart, two moments (idea B7).
  cmpMomentPick: ["Page of chart B", "Page du thème B"],
  cmpNow: ["now", "maintenant"],
  cmpAboutMoments: [
    "One chart at two moments: A follows the toolbar’s time, B its own dial.",
    "Un thème à deux moments\u202f: A suit le temps de la barre d’outils, B son propre cadran.",
  ],
  cmpLacksPage: ["Not on this page ({page}).", "Absent de cette page ({page})."],
  // "All side by side" (three or four, idea B8).
  cmpExportAllPng: ["All side by side, PNG", "Tous côte à côte, PNG"],
  cmpExportAllSvg: ["All side by side, SVG", "Tous côte à côte, SVG"],
  // A figure too small to read in a pane of three or four: its summary instead (small.ts).
  cmpSmallTable: ["In short: the figure is too small to read here.", "En bref\u202f: la figure serait trop petite pour être lue ici."],
} as const satisfies Record<string, readonly [string, string]>;
