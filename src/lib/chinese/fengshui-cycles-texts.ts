/*
 * What Feng Shui's Cycles say of your directions through the year (share and
 * compare plan, feature 5d, decision R4), in English and French: the year's
 * star in one of your directions, each affliction falling there, what the
 * year makes of a supportive or a challenging direction, and how the page
 * reads the stars. Suggestions about timing only, never about a place's
 * worth: "a year to rest that side rather than start work there". Nothing to
 * buy, nothing to hang. scripts/chinese-fengshui-cycles.test.mjs keeps both
 * languages and their tone.
 */
import type { Both } from "./both";
import type { StarNumber } from "./fengshui-stars";
import type { AfflictionId } from "./fengshui-years";
import type { CycleState } from "./fengshui-cycles";

/** The year's star in one of your directions (the home page's year notes, ANNUAL_NOTES, said for a person). */
export const STAR_FOR_YOU: Readonly<Record<StarNumber, Both>> = {
  1: [
    "The 1 White brings news and openings for study, work and journeys: a good side to face for what you begin.",
    "Le 1 Blanc apporte des nouvelles et des ouvertures pour l’étude, le travail et les voyages\u202f: un bon côté vers lequel vous tourner pour ce que vous commencez.",
  ],
  2: [
    "The 2 Black asks for calm: a year to rest that side rather than start work there.",
    "Le 2 Noir demande le calme\u202f: une année pour laisser reposer ce côté plutôt que d’y entamer des travaux.",
  ],
  3: [
    "The 3 Jade brings energy and initiative, and stirs disagreement: good for starting things, with a little more patience in talk.",
    "Le 3 Jade apporte de l’énergie et de l’initiative, et attise les désaccords\u202f: propice pour lancer des choses, avec un peu plus de patience dans les échanges.",
  ],
  4: [
    "The 4 Green favours study, writing and the arts: a good side to face for learning.",
    "Le 4 Vert favorise l’étude, l’écriture et les arts\u202f: un bon côté vers lequel vous tourner pour apprendre.",
  ],
  5: [
    "The 5 Yellow, the Lo Shu’s own centre, is there: a year to rest that side rather than start work there.",
    "Le 5 Jaune, le centre propre du Lo Shu, s’y trouve\u202f: une année pour laisser reposer ce côté plutôt que d’y entamer des travaux.",
  ],
  6: [
    "The 6 White brings support from those in charge and steady progress: a good side to face for work that needs backing.",
    "Le 6 Blanc apporte l’appui de ceux qui dirigent et des progrès réguliers\u202f: un bon côté vers lequel vous tourner pour un travail qui demande du soutien.",
  ],
  7: [
    "The 7 Red brings lively talk and gatherings; the classics advise care with words and with belongings.",
    "Le 7 Rouge apporte des échanges animés et des réunions\u202f; les classiques conseillent de la prudence avec les mots et avec ses biens.",
  ],
  8: [
    "The 8 White brings steadiness and small gains to keep: a good side to face for patient work.",
    "Le 8 Blanc apporte de la constance et de petits gains à garder\u202f: un bon côté vers lequel vous tourner pour un travail patient.",
  ],
  9: [
    "The 9 Purple brings celebrations and good news: a bright side for what you want to grow.",
    "Le 9 Pourpre apporte des fêtes et de bonnes nouvelles\u202f: un côté lumineux pour ce que vous voulez faire grandir.",
  ],
};

/** An affliction falling in one of your directions, and the month's 5 Yellow: what the classics counsel there. */
export const AFFLICTION_FOR_YOU: Readonly<Record<AfflictionId | "month-five-yellow" | "killings-behind", Both>> = {
  "five-yellow": [
    "The year’s 5 Yellow falls on this side: a year to rest it rather than start work there. For new starts and long tasks, face another of your directions.",
    "Le 5 Jaune de l’année tombe de ce côté\u202f: une année pour le laisser reposer plutôt que d’y entamer des travaux. Pour les commencements et les longues tâches, tournez-vous vers une autre de vos directions.",
  ],
  "tai-sui": [
    "The Grand Duke sits in this direction this year: the classics suggest not facing him for the year’s new beginnings, a new desk or a long task; to have him at your back is held to be steady support.",
    "Le Grand Duc siège dans cette direction cette année\u202f: les classiques suggèrent de ne pas lui faire face pour les commencements de l’année, un nouveau bureau ou une longue tâche\u202f; l’avoir dans le dos passe pour un appui stable.",
  ],
  "year-breaker": [
    "The Year Breaker stands in this direction, across from the Grand Duke: the classics suggest leaving this side undisturbed by works this year.",
    "Le Briseur de l’année se tient dans cette direction, face au Grand Duc\u202f: les classiques suggèrent de laisser ce côté à l’abri des travaux cette année.",
  ],
  "three-killings": [
    "The Three Killings fall in this direction this year: the classics suggest facing them rather than sitting with your back to them, and keeping works on this side for another year.",
    "Les Trois Sha tombent dans cette direction cette année\u202f: les classiques suggèrent de leur faire face plutôt que de leur tourner le dos, et de garder les travaux de ce côté pour une autre année.",
  ],
  "month-five-yellow": [
    "The month’s 5 Yellow visits this direction: a month to keep this side quiet.",
    "Le 5 Jaune du mois visite cette direction\u202f: un mois pour garder ce côté au calme.",
  ],
  // The Three Killings may be faced but not sat on (可向不可坐): the direction across from them.
  "killings-behind": [
    "The Three Killings fall across from this direction this year: facing it would put them at your back, which the classics advise against for a desk or a long task.",
    "Les Trois Sha tombent à l’opposé de cette direction cette année\u202f: vous tourner vers elle les mettrait dans votre dos, ce que les classiques déconseillent pour un bureau ou une longue tâche.",
  ],
};

export type StateKey = `${"good" | "hard"}-${CycleState}`;

/**
 * What the year makes of one of your directions, by its kind and its state (a challenging direction is
 * never "strengthened"); "good-behind", a supportive direction steady because facing it would put the
 * Three Killings at your back.
 */
export const STATE_TEXTS: Readonly<Record<Exclude<StateKey, "hard-strengthened"> | "good-behind", Both>> = {
  "good-strengthened": [
    "One of your supportive directions, strengthened this year: a good side to face for new starts and long tasks.",
    "L’une de vos directions favorables, renforcée cette année\u202f: un bon côté vers lequel vous tourner pour les commencements et les longues tâches.",
  ],
  "good-steady": [
    "One of your supportive directions, with a mixed star this year: still yours to use, with a little care.",
    "L’une de vos directions favorables, avec une étoile mitigée cette année\u202f: toujours à votre service, avec un peu d’attention.",
  ],
  "good-behind": [
    "One of your supportive directions, steady this year: the Three Killings fall across from it, and facing it would put them at your back, which the classics advise against. The side itself stays yours to use; for a desk or a long task, face another of your supportive directions.",
    "L’une de vos directions favorables, stable cette année\u202f: les Trois Sha tombent à l’opposé, et vous tourner vers elle les mettrait dans votre dos, ce que les classiques déconseillent. Ce côté reste à votre service\u202f; pour un bureau ou une longue tâche, tournez-vous vers une autre de vos directions favorables.",
  ],
  "good-rest": [
    "One of your supportive directions, resting this year: a year to rest that side rather than start work there; your other supportive directions can carry the new starts.",
    "L’une de vos directions favorables, au repos cette année\u202f: une année pour laisser reposer ce côté plutôt que d’y entamer des travaux\u202f; vos autres directions favorables peuvent porter les commencements.",
  ],
  "hard-steady": [
    "One of your challenging directions, as in any year: where you can choose, not the side to face for long tasks.",
    "L’une de vos directions difficiles, comme chaque année\u202f: quand vous avez le choix, pas le côté vers lequel vous tourner pour les longues tâches.",
  ],
  "hard-rest": [
    "One of your challenging directions, resting too this year: a side to leave quiet.",
    "L’une de vos directions difficiles, au repos elle aussi cette année\u202f: un côté à laisser au calme.",
  ],
};

/** How the page reads the stars over your directions. */
export const HOW_READ: Both = [
  "Ulune reads the year’s stars as it reads them for a home: the 1, 4, 6, 8 and 9 as supportive, the 2 and the 5 as asking for calm, the 3 and the 7 as mixed. One of your supportive directions is strengthened when a supportive star visits it and none of the year’s afflictions falls there; it rests when one falls there or a star asking for calm visits it. The Three Killings may be faced but not kept at your back, so the direction across from them is never the one to face, and stays steady at most. Timing only: a direction keeps its worth from one year to the next.",
  "Ulune lit les étoiles de l’année comme pour un logement\u202f: le 1, le 4, le 6, le 8 et le 9 comme favorables, le 2 et le 5 comme demandant le calme, le 3 et le 7 comme mitigés. L’une de vos directions favorables est renforcée quand une étoile favorable la visite et qu’aucune affliction de l’année n’y tombe\u202f; elle se repose quand l’une y tombe ou qu’une étoile demandant le calme la visite. Les Trois Sha peuvent être regardés en face mais pas gardés dans le dos\u202f: la direction opposée n’est donc jamais celle vers laquelle se tourner, et reste au mieux stable. Une question de moment seulement\u202f: une direction garde sa valeur d’une année à l’autre.",
];

/** What the page is, for its readings' "About". */
export const CYCLES_ABOUT: readonly [Both, Both] = [
  [
    "Feng Shui’s Cycles lay the year’s and the month’s flying stars over your own eight directions, the Eight Mansions of your Kua: the same stars as a home’s year, read for the directions you face, sleep and work towards.",
    "Les Cycles du Feng Shui posent les étoiles volantes de l’année et du mois sur vos huit directions, les Huit Demeures de votre Kua\u202f: les mêmes étoiles que l’année d’un logement, lues pour les directions vers lesquelles vous vous tournez pour dormir et travailler.",
  ],
  [
    "Suggestions about timing, never about a place’s worth, and nothing to buy or hang. Worked out on this device; nothing is sent.",
    "Des suggestions de moment, jamais sur la valeur d’un lieu, et rien à acheter ni à accrocher. Calculé sur cet appareil\u202f; rien n’est envoyé.",
  ],
];

/** This year's direction to face, when the supportive directions rest but one that would put the Three Killings at your back. */
export const BEST_NONE_BEHIND: Both = [
  "This year your supportive directions rest, but for one that would put the Three Killings at your back: lean on what is already under way rather than starting anew.",
  "Cette année, vos directions favorables se reposent, sauf une qui mettrait les Trois Sha dans votre dos\u202f: appuyez-vous sur ce qui est déjà en cours plutôt que de recommencer.",
];
