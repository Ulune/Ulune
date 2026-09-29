/**
 * The glossary: the words a reading uses, each in a sentence or two, in
 * English and French. One tap from every reading (the Reading tab's
 * "Glossary") and in the guide. Loaded when it is opened.
 */
import type { AppLocale } from "./messages";

export type GlossaryId =
  | "aspect"
  | "orb"
  | "applying"
  | "sign"
  | "decan"
  | "house"
  | "ascendant"
  | "midheaven"
  | "retrograde"
  | "station"
  | "ingress"
  | "moonPhase"
  | "eclipse"
  | "voidOfCourse"
  | "season"
  | "exact"
  | "window"
  | "transit"
  | "progression"
  | "synastry"
  | "composite"
  | "hdType"
  | "hdStrategy"
  | "hdAuthority"
  | "hdCentres"
  | "hdGate"
  | "hdChannel"
  | "hdLine"
  | "hdHanging"
  | "hdLayers"
  | "hdNotSelf"
  | "hdProfile"
  | "hdDefinition"
  | "hdCross"
  | "hdVariable"
  | "lifePath"
  | "nameNumbers"
  | "birthday"
  | "masterNumbers"
  | "maturity"
  | "personalCycles"
  | "karmicDebt"
  | "karmicLesson"
  | "hiddenPassion"
  | "finerNumbers"
  | "planes"
  | "stones"
  | "bridge"
  | "pinnacle"
  | "challenge"
  | "periodCycle"
  | "letterCycle"
  | "chaldean"
  | "birthGrid"
  | "declination"
  | "latitude"
  | "outOfBounds"
  | "domicile"
  | "exaltation"
  | "triplicity"
  | "term"
  | "face"
  | "peregrine"
  | "sect"
  | "combust"
  | "dispositor"
  | "reception"
  | "outOfSign"
  | "parallel"
  | "intercepted"
  | "siderealTime"
  | "midpoint"
  | "fixedStar"
  | "lot";

type Entry = { term: [string, string]; body: [string, string] };

export const GLOSSARY: Record<GlossaryId, Entry> = {
  aspect: {
    term: ["Aspect", "Aspect"],
    body: [
      "An angle between two points of the chart, measured along the zodiac, that astrology reads as a relationship between them. The major ones: conjunction (0°), sextile (60°), square (90°), trine (120°) and opposition (180°).",
      "Un angle entre deux points du thème, mesuré le long du zodiaque, que l’astrologie lit comme une relation entre eux. Les aspects majeurs : conjonction (0°), sextile (60°), carré (90°), trigone (120°) et opposition (180°).",
    ],
  },
  orb: {
    term: ["Orb", "Orbe"],
    body: [
      "How far an aspect is from exact, in degrees. The smaller the orb, the stronger the aspect is read; beyond a set limit it no longer counts.",
      "L’écart d’un aspect à l’exactitude, en degrés. Plus l’orbe est petit, plus l’aspect est lu comme fort ; au-delà d’une limite, il ne compte plus.",
    ],
  },
  applying: {
    term: ["Applying, separating", "Applicatif, séparatif"],
    body: [
      "An aspect is applying while the two points move towards the exact angle, and separating once they move apart.",
      "Un aspect est applicatif tant que les deux points se rapprochent de l’angle exact, séparatif dès qu’ils s’en éloignent.",
    ],
  },
  sign: {
    term: ["Sign", "Signe"],
    body: [
      "One of the twelve 30° parts of the zodiac, from Aries to Pisces, counted from the spring equinox (the tropical zodiac).",
      "L’une des douze parts de 30° du zodiaque, du Bélier aux Poissons, comptées depuis l’équinoxe de printemps (le zodiaque tropical).",
    ],
  },
  decan: {
    term: ["Decan", "Décan"],
    body: ["A third of a sign (10°), with a ruling planet of its own.", "Un tiers de signe (10°), avec sa propre planète maîtresse."],
  },
  house: {
    term: ["House", "Maison"],
    body: [
      "One of twelve sectors of the sky at the time and place of birth, counted from the Ascendant, each standing for a field of life (the 7th for partners, the 10th for work and reputation). They depend on the birth time.",
      "L’un des douze secteurs du ciel au moment et au lieu de la naissance, comptés depuis l’Ascendant, chacun associé à un domaine de la vie (la VIIe aux partenaires, la Xe au métier et à la réputation). Elles dépendent de l’heure de naissance.",
    ],
  },
  ascendant: {
    term: ["Ascendant", "Ascendant"],
    body: [
      "The degree of the zodiac rising on the eastern horizon at birth, where the 1st house begins. It moves about a degree every four minutes, so it needs the birth time.",
      "Le degré du zodiaque qui se levait à l’horizon est à la naissance, là où commence la maison I. Il avance d’environ un degré toutes les quatre minutes : il lui faut l’heure de naissance.",
    ],
  },
  midheaven: {
    term: ["Midheaven (MC)", "Milieu du Ciel (MC)"],
    body: [
      "The degree of the zodiac crossing the meridian at birth, due south in the northern hemisphere; in most house systems, where the 10th house begins.",
      "Le degré du zodiaque qui passait au méridien à la naissance, plein sud dans l’hémisphère nord ; dans la plupart des systèmes de maisons, là où commence la maison X.",
    ],
  },
  retrograde: {
    term: ["Retrograde (℞)", "Rétrograde (℞)"],
    body: [
      "A planet that seems, seen from the Earth, to move backwards through the zodiac for a while, because of the Earth’s own motion.",
      "Une planète qui semble, vue de la Terre, reculer dans le zodiaque pendant un temps, à cause du mouvement de la Terre elle-même.",
    ],
  },
  station: {
    term: ["Station", "Station"],
    body: [
      "The moment a planet seems to stand still in the sky before it turns retrograde or direct again. Astrologers read the days around a station as the strongest of that planet’s cycle.",
      "Le moment où une planète semble immobile dans le ciel avant de devenir rétrograde ou de repartir en direct. On lit les jours autour d’une station comme les plus forts du cycle de la planète.",
    ],
  },
  ingress: {
    term: ["Ingress (sign change)", "Ingrès (changement de signe)"],
    body: [
      "A planet crossing from one sign into the next. The Moon does it every two and a half days, Pluto every twelve to thirty years.",
      "Le passage d’une planète d’un signe au suivant. La Lune le fait tous les deux jours et demi, Pluton tous les douze à trente ans.",
    ],
  },
  moonPhase: {
    term: ["Moon phase", "Phase de la Lune"],
    body: [
      "The Moon’s angle from the Sun, which sets how much of it is lit: new (0°), first quarter (90°), full (180°), last quarter (270°), crescent and gibbous in between. A whole cycle takes about 29½ days.",
      "L’angle entre la Lune et le Soleil, qui fixe la part éclairée de la Lune : nouvelle (0°), premier quartier (90°), pleine (180°), dernier quartier (270°), croissant et gibbeuse entre les deux. Un cycle complet dure environ 29 jours et demi.",
    ],
  },
  eclipse: {
    term: ["Eclipse", "Éclipse"],
    body: [
      "A New Moon (solar eclipse) or Full Moon (lunar eclipse) close enough to the lunar nodes for the Moon to hide the Sun or pass through the Earth’s shadow. Four to seven a year, in seasons about six months apart.",
      "Une Nouvelle Lune (éclipse solaire) ou une Pleine Lune (éclipse lunaire) assez proche des nœuds lunaires pour que la Lune cache le Soleil ou traverse l’ombre de la Terre. Quatre à sept par an, par saisons espacées d’environ six mois.",
    ],
  },
  voidOfCourse: {
    term: ["Void of course", "Lune vide de course"],
    body: [
      "The hours between the Moon’s last major aspect in a sign and its entry into the next one, traditionally a poor time to start things. Counted here with the Sun and the planets out to Pluto.",
      "Les heures entre le dernier aspect majeur de la Lune dans un signe et son entrée dans le suivant, un moment traditionnellement peu favorable aux débuts. Calculée ici avec le Soleil et les planètes jusqu’à Pluton.",
    ],
  },
  season: {
    term: ["Equinox, solstice", "Équinoxe, solstice"],
    body: [
      "The Sun entering Aries or Libra (equinoxes: day and night equal) and Cancer or Capricorn (solstices: the longest and shortest days). They open the seasons and the four quarters of the zodiac.",
      "L’entrée du Soleil en Bélier ou en Balance (équinoxes : jour et nuit égaux) et en Cancer ou en Capricorne (solstices : les jours les plus longs et les plus courts). Ils ouvrent les saisons et les quatre quarts du zodiaque.",
    ],
  },
  exact: {
    term: ["Exact", "Exact"],
    body: [
      "The minute an aspect or a crossing is precise to the degree, minute and second: the peak of a transit, shown as the minute it happens in.",
      "La minute où un aspect ou un passage est précis au degré, à la minute et à la seconde près : le sommet d’un transit, donné à la minute où il se produit.",
    ],
  },
  window: {
    term: ["Within 1° (a slow transit’s period)", "À moins de 1° (la période d’un transit lent)"],
    body: [
      "The weeks or months a slow planet stays within 1° of an exact aspect to your chart. A retrograde can make it exact two or three times inside; a period with no exact pass is a near miss.",
      "Les semaines ou les mois où une planète lente reste à moins de 1° d’un aspect exact à votre thème. Une rétrogradation peut le rendre exact deux ou trois fois pendant cette période ; une période sans passage exact est un aspect frôlé.",
    ],
  },
  transit: {
    term: ["Transit", "Transit"],
    body: [
      "Where a planet is in the sky at a given moment, read against the birth chart: its aspects to the planets and angles you were born with.",
      "La position d’une planète dans le ciel à un moment donné, lue sur le thème natal : ses aspects aux planètes et aux angles de la naissance.",
    ],
  },
  progression: {
    term: ["Secondary progression", "Progression secondaire"],
    body: [
      "The chart moved on one day for each year of life: the sky 30 days after birth describes the 30th year. Its angles advance at the Naibod rate, about 1° a year.",
      "Le thème avancé d’un jour pour chaque année de vie : le ciel du 30e jour après la naissance décrit la 30e année. Ses angles avancent au rythme de Naibod, environ 1° par an.",
    ],
  },
  synastry: {
    term: ["Synastry", "Synastrie"],
    body: [
      "Two charts compared: the aspects between one person’s planets and the other’s, and the houses of one where the other’s planets fall.",
      "Deux thèmes comparés : les aspects entre les planètes de l’un et celles de l’autre, et les maisons de l’un où tombent les planètes de l’autre.",
    ],
  },
  composite: {
    term: ["Composite", "Composite"],
    body: [
      "One chart made from two: for each pair of planets, the midpoint between them, read as the chart of the relationship itself.",
      "Un thème fait de deux : pour chaque paire de planètes, leur point milieu, lu comme le thème de la relation elle-même.",
    ],
  },
  hdType: {
    term: ["Type (Human Design)", "Type (Human Design)"],
    body: [
      "The first key of a bodygraph: Manifestor, Generator, Manifesting Generator, Projector or Reflector, from which centres are defined and how they connect.",
      "La première clé d’un bodygraph : Manifesteur, Générateur, Générateur manifesteur, Projecteur ou Réflecteur, selon les centres définis et leurs liaisons.",
    ],
  },
  hdStrategy: {
    term: ["Strategy", "Stratégie"],
    body: [
      "How each type is advised to engage with life: to inform (Manifestors), to wait to respond (Generators), to wait for the invitation (Projectors), to wait a lunar cycle (Reflectors).",
      "La façon dont chaque type est invité à s’engager dans la vie : informer (Manifesteurs), attendre pour répondre (Générateurs), attendre l’invitation (Projecteurs), attendre un cycle lunaire (Réflecteurs).",
    ],
  },
  hdAuthority: {
    term: ["Authority", "Autorité"],
    body: [
      "The inner signal Human Design says to trust when deciding (emotional, sacral, splenic and others), set by the defined centres.",
      "Le signal intérieur auquel le Human Design dit de se fier pour décider (émotionnelle, sacrale, splénique et d’autres), selon les centres définis.",
    ],
  },
  hdCentres: {
    term: ["Centres, gates, channels", "Centres, portes, canaux"],
    body: [
      "The bodygraph’s nine centres hold 64 gates, one for each hexagram of the I Ching, lit by the planets. A channel joins two gates; with both lit, it defines the two centres it joins.",
      "Les neuf centres du bodygraph portent 64 portes, une par hexagramme du Yi King, allumées par les planètes. Un canal relie deux portes ; quand les deux sont allumées, il définit les deux centres qu’il relie.",
    ],
  },
  hdGate: {
    term: ["Gate", "Porte"],
    body: [
      "One of the bodygraph’s 64 gates, one for each hexagram of the I Ching and about 5.6° of the zodiac. A planet standing in it at birth, or in the Design, colours it.",
      "L’une des 64 portes du bodygraph, une par hexagramme du Yi King et d’environ 5,6° du zodiaque. Une planète qui s’y trouve à la naissance, ou dans le Design, la colore.",
    ],
  },
  hdChannel: {
    term: ["Channel", "Canal"],
    body: [
      "The line between two gates in two centres. With both gates coloured, the channel is defined, and so are the two centres it joins.",
      "La ligne entre deux portes de deux centres. Quand les deux portes sont colorées, le canal est défini, ainsi que les deux centres qu’il relie.",
    ],
  },
  hdLine: {
    term: ["Line", "Ligne"],
    body: [
      "Each gate has six lines, the finer shade of its theme, written after the gate: 34.2 is gate 34, line 2. The lines of the two Suns make the profile.",
      "Chaque porte a six lignes, la nuance fine de son thème, notée après la porte : 34.2 est la porte 34, ligne 2. Les lignes des deux Soleils forment le profil.",
    ],
  },
  hdHanging: {
    term: ["Hanging gate", "Porte suspendue"],
    body: [
      "A coloured gate whose partner across the channel is not: half a channel, a theme you carry that someone with the other gate can complete.",
      "Une porte colorée dont la partenaire, de l’autre côté du canal, ne l’est pas : un demi-canal, un thème que vous portez et qu’une personne ayant l’autre porte peut compléter.",
    ],
  },
  hdLayers: {
    term: ["Personality, Design", "Personnalité, Design"],
    body: [
      "Personality: the planets at birth. Design: the planets when the Sun stood 88° further back, about three months before birth.",
      "Personnalité : les planètes à la naissance. Design : les planètes quand le Soleil était 88° plus tôt, environ trois mois avant la naissance.",
    ],
  },
  hdNotSelf: {
    term: ["Not-self theme, signature", "Thème du non-soi, signature"],
    body: [
      "Feelings Human Design uses as signposts for each type: the not-self theme when you are off track (anger, frustration, bitterness, disappointment), the signature when you are on it (peace, satisfaction, success, surprise).",
      "Des ressentis que le Human Design utilise comme repères pour chaque type : le thème du non-soi quand vous vous écartez de votre voie (colère, frustration, amertume, déception), la signature quand vous la suivez (paix, satisfaction, succès, surprise).",
    ],
  },
  hdProfile: {
    term: ["Profile", "Profil"],
    body: [
      "Two numbers, the lines of the two Suns: the Personality Sun’s first, then the Design Sun’s. There are twelve, from 1/3 to 6/3.",
      "Deux nombres, les lignes des deux Soleils : celle du Soleil de la Personnalité, puis celle du Soleil du Design. Il y en a douze, de 1/3 à 6/3.",
    ],
  },
  hdDefinition: {
    term: ["Definition", "Définition"],
    body: [
      "How the coloured centres connect: all in one group (single), in two, three or four separate groups (split), or not at all when none is coloured.",
      "La façon dont les centres colorés sont reliés : en un seul groupe (simple), en deux, trois ou quatre groupes séparés (double, triple, quadruple), ou pas du tout quand aucun n’est coloré.",
    ],
  },
  hdCross: {
    term: ["Incarnation Cross", "Croix d’incarnation"],
    body: [
      "The gates of the Sun and the Earth at birth and in the Design, read together as a life theme. Its angle, right, juxtaposition or left, comes from the profile.",
      "Les portes du Soleil et de la Terre à la naissance et dans le Design, lues ensemble comme un thème de vie. Son angle, droit, juxtaposition ou gauche, vient du profil.",
    ],
  },
  hdVariable: {
    term: ["Variable (the arrows)", "Variable (les flèches)"],
    body: [
      "Four arrows read from the tones of the Suns and the Nodes: Determination and Environment from the Design, Motivation and Perspective from the Personality. Each points left (tones 1 to 3) or right (4 to 6); they need an exact birth time.",
      "Quatre flèches lues sur les tons des Soleils et des Nœuds : Détermination et Environnement pour le Design, Motivation et Perspective pour la Personnalité. Chacune pointe à gauche (tons 1 à 3) ou à droite (4 à 6) ; il leur faut une heure de naissance exacte.",
    ],
  },
  lifePath: {
    term: ["Life Path", "Chemin de vie"],
    body: [
      "The birth date as one number: the month, the day and the year each reduced, then added and reduced again (11, 22 and 33 are kept).",
      "La date de naissance en un nombre : le mois, le jour et l’année réduits chacun, puis additionnés et réduits à nouveau (11, 22 et 33 sont gardés).",
    ],
  },
  nameNumbers: {
    term: ["Expression, Soul Urge, Personality", "Expression, Élan de l’âme, Personnalité"],
    body: [
      "The name’s letters as numbers (A=1 to I=9, then again from J=1): all of them for Expression, the vowels for Soul Urge, the consonants for Personality.",
      "Les lettres du nom en nombres (A=1 à I=9, puis de nouveau à partir de J=1) : toutes pour l’Expression, les voyelles pour l’Élan de l’âme, les consonnes pour la Personnalité.",
    ],
  },
  birthday: {
    term: ["Birthday number", "Nombre d’anniversaire"],
    body: [
      "The day of the month of birth, reduced to one digit (the 11th and the 22nd are kept).",
      "Le jour du mois de naissance, réduit à un chiffre (le 11 et le 22 sont gardés).",
    ],
  },
  masterNumbers: {
    term: ["Master numbers", "Nombres maîtres"],
    body: [
      "11, 22 and 33, which numerology keeps whole instead of reducing them to one digit.",
      "11, 22 et 33, que la numérologie garde entiers au lieu de les réduire à un chiffre.",
    ],
  },
  maturity: {
    term: ["Maturity number", "Nombre de maturité"],
    body: [
      "The Life Path and the Expression added and reduced: a goal that grows clearer with age, usually from the late thirties or forties.",
      "Le Chemin de vie et l’Expression additionnés et réduits\u202f: un objectif qui se précise avec l’âge, en général vers la fin de la trentaine ou la quarantaine.",
    ],
  },
  personalCycles: {
    term: ["Personal year, month and day", "Année, mois et jour personnels"],
    body: [
      "The birth month and day added to the calendar year, each reduced, give the personal year (from 1 January here); the month added to it gives the personal month, the day added to that the personal day. Each runs from 1 to 9.",
      "Le mois et le jour de naissance ajoutés à l’année civile, chacun réduit, donnent l’année personnelle (dès le 1er janvier ici)\u202f; le mois ajouté donne le mois personnel, et le jour ajouté à celui-ci le jour personnel. Chacun va de 1 à 9.",
    ],
  },
  karmicDebt: {
    term: ["Karmic debt", "Dette karmique"],
    body: [
      "A 13, 14, 16 or 19 reached just before a core number’s last step, written whole (13/4): a lesson that comes back until it is learned, not a punishment.",
      "Un 13, 14, 16 ou 19 atteint juste avant la dernière étape d’un nombre principal, écrit en entier (13/4)\u202f: une leçon qui revient jusqu’à ce qu’elle soit apprise, pas une punition.",
    ],
  },
  karmicLesson: {
    term: ["Karmic lesson", "Leçon karmique"],
    body: [
      "A number from 1 to 9 that no letter of the birth name falls on: a quality to learn on purpose. Most names have one to three.",
      "Un nombre de 1 à 9 sur lequel ne tombe aucune lettre du nom de naissance\u202f: une qualité à apprendre exprès. La plupart des noms en ont une à trois.",
    ],
  },
  hiddenPassion: {
    term: ["Hidden passion", "Passion cachée"],
    body: [
      "The number the most letters of the birth name fall on: a drive or a talent you tend to reach for.",
      "Le nombre sur lequel tombent le plus de lettres du nom de naissance\u202f: un élan ou un talent vers lequel vous allez volontiers.",
    ],
  },
  finerNumbers: {
    term: ["Balance, rational thought, attitude, subconscious self", "Équilibre, pensée rationnelle, attitude, moi subconscient"],
    body: [
      "Four smaller numbers: the initials of the birth name (balance), the first name and the day of birth (rational thought), the month and the day (attitude), and how many of the nine numbers the name holds (subconscious self).",
      "Quatre nombres secondaires\u202f: les initiales du nom de naissance (équilibre), le prénom et le jour de naissance (pensée rationnelle), le mois et le jour (attitude), et combien des neuf nombres le nom contient (moi subconscient).",
    ],
  },
  planes: {
    term: ["Planes of expression", "Plans d’expression"],
    body: [
      "The birth name’s letters in four groups, physical, mental, emotional and intuitive, each added and reduced on its own.",
      "Les lettres du nom de naissance réparties en quatre groupes, physique, mental, émotionnel et intuitif, chacun additionné et réduit à part.",
    ],
  },
  stones: {
    term: ["Cornerstone, capstone, first vowel", "Pierre angulaire, pierre de faîte, première voyelle"],
    body: [
      "The first letter, the last letter and the first vowel of the first name: how you approach things, how you finish them, and a glimpse of your inner self.",
      "La première lettre, la dernière lettre et la première voyelle du prénom\u202f: votre façon d’aborder les choses, de les finir, et un aperçu de votre moi intérieur.",
    ],
  },
  bridge: {
    term: ["Bridge", "Pont"],
    body: [
      "The difference between two core numbers (the Life Path and the Expression, the Soul Urge and the Personality): the quality that helps them work together.",
      "L’écart entre deux nombres principaux (le Chemin de vie et l’Expression, l’Élan de l’âme et la Personnalité)\u202f: la qualité qui les aide à travailler ensemble.",
    ],
  },
  pinnacle: {
    term: ["Pinnacle", "Réalisation"],
    body: [
      "One of four stages of life from the birth date, each with its number: the first ends at 36 minus the Life Path, the next two last nine years each, the last for the rest of life.",
      "Une des quatre étapes de la vie tirées de la date de naissance, chacune avec son nombre\u202f: la première finit à 36 moins le Chemin de vie, les deux suivantes durent neuf ans chacune, la dernière le reste de la vie.",
    ],
  },
  challenge: {
    term: ["Challenge", "Défi"],
    body: [
      "The difference between two parts of the birth date: a difficulty to meet during a pinnacle’s years. The third, the main challenge, colours the whole of life.",
      "L’écart entre deux parties de la date de naissance\u202f: une difficulté à affronter pendant les années d’une réalisation. Le troisième, le défi principal, colore toute la vie.",
    ],
  },
  periodCycle: {
    term: ["Period cycle", "Cycle de vie"],
    body: [
      "Three long periods from the birth month, day and year: the first ends with the first personal year 1 from the 27th birthday on; the second lasts 27 years; the third, the rest of life.",
      "Trois longues périodes tirées du mois, du jour et de l’année de naissance\u202f: la première finit avec la première année personnelle 1 à partir du 27e anniversaire\u202f; la deuxième dure 27 ans\u202f; la troisième, le reste de la vie.",
    ],
  },
  letterCycle: {
    term: ["Letter cycles and essence", "Cycles de lettres et essence"],
    body: [
      "Each part of the name read letter by letter, each letter for as many years as its value: the first name (physical), the middle names (mental), the last name (spiritual). The essence adds the three letters in effect in a year. Decoz calls them transits.",
      "Chaque partie du nom lue lettre par lettre, chaque lettre pendant autant d’années que sa valeur\u202f: le prénom (physique), les deuxièmes prénoms (mental), le nom de famille (spirituel). L’essence additionne les trois lettres en cours une année donnée. Decoz les appelle des transits.",
    ],
  },
  chaldean: {
    term: ["Chaldean number", "Nombre chaldéen"],
    body: [
      "The name added with Cheiro’s letter values (1 to 8), read as a compound number, then reduced: shown beside the Pythagorean numbers, never mixed with them.",
      "Le nom additionné avec les valeurs de Cheiro (1 à 8), lu comme un nombre composé, puis réduit\u202f: montré à côté des nombres pythagoriciens, jamais mêlé à eux.",
    ],
  },
  birthGrid: {
    term: ["Birth grid", "Grille de naissance"],
    body: [
      "The digits of the birth date in a 3 × 3 square: Phillips’s layout with its lines, full or empty, or the Lo Shu square.",
      "Les chiffres de la date de naissance dans un carré de 3 × 3\u202f: la disposition de Phillips avec ses lignes, pleines ou vides, ou le carré Lo Shu.",
    ],
  },
  declination: {
    term: ["Declination", "Déclinaison"],
    body: [
      "How far north or south of the celestial equator a body stands, in degrees: the sky’s latitude. The Sun’s never goes beyond about 23°26′.",
      "La distance d’un corps au nord ou au sud de l’équateur céleste, en degrés : la latitude du ciel. Celle du Soleil ne dépasse jamais environ 23°26′.",
    ],
  },
  latitude: {
    term: ["Latitude (ecliptic)", "Latitude (écliptique)"],
    body: [
      "How far above or below the ecliptic, the Sun’s path, a body stands. The Moon strays up to about 5°, Pluto up to 17°; the zodiac positions leave it aside.",
      "La distance d’un corps au-dessus ou au-dessous de l’écliptique, la route du Soleil. La Lune s’en écarte jusqu’à environ 5°, Pluton jusqu’à 17° ; les positions du zodiaque n’en tiennent pas compte.",
    ],
  },
  outOfBounds: {
    term: ["Out of bounds", "Hors limites"],
    body: [
      "A body whose declination goes beyond the Sun’s greatest (the obliquity of the ecliptic, about 23°26′): read as acting outside the usual rules.",
      "Un corps dont la déclinaison dépasse la plus grande du Soleil (l’obliquité de l’écliptique, environ 23°26′) : on le lit comme agissant hors des règles habituelles.",
    ],
  },
  domicile: {
    term: ["Domicile, detriment", "Domicile, exil"],
    body: [
      "A planet is in its domicile in a sign it rules (Mars in Aries), its strongest place (+5 in Lilly’s points); in the opposite sign it is in detriment (−5).",
      "Une planète est en domicile dans un signe qu’elle gouverne (Mars en Bélier), sa place la plus forte (+5 en points de Lilly) ; dans le signe opposé, elle est en exil (−5).",
    ],
  },
  exaltation: {
    term: ["Exaltation, fall", "Exaltation, chute"],
    body: [
      "Each of the seven planets has a sign where it is exalted, honoured as a guest (the Sun in Aries, +4), and the opposite sign where it falls (−4).",
      "Chacune des sept planètes a un signe où elle est exaltée, honorée comme une invitée (le Soleil en Bélier, +4), et le signe opposé où elle chute (−4).",
    ],
  },
  triplicity: {
    term: ["Triplicity", "Triplicité"],
    body: [
      "The planets ruling each element: one by day, one by night, one participating (Dorothean rulers). The ruler of the chart’s sect scores +3.",
      "Les planètes qui gouvernent chaque élément : une de jour, une de nuit, une participante (maîtres de Dorothée). Celle de la secte du thème compte +3.",
    ],
  },
  term: {
    term: ["Term (bound)", "Terme"],
    body: [
      "Each sign is cut into five unequal spans, each ruled by one of the five planets (the Egyptian terms). A planet in its own term: +2.",
      "Chaque signe est coupé en cinq parts inégales, chacune gouvernée par l’une des cinq planètes (les termes égyptiens). Une planète dans son propre terme : +2.",
    ],
  },
  face: {
    term: ["Face", "Face"],
    body: [
      "Each sign’s three 10° thirds, ruled by the planets in the Chaldean order from Mars at 0° Aries. A planet in its own face: +1. Not the same as the decans of the readings.",
      "Les trois tiers de 10° de chaque signe, gouvernés par les planètes dans l’ordre chaldéen à partir de Mars à 0° Bélier. Une planète dans sa propre face : +1. À ne pas confondre avec les décans des lectures.",
    ],
  },
  peregrine: {
    term: ["Peregrine", "Pérégrine"],
    body: [
      "A planet with none of the five dignities where it stands, not even a term or a face: a wanderer without a home there (−5).",
      "Une planète sans aucune des cinq dignités là où elle se trouve, pas même un terme ou une face : une voyageuse sans foyer (−5).",
    ],
  },
  sect: {
    term: ["Sect", "Secte"],
    body: [
      "Whether the chart is by day (the Sun above the horizon) or by night. The Sun, Jupiter and Saturn belong to the day, the Moon, Venus and Mars to the night; Mercury to the day when it rises before the Sun, to the night when it sets after it.",
      "Si le thème est de jour (le Soleil au-dessus de l’horizon) ou de nuit. Le Soleil, Jupiter et Saturne sont du jour, la Lune, Vénus et Mars de la nuit ; Mercure du jour quand il se lève avant le Soleil, de la nuit quand il se couche après lui.",
    ],
  },
  combust: {
    term: ["Combust, cazimi", "Combuste, cazimi"],
    body: [
      "A planet within 8° of the Sun is combust, hidden in its glare and weakened; within 17′ it is cazimi, “in the heart of the Sun”, and strengthened.",
      "Une planète à moins de 8° du Soleil est combuste, cachée dans son éclat et affaiblie ; à moins de 17′, elle est cazimi, « au cœur du Soleil », et renforcée.",
    ],
  },
  dispositor: {
    term: ["Dispositor", "Dispositeur"],
    body: [
      "The ruler of the sign a planet is in: Mars disposes of a planet in Aries. From ruler to ruler the chain ends at a planet in its own sign, the final dispositor.",
      "Le maître du signe où se trouve une planète : Mars est le dispositeur d’une planète en Bélier. De maître en maître, la chaîne s’arrête à une planète dans son propre signe, le dispositeur final.",
    ],
  },
  reception: {
    term: ["Mutual reception", "Réception mutuelle"],
    body: [
      "Two planets each in a sign of the other’s (by domicile, by exaltation, or one of each), read as helping each other.",
      "Deux planètes chacune dans un signe de l’autre (par domicile, par exaltation, ou l’un et l’autre), lues comme s’aidant mutuellement.",
    ],
  },
  outOfSign: {
    term: ["Out-of-sign aspect", "Aspect hors signe"],
    body: [
      "An aspect the degrees make but the signs do not, as a trine from 29° Aries to 1° Virgo (Aries and Virgo are not a trine apart). Also called dissociate.",
      "Un aspect que font les degrés mais pas les signes, comme un trigone de 29° Bélier à 1° Vierge (le Bélier et la Vierge ne sont pas en trigone). On dit aussi dissocié.",
    ],
  },
  parallel: {
    term: ["Parallel, contra-parallel", "Parallèle, contre-parallèle"],
    body: [
      "Two bodies at the same declination, within 1°: parallel on the same side of the equator (read like a conjunction), contra-parallel on either side (like an opposition).",
      "Deux corps à la même déclinaison, à 1° près : parallèles du même côté de l’équateur (lus comme une conjonction), contre-parallèles de part et d’autre (comme une opposition).",
    ],
  },
  intercepted: {
    term: ["Intercepted sign", "Signe intercepté"],
    body: [
      "A sign that lies wholly inside a house, with no cusp in it; the sign opposite is intercepted too, and two other signs fall on two cusps each. It happens with unequal houses, far from the equator.",
      "Un signe tout entier à l’intérieur d’une maison, sans cuspide en lui ; le signe opposé l’est aussi, et deux autres signes tombent chacun sur deux cuspides. Cela arrive avec des maisons inégales, loin de l’équateur.",
    ],
  },
  siderealTime: {
    term: ["Sidereal time", "Temps sidéral"],
    body: [
      "Time by the stars rather than the Sun: which part of the sky is on the meridian. With the latitude it sets the Ascendant, the MC and the houses.",
      "Le temps d’après les étoiles plutôt que le Soleil : quelle part du ciel passe au méridien. Avec la latitude, il fixe l’Ascendant, le MC et les maisons.",
    ],
  },
  midpoint: {
    term: ["Midpoint", "Mi-point"],
    body: [
      "The point halfway between two bodies along the zodiac, and its opposite point: a body on it is read as joining the two.",
      "Le point à mi-chemin de deux corps le long du zodiaque, et son point opposé : un corps qui s’y trouve est lu comme les reliant.",
    ],
  },
  fixedStar: {
    term: ["Fixed star", "Étoile fixe"],
    body: [
      "A bright star projected onto the zodiac, such as Regulus or Spica; it moves about a degree in 72 years. A body within 1° of it is read as taking on its character.",
      "Une étoile brillante projetée sur le zodiaque, comme Régulus ou l’Épi ; elle avance d’environ un degré en 72 ans. Un corps à moins de 1° est lu comme prenant son caractère.",
    ],
  },
  lot: {
    term: ["Lot (Part of Fortune, Spirit)", "Part (de Fortune, de l’Esprit)"],
    body: [
      "A point found from the distance between two bodies laid off from the Ascendant: Fortune is the Moon’s distance from the Sun, Spirit the reverse (swapped in a night chart).",
      "Un point obtenu en reportant depuis l’Ascendant la distance entre deux corps : Fortune est la distance de la Lune au Soleil, l’Esprit l’inverse (échangées dans un thème de nuit).",
    ],
  },
};

export const GLOSSARY_ORDER = Object.keys(GLOSSARY) as GlossaryId[];

/** The words a reading uses, from what is chosen and the mode it is in. */
export function glossaryFor(page: string, selectedId: string | null): GlossaryId[] {
  const out: GlossaryId[] = [];
  const add = (...ids: GlossaryId[]) => {
    for (const id of ids) if (!out.includes(id)) out.push(id);
  };
  const prefix = selectedId?.split(":")[0] ?? "";
  if (page === "transits") add("transit");
  // The calendar: the words of the event, the day or the Moon chosen.
  if (page === "timing") {
    const kind = selectedId?.startsWith("sky:") ? selectedId.slice(4).split("-")[0] : "";
    if (kind === "phase") add("moonPhase");
    if (kind === "eclipse") add("eclipse", "moonPhase");
    if (kind === "station") add("station", "retrograde");
    if (kind === "ingress") add(/^sky:ingress-sun-(0|3|6|9)-/.test(selectedId ?? "") ? "season" : "ingress");
    if (kind === "aspect") add("aspect", "exact");
    if (kind === "void") add("voidOfCourse");
    if (prefix === "win") add("window", "exact", "retrograde");
    if (prefix === "moon" || prefix === "day") add("moonPhase", "voidOfCourse", "exact");
    if (prefix === "timing") add("exact", "aspect");
    add("transit");
  }
  if (page === "progressions") add("progression");
  if (page === "synastry") add("synastry");
  if (page === "composite") add("composite");
  if (page === "design") {
    // The words the chosen piece's reading uses first, then the keys.
    if (prefix === "gate" || prefix === "act") add("hdGate", "hdLine", "hdHanging", "hdChannel");
    if (selectedId && /^act:(design|personality):(sun|northnode)$/.test(selectedId)) add("hdVariable");
    if (prefix === "act") add("hdLayers");
    if (prefix === "channel") add("hdChannel", "hdHanging", "hdGate");
    if (prefix === "center") add("hdCentres", "hdChannel");
    if (selectedId === "hello:type") add("hdType", "hdNotSelf");
    if (selectedId === "hello:profile") add("hdProfile", "hdLine");
    if (selectedId === "hello:definition") add("hdDefinition", "hdCentres");
    if (selectedId === "hello:cross") add("hdCross", "hdProfile", "hdGate");
    if (selectedId === "hello:layers") add("hdLayers");
    add("hdType", "hdStrategy", "hdAuthority", "hdProfile", "hdDefinition", "hdCentres", "hdLayers");
  }
  if (page === "numerology") {
    // The words the chosen reading uses first (part 63), then the four keys.
    const sub = selectedId?.split(":")[1] ?? "";
    if (selectedId === "core:maturity") add("maturity");
    if (selectedId === "core:personalYear" || prefix === "time" || prefix === "year") add("personalCycles");
    if (prefix === "year") add("letterCycle", "pinnacle", "challenge", "periodCycle");
    if (prefix === "cycle") add(sub === "pinnacle" ? "pinnacle" : sub === "challenge" ? "challenge" : "periodCycle", "pinnacle", "challenge", "periodCycle");
    if (prefix === "core" || prefix === "number") add("karmicDebt");
    if (selectedId === "detail:lessons" || selectedId === "detail:subconscious" || prefix === "number") add("karmicLesson", "hiddenPassion");
    if (selectedId === "detail:passion") add("hiddenPassion", "karmicLesson");
    if (prefix === "detail" && ["balance", "rationalThought", "attitude", "subconscious"].includes(sub)) add("finerNumbers");
    if (prefix === "detail" && ["cornerstone", "capstone", "firstVowel"].includes(sub)) add("stones");
    if (selectedId === "detail:chaldean") add("chaldean");
    if (prefix === "plane") add("planes");
    if (prefix === "bridge") add("bridge");
    add("lifePath", "nameNumbers", "birthday", "masterNumbers");
  }
  if (/aspect$/.test(prefix)) add("aspect", "orb", "applying");
  if (prefix === "planet" || prefix === "transit" || prefix === "progressed" || prefix === "partner") {
    add("sign", "house", "retrograde", "aspect");
  }
  if (prefix === "angle") add(selectedId === "angle:midheaven" || selectedId === "angle:ic" ? "midheaven" : "ascendant", "house");
  if (prefix === "house") add("house", "ascendant");
  if (prefix === "sign" || prefix === "decan") add("sign", "decan");
  if (!out.length) add("sign", "house", "aspect", "orb");
  return out;
}

export function glossaryTerm(id: GlossaryId, locale: AppLocale): string {
  return GLOSSARY[id].term[locale === "fr" ? 1 : 0];
}

export function glossaryBody(id: GlossaryId, locale: AppLocale): string {
  return GLOSSARY[id].body[locale === "fr" ? 1 : 0];
}
