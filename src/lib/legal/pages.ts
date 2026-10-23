/*
 * The legal pages besides the privacy notice (privacy-notice.ts): the legal
 * notice (mentions légales), the terms of use, the credits and the
 * accessibility statement, in English and French. Rendered by
 * components/legal-page.tsx, which reads, in any text:
 *   [a label](/a-page) or [a label](https://…)  a link
 *   {name}, {contact}                          who publishes Ulune (operator.ts)
 * They say what is true of the code: change them with it, and change the date.
 */

import { SOURCE_URL } from "@/lib/app-identity";
import type { NoticeBlock } from "./privacy-notice";

export type LegalPageId = "legal" | "terms" | "credits" | "accessibility";
export type LegalText = { title: string; updated: string; blocks: NoticeBlock[] };

export const LEGAL_UPDATED = "2026-10-23";

export const LEGAL_PAGES: Record<LegalPageId, Record<"en" | "fr", LegalText>> = {
  legal: {
    en: {
      title: "Legal notice",
      updated: "Updated {date}",
      blocks: [
        {
          p: "Ulune (ulune.app) is a free website for exploring astrology charts, Human Design and numerology, and three Chinese traditions: Chinese astrology, BaZi and Feng Shui.",
        },
        {
          h: "Publisher",
          p: "Ulune is published by {name}, a private individual, on a non-professional basis. As French law allows (loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique), the full identity of this non-professional publisher is not published here; it has been given to the host. Contact: {contact}.",
        },
        { h: "Publication director", p: "{name}." },
        {
          h: "Host",
          p: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, United States. Phone: +1 559 288 7060. [vercel.com](https://vercel.com)",
        },
        {
          h: "Your data",
          p: "Unless you sync your private space, Ulune keeps nothing about you on its server; if you do, only sealed boxes it can’t open, in Frankfurt (EU). What stays on your device, and what leaves it, is set out in the [privacy notice](/privacy).",
        },
        {
          h: "Content",
          p: "Ulune’s texts, drawings and design are its own, apart from the works listed in the [credits](/credits), each under its own licence. The use of Ulune is set out in the [terms of use](/terms).",
        },
      ],
    },
    fr: {
      title: "Mentions légales",
      updated: "Mis à jour le {date}",
      blocks: [
        {
          p: "Ulune (ulune.app) est un site gratuit pour explorer les thèmes astrologiques, le Human Design et la numérologie, ainsi que trois traditions chinoises\u202f: l’astrologie chinoise, le BaZi et le Feng Shui.",
        },
        {
          h: "Éditeur",
          p: "Ulune est édité par {name}, particulier, à titre non professionnel. Comme la loi le permet à un éditeur non professionnel (loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique), son identité complète n’est pas publiée ici\u202f; elle a été communiquée à l’hébergeur. Contact\u202f: {contact}.",
        },
        { h: "Directeur de la publication", p: "{name}." },
        {
          h: "Hébergeur",
          p: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Téléphone\u202f: +1 559 288 7060. [vercel.com](https://vercel.com)",
        },
        {
          h: "Vos données",
          p: "Sauf si vous synchronisez votre espace privé, Ulune ne conserve aucune donnée vous concernant sur son serveur\u202f; si vous le faites, seulement des boîtes scellées qu’il ne peut pas ouvrir, à Francfort (UE). Ce qui reste sur votre appareil, et ce qui le quitte, est décrit dans la [politique de confidentialité](/privacy).",
        },
        {
          h: "Contenus",
          p: "Les textes, les dessins et le design d’Ulune lui sont propres, hormis les œuvres citées dans les [crédits](/credits), chacune sous sa licence. L’usage d’Ulune est décrit dans les [conditions d’utilisation](/terms).",
        },
      ],
    },
  },

  terms: {
    en: {
      title: "Terms of use",
      updated: "Updated {date}",
      blocks: [
        { p: "These terms apply to anyone using Ulune (ulune.app). By using it, you accept them." },
        {
          h: "What Ulune is",
          p: "A free tool for drawing and exploring astrology charts, Human Design and numerology, and three Chinese traditions: Chinese astrology, BaZi and Feng Shui. It needs no account: what you choose to keep stays on your device, encrypted, and, if you turn on sync, on Ulune’s server as sealed boxes only your devices can open (see the [privacy notice](/privacy)).",
        },
        {
          h: "Synced accounts",
          list: [
            "Sync is optional and off until you turn it on. An account is a random number: no email, no name.",
            "An account unused for two years is deleted, with everything in it. Without an email, Ulune can’t warn you first.",
            "You can stop syncing or delete your account at any time in Settings › Private space: the server’s copy is deleted at once.",
            "Keep your passphrase and your recovery code. If you lose every device and both of them, nobody can open your data, Ulune included.",
            "An account holds up to 16 MB of sealed records (2,000 records), 30 devices and 10 passkeys, far more than charts need.",
          ],
        },
        {
          h: "For reflection, not advice",
          p: "Ulune is for self-reflection. Astrology, Human Design, numerology and the Chinese traditions are not scientifically validated, and nothing in Ulune is medical, psychological, legal or financial advice. Never stop or change a treatment because of something you read here: for your health, speak with a professional.",
        },
        {
          h: "Calculations and readings",
          p: "The positions are calculated with the Swiss Ephemeris and checked with care, but Ulune is provided “as is”, as far as the law allows, without any guarantee that it is complete, accurate or always available. Readings are interpretations and can be wrong.",
        },
        {
          h: "Other people’s charts",
          p: "A birth date and place are personal data. Keep someone else’s chart only with their agreement.",
        },
        {
          h: "Acceptable use",
          p: "Don’t use Ulune to harm anyone, and don’t try to overload or break it, for example with automated requests.",
        },
        {
          h: "Changes",
          p: "Ulune may change or stop, and these terms may be updated: the date at the top says when they last changed.",
        },
        { h: "Law and contact", p: "These terms are governed by French law. Questions: {contact}." },
      ],
    },
    fr: {
      title: "Conditions d’utilisation",
      updated: "Mis à jour le {date}",
      blocks: [
        {
          p: "Ces conditions s’appliquent à toute personne qui utilise Ulune (ulune.app). En l’utilisant, vous les acceptez.",
        },
        {
          h: "Ce qu’est Ulune",
          p: "Un outil gratuit pour tracer et explorer des thèmes astrologiques, le Human Design et la numérologie, ainsi que trois traditions chinoises\u202f: l’astrologie chinoise, le BaZi et le Feng Shui. Il ne demande aucun compte\u202f: ce que vous choisissez de garder reste sur votre appareil, chiffré, et, si vous activez la synchronisation, sur le serveur d’Ulune en boîtes scellées que seuls vos appareils peuvent ouvrir (voir la [politique de confidentialité](/privacy)).",
        },
        {
          h: "Comptes synchronisés",
          list: [
            "La synchronisation est facultative et désactivée tant que vous ne l’activez pas. Un compte est un nombre tiré au hasard\u202f: ni e-mail, ni nom.",
            "Un compte inutilisé pendant deux ans est supprimé, avec tout ce qu’il contient. Sans e-mail, Ulune ne peut pas vous prévenir avant.",
            "Vous pouvez à tout moment arrêter la synchronisation ou supprimer votre compte dans Réglages › Espace privé\u202f: la copie du serveur est effacée immédiatement.",
            "Gardez votre phrase secrète et votre code de récupération. Si vous perdez tous vos appareils et les deux, personne ne peut ouvrir vos données, Ulune compris.",
            "Un compte contient jusqu’à 16\u202fMo d’enregistrements scellés (2\u202f000 enregistrements), 30 appareils et 10 clés d’accès, bien plus qu’il n’en faut pour des thèmes.",
          ],
        },
        {
          h: "Pour réfléchir, pas pour conseiller",
          p: "Ulune est un outil de réflexion personnelle. L’astrologie, le Human Design, la numérologie et les traditions chinoises ne sont pas validés scientifiquement, et rien dans Ulune n’est un avis médical, psychologique, juridique ou financier. N’arrêtez ni ne modifiez jamais un traitement à cause de ce que vous lisez ici\u202f: pour votre santé, parlez-en à un professionnel.",
        },
        {
          h: "Calculs et lectures",
          p: "Les positions sont calculées avec la Swiss Ephemeris et vérifiées avec soin, mais Ulune est fourni tel quel, dans les limites prévues par la loi, sans garantie d’être complet, exact ou toujours disponible. Les lectures sont des interprétations et peuvent se tromper.",
        },
        {
          h: "Les thèmes des autres",
          p: "Une date et un lieu de naissance sont des données personnelles. Ne gardez le thème de quelqu’un qu’avec son accord.",
        },
        {
          h: "Un usage loyal",
          p: "N’utilisez pas Ulune pour nuire à quelqu’un, et n’essayez pas de le surcharger ou de le casser, par exemple avec des requêtes automatiques.",
        },
        {
          h: "Évolutions",
          p: "Ulune peut changer ou s’arrêter, et ces conditions peuvent être mises à jour\u202f: la date en haut indique leur dernière modification.",
        },
        {
          h: "Droit applicable et contact",
          p: "Ces conditions relèvent du droit français. Pour toute question\u202f: {contact}.",
        },
      ],
    },
  },

  credits: {
    en: {
      title: "Credits",
      updated: "Updated {date}",
      blocks: [
        { p: "Ulune is built on the work of others. Thank you to all of them." },
        {
          h: "Ulune’s own code",
          p: `Free software under the GNU Affero General Public License, version 3 or later, as the Swiss Ephemeris asks of what is built on it: [the source code](${SOURCE_URL}).`,
        },
        {
          h: "The encyclopedia’s text",
          p: "Written for Ulune and shared under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 licence](https://creativecommons.org/licenses/by-nc-sa/4.0/) (CC BY-NC-SA 4.0): you may share and adapt it, crediting Ulune, not for profit and under the same licence. The code stays under the GNU AGPL.",
        },
        {
          h: "Calculations",
          list: [
            "[Swiss Ephemeris](https://www.astro.com/swisseph/), © Astrodienst AG, Zurich: the planets, houses and fixed stars, with ephemeris files built from NASA JPL’s DE441.",
            "[sweph-wasm](https://github.com/ptprashanttripathi/sweph-wasm): the Swiss Ephemeris compiled to WebAssembly (GNU AGPL 3.0).",
            `Charts are calculated on your device by default (or on Ulune’s server, as you choose in Settings). For that, Ulune sends your device the Swiss Ephemeris compiled to WebAssembly and its ephemeris files, from Ulune’s own address and under the same licence, the GNU AGPL: the source code is [the Swiss Ephemeris’s](https://github.com/aloistr/swisseph), [sweph-wasm’s](https://github.com/ptprashanttripathi/sweph-wasm) and [Ulune’s](${SOURCE_URL}).`,
          ],
        },
        {
          h: "Places and time zones",
          list: [
            "Place search by [Open-Meteo.com](https://open-meteo.com/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)), with location data from [GeoNames](https://www.geonames.org/) (CC BY 4.0).",
            "Time-zone boundaries from [timezone-boundary-builder](https://github.com/evansiroky/timezone-boundary-builder), © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) ([ODbL](https://opendatacommons.org/licenses/odbl/1-0/)), through geo-tz (MIT) and tz-lookup (CC0).",
            "Time-zone history from the [IANA Time Zone Database](https://www.iana.org/time-zones) (public domain).",
          ],
        },
        {
          h: "Fonts",
          p: "Under the [SIL Open Font License 1.1](https://openfontlicense.org/), unless noted:",
          list: [
            "Fraunces, © The Fraunces Project Authors (Undercase Type)",
            "Familjen Grotesk, © The Familjen Grotesk Project Authors",
            "IBM Plex Sans, Serif and Mono, © IBM Corp.",
            "Source Serif 4 and Source Sans 3, © Adobe",
            "Noto Sans Symbols and Noto Sans Symbols 2, © The Noto Project Authors (a subset)",
            "Ulune Classic: a subset of Astronomicon, © Roberto Corona, renamed as the licence asks of a modified version",
            "StarFont Sans and StarFont Serif, by Matthew Skala and Anthony I. P. Owen (public domain)",
          ],
        },
        {
          h: "Software",
          p: "Ulune runs on open-source software, including [React](https://react.dev), [TanStack Start](https://tanstack.com/start), [Vite](https://vite.dev), [Zustand](https://zustand.docs.pmnd.rs), [Zod](https://zod.dev), [date-fns](https://date-fns.org), [React DayPicker](https://daypicker.dev), the [Lucide](https://lucide.dev) icons and [noble-hashes](https://github.com/paulmillr/noble-hashes) (MIT and ISC licences).",
        },
        {
          h: "Human Design",
          p: "“Human Design” and “bodygraph” are used here to describe the system. Ulune is independent: it is not affiliated with or endorsed by Jovian Archive. Its bodygraph drawing and its explanations were written for Ulune; gate and channel names follow common usage.",
        },
      ],
    },
    fr: {
      title: "Crédits",
      updated: "Mis à jour le {date}",
      blocks: [
        { p: "Ulune repose sur le travail d’autres personnes. Merci à toutes." },
        {
          h: "Le code d’Ulune",
          p: `Un logiciel libre sous licence publique générale GNU Affero, version 3 ou ultérieure, comme la Swiss Ephemeris le demande à ce qui est bâti sur elle\u202f: [le code source](${SOURCE_URL}).`,
        },
        {
          h: "Le texte de l’encyclopédie",
          p: "Écrit pour Ulune et partagé sous [licence Creative Commons Attribution - Pas d’utilisation commerciale - Partage dans les mêmes conditions 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr) (CC BY-NC-SA 4.0)\u202f: vous pouvez le partager et l’adapter en citant Ulune, sans usage commercial et sous la même licence. Le code reste sous licence GNU AGPL.",
        },
        {
          h: "Calculs",
          list: [
            "[Swiss Ephemeris](https://www.astro.com/swisseph/), © Astrodienst AG, Zurich\u202f: les planètes, les maisons et les étoiles fixes, avec des fichiers d’éphémérides tirés de DE441 (NASA JPL).",
            "[sweph-wasm](https://github.com/ptprashanttripathi/sweph-wasm)\u202f: la Swiss Ephemeris compilée en WebAssembly (GNU AGPL 3.0).",
            `Les thèmes sont calculés par défaut sur votre appareil (ou sur le serveur d’Ulune, au choix dans les Réglages). Pour cela, Ulune envoie à votre appareil la Swiss Ephemeris compilée en WebAssembly et ses fichiers d’éphémérides, depuis sa propre adresse et sous la même licence, la GNU AGPL\u202f: le code source est celui de [la Swiss Ephemeris](https://github.com/aloistr/swisseph), de [sweph-wasm](https://github.com/ptprashanttripathi/sweph-wasm) et [d’Ulune](${SOURCE_URL}).`,
          ],
        },
        {
          h: "Lieux et fuseaux horaires",
          list: [
            "Recherche de lieux par [Open-Meteo.com](https://open-meteo.com/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr)), avec des données de lieux de [GeoNames](https://www.geonames.org/) (CC BY 4.0).",
            "Limites des fuseaux horaires tirées de [timezone-boundary-builder](https://github.com/evansiroky/timezone-boundary-builder), © [les contributeurs d’OpenStreetMap](https://www.openstreetmap.org/copyright) ([ODbL](https://opendatacommons.org/licenses/odbl/1-0/)), via geo-tz (MIT) et tz-lookup (CC0).",
            "Historique des fuseaux horaires tiré de la [base de données des fuseaux horaires de l’IANA](https://www.iana.org/time-zones) (domaine public).",
          ],
        },
        {
          h: "Polices",
          p: "Sous la [licence SIL Open Font License 1.1](https://openfontlicense.org/), sauf mention contraire\u202f:",
          list: [
            "Fraunces, © The Fraunces Project Authors (Undercase Type)",
            "Familjen Grotesk, © The Familjen Grotesk Project Authors",
            "IBM Plex Sans, Serif et Mono, © IBM Corp.",
            "Source Serif 4 et Source Sans 3, © Adobe",
            "Noto Sans Symbols et Noto Sans Symbols 2, © The Noto Project Authors (un extrait)",
            "Ulune Classic\u202f: un extrait d’Astronomicon, © Roberto Corona, renommé comme la licence le demande pour une version modifiée",
            "StarFont Sans et StarFont Serif, de Matthew Skala et Anthony I. P. Owen (domaine public)",
          ],
        },
        {
          h: "Logiciels",
          p: "Ulune fonctionne avec des logiciels libres, dont [React](https://react.dev), [TanStack Start](https://tanstack.com/start), [Vite](https://vite.dev), [Zustand](https://zustand.docs.pmnd.rs), [Zod](https://zod.dev), [date-fns](https://date-fns.org), [React DayPicker](https://daypicker.dev), les icônes [Lucide](https://lucide.dev) et [noble-hashes](https://github.com/paulmillr/noble-hashes) (licences MIT et ISC).",
        },
        {
          h: "Human Design",
          p: "«\u202fHuman Design\u202f» et «\u202fbodygraph\u202f» servent ici à désigner le système. Ulune est indépendant\u202f: il n’est ni affilié à Jovian Archive ni approuvé par lui. Son dessin du bodygraph et ses explications ont été écrits pour Ulune\u202f; les noms des portes et des canaux suivent l’usage courant.",
        },
      ],
    },
  },

  accessibility: {
    en: {
      title: "Accessibility",
      updated: "Updated {date}",
      blocks: [
        {
          p: "Ulune aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. It is not there yet: this page says what works and what doesn’t.",
        },
        {
          h: "What works",
          list: [
            "Most of Ulune can be used with a keyboard, and each chart’s tables give the wheel’s information as text.",
            "Reduced motion, your system setting, stops the animations.",
            "Pages can be zoomed in the browser to 200% without losing content.",
            "Light and dark themes, in English and French.",
          ],
        },
        {
          h: "Known gaps",
          list: [
            "The chart wheel is hard to use with a screen reader: not all its parts are named, and choosing one is not announced. The tables are the way in for now.",
            "Some menus don’t take the keyboard focus when they open.",
            "Some chart marks, such as the faintest aspect lines, have less contrast than the guidelines ask; the text passes the automated contrast checks in both themes.",
            "A few pages skip a heading level, which makes them harder to skim with a screen reader.",
            "Most text sizes are fixed: a larger default font in the browser changes little, though page zoom works.",
          ],
        },
        {
          h: "Tell us",
          p: "If something in Ulune is hard to use for you, write to {contact}: say what you tried, and with what (browser, screen reader). Every message is read, and what can be fixed will be.",
        },
        {
          p: "This statement comes from Ulune’s own checks (automated WCAG tests, keyboard and contrast checks), not from an outside audit.",
        },
      ],
    },
    fr: {
      title: "Accessibilité",
      updated: "Mis à jour le {date}",
      blocks: [
        {
          p: "Ulune vise la conformité aux règles pour l’accessibilité des contenus web (WCAG) 2.2, niveau AA. Il ne l’atteint pas encore\u202f: cette page dit ce qui fonctionne et ce qui manque.",
        },
        {
          h: "Ce qui fonctionne",
          list: [
            "La plus grande partie d’Ulune s’utilise au clavier, et les tableaux de chaque thème donnent les informations de la roue sous forme de texte.",
            "La réduction des animations, réglage de votre système, arrête les animations.",
            "Les pages peuvent être agrandies à 200 % dans le navigateur sans perte de contenu.",
            "Une apparence claire et une apparence sombre, en français et en anglais.",
          ],
        },
        {
          h: "Ce qui manque",
          list: [
            "La roue du thème est difficile à utiliser avec un lecteur d’écran\u202f: ses éléments ne sont pas tous nommés, et le choix de l’un d’eux n’est pas annoncé. Les tableaux restent le bon accès pour l’instant.",
            "Certains menus ne prennent pas le focus du clavier à leur ouverture.",
            "Certaines marques du thème, comme les lignes d’aspect les plus pâles, ont moins de contraste que les règles ne le demandent\u202f; les textes passent les vérifications automatiques de contraste en apparence claire comme sombre.",
            "Quelques pages sautent un niveau de titre, ce qui les rend moins faciles à parcourir avec un lecteur d’écran.",
            "La plupart des tailles de texte sont fixes\u202f: agrandir la police par défaut du navigateur change peu, mais le zoom de la page fonctionne.",
          ],
        },
        {
          h: "Nous le dire",
          p: "Si quelque chose dans Ulune vous est difficile à utiliser, écrivez à {contact}\u202f: dites ce que vous avez essayé, et avec quoi (navigateur, lecteur d’écran). Chaque message est lu, et ce qui peut être corrigé le sera.",
        },
        {
          p: "Cette déclaration vient des propres vérifications d’Ulune (tests WCAG automatiques, essais au clavier et de contraste), pas d’un audit extérieur.",
        },
      ],
    },
  },
};
