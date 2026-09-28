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
    fr: "La Lune passe entre la Terre et le Soleil et nous montre sa face sombre : elle est invisible. On lit la Nouvelle Lune comme un départ : un moment pour poser une intention ou commencer quelque chose dans le domaine que décrit son signe.",
  },
  {
    en: "The Moon is 90° ahead of the Sun, half lit and growing, high in the evening sky. Traditionally a point of effort: what began at the New Moon meets its first obstacle and asks for a decision.",
    fr: "La Lune a 90° d’avance sur le Soleil, à moitié éclairée et croissante, haute dans le ciel du soir. Traditionnellement, un point d’effort : ce qui a commencé à la Nouvelle Lune rencontre son premier obstacle et demande une décision.",
  },
  {
    en: "The Moon stands opposite the Sun, fully lit, rising as the Sun sets. Astrologers read it as a peak: things come to light, feelings run high, and what began two weeks earlier shows its results.",
    fr: "La Lune fait face au Soleil, pleinement éclairée ; elle se lève quand le Soleil se couche. On la lit comme un sommet : les choses se révèlent, les émotions sont vives, et ce qui a commencé deux semaines plus tôt montre ses résultats.",
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
    fr: "Une Pleine Lune assez proche des nœuds lunaires pour que la Lune traverse l’ombre de la Terre. On la lit comme une Pleine Lune renforcée : une fin ou une révélation dont les effets se font sentir pendant des mois.",
  },
};

export const CAL_MAGNITUDE: Record<"solar" | "lunar", Bi> = {
  solar: {
    en: "The magnitude is the share of the Sun’s width the Moon covers at the eclipse’s greatest point: 1 or more is total.",
    fr: "La magnitude est la part du diamètre du Soleil que la Lune couvre au maximum de l’éclipse : 1 ou plus, elle est totale.",
  },
  lunar: {
    en: "The magnitude is the share of the Moon’s width inside the Earth’s shadow at the eclipse’s greatest point: 1 or more is total.",
    fr: "La magnitude est la part du diamètre de la Lune plongée dans l’ombre de la Terre au maximum de l’éclipse : 1 ou plus, elle est totale.",
  },
};

export const CAL_STATION: Record<"rx" | "direct", Bi> = {
  rx: {
    en: "Seen from the Earth, {body} seems to stop, then to move backwards through the zodiac for a while (it does not really turn back: the Earth overtakes it, or it overtakes the Earth). Astrologers read a retrograde period as a time to review and rework what the planet stands for ({keywords}) rather than to launch it; the days around the station are the strongest.",
    fr: "Vu de la Terre, {body} semble s’arrêter, puis reculer dans le zodiaque pendant un temps (sans vraiment faire demi-tour : la Terre le dépasse, ou il dépasse la Terre). On lit une rétrogradation comme un temps pour revoir et retravailler ce que la planète représente ({keywords}) plutôt que pour le lancer ; les jours autour de la station sont les plus forts.",
  },
  direct: {
    en: "{body} seems to stop again, then moves forward. What was reviewed during the retrograde period can go ahead, though it takes a few weeks to pass the degree where the retrograde began.",
    fr: "{body} semble s’arrêter de nouveau, puis repart vers l’avant. Ce qui a été revu pendant la rétrogradation peut avancer, même s’il faut quelques semaines pour repasser le degré où elle avait commencé.",
  },
};

export const CAL_INGRESS: Record<"forward" | "back", Bi> = {
  forward: {
    en: "{body} leaves one sign for the next. The sign colours how everyone lives what the planet stands for: {keywords}. Slow planets stay years in a sign, so their changes mark a change of climate; fast ones move on every few weeks.",
    fr: "{body} passe d’un signe au suivant. Le signe colore la façon dont chacun vit ce que la planète représente : {keywords}. Les planètes lentes restent des années dans un signe, leurs changements marquent un changement de climat ; les rapides repartent toutes les quelques semaines.",
  },
  back: {
    en: "{body}, moving retrograde, slips back into the sign it had left: that sign’s themes come back for a last review before it moves on again.",
    fr: "{body}, en rétrogradation, revient dans le signe précédent : ses thèmes reviennent pour une dernière révision avant de repartir.",
  },
};

/** March equinox, June solstice, September equinox, December solstice. */
export const CAL_SEASON: [Bi, Bi, Bi, Bi] = [
  {
    en: "The Sun enters Aries: day and night are equal everywhere, spring begins in the northern hemisphere and autumn in the southern. It is the start of the tropical zodiac and of the astrological year.",
    fr: "Le Soleil entre en Bélier : le jour et la nuit sont égaux partout, le printemps commence dans l’hémisphère nord et l’automne dans l’hémisphère sud. C’est le début du zodiaque tropical et de l’année astrologique.",
  },
  {
    en: "The Sun enters Cancer: the longest day in the northern hemisphere and the start of its summer, the shortest in the southern and the start of its winter.",
    fr: "Le Soleil entre en Cancer : le jour le plus long dans l’hémisphère nord et le début de son été, le plus court dans l’hémisphère sud et le début de son hiver.",
  },
  {
    en: "The Sun enters Libra: day and night are equal again, autumn begins in the northern hemisphere and spring in the southern.",
    fr: "Le Soleil entre en Balance : le jour et la nuit sont de nouveau égaux, l’automne commence dans l’hémisphère nord et le printemps dans l’hémisphère sud.",
  },
  {
    en: "The Sun enters Capricorn: the shortest day in the northern hemisphere and the start of its winter, the longest in the southern and the start of its summer.",
    fr: "Le Soleil entre en Capricorne : le jour le plus court dans l’hémisphère nord et le début de son hiver, le plus long dans l’hémisphère sud et le début de son été.",
  },
];

export const CAL_VOID: Bi = {
  en: "After its last major aspect in a sign, the Moon is said to be void of course until it enters the next one. Traditionally what starts then tends to go nowhere: a time for rest, routine and reflection rather than launches and big decisions.",
  fr: "Après son dernier aspect majeur dans un signe, la Lune est dite vide de course jusqu’à son entrée dans le suivant. Traditionnellement, ce qui commence alors n’aboutit guère : un temps pour le repos, la routine et la réflexion plutôt que pour les lancements et les grandes décisions.",
};

export const CAL_VOID_METHOD: Bi = {
  en: "Counted with the five major aspects (conjunction, sextile, square, trine, opposition) to the Sun and the planets out to Pluto, the usual modern rule.",
  fr: "Calculé avec les cinq aspects majeurs (conjonction, sextile, carré, trigone, opposition) au Soleil et aux planètes jusqu’à Pluton, la règle moderne habituelle.",
};

export const CAL_SKY_ASPECT: Bi = {
  en: "Two planets of the sky meet at an exact angle. It is the same for everyone and sets a tone for the day more than a personal event; it concerns you more when one of the two also touches your chart.",
  fr: "Deux planètes du ciel se rejoignent à un angle exact. C’est le même pour tous et cela donne un ton à la journée plus qu’un événement personnel ; vous êtes davantage concerné quand l’une des deux touche aussi votre thème.",
};

export const CAL_WINDOW: Bi = {
  en: "A slow planet stays within 1° of this aspect for weeks or months, and can be exact more than once as it turns retrograde and direct. The whole period counts; the exact dates are its peaks.",
  fr: "Une planète lente reste à moins de 1° de cet aspect pendant des semaines ou des mois, et peut être exacte plusieurs fois en devenant rétrograde puis directe. Toute la période compte ; les dates exactes en sont les sommets.",
};

export const CAL_NEAR_MISS: Bi = {
  en: "It comes within {orb} of exact and turns back before reaching it: a near miss, felt as a theme that approaches without quite landing.",
  fr: "Elle arrive à {orb} de l’exactitude et repart avant de l’atteindre : un aspect frôlé, vécu comme un thème qui approche sans tout à fait se poser.",
};

export const CALENDAR_ABOUT: Bi = {
  en: "The calendar shows the sky day by day (the Moon’s phase and sign, planets changing sign or direction, eclipses) and, with a chart open, the dates your transits are exact. The sky is the same for everyone and comes by date; your transits are worked out on this device.",
  fr: "Le calendrier montre le ciel jour après jour (la phase et le signe de la Lune, les planètes qui changent de signe ou de sens, les éclipses) et, avec un thème ouvert, les dates où vos transits sont exacts. Le ciel est le même pour tous et arrive par date ; vos transits sont calculés sur cet appareil.",
};
