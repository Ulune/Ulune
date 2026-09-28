import type { Locale } from "./locale";
/** Labels and short templates used by the natal reading card. The prose itself lives in src/lib/content. */
export const READING_COPY = {
  en: {
    aboutTitleAspect: "About aspects",
    aboutTitleHouse: "About houses",
    aboutTitleSign: "About signs",
    aspectKicker: "{level} · {orb} orb",
    decanKicker: "{span} · {faceSign} face · {ruler}",
    decanTitle: "{face} decan of {sign}",
    factCusp: "Cusp",
    factDecan: "Decan",
    factDignity: "Dignity",
    factElement: "Element",
    factHouse: "House",
    factModality: "Modality",
    factMotion: "Motion",
    factOrb: "Orb",
    factPlanets: "Planets",
    factRetro: "Retrograde",
    factRuler: "Ruler",
    factSign: "Sign",
    houseKickerEmpty: "Cusp {formatted} {sign} · unoccupied",
    houseKickerOcc: "Cusp {formatted} {sign} · {count} planet{plural}",
    kickerPlanet: "{formatted} {sign} · {face} decan ({ruler}) · {house}{rx}",
    major: "major",
    minor: "minor",
    rx: " · Rx",
    secAspects: "Aspects",
    secChart: "In your chart",
    secLinks: "Where it shows",
    secTenants: "Planets here",
    secTime: "Birth time unknown",
    timeAngle:
      "Without a birth time the chart is cast for 12:00, a stand-in. {name} goes round every sign in a day, so this one may not be yours; with the birth time it can be read.",
    timeAspect:
      "Without a birth time this aspect is the one at 12:00, a stand-in: at another hour of that day it may be wider, closer, or not there at all.",
    timeHouse:
      "Without a birth time the houses are cast for 12:00, a stand-in. They turn once a day, so this house may not match your life; with the birth time they can be read.",
    timeHouseOf: "Without a birth time its house ({house}) is the one it holds at 12:00, a stand-in.",
    timePoint:
      "Without a birth time the chart is cast for 12:00, a stand-in. {name} depends on the hour of birth, so this one may not be yours; with the birth time it can be read.",
    timeRough: "{name} moves {arc} that day, from {from} to {to}: its degree is known only roughly.",
    timeSigns: "{name} changes sign that day: {a} or {b}, depending on the hour.",
  },
  fr: {
    aboutTitleAspect: "À propos des aspects",
    aboutTitleHouse: "À propos des maisons",
    aboutTitleSign: "À propos des signes",
    aspectKicker: "{level} · orbe {orb}",
    decanKicker: "{span} · face {faceSign} · {ruler}",
    decanTitle: "{face} décan {sign}",
    factCusp: "Cuspide",
    factDecan: "Décan",
    factDignity: "Dignité",
    factElement: "Élément",
    factHouse: "Maison",
    factModality: "Modalité",
    factMotion: "Mouvement",
    factOrb: "Orbe",
    factPlanets: "Planètes",
    factRetro: "Rétrograde",
    factRuler: "Maître",
    factSign: "Signe",
    houseKickerEmpty: "Cuspide {formatted} {sign} · inoccupée",
    houseKickerOcc: "Cuspide {formatted} {sign} · {count} planète{plural}",
    kickerPlanet: "{formatted} {sign} · {face} décan ({ruler}) · {house}{rx}",
    major: "majeur",
    minor: "mineur",
    rx: " · ℞",
    secAspects: "Aspects",
    secChart: "Dans votre thème",
    secLinks: "Où cela se voit",
    secTenants: "Planètes ici",
    secTime: "Heure de naissance inconnue",
    timeAngle:
      "Sans heure de naissance, le thème est calculé pour 12 h, en attendant. {name} fait le tour des signes en une journée : celui-ci n’est peut-être pas le vôtre. Avec l’heure de naissance, il peut se lire.",
    timeAspect:
      "Sans heure de naissance, cet aspect est celui de 12 h, en attendant : à une autre heure de ce jour-là, il peut être plus large, plus serré, ou absent.",
    timeHouse:
      "Sans heure de naissance, les maisons sont calculées pour 12 h, en attendant. Elles font un tour par jour : cette maison ne correspond peut-être pas à votre vie. Avec l’heure de naissance, elles peuvent se lire.",
    timeHouseOf: "Sans heure de naissance, sa maison ({house}) est celle de 12 h, en attendant.",
    timePoint:
      "Sans heure de naissance, le thème est calculé pour 12 h, en attendant. {name} dépend de l’heure de naissance : celui-ci n’est peut-être pas le vôtre. Avec l’heure de naissance, il peut se lire.",
    timeRough: "{name} avance de {arc} ce jour-là, de {from} à {to} : son degré n’est connu qu’à peu près.",
    timeSigns: "{name} change de signe ce jour-là : {a} ou {b}, selon l’heure.",
  },
} as const;

export function fill(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

export function readingCopy(locale: Locale) {
  return READING_COPY[locale];
}
