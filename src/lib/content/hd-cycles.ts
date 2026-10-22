/**
 * Human Design's Cycles, its reading text in English and French (share and
 * compare plan, feature 5b; the reading builder is
 * src/lib/chart/interpret-hd-cycles.ts, the engine src/lib/chart/hd-transit.ts
 * and src/lib/chart/hd-cycles.ts). Written for Ulune in the tone of the other
 * readings: the moment as weather that lends a theme for a while, the life
 * cycles as seasons with what they tend to ask, each with a suggestion,
 * never a prediction about a life. Placeholders in braces are filled by the
 * builder: gates, lines, names, bodies, dates, ages.
 */
import type { Bi } from "./types";
import type { HdBodyId } from "@/lib/chart/human-design";
import type { LifeCycleRefId } from "@/lib/chart/hd-transit";

/** About transits in Human Design (the "About" of the moment's readings). */
export const HDC_ABOUT: Bi = {
  en: "In Human Design, the planets at any moment make a bodygraph of their own, the same for everyone: the transit field. Read against your chart, it lends you for a while what you do not have, a channel completed by one of your gates, a centre defined that is open in you. Human Design calls this conditioning: the weather of the moment, not a change in who you are. Your strategy and your authority stay yours.",
  fr: "En Human Design, les planètes forment à chaque instant un bodygraph à elles, le même pour tous\u202f: le champ des transits. Lu face à votre thème, il vous prête pour un temps ce que vous n’avez pas, un canal complété par l’une de vos portes, un centre défini qui est ouvert chez vous. Le Human Design appelle cela le conditionnement\u202f: la météo du moment, pas un changement de ce que vous êtes. Votre stratégie et votre autorité restent les vôtres.",
};

/** About the life cycles (the "About" of their readings). */
export const HDC_CYCLES_ABOUT: Bi = {
  en: "Human Design follows three great cycles through a life, set by the slow planets: the Saturn return, around 28 to 30, the Uranus opposition, around 38 to 44, and the Chiron return, around 50 and 51, with a second Saturn return near 59. Each is read as a season of a few years, with what it tends to ask of you, never as an event that has to happen.",
  fr: "Le Human Design suit trois grands cycles au fil d’une vie, réglés par les planètes lentes\u202f: le retour de Saturne, vers 28 à 30 ans, l’opposition d’Uranus, vers 38 à 44 ans, et le retour de Chiron, vers 50 et 51 ans, avec un second retour de Saturne vers 59 ans. Chacun se lit comme une saison de quelques années, avec ce qu’elle tend à vous demander, jamais comme un événement qui doit arriver.",
};

/** How long each body tends to stay in one gate. */
export const HDC_STAY: Record<HdBodyId, Bi> = {
  sun: { en: "about five days and seventeen hours", fr: "environ cinq jours et dix-sept heures" },
  earth: { en: "about five days and seventeen hours, opposite the Sun", fr: "environ cinq jours et dix-sept heures, face au Soleil" },
  moon: { en: "about ten hours", fr: "environ dix heures" },
  northnode: { en: "about four months", fr: "environ quatre mois" },
  southnode: { en: "about four months", fr: "environ quatre mois" },
  mercury: { en: "from a few days to a few weeks when it turns back", fr: "de quelques jours à quelques semaines quand il rebrousse chemin" },
  venus: { en: "from about five days to several weeks when it turns back", fr: "d’environ cinq jours à plusieurs semaines quand elle rebrousse chemin" },
  mars: { en: "from about a week to a couple of months", fr: "d’environ une semaine à deux mois" },
  jupiter: { en: "about two months, longer when it turns back", fr: "environ deux mois, davantage quand il rebrousse chemin" },
  saturn: { en: "about five months, up to a year when it turns back", fr: "environ cinq mois, jusqu’à un an quand il rebrousse chemin" },
  uranus: { en: "about a year and a half", fr: "environ un an et demi" },
  neptune: { en: "about three years", fr: "environ trois ans" },
  pluto: { en: "several years", fr: "plusieurs années" },
};

/** The moment as a whole: the first read's first step and its reading. */
export const HDC_MOMENT: { lead: Bi; waiting: Bi; completes: Bi; completesNone: Bi; conditions: Bi; conditionsNone: Bi } = {
  lead: {
    en: "{when}: the Sun in gate {sun}, the Earth in gate {earth}, the Moon in gate {moon}.",
    fr: "{when}\u202f: le Soleil dans la porte {sun}, la Terre dans la porte {earth}, la Lune dans la porte {moon}.",
  },
  waiting: {
    en: "{when}: the sky of this moment is on its way.",
    fr: "{when}\u202f: le ciel de ce moment arrive.",
  },
  completes: {
    en: "With your gates, the moment completes {channels}.",
    fr: "Avec vos portes, le moment complète {channels}.",
  },
  completesNone: {
    en: "It completes no channel with your gates.",
    fr: "Il ne complète aucun canal avec vos portes.",
  },
  conditions: {
    en: "It defines {centres} for you, open in your chart.",
    fr: "Il définit pour vous ce que votre thème laisse ouvert\u202f: {centres}.",
  },
  conditionsNone: {
    en: "It defines none of your open centres.",
    fr: "Il ne définit aucun de vos centres ouverts.",
  },
};

/** The gate of the week: the Sun's, with the Earth opposite. */
export const HDC_WEEK: { what: Bi; lead: Bi; leadNoSpan: Bi; yours: Bi; notYours: Bi; earthYours: Bi; completes: Bi; tip: Bi } = {
  what: {
    en: "Human Design gives the Sun about 70% of the stream that conditions everyone: the gate it passes through, for about five days and seventeen hours, colours the week for everybody, and the Earth, opposite, grounds it. A gate of the week is a shared theme, in the air for all.",
    fr: "Le Human Design donne au Soleil environ 70\u202f% du flux qui conditionne tout le monde\u202f: la porte qu’il traverse, pendant environ cinq jours et dix-sept heures, colore la semaine de chacun, et la Terre, en face, l’ancre. La porte de la semaine est un thème partagé, dans l’air pour tous.",
  },
  lead: {
    en: "From {from} to {to}, the Sun is in gate {gate} ({name}), line {line} at this moment, and the Earth in gate {egate} ({ename}).",
    fr: "Du {from} au {to}, le Soleil est dans la porte {gate} ({name}), ligne {line} en ce moment, et la Terre dans la porte {egate} ({ename}).",
  },
  leadNoSpan: {
    en: "The Sun is in gate {gate} ({name}), line {line}, and the Earth in gate {egate} ({ename}).",
    fr: "Le Soleil est dans la porte {gate} ({name}), ligne {line}, et la Terre dans la porte {egate} ({ename}).",
  },
  yours: {
    en: "Gate {gate} is one of yours ({acts}): this week the world shares a theme you carry, which may feel like familiar ground.",
    fr: "La porte {gate} est l’une des vôtres ({acts})\u202f: cette semaine, le monde partage un thème que vous portez, qui peut vous sembler familier.",
  },
  notYours: {
    en: "Gate {gate} is not in your chart: its theme reaches you from outside this week, a chance to try it without it being yours to keep.",
    fr: "La porte {gate} n’est pas dans votre thème\u202f: son thème vous arrive de l’extérieur cette semaine, l’occasion de l’essayer sans qu’il vous revienne de le garder.",
  },
  earthYours: {
    en: "The Earth’s gate {egate} is one of yours ({acts}).",
    fr: "La porte {egate} de la Terre est l’une des vôtres ({acts}).",
  },
  completes: {
    en: "With your gate {g}, the Sun or the Earth completes {channel} this week.",
    fr: "Avec votre porte {g}, le Soleil ou la Terre complète {channel} cette semaine.",
  },
  tip: {
    en: "A suggestion: notice where this theme shows up around you during the week, without making it a task.",
    fr: "Une suggestion\u202f: remarquez où ce thème se montre autour de vous pendant la semaine, sans en faire une tâche.",
  },
};

/** The Moon of the moment. */
export const HDC_MOON: { what: Bi; lead: Bi; leadNoSpan: Bi; yours: Bi; notYours: Bi } = {
  what: {
    en: "The Moon passes a gate in about ten hours and all 64 in about four weeks: the quickest of the transits. Human Design calls the Moon the driving force, so its gate is the day’s passing mood more than a theme to hold on to.",
    fr: "La Lune traverse une porte en une dizaine d’heures et les 64 en quatre semaines environ\u202f: le plus rapide des transits. Le Human Design appelle la Lune la force motrice\u202f: sa porte est l’humeur passagère du jour plus qu’un thème à retenir.",
  },
  lead: {
    en: "The Moon is in gate {gate} ({name}), line {line}, from {from} until {until}.",
    fr: "La Lune est dans la porte {gate} ({name}), ligne {line}, de {from} jusqu’à {until}.",
  },
  leadNoSpan: {
    en: "The Moon is in gate {gate} ({name}), line {line}.",
    fr: "La Lune est dans la porte {gate} ({name}), ligne {line}.",
  },
  yours: {
    en: "It is one of your gates ({acts}): for a few hours the moment echoes something of yours.",
    fr: "C’est l’une de vos portes ({acts})\u202f: pendant quelques heures, le moment fait écho à quelque chose de vous.",
  },
  notYours: {
    en: "It is not one of your gates: a few hours of a theme from outside.",
    fr: "Ce n’est pas l’une de vos portes\u202f: quelques heures d’un thème venu d’ailleurs.",
  },
};

/** One body of the moment (a chip above the figure, a row of the table). */
export const HDC_BODY: { lead: Bi; retro: Bi; stay: Bi; yours: Bi; completes: Bi } = {
  lead: {
    en: "{body} is in gate {gate} ({name}), line {line}{retro}.",
    fr: "{body} est dans la porte {gate} ({name}), ligne {line}{retro}.",
  },
  retro: { en: ", moving backwards (retrograde)", fr: ", en mouvement rétrograde" },
  stay: {
    en: "Its passage through a gate lasts {stay}.",
    fr: "Son passage dans une porte dure {stay}.",
  },
  yours: {
    en: "Gate {gate} is one of yours ({acts}).",
    fr: "La porte {gate} est l’une des vôtres ({acts}).",
  },
  completes: {
    en: "With your gates, this passage completes {channels}.",
    fr: "Avec vos portes, ce passage complète {channels}.",
  },
};

/** A channel on the page, as it stands between you and the moment. */
export const HDC_CHANNEL: {
  completes: Bi;
  completesTip: Bi;
  field: Bi;
  fieldOne: Bi;
  yours: Bi;
  yoursLit: Bi;
  waits: Bi;
  momentHalf: Bi;
  none: Bi;
} = {
  completes: {
    en: "Your gate {gy} and the moment’s gate {gm} ({bodies}) complete this channel: it is defined in you for as long as the transit lasts ({stay}). Human Design calls it a temporary definition: its theme can feel unusually available, like a tool lent for a while.",
    fr: "Votre porte {gy} et la porte {gm} du moment ({bodies}) complètent ce canal\u202f: il est défini chez vous le temps de ce transit ({stay}). Le Human Design parle de définition temporaire\u202f: son thème peut sembler étonnamment disponible, comme un outil prêté pour un temps.",
  },
  completesTip: {
    en: "A suggestion: use it if it serves you, and keep in mind that it is the moment’s, not a new part of you.",
    fr: "Une suggestion\u202f: servez-vous-en si cela vous aide, en gardant à l’esprit qu’il appartient au moment, pas à une nouvelle part de vous.",
  },
  field: {
    en: "The moment defines this channel on its own, {first} in gate {g1} and {second} in gate {g2}: everyone lives in it for now, the day’s own definition. You have neither of its gates, so its theme reaches you from outside, like weather.",
    fr: "Le moment définit ce canal à lui seul, {first} dans la porte {g1} et {second} dans la porte {g2}\u202f: tout le monde y baigne pour l’instant, la définition propre du jour. Vous n’avez aucune de ses portes\u202f: son thème vous arrive de l’extérieur, comme une météo.",
  },
  fieldOne: {
    en: "The moment defines this channel on its own, {first} in gate {g1} and {second} in gate {g2}, and you have gate {gy} of it in your chart: for now, your own way with gate {gy} meets the channel’s fuller current, and may be carried along by it.",
    fr: "Le moment définit ce canal à lui seul, {first} dans la porte {g1} et {second} dans la porte {g2}, et vous en avez la porte {gy} dans votre thème\u202f: pour l’instant, votre façon de vivre la porte {gy} rencontre le courant plus ample du canal, et peut se laisser porter par lui.",
  },
  yours: {
    en: "This channel is yours: it is defined in your chart whatever the sky does.",
    fr: "Ce canal est le vôtre\u202f: il est défini dans votre thème, quoi que fasse le ciel.",
  },
  yoursLit: {
    en: "This channel is yours, defined in your chart, and the moment also stands in gate {gm} ({bodies}): your own theme, underlined for a while.",
    fr: "Ce canal est le vôtre, défini dans votre thème, et le moment se tient aussi dans la porte {gm} ({bodies})\u202f: votre propre thème, souligné pour un temps.",
  },
  waits: {
    en: "Your gate {gy} waits for gate {gm}: neither you nor the sky has it now. A transit through gate {gm} would complete this channel in you for a while.",
    fr: "Votre porte {gy} attend la porte {gm}\u202f: ni votre thème ni le ciel ne l’ont en ce moment. Un transit dans la porte {gm} compléterait ce canal chez vous pour un temps.",
  },
  momentHalf: {
    en: "The moment stands in gate {gm} ({bodies}), and the other gate, {go}, is neither yours nor the sky’s now: the channel stays open.",
    fr: "Le moment se tient dans la porte {gm} ({bodies}), et l’autre porte, {go}, n’est ni à vous ni au ciel en ce moment\u202f: le canal reste ouvert.",
  },
  none: {
    en: "Neither you nor the moment activates this channel now.",
    fr: "Ni votre thème ni le ciel du moment n’activent ce canal.",
  },
};

/** A gate on the page. */
export const HDC_GATE: { yours: Bi; moment: Bi; both: Bi; none: Bi; part: Bi; loose: Bi } = {
  yours: { en: "It is one of your gates ({acts}); the moment does not stand in it.", fr: "C’est l’une de vos portes ({acts})\u202f; le moment ne s’y tient pas." },
  moment: {
    en: "The moment stands in it ({bodies}). It is not one of your gates: its theme reaches you from outside, for as long as the transit lasts.",
    fr: "Le moment s’y tient ({bodies}). Ce n’est pas l’une de vos portes\u202f: son thème vous arrive de l’extérieur, le temps de ce transit.",
  },
  both: {
    en: "You and the moment both stand in it: {acts} in your chart, {bodies} now. Your own theme, underlined for a while.",
    fr: "Vous et le moment êtes tous deux dans cette porte\u202f: {acts} dans votre thème, {bodies} en ce moment. Votre propre thème, souligné pour un temps.",
  },
  none: { en: "Neither you nor the moment activates it now.", fr: "Ni votre thème ni le ciel du moment ne l’activent." },
  part: { en: "Now it is part of {list}.", fr: "En ce moment, elle fait partie de {list}." },
  loose: { en: "It completes no channel now.", fr: "Elle ne complète aucun canal en ce moment." },
};

/** A centre on the page. */
export const HDC_CENTRE: { moment: Bi; together: Bi; yours: Bi; open: Bi; tip: Bi } = {
  moment: {
    en: "{The} is open in your chart, and the moment defines it through {channels}. Human Design calls this conditioning: for now you may live its theme, {theme}, as if it were steady in you.",
    fr: "Dans votre thème, {the} est un centre ouvert, et le moment en fait un centre défini grâce à {channels}. Le Human Design appelle cela le conditionnement\u202f: pour l’instant, vous pouvez en vivre le thème, {theme}, comme s’il était stable chez vous.",
  },
  together: {
    en: "{The} is open in your chart; with your gates, the moment completes {channels}, which define it for now. Its theme, {theme}, may feel closer than usual while it lasts.",
    fr: "Dans votre thème, {the} est un centre ouvert\u202f; avec vos portes, le moment complète {channels}\u202f: c’est pour l’instant un centre défini chez vous. Son thème, {theme}, peut vous sembler plus proche que d’habitude, le temps que cela dure.",
  },
  yours: {
    en: "{The} is defined in your chart: your own steady way with {theme}, whatever the moment brings.",
    fr: "{The} est un centre défini dans votre thème\u202f: votre façon constante de vivre {theme}, quoi qu’apporte le moment.",
  },
  open: {
    en: "{The} stays open now, in you and in the sky: {theme} reaches you through the people around you rather than through the moment.",
    fr: "{The} reste un centre ouvert en ce moment, chez vous comme dans le ciel\u202f: {theme} vous arrive par les personnes qui vous entourent plutôt que par le moment.",
  },
  tip: {
    en: "A suggestion: enjoy what it lends, and let a decision wait for your own authority rather than for this borrowed steadiness.",
    fr: "Une suggestion\u202f: profitez de ce qu’il prête, et laissez une décision attendre votre propre autorité plutôt que cette stabilité d’emprunt.",
  },
};

/** What the moment completes, and the centres it defines, as a whole. */
export const HDC_COMPLETES: { what: Bi; none: Bi } = {
  what: {
    en: "With your gates, the moment completes {list}. Each is a temporary definition: whole in you while the planet stays in its gate.",
    fr: "Avec vos portes, le moment complète {list}. Chacun est une définition temporaire\u202f: complet chez vous tant que la planète reste dans sa porte.",
  },
  none: {
    en: "At this moment the sky completes no channel with your gates: a quieter time for borrowed definition, closer to your own.",
    fr: "En ce moment, le ciel ne complète aucun canal avec vos portes\u202f: un temps plus calme pour la définition d’emprunt, plus proche de la vôtre.",
  },
};
export const HDC_CENTRES: { what: Bi; none: Bi } = {
  what: {
    en: "The moment defines {list} for you, open in your chart: for now, what it defines may feel steadier than usual.",
    fr: "Le moment définit pour vous ce que votre thème laisse ouvert\u202f: {list}. Pour l’instant, ce qu’il définit peut sembler plus stable que d’habitude.",
  },
  none: {
    en: "The moment defines none of your open centres: they keep taking in what is around you, as usual.",
    fr: "Le moment ne définit aucun de vos centres ouverts\u202f: ils continuent d’accueillir ce qui vous entoure, comme d’habitude.",
  },
};

/** The life cycles: their names, what Human Design says each asks, and a suggestion. */
export const HDC_LIFE: Record<LifeCycleRefId, { name: Bi; around: Bi; asks: Bi; tip: Bi }> = {
  saturn1: {
    name: { en: "Saturn return", fr: "Retour de Saturne" },
    around: { en: "around 28 to 30", fr: "vers 28 à 30 ans" },
    asks: {
      en: "Human Design sees the first Saturn return as the end of the first great cycle of life. Saturn, the judge, comes back to where it stood at your birth and asks what you have built, and on whose terms: what rests on other people’s expectations tends to feel heavier, what is truly yours holds. It is a natural time to check whether you decide by your own strategy and authority, to take on the commitments you really want and to set the others down. For a sixth-line profile, it is also when the first, trial-and-error part of life gives way to a calmer, more observing one.",
      fr: "Le Human Design voit le premier retour de Saturne comme la fin du premier grand cycle de la vie. Saturne, le juge, revient là où il se tenait à votre naissance et demande ce que vous avez construit, et selon les attentes de qui\u202f: ce qui repose sur les attentes des autres tend à peser davantage, ce qui est vraiment à vous tient bon. C’est un moment naturel pour vérifier si vous décidez selon votre propre stratégie et votre autorité, pour prendre les engagements que vous voulez vraiment et poser les autres. Pour un profil de sixième ligne, c’est aussi le moment où la première partie de la vie, faite d’essais et d’erreurs, laisse place à une autre, plus calme et plus observatrice.",
    },
    tip: {
      en: "A suggestion: list what you keep doing only because it is expected, and try each against your strategy and authority.",
      fr: "Une suggestion\u202f: faites la liste de ce que vous continuez à faire seulement parce qu’on l’attend de vous, et passez chaque point au crible de votre stratégie et de votre autorité.",
    },
  },
  uranus: {
    name: { en: "Uranus opposition", fr: "Opposition d’Uranus" },
    around: { en: "around 38 to 44", fr: "vers 38 à 44 ans" },
    asks: {
      en: "Uranus takes about 84 years to go round, and halfway it stands opposite its place at your birth. Human Design reads this middle of life as a turn towards your own uniqueness: the conditioning of the first half often loosens its hold, and what is different about you asks for room. It is also around now that, in Human Design, the setting of the North Node begins to take over from the South Node’s. Many people feel a pull to change course; Human Design suggests letting the change come through your strategy and authority rather than through restlessness.",
      fr: "Uranus met environ 84 ans à faire le tour du ciel, et à mi-chemin il se tient face à sa place à votre naissance. Le Human Design lit ce milieu de la vie comme un tournant vers votre singularité\u202f: le conditionnement de la première moitié relâche souvent son emprise, et ce qui vous rend différent demande de la place. C’est aussi vers ce moment que, en Human Design, le cadre du Nœud Nord commence à prendre le relais de celui du Nœud Sud. Beaucoup ressentent l’envie de changer de cap\u202f; le Human Design suggère de laisser ce changement passer par votre stratégie et votre autorité plutôt que par l’agitation.",
    },
    tip: {
      en: "A suggestion: notice what you would do differently if no one were watching, and give one of those things a small, real place.",
      fr: "Une suggestion\u202f: remarquez ce que vous feriez autrement si personne ne regardait, et donnez à l’une de ces choses une petite place bien réelle.",
    },
  },
  chiron: {
    name: { en: "Chiron return", fr: "Retour de Chiron" },
    around: { en: "around 50 and 51", fr: "vers 50 et 51 ans" },
    asks: {
      en: "Chiron comes back to its place at your birth around 50. Human Design marks it as the start of the third part of life, the time to become an example of what life has taught you. For a sixth-line profile, it is when the observer comes down from the roof and lives what they have seen; for everyone, a time when old difficulties can turn into what you have to offer, and when success is measured less by what you achieve than by being yourself.",
      fr: "Chiron revient à sa place de votre naissance vers 50 ans. Le Human Design y voit le début de la troisième partie de la vie, le moment de devenir un exemple de ce que la vie vous a appris. Pour un profil de sixième ligne, c’est le moment où l’observateur descend du toit et vit ce qu’il a vu\u202f; pour tous, un temps où les difficultés anciennes peuvent devenir ce que vous avez à offrir, et où la réussite se mesure moins à ce que vous accomplissez qu’au fait d’être vous-même.",
    },
    tip: {
      en: "A suggestion: write down three things life has taught you that you could pass on, and to whom.",
      fr: "Une suggestion\u202f: notez trois choses que la vie vous a apprises et que vous pourriez transmettre, et à qui.",
    },
  },
  saturn2: {
    name: { en: "Second Saturn return", fr: "Second retour de Saturne" },
    around: { en: "around 57 to 60", fr: "vers 57 à 60 ans" },
    asks: {
      en: "Saturn comes back a second time near 59. Human Design says less about it than about the first; it can be read as the same review at another depth, looking at what the decades since have built. A natural time to simplify, to keep what carries meaning and to hand on what you have learned: Saturn’s discipline now asks less of effort than of choosing well.",
      fr: "Saturne revient une seconde fois vers 59 ans. Le Human Design en dit moins que du premier\u202f; on peut le lire comme le même bilan à une autre profondeur, celui de ce que les décennies écoulées ont construit. Un moment naturel pour simplifier, garder ce qui a du sens et transmettre ce que vous avez appris\u202f: la discipline de Saturne demande désormais moins d’efforts que de bien choisir.",
    },
    tip: {
      en: "A suggestion: name what you would like to keep doing for the next twenty years, and what you are ready to hand on.",
      fr: "Une suggestion\u202f: nommez ce que vous aimeriez continuer à faire ces vingt prochaines années, et ce que vous êtes prêt à transmettre.",
    },
  },
};

/** A life cycle's reading: where the planet was at birth, its passages, where the cycle stands. */
export const HDC_LIFE_WORDS: {
  place: Bi;
  placeOpposite: Bi;
  placeChiron: Bi;
  past: Bi;
  now: Bi;
  coming: Bi;
  passOne: Bi;
  passMany: Bi;
  passedOne: Bi;
  passedMany: Bi;
  willOne: Bi;
  willMany: Bi;
  retro: Bi;
  none: Bi;
  beyond: Bi;
  unknownTime: Bi;
} = {
  place: {
    en: "When you were born, {body} stood in gate {gate}, line {line} ({name}): the return brings it back to this theme of yours.",
    fr: "À votre naissance, {body} se tenait dans la porte {gate}, ligne {line} ({name})\u202f: son retour le ramène à ce thème qui est le vôtre.",
  },
  placeOpposite: {
    en: "When you were born, Uranus stood in gate {ngate}, line {nline}; at the opposition it stands across the wheel, in gate {gate}, line {line} ({name}).",
    fr: "À votre naissance, Uranus se tenait dans la porte {ngate}, ligne {nline}\u202f; à l’opposition, il se tient de l’autre côté de la roue, dans la porte {gate}, ligne {line} ({name}).",
  },
  placeChiron: {
    en: "Chiron is not one of the bodygraph’s thirteen bodies, but it has its place: gate {gate}, line {line} ({name}) when you were born, where it returns.",
    fr: "Chiron ne fait pas partie des treize corps du bodygraph, mais il a sa place\u202f: la porte {gate}, ligne {line} ({name}) à votre naissance, là où il revient.",
  },
  past: {
    en: "Behind you: {pass}, {age}.",
    fr: "Derrière vous\u202f: {pass}, {age}.",
  },
  now: {
    en: "Now, in this cycle’s season: {pass}, {age}.",
    fr: "En ce moment, dans la saison de ce cycle\u202f: {pass}, {age}.",
  },
  coming: {
    en: "Ahead: {pass}, {age}.",
    fr: "À venir\u202f: {pass}, {age}.",
  },
  passOne: {
    en: "{body} passes the point exactly {dates}",
    fr: "{body} passe exactement sur ce point {dates}",
  },
  passMany: {
    en: "{body} passes the point {n} times, turning back and forward again: {dates}",
    fr: "{body} passe {n} fois sur ce point, en rebroussant chemin puis en repartant\u202f: {dates}",
  },
  passedOne: {
    en: "{body} passed the point exactly {dates}",
    fr: "{body} est passé exactement sur ce point {dates}",
  },
  passedMany: {
    en: "{body} passed the point {n} times, turning back and forward again: {dates}",
    fr: "{body} est passé {n} fois sur ce point, en rebroussant chemin puis en repartant\u202f: {dates}",
  },
  willOne: {
    en: "{body} will pass the point exactly {dates}",
    fr: "{body} passera exactement sur ce point {dates}",
  },
  willMany: {
    en: "{body} will pass the point {n} times, turning back and forward again: {dates}",
    fr: "{body} passera {n} fois sur ce point, en rebroussant chemin puis en repartant\u202f: {dates}",
  },
  retro: { en: "retrograde", fr: "rétrograde" },
  none: {
    en: "No exact passage was found in the years it is looked for: the sky could not say here.",
    fr: "Aucun passage exact n’a été trouvé dans les années où on le cherche\u202f: le ciel n’a pas pu le dire ici.",
  },
  beyond: {
    en: "It falls after 2399, beyond the years the ephemeris covers.",
    fr: "Il tombe après 2399, au-delà des années que couvrent les éphémérides.",
  },
  unknownTime: {
    en: "Without a birth time, the places at birth are taken at noon: these dates may move by a day or two.",
    fr: "Sans heure de naissance, les places à la naissance sont prises à midi\u202f: ces dates peuvent bouger d’un jour ou deux.",
  },
};

/** The solar return of a year. */
export const HDC_SOLAR: { what: Bi; lead: Bi; leadDay: Bi; same: Bi; theme: Bi; themeCentres: Bi; themeNone: Bi; unknownTime: Bi; none: Bi } = {
  what: {
    en: "Each year, around your birthday, the Sun comes back to the exact place it held when you were born. Its gate and line, and the Earth’s opposite, are always your own Personality Sun and Earth: the year begins again from your core theme. What changes from year to year is the rest of the sky at that moment, read against your gates like any transit: the channels it completes and the centres it defines give the year that begins a colour, a theme to notice rather than a forecast.",
    fr: "Chaque année, autour de votre anniversaire, le Soleil revient à la place exacte qu’il occupait à votre naissance. Sa porte et sa ligne, et celles de la Terre en face, sont toujours votre Soleil et votre Terre de Personnalité\u202f: l’année repart de votre thème central. Ce qui change d’une année à l’autre, c’est le reste du ciel à ce moment-là, lu face à vos portes comme tout transit\u202f: les canaux qu’il complète et les centres qu’il définit donnent une couleur à l’année qui commence, un thème à remarquer plutôt qu’une prévision.",
  },
  lead: {
    en: "In {year}, the Sun comes back to its place at your birth on {date} at {time} ({zone}).",
    fr: "En {year}, le Soleil revient à sa place de votre naissance le {date} à {time} ({zone}).",
  },
  leadDay: {
    en: "In {year}, the Sun comes back to its place at your birth on {date}.",
    fr: "En {year}, le Soleil revient à sa place de votre naissance le {date}.",
  },
  same: {
    en: "The Sun in gate {sun} and the Earth in gate {earth}, as at your birth: {sunName} and {earthName}.",
    fr: "Le Soleil dans la porte {sun} et la Terre dans la porte {earth}, comme à votre naissance\u202f: {sunName} et {earthName}.",
  },
  theme: {
    en: "The year’s theme, in Human Design’s terms: at that moment, with your gates, the sky completes {channels}.",
    fr: "Le thème de l’année, dans les termes du Human Design\u202f: à ce moment-là, avec vos portes, le ciel complète {channels}.",
  },
  themeCentres: {
    en: "It defines {centres} for you, open in your chart.",
    fr: "Il définit pour vous ce que votre thème laisse ouvert\u202f: {centres}.",
  },
  themeNone: {
    en: "The year’s theme, in Human Design’s terms: at that moment the sky completes no channel with your gates, a year to come back to your own definition.",
    fr: "Le thème de l’année, dans les termes du Human Design\u202f: à ce moment-là, le ciel ne complète aucun canal avec vos portes, une année pour revenir à votre propre définition.",
  },
  unknownTime: {
    en: "Without a birth time, the Sun’s place at birth is taken at noon: the return may be up to half a day earlier or later.",
    fr: "Sans heure de naissance, la place du Soleil à la naissance est prise à midi\u202f: le retour peut avoir lieu jusqu’à une demi-journée plus tôt ou plus tard.",
  },
  none: {
    en: "The sky could not say when the Sun comes back that year.",
    fr: "Le ciel n’a pas pu dire quand le Soleil revient cette année-là.",
  },
};

/** The side panel's first read: its lead, each step's text when the step has no reading of its own yet, and what to look at next. */
export const HDC_FIRST: { lead: Bi; next: Bi; working: Bi } = {
  lead: {
    en: "Your bodygraph under the sky of the moment, then the cycles of a life. Transits are weather, not who you are: they lend a theme for a while.",
    fr: "Votre bodygraph sous le ciel du moment, puis les cycles d’une vie. Les transits sont une météo, pas ce que vous êtes\u202f: ils prêtent un thème pour un temps.",
  },
  next: {
    en: "Move the dial to see another moment: the figure follows. Choose any gate, channel or centre to read it as it stands between you and the moment.",
    fr: "Déplacez le cadran pour voir un autre moment\u202f: la figure suit. Choisissez une porte, un canal ou un centre pour le lire tel qu’il se tient entre vous et le moment.",
  },
  working: {
    en: "Finding the exact dates…",
    fr: "Calcul des dates exactes…",
  },
};

/** How Ulune finds these dates (the method notes). */
export const HDC_METHOD_TITLE: Bi = { en: "How Ulune finds these dates", fr: "Comment Ulune trouve ces dates" };
export const HDC_METHOD: readonly Bi[] = [
  {
    en: "The moment’s gates are those of the Sun, the Earth, the Moon, the true nodes and the planets from Mercury to Pluto, placed in their gates and lines as in your bodygraph, from the Swiss Ephemeris: the same calculation as astrology’s transits.",
    fr: "Les portes du moment sont celles du Soleil, de la Terre, de la Lune, des nœuds vrais et des planètes de Mercure à Pluton, placés dans leurs portes et leurs lignes comme dans votre bodygraph, d’après les éphémérides suisses\u202f: le même calcul que les transits de l’astrologie.",
  },
  {
    en: "A channel the moment completes has one gate in your chart and the other in the sky; it lasts while the planet stays in that gate, hours for the Moon, years for Pluto. A centre it defines for you is open in your chart and defined, now, by the sky’s own channels or by those it completes with you.",
    fr: "Un canal que le moment complète a une porte dans votre thème et l’autre dans le ciel\u202f; il dure tant que la planète reste dans cette porte, quelques heures pour la Lune, des années pour Pluton. Un centre qu’il définit pour vous est ouvert dans votre thème et défini, en ce moment, par les canaux du ciel lui-même ou par ceux qu’il complète avec vous.",
  },
  {
    en: "Each life cycle’s date is the exact moment the planet stands on its place at your birth, opposite it for Uranus, found to the second: the sky is sampled every 30 days, each crossing is found on the curve between two samples, then polished on the sky itself.",
    fr: "La date de chaque cycle de vie est le moment exact où la planète se tient sur sa place de votre naissance, en face pour Uranus, trouvé à la seconde près\u202f: le ciel est échantillonné tous les 30 jours, chaque passage est trouvé sur la courbe entre deux échantillons, puis affiné sur le ciel lui-même.",
  },
  {
    en: "A slow planet can pass its point up to three times, five for Chiron, turning back (retrograde, marked ℞) and forward again: every passage is listed.",
    fr: "Une planète lente peut passer jusqu’à trois fois sur son point, cinq pour Chiron, en rebroussant chemin (rétrograde, marqué ℞) puis en repartant\u202f: chaque passage est listé.",
  },
  {
    en: "“Now” means from a year before a cycle’s first exact passage to a year after its last, since Human Design speaks of these cycles as seasons of life rather than days; behind you and ahead are counted from the dial’s moment.",
    fr: "«\u202fEn ce moment\u202f» va d’un an avant le premier passage exact d’un cycle à un an après le dernier, car le Human Design parle de ces cycles comme de saisons de la vie plutôt que de jours\u202f; derrière vous et à venir se comptent depuis le moment du cadran.",
  },
  {
    en: "The solar return is the moment the Sun comes back to its exact place at your birth, given in your birthplace’s time. Its Sun and Earth are always yours; the year’s theme is read from the rest of that moment’s sky.",
    fr: "Le retour solaire est le moment où le Soleil revient à sa place exacte de votre naissance, donné à l’heure de votre lieu de naissance. Son Soleil et sa Terre sont toujours les vôtres\u202f; le thème de l’année se lit dans le reste du ciel de ce moment-là.",
  },
  {
    en: "Calculated on this device by default, with nothing of yours in the sky’s calculations. With Ulune’s server chosen in Settings, the dates come from the shared sky files, the same for everyone, so no date of yours is sent for them.",
    fr: "Calculé sur cet appareil par défaut, sans rien de vous dans les calculs du ciel. Avec le serveur d’Ulune choisi dans les Réglages, les dates viennent des fichiers du ciel partagés, les mêmes pour tous\u202f: aucune de vos dates n’est envoyée pour cela.",
  },
];

/** The words the readings put between their parts. */
export const HDC_WORDS = {
  and: { en: " and ", fr: " et " },
  more: { en: "and {n} more", fr: "et {n} autres" },
  channelOne: { en: "1 channel", fr: "1 canal" },
  channelMany: { en: "{n} channels", fr: "{n} canaux" },
  channelNone: { en: "no channel", fr: "aucun canal" },
  centreNone: { en: "no centre", fr: "aucun centre" },
  theGate: { en: "The gate", fr: "La porte" },
  theChannel: { en: "The channel", fr: "Le canal" },
  theCentre: { en: "The centre", fr: "Le centre" },
  theBody: { en: "In Human Design", fr: "En Human Design" },
  theWeek: { en: "The Sun’s gate", fr: "La porte du Soleil" },
  theEarth: { en: "The Earth’s gate", fr: "La porte de la Terre" },
  theCycle: { en: "What it asks", fr: "Ce qu’il demande" },
  thePoint: { en: "Its point in your chart", fr: "Son point dans votre thème" },
  theYear: { en: "The year’s theme", fr: "Le thème de l’année" },
  noTime: { en: "Birth time unknown", fr: "Heure de naissance inconnue" },
  aboutTransits: { en: "About transits", fr: "À propos des transits" },
  aboutCycles: { en: "About the life cycles", fr: "À propos des cycles de vie" },
  aboutSolar: { en: "About the solar return", fr: "À propos du retour solaire" },
  now: { en: "Now", fr: "En ce moment" },
  completesTitle: { en: "What the moment completes", fr: "Ce que le moment complète" },
  centresTitle: { en: "Centres the moment defines for you", fr: "Centres que le moment définit pour vous" },
  momentTitle: { en: "The moment", fr: "Le moment" },
  weekTitle: { en: "Gate of the week", fr: "Porte de la semaine" },
  moonTitle: { en: "The Moon’s gate", fr: "La porte de la Lune" },
  solarTitle: { en: "Solar return {year}", fr: "Retour solaire {year}" },
  temporary: { en: "Temporary definition", fr: "Définition temporaire" },
  momentOwn: { en: "The moment’s own channel", fr: "Canal propre au moment" },
  yoursWord: { en: "Your channel", fr: "Votre canal" },
  notFormed: { en: "Not formed now", fr: "Non formé en ce moment" },
  defined: { en: "Defined in your chart", fr: "Défini dans votre thème" },
  conditioned: { en: "Defined by the moment", fr: "Défini par le moment" },
  together: { en: "Defined with the moment", fr: "Défini avec le moment" },
  openNow: { en: "Open now", fr: "Ouvert en ce moment" },
  yourGate: { en: "Your gate", fr: "Votre porte" },
  momentGate: { en: "The moment’s gate", fr: "Porte du moment" },
  bothGate: { en: "Yours and the moment’s", fr: "À vous et au moment" },
  noGate: { en: "Not active now", fr: "Inactive en ce moment" },
  inChart: { en: "In your chart", fr: "Dans votre thème" },
  inSky: { en: "In the sky", fr: "Dans le ciel" },
  centreWord: { en: "Centre", fr: "Centre" },
  stays: { en: "Stays in a gate", fr: "Reste dans une porte" },
  until: { en: "Until", fr: "Jusqu’à" },
  point: { en: "Point of return", fr: "Point de retour" },
  pointOpposite: { en: "Point of opposition", fr: "Point d’opposition" },
  status: { en: "Where it stands", fr: "Où il en est" },
  past: { en: "Behind you", fr: "Derrière vous" },
  coming: { en: "Ahead", fr: "À venir" },
  passageOne: { en: "Exact passage", fr: "Passage exact" },
  passageMany: { en: "Exact passages", fr: "Passages exacts" },
  ageWord: { en: "Age", fr: "Âge" },
  ageValue: { en: "{n}", fr: "{n} ans" },
  ageRange: { en: "{a} to {b}", fr: "{a} à {b} ans" },
  sunEarth: { en: "Sun and Earth", fr: "Soleil et Terre" },
  zoneTime: { en: "{zone} time", fr: "heure {deZone}" },
  dayAt: { en: "{day}, {time}", fr: "{day} à {time}" },
} as const satisfies Record<string, Bi>;

/** The bodies as a sentence names them (with their article where they take one). */
export const HDC_BODY_NAME: Record<HdBodyId, Bi> = {
  sun: { en: "the Sun", fr: "le Soleil" },
  earth: { en: "the Earth", fr: "la Terre" },
  moon: { en: "the Moon", fr: "la Lune" },
  northnode: { en: "the North Node", fr: "le Nœud Nord" },
  southnode: { en: "the South Node", fr: "le Nœud Sud" },
  mercury: { en: "Mercury", fr: "Mercure" },
  venus: { en: "Venus", fr: "Vénus" },
  mars: { en: "Mars", fr: "Mars" },
  jupiter: { en: "Jupiter", fr: "Jupiter" },
  saturn: { en: "Saturn", fr: "Saturne" },
  uranus: { en: "Uranus", fr: "Uranus" },
  neptune: { en: "Neptune", fr: "Neptune" },
  pluto: { en: "Pluto", fr: "Pluton" },
};

/** The life cycles' planets, by name (Chiron is not one of the bodygraph's bodies). */
export const HDC_CYCLE_BODY: Record<"saturn" | "uranus" | "chiron", Bi> = {
  saturn: { en: "Saturn", fr: "Saturne" },
  uranus: { en: "Uranus", fr: "Uranus" },
  chiron: { en: "Chiron", fr: "Chiron" },
};

/** An age in a sentence: at one age, or across two years of life (a cycle's passages). */
export const HDC_AGE: { at: Bi; between: Bi } = {
  at: { en: "at {n}", fr: "à {n} ans" },
  between: { en: "between {a} and {b}", fr: "entre {a} et {b} ans" },
};
