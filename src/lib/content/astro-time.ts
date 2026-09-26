import type { Bi } from "./types";
import type { BodyId } from "@/lib/chart/types";
import type { AspectFamily } from "./astro-aspects";

/**
 * Neutral keyword phrases for every body, for sentences where the body is not
 * the reader’s own (a transiting planet, another person’s planet).
 */
export const BODY_KEYWORDS: Record<BodyId, Bi> = {
  sun: { en: "identity, vitality and purpose", fr: "l’identité, la vitalité et le but" },
  moon: { en: "feelings, needs and habits", fr: "les émotions, les besoins et les habitudes" },
  mercury: { en: "thinking, talking and learning", fr: "la pensée, la parole et l’apprentissage" },
  venus: { en: "affection, pleasure and values", fr: "l’affection, le plaisir et les valeurs" },
  mars: { en: "drive, desire and assertion", fr: "l’élan, le désir et l’affirmation" },
  jupiter: { en: "growth, confidence and opportunity", fr: "la croissance, la confiance et les occasions" },
  saturn: { en: "structure, limits and responsibility", fr: "la structure, les limites et la responsabilité" },
  uranus: { en: "change, independence and surprise", fr: "le changement, l’indépendance et la surprise" },
  neptune: { en: "imagination, ideals and uncertainty", fr: "l’imagination, l’idéal et le flou" },
  pluto: { en: "power, intensity and deep change", fr: "le pouvoir, l’intensité et la transformation profonde" },
  chiron: { en: "old wounds and the skill of healing them", fr: "les blessures anciennes et l’art de les soigner" },
  northnode: { en: "growth direction and unfamiliar lessons", fr: "la direction de croissance et les leçons nouvelles" },
  southnode: { en: "familiar habits and inherited skills", fr: "les habitudes familières et les acquis" },
  lilith: { en: "what is refused, raw and untamed", fr: "ce qui est refusé, brut et insoumis" },
  vertex: { en: "fated-feeling encounters", fr: "les rencontres qui semblent destinées" },
  antivertex: { en: "self-directed choices", fr: "les choix que l’on fait soi-même" },
  fortune: { en: "material well-being and luck", fr: "le bien-être matériel et la chance" },
  spirit: { en: "intentions, will and vocation", fr: "l’intention, la volonté et la vocation" },
  ceres: { en: "nurturing, food and care", fr: "le soin, la nourriture et la protection" },
  pallas: { en: "strategy, patterns and craft", fr: "la stratégie, les schémas et le savoir-faire" },
  juno: { en: "commitment and partnership", fr: "l’engagement et le couple" },
  vesta: { en: "focus, devotion and dedicated work", fr: "la concentration, la dévotion et le travail dédié" },
  eris: { en: "discord and the fight for recognition", fr: "la discorde et la lutte pour être reconnu" },
  sedna: { en: "deep isolation and long cycles", fr: "l’isolement profond et les cycles longs" },
  ascendant: { en: "self-presentation, body and first approach", fr: "la présentation de soi, le corps et la première approche" },
  midheaven: { en: "career, reputation and public direction", fr: "la carrière, la réputation et l’orientation publique" },
  descendant: { en: "partners and one-to-one relationships", fr: "les partenaires et les relations à deux" },
  ic: { en: "home, family and roots", fr: "le foyer, la famille et les racines" },
};

export const TRANSIT_ABOUT: Bi = {
  en: "A transit is where a planet is today compared with your birth chart. When a moving planet reaches an exact angle to one of your natal planets or angles, astrologers read it as a period when that part of your chart is activated. Slow planets make long, noticeable periods; fast ones pass in hours or days.",
  fr: "Un transit, c’est la position actuelle d’une planète comparée à votre thème de naissance. Quand une planète en mouvement forme un angle exact avec une de vos planètes ou un de vos angles natals, on lit une période où cette partie du thème est activée. Les planètes lentes font des périodes longues et marquées ; les rapides passent en quelques heures ou jours.",
};

/** How long a transit of each body lasts, and what kind of period it tends to mark. */
export const TRANSIT_PACE: Partial<Record<BodyId, Bi>> = {
  sun: {
    en: "The Sun moves about 1° a day, so its transits last a day or two and come back every year. They mark moments of attention and energy, such as a birthday (the Sun returning to its natal place).",
    fr: "Le Soleil avance d’environ 1° par jour : ses transits durent un jour ou deux et reviennent chaque année. Ils marquent des moments d’attention et d’énergie, comme l’anniversaire (le Soleil qui revient à sa place natale).",
  },
  moon: {
    en: "The Moon moves about 13° a day and crosses the whole zodiac in about 27 days, so its transits last a few hours. They colour the mood of a day rather than mark events.",
    fr: "La Lune avance d’environ 13° par jour et fait le tour du zodiaque en 27 jours environ : ses transits durent quelques heures. Ils colorent l’humeur d’une journée plus qu’ils ne marquent des événements.",
  },
  mercury: {
    en: "Mercury transits last a day or two, but can repeat three times when Mercury turns retrograde (about three times a year). They show up in conversations, messages, errands and decisions.",
    fr: "Les transits de Mercure durent un jour ou deux, mais peuvent se répéter trois fois quand Mercure rétrograde (environ trois fois par an). Ils se voient dans les conversations, les messages, les démarches et les décisions.",
  },
  venus: {
    en: "Venus transits last a few days, longer around its retrograde every 19 months or so. They tend to show in relationships, social life, spending and pleasure.",
    fr: "Les transits de Vénus durent quelques jours, plus longtemps autour de sa rétrogradation, tous les 19 mois environ. Ils se voient dans les relations, la vie sociale, les dépenses et le plaisir.",
  },
  mars: {
    en: "Mars transits last from a few days to a few weeks (longer during its retrograde every 26 months). They bring energy, impatience or conflict to the area they touch.",
    fr: "Les transits de Mars durent de quelques jours à quelques semaines (plus longtemps pendant sa rétrogradation, tous les 26 mois). Ils apportent de l’énergie, de l’impatience ou du conflit là où ils touchent.",
  },
  jupiter: {
    en: "Jupiter spends about a year in each sign, and its aspects to your chart last a few weeks to a few months. They tend to coincide with growth, opportunities or excess in that area.",
    fr: "Jupiter passe environ un an dans chaque signe, et ses aspects à votre thème durent de quelques semaines à quelques mois. Ils coïncident souvent avec une croissance, des occasions ou des excès dans ce domaine.",
  },
  saturn: {
    en: "Saturn takes about 29 years to go round, so its aspects to your chart last several months, often exact three times because of retrograde motion. They are periods of effort, restructuring and taking responsibility.",
    fr: "Saturne met environ 29 ans à faire le tour : ses aspects à votre thème durent plusieurs mois et sont souvent exacts trois fois à cause de la rétrogradation. Ce sont des périodes d’effort, de restructuration et de responsabilités.",
  },
  uranus: {
    en: "Uranus moves slowly (about 84 years round), so a transit can stay in orb for one to two years. It tends to coincide with sudden changes, breaks with routine and a need for more freedom.",
    fr: "Uranus avance lentement (environ 84 ans pour un tour) : un transit peut rester actif un à deux ans. Il coïncide souvent avec des changements soudains, des ruptures de routine et un besoin de liberté.",
  },
  neptune: {
    en: "Neptune transits can last two years or more. They tend to bring uncertainty, idealism, sensitivity or disillusion to the area they touch, and reward patience more than quick decisions.",
    fr: "Les transits de Neptune peuvent durer deux ans ou plus. Ils apportent souvent de l’incertitude, de l’idéalisme, de la sensibilité ou des désillusions là où ils touchent, et récompensent la patience plus que les décisions rapides.",
  },
  pluto: {
    en: "Pluto transits last two to three years. They are associated with deep, often irreversible change: ending what no longer works, power struggles, and rebuilding from the ground up.",
    fr: "Les transits de Pluton durent deux à trois ans. On les associe à des changements profonds, souvent irréversibles : finir ce qui ne marche plus, des rapports de force, et reconstruire depuis la base.",
  },
  chiron: {
    en: "Chiron transits last many months. They often bring an old sore point back into view, with a chance to handle it more wisely.",
    fr: "Les transits de Chiron durent de nombreux mois. Ils ramènent souvent un vieux point sensible au premier plan, avec l’occasion de le traiter plus sagement.",
  },
  northnode: {
    en: "The lunar nodes move backwards about 1.5° a month; their transits last a few months and are read as meetings with people or events that push you towards growth.",
    fr: "Les nœuds lunaires reculent d’environ 1,5° par mois ; leurs transits durent quelques mois et se lisent comme des rencontres ou des événements qui poussent à grandir.",
  },
  southnode: {
    en: "The South Node always opposes the North Node; its transits are read as a return of familiar patterns that may need to be released.",
    fr: "Le Nœud Sud est toujours opposé au Nœud Nord ; ses transits se lisent comme le retour de schémas familiers qu’il peut être temps de lâcher.",
  },
};

/** How a transit aspect tends to feel. {moving} = transiting body keywords, {natal} = the natal body’s short phrase. */
export const TRANSIT_FAMILY: Record<AspectFamily, Bi> = {
  blend: {
    en: "The transit sits right on this point, so the two combine: {moving} is added directly to {natal}. Conjunctions often mark beginnings in the area they touch.",
    fr: "Le transit se pose exactement sur ce point, les deux se combinent : {moving} s’ajoute directement à {natal}. Une conjonction marque souvent un début dans le domaine touché.",
  },
  flow: {
    en: "This is a supportive angle: {moving} makes it easier to use {natal}. Easy transits pass quietly unless you act on them, so it is a good moment to start or ask for something.",
    fr: "C’est un angle favorable : {moving} vous aide à utiliser {natal}. Les transits faciles passent inaperçus si l’on n’en fait rien ; c’est un bon moment pour lancer ou demander quelque chose.",
  },
  tension: {
    en: "This is a challenging angle: {moving} puts pressure on {natal}. It often shows as a decision, a conflict or a demand that cannot be avoided, and tends to leave a lasting change once it is dealt with.",
    fr: "C’est un angle exigeant : {moving} met {natal} sous pression. Cela se voit souvent comme une décision, un conflit ou une exigence impossible à éviter, et laisse en général un changement durable une fois traité.",
  },
};

export const PROGRESSION_ABOUT: Bi = {
  en: "Secondary progressions count each day after birth as one year of life: the sky 30 days after you were born describes you at age 30. They move slowly and describe inner development — how your character matures — rather than outside events.",
  fr: "Les progressions secondaires comptent chaque jour après la naissance comme une année de vie : le ciel 30 jours après votre naissance vous décrit à 30 ans. Elles avancent lentement et décrivent une évolution intérieure — la façon dont le caractère mûrit — plus que des événements extérieurs.",
};

export const PROGRESSED_PACE: Partial<Record<BodyId, Bi>> = {
  sun: {
    en: "The progressed Sun moves about 1° a year and changes sign roughly every 30 years. Each change of sign is read as a shift in what you identify with and aim for.",
    fr: "Le Soleil progressé avance d’environ 1° par an et change de signe environ tous les 30 ans. Chaque changement de signe se lit comme un déplacement de ce à quoi vous vous identifiez.",
  },
  moon: {
    en: "The progressed Moon moves about 1° a month and changes sign every two and a half years. It is the most noticeable progression: it describes the emotional climate of each chapter, and returns to its natal place around ages 27 and 55.",
    fr: "La Lune progressée avance d’environ 1° par mois et change de signe tous les deux ans et demi. C’est la progression la plus sensible : elle décrit le climat émotionnel de chaque chapitre et revient à sa place natale vers 27 et 55 ans.",
  },
  mercury: {
    en: "Progressed Mercury moves between about 0° and 2° a year; when it changes sign or direction, the way you think and communicate tends to change too.",
    fr: "Mercure progressé avance de 0 à 2° environ par an ; quand il change de signe ou de sens, la façon de penser et de communiquer change souvent aussi.",
  },
  venus: {
    en: "Progressed Venus moves up to about 1.25° a year; its changes of sign or direction are read as changes in taste, values and what you want from relationships.",
    fr: "Vénus progressée avance jusqu’à 1,25° environ par an ; ses changements de signe ou de sens se lisent comme une évolution des goûts, des valeurs et des attentes amoureuses.",
  },
  mars: {
    en: "Progressed Mars moves less than 1° a year, so it may change sign only once or twice in a lifetime; that change is read as a shift in how you pursue goals.",
    fr: "Mars progressé avance de moins de 1° par an : il ne change parfois de signe qu’une ou deux fois dans une vie, et ce changement se lit comme une nouvelle façon de poursuivre ses buts.",
  },
  ascendant: {
    en: "The progressed Ascendant moves roughly 1° a year (it varies with latitude); a change of sign is read as a change in how you present yourself.",
    fr: "L’Ascendant progressé avance d’environ 1° par an (cela dépend de la latitude) ; un changement de signe se lit comme un changement dans la façon de se présenter.",
  },
  midheaven: {
    en: "The progressed Midheaven moves about 1° a year; its aspects to natal planets are often read alongside changes in career or public role.",
    fr: "Le Milieu du Ciel progressé avance d’environ 1° par an ; ses aspects aux planètes natales accompagnent souvent des changements de carrière ou de rôle public.",
  },
};

/** How a progressed-to-natal aspect is read. Same placeholders as TRANSIT_FAMILY. */
export const PROGRESSED_FAMILY: Record<AspectFamily, Bi> = {
  blend: {
    en: "The progressed body reaches this natal point: {moving} merges with {natal}. Progressed conjunctions build over a year or more and often mark the start of a new inner chapter.",
    fr: "Le point progressé rejoint ce point natal : {moving} fusionne avec {natal}. Les conjonctions progressées se construisent sur un an ou plus et marquent souvent le début d’un nouveau chapitre intérieur.",
  },
  flow: {
    en: "A supportive progression: {moving} develops in harmony with {natal}. It describes a period in which growth in this area comes fairly naturally.",
    fr: "Une progression favorable : {moving} évolue en accord avec {natal}. Elle décrit une période où la croissance dans ce domaine vient assez naturellement.",
  },
  tension: {
    en: "A demanding progression: {moving} is at odds with {natal}. It describes a slow inner tension that asks you to adjust how you handle this part of life.",
    fr: "Une progression exigeante : {moving} entre en tension avec {natal}. Elle décrit une tension intérieure lente qui demande d’ajuster la façon de vivre ce domaine.",
  },
};

export const SYNASTRY_ABOUT: Bi = {
  en: "Synastry compares two birth charts by measuring the aspects between one person’s planets and the other’s. It describes where two people connect easily, where they stimulate or irritate each other, and what each brings out in the other — not whether a relationship will work.",
  fr: "La synastrie compare deux thèmes de naissance en mesurant les aspects entre les planètes de l’un et celles de l’autre. Elle décrit où deux personnes se rejoignent facilement, où elles se stimulent ou s’agacent, et ce que chacune éveille chez l’autre — pas si la relation va marcher.",
};

/** Cross-chart aspect. {a} and {b} = names; {aBody} / {bBody} = keyword phrases. */
export const SYNASTRY_FAMILY: Record<AspectFamily, Bi> = {
  blend: {
    en: "{a}’s {aBody} and {b}’s {bBody} meet at the same point, so each strongly feels the other in this area. Conjunctions are among the most noticeable contacts between two charts.",
    fr: "Chez {a}, {aBody} et chez {b}, {bBody} se rejoignent au même point : chacun ressent fortement l’autre dans ce domaine. Les conjonctions sont parmi les contacts les plus sensibles entre deux thèmes.",
  },
  flow: {
    en: "{a}’s {aBody} and {b}’s {bBody} support each other: this is an area where you understand each other without much effort and can build something together.",
    fr: "Chez {a}, {aBody} et chez {b}, {bBody} se soutiennent : c’est un domaine où vous vous comprenez sans grand effort et où vous pouvez construire ensemble.",
  },
  tension: {
    en: "{a}’s {aBody} and {b}’s {bBody} rub against each other: attraction and irritation can come together here. Naming the difference openly usually turns this friction into something useful.",
    fr: "Chez {a}, {aBody} et chez {b}, {bBody} se frottent : attirance et agacement peuvent aller ensemble ici. Nommer la différence ouvertement transforme en général cette friction en quelque chose d’utile.",
  },
};

export const COMPOSITE_ABOUT: Bi = {
  en: "A composite chart takes the midpoint between two people’s planets (for example, halfway between both Suns) and reads the result as one chart for the relationship itself. It describes the relationship’s own purpose and style rather than either person.",
  fr: "Un thème composite prend le point médian entre les planètes de deux personnes (par exemple, à mi-chemin entre les deux Soleils) et lit le résultat comme le thème de la relation elle-même. Il décrit le but et le style propres à la relation, plutôt que chacune des deux personnes.",
};

export const TIMING_ABOUT: Bi = {
  en: "The timing view lists the dates when transiting planets make an exact aspect to your birth chart. The effect usually starts before and fades after the exact date; slow planets can be exact more than once because of retrograde motion.",
  fr: "La vue Moments liste les dates où les planètes en transit forment un aspect exact à votre thème. L’effet commence en général avant la date exacte et s’estompe après ; les planètes lentes peuvent être exactes plusieurs fois à cause de la rétrogradation.",
};

export const ORB_ABOUT: Bi = {
  en: "The orb is how far an aspect is from exact, in degrees: 0° is exact, and the smaller the orb the stronger the aspect is felt. An applying aspect is still getting closer to exact; a separating one has passed its exact point.",
  fr: "L’orbe est l’écart d’un aspect par rapport à l’exactitude, en degrés : 0° est exact, et plus l’orbe est petit, plus l’aspect se fait sentir. Un aspect applicatif se rapproche encore de l’exactitude ; un aspect séparatif l’a déjà dépassée.",
};
