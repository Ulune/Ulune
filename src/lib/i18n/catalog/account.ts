/** account: [English, French]. */
export const account = {
  saveCustom: ["Save view", "Enregistrer la vue"],
  dataTitle: ["Your data", "Vos données"],
  dataLead: [
    "Ulune has no accounts and keeps nothing about you on its server. This is everything it keeps, and everything that leaves this device.",
    "Ulune n’a pas de comptes et ne garde rien de vous sur son serveur. Voici tout ce qu’il garde, et tout ce qui quitte cet appareil.",
  ],
  dataPrivacy: ["Read the privacy notice", "Lire la politique de confidentialité"],
  dataHereTitle: ["In this browser", "Dans ce navigateur"],
  dataHere: [
    "Display settings only, in the clear: theme, language, Looks and views ({n} kept now).",
    "Des réglages d’affichage seulement, en clair : thème, langue, looks et vues ({n} gardés pour l’instant).",
  ],
  dataSpaceTitle: ["In your private space", "Dans votre espace privé"],
  dataSpaceOpen: [
    "Your charts, partners and AI keys, encrypted, on this device only. Backups you download are encrypted too.",
    "Vos thèmes, partenaires et clés IA, chiffrés, sur cet appareil seulement. Les sauvegardes que vous téléchargez sont chiffrées aussi.",
  ],
  dataSpaceLocked: [
    "Your charts, partners and AI keys, encrypted and locked, on this device only.",
    "Vos thèmes, partenaires et clés IA, chiffrés et verrouillés, sur cet appareil seulement.",
  ],
  dataSpaceNone: [
    "Nothing: there is no private space here. Charts stay in the open tab and go when it closes.",
    "Rien : il n’y a pas d’espace privé ici. Les thèmes restent dans l’onglet ouvert et partent à sa fermeture.",
  ],
  dataSpaceUnavailable: [
    "Nothing: this browser can’t keep a private space. Charts stay in the open tab and go when it closes.",
    "Rien : ce navigateur ne peut pas garder d’espace privé. Les thèmes restent dans l’onglet ouvert et partent à sa fermeture.",
  ],
  dataServerTitle: ["Sent to Ulune’s server", "Envoyé au serveur d’Ulune"],
  dataServer: [
    "The date, time and coordinates of each chart and view it calculates, and the places you search for, which it looks up with Open-Meteo’s place finder without your IP address. It answers and keeps nothing; names never leave this device.",
    "La date, l’heure et les coordonnées de chaque thème et de chaque vue qu’il calcule, et les lieux que vous cherchez, qu’il trouve avec le service de lieux d’Open-Meteo sans votre adresse IP. Il répond et ne garde rien ; les noms ne quittent jamais cet appareil.",
  ],
  dataAiTitle: ["Sent to an AI", "Envoyé à une IA"],
  dataAi: [
    "Only if you add your own key: a chart’s positions, never a name, date or place, from this browser to the provider you chose (Grok through Ulune’s server, which keeps nothing).",
    "Seulement si vous ajoutez votre propre clé : les positions d’un thème, jamais un nom, une date ou un lieu, depuis ce navigateur vers le fournisseur choisi (Grok via le serveur d’Ulune, qui ne garde rien).",
  ],
  dataNeverTitle: ["Never", "Jamais"],
  dataNever: [
    "No account, no cookie, no analytics, no advertising.",
    "Pas de compte, pas de cookie, pas de mesure d’audience, pas de publicité.",
  ],
  dataExport: ["Download a readable copy", "Télécharger une copie lisible"],
  dataExportHint: [
    "The readable copy holds your display settings, and your charts and partners while your space is open, in a file anyone can read: keep it private. AI keys are never in it.",
    "La copie lisible contient vos réglages d’affichage, et vos thèmes et partenaires quand votre espace est ouvert, dans un fichier que tout le monde peut lire : gardez-le pour vous. Les clés IA n’y sont jamais.",
  ],
  dataExported: ["Data downloaded", "Données téléchargées"],
  dataWipe: ["Erase everything on this device", "Tout effacer de cet appareil"],
  dataWipeConfirm: [
    "This erases your private space (charts, partners, AI keys), your settings and the offline copy of Ulune from this browser. It can’t be undone; a backup you downloaded still opens.",
    "Cela efface de ce navigateur votre espace privé (thèmes, partenaires, clés IA), vos réglages et la copie hors ligne d’Ulune. C’est définitif ; une sauvegarde téléchargée s’ouvre toujours.",
  ],
  dataWipeGo: ["Erase everything", "Tout effacer"],
  dataErased: [
    "Everything Ulune kept on this device is erased.",
    "Tout ce qu’Ulune gardait sur cet appareil est effacé.",
  ],
  dataOffline: [
    "Keep Ulune on this device",
    "Garder Ulune sur cet appareil",
  ],
  dataOfflineHint: [
    " — it opens without waiting, and saved charts open offline. Only the app’s own files are kept.",
    " — il s’ouvre sans attendre, et les thèmes enregistrés s’ouvrent hors ligne. Seuls les fichiers de l’app sont gardés.",
  ],
  offlineOfferTitle: ["Keep Ulune on this device?", "Garder Ulune sur cet appareil ?"],
  offlineOfferBody: [
    "It then opens without waiting, and your saved charts open even without a connection. Only the app’s own files are kept; nothing about you is sent anywhere.",
    "Il s’ouvre alors sans attendre, et vos thèmes enregistrés s’ouvrent même sans connexion. Seuls les fichiers de l’app sont gardés ; rien de vous n’est envoyé nulle part.",
  ],
  offlineOfferYes: ["Keep it", "Le garder"],
  offlineOfferNo: ["No thanks", "Non merci"],
  offlineOn: ["Ulune is kept on this device", "Ulune est gardé sur cet appareil"],
  offlineOff: ["Ulune is no longer kept on this device", "Ulune n’est plus gardé sur cet appareil"],
} as const satisfies Record<string, readonly [string, string]>;
