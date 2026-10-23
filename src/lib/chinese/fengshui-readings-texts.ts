/*
 * What Feng Shui's readings say of the stars (languages plan, part 27: "the
 * nine stars in each period state, the star pairs of mountain and water, a
 * yearly note per sector"), in English and French, after the classical
 * verse texts of the Xuan Kong school (the Zi Bai Jue 紫白訣, the Xuan Kong
 * Mi Zhi 玄空秘旨, the Fei Xing Fu 飛星賦) in Ulune's words.
 *
 * Each text gives both faces the classics read, in season and out of it,
 * and what practitioners usually suggest: never a threat, no illness,
 * accident or loss of life foretold, nothing to buy, no move or works
 * asked for beyond leaving a sector quiet. Its own download, loaded when
 * the home has a chart of stars (studio/modes/fengshui-home.tsx); the 45
 * pairings' own texts, two thirds of the whole, are another, fetched when a
 * palace's reading opens (fengshui-pair-texts.ts; the bug-fix round, item 4).
 * scripts/chinese-fengshui-readings.test.mjs keeps both languages, their
 * typography and their tone.
 */
import type { Both } from "./both";
import type { PhaseId } from "./names";
import type { StarNumber, StarState } from "./fengshui-stars";
import type { PairKey, Relation } from "./fengshui-pairs";

/** A pairing's name in both languages, and its classical name where the books give one. */
export type PairName = { en: string; fr: string; hant?: string; hans?: string; pinyin?: string };

export const PAIR_NAMES: Readonly<Record<PairKey, PairName>> = {
  "1-1": { en: "Water twice", fr: "L’eau deux fois" },
  "1-2": { en: "Earth holding water", fr: "La terre qui retient l’eau" },
  "1-3": { en: "Water feeding wood", fr: "L’eau qui nourrit le bois" },
  "1-4": { en: "The scholar’s pairing", fr: "L’alliance du lettré", hant: "四一同宮", hans: "四一同宫", pinyin: "sì yī tóng gōng" },
  "1-5": { en: "Earth pressing on water", fr: "La terre qui pèse sur l’eau" },
  "1-6": { en: "The He Tu pair of water", fr: "La paire d’eau du Hetu", hant: "一六共宗", hans: "一六共宗", pinyin: "yī liù gòng zōng" },
  "1-7": { en: "Metal and water", fr: "Le métal et l’eau" },
  "1-8": { en: "Water held by the mountain", fr: "L’eau retenue par la montagne" },
  "1-9": { en: "Water and fire in balance", fr: "L’eau et le feu en équilibre", hant: "水火既濟", hans: "水火既济", pinyin: "shuǐ huǒ jì jì" },
  "2-2": { en: "Earth twice", fr: "La terre deux fois" },
  "2-3": { en: "The fighting bull", fr: "Le taureau combatif", hant: "鬥牛煞", hans: "斗牛煞", pinyin: "dòu niú shà" },
  "2-4": { en: "Wood pressing on earth", fr: "Le bois qui pèse sur la terre" },
  "2-5": { en: "The two earth stars", fr: "Les deux étoiles de terre", hant: "二五交加", hans: "二五交加", pinyin: "èr wǔ jiāo jiā" },
  "2-6": { en: "Earth and heaven", fr: "La terre et le ciel" },
  "2-7": { en: "The He Tu pair of fire", fr: "La paire de feu du Hetu", hant: "二七同道", hans: "二七同道", pinyin: "èr qī tóng dào" },
  "2-8": { en: "Two earths adding to ten", fr: "Deux terres qui font dix" },
  "2-9": { en: "Fire feeding earth", fr: "Le feu qui nourrit la terre" },
  "3-3": { en: "Thunder twice", fr: "Le tonnerre deux fois" },
  "3-4": { en: "Thunder and wind", fr: "Le tonnerre et le vent", hant: "雷風恆", hans: "雷风恒", pinyin: "léi fēng héng" },
  "3-5": { en: "Wood against the 5", fr: "Le bois face au 5" },
  "3-6": { en: "Authority and ambition", fr: "L’autorité et l’ambition" },
  "3-7": { en: "Two stars of dispute", fr: "Deux étoiles de discorde", hant: "三七疊至", hans: "三七叠至", pinyin: "sān qī dié zhì" },
  "3-8": { en: "The He Tu pair of wood", fr: "La paire de bois du Hetu", hant: "三八為朋", hans: "三八为朋", pinyin: "sān bā wéi péng" },
  "3-9": { en: "Wood and fire, bright minds", fr: "Bois et feu, esprits vifs", hant: "木火通明", hans: "木火通明", pinyin: "mù huǒ tōng míng" },
  "4-4": { en: "Wind twice", fr: "Le vent deux fois" },
  "4-5": { en: "Letters weighed down", fr: "Les lettres alourdies" },
  "4-6": { en: "Rules and creativity", fr: "La règle et la création" },
  "4-7": { en: "Speech and letters", fr: "La parole et l’écrit" },
  "4-8": { en: "Learning and property", fr: "Le savoir et les biens" },
  "4-9": { en: "The He Tu pair of metal", fr: "La paire de métal du Hetu", hant: "四九為友", hans: "四九为友", pinyin: "sì jiǔ wéi yǒu" },
  "5-5": { en: "The 5 twice", fr: "Le 5 deux fois" },
  "5-6": { en: "Authority with weight", fr: "Une autorité qui pèse" },
  "5-7": { en: "Words with weight", fr: "Des paroles qui pèsent" },
  "5-8": { en: "The 5 and the mountain", fr: "Le 5 et la montagne" },
  "5-9": { en: "Fire feeding the 5", fr: "Le feu qui nourrit le 5" },
  "6-6": { en: "Heaven twice", fr: "Le ciel deux fois" },
  "6-7": { en: "Crossed swords", fr: "Les épées croisées", hant: "交劍煞", hans: "交剑煞", pinyin: "jiāo jiàn shà" },
  "6-8": { en: "Standing and wealth", fr: "Le rang et la richesse" },
  "6-9": { en: "Fire at heaven’s gate", fr: "Le feu à la porte du ciel", hant: "火燒天門", hans: "火烧天门", pinyin: "huǒ shāo tiān mén" },
  "7-7": { en: "The lake twice", fr: "Le lac deux fois" },
  "7-8": { en: "The young couple", fr: "Le jeune couple", hant: "澤山咸", hans: "泽山咸", pinyin: "zé shān xián" },
  "7-9": { en: "Seven and nine crossing", fr: "Le sept et le neuf qui se croisent", hant: "七九穿途", hans: "七九穿途", pinyin: "qī jiǔ chuān tú" },
  "8-8": { en: "The mountain twice", fr: "La montagne deux fois" },
  "8-9": { en: "Celebration", fr: "Les réjouissances" },
  "9-9": { en: "Fire twice", fr: "Le feu deux fois" },
};

/** The pairings whose text gives its counsel alone, with no face to choose (the 2 and the 5). */
export const PAIRS_WITHOUT_FACES: readonly PairKey[] = ["2-5"];
/** The pairings whose text also gives the face of a star just past its time (the 8 twice). */
export const PAIRS_WITH_WANING_FACE: readonly PairKey[] = ["8-8"];

/**
 * Which face of a pairing applies here (the review's fix FS35), from the two
 * stars' states now, the mountain star's first: T in season (timely), W just
 * past its time (waning), D out of season (dormant). "WW+" is for a pairing
 * whose text has a face of its own for a star just past its time. The
 * mountain star speaks for the people of the home, the water star for what
 * comes in (fengshui-rooms.ts reads rooms the same way).
 */
export type FaceKey = "TT" | "TW" | "TD" | "WT" | "WW" | "WW+" | "WD" | "DT" | "DW" | "DD";
export const FACE_TEXTS: Readonly<Record<FaceKey, Both>> = {
  TT: [
    "Here both stars are in season: read “in season”, for the people of the home and for what comes in.",
    "Ici, les deux étoiles sont en saison\u202f: lisez «\u202fen saison\u202f», pour les habitants comme pour ce qui arrive.",
  ],
  TW: [
    "Here the mountain star is in season and the water star just past its time: read “in season” for the people of the home, and “out of season”, more gently, for what comes in.",
    "Ici, l’étoile de la montagne est en saison et celle de l’eau juste après son temps\u202f: lisez «\u202fen saison\u202f» pour les habitants, et «\u202fhors saison\u202f», plus doucement, pour ce qui arrive.",
  ],
  TD: [
    "Here the mountain star is in season and the water star is not: read “in season” for the people of the home, and “out of season” for what comes in.",
    "Ici, l’étoile de la montagne est en saison et celle de l’eau ne l’est pas\u202f: lisez «\u202fen saison\u202f» pour les habitants, et «\u202fhors saison\u202f» pour ce qui arrive.",
  ],
  WT: [
    "Here the water star is in season and the mountain star just past its time: read “in season” for what comes in, and “out of season”, more gently, for the people of the home.",
    "Ici, l’étoile de l’eau est en saison et celle de la montagne juste après son temps\u202f: lisez «\u202fen saison\u202f» pour ce qui arrive, et «\u202fhors saison\u202f», plus doucement, pour les habitants.",
  ],
  WW: [
    "Here both stars are just past their time: read “out of season”, more gently while they keep some of their strength.",
    "Ici, les deux étoiles sont juste après leur temps\u202f: lisez «\u202fhors saison\u202f», plus doucement tant qu’elles gardent un peu de leur force.",
  ],
  "WW+": [
    "Here the star is just past its time, as mountain star and as water star: read “just past its time”.",
    "Ici, l’étoile est juste après son temps, comme étoile de la montagne et comme étoile de l’eau\u202f: lisez «\u202fjuste après son temps\u202f».",
  ],
  WD: [
    "Here neither star is in season, though the mountain star is only just past its time: read “out of season”, more gently for the people of the home than for what comes in.",
    "Ici, aucune des deux étoiles n’est en saison, mais celle de la montagne vient à peine de passer son temps\u202f: lisez «\u202fhors saison\u202f», plus doucement pour les habitants que pour ce qui arrive.",
  ],
  DT: [
    "Here the water star is in season and the mountain star is not: read “in season” for what comes in, and “out of season” for the people of the home.",
    "Ici, l’étoile de l’eau est en saison et celle de la montagne ne l’est pas\u202f: lisez «\u202fen saison\u202f» pour ce qui arrive, et «\u202fhors saison\u202f» pour les habitants.",
  ],
  DW: [
    "Here neither star is in season, though the water star is only just past its time: read “out of season”, more gently for what comes in than for the people of the home.",
    "Ici, aucune des deux étoiles n’est en saison, mais celle de l’eau vient à peine de passer son temps\u202f: lisez «\u202fhors saison\u202f», plus doucement pour ce qui arrive que pour les habitants.",
  ],
  DD: [
    "Here neither star is in season: read “out of season”, for the people of the home and for what comes in.",
    "Ici, aucune des deux étoiles n’est en saison\u202f: lisez «\u202fhors saison\u202f», pour les habitants comme pour ce qui arrive.",
  ],
};

/** How the mountain star's phase meets the water star's, with {m}, {w} or {phase}. */
export const RELATION_TEXTS: Readonly<Record<Relation, Both>> = {
  "same": [
    "Mountain star and water star share their phase, {phase}: what holds the people of the home and what flows in pull the same way.",
    "L’étoile de la montagne et celle de l’eau partagent leur phase, {phase}\u202f: ce qui porte les habitants et ce qui arrive vont dans le même sens.",
  ],
  "m-feeds-w": [
    "The mountain star feeds the water star, as {m} feeds {w}: the people’s effort goes into what comes in.",
    "L’étoile de la montagne nourrit celle de l’eau, comme {m} nourrit {w}\u202f: l’effort des habitants va vers ce qui arrive.",
  ],
  "w-feeds-m": [
    "The water star feeds the mountain star, as {w} feeds {m}: what comes in supports the people of the home.",
    "L’étoile de l’eau nourrit celle de la montagne, comme {w} nourrit {m}\u202f: ce qui arrive soutient les habitants.",
  ],
  "m-checks-w": [
    "The mountain star checks the water star, as {m} checks {w}: the people hold back what flows in, a restraint that can steady or slow.",
    "L’étoile de la montagne contient celle de l’eau, comme {m} contient {w}\u202f: les habitants retiennent ce qui arrive, une retenue qui peut stabiliser ou freiner.",
  ],
  "w-checks-m": [
    "The water star checks the mountain star, as {w} checks {m}: what comes in presses on the people of the home.",
    "L’étoile de l’eau contient celle de la montagne, comme {w} contient {m}\u202f: ce qui arrive pèse sur les habitants.",
  ],
};

/** The phases as the relation lines say them: "metal feeds water", « le métal nourrit l’eau ». */
export const PHASE_WORDS: Readonly<Record<PhaseId, Both>> = {
  wood: ["wood", "le bois"],
  fire: ["fire", "le feu"],
  earth: ["earth", "la terre"],
  metal: ["metal", "le métal"],
  water: ["water", "l’eau"],
};

/** Each star: who it is in the classics. */
export const STAR_TEXTS: Readonly<Record<StarNumber, Both>> = {
  1: [
    "The 1 White, Tan Lang, is water, the trigram Kan and the middle son, at home in the north. The classics give it wisdom, learning, careers and journeys, and the first steps of a romance.",
    "Le 1 Blanc, Tan Lang, est l’eau, le trigramme Kan et le fils du milieu, chez lui au nord. Les classiques lui donnent la sagesse, l’étude, les carrières et les voyages, et les premiers pas d’un amour.",
  ],
  2: [
    "The 2 Black, Ju Men, is earth, the trigram Kun and the mother, at home in the south-west. The classics give it land and property, care for others and the patience of the ground.",
    "Le 2 Noir, Ju Men, est la terre, le trigramme Kun et la mère, chez lui au sud-ouest. Les classiques lui donnent la terre et les biens, le soin des autres et la patience du sol.",
  ],
  3: [
    "The 3 Jade, Lu Cun, is wood, the trigram Zhen and the eldest son, at home in the east: thunder, the first movement of spring, drive and ambition.",
    "Le 3 Jade, Lu Cun, est le bois, le trigramme Zhen et le fils aîné, chez lui à l’est\u202f: le tonnerre, le premier mouvement du printemps, l’élan et l’ambition.",
  ],
  4: [
    "The 4 Green, Wen Qu, is wood, the trigram Xun and the eldest daughter, at home in the south-east: the star of letters, study and the arts, and of romance.",
    "Le 4 Vert, Wen Qu, est le bois, le trigramme Xun et la fille aînée, chez lui au sud-est\u202f: l’étoile des lettres, de l’étude et des arts, et de l’amour.",
  ],
  5: [
    "The 5 Yellow, Lian Zhen, is earth and the Lo Shu’s own centre, with no trigram of its own: the emperor’s star, the strongest of the nine.",
    "Le 5 Jaune, Lian Zhen, est la terre et le centre propre du Lo Shu, sans trigramme à lui\u202f: l’étoile de l’empereur, la plus forte des neuf.",
  ],
  6: [
    "The 6 White, Wu Qu, is metal, the trigram Qian and the father, at home in the north-west: heaven, authority, leadership and the support of those above.",
    "Le 6 Blanc, Wu Qu, est le métal, le trigramme Qian et le père, chez lui au nord-ouest\u202f: le ciel, l’autorité, le commandement et l’appui de ceux d’en haut.",
  ],
  7: [
    "The 7 Red, Po Jun, is metal, the trigram Dui and the youngest daughter, at home in the west: the lake, speech, charm and pleasure.",
    "Le 7 Rouge, Po Jun, est le métal, le trigramme Dui et la fille cadette, chez lui à l’ouest\u202f: le lac, la parole, le charme et le plaisir.",
  ],
  8: [
    "The 8 White, Zuo Fu, is earth, the trigram Gen and the youngest son, at home in the north-east: the mountain, stillness, property and savings.",
    "Le 8 Blanc, Zuo Fu, est la terre, le trigramme Gen et le fils cadet, chez lui au nord-est\u202f: la montagne, l’immobilité, les biens et l’épargne.",
  ],
  9: [
    "The 9 Purple, You Bi, is fire, the trigram Li and the middle daughter, at home in the south: celebration, fame and joy, the star of Period 9 (2024 to 2043).",
    "Le 9 Pourpre, You Bi, est le feu, le trigramme Li et la fille du milieu, chez lui au sud\u202f: les fêtes, la renommée et la joie, l’étoile de la Période 9 (de 2024 à 2043).",
  ],
};

/** Each star in each of its states: timely, waning, dormant. */
export const STAR_STATE_TEXTS: Readonly<Record<StarNumber, Record<StarState, Both>>> = {
  1: {
    timely: [
      "In season, the 1 brings recognition through knowledge, careers that move forward and good news from afar.",
      "En saison, le 1 apporte la reconnaissance par le savoir, des carrières qui avancent et de bonnes nouvelles de loin.",
    ],
    waning: [
      "Just past its time, the 1 reads as plans that drift and attention spread thin.",
      "Juste après son temps, le 1 se lit comme des projets qui dérivent et une attention trop dispersée.",
    ],
    dormant: [
      "Out of its time, the classics read the 1 as restlessness: thought without an anchor, and too much time spent away.",
      "Hors de son temps, les classiques lisent le 1 comme de l’agitation\u202f: une pensée sans ancre, et trop de temps passé ailleurs.",
    ],
  },
  2: {
    timely: [
      "In season, the 2 brings gains from land and property, and a household well cared for.",
      "En saison, le 2 apporte des gains par la terre et les biens, et un foyer bien soigné.",
    ],
    waning: [
      "Just past its time, the 2 reads as heaviness: a sector to keep bright and light.",
      "Juste après son temps, le 2 se lit comme de la lourdeur\u202f: un secteur à garder clair et léger.",
    ],
    dormant: [
      "Out of its time, the 2 is the heaviest of the stars in the classics; they ask that its sector be kept calm, bright and uncluttered, rather than a room for long stays.",
      "Hors de son temps, le 2 est la plus lourde des étoiles pour les classiques\u202f; ils demandent que son secteur reste calme, clair et dégagé, plutôt qu’une pièce où l’on reste longtemps.",
    ],
  },
  3: {
    timely: [
      "In season, the 3 brings energy, initiative and advancement won through effort.",
      "En saison, le 3 apporte l’énergie, l’initiative et un avancement gagné par l’effort.",
    ],
    waning: [
      "Just past its time, the 3 reads as impatience, and competition that runs hot.",
      "Juste après son temps, le 3 se lit comme de l’impatience, et une rivalité qui s’échauffe.",
    ],
    dormant: [
      "Out of its time, the classics read the 3 as the quarrelsome star: arguments, disputes and things taken, which ask for patience and care.",
      "Hors de son temps, les classiques lisent le 3 comme l’étoile querelleuse\u202f: des disputes, des litiges et des choses prises, qui demandent patience et prudence.",
    ],
  },
  4: {
    timely: [
      "In season, the 4 brings success in study and writing, and attachments that grow well.",
      "En saison, le 4 apporte la réussite des études et de l’écriture, et des attachements qui grandissent bien.",
    ],
    waning: [
      "Just past its time, the 4 reads as studies that lose their thread, and attention that drifts.",
      "Juste après son temps, le 4 se lit comme des études qui perdent le fil, et une attention qui dérive.",
    ],
    dormant: [
      "Out of its time, the classics read the 4 as attachments pulling in too many directions, and words that wander.",
      "Hors de son temps, les classiques lisent le 4 comme des attachements qui tirent dans trop de directions, et des mots qui s’égarent.",
    ],
  },
  5: {
    timely: [
      "In season (in its own period, or as one of the two rising before it), the 5 brings command, authority and the power to hold the whole together.",
      "En saison (dans sa propre période, ou comme l’une des deux qui montent avant elle), le 5 apporte le commandement, l’autorité et la force de tenir l’ensemble.",
    ],
    waning: [
      "Just past its time, the 5 keeps its weight without its command: the classics ask for quiet where it stands.",
      "Juste après son temps, le 5 garde son poids sans son commandement\u202f: les classiques demandent le calme là où il se tient.",
    ],
    dormant: [
      "Out of its time, the classics read the 5 as the most intense star of all, and ask for quiet where it stands: no heavy works, nothing stirred up.",
      "Hors de son temps, les classiques lisent le 5 comme l’étoile la plus intense de toutes, et demandent le calme là où il se tient\u202f: pas de gros travaux, rien de remué.",
    ],
  },
  6: {
    timely: [
      "In season, the 6 brings promotion, recognition from those in charge, and wealth earned through responsibility.",
      "En saison, le 6 apporte la promotion, la reconnaissance de ceux qui dirigent, et une richesse gagnée par les responsabilités.",
    ],
    waning: [
      "Just past its time, the 6 reads as authority that hardens, and help that comes more slowly.",
      "Juste après son temps, le 6 se lit comme une autorité qui se raidit, et une aide qui vient plus lentement.",
    ],
    dormant: [
      "Out of its time, the classics read the 6 as stubbornness and distance: authority that stands alone.",
      "Hors de son temps, les classiques lisent le 6 comme l’entêtement et la distance\u202f: une autorité qui reste seule.",
    ],
  },
  7: {
    timely: [
      "In season (as through Period 7), the 7 brings eloquence, good company and income from speaking and selling.",
      "En saison (comme tout au long de la Période 7), le 7 apporte l’éloquence, la bonne compagnie et des revenus par la parole et la vente.",
    ],
    waning: [
      "Just past its time, the 7 reads as talk that turns to gossip.",
      "Juste après son temps, le 7 se lit comme une parole qui tourne au commérage.",
    ],
    dormant: [
      "Out of its time, the classics read the 7 as sharp words and things taken: care with belongings and with what is said.",
      "Hors de son temps, les classiques lisent le 7 comme des mots acérés et des choses prises\u202f: de la prudence avec ses biens et avec ce qui se dit.",
    ],
  },
  8: {
    timely: [
      "In season (as through Period 8, 2004 to 2023), the 8 brings wealth, property and lasting gains.",
      "En saison (comme tout au long de la Période 8, de 2004 à 2023), le 8 apporte la richesse, les biens et des gains durables.",
    ],
    waning: [
      "Just past its time (as in Period 9), the 8 keeps a gentle steadiness: the last period’s gains, to keep rather than chase.",
      "Juste après son temps (comme en Période 9), le 8 garde une douce constance\u202f: les gains de la période passée, à garder plutôt qu’à poursuivre.",
    ],
    dormant: [
      "Out of its time, the 8 reads as things that stand still: savings held back, and changes slow to come.",
      "Hors de son temps, le 8 se lit comme des choses qui stagnent\u202f: une épargne retenue, et des changements lents à venir.",
    ],
  },
  9: {
    timely: [
      "In season (as through Period 9), the 9 brings recognition, celebrations and the warmth of good news.",
      "En saison (comme tout au long de la Période 9), le 9 apporte la reconnaissance, les fêtes et la chaleur des bonnes nouvelles.",
    ],
    waning: [
      "Just past its time, the 9 reads as excitement that outlasts its reasons.",
      "Juste après son temps, le 9 se lit comme une exaltation qui survit à ses raisons.",
    ],
    dormant: [
      "Out of its time, the classics read the 9 as heat: tempers that flare, and haste.",
      "Hors de son temps, les classiques lisent le 9 comme de la chaleur\u202f: des colères qui s’enflamment, et la précipitation.",
    ],
  },
};

/** A note per sector for the year: what the year's star visiting it brings (the 5 Yellow has its own line). */
export const ANNUAL_NOTES: Readonly<Record<Exclude<StarNumber, 5>, Both>> = {
  1: [
    "The year’s 1 White brings good news for study, careers and journeys to this part of the home.",
    "Le 1 Blanc de l’année apporte à cette partie du logement de bonnes nouvelles pour l’étude, les carrières et les voyages.",
  ],
  2: [
    "The year’s 2 Black asks for calm here: the classics suggest keeping this part of the home bright and uncluttered, and leaving works for another year.",
    "Le 2 Noir de l’année demande le calme ici\u202f: les classiques suggèrent de garder cette partie du logement claire et dégagée, et de remettre les travaux à une autre année.",
  ],
  3: [
    "The year’s 3 Jade brings energy and initiative here, and the classics advise patience in talk, as the 3 stirs disagreement.",
    "Le 3 Jade de l’année apporte ici l’énergie et l’initiative, et les classiques conseillent la patience dans les échanges, car le 3 attise les désaccords.",
  ],
  4: [
    "The year’s 4 Green favours study, writing and the arts in this part of the home.",
    "Le 4 Vert de l’année favorise l’étude, l’écriture et les arts dans cette partie du logement.",
  ],
  6: [
    "The year’s 6 White brings support from those in charge, and steady progress here.",
    "Le 6 Blanc de l’année apporte ici l’appui de ceux qui dirigent, et des progrès réguliers.",
  ],
  7: [
    "The year’s 7 Red brings lively talk and gatherings here; the classics advise care with words and with belongings.",
    "Le 7 Rouge de l’année apporte ici des échanges animés et des réunions\u202f; les classiques conseillent de la prudence avec les mots et avec ses biens.",
  ],
  8: [
    "The year’s 8 White brings steadiness, and small gains to keep, to this part of the home.",
    "Le 8 Blanc de l’année apporte à cette partie du logement de la constance, et de petits gains à garder.",
  ],
  9: [
    "The year’s 9 Purple brings celebrations and good news to this part of the home.",
    "Le 9 Pourpre de l’année apporte à cette partie du logement des fêtes et de bonnes nouvelles.",
  ],
};
