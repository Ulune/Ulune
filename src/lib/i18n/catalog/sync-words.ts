/**
 * sync-words: [English, French]. The synced account's words (share and compare plan, feature 4):
 * the choice when a private space is made, a new device signing in, a device added by QR code,
 * turning sync on and off, deleting the account, and its part of Settings › Private space. Kept
 * out of the app's catalog so they load with the code that says them (the space's sheet and
 * settings, the /link page). Read through bookT (src/lib/i18n/words-book.ts);
 * scripts/i18n-catalog.test.mjs holds them to the catalog's rules.
 */
export const syncWords = {
  // The choice when a space is made (decision A4: this device only by default, sync one tap away).
  syncWhere: ["Where it’s kept", "Où il est gardé"],
  syncHereOnly: ["On this device only", "Sur cet appareil seulement"],
  syncHereOnlyBody: [
    "Your charts stay in this browser, encrypted. Nothing goes to Ulune’s server; another of your devices gets a copy only if you send it one.",
    "Vos thèmes restent dans ce navigateur, chiffrés. Rien ne part vers le serveur d’Ulune\u202f; un autre de vos appareils n’en reçoit une copie que si vous la lui envoyez.",
  ],
  syncEverywhere: ["On this device and my other devices", "Sur cet appareil et mes autres appareils"],
  syncEverywhereBody: [
    "Ulune’s server keeps a copy in sealed boxes it can’t open, so your devices stay in step. No email, no name: an account is a random number, deleted after two years unused. If you lose every device, your passphrase and your recovery code, nobody can open your data, Ulune included.",
    "Le serveur d’Ulune en garde une copie dans des boîtes scellées qu’il ne peut pas ouvrir, pour que vos appareils restent à jour. Ni e-mail ni nom\u202f: un compte est un nombre tiré au hasard, supprimé après deux ans sans usage. Si vous perdez tous vos appareils, votre phrase secrète et votre code de récupération, personne ne peut ouvrir vos données, Ulune compris.",
  ],
  syncNotStarted: [
    "Your space is ready on this device. Sync couldn’t start (Ulune’s server can’t be reached): turn it on in Settings › Private space once you’re online.",
    "Votre espace est prêt sur cet appareil. La synchronisation n’a pas pu démarrer (le serveur d’Ulune est injoignable)\u202f: activez-la dans Réglages › Espace privé une fois en ligne.",
  ],
  syncCodeBody: [
    "This code opens your space on any device and is the way back if you forget your passphrase or lose your passkey. Write it down or keep it somewhere safe: Ulune can’t show it again.",
    "Ce code ouvre votre espace sur n’importe quel appareil et vous permet de revenir si vous oubliez votre phrase secrète ou perdez votre clé d’accès. Notez-le ou gardez-le en lieu sûr\u202f: Ulune ne pourra pas vous le remontrer.",
  ],
  syncAccountId: ["Account id", "Identifiant du compte"],
  syncAccountIdHint: [
    "A new device asks for it with your passphrase. It’s also in Settings › Private space.",
    "Un nouvel appareil le demande avec votre phrase secrète. Il est aussi dans Réglages › Espace privé.",
  ],
  syncCopyId: ["Copy the id", "Copier l’identifiant"],

  // A new device signing in.
  syncJoinTitle: ["Sign in on this device", "Vous connecter sur cet appareil"],
  syncJoinBody: [
    "Your space is on another device? Bring it here one of these ways. If it syncs, this device syncs with it from now on.",
    "Votre espace est sur un autre appareil\u202f? Apportez-le ici par l’un de ces moyens. S’il se synchronise, cet appareil se synchronise avec lui désormais.",
  ],
  syncJoinMerge: [
    "This device’s own space is replaced by the synced one: its charts, groups, notes and homes are added to it, and it opens with the synced space’s passphrase, passkeys and recovery code.",
    "L’espace de cet appareil est remplacé par l’espace synchronisé\u202f: ses thèmes, groupes, notes et logements y sont ajoutés, et il s’ouvre avec la phrase secrète, les clés d’accès et le code de récupération de l’espace synchronisé.",
  ],
  syncJoinPasskey: ["Sign in with a passkey", "Se connecter avec une clé d’accès"],
  syncJoinQr: ["Use a QR code", "Utiliser un code QR"],
  syncJoinPass: ["Account id and passphrase", "Identifiant du compte et phrase secrète"],
  syncJoinCode: ["Recovery code", "Code de récupération"],
  syncJoinFile: ["A file from my other device", "Un fichier de mon autre appareil"],
  syncJoinPassBody: [
    "The account id is in Settings › Private space on your other device, and beside your recovery code.",
    "L’identifiant du compte est dans Réglages › Espace privé sur votre autre appareil, et à côté de votre code de récupération.",
  ],
  syncJoinCodeBody: [
    "The recovery code alone opens your synced space on this device.",
    "Le code de récupération suffit à ouvrir ici votre espace synchronisé.",
  ],
  syncJoining: ["Bringing your space here…", "Votre espace arrive…"],
  syncJoined: ["Your private space is here, synced with your other devices", "Votre espace privé est là, synchronisé avec vos autres appareils"],
  syncJoinedMerged: [
    "Your private space is here, synced, with this device’s charts added",
    "Votre espace privé est là, synchronisé, avec les thèmes de cet appareil en plus",
  ],
  syncWrongPass: [
    "That doesn’t open an account. Check the account id and the passphrase.",
    "Cela n’ouvre aucun compte. Vérifiez l’identifiant du compte et la phrase secrète.",
  ],
  syncWrongCode: ["That code doesn’t open an account. Check it and try again.", "Ce code n’ouvre aucun compte. Vérifiez-le et réessayez."],
  syncWrongPasskey: [
    "That passkey doesn’t open a synced space. Try another way.",
    "Cette clé d’accès n’ouvre aucun espace synchronisé. Essayez un autre moyen.",
  ],
  syncBadId: [
    "An account id is 26 letters and digits in groups of four, as your other device shows it.",
    "Un identifiant de compte comporte 26 lettres et chiffres par groupes de quatre, tel que votre autre appareil l’affiche.",
  ],
  syncNotReady: [
    "Your other device hasn’t finished setting up sync. Open Ulune there, wait a moment, and try again.",
    "Votre autre appareil n’a pas fini de mettre en place la synchronisation. Ouvrez Ulune là-bas, patientez un instant, puis réessayez.",
  ],
  syncOffline: [
    "Ulune’s server can’t be reached. Check your connection and try again.",
    "Le serveur d’Ulune est injoignable. Vérifiez votre connexion et réessayez.",
  ],
  syncSlowDown: ["Too many tries. Wait a few minutes and try again.", "Trop d’essais. Attendez quelques minutes et réessayez."],
  // While Ulune's server keeps no accounts yet (the 2.0 fixes, item 4): said plainly where sync would be offered, once.
  syncNotYet: ["Syncing with your other devices isn’t available yet.", "La synchronisation avec vos autres appareils n’est pas encore disponible."],
  syncNotYetFile: [
    "A sealed file from your other device still brings its space here.",
    "Un fichier scellé de votre autre appareil apporte quand même son espace ici.",
  ],
  syncNotYetHint: [
    "Your space stays on this device; to open it on another, send that device a sealed copy.",
    "Votre espace reste sur cet appareil\u202f; pour l’ouvrir sur un autre, envoyez à cet appareil une copie scellée.",
  ],
  syncUnlockFirst: [
    "Unlock this device’s private space first: its charts then join the synced one.",
    "Déverrouillez d’abord l’espace privé de cet appareil\u202f: ses thèmes rejoignent ensuite l’espace synchronisé.",
  ],

  // Turning sync on, from Settings.
  syncOnTitle: ["Sync with your other devices", "Synchroniser avec vos autres appareils"],
  syncOnCode: [
    "Turning it on makes a new recovery code, for this space and the account: the one you have now stops working.",
    "L’activer crée un nouveau code de récupération, pour cet espace et le compte\u202f: celui que vous avez maintenant cesse de fonctionner.",
  ],
  syncOnStart: ["Turn on sync", "Activer la synchronisation"],
  syncConfirmBody: [
    "Confirm it’s you with one of the ways your space opens.",
    "Confirmez que c’est vous avec l’un des moyens qui ouvrent votre espace.",
  ],
  syncPassTitle: ["Your passphrase", "Votre phrase secrète"],
  syncPassBody: [
    "Your other devices sign in with it too, with your account id.",
    "Vos autres appareils se connectent aussi avec elle, avec l’identifiant de votre compte.",
  ],
  syncKeyTitle: ["How your other devices sign in", "Comment vos autres appareils se connectent"],
  syncKeyBody: [
    "A passkey kept by your iCloud or Google password manager signs them in by itself. Or choose a passphrase, which they use with your account id.",
    "Une clé d’accès gardée par votre gestionnaire de mots de passe iCloud ou Google les connecte d’elle-même. Ou choisissez une phrase secrète, qu’ils utilisent avec l’identifiant de votre compte.",
  ],
  syncTurningOn: ["Setting up sync…", "Mise en place de la synchronisation…"],
  syncOnDone: ["Your space syncs with your other devices", "Votre espace se synchronise avec vos autres appareils"],

  // Turning it off, deleting the account.
  syncOffTitle: ["Stop syncing and delete the server copy", "Arrêter la synchronisation et supprimer la copie du serveur"],
  syncOffBody: [
    "Ulune deletes your account and everything it holds on its server, at once. This device keeps its private space; your other devices stop syncing and keep what they have. It can’t be undone.",
    "Ulune supprime votre compte et tout ce qu’il contient sur son serveur, immédiatement. Cet appareil garde son espace privé\u202f; vos autres appareils cessent de se synchroniser et gardent ce qu’ils ont. C’est définitif.",
  ],
  syncOffDone: ["Sync is off and the server copy is deleted", "La synchronisation est arrêtée et la copie du serveur supprimée"],
  syncDeleteTitle: ["Delete my account", "Supprimer mon compte"],
  syncDeleteBody: [
    "Ulune deletes your account and everything it holds on its server, at once. Your other devices stop syncing and keep what they have. It can’t be undone.",
    "Ulune supprime votre compte et tout ce qu’il contient sur son serveur, immédiatement. Vos autres appareils cessent de se synchroniser et gardent ce qu’ils ont. C’est définitif.",
  ],
  syncDeleteKeep: ["Keep the private space on this device", "Garder l’espace privé sur cet appareil"],
  syncDeleteErase: ["Erase it from this device too", "L’effacer aussi de cet appareil"],
  syncDeleted: ["Your account is deleted", "Votre compte est supprimé"],
  syncDeletedErased: ["Your account and this device’s space are deleted", "Votre compte et l’espace de cet appareil sont supprimés"],
  syncDeleting: ["Deleting…", "Suppression…"],
  syncPausedFirst: [
    "Sync is paused on this device: sign in again first, or stop syncing here.",
    "La synchronisation est en pause sur cet appareil\u202f: reconnectez-vous d’abord, ou arrêtez la synchronisation ici.",
  ],
  syncNotAccountPasskey: [
    "That passkey opens your space on this device only. Confirm with your passphrase or your recovery code.",
    "Cette clé d’accès n’ouvre votre espace que sur cet appareil. Confirmez avec votre phrase secrète ou votre code de récupération.",
  ],

  // Settings › Private space, the sync part.
  syncTitle: ["Sync", "Synchronisation"],
  syncOffLine: ["This space is on this device only.", "Cet espace est sur cet appareil seulement."],
  syncOffHint: [
    "Turn on sync to open it on your phone and your computer: Ulune’s server keeps sealed boxes it can’t open, deleted after two years unused.",
    "Activez la synchronisation pour l’ouvrir sur votre téléphone et votre ordinateur\u202f: le serveur d’Ulune garde des boîtes scellées qu’il ne peut pas ouvrir, supprimées après deux ans sans usage.",
  ],
  syncTurnOn: ["Sync with my other devices", "Synchroniser avec mes autres appareils"],
  syncJoinOther: ["Join my other devices’ space", "Rejoindre l’espace de mes autres appareils"],
  syncStateOk: ["Synced · {when}", "Synchronisé · {when}"],
  syncJustNow: ["just now", "à l’instant"],
  syncMinutesAgo: ["{n} min ago", "il y a {n}\u00a0min"],
  syncHoursAgo: ["{n} h ago", "il y a {n}\u00a0h"],
  syncStateBusy: ["Syncing…", "Synchronisation…"],
  syncStateOffline: ["Waiting for the network", "En attente du réseau"],
  syncStatePaused: ["Sync paused: sign in again", "Synchronisation en pause\u202f: reconnectez-vous"],
  syncStateFull: ["Sync paused: your account is full", "Synchronisation en pause\u202f: votre compte est plein"],
  syncStateError: ["Sync will try again in a moment", "La synchronisation réessaiera dans un instant"],
  syncDevices: ["Signed-in devices", "Appareils connectés"],
  syncThisDevice: ["This device", "Cet appareil"],
  syncDeviceUnnamed: ["A device", "Un appareil"],
  syncDeviceDays: ["Added {added} · last seen {seen}", "Ajouté le {added} · vu le {seen}"],
  syncRemove: ["Remove", "Retirer"],
  syncRemoveNamed: ["Remove {name}", "Retirer {name}"],
  syncRemoveDeviceTitle: ["Remove this device?", "Retirer cet appareil\u202f?"],
  syncRemoveDeviceBody: [
    "{name} stops syncing at once. What it already holds stays on it, locked by its own ways in.",
    "{name} cesse de se synchroniser immédiatement. Ce qu’il contient déjà y reste, fermé par ses propres moyens d’accès.",
  ],
  syncDeviceRemoved: ["Device removed", "Appareil retiré"],
  syncRule: [
    "An account unused for two years is deleted, with everything in it. Ulune can’t warn you first: it has no email.",
    "Un compte inutilisé pendant deux ans est supprimé, avec tout ce qu’il contient. Ulune ne peut pas vous prévenir avant\u202f: il n’a pas d’e-mail.",
  ],
  syncCodeReminder: [
    "Keep your recovery code and your account id somewhere safe: with them, any device signs in, even if you lose this one.",
    "Gardez votre code de récupération et l’identifiant de votre compte en lieu sûr\u202f: avec eux, n’importe quel appareil se connecte, même si vous perdez celui-ci.",
  ],
  syncSignInAgain: ["Sign in again", "Vous reconnecter"],
  syncSignInAgainBody: [
    "This device was signed out of your account (removed from another device, or the account deleted). Sign in again to go on syncing, or stop syncing here: the space stays on this device either way.",
    "Cet appareil a été déconnecté de votre compte (retiré depuis un autre appareil, ou compte supprimé). Reconnectez-vous pour continuer la synchronisation, ou arrêtez-la ici\u202f: l’espace reste sur cet appareil dans les deux cas.",
  ],
  syncLeave: ["Stop syncing on this device", "Arrêter la synchronisation sur cet appareil"],
  syncLeft: ["This device no longer syncs; its space stays here", "Cet appareil ne se synchronise plus\u202f; son espace reste ici"],
  syncSignedInAgain: ["Signed in again: syncing", "Reconnecté\u202f: synchronisation en cours"],

  // Adding a device by QR code (section 8 of the protocol).
  syncAddBody: [
    "Your new device signs in with a QR code: scan it there with the camera, or open its link there. Both screens then show six digits to compare.",
    "Votre nouvel appareil se connecte avec un code QR\u202f: scannez-le là-bas avec l’appareil photo, ou ouvrez-y son lien. Les deux écrans affichent ensuite six chiffres à comparer.",
  ],
  syncAddQr: ["Use a QR code", "Utiliser un code QR"],
  syncAddFile: ["Send a sealed copy instead", "Envoyer plutôt une copie scellée"],
  syncAddFileHint: [
    "Without Ulune’s server: one sealed file, opened there with your passphrase, a passkey or the recovery code. It doesn’t sync.",
    "Sans le serveur d’Ulune\u202f: un seul fichier scellé, ouvert là-bas avec votre phrase secrète, une clé d’accès ou le code de récupération. Il ne se synchronise pas.",
  ],
  syncLinkGiverTitle: ["Scan this with your new device", "Scannez ceci avec votre nouvel appareil"],
  syncLinkGiverBody: [
    "With its camera, or open the link there. It works for ten minutes.",
    "Avec son appareil photo, ou ouvrez-y le lien. Il fonctionne pendant dix minutes.",
  ],
  syncLinkTakerTitle: ["Scan this with your signed-in device", "Scannez ceci avec votre appareil connecté"],
  syncLinkTakerBody: [
    "There, open the Private menu, then Add another device › Use a QR code, and scan this or paste its link. That device’s camera can scan it too. It works for ten minutes.",
    "Là-bas, ouvrez le menu Privé, puis Ajouter un autre appareil › Utiliser un code QR, et scannez ceci ou collez son lien. Son appareil photo peut aussi le scanner. Il fonctionne pendant dix minutes.",
  ],
  syncLinkPaste: ["Or paste the link from your other device", "Ou collez le lien de votre autre appareil"],
  syncLinkPasteGo: ["Use this link", "Utiliser ce lien"],
  syncLinkScan: ["Scan with this device’s camera", "Scanner avec l’appareil photo de cet appareil"],
  syncLinkScanStop: ["Stop the camera", "Arrêter l’appareil photo"],
  syncLinkCameraHint: [
    "The camera only reads the code, here: nothing is recorded or sent.",
    "L’appareil photo ne fait que lire le code, ici\u202f: rien n’est enregistré ni envoyé.",
  ],
  syncLinkNoCamera: ["The camera can’t be used here. Open the link on the other device instead.", "L’appareil photo n’est pas utilisable ici. Ouvrez plutôt le lien sur l’autre appareil."],
  syncLinkWaiting: ["Waiting for your other device…", "En attente de votre autre appareil…"],
  syncLinkCode: ["Same code on both screens?", "Le même code sur les deux écrans\u202f?"],
  syncLinkCodeBody: [
    "Check that your other device shows these six digits too, then say so on both.",
    "Vérifiez que votre autre appareil affiche aussi ces six chiffres, puis dites-le sur les deux.",
  ],
  syncLinkYes: ["Yes, the same", "Oui, le même"],
  syncLinkNo: ["No", "Non"],
  syncLinkWaitOther: ["Now say Yes on your other device…", "Dites maintenant Oui sur votre autre appareil…"],
  syncLinkStopped: ["Stopped: nothing was sent.", "Arrêté\u202f: rien n’a été envoyé."],
  syncLinkGiving: ["Sending your space, sealed…", "Envoi de votre espace, scellé…"],
  syncLinkGiven: ["Done: your other device is signing in", "C’est fait\u202f: votre autre appareil se connecte"],
  syncLinkExpired: ["This code has expired. Make a new one.", "Ce code a expiré. Faites-en un nouveau."],
  syncLinkWrong: ["This link isn’t Ulune’s, or it was used already.", "Ce lien n’est pas un lien d’Ulune, ou il a déjà servi."],
  syncLinkSameKind: [
    "One device must be signed in and the other new: open the code on the new device.",
    "Un appareil doit être connecté et l’autre nouveau\u202f: ouvrez le code sur le nouvel appareil.",
  ],
  syncLinkMismatch: [
    "The keys don’t match: someone may be in between. Nothing was sent.",
    "Les clés ne correspondent pas\u202f: quelqu’un s’est peut-être interposé. Rien n’a été envoyé.",
  ],
  syncLinkOpening: ["Making a code…", "Création d’un code…"],
  syncCopied: ["Copied", "Copié"],
  syncLinkQrLabel: ["A QR code to add a device", "Un code QR pour ajouter un appareil"],
  syncLinkAddress: ["The link", "Le lien"],
  syncCopyLink: ["Copy the link", "Copier le lien"],
  syncLinkPageTitle: ["Adding a device", "Ajout d’un appareil"],
  syncLinkPageReading: ["Reading the code…", "Lecture du code…"],
  syncLinkPageUnlock: ["Unlock your private space to add the other device.", "Déverrouillez votre espace privé pour ajouter l’autre appareil."],
  syncLinkPageBack: ["Back to Ulune", "Retour à Ulune"],
} as const satisfies Record<string, readonly [string, string]>;

export type SyncWord = keyof typeof syncWords;
