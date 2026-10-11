/*
 * What the interactions inside a BaZi chart say (languages plan, part 14),
 * in English and French: what each kind does between pillars, as the Zi
 * Ping school reads it, in Ulune's words. Neutral: frictions are read as
 * movement and lessons, never as fate; scripts/chinese-bazi-interactions
 * .test.mjs keeps both languages, their typography and their tone.
 */
import type { Both } from "./zodiac-texts";
import type { Interaction, InteractionKind } from "./bazi-interactions";

export const INTERACTION_TEXTS: Readonly<Record<InteractionKind, Both>> = {
  "stem-combination": [
    "Two stems that combine are drawn to each other and bind: each is held by the other, less free to act on its own. When the conditions are met, the pair becomes a new phase, and the chart reads it so.",
    "Deux troncs qui se combinent s’attirent et se lient\u202f: chacun est retenu par l’autre, moins libre d’agir seul. Quand les conditions sont réunies, la paire devient une nouvelle phase, et le thème se lit ainsi.",
  ],
  "stem-clash": [
    "Two stems that clash are opposite phases from opposite directions: they push against each other. The tradition reads a tension that sets things moving, an inner debate between two ways of acting.",
    "Deux troncs qui se heurtent sont des phases opposées venues de directions opposées\u202f: ils se poussent l’un l’autre. La tradition y lit une tension qui met les choses en mouvement, un débat intérieur entre deux façons d’agir.",
  ],
  season: [
    "A seasonal trio gathers the three branches of one season, one direction and one phase: the strongest of the branches’ combinations, a whole season held in the chart.",
    "Un trio saisonnier réunit les trois branches d’une même saison, une direction et une phase\u202f: la plus forte des combinaisons de branches, une saison entière tenue dans le thème.",
  ],
  trine: [
    "A trine gathers three branches four places apart into one phase, its birth, its peak and its storehouse: an alliance that works together and lends that phase real weight.",
    "Un trigone réunit trois branches distantes de quatre places en une seule phase, sa naissance, son apogée et sa réserve\u202f: une alliance qui coopère et donne à cette phase un vrai poids.",
  ],
  "half-trine": [
    "Two branches of a trine, one of them its peak, lean towards its phase without completing it: a partial alliance, a direction the chart tends towards.",
    "Deux branches d’un trigone, dont son apogée, penchent vers sa phase sans la compléter\u202f: une alliance partielle, une direction vers laquelle le thème tend.",
  ],
  harmony: [
    "A harmony binds two branches like a couple: the animals agree and their energies join. With the right conditions they make a new phase; otherwise they simply hold each other.",
    "Une harmonie lie deux branches comme un couple\u202f: les animaux s’accordent et leurs énergies se rejoignent. Avec les bonnes conditions, ils forment une nouvelle phase\u202f; sinon, ils se tiennent simplement l’un l’autre.",
  ],
  clash: [
    "A clash sets two opposite branches against each other: movement, change, a shake-up that can clear the way. Between neighbouring pillars it is felt most; between distant ones it is quieter.",
    "Un choc oppose deux branches face à face\u202f: le mouvement, le changement, un remue-ménage qui peut dégager le chemin. Entre piliers voisins il se ressent le plus\u202f; entre piliers éloignés il est plus discret.",
  ],
  punishment: [
    "A punishment is a tension that tests: friction that teaches, lessons learned the long way, and the strength that comes from them.",
    "Une punition est une tension qui met à l’épreuve\u202f: une friction qui enseigne, des leçons apprises par le long chemin, et la force qui en vient.",
  ],
  "self-punishment": [
    "The same branch twice punishes itself: too much of one quality, a habit that turns back on itself. The tradition reads an invitation to balance it.",
    "La même branche deux fois se punit elle-même\u202f: trop d’une même qualité, une habitude qui se retourne contre soi. La tradition y lit une invitation à l’équilibrer.",
  ],
  harm: [
    "A harm is a quieter friction: one branch spoils the other’s harmony, misunderstandings rather than open conflict, worth naming to dissolve.",
    "Une nuisance est une friction plus discrète\u202f: une branche gâche l’harmonie de l’autre, des malentendus plutôt qu’un conflit ouvert, qu’il vaut la peine de nommer pour les dissiper.",
  ],
  destruction: [
    "A destruction loosens what the branches hold: plans that need mending, a bond that wears and asks for care. The mildest of the tensions.",
    "Une destruction desserre ce que les branches retiennent\u202f: des projets à reprendre, un lien qui s’use et demande du soin. La plus douce des tensions.",
  ],
};

/** The three punishments' own names, after the classics. */
export const PUNISHMENT_GROUP_TEXTS: Readonly<Record<NonNullable<Interaction["group"]>, Both>> = {
  ungrateful: [
    "Yin, Si and Shen make the punishment “without gratitude”: help that is not returned, or not seen, and the art of giving freely.",
    "Yin, Si et Shen forment la punition «\u202fsans gratitude\u202f»\u202f: une aide qui n’est pas rendue, ou pas vue, et l’art de donner librement.",
  ],
  power: [
    "Chou, Xu and Wei make the punishment “of power”: strength leaning on strength, stubbornness on both sides, and the lesson of yielding in time.",
    "Chou, Xu et Wei forment la punition «\u202fde puissance\u202f»\u202f: la force appuyée sur la force, l’entêtement des deux côtés, et la leçon de céder à temps.",
  ],
  uncivil: [
    "Zi and Mao make the punishment “without courtesy”: closeness that forgets its manners, and the care that good relations ask for.",
    "Zi et Mao forment la punition «\u202fsans courtoisie\u202f»\u202f: une proximité qui oublie les égards, et le soin que demandent les bonnes relations.",
  ],
};
