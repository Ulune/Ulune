/*
 * What Chinese astrology says in time and between two people (languages
 * plan, part 11): the year ahead and its months by how they meet your year
 * animal, two people's animals by how they meet, the Calendar's day animal
 * and clash day. Written for Ulune in English and French, in the same voice
 * as zodiac-texts.ts (a year to know, not a fate).
 *
 * Apart from the portraits and the sixty pairs since languages plan, part 30:
 * the Calendar's day layer (calendar-chinese.ts) reads two of these texts and
 * no longer fetches the rest of Chinese astrology's.
 * scripts/chinese-readings.test.mjs keeps every text present in both
 * languages, its typography and its tone.
 */
import type { Both } from "./both";
import type { RelationKind } from "./relations";

/** How a time's or a person's animal meets one of yours, or "none". */
export type MeetText = "same" | RelationKind | "none";

/**
 * The year ahead for the year animal, by how it meets the year's animal,
 * the Tai Sui (太歲), the year's ruler in the tradition. Tradition, said in
 * Ulune's words: a year to know, not a fate.
 */
export const YEAR_TEXTS: Readonly<Record<MeetText, Both>> = {
  same: [
    "Your own year (本命年 běnmìngnián): the year comes back to your animal, as it does every twelve years. The tradition calls it meeting the Tai Sui, the year’s ruler, face to face: a year of renewal that asks for care with big changes, and many wear red through it as a friendly sign.",
    "Votre propre année (本命年 běnmìngnián)\u202f: l’année revient à votre animal, comme tous les douze ans. La tradition y voit la rencontre face à face avec le Tai Sui, le maître de l’année\u202f: une année de renouveau qui demande du soin dans les grands changements, et beaucoup portent du rouge tout au long, comme un signe amical.",
  ],
  clash: [
    "The year’s animal is opposite yours: the tradition calls it clashing with the Tai Sui (沖太歲). It reads such a year as the one most likely to move things, at home, at work or in habits; a change chosen early often goes better than one that comes by itself.",
    "L’animal de l’année est opposé au vôtre\u202f: la tradition parle de choc avec le Tai Sui (沖太歲). Elle y lit l’année la plus propice au mouvement, au foyer, au travail ou dans les habitudes\u202f; un changement choisi tôt se passe souvent mieux que celui qui arrive de lui-même.",
  ],
  harm: [
    "The year’s animal and yours are one of the six harms (害太歲): the tradition reads small frictions and misunderstandings, worth meeting with plain words and patience.",
    "L’animal de l’année et le vôtre forment une des six nuisances (害太歲)\u202f: la tradition y lit de petites frictions et des malentendus, à accueillir avec des mots simples et de la patience.",
  ],
  punishment: [
    "The year’s animal and yours are of one punishment (刑太歲): the tradition reads a year of pressure and of rules to respect, when clear agreements and steady habits serve you best.",
    "L’animal de l’année et le vôtre relèvent d’une même punition (刑太歲)\u202f: la tradition y lit une année de pression et de règles à respecter, où des accords clairs et des habitudes régulières vous servent le mieux.",
  ],
  destruction: [
    "The year’s animal and yours are one of the six destructions (破太歲): the tradition reads a year when plans may need reshaping along the way; flexibility keeps what matters.",
    "L’animal de l’année et le vôtre forment une des six destructions (破太歲)\u202f: la tradition y lit une année où les projets demandent parfois à être remaniés en chemin\u202f; la souplesse garde l’essentiel.",
  ],
  "self-punishment": [
    "Your animal meets itself this year: its own habits come back to it, the good and the less good, to be looked at kindly.",
    "Votre animal se rencontre lui-même cette année\u202f: ses habitudes lui reviennent, les bonnes et les moins bonnes, à regarder avec bienveillance.",
  ],
  harmony: [
    "The year’s animal is your animal’s partner among the six harmonies (六合): the tradition reads a supporting year, with help close at hand and good company.",
    "L’animal de l’année est le partenaire du vôtre parmi les six harmonies (六合)\u202f: la tradition y lit une année de soutien, avec de l’aide à portée de main et une bonne compagnie.",
  ],
  trine: [
    "The year’s animal is of your animal’s trine (三合): an allied year in the tradition, when plans tend to flow and efforts carry.",
    "L’animal de l’année appartient au trigone du vôtre (三合)\u202f: une année alliée selon la tradition, où les projets coulent et les efforts portent.",
  ],
  none: [
    "The year’s animal neither meets nor opposes yours: in the tradition’s eyes a quieter year, shaped more by what you bring to it than by the year itself.",
    "L’animal de l’année ne rencontre ni ne contrarie le vôtre\u202f: aux yeux de la tradition, une année plus calme, façonnée par ce que vous y apportez plus que par l’année elle-même.",
  ],
};

/** A month's animal against your year animal, in a sentence. */
export const MONTH_TEXTS: Readonly<Record<MeetText, Both>> = {
  same: ["A month of your own animal: a good time to take stock and renew.", "Un mois de votre propre animal\u202f: un bon moment pour faire le point et se renouveler."],
  clash: ["A month opposite your animal: things move; let them, and choose your direction.", "Un mois opposé à votre animal\u202f: les choses bougent\u202f; laissez-les faire, et choisissez votre direction."],
  harm: ["A month of small frictions with your animal: plain words go further than usual.", "Un mois de petites frictions avec votre animal\u202f: les mots simples portent plus loin que d’habitude."],
  punishment: ["A month of pressure for your animal: keep to clear agreements and an easy pace.", "Un mois de pression pour votre animal\u202f: tenez-vous à des accords clairs et à un rythme tranquille."],
  destruction: ["A month that may reshape your plans: keep what matters and let the rest adjust.", "Un mois qui peut remanier vos projets\u202f: gardez l’essentiel et laissez le reste s’ajuster."],
  "self-punishment": ["A month when your animal meets its own habits: be kind with yourself.", "Un mois où votre animal rencontre ses propres habitudes\u202f: accordez-vous de la bienveillance."],
  harmony: ["A month in harmony with your animal: help and good company come easily.", "Un mois en harmonie avec votre animal\u202f: l’aide et la bonne compagnie viennent facilement."],
  trine: ["A month of your animal’s trine: an allied month, when efforts carry.", "Un mois du trigone de votre animal\u202f: un mois allié, où les efforts portent."],
  none: ["A month that neither meets nor opposes your animal: it takes the shape you give it.", "Un mois qui ne rencontre ni ne contrarie votre animal\u202f: il prend la forme que vous lui donnez."],
};

/** Two people's animals, by how they meet: the tradition's pairs, said for two people. */
export const PAIR_TEXTS_TWO: Readonly<Record<MeetText, Both>> = {
  same: [
    "You share this animal: you recognise each other easily, gifts and habits alike, and understand without many words.",
    "Vous partagez cet animal\u202f: vous vous reconnaissez facilement, dons et habitudes compris, et vous comprenez sans beaucoup de mots.",
  ],
  harmony: [
    "One of the six harmonies, the pairs the tradition counts as natural partners: each brings what the other lacks.",
    "Une des six harmonies, les duos que la tradition compte parmi les partenaires naturels\u202f: chacun apporte ce qui manque à l’autre.",
  ],
  trine: [
    "Allies of one trine: at ease together, pulling the same way, with a shared sense of what matters.",
    "Des alliés d’un même trigone\u202f: à l’aise ensemble, tirant dans le même sens, avec une même idée de ce qui compte.",
  ],
  clash: [
    "Opposites on the wheel: attraction and friction alike. Respect for each other’s pace turns the friction into movement.",
    "Des opposés sur la roue\u202f: attirance et frottements à la fois. Le respect du rythme de l’autre change les frottements en mouvement.",
  ],
  harm: [
    "One of the six harms: small misunderstandings come easily between these two; saying things plainly keeps them small.",
    "Une des six nuisances\u202f: les petits malentendus viennent facilement entre ces deux-là\u202f; dire les choses simplement les garde petits.",
  ],
  punishment: [
    "One of the punishments: pressure can build between these two, each pushing the other; patience and clear agreements ease it.",
    "Une des punitions\u202f: une pression peut monter entre ces deux-là, chacun poussant l’autre\u202f; la patience et des accords clairs l’apaisent.",
  ],
  destruction: [
    "One of the six destructions: what one builds, the other may want to change; deciding together keeps both content.",
    "Une des six destructions\u202f: ce que l’un construit, l’autre peut vouloir le changer\u202f; décider ensemble les contente tous deux.",
  ],
  "self-punishment": [
    "The same self-punishing animal twice: its habit is doubled between you; laughing at it together helps.",
    "Le même animal qui se punit lui-même, deux fois\u202f: son habitude est doublée entre vous\u202f; en rire ensemble aide.",
  ],
  none: [
    "These two animals neither meet nor oppose each other: the bond is what you make of it.",
    "Ces deux animaux ne se rencontrent ni ne s’opposent\u202f: le lien est ce que vous en faites.",
  ],
};

/** The calendar's day that clashes with your year animal. */
export const CLASH_DAY_TEXT: Both = [
  "This day’s animal is opposite your year animal: the almanac marks it as a clash day for you, better kept for steady work than for big beginnings.",
  "L’animal de ce jour est opposé à votre animal de l’année\u202f: l’almanach le marque comme un jour de choc pour vous, à garder pour le travail régulier plutôt que pour les grands commencements.",
];

/** The day's animal in the calendar, said plainly. */
export const DAY_ANIMAL_TEXT: Both = [
  "Each day of the sixty-day cycle has its pillar and its animal; the almanac names the animal it clashes with, the one opposite on the wheel.",
  "Chaque jour du cycle de soixante a son pilier et son animal\u202f; l’almanach nomme l’animal avec lequel il est en choc, celui qui lui fait face sur la roue.",
];
