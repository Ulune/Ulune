import type { Bi } from "./types";

/*
 * The calendar's reading text (parts 55–56 of the launch plan): what each
 * kind of sky event is, in plain words first, then how astrologers read it.
 * Slots: {body} a planet's name, {keywords} what it stands for, {orb} a
 * distance in degrees.
 */

/** New Moon, First quarter, Full Moon, Last quarter. */
export const CAL_PHASE: [Bi, Bi, Bi, Bi] = [
  {
    en: "The Moon passes between the Earth and the Sun and shows us its dark side, so it cannot be seen. Astrologers read the New Moon as a start: a moment to set an intention or begin something in the part of life its sign describes.",
    fr: "La Lune passe entre la Terre et le Soleil et nous montre sa face sombre\u202f: elle est invisible. On lit la Nouvelle Lune comme un départ\u202f: un moment pour poser une intention ou commencer quelque chose dans le domaine que décrit son signe.",
  },
  {
    en: "The Moon is 90° ahead of the Sun, half lit and growing, high in the evening sky. Traditionally a point of effort: what began at the New Moon meets its first obstacle and asks for a decision.",
    fr: "La Lune a 90° d’avance sur le Soleil, à moitié éclairée et croissante, haute dans le ciel du soir. Traditionnellement, un point d’effort\u202f: ce qui a commencé à la Nouvelle Lune rencontre son premier obstacle et demande une décision.",
  },
  {
    en: "The Moon stands opposite the Sun, fully lit, rising as the Sun sets. Astrologers read it as a peak: things come to light, feelings run high, and what began two weeks earlier shows its results.",
    fr: "La Lune fait face au Soleil, pleinement éclairée\u202f; elle se lève quand le Soleil se couche. On la lit comme un sommet\u202f: les choses se révèlent, les émotions sont vives, et ce qui a commencé deux semaines plus tôt montre ses résultats.",
  },
  {
    en: "The Moon is 90° behind the Sun, half lit and shrinking, seen in the morning. A time to sort, finish and let go before the next New Moon.",
    fr: "La Lune a 90° de retard sur le Soleil, à moitié éclairée et décroissante, visible le matin. Un temps pour trier, terminer et lâcher prise avant la prochaine Nouvelle Lune.",
  },
];

export const CAL_ECLIPSE: Record<"solar" | "lunar", Bi> = {
  solar: {
    en: "A New Moon close enough to the lunar nodes for the Moon to hide part or all of the Sun, seen from somewhere on Earth. Astrologers read an eclipse as a stronger New Moon whose themes unfold over the following months, most of all where it touches your chart.",
    fr: "Une Nouvelle Lune assez proche des nœuds lunaires pour que la Lune cache une partie ou la totalité du Soleil, vue d’un endroit de la Terre. On lit une éclipse comme une Nouvelle Lune renforcée dont les thèmes se déploient sur les mois suivants, surtout là où elle touche votre thème.",
  },
  lunar: {
    en: "A Full Moon close enough to the lunar nodes for the Moon to pass through the Earth’s shadow. Astrologers read it as a stronger Full Moon: an ending or a revelation whose effects are felt for months.",
    fr: "Une Pleine Lune assez proche des nœuds lunaires pour que la Lune traverse l’ombre de la Terre. On la lit comme une Pleine Lune renforcée\u202f: une fin ou une révélation dont les effets se font sentir pendant des mois.",
  },
};

export const CAL_MAGNITUDE: Record<"solar" | "lunar", Bi> = {
  solar: {
    en: "The magnitude is the share of the Sun’s width the Moon covers at the eclipse’s greatest point: 1 or more is total.",
    fr: "La magnitude est la part du diamètre du Soleil que la Lune couvre au maximum de l’éclipse\u202f: 1 ou plus, elle est totale.",
  },
  lunar: {
    en: "The magnitude is the share of the Moon’s width inside the Earth’s shadow at the eclipse’s greatest point: 1 or more is total.",
    fr: "La magnitude est la part du diamètre de la Lune plongée dans l’ombre de la Terre au maximum de l’éclipse\u202f: 1 ou plus, elle est totale.",
  },
};

export const CAL_STATION: Record<"rx" | "direct", Bi> = {
  rx: {
    en: "Seen from the Earth, {body} seems to stop, then to move backwards through the zodiac for a while (it does not really turn back: the Earth overtakes it, or it overtakes the Earth). Astrologers read a retrograde period as a time to review and rework what the planet stands for ({keywords}) rather than to launch it; the days around the station are the strongest.",
    fr: "Vu de la Terre, {body} semble s’arrêter, puis reculer dans le zodiaque pendant un temps (sans vraiment faire demi-tour\u202f: la Terre le dépasse, ou il dépasse la Terre). On lit une rétrogradation comme un temps pour revoir et retravailler ce que la planète représente ({keywords}) plutôt que pour le lancer\u202f; les jours autour de la station sont les plus forts.",
  },
  direct: {
    en: "{body} seems to stop again, then moves forward. What was reviewed during the retrograde period can go ahead, though it takes a few weeks to pass the degree where the retrograde began.",
    fr: "{body} semble s’arrêter de nouveau, puis repart vers l’avant. Ce qui a été revu pendant la rétrogradation peut avancer, même s’il faut quelques semaines pour repasser le degré où elle avait commencé.",
  },
};

export const CAL_INGRESS: Record<"forward" | "back", Bi> = {
  forward: {
    en: "{body} leaves one sign for the next. The sign colours how everyone lives what the planet stands for: {keywords}. Slow planets stay years in a sign, so their changes mark a change of climate; fast ones move on every few weeks.",
    fr: "{body} passe d’un signe au suivant. Le signe colore la façon dont chacun vit ce que la planète représente\u202f: {keywords}. Les planètes lentes restent des années dans un signe, leurs changements marquent un changement de climat\u202f; les rapides repartent toutes les quelques semaines.",
  },
  back: {
    en: "{body}, moving retrograde, slips back into the sign it had left: that sign’s themes come back for a last review before it moves on again.",
    fr: "{body}, en rétrogradation, revient dans le signe précédent\u202f: ses thèmes reviennent pour une dernière révision avant de repartir.",
  },
};

/** March equinox, June solstice, September equinox, December solstice. */
export const CAL_SEASON: [Bi, Bi, Bi, Bi] = [
  {
    en: "The Sun enters Aries: day and night are equal everywhere, spring begins in the northern hemisphere and autumn in the southern. It is the start of the tropical zodiac and of the astrological year.",
    fr: "Le Soleil entre en Bélier\u202f: le jour et la nuit sont égaux partout, le printemps commence dans l’hémisphère nord et l’automne dans l’hémisphère sud. C’est le début du zodiaque tropical et de l’année astrologique.",
  },
  {
    en: "The Sun enters Cancer: the longest day in the northern hemisphere and the start of its summer, the shortest in the southern and the start of its winter.",
    fr: "Le Soleil entre en Cancer\u202f: le jour le plus long dans l’hémisphère nord et le début de son été, le plus court dans l’hémisphère sud et le début de son hiver.",
  },
  {
    en: "The Sun enters Libra: day and night are equal again, autumn begins in the northern hemisphere and spring in the southern.",
    fr: "Le Soleil entre en Balance\u202f: le jour et la nuit sont de nouveau égaux, l’automne commence dans l’hémisphère nord et le printemps dans l’hémisphère sud.",
  },
  {
    en: "The Sun enters Capricorn: the shortest day in the northern hemisphere and the start of its winter, the longest in the southern and the start of its summer.",
    fr: "Le Soleil entre en Capricorne\u202f: le jour le plus court dans l’hémisphère nord et le début de son hiver, le plus long dans l’hémisphère sud et le début de son été.",
  },
];

export const CAL_VOID: Bi = {
  en: "After its last major aspect in a sign, the Moon is said to be void of course until it enters the next one. Traditionally what starts then tends to go nowhere: a time for rest, routine and reflection rather than launches and big decisions.",
  fr: "Après son dernier aspect majeur dans un signe, la Lune est dite vide de course jusqu’à son entrée dans le suivant. Traditionnellement, ce qui commence alors n’aboutit guère\u202f: un temps pour le repos, la routine et la réflexion plutôt que pour les lancements et les grandes décisions.",
};

export const CAL_VOID_METHOD: Bi = {
  en: "Counted with the five major aspects (conjunction, sextile, square, trine, opposition) to the Sun and the planets out to Pluto, the usual modern rule.",
  fr: "Calculé avec les cinq aspects majeurs (conjonction, sextile, carré, trigone, opposition) au Soleil et aux planètes jusqu’à Pluton, la règle moderne habituelle.",
};

export const CAL_SKY_ASPECT: Bi = {
  en: "Two planets of the sky meet at an exact angle. It is the same for everyone and sets a tone for the day more than a personal event; it concerns you more when one of the two also touches your chart.",
  fr: "Deux planètes du ciel se rejoignent à un angle exact. C’est le même pour tous et cela donne un ton à la journée plus qu’un événement personnel\u202f; vous êtes davantage concerné quand l’une des deux touche aussi votre thème.",
};

export const CAL_WINDOW: Bi = {
  en: "A slow planet stays within 1° of this aspect for weeks or months, and can be exact more than once as it turns retrograde and direct. The whole period counts; the exact dates are its peaks.",
  fr: "Une planète lente reste à moins de 1° de cet aspect pendant des semaines ou des mois, et peut être exacte plusieurs fois en devenant rétrograde puis directe. Toute la période compte\u202f; les dates exactes en sont les sommets.",
};

export const CAL_NEAR_MISS: Bi = {
  en: "It comes within {orb} of exact and turns back before reaching it: a near miss, felt as a theme that approaches without quite landing.",
  fr: "Elle arrive à {orb} de l’exactitude et repart avant de l’atteindre\u202f: un aspect frôlé, vécu comme un thème qui approche sans tout à fait se poser.",
};

export const CALENDAR_ABOUT: Bi = {
  en: "The calendar shows the sky day by day (the Moon’s phase and sign, planets changing sign or direction, eclipses) and, with a chart open, the dates your transits are exact. The sky is the same for everyone and comes by date; your transits are worked out on this device.",
  fr: "Le calendrier montre le ciel jour après jour (la phase et le signe de la Lune, les planètes qui changent de signe ou de sens, les éclipses) et, avec un thème ouvert, les dates où vos transits sont exacts. Le ciel est le même pour tous et arrive par date\u202f; vos transits sont calculés sur cet appareil.",
};

/** The Moon of a day between the exact phases: waxing crescent, waxing gibbous, waning gibbous, waning crescent. */
export const CAL_DAILY_PHASE: [Bi, Bi, Bi, Bi] = [
  {
    en: "The Moon is less than half lit and growing, seen after sunset. Traditionally a time of gathering: what began at the New Moon takes shape and needs feeding.",
    fr: "La Lune est éclairée à moins de moitié et croît, visible après le coucher du soleil. Traditionnellement, un temps d’élan\u202f: ce qui a commencé à la Nouvelle Lune prend forme et demande à être nourri.",
  },
  {
    en: "More than half lit and still growing, the Moon rises in the afternoon and shines most of the night. A time for adjusting and refining before the Full Moon brings things to a head.",
    fr: "Éclairée à plus de moitié et toujours croissante, la Lune se lève l’après-midi et brille presque toute la nuit. Un temps pour ajuster et affiner avant que la Pleine Lune ne fasse aboutir les choses.",
  },
  {
    en: "Past full and shrinking, the Moon rises later each evening. Traditionally a time to share what has been learnt and to take stock of what the Full Moon showed.",
    fr: "Passé la pleine lune, elle décroît et se lève chaque soir plus tard. Traditionnellement, un temps pour partager ce qui a été appris et faire le point sur ce que la Pleine Lune a montré.",
  },
  {
    en: "A thin crescent before dawn, the Moon’s light is almost gone. The last days of the cycle, read as a time for rest, release and quiet preparation for the New Moon.",
    fr: "Mince croissant avant l’aube, la lumière de la Lune est presque éteinte. Les derniers jours du cycle, lus comme un temps de repos, de lâcher-prise et de préparation tranquille avant la Nouvelle Lune.",
  },
];

/** A line per type of eclipse, solar or lunar. */
export const CAL_ECLIPSE_TYPE: Record<"total" | "annular" | "hybrid" | "partial" | "penumbral", Bi> = {
  total: {
    en: "Total: the Moon covers the whole Sun (solar) or passes wholly into the Earth’s shadow (lunar).",
    fr: "Totale\u202f: la Lune couvre tout le Soleil (solaire) ou entre tout entière dans l’ombre de la Terre (lunaire).",
  },
  annular: {
    en: "Annular: the Moon, too far from the Earth to cover the Sun, leaves a ring of sunlight around it.",
    fr: "Annulaire\u202f: la Lune, trop loin de la Terre pour couvrir le Soleil, laisse un anneau de lumière autour d’elle.",
  },
  hybrid: {
    en: "Hybrid: annular in some places along its path and total in others.",
    fr: "Hybride\u202f: annulaire à certains endroits de son passage, totale à d’autres.",
  },
  partial: {
    en: "Partial: the Moon covers only part of the Sun (solar), or only part of the Moon enters the Earth’s shadow (lunar).",
    fr: "Partielle\u202f: la Lune ne couvre qu’une partie du Soleil (solaire), ou une partie seulement de la Lune entre dans l’ombre de la Terre (lunaire).",
  },
  penumbral: {
    en: "Penumbral: the Moon passes only through the Earth’s faint outer shadow, a slight dimming that is easy to miss.",
    fr: "Pénombrale\u202f: la Lune ne traverse que la pénombre de la Terre, un léger assombrissement facile à manquer.",
  },
};

/** Each planet’s retrograde periods in the sky: how often, how long, how they are read. */
export const CAL_RETRO: Record<"mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "chiron", Bi> = {
  mercury: {
    en: "Mercury turns retrograde three or four times a year, for about three weeks each time. The best-known retrograde: astrologers advise checking messages, plans and travel, and going back over things (re-reading, repairing, reconnecting) rather than signing and launching.",
    fr: "Mercure rétrograde trois ou quatre fois par an, environ trois semaines à chaque fois. La rétrogradation la plus connue\u202f: on conseille de vérifier messages, projets et voyages, et de revenir sur les choses (relire, réparer, renouer) plutôt que de signer ou de lancer.",
  },
  venus: {
    en: "Venus turns retrograde about every eighteen months, for about six weeks. Read as a time to reconsider relationships, money and what you value; old attachments may come back, and new commitments are best given time.",
    fr: "Vénus rétrograde environ tous les dix-huit mois, pendant six semaines. On la lit comme un temps pour reconsidérer les relations, l’argent et ce qui compte\u202f; d’anciens liens peuvent revenir, et mieux vaut laisser du temps aux nouveaux engagements.",
  },
  mars: {
    en: "Mars turns retrograde about every two years, for two to two and a half months. Read as a time when drive turns inward: effort goes to unfinished fights and projects rather than new ones, and frustration is best spent revising the plan.",
    fr: "Mars rétrograde environ tous les deux ans, pendant deux mois à deux mois et demi. On le lit comme un temps où l’élan se retourne vers l’intérieur\u202f: l’effort va aux combats et aux projets inachevés plutôt qu’aux nouveaux, et mieux vaut employer la frustration à revoir le plan.",
  },
  jupiter: {
    en: "Jupiter turns retrograde once a year, for about four months. Read as a time to grow inward: revising beliefs, plans and the terms of an opportunity rather than expanding.",
    fr: "Jupiter rétrograde une fois par an, pendant environ quatre mois. On le lit comme un temps pour grandir de l’intérieur\u202f: revoir ses convictions, ses projets et les conditions d’une occasion plutôt que s’étendre.",
  },
  saturn: {
    en: "Saturn turns retrograde once a year, for about four and a half months. Read as a time to review structures and commitments: what holds, what needs repair, which rules are still yours.",
    fr: "Saturne rétrograde une fois par an, pendant environ quatre mois et demi. On le lit comme un temps pour revoir les structures et les engagements\u202f: ce qui tient, ce qui demande réparation, quelles règles sont encore les vôtres.",
  },
  uranus: {
    en: "Uranus turns retrograde once a year, for about five months. Read as a time when the need for change works inside before it shows: ideas of freedom are tested and reshaped.",
    fr: "Uranus rétrograde une fois par an, pendant environ cinq mois. On le lit comme un temps où le besoin de changement travaille à l’intérieur avant de se montrer\u202f: les idées de liberté sont mises à l’épreuve et remodelées.",
  },
  neptune: {
    en: "Neptune turns retrograde once a year, for about five months. Read as a time when illusions thin out and dreams and ideals are looked at more soberly.",
    fr: "Neptune rétrograde une fois par an, pendant environ cinq mois. On le lit comme un temps où les illusions s’amincissent, et où rêves et idéaux sont regardés plus sobrement.",
  },
  pluto: {
    en: "Pluto turns retrograde once a year, for about five months. Read as a time of inner reckoning with power and control, when deep change is digested before it is acted on.",
    fr: "Pluton rétrograde une fois par an, pendant environ cinq mois. On le lit comme un temps d’examen intérieur du pouvoir et du contrôle, où les transformations profondes se digèrent avant de se vivre au-dehors.",
  },
  chiron: {
    en: "Chiron turns retrograde once a year, for about five months. Read as a time to revisit old wounds with more patience, and to learn how to tend them.",
    fr: "Chiron rétrograde une fois par an, pendant environ cinq mois. On le lit comme un temps pour revenir sur les blessures anciennes avec plus de patience, et apprendre à en prendre soin.",
  },
};

/** The Moon’s sign for everyone, for the two and a half days it stays there. */
export const CAL_MOON_SIGN: Record<"aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo" | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces", Bi> = {
  aries: {
    en: "Moods move fast and people act on impulse: good for starting, less so for patience.",
    fr: "Les humeurs vont vite et l’on agit sur un coup de tête\u202f: propice aux débuts, moins à la patience.",
  },
  taurus: {
    en: "A slower, steadier mood that favours comfort, food, the body and finishing what is under way.",
    fr: "Une humeur plus lente et plus stable, qui favorise le confort, la table, le corps et ce qu’on achève.",
  },
  gemini: {
    en: "Curious and talkative: good for messages, errands, reading and many small things at once.",
    fr: "Curieuse et bavarde\u202f: propice aux messages, aux courses, à la lecture et à mille petites choses à la fois.",
  },
  cancer: {
    en: "Feelings run close to the surface; home, family and care come first.",
    fr: "Les émotions affleurent\u202f; le foyer, la famille et le soin passent en premier.",
  },
  leo: {
    en: "Warm and expressive: people want to be seen, to play and to create.",
    fr: "Chaleureuse et expressive\u202f: on a envie d’être vu, de jouer et de créer.",
  },
  virgo: {
    en: "Practical and precise: good for sorting, cleaning, health and details.",
    fr: "Pratique et précise\u202f: propice au tri, au rangement, à la santé et aux détails.",
  },
  libra: {
    en: "Sociable and conciliatory: good for talks, agreements and beauty, harder for decisions.",
    fr: "Sociable et conciliante\u202f: propice aux échanges, aux accords et à la beauté, moins aux décisions.",
  },
  scorpio: {
    en: "Intense and private: feelings go deep, and so does focus.",
    fr: "Intense et secrète\u202f: les émotions vont en profondeur, la concentration aussi.",
  },
  sagittarius: {
    en: "Restless and hopeful: good for plans, learning, travel and open air.",
    fr: "Remuante et confiante\u202f: propice aux projets, à l’étude, aux voyages et au grand air.",
  },
  capricorn: {
    en: "Sober and dutiful: good for work, structure and long plans.",
    fr: "Sobre et tournée vers le devoir\u202f: propice au travail, à l’organisation et aux projets de longue haleine.",
  },
  aquarius: {
    en: "Detached and inventive: good for friends, groups, ideas and doing things differently.",
    fr: "Détachée et inventive\u202f: propice aux amis, aux groupes, aux idées et aux façons de faire nouvelles.",
  },
  pisces: {
    en: "Dreamy and sensitive: good for rest, art, music and kindness, less for sharp plans.",
    fr: "Rêveuse et sensible\u202f: propice au repos, à l’art, à la musique et à la bienveillance, moins aux plans précis.",
  },
};

export const CAL_MOON_SIGN_ABOUT: Bi = {
  en: "The Moon changes sign about every two and a half days. Its sign colours everyone’s mood for that time, more than it describes events.",
  fr: "La Lune change de signe environ tous les deux jours et demi. Son signe colore l’humeur de chacun pendant ce temps, plus qu’il ne décrit des événements.",
};

/** Two planets of the sky in aspect, by family. {a} {b}: their names; {ka} {kb}: what they stand for. */
export const CAL_SKY_FAMILY: Record<"blend" | "flow" | "tension", Bi> = {
  blend: {
    en: "{a} and {b} meet: {ka} and {kb} act as one, and a new cycle between them begins.",
    fr: "{a} et {b} se rejoignent\u202f: {ka} et {kb} agissent d’un seul bloc, et un nouveau cycle commence entre eux.",
  },
  flow: {
    en: "{a} and {b} support each other: {ka} and {kb} work together easily, a good moment to use them.",
    fr: "{a} et {b} se soutiennent\u202f: {ka} et {kb} coopèrent facilement, un bon moment pour s’en servir.",
  },
  tension: {
    en: "{a} and {b} pull against each other: {ka} and {kb} ask to be reconciled, and the friction tends to move things forward.",
    fr: "{a} et {b} se contrarient\u202f: {ka} et {kb} demandent à être conciliés, et la friction tend à faire avancer les choses.",
  },
};

/** A sign change, with the sign's own words. {body} {sign} {keywords}. */
export const CAL_INGRESS_SIGN: Bi = {
  en: "In {sign}, what {body} stands for tends to turn {keywords}.",
  fr: "En {sign}, ce que {body} représente prend une couleur de {keywords}.",
};
