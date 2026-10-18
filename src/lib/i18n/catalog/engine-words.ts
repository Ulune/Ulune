/**
 * engine-words: [English, French]. The words of the calculations on the device (on-device
 * plan, step 5): the first chart's one-time download, the question when this device can't
 * calculate (components/engine/engine-ui.ts) and Settings › "Where charts are calculated"
 * (components/calculate-settings.tsx). Kept out of the app's catalog: they load with that code.
 * Read through bookT (src/lib/i18n/words-book.ts); scripts/i18n-catalog.test.mjs holds them to
 * the catalog's rules.
 */
export const engineWords = {
  engineSetup: ["Setting up the calculations on this device, once (about 2 MB)", "Mise en place des calculs sur cet appareil, une seule fois (environ 2\u202fMo)"],
  engineSetupLabel: ["Calculations downloaded", "Calculs téléchargés"],
  engineCantTitle: ["This device can’t calculate charts right now", "Cet appareil ne peut pas calculer de thèmes pour l’instant"],
  engineWhyUnsupported: ["This browser can’t run the calculations itself.", "Ce navigateur ne peut pas faire les calculs lui-même."],
  engineWhyFiles: ["The calculations’ files didn’t download.", "Les fichiers de calcul ne se sont pas téléchargés."],
  engineWhySlow: ["The calculations took too long to start.", "Les calculs ont mis trop de temps à démarrer."],
  engineCantBody: [
    "Calculate this one on Ulune’s server? The date, time and coordinates go there, never the name, and nothing is kept.",
    "Le calculer sur le serveur d’Ulune\u202f? La date, l’heure et les coordonnées y partent, jamais le nom, et rien n’est gardé.",
  ],
  engineOnce: ["Use the server once", "Utiliser le serveur cette fois"],
  engineAlways: ["Always use the server", "Toujours utiliser le serveur"],
  engineCancel: ["Cancel", "Annuler"],
  engineCantNote: [
    "Settings, “Where charts are calculated”, can change this later.",
    "Les Réglages, «\u202fOù les thèmes sont calculés\u202f», permettent de changer cela plus tard.",
  ],
  calcTitle: ["Where charts are calculated", "Où les thèmes sont calculés"],
  calcLead: [
    "The same Swiss Ephemeris either way, with the same results to the last digit.",
    "La même Swiss Ephemeris dans les deux cas, avec les mêmes résultats au dernier chiffre près.",
  ],
  calcDevice: ["On this device (recommended)", "Sur cet appareil (recommandé)"],
  calcDeviceHint: [
    " — no date or time leaves it: only the places you search for, or coordinates you type (to find their time zone), go to Ulune’s server. The first chart downloads the calculations once, about 2 MB, which your browser keeps.",
    " — aucune date ni heure ne le quitte\u202f: seuls les lieux que vous cherchez, ou les coordonnées que vous tapez (pour trouver leur fuseau horaire), partent vers le serveur d’Ulune. Le premier thème télécharge les calculs une seule fois, environ 2\u202fMo, que votre navigateur garde.",
  ],
  calcServer: ["On Ulune’s server", "Sur le serveur d’Ulune"],
  calcServerHint: [
    " — each chart’s date, time and coordinates go there, never its name, and nothing is kept. Nothing to download.",
    " — la date, l’heure et les coordonnées de chaque thème y partent, jamais son nom, et rien n’est gardé. Rien à télécharger.",
  ],
  calcNow: ["Charts are now calculated {where}.", "Les thèmes sont maintenant calculés {where}."],
  calcNowDevice: ["on this device", "sur cet appareil"],
  calcNowServer: ["on Ulune’s server", "sur le serveur d’Ulune"],
} as const satisfies Record<string, readonly [string, string]>;
