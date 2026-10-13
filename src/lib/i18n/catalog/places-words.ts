/**
 * places-words: [English, French]. The chart switcher's and ⌘K's homes
 * (reorganisation plan, R9: "People and places"): the two groups' headings,
 * a home's line under its name, the way to unlock the homes kept.
 *
 * Read by src/lib/i18n/places-words.ts, not spread into this folder's
 * index: only the switcher's homes (studio/shell/picker-places.tsx, loaded
 * when they are needed) and the palette say them, so they stay out of every
 * page's first download. scripts/i18n-catalog.test.mjs checks them as it
 * checks the others.
 */
export const placesWords = {
  placesPeople: ["People", "Personnes"],
  placesHomes: ["Homes", "Logements"],
  placesLocked: ["Unlock your private space to see your homes.", "Déverrouillez votre espace privé pour voir vos logements."],
  placesBuilt: ["Built in {year}", "Construit en {year}"],
  placesOnMap: ["{deg} on a map", "{deg} sur une carte"],
} as const satisfies Record<string, readonly [string, string]>;
