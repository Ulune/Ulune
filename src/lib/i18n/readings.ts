import type { Locale } from "./locale";
/** Labels and short templates used by the natal reading card. The prose itself lives in src/lib/content. */
export const READING_COPY = {
  en: {
    aboutTitleAspect: "About aspects",
    aboutTitleHouse: "About houses",
    aboutTitleSign: "About signs",
    aspectKicker: "{level} · {orb}° orb",
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
  },
  fr: {
    aboutTitleAspect: "À propos des aspects",
    aboutTitleHouse: "À propos des maisons",
    aboutTitleSign: "À propos des signes",
    aspectKicker: "{level} · orbe {orb}°",
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
