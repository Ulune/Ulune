/*
 * What the classics read in each of Feng Shui's 45 pairings of mountain and
 * water stars (languages plan, part 27), in English and French: two thirds of
 * the readings' texts, so a download of their own (the bug-fix round, item 4;
 * review item T9), fetched when a palace's reading opens
 * (studio/modes/fengshui-home.tsx), not with the page. The rest of the
 * readings' texts are in fengshui-readings-texts.ts; the same rules hold:
 * both faces the classics read, in season and out of it, and what
 * practitioners usually suggest, never a threat, nothing to buy.
 * scripts/chinese-fengshui-readings.test.mjs keeps both languages, their
 * typography and their tone.
 */
import type { Both } from "./both";
import type { PairKey } from "./fengshui-pairs";

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
