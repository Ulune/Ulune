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
        "house-system",
        "intercepted",
      ],
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
      order: ["fixed-star"],
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
      id: "bodygraph",
      name: { en: "The bodygraph", fr: "Le bodygraph" },
      order: ["hd-layers", "hd-centres", "hd-undefined-open", "hd-gate", "hd-line", "hd-channel", "hd-hanging"],
    },
  ],
  numerology: [
    {
      id: "numbers",
      name: { en: "Numbers", fr: "Nombres" },
      order: ["master-numbers"],
    },
    {
      id: "positions",
      name: { en: "Core numbers", fr: "Nombres principaux" },
      order: [
        "life-path",
        "name-numbers",
        "birthday",
        "maturity",
        "hidden-passion",
        "finer-numbers",
        "planes",
        "stones",
        "bridge",
      ],
    },
    {
      id: "karmic",
      name: { en: "Karmic numbers", fr: "Nombres karmiques" },
      order: ["karmic-debt", "karmic-lesson"],
    },
    {
      id: "cycles",
      name: { en: "Cycles", fr: "Cycles" },
      order: ["personal-cycles", "pinnacle", "challenge", "period-cycle", "letter-cycle"],
    },
    {
      id: "methods",
      name: { en: "Methods", fr: "Méthodes" },
      order: ["chaldean", "birth-grid"],
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
