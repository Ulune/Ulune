/**
 * share-words: [English, French]. The words of sharing a chart by link
 * (share plan, feature 1, and idea B1's QR code): the share sheet
 * (components/share/share-sheet.tsx), the notes when a shared chart arrives
 * (components/share/arrival-note.tsx, lib/share/arrive.ts, lib/space/inbox.ts)
 * and the /s page (components/share/share-landing.tsx). Kept out of the app's
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
} as const;
