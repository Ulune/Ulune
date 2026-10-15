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
 * the home has a chart of stars (studio/modes/fengshui-home.tsx).
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

/** What the classics read in each pairing, whichever star is the mountain's. */
export const PAIR_TEXTS: Readonly<Record<PairKey, Both>> = {
  "1-1": [
    "The 1 White twice, water on water: the classics read wisdom, study and journeys. In season, recognition through knowledge and news from afar; out of season, plans that drift, and a home people pass through more than they settle in.",
    "Le 1 Blanc deux fois, l’eau sur l’eau\u202f: les classiques y lisent la sagesse, l’étude et les voyages. En saison, la reconnaissance par le savoir et des nouvelles de loin\u202f; hors saison, des projets qui dérivent, et une maison où l’on passe plus qu’on ne s’y installe.",
  ],
  "1-2": [
    "The 2’s earth holds back the 1’s water, the mother over the middle son. The classics read a strain between the people of the home, each holding the other back. In season, a patient pairing that builds slowly; out of season, misunderstandings that settle in, eased by plain talk and a calm, uncluttered room.",
    "La terre du 2 retient l’eau du 1, la mère sur le fils du milieu. Les classiques y lisent une tension entre les habitants, chacun retenant l’autre. En saison, une alliance patiente qui bâtit lentement\u202f; hors saison, des malentendus qui s’installent, apaisés par une parole simple et une pièce calme et dégagée.",
  ],
  "1-3": [
    "The 1’s water feeds the 3’s wood: the classics read growth, drive and a name made through effort. In season, advancement and recognition; out of season, the 3’s quarrelsome side: lively disputes that ask for patience.",
    "L’eau du 1 nourrit le bois du 3\u202f: les classiques y lisent la croissance, l’élan et un nom qu’on se fait par l’effort. En saison, l’avancement et la reconnaissance\u202f; hors saison, le côté querelleur du 3\u202f: des disputes vives qui demandent de la patience.",
  ],
  "1-4": [
    "A classical verse says that when the 4 and the 1 share a palace, success in study and examinations follows: water feeds wood, the star of learning meets the star of letters. In season, studies, writing and the arts prosper, and romance too; out of season, attachments that pull attention away from the work.",
    "Un vers classique dit que lorsque le 4 et le 1 partagent un palais, le succès aux études et aux examens suit\u202f: l’eau nourrit le bois, l’étoile du savoir rencontre celle des lettres. En saison, les études, l’écriture et les arts prospèrent, et l’amour aussi\u202f; hors saison, des attachements qui détournent l’attention du travail.",
  ],
  "1-5": [
    "The 5’s earth presses on the 1’s water: the classics read a heavy pairing for plans and for the people of this sector. In season, which is rare (the 5 is timely only around its own period), weight given to good ideas; out of season, practitioners keep the sector calm and leave works there for later.",
    "La terre du 5 pèse sur l’eau du 1\u202f: les classiques y lisent une alliance lourde pour les projets et pour les habitants de ce secteur. En saison, ce qui est rare (le 5 n’est en phase qu’autour de sa propre période), du poids donné aux bonnes idées\u202f; hors saison, les praticiens gardent le secteur calme et remettent les travaux à plus tard.",
  ],
  "1-6": [
    "One of the four He Tu pairs, which the classics say share an origin: metal carries water, the father beside the middle son. They read authority and wisdom together: promotion, recognition, study that leads to responsibility. In season, careers advance; out of season, a coolness between people who work side by side.",
    "L’une des quatre paires du Hetu, qui selon les classiques partagent une même origine\u202f: le métal porte l’eau, le père auprès du fils du milieu. Ils y lisent l’autorité et la sagesse réunies\u202f: la promotion, la reconnaissance, l’étude qui mène aux responsabilités. En saison, les carrières avancent\u202f; hors saison, une froideur entre ceux qui travaillent côte à côte.",
  ],
  "1-7": [
    "The 7’s metal feeds the 1’s water: the classics read charm, eloquence and romance. In season, ease with words, popularity and gains from talk; out of season, flirtation, and talk that goes further than it should.",
    "Le métal du 7 nourrit l’eau du 1\u202f: les classiques y lisent le charme, l’éloquence et l’amour. En saison, l’aisance des mots, la popularité et des gains par la parole\u202f; hors saison, le badinage, et des paroles qui vont plus loin qu’elles ne le devraient.",
  ],
  "1-8": [
    "The 8’s earth contains the 1’s water, the mountain holding back the stream: the classics read steady gains kept in check. In season, wealth built patiently and plans that take root; out of season, plans held back and progress slower than hoped.",
    "La terre du 8 contient l’eau du 1, la montagne retient le ruisseau\u202f: les classiques y lisent des gains réguliers mais retenus. En saison, une richesse bâtie avec patience et des projets qui prennent racine\u202f; hors saison, des projets freinés et des progrès plus lents qu’espéré.",
  ],
  "1-9": [
    "Water over fire, the hexagram Ji Ji, “after completion”, the two adding up to ten: the classics read the meeting of opposites. In season, harmony between different temperaments and things brought to completion; out of season, warmth and reserve argue, and the balance has to be found again.",
    "L’eau sur le feu, l’hexagramme Ji Ji, «\u202faprès l’accomplissement\u202f», les deux faisant dix\u202f: les classiques y lisent la rencontre des contraires. En saison, l’harmonie entre des tempéraments différents et des choses menées à terme\u202f; hors saison, la chaleur et la réserve se disputent, et l’équilibre est à retrouver.",
  ],
  "2-2": [
    "The 2 Black twice, earth on earth: the classics read land, property and care, and the 2’s heaviness twice over. In season (as in Period 2), gains from property and a well-kept household; out of season, a sector to keep calm, bright and uncluttered, rather than a room for long stays.",
    "Le 2 Noir deux fois, la terre sur la terre\u202f: les classiques y lisent la terre, les biens et le soin, et la lourdeur du 2 redoublée. En saison (comme en Période 2), des gains par les biens et un foyer bien tenu\u202f; hors saison, un secteur à garder calme, clair et dégagé, plutôt qu’une pièce où l’on reste longtemps.",
  ],
  "2-3": [
    "The classics call it the fighting bull: the 3’s wood against the 2’s earth, the eldest son against the mother. They read quarrels and stubbornness on both sides. In season, competition that sharpens; out of season, arguments that start from little, eased by patience, and by a calm room rather than a busy one.",
    "Les classiques l’appellent le taureau combatif\u202f: le bois du 3 contre la terre du 2, le fils aîné contre la mère. Ils y lisent des querelles et de l’entêtement des deux côtés. En saison, une rivalité qui aiguise\u202f; hors saison, des disputes qui naissent de peu, apaisées par la patience, et par une pièce calme plutôt qu’animée.",
  ],
  "2-4": [
    "The 4’s wood presses on the 2’s earth: the mother and the eldest daughter. The classics read friction between two generations of the home. In season, care and learning that support each other; out of season, small frictions that a shared meal or a plain talk can ease.",
    "Le bois du 4 pèse sur la terre du 2\u202f: la mère et la fille aînée. Les classiques y lisent une friction entre deux générations du foyer. En saison, le soin et le savoir qui s’épaulent\u202f; hors saison, de petites frictions qu’un repas partagé ou une parole simple peuvent apaiser.",
  ],
  "2-5": [
    "The 2 and the 5 joined: the heaviest pairing in the classics, two earth stars that weigh on the people of the home when they are out of their time. Practitioners leave such a sector quiet: no works, no clutter, not the room for long stays. It calls for care, not worry, and passes with the periods and the years.",
    "Le 2 et le 5 réunis\u202f: l’alliance la plus lourde des classiques, deux étoiles de terre qui pèsent sur les habitants quand elles sont hors de leur temps. Les praticiens laissent un tel secteur tranquille\u202f: pas de travaux, pas d’encombrement, pas la pièce où l’on reste longtemps. Cela demande du soin, pas de l’inquiétude, et passe avec les périodes et les années.",
  ],
  "2-6": [
    "The 2’s earth feeds the 6’s metal: Kun and Qian, the mother and the father, earth and heaven. The classics read a solid household and wealth from property and position. In season, provision and stability; out of season, a home run by habit, stubborn on both sides.",
    "La terre du 2 nourrit le métal du 6\u202f: Kun et Qian, la mère et le père, la terre et le ciel. Les classiques y lisent un foyer solide et une richesse tirée des biens et du rang. En saison, l’abondance et la stabilité\u202f; hors saison, une maison menée par l’habitude, entêtée des deux côtés.",
  ],
  "2-7": [
    "One of the four He Tu pairs, which make fire together though neither is fire: the classics read hidden heat. In season, wealth from trade and talk; out of season, quick tempers, and the classics ask for ordinary care with heat and flames in this sector.",
    "L’une des quatre paires du Hetu, qui font du feu ensemble alors qu’aucune n’est le feu\u202f: les classiques y lisent une chaleur cachée. En saison, la richesse par le commerce et la parole\u202f; hors saison, des humeurs vives, et les classiques demandent une prudence ordinaire avec la chaleur et les flammes dans ce secteur.",
  ],
  "2-8": [
    "The 2 and the 8, two earths adding up to ten: the mother and the youngest son. The classics read land, property and savings. In season, gains from property and steady accumulation; out of season, things that stand still, and savings slow to grow.",
    "Le 2 et le 8, deux terres qui font dix\u202f: la mère et le fils cadet. Les classiques y lisent la terre, les biens et l’épargne. En saison, des gains par les biens et une accumulation régulière\u202f; hors saison, des choses qui stagnent, et une épargne lente à croître.",
  ],
  "2-9": [
    "The 9’s fire feeds the 2’s earth. In season (both are timely in Period 9), celebrations, a full house and property that grows; out of season, the classics read the 9 lending its heat to the 2’s heaviness: a sector to keep light and airy.",
    "Le feu du 9 nourrit la terre du 2. En saison (tous deux sont en phase en Période 9), des fêtes, une maison pleine et des biens qui s’accroissent\u202f; hors saison, les classiques y lisent le 9 prêtant sa chaleur à la lourdeur du 2\u202f: un secteur à garder léger et aéré.",
  ],
  "3-3": [
    "The 3 Jade twice, thunder on thunder: the classics read drive, ambition and the push of growth. In season, initiative and quick advancement; out of season, the 3’s quarrelsome side doubled: competition and disputes that ask for patience.",
    "Le 3 Jade deux fois, le tonnerre sur le tonnerre\u202f: les classiques y lisent l’élan, l’ambition et la poussée de la croissance. En saison, l’initiative et un avancement rapide\u202f; hors saison, le côté querelleur du 3 redoublé\u202f: une rivalité et des disputes qui demandent de la patience.",
  ],
  "3-4": [
    "Thunder and wind, the eldest son and the eldest daughter, the hexagram Heng, “constancy”: two woods side by side. The classics read ideas and drive together. In season, work that lasts and partnerships that hold; out of season, restlessness of mind, and plans that change too often.",
    "Le tonnerre et le vent, le fils aîné et la fille aînée, l’hexagramme Heng, «\u202fla durée\u202f»\u202f: deux bois côte à côte. Les classiques y lisent les idées et l’élan réunis. En saison, un travail qui dure et des alliances qui tiennent\u202f; hors saison, un esprit agité, et des projets qui changent trop souvent.",
  ],
  "3-5": [
    "The 3’s wood against the 5’s earth: the classics read strain on money and plans, and disputes over them. In season, effort that shapes something large; out of season, a sector to keep calm, with big decisions weighed twice.",
    "Le bois du 3 face à la terre du 5\u202f: les classiques y lisent une tension sur l’argent et les projets, et des disputes à leur sujet. En saison, un effort qui façonne une grande œuvre\u202f; hors saison, un secteur à garder calme, où les grandes décisions se pèsent deux fois.",
  ],
  "3-6": [
    "The 6’s metal checks the 3’s wood: the father and the eldest son, authority and ambition. In season, drive given shape by discipline; out of season, clashes with those in charge, and impatience with rules.",
    "Le métal du 6 contient le bois du 3\u202f: le père et le fils aîné, l’autorité et l’ambition. En saison, un élan que la discipline met en forme\u202f; hors saison, des heurts avec ceux qui dirigent, et de l’impatience envers les règles.",
  ],
  "3-7": [
    "The 7’s metal cuts the 3’s wood, the two adding up to ten: a classical verse warns that when the 3 and the 7 meet, things are taken. The classics read loss and dispute. In season, sharp business sense and quick wins; out of season, care with belongings and locks, and with what is said.",
    "Le métal du 7 tranche le bois du 3, les deux faisant dix\u202f: un vers classique avertit que lorsque le 3 et le 7 se rencontrent, des choses sont prises. Les classiques y lisent la perte et la dispute. En saison, un sens aigu des affaires et des gains rapides\u202f; hors saison, de la prudence avec ses biens et ses serrures, et avec ce qui se dit.",
  ],
  "3-8": [
    "One of the four He Tu pairs, which the classics call friends: wood over earth, the eldest and the youngest sons. They read growth and change, and property that moves. In season, gains from land and from initiative; out of season, restlessness in the home’s young people, and plans that change course.",
    "L’une des quatre paires du Hetu, que les classiques disent amies\u202f: le bois sur la terre, le fils aîné et le fils cadet. Ils y lisent la croissance et le changement, et des biens qui bougent. En saison, des gains par la terre et par l’initiative\u202f; hors saison, de l’agitation chez les jeunes de la maison, et des projets qui changent de cap.",
  ],
  "3-9": [
    "The 3’s wood feeds the 9’s fire, which the classics call “wood and fire, bright and clear”: intelligence, quick success and a name that spreads. In season, talent seen and rewarded; out of season, hot tempers and haste.",
    "Le bois du 3 nourrit le feu du 9, ce que les classiques appellent «\u202fbois et feu, clairs et lumineux\u202f»\u202f: l’intelligence, le succès rapide et un nom qui se répand. En saison, le talent vu et récompensé\u202f; hors saison, des colères vives et la précipitation.",
  ],
  "4-4": [
    "The 4 Green twice, wind on wind: the classics read study, writing, the arts and romance. In season, success in studies and creative work; out of season, attention that drifts, and attachments that scatter.",
    "Le 4 Vert deux fois, le vent sur le vent\u202f: les classiques y lisent l’étude, l’écriture, les arts et l’amour. En saison, la réussite des études et des travaux créatifs\u202f; hors saison, une attention qui dérive, et des attachements qui se dispersent.",
  ],
  "4-5": [
    "The 4’s wood against the 5’s earth: the classics read study and romance weighed down. In season, steady effort on a large work; out of season, plans that stall, and attachments that complicate things.",
    "Le bois du 4 face à la terre du 5\u202f: les classiques y lisent l’étude et l’amour alourdis. En saison, un effort régulier sur une grande œuvre\u202f; hors saison, des projets qui piétinent, et des attachements qui compliquent les choses.",
  ],
  "4-6": [
    "The 6’s metal checks the 4’s wood, the two adding up to ten: the father and the eldest daughter. The classics read rules and creativity at odds. In season, writing and study that serve those in charge well; out of season, creative work held back by authority.",
    "Le métal du 6 contient le bois du 4, les deux faisant dix\u202f: le père et la fille aînée. Les classiques y lisent la règle et la création en désaccord. En saison, l’écriture et l’étude bien au service de ceux qui dirigent\u202f; hors saison, un travail créatif freiné par l’autorité.",
  ],
  "4-7": [
    "The 7’s metal checks the 4’s wood: two daughters of the home, speech against letters. The classics read charm with an edge. In season, persuasion and gains from writing and speaking; out of season, sharp words, and romance caught up in gossip.",
    "Le métal du 7 contient le bois du 4\u202f: deux filles de la maison, la parole contre l’écrit. Les classiques y lisent un charme tranchant. En saison, la persuasion et des gains par l’écriture et la parole\u202f; hors saison, des mots acérés, et un amour pris dans les commérages.",
  ],
  "4-8": [
    "The 4’s wood presses on the 8’s earth: the eldest daughter and the youngest son. The classics read learning turned into property, or property spent on learning. In season, studies that pay; out of season, savings that slip away on plans.",
    "Le bois du 4 pèse sur la terre du 8\u202f: la fille aînée et le fils cadet. Les classiques y lisent le savoir changé en biens, ou des biens dépensés pour le savoir. En saison, des études qui rapportent\u202f; hors saison, une épargne qui s’en va dans les projets.",
  ],
  "4-9": [
    "One of the four He Tu pairs, which the classics call friends, with wood feeding fire: the scholar’s success, writing that makes a name, recognition through the arts. In season, study and creative work rewarded; out of season, words that run ahead of the work.",
    "L’une des quatre paires du Hetu, que les classiques disent amies, le bois nourrissant le feu\u202f: le succès du lettré, une écriture qui fait un nom, la reconnaissance par les arts. En saison, l’étude et le travail créatif récompensés\u202f; hors saison, des mots qui devancent le travail.",
  ],
  "5-5": [
    "The 5 twice, the strongest star on itself: of all sectors, the classics ask for the most quiet here. In season (around Period 5 alone), power and command; out of season, no heavy works, no digging, nothing stirred up, and the sector kept simple.",
    "Le 5 deux fois, l’étoile la plus forte sur elle-même\u202f: de tous les secteurs, c’est ici que les classiques demandent le plus de calme. En saison (autour de la Période 5 seulement), le pouvoir et le commandement\u202f; hors saison, pas de gros travaux, pas de creusement, rien de remué, et un secteur gardé simple.",
  ],
  "5-6": [
    "The 5’s earth feeds the 6’s metal: the classics read authority with weight behind it. In season, command and position; out of season, ambition that overreaches, and authority grown rigid.",
    "La terre du 5 nourrit le métal du 6\u202f: les classiques y lisent une autorité qui a du poids derrière elle. En saison, le commandement et le rang\u202f; hors saison, une ambition qui va trop loin, et une autorité devenue raide.",
  ],
  "5-7": [
    "The 5’s earth feeds the 7’s metal: the classics read speech given weight. In season, persuasive words and profitable talk; out of season, gossip, and sharp words that carry further than meant.",
    "La terre du 5 nourrit le métal du 7\u202f: les classiques y lisent une parole qui prend du poids. En saison, des mots qui persuadent et des échanges qui rapportent\u202f; hors saison, des commérages, et des mots acérés qui portent plus loin que voulu.",
  ],
  "5-8": [
    "The 5 and the 8, two earths, the 8’s steadiness holding the 5: the classics read property and weight. In season, lasting gains from land; out of season, things that stand still, in a sector to keep calm and simple.",
    "Le 5 et le 8, deux terres, la constance du 8 retenant le 5\u202f: les classiques y lisent les biens et le poids. En saison, des gains durables par la terre\u202f; hors saison, des choses qui stagnent, dans un secteur à garder calme et simple.",
  ],
  "5-9": [
    "The 9’s fire feeds the 5’s earth: the classics read the 5’s intensity made stronger. In season, fame and command; out of season, a sector they ask to keep quiet and cool, without works.",
    "Le feu du 9 nourrit la terre du 5\u202f: les classiques y lisent l’intensité du 5 renforcée. En saison, la renommée et le commandement\u202f; hors saison, un secteur qu’ils demandent de garder calme et frais, sans travaux.",
  ],
  "6-6": [
    "The 6 White twice, heaven on heaven: the classics read authority, leadership and support from above. In season, promotion and recognition; out of season, stubbornness, and authority that stands alone.",
    "Le 6 Blanc deux fois, le ciel sur le ciel\u202f: les classiques y lisent l’autorité, le commandement et l’appui d’en haut. En saison, la promotion et la reconnaissance\u202f; hors saison, l’entêtement, et une autorité qui reste seule.",
  ],
  "6-7": [
    "The classics call it crossed swords: two metals, the father and the youngest daughter, authority and speech. In season, competitive drive and sharp skill; out of season, rivalry and disputes, eased by distance and calm rather than confrontation.",
    "Les classiques l’appellent les épées croisées\u202f: deux métaux, le père et la fille cadette, l’autorité et la parole. En saison, l’esprit de compétition et un savoir-faire aiguisé\u202f; hors saison, la rivalité et les disputes, apaisées par la distance et le calme plutôt que par l’affrontement.",
  ],
  "6-8": [
    "The 8’s earth feeds the 6’s metal: the classics read wealth and standing together, one of the pairings they praise most. In season, prosperity, promotion and gains that last; out of season, gains that slow but rarely turn.",
    "La terre du 8 nourrit le métal du 6\u202f: les classiques y lisent la richesse et le rang réunis, l’une des alliances qu’ils louent le plus. En saison, la prospérité, la promotion et des gains qui durent\u202f; hors saison, des gains qui ralentissent mais se retournent rarement.",
  ],
  "6-9": [
    "The classics call it fire at heaven’s gate: the 9’s fire against the 6’s metal, the middle daughter against the father, passion against authority. In season, ambition that wins recognition; out of season, friction with those in charge, and heated words between generations.",
    "Les classiques l’appellent le feu à la porte du ciel\u202f: le feu du 9 contre le métal du 6, la fille du milieu contre le père, la passion contre l’autorité. En saison, une ambition qui gagne la reconnaissance\u202f; hors saison, des frictions avec ceux qui dirigent, et des mots vifs entre générations.",
  ],
  "7-7": [
    "The 7 Red twice, lake on lake: the classics read speech, charm and pleasure. In season, eloquence, good company and income from talk; out of season, gossip and sharp words, and care with belongings.",
    "Le 7 Rouge deux fois, le lac sur le lac\u202f: les classiques y lisent la parole, le charme et le plaisir. En saison, l’éloquence, la bonne compagnie et des revenus par la parole\u202f; hors saison, des commérages et des mots acérés, et de la prudence avec ses biens.",
  ],
  "7-8": [
    "The 8’s earth feeds the 7’s metal: the youngest son and the youngest daughter, the lake over the mountain, the hexagram Xian, “attraction”. The classics read romance, charm and wealth through speech. In season, attraction, good company and gains from talk; out of season, pleasures that cost more than they give.",
    "La terre du 8 nourrit le métal du 7\u202f: le fils cadet et la fille cadette, le lac sur la montagne, l’hexagramme Xian, «\u202fl’attraction\u202f». Les classiques y lisent l’amour, le charme et la richesse par la parole. En saison, l’attirance, la bonne compagnie et des gains par la parole\u202f; hors saison, des plaisirs qui coûtent plus qu’ils ne donnent.",
  ],
  "7-9": [
    "A classical verse speaks of the 7 and the 9 crossing paths: the 9’s fire on the 7’s metal, the middle and the youngest daughters. The classics read heat and haste, and of all pairings they ask the most care with flames and heat here. In season, quick wit and warm company; out of season, quarrels and hurry.",
    "Un vers classique parle du 7 et du 9 qui se croisent\u202f: le feu du 9 sur le métal du 7, la fille du milieu et la fille cadette. Les classiques y lisent la chaleur et la hâte, et de toutes les alliances, c’est ici qu’ils demandent le plus de prudence avec les flammes et la chaleur. En saison, l’esprit vif et une compagnie chaleureuse\u202f; hors saison, des querelles et la précipitation.",
  ],
  "8-8": [
    "The 8 White twice, mountain on mountain: the classics read property, savings and stillness. In season (as through Period 8), lasting wealth; just past its time, a steadiness to keep rather than push; long out of season, things that stand still.",
    "Le 8 Blanc deux fois, la montagne sur la montagne\u202f: les classiques y lisent les biens, l’épargne et l’immobilité. En saison (comme tout au long de la Période 8), une richesse durable\u202f; juste après son temps, une constance à garder plutôt qu’à pousser\u202f; longtemps hors saison, des choses qui stagnent.",
  ],
  "8-9": [
    "The 9’s fire feeds the 8’s earth: the classics read celebrations, weddings and wealth together, among the happiest pairings. In season, joyful news and gains; out of season, spending on celebrations that outruns the means.",
    "Le feu du 9 nourrit la terre du 8\u202f: les classiques y lisent les fêtes, les mariages et la richesse réunis, parmi les alliances les plus heureuses. En saison, de joyeuses nouvelles et des gains\u202f; hors saison, des dépenses de fête qui dépassent les moyens.",
  ],
  "9-9": [
    "The 9 Purple twice, fire on fire: the classics read fame, celebration and recognition. In season (as through Period 9), the brightest pairing of the period; out of season, overheating: tempers and haste.",
    "Le 9 Pourpre deux fois, le feu sur le feu\u202f: les classiques y lisent la renommée, les fêtes et la reconnaissance. En saison (comme tout au long de la Période 9), l’alliance la plus brillante de la période\u202f; hors saison, la surchauffe\u202f: les colères et la précipitation.",
  ],
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
