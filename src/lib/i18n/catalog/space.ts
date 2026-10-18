/** space (the private space: signing in, unlocking, what is kept): [English, French]. */
export const space = {
  spaceSignIn: ["Sign in", "Se connecter"],
  spaceUnlock: ["Unlock", "Déverrouiller"],
  spacePrivate: ["Private", "Privé"],
  spacePrivateHere: ["Private · this device", "Privé · cet appareil"],
  spaceLockNow: ["Lock now", "Verrouiller maintenant"],
  spaceLocked: ["Locked", "Verrouillé"],
  spaceJustLooking: ["Just looking", "Simple visite"],
  spaceNothingKept: ["Nothing is kept", "Rien n’est gardé"],
  spaceSpaceName: ["Private space", "Espace privé"],
  spaceHereEncrypted: ["This device · encrypted", "Cet appareil · chiffré"],
  spaceTitle: ["Your private space", "Votre espace privé"],
  spaceClose: ["Close", "Fermer"],
  spaceUnlockTitle: ["Unlock your private space", "Déverrouiller votre espace privé"],
  spaceLegacyMoved: [
    "Your charts from before are now in your private space, encrypted.",
    "Vos thèmes d’avant sont maintenant dans votre espace privé, chiffrés.",
  ],
  spaceFailed: ["Something went wrong. Try again.", "Un problème est survenu. Réessayez."],
  keepNotKept: ["This chart isn’t kept.", "Ce thème n’est pas gardé."],
  keepSignIn: [
    "Sign in to keep it on this device, encrypted.",
    "Connectez-vous pour le garder sur cet appareil, chiffré.",
  ],
  keepUnlock: ["Unlock your private space to keep it.", "Déverrouillez votre espace privé pour le garder."],
  birthKeptNothing: [
    "Nothing you enter is kept unless you sign in, and then only on this device, encrypted.",
    "Rien de ce que vous saisissez n’est gardé, sauf si vous vous connectez, et alors seulement sur cet appareil, chiffré.",
  ],
  birthKeptSpace: [
    "Kept in your private space, on this device only, encrypted.",
    "Gardé dans votre espace privé, sur cet appareil seulement, chiffré.",
  ],
  // Where the chart is calculated (on-device plan, step 5): this device by default, Ulune's server if chosen in Settings.
  castNote: [
    "Calculated on this device: the date and time stay here; only the place is looked up through Ulune’s server.",
    "Calculé sur cet appareil\u202f: la date et l’heure restent ici\u202f; seul le lieu est cherché par le serveur d’Ulune.",
  ],
  castNoteServer: [
    "Calculated on Ulune’s server, which keeps nothing; the names stay on this device.",
    "Calculé sur le serveur d’Ulune, qui ne garde rien\u202f; les noms restent sur cet appareil.",
  ],
  spaceLockClose: ["When Ulune is closed", "À la fermeture d’Ulune"],
  spaceLockIdle: ["After 15 minutes away", "Après 15 minutes d’absence"],
  spaceLockStay: [
    "Stay signed in on this device",
    "Rester connecté sur cet appareil",
  ],
  spaceCancel: ["Cancel", "Annuler"],
  spaceBackupDownload: ["Download a backup", "Télécharger une sauvegarde"],
  spaceBackupSaved: ["Backup downloaded", "Sauvegarde téléchargée"],
  spaceBackupDue: ["Changed since the last backup", "Modifié depuis la dernière sauvegarde"],
  spaceBackupNone: ["No backup yet", "Pas encore de sauvegarde"],
  spaceAddDevice: [
    "Add another device",
    "Ajouter un autre appareil",
  ],
} as const satisfies Record<string, readonly [string, string]>;
