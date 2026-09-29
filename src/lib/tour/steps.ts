/**
 * The tour's steps, in the order they come, with their words in English and
 * French (they download with the tour, not with the first view). Each step
 * points at one thing on screen, found by selector; when a phone and a
 * computer need different words, `compact` holds the phone's.
 */
type Pair = readonly [string, string];

export type TourStepId = "chart" | "planets" | "houses" | "aspects" | "reading" | "table" | "modes" | "keep";

export type TourStep = {
  id: TourStepId;
  /** Tried in order; the first one on screen is the target. */
  targets: readonly string[];
  title: Pair;
  body: Pair;
  compact?: Pair;
};

/** The stage's figure on the birth chart page: the wheel, flat or in 3D. */
const FIGURE = '[data-testid="studio-natal"] .ulune-stage-figure';

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "chart",
    targets: [FIGURE],
    title: ["A birth chart", "Un thème natal"],
    // {who} is filled by the tour: the sample's moment, or the chart's name.
    body: [
      "The sky at one moment, seen from one place. {who}",
      "Le ciel d’un instant, vu d’un lieu. {who}",
    ],
  },
  {
    id: "planets",
    targets: [FIGURE],
    title: ["The planets", "Les planètes"],
    body: [
      "Each glyph is a planet or a point, in one of the twelve signs around the rim. Point at one to see its aspects; click to pin it.",
      "Chaque glyphe est une planète ou un point, dans l’un des douze signes du pourtour. Survolez-en un pour voir ses aspects ; cliquez pour l’épingler.",
    ],
    compact: [
      "Each glyph is a planet or a point, in one of the twelve signs around the rim. Tap one to see its aspects; tap again to let go.",
      "Chaque glyphe est une planète ou un point, dans l’un des douze signes du pourtour. Touchez-en un pour voir ses aspects ; touchez encore pour le relâcher.",
    ],
  },
  {
    id: "houses",
    targets: [FIGURE],
    title: ["Houses and angles", "Maisons et angles"],
    body: [
      "The twelve numbered slices are the houses, the areas of life. The arrows mark the Ascendant, the rising sign, and the Midheaven. Both depend on the birth time.",
      "Les douze parts numérotées sont les maisons, les domaines de la vie. Les flèches marquent l’Ascendant, le signe qui se levait, et le Milieu du Ciel. Tous deux dépendent de l’heure de naissance.",
    ],
  },
  {
    id: "aspects",
    targets: ['[data-testid="aspect-strip"]', FIGURE],
    title: ["Aspects", "Aspects"],
    body: [
      "The lines across the middle are aspects: planets at set angles to each other, such as 90° or 120°. The strip counts them by kind; point at a kind to light it, click to hide it.",
      "Les lignes qui traversent le centre sont des aspects : des planètes à des angles précis l’une de l’autre, comme 90° ou 120°. La bande les compte par sorte ; survolez une sorte pour l’éclairer, cliquez pour la masquer.",
    ],
    compact: [
      "The lines across the middle are aspects: planets at set angles to each other, such as 90° or 120°. The strip counts them by kind; tap a kind to hide it or bring it back.",
      "Les lignes qui traversent le centre sont des aspects : des planètes à des angles précis l’une de l’autre, comme 90° ou 120°. La bande les compte par sorte ; touchez une sorte pour la masquer ou la remettre.",
    ],
  },
  {
    id: "reading",
    targets: ['[data-testid="dock"]'],
    title: ["The reading", "La lecture"],
    body: [
      "It starts with the Sun, the Moon and the Ascendant. Whatever you pick on the wheel opens its text here.",
      "Elle commence par le Soleil, la Lune et l’Ascendant. Tout ce que vous choisissez sur la roue ouvre son texte ici.",
    ],
  },
  {
    id: "table",
    targets: ['[data-testid="view-table"]'],
    title: ["Wheel or table", "Roue ou tableau"],
    body: [
      "Prefer numbers? Table shows the same chart as positions to the arc-second.",
      "Vous préférez les chiffres ? Le tableau montre le même thème, positions à la seconde d’arc.",
    ],
  },
  {
    id: "modes",
    targets: ['[data-testid="studio-nav"]'],
    title: ["Time, Pair and Systems", "Temps, Duo et Systèmes"],
    body: [
      "They use this chart too: today’s transits and a calendar of the sky, a second person, Human Design and numerology.",
      "Ils partent aussi de ce thème : les transits du jour et un calendrier du ciel, une deuxième personne, le Human Design et la numérologie.",
    ],
  },
  {
    id: "keep",
    targets: ['[data-testid="space-button"]'],
    title: ["Your charts", "Vos thèmes"],
    body: [
      "Charts, at the top, switches between the charts you’ve cast. They go when this tab closes, unless you sign in: then they’re kept on this device, encrypted.",
      "Thèmes, en haut, passe d’un thème calculé à l’autre. Ils partent à la fermeture de l’onglet, sauf si vous vous connectez : ils sont alors gardés sur cet appareil, chiffrés.",
    ],
  },
];

/** The words around the steps. */
export const TOUR_WORDS = {
  label: ["Tour", "Visite"],
  back: ["Back", "Retour"],
  next: ["Next", "Suivant"],
  done: ["Done", "Terminé"],
  skip: ["Skip tour", "Passer la visite"],
  castOwn: ["Cast your own", "Calculer le vôtre"],
  count: ["{n} of {total}", "{n} sur {total}"],
  preparing: ["Opening the sample chart…", "Ouverture du thème d’exemple…"],
  whoSample: [
    "This one is 1 January 2000, noon, at Greenwich: a moment and a place, nobody’s birth.",
    "Celui-ci est le 1er janvier 2000, midi, à Greenwich : un instant et un lieu, la naissance de personne.",
  ],
  whoNamed: ["This one is {name}’s.", "Celui-ci est celui de {name}."],
  whoOwn: ["This one is the chart you cast.", "Celui-ci est le thème que vous avez calculé."],
} as const satisfies Record<string, Pair>;
