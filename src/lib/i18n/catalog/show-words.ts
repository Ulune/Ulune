/**
 * show-words: [English, French]. Show mode's own words (share and compare
 * plan, idea B2): its bar, its hints and what it says to a screen reader
 * (studio/show/show-mode.tsx). Kept out of the app's catalog (index.ts), so
 * they load with Show mode's code; read through bookT
 * (src/lib/i18n/words-book.ts). Its button's name, "Show mode", is the
 * catalog's (showMode): the toolbar says it on every page.
 * scripts/show-mode.test.mjs holds them to the catalog's rules.
 */
export const showWords = {
  showBar: ["Show mode’s controls", "Commandes du mode présentation"],
  showLeave: ["Leave show mode", "Quitter le mode présentation"],
  showLeaveShort: ["Leave", "Quitter"],
  showPrev: ["Previous chart: {name}", "Thème précédent\u202f: {name}"],
  showNext: ["Next chart: {name}", "Thème suivant\u202f: {name}"],
  showKeys: ["Esc leaves · P flips to the chart before", "Échap pour quitter · P pour revenir au thème d’avant"],
  showRotate: ["Turn your phone sideways for a larger chart.", "Tournez votre téléphone pour agrandir le thème."],
  showOn: ["Show mode. Press Escape to leave.", "Mode présentation. Appuyez sur Échap pour quitter."],
} as const;
