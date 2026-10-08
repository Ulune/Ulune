/*
 * The encyclopedia's fixed vocabulary (encyclopedia plan, part 1): the
 * languages, the traditions with their homes, the families inside each
 * tradition and the order of the entries in them, and the section headings a
 * page's body may use. The build (build.mjs) checks every entry against it and
 * ships the names to the site with the data, so the pages, the cards and the
 * search all read one list.
 *
 * Adding a family or a tradition is a change here, in both languages; an
 * entry naming one that is not here fails the build with its file and line.
 */

import { COMBINATION_FAMILIES, combinationIds } from "./combinations.mjs";

export const LANGS = /** @type {const} */ (["en", "fr"]);

/**
 * The traditions, in the order the encyclopedia's home shows them. `home` is
 * the tradition's address segment in each language (/encyclopedia/astrology,
 * /encyclopedie/astrologie): no entry may take it as its slug. A tradition
 * with no entry yet has no home and is not shown.
 */
export const TRADITIONS = [
  {
    id: "astrology",
    name: { en: "Astrology", fr: "Astrologie" },
    home: { en: "astrology", fr: "astrologie" },
    intro: {
      en: "The sky at a moment, read through the planets, the signs, the houses and the angles between them.",
      fr: "Le ciel d’un instant, lu à travers les planètes, les signes, les maisons et les angles qui les relient.",
    },
  },
  {
    id: "human-design",
    name: { en: "Human Design", fr: "Human Design" },
    home: { en: "human-design", fr: "design-humain" },
    intro: {
      en: "A bodygraph of nine centres and 64 gates, coloured by the planets at birth and about three months before it.",
      fr: "Un bodygraph de neuf centres et de 64 portes, colorées par les planètes à la naissance et environ trois mois plus tôt.",
    },
  },
  {
    id: "numerology",
    name: { en: "Numerology", fr: "Numérologie" },
    home: { en: "numerology", fr: "numerologie" },
    intro: {
      en: "The birth date and the name turned into numbers, each read for a quality, a position or a cycle of life.",
      fr: "La date de naissance et le nom changés en nombres, chacun lu comme une qualité, une position ou un cycle de vie.",
    },
  },
  {
    id: "shared",
    name: { en: "Shared ideas", fr: "Idées communes" },
    home: { en: "shared-ideas", fr: "idees-communes" },
    intro: {
      en: "The ideas several traditions share, each told as every tradition tells it.",
      fr: "Les idées que plusieurs traditions partagent, chacune racontée comme chaque tradition la raconte.",
    },
  },
];

/**
 * The families of each tradition, in the order its home lists them, with the
 * order of the entries inside each (`order`: ids first in that order, any
 * other id after them, alphabetically). Previous and next on a page follow
 * the same order.
 */
export const FAMILIES = {
  astrology: [
    {
      id: "planets",
      name: { en: "Planets", fr: "Planètes" },
      order: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
    },
    {
      id: "small-bodies",
      name: { en: "Small bodies", fr: "Petits corps" },
      order: ["chiron", "ceres", "pallas", "juno", "vesta", "eris", "sedna"],
    },
    {
      id: "points",
      name: { en: "Points", fr: "Points" },
      order: ["north-node", "south-node", "lilith", "part-of-fortune", "vertex"],
    },
    {
      id: "angles",
      name: { en: "Angles", fr: "Angles" },
      order: ["ascendant", "descendant", "midheaven", "imum-coeli"],
    },
    {
      id: "signs",
      name: { en: "Signs", fr: "Signes" },
      order: [
        "sign",
        "aries",
        "taurus",
        "gemini",
        "cancer",
        "leo",
        "virgo",
        "libra",
        "scorpio",
        "sagittarius",
        "capricorn",
        "aquarius",
        "pisces",
        "decan",
      ],
    },
    {
      id: "elements",
      name: { en: "Elements and modalities", fr: "Éléments et modalités" },
      order: [
        "element-fire",
        "element-earth",
        "element-air",
        "element-water",
        "modality-cardinal",
        "modality-fixed",
        "modality-mutable",
      ],
    },
    {
      id: "houses",
      name: { en: "Houses", fr: "Maisons" },
      order: [
        "house",
        "house-1",
        "house-2",
        "house-3",
        "house-4",
        "house-5",
        "house-6",
        "house-7",
        "house-8",
        "house-9",
        "house-10",
        "house-11",
        "house-12",
        "intercepted",
      ],
    },
    {
      id: "house-systems",
      name: { en: "House systems", fr: "Systèmes de maisons" },
      order: ["house-system", "placidus", "whole-sign", "equal-houses", "porphyry", "koch", "regiomontanus", "campanus", "alcabitius", "morinus", "topocentric"],
    },
    {
      id: "aspects",
      name: { en: "Aspects", fr: "Aspects" },
      order: [
        "aspect",
        "orb",
        "applying",
        "parallel",
        "out-of-sign",
        "conjunction",
        "opposition",
        "trine",
        "square",
        "sextile",
        "quincunx",
        "semi-sextile",
        "semi-square",
        "quintile",
      ],
    },
    {
      id: "patterns",
      name: { en: "Patterns", fr: "Configurations" },
      order: ["stellium", "grand-trine", "t-square", "grand-cross", "yod", "kite", "mystic-rectangle"],
    },
    {
      id: "dignities",
      name: { en: "Dignities", fr: "Dignités" },
      order: [
        "domicile",
        "detriment",
        "exaltation",
        "fall",
        "triplicity",
        "term",
        "face",
        "peregrine",
        "sect",
        "combust",
        "dispositor",
        "reception",
      ],
    },
    {
      id: "cycles",
      name: { en: "The sky’s cycles", fr: "Les cycles du ciel" },
      order: ["retrograde", "station", "ingress", "moon-phase", "eclipse", "void-of-course", "season"],
    },
    {
      id: "coordinates",
      name: { en: "Coordinates", fr: "Coordonnées" },
      order: ["declination", "latitude", "out-of-bounds", "sidereal-time"],
    },
    {
      id: "fixed-stars",
      name: { en: "Fixed stars", fr: "Étoiles fixes" },
      order: ["fixed-star", "aldebaran", "regulus", "antares", "fomalhaut", "spica", "algol"],
    },
    {
      id: "techniques",
      name: { en: "Techniques", fr: "Techniques" },
      order: ["transit", "exact", "window", "progression", "synastry", "composite", "midpoint", "lot"],
    },
  ],
  "human-design": [
    {
      id: "keys",
      name: { en: "The keys", fr: "Les clés" },
      order: [
        "hd-type",
        "hd-strategy",
        "hd-authority",
        "hd-not-self",
        "hd-profile",
        "hd-definition",
        "hd-cross",
        "hd-variable",
      ],
    },
    {
      id: "types",
      name: { en: "Types", fr: "Types" },
      order: ["hd-manifestor", "hd-generator", "hd-manifesting-generator", "hd-projector", "hd-reflector"],
    },
    {
      id: "authorities",
      name: { en: "Authorities", fr: "Autorités" },
      order: ["hd-authority-emotional", "hd-authority-sacral", "hd-authority-splenic", "hd-authority-ego", "hd-authority-self-projected", "hd-authority-mental", "hd-authority-lunar"],
    },
    {
      id: "profiles",
      name: { en: "Lines and profiles", fr: "Lignes et profils" },
      order: ["hd-line-1", "hd-line-2", "hd-line-3", "hd-line-4", "hd-line-5", "hd-line-6", "hd-profile-1-3", "hd-profile-1-4", "hd-profile-2-4", "hd-profile-2-5", "hd-profile-3-5", "hd-profile-3-6", "hd-profile-4-6", "hd-profile-4-1", "hd-profile-5-1", "hd-profile-5-2", "hd-profile-6-2", "hd-profile-6-3"],
    },
    {
      id: "bodygraph",
      name: { en: "The bodygraph", fr: "Le bodygraph" },
      order: ["hd-layers", "hd-centres", "hd-undefined-open", "hd-gate", "hd-line", "hd-channel", "hd-hanging"],
    },
    {
      id: "centres",
      name: { en: "Centres", fr: "Centres" },
      order: ["hd-centre-head", "hd-centre-ajna", "hd-centre-throat", "hd-centre-g", "hd-centre-heart", "hd-centre-sacral", "hd-centre-solar-plexus", "hd-centre-spleen", "hd-centre-root"],
    },
    {
      id: "gates",
      name: { en: "Gates", fr: "Portes" },
      order: ["hd-gate-1", "hd-gate-2", "hd-gate-3", "hd-gate-4", "hd-gate-5", "hd-gate-6", "hd-gate-7", "hd-gate-8", "hd-gate-9", "hd-gate-10", "hd-gate-11", "hd-gate-12", "hd-gate-13", "hd-gate-14", "hd-gate-15", "hd-gate-16", "hd-gate-17", "hd-gate-18", "hd-gate-19", "hd-gate-20", "hd-gate-21", "hd-gate-22", "hd-gate-23", "hd-gate-24", "hd-gate-25", "hd-gate-26", "hd-gate-27", "hd-gate-28", "hd-gate-29", "hd-gate-30", "hd-gate-31", "hd-gate-32", "hd-gate-33", "hd-gate-34", "hd-gate-35", "hd-gate-36", "hd-gate-37", "hd-gate-38", "hd-gate-39", "hd-gate-40", "hd-gate-41", "hd-gate-42", "hd-gate-43", "hd-gate-44", "hd-gate-45", "hd-gate-46", "hd-gate-47", "hd-gate-48", "hd-gate-49", "hd-gate-50", "hd-gate-51", "hd-gate-52", "hd-gate-53", "hd-gate-54", "hd-gate-55", "hd-gate-56", "hd-gate-57", "hd-gate-58", "hd-gate-59", "hd-gate-60", "hd-gate-61", "hd-gate-62", "hd-gate-63", "hd-gate-64"],
    },
    {
      id: "channels",
      name: { en: "Channels", fr: "Canaux" },
      order: ["hd-channel-64-47", "hd-channel-61-24", "hd-channel-63-4", "hd-channel-17-62", "hd-channel-43-23", "hd-channel-11-56", "hd-channel-16-48", "hd-channel-20-57", "hd-channel-34-20", "hd-channel-10-20", "hd-channel-31-7", "hd-channel-8-1", "hd-channel-33-13", "hd-channel-45-21", "hd-channel-12-22", "hd-channel-35-36", "hd-channel-10-57", "hd-channel-10-34", "hd-channel-25-51", "hd-channel-15-5", "hd-channel-2-14", "hd-channel-46-29", "hd-channel-44-26", "hd-channel-40-37", "hd-channel-50-27", "hd-channel-32-54", "hd-channel-28-38", "hd-channel-18-58", "hd-channel-34-57", "hd-channel-59-6", "hd-channel-9-52", "hd-channel-3-60", "hd-channel-42-53", "hd-channel-19-49", "hd-channel-39-55", "hd-channel-41-30"],
    },
    {
      id: "circuits",
      name: { en: "Circuits", fr: "Circuits" },
      order: ["hd-circuit-individual", "hd-circuit-knowing", "hd-circuit-centering", "hd-circuit-collective", "hd-circuit-logic", "hd-circuit-sensing", "hd-circuit-tribal", "hd-circuit-ego", "hd-circuit-defense", "hd-circuit-integration"],
    },
    {
      id: "variables",
      name: { en: "Variables", fr: "Variables" },
      order: ["hd-arrow-determination", "hd-arrow-environment", "hd-arrow-perspective", "hd-arrow-motivation"],
    },
    {
      id: "crosses",
      name: { en: "Crosses", fr: "Croix" },
      order: ["hd-cross-right-angle", "hd-cross-juxtaposition", "hd-cross-left-angle"],
    },
  ],
  numerology: [
    {
      id: "numbers",
      name: { en: "Numbers", fr: "Nombres" },
      order: ["number-1", "number-2", "number-3", "number-4", "number-5", "number-6", "number-7", "number-8", "number-9", "number-11", "number-22", "number-33", "number-0", "master-numbers"],
    },
    {
      id: "positions",
      name: { en: "Core numbers", fr: "Nombres principaux" },
      order: [
        "life-path",
        "name-numbers",
        "expression",
        "soul-urge",
        "personality-number",
        "birthday",
        "maturity",
        "hidden-passion",
        "finer-numbers",
        "balance-number",
        "rational-thought",
        "attitude-number",
        "subconscious-self",
        "planes",
        "plane-physical",
        "plane-mental",
        "plane-emotional",
        "plane-intuitive",
        "stones",
        "cornerstone",
        "capstone",
        "first-vowel",
        "bridge",
      ],
    },
    {
      id: "karmic",
      name: { en: "Karmic numbers", fr: "Nombres karmiques" },
      order: ["karmic-debt", "karmic-debt-13", "karmic-debt-14", "karmic-debt-16", "karmic-debt-19", "karmic-lesson"],
    },
    {
      id: "cycles",
      name: { en: "Cycles", fr: "Cycles" },
      order: ["personal-cycles", "personal-year", "personal-month", "personal-day", "universal-year", "pinnacle", "challenge", "period-cycle", "letter-cycle", "essence"],
    },
    {
      id: "grid",
      name: { en: "The birth grid", fr: "La grille de naissance" },
      order: ["birth-grid", "grid-3-6-9", "grid-2-5-8", "grid-1-4-7", "grid-1-2-3", "grid-4-5-6", "grid-7-8-9", "grid-1-5-9", "grid-3-5-7"],
    },
    {
      id: "methods",
      name: { en: "Methods", fr: "Méthodes" },
      order: ["pythagorean", "chaldean"],
    },
  ],
  shared: [
    {
      id: "ideas",
      name: { en: "Ideas", fr: "Idées" },
      order: [],
    },
  ],
};
// The combination pages' families (part 17), after each tradition's own, their order made from the lists.
for (const [tradition, list] of Object.entries(COMBINATION_FAMILIES)) {
  const ids = combinationIds();
  for (const f of list) FAMILIES[tradition].push({ id: f.id, name: f.name, order: ids[f.group] });
}


/**
 * A page's body sections, in this fixed order, each optional, with exactly
 * these headings (`## ` and the words). `key` is the section's anchor on the
 * page, the same in both languages.
 */
export const SECTIONS = [
  { key: "meaning", en: "Meaning", fr: "Sens" },
  { key: "practice", en: "In practice", fr: "En pratique" },
  { key: "traditions", en: "Across traditions", fr: "D’une tradition à l’autre" },
  { key: "history", en: "Origin and history", fr: "Origine et histoire" },
  { key: "calculation", en: "How Ulune calculates it", fr: "Comment Ulune le calcule" },
  { key: "correspondences", en: "Correspondences", fr: "Correspondances" },
];

export const KINDS = ["core", "combination", "context"];

/** The front matter's keys; the others are refused. */
export const REQUIRED_KEYS = ["id", "lang", "slug", "title", "tradition", "family", "kind", "page", "summary", "revised"];
export const OPTIONAL_KEYS = ["aliases", "glyph", "related", "sources"];
/** Keys whose value is a list (inline `[a, b]` or a block of `  - ` lines). */
export const LIST_KEYS = ["aliases", "related", "sources"];

/** The card's sentence: one, at most this many characters. */
export const SUMMARY_MAX = 160;

/** An id, and a slug: lowercase ASCII words joined by hyphens. */
export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
