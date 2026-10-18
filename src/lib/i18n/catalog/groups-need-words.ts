/**
 * groups-need-words: [English, French]. Where groups of charts and notes on
 * a chart are offered while no private space is open (share and compare
 * plan, ideas B5 and B6): the switcher's Groups row (studio/show/picker-extras.tsx)
 * and the Birth tab's Notes (studio/groups/chart-kept.tsx) say in one quiet
 * line that they are kept only in the space, with the way in. A small book,
 * fetched with the switcher's other rows by every reader; the words of the
 * groups and notes themselves load with them (groups-words.ts), which read
 * these two headings from here. Read through bookT (src/lib/i18n/words-book.ts);
 * scripts/groups-notes.test.mjs holds them to the catalog's rules.
 */
export const groupsNeedWords = {
  keptGroups: ["Groups", "Groupes"],
  keptNotes: ["Notes", "Notes"],
  keptNeedGroups: ["{create} to sort your charts into groups.", "{create} pour ranger vos thèmes en groupes."],
  keptNeedNotes: ["{create} to keep notes on your charts.", "{create} pour garder des notes sur vos thèmes."],
  keptNeedCreate: ["Create your private space", "Créez votre espace privé"],
  keptLockedGroups: ["{unlock} to see your groups.", "{unlock} pour voir vos groupes."],
  keptLockedNotes: ["{unlock} to see and write your notes.", "{unlock} pour voir et écrire vos notes."],
  keptNeedUnlock: ["Unlock your private space", "Déverrouillez votre espace privé"],
  keptUnavailable: [
    "This browser can’t keep a private space, so groups and notes can’t be kept here.",
    "Ce navigateur ne peut pas garder d’espace privé\u202f: les groupes et les notes ne peuvent pas y être gardés.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
