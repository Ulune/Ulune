/*
 * What's new for the synced account, held back at 2.0's release (share and
 * compare plan, feature 4). Syncing a private space with other devices is in
 * 2.0's code, but production has no account database yet: the server answers
 * every account operation 503 "unavailable", the app offers no sync and
 * Settings says it is "not available yet" (docs/sync-protocol.md, section 15).
 * So What's new promises no syncing: these lines are the 2.0 draft's, word for
 * word, kept here until the account's database is live (section 15's steps,
 * PRODUCTION.md). Then they go into What's new (src/lib/changes.ts) with the
 * version that turns sync on, the English in `en` and the French in `fr`,
 * after groups and notes in the app's order; the privacy notice and the terms
 * (src/lib/legal) drop their "not available yet", Settings › Your data may
 * point to turning sync on again, and this file goes. Nothing in the app reads
 * it: scripts/changes.test.mjs holds it to What's new's rules (the same lines
 * in both languages, Ulune's typography) and checks that What's new promises
 * no syncing while it waits.
 *
 * When sync launches, the guide's answer on where charts are kept (catalog/guide-words.ts)
 * gets its sync clause back: EN "…on this device, sealed, and on your other devices if you sync
 * it, as boxes Ulune can’t open." / FR "…sur cet appareil, scellés, et sur vos autres appareils si
 * vous le synchronisez, en boîtes qu’Ulune ne peut pas ouvrir."
 */

/** The lines that tell of syncing, in English and French, line for line. */
export const CHANGES_SYNC_DRAFT: Record<"en" | "fr", readonly string[]> = {
  en: [
    "Sync your private space with your other devices, if you choose it when you make the space or later in Settings › Private space: Ulune’s server keeps only sealed boxes it can’t open, in Frankfurt; a new device signs in with a passkey, a QR code checked by the same six digits on both screens, your account id and passphrase, or your recovery code. No email: an account unused for two years is deleted, and stopping sync deletes the server’s copy at once.",
  ],
  fr: [
    "Synchronisez votre espace privé avec vos autres appareils, si vous le choisissez en créant l’espace ou plus tard dans Réglages › Espace privé\u202f: le serveur d’Ulune ne garde que des boîtes scellées qu’il ne peut pas ouvrir, à Francfort\u202f; un nouvel appareil se connecte avec une clé d’accès, un code QR vérifié par les mêmes six chiffres sur les deux écrans, l’identifiant de votre compte et votre phrase secrète, ou votre code de récupération. Pas d’e-mail\u202f: un compte inutilisé pendant deux ans est supprimé, et arrêter la synchronisation efface immédiatement la copie du serveur.",
  ],
};
