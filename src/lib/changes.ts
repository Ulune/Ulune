/*
 * What's new: the versions of Ulune and what each one brought, in English and
 * French, rendered like the legal pages (components/legal-page.tsx). When a
 * version ships, add it at the top, set APP_VERSION (lib/app-identity.ts) and
 * change the date.
 */
import type { LegalText } from "@/lib/legal/pages";

export const CHANGES_UPDATED = "2026-09-28";

export const CHANGES: Record<"en" | "fr", LegalText> = {
  en: {
    title: "What’s new",
    updated: "Updated {date}",
    blocks: [
      {
        h: "Ulune 1.0",
        p: "The first public version:",
        list: [
          "Your birth chart as a wheel or a table, flat or in 3D, with a reading for each planet, point, house, sign and aspect.",
          "Transits with a time slider, the exact aspects of the day, month and year, and secondary progressions.",
          "Synastry and the composite chart of two people.",
          "Human Design and numerology, from the same birth details.",
          "Positions from the Swiss Ephemeris; birth times read with each place’s full time-zone history; ten house systems.",
          "No account, and nothing kept on the server; to keep charts, a private space on your device, encrypted.",
          "English and French; a guide, a one-minute tour and a glossary; the chart by keyboard and screen reader.",
        ],
      },
    ],
  },
  fr: {
    title: "Nouveautés",
    updated: "Mis à jour le {date}",
    blocks: [
      {
        h: "Ulune 1.0",
        p: "La première version publique :",
        list: [
          "Votre thème natal en roue ou en tableau, à plat ou en 3D, avec une lecture pour chaque planète, point, maison, signe et aspect.",
          "Les transits avec un curseur de temps, les aspects exacts du jour, du mois et de l’année, et les progressions secondaires.",
          "La synastrie et le thème composite de deux personnes.",
          "Le Human Design et la numérologie, à partir des mêmes données de naissance.",
          "Des positions de la Swiss Ephemeris ; les heures de naissance lues avec tout l’historique du fuseau de chaque lieu ; dix systèmes de maisons.",
          "Pas de compte, et rien de gardé sur le serveur ; pour garder des thèmes, un espace privé sur votre appareil, chiffré.",
          "En anglais et en français ; un guide, une visite d’une minute et un lexique ; le thème au clavier et au lecteur d’écran.",
        ],
      },
    ],
  },
};
