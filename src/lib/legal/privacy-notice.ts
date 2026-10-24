/*
 * The privacy notice (routes/privacy.tsx), English and French. It says what
 * the code does: change it with the code (lib/space, lib/chart/functions.ts,
 * lib/engine for where charts are calculated, lib/account for the synced
 * account and docs/sync-protocol.md, lib/ai), and change the date. AI readings are off (lib/features.ts),
 * so the notice says nothing about them; they return with their own lines. The synced account is in
 * 2.0's code but not live (production has no account database: PRODUCTION.md), so its lines say it
 * isn't available yet; they lose that, with a new date, when it starts.
 */

export type NoticeBlock = { h?: string; p?: string; list?: string[] };
export type Notice = { title: string; updated: string; blocks: NoticeBlock[]; who: { h: string; p: string } };

export const PRIVACY_UPDATED = "2026-10-24";

export const PRIVACY_NOTICE: Record<"en" | "fr", Notice> = {
  en: {
    title: "Privacy",
    updated: "Updated {date}",
    blocks: [
      {
        p: "Ulune needs no account and has no cookies, no analytics and no advertising. Your charts are calculated on your device, unless you choose otherwise. What you choose to keep stays on your device, encrypted, where only you can open it. Syncing it with your other devices isn’t available yet; when it is, and only if you choose it, Ulune’s server will keep a copy in sealed boxes that only your devices can open: it won’t be able to read them.",
      },
      {
        h: "Kept on your device",
        list: [
          "Display settings (appearance, language, looks, views, the hints and the tour you closed), in your browser’s storage, in the clear.",
          "If you sign in: your charts, the partners you pair them with, the groups you sort them into and your notes on them, a copy of the last chart for a quick start, your encyclopedia bookmarks, notes and pages read, and the homes you keep for Feng Shui. They are sealed in your browser’s database with AES-256-GCM, under a key that only your passphrase, a passkey or your recovery code opens. Ulune never receives them.",
          "You stay signed in on your device: the browser keeps the key so it can’t be read out of it, and anyone using that browser can open your space. On a shared computer, choose to lock it when Ulune closes; then nothing but the sealed space is kept.",
          "Backups you download, and the copy you send to another device of yours as a file (Add another device), are sealed the same way and go only where you send them, by AirDrop, a file or a message of your choosing; Ulune never receives them. A readable copy, if you ask for one, is not sealed: keep it private.",
          "If you sync your space, once that is available: this device’s key for your account, kept by the browser so it can’t be read out of it (it signs this device in and opens nothing), and, sealed inside your space, your account’s keys and how far this device has synced.",
          "While you are just looking, charts stay in the open tab and go when it closes.",
          "Once your device has calculated a chart: the calculations’ engine and its files (the Swiss Ephemeris, about 2 MB), and the sky they have worked out for the dates you opened, in your browser’s cache. The same files for everyone, nothing about you.",
          "If you keep Ulune on this device to open it offline (asked once, off until you say yes): Ulune’s own files, its page and the sky of the dates you opened, the same for everyone. Nothing about you.",
        ],
      },
      {
        h: "What leaves your device, and why",
        list: [
          "Drawing a chart or a view (transits, progressions, Human Design, the calendar): by default your device calculates it, with the Swiss Ephemeris that Ulune sends it once from its own address, and the chart’s date, time and coordinates never leave your device. Coordinates you type, rather than a place you search for, go alone to Ulune’s server, which answers with their time zone: no date, no time, no name. If you choose Ulune’s server in Settings (Where charts are calculated), or say yes when your device can’t calculate, a chart’s date, time and coordinates go to it, and it calculates and answers; the calendar then asks it only for the sky of the dates it shows, the same for everyone, and works out your transits on your device. The names you give a chart (its name and, for numerology, the full name at birth and the name used now) never leave your device, and numerology is worked out on it. Neither does the yin or yang count a chart may give for the Chinese traditions, nor the Chinese calendar’s solar terms, read from a table that comes with Ulune. Ulune’s code stores nothing from these requests and writes none of it to its logs.",
          "Searching for a place: what you type goes to Ulune’s server, which looks it up with Open-Meteo’s geocoding service and sends back the places found, each with its time zone. Open-Meteo doesn’t receive your IP address. To answer the same search faster, the server keeps Open-Meteo’s answer in its memory for up to a day, under the words searched and nothing else.",
          "When the page breaks: unless you turn it off in Settings, Your data, the page sends Ulune’s server a short report of what failed: the error with every number masked, where in Ulune’s code it happened, the page’s address without anything after it, the version and the browser’s engine (Blink, WebKit or Gecko). It holds no chart, date, place, name or email address, and goes to the host’s technical logs (below) so the fault can be fixed.",
          "Hosting: Ulune runs on Vercel. Like any host, Vercel receives your IP address and the addresses of the pages you open, and keeps technical logs of them under its own privacy policy.",
        ],
      },
      {
        h: "If you sync your devices",
        p: "Sync isn’t available yet: Ulune’s server keeps no accounts for now, and Settings › Private space says so. When it is, it will work as follows. It is off unless you turn it on, when you make your private space or later in Settings › Private space. Your space is then sealed on your device, record by record, with keys made from your space’s own key, and only the sealed boxes go to Ulune’s server. How it works is published in full with Ulune’s code (docs/sync-protocol.md).",
        list: [
          "What Ulune’s server keeps: a random number for your account (no email, no name, no phone number); for each way in, a passkey’s public key and credential id, or a hash of a key made from your passphrase or recovery code, which can check it but not find it, and your space’s key locked under that way in; your devices’ public keys, their names sealed, and the day each joined and was last seen; your records as sealed boxes, their names replaced by codes and their sizes rounded up to fixed sizes (8 KB at least), with the day each changed. Dates are whole days, never times.",
          "What it never receives: your charts, the names, dates, times and places in them, your notes, groups, homes or bookmarks in readable form; your passphrase, recovery code or passkey; the key that opens your space. Your AI keys and what belongs to one device (the chart open, the partners chosen, the pages you read) never leave it.",
          "Where: the account’s functions run in Vercel’s Frankfurt region and its database is Neon’s Postgres in Frankfurt (AWS eu-central-1), in the European Union.",
          "Logs: Ulune’s code writes nothing about your requests, and keeps no IP address. Vercel’s own request logs keep IP addresses for a short time, outside Ulune’s control (Hosting, above).",
          "How long: until you stop syncing or delete your account, in Settings › Private space, which deletes everything on the server at once. A deleted record leaves an empty mark for 90 days, so your other devices learn it went. An account unused for two years is deleted, with everything in it; without an email, Ulune can’t warn you first.",
          "Adding a device by QR code: the code holds a short-lived link and a public key, after the “#” of its address, which no request carries. Your space’s key goes to the new device sealed for it alone, once you have seen the same six digits on both screens. If you scan with this device’s camera, it reads the code here: nothing is recorded or sent.",
          "If you lose every device, your passphrase and your recovery code, nobody can open your data, Ulune included: that is the price of Ulune not being able to read it.",
        ],
      },
      {
        h: "The encyclopedia",
        p: "Searching and reading the encyclopedia sends nothing but the request for each page you open, and for Ulune’s own files, the same for everyone. Its search runs on your device: what you type in it is never sent. “In your chart” is worked out on your device from the chart open in the tab. Your bookmarks and notes are kept only in your private space, encrypted on this device like your charts; the pages you read are kept there too while it is open, otherwise only until the tab closes, and you can clear them.",
      },
      {
        h: "The Chinese traditions",
        p: "The Chinese zodiac, BaZi and Feng Shui are worked out on your device, from tables that come with Ulune: nothing is sent while a Chinese page calculates. Feng Shui’s compass is read only after you tap “Use the compass” (your phone may ask for your permission then), only while its page is open, and its readings never leave your device. The home you describe there (its facing, the year it was built, its rooms) stays in the open tab and goes when it closes, unless you keep it: it is then sealed in your private space like your charts.",
      },
      {
        h: "Your choices and rights",
        list: [
          "Just look, and nothing is kept.",
          "Download a readable copy of your data, or an encrypted backup, from Settings.",
          "Erase everything Ulune keeps on this device from Settings, Your data. Unless you sync, there is no copy anywhere else.",
          "If you sync, once that is available, stop syncing or delete your account from Settings › Private space: everything on Ulune’s server goes at once, and your devices keep their own space.",
          "Without sync, Ulune holds no data about you on its side, so there is nothing there to show, correct or delete; with it, only the sealed boxes above, which it can’t read. You can still ask, and complain to your data protection authority (in France, the CNIL).",
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
        p: "Ulune ne demande aucun compte et n’a pas de cookies, pas de mesure d’audience ni de publicité. Vos thèmes sont calculés sur votre appareil, sauf autre choix de votre part. Ce que vous choisissez de garder reste sur votre appareil, chiffré, là où vous seul pouvez l’ouvrir. La synchronisation avec vos autres appareils n’est pas encore disponible\u202f; quand elle le sera, et seulement si vous la choisissez, le serveur d’Ulune en gardera une copie dans des boîtes scellées que seuls vos appareils peuvent ouvrir\u202f: il ne pourra pas les lire.",
      },
      {
        h: "Gardé sur votre appareil",
        list: [
          "Les réglages d’affichage (apparence, langue, styles, vues, les astuces et la visite que vous avez fermées), dans le stockage de votre navigateur, en clair.",
          "Si vous vous connectez\u202f: vos thèmes, les partenaires que vous leur associez, les groupes où vous les rangez et vos notes sur eux, une copie du dernier thème pour un démarrage rapide, vos marque-pages, notes et pages lues de l’encyclopédie, et les logements que vous gardez pour le Feng Shui. Ils sont scellés dans la base de données de votre navigateur avec AES-256-GCM, sous une clé que seuls votre phrase secrète, une clé d’accès ou votre code de récupération ouvrent. Ulune ne les reçoit jamais.",
          "Vous restez connecté sur votre appareil\u202f: le navigateur garde la clé sans qu’on puisse l’en extraire, et toute personne utilisant ce navigateur peut ouvrir votre espace. Sur un ordinateur partagé, choisissez de le verrouiller à la fermeture d’Ulune\u202f; seul l’espace scellé est alors gardé.",
          "Les sauvegardes que vous téléchargez, et la copie que vous envoyez sous forme de fichier à un autre de vos appareils (Ajouter un autre appareil), sont scellées de la même façon et ne vont que là où vous les envoyez, par AirDrop, un fichier ou un message de votre choix\u202f; Ulune ne les reçoit jamais. Une copie lisible, si vous en demandez une, n’est pas scellée\u202f: gardez-la pour vous.",
          "Si vous synchronisez votre espace, quand ce sera possible\u202f: la clé de cet appareil pour votre compte, gardée par le navigateur sans qu’on puisse l’en extraire (elle connecte cet appareil et n’ouvre rien), et, scellées dans votre espace, les clés de votre compte et l’état de la synchronisation de cet appareil.",
          "Tant que vous regardez sans vous connecter, les thèmes restent dans l’onglet ouvert et sont effacés à sa fermeture.",
          "Dès que votre appareil a calculé un thème\u202f: le moteur de calcul et ses fichiers (la Swiss Ephemeris, environ 2\u202fMo), et le ciel qu’ils ont calculé pour les dates ouvertes, dans le cache de votre navigateur. Les mêmes fichiers pour tous, rien sur vous.",
          "Si vous gardez Ulune sur cet appareil pour l’ouvrir hors ligne (demandé une fois, désactivé tant que vous ne dites pas oui)\u202f: les fichiers d’Ulune, sa page et le ciel des dates ouvertes, les mêmes pour tous. Rien sur vous.",
        ],
      },
      {
        h: "Ce qui quitte votre appareil, et pourquoi",
        list: [
          "Tracer un thème ou une vue (transits, progressions, Human Design, le calendrier)\u202f: par défaut, votre appareil le calcule, avec la Swiss Ephemeris qu’Ulune lui envoie une fois depuis sa propre adresse, et la date, l’heure et les coordonnées du thème ne quittent pas votre appareil. Les coordonnées que vous tapez, au lieu d’un lieu cherché, partent seules vers le serveur d’Ulune, qui répond avec leur fuseau horaire\u202f: ni date, ni heure, ni nom. Si vous choisissez le serveur d’Ulune dans les Réglages (Où les thèmes sont calculés), ou si vous acceptez quand votre appareil ne peut pas calculer, la date, l’heure et les coordonnées d’un thème partent vers lui, qui calcule et répond\u202f; le calendrier ne lui demande alors que le ciel des dates affichées, le même pour tous, et calcule vos transits sur votre appareil. Les noms que vous donnez à un thème (son nom et, pour la numérologie, le nom complet de naissance et le nom utilisé aujourd’hui) ne quittent jamais votre appareil, et la numérologie s’y calcule. Il en va de même du compte yin ou yang qu’un thème peut indiquer pour les traditions chinoises, et des termes solaires du calendrier chinois, lus dans une table fournie avec Ulune. Le code d’Ulune ne garde rien de ces requêtes et n’en écrit rien dans ses journaux.",
          "Chercher un lieu\u202f: ce que vous tapez part vers le serveur d’Ulune, qui le cherche avec le service de géocodage d’Open-Meteo et renvoie les lieux trouvés, chacun avec son fuseau horaire. Open-Meteo ne reçoit pas votre adresse IP. Pour répondre plus vite à la même recherche, le serveur garde la réponse d’Open-Meteo dans sa mémoire un jour au plus, sous les mots cherchés et rien d’autre.",
          "Quand la page plante\u202f: sauf si vous le désactivez dans Réglages, Vos données, la page envoie au serveur d’Ulune un court rapport de ce qui a échoué\u202f: l’erreur avec chaque chiffre masqué, l’endroit du code d’Ulune où elle s’est produite, l’adresse de la page sans ce qui la suit, la version et le moteur du navigateur (Blink, WebKit ou Gecko). Il ne contient ni thème, ni date, ni lieu, ni nom, ni adresse e-mail, et va dans les journaux techniques de l’hébergeur (ci-dessous) pour que la panne soit réparée.",
          "Hébergement\u202f: Ulune fonctionne sur Vercel. Comme tout hébergeur, Vercel reçoit votre adresse IP et l’adresse des pages que vous ouvrez, et en garde des journaux techniques selon sa propre politique de confidentialité.",
        ],
      },
      {
        h: "Si vous synchronisez vos appareils",
        p: "La synchronisation n’est pas encore disponible\u202f: le serveur d’Ulune ne garde aucun compte pour l’instant, et Réglages › Espace privé le dit. Quand elle le sera, elle fonctionnera ainsi. Elle reste désactivée tant que vous ne l’activez pas, en créant votre espace privé ou plus tard dans Réglages › Espace privé. Votre espace est alors scellé sur votre appareil, enregistrement par enregistrement, avec des clés tirées de la clé de votre espace, et seules les boîtes scellées partent vers le serveur d’Ulune. Son fonctionnement est publié en entier avec le code d’Ulune (docs/sync-protocol.md).",
        list: [
          "Ce que garde le serveur d’Ulune\u202f: un nombre tiré au hasard pour votre compte (ni e-mail, ni nom, ni numéro de téléphone)\u202f; pour chaque moyen d’accès, la clé publique et l’identifiant d’une clé d’accès, ou l’empreinte d’une clé tirée de votre phrase secrète ou de votre code de récupération, qui permet de la vérifier mais pas de la retrouver, et la clé de votre espace verrouillée par ce moyen d’accès\u202f; les clés publiques de vos appareils, leurs noms scellés, et le jour où chacun a rejoint le compte et celui où il a été vu pour la dernière fois\u202f; vos enregistrements en boîtes scellées, leurs noms remplacés par des codes et leurs tailles arrondies à des tailles fixes (8\u202fKo au moins), avec le jour où chacun a changé. Les dates sont des jours entiers, jamais des heures.",
          "Ce qu’il ne reçoit jamais\u202f: vos thèmes, les noms, dates, heures et lieux qu’ils contiennent, vos notes, groupes, logements ou marque-pages sous forme lisible\u202f; votre phrase secrète, votre code de récupération ou votre clé d’accès\u202f; la clé qui ouvre votre espace. Vos clés d’IA et ce qui n’appartient qu’à un appareil (le thème ouvert, les partenaires choisis, les pages lues) ne le quittent jamais.",
          "Où\u202f: les fonctions du compte tournent dans la région de Francfort de Vercel et sa base de données est le Postgres de Neon à Francfort (AWS eu-central-1), dans l’Union européenne.",
          "Journaux\u202f: le code d’Ulune n’écrit rien de vos requêtes et ne garde aucune adresse IP. Les journaux de requêtes de Vercel gardent les adresses IP peu de temps, hors du contrôle d’Ulune (Hébergement, ci-dessus).",
          "Combien de temps\u202f: jusqu’à ce que vous arrêtiez la synchronisation ou supprimiez votre compte, dans Réglages › Espace privé, ce qui efface tout sur le serveur immédiatement. Un enregistrement supprimé laisse une marque vide pendant 90\u202fjours, pour que vos autres appareils apprennent qu’il est parti. Un compte inutilisé pendant deux ans est supprimé, avec tout ce qu’il contient\u202f; sans e-mail, Ulune ne peut pas vous prévenir avant.",
          "Ajouter un appareil par code QR\u202f: le code contient un lien de courte durée et une clé publique, après le «\u202f#\u202f» de son adresse, qu’aucune requête ne transporte. La clé de votre espace part vers le nouvel appareil scellée pour lui seul, une fois que vous avez vu les mêmes six chiffres sur les deux écrans. Si vous scannez avec l’appareil photo de cet appareil, il lit le code ici\u202f: rien n’est enregistré ni envoyé.",
          "Si vous perdez tous vos appareils, votre phrase secrète et votre code de récupération, personne ne peut ouvrir vos données, Ulune compris\u202f: c’est le prix à payer pour qu’Ulune ne puisse pas les lire.",
        ],
      },
      {
        h: "L’encyclopédie",
        p: "Chercher et lire dans l’encyclopédie n’envoie rien d’autre que la demande de chaque page ouverte, et des fichiers d’Ulune, les mêmes pour tous. Sa recherche se fait sur votre appareil\u202f: ce que vous y tapez n’est jamais envoyé. «\u202fDans votre thème\u202f» est calculé sur votre appareil à partir du thème ouvert dans l’onglet. Vos marque-pages et vos notes sont gardés uniquement dans votre espace privé, chiffrés sur cet appareil comme vos thèmes\u202f; les pages lues y sont gardées aussi tant qu’il est ouvert, sinon seulement jusqu’à la fermeture de l’onglet, et vous pouvez les effacer.",
      },
      {
        h: "Les traditions chinoises",
        p: "Le zodiaque chinois, le BaZi et le Feng Shui se calculent sur votre appareil, à partir de tables fournies avec Ulune\u202f: rien n’est envoyé pendant qu’une page chinoise calcule. La boussole du Feng Shui n’est lue qu’après que vous avez touché «\u202fUtiliser la boussole\u202f» (votre téléphone peut alors vous demander votre accord), seulement tant que sa page est ouverte, et ses lectures ne quittent jamais votre appareil. Le logement que vous y décrivez (son orientation, son année de construction, ses pièces) reste dans l’onglet ouvert et s’efface à sa fermeture, sauf si vous le gardez\u202f: il est alors scellé dans votre espace privé comme vos thèmes.",
      },
      {
        h: "Vos choix et vos droits",
        list: [
          "Regardez sans vous connecter, et rien n’est gardé.",
          "Téléchargez une copie lisible de vos données, ou une sauvegarde chiffrée, depuis les Réglages.",
          "Effacez tout ce qu’Ulune garde sur cet appareil depuis Réglages, Vos données. Sauf si vous synchronisez, il n’en existe aucune copie ailleurs.",
          "Si vous synchronisez, quand ce sera possible, arrêtez la synchronisation ou supprimez votre compte depuis Réglages › Espace privé\u202f: tout ce qui est sur le serveur d’Ulune disparaît immédiatement, et vos appareils gardent leur propre espace.",
          "Sans synchronisation, Ulune ne détient aucune donnée sur vous de son côté\u202f: il n’y a donc rien à montrer, corriger ou effacer\u202f; avec elle, seulement les boîtes scellées ci-dessus, qu’il ne peut pas lire. Vous pouvez tout de même le demander, et saisir l’autorité de protection des données (en France, la CNIL).",
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
