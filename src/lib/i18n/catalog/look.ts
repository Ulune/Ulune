/** look: [English, French]. The Look tab's own words are a book of their own (look-words.ts). */
export const look = {
  // The glyph face's name, read by scripts/font-names.test.mjs here.
  lookGlyphsAstronomicon: ["Ulune Classic", "Ulune Classic"],
  lookElements: ["Elements", "Éléments"],
  lookPageProfiles: ["Profiles", "Profils"],
  lookPageTypeInk: ["Type & lines", "Typo & traits"],
  lookTeachProfiles: [
    "Saved looks. Switch without leaving the panel.",
    "Vos styles enregistrés. Changez sans quitter le panneau.",
  ],
  lookTeachTypeInk: [
    "Typeface pairing, glyph face, text size, line weight, planet colour and depth.",
    "Paire de polices, glyphes, taille du texte, épaisseur des traits, couleur des planètes et profondeur.",
  ],
  lookingUpPlace: ["Looking up the place…", "Recherche du lieu…"],
  lookPageElements: ["Elements", "Éléments"],
  lookPageAspects: ["Aspects", "Aspects"],
  lookPagePlanets: ["Planets", "Planètes"],
  lookTeachElements: [
    "Fire, earth, air and water. The sign colours on the wheel follow these.",
    "Feu, terre, air et eau. Les couleurs des signes sur la roue les suivent.",
  ],
  lookTeachAspects: [
    "Conjunction, hard, soft and minor lines — plus the outer ring’s aspects when a second sky is shown.",
    "Conjonction, aspects durs, doux et mineurs — plus ceux de l’anneau extérieur quand un second ciel est affiché.",
  ],
  lookTeachPlanets: [
    "Auto colours each planet by its sign’s element. Pick a hue to fix a planet’s colour.",
    "Auto colore chaque planète selon l’élément de son signe. Choisissez un ton pour fixer sa couleur.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
