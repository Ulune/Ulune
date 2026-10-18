/**
 * groups-words: [English, French]. The groups of charts in the chart
 * switcher and the notes on a chart (share and compare plan, ideas B5 and
 * B6): the filter, the groups' headings, a chart's groups, making, renaming,
 * moving and deleting a group, the Birth tab's notes. Kept out of the app's
 * catalog (index.ts): they load with the groups' code
 * (studio/groups/picker-groups.tsx, note-field.tsx), only once a private
 * space is open, and are read through bookT (src/lib/i18n/words-book.ts)
 * with the headings of groups-need-words.ts. scripts/groups-notes.test.mjs
 * holds them to the catalog's rules.
 */
export const groupsWords = {
  keptShowFrom: ["Show charts from", "Afficher les thèmes de"],
  keptAll: ["All", "Tous"],
  keptUngrouped: ["Not in a group", "Hors groupe"],
  keptHeadNone: ["{name}, no chart", "{name}, aucun thème"],
  keptHeadOne: ["{name}, one chart", "{name}, un thème"],
  keptHeadMany: ["{name}, {n} charts", "{name}, {n} thèmes"],
  keptGroupEmpty: ["No chart in this group yet.", "Aucun thème dans ce groupe pour l’instant."],
  keptTagFor: ["Groups for {name}", "Groupes de {name}"],
  keptNewGroup: ["New group", "Nouveau groupe"],
  keptNewName: ["Name of the new group", "Nom du nouveau groupe"],
  keptNewPlaceholder: ["Family, Clients…", "Famille, Clients…"],
  keptAdd: ["Add", "Ajouter"],
  keptIntro: [
    "Sort your charts into groups of your own, such as Family or Clients. A chart can be in several.",
    "Rangez vos thèmes en groupes à vous, comme Famille ou Clients. Un thème peut être dans plusieurs.",
  ],
  keptSuggestFamily: ["Family", "Famille"],
  keptSuggestFriends: ["Friends", "Amis"],
  keptSuggestClients: ["Clients", "Clients"],
  keptSuggestAdd: ["Add the group {name}", "Ajouter le groupe {name}"],
  keptRename: ["Rename {name}", "Renommer {name}"],
  keptRenameField: ["New name for {name}", "Nouveau nom pour {name}"],
  keptSave: ["Save", "Enregistrer"],
  keptUp: ["Move {name} up", "Monter {name}"],
  keptDown: ["Move {name} down", "Descendre {name}"],
  keptDelete: ["Delete the group {name}", "Supprimer le groupe {name}"],
  keptDeleteAsk: ["Delete “{name}”? Its charts stay.", "Supprimer «\u202f{name}\u202f»\u202f? Ses thèmes restent."],
  keptDeleteYes: ["Delete", "Supprimer"],
  keptKeep: ["Keep", "Garder"],
  keptDeleted: ["“{name}” deleted. Its charts stay.", "«\u202f{name}\u202f» supprimé. Ses thèmes restent."],
  keptTaken: ["A group already has this name.", "Un groupe porte déjà ce nom."],
  keptFull: ["24 groups at most.", "24 groupes au plus."],
  keptEmptyName: ["Give the group a name.", "Donnez un nom au groupe."],
  keptInNotes: ["Found in their notes", "Trouvés dans leurs notes"],
  keptSearchNotes: ["Search notes too", "Chercher aussi dans les notes"],
  keptNotesPlaceholder: ["Read on 12 Oct; asked about work.", "Lu le 12 oct.\u202f; question sur le travail."],
  keptNotesHint: [
    "Only you can read them: kept in your private space, encrypted on this device, never sent and never in a share.",
    "Vous seul pouvez les lire\u202f: gardées dans votre espace privé, chiffrées sur cet appareil, jamais envoyées ni partagées.",
  ],
  keptNotesSavedAt: ["Kept at {time}.", "Gardées à {time}."],
  keptNotesSavedOn: ["Kept on {date}.", "Gardées le {date}."],
  keptNotesStamp: ["Today’s date", "Date du jour"],
  keptNotesStampLabel: ["Write today’s date in the notes", "Écrire la date du jour dans les notes"],
  keptNotesCount: ["{n} of {max} characters", "{n} sur {max} caractères"],
} as const satisfies Record<string, readonly [string, string]>;
