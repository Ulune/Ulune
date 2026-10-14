/*
 * What Chinese astrology's page says (languages plan, part 10): a modern
 * portrait of each of the twelve animals, a reading of each of the sixty
 * animal-and-phase pairs (the "Metal Horse" of popular astrology: the
 * animal of the branch, the phase of the stem), each animal as the inner,
 * the true and the secret animal (the month, the day and the hour), and
 * each relation in practice. Written for Ulune in English and French.
 *
 * Where it comes from, as the page says: the places, the phases and the
 * relations are the tradition's (the Four Pillars, zodiac-reading.ts); the
 * portraits and the pairs gather what popular books in Chinese, English and
 * French commonly say of each animal, in Ulune's words, to be read as a
 * mirror rather than a verdict. None of it speaks of health, luck as fate,
 * or what a person must do. scripts/chinese-readings.test.mjs keeps every
 * text present in both languages, its typography and its tone.
 */
import type { Both } from "./both";
import type { PhaseId } from "./names";
import type { RelationKind } from "./relations";

export type AnimalPortrait = { portrait: Both; gifts: Both; watch: Both };

/** The twelve portraits, by animal (0 = the Rat … 11 = the Pig). */
export const ANIMAL_PORTRAITS: readonly AnimalPortrait[] = [
  {
    portrait: [
      "The Rat is quick, alert and resourceful. In the legend of the Great Race it rode on the Ox’s back and jumped ahead at the finish, and so came first of the twelve. Charming and sociable, it notices chances others miss and knows how to make much of little.",
      "Le Rat est vif, attentif et débrouillard. Dans la légende de la Grande Course, il voyagea sur le dos du Bœuf et sauta devant lui à l’arrivée, devenant ainsi le premier des douze. Charmant et sociable, il voit les occasions que d’autres manquent et sait faire beaucoup avec peu.",
    ],
    gifts: ["Its gifts: wit, adaptability, thrift, a talent for people and for plans.", "Ses atouts\u202f: l’esprit, l’adaptabilité, le sens de l’économie, le talent pour les gens et les projets."],
    watch: ["To watch: restlessness and worry, and holding on to things, or to grudges, longer than needed.", "À surveiller\u202f: l’agitation et l’inquiétude, et l’habitude de garder les choses, ou les rancunes, plus longtemps qu’il ne faut."],
  },
  {
    portrait: [
      "The Ox is patient, steady and strong. It advances step by step and rarely turns back. Honest and hard-working, it is the one others rely on when things get difficult.",
      "Le Bœuf est patient, constant et fort. Il avance pas à pas et revient rarement en arrière. Honnête et travailleur, c’est sur lui qu’on s’appuie quand les choses deviennent difficiles.",
    ],
    gifts: ["Its gifts: perseverance, reliability, calm, a sense of duty.", "Ses atouts\u202f: la persévérance, la fiabilité, le calme, le sens du devoir."],
    watch: ["To watch: stubbornness, and a slowness to accept change or to ask for help.", "À surveiller\u202f: l’entêtement, et une lenteur à accepter le changement ou à demander de l’aide."],
  },
  {
    portrait: [
      "The Tiger is brave, magnetic and independent. It acts on its convictions and stands up for those weaker than itself. Warm and generous, it lives intensely and loves a challenge.",
      "Le Tigre est courageux, magnétique et indépendant. Il agit selon ses convictions et prend la défense des plus faibles. Chaleureux et généreux, il vit intensément et aime les défis.",
    ],
    gifts: ["Its gifts: courage, enthusiasm, a sense of justice, natural authority.", "Ses atouts\u202f: le courage, l’enthousiasme, le sens de la justice, une autorité naturelle."],
    watch: ["To watch: impulsiveness and restlessness, and a temper that flares and fades.", "À surveiller\u202f: l’impulsivité et l’agitation, et des colères qui flambent puis retombent."],
  },
  {
    portrait: [
      "The Rabbit is gentle, refined and tactful. It prefers persuasion to force and peace to quarrels. Attentive to beauty and comfort, it makes every place it lives in more pleasant.",
      "Le Lapin est doux, raffiné et plein de tact. Il préfère la persuasion à la force et la paix aux querelles. Attentif à la beauté et au confort, il rend plus agréable chaque lieu où il vit.",
    ],
    gifts: ["Its gifts: kindness, diplomacy, taste, prudence.", "Ses atouts\u202f: la bonté, la diplomatie, le goût, la prudence."],
    watch: ["To watch: avoiding a conflict until it grows, and a caution that lets good chances pass.", "À surveiller\u202f: fuir un conflit jusqu’à ce qu’il grandisse, et une prudence qui laisse passer de belles occasions."],
  },
  {
    portrait: [
      "The Dragon, the only creature of legend among the twelve, stands for vitality and good fortune. Confident, ambitious and generous, it thinks big and draws others into its plans.",
      "Le Dragon, seule créature de légende parmi les douze, incarne la vitalité et la bonne fortune. Sûr de lui, ambitieux et généreux, il voit grand et entraîne les autres dans ses projets.",
    ],
    gifts: ["Its gifts: energy, vision, charisma, a generous heart.", "Ses atouts\u202f: l’énergie, la vision, le charisme, un cœur généreux."],
    watch: ["To watch: pride and impatience, and expecting others to follow at its pace.", "À surveiller\u202f: l’orgueil et l’impatience, et l’attente que les autres suivent son rythme."],
  },
  {
    portrait: [
      "The Snake is wise, discreet and intuitive. It thinks before it moves, then moves precisely. Elegant and reserved, it sees through appearances and keeps its own counsel.",
      "Le Serpent est sage, discret et intuitif. Il réfléchit avant d’agir, puis agit avec précision. Élégant et réservé, il voit au-delà des apparences et garde ses pensées pour lui.",
    ],
    gifts: ["Its gifts: insight, calm, focus, a sense of beauty.", "Ses atouts\u202f: la clairvoyance, le calme, la concentration, le sens de la beauté."],
    watch: ["To watch: secrecy and suspicion, and holding on too tightly to people and things.", "À surveiller\u202f: le secret et la méfiance, et une façon de tenir trop fort aux gens et aux choses."],
  },
  {
    portrait: [
      "The Horse is free, lively and warm. It loves movement, company and open spaces. Quick to decide and quick to act, it brings energy and good humour wherever it goes.",
      "Le Cheval est libre, vif et chaleureux. Il aime le mouvement, la compagnie et les grands espaces. Prompt à décider et à agir, il apporte de l’énergie et de la bonne humeur partout où il passe.",
    ],
    gifts: ["Its gifts: enthusiasm, independence, frankness, a gift for making friends.", "Ses atouts\u202f: l’enthousiasme, l’indépendance, la franchise, le don de se faire des amis."],
    watch: ["To watch: impatience and haste, and leaving things halfway when the next road calls.", "À surveiller\u202f: l’impatience et la hâte, et l’habitude de laisser les choses en plan quand la route suivante appelle."],
  },
  {
    portrait: [
      "The Goat, also called the Sheep or the Ram, is gentle, artistic and kind. It feels the moods around it and answers them with care. It thrives in beauty and peace, and gives its best when it feels safe.",
      "La Chèvre, qu’on appelle aussi le Mouton ou le Bélier, est douce, artiste et bienveillante. Elle sent les humeurs autour d’elle et y répond avec soin. Elle s’épanouit dans la beauté et la paix, et donne le meilleur d’elle-même quand elle se sent en sécurité.",
    ],
    gifts: ["Its gifts: compassion, creativity, tact, a peaceful presence.", "Ses atouts\u202f: la compassion, la créativité, le tact, une présence apaisante."],
    watch: ["To watch: worry and indecision, and leaning on others when it could trust itself.", "À surveiller\u202f: l’inquiétude et l’indécision, et l’habitude de s’appuyer sur les autres quand elle pourrait se faire confiance."],
  },
  {
    portrait: [
      "The Monkey is clever, playful and inventive. It solves problems quickly, learns anything and enjoys a good joke. Curious and adaptable, it is never short of an idea.",
      "Le Singe est malin, joueur et inventif. Il résout vite les problèmes, apprend tout et aime les bons mots. Curieux et adaptable, il n’est jamais à court d’idées.",
    ],
    gifts: ["Its gifts: intelligence, wit, versatility, optimism.", "Ses atouts\u202f: l’intelligence, l’esprit, la polyvalence, l’optimisme."],
    watch: ["To watch: restlessness and a taste for shortcuts, and cleverness that turns into mischief.", "À surveiller\u202f: l’agitation et le goût des raccourcis, et une malice qui tourne à l’espièglerie."],
  },
  {
    portrait: [
      "The Rooster is observant, frank and hard-working. It notices every detail and says what it thinks. Proud of doing things well, it is punctual, organised and dependable.",
      "Le Coq est observateur, franc et travailleur. Il remarque chaque détail et dit ce qu’il pense. Fier du travail bien fait, il est ponctuel, organisé et fiable.",
    ],
    gifts: ["Its gifts: precision, honesty, diligence, courage.", "Ses atouts\u202f: la précision, l’honnêteté, l’application, le courage."],
    watch: ["To watch: perfectionism, and criticism of others and of itself.", "À surveiller\u202f: le perfectionnisme, et la critique des autres comme de soi."],
  },
  {
    portrait: [
      "The Dog is loyal, honest and just. It defends its friends and its principles, and can be trusted completely. Sincere and protective, it is happiest serving something it believes in.",
      "Le Chien est loyal, honnête et juste. Il défend ses amis et ses principes, et l’on peut compter entièrement sur lui. Sincère et protecteur, il n’est jamais si heureux qu’au service de ce en quoi il croit.",
    ],
    gifts: ["Its gifts: faithfulness, integrity, a sense of fairness, devotion.", "Ses atouts\u202f: la fidélité, l’intégrité, le sens de l’équité, le dévouement."],
    watch: ["To watch: worry and pessimism, and seeing the world in black and white.", "À surveiller\u202f: l’inquiétude et le pessimisme, et une vision du monde en noir et blanc."],
  },
  {
    portrait: [
      "The Pig is generous, sincere and good-natured. It enjoys life’s pleasures and wishes the same for everyone. Tolerant and trusting, it is the friend who gives without counting.",
      "Le Cochon est généreux, sincère et bon vivant. Il apprécie les plaisirs de la vie et les souhaite à tous. Tolérant et confiant, c’est l’ami qui donne sans compter.",
    ],
    gifts: ["Its gifts: kindness, honesty, generosity, a gift for enjoying life.", "Ses atouts\u202f: la bonté, l’honnêteté, la générosité, l’art de profiter de la vie."],
    watch: ["To watch: naivety and indulgence, trusting too easily and giving too much away.", "À surveiller\u202f: la naïveté et l’excès, une confiance trop facile et des dons trop grands."],
  },
];

/** The sixty pairs, by animal and by the stem's phase ("6:metal", the Metal Horse). */
export const PAIR_TEXTS: Readonly<Record<string, Both>> = {
  "0:wood": [
    "The Wood Rat puts its quick mind to building: curious and sociable, it gathers people and ideas and makes them grow. Its generosity is real, and so is its need to feel secure.",
    "Le Rat de Bois met son esprit vif au service de ce qui se construit\u202f: curieux et sociable, il rassemble les gens et les idées et les fait grandir. Sa générosité est sincère, et son besoin de sécurité aussi.",
  ],
  "0:fire": [
    "The Fire Rat is the boldest of the Rats: lively, outspoken, quick to act on a good idea. Its enthusiasm carries others along; its challenge is to finish what it starts with the same heat.",
    "Le Rat de Feu est le plus audacieux des Rats\u202f: vif, franc, prompt à saisir une bonne idée. Son enthousiasme entraîne les autres\u202f; son défi est de finir ce qu’il commence avec la même ardeur.",
  ],
  "0:earth": [
    "The Earth Rat is the Rat with its feet on the ground: prudent and practical, a careful builder of security for itself and its own. Slow to gamble, it rarely loses what it has made.",
    "Le Rat de Terre a les pieds sur terre\u202f: prudent et pratique, il bâtit avec soin la sécurité des siens. Lent à prendre des risques, il perd rarement ce qu’il a construit.",
  ],
  "0:metal": [
    "The Metal Rat is sharp and determined: it knows what it wants, judges quickly and holds its course. Ambitious and loyal to its own, it softens its edges by trusting others a little more.",
    "Le Rat de Métal est vif et déterminé\u202f: il sait ce qu’il veut, juge vite et tient son cap. Ambitieux et fidèle aux siens, il gagne à faire un peu plus confiance aux autres.",
  ],
  "0:water": [
    "The Water Rat is the Rat at its most intuitive: perceptive, diplomatic, a gifted talker who reads a room at once. It adapts easily, and does well to keep a few firm convictions.",
    "Le Rat d’Eau est le plus intuitif des Rats\u202f: perspicace, diplomate, beau parleur, il lit une situation d’un regard. Il s’adapte sans peine, et gagne à garder quelques convictions fermes.",
  ],
  "1:wood": [
    "The Wood Ox joins the Ox’s patience to a wish to cooperate: steady and fair, it works well with others and keeps its word. More flexible than most Oxen, it loses none of their backbone.",
    "Le Bœuf de Bois allie la patience du Bœuf au goût de la coopération\u202f: constant et juste, il travaille bien avec les autres et tient parole. Plus souple que la plupart des Bœufs, il ne perd rien de leur solidité.",
  ],
  "1:fire": [
    "The Fire Ox is the Ox with a fire inside: determined, forthright, a natural organiser who drives a project to its end. Its strength is great; patience with slower people is its lesson.",
    "Le Bœuf de Feu a un feu intérieur\u202f: déterminé, direct, organisateur né, il mène un projet jusqu’au bout. Sa force est grande\u202f; la patience envers les plus lents est sa leçon.",
  ],
  "1:earth": [
    "The Earth Ox is the Ox twice over: calm, methodical, reliable to the bone. It builds slowly and lastingly, and others lean on it; it does well to let in some change and some play.",
    "Le Bœuf de Terre est deux fois Bœuf\u202f: calme, méthodique, fiable jusqu’au bout. Il construit lentement et durablement, et les autres s’appuient sur lui\u202f; il gagne à laisser entrer un peu de changement et de jeu.",
  ],
  "1:metal": [
    "The Metal Ox has a will of iron: hard-working, principled, unshakable once it has decided. Its constancy earns respect, and it gains by bending a little when others see things differently.",
    "Le Bœuf de Métal a une volonté de fer\u202f: travailleur, intègre, inébranlable une fois décidé. Sa constance force le respect, et il gagne à plier un peu quand d’autres voient les choses autrement.",
  ],
  "1:water": [
    "The Water Ox is the most supple of the Oxen: patient, thoughtful, a good listener who reaches its goals by persistence rather than force. Its calm is a refuge for others.",
    "Le Bœuf d’Eau est le plus souple des Bœufs\u202f: patient, réfléchi, à l’écoute, il atteint ses buts par la persévérance plutôt que par la force. Son calme est un refuge pour les autres.",
  ],
  "2:wood": [
    "The Wood Tiger is the most open of the Tigers: warm, inventive, a leader who brings people along rather than driving them. Its courage serves a cause; its attention can wander to the next one.",
    "Le Tigre de Bois est le plus ouvert des Tigres\u202f: chaleureux, inventif, un meneur qui entraîne plutôt qu’il ne pousse. Son courage sert une cause\u202f; son attention peut filer vers la suivante.",
  ],
  "2:fire": [
    "The Fire Tiger is the Tiger at full blaze: passionate, daring, unconventional, impossible to ignore. It lights others up, and learns to pace itself so the fire lasts.",
    "Le Tigre de Feu brûle à plein\u202f: passionné, audacieux, hors des sentiers battus, impossible à ignorer. Il enflamme les autres, et apprend à doser son feu pour qu’il dure.",
  ],
  "2:earth": [
    "The Earth Tiger tempers the Tiger’s boldness with good sense: brave but realistic, it weighs a risk before taking it and sees a plan through. Its fairness wins it loyal friends.",
    "Le Tigre de Terre tempère l’audace du Tigre par le bon sens\u202f: courageux mais réaliste, il pèse un risque avant de le prendre et mène un projet à son terme. Son sens de la justice lui vaut des amis fidèles.",
  ],
  "2:metal": [
    "The Metal Tiger is confident and strong-willed: it sets high goals and goes straight at them. Competitive and direct, it gains by listening before it charges.",
    "Le Tigre de Métal est sûr de lui et volontaire\u202f: il se fixe des buts élevés et y va tout droit. Compétitif et direct, il gagne à écouter avant de foncer.",
  ],
  "2:water": [
    "The Water Tiger is the most perceptive of the Tigers: open-minded, intuitive, calm under pressure. It reads people well and moves when the time is right rather than at once.",
    "Le Tigre d’Eau est le plus perspicace des Tigres\u202f: ouvert, intuitif, calme sous la pression. Il lit bien les gens et agit au bon moment plutôt que tout de suite.",
  ],
  "3:wood": [
    "The Wood Rabbit is kind and generous: it likes harmony, gives easily and is happiest among friends. Its gentleness is a strength, and it learns to say no when it needs to.",
    "Le Lapin de Bois est bon et généreux\u202f: il aime l’harmonie, donne volontiers et n’est jamais si heureux qu’entre amis. Sa douceur est une force, et il apprend à dire non quand il le faut.",
  ],
  "3:fire": [
    "The Fire Rabbit is the warmest and most expressive of the Rabbits: charming, lively, a natural host. It feels deeply and shows it, and gains by keeping its calm when tempers rise.",
    "Le Lapin de Feu est le plus chaleureux et le plus expressif des Lapins\u202f: charmant, vif, hôte né. Il ressent fort et le montre, et gagne à garder son calme quand le ton monte.",
  ],
  "3:earth": [
    "The Earth Rabbit is the most grounded of the Rabbits: sensible, steady, attached to home and to a few close people. Wary of sudden change, it gives others a feeling of safety.",
    "Le Lapin de Terre est le plus ancré des Lapins\u202f: sensé, posé, attaché à son foyer et à quelques proches. Méfiant envers les changements brusques, il donne aux autres un sentiment de sécurité.",
  ],
  "3:metal": [
    "The Metal Rabbit pairs refinement with resolve: discerning, ambitious in its quiet way, with a sure eye for quality. Its standards are high, and it learns to share them gently.",
    "Le Lapin de Métal unit le raffinement à la résolution\u202f: exigeant, ambitieux à sa manière discrète, l’œil sûr pour la qualité. Ses critères sont élevés, et il apprend à les partager avec douceur.",
  ],
  "3:water": [
    "The Water Rabbit is the most sensitive of the Rabbits: intuitive, empathic, attuned to every mood around it. Its imagination is rich, and it does well to shelter from other people’s storms.",
    "Le Lapin d’Eau est le plus sensible des Lapins\u202f: intuitif, empathique, attentif à chaque humeur autour de lui. Son imagination est riche, et il gagne à s’abriter des orages des autres.",
  ],
  "4:wood": [
    "The Wood Dragon is the creative Dragon: imaginative, generous, keen to build something new and to bring others into it. Its vision is large, and it gains by finishing as boldly as it begins.",
    "Le Dragon de Bois est le Dragon créateur\u202f: imaginatif, généreux, avide de bâtir du neuf et d’y associer les autres. Sa vision est vaste, et il gagne à finir avec autant d’audace qu’il commence.",
  ],
  "4:fire": [
    "The Fire Dragon is the most commanding of the Dragons: ardent, ambitious, a born leader with a big heart. Its energy moves mountains; humility makes it easier to follow.",
    "Le Dragon de Feu est le plus impérieux des Dragons\u202f: ardent, ambitieux, meneur né au grand cœur. Son énergie soulève des montagnes\u202f; l’humilité le rend plus facile à suivre.",
  ],
  "4:earth": [
    "The Earth Dragon is the patient Dragon: steady, fair, a builder of institutions more than of dreams. Its ambition is real and well founded, and others trust its judgement.",
    "Le Dragon de Terre est le Dragon patient\u202f: posé, juste, bâtisseur d’institutions plus que de rêves. Son ambition est réelle et bien fondée, et l’on se fie à son jugement.",
  ],
  "4:metal": [
    "The Metal Dragon is strong and uncompromising: principled, tireless, sure of its course. It achieves much, and learns that others may have good reasons of their own.",
    "Le Dragon de Métal est fort et sans compromis\u202f: intègre, infatigable, sûr de sa route. Il accomplit beaucoup, et apprend que les autres peuvent avoir aussi leurs bonnes raisons.",
  ],
  "4:water": [
    "The Water Dragon is the calmest of the Dragons: wise, open, diplomatic, it lets things come to it and steers them gently. Its power is quiet and lasting.",
    "Le Dragon d’Eau est le plus calme des Dragons\u202f: sage, ouvert, diplomate, il laisse venir les choses et les oriente en douceur. Sa puissance est tranquille et durable.",
  ],
  "5:wood": [
    "The Wood Snake is the artist among the Snakes: refined, thoughtful, drawn to beauty and to ideas that last. Its wisdom grows with time, and it shares it best when it lets people in.",
    "Le Serpent de Bois est l’artiste des Serpents\u202f: raffiné, réfléchi, attiré par la beauté et les idées qui durent. Sa sagesse grandit avec le temps, et il la partage mieux quand il laisse les autres approcher.",
  ],
  "5:fire": [
    "The Fire Snake is the most magnetic of the Snakes: intense, confident, persuasive, with a gift for leading from behind the scenes. Its passion is strong, and trust softens its guard.",
    "Le Serpent de Feu est le plus magnétique des Serpents\u202f: intense, sûr de lui, persuasif, doué pour mener depuis les coulisses. Sa passion est forte, et la confiance adoucit sa vigilance.",
  ],
  "5:earth": [
    "The Earth Snake is the most even-tempered of the Snakes: calm, prudent, reliable, a careful planner. It moves slowly and surely, and its warmth shows once it feels at home.",
    "Le Serpent de Terre est le plus égal des Serpents\u202f: calme, prudent, fiable, planificateur soigneux. Il avance lentement et sûrement, et sa chaleur se montre dès qu’il se sent chez lui.",
  ],
  "5:metal": [
    "The Metal Snake is clear-minded and self-reliant: discerning, determined, it sets its aim and reaches it alone if need be. It gains by letting others help.",
    "Le Serpent de Métal a l’esprit clair et sait compter sur lui-même\u202f: perspicace, déterminé, il fixe son but et l’atteint seul s’il le faut. Il gagne à se laisser aider.",
  ],
  "5:water": [
    "The Water Snake is the deepest of the Snakes: intuitive, perceptive, a reader of hidden motives and a keeper of secrets. Its insight is rare, and goes far when it chooses to share it.",
    "Le Serpent d’Eau est le plus profond des Serpents\u202f: intuitif, perspicace, il lit les motifs cachés et garde les secrets. Sa clairvoyance est rare, et porte loin quand il choisit de la partager.",
  ],
  "6:wood": [
    "The Wood Horse is the friendliest of the Horses: cheerful, cooperative, curious about everything and everyone. Its energy is generous, and it does well to pick a few roads and follow them far.",
    "Le Cheval de Bois est le plus amical des Chevaux\u202f: joyeux, coopératif, curieux de tout et de tous. Son énergie est généreuse, et il gagne à choisir quelques routes et à les suivre loin.",
  ],
  "6:fire": [
    "The Fire Horse is the Horse at full gallop: passionate, independent, brilliant, restless. Old folk belief made much of its strength; Ulune reads that strength as a gift to aim well.",
    "Le Cheval de Feu est le Cheval au grand galop\u202f: passionné, indépendant, brillant, impatient. De vieilles croyances populaires ont fait grand cas de sa force\u202f; Ulune y lit un don à bien diriger.",
  ],
  "6:earth": [
    "The Earth Horse is the Horse that thinks before it runs: practical, kind, steadier than most Horses. Its freedom matters to it, and so does keeping its promises.",
    "Le Cheval de Terre réfléchit avant de courir\u202f: pratique, bienveillant, plus posé que la plupart des Chevaux. Sa liberté compte pour lui, et tenir ses promesses aussi.",
  ],
  "6:metal": [
    "The Metal Horse is the most determined of the Horses: bold, independent, quick to decide and hard to hold back. Its drive takes it far, and it gains by slowing down for others.",
    "Le Cheval de Métal est le plus déterminé des Chevaux\u202f: audacieux, indépendant, prompt à décider et difficile à retenir. Son élan le mène loin, et il gagne à ralentir pour les autres.",
  ],
  "6:water": [
    "The Water Horse is the most adaptable of the Horses: witty, sociable, quick to sense where the wind is turning. It loves change, and learns to stay when staying matters.",
    "Le Cheval d’Eau est le plus adaptable des Chevaux\u202f: spirituel, sociable, prompt à sentir d’où tourne le vent. Il aime le changement, et apprend à rester quand rester compte.",
  ],
  "7:wood": [
    "The Wood Goat is kind and giving: generous with time and care, at ease in a group, attentive to those around it. It gains by asking for what it needs as easily as it gives.",
    "La Chèvre de Bois est bonne et généreuse\u202f: elle donne volontiers de son temps et de ses soins, se sent à l’aise en groupe et reste attentive à son entourage. Elle gagne à demander ce dont elle a besoin aussi facilement qu’elle donne.",
  ],
  "7:fire": [
    "The Fire Goat is the bravest of the Goats: creative, expressive, warmer and bolder than most. Its feelings run strong, and it puts them to good use in art and in care.",
    "La Chèvre de Feu est la plus courageuse des Chèvres\u202f: créative, expressive, plus chaleureuse et plus audacieuse que la plupart. Ses sentiments sont forts, et elle les met à profit dans l’art et le soin des autres.",
  ],
  "7:earth": [
    "The Earth Goat is the steadiest of the Goats: sincere, careful, attached to home and to its people. It finds its strength in routine and trust, and does well to share its worries early.",
    "La Chèvre de Terre est la plus posée des Chèvres\u202f: sincère, soigneuse, attachée à son foyer et aux siens. Elle trouve sa force dans les habitudes et la confiance, et gagne à confier tôt ses soucis.",
  ],
  "7:metal": [
    "The Metal Goat hides a firm core under its softness: refined, sensitive, protective of what it loves. Its standards are high, and it learns to let things be imperfect.",
    "La Chèvre de Métal cache un cœur ferme sous sa douceur\u202f: raffinée, sensible, protectrice de ce qu’elle aime. Ses exigences sont élevées, et elle apprend à accepter l’imparfait.",
  ],
  "7:water": [
    "The Water Goat is the most intuitive of the Goats: gentle, imaginative, attuned to the moods of others. It flows with life, and gains by setting a few clear limits.",
    "La Chèvre d’Eau est la plus intuitive des Chèvres\u202f: douce, imaginative, attentive aux humeurs des autres. Elle suit le cours de la vie, et gagne à poser quelques limites claires.",
  ],
  "8:wood": [
    "The Wood Monkey is the inventive Monkey: curious, enterprising, eager to try every new idea. Its enthusiasm brings others along, and patience turns its sparks into lasting work.",
    "Le Singe de Bois est le Singe inventeur\u202f: curieux, entreprenant, impatient d’essayer chaque idée nouvelle. Son enthousiasme entraîne les autres, et la patience change ses étincelles en œuvre durable.",
  ],
  "8:fire": [
    "The Fire Monkey is the boldest of the Monkeys: inventive, competitive, full of energy and wit. It loves a challenge, and gains by listening as well as it talks.",
    "Le Singe de Feu est le plus audacieux des Singes\u202f: inventif, compétitif, plein d’énergie et d’esprit. Il aime les défis, et gagne à écouter aussi bien qu’il parle.",
  ],
  "8:earth": [
    "The Earth Monkey is the most reliable of the Monkeys: clever, studious, more patient than its cousins. It puts its wits to serious work, and others can count on it.",
    "Le Singe de Terre est le plus fiable des Singes\u202f: malin, studieux, plus patient que ses cousins. Il met son esprit au service d’un travail sérieux, et l’on peut compter sur lui.",
  ],
  "8:metal": [
    "The Metal Monkey is sharp and ambitious: skilled, self-assured, it masters whatever it takes on. Its independence is strong, and working with others makes it stronger still.",
    "Le Singe de Métal est vif et ambitieux\u202f: habile, sûr de lui, il maîtrise tout ce qu’il entreprend. Son indépendance est forte, et le travail avec les autres le rend plus fort encore.",
  ],
  "8:water": [
    "The Water Monkey is the most subtle of the Monkeys: perceptive, diplomatic, quick to understand people and situations. Its charm opens doors, and frankness keeps them open.",
    "Le Singe d’Eau est le plus subtil des Singes\u202f: perspicace, diplomate, prompt à comprendre les gens et les situations. Son charme ouvre les portes, et la franchise les garde ouvertes.",
  ],
  "9:wood": [
    "The Wood Rooster is the warm-hearted Rooster: conscientious, fair, eager to improve things for everyone. Its standards are high and kindly meant, and it does well to rest sometimes.",
    "Le Coq de Bois est le Coq au grand cœur\u202f: consciencieux, juste, désireux d’améliorer les choses pour tous. Ses exigences sont hautes et bienveillantes, et il gagne à se reposer parfois.",
  ],
  "9:fire": [
    "The Fire Rooster is the most spirited of the Roosters: confident, vivid, a born organiser who likes to be seen. Its energy is great, and tact helps its frankness land well.",
    "Le Coq de Feu est le plus fougueux des Coqs\u202f: sûr de lui, éclatant, organisateur né qui aime être vu. Son énergie est grande, et le tact aide sa franchise à bien passer.",
  ],
  "9:earth": [
    "The Earth Rooster is the most thorough of the Roosters: practical, precise, a careful worker who leaves nothing to chance. It is a pillar for others, and learns to loosen its grip.",
    "Le Coq de Terre est le plus méticuleux des Coqs\u202f: pratique, précis, travailleur soigneux qui ne laisse rien au hasard. Il est un pilier pour les autres, et apprend à relâcher sa prise.",
  ],
  "9:metal": [
    "The Metal Rooster is the Rooster twice over: exacting, honest, sure of its judgement. It aims for excellence and often reaches it, and gains by being as kind as it is right.",
    "Le Coq de Métal est deux fois Coq\u202f: exigeant, honnête, sûr de son jugement. Il vise l’excellence et l’atteint souvent, et gagne à être aussi bienveillant qu’il a raison.",
  ],
  "9:water": [
    "The Water Rooster is the most diplomatic of the Roosters: perceptive, articulate, attentive to people as much as to tasks. Its clear mind serves others well.",
    "Le Coq d’Eau est le plus diplomate des Coqs\u202f: perspicace, éloquent, attentif aux gens autant qu’aux tâches. Son esprit clair sert bien les autres.",
  ],
  "10:wood": [
    "The Wood Dog is the most easy-going of the Dogs: honest, warm, cooperative, a friend for life. Its sense of fairness is strong, and it forgives others’ faults more readily than most Dogs.",
    "Le Chien de Bois est le plus accommodant des Chiens\u202f: honnête, chaleureux, coopératif, un ami pour la vie. Son sens de la justice est fort, et il pardonne les défauts des autres plus volontiers que la plupart des Chiens.",
  ],
  "10:fire": [
    "The Fire Dog is the boldest of the Dogs: loyal, energetic, quick to defend what it believes. Its conviction inspires others, and calm helps it choose its fights well.",
    "Le Chien de Feu est le plus audacieux des Chiens\u202f: loyal, énergique, prompt à défendre ce qu’il croit. Sa conviction inspire les autres, et le calme l’aide à bien choisir ses combats.",
  ],
  "10:earth": [
    "The Earth Dog is the steadiest of the Dogs: sensible, faithful, patient with long work. Others rely on its honesty, and it does well to let go of what it cannot change.",
    "Le Chien de Terre est le plus posé des Chiens\u202f: sensé, fidèle, patient dans les longs travaux. On s’appuie sur son honnêteté, et il gagne à lâcher prise sur ce qu’il ne peut changer.",
  ],
  "10:metal": [
    "The Metal Dog is principled and unbending: brave, loyal, uncompromising about right and wrong. Its integrity is its strength, and flexibility makes it a better guide.",
    "Le Chien de Métal est intègre et inflexible\u202f: courageux, loyal, intransigeant sur le bien et le mal. Son intégrité est sa force, et la souplesse en fait un meilleur guide.",
  ],
  "10:water": [
    "The Water Dog is the most understanding of the Dogs: perceptive, kind, ready to listen before judging. Its loyalty is quiet and deep.",
    "Le Chien d’Eau est le plus compréhensif des Chiens\u202f: perspicace, bienveillant, prêt à écouter avant de juger. Sa loyauté est discrète et profonde.",
  ],
  "11:wood": [
    "The Wood Pig is the most sociable of the Pigs: warm, trusting, glad to bring people together. Its generosity seems without end, and it learns to keep a little for itself.",
    "Le Cochon de Bois est le plus sociable des Cochons\u202f: chaleureux, confiant, heureux de rassembler les gens. Sa générosité semble sans fin, et il apprend à garder un peu pour lui.",
  ],
  "11:fire": [
    "The Fire Pig is the boldest of the Pigs: passionate, brave, ready to work hard for what it loves. Its heart is big, and it gains by choosing its battles.",
    "Le Cochon de Feu est le plus audacieux des Cochons\u202f: passionné, courageux, prêt à travailler dur pour ce qu’il aime. Son cœur est grand, et il gagne à choisir ses combats.",
  ],
  "11:earth": [
    "The Earth Pig is the most patient of the Pigs: kind, steady, fond of home and of good things. It makes life comfortable for everyone around it, and a little ambition widens its world.",
    "Le Cochon de Terre est le plus patient des Cochons\u202f: bon, posé, amateur de son foyer et des bonnes choses. Il rend la vie agréable à tout son entourage, et un peu d’ambition élargit son monde.",
  ],
  "11:metal": [
    "The Metal Pig is the most determined of the Pigs: sincere, strong, outspoken in friendship. Its loyalty is unshakable, and it learns that not everyone is as straightforward.",
    "Le Cochon de Métal est le plus déterminé des Cochons\u202f: sincère, fort, franc en amitié. Sa loyauté est inébranlable, et il apprend que tout le monde n’est pas aussi droit que lui.",
  ],
  "11:water": [
    "The Water Pig is the gentlest of the Pigs: intuitive, tolerant, open to everyone. Its kindness is real, and it does well to trust its own good judgement.",
    "Le Cochon d’Eau est le plus doux des Cochons\u202f: intuitif, tolérant, ouvert à tous. Sa bonté est sincère, et il gagne à se fier à son propre bon sens.",
  ],
};

/** A pair's text: the animal of the branch, the phase of the stem. */
export const pairText = (animal: number, phase: PhaseId): Both => PAIR_TEXTS[`${animal}:${phase}`]!;

/**
 * Each animal as the inner animal (the month), the true self (the day) and
 * the secret animal (the hour), as the tradition places them, said to the
 * reader. The year animal is read by its pair and portrait.
 */
export const PLACE_TEXTS: Readonly<Record<"month" | "day" | "hour", readonly Both[]>> = {
  month: [
    ["Inside, you have the Rat’s alert mind: always planning, always noticing, rarely quite at rest.", "Au fond de vous, vous avez l’esprit en éveil du Rat\u202f: toujours à prévoir, à remarquer, rarement tout à fait au repos."],
    ["Inside, you have the Ox’s patience: you grow slowly and surely, and what you decide stays decided.", "Au fond de vous, vous avez la patience du Bœuf\u202f: vous grandissez lentement et sûrement, et ce que vous décidez reste décidé."],
    ["Inside, you have the Tiger’s courage: a need for challenge, and a refusal to be caged.", "Au fond de vous, vous avez le courage du Tigre\u202f: le besoin de défis, et le refus d’être mis en cage."],
    ["Inside, you have the Rabbit’s sensitivity: a need for peace, beauty and gentle surroundings.", "Au fond de vous, vous avez la sensibilité du Lapin\u202f: le besoin de paix, de beauté et d’un entourage doux."],
    ["Inside, you have the Dragon’s fire: great hopes, a sense of purpose and a wish to leave a mark.", "Au fond de vous, vous avez le feu du Dragon\u202f: de grands espoirs, le sens d’une mission et le désir de laisser une trace."],
    ["Inside, you have the Snake’s depth: you think long, feel strongly and keep your own counsel.", "Au fond de vous, vous avez la profondeur du Serpent\u202f: vous réfléchissez longtemps, ressentez fort et gardez vos pensées pour vous."],
    ["Inside, you have the Horse’s restlessness: a need for movement, freedom and open horizons.", "Au fond de vous, vous avez l’élan du Cheval\u202f: le besoin de mouvement, de liberté et d’horizons ouverts."],
    ["Inside, you have the Goat’s tenderness: a feeling for beauty and for other people’s needs.", "Au fond de vous, vous avez la tendresse de la Chèvre\u202f: le sens de la beauté et des besoins des autres."],
    ["Inside, you have the Monkey’s quick wit: you need puzzles, play and new things to learn.", "Au fond de vous, vous avez l’esprit vif du Singe\u202f: il vous faut des énigmes, du jeu et des choses nouvelles à apprendre."],
    ["Inside, you have the Rooster’s sense of order: high standards and a need to get things right.", "Au fond de vous, vous avez le sens de l’ordre du Coq\u202f: des exigences élevées et le besoin de bien faire les choses."],
    ["Inside, you have the Dog’s sense of justice: you need to believe in what you do and in the people you do it with.", "Au fond de vous, vous avez le sens de la justice du Chien\u202f: il vous faut croire en ce que vous faites et en ceux avec qui vous le faites."],
    ["Inside, you have the Pig’s good heart: a love of life, of comfort and of honest people.", "Au fond de vous, vous avez le bon cœur du Cochon\u202f: l’amour de la vie, du confort et des gens sincères."],
  ],
  day: [
    ["With those closest to you, you are attentive and resourceful, the one who thinks of everything; a partner who enjoys your quickness suits you.", "Avec vos proches, vous faites preuve d’attention et de débrouillardise, en pensant à tout\u202f; il vous faut quelqu’un qui aime votre vivacité."],
    ["With those closest to you, you are loyal and dependable, steady rather than showy; you take time to trust, and then you trust for good.", "Avec vos proches, vous offrez de la loyauté et de la constance plutôt que des démonstrations\u202f; vous prenez le temps de faire confiance, puis c’est pour de bon."],
    ["With those closest to you, you are passionate and protective; a partner who leaves you room to roam suits you.", "Avec vos proches, vous aimez avec passion et prenez soin des vôtres\u202f; il vous faut quelqu’un qui vous laisse de l’espace."],
    ["With those closest to you, you are tender and attentive, a maker of harmony; a calm and kind home is where you flourish.", "Avec vos proches, vous apportez tendresse et attention, et faites régner l’harmonie\u202f; c’est dans un foyer calme et bienveillant que vous vous épanouissez."],
    ["With those closest to you, you are generous and vivid; a partner who admires you without being dazzled suits you.", "Avec vos proches, vous donnez généreusement et avec éclat\u202f; il vous faut quelqu’un qui vous admire sans être ébloui."],
    ["With those closest to you, you are devoted and perceptive; you need deep trust, and you give it in return.", "Avec vos proches, vous faites preuve de dévouement et de perspicacité\u202f; il vous faut une confiance profonde, et vous la rendez."],
    ["With those closest to you, you are warm and spontaneous; a partner who travels with you rather than holds you back suits you.", "Avec vos proches, vous offrez chaleur et spontanéité\u202f; il vous faut quelqu’un qui voyage avec vous plutôt qu’il ne vous retient."],
    ["With those closest to you, you are caring and devoted; you need security and gentle words.", "Avec vos proches, vous prodiguez attention et dévouement\u202f; il vous faut de la sécurité et des mots doux."],
    ["With those closest to you, you are funny and inventive; a partner who keeps up and keeps you curious suits you.", "Avec vos proches, vous apportez humour et invention\u202f; il vous faut quelqu’un qui suit votre rythme et entretient votre curiosité."],
    ["With those closest to you, you are frank and dependable, attentive to detail; you need honesty, and to be appreciated.", "Avec vos proches, vous offrez franchise, fiabilité et souci du détail\u202f; il vous faut de l’honnêteté, et de la reconnaissance."],
    ["With those closest to you, you are loyal and protective; trust matters to you above everything.", "Avec vos proches, vous faites preuve de loyauté et veillez sur eux\u202f; la confiance compte pour vous plus que tout."],
    ["With those closest to you, you are generous and affectionate; you need warmth and sincerity.", "Avec vos proches, vous donnez générosité et affection\u202f; il vous faut de la chaleur et de la sincérité."],
  ],
  hour: [
    ["In private, the Rat keeps careful accounts of life: a quiet collector of ideas, plans and memories.", "Dans l’intimité, le Rat tient les comptes de la vie avec soin\u202f: un collectionneur discret d’idées, de projets et de souvenirs."],
    ["In private, the Ox is a quiet worker who finds peace in effort and routine, and needs no applause.", "Dans l’intimité, le Bœuf est un travailleur discret qui trouve la paix dans l’effort et les habitudes, et n’a pas besoin d’applaudissements."],
    ["In private, the Tiger burns for causes and adventures it does not always show.", "Dans l’intimité, le Tigre brûle pour des causes et des aventures qu’il ne montre pas toujours."],
    ["In private, the Rabbit is a dreamer who keeps a quiet, well-ordered world of its own.", "Dans l’intimité, le Lapin est un rêveur qui garde un monde à lui, calme et bien rangé."],
    ["In private, the Dragon nurses great dreams, and a pride it does not always show.", "Dans l’intimité, le Dragon nourrit de grands rêves, et une fierté qu’il ne montre pas toujours."],
    ["In private, the Snake is wise and watchful, seeing more than it says.", "Dans l’intimité, le Serpent est sage et attentif, et voit plus qu’il ne dit."],
    ["In private, the Horse longs for open space and keeps an independent heart.", "Dans l’intimité, le Cheval rêve de grands espaces et garde un cœur indépendant."],
    ["In private, the Goat is an artist and a dreamer, with a rich inner world.", "Dans l’intimité, la Chèvre est une artiste et une rêveuse, au riche monde intérieur."],
    ["In private, the Monkey is a clever strategist who enjoys finding its own way round the rules.", "Dans l’intimité, le Singe est un stratège habile qui aime trouver son propre chemin autour des règles."],
    ["In private, the Rooster keeps lists and plans, and an exacting eye on itself.", "Dans l’intimité, le Coq tient des listes et des plans, et garde sur lui-même un œil exigeant."],
    ["In private, the Dog is a guardian who worries for those it loves.", "Dans l’intimité, le Chien est un gardien qui s’inquiète pour ceux qu’il aime."],
    ["In private, the Pig is a lover of life’s pleasures who keeps a hopeful, trusting heart.", "Dans l’intimité, le Cochon aime les plaisirs de la vie et garde un cœur plein d’espoir et de confiance."],
  ],
};

/** Each relation in practice, between two sides of the reader's own life. */
export const RELATION_PRACTICE: Readonly<Record<RelationKind, Both>> = {
  harmony: [
    "The two sides of your life these animals stand for help each other: lean on one when the other is under strain.",
    "Les deux pans de votre vie que ces animaux représentent s’entraident\u202f: appuyez-vous sur l’un quand l’autre est mis à l’épreuve.",
  ],
  trine: [
    "These two sides of you share a direction: plans that involve both tend to come together easily.",
    "Ces deux pans de vous partagent une direction\u202f: les projets qui les engagent tous deux se nouent facilement.",
  ],
  clash: [
    "Expect some tension between these two sides of your life, and use it: movement and change often settle it better than standing still.",
    "Attendez-vous à une tension entre ces deux pans de votre vie, et servez-vous-en\u202f: le mouvement et le changement l’apaisent souvent mieux que l’immobilité.",
  ],
  harm: [
    "Small misunderstandings can arise between these two sides of you; naming them early keeps them small.",
    "De petits malentendus peuvent naître entre ces deux pans de vous\u202f; les nommer tôt les garde petits.",
  ],
  punishment: [
    "Pressure can build up between these two sides of you; clear limits and patience release it.",
    "Une pression peut s’accumuler entre ces deux pans de vous\u202f; des limites claires et de la patience la relâchent.",
  ],
  destruction: [
    "What one side of you builds, the other may want to change; a second look before committing keeps both content.",
    "Ce qu’un pan de vous construit, l’autre peut vouloir le changer\u202f; un second regard avant de s’engager les contente tous deux.",
  ],
  "self-punishment": [
    "The same animal twice doubles its strengths and its habits: be as patient with yourself as you are with others.",
    "Le même animal deux fois double ses forces et ses habitudes\u202f: accordez-vous la même patience qu’aux autres.",
  ],
};
