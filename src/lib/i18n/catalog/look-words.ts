/**
 * look-words: [English, French]. The Look tab's words (the first-load
 * trim's second pass, languages plan, part 30): the panel's settings and
 * their lines, and the profiles. Read by src/studio/dock/LookTab.tsx,
 * src/components/look-panel.tsx and look-profiles.tsx through bookT
 * (src/lib/i18n/words-book.ts), not spread into this folder's index: they
 * load with that code, when the tab or Settings opens, so every page's first
 * download leaves them out. The words other parts say too (the pages' names
 * and lessons, the tables' elements) stay in look.ts.
 * scripts/i18n-catalog.test.mjs checks them as it checks the others.
 */
export const lookWords = {
  lookAirKicker: ["Gemini, Libra, Aquarius.", "Gémeaux, Balance, Verseau."],
  lookAspectConj: ["Conjunction", "Conjonction"],
  lookAspectHard: ["Hard", "Durs"],
  lookAspectMinor: ["Minor", "Mineurs"],
  lookAspectSoft: ["Soft", "Doux"],
  lookAspects: ["Aspects", "Aspects"],
  lookAspectsKicker: ["Conjunction, hard, soft and minor lines.", "Conjonction, aspects durs, doux et mineurs."],
  lookAuto: ["Auto", "Auto"],
  lookChroma: ["Saturation", "Saturation"],
  lookDelete: ["Remove profile", "Retirer le profil"],
  lookEarthKicker: ["Taurus, Virgo, Capricorn.", "Taureau, Vierge, Capricorne."],
  lookElementsKicker: [
    "Fire, earth, air, water — signs on the wheel follow these.",
    "Feu, terre, air, eau — les signes de la roue les suivent.",
  ],
  lookFireKicker: ["Aries, Leo, Sagittarius.", "Bélier, Lion, Sagittaire."],
  lookGlyphs: ["Glyphs", "Glyphes"],
  lookGlyphsKicker: [
    "Wheel, chips and tables. Ulune Classic by default; a drawn mark when a font lacks the glyph.",
    "Roue, pastilles et tableaux. Ulune Classic par défaut\u202f; un tracé si la police n’a pas le glyphe.",
  ],
  lookGlyphsNoto: ["Noto", "Noto"],
  lookGlyphsStarSans: ["StarFont Sans", "StarFont Sans"],
  lookGlyphsStarSerif: ["StarFont Serif", "StarFont Serif"],
  lookHintSave: ["Adjust, then choose Save profile.", "Ajustez, puis choisissez «\u202fEnregistrer le profil\u202f»."],
  lookHintSaved: [
    "This profile is saved. Switch to it at any time from the chips.",
    "Ce profil est enregistré. Retrouvez-le dans les pastilles.",
  ],
  lookLightness: ["Lightness", "Luminosité"],
  lookUlune: ["Ulune", "Ulune"],
  lookOuterAspects: ["Outer aspects", "Aspects extérieurs"],
  lookOuterAspectsKicker: ["Transits, progressions and partner lines.", "Transits, progressions et lignes du partenaire."],
  lookPairingClassic: ["Classic", "Classique"],
  lookPairingClean: ["Clean", "Net"],
  lookPairingEditorial: ["Editorial", "Éditorial"],
  lookPlanetInkElement: ["By element", "Par élément"],
  lookPlanetInkKicker: [
    "Plain in the text colour, the classical colours, or tinted by the element of each planet’s sign.",
    "Unies dans la couleur du texte, les couleurs classiques, ou teintées par l’élément du signe de chaque planète.",
  ],
  lookPlanetInkPlain: ["Plain", "Unies"],
  lookPlanetInkTraditional: ["Traditional", "Traditionnelles"],
  lookPlanets: ["Planets", "Planètes"],
  lookPlanetsKicker: [
    "Auto follows each planet’s sign. Pick a hue to pin a glyph’s colour.",
    "Auto suit le signe de chaque planète. Choisissez un ton pour fixer la couleur d’un glyphe.",
  ],
  lookProfileN: ["Profile {n}", "Profil {n}"],
  lookProfiles: ["Profiles", "Profils"],
  lookProfilesFull: [
    "Eight profiles saved. Remove one to add another.",
    "Huit profils. Retirez-en un pour en ajouter.",
  ],
  lookProfilesKicker: [
    "Save this look as a profile, then switch between profiles here.",
    "Enregistrez ce style comme profil, puis passez de l’un à l’autre ici.",
  ],
  lookRename: ["Name", "Nom"],
  lookReset: ["Reset to Ulune defaults", "Rétablir les réglages d’Ulune"],
  lookResetHint: ["Ruby, emerald, gold, sapphire — Classic type.", "Rubis, émeraude, or, saphir — typo Classique."],
  lookSave: ["Save profile", "Enregistrer le profil"],
  lookSaved: ["Saved", "Enregistré"],
  lookStroke: ["Wheel lines", "Traits de la roue"],
  lookStrokeHeavy: ["Heavy", "Gras"],
  lookStrokeKicker: ["How thick the aspect lines are.", "L’épaisseur des lignes d’aspect."],
  lookStrokeRegular: ["Regular", "Normal"],
  lookStrokeThin: ["Thin", "Fin"],
  lookTextSize: ["Text size", "Taille du texte"],
  lookType: ["Type", "Typographie"],
  lookTypeKicker: ["Display and body, as a pair.", "Titres et corps, en paire."],
  lookWaterKicker: ["Cancer, Scorpio, Pisces.", "Cancer, Scorpion, Poissons."],
  lookDepth: ["Depth", "Profondeur"],
  lookDepthKicker: [
    "Charts can tip into a 3D view. Saved on this device.",
    "Les thèmes peuvent basculer en vue 3D. Enregistré sur cet appareil.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
