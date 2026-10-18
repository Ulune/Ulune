/**
 * share-words: [English, French]. The words of sharing a chart by link
 * (share plan, feature 1, and idea B1's QR code): the share sheet
 * (components/share/share-sheet.tsx), the notes when a shared chart arrives
 * (components/share/arrival-note.tsx, lib/share/arrive.ts, lib/space/inbox.ts)
 * and the /s page (components/share/share-landing.tsx); and of asking for
 * someone's chart (idea B4): the asker's sheet, the request above the
 * recipient's birth form and the card that sends it back. Kept out of the app's
 * catalog (index.ts) so they load with that code, not with every page's first
 * download; read through bookT (src/lib/i18n/words-book.ts) or directly.
 * scripts/share-link.test.mjs holds them to the catalog's rules.
 */
export const shareWords = {
  shareWhich: ["What to share", "Quoi partager"],
  shareOne: ["This chart", "Ce thème"],
  shareBoth: ["Both charts", "Les deux thèmes"],
  shareContains: ["The link holds", "Le lien contient"],
  shareName: ["The name", "Le nom"],
  shareNameHint: ["With numerology’s names, if any", "Avec les noms de la numérologie, s’il y en a"],
  sharePlace: ["The place’s name", "Le nom du lieu"],
  sharePlaceHint: ["Its coordinates always go: the chart needs them", "Ses coordonnées partent toujours\u202f: le thème en a besoin"],
  shareOpensOn: ["Opens on: {page}", "S’ouvre sur\u202f: {page}"],
  sharePrivacy: [
    "Anyone with this link can see this chart. The link never passes through Ulune’s server.",
    "Toute personne qui a ce lien peut voir ce thème. Le lien ne passe jamais par le serveur d’Ulune.",
  ],
  sharePrivacyBoth: [
    "Anyone with this link can see these two charts. The link never passes through Ulune’s server.",
    "Toute personne qui a ce lien peut voir ces deux thèmes. Le lien ne passe jamais par le serveur d’Ulune.",
  ],
  shareSend: ["Share", "Partager"],
  shareCopy: ["Copy link", "Copier le lien"],
  shareCopied: ["Copied", "Copié"],
  shareCopyFailed: ["Couldn’t copy: select the link and copy it.", "Copie impossible\u202f: sélectionnez le lien et copiez-le."],
  shareLinkLabel: ["The link", "Le lien"],
  shareQrLabel: ["QR code of the link", "Code QR du lien"],
  shareQrHint: [
    "Someone next to you can scan it with their phone’s camera.",
    "Une personne à côté de vous peut le scanner avec l’appareil photo de son téléphone.",
  ],
  shareMaking: ["Making the link…", "Création du lien…"],
  shareFailed: ["The link couldn’t be made.", "Le lien n’a pas pu être créé."],
  shareClose: ["Close", "Fermer"],

  shareKept: ["{name}’s chart is now in your private space.", "Le thème de {name} est maintenant dans votre espace privé."],
  shareKeptUnnamed: ["The chart shared with you is now in your private space.", "Le thème partagé avec vous est maintenant dans votre espace privé."],
  shareKeptBoth: ["The two charts shared with you are now in your private space.", "Les deux thèmes partagés avec vous sont maintenant dans votre espace privé."],
  shareAlready: ["{name}’s chart was already in your private space.", "Le thème de {name} était déjà dans votre espace privé."],
  shareAlreadyUnnamed: ["This chart was already in your private space.", "Ce thème était déjà dans votre espace privé."],
  shareLater: [
    "This chart will be saved to your private space when you unlock it.",
    "Ce thème sera enregistré dans votre espace privé quand vous le déverrouillerez.",
  ],
  shareLaterBoth: [
    "These charts will be saved to your private space when you unlock it.",
    "Ces thèmes seront enregistrés dans votre espace privé quand vous le déverrouillerez.",
  ],
  shareUnlockToKeep: ["Unlock your private space to keep it.", "Déverrouillez votre espace privé pour le garder."],
  shareUnlockToKeepBoth: ["Unlock your private space to keep them.", "Déverrouillez votre espace privé pour les garder."],
  shareOffer: [
    "Keep this chart: create your private space, free, on this device, encrypted.",
    "Gardez ce thème\u202f: créez votre espace privé, gratuit, sur cet appareil, chiffré.",
  ],
  shareOfferBoth: [
    "Keep these charts: create your private space, free, on this device, encrypted.",
    "Gardez ces thèmes\u202f: créez votre espace privé, gratuit, sur cet appareil, chiffré.",
  ],
  shareOfferNote: [
    "Without it, what was shared goes when you close this tab; the link keeps working.",
    "Sans lui, ce qui a été partagé s’en va quand vous fermez cet onglet\u202f; le lien reste valable.",
  ],
  shareOfferCreate: ["Create my private space", "Créer mon espace privé"],
  shareUnlock: ["Unlock", "Déverrouiller"],
  shareNotNow: ["Not now", "Pas maintenant"],
  shareNoteLabel: ["About what was shared with you", "À propos de ce qui a été partagé avec vous"],
  shareAddedOne: ["1 chart shared with you was added to your private space.", "1 thème partagé avec vous a été ajouté à votre espace privé."],
  shareAddedMany: [
    "{count} charts shared with you were added to your private space.",
    "{count} thèmes partagés avec vous ont été ajoutés à votre espace privé.",
  ],

  sharePageTitle: ["A chart shared with you", "Un thème partagé avec vous"],
  shareOpening: ["Opening the chart shared with you…", "Ouverture du thème partagé avec vous…"],
  shareBrokenTitle: ["This link doesn’t open a chart", "Ce lien n’ouvre pas de thème"],
  shareBrokenBody: [
    "It may have been cut short when it was copied. Ask the person who sent it for the link again.",
    "Il a peut-être été coupé lors de la copie. Redemandez le lien à la personne qui vous l’a envoyé.",
  ],
  shareNewerBody: [
    "It was made by a newer version of Ulune. Reload this page, then open the link again.",
    "Il a été créé par une version plus récente d’Ulune. Rechargez cette page, puis rouvrez le lien.",
  ],
  shareFailedTitle: ["The chart couldn’t be opened", "Le thème n’a pas pu être ouvert"],
  shareFailedBody: ["Check your connection, then try again.", "Vérifiez votre connexion, puis réessayez."],
  shareRetry: ["Try again", "Réessayer"],
  shareOpenUlune: ["Open Ulune", "Ouvrir Ulune"],

  // Asking for someone's chart (idea B4): the asker's sheet (ask-sheet.tsx).
  askTitle: ["Ask for someone’s chart", "Demander le thème de quelqu’un"],
  askIntro: [
    "A link that opens Ulune’s birth form for them. Once they’ve cast their chart, one tap sends it back to you: you never type their birth details, and they choose their own birthplace.",
    "Un lien qui ouvre pour la personne le formulaire de naissance d’Ulune. Une fois son thème calculé, elle vous le renvoie d’un geste\u202f: vous n’avez jamais à saisir ses données de naissance, et elle choisit elle-même son lieu de naissance.",
  ],
  askSayName: ["Say it’s you", "Dire que c’est vous"],
  askSayNameHint: ["Your first name goes in the link, so they know who’s asking", "Votre prénom part dans le lien, pour que la personne sache qui demande"],
  askNameLabel: ["Your first name", "Votre prénom"],
  askTheySee: ["They’ll see", "La personne verra"],
  askOpensOn: ["Their chart opens on: {page}", "Son thème s’ouvrira sur\u202f: {page}"],
  askPrivacy: [
    "The link holds no birth details, only your request. What they type stays with them until they choose to send it back.",
    "Le lien ne contient aucune donnée de naissance, seulement votre demande. Ce que la personne saisit reste chez elle tant qu’elle ne choisit pas de vous le renvoyer.",
  ],
  askQrHint: [
    "Someone next to you can scan it and fill in the form on their own phone.",
    "Une personne à côté de vous peut le scanner et remplir le formulaire sur son propre téléphone.",
  ],

  // The request, on the recipient's side: above the birth form (request-head.tsx), on the way there (share-landing.tsx), then the card to send it back (reply-card.tsx) and the share sheet's line.
  requestHead: ["{name} asked for your chart", "{name} vous demande votre thème"],
  requestHeadAnon: ["Someone asked you for your chart", "Quelqu’un vous demande votre thème"],
  requestHeadLine: [
    "Fill in your birth details and cast your chart; then one tap sends it back. It goes to no one until you choose to send it.",
    "Remplissez vos données de naissance et calculez votre thème\u202f; un geste suffit ensuite pour le renvoyer. Il ne part chez personne tant que vous ne choisissez pas de l’envoyer.",
  ],
  requestDismiss: ["Set the request aside", "Mettre la demande de côté"],
  requestOpening: ["Opening the birth form…", "Ouverture du formulaire de naissance…"],
  replyMain: ["Your chart is ready to send back to {name}.", "Votre thème est prêt à être renvoyé à {name}."],
  replyMainAnon: ["Your chart is ready to send back.", "Votre thème est prêt à être renvoyé."],
  replyNote: [
    "It goes as a link, as Share and export makes one: you see what it holds before it goes.",
    "Il part sous forme de lien, comme avec Partager et exporter\u202f: vous voyez ce qu’il contient avant qu’il parte.",
  ],
  replySend: ["Send it back", "Le renvoyer"],
  replyLabel: ["Your chart, asked for", "Votre thème, demandé"],
  shareReplyTo: ["For {name}, who asked for your chart", "Pour {name}, qui vous a demandé votre thème"],
  shareReplyToAnon: ["For the person who asked for your chart", "Pour la personne qui vous a demandé votre thème"],
} as const;
