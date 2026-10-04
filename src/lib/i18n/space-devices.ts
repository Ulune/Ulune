import type { AppLocale } from "./messages";
import { pick } from "./pick";

/*
 * The words of staying signed in and of adding another device (part 88):
 * kept out of the catalog loaded with every page, as only the private
 * space's sheet and Settings use them.
 */
const DEVICES = {
  lockCloseHint: [
    "for a shared computer",
    "pour un ordinateur partagé",
  ],
  shared: [
    "This is a shared computer",
    "C’est un ordinateur partagé",
  ],
  sharedHint: [
    "lock when Ulune closes instead of staying signed in",
    "verrouiller à la fermeture d’Ulune au lieu de rester connecté",
  ],
  staysSignedIn: [
    "You stay signed in on this device, even after closing Ulune. Lock now is in the menu under Private.",
    "Vous restez connecté sur cet appareil, même après avoir fermé Ulune. Verrouiller maintenant est dans le menu Privé.",
  ],
  homeScreen: [
    "Add Ulune to the Dock or the Home Screen so Safari keeps it.",
    "Ajoutez Ulune au Dock ou à l’écran d’accueil pour que Safari le garde.",
  ],
  devicesTitle: [
    "Your other devices",
    "Vos autres appareils",
  ],
  devicesBody: [
    "Open the same space on your phone or another computer: send it a sealed copy, straight from this device. Nothing goes through Ulune, and each device then keeps its own copy.",
    "Ouvrez le même espace sur votre téléphone ou un autre ordinateur\u202f: envoyez-lui une copie scellée, directement depuis cet appareil. Rien ne passe par Ulune, et chaque appareil garde ensuite sa propre copie.",
  ],
  addDeviceTitle: [
    "Add another device",
    "Ajouter un autre appareil",
  ],
  addDeviceBody: [
    "Your space goes to your other device as one sealed file: only your passkey, passphrase or recovery code opens it, so whatever carries it can’t read it.",
    "Votre espace part vers votre autre appareil en un seul fichier scellé\u202f: seuls votre clé d’accès, votre phrase secrète ou votre code de récupération l’ouvrent, donc ce qui le transporte ne peut pas le lire.",
  ],
  addDeviceStep1Share: [
    "Send it with AirDrop, Nearby Share, or to your Files.",
    "Envoyez-le par AirDrop, Partage à proximité, ou dans vos Fichiers.",
  ],
  addDeviceStep1Save: [
    "Save the file, then bring it to the other device (AirDrop, a USB stick, a message to yourself).",
    "Enregistrez le fichier, puis portez-le sur l’autre appareil (AirDrop, une clé USB, un message à vous-même).",
  ],
  addDeviceStep2: [
    "On the other device, open Ulune, choose Sign in, then “I already have a space on another device”, and pick the file.",
    "Sur l’autre appareil, ouvrez Ulune, choisissez Se connecter, puis «\u202fJ’ai déjà un espace sur un autre appareil\u202f», et choisissez le fichier.",
  ],
  addDeviceStep3: [
    "Open it with your passkey (Face ID, fingerprint) if it’s in your iCloud or Google keychain, or with your passphrase or recovery code. It stays signed in there too.",
    "Ouvrez-le avec votre clé d’accès (Face ID, empreinte) si elle est dans votre trousseau iCloud ou Google, ou avec votre phrase secrète ou votre code de récupération. Il y reste connecté aussi.",
  ],
  addDeviceShare: [
    "Send to your other device",
    "Envoyer à votre autre appareil",
  ],
  addDeviceSave: [
    "Save the file",
    "Enregistrer le fichier",
  ],
  addDevicePreparing: [
    "Sealing a copy of your space…",
    "Copie scellée de votre espace…",
  ],
  addDeviceSent: [
    "Sent. Open it on your other device.",
    "Envoyé. Ouvrez-le sur votre autre appareil.",
  ],
  addDeviceSaved: [
    "Saved where your downloads go. Bring it to your other device.",
    "Enregistré avec vos téléchargements. Portez-le sur votre autre appareil.",
  ],
  addDeviceNote: [
    "The devices don’t sync. To bring charts saved later, send again and choose Add charts from another device there.",
    "Les appareils ne se synchronisent pas. Pour apporter des thèmes enregistrés plus tard, renvoyez et choisissez là-bas Ajouter les thèmes d’un autre appareil.",
  ],
} as const satisfies Record<string, readonly [string, string]>;

export type DevicesKey = keyof typeof DEVICES;

export function devicesText(locale: AppLocale, key: DevicesKey): string {
  const [en, fr] = DEVICES[key];
  return pick({ en, fr }, locale);
}
