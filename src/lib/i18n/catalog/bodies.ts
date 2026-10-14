/** bodies: [English, French]. The Bodies tab's own words are a book of their own (bodies-words.ts). */
export const bodies = {
  aspectLayer: ["Aspect lines", "Lignes d’aspect"],
  layerBoth: ["Both", "Les deux"],
  aspectTooltip: ["{phrase} · orb {orb}", "{phrase} · orbe {orb}"],
  bodiesPageAngles: ["Angles", "Angles"],
  bodiesPageAspects: ["Aspects", "Aspects"],
  bodiesPageMarks: ["Stars & midpoints", "Étoiles et mi-points"],
  bodiesPagePlanets: ["Planets", "Planètes"],
  orbMax: ["Max orb", "Orbe max"],
  overlayAngularity: ["Angularity", "Angularité"],
  overlayHemisphere: ["Hemisphere", "Hémisphère"],
  overlayQuadrant: ["Quadrants", "Quadrants"],
  presetAdvanced: ["Advanced", "Avancé"],
  presetAll: ["All", "Tout"],
  presetClassic: ["Classic", "Classique"],
  presetMinimal: ["Minimal", "Minimal"],
  presetNone: ["Clear", "Vider"],
} as const satisfies Record<string, readonly [string, string]>;
