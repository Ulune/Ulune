/*
 * BaZi's readings (languages plan, part 18: "each Ten God present or
 * missing (10 × 3), … phase excess and lack (10), interactions (about 40
 * kinds), … and each luck pillar and year by its Ten God (10 each)"), in
 * English and French, written for Ulune after the Zi Ping school's
 * consensus; the classical names of the combinations are the San Ming Tong
 * Hui's. A mirror, not a verdict: no fate, no health, no orders; an absence
 * is a quality to find or grow, an excess a strength to balance.
 * scripts/chinese-bazi-readings.test.mjs keeps every text in both
 * languages, their typography and their tone, and checks that every pair the
 * engine can name has its line.
 */
import type { PhaseId } from "./names";
import type { TenGodId } from "./bazi";
import type { InteractionKind } from "./bazi-interactions";
import { BRANCHES, STEMS } from "./names";
import type { Both } from "./both";

/** How a god stands in the chart: shown among the stems, only hidden in the branches, or absent. */
export type Presence = "shown" | "hidden" | "absent";

export const GOD_PRESENCE: Readonly<Record<TenGodId, Readonly<Record<Presence, Both>>>> = {
  companion: {
    shown: [
      "A Companion shows among your stems: your own kind beside you. The tradition reads self-reliance, friends who stand at your level, and the art of sharing the stage fairly.",
      "Un Compagnon apparaît parmi vos troncs\u202f: votre propre nature à vos côtés. La tradition y lit l’autonomie, des amis qui se tiennent à votre hauteur, et l’art de partager la scène avec équité.",
    ],
    hidden: [
      "The Companion lies only in your branches: a quiet self-confidence, and support from equals that comes when asked rather than in plain sight.",
      "Le Compagnon n’est que dans vos branches\u202f: une confiance en soi discrète, et l’appui de vos pairs qui vient quand on le demande plutôt qu’au grand jour.",
    ],
    absent: [
      "No Companion stands in your chart: you may meet the world more on your own. The tradition suggests seeking peers who share your ground.",
      "Aucun Compagnon dans votre thème\u202f: vous abordez peut-être le monde plus seul. La tradition suggère de chercher des pairs qui partagent votre terrain.",
    ],
  },
  "rob-wealth": {
    shown: [
      "Rob Wealth shows among your stems: a competitive streak, boldness with resources, and peers who push you as much as they help. The tradition reads energy for risk, and the care of keeping shares fair.",
      "Le Rival apparaît parmi vos troncs\u202f: un goût de la compétition, de l’audace avec les ressources, et des pairs qui vous poussent autant qu’ils vous aident. La tradition y lit une énergie pour le risque, et le soin de garder des parts justes.",
    ],
    hidden: [
      "Rob Wealth lies only in your branches: a quieter drive to keep up, ambition held in reserve.",
      "Le Rival n’est que dans vos branches\u202f: une envie plus discrète de suivre le rythme, une ambition gardée en réserve.",
    ],
    absent: [
      "No Rob Wealth stands in your chart: competition may move you less. The tradition suggests welcoming a little friendly rivalry.",
      "Aucun Rival dans votre thème\u202f: la compétition vous motive peut-être moins. La tradition suggère d’accueillir un peu de rivalité amicale.",
    ],
  },
  "eating-god": {
    shown: [
      "The Eating God shows among your stems: talent that flows easily, a taste for the good things of life, and a generous, relaxed way of sharing what you make.",
      "Le Dieu nourricier apparaît parmi vos troncs\u202f: un talent qui coule de source, le goût des bonnes choses de la vie, et une façon généreuse et détendue de partager ce que vous faites.",
    ],
    hidden: [
      "The Eating God lies only in your branches: gifts that show in private, pleasures and talents kept for those close to you.",
      "Le Dieu nourricier n’est que dans vos branches\u202f: des dons qui se montrent en privé, des plaisirs et des talents gardés pour vos proches.",
    ],
    absent: [
      "No Eating God stands in your chart: ease and enjoyment may need room to be made for them. The tradition suggests leisure as a skill to practise.",
      "Aucun Dieu nourricier dans votre thème\u202f: l’aisance et le plaisir demandent peut-être qu’on leur fasse de la place. La tradition suggère le loisir comme un art à pratiquer.",
    ],
  },
  "hurting-officer": {
    shown: [
      "The Hurting Officer shows among your stems: a bright, outspoken mind, originality, and an eye for what does not work. The tradition reads brilliance, at its best with tact.",
      "L’Officier blessant apparaît parmi vos troncs\u202f: un esprit vif et franc, de l’originalité, et un œil pour ce qui ne fonctionne pas. La tradition y lit de l’éclat, à son meilleur avec du tact.",
    ],
    hidden: [
      "The Hurting Officer lies only in your branches: a critical, creative streak that speaks when it is ready.",
      "L’Officier blessant n’est que dans vos branches\u202f: une veine critique et créative qui parle quand elle est prête.",
    ],
    absent: [
      "No Hurting Officer stands in your chart: you may challenge rules less readily. The tradition suggests trusting your own voice.",
      "Aucun Officier blessant dans votre thème\u202f: vous contestez peut-être moins volontiers les règles. La tradition suggère de faire confiance à votre propre voix.",
    ],
  },
  "indirect-wealth": {
    shown: [
      "Indirect Wealth shows among your stems: an eye for opportunity, generosity, and resources that come through ventures, contacts and timing.",
      "La Richesse indirecte apparaît parmi vos troncs\u202f: un œil pour les occasions, de la générosité, et des ressources qui viennent par les projets, les contacts et le bon moment.",
    ],
    hidden: [
      "Indirect Wealth lies only in your branches: openings that arrive quietly, through people and unplanned encounters.",
      "La Richesse indirecte n’est que dans vos branches\u202f: des ouvertures qui arrivent discrètement, par les gens et les rencontres imprévues.",
    ],
    absent: [
      "No Indirect Wealth stands in your chart: you may prefer steady paths to bets. The tradition suggests staying open to the unexpected opening.",
      "Aucune Richesse indirecte dans votre thème\u202f: vous préférez peut-être les chemins sûrs aux paris. La tradition suggère de rester ouvert à l’ouverture inattendue.",
    ],
  },
  "direct-wealth": {
    shown: [
      "Direct Wealth shows among your stems: steady work, a practical sense, and care with what you earn and keep.",
      "La Richesse directe apparaît parmi vos troncs\u202f: un travail régulier, le sens pratique, et le soin de ce que vous gagnez et gardez.",
    ],
    hidden: [
      "Direct Wealth lies only in your branches: a private carefulness with resources, security built without display.",
      "La Richesse directe n’est que dans vos branches\u202f: un soin discret des ressources, une sécurité bâtie sans éclat.",
    ],
    absent: [
      "No Direct Wealth stands in your chart: material order may matter less to you. The tradition suggests simple habits that keep resources steady.",
      "Aucune Richesse directe dans votre thème\u202f: l’ordre matériel compte peut-être moins pour vous. La tradition suggère des habitudes simples qui gardent les ressources stables.",
    ],
  },
  "seven-killings": {
    shown: [
      "Seven Killings shows among your stems: pressure that sharpens you, courage, and the drive to lead under strain. The tradition reads a force at its best when it is given a direction and a discipline.",
      "Les Sept Tueurs apparaissent parmi vos troncs\u202f: une pression qui vous aiguise, du courage, et l’élan de mener dans l’effort. La tradition y lit une force à son meilleur quand elle reçoit une direction et une discipline.",
    ],
    hidden: [
      "Seven Killings lies only in your branches: an inner toughness that surfaces when it is needed.",
      "Les Sept Tueurs ne sont que dans vos branches\u202f: une solidité intérieure qui affleure quand il le faut.",
    ],
    absent: [
      "No Seven Killings stands in your chart: you may meet less pressure from outside. The tradition suggests choosing challenges that stretch you.",
      "Aucun Sept Tueurs dans votre thème\u202f: vous subissez peut-être moins de pression du dehors. La tradition suggère de choisir des défis qui vous font grandir.",
    ],
  },
  "direct-officer": {
    shown: [
      "The Direct Officer shows among your stems: a sense of order, duty and fairness, and a good name earned by keeping your word.",
      "L’Officier direct apparaît parmi vos troncs\u202f: le sens de l’ordre, du devoir et de l’équité, et une bonne réputation gagnée en tenant parole.",
    ],
    hidden: [
      "The Direct Officer lies only in your branches: a private conscience, rules kept for yourself rather than shown.",
      "L’Officier direct n’est que dans vos branches\u202f: une conscience intime, des règles tenues pour soi plutôt que montrées.",
    ],
    absent: [
      "No Direct Officer stands in your chart: you may live more by your own rules. The tradition suggests building structures you choose.",
      "Aucun Officier direct dans votre thème\u202f: vous vivez peut-être davantage selon vos propres règles. La tradition suggère de bâtir des cadres que vous choisissez.",
    ],
  },
  "indirect-resource": {
    shown: [
      "The Indirect Resource shows among your stems: intuition, unusual learning and an independent mind that finds its own sources.",
      "La Ressource indirecte apparaît parmi vos troncs\u202f: l’intuition, un savoir peu commun et un esprit indépendant qui trouve ses propres sources.",
    ],
    hidden: [
      "The Indirect Resource lies only in your branches: insight that comes in solitude, and knowledge you keep to yourself.",
      "La Ressource indirecte n’est que dans vos branches\u202f: des intuitions qui viennent dans la solitude, et un savoir que vous gardez pour vous.",
    ],
    absent: [
      "No Indirect Resource stands in your chart: you may trust the evident over the hidden. The tradition suggests time alone with an unusual subject.",
      "Aucune Ressource indirecte dans votre thème\u202f: vous faites peut-être davantage confiance à l’évident qu’au caché. La tradition suggère du temps seul avec un sujet peu commun.",
    ],
  },
  "direct-resource": {
    shown: [
      "The Direct Resource shows among your stems: support received and given, a love of learning, patience and protection.",
      "La Ressource directe apparaît parmi vos troncs\u202f: le soutien reçu et donné, l’amour d’apprendre, la patience et la protection.",
    ],
    hidden: [
      "The Direct Resource lies only in your branches: quiet support, care that is there without being asked for.",
      "La Ressource directe n’est que dans vos branches\u202f: un soutien discret, un soin présent sans qu’on le demande.",
    ],
    absent: [
      "No Direct Resource stands in your chart: you may have learned to look after yourself. The tradition suggests letting others help, and letting teachers in.",
      "Aucune Ressource directe dans votre thème\u202f: vous avez peut-être appris à prendre soin de vous seul. La tradition suggère de laisser les autres aider, et les maîtres entrer.",
    ],
  },
};

/** A phase the chart holds much of (from 2.5 of its 9 points), or little (under half a point): bazi-reading.ts's PHASE_MUCH and PHASE_LITTLE. */
export const PHASE_EXCESS: Readonly<Record<PhaseId, Both>> = {
  wood: [
    "Much Wood: growth, plans and a forward push. The tradition watches for impatience and too many beginnings, and values what prunes and what uses that growth.",
    "Beaucoup de Bois\u202f: la croissance, les projets et l’élan vers l’avant. La tradition surveille l’impatience et les commencements trop nombreux, et apprécie ce qui taille et ce qui emploie cette croissance.",
  ],
  fire: [
    "Much Fire: warmth, enthusiasm and visibility. The tradition watches for haste and for spending too much, and values rest and calm.",
    "Beaucoup de Feu\u202f: la chaleur, l’enthousiasme et la visibilité. La tradition surveille la hâte et la dépense excessive, et apprécie le repos et le calme.",
  ],
  earth: [
    "Much Earth: steadiness and reliability. The tradition watches for heaviness and worry, and values movement and change.",
    "Beaucoup de Terre\u202f: la stabilité et la fiabilité. La tradition surveille la lourdeur et le souci, et apprécie le mouvement et le changement.",
  ],
  metal: [
    "Much Metal: clarity, standards and decision. The tradition watches for rigidity, and values softness and warmth.",
    "Beaucoup de Métal\u202f: la clarté, l’exigence et la décision. La tradition surveille la rigidité, et apprécie la douceur et la chaleur.",
  ],
  water: [
    "Much Water: depth, imagination and adaptability. The tradition watches for drifting, and values form and firm ground.",
    "Beaucoup d’Eau\u202f: la profondeur, l’imagination et l’adaptabilité. La tradition surveille la dérive, et apprécie la forme et un sol ferme.",
  ],
};

export const PHASE_LACK: Readonly<Record<PhaseId, Both>> = {
  wood: [
    "Little Wood: growth and new starts may need encouragement. The tradition suggests plans, green places and long projects.",
    "Peu de Bois\u202f: la croissance et les nouveaux départs demandent peut-être d’être encouragés. La tradition suggère les projets, les lieux verts et les entreprises au long cours.",
  ],
  fire: [
    "Little Fire: warmth and expression may need kindling. The tradition suggests light, company and sharing what you feel.",
    "Peu de Feu\u202f: la chaleur et l’expression demandent peut-être d’être ranimées. La tradition suggère la lumière, la compagnie et le partage de ce que vous ressentez.",
  ],
  earth: [
    "Little Earth: a centre to come back to may need building. The tradition suggests routines, a home base and time given to the people near you.",
    "Peu de Terre\u202f: un centre où revenir demande peut-être d’être bâti. La tradition suggère les routines, un port d’attache et du temps donné à vos proches.",
  ],
  metal: [
    "Little Metal: structure and limits may need strengthening. The tradition suggests order, clear choices and finishing what you start.",
    "Peu de Métal\u202f: la structure et les limites demandent peut-être d’être renforcées. La tradition suggère l’ordre, des choix nets et de finir ce que vous commencez.",
  ],
  water: [
    "Little Water: rest and reflection may need room. The tradition suggests quiet, listening and time to let things settle.",
    "Peu d’Eau\u202f: le repos et la réflexion demandent peut-être de la place. La tradition suggère le calme, l’écoute et du temps pour laisser les choses se poser.",
  ],
};

/** A luck pillar's ten years, by the Ten God of its stem. */
export const LUCK_GOD_TEXTS: Readonly<Record<TenGodId, Both>> = {
  companion: [
    "A decade of your own kind: self-reliance, peers and partnerships of equals, a time to stand on your own ground.",
    "Une décennie de votre propre nature\u202f: l’autonomie, les pairs et les partenariats d’égal à égal, un temps pour se tenir sur son propre terrain.",
  ],
  "rob-wealth": [
    "A decade of competition and boldness: shared ventures and rivals who spur you on, a time to keep generosity and fairness in balance.",
    "Une décennie de compétition et d’audace\u202f: des projets partagés et des rivaux qui vous stimulent, un temps pour garder la générosité et l’équité en équilibre.",
  ],
  "eating-god": [
    "A decade of expression and ease: talents that flow, pleasures, teaching and making, a time to enjoy what you do.",
    "Une décennie d’expression et d’aisance\u202f: des talents qui coulent, des plaisirs, enseigner et créer, un temps pour aimer ce que vous faites.",
  ],
  "hurting-officer": [
    "A decade of originality and change: speaking up, questioning, creating. A time to choose your battles and to channel the spark.",
    "Une décennie d’originalité et de changement\u202f: prendre la parole, questionner, créer. Un temps pour choisir ses combats et canaliser l’étincelle.",
  ],
  "indirect-wealth": [
    "A decade of opportunity: ventures, travel and contacts, resources that come and go. A time to take openings with a steady hand.",
    "Une décennie d’occasions\u202f: projets, voyages et contacts, des ressources qui vont et viennent. Un temps pour saisir les ouvertures d’une main sûre.",
  ],
  "direct-wealth": [
    "A decade of building: steady work and earnings, practical commitments, a time when effort shows its results.",
    "Une décennie de construction\u202f: un travail et des gains réguliers, des engagements concrets, un temps où l’effort montre ses fruits.",
  ],
  "seven-killings": [
    "A decade of challenge: pressure, responsibility and ambition, a time that rewards courage and a clear aim.",
    "Une décennie de défis\u202f: pression, responsabilités et ambition, un temps qui récompense le courage et un but clair.",
  ],
  "direct-officer": [
    "A decade of structure: roles, duties and recognition, a time to build a good name within a framework.",
    "Une décennie de structure\u202f: rôles, devoirs et reconnaissance, un temps pour bâtir une bonne réputation dans un cadre.",
  ],
  "indirect-resource": [
    "A decade of insight: unusual studies, solitude and intuition, a time to follow your own lines of research.",
    "Une décennie d’intuition\u202f: des études peu communes, la solitude et l’intuition, un temps pour suivre vos propres pistes.",
  ],
  "direct-resource": [
    "A decade of support and learning: teachers, care and qualifications, a time to receive and to grow.",
    "Une décennie de soutien et d’apprentissage\u202f: des maîtres, du soin et des diplômes, un temps pour recevoir et grandir.",
  ],
};

/** A year, by the Ten God of its stem. */
export const YEAR_GOD_TEXTS: Readonly<Record<TenGodId, Both>> = {
  companion: ["A year of peers and self-reliance: friends and equals around you, and your own ground to hold.", "Une année de pairs et d’autonomie\u202f: des amis et des égaux autour de vous, et votre propre terrain à tenir."],
  "rob-wealth": ["A year of competition: rivals and partners spur you on, and fairness in sharing keeps it light.", "Une année de compétition\u202f: rivaux et partenaires vous stimulent, et l’équité dans le partage garde les choses légères."],
  "eating-god": ["A year of ease and expression: to create, to enjoy, to share what you make.", "Une année d’aisance et d’expression\u202f: créer, savourer, partager ce que vous faites."],
  "hurting-officer": ["A year of new ideas and frank words: a good time to change what no longer works, with tact.", "Une année d’idées neuves et de paroles franches\u202f: un bon moment pour changer ce qui ne marche plus, avec tact."],
  "indirect-wealth": ["A year of openings: opportunities, contacts and movement, best met with a steady plan.", "Une année d’ouvertures\u202f: occasions, contacts et mouvement, à aborder avec un plan solide."],
  "direct-wealth": ["A year of steady work: effort that pays back, practical matters well handled.", "Une année de travail régulier\u202f: un effort qui rend, des affaires concrètes bien menées."],
  "seven-killings": ["A year of pressure and push: challenges to rise to, with a clear aim and rest between efforts.", "Une année de pression et d’élan\u202f: des défis à relever, avec un but clair et du repos entre les efforts."],
  "direct-officer": ["A year of order and recognition: responsibilities, commitments and a good name to keep.", "Une année d’ordre et de reconnaissance\u202f: des responsabilités, des engagements et une bonne réputation à garder."],
  "indirect-resource": ["A year of insight: study, intuition and time alone that feeds you.", "Une année d’intuition\u202f: l’étude, l’intuition et du temps seul qui vous nourrit."],
  "direct-resource": ["A year of support: help received, learning, and care to accept.", "Une année de soutien\u202f: de l’aide reçue, de l’apprentissage, et du soin à accepter."],
};

/**
 * Each pair or group the engine can name, in a line of its own: the five
 * stem combinations by their classical names, the four stem clashes, the
 * six harmonies, the six clashes, harms and destructions, the four
 * self-punishments, the four trines and the four seasons. Keyed by
 * `pairKey`.
 */
export const PAIR_LINES: Readonly<Record<string, Both>> = {
  // 天干五合
  "stem-combination:jia-ji": ["Jia and Ji make the combination of the centre (中正之合): fairness and good faith, a bond of trust.", "Jia et Ji forment la combinaison du centre (中正之合)\u202f: l’équité et la bonne foi, un lien de confiance."],
  "stem-combination:yi-geng": ["Yi and Geng make the combination of kindness and justice (仁義之合): gentleness and firmness that respect each other.", "Yi et Geng forment la combinaison de la bonté et de la justice (仁義之合)\u202f: la douceur et la fermeté qui se respectent."],
  "stem-combination:bing-xin": ["Bing and Xin make the combination of authority (威制之合): the sun and the jewel, presence and refinement held together.", "Bing et Xin forment la combinaison de l’autorité (威制之合)\u202f: le soleil et le joyau, la présence et le raffinement tenus ensemble."],
  "stem-combination:ding-ren": ["Ding and Ren make the combination the classics call one of feeling: the candle and the river, warmth and depth drawn to each other.", "Ding et Ren forment la combinaison que les classiques disent du sentiment\u202f: la bougie et le fleuve, la chaleur et la profondeur attirées l’une par l’autre."],
  "stem-combination:wu-gui": ["Wu and Gui make the combination the classics call “without feeling” (無情之合): the mountain and the rain, an alliance of interest more than of the heart.", "Wu et Gui forment la combinaison que les classiques disent «\u202fsans sentiment\u202f» (無情之合)\u202f: la montagne et la pluie, une alliance d’intérêt plus que de cœur."],
  // 天干四沖
  "stem-clash:jia-geng": ["Jia and Geng clash: the tree and the axe, growth meeting a cut that can also shape it.", "Jia et Geng se heurtent\u202f: l’arbre et la hache, la croissance face à une coupe qui peut aussi la façonner."],
  "stem-clash:yi-xin": ["Yi and Xin clash: the vine and the blade, suppleness meeting precision.", "Yi et Xin se heurtent\u202f: la liane et la lame, la souplesse face à la précision."],
  "stem-clash:bing-ren": ["Bing and Ren clash: the sun and the river, warmth facing depth.", "Bing et Ren se heurtent\u202f: le soleil et le fleuve, la chaleur face à la profondeur."],
  "stem-clash:ding-gui": ["Ding and Gui clash: the candle and the rain, a small flame and a fine water to keep in balance.", "Ding et Gui se heurtent\u202f: la bougie et la pluie, une petite flamme et une eau fine à garder en équilibre."],
  // 六合
  "harmony:zi-chou": ["The Rat and the Ox, Zi and Chou: the steadiest of the harmonies, quick wit with patience, making Earth.", "Le Rat et le Bœuf, Zi et Chou\u202f: la plus stable des harmonies, l’esprit vif avec la patience, qui forment la Terre."],
  "harmony:yin-hai": ["The Tiger and the Pig, Yin and Hai: generosity and warmth, making Wood.", "Le Tigre et le Cochon, Yin et Hai\u202f: la générosité et la chaleur, qui forment le Bois."],
  "harmony:mao-xu": ["The Rabbit and the Dog, Mao and Xu: gentleness and loyalty, making Fire.", "Le Lapin et le Chien, Mao et Xu\u202f: la douceur et la loyauté, qui forment le Feu."],
  "harmony:chen-you": ["The Dragon and the Rooster, Chen and You: ambition and precision, making Metal.", "Le Dragon et le Coq, Chen et You\u202f: l’ambition et la précision, qui forment le Métal."],
  "harmony:si-shen": ["The Snake and the Monkey, Si and Shen: cleverness and speed, making Water; they are also a punishment and a destruction, a bond with an edge.", "Le Serpent et le Singe, Si et Shen\u202f: l’intelligence et la vivacité, qui forment l’Eau\u202f; ils sont aussi une punition et une destruction, un lien qui a du tranchant."],
  "harmony:wu-wei": ["The Horse and the Goat, Wu and Wei: the Sun and the Moon of the branches, warmth and care.", "Le Cheval et la Chèvre, Wu et Wei\u202f: le Soleil et la Lune des branches, la chaleur et le soin."],
  // 六沖
  "clash:zi-wu": ["Zi and Wu, the Rat and the Horse: Water against Fire, north against south, the strongest of the clashes.", "Zi et Wu, le Rat et le Cheval\u202f: l’Eau contre le Feu, le nord contre le sud, le plus fort des chocs."],
  "clash:chou-wei": ["Chou and Wei, the Ox and the Goat: Earth against Earth, two storehouses shaken open.", "Chou et Wei, le Bœuf et la Chèvre\u202f: la Terre contre la Terre, deux réserves secouées et ouvertes."],
  "clash:yin-shen": ["Yin and Shen, the Tiger and the Monkey: Wood against Metal, journeys and changes of direction.", "Yin et Shen, le Tigre et le Singe\u202f: le Bois contre le Métal, des voyages et des changements de direction."],
  "clash:mao-you": ["Mao and You, the Rabbit and the Rooster: east against west, the gentle and the sharp.", "Mao et You, le Lapin et le Coq\u202f: l’est contre l’ouest, le doux et le tranchant."],
  "clash:chen-xu": ["Chen and Xu, the Dragon and the Dog: Earth against Earth, two storehouses that open each other.", "Chen et Xu, le Dragon et le Chien\u202f: la Terre contre la Terre, deux réserves qui s’ouvrent l’une l’autre."],
  "clash:si-hai": ["Si and Hai, the Snake and the Pig: Fire against Water, movement and travel.", "Si et Hai, le Serpent et le Cochon\u202f: le Feu contre l’Eau, le mouvement et les voyages."],
  // 六害
  "harm:zi-wei": ["Zi and Wei, the Rat and the Goat: care that misreads what the other needs.", "Zi et Wei, le Rat et la Chèvre\u202f: un soin qui se trompe sur ce dont l’autre a besoin."],
  "harm:chou-wu": ["Chou and Wu, the Ox and the Horse: patience and haste at odds.", "Chou et Wu, le Bœuf et le Cheval\u202f: la patience et la hâte en désaccord."],
  "harm:yin-si": ["Yin and Si, the Tiger and the Snake: boldness and caution wary of each other.", "Yin et Si, le Tigre et le Serpent\u202f: l’audace et la prudence qui se méfient l’une de l’autre."],
  "harm:mao-chen": ["Mao and Chen, the Rabbit and the Dragon: gentleness and pride.", "Mao et Chen, le Lapin et le Dragon\u202f: la douceur et la fierté."],
  "harm:shen-hai": ["Shen and Hai, the Monkey and the Pig: cleverness and trust.", "Shen et Hai, le Singe et le Cochon\u202f: l’habileté et la confiance."],
  "harm:you-xu": ["You and Xu, the Rooster and the Dog: criticism and loyalty.", "You et Xu, le Coq et le Chien\u202f: la critique et la loyauté."],
  // 六破
  "destruction:zi-you": ["Zi and You, the Rat and the Rooster: a bond loosened by too many words.", "Zi et You, le Rat et le Coq\u202f: un lien desserré par trop de paroles."],
  "destruction:chou-chen": ["Chou and Chen, the Ox and the Dragon: two Earths that unsettle each other.", "Chou et Chen, le Bœuf et le Dragon\u202f: deux Terres qui se dérangent."],
  "destruction:yin-hai": ["Yin and Hai, the Tiger and the Pig: a harmony and a destruction at once, closeness that asks for care.", "Yin et Hai, le Tigre et le Cochon\u202f: une harmonie et une destruction à la fois, une proximité qui demande du soin."],
  "destruction:mao-wu": ["Mao and Wu, the Rabbit and the Horse: Wood feeding Fire too fast.", "Mao et Wu, le Lapin et le Cheval\u202f: le Bois qui nourrit le Feu trop vite."],
  "destruction:si-shen": ["Si and Shen, the Snake and the Monkey: a harmony, a punishment and a destruction at once.", "Si et Shen, le Serpent et le Singe\u202f: une harmonie, une punition et une destruction à la fois."],
  "destruction:wei-xu": ["Wei and Xu, the Goat and the Dog: two Earths, a slow wear.", "Wei et Xu, la Chèvre et le Chien\u202f: deux Terres, une usure lente."],
  // 自刑
  "self-punishment:chen": ["Chen twice: the Dragon’s ambition turned on itself.", "Chen deux fois\u202f: l’ambition du Dragon retournée contre elle-même."],
  "self-punishment:wu": ["Wu twice: the Horse’s haste, too much Fire at once.", "Wu deux fois\u202f: la hâte du Cheval, trop de Feu à la fois."],
  "self-punishment:you": ["You twice: the Rooster’s high standards turned inward.", "You deux fois\u202f: l’exigence du Coq tournée vers l’intérieur."],
  "self-punishment:hai": ["Hai twice: the Pig’s generosity given until it runs dry.", "Hai deux fois\u202f: la générosité du Cochon donnée jusqu’à s’épuiser."],
  // 三合 (and their halves)
  "trine:water": ["Shen, Zi and Chen, the Monkey, the Rat and the Dragon: a Water alliance of ideas and resource.", "Shen, Zi et Chen, le Singe, le Rat et le Dragon\u202f: une alliance d’Eau, d’idées et de ressource."],
  "trine:wood": ["Hai, Mao and Wei, the Pig, the Rabbit and the Goat: a Wood alliance of kindness and growth.", "Hai, Mao et Wei, le Cochon, le Lapin et la Chèvre\u202f: une alliance de Bois, de bonté et de croissance."],
  "trine:fire": ["Yin, Wu and Xu, the Tiger, the Horse and the Dog: a Fire alliance of enthusiasm and courage.", "Yin, Wu et Xu, le Tigre, le Cheval et le Chien\u202f: une alliance de Feu, d’enthousiasme et de courage."],
  "trine:metal": ["Si, You and Chou, the Snake, the Rooster and the Ox: a Metal alliance of method and resolve.", "Si, You et Chou, le Serpent, le Coq et le Bœuf\u202f: une alliance de Métal, de méthode et de résolution."],
  // 三會
  "season:wood": ["Yin, Mao and Chen: the whole of spring, the east and Wood.", "Yin, Mao et Chen\u202f: tout le printemps, l’est et le Bois."],
  "season:fire": ["Si, Wu and Wei: the whole of summer, the south and Fire.", "Si, Wu et Wei\u202f: tout l’été, le sud et le Feu."],
  "season:metal": ["Shen, You and Xu: the whole of autumn, the west and Metal.", "Shen, You et Xu\u202f: tout l’automne, l’ouest et le Métal."],
  "season:water": ["Hai, Zi and Chou: the whole of winter, the north and Water.", "Hai, Zi et Chou\u202f: tout l’hiver, le nord et l’Eau."],
};

/** The key of a pair's or group's line: stems or branches in their order, a group by its phase, a self-punishment by its branch. */
export function pairKey(kind: InteractionKind, level: "stem" | "branch", items: readonly number[], phase?: PhaseId): string | null {
  if (kind === "punishment") return null;
  if (kind === "trine" || kind === "half-trine" || kind === "season") return phase ? `${kind === "half-trine" ? "trine" : kind}:${phase}` : null;
  const names = [...new Set(items)].sort((a, b) => a - b).map((i) => (level === "stem" ? STEMS[i]!.id : BRANCHES[i]!.id));
  return `${kind}:${names.join("-")}`;
}

/** The line of a pair or group, when it has one. */
export const pairLine = (kind: InteractionKind, level: "stem" | "branch", items: readonly number[], phase?: PhaseId): Both | null => {
  const key = pairKey(kind, level, items, phase);
  return key ? (PAIR_LINES[key] ?? null) : null;
};
