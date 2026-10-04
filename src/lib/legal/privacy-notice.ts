/*
 * The privacy notice (routes/privacy.tsx), English and French. It says what
 * the code does: change it with the code (lib/space, lib/chart/functions.ts,
 * lib/ai), and change the date. AI readings are off in 1.0 (lib/features.ts),
 * so the notice says nothing about them; they return with their own lines.
 */

export type NoticeBlock = { h?: string; p?: string; list?: string[] };
export type Notice = { title: string; updated: string; blocks: NoticeBlock[]; who: { h: string; p: string } };

export const PRIVACY_UPDATED = "2026-10-04";

export const PRIVACY_NOTICE: Record<"en" | "fr", Notice> = {
  en: {
    title: "Privacy",
    updated: "Updated {date}",
    blocks: [
      {
        p: "Ulune has no accounts, no cookies, no analytics and no advertising, and keeps nothing about you on its server. What you choose to keep stays on your device, encrypted, where only you can open it.",
      },
      {
        h: "Kept on your device",
        list: [
          "Display settings (appearance, language, looks, views, the hints and the tour you closed), in your browser’s storage, in the clear.",
          "If you sign in: your charts, the partners you pair them with and a copy of the last chart for a quick start. They are sealed in your browser’s database with AES-256-GCM, under a key that only your passphrase, a passkey or your recovery code opens. Ulune never receives them.",
          "You stay signed in on your device: the browser keeps the key so it can’t be read out of it, and anyone using that browser can open your space. On a shared computer, choose to lock it when Ulune closes; then nothing but the sealed space is kept.",
          "Backups you download, and the copy you send to another device of yours (Add another device), are sealed the same way and go only where you send them, by AirDrop, a file or a message of your choosing; Ulune never receives them. A readable copy, if you ask for one, is not sealed: keep it private.",
          "While you are just looking, charts stay in the open tab and go when it closes.",
          "If you keep Ulune on this device to open it offline (asked once, off until you say yes): Ulune’s own files, its page and the sky of the dates you opened, the same for everyone. Nothing about you.",
        ],
      },
      {
        h: "What leaves your device, and why",
        list: [
          "Drawing a chart or a view (transits, progressions, Human Design): its date, time and coordinates go to Ulune’s server, which calculates and answers. The calendar asks the server only for the sky of the dates it shows, the same for everyone, and works out your transits on your device. The names you give a chart (its name and, for numerology, the full name at birth and the name used now) never leave your device, and numerology is worked out on it. Ulune’s code stores nothing from these requests and writes none of it to its logs.",
          "Searching for a place: what you type goes to Ulune’s server, which looks it up with Open-Meteo’s geocoding service. Open-Meteo doesn’t receive your IP address. To answer the same search faster, the server keeps Open-Meteo’s answer in its memory for up to a day, under the words searched and nothing else.",
          "When the page breaks: unless you turn it off in Settings, Your data, the page sends Ulune’s server a short report of what failed: the error with every number masked, where in Ulune’s code it happened, the page’s address without anything after it, the version and the browser’s engine (Blink, WebKit or Gecko). It holds no chart, date, place, name or email address, and goes to the host’s technical logs (below) so the fault can be fixed.",
          "Hosting: Ulune runs on Vercel. Like any host, Vercel receives your IP address and the addresses of the pages you open, and keeps technical logs of them under its own privacy policy.",
        ],
      },
      {
        h: "Your choices and rights",
        list: [
          "Just look, and nothing is kept.",
          "Download a readable copy of your data, or an encrypted backup, from Settings.",
          "Erase everything Ulune keeps on this device from Settings, Your data. There is no copy anywhere else.",
          "Ulune holds no data about you on its side, so there is nothing there to show, correct or delete. You can still ask, and complain to your data protection authority (in France, the CNIL).",
        ],
      },
      {
        h: "Other people’s charts",
        p: "A partner’s, friend’s or relative’s birth date, birthplace and names are their personal data. Keep their charts only with their agreement.",
      },
    ],
    who: { h: "Who runs Ulune", p: "Ulune is published by {name}. Write to {contact} with any question about your data." },
  },
  fr: {
    title: "Confidentialité",
    updated: "Mis à jour le {date}",
    blocks: [
      {
        p: "Ulune n’a pas de comptes, pas de cookies, pas de mesure d’audience ni de publicité, et ne conserve aucune donnée vous concernant sur son serveur. Ce que vous choisissez de garder reste sur votre appareil, chiffré, là où vous seul pouvez l’ouvrir.",
      },
      {
        h: "Gardé sur votre appareil",
        list: [
          "Les réglages d’affichage (apparence, langue, styles, vues, les astuces et la visite que vous avez fermées), dans le stockage de votre navigateur, en clair.",
          "Si vous vous connectez\u202f: vos thèmes, les partenaires que vous leur associez et une copie du dernier thème pour un démarrage rapide. Ils sont scellés dans la base de données de votre navigateur avec AES-256-GCM, sous une clé que seuls votre phrase secrète, une clé d’accès ou votre code de récupération ouvrent. Ulune ne les reçoit jamais.",
          "Vous restez connecté sur votre appareil\u202f: le navigateur garde la clé sans qu’on puisse l’en extraire, et toute personne utilisant ce navigateur peut ouvrir votre espace. Sur un ordinateur partagé, choisissez de le verrouiller à la fermeture d’Ulune\u202f; seul l’espace scellé est alors gardé.",
          "Les sauvegardes que vous téléchargez, et la copie que vous envoyez à un autre de vos appareils (Ajouter un autre appareil), sont scellées de la même façon et ne vont que là où vous les envoyez, par AirDrop, un fichier ou un message de votre choix\u202f; Ulune ne les reçoit jamais. Une copie lisible, si vous en demandez une, n’est pas scellée\u202f: gardez-la pour vous.",
          "Tant que vous regardez sans vous connecter, les thèmes restent dans l’onglet ouvert et sont effacés à sa fermeture.",
          "Si vous gardez Ulune sur cet appareil pour l’ouvrir hors ligne (demandé une fois, désactivé tant que vous ne dites pas oui)\u202f: les fichiers d’Ulune, sa page et le ciel des dates ouvertes, les mêmes pour tous. Rien sur vous.",
        ],
      },
      {
        h: "Ce qui quitte votre appareil, et pourquoi",
        list: [
          "Tracer un thème ou une vue (transits, progressions, Human Design)\u202f: sa date, son heure et ses coordonnées partent vers le serveur d’Ulune, qui calcule et répond. Le calendrier ne demande au serveur que le ciel des dates affichées, le même pour tous, et calcule vos transits sur votre appareil. Les noms que vous donnez à un thème (son nom et, pour la numérologie, le nom complet de naissance et le nom utilisé aujourd’hui) ne quittent jamais votre appareil, et la numérologie s’y calcule. Le code d’Ulune ne garde rien de ces requêtes et n’en écrit rien dans ses journaux.",
          "Chercher un lieu\u202f: ce que vous tapez part vers le serveur d’Ulune, qui le cherche avec le service de géocodage d’Open-Meteo. Open-Meteo ne reçoit pas votre adresse IP. Pour répondre plus vite à la même recherche, le serveur garde la réponse d’Open-Meteo dans sa mémoire un jour au plus, sous les mots cherchés et rien d’autre.",
          "Quand la page plante\u202f: sauf si vous le désactivez dans Réglages, Vos données, la page envoie au serveur d’Ulune un court rapport de ce qui a échoué\u202f: l’erreur avec chaque chiffre masqué, l’endroit du code d’Ulune où elle s’est produite, l’adresse de la page sans ce qui la suit, la version et le moteur du navigateur (Blink, WebKit ou Gecko). Il ne contient ni thème, ni date, ni lieu, ni nom, ni adresse e-mail, et va dans les journaux techniques de l’hébergeur (ci-dessous) pour que la panne soit réparée.",
          "Hébergement\u202f: Ulune fonctionne sur Vercel. Comme tout hébergeur, Vercel reçoit votre adresse IP et l’adresse des pages que vous ouvrez, et en garde des journaux techniques selon sa propre politique de confidentialité.",
        ],
      },
      {
        h: "Vos choix et vos droits",
        list: [
          "Regardez sans vous connecter, et rien n’est gardé.",
          "Téléchargez une copie lisible de vos données, ou une sauvegarde chiffrée, depuis les Réglages.",
          "Effacez tout ce qu’Ulune garde sur cet appareil depuis Réglages, Vos données. Il n’en existe aucune copie ailleurs.",
          "Ulune ne détient aucune donnée sur vous de son côté\u202f: il n’y a donc rien à montrer, corriger ou effacer. Vous pouvez tout de même le demander, et saisir l’autorité de protection des données (en France, la CNIL).",
        ],
      },
      {
        h: "Les thèmes des autres",
        p: "La date, le lieu de naissance et les noms d’un partenaire, d’un ami ou d’un proche sont des données personnelles qui le concernent. Ne gardez son thème qu’avec son accord.",
      },
    ],
    who: { h: "Qui édite Ulune", p: "Ulune est édité par {name}. Écrivez à {contact} pour toute question sur vos données." },
  },
};
