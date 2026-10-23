/**
 * data-words: [English, French]. Words said only by your-data.tsx, kept
 * out of the app's catalog (index.ts) so they load with that code instead of
 * with every page's first download (the first-load trim, 13 Oct 2026). Read
 * through bookT (src/lib/i18n/words-book.ts); scripts/i18n-catalog.test.mjs
 * holds them to the catalog's rules.
 */
export const dataWords = {
  dataLead: [
    "Ulune needs no account and, unless you sync your space, keeps nothing about you on its server. This is everything it keeps, and everything that leaves this device.",
    "Ulune ne demande aucun compte et, sauf si vous synchronisez votre espace, ne conserve aucune donnée vous concernant sur son serveur. Voici tout ce qu’il garde, et tout ce qui quitte cet appareil.",
  ],
  dataPrivacy: ["Read the privacy notice", "Lire la politique de confidentialité"],
  dataHereTitle: ["In this browser", "Dans ce navigateur"],
  dataHere: [
    "Display settings only, in the clear: appearance, language, looks and views ({n} kept now). In the browser’s cache, once a chart has been calculated here: the calculations’ files and the sky they worked out, the same for everyone.",
    "Des réglages d’affichage seulement, en clair\u202f: apparence, langue, styles et vues ({n} gardés pour l’instant). Dans le cache du navigateur, dès qu’un thème a été calculé ici\u202f: les fichiers de calcul et le ciel qu’ils ont calculé, les mêmes pour tous.",
  ],
  dataSpaceTitle: ["In your private space", "Dans votre espace privé"],
  dataSpaceOpen: [
    "Your charts and partners, your encyclopedia bookmarks and notes, the homes you keep, encrypted, on this device only. Backups you download are encrypted too.",
    "Vos thèmes et partenaires, vos marque-pages et notes de l’encyclopédie, les logements que vous gardez, chiffrés, sur cet appareil seulement. Les sauvegardes que vous téléchargez sont chiffrées aussi.",
  ],
  dataSpaceLocked: [
    "Your charts and partners, your encyclopedia bookmarks and notes, the homes you keep, encrypted and locked, on this device.",
    "Vos thèmes et partenaires, vos marque-pages et notes de l’encyclopédie, les logements que vous gardez, chiffrés et verrouillés, sur cet appareil.",
  ],
  // The synced account (share and compare plan, feature 4): the space's other copy, and what it is.
  dataSpaceOpenSynced: [
    "Your charts and partners, your encyclopedia bookmarks and notes, the homes you keep, encrypted, on this device and on your other devices that sync with it.",
    "Vos thèmes et partenaires, vos marque-pages et notes de l’encyclopédie, les logements que vous gardez, chiffrés, sur cet appareil et sur vos autres appareils synchronisés avec lui.",
  ],
  dataSyncTitle: ["Synced through Ulune’s server", "Synchronisé par le serveur d’Ulune"],
  dataSyncOn: [
    "Your space’s records as sealed boxes the server can’t open, their names hidden and their sizes rounded up, with the day each changed; your devices, their names sealed, and the days they joined and were last seen; a random number for the account, never an email. In Frankfurt, in the EU. Deleted at once when you stop syncing or delete the account, or after two years unused.",
    "Les enregistrements de votre espace en boîtes scellées que le serveur ne peut pas ouvrir, leurs noms cachés et leurs tailles arrondies, avec le jour où chacun a changé\u202f; vos appareils, leurs noms scellés, et les jours où ils ont rejoint le compte et ont été vus pour la dernière fois\u202f; un nombre tiré au hasard pour le compte, jamais un e-mail. À Francfort, dans l’UE. Effacés immédiatement quand vous arrêtez la synchronisation ou supprimez le compte, ou après deux ans sans usage.",
  ],
  dataSyncOff: [
    "Nothing: your space is on this device only. Sync stays off unless you turn it on, under Private space.",
    "Rien\u202f: votre espace est sur cet appareil seulement. La synchronisation reste désactivée tant que vous ne l’activez pas, sous Espace privé.",
  ],
  dataWipeSynced: [
    "This device also leaves your synced account; the account and its sealed copy stay for your other devices (delete them under Private space).",
    "Cet appareil quitte aussi votre compte synchronisé\u202f; le compte et sa copie scellée restent pour vos autres appareils (supprimez-les sous Espace privé).",
  ],
  dataSpaceNone: [
    "Nothing: there is no private space here. Charts stay in the open tab and go when it closes.",
    "Rien\u202f: il n’y a pas d’espace privé ici. Les thèmes restent dans l’onglet ouvert et sont effacés à sa fermeture.",
  ],
  dataSpaceUnavailable: [
    "Nothing: this browser can’t keep a private space. Charts stay in the open tab and go when it closes.",
    "Rien\u202f: ce navigateur ne peut pas garder d’espace privé. Les thèmes restent dans l’onglet ouvert et sont effacés à sa fermeture.",
  ],
  dataServerTitle: ["Sent to Ulune’s server", "Envoyé au serveur d’Ulune"],
  // Where charts are calculated (Settings; on-device plan, step 7): this device by default, or the server.
  dataServer: [
    "The places you search for, which it looks up with Open-Meteo’s place finder without your IP address, and coordinates you type, alone, to find their time zone. Charts are calculated on this device: no date or time goes there. It keeps nothing about you: only the finder’s answers stay in its memory, for a day at most, under the words searched. Names never leave this device.",
    "Les lieux que vous cherchez, qu’il trouve avec le service de lieux d’Open-Meteo sans votre adresse IP, et les coordonnées que vous tapez, seules, pour trouver leur fuseau horaire. Les thèmes sont calculés sur cet appareil\u202f: aucune date ni heure n’y part. Il ne conserve aucune donnée vous concernant\u202f: seules les réponses du service restent dans sa mémoire, un jour au plus, sous les mots cherchés. Les noms ne quittent jamais cet appareil.",
  ],
  dataServerCalc: [
    "Charts are calculated there, as chosen in Settings: the date, time and coordinates of each chart and view, and the places you search for, which it looks up with Open-Meteo’s place finder without your IP address. It keeps nothing about you: only the finder’s answers stay in its memory, for a day at most, under the words searched. Names never leave this device.",
    "Les thèmes y sont calculés, comme choisi dans les Réglages\u202f: la date, l’heure et les coordonnées de chaque thème et de chaque vue, et les lieux que vous cherchez, qu’il trouve avec le service de lieux d’Open-Meteo sans votre adresse IP. Il ne conserve aucune donnée vous concernant\u202f: seules les réponses du service restent dans sa mémoire, un jour au plus, sous les mots cherchés. Les noms ne quittent jamais cet appareil.",
  ],
  dataAiTitle: ["Sent to an AI", "Envoyé à une IA"],
  dataAi: [
    "Only if you add your own key: a chart’s positions, never a name, date or place, from this browser to the provider you chose (Grok through Ulune’s server, which keeps nothing).",
    "Seulement si vous ajoutez votre propre clé\u202f: les positions d’un thème, jamais un nom, une date ou un lieu, depuis ce navigateur vers le fournisseur choisi (Grok via le serveur d’Ulune, qui ne garde rien).",
  ],
  dataNeverTitle: ["Never", "Jamais"],
  dataNever: [
    "No cookies, no analytics, no advertising; no account unless you turn on sync, and then no email and no name.",
    "Pas de cookies, pas de mesure d’audience, pas de publicité\u202f; pas de compte sauf si vous activez la synchronisation, et alors ni e-mail ni nom.",
  ],
  dataExport: ["Download a readable copy", "Télécharger une copie lisible"],
  dataExportHint: [
    "The readable copy holds your display settings, and your charts, partners, groups, bookmarks, notes and homes while your space is open, in a file anyone can read: keep it private.",
    "La copie lisible contient vos réglages d’affichage, et vos thèmes, partenaires, groupes, marque-pages, notes et logements quand votre espace est ouvert, dans un fichier que tout le monde peut lire\u202f: gardez-le pour vous.",
  ],
  dataExported: ["Data downloaded", "Données téléchargées"],
  dataWipe: ["Erase everything on this device", "Tout effacer de cet appareil"],
  dataWipeConfirm: [
    "This erases your private space (charts, partners, bookmarks, notes and homes), your settings and the offline copy of Ulune from this browser. It can’t be undone; a backup you downloaded still opens.",
    "Cela efface de ce navigateur votre espace privé (thèmes, partenaires, marque-pages, notes et logements), vos réglages et la copie hors ligne d’Ulune. C’est définitif\u202f; une sauvegarde téléchargée s’ouvre toujours.",
  ],
  dataWipeGo: ["Erase everything", "Tout effacer"],
  dataOffline: [
    "Keep Ulune on this device",
    "Garder Ulune sur cet appareil",
  ],
  dataOfflineHint: [
    " — it opens without waiting, and saved charts, the calendar months and the encyclopedia’s pages you’ve opened work offline. Only the app’s own files, the sky of those dates and those pages (the same for everyone) are kept.",
    " — il s’ouvre sans attendre, et les thèmes enregistrés, les mois du calendrier et les pages de l’encyclopédie déjà ouverts marchent hors ligne. Seuls les fichiers de l’app, le ciel de ces dates et ces pages (les mêmes pour tous) sont gardés.",
  ],
  offlineOff: ["Ulune is no longer kept on this device", "Ulune n’est plus gardé sur cet appareil"],
  dataReportsTitle: ["Error reports", "Rapports d’erreur"],
  dataReports: [
    "If the page breaks, it tells Ulune’s server what failed: the error with every number hidden, where in the code, the page and the version. Never a chart, a date, a place or an address.",
    "Si la page plante, elle indique au serveur d’Ulune ce qui a échoué\u202f: l’erreur avec chaque chiffre masqué, l’endroit du code, la page et la version. Jamais un thème, une date, un lieu ni une adresse.",
  ],
  dataReportsSwitch: ["Send error reports", "Envoyer les rapports d’erreur"],
  dataReportsSwitchHint: [" — anonymous, so what breaks gets fixed.", " — anonymes, pour que ce qui casse soit réparé."],
  reportsOn: ["Error reports on", "Rapports d’erreur activés"],
  reportsOff: ["Error reports off", "Rapports d’erreur désactivés"],
} as const satisfies Record<string, readonly [string, string]>;
