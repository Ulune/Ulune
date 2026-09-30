import type { Bi } from "./types";
import type { BodyId } from "@/lib/chart/types";

export type BodyText = {
  /** 2–4 sentences: what it is (astronomy or how it is calculated), then what it represents. */
  what: Bi;
  /** Lower-case noun phrase for generated sentences, no final period ("your drive and…" / « votre élan et… »). */
  short: Bi;
  /**
   * Verb phrase completing "In the 10th house, Mars {inHouse} career and public standing."
   * FR ends with « dans » (or « sur ») so it reads before a noun phrase with an article.
   */
  inHouse: Bi;
  /** How the body tends to show when prominent (on an angle, closely aspected, or in its own sign). */
  example: Bi;
  /** Time round the zodiac, time per sign, retrograde rhythm; for calculated points, how they are derived. */
  cycle: Bi;
};

export const BODY_TEXT: Record<BodyId, BodyText> = {
  sun: {
    what: {
      en: "The Sun is the star at the centre of the solar system; seen from Earth it crosses all twelve signs in a year, so a person’s Sun sign follows from their birthday. Astrologers read it as identity, vitality and purpose: what someone wants to become and be recognised for. It rules Leo, is exalted in Aries and leads the day sect, the planets that work best in daytime charts.",
      fr: "Le Soleil est l’étoile au centre du système solaire\u202f; vu de la Terre, il traverse les douze signes en un an, si bien que le signe solaire découle de la date de naissance. Il représente l’identité, la vitalité et le sens que l’on donne à sa vie\u202f: ce que l’on veut devenir et ce pour quoi l’on veut être reconnu. Il gouverne le Lion, est exalté en Bélier et mène la secte diurne, les planètes les plus à l’aise dans un thème de jour.",
    },
    short: {
      en: "your sense of self and what gives your life direction",
      fr: "votre identité et ce qui donne une direction à votre vie",
    },
    inHouse: {
      en: "centres your sense of self and your need to be recognised on",
      fr: "place votre identité et votre besoin de reconnaissance dans",
    },
    example: {
      en: "With the Sun on the Ascendant or in Leo, someone often takes the lead without being asked: organising the trip, speaking first in a meeting, and feeling flat when their effort goes unnoticed.",
      fr: "Avec le Soleil sur l’Ascendant ou en Lion, une personne prend souvent les choses en main sans qu’on le lui demande\u202f: elle organise le voyage, parle la première en réunion, et perd son entrain quand ses efforts passent inaperçus.",
    },
    cycle: {
      en: "The Sun takes a year to go round the zodiac, about 30 days per sign, at close to one degree a day. It never turns retrograde, and its sign-change dates shift by a day or so between years.",
      fr: "Le Soleil fait le tour du zodiaque en un an, environ 30 jours par signe, à raison d’un degré par jour ou presque. Il n’est jamais rétrograde, et ses dates de changement de signe varient d’un jour environ d’une année à l’autre.",
    },
  },
  moon: {
    what: {
      en: "The Moon is Earth’s natural satellite; it moves faster than any planet, crossing a sign in a little over two days. It describes emotional needs, habits, the body’s rhythms and what makes someone feel safe, patterns often formed early in life. It rules Cancer, is exalted in Taurus and leads the night sect, the planets that work best in night-time charts.",
      fr: "La Lune est le satellite naturel de la Terre\u202f; elle va plus vite que toutes les planètes et traverse un signe en un peu plus de deux jours. Elle décrit les besoins affectifs, les habitudes, les rythmes du corps et ce qui donne un sentiment de sécurité, des schémas souvent formés tôt dans la vie. Elle gouverne le Cancer, est exaltée en Taureau et mène la secte nocturne, les planètes les plus à l’aise dans un thème de nuit.",
    },
    short: {
      en: "your emotional needs and what makes you feel safe",
      fr: "vos besoins affectifs et ce qui vous donne un sentiment de sécurité",
    },
    inHouse: {
      en: "ties your moods, needs and sense of security to",
      fr: "investit vos émotions et votre besoin de sécurité dans",
    },
    example: {
      en: "A strong Moon, on an angle or in Cancer, tends to put moods on show: cooking for friends when anxious, remembering every birthday, needing a quiet evening at home after a crowded week.",
      fr: "Une Lune forte, sur un angle ou en Cancer, rend les humeurs visibles\u202f: cuisiner pour ses amis quand on est inquiet, retenir tous les anniversaires, avoir besoin d’une soirée calme chez soi après une semaine chargée.",
    },
    cycle: {
      en: "The Moon goes round the zodiac in about 27.3 days, spending two to two and a half days in each sign, and never turns retrograde. The phase cycle, new Moon to new Moon, takes about 29.5 days.",
      fr: "La Lune fait le tour du zodiaque en 27,3 jours environ et reste de deux jours à deux jours et demi dans chaque signe\u202f; elle n’est jamais rétrograde. Le cycle des phases, d’une nouvelle lune à la suivante, dure environ 29,5 jours.",
    },
  },
  mercury: {
    what: {
      en: "Mercury is the planet closest to the Sun and stays within 28° of it, so it always sits in the Sun’s sign or a neighbouring one. It stands for thinking, speech, learning and trade: how someone takes in information and passes it on. It rules Gemini and Virgo, is exalted in Virgo, and joins the day or night sect depending on whether it rises before or after the Sun.",
      fr: "Mercure est la planète la plus proche du Soleil et ne s’en écarte jamais de plus de 28°\u202f: il se trouve donc toujours dans le signe du Soleil ou dans un signe voisin. Il représente la pensée, la parole, l’apprentissage et le commerce\u202f: la façon de recevoir l’information et de la transmettre. Il gouverne les Gémeaux et la Vierge, est exalté en Vierge, et rejoint la secte diurne ou nocturne selon qu’il se lève avant ou après le Soleil.",
    },
    short: {
      en: "your way of thinking, learning and communicating",
      fr: "votre façon de penser, d’apprendre et de communiquer",
    },
    inHouse: {
      en: "turns your curiosity, thinking and talk towards",
      fr: "exerce votre curiosité, votre réflexion et votre parole dans",
    },
    example: {
      en: "When Mercury is on an angle or in Gemini or Virgo, it often shows as someone who reads the manual, drafts the group email, or talks a problem through aloud until the answer appears; switching off at night can be harder.",
      fr: "Quand Mercure est sur un angle ou en Gémeaux ou en Vierge, cela donne souvent quelqu’un qui lit le mode d’emploi, rédige le courriel collectif ou réfléchit à voix haute jusqu’à trouver la solution\u202f; déconnecter le soir peut être plus difficile.",
    },
    cycle: {
      en: "Mercury takes about a year to go round the zodiac, staying roughly two weeks to two months in a sign. It turns retrograde three, sometimes four, times a year, for about three weeks each time.",
      fr: "Mercure fait le tour du zodiaque en un an environ et reste de deux semaines à deux mois dans un signe. Il devient rétrograde trois fois par an, parfois quatre, pendant trois semaines environ.",
    },
  },
  venus: {
    what: {
      en: "Venus, second from the Sun and the brightest planet in our sky, stays within about 47° of the Sun as the morning or evening star. It describes attraction, affection, pleasure, taste and what someone values, money and beauty included. It rules Taurus and Libra, is exalted in Pisces and belongs to the night sect; tradition calls it the lesser benefic because it tends to ease and reconcile.",
      fr: "Vénus, deuxième planète à partir du Soleil et la plus brillante de toutes dans notre ciel, ne s’éloigne jamais de plus de 47° environ du Soleil\u202f: c’est l’étoile du matin ou du soir. Elle décrit l’attirance, l’affection, le plaisir, le goût et ce à quoi l’on accorde de la valeur, argent et beauté compris. Elle gouverne le Taureau et la Balance, est exaltée en Poissons et appartient à la secte nocturne\u202f; la tradition l’appelle la petite bénéfique, parce qu’elle tend à adoucir et à réconcilier.",
    },
    short: {
      en: "your way of loving, your tastes and what you value",
      fr: "votre façon d’aimer, vos goûts et ce à quoi vous tenez",
    },
    inHouse: {
      en: "brings affection, charm and a taste for pleasure into",
      fr: "apporte de l’affection, du charme et le goût du plaisir dans",
    },
    example: {
      en: "Venus on an angle or in Taurus or Libra often belongs to the person who smooths tension in a group, notices what everyone is wearing and spends on beauty or comfort; a clear no comes less easily.",
      fr: "Vénus sur un angle ou en Taureau ou en Balance se retrouve souvent chez la personne qui apaise les tensions d’un groupe, remarque la tenue de chacun et dépense pour la beauté ou le confort\u202f; un non franc lui vient moins facilement.",
    },
    cycle: {
      en: "Venus takes about a year to go round the zodiac, usually three to five weeks per sign. About every 19 months it turns retrograde for around six weeks, and can then stay up to four months in one sign.",
      fr: "Vénus fait le tour du zodiaque en un an environ, en général trois à cinq semaines par signe. Tous les 19 mois environ, elle devient rétrograde pendant six semaines et peut alors rester jusqu’à quatre mois dans le même signe.",
    },
  },
  mars: {
    what: {
      en: "Mars, the red planet, is fourth from the Sun. It represents drive, desire, anger and courage: how someone goes after what they want and deals with conflict. It rules Aries and Scorpio, is exalted in Capricorn and belongs to the night sect; tradition calls it the lesser malefic because its heat and sharpness can hurt, though the same qualities protect and get things done.",
      fr: "Mars, la planète rouge, est la quatrième à partir du Soleil. Il représente l’élan, le désir, la colère et le courage\u202f: la façon d’aller chercher ce que l’on veut et de faire face au conflit. Il gouverne le Bélier et le Scorpion, est exalté en Capricorne et appartient à la secte nocturne\u202f; la tradition le nomme petit maléfique, car sa chaleur et son tranchant peuvent blesser, alors que ces mêmes qualités protègent et font avancer les choses.",
    },
    short: {
      en: "your drive and the way you assert yourself",
      fr: "votre élan et votre façon de vous affirmer",
    },
    inHouse: {
      en: "puts energy, ambition and a competitive edge into",
      fr: "met de l’énergie, de l’ambition et un esprit de compétition dans",
    },
    example: {
      en: "Mars on an angle or in Aries or Scorpio often shows as someone who trains hard, says what they think in meetings and starts projects fast; a daily physical outlet helps keep the temper in check.",
      fr: "Mars sur un angle ou en Bélier ou en Scorpion se traduit souvent par quelqu’un qui s’entraîne dur, dit ce qu’il pense en réunion et lance vite ses projets\u202f; une activité physique quotidienne aide à garder son calme.",
    },
    cycle: {
      en: "Mars takes about two years to go round the zodiac, usually six to eight weeks per sign. Roughly every 26 months it turns retrograde for about ten weeks, and may then stay up to eight months in one sign.",
      fr: "Mars fait le tour du zodiaque en deux ans environ, en général six à huit semaines par signe. Tous les 26 mois environ, il devient rétrograde pendant une dizaine de semaines et peut alors rester jusqu’à huit mois dans le même signe.",
    },
  },
  jupiter: {
    what: {
      en: "Jupiter is the largest planet and takes about twelve years to circle the zodiac, spending roughly a year in each sign. Its themes are growth, confidence, generosity, belief and the search for meaning, along with a tendency to excess. It rules Sagittarius and Pisces, is exalted in Cancer and belongs to the day sect; tradition calls it the greater benefic, the planet that most readily brings help and opportunity.",
      fr: "Jupiter, la plus grande planète du système solaire, fait le tour du zodiaque en douze ans environ et passe à peu près un an dans chaque signe. Ses thèmes sont la croissance, la confiance, la générosité, les convictions et la quête de sens, avec un penchant pour l’excès. Il gouverne le Sagittaire et les Poissons, est exalté en Cancer et appartient à la secte diurne\u202f; la tradition le nomme grand bénéfique, la planète qui apporte le plus volontiers aide et occasions.",
    },
    short: {
      en: "your capacity for growth, trust and generosity",
      fr: "votre capacité à grandir, à faire confiance et à donner",
    },
    inHouse: {
      en: "looks for growth, meaning and opportunity in",
      fr: "cherche la croissance, le sens et les occasions dans",
    },
    example: {
      en: "A prominent Jupiter, on an angle or in Sagittarius or Pisces, often gives an easy optimism: opportunities offered through friends, a quick yes to travel or study, and a habit of overcommitting worth keeping an eye on.",
      fr: "Un Jupiter dominant, sur un angle ou en Sagittaire ou en Poissons, donne souvent un optimisme facile\u202f: des occasions qui arrivent par les amis, un oui rapide aux voyages ou aux études, et une tendance à trop s’engager qu’il vaut mieux surveiller.",
    },
    cycle: {
      en: "Jupiter takes about 12 years to go round the zodiac, roughly one year per sign. It turns retrograde for about four months every 13 months.",
      fr: "Jupiter fait le tour du zodiaque en 12 ans environ, soit à peu près un an par signe. Il devient rétrograde pendant quatre mois environ tous les 13 mois.",
    },
  },
  saturn: {
    what: {
      en: "Saturn, the ringed planet, is the farthest of the seven planets known since antiquity. It describes structure, limits, time, responsibility and fear, and the competence built through sustained effort. It rules Capricorn and Aquarius, is exalted in Libra and belongs to the day sect; tradition calls it the greater malefic because it restricts and delays, yet the same limits give things shape and make them last.",
      fr: "Saturne, la planète aux anneaux, est la plus lointaine des sept planètes connues depuis l’Antiquité. Il décrit la structure, les limites, le temps, la responsabilité et la peur, ainsi que la compétence acquise par un effort soutenu. Il gouverne le Capricorne et le Verseau, est exalté en Balance et appartient à la secte diurne\u202f; la tradition le nomme grand maléfique parce qu’il restreint et retarde, mais ces mêmes limites donnent forme aux choses et les font durer.",
    },
    short: {
      en: "your sense of responsibility, your limits and what you build over time",
      fr: "votre sens des responsabilités, vos limites et ce que vous bâtissez avec le temps",
    },
    inHouse: {
      en: "asks for patience, structure and hard-won competence in",
      fr: "demande de la patience, de la rigueur et une compétence durement acquise dans",
    },
    example: {
      en: "People with Saturn on an angle or in Capricorn or Aquarius often take on responsibility early, such as looking after a sibling or working while still at school, and feel more at ease at forty than at twenty.",
      fr: "Les personnes qui ont Saturne sur un angle ou en Capricorne ou en Verseau assument souvent des responsabilités très tôt, comme s’occuper d’un frère ou d’une sœur ou travailler pendant leurs études, et se sentent plus à l’aise à quarante ans qu’à vingt.",
    },
    cycle: {
      en: "Saturn takes about 29.5 years to go round the zodiac, some 2.5 years per sign, and is retrograde about 4.5 months a year. Its return, around ages 29 and 59, is widely read as a time to take stock.",
      fr: "Saturne fait le tour du zodiaque en 29,5 ans environ, soit quelque 2,5 ans par signe, et il est rétrograde environ 4,5 mois par an. Son retour, vers 29 et 59 ans, est souvent vu comme un moment de bilan.",
    },
  },
  uranus: {
    what: {
      en: "Uranus was the first planet found with a telescope, by William Herschel in 1781. It stands for independence, originality, sudden change and the urge to break with what is expected; modern astrologers link it to Aquarius. Because it stays about seven years in a sign, a whole generation shares its sign; its house and its aspects to personal planets and angles are what make it personal.",
      fr: "Uranus est la première planète découverte au télescope, par William Herschel en 1781. Il représente l’indépendance, l’originalité, les changements soudains et le besoin de rompre avec ce qui est attendu\u202f; l’astrologie moderne l’associe au Verseau. Comme il reste environ sept ans dans un signe, toute une génération partage ce signe\u202f; ce sont sa maison et ses aspects aux planètes personnelles et aux angles qui le rendent personnel.",
    },
    short: {
      en: "your need for freedom and your urge to break with routine",
      fr: "votre besoin de liberté et votre envie de rompre avec la routine",
    },
    inHouse: {
      en: "introduces change, independence and sudden turns into",
      fr: "introduit du changement, de l’indépendance et des revirements soudains dans",
    },
    example: {
      en: "When Uranus sits on an angle or close to the Sun or Moon, jobs and cities may change abruptly, rules at home get questioned, and restlessness sets in as soon as a routine becomes predictable.",
      fr: "Quand Uranus se trouve sur un angle ou près du Soleil ou de la Lune, on change parfois brusquement d’emploi ou de ville, on conteste les règles établies, et l’agitation monte dès qu’une routine devient prévisible.",
    },
    cycle: {
      en: "Uranus takes about 84 years to go round the zodiac, around seven years per sign, and is retrograde for about five months each year. Around age 40 it opposes its birth position, a transit linked to midlife change.",
      fr: "Uranus fait le tour du zodiaque en 84 ans environ, soit à peu près sept ans par signe, et il est rétrograde près de cinq mois par an. Vers 40 ans, il s’oppose à sa position de naissance, un transit associé aux remises en question du milieu de vie.",
    },
  },
  neptune: {
    what: {
      en: "Neptune was found in 1846 at a position predicted by calculations from irregularities in Uranus’s orbit. It describes imagination, ideals, compassion and the longing for something beyond everyday life, along with confusion and escapism; in modern astrology it rules Pisces alongside Jupiter. It spends about 14 years in each sign, so the sign describes a generation, while its house and close aspects carry the personal meaning.",
      fr: "Neptune a été découvert en 1846, à l’endroit que des calculs fondés sur les irrégularités de l’orbite d’Uranus avaient prédit. Il décrit l’imagination, l’idéal, la compassion et l’aspiration à ce qui dépasse le quotidien, mais aussi la confusion et la fuite hors du réel\u202f; en astrologie moderne, il gouverne les Poissons aux côtés de Jupiter. Il passe environ quatorze ans dans chaque signe\u202f: le signe décrit donc une génération, tandis que sa maison et ses aspects serrés portent le sens personnel.",
    },
    short: {
      en: "your imagination, your ideals and your sensitivity to what goes unsaid",
      fr: "votre imagination, vos idéaux et votre sensibilité à ce qui n’est pas dit",
    },
    inHouse: {
      en: "adds ideals, sensitivity and a certain haziness to",
      fr: "diffuse de l’idéal, de la sensibilité et un certain flou dans",
    },
    example: {
      en: "Neptune on an angle or tied to the Moon or Venus can look like someone who loses track of time in music or painting, senses what others feel, and needs a reminder to read the details of a contract.",
      fr: "Neptune sur un angle ou relié à la Lune ou à Vénus peut se traduire par quelqu’un qui perd la notion du temps en musique ou en peinture, perçoit ce que ressentent les autres et a besoin qu’on lui rappelle de lire les détails d’un contrat.",
    },
    cycle: {
      en: "Neptune takes about 165 years to go round the zodiac, around 14 years per sign, and is retrograde for a little over five months each year. No one lives through a full cycle.",
      fr: "Neptune fait le tour du zodiaque en 165 ans environ, soit à peu près 14 ans par signe, et il est rétrograde un peu plus de cinq mois par an. Personne ne vit un cycle complet.",
    },
  },
  pluto: {
    what: {
      en: "Pluto, discovered in 1930, was reclassified as a dwarf planet in 2006. Its themes are power, intensity, crisis and deep change: what is hidden and what has to be let go; modern astrologers pair it with Scorpio. Spending 12 to about 32 years in a sign, it marks generations, and it becomes individual mainly through its house and its contacts with personal planets and angles.",
      fr: "Pluton, découvert en 1930, a été reclassé planète naine en 2006. Ses thèmes sont le pouvoir, l’intensité, les crises et les transformations profondes\u202f: ce qui est caché et ce qu’il faut laisser partir\u202f; l’astrologie moderne le rattache au Scorpion. Comme il reste de 12 à 32 ans environ dans un signe, il marque des générations, et prend surtout un sens individuel par sa maison et ses contacts avec les planètes personnelles et les angles.",
    },
    short: {
      en: "your intensity and your capacity for deep change",
      fr: "votre intensité et votre capacité à vous transformer en profondeur",
    },
    inHouse: {
      en: "concentrates intensity, a need for control and deep change in",
      fr: "concentre l’intensité, le besoin de maîtrise et les transformations profondes dans",
    },
    example: {
      en: "With Pluto on an angle or tightly linked to the Sun, Moon or Mars, someone may be drawn to crisis work, research or psychology, guard their private life closely, and start over more than once after major endings.",
      fr: "Avec Pluton sur un angle ou en aspect étroit avec le Soleil, la Lune ou Mars, on peut être attiré par les métiers de crise, la recherche ou la psychologie, protéger farouchement sa vie privée et repartir de zéro plus d’une fois après de grandes fins de cycle.",
    },
    cycle: {
      en: "Pluto takes about 248 years to go round the zodiac. Its orbit is so elongated that it stays about 12 years in Scorpio but over 30 in Taurus; it is retrograde for a little over five months each year.",
      fr: "Pluton fait le tour du zodiaque en 248 ans environ. Son orbite est si allongée qu’il reste environ 12 ans en Scorpion mais plus de 30 ans en Taureau\u202f; il est rétrograde un peu plus de cinq mois par an.",
    },
  },
  chiron: {
    what: {
      en: "Chiron is an icy body found in 1977, orbiting mostly between Saturn and Uranus and named after the centaur of Greek myth, a healer who could not cure his own wound. Astrologically it marks a lasting sore spot and the understanding, often useful to others, that grows from living with it. Its sign is shared by people born within a few years; house and aspects make it personal.",
      fr: "Chiron est un petit corps glacé découvert en 1977, dont l’orbite passe surtout entre Saturne et Uranus\u202f; il porte le nom du centaure de la mythologie grecque, guérisseur incapable de soigner sa propre blessure. En astrologie, il désigne un point sensible durable et la compréhension, souvent précieuse pour les autres, qui naît du fait de vivre avec. Son signe est commun aux personnes nées à quelques années d’intervalle\u202f; sa maison et ses aspects le rendent personnel.",
    },
    short: {
      en: "your most lasting sore spot and what it teaches you",
      fr: "votre blessure la plus durable et ce qu’elle vous apprend",
    },
    inHouse: {
      en: "marks a lasting sore spot, and a skill learned through it, in",
      fr: "signale une blessure durable, et un savoir-faire qui en est né, dans",
    },
    example: {
      en: "Someone with Chiron on an angle or tied to the Sun or Moon may feel unsure in one area for years, such as speaking up or feeling they belong, and later become the person others come to for exactly that.",
      fr: "Avec Chiron sur un angle ou relié au Soleil ou à la Lune, on peut rester longtemps mal à l’aise dans un domaine précis, comme prendre la parole ou se sentir à sa place, puis devenir la personne vers qui les autres se tournent justement pour cela.",
    },
    cycle: {
      en: "Chiron takes about 50 years to go round the zodiac, unevenly: roughly two years in Virgo or Libra, eight or nine in Pisces or Aries. It is retrograde about five months a year; its return comes around age 50.",
      fr: "Chiron fait le tour du zodiaque en 50 ans environ, de façon très inégale\u202f: deux ans environ en Vierge ou en Balance, huit ou neuf ans en Poissons ou en Bélier. Il est rétrograde près de cinq mois par an\u202f; son retour survient vers 50 ans.",
    },
  },
  northnode: {
    what: {
      en: "The North Node is not a body but a point: where the Moon’s orbit crosses the ecliptic, the Sun’s apparent path, heading north. Eclipses happen when a new or full Moon falls near the nodes. Modern astrology reads it as a direction of growth, skills that feel unfamiliar but rewarding; tradition, which called it the Dragon’s Head, said it increases whatever it touches.",
      fr: "Le Nœud Nord n’est pas un astre mais un point\u202f: l’endroit où l’orbite de la Lune croise l’écliptique, la trajectoire apparente du Soleil, en montant vers le nord. Les éclipses se produisent quand une nouvelle ou une pleine lune tombe près des nœuds. L’astrologie moderne y voit une direction de croissance, des aptitudes peu familières mais fécondes\u202f; la tradition, qui l’appelait Tête du Dragon, lui prêtait le pouvoir d’augmenter ce qu’il touche.",
    },
    short: {
      en: "your direction of growth and the unfamiliar skills that draw you",
      fr: "votre axe de progression et les compétences nouvelles qui vous attirent",
    },
    inHouse: {
      en: "points your growth towards",
      fr: "situe ce que vous avez à apprendre dans",
    },
    example: {
      en: "With the North Node on the Ascendant, someone may lean by habit on partners and other people’s opinions, while growth comes from deciding alone, acting first and letting people see who they are.",
      fr: "Avec le Nœud Nord sur l’Ascendant, on s’appuie souvent par habitude sur ses partenaires et sur l’avis des autres, alors que la progression passe par décider seul, agir en premier et se montrer tel qu’on est.",
    },
    cycle: {
      en: "The North Node moves backwards through the zodiac, taking about 18.6 years for a full cycle and roughly a year and a half per sign. The true node used here wobbles around that average and sometimes briefly moves forward.",
      fr: "Le Nœud Nord recule dans le zodiaque\u202f: un cycle complet dure environ 18,6 ans, soit à peu près un an et demi par signe. Le nœud réel utilisé ici oscille autour de cette moyenne et avance parfois brièvement.",
    },
  },
  southnode: {
    what: {
      en: "The South Node is the point exactly opposite the North Node, where the Moon’s orbit crosses the ecliptic heading south; the two always move together. Modern astrology reads it as what comes easily: habits, talents and ways of coping already in place, which can turn into a comfort zone. Tradition called it the Dragon’s Tail and said it diminishes whatever it touches.",
      fr: "Le Nœud Sud est le point exactement opposé au Nœud Nord, là où l’orbite de la Lune croise l’écliptique en descendant vers le sud\u202f; les deux se déplacent toujours ensemble. L’astrologie moderne y voit ce qui vient facilement\u202f: habitudes, talents et façons de faire déjà acquis, qui peuvent devenir une zone de confort. La tradition l’appelait Queue du Dragon et lui prêtait le pouvoir de diminuer ce qu’il touche.",
    },
    short: {
      en: "your familiar habits and the skills you fall back on",
      fr: "vos habitudes familières et les acquis sur lesquels vous vous reposez",
    },
    inHouse: {
      en: "finds old habits and ready-made skills in",
      fr: "révèle vos acquis et vos vieilles habitudes dans",
    },
    example: {
      en: "When the South Node sits on the Midheaven, duty and status roles come easily, such as being the dependable one at work, while growth lies at the other end of the axis: home, family and inner life.",
      fr: "Quand le Nœud Sud se trouve sur le Milieu du Ciel, les rôles de devoir et de statut viennent facilement, comme être la personne fiable au travail, alors que la progression se trouve à l’autre bout de l’axe\u202f: le foyer, la famille et la vie intérieure.",
    },
    cycle: {
      en: "The South Node is always exactly opposite the North Node, so it follows the same backward cycle of about 18.6 years, roughly a year and a half per sign. Nodal returns fall around ages 19, 37 and 56.",
      fr: "Le Nœud Sud est toujours exactement opposé au Nœud Nord\u202f: il recule donc au même rythme, avec un cycle d’environ 18,6 ans et à peu près un an et demi par signe. Les retours nodaux tombent vers 19, 37 et 56 ans.",
    },
  },
  lilith: {
    what: {
      en: "Black Moon Lilith is not a body but a calculated point: the apogee, where the Moon is farthest from Earth in its orbit. The version used here is the true (osculating) point, calculated from the Moon’s actual orbit at birth. Named after a figure of Jewish folklore who refused to submit, it is read as raw desire, anger at being controlled, and what a person was taught to hide.",
      fr: "Lilith, ou Lune noire, n’est pas un astre mais un point calculé\u202f: l’apogée, l’endroit de son orbite où la Lune est au plus loin de la Terre. La version utilisée ici est le point réel (osculateur), calculé à partir de l’orbite effective de la Lune au moment de la naissance. Elle porte le nom d’une figure du folklore juif qui refusait de se soumettre et évoque le désir brut, la colère face au contrôle et ce qu’on a appris à cacher.",
    },
    short: {
      en: "your untamed side and what you refuse to hide",
      fr: "votre part insoumise et ce que vous refusez de cacher",
    },
    inHouse: {
      en: "stirs raw desire and a refusal to be controlled in",
      fr: "fait surgir un désir sans filtre et le refus de toute emprise dans",
    },
    example: {
      en: "Lilith on an angle or tied to Venus or Mars often shows as a refusal to play the role others expect, such as the agreeable partner or the quiet employee, and a strong reaction to being controlled or judged for desire.",
      fr: "Lilith sur un angle ou reliée à Vénus ou à Mars se manifeste souvent par le refus de jouer le rôle attendu, celui du partenaire conciliant ou de l’employé discret, et par une réaction vive face au contrôle ou au jugement porté sur le désir.",
    },
    cycle: {
      en: "The average Black Moon goes round the zodiac in just under nine years, about nine months per sign. The true point used here swings up to 30° either side of that average each month, often moving backwards.",
      fr: "La Lune noire moyenne fait le tour du zodiaque en un peu moins de neuf ans, soit environ neuf mois par signe. Le point réel utilisé ici oscille chaque mois jusqu’à 30° de part et d’autre de cette moyenne et recule souvent.",
    },
  },
  vertex: {
    what: {
      en: "The Vertex is a calculated point: where the prime vertical, the circle running through due east, overhead and due west, crosses the zodiac in the west. Like the angles, it depends on the exact birth time and place. Modern astrologers link it to encounters and events that seem to arrive by chance, often through other people, and feel significant afterwards.",
      fr: "Le Vertex est un point calculé\u202f: l’endroit où le premier vertical, le grand cercle qui passe par l’est, le zénith et l’ouest, croise le zodiaque du côté ouest. Comme les angles, il dépend de l’heure et du lieu exacts de naissance. L’astrologie moderne l’associe aux rencontres et aux événements qui semblent arriver par hasard, souvent par l’intermédiaire d’autres personnes, et qui prennent du sens après coup.",
    },
    short: {
      en: "your chance encounters and the turning points they bring",
      fr: "vos rencontres imprévues et les tournants qu’elles provoquent",
    },
    inHouse: {
      en: "opens the door to unplanned meetings and turning points through",
      fr: "fait naître des rencontres imprévues et des tournants dans",
    },
    example: {
      en: "When a planet sits within a degree or two of the Vertex, what it stands for can arrive through other people: with Venus, meeting a partner because of a missed train or a friend’s last-minute invitation.",
      fr: "Quand une planète se trouve à un ou deux degrés du Vertex, ce qu’elle représente peut arriver par l’intermédiaire des autres\u202f: avec Vénus, rencontrer un partenaire à cause d’un train manqué ou d’une invitation de dernière minute.",
    },
    cycle: {
      en: "The Vertex circles the zodiac once a day as the Earth turns (unevenly near the equator), so it needs an accurate birth time. It always falls on the western side of the chart, usually in houses 5 to 8.",
      fr: "Le Vertex fait le tour du zodiaque une fois par jour avec la rotation de la Terre (de façon irrégulière près de l’équateur) et demande donc une heure de naissance précise. Il se trouve toujours du côté ouest du thème, le plus souvent dans les maisons V à VIII.",
    },
  },
  antivertex: {
    what: {
      en: "The Anti-Vertex is the point exactly opposite the Vertex, where the prime vertical crosses the zodiac in the east. Like the Vertex, it depends on the exact birth time and place. It is a minor point, rarely read alone; those who use it see it as the person’s own side of the Vertex axis: how they respond to what arrives unplanned and act on it.",
      fr: "L’Anti-Vertex est le point exactement opposé au Vertex, là où le premier vertical croise le zodiaque à l’est. Comme le Vertex, il dépend de l’heure et du lieu exacts de naissance. C’est un point mineur, rarement interprété seul\u202f; ceux qui l’utilisent y voient le versant personnel de l’axe du Vertex\u202f: la façon de répondre à ce qui arrive sans prévenir et d’en faire quelque chose.",
    },
    short: {
      en: "your own response to what arrives unplanned",
      fr: "votre propre réponse à ce qui arrive sans prévenir",
    },
    inHouse: {
      en: "engages your own response to chance events in",
      fr: "met en jeu votre propre réponse aux événements imprévus dans",
    },
    example: {
      en: "With a planet close to the Anti-Vertex, a person’s own reflexes shape how chance events unfold: with Mars there, someone might answer an unexpected job offer within the hour and make the change happen themselves.",
      fr: "Avec une planète proche de l’Anti-Vertex, les réflexes propres à la personne orientent le cours des événements imprévus\u202f: avec Mars à cet endroit, on peut répondre dans l’heure à une offre d’emploi inattendue et provoquer soi-même le changement.",
    },
    cycle: {
      en: "The Anti-Vertex is always exactly opposite the Vertex, so it also circles the zodiac once a day and needs an accurate birth time. It falls on the eastern side of the chart, usually in houses 11 to 2.",
      fr: "L’Anti-Vertex est toujours exactement opposé au Vertex\u202f: il fait donc lui aussi le tour du zodiaque une fois par jour et demande une heure de naissance précise. Il se trouve du côté est du thème, le plus souvent dans les maisons XI à II.",
    },
  },
  fortune: {
    what: {
      en: "The Lot of Fortune (or Part of Fortune) is a point from Hellenistic astrology built from the Ascendant, Sun and Moon. In a day chart it lies as far from the Ascendant, in zodiac order, as the Moon is from the Sun; by night the formula is reversed. It describes the body, well-being and material circumstances: what happens to a person, rather than what they choose.",
      fr: "La Part de Fortune (ou Lot de Fortune) est un point de l’astrologie hellénistique construit à partir de l’Ascendant, du Soleil et de la Lune. Dans un thème de jour, elle se trouve aussi loin de l’Ascendant, dans l’ordre des signes, que la Lune l’est du Soleil\u202f; la nuit, la formule s’inverse. Elle décrit le corps, le bien-être et les conditions matérielles\u202f: ce qui arrive à la personne, plutôt que ce qu’elle choisit.",
    },
    short: {
      en: "your well-being, livelihood and material circumstances",
      fr: "votre bien-être, vos moyens d’existence et vos conditions matérielles",
    },
    inHouse: {
      en: "links your well-being and material luck to",
      fr: "ancre votre bien-être et votre chance matérielle dans",
    },
    example: {
      en: "If the Lot of Fortune falls in the 10th house or near the Midheaven, material stability often depends on a public role: income and well-being tend to follow how work and reputation are going.",
      fr: "Si la Part de Fortune tombe en Maison X ou près du Milieu du Ciel, la stabilité matérielle dépend souvent du rôle public\u202f: les revenus et le bien-être tendent à suivre la marche du travail et de la réputation.",
    },
    cycle: {
      en: "Worked out as Ascendant + Moon − Sun for a day birth (Sun above the horizon) and Ascendant + Sun − Moon for a night birth. It moves with the Ascendant, so it needs an accurate birth time.",
      fr: "Calculée ainsi\u202f: Ascendant + Lune − Soleil pour une naissance de jour (Soleil au-dessus de l’horizon), Ascendant + Soleil − Lune pour une naissance de nuit. Elle se déplace avec l’Ascendant et demande donc une heure de naissance précise.",
    },
  },
  spirit: {
    what: {
      en: "The Lot of Spirit is Fortune’s counterpart, built from the same three points with the formula reversed: by day it lies as far from the Ascendant as the Sun is from the Moon. The two lots always mirror each other across the Ascendant. Where Fortune describes what happens to a person, Spirit describes what they intend and do: choices, ambitions, work and a sense of purpose.",
      fr: "La Part d’Esprit est le pendant de Fortune, construite à partir des trois mêmes points avec la formule inversée\u202f: de jour, elle se trouve aussi loin de l’Ascendant que le Soleil l’est de la Lune. Les deux parts sont toujours symétriques par rapport à l’Ascendant. Si Fortune décrit ce qui arrive à la personne, Esprit décrit ce qu’elle vise et ce qu’elle fait\u202f: ses choix, ses ambitions, son travail, le sens qu’elle donne à ses actes.",
    },
    short: {
      en: "your intentions, choices and sense of purpose",
      fr: "vos intentions, vos choix et ce que vous visez",
    },
    inHouse: {
      en: "directs your intentions, choices and sense of purpose towards",
      fr: "engage votre volonté, vos choix et ce que vous visez dans",
    },
    example: {
      en: "With the Lot of Spirit on the Ascendant or near the Midheaven, someone tends to feel most alive when acting on a plan they chose, such as starting a business, rather than waiting for circumstances to decide for them.",
      fr: "Avec la Part d’Esprit sur l’Ascendant ou près du Milieu du Ciel, on se sent le plus vivant en suivant un plan que l’on a choisi, comme lancer une entreprise, plutôt qu’en attendant que les circonstances décident à sa place.",
    },
    cycle: {
      en: "Worked out as Ascendant + Sun − Moon for a day birth and Ascendant + Moon − Sun for a night birth, the reverse of Fortune. Like Fortune, it moves with the Ascendant and needs an accurate birth time.",
      fr: "Calculée ainsi\u202f: Ascendant + Soleil − Lune pour une naissance de jour, Ascendant + Lune − Soleil pour une naissance de nuit, soit l’inverse de Fortune. Comme Fortune, elle suit l’Ascendant et demande une heure de naissance précise.",
    },
  },
  ceres: {
    what: {
      en: "Ceres is the largest body in the asteroid belt, discovered in 1801 and classed as a dwarf planet since 2006. Its name is that of the Roman goddess of grain, whose grief when her daughter was taken to the underworld was said to cause winter. Astrologers read it as nurturing: how someone feeds and cares for others and wants to be cared for, and how they handle loss.",
      fr: "Découverte en 1801, Cérès est le plus gros objet de la ceinture d’astéroïdes et elle est classée planète naine depuis 2006. Elle porte le nom de la déesse romaine des moissons, dont le chagrin, quand sa fille fut emmenée aux Enfers, aurait provoqué l’hiver. Les astrologues y voient le soin\u202f: la façon de nourrir et d’entourer les autres, le besoin qu’on prenne soin de soi, et la manière de vivre la perte.",
    },
    short: {
      en: "your way of caring for others and of being cared for",
      fr: "votre façon de prendre soin des autres et d’accepter qu’on prenne soin de vous",
    },
    inHouse: {
      en: "expresses care, feeding and the need to be looked after through",
      fr: "exprime le soin, la façon de nourrir et le besoin qu’on s’occupe de vous dans",
    },
    example: {
      en: "Ceres on an angle or tied to the Moon can show as someone who expresses love by feeding people, keeps track of everyone’s well-being, and finds it hard when children or friends need them less than before.",
      fr: "Cérès sur un angle ou reliée à la Lune peut se traduire par quelqu’un qui exprime son affection en nourrissant les autres, veille au bien-être de chacun et vit mal le moment où enfants ou amis ont moins besoin de sa présence.",
    },
    cycle: {
      en: "Ceres orbits the Sun in about 4.6 years and usually spends two to six months in a sign, up to about ten around a retrograde. It turns retrograde for three months or so roughly every 15 months.",
      fr: "Cérès fait le tour du Soleil en 4,6 ans environ et reste en général deux à six mois dans un signe, jusqu’à dix mois environ autour d’une rétrogradation. Elle devient rétrograde pendant trois mois environ, à peu près tous les 15 mois.",
    },
  },
  pallas: {
    what: {
      en: "Pallas is one of the largest asteroids, discovered in 1802, with an orbit steeply tilted to the plane of the planets. It takes its name from Pallas Athena, goddess of wisdom, strategy and crafts. In a chart it stands for practical intelligence: seeing patterns, planning, solving problems creatively, and a sense of fairness that suits negotiation or standing up for a cause.",
      fr: "Découverte en 1802, Pallas compte parmi les plus gros astéroïdes et suit une orbite très inclinée par rapport au plan des planètes. Elle tient son nom de Pallas Athéna, déesse de la sagesse, de la stratégie et de l’artisanat. Dans un thème, elle représente l’intelligence pratique\u202f: repérer les schémas, planifier, résoudre les problèmes avec inventivité, et un sens de l’équité utile pour négocier ou défendre une cause.",
    },
    short: {
      en: "your strategic intelligence and eye for patterns",
      fr: "votre intelligence stratégique et votre façon de repérer les schémas",
    },
    inHouse: {
      en: "applies strategy, pattern-spotting and practical intelligence to",
      fr: "déploie la stratégie, le repérage des schémas et l’intelligence pratique dans",
    },
    example: {
      en: "With Pallas on an angle or tied to Mercury, someone may be the colleague who spots the pattern in messy data, thinks three moves ahead in a negotiation, or designs a system everyone else ends up using.",
      fr: "Avec Pallas sur un angle ou reliée à Mercure, on est parfois la personne qui, au travail, repère la logique d’un ensemble de données confus, garde trois coups d’avance dans une négociation ou conçoit un système que tout le monde finit par adopter.",
    },
    cycle: {
      en: "Pallas orbits the Sun in about 4.6 years and spends from under two months to about eleven in a sign. It is retrograde for two and a half to four months, roughly every 15 months.",
      fr: "Pallas fait le tour du Soleil en 4,6 ans environ et reste de moins de deux mois à onze mois environ dans un signe. Elle est rétrograde pendant deux mois et demi à quatre mois, à peu près tous les 15 mois.",
    },
  },
  juno: {
    what: {
      en: "Juno is an asteroid discovered in 1804, the third one found. The Roman Juno was queen of the gods, wife of Jupiter and protector of marriage, known for her jealousy of his affairs. In astrology it describes committed partnership: what someone needs from a long-term partner, and how they handle loyalty, equality and jealousy.",
      fr: "Découverte en 1804, Junon est le troisième astéroïde jamais repéré. La Junon romaine était la reine des dieux, épouse de Jupiter et protectrice du mariage, connue pour sa jalousie face aux infidélités de son époux. En astrologie, l’astéroïde décrit l’engagement à deux\u202f: ce que l’on attend d’un partenaire durable, et la façon de vivre la loyauté, l’égalité et la jalousie.",
    },
    short: {
      en: "your expectations of a committed partnership",
      fr: "vos attentes dans un engagement à deux",
    },
    inHouse: {
      en: "sets the terms of commitment, loyalty and fairness in",
      fr: "pose les conditions de l’engagement, de la loyauté et de l’équité dans",
    },
    example: {
      en: "With Juno on the Descendant or tied to Venus, someone may care more about loyalty and fairness than romance, and may end a relationship over a broken promise that another person would shrug off.",
      fr: "Avec Junon sur le Descendant ou reliée à Vénus, on tient parfois davantage à la loyauté et à l’équité qu’au romantisme, au point de rompre pour une promesse non tenue qu’un autre aurait laissé passer.",
    },
    cycle: {
      en: "Juno takes about 4.4 years to circle the Sun; its stay in a sign ranges from under two months to about eleven. It turns retrograde for two and a half to nearly four months, about every 15 or 16 months.",
      fr: "Junon fait le tour du Soleil en 4,4 ans environ\u202f; son séjour dans un signe va de moins de deux mois à onze mois environ. Elle devient rétrograde pendant deux mois et demi à près de quatre mois, tous les 15 ou 16 mois environ.",
    },
  },
  vesta: {
    what: {
      en: "Vesta, discovered in 1807, is the brightest asteroid and occasionally visible to the naked eye. It bears the name of the Roman goddess of the hearth, whose sacred fire was kept burning by the Vestal priestesses. Its themes are focus and devotion: what someone dedicates themselves to, how they protect their concentration, and where they need privacy to do their best work.",
      fr: "Découverte en 1807, Vesta est l’astéroïde le plus brillant, parfois visible à l’œil nu. Elle porte le nom de la déesse romaine du foyer, dont le feu sacré était entretenu par les Vestales. Ses thèmes sont la concentration et le dévouement\u202f: ce à quoi l’on se consacre, la façon de protéger son attention, et le besoin de retrait pour donner le meilleur de soi.",
    },
    short: {
      en: "your capacity for focus and devotion",
      fr: "votre capacité de concentration et de dévouement",
    },
    inHouse: {
      en: "focuses your attention and devotion on",
      fr: "focalise votre attention et votre dévouement sur",
    },
    example: {
      en: "Vesta on an angle or tied to the Sun can look like years spent perfecting one craft, a strict morning routine and working time guarded from interruptions, sometimes at the cost of a social life.",
      fr: "Vesta sur un angle ou reliée au Soleil peut prendre la forme d’années passées à perfectionner un seul savoir-faire, d’une routine matinale stricte et d’un temps de travail protégé des interruptions, parfois au détriment de la vie sociale.",
    },
    cycle: {
      en: "Vesta takes about 3.6 years to circle the Sun and stays from about two to nine and a half months in a sign. Its retrograde periods last about three months and come roughly every 16 to 17 months.",
      fr: "Vesta fait le tour du Soleil en 3,6 ans environ et reste de deux à neuf mois et demi environ dans un signe. Ses rétrogradations durent environ trois mois et reviennent tous les 16 à 17 mois environ.",
    },
  },
  eris: {
    what: {
      en: "Eris is a dwarf planet about the size of Pluto, found in 2005 far beyond Neptune. Its name is that of the Greek goddess of strife, whose golden apple set off the Trojan War, and astrologers are still testing its meaning: rivalry, exclusion and the fight to be counted. It has been in Aries since the 1920s, so its house and aspects say far more than its sign.",
      fr: "Éris est une planète naine de la taille de Pluton environ, découverte en 2005 bien au-delà de Neptune. Son nom est celui de la déesse grecque de la discorde, dont la pomme d’or déclencha la guerre de Troie, et les astrologues en explorent encore le sens\u202f: la rivalité, l’exclusion, le combat pour la reconnaissance. Elle se trouve en Bélier depuis les années 1920\u202f: sa maison et ses aspects en disent donc bien plus que son signe.",
    },
    short: {
      en: "your fighting spirit in the face of exclusion and unfairness",
      fr: "votre combativité face à l’exclusion et à l’injustice",
    },
    inHouse: {
      en: "sparks rivalry and the fight to be counted in",
      fr: "attise la rivalité et la lutte pour la reconnaissance dans",
    },
    example: {
      en: "With Eris close to the Ascendant or the Sun, someone may be the one who names the unfair rule everyone else tolerates, or who keeps pushing for a place in a group that tried to leave them out.",
      fr: "Avec Éris près de l’Ascendant ou du Soleil, on est parfois la personne qui dénonce la règle injuste que tous tolèrent, ou qui continue de réclamer sa place dans un groupe qui a voulu l’écarter.",
    },
    cycle: {
      en: "Eris orbits the Sun in about 560 years: some 20 years in Libra, over a century in Aries, where it has been since the 1920s. It stays there until the 2040s and is retrograde over five months a year.",
      fr: "Éris fait le tour du Soleil en 560 ans environ\u202f: une vingtaine d’années en Balance, plus d’un siècle en Bélier, où elle se trouve depuis les années 1920. Elle y restera jusqu’aux années 2040 et elle est rétrograde plus de cinq mois par an.",
    },
  },
  sedna: {
    what: {
      en: "Sedna is a remote body found in 2003, on an elongated orbit that takes about 11,400 years to complete. The name comes from the Inuit sea goddess who, thrown into the ocean by her father, became ruler of its creatures. Its sign is shared by everyone born over several decades; astrologers who use it read it, through house and close aspects, as abandonment, survival and slow recovery.",
      fr: "Découverte en 2003, Sedna est un corps lointain qui parcourt en quelque 11 400 ans une orbite très allongée. Son nom vient de la déesse inuite de la mer qui, jetée à l’eau par son père, devint souveraine des créatures marines. Son signe est commun aux personnes nées sur plusieurs décennies\u202f; les astrologues qui l’utilisent y lisent, à travers sa maison et ses aspects serrés, l’abandon, la survie et une lente reconstruction.",
    },
    short: {
      en: "your capacity to survive loss and rebuild slowly",
      fr: "votre capacité à traverser la perte et à vous reconstruire lentement",
    },
    inHouse: {
      en: "raises themes of isolation, survival and slow recovery in",
      fr: "soulève des thèmes d’isolement, de survie et de lente reconstruction dans",
    },
    example: {
      en: "When Sedna is close to the Sun, Moon or an angle, someone may go through long stretches of feeling like an outsider, or a hard break with family, and slowly build a life that stands on its own.",
      fr: "Quand Sedna est proche du Soleil, de la Lune ou d’un angle, on peut connaître de longues périodes à l’écart, ou une rupture difficile avec sa famille, puis construire lentement une vie qui tient debout par elle-même.",
    },
    cycle: {
      en: "Sedna takes roughly 11,400 years to complete one orbit; nearing its closest point to the Sun (around 2076), it moves relatively fast: in Taurus from the 1960s, in Gemini since 2024. It is retrograde nearly six months a year.",
      fr: "Sedna parcourt son orbite en quelque 11 400 ans\u202f; à l’approche de son point le plus proche du Soleil (vers 2076), elle avance relativement vite\u202f: en Taureau à partir des années 1960, en Gémeaux depuis 2024. Elle est rétrograde près de six mois par an.",
    },
  },
  ascendant: {
    what: {
      en: "The Ascendant is the degree of the zodiac rising on the eastern horizon at the time and place of birth; the houses are counted from it. It describes how someone meets the world: manner, appearance, physical presence and first reactions. It moves about one degree every four minutes, so it needs an accurate birth time; the planet that rules its sign is called the chart ruler.",
      fr: "L’Ascendant est le degré du zodiaque qui se lève à l’horizon oriental au moment et au lieu de la naissance\u202f; c’est à partir de lui que l’on compte les maisons. Il décrit la façon d’aborder le monde\u202f: l’allure, l’apparence, la présence physique et les premières réactions. Il avance d’environ un degré toutes les quatre minutes et exige donc une heure de naissance précise\u202f; la planète qui gouverne son signe est appelée maître du thème.",
    },
    short: {
      en: "your manner, your appearance and the way you approach the world",
      fr: "votre manière d’être, votre apparence et votre façon d’aborder le monde",
    },
    inHouse: {
      en: "sets the tone, through your manner and first approach, for",
      fr: "donne le ton, par votre allure et votre premier abord, dans",
    },
    example: {
      en: "With Aries rising, someone often walks in quickly and speaks first; with Libra rising, they tend to read the room and put others at ease. A planet near the Ascendant adds its own note, such as Saturn’s reserve.",
      fr: "Avec un Ascendant Bélier, on entre vite dans une pièce et l’on parle le premier\u202f; avec un Ascendant Balance, on observe l’ambiance et l’on met les autres à l’aise. Une planète proche de l’Ascendant y ajoute sa note, comme la réserve de Saturne.",
    },
    cycle: {
      en: "The Ascendant circles the whole zodiac once a day, moving about one degree every four minutes. It changes sign about every two hours on average, from under an hour to over three depending on sign and latitude.",
      fr: "L’Ascendant fait le tour complet du zodiaque une fois par jour, à raison d’un degré toutes les quatre minutes environ. Il change de signe toutes les deux heures en moyenne, de moins d’une heure à plus de trois selon le signe et la latitude.",
    },
  },
  midheaven: {
    what: {
      en: "The Midheaven (MC, from the Latin medium coeli) is the degree of the zodiac crossing the meridian above the birthplace, shown at the top of the chart. In most house systems it begins the 10th house. It describes career aims, reputation and public role: what someone wants to achieve and be known for in the wider world. Like the Ascendant, it needs an accurate birth time.",
      fr: "Le Milieu du Ciel (MC, du latin medium coeli) est le degré du zodiaque qui passe au méridien au-dessus du lieu de naissance\u202f; il se place en haut du thème. Dans la plupart des systèmes de maisons, il ouvre la Maison X. Il décrit les objectifs professionnels, la réputation et le rôle public\u202f: ce que l’on veut accomplir et ce pour quoi l’on veut être connu dans la société. Comme l’Ascendant, il demande une heure de naissance précise.",
    },
    short: {
      en: "your career aims, your reputation and your place in society",
      fr: "vos objectifs professionnels, votre réputation et votre place dans la société",
    },
    inHouse: {
      en: "steers your ambitions and public image towards",
      fr: "inscrit vos ambitions et votre image publique dans",
    },
    example: {
      en: "A Midheaven in Capricorn often goes with a slow, deliberate climb towards a recognised position, while one in Pisces often suits careers in care, art or music; a planet on the MC tends to become what someone is known for.",
      fr: "Un Milieu du Ciel en Capricorne va souvent de pair avec une ascension lente et réfléchie vers une position reconnue, tandis qu’un MC en Poissons convient souvent aux métiers du soin, de l’art ou de la musique\u202f; une planète sur le MC devient souvent ce pour quoi on est connu.",
    },
    cycle: {
      en: "The Midheaven circles the zodiac once a day, changing sign every 1 hour 50 minutes to 2 hours 10 minutes; unlike the Ascendant, this pace does not depend on latitude.",
      fr: "Le Milieu du Ciel fait le tour du zodiaque une fois par jour et change de signe toutes les 1 h 50 à 2 h 10 environ\u202f; contrairement à l’Ascendant, ce rythme ne dépend pas de la latitude.",
    },
  },
  descendant: {
    what: {
      en: "The Descendant is the degree of the zodiac setting on the western horizon at birth, exactly opposite the Ascendant, and in most house systems it begins the 7th house. It describes close one-to-one relationships: partners, business associates and open rivals, and the qualities someone looks for, or tends to notice, in other people. Like the Ascendant, it needs an accurate birth time.",
      fr: "Le Descendant est le degré du zodiaque qui se couche à l’horizon occidental à la naissance, exactement à l’opposé de l’Ascendant\u202f; dans la plupart des systèmes de maisons, il ouvre la Maison VII. Il décrit les relations en face à face\u202f: partenaires, associés et adversaires déclarés, ainsi que les qualités que l’on recherche, ou que l’on remarque d’emblée, chez les autres. Comme l’Ascendant, il demande une heure de naissance précise.",
    },
    short: {
      en: "your partners and what you look for in others",
      fr: "vos partenaires et ce que vous recherchez chez les autres",
    },
    inHouse: {
      en: "forms your close partnerships through",
      fr: "noue vos relations proches dans",
    },
    example: {
      en: "With Aries rising, the Descendant falls in Libra: someone who acts fast may be drawn to calm, diplomatic partners, and learn from them how to weigh another person’s view before deciding.",
      fr: "Avec un Ascendant Bélier, le Descendant tombe en Balance\u202f: une personne qui agit vite peut être attirée par des partenaires calmes et diplomates, et apprendre à leur contact à peser le point de vue de l’autre avant de trancher.",
    },
    cycle: {
      en: "The Descendant is always exactly opposite the Ascendant, so it keeps the same pace: once round the zodiac a day, a new sign about every two hours, one degree every four minutes.",
      fr: "Le Descendant est toujours exactement opposé à l’Ascendant et suit donc le même rythme\u202f: un tour du zodiaque par jour, un nouveau signe toutes les deux heures environ, un degré toutes les quatre minutes.",
    },
  },
  ic: {
    what: {
      en: "The IC (imum coeli, ‘bottom of the sky’) is the degree of the zodiac crossing the meridian beneath the birthplace, exactly opposite the Midheaven, and sits at the lowest point of the chart. In most house systems it begins the 4th house. It describes roots and private life: home, family, origins and the inner base someone returns to. Like the other angles, it needs an accurate birth time.",
      fr: "Le Fond du Ciel (FC, en latin imum coeli) est le degré du zodiaque qui passe au méridien sous le lieu de naissance, exactement à l’opposé du Milieu du Ciel, en bas du thème. Dans la plupart des systèmes de maisons, il ouvre la Maison IV. Il décrit les racines et la vie privée\u202f: le foyer, la famille, les origines et la base intime à laquelle on revient. Comme les autres angles, il demande une heure de naissance précise.",
    },
    short: {
      en: "your roots, your home life and your private base",
      fr: "vos racines, votre vie de famille et votre base intime",
    },
    inHouse: {
      en: "roots your private life in",
      fr: "enracine votre vie privée dans",
    },
    example: {
      en: "An IC in Cancer often goes with close family ties and a strong need for a home of one’s own; Saturn near the IC can describe an early home with a lot of duty, and a later wish to build something solid.",
      fr: "Un Fond du Ciel en Cancer va souvent de pair avec des liens familiaux étroits et un fort besoin d’un foyer à soi\u202f; Saturne près du FC peut décrire une enfance chargée de devoirs, puis le désir de bâtir quelque chose de solide.",
    },
    cycle: {
      en: "The IC is always exactly opposite the Midheaven, so it too circles the zodiac once a day, changing sign roughly every two hours whatever the latitude.",
      fr: "Le Fond du Ciel est toujours exactement opposé au Milieu du Ciel\u202f: il fait donc lui aussi le tour du zodiaque une fois par jour et change de signe toutes les deux heures environ, quelle que soit la latitude.",
    },
  },
};
