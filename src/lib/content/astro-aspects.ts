import type { Bi } from "./types";
import type { AspectId } from "@/lib/chart/types";

export type AspectFamily = "blend" | "flow" | "tension";

export type AspectText = {
  angle: string;
  family: AspectFamily;
  what: Bi;
  inPractice: Bi;
  link: Bi;
};

export const ASPECT_TEXT: Record<AspectId, AspectText> = {
  conjunction: {
    angle: "0°",
    family: "blend",
    what: {
      en: "A conjunction means two planets sit at roughly the same degree of the zodiac, usually in the same sign, within about 8° (some astrologers allow up to 10° when the Sun or Moon is involved). Their functions fuse: neither acts alone, so each colours the other. It feels less like a relationship between two parts and more like one strong trait.",
      fr: "Une conjonction signifie que deux planètes occupent à peu près le même degré du zodiaque, en général dans le même signe, avec un orbe d’environ 8° (certains astrologues vont jusqu’à 10° avec le Soleil ou la Lune). Leurs fonctions fusionnent\u202f: aucune n’agit seule et chacune teinte l’autre. On la vit moins comme un dialogue entre deux parties que comme un trait unique et marqué.",
    },
    inPractice: {
      en: "Conjunctions are often the most visible feature of a chart, and people close to you notice them quickly. The work is to learn the two functions separately, so you can tell when one is driving the other.",
      fr: "Les conjonctions sont souvent ce qui se voit le plus dans un thème, et les proches les repèrent vite. Le travail consiste à distinguer les deux fonctions, pour sentir quand l’une mène l’autre.",
    },
    link: { en: "is joined with", fr: "est en conjonction avec" },
  },
  opposition: {
    angle: "180°",
    family: "tension",
    what: {
      en: "An opposition links two planets on opposite sides of the zodiac, six signs apart, usually within 7–8° (some allow a little more with the Sun or Moon). The signs are complementary: same modality, and elements that pair naturally (fire with air, earth with water). The two functions pull in opposite directions, which often feels like a see-saw, or like meeting one side of yourself in other people.",
      fr: "Une opposition relie deux planètes situées de part et d’autre du zodiaque, à six signes d’écart, en général avec un orbe de 7 à 8° (certains en accordent un peu plus avec le Soleil ou la Lune). Les signes sont complémentaires\u202f: même modalité, et des éléments qui se répondent (feu et air, terre et eau). Les deux fonctions tirent en sens inverse, comme un jeu de bascule, ou comme si l’on rencontrait une part de soi chez les autres.",
    },
    inPractice: {
      en: "Oppositions often play out through relationships: you notice the other end in a partner, colleague or rival. What helps is holding both instead of alternating — deciding consciously how much room each side gets, rather than swinging from one extreme to the other.",
      fr: "L’opposition se joue souvent dans les relations\u202f: l’autre pôle apparaît chez un partenaire, un collègue, un rival. Ce qui aide, c’est de tenir les deux au lieu d’alterner\u202f: décider consciemment de la place de chacun plutôt que de passer d’un extrême à l’autre.",
    },
    link: { en: "opposes", fr: "est en opposition avec" },
  },
  trine: {
    angle: "120°",
    family: "flow",
    what: {
      en: "A trine joins two planets 120° apart, four signs away from each other, usually within 6–8°. Classically the two sit in signs of the same element, so they share a temperament. Their functions support each other without effort, which often feels like a natural talent — so natural that you may not notice it or bother developing it.",
      fr: "Un trigone relie deux planètes à 120° l’une de l’autre, à quatre signes d’écart, en général avec un orbe de 6 à 8°. Classiquement, elles se trouvent dans des signes du même élément et partagent donc un tempérament. Leurs fonctions se soutiennent sans effort, ce qui ressemble à un talent naturel, si naturel qu’on peut ne pas le remarquer ni le cultiver.",
    },
    inPractice: {
      en: "Trines show where things come easily. Their risk is passivity: an ability that is never challenged can stay average. Using a trine on purpose — practising it, putting it to work — is what turns ease into real skill.",
      fr: "Le trigone montre où les choses viennent facilement. Son risque est la passivité\u202f: une aptitude jamais mise à l’épreuve peut rester moyenne. L’utiliser délibérément, s’y exercer, la mettre au travail\u202f: c’est ce qui transforme la facilité en vrai savoir-faire.",
    },
    link: { en: "works easily with", fr: "s’accorde facilement avec" },
  },
  square: {
    angle: "90°",
    family: "tension",
    what: {
      en: "A square joins two planets 90° apart, three signs away, usually within 6–8°. The signs normally share a modality (both cardinal, fixed or mutable) but have elements that don’t mix easily. The two functions block or interrupt each other, which feels like inner friction, impatience or a recurring problem that demands action.",
      fr: "Un carré relie deux planètes à 90° l’une de l’autre, à trois signes d’écart, en général avec un orbe de 6 à 8°. Les signes partagent normalement la même modalité (cardinale, fixe ou mutable) mais ont des éléments qui se mélangent mal. Les deux fonctions se bloquent ou s’interrompent, ce qui se vit comme une friction intérieure, de l’impatience ou un problème récurrent qui oblige à agir.",
    },
    inPractice: {
      en: "Squares are uncomfortable but productive: many people’s strongest skills grow out of one. What helps is naming the conflict, then finding concrete arrangements — schedules, rules, compromises — so both needs get met in turn instead of fighting for the same moment.",
      fr: "Le carré est inconfortable mais productif\u202f: bien des talents solides en sont issus. Ce qui aide, c’est de nommer le conflit, puis de trouver des arrangements concrets, horaires, règles, compromis, pour que chaque besoin soit servi à son tour au lieu de se disputer le même moment.",
    },
    link: { en: "clashes with", fr: "entre en conflit avec" },
  },
  sextile: {
    angle: "60°",
    family: "flow",
    what: {
      en: "A sextile joins two planets 60° apart, two signs away, usually within 4–6°. The signs have compatible elements (fire with air, earth with water). The two functions cooperate, but more lightly than in a trine: it feels like an opportunity or an easy connection that appears when you reach for it.",
      fr: "Un sextile relie deux planètes à 60° l’une de l’autre, à deux signes d’écart, en général avec un orbe de 4 à 6°. Les signes ont des éléments compatibles (feu et air, terre et eau). Les deux fonctions coopèrent, plus légèrement que dans un trigone\u202f: cela ressemble à une occasion ou à une connexion facile qui se présente quand on tend la main.",
    },
    inPractice: {
      en: "A sextile rewards initiative. The link is there, but it tends to stay dormant unless you use it — take the class, make the call, try the combination. People often discover their sextiles once they start acting on small openings.",
      fr: "Le sextile récompense l’initiative. Le lien existe, mais il reste souvent en sommeil tant qu’on ne s’en sert pas\u202f: suivre le cours, passer l’appel, essayer la combinaison. On découvre souvent ses sextiles en saisissant les petites occasions.",
    },
    link: { en: "cooperates with", fr: "coopère avec" },
  },
  quincunx: {
    angle: "150°",
    family: "tension",
    what: {
      en: "A quincunx (or inconjunct) joins two planets 150° apart, five signs away, usually within 2–3°. The signs share neither element nor modality, so the two functions have no common ground and don’t naturally see each other. It feels less like conflict than awkwardness: a constant low-level adjustment, like two people speaking different languages.",
      fr: "Un quinconce relie deux planètes à 150° l’une de l’autre, à cinq signes d’écart, en général avec un orbe de 2 à 3°. Les signes n’ont en commun ni l’élément ni la modalité\u202f: les deux fonctions n’ont pas de terrain commun et ne se «\u202fvoient\u202f» pas naturellement. On le vit moins comme un conflit que comme une gêne\u202f: un ajustement permanent, comme entre deux personnes qui ne parlent pas la même langue.",
    },
    inPractice: {
      en: "A quincunx often shows as switching back and forth between two needs, sometimes with strain in daily routines. What helps is steady adjustment rather than a single fix: small, regular changes that let each side work on its own terms.",
      fr: "Le quinconce se manifeste souvent par des allers-retours entre deux besoins, parfois avec une tension dans les routines quotidiennes. Ce qui aide, c’est un ajustement régulier plutôt qu’une solution unique\u202f: de petits changements fréquents qui laissent chaque fonction agir selon ses propres règles.",
    },
    link: { en: "is at an awkward angle to", fr: "forme un angle malaisé avec" },
  },
  semisextile: {
    angle: "30°",
    family: "flow",
    what: {
      en: "A semisextile joins two planets 30° apart, typically in neighbouring signs, and is used with a tight orb, usually 1–2° (Ulune counts up to 2°30'). Neighbouring signs share neither element nor modality, yet each builds on the one before. The link is mild: two functions that can learn from each other, though the connection is easy to overlook.",
      fr: "Un semi-sextile relie deux planètes à 30° l’une de l’autre, en général dans des signes voisins, avec un orbe serré, le plus souvent de 1 à 2° (Ulune compte jusqu’à 2°30'). Deux signes voisins n’ont en commun ni l’élément ni la modalité, mais chacun prolonge le précédent. Le lien est léger\u202f: deux fonctions qui peuvent apprendre l’une de l’autre, même si la connexion passe facilement inaperçue.",
    },
    inPractice: {
      en: "Semisextiles are minor and quiet. They tend to show as a gradual skill that improves when you look for ways the two functions could help each other, like adding one practical step to a decision made on feeling.",
      fr: "Le semi-sextile est un aspect mineur et discret. Il se traduit plutôt par un savoir-faire progressif, qui s’affine quand on cherche comment les deux fonctions pourraient s’entraider, comme ajouter une étape concrète à une décision prise sur un ressenti.",
    },
    link: { en: "has a quiet link with", fr: "forme un lien discret avec" },
  },
  semisquare: {
    angle: "45°",
    family: "tension",
    what: {
      en: "A semisquare joins two planets 45° apart — half a square, about a sign and a half — and is generally given an orb of 1–2° (Ulune counts up to 2°30'). It carries the friction of a square in a milder, more irritating form. It feels less like a crisis and more like a nagging tension that keeps you slightly on edge.",
      fr: "Un semi-carré relie deux planètes à 45° l’une de l’autre, soit la moitié d’un carré, environ un signe et demi, avec un orbe de 1 à 2° en général (Ulune compte jusqu’à 2°30'). Il porte la friction du carré sous une forme plus légère et plus agaçante. On le vit moins comme une crise que comme une tension sourde qui maintient légèrement sur le qui-vive.",
    },
    inPractice: {
      en: "Semisquares often push you into action through small irritations. What helps is noticing the pattern — the same kind of annoyance in similar situations — and treating it as a signal to adjust something rather than something to put up with.",
      fr: "Le semi-carré pousse souvent à agir par petites irritations. Ce qui aide, c’est de repérer le schéma, le même type d’agacement dans des situations semblables, et d’y voir un signal pour ajuster quelque chose plutôt qu’une gêne à supporter.",
    },
    link: { en: "rubs against", fr: "crée une friction avec" },
  },
  quintile: {
    angle: "72°",
    family: "flow",
    what: {
      en: "A quintile joins two planets 72° apart, one fifth of the circle, used with a tight orb of about 1–2°. It does not match a relationship between signs; it comes from dividing the circle by five, an idea that goes back to Kepler. Modern astrology links it to talent, style and creative skill: a particular way of combining two functions.",
      fr: "Un quintile relie deux planètes à 72° l’une de l’autre, un cinquième du cercle, avec un orbe serré de 1 à 2°. Il ne correspond à aucun rapport entre signes\u202f: il vient de la division du cercle par cinq, une idée qui remonte à Kepler. L’astrologie moderne l’associe au talent, au style et à la créativité\u202f: une façon particulière de combiner deux fonctions.",
    },
    inPractice: {
      en: "A quintile tends to show as something you do with an unusual touch — a way of speaking, arranging or solving that others recognise as yours. It usually grows with practice and deliberate craft rather than appearing fully formed.",
      fr: "Le quintile se manifeste souvent par quelque chose que vous faites avec une touche inhabituelle\u202f: une façon de parler, d’agencer les choses ou de résoudre les problèmes que les autres reconnaissent comme la vôtre. Il se développe en général par la pratique et le travail du geste plutôt qu’il n’apparaît tout fait.",
    },
    link: { en: "is creatively linked to", fr: "forme un lien créatif avec" },
  },
};

/** 45 pairs of the ten classic planets, key = the two ids sorted alphabetically joined by "|". */
export type PairText = { theme: Bi; blend: Bi; flow: Bi; tension: Bi };

export const PAIR_TEXT: Record<string, PairText> = {
  "jupiter|mars": {
    theme: {
      en: "How drive meets growth: the courage to act and the confidence to aim big, and whether energy is spent wisely or overextended.",
      fr: "La rencontre de l’élan et de l’expansion\u202f: le courage d’agir, la confiance de viser grand, et la façon dont l’énergie est investie ou dispersée.",
    },
    blend: {
      en: "Your drive and your optimism act as one. When you want something, you go after it with enthusiasm and assume it will work out, which makes you good at starting ventures and rallying others. The catch is overreach: signing up for three projects at once, or pushing harder when stepping back would serve better.",
      fr: "Votre élan et votre optimisme ne font qu’un. Quand vous voulez quelque chose, vous y allez avec enthousiasme en partant du principe que ça marchera, ce qui aide à lancer des projets et à entraîner les autres. Le revers\u202f: en faire trop, accepter trois projets à la fois, ou forcer quand prendre du recul serait plus utile.",
    },
    flow: {
      en: "Effort and luck tend to line up for you. You act with confidence, and your confidence usually has some basis, so sport, teaching or entrepreneurial work can come naturally. Because it feels easy, you may coast; choosing a demanding goal is what brings out the best in this combination.",
      fr: "Chez vous, l’effort et la chance ont tendance à aller ensemble. Vous agissez avec assurance, et cette assurance est souvent fondée\u202f: le sport, l’enseignement ou l’entrepreneuriat peuvent vous venir naturellement. Comme c’est facile, vous risquez de vous reposer dessus\u202f; un objectif exigeant fait ressortir le meilleur de cette combinaison.",
    },
    tension: {
      en: "Your drive tends to run ahead of your judgement, or your big plans outrun your stamina. You might commit to a marathon without training, or argue for a principle more fiercely than the situation needs. Pacing helps: setting a realistic scale first, then putting full effort into that.",
      fr: "Votre élan a tendance à devancer votre jugement, ou vos grands projets à dépasser votre endurance. Vous pouvez vous inscrire à un marathon sans entraînement, ou défendre un principe plus âprement que la situation ne le demande. Ce qui aide\u202f: fixer d’abord une échelle réaliste, puis y mettre toute votre énergie.",
    },
  },
  "jupiter|mercury": {
    theme: {
      en: "How thinking meets meaning: detail versus big picture, facts versus beliefs, and how far ideas are allowed to expand.",
      fr: "La rencontre de la pensée et du sens\u202f: le détail face à la vue d’ensemble, les faits face aux convictions, et jusqu’où une idée peut s’étendre.",
    },
    blend: {
      en: "You think in broad strokes and tend to talk with conviction. Ideas connect quickly to larger questions for you — a news story becomes a theory about society. This suits teaching, writing and selling. The pitfall is skipping details: promising more than you checked, or overlooking the fine print.",
      fr: "Vous pensez à grands traits et parlez volontiers avec conviction. Une idée se relie vite chez vous à une question plus vaste\u202f: une actualité devient une théorie sur la société. Cela sert l’enseignement, l’écriture, la vente. L’écueil\u202f: sauter les détails, promettre plus que ce que vous avez vérifié, négliger les petits caractères.",
    },
    flow: {
      en: "Learning and explaining come naturally to you, and you can link small facts to wider patterns without losing either. You might be the colleague who makes a complicated plan sound simple and sensible. A bit of structure keeps this from staying at the level of pleasant talk.",
      fr: "Apprendre et expliquer vous vient naturellement, et vous reliez les petits faits à des tendances plus larges sans perdre ni les uns ni les autres. Vous êtes peut-être la personne qui rend un plan compliqué simple et convaincant. Un peu de structure évite que cela reste de la conversation agréable.",
    },
    tension: {
      en: "Your mind tends to swing between detail and grand vision without settling. You may promise a quick summary and talk for twenty minutes, or dismiss facts that don’t fit your opinion. What helps: checking claims before sharing them, and asking what the listener actually needs to know.",
      fr: "Votre esprit oscille entre le détail et la grande vision sans vraiment se poser. Vous annoncez un résumé rapide et parlez vingt minutes, ou écartez les faits qui contredisent votre opinion. Ce qui aide\u202f: vérifier avant de transmettre, et vous demander ce que votre interlocuteur a réellement besoin de savoir.",
    },
  },
  "jupiter|moon": {
    theme: {
      en: "How feelings meet generosity: emotional openness, the need for comfort and abundance, and how much faith you have that things will be all right.",
      fr: "La rencontre des émotions et de la générosité\u202f: l’ouverture affective, le besoin de confort et d’abondance, et la confiance dans le fait que tout ira bien.",
    },
    blend: {
      en: "Your emotional life is expansive. You tend to feel generously, reassure others easily and create a warm, welcoming home. When you’re low, hope usually returns quickly. The shadow side is excess — too much comfort, food or shopping when upset, or taking on others’ problems because you can’t say no.",
      fr: "Votre vie émotionnelle est généreuse. Vous avez tendance à ressentir largement, à rassurer facilement et à créer un foyer chaleureux où l’on se sent bienvenu. Quand le moral baisse, l’espoir revient vite. Le revers, c’est l’excès\u202f: trop de réconfort, de nourriture ou d’achats quand ça ne va pas, ou porter les soucis des autres faute de savoir dire non.",
    },
    flow: {
      en: "Feeling and trust support each other in you. You tend to recover from setbacks with a basic sense that life will provide, and people feel safe around you. A friend in crisis might call you first. Your mood is resilient, though you can underestimate genuine problems.",
      fr: "Chez vous, sensibilité et confiance se soutiennent. Vous vous remettez des revers avec le sentiment de fond que la vie pourvoira, et les autres se sentent en sécurité près de vous. Un ami en crise vous appelle peut-être en premier. Votre moral tient bien, quitte à sous-estimer parfois de vrais problèmes.",
    },
    tension: {
      en: "Your needs and your ideal of generosity pull against each other. You might offer to host everyone, then feel drained; or swing between big emotional highs and deflation when reality is smaller than hoped. What helps is measuring what you give against what you actually have, emotionally and practically.",
      fr: "Vos besoins et votre idéal de générosité tirent en sens contraire. Vous pouvez proposer d’accueillir tout le monde puis vous retrouver à plat, ou passer d’un grand enthousiasme à la déception quand la réalité s’avère plus modeste. Ce qui aide\u202f: mesurer ce que vous donnez à ce que vous avez vraiment, sur le plan affectif comme matériel.",
    },
  },
  "jupiter|neptune": {
    theme: {
      en: "How faith meets imagination: ideals, spirituality, compassion, and the line between inspired hope and wishful thinking.",
      fr: "La rencontre de la foi et de l’imaginaire\u202f: idéaux, spiritualité, compassion, et la limite entre espoir inspiré et pensée magique.",
    },
    blend: {
      en: "Jupiter and Neptune join about every 13 years, so everyone born over a period of months shares this; it matters personally mainly when it touches your Sun, Moon, personal planets or an angle. Then it gives a strong pull towards ideals, spirituality or art, and a tendency to trust too readily.",
      fr: "Jupiter et Neptune se rejoignent environ tous les 13 ans\u202f: cette conjonction est commune à tous les natifs d’une période de quelques mois, et elle ne devient personnelle que si elle touche votre Soleil, votre Lune, une planète personnelle ou un angle. Elle donne alors un fort attrait pour l’idéal, la spiritualité ou l’art, et une confiance parfois trop prompte.",
    },
    flow: {
      en: "This aspect is shared by many people born around the same time, and it matters personally mainly when it touches personal planets or angles. There, it tends to show as easy faith and imagination: a gift for inspiring others, for charitable work or music, with a mild risk of ignoring practical limits.",
      fr: "Cet aspect est partagé par beaucoup de personnes nées à la même époque\u202f; il compte surtout s’il touche des planètes personnelles ou un angle. Il se traduit alors par une foi et une imagination faciles\u202f: un talent pour inspirer, pour l’engagement caritatif ou la musique, avec un léger risque d’oublier les limites pratiques.",
    },
    tension: {
      en: "Shared by many people born around the same time, this matters personally mainly if it touches personal planets or angles. Then idealism and reality tend to clash: backing a vision without checking the numbers, or feeling let down by people you idealised. It helps to ground hope in concrete steps.",
      fr: "Partagé par beaucoup de personnes nées à la même époque, cet aspect compte surtout s’il touche des planètes personnelles ou un angle. L’idéal et le réel ont alors tendance à se heurter\u202f: soutenir un projet sans vérifier les chiffres, ou tomber de haut face à des personnes idéalisées. Il est utile d’ancrer l’espoir dans des étapes concrètes.",
    },
  },
  "jupiter|pluto": {
    theme: {
      en: "How growth meets power: ambition, conviction and influence, and the urge to expand into something that truly changes things.",
      fr: "La rencontre de l’expansion et du pouvoir\u202f: ambition, conviction, influence, et le désir de grandir jusqu’à transformer réellement les choses.",
    },
    blend: {
      en: "Jupiter and Pluto meet roughly every 12–13 years, so many people born in the same months share this; it becomes personal mainly when it touches personal planets or angles. Then it shows as large ambition and persuasive conviction — wanting to build an organisation rather than simply hold a job, for instance.",
      fr: "Jupiter et Pluton se rencontrent à peu près tous les 12 à 13 ans\u202f: beaucoup de personnes nées les mêmes mois partagent cette conjonction, qui devient personnelle surtout si elle touche des planètes personnelles ou un angle. Elle se traduit alors par une grande ambition et une conviction persuasive, comme vouloir bâtir une organisation plutôt qu’occuper un poste.",
    },
    flow: {
      en: "Shared by many people born around the same time, this matters personally mainly when linked to personal planets or angles. There, it gives a knack for using influence constructively: organising resources, negotiating, or turning a crisis into a larger opportunity without much drama.",
      fr: "Partagé par beaucoup de personnes nées à la même époque, cet aspect compte surtout s’il est relié à des planètes personnelles ou à un angle. Il donne alors l’art d’user de son influence de façon constructive\u202f: organiser des ressources, négocier, ou transformer une crise en occasion plus large sans grand drame.",
    },
    tension: {
      en: "Many people born around the same time share this; it matters personally mainly when it touches personal planets or angles. Then ambition can become a struggle for control — certain you’re right, pushing growth too far. What helps is checking whose interests a big plan actually serves.",
      fr: "Beaucoup de personnes nées à la même époque partagent cet aspect\u202f; il compte surtout s’il touche des planètes personnelles ou un angle. L’ambition peut alors tourner à la lutte de pouvoir\u202f: certitude d’avoir raison, croissance poussée trop loin. Ce qui aide\u202f: vérifier à qui profite réellement un grand projet.",
    },
  },
  "jupiter|saturn": {
    theme: {
      en: "How expansion meets structure: optimism versus caution, opportunity versus responsibility, and the rhythm of growing and consolidating in work and society.",
      fr: "La rencontre de l’expansion et de la structure\u202f: optimisme face à prudence, occasions face à responsabilités, et le rythme entre croissance et consolidation, au travail comme dans la société.",
    },
    blend: {
      en: "Jupiter and Saturn meet about every 20 years (most recently in December 2020), so everyone born within several months shares this; it matters personally mainly when it touches personal planets or angles. Then you tend to combine vision with realism: growth built step by step, like a career planned in stages.",
      fr: "Jupiter et Saturne se rejoignent environ tous les 20 ans (la dernière fois en décembre 2020)\u202f: tous les natifs de ces quelques mois partagent cette conjonction, qui compte surtout si elle touche des planètes personnelles ou un angle. Vous tendez alors à unir vision et réalisme\u202f: une croissance construite par étapes, comme une carrière planifiée.",
    },
    flow: {
      en: "This is shared by many people born around the same time and matters personally mainly when it touches personal planets or angles. There, hope and patience cooperate: you can set ambitious goals and actually stick to the plan, like someone who saves steadily for a big project.",
      fr: "Cet aspect est commun à beaucoup de personnes nées à la même époque et compte surtout s’il touche des planètes personnelles ou un angle. L’espoir et la patience coopèrent alors\u202f: vous pouvez viser haut et vous tenir au plan, comme quelqu’un qui épargne régulièrement pour un grand projet.",
    },
    tension: {
      en: "Shared by many people born around the same time, this matters personally mainly when it touches personal planets or angles. Then you may alternate between expansion and restriction — taking on too much, then cutting back hard. What helps is small, regular growth instead of boom and bust.",
      fr: "Partagé par beaucoup de personnes nées à la même époque, cet aspect compte surtout s’il touche des planètes personnelles ou un angle. Vous pouvez alors alterner expansion et restriction\u202f: trop en prendre, puis tout réduire brutalement. Ce qui aide\u202f: une croissance modeste et régulière plutôt que des excès suivis de coupes.",
    },
  },
  "jupiter|sun": {
    theme: {
      en: "How identity meets growth: confidence, generosity and a sense of purpose, and whether self-belief inspires others or inflates.",
      fr: "La rencontre de l’identité et de l’expansion\u202f: confiance, générosité, sens d’un but, et la question de savoir si la foi en soi inspire les autres ou enfle.",
    },
    blend: {
      en: "Your sense of self is bound up with growth and meaning. You tend to be confident, warm and eager to do things on a large scale, and people often see you as lucky. The risk is overconfidence: assuming things will work out and skipping the preparation they need.",
      fr: "Votre identité est liée au besoin de grandir et de donner du sens. Vous faites preuve d’assurance et de chaleur, et vous voyez volontiers les choses en grand\u202f; on vous prête souvent de la chance. Le risque\u202f: l’excès de confiance, partir du principe que tout ira bien et sauter la préparation nécessaire.",
    },
    flow: {
      en: "Self-confidence comes fairly easily to you and is usually well received. You tend to find mentors, get second chances and give others the benefit of the doubt. A job interview may simply go well because you believe in what you offer. Use this; don’t just rely on it.",
      fr: "La confiance en soi vous vient assez facilement et elle est généralement bien accueillie. Vous trouvez des mentors, obtenez des secondes chances et accordez volontiers le bénéfice du doute. Un entretien d’embauche peut tout simplement bien se passer parce que vous croyez en ce que vous proposez. Servez-vous-en, sans vous reposer dessus.",
    },
    tension: {
      en: "Your ambitions tend to outgrow your means or your time. You might promise big results, overspend on a hobby, or feel restless when life seems too small. What helps is choosing one meaningful goal and letting your confidence serve it, rather than scattering it everywhere.",
      fr: "Vos ambitions ont tendance à dépasser vos moyens ou votre temps. Vous pouvez promettre de grands résultats, trop dépenser pour un loisir ou vous sentir à l’étroit dans votre vie. Ce qui aide\u202f: choisir un objectif qui compte vraiment et mettre votre assurance à son service, plutôt que de la disperser.",
    },
  },
  "jupiter|uranus": {
    theme: {
      en: "How growth meets change: sudden opportunities, a taste for freedom and new ideas, and the appetite for breaking out of the familiar.",
      fr: "La rencontre de l’expansion et du changement\u202f: occasions soudaines, goût de la liberté et des idées neuves, envie de sortir du connu.",
    },
    blend: {
      en: "Jupiter and Uranus meet about every 14 years, so this is shared by people born within several months; it matters personally mainly when it touches personal planets or angles. Then you tend to seize unusual chances quickly — moving abroad, jumping into a new technology — and grow through independence.",
      fr: "Jupiter et Uranus se rejoignent environ tous les 14 ans\u202f: cette conjonction est partagée par les natifs de quelques mois et compte surtout si elle touche des planètes personnelles ou un angle. Vous saisissez alors vite les occasions inhabituelles, partir à l’étranger, adopter une technologie nouvelle, et vous grandissez par l’indépendance.",
    },
    flow: {
      en: "Shared by many people born around the same time, this matters personally mainly when it touches personal planets or angles. There, it tends to bring timely breakthroughs and an easy openness to the new: you adapt quickly when a field changes and may spot opportunities others miss.",
      fr: "Partagé par beaucoup de personnes nées à la même époque, cet aspect compte surtout s’il touche des planètes personnelles ou un angle. Il apporte alors des déclics au bon moment et une ouverture facile à la nouveauté\u202f: vous vous adaptez vite quand un domaine change et repérez des occasions que d’autres ne voient pas.",
    },
    tension: {
      en: "Many people born around the same time share this; it matters personally mainly when it touches personal planets or angles. Then restlessness can make you drop commitments for the next exciting option. What helps is keeping one stable base while experimenting elsewhere.",
      fr: "Beaucoup de personnes nées à la même époque partagent cet aspect\u202f; il compte surtout s’il touche des planètes personnelles ou un angle. L’agitation peut alors vous pousser à lâcher un engagement pour l’option suivante, plus excitante. Ce qui aide\u202f: garder une base stable tout en expérimentant ailleurs.",
    },
  },
  "jupiter|venus": {
    theme: {
      en: "How affection meets abundance: pleasure, generosity, taste and sociability, and knowing when enough is enough.",
      fr: "La rencontre de l’affection et de l’abondance\u202f: plaisir, générosité, goût et sociabilité, et savoir quand c’est assez.",
    },
    blend: {
      en: "Pleasure and generosity are fused in you. You tend to be warm, sociable and appreciative of beauty, and you give gifts, compliments and time freely. The two traditional benefics together can make life feel pleasant — sometimes too pleasant, leading to overspending or avoiding necessary friction.",
      fr: "Chez vous, plaisir et générosité ne font qu’un. Vous faites preuve de chaleur, de sociabilité et de goût pour la beauté, et vous donnez sans compter cadeaux, compliments et temps. Les deux bénéfiques traditionnelles réunies peuvent rendre la vie agréable, parfois trop\u202f: dépenses excessives, ou frictions nécessaires évitées.",
    },
    flow: {
      en: "Affection and good will flow easily for you. People tend to like you quickly, and you often find yourself invited, helped or introduced. You might have a gift for hosting or for art that makes others feel welcome. The main risk is complacency.",
      fr: "L’affection et la bienveillance circulent facilement chez vous. On vous apprécie vite, et on vous invite, vous aide ou vous présente volontiers. Vous avez peut-être un talent pour recevoir ou pour l’art, qui met les autres à l’aise. Le risque principal est de vous en contenter.",
    },
    tension: {
      en: "Your desire for pleasure and your sense of limits tend to be out of step. You may overspend on things you love, promise more affection than you can offer, or expect relationships to be easier than they are. What helps is deciding in advance what is enough.",
      fr: "Votre goût du plaisir et votre sens des limites ne sont pas toujours accordés. Vous pouvez trop dépenser pour ce que vous aimez, promettre plus d’affection que vous ne pouvez en donner, ou attendre des relations qu’elles soient plus faciles qu’elles ne le sont. Ce qui aide\u202f: décider à l’avance ce qui suffit.",
    },
  },
  "mars|mercury": {
    theme: {
      en: "How thought meets action: speed of mind, directness of speech, arguments and decisions, and whether words sharpen or cut.",
      fr: "La rencontre de la pensée et de l’action\u202f: vivacité d’esprit, franc-parler, débats et décisions, et des mots qui aiguisent ou qui blessent.",
    },
    blend: {
      en: "You think fast and speak directly. Ideas turn into action quickly, and you enjoy debate, deadlines and solving problems under pressure. You might answer an email before finishing reading it. The pitfall is sharpness: words that land harder than intended, or decisions made before listening.",
      fr: "Vous pensez vite et parlez franchement. Chez vous, une idée devient vite une action, et vous aimez le débat, les délais serrés et les problèmes à résoudre sous pression. Vous répondez peut-être à un e-mail avant d’avoir fini de le lire. L’écueil\u202f: des mots plus tranchants que voulu, ou une décision prise avant d’écouter.",
    },
    flow: {
      en: "Your mind and your drive work well together. You can argue a point clearly, decide under pressure and follow through on what you say. This suits journalism, law, sales or anything that rewards quick thinking. Your directness comes across as honest rather than aggressive.",
      fr: "Votre esprit et votre élan travaillent bien ensemble. Vous savez défendre un point de vue clairement, trancher sous pression et tenir parole. Cela sert le journalisme, le droit, la vente ou tout métier qui récompense la vivacité. Votre franchise passe pour de l’honnêteté plutôt que de l’agressivité.",
    },
    tension: {
      en: "Thought and action tend to trip each other up. You may speak before thinking, get into arguments over small points, or feel nervous tension when ideas can’t be acted on. What helps: a pause before replying, and physical activity to discharge mental restlessness.",
      fr: "La pensée et l’action ont tendance à se gêner. Vous pouvez parler avant de réfléchir, vous disputer sur des détails, ou ressentir une tension nerveuse quand une idée ne peut pas être mise en œuvre. Ce qui aide\u202f: une pause avant de répondre, et une activité physique pour évacuer l’agitation mentale.",
    },
  },
  "mars|moon": {
    theme: {
      en: "How feelings meet drive: emotional reactions, protectiveness and temper, and how quickly needs turn into action.",
      fr: "La rencontre des émotions et de l’élan\u202f: réactions affectives, instinct de protection, emportements, et la vitesse à laquelle un besoin devient action.",
    },
    blend: {
      en: "Your feelings go straight into action. When something matters emotionally, you react at once — defending someone, leaving the room, fixing the problem. This gives courage and protectiveness, especially towards family. It can also mean quick flare-ups of anger that pass as fast as they come.",
      fr: "Vos émotions passent directement dans l’action. Quand quelque chose vous touche, vous réagissez aussitôt\u202f: défendre quelqu’un, quitter la pièce, régler le problème. Cela donne du courage et un fort instinct de protection, surtout envers les proches. Cela peut aussi donner des colères vives qui retombent aussi vite qu’elles sont montées.",
    },
    flow: {
      en: "You act on your feelings in a healthy, direct way. When you need something, you tend to say it or do something about it, and you protect the people you care for without fuss. Emotional energy often goes into sport, cooking or practical care.",
      fr: "Vous traduisez vos émotions en actes, de façon saine et directe. Quand vous avez besoin de quelque chose, vous le dites ou vous faites le nécessaire, et vous protégez ceux que vous aimez sans en faire une affaire. L’énergie affective passe souvent dans le sport, la cuisine ou le soin concret.",
    },
    tension: {
      en: "Your needs and your drive tend to collide. You may get irritable when tired or hungry, react defensively to mild criticism, or start a fight at home when the real problem is elsewhere. What helps: regular physical outlets, and naming the need before it turns into anger.",
      fr: "Vos besoins et votre élan ont tendance à se heurter. L’irritabilité peut monter avec la fatigue ou la faim, vous pouvez réagir sur la défensive à une critique légère, ou provoquer une dispute à la maison quand le vrai problème est ailleurs. Ce qui aide\u202f: une activité physique régulière, et nommer le besoin avant qu’il ne tourne à la colère.",
    },
  },
  "mars|neptune": {
    theme: {
      en: "How drive meets imagination: acting on ideals, motivation that comes and goes, and the difference between inspired action and confused effort.",
      fr: "La rencontre de l’élan et de l’imaginaire\u202f: agir pour un idéal, une motivation fluctuante, et la différence entre action inspirée et effort confus.",
    },
    blend: {
      en: "Your drive is tied to ideals and imagination. You work best for a cause, a vision or a creative project, and can be unusually intuitive in dance, acting or care work. On an ordinary task, motivation may fade; anger also tends to come out indirectly rather than openly.",
      fr: "Votre élan est lié à l’idéal et à l’imagination. Vous travaillez mieux pour une cause, une vision ou un projet créatif, et pouvez faire preuve d’une grande intuition en danse, au théâtre ou dans le soin. Devant une tâche banale, la motivation s’évapore\u202f; la colère aussi a tendance à sortir de biais plutôt qu’ouvertement.",
    },
    flow: {
      en: "Imagination and action cooperate for you. You can put effort into something intangible — music, film, helping people in need — and sense how to move without forcing. You may be better at choosing the right moment than at pushing through.",
      fr: "Imagination et action coopèrent chez vous. Vous savez mettre de l’énergie dans quelque chose d’intangible, musique, cinéma, aide aux personnes en difficulté, et sentir comment avancer sans forcer. Vous excellez sans doute davantage à choisir le bon moment qu’à passer en force.",
    },
    tension: {
      en: "Your drive and your ideals tend to blur each other. You might start strong and lose energy without knowing why, avoid direct conflict and resent it later, or chase a goal that turns out to be a mirage. What helps: clear, modest goals, and saying plainly what you want.",
      fr: "Votre élan et vos idéaux ont tendance à se brouiller mutuellement. Vous pouvez démarrer fort puis perdre votre énergie sans savoir pourquoi, éviter un conflit direct et en garder ensuite de la rancœur, ou poursuivre un but qui se révèle un mirage. Ce qui aide\u202f: des objectifs clairs et modestes, et dire simplement ce que vous voulez.",
    },
  },
  "mars|pluto": {
    theme: {
      en: "How drive meets intensity: willpower, ambition, anger and control, and the capacity to push through what would stop others.",
      fr: "La rencontre de l’élan et de l’intensité\u202f: volonté, ambition, colère et contrôle, et la capacité à tenir là où d’autres s’arrêteraient.",
    },
    blend: {
      en: "Your drive runs deep and doesn’t give up easily. When you commit, you commit completely, which can make you formidable in a crisis, a competition or a hard project. The same intensity can turn into a need to win at all costs, or anger held for a long time.",
      fr: "Votre élan est profond et ne lâche pas facilement. Quand vous vous engagez, c’est entièrement, ce qui peut vous rendre redoutable dans une crise, une compétition ou un projet difficile. Cette même intensité peut devenir un besoin de gagner à tout prix, ou une colère gardée longtemps.",
    },
    flow: {
      en: "You can concentrate your energy and use it with strategy. You know when to hold back and when to push, and you can work under pressure that would exhaust others — a company turnaround, a long training cycle, an emergency.",
      fr: "Vous savez concentrer votre énergie et l’employer avec stratégie. Vous sentez quand retenir et quand pousser, et vous travaillez sous une pression qui en épuiserait d’autres\u202f: un redressement d’entreprise, un long cycle d’entraînement, une situation d’urgence.",
    },
    tension: {
      en: "Your drive and your need for control tend to escalate each other. Small disagreements can become power struggles, or you may hold anger in until it bursts out. What helps: channelling intensity into demanding physical or strategic work, and choosing which battles actually matter.",
      fr: "Votre élan et votre besoin de maîtrise ont tendance à s’attiser mutuellement. Un petit désaccord peut devenir une lutte de pouvoir, ou vous retenez votre colère jusqu’à ce qu’elle éclate. Ce qui aide\u202f: investir cette intensité dans un travail physique ou stratégique exigeant, et choisir les combats qui comptent vraiment.",
    },
  },
  "mars|saturn": {
    theme: {
      en: "How drive meets discipline: the accelerator and the brake, endurance and frustration, and learning to act with control and good timing.",
      fr: "La rencontre de l’élan et de la discipline\u202f: l’accélérateur et le frein, l’endurance et la frustration, et l’apprentissage d’une action maîtrisée et bien placée.",
    },
    blend: {
      en: "Your drive comes with a built-in brake. You tend to act carefully, work hard and endure what others would quit, but you may also hesitate, doubt your right to assert yourself, or keep anger inside. Over time this often becomes exceptional stamina and skill.",
      fr: "Votre élan est muni d’un frein intégré. Vous agissez avec prudence, travaillez dur et endurez ce que d’autres abandonneraient, mais vous pouvez aussi hésiter, douter de votre droit à vous affirmer, ou garder votre colère pour vous. Avec le temps, cela devient souvent une endurance et un savoir-faire remarquables.",
    },
    flow: {
      en: "Energy and discipline cooperate for you. You can work steadily for years towards a goal, build something with your hands, or train methodically. You tend to know your limits and respect them, which makes you reliable when a job simply has to get done.",
      fr: "Énergie et discipline coopèrent chez vous. Vous pouvez travailler des années vers un but, construire de vos mains ou vous entraîner avec méthode. Vous connaissez en général vos limites et les respectez, ce qui fait de vous une personne fiable quand un travail doit simplement être fait.",
    },
    tension: {
      en: "Your drive and your caution tend to block each other: you push, then stall; you want to act, then fear the consequences. Frustration can build up. What helps is structured effort — a clear plan, fixed practice times, gradual training — so energy has a safe channel.",
      fr: "Votre élan et votre prudence ont tendance à se bloquer\u202f: vous poussez puis calez, vous voulez agir puis craignez les conséquences. La frustration peut s’accumuler. Ce qui aide\u202f: un effort structuré, un plan clair, des horaires fixes, une progression graduelle, pour que l’énergie ait un canal sûr.",
    },
  },
  "mars|sun": {
    theme: {
      en: "How identity meets drive: willpower, courage, competitiveness and physical energy, and how directly you assert who you are.",
      fr: "La rencontre de l’identité et de l’élan\u202f: volonté, courage, esprit de compétition, énergie physique, et la façon plus ou moins directe dont vous affirmez qui vous êtes.",
    },
    blend: {
      en: "Your identity and your drive are one. You tend to be energetic, direct and competitive, and you feel most yourself when you’re acting, building or winning. You might be the first to volunteer. Impatience and a quick temper are the usual side effects.",
      fr: "Votre identité et votre élan ne font qu’un. Vous avez de l’énergie, du franc-parler et l’esprit de compétition, et vous vous sentez pleinement vous-même en agissant, en construisant, en gagnant. Vous êtes peut-être la première personne à se porter volontaire. L’impatience et les colères vives en sont les effets habituels.",
    },
    flow: {
      en: "Will and energy support each other in you. You can assert yourself without much friction, take the lead naturally and recover quickly from effort. Sport, entrepreneurship or any role that needs initiative tends to suit you.",
      fr: "Chez vous, la volonté et l’énergie se soutiennent. Vous vous affirmez sans grande friction, prenez naturellement la tête et récupérez vite après l’effort. Le sport, l’entrepreneuriat ou tout rôle qui demande de l’initiative vous conviennent souvent.",
    },
    tension: {
      en: "Your will and your drive tend to collide with circumstances or with other people. You may take challenges personally, push too hard, or treat every situation as a contest. What helps: physical outlets, and goals worth the effort, so energy doesn’t turn into friction.",
      fr: "Votre volonté et votre élan ont tendance à se heurter aux circonstances ou aux autres. Vous pouvez prendre les défis pour des attaques personnelles, forcer, ou vivre chaque situation comme un concours. Ce qui aide\u202f: des exutoires physiques, et des objectifs qui valent l’effort, pour que l’énergie ne tourne pas à la friction.",
    },
  },
  "mars|uranus": {
    theme: {
      en: "How drive meets change: sudden action, independence and rebellion, and energy that comes in bursts rather than steadily.",
      fr: "La rencontre de l’élan et du changement\u202f: action soudaine, indépendance, rébellion, et une énergie qui vient par à-coups plutôt que de façon régulière.",
    },
    blend: {
      en: "Your drive is sudden and independent. You tend to act on impulse, break routines and resist being told what to do, which can make you brave and inventive in a crisis. You might quit a job overnight when it feels confining. Watch out for accidents caused by haste.",
      fr: "Votre élan est soudain et indépendant. Vous agissez volontiers sur un coup de tête, cassez les routines et supportez mal qu’on vous dicte quoi faire, ce qui donne de l’audace et de l’inventivité en situation de crise. Vous pouvez quitter un emploi du jour au lendemain s’il vous étouffe. Attention aux accidents dus à la précipitation.",
    },
    flow: {
      en: "You act quickly and originally. When something needs changing, you tend to find a new method and apply it without hesitation, and you cope well with surprises. Technology, emergency work or anything fast-moving can suit you.",
      fr: "Vous agissez vite et avec originalité. Quand quelque chose doit changer, vous trouvez une méthode nouvelle et l’appliquez sans hésiter, et vous gérez bien les surprises. La technologie, les métiers d’urgence ou tout environnement rapide peuvent vous convenir.",
    },
    tension: {
      en: "Your drive and your need for freedom tend to go off together. You may react abruptly, rebel against rules without weighing the cost, or feel wired and restless. What helps: outlets for sudden energy, a delay before big decisions, and freedom built into your schedule.",
      fr: "Votre élan et votre besoin de liberté ont tendance à exploser ensemble. Vous pouvez réagir brusquement, vous rebeller contre une règle sans en peser le coût, ou vous sentir à cran. Ce qui aide\u202f: des exutoires pour l’énergie soudaine, un délai avant les grandes décisions, et de la liberté prévue dans votre emploi du temps.",
    },
  },
  "mars|venus": {
    theme: {
      en: "How desire and affection fit together: pursuing versus attracting, and the balance between wanting someone and caring for them.",
      fr: "La façon dont le désir et l’affection s’accordent\u202f: conquérir ou attirer, et l’équilibre entre désirer quelqu’un et prendre soin de lui.",
    },
    blend: {
      en: "Desire and affection are merged in you. Attraction tends to be strong and immediate, and you express love actively — flirting, pursuing, doing things together. You may also bring passion to art or style. Relationships can be vivid, with warmth and friction close together.",
      fr: "Chez vous, désir et affection se confondent. L’attirance est souvent forte et immédiate, et vous exprimez l’amour de façon active\u202f: séduire, aller vers l’autre, faire des choses ensemble. Vous mettez peut-être aussi de la passion dans l’art ou le style. Les relations peuvent être vives, chaleur et friction très proches.",
    },
    flow: {
      en: "Wanting and caring work easily together for you. You can pursue what attracts you without losing tact, and you balance give and take in relationships fairly naturally. Artistic or physical skills — dance, design, a sport played with grace — may come easily.",
      fr: "Désirer et prendre soin vont facilement ensemble chez vous. Vous savez aller vers ce qui vous attire sans perdre votre tact, et l’équilibre entre donner et recevoir vous vient assez naturellement. Des talents artistiques ou physiques, danse, design, sport pratiqué avec grâce, peuvent vous être faciles.",
    },
    tension: {
      en: "Desire and affection tend to pull in different directions. You may be drawn to people who don’t treat you kindly, or struggle to combine passion and tenderness with the same person. What helps: noticing what you actually want from a relationship, and saying it before tension builds.",
      fr: "Le désir et l’affection ont tendance à tirer dans des directions différentes. Vous pouvez éprouver de l’attirance pour des personnes qui ne vous traitent pas bien, ou avoir du mal à réunir passion et tendresse avec la même personne. Ce qui aide\u202f: repérer ce que vous attendez vraiment d’une relation, et le dire avant que la tension monte.",
    },
  },
  "mercury|moon": {
    theme: {
      en: "How feelings meet thoughts: talking about emotions, memory, everyday communication, and whether head and heart speak the same language.",
      fr: "La rencontre des émotions et de la pensée\u202f: parler de ce qu’on ressent, la mémoire, la communication au quotidien, et le fait que la tête et le cœur parlent ou non la même langue.",
    },
    blend: {
      en: "Your thinking is coloured by feeling. You remember things through their emotional tone, pick up on moods and tend to talk in order to process what you feel. You might recall exactly what someone said at a family dinner years ago. Moods can sway your opinions more than you notice.",
      fr: "Votre pensée est teintée d’émotion. Vous retenez les choses par leur tonalité affective, captez les ambiances et parlez volontiers pour démêler ce que vous ressentez. Vous vous souvenez peut-être mot pour mot d’une phrase dite à un repas de famille il y a des années. L’humeur influence vos opinions plus que vous ne le pensez.",
    },
    flow: {
      en: "Head and heart communicate well in you. You can put feelings into words, listen with sensitivity and adapt what you say to the person in front of you. Writing, counselling or teaching children may suit you.",
      fr: "Chez vous, la tête et le cœur communiquent bien. Vous savez mettre des mots sur vos émotions, écouter avec délicatesse et adapter votre discours à la personne en face. L’écriture, l’accompagnement ou l’enseignement auprès d’enfants peuvent vous convenir.",
    },
    tension: {
      en: "What you feel and what you think tend to disagree. You may argue logically while upset, or talk yourself out of a feeling that needed attention. Worries can loop. What helps: writing things down, and asking yourself separately what you think and what you need.",
      fr: "Ce que vous ressentez et ce que vous pensez ont tendance à se contredire. Vous pouvez argumenter avec logique alors que l’émotion vous submerge, ou vous convaincre d’ignorer un ressenti qui méritait de l’attention. Les inquiétudes peuvent tourner en boucle. Ce qui aide\u202f: écrire, et vous demander séparément ce que vous pensez et ce dont vous avez besoin.",
    },
  },
  "mercury|neptune": {
    theme: {
      en: "How thinking meets imagination: intuition, poetic or visual thought, and the boundary between inspiration, vagueness and deception.",
      fr: "La rencontre de la pensée et de l’imaginaire\u202f: intuition, pensée poétique ou visuelle, et la frontière entre inspiration, flou et tromperie.",
    },
    blend: {
      en: "Your mind works through images and impressions more than straight lines. You may be intuitive and poetic, and good at picking up what isn’t said. Facts and dates can slip, and you may absorb others’ views without noticing. Fiction, music and photography often suit this way of thinking.",
      fr: "Votre esprit fonctionne par images et impressions plus qu’en ligne droite. Vous avez peut-être de l’intuition, un sens poétique, et captez ce qui n’est pas dit. Les faits et les dates peuvent vous échapper, et vous adoptez parfois l’avis des autres sans vous en rendre compte. La fiction, la musique ou la photographie conviennent souvent à cette pensée.",
    },
    flow: {
      en: "Imagination feeds your thinking gracefully. You can describe atmospheres, write persuasively about intangible things and sense what someone means behind their words. You may learn best through stories, images or music rather than lists.",
      fr: "L’imagination nourrit votre pensée avec aisance. Vous savez décrire une atmosphère, écrire de façon convaincante sur l’intangible et sentir ce que quelqu’un veut dire derrière ses mots. Vous apprenez sans doute mieux par les histoires, les images ou la musique que par les listes.",
    },
    tension: {
      en: "Your thinking and your imagination tend to cloud each other. You may misread messages, forget details, or say what people want to hear rather than what’s accurate. What helps: written confirmation of important facts, and a deliberate check between what you imagined and what was said.",
      fr: "Votre pensée et votre imagination ont tendance à se brouiller. Vous pouvez mal interpréter un message, oublier des détails, ou dire ce que les autres veulent entendre plutôt que ce qui est exact. Ce qui aide\u202f: confirmer par écrit les faits importants, et vérifier délibérément l’écart entre ce que vous avez imaginé et ce qui a été dit.",
    },
  },
  "mercury|pluto": {
    theme: {
      en: "How thinking meets depth: investigation, persuasion, secrets and psychological insight, and the power words have to reveal or control.",
      fr: "La rencontre de la pensée et de la profondeur\u202f: enquête, persuasion, secrets, lucidité psychologique, et le pouvoir des mots pour révéler ou contrôler.",
    },
    blend: {
      en: "Your mind digs. You tend to look beneath the surface, notice motives and remember what others would rather forget. This suits research, psychology, investigation or negotiation. You may also keep your own thoughts secret, and your words can hit harder than you realise.",
      fr: "Votre esprit creuse. Vous regardez sous la surface, repérez les motivations et retenez ce que d’autres préféreraient oublier. Cela sert la recherche, la psychologie, l’enquête ou la négociation. Vous gardez peut-être vos pensées pour vous, et vos mots peuvent frapper plus fort que vous ne le pensez.",
    },
    flow: {
      en: "You can go deep without getting lost. Research, strategy or understanding people’s motives come naturally, and you tend to persuade calmly rather than forcefully. A conversation with you may lead someone to a real insight about their situation.",
      fr: "Vous pouvez aller en profondeur sans vous y perdre. La recherche, la stratégie ou la compréhension des motivations vous viennent naturellement, et vous persuadez plus par le calme que par la force. Une conversation avec vous peut mener quelqu’un à une vraie prise de conscience.",
    },
    tension: {
      en: "Your thoughts and your need for control tend to intensify each other. You may obsess over a worry, argue to win rather than to understand, or suspect hidden meanings that aren’t there. What helps: checking assumptions, and letting a discussion end without having the last word.",
      fr: "Vos pensées et votre besoin de maîtrise ont tendance à s’intensifier mutuellement. Vous pouvez ressasser une inquiétude, discuter pour gagner plutôt que pour comprendre, ou soupçonner des sous-entendus qui n’existent pas. Ce qui aide\u202f: vérifier vos hypothèses, et laisser une discussion se terminer sans avoir le dernier mot.",
    },
  },
  "mercury|saturn": {
    theme: {
      en: "How thinking meets structure: concentration, caution in speech, method and doubt, and knowledge built slowly but solidly.",
      fr: "La rencontre de la pensée et de la structure\u202f: concentration, prudence dans la parole, méthode et doute, et un savoir construit lentement mais solidement.",
    },
    blend: {
      en: "Your thinking is careful and structured. You tend to check before you speak, prefer facts to speculation and learn methodically, which gives depth over time. You might be the one who actually reads the contract. Self-doubt or a fear of sounding foolish can keep you quieter than you need to be.",
      fr: "Votre pensée est prudente et structurée. Vous vérifiez avant de parler, préférez les faits aux spéculations et apprenez avec méthode, ce qui donne de la profondeur avec le temps. Vous êtes peut-être la personne qui lit vraiment le contrat. Le doute de soi ou la peur de paraître ridicule peuvent vous faire taire plus souvent que nécessaire.",
    },
    flow: {
      en: "Discipline supports your mind. You can concentrate for long periods, organise complex information and explain it clearly. Accounting, engineering, editing or any field that rewards precision tends to suit you. People trust what you say because you rarely exaggerate.",
      fr: "La discipline soutient votre esprit. Vous pouvez vous concentrer longtemps, organiser des informations complexes et les expliquer clairement. La comptabilité, l’ingénierie, l’édition ou tout domaine qui récompense la précision vous conviennent souvent. On vous fait confiance parce que vous exagérez rarement.",
    },
    tension: {
      en: "Your thinking and your inner critic tend to collide. You may doubt your intelligence, freeze when speaking in public, or become rigid in your opinions. Learning may have felt hard early on. What helps: preparation, patience with slow progress, and remembering that careful isn’t the same as slow.",
      fr: "Votre pensée et votre voix critique intérieure ont tendance à se heurter. Vous pouvez douter de votre intelligence, vous figer en parlant en public ou vous raidir dans vos opinions. Apprendre a peut-être été difficile au début. Ce qui aide\u202f: la préparation, la patience face aux progrès lents, et vous rappeler que prudence ne veut pas dire lenteur d’esprit.",
    },
  },
  "mercury|sun": {
    theme: {
      en: "How identity meets thinking: how you express yourself, how central ideas and communication are to who you are, and how objectively you can see yourself.",
      fr: "La rencontre de l’identité et de la pensée\u202f: votre façon de vous exprimer, la place des idées et de la communication dans ce que vous êtes, et votre capacité à vous voir avec objectivité.",
    },
    blend: {
      en: "Your identity and your way of thinking are closely linked; this is very common, since Mercury is never more than about 28° from the Sun. You tend to identify with your ideas and express yourself through words. When the conjunction is very close, it can be hard to see your own views from outside.",
      fr: "Votre identité et votre façon de penser sont étroitement liées\u202f; c’est très fréquent, car Mercure ne s’éloigne jamais de plus de 28° environ du Soleil. Vous vous identifiez volontiers à vos idées et vous vous exprimez par les mots. Quand la conjonction est très serrée, il peut être difficile de prendre du recul sur vos propres opinions.",
    },
    flow: {
      en: "Mercury is never more than about 28° from the Sun, so a trine or sextile between them cannot occur. If your Mercury sits in a different sign from your Sun, your thinking has its own style — quicker or more cautious than your core temperament — and offers you a second perspective.",
      fr: "Mercure ne s’éloigne jamais de plus de 28° environ du Soleil\u202f: un trigone ou un sextile entre eux est donc impossible. Si votre Mercure est dans un autre signe que votre Soleil, votre pensée a son propre style, plus rapide ou plus prudent que votre tempérament de fond, et vous offre un second regard.",
    },
    tension: {
      en: "Mercury is never more than about 28° from the Sun, so no square or opposition between them is possible. If your Mercury is in the sign next to your Sun, your mind and your identity simply work in different modes, and combining the two consciously tends to broaden your viewpoint.",
      fr: "Mercure ne s’éloigne jamais de plus de 28° environ du Soleil\u202f: aucun carré ni aucune opposition n’est donc possible entre eux. Si votre Mercure est dans le signe voisin de votre Soleil, votre esprit et votre identité fonctionnent simplement sur des modes différents, et les associer consciemment tend à élargir votre point de vue.",
    },
  },
  "mercury|uranus": {
    theme: {
      en: "How thinking meets originality: sudden insights, independent opinions, fast or unconventional reasoning, and the urge to question received ideas.",
      fr: "La rencontre de la pensée et de l’originalité\u202f: intuitions soudaines, opinions indépendantes, raisonnement rapide ou atypique, et l’envie de remettre en question les idées reçues.",
    },
    blend: {
      en: "Your mind is quick, original and independent. Ideas arrive in flashes, often ahead of any explanation, and you enjoy technology, science or anything new. You may finish other people’s sentences or reach conclusions they find abrupt. Contradicting the consensus comes easily — sometimes for its own sake.",
      fr: "Votre esprit est vif, original et indépendant. Les idées arrivent comme des éclairs, souvent avant l’explication, et vous aimez la technologie, les sciences ou tout ce qui est nouveau. Vous finissez peut-être les phrases des autres, ou arrivez à des conclusions qu’ils trouvent abruptes. Contredire le consensus vous est facile, parfois pour le plaisir.",
    },
    flow: {
      en: "Originality and clear thinking work well together for you. You can explain unusual ideas in a way others accept, adapt to new tools quickly and find unconventional solutions to practical problems, like reorganising a workflow nobody had questioned.",
      fr: "Originalité et clarté de pensée vont bien ensemble chez vous. Vous savez expliquer une idée inhabituelle de façon à la faire accepter, adopter vite de nouveaux outils et trouver des solutions atypiques à des problèmes concrets, comme réorganiser une méthode de travail que personne ne remettait en cause.",
    },
    tension: {
      en: "Your thinking and your need for independence tend to jolt each other. You may interrupt, change opinions abruptly, or feel mentally overstimulated. What helps: letting ideas settle before announcing them, and short breaks away from screens and noise.",
      fr: "Votre pensée et votre besoin d’indépendance ont tendance à se bousculer. Vous pouvez couper la parole, changer d’avis brusquement ou saturer mentalement. Ce qui aide\u202f: laisser mûrir une idée avant de l’annoncer, et de courtes pauses loin des écrans et du bruit.",
    },
  },
  "mercury|venus": {
    theme: {
      en: "How thinking meets affection: tact, charm in speech, taste, and the ability to make ideas pleasant and relationships easier to talk about.",
      fr: "La rencontre de la pensée et de l’affection\u202f: tact, charme dans la parole, goût, et l’art de rendre les idées agréables et les relations plus faciles à exprimer.",
    },
    blend: {
      en: "You speak and think with a sense of harmony. You tend to be tactful, pleasant to listen to and attentive to form: the right word, a well-designed page. Writing, design or diplomacy may suit you. You might soften hard truths so much that the message gets lost.",
      fr: "Vous pensez et parlez avec un sens de l’harmonie. Vous faites preuve de tact, votre parole est agréable, et vous soignez la forme\u202f: le mot juste, une mise en page réussie. L’écriture, le design ou la diplomatie peuvent vous convenir. Vous adoucissez peut-être tant les vérités difficiles que le message se perd.",
    },
    flow: {
      en: "Seen from Earth, Mercury and Venus are never more than about 76° apart, so the sextile is the only flowing major aspect they can form. With it, you communicate gracefully: you can negotiate, compliment sincerely or write in a way that makes people feel considered.",
      fr: "Vus de la Terre, Mercure et Vénus ne s’écartent jamais de plus de 76° environ\u202f: le sextile est donc le seul aspect majeur harmonieux possible entre eux. Avec lui, vous communiquez avec élégance\u202f: vous savez négocier, complimenter sincèrement ou écrire de façon à ce que l’autre se sente considéré.",
    },
    tension: {
      en: "Seen from Earth, Mercury and Venus are never more than about 76° apart, so they cannot form a square or opposition, though the semisquare is possible. With it, you may say what pleases rather than what you think, or fuss over wording. What helps: saying the substance first, then the courtesy.",
      fr: "Vus de la Terre, Mercure et Vénus ne s’écartent jamais de plus de 76° environ\u202f: ni carré ni opposition ne sont possibles, mais le semi-carré l’est. Avec lui, vous pouvez dire ce qui fait plaisir plutôt que ce que vous pensez, ou peaufiner la formulation à l’excès. Ce qui aide\u202f: dire d’abord le fond, puis y mettre les formes.",
    },
  },
  "moon|neptune": {
    theme: {
      en: "How feelings meet imagination: empathy, sensitivity to atmosphere, dreams and longing, and the difficulty of knowing whose feelings are whose.",
      fr: "La rencontre des émotions et de l’imaginaire\u202f: empathie, sensibilité aux ambiances, rêves et nostalgie, et la difficulté de savoir à qui appartiennent les émotions.",
    },
    blend: {
      en: "Your emotions are porous. You tend to absorb the moods of people and places, feel deeply moved by music or by suffering, and have a vivid inner life and dreams. Caring roles may attract you. Knowing where your feelings end and others’ begin is a lifelong task.",
      fr: "Vos émotions sont poreuses. Vous absorbez l’humeur des personnes et des lieux, la musique ou la souffrance d’autrui vous touchent profondément, et votre vie intérieure comme vos rêves sont intenses. Les métiers du soin peuvent vous attirer. Savoir où s’arrêtent vos émotions et où commencent celles des autres est un travail de toute une vie.",
    },
    flow: {
      en: "Empathy and imagination support each other in you. You can sense what someone needs without being told, and you may find comfort and expression through art, water, music or quiet time. You tend to soothe others simply by being there.",
      fr: "Empathie et imagination se soutiennent chez vous. Vous sentez ce dont quelqu’un a besoin sans qu’il le dise, et vous trouvez réconfort et expression dans l’art, l’eau, la musique ou le calme. Votre simple présence apaise souvent les autres.",
    },
    tension: {
      en: "Your needs and your ideals tend to blur. You may feel overwhelmed by others’ emotions, rescue people at your own expense, or escape into screens or fantasy when life is hard. What helps: clear boundaries, rest, and naming your own needs in plain terms.",
      fr: "Vos besoins et vos idéaux ont tendance à se confondre. Les émotions des autres peuvent vous submerger, vous pouvez voler au secours de chacun à vos dépens, ou fuir dans les écrans ou l’imaginaire quand la vie est dure. Ce qui aide\u202f: des limites claires, du repos, et formuler vos propres besoins en termes simples.",
    },
  },
  "moon|pluto": {
    theme: {
      en: "How feelings meet intensity: emotional depth, attachment, fear of loss and the need for control, and the capacity to rebuild after upheaval.",
      fr: "La rencontre des émotions et de l’intensité\u202f: profondeur affective, attachement, peur de perdre et besoin de maîtrise, et la capacité à se reconstruire après un bouleversement.",
    },
    blend: {
      en: "Your feelings run intense and deep. You tend to bond powerfully, sense what others hide and remember emotional wounds for a long time. You may be the person friends call in a real crisis. Letting go of people or situations can be very hard, and jealousy may surface.",
      fr: "Vos émotions sont intenses et profondes. Vous vous attachez fortement, sentez ce que les autres cachent et gardez longtemps la mémoire des blessures. Vous êtes peut-être la personne qu’on appelle dans une vraie crise. Lâcher prise sur une personne ou une situation peut être très difficile, et la jalousie peut surgir.",
    },
    flow: {
      en: "You can face strong emotions without being swept away. You recover from loss with real resilience, and you often help others through transitions — a death in the family, a divorce, a move. Your emotional honesty tends to earn deep trust.",
      fr: "Vous pouvez affronter des émotions fortes sans vous laisser emporter. Vous vous relevez d’une perte avec une vraie résilience, et vous aidez souvent les autres dans les passages difficiles\u202f: un deuil, un divorce, un déménagement. Votre sincérité affective inspire une confiance profonde.",
    },
    tension: {
      en: "Your needs and your fear of losing control tend to amplify each other. You may cling, test people or react intensely to feeling abandoned. Family history may weigh heavily. What helps: talking things through with someone you trust, and letting feelings change instead of holding them tight.",
      fr: "Vos besoins et votre peur de perdre le contrôle ont tendance à s’amplifier. Vous pouvez vous accrocher, mettre les autres à l’épreuve ou réagir vivement au sentiment d’abandon. L’histoire familiale peut peser lourd. Ce qui aide\u202f: en parler à une personne de confiance, et laisser les émotions évoluer au lieu de les retenir.",
    },
  },
  "moon|saturn": {
    theme: {
      en: "How feelings meet responsibility: emotional reserve, self-reliance, duty and security, and learning to give yourself the care you give others.",
      fr: "La rencontre des émotions et des responsabilités\u202f: réserve affective, autonomie, devoir et sécurité, et l’apprentissage de s’accorder le soin qu’on donne aux autres.",
    },
    blend: {
      en: "Your feelings come with a sense of duty. You tend to be reserved, self-reliant and responsible, perhaps because you grew up early. You may care for others practically while keeping your own needs to yourself. Over time this often becomes steady emotional maturity, once you allow yourself support.",
      fr: "Vos émotions s’accompagnent d’un sens du devoir. La réserve, l’autonomie et le sens des responsabilités vous caractérisent souvent, peut-être parce que vous avez dû grandir vite. Vous prenez soin des autres concrètement en gardant vos besoins pour vous. Avec le temps, cela devient souvent une maturité affective solide, dès lors que vous acceptez du soutien.",
    },
    flow: {
      en: "Feelings and responsibility work together in you. You stay calm in hard times, keep commitments to family and friends, and create stable routines that make others feel secure. You may be the relative everyone asks for sensible advice.",
      fr: "Émotions et responsabilités vont de pair chez vous. Vous gardez votre calme dans les moments durs, tenez vos engagements envers les proches et installez des routines stables qui rassurent. Vous êtes peut-être le membre de la famille à qui l’on demande un avis sensé.",
    },
    tension: {
      en: "Your needs and your sense of duty tend to block each other. You may feel lonely, criticise yourself for having needs, or feel that affection has to be earned. What helps: regular, concrete self-care, and practising asking for help with small things first.",
      fr: "Vos besoins et votre sens du devoir ont tendance à se bloquer. La solitude peut peser, vous pouvez vous reprocher d’avoir des besoins, ou avoir le sentiment que l’affection se mérite. Ce qui aide\u202f: prendre soin de vous de façon régulière et concrète, et vous exercer à demander de l’aide d’abord pour de petites choses.",
    },
  },
  "moon|sun": {
    theme: {
      en: "How will meets needs: conscious goals and emotional instincts, the balance between what you want and what you need, often echoing your parents’ relationship.",
      fr: "La rencontre de la volonté et des besoins\u202f: buts conscients et instincts affectifs, l’équilibre entre ce que vous voulez et ce dont vous avez besoin, souvent en écho au couple parental.",
    },
    blend: {
      en: "You were born near a New Moon: your will and your needs point in the same direction. You tend to be single-minded and self-contained, wanting and feeling things in one movement. It may be harder for you to see yourself from outside or to consider alternatives.",
      fr: "Votre naissance a eu lieu près d’une Nouvelle Lune\u202f: votre volonté et vos besoins vont dans le même sens. Vous avez tendance à suivre votre idée et à vous suffire à vous-même, voulant et ressentant les choses d’un même élan. Il peut être plus difficile de vous voir de l’extérieur ou d’envisager d’autres options.",
    },
    flow: {
      en: "What you want and what you need tend to agree. You can pursue goals without betraying your emotional needs, and your inner life feels relatively harmonious. Others may find you easy to be around — someone who can work hard and still rest without guilt.",
      fr: "Ce que vous voulez et ce dont vous avez besoin s’accordent en général. Vous poursuivez vos objectifs sans trahir vos besoins affectifs, et votre vie intérieure est plutôt harmonieuse. On se sent bien à vos côtés\u202f: vous savez travailler dur puis vous reposer sans culpabilité.",
    },
    tension: {
      en: "Your will and your needs pull against each other: ambition versus rest, independence versus closeness. With the opposition (born near a Full Moon), you often meet this through relationships. What helps: making room for both sides deliberately, rather than letting one win every time.",
      fr: "Votre volonté et vos besoins tirent en sens contraire\u202f: ambition contre repos, indépendance contre proximité. Avec l’opposition (naissance près d’une Pleine Lune), cela se joue souvent dans les relations. Ce qui aide\u202f: faire consciemment de la place aux deux, plutôt que de laisser l’un gagner à chaque fois.",
    },
  },
  "moon|uranus": {
    theme: {
      en: "How feelings meet freedom: emotional independence, changeable moods, an unusual home life, and the tension between needing closeness and needing space.",
      fr: "La rencontre des émotions et de la liberté\u202f: indépendance affective, humeurs changeantes, vie de famille atypique, et la tension entre besoin de proximité et besoin d’espace.",
    },
    blend: {
      en: "Your emotional life needs freedom. You tend to feel things suddenly and detach just as quickly, and you may need more space than most people in close relationships. Your home or family life may be unconventional. Change often feels more comforting to you than routine.",
      fr: "Votre vie affective a besoin de liberté. Vous ressentez les choses soudainement et prenez vos distances tout aussi vite, et vous avez peut-être besoin de plus d’espace que la plupart des gens dans une relation proche. Votre foyer ou votre famille sortent peut-être de l’ordinaire. Le changement vous rassure souvent davantage que la routine.",
    },
    flow: {
      en: "You adapt emotionally to change with ease. Moves, new friendships or unusual living arrangements tend to energise rather than unsettle you, and you give others room to be themselves. Friends may value your calm in unexpected situations.",
      fr: "Vous vous adaptez affectivement au changement avec aisance. Déménagements, nouvelles amitiés ou modes de vie inhabituels vous stimulent plus qu’ils ne vous déstabilisent, et vous laissez aux autres la place d’être eux-mêmes. Vos amis apprécient peut-être votre calme face à l’imprévu.",
    },
    tension: {
      en: "Your need for security and your need for freedom tend to collide. You may push people away when they get close, feel restless at home, or have moods that shift abruptly. What helps: arrangements that include both closeness and independence, like a shared life with space of your own.",
      fr: "Votre besoin de sécurité et votre besoin de liberté ont tendance à se heurter. Vous pouvez repousser ceux qui s’approchent, tourner en rond à la maison, ou connaître des humeurs qui changent brusquement. Ce qui aide\u202f: des arrangements qui combinent proximité et indépendance, comme une vie à deux avec un espace à soi.",
    },
  },
  "moon|venus": {
    theme: {
      en: "How needs meet affection: emotional warmth, comfort and charm, and the kind of love and home that make you feel at ease.",
      fr: "La rencontre des besoins et de l’affection\u202f: chaleur émotionnelle, confort, charme, et le type d’amour et de foyer dans lequel vous vous sentez bien.",
    },
    blend: {
      en: "Your emotional needs and your capacity for affection are fused. You tend to be gentle, warm and attentive to comfort and beauty at home. You might remember everyone’s favourite dish. You may avoid conflict to keep the peace, sometimes at the expense of your own needs.",
      fr: "Vos besoins affectifs et votre capacité d’aimer ne font qu’un. La douceur, la chaleur et l’attention au confort et à la beauté du foyer vous caractérisent souvent. Vous vous souvenez peut-être du plat préféré de chacun. Vous évitez parfois le conflit pour préserver la paix, au détriment de vos propres besoins.",
    },
    flow: {
      en: "Feeling and affection flow easily for you. You make people feel welcome, and you tend to enjoy relationships without much drama. Arranging a room, cooking for friends or smoothing tensions in a group may come naturally.",
      fr: "Sensibilité et affection circulent facilement chez vous. Les gens se sentent bienvenus auprès de vous, et vous vivez vos relations sans trop de drames. Aménager une pièce, cuisiner pour des amis ou apaiser les tensions d’un groupe vous vient peut-être naturellement.",
    },
    tension: {
      en: "What you need emotionally and what you find attractive don’t always match. You may be drawn to people who don’t meet your needs, or use shopping and treats to soothe feelings. What helps: asking whether a pleasure actually comforts you, or only distracts you.",
      fr: "Ce dont vous avez besoin affectivement et ce qui vous attire ne concordent pas toujours. Vous pouvez vous tourner vers des personnes qui ne répondent pas à vos besoins, ou chercher un apaisement dans les achats et les douceurs. Ce qui aide\u202f: vous demander si un plaisir vous réconforte vraiment ou s’il vous distrait seulement.",
    },
  },
  "neptune|pluto": {
    theme: {
      en: "How collective imagination meets deep transformation: long generational shifts in beliefs, spirituality and what a society holds sacred.",
      fr: "La rencontre de l’imaginaire collectif et de la transformation profonde\u202f: de longs changements générationnels dans les croyances, la spiritualité et ce qu’une société tient pour sacré.",
    },
    blend: {
      en: "Neptune and Pluto last joined around 1891–92 and meet only about every 500 years, so no one alive today has this conjunction. It marked the start of a long cycle of collective change in belief and culture. In a chart, it matters personally only through the planets or angles it touches.",
      fr: "Neptune et Pluton se sont rejoints pour la dernière fois vers 1891-1892 et ne se retrouvent qu’environ tous les 500 ans\u202f: personne en vie aujourd’hui n’a cette conjonction. Elle a ouvert un long cycle de transformation collective des croyances et de la culture. Dans un thème, elle ne compte personnellement qu’à travers les planètes ou angles qu’elle touche.",
    },
    flow: {
      en: "Neptune and Pluto have been in a long sextile since the mid-twentieth century, so almost everyone born since then shares it; it matters personally mainly when it touches personal planets or angles. There it can show as a quiet ability to turn ideals into lasting change, as in healing or social work.",
      fr: "Neptune et Pluton forment un long sextile depuis le milieu du XXe siècle\u202f: presque toutes les personnes nées depuis le partagent, et il compte surtout s’il touche des planètes personnelles ou un angle. Il peut alors se traduire par une capacité discrète à transformer un idéal en changement durable, par exemple dans le soin ou l’action sociale.",
    },
    tension: {
      en: "No one alive today has Neptune and Pluto square or opposite: their cycle lasts about 500 years, and since the mid-twentieth century they have been in a long sextile. You will meet this aspect in historical charts, where it describes a period of collective upheaval in beliefs, shared by whole generations.",
      fr: "Personne en vie aujourd’hui n’a Neptune et Pluton en carré ou en opposition\u202f: leur cycle dure environ 500 ans, et ils forment depuis le milieu du XXe siècle un long sextile. Vous rencontrerez cet aspect dans des thèmes historiques, où il décrit une période de bouleversement collectif des croyances, partagée par des générations entières.",
    },
  },
  "neptune|saturn": {
    theme: {
      en: "How structure meets dissolution: turning dreams into form, the tension between reality and ideals, and faith tested by hard facts.",
      fr: "La rencontre de la structure et de la dissolution\u202f: donner forme au rêve, la tension entre réalité et idéal, et une foi mise à l’épreuve des faits.",
    },
    blend: {
      en: "Saturn and Neptune meet about every 36 years (in 1989, then 2026), so everyone born over several months shares this; it matters personally mainly when it touches personal planets or angles. Then you tend to give ideals a concrete shape — founding a charity, practising a disciplined art — or feel it keenly when structures dissolve.",
      fr: "Saturne et Neptune se rejoignent environ tous les 36 ans (en 1989, puis en 2026)\u202f: tous les natifs de ces quelques mois partagent cette conjonction, qui compte surtout si elle touche des planètes personnelles ou un angle. Vous donnez alors une forme concrète à l’idéal, fonder une association, pratiquer un art exigeant, ou vivez durement la dissolution des cadres.",
    },
    flow: {
      en: "This aspect is shared by many people born around the same time and matters personally mainly when it touches personal planets or angles. There, it helps you give form to intangible things: a meditation practice you actually keep, or a creative project managed realistically.",
      fr: "Cet aspect est partagé par beaucoup de personnes nées à la même époque et compte surtout s’il touche des planètes personnelles ou un angle. Il aide alors à donner forme à l’intangible\u202f: une pratique de méditation que vous tenez vraiment, un projet créatif géré avec réalisme.",
    },
    tension: {
      en: "Many people born around the same time share this; it matters personally mainly when it touches personal planets or angles. Then reality and ideals can feel at odds — pessimism about dreams, or structures that seem to melt away. What helps: realistic ideals, and small commitments you can keep.",
      fr: "Beaucoup de personnes nées à la même époque partagent cet aspect\u202f; il compte surtout s’il touche des planètes personnelles ou un angle. Réalité et idéal peuvent alors sembler inconciliables\u202f: pessimisme face aux rêves, cadres qui paraissent se dissoudre. Ce qui aide\u202f: des idéaux réalistes et de petits engagements que vous pouvez tenir.",
    },
  },
  "neptune|sun": {
    theme: {
      en: "How identity meets imagination: sensitivity, idealism, artistic or spiritual leanings, and the challenge of keeping a clear, stable sense of self.",
      fr: "La rencontre de l’identité et de l’imaginaire\u202f: sensibilité, idéalisme, penchants artistiques ou spirituels, et la difficulté de garder un sentiment de soi clair et stable.",
    },
    blend: {
      en: "Your identity is blended with imagination and sensitivity. You may be artistic, compassionate or spiritually inclined, and people project many things onto you. Defining clear goals can be hard, and you may shape yourself to what others expect. Creative or caring work often gives you a strong sense of purpose.",
      fr: "Votre identité se mêle d’imagination et de sensibilité. Vous avez peut-être une fibre artistique, compatissante ou spirituelle, et les autres projettent beaucoup de choses sur vous. Définir des objectifs clairs peut être difficile, et vous vous modelez parfois sur les attentes d’autrui. Un travail créatif ou de soin vous donne souvent un vrai sens.",
    },
    flow: {
      en: "Imagination supports your sense of self. You can express ideals through art, film, music or service without losing your footing, and your empathy tends to inspire others. A photograph you take or a small gesture may move people more than you expect.",
      fr: "L’imagination soutient votre identité. Vous exprimez vos idéaux par l’art, le cinéma, la musique ou le service sans perdre pied, et votre empathie inspire les autres. Une photo que vous prenez ou un petit geste peut toucher plus que vous ne l’imaginez.",
    },
    tension: {
      en: "Your will and your ideals tend to dissolve each other. You may doubt what you want, idealise people and then feel let down, or avoid decisions. What helps: concrete goals with deadlines, friends who give you honest feedback, and noticing when you’re escaping rather than resting.",
      fr: "Votre volonté et vos idéaux ont tendance à se dissoudre mutuellement. Vous pouvez douter de ce que vous voulez, idéaliser quelqu’un puis tomber de haut, ou esquiver les décisions. Ce qui aide\u202f: des objectifs concrets avec des échéances, des amis qui vous parlent franchement, et repérer quand vous fuyez au lieu de vous reposer.",
    },
  },
  "neptune|uranus": {
    theme: {
      en: "How innovation meets imagination: generational shifts in technology, ideals and spirituality, and how a whole cohort dreams about the future.",
      fr: "La rencontre de l’innovation et de l’imaginaire\u202f: changements générationnels dans la technologie, les idéaux et la spiritualité, et la façon dont toute une génération rêve l’avenir.",
    },
    blend: {
      en: "Uranus and Neptune joined in 1993 and stayed within orb for several years around it, so everyone born then shares this; it matters personally mainly when it touches personal planets or angles. It is linked to a generation raised with the internet, and personally to an intuitive, inventive imagination.",
      fr: "Uranus et Neptune se sont rejoints en 1993, et la conjonction est restée dans l’orbe plusieurs années autour de cette date\u202f: tous les natifs de cette période la partagent, et elle compte surtout si elle touche des planètes personnelles ou un angle. On l’associe à une génération qui a grandi avec internet, et personnellement à une imagination intuitive et inventive.",
    },
    flow: {
      en: "Shared by many people born around the same time, this matters personally mainly when it touches personal planets or angles. There, it tends to show as ease with new creative tools — digital art, electronic music — or an intuition that anticipates cultural change.",
      fr: "Partagé par beaucoup de personnes nées à la même époque, cet aspect compte surtout s’il touche des planètes personnelles ou un angle. Il se traduit alors par une aisance avec les nouveaux outils de création, art numérique, musique électronique, ou une intuition qui devance les changements culturels.",
    },
    tension: {
      en: "Many people born around the same time share this; it matters personally mainly when it touches personal planets or angles. Then ideals and the urge for change can feel unsettled — sudden disillusionment, confusing shifts in belief. What helps: testing new ideas in practice before committing to them.",
      fr: "Beaucoup de personnes nées à la même époque partagent cet aspect\u202f; il compte surtout s’il touche des planètes personnelles ou un angle. L’idéal et le besoin de changement peuvent alors sembler instables\u202f: désillusions soudaines, convictions qui basculent de façon déroutante. Ce qui aide\u202f: éprouver une idée nouvelle en pratique avant de s’y engager.",
    },
  },
  "neptune|venus": {
    theme: {
      en: "How affection meets imagination: romantic idealism, artistic sensitivity and compassion, and the gap between the person you love and your image of them.",
      fr: "La rencontre de l’affection et de l’imaginaire\u202f: idéalisme amoureux, sensibilité artistique, compassion, et l’écart entre la personne aimée et l’image qu’on en a.",
    },
    blend: {
      en: "Love and imagination are fused in you. You tend to be romantic, artistic and compassionate, drawn to music, film or beauty that moves you. You may fall for potential rather than reality, or give too much in relationships. Art is often where this finds its best form.",
      fr: "Chez vous, l’amour et l’imagination se confondent. Vous avez une nature romantique, artistique et compatissante, attirée par la musique, le cinéma ou la beauté qui émeut. Vous pouvez vous éprendre d’un potentiel plutôt que d’une réalité, ou trop donner dans une relation. L’art est souvent l’endroit où cela trouve sa meilleure forme.",
    },
    flow: {
      en: "Affection and imagination cooperate gracefully. You may have a fine artistic sense, a kindness that doesn’t turn into self-sacrifice, and a way of making ordinary moments feel special — a well-chosen song, a thoughtful gesture. Relationships can feel gentle and inspired.",
      fr: "L’affection et l’imagination coopèrent avec grâce. Vous avez peut-être un sens artistique fin, une bonté qui ne tourne pas au sacrifice, et l’art de rendre un moment ordinaire particulier\u202f: une chanson bien choisie, une attention délicate. Vos relations peuvent être douces et inspirées.",
    },
    tension: {
      en: "Your longing for love and your ideals tend to blur. You may idealise partners, ignore warning signs, or feel that real love should be effortless. Money can slip away too. What helps: getting to know people over time, and checking facts, especially where romance and finances meet.",
      fr: "Votre désir d’amour et vos idéaux ont tendance à se brouiller. Vous pouvez idéaliser un partenaire, ignorer des signaux d’alerte ou penser que le vrai amour ne demande aucun effort. L’argent aussi peut filer. Ce qui aide\u202f: prendre le temps de connaître les gens, et vérifier les faits, surtout quand sentiments et finances se mêlent.",
    },
  },
  "pluto|saturn": {
    theme: {
      en: "How structure meets transformation: authority, power and endurance, and the collective experience of hard reckonings and rebuilding.",
      fr: "La rencontre de la structure et de la transformation\u202f: autorité, pouvoir et endurance, et l’expérience collective des remises en question difficiles et de la reconstruction.",
    },
    blend: {
      en: "Saturn and Pluto meet about every 33–38 years (in 1982, then January 2020), so this is shared by people born within several months; it matters personally mainly when it touches personal planets or angles. Then it can show as great endurance and seriousness, and a capacity to rebuild after hardship.",
      fr: "Saturne et Pluton se rejoignent environ tous les 33 à 38 ans (en 1982, puis en janvier 2020)\u202f: cette conjonction est commune aux natifs de quelques mois et compte surtout si elle touche des planètes personnelles ou un angle. Elle peut alors donner une grande endurance, du sérieux, et la capacité de se reconstruire après l’épreuve.",
    },
    flow: {
      en: "This aspect is shared by many people born around the same time and matters personally mainly when it touches personal planets or angles. There, it tends to give quiet strength: managing crises, restructuring organisations, or persevering with a long, demanding project.",
      fr: "Cet aspect est partagé par beaucoup de personnes nées à la même époque et compte surtout s’il touche des planètes personnelles ou un angle. Il donne alors une force tranquille\u202f: gérer une crise, restructurer une organisation ou persévérer dans un projet long et exigeant.",
    },
    tension: {
      en: "Many people born around the same time share this; it matters personally mainly when it touches personal planets or angles. Then you may feel under heavy pressure or clash with authority. What helps: accepting the limits you can’t change, and patiently reshaping what you can.",
      fr: "Beaucoup de personnes nées à la même époque partagent cet aspect\u202f; il compte surtout s’il touche des planètes personnelles ou un angle. Vous pouvez alors ressentir une forte pression ou entrer en conflit avec l’autorité. Ce qui aide\u202f: accepter les limites qui ne changeront pas, et remodeler patiemment ce qui peut l’être.",
    },
  },
  "pluto|sun": {
    theme: {
      en: "How identity meets intensity: willpower, depth and personal power, and the capacity to reinvent yourself after a crisis.",
      fr: "La rencontre de l’identité et de l’intensité\u202f: volonté, profondeur, pouvoir personnel, et la capacité à se réinventer après une crise.",
    },
    blend: {
      en: "Your identity has intensity at its core. You tend to be private, determined and hard to ignore, and you may go through several deep personal reinventions. People can find you magnetic or intimidating. Learning to use influence openly, rather than controlling from the background, is often key.",
      fr: "Votre identité a l’intensité pour noyau. La discrétion, la détermination et une présence difficile à ignorer vous caractérisent, et vous traversez peut-être plusieurs réinventions profondes. Votre présence peut sembler magnétique ou intimidante. Apprendre à exercer votre influence ouvertement, plutôt qu’à contrôler en coulisses, est souvent décisif.",
    },
    flow: {
      en: "Willpower and depth support each other in you. You can focus intensely, handle crises calmly and help others change. You may be drawn to research, psychology, finance or healing, and you tend to come out of setbacks stronger and clearer.",
      fr: "Volonté et profondeur se soutiennent chez vous. Vous vous concentrez intensément, gérez les crises avec calme et aidez les autres à changer. La recherche, la psychologie, la finance ou le soin peuvent vous attirer, et les revers vous laissent souvent plus solide et plus lucide.",
    },
    tension: {
      en: "Your will and your need for control tend to collide with other people, often through power struggles with authority figures. You may feel you have to fight to exist. What helps: choosing your battles, and understanding that sharing power doesn’t mean losing it.",
      fr: "Votre volonté et votre besoin de maîtrise ont tendance à se heurter aux autres, souvent à travers des luttes de pouvoir avec des figures d’autorité. Vous pouvez avoir l’impression de devoir vous battre pour exister. Ce qui aide\u202f: choisir vos combats, et comprendre que partager le pouvoir ne signifie pas le perdre.",
    },
  },
  "pluto|uranus": {
    theme: {
      en: "How revolution meets transformation: generational upheavals, radical change in society, and the urge to overturn structures that no longer serve.",
      fr: "La rencontre de la révolution et de la transformation\u202f: bouleversements générationnels, changements radicaux dans la société, et l’envie de renverser les structures devenues inutiles.",
    },
    blend: {
      en: "Uranus and Pluto joined in the mid-1960s, so everyone born over several years then shares this; it matters personally mainly when it touches personal planets or angles. It is associated with a generation of radical social change, and personally it can show as a strong drive to reform or reinvent.",
      fr: "Uranus et Pluton se sont rejoints au milieu des années 1960\u202f: tous les natifs de ces quelques années partagent cette conjonction, qui compte surtout si elle touche des planètes personnelles ou un angle. Associée à une génération de profonds changements sociaux, elle peut se traduire personnellement par un fort élan de réforme ou de réinvention.",
    },
    flow: {
      en: "Shared by many people born around the same time, this matters personally mainly when it touches personal planets or angles. There, it tends to give a knack for driving change without destroying what works — reforming a system from the inside, for example.",
      fr: "Partagé par beaucoup de personnes nées à la même époque, cet aspect compte surtout s’il touche des planètes personnelles ou un angle. Il donne alors l’art de mener un changement sans détruire ce qui fonctionne, par exemple en réformant un système de l’intérieur.",
    },
    tension: {
      en: "Many people born around the same time share this, including everyone born under the 2012–2015 square; it matters personally mainly when it touches personal planets or angles. Then you may feel pressure to overturn things abruptly. What helps: channelling the urge for change into specific, sustained action.",
      fr: "Beaucoup de personnes nées à la même époque partagent cet aspect, dont toutes celles nées sous le carré de 2012-2015\u202f; il compte surtout s’il touche des planètes personnelles ou un angle. Vous pouvez alors ressentir une pression à tout renverser brusquement. Ce qui aide\u202f: canaliser ce besoin de changement dans une action précise et durable.",
    },
  },
  "pluto|venus": {
    theme: {
      en: "How affection meets intensity: passion, attachment and jealousy, and transformation through love, money and shared resources.",
      fr: "La rencontre de l’affection et de l’intensité\u202f: passion, attachement, jalousie, et la transformation par l’amour, l’argent et les ressources partagées.",
    },
    blend: {
      en: "Love, for you, is intense and all-or-nothing. You tend to form deep attachments that change you, and you feel attraction powerfully. Casual relationships may bore you. Jealousy or possessiveness can appear, and money and love may become entangled. Art that explores depth often speaks to you.",
      fr: "Pour vous, l’amour est intense, c’est tout ou rien. Vous nouez des attachements profonds qui vous transforment, et l’attirance est puissante. Les relations légères vous ennuient peut-être. La jalousie ou la possessivité peuvent apparaître, et l’argent se mêler aux sentiments. Un art qui explore les profondeurs vous parle souvent.",
    },
    flow: {
      en: "Passion and affection combine well for you. You can form deep, loyal bonds without losing yourself, and your relationships often change both people for the better. You may also have a flair for managing shared resources or investments.",
      fr: "La passion et l’affection s’allient bien chez vous. Vous nouez des liens profonds et loyaux sans vous y perdre, et vos relations font souvent évoluer les deux personnes. Vous avez peut-être aussi un talent pour gérer des ressources partagées ou des investissements.",
    },
    tension: {
      en: "Affection and the need for control tend to intensify each other. You may feel jealousy, test partners, or stay in relationships marked by power struggles. What helps: honest conversations about your fears, and choosing partners who respect your autonomy as you respect theirs.",
      fr: "L’affection et le besoin de maîtrise ont tendance à s’intensifier mutuellement. Vous pouvez éprouver de la jalousie, mettre l’autre à l’épreuve ou rester dans des relations marquées par des luttes de pouvoir. Ce qui aide\u202f: parler franchement de vos peurs, et choisir des partenaires qui respectent votre autonomie autant que vous respectez la leur.",
    },
  },
  "saturn|sun": {
    theme: {
      en: "How identity meets structure: self-discipline, responsibility, authority and self-doubt, and confidence built slowly through effort.",
      fr: "La rencontre de l’identité et de la structure\u202f: autodiscipline, responsabilité, autorité et doute de soi, et une confiance bâtie lentement par l’effort.",
    },
    blend: {
      en: "Your identity is shaped by responsibility. You tend to be serious, disciplined and hard on yourself, perhaps having felt older than your age as a child. Recognition may come late but solidly. You might put off what you want until you feel qualified, when you already are.",
      fr: "Votre identité est façonnée par la responsabilité. Le sérieux, la discipline et l’exigence envers vous-même vous caractérisent, avec peut-être l’impression d’avoir eu, enfant, les soucis d’un adulte. La reconnaissance vient parfois tard, mais solidement. Vous repoussez peut-être ce que vous voulez en attendant de vous sentir à la hauteur, alors que vous l’êtes déjà.",
    },
    flow: {
      en: "Discipline supports your sense of self. You can set long-term goals and reach them steadily, and you’re comfortable with responsibility. People tend to see you as reliable — the one they put in charge of the budget or the schedule.",
      fr: "La discipline soutient votre identité. Vous fixez des objectifs à long terme et les atteignez avec régularité, et les responsabilités ne vous font pas peur. On vous voit comme une personne fiable, celle à qui l’on confie le budget ou le planning.",
    },
    tension: {
      en: "Your will and your sense of limits tend to clash. You may doubt yourself, feel blocked by authority figures, or carry heavy responsibilities early. What helps: realistic goals, celebrating steps rather than only outcomes, and being as fair to yourself as you are to others.",
      fr: "Votre volonté et votre sens des limites ont tendance à se heurter. Vous pouvez douter de vous, vous heurter à des figures d’autorité, ou porter tôt de lourdes responsabilités. Ce qui aide\u202f: des objectifs réalistes, célébrer les étapes et pas seulement les résultats, et être aussi juste envers vous-même qu’envers les autres.",
    },
  },
  "saturn|uranus": {
    theme: {
      en: "How tradition meets change: stability versus innovation, rules versus freedom, and how a generation reforms the structures it inherits.",
      fr: "La rencontre de la tradition et du changement\u202f: stabilité face à innovation, règles face à liberté, et la façon dont une génération réforme les structures dont elle hérite.",
    },
    blend: {
      en: "Saturn and Uranus meet about every 45 years (most recently in 1988), so this is shared by people born within several months; it matters personally mainly when it touches personal planets or angles. Then you may combine discipline with originality — reforming systems methodically, or carefully building something new.",
      fr: "Saturne et Uranus se rejoignent environ tous les 45 ans (la dernière fois en 1988)\u202f: cette conjonction est commune aux natifs de quelques mois et compte surtout si elle touche des planètes personnelles ou un angle. Vous associez alors discipline et originalité\u202f: réformer un système avec méthode, ou construire avec soin quelque chose d’inédit.",
    },
    flow: {
      en: "This aspect is shared by many people born around the same time and matters personally mainly when it touches personal planets or angles. There, it helps you modernise without breaking things: introducing new methods in a traditional company, or applying technology to practical problems.",
      fr: "Cet aspect est partagé par beaucoup de personnes nées à la même époque et compte surtout s’il touche des planètes personnelles ou un angle. Il aide alors à moderniser sans casser\u202f: introduire de nouvelles méthodes dans une entreprise traditionnelle, ou mettre la technologie au service de problèmes concrets.",
    },
    tension: {
      en: "Many people born around the same time share this; it matters personally mainly when it touches personal planets or angles. Then you may swing between rigid control and sudden rebellion. What helps: building flexibility into your routines, and changing structures step by step rather than all at once.",
      fr: "Beaucoup de personnes nées à la même époque partagent cet aspect\u202f; il compte surtout s’il touche des planètes personnelles ou un angle. Vous pouvez alors osciller entre contrôle rigide et rébellion soudaine. Ce qui aide\u202f: prévoir de la souplesse dans vos routines, et changer les structures pas à pas plutôt que d’un coup.",
    },
  },
  "saturn|venus": {
    theme: {
      en: "How affection meets commitment: loyalty, caution in love and self-worth, and the difference between security and warmth in relationships and money.",
      fr: "La rencontre de l’affection et de l’engagement\u202f: loyauté, prudence en amour, estime de soi, et la différence entre sécurité et chaleur dans les relations et l’argent.",
    },
    blend: {
      en: "Affection comes with caution and seriousness for you. You tend to be loyal, selective and slow to trust, and you may value lasting commitment over romance. When younger, you may have doubted you were lovable. With time, your relationships and taste often mature into something solid and refined.",
      fr: "Chez vous, l’affection s’accompagne de prudence et de sérieux. La loyauté, l’exigence et une confiance lente à venir vous caractérisent, et l’engagement durable compte peut-être plus que la romance. Plus jeune, vous avez peut-être douté de mériter l’amour. Avec le temps, vos relations et vos goûts mûrissent souvent en quelque chose de solide et de raffiné.",
    },
    flow: {
      en: "Love and commitment support each other. You tend to form stable, long-lasting relationships and handle money sensibly. Your taste is classic and durable — you might prefer one good coat to five cheap ones. People trust your loyalty.",
      fr: "L’amour et l’engagement se soutiennent. Vous nouez des relations stables et durables et gérez l’argent avec bon sens. Votre goût est classique et fait pour durer\u202f: un bon manteau plutôt que cinq bon marché. On se fie à votre loyauté.",
    },
    tension: {
      en: "Affection and fear of rejection tend to block each other. You may hold back feelings, stay in relationships out of duty, or feel you must earn love. What helps: noticing where old beliefs about your worth still decide for you, and allowing pleasure without justifying it.",
      fr: "L’affection et la peur du rejet ont tendance à se bloquer. Vous pouvez retenir vos sentiments, rester dans une relation par devoir, ou penser que l’amour doit se mériter. Ce qui aide\u202f: repérer où d’anciennes croyances sur votre valeur décident encore à votre place, et vous accorder du plaisir sans le justifier.",
    },
  },
  "sun|uranus": {
    theme: {
      en: "How identity meets originality: independence, individuality, the need to be free and different, and sudden turns in life direction.",
      fr: "La rencontre de l’identité et de l’originalité\u202f: indépendance, individualité, besoin d’être libre et différent, et virages soudains dans le parcours de vie.",
    },
    blend: {
      en: "Your identity is bound up with independence. You tend to be original, unconventional and uncomfortable being told who to be. Life may take sudden turns — a career change, a move abroad. People see you as distinctive; the challenge is staying consistent enough to finish what you start.",
      fr: "Votre identité est liée à l’indépendance. L’originalité et l’anticonformisme vous caractérisent, et vous supportez mal qu’on vous dise qui être. La vie peut prendre des virages soudains\u202f: changement de métier, départ à l’étranger. On vous perçoit comme une personne singulière\u202f; le défi est de tenir la durée pour finir ce que vous commencez.",
    },
    flow: {
      en: "Individuality comes easily to you and tends to be well received. You can stand out without alienating people, and you adapt quickly to change. You may be the person who brings new ideas to a group and gets them adopted.",
      fr: "L’individualité vous vient facilement et elle est plutôt bien accueillie. Vous savez vous distinguer sans vous couper des autres, et vous vous adaptez vite au changement. Vous êtes peut-être la personne qui apporte des idées neuves à un groupe et les fait adopter.",
    },
    tension: {
      en: "Your will and your need for freedom tend to collide with circumstances. You may rebel against expectations, change direction abruptly or feel restless in any stable role. What helps: building freedom into your commitments, and asking whether you’re moving towards something or only away.",
      fr: "Votre volonté et votre besoin de liberté ont tendance à se heurter aux circonstances. Vous pouvez vous rebeller contre les attentes, changer brusquement de cap ou tourner en rond dans tout rôle stable. Ce qui aide\u202f: prévoir de la liberté dans vos engagements, et vous demander si vous allez vers quelque chose ou si vous fuyez seulement.",
    },
  },
  "sun|venus": {
    theme: {
      en: "How identity meets affection: charm, warmth and taste, and how much relationships and beauty matter to your sense of self.",
      fr: "La rencontre de l’identité et de l’affection\u202f: charme, chaleur, goût, et la place des relations et de la beauté dans le sentiment de soi.",
    },
    blend: {
      en: "Your identity is closely tied to affection and pleasure. You tend to be warm, charming and attentive to beauty and harmony; relationships matter a great deal to how you see yourself. You may avoid confrontation to stay liked. This conjunction is common, since Venus never strays far from the Sun.",
      fr: "Votre identité est étroitement liée à l’affection et au plaisir. La chaleur, le charme et le sens de la beauté et de l’harmonie vous caractérisent\u202f; les relations comptent beaucoup dans l’image que vous avez de vous. Vous évitez peut-être la confrontation pour garder l’affection des autres. Cette conjonction est fréquente, car Vénus ne s’éloigne jamais beaucoup du Soleil.",
    },
    flow: {
      en: "Venus is never more than about 47° from the Sun, so a trine or sextile between them cannot occur, though the semisextile can. With it, you tend to learn gradually from relationships and aesthetics — a friendship or an art form that quietly shapes who you become.",
      fr: "Vénus ne s’éloigne jamais de plus de 47° environ du Soleil\u202f: un trigone ou un sextile entre eux est donc impossible, mais le semi-sextile peut se former. Avec lui, vous apprenez progressivement des relations et de l’esthétique\u202f: une amitié ou un art qui façonne discrètement la personne que vous devenez.",
    },
    tension: {
      en: "Venus is never more than about 47° from the Sun, so a square or opposition between them cannot occur; the semisquare is possible. With it, you may feel a slight friction between your goals and your wish to please. What helps: making the choices you would make even without approval.",
      fr: "Vénus ne s’éloigne jamais de plus de 47° environ du Soleil\u202f: ni carré ni opposition ne sont possibles, mais le semi-carré l’est. Avec lui, vous pouvez ressentir une légère friction entre vos objectifs et votre désir de plaire. Ce qui aide\u202f: faire les choix que vous feriez même sans approbation.",
    },
  },
  "uranus|venus": {
    theme: {
      en: "How affection meets freedom: unconventional relationships, sudden attractions and original taste, and the balance between closeness and independence in love.",
      fr: "La rencontre de l’affection et de la liberté\u202f: relations atypiques, attirances soudaines, goûts originaux, et l’équilibre entre proximité et indépendance en amour.",
    },
    blend: {
      en: "Love and freedom are fused for you. Attraction tends to strike suddenly, often towards unusual people or arrangements, and you need space even in close relationships. Your taste may be distinctive — in clothing, music, design. Relationships that allow independence tend to last longer than those built on routine.",
      fr: "Chez vous, l’amour et la liberté se confondent. L’attirance naît soudainement, souvent pour des personnes ou des arrangements inhabituels, et vous avez besoin d’espace même dans une relation proche. Vos goûts sont peut-être très personnels\u202f: vêtements, musique, design. Les relations qui laissent de l’indépendance durent souvent plus que celles fondées sur la routine.",
    },
    flow: {
      en: "Affection and independence cooperate. You can keep close relationships while staying free, and you tend to bring fresh ideas to art, style or social life. Friendships may matter to you as much as romance, and they often begin in unexpected ways.",
      fr: "L’affection et l’indépendance coopèrent. Vous savez garder des liens proches tout en restant libre, et vous apportez des idées neuves dans l’art, le style ou la vie sociale. L’amitié compte peut-être autant pour vous que l’amour, et elle commence souvent de façon inattendue.",
    },
    tension: {
      en: "Your desire for connection and your need for freedom tend to clash. You may be drawn to unavailable people, end relationships abruptly, or feel trapped once things get serious. What helps: agreeing openly on space and commitment, and noticing when excitement is standing in for intimacy.",
      fr: "Votre désir de lien et votre besoin de liberté ont tendance à se heurter. Vous pouvez vous tourner vers des personnes indisponibles, rompre brusquement, ou vous sentir pris au piège dès que les choses deviennent sérieuses. Ce qui aide\u202f: convenir ouvertement de l’espace et de l’engagement, et repérer quand l’excitation remplace l’intimité.",
    },
  },
};

/** Planet with an angle: key "ascendant|<planet>" or "midheaven|<planet>". */
export const ANGLE_PAIR_TEXT: Record<string, { theme: Bi }> = {
  "ascendant|sun": {
    theme: {
      en: "The Sun linked to the Ascendant makes your core identity visible: you tend to come across as you really are, with presence and a wish to be noticed.",
      fr: "Le Soleil relié à l’Ascendant rend votre identité visible\u202f: vous vous montrez comme vous êtes, avec de la présence et l’envie qu’on vous remarque.",
    },
  },
  "ascendant|moon": {
    theme: {
      en: "The Moon linked to the Ascendant puts feelings on display: your moods show on your face, and first impressions of you are warm, receptive or changeable.",
      fr: "La Lune reliée à l’Ascendant met les émotions en vitrine\u202f: vos humeurs se lisent sur votre visage, et la première impression que vous donnez est chaleureuse, réceptive ou changeante.",
    },
  },
  "ascendant|mercury": {
    theme: {
      en: "Mercury linked to the Ascendant makes you come across as talkative, curious and quick; people often first notice how you speak, move or ask questions.",
      fr: "Mercure relié à l’Ascendant vous donne un abord vif, une curiosité en éveil et la parole facile\u202f; on remarque souvent en premier votre façon de parler, de bouger ou de poser des questions.",
    },
  },
  "ascendant|venus": {
    theme: {
      en: "Venus linked to the Ascendant gives charm and ease in first meetings: a pleasant manner, care for appearance, and a tendency to smooth over conflict.",
      fr: "Vénus reliée à l’Ascendant donne du charme et de l’aisance dans les premières rencontres\u202f: manières agréables, soin de l’apparence, et tendance à arrondir les angles.",
    },
  },
  "ascendant|mars": {
    theme: {
      en: "Mars linked to the Ascendant gives a direct, energetic presence: you come across as quick, frank or competitive, and physical activity often matters to you.",
      fr: "Mars relié à l’Ascendant donne une présence directe et énergique\u202f: on perçoit chez vous de la vivacité, de la franchise ou de l’esprit de compétition, et l’activité physique compte souvent beaucoup.",
    },
  },
  "ascendant|jupiter": {
    theme: {
      en: "Jupiter linked to the Ascendant gives an open, generous and confident manner; people tend to find you optimistic and approachable, sometimes larger than life.",
      fr: "Jupiter relié à l’Ascendant donne des manières ouvertes, généreuses et assurées\u202f; on vous trouve optimiste et abordable, parfois haut en couleur.",
    },
  },
  "ascendant|saturn": {
    theme: {
      en: "Saturn linked to the Ascendant gives a reserved, serious first impression; you may seem older or more guarded than you are, and confidence tends to grow with age.",
      fr: "Saturne relié à l’Ascendant donne une première impression réservée et sérieuse\u202f; on vous donne parfois plus que votre âge ou on vous trouve sur la réserve, et l’assurance tend à grandir avec les années.",
    },
  },
  "ascendant|uranus": {
    theme: {
      en: "Uranus linked to the Ascendant makes you come across as unusual, independent or unpredictable; you tend to resist fitting in and may change your look abruptly.",
      fr: "Uranus relié à l’Ascendant donne une allure singulière, indépendante ou imprévisible\u202f; vous résistez à l’idée de rentrer dans le moule et changez parfois de style du jour au lendemain.",
    },
  },
  "ascendant|neptune": {
    theme: {
      en: "Neptune linked to the Ascendant gives a soft, elusive or dreamy presence; people project their own ideas onto you, and your self-image may shift with your surroundings.",
      fr: "Neptune relié à l’Ascendant donne une présence douce, insaisissable ou rêveuse\u202f; les autres projettent leurs propres idées sur vous, et l’image que vous avez de vous varie selon l’entourage.",
    },
  },
  "ascendant|pluto": {
    theme: {
      en: "Pluto linked to the Ascendant gives an intense, guarded presence; people may find you magnetic or hard to read, and you tend to reveal yourself slowly.",
      fr: "Pluton relié à l’Ascendant donne une présence intense et secrète\u202f; on peut vous trouver magnétique ou difficile à cerner, et vous vous dévoilez lentement.",
    },
  },
  "midheaven|sun": {
    theme: {
      en: "The Sun linked to the Midheaven puts identity into career: you want to be recognised for what you do, and may seek leadership or a visible public role.",
      fr: "Le Soleil relié au Milieu du Ciel met l’identité au cœur de la carrière\u202f: vous tenez à la reconnaissance de ce que vous faites, et pouvez rechercher un rôle de direction ou une fonction publique visible.",
    },
  },
  "midheaven|moon": {
    theme: {
      en: "The Moon linked to the Midheaven points to a career involving care, the public or family matters; your reputation may rise and fall with circumstances.",
      fr: "La Lune reliée au Milieu du Ciel oriente vers une carrière liée au soin, au public ou à la famille\u202f; votre réputation peut fluctuer au gré des circonstances.",
    },
  },
  "midheaven|mercury": {
    theme: {
      en: "Mercury linked to the Midheaven favours a public role built on communication, writing, teaching, trade or analysis; you may be known for your ideas or your way with words.",
      fr: "Mercure relié au Milieu du Ciel favorise un rôle public fondé sur la communication, l’écriture, l’enseignement, le commerce ou l’analyse\u202f; on vous connaît peut-être pour vos idées ou votre aisance avec les mots.",
    },
  },
  "midheaven|venus": {
    theme: {
      en: "Venus linked to the Midheaven favours careers in art, design, beauty, diplomacy or public relations; you tend to be well liked at work and value a pleasant working environment.",
      fr: "Vénus reliée au Milieu du Ciel favorise les métiers de l’art, du design, de la beauté, de la diplomatie ou des relations publiques\u202f; on vous apprécie souvent au travail, et un cadre agréable compte pour vous.",
    },
  },
  "midheaven|mars": {
    theme: {
      en: "Mars linked to the Midheaven brings ambition and a competitive drive to your career; you may prefer to lead, work for yourself, or choose physical or high-pressure fields.",
      fr: "Mars relié au Milieu du Ciel apporte de l’ambition et un esprit de compétition dans la carrière\u202f; vous préférez peut-être diriger, travailler à votre compte, ou exercer dans des domaines physiques ou sous forte pression.",
    },
  },
  "midheaven|jupiter": {
    theme: {
      en: "Jupiter linked to the Midheaven favours professional growth, teaching, law, travel or publishing; you tend to be seen as capable, and generosity can open doors for you.",
      fr: "Jupiter relié au Milieu du Ciel favorise l’expansion professionnelle, l’enseignement, le droit, les voyages ou l’édition\u202f; on reconnaît souvent vos compétences, et votre générosité peut vous ouvrir des portes.",
    },
  },
  "midheaven|saturn": {
    theme: {
      en: "Saturn linked to the Midheaven points to a career built slowly and seriously; responsibility and authority often come with time, after sustained effort and some delays.",
      fr: "Saturne relié au Milieu du Ciel évoque une carrière construite lentement et sérieusement\u202f; responsabilités et autorité viennent souvent avec le temps, après un effort soutenu et quelques retards.",
    },
  },
  "midheaven|uranus": {
    theme: {
      en: "Uranus linked to the Midheaven favours unconventional careers, technology or reform, and sudden changes of direction; you tend to resist traditional hierarchies at work.",
      fr: "Uranus relié au Milieu du Ciel favorise les carrières atypiques, la technologie ou la réforme, et les changements de cap soudains\u202f; vous supportez mal les hiérarchies traditionnelles au travail.",
    },
  },
  "midheaven|neptune": {
    theme: {
      en: "Neptune linked to the Midheaven favours artistic, spiritual or caring vocations; your public image may be idealised or unclear, and your career path can take unexpected turns.",
      fr: "Neptune relié au Milieu du Ciel favorise les vocations artistiques, spirituelles ou de soin\u202f; votre image publique peut être idéalisée ou floue, et votre parcours prendre des tournants inattendus.",
    },
  },
  "midheaven|pluto": {
    theme: {
      en: "Pluto linked to the Midheaven points to a career involving power, research, crisis or transformation; you may seek influence and go through major professional reinventions.",
      fr: "Pluton relié au Milieu du Ciel oriente vers une carrière liée au pouvoir, à la recherche, aux crises ou à la transformation\u202f; vous recherchez peut-être de l’influence et traversez de grandes réinventions professionnelles.",
    },
  },
};
