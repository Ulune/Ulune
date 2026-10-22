import type { Bi } from "./types";

/*
 * "You two, now" on Human Design's connection chart (share and compare plan,
 * feature 5e): the planets' gates at this moment over the two people's
 * bodygraphs, said for two. A channel the moment completes is borrowed from
 * the sky while the planets stay on their gates: a theme to notice together,
 * never a trait of either person or a verdict on the relationship. Read
 * through the connection chart's reading pack (pack-hd-pair.ts), one language
 * at a time. {channel}: "34–20 · Charisma"; {bodies}: "Sun, Mercury".
 */
export const HDN_TEXT = {
  lead: {
    en: "At this moment the planets complete {n} for the two of you, borrowed from the sky while they stay on their gates: the Moon’s for hours, the slow planets’ for months. A theme you may feel together while it lasts, never a trait of either of you.",
    fr: "En ce moment, les planètes complètent {n} pour vous deux, empruntés au ciel tant qu’elles restent sur leurs portes\u202f: quelques heures pour la Lune, des mois pour les planètes lentes. Un thème que vous pouvez ressentir ensemble tant qu’il dure, jamais un trait de l’un ou de l’autre.",
  },
  quiet: {
    en: "At this moment the planets complete no channel for the two of you: the connection rests on what you bring to it, which is also a quiet invitation to notice your own rhythm together.",
    fr: "En ce moment, les planètes ne complètent aucun canal pour vous deux\u202f: la connexion repose sur ce que vous y apportez, ce qui invite aussi à remarquer votre propre rythme à deux.",
  },
  byPerson: {
    en: "The moment brings gate {g} ({bodies}) to {name}’s gate {h}: the channel {channel} is complete for now through {name}, who may carry its theme into your time together. The sky’s gift for a while, not a lasting trait.",
    fr: "Le moment apporte la porte {g} ({bodies}) à la porte {h} {deName}\u202f: le canal {channel} est complet pour l’instant par {name}, qui peut en porter le thème dans votre temps ensemble. Un cadeau du ciel pour un temps, pas un trait durable.",
  },
  byBoth: {
    en: "The moment brings gate {g} ({bodies}) to gate {h}, which you both hold: the channel {channel} is complete for each of you at once, a shared theme while it lasts.",
    fr: "Le moment apporte la porte {g} ({bodies}) à la porte {h}, que vous avez tous les deux\u202f: le canal {channel} est complet pour chacun de vous à la fois, un thème partagé tant qu’il dure.",
  },
  bySky: {
    en: "The moment holds both gates, {g} and {h} ({bodies}): the channel {channel} is complete for everyone today, the two of you included; a background colour of the day rather than something of yours.",
    fr: "Le moment tient les deux portes, {g} et {h} ({bodies})\u202f: le canal {channel} est complet pour tout le monde aujourd’hui, vous deux compris\u202f; une couleur de fond de la journée plutôt que quelque chose de vous.",
  },
  centres: {
    en: "With these channels the moment defines {list} between you, centres your connection otherwise leaves open: a few hours or days of steadier ground there, worth noticing rather than relying on.",
    fr: "Avec ces canaux, le moment définit {list} entre vous, des centres que votre connexion laisse sinon ouverts\u202f: quelques heures ou quelques jours d’un terrain plus stable, à remarquer plutôt qu’à attendre.",
  },
  about: {
    en: "“You two, now” lays the planets’ gates at this moment over your connection chart (Human Design calls the passing planets transits): the channels they complete with your gates, and the centres they define between you. They change as the planets move, the Moon’s within hours, the slow planets’ over months. Suggestions to notice, never a verdict.",
    fr: "«\u202fVous deux, maintenant\u202f» pose les portes des planètes en ce moment sur votre carte de connexion (le Human Design appelle transits les planètes qui passent)\u202f: les canaux qu’elles complètent avec vos portes, et les centres qu’elles définissent entre vous. Ils changent avec les planètes, en quelques heures pour la Lune, en quelques mois pour les planètes lentes. Des suggestions à remarquer, jamais un verdict.",
  },
  channelOne: { en: "one channel", fr: "un canal" },
  channelMany: { en: "{n} channels", fr: "{n} canaux" },
  theChannel: { en: "The channel", fr: "Le canal" },
  whatItMeets: { en: "What the moment meets", fr: "Ce que le moment rencontre" },
  moment: { en: "The moment’s gates", fr: "Les portes du moment" },
  centresTitle: { en: "Centres defined for now", fr: "Centres définis pour l’instant" },
} satisfies Record<string, Bi>;
