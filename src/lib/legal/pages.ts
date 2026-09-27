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

export const LEGAL_UPDATED = "2026-09-27";

export const LEGAL_PAGES: Record<LegalPageId, Record<"en" | "fr", LegalText>> = {
  legal: {
    en: {
      title: "Legal notice",
      updated: "Updated {date}",
      blocks: [
        { p: "Ulune (ulune.app) is a free website for exploring astrology charts, Human Design and numerology." },
        {
          h: "Publisher",
          p: "Ulune is published by {name}, a private individual, on a non-professional basis. As French law allows such publishers (loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique), their identity has been given to the host. Contact: {contact}.",
        },
        { h: "Publication director", p: "{name}." },
        {
          h: "Host",
          p: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, United States. Phone: +1 559 288 7060. [vercel.com](https://vercel.com)",
        },
        {
          h: "Your data",
          p: "Ulune keeps nothing about you on its server. What stays on your device, and what leaves it, is set out in the [privacy notice](/privacy).",
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
          p: "Ulune (ulune.app) est un site gratuit pour explorer les thèmes astrologiques, le Human Design et la numérologie.",
        },
        {
          h: "Éditeur",
          p: "Ulune est édité par {name}, particulier, à titre non professionnel. Comme la loi le permet à ces éditeurs (loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique), son identité a été communiquée à l’hébergeur. Contact : {contact}.",
        },
        { h: "Directeur de la publication", p: "{name}." },
        {
          h: "Hébergeur",
          p: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Téléphone : +1 559 288 7060. [vercel.com](https://vercel.com)",
        },
        {
          h: "Vos données",
          p: "Ulune ne garde rien de vous sur son serveur. Ce qui reste sur votre appareil, et ce qui le quitte, est décrit dans la [politique de confidentialité](/privacy).",
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
          p: "A free tool for drawing and exploring astrology charts, Human Design and numerology. It needs no account: what you choose to keep stays on your device, encrypted (see the [privacy notice](/privacy)).",
        },
        {
          h: "For reflection, not advice",
          p: "Ulune is for self-reflection. Astrology, Human Design and numerology are not scientifically validated, and nothing in Ulune is medical, psychological, legal or financial advice. Never stop or change a treatment because of something you read here: for your health, speak with a professional.",
        },
        {
          h: "Calculations and readings",
          p: "The positions are calculated with the Swiss Ephemeris and checked with care, but Ulune is provided as it is, as far as the law allows, without any guarantee that it is complete, exact or always available. Readings are interpretations and can be wrong.",
        },
        {
          h: "Other people’s charts",
          p: "A birth date and place are personal data. Keep someone else’s chart only with their agreement.",
        },
        {
          h: "Fair use",
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
          p: "Un outil gratuit pour tracer et explorer des thèmes astrologiques, le Human Design et la numérologie. Il ne demande aucun compte : ce que vous choisissez de garder reste sur votre appareil, chiffré (voir la [politique de confidentialité](/privacy)).",
        },
        {
          h: "Pour réfléchir, pas pour conseiller",
          p: "Ulune est un outil de réflexion personnelle. L’astrologie, le Human Design et la numérologie ne sont pas validés scientifiquement, et rien dans Ulune n’est un avis médical, psychologique, juridique ou financier. N’arrêtez ni ne modifiez jamais un traitement à cause de ce que vous lisez ici : pour votre santé, parlez-en à un professionnel.",
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
          p: "Ulune peut changer ou s’arrêter, et ces conditions peuvent être mises à jour : la date en haut indique leur dernière modification.",
        },
        {
          h: "Droit applicable et contact",
          p: "Ces conditions relèvent du droit français. Pour toute question : {contact}.",
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
          h: "Calculations",
          list: [
            "[Swiss Ephemeris](https://www.astro.com/swisseph/), © Astrodienst AG, Zurich: the planets, houses and fixed stars, with ephemeris files built from NASA JPL’s DE441.",
            "[sweph-wasm](https://github.com/ptprashanttripathi/sweph-wasm): the Swiss Ephemeris compiled to WebAssembly (GNU AGPL 3.0).",
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
          p: "Ulune runs on open-source software, among it [React](https://react.dev), [TanStack Start](https://tanstack.com/start), [Vite](https://vite.dev), [Zustand](https://zustand.docs.pmnd.rs), [Zod](https://zod.dev), [date-fns](https://date-fns.org), [React DayPicker](https://daypicker.dev), the [Lucide](https://lucide.dev) icons and [noble-hashes](https://github.com/paulmillr/noble-hashes) (MIT and ISC licences).",
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
          h: "Calculs",
          list: [
            "[Swiss Ephemeris](https://www.astro.com/swisseph/), © Astrodienst AG, Zurich : les planètes, les maisons et les étoiles fixes, avec des fichiers d’éphémérides tirés de DE441 (NASA JPL).",
            "[sweph-wasm](https://github.com/ptprashanttripathi/sweph-wasm) : la Swiss Ephemeris compilée en WebAssembly (GNU AGPL 3.0).",
          ],
        },
        {
          h: "Lieux et fuseaux horaires",
          list: [
            "Recherche de lieux par [Open-Meteo.com](https://open-meteo.com/) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr)), avec des données de lieux de [GeoNames](https://www.geonames.org/) (CC BY 4.0).",
            "Limites des fuseaux horaires tirées de [timezone-boundary-builder](https://github.com/evansiroky/timezone-boundary-builder), © [les contributeurs d’OpenStreetMap](https://www.openstreetmap.org/copyright) ([ODbL](https://opendatacommons.org/licenses/odbl/1-0/)), via geo-tz (MIT) et tz-lookup (CC0).",
            "Histoire des fuseaux horaires tirée de la [base de données des fuseaux horaires de l’IANA](https://www.iana.org/time-zones) (domaine public).",
          ],
        },
        {
          h: "Polices",
          p: "Sous la [licence SIL Open Font License 1.1](https://openfontlicense.org/), sauf mention contraire :",
          list: [
            "Fraunces, © The Fraunces Project Authors (Undercase Type)",
            "Familjen Grotesk, © The Familjen Grotesk Project Authors",
            "IBM Plex Sans, Serif et Mono, © IBM Corp.",
            "Source Serif 4 et Source Sans 3, © Adobe",
            "Noto Sans Symbols et Noto Sans Symbols 2, © The Noto Project Authors (un extrait)",
            "Ulune Classic : un extrait d’Astronomicon, © Roberto Corona, renommé comme la licence le demande pour une version modifiée",
            "StarFont Sans et StarFont Serif, de Matthew Skala et Anthony I. P. Owen (domaine public)",
          ],
        },
        {
          h: "Logiciels",
          p: "Ulune fonctionne avec des logiciels libres, dont [React](https://react.dev), [TanStack Start](https://tanstack.com/start), [Vite](https://vite.dev), [Zustand](https://zustand.docs.pmnd.rs), [Zod](https://zod.dev), [date-fns](https://date-fns.org), [React DayPicker](https://daypicker.dev), les icônes [Lucide](https://lucide.dev) et [noble-hashes](https://github.com/paulmillr/noble-hashes) (licences MIT et ISC).",
        },
        {
          h: "Human Design",
          p: "« Human Design » et « bodygraph » servent ici à désigner le système. Ulune est indépendant : il n’est ni affilié à Jovian Archive ni approuvé par lui. Son dessin du bodygraph et ses explications ont été écrits pour Ulune ; les noms des portes et des canaux suivent l’usage courant.",
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
            "In the light theme, some small grey text and a few chart marks have too little contrast.",
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
          p: "Ulune vise les règles pour l’accessibilité des contenus web (WCAG) 2.2, niveau AA. Il n’y est pas encore : cette page dit ce qui fonctionne et ce qui manque.",
        },
        {
          h: "Ce qui fonctionne",
          list: [
            "Presque tout Ulune s’utilise au clavier, et les tableaux de chaque thème donnent les informations de la roue sous forme de texte.",
            "La réduction des animations, réglage de votre système, arrête les animations.",
            "Les pages peuvent être agrandies à 200 % dans le navigateur sans perte de contenu.",
            "Des thèmes clair et sombre, en français et en anglais.",
          ],
        },
        {
          h: "Ce qui manque",
          list: [
            "La roue du thème est difficile à utiliser avec un lecteur d’écran : ses éléments ne sont pas tous nommés, et le choix de l’un d’eux n’est pas annoncé. Les tableaux restent le bon accès pour l’instant.",
            "Certains menus ne prennent pas le focus du clavier à leur ouverture.",
            "Dans le thème clair, quelques petits textes gris et quelques marques du thème manquent de contraste.",
            "La plupart des tailles de texte sont fixes : agrandir la police par défaut du navigateur change peu, mais le zoom de la page fonctionne.",
          ],
        },
        {
          h: "Nous le dire",
          p: "Si quelque chose dans Ulune vous est difficile à utiliser, écrivez à {contact} : dites ce que vous avez essayé, et avec quoi (navigateur, lecteur d’écran). Chaque message est lu, et ce qui peut être corrigé le sera.",
        },
        {
          p: "Cette déclaration vient des propres vérifications d’Ulune (tests WCAG automatiques, essais au clavier et de contraste), pas d’un audit extérieur.",
        },
      ],
    },
  },
};
