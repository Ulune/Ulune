/**
 * Human Design: the words of the first read (the five steps in the side
 * panel before anything is chosen), what each of the 13 bodies stands for,
 * the Incarnation Cross, the four arrows of Variable and what a chart
 * without a birth time says. Written for Ulune, in English and French side by
 * side (one language per reading pack, scripts/content-packs-plugin.mjs).
 */
import type { Bi } from "./types";
import type { HdArrowId, HdAuthority, HdBodyId, HdDefinition, HdStrategy, HdType } from "@/lib/chart/human-design";
import type { HdAngle } from "@/lib/chart/hd-cross";

/** What each body stands for in Human Design: the first lines of a row's reading. */
export const HD_BODY_TEXT: Record<HdBodyId, Bi> = {
  sun: {
    en: "Human Design gives the Sun the most weight, about 70% of the imprint: its gate is your core theme, the light others see first.",
    fr: "Le Human Design donne au Soleil le plus de poids, environ 70 % de l’empreinte : sa porte est votre thème central, la lumière que les autres voient d’abord.",
  },
  earth: {
    en: "The Earth is always opposite the Sun: its gate is what grounds you and keeps the Sun’s theme steady, your balance.",
    fr: "La Terre est toujours à l’opposé du Soleil : sa porte est ce qui vous ancre et stabilise le thème du Soleil, votre équilibre.",
  },
  northnode: {
    en: "The North Node describes the setting and direction of the second half of life, roughly from your forties on: where you are heading.",
    fr: "Le Nœud Nord décrit le cadre et la direction de la seconde moitié de la vie, à partir de la quarantaine environ : là où vous allez.",
  },
  southnode: {
    en: "The South Node describes the setting of the first half of life, until about forty: the places and people that shape you early on.",
    fr: "Le Nœud Sud décrit le cadre de la première moitié de la vie, jusque vers quarante ans : les lieux et les gens qui vous façonnent d’abord.",
  },
  moon: {
    en: "The Moon is the driving force: its gate shows what moves you and keeps you going.",
    fr: "La Lune est la force motrice : sa porte montre ce qui vous pousse et vous fait avancer.",
  },
  mercury: {
    en: "Mercury is communication: its gate shows what you are here to say and how your thoughts want to come out.",
    fr: "Mercure est la communication : sa porte montre ce que vous avez à dire et la façon dont vos pensées veulent sortir.",
  },
  venus: {
    en: "Venus is values: its gate shows what feels right or wrong to you, the sense of fairness you bring to others.",
    fr: "Vénus représente les valeurs : sa porte montre ce qui vous semble juste ou non, le sens de l’équité que vous apportez aux autres.",
  },
  mars: {
    en: "Mars is where you mature: its gate is a theme you live out clumsily at first, then grow into through experience.",
    fr: "Mars est ce qui mûrit : sa porte est un thème que vous vivez d’abord maladroitement, puis que l’expérience fait grandir.",
  },
  jupiter: {
    en: "Jupiter is your own law: its gate shows the principle that protects and rewards you when you live by it.",
    fr: "Jupiter est votre propre loi : sa porte montre le principe qui vous protège et vous récompense quand vous le suivez.",
  },
  saturn: {
    en: "Saturn is the judge: its gate shows where discipline pays off, and where things go wrong when its theme is ignored.",
    fr: "Saturne est le juge : sa porte montre où la discipline paie, et où les choses se gâtent quand son thème est négligé.",
  },
  uranus: {
    en: "Uranus is the unusual: its gate shows where you are different, and where you can surprise people.",
    fr: "Uranus est l’inhabituel : sa porte montre en quoi vous êtes différent, et où vous pouvez surprendre.",
  },
  neptune: {
    en: "Neptune is the veil: its gate is a theme that is hard to see clearly in yourself, where illusion and inspiration mix.",
    fr: "Neptune est le voile : sa porte est un thème difficile à voir clairement en vous, où se mêlent illusion et inspiration.",
  },
  pluto: {
    en: "Pluto is truth: its gate shows where deep, slow change happens, and what cannot stay hidden.",
    fr: "Pluton est la vérité : sa porte montre où se jouent les changements profonds et lents, et ce qui ne peut rester caché.",
  },
};

/** Step 1: each type in a sentence, day to day. */
export const HD_TYPE_STEP: Record<HdType, Bi> = {
  Manifestor: {
    en: "You are built to start things and to have an impact; your energy comes in bursts rather than steadily.",
    fr: "Vous êtes fait pour lancer les choses et avoir de l’impact ; votre énergie vient par poussées plutôt que de façon régulière.",
  },
  Generator: {
    en: "You have steady, renewable energy for work you love, released when you respond to what life brings.",
    fr: "Vous avez une énergie régulière et renouvelable pour ce que vous aimez, qui se libère quand vous répondez à ce que la vie apporte.",
  },
  "Manifesting Generator": {
    en: "You have a Generator’s steady energy and a quick start: once you respond, you move fast, often on several things at once.",
    fr: "Vous avez l’énergie régulière d’un Générateur et un démarrage rapide : une fois que vous avez répondu, vous allez vite, souvent sur plusieurs choses à la fois.",
  },
  Projector: {
    en: "You are built to guide: you see how people and systems work, and your energy is not made for constant work.",
    fr: "Vous êtes fait pour guider : vous voyez comment fonctionnent les gens et les systèmes, et votre énergie n’est pas faite pour un travail continu.",
  },
  Reflector: {
    en: "You take in and reflect the people and places around you, so where you are and who you are with shape how you feel.",
    fr: "Vous captez et reflétez les gens et les lieux qui vous entourent : où vous êtes et avec qui façonnent ce que vous ressentez.",
  },
};

/** Each type’s not-self theme (off track) and signature (on track). */
export const HD_SIGNPOSTS: Record<HdType, { notSelf: Bi; signature: Bi }> = {
  Manifestor: { notSelf: { en: "anger", fr: "la colère" }, signature: { en: "peace", fr: "la paix" } },
  Generator: { notSelf: { en: "frustration", fr: "la frustration" }, signature: { en: "satisfaction", fr: "la satisfaction" } },
  "Manifesting Generator": {
    notSelf: { en: "frustration and anger", fr: "la frustration et la colère" },
    signature: { en: "satisfaction and peace", fr: "la satisfaction et la paix" },
  },
  Projector: { notSelf: { en: "bitterness", fr: "l’amertume" }, signature: { en: "success", fr: "le succès" } },
  Reflector: { notSelf: { en: "disappointment", fr: "la déception" }, signature: { en: "surprise", fr: "la surprise" } },
};

export const HD_SIGNPOSTS_LINE: Bi = {
  en: "Signposts: {notSelf} when you are off track (the not-self theme), {signature} when you are on it (the signature).",
  fr: "Repères : {notSelf} quand vous vous écartez de votre voie (le thème du non-soi), {signature} quand vous la suivez (la signature).",
};

/** Step 2: the strategy, with one everyday example. */
export const HD_STRATEGY_STEP: Record<HdStrategy, Bi> = {
  "Inform before acting": {
    en: "Before you act, tell the people it affects what you are about to do. Example: letting your household know before you rearrange the living room.",
    fr: "Avant d’agir, prévenez les personnes concernées de ce que vous allez faire. Exemple : avertir votre foyer avant de réaménager le salon.",
  },
  "Wait to respond": {
    en: "Let life bring you something to answer, a question or an offer, and follow your gut’s yes or no. Example: joining a project because it lit you up when it was offered.",
    fr: "Laissez la vie vous apporter de quoi répondre, une question ou une proposition, et suivez le oui ou le non de votre ventre. Exemple : rejoindre un projet parce qu’il vous a enthousiasmé quand on vous l’a proposé.",
  },
  "Wait for the invitation": {
    en: "Wait to be recognised and invited, above all for work, love and where you live. Example: advice you were asked for gets used; unasked, it is often ignored.",
    fr: "Attendez d’être reconnu et invité, surtout pour le travail, l’amour et le lieu de vie. Exemple : un conseil demandé est suivi ; non sollicité, il est souvent ignoré.",
  },
  "Wait a lunar cycle": {
    en: "Give important decisions a full Moon cycle, about 29 days. Example: living with the idea of a move for a month before signing a lease.",
    fr: "Donnez aux décisions importantes un cycle lunaire complet, environ 29 jours. Exemple : vivre un mois avec l’idée d’un déménagement avant de signer un bail.",
  },
};

/** Step 3: how to use the authority. */
export const HD_AUTHORITY_STEP: Record<HdAuthority, Bi> = {
  Emotional: {
    en: "Your clarity comes with time, not in the moment: let the wave of feelings rise and fall before you decide, and sleep on it.",
    fr: "Votre clarté vient avec le temps, pas dans l’instant : laissez la vague des émotions monter et redescendre avant de décider, et dormez dessus.",
  },
  Sacral: {
    en: "Trust your gut’s immediate yes or no, in the moment, before your mind argues.",
    fr: "Fiez-vous au oui ou au non immédiat de votre ventre, sur le moment, avant que le mental n’argumente.",
  },
  Splenic: {
    en: "Trust the quiet instinct of the moment: it speaks once and does not repeat itself.",
    fr: "Fiez-vous à l’instinct discret de l’instant : il ne parle qu’une fois et ne se répète pas.",
  },
  Ego: {
    en: "Decide from what you truly want and are willing to put your will behind.",
    fr: "Décidez à partir de ce que vous voulez vraiment et êtes prêt à soutenir de votre volonté.",
  },
  "Self-Projected": {
    en: "Talk your choice through with someone you trust and listen to what you hear yourself say.",
    fr: "Parlez de votre choix à une personne de confiance et écoutez ce que vous vous entendez dire.",
  },
  Mental: {
    en: "There is no inner authority: talk things over with people you trust, in places that feel right, and let clarity come from outside.",
    fr: "Il n’y a pas d’autorité intérieure : parlez-en avec des personnes de confiance, dans des lieux qui vous conviennent, et laissez la clarté venir de l’extérieur.",
  },
  Lunar: {
    en: "Take a full Moon cycle, about 29 days, over big decisions, and notice what stays the same.",
    fr: "Prenez un cycle lunaire complet, environ 29 jours, pour les grandes décisions, et observez ce qui reste constant.",
  },
};

/** Step 4: where the profile’s two numbers come from. */
export const HD_PROFILE_STEP: Bi = {
  en: "The {a} is the line of your Personality Sun ({aName}), the {b} the line of your Design Sun ({bName}).",
  fr: "Le {a} est la ligne de votre Soleil de la Personnalité ({aName}), le {b} celle de votre Soleil du Design ({bName}).",
};

/** Step 5: the definition, in a sentence. */
export const HD_DEFINITION_STEP: Record<HdDefinition, Bi> = {
  None: {
    en: "No centre is coloured: you take in and reflect everything around you.",
    fr: "Aucun centre n’est coloré : vous captez et reflétez tout ce qui vous entoure.",
  },
  Single: {
    en: "Your coloured centres form one connected whole: you tend to work things out on your own.",
    fr: "Vos centres colorés forment un seul ensemble relié : vous avez tendance à démêler les choses seul.",
  },
  Split: {
    en: "Your coloured centres form two groups that are not joined: other people often bridge them, and taking your time helps.",
    fr: "Vos centres colorés forment deux groupes qui ne se rejoignent pas : d’autres personnes font souvent le pont, et prendre votre temps aide.",
  },
  "Triple split": {
    en: "Three separate groups: variety suits you, as different people connect different parts.",
    fr: "Trois groupes séparés : la variété vous réussit, car des personnes différentes relient des parties différentes.",
  },
  "Quadruple split": {
    en: "Four separate groups, which is rare: things come together slowly, over time and through many contacts.",
    fr: "Quatre groupes séparés, ce qui est rare : les choses se rassemblent lentement, avec le temps et au fil de nombreux contacts.",
  },
};

/** After the five steps. */
export const HD_NEXT: Bi = {
  en: "Then the chart itself: coloured centres are where you are consistent, white ones where you take in others, and each coloured line is a lasting trait. Choose any piece to read it.",
  fr: "Puis le schéma lui-même : les centres colorés sont vos constantes, les blancs ce que vous captez des autres, et chaque ligne colorée est un trait durable. Choisissez n’importe quel élément pour le lire.",
};

/** The Incarnation Cross: what it is, and its three angles. */
export const HD_CROSS_TEXT: { what: Bi; mine: Bi; angle: Record<HdAngle, Bi> } = {
  what: {
    en: "The Incarnation Cross is made of four gates: those of the Sun and the Earth at birth (the Personality) and in the Design. It is written Personality Sun/Earth | Design Sun/Earth, and Human Design reads it as the theme of a life. The profile sets its angle.",
    fr: "La croix d’incarnation est faite de quatre portes : celles du Soleil et de la Terre à la naissance (la Personnalité) et dans le Design. Elle s’écrit Soleil/Terre de la Personnalité | Soleil/Terre du Design, et le Human Design la lit comme le thème d’une vie. Le profil fixe son angle.",
  },
  mine: {
    en: "Your cross is {gates}: gates {ps} and {pe} from your Personality Sun and Earth, gates {ds} and {de} from your Design Sun and Earth, the Sun’s gates carrying most of its weight.",
    fr: "Votre croix est {gates} : les portes {ps} et {pe} de votre Soleil et de votre Terre de la Personnalité, les portes {ds} et {de} de votre Soleil et de votre Terre du Design, celles du Soleil portant l’essentiel de son poids.",
  },
  angle: {
    right: {
      en: "A Right Angle cross (profiles 1/3 to 4/6) describes a personal destiny: a life that unfolds mostly through your own process.",
      fr: "Une croix d’angle droit (profils 1/3 à 4/6) décrit une destinée personnelle : une vie qui se déploie surtout à travers votre propre processus.",
    },
    juxtaposition: {
      en: "A Juxtaposition cross (profile 4/1 only) describes a fixed path: a life that keeps to its own track, between the personal and the transpersonal.",
      fr: "Une croix de juxtaposition (profil 4/1 seulement) décrit un chemin fixe : une vie qui garde sa propre voie, entre le personnel et le transpersonnel.",
    },
    left: {
      en: "A Left Angle cross (profiles 5/1 to 6/3) describes a transpersonal destiny: a life that unfolds largely through meeting others.",
      fr: "Une croix d’angle gauche (profils 5/1 à 6/3) décrit une destinée transpersonnelle : une vie qui se déploie largement à travers les rencontres.",
    },
  },
};

/** The first line of a gate, channel or row reading: this chart, before the general meaning. */
export const HD_IN_CHART: {
  gateBy: Bi;
  gateNone: Bi;
  channelBoth: Bi;
  channelHalf: Bi;
  channelNone: Bi;
  rowHere: Bi;
  and: Bi;
} = {
  gateBy: { en: "In your chart: {acts}.", fr: "Dans votre schéma : {acts}." },
  gateNone: { en: "Not coloured in your chart.", fr: "Non colorée dans votre schéma." },
  channelBoth: { en: "Defined in your chart: {a} and {b}.", fr: "Défini dans votre schéma : {a} et {b}." },
  channelHalf: {
    en: "Half of it in your chart: {a}; gate {open} is not coloured.",
    fr: "À moitié dans votre schéma : {a} ; la porte {open} n’est pas colorée.",
  },
  channelNone: { en: "Neither of its gates is coloured in your chart.", fr: "Aucune de ses portes n’est colorée dans votre schéma." },
  rowHere: {
    en: "In your chart, {act} colours gate {gate}, line {line} ({lineName}).",
    fr: "Dans votre schéma, {act} colore la porte {gate}, ligne {line} ({lineName}).",
  },
  and: { en: " and ", fr: " et " },
};

/** Variable: the four arrows, read from the tones of the Suns and the Nodes. */
export const HD_VARIABLE_TEXT: {
  arrow: Record<HdArrowId, Bi>;
  left: Bi;
  right: Bi;
  unsteady: Bi;
  about: Bi;
} = {
  arrow: {
    determination: {
      en: "The Design Sun’s arrow, Determination, is about how your body is best nourished: {name}, colour {color}.",
      fr: "La flèche du Soleil du Design, la Détermination, parle de la façon dont votre corps se nourrit le mieux : {name}, couleur {color}.",
    },
    environment: {
      en: "The Design Node’s arrow, Environment, is about the kind of place where you do well: {name}, colour {color}.",
      fr: "La flèche du Nœud du Design, l’Environnement, parle du genre de lieu où vous êtes bien : {name}, couleur {color}.",
    },
    motivation: {
      en: "The Personality Sun’s arrow, Motivation, is about what drives your mind: {name}, colour {color}.",
      fr: "La flèche du Soleil de la Personnalité, la Motivation, parle de ce qui pousse votre mental : {name}, couleur {color}.",
    },
    perspective: {
      en: "The Personality Node’s arrow, Perspective, is about how your mind sees the world: {name}, colour {color}.",
      fr: "La flèche du Nœud de la Personnalité, la Perspective, parle de la façon dont votre mental voit le monde : {name}, couleur {color}.",
    },
  },
  left: {
    en: "It points left (tone {tone}): focused and active, at its best with a clear, specific way of doing things.",
    fr: "Elle pointe à gauche (ton {tone}) : concentrée et active, au mieux avec une façon de faire claire et précise.",
  },
  right: {
    en: "It points right (tone {tone}): receptive and open, at its best taking things in as they come.",
    fr: "Elle pointe à droite (ton {tone}) : réceptive et ouverte, au mieux en accueillant les choses comme elles viennent.",
  },
  unsteady: {
    en: "Half an hour either side of your birth time this arrow changes: it could point the other way or take another colour.",
    fr: "À une demi-heure près de votre heure de naissance, cette flèche change : elle pourrait pointer de l’autre côté ou prendre une autre couleur.",
  },
  about: {
    en: "Variable is the finest layer of a bodygraph, read from four arrows: the tones of the Sun and of the Nodes, in the Design and in the Personality. Each arrow points left (tones 1 to 3) or right (tones 4 to 6). Teachers suggest living by type, strategy and authority for a long while before working with it.",
    fr: "La Variable est la couche la plus fine d’un bodygraph, lue sur quatre flèches : les tons du Soleil et des Nœuds, dans le Design et dans la Personnalité. Chaque flèche pointe à gauche (tons 1 à 3) ou à droite (tons 4 à 6). Les enseignants conseillent de vivre longtemps selon son type, sa stratégie et son autorité avant de s’y intéresser.",
  },
};

/** Without a birth time: what could differ at another hour of that day. */
export const HD_UNKNOWN_TEXT: { row: Bi; key: Bi; channel: Bi } = {
  row: {
    en: "Without a birth time this could be another gate or line: the chart is cast at noon.",
    fr: "Sans heure de naissance, ce pourrait être une autre porte ou une autre ligne : le schéma est calculé à midi.",
  },
  key: {
    en: "Without a birth time this could be different: at another hour of that day the chart gives another answer.",
    fr: "Sans heure de naissance, ce pourrait être différent : à une autre heure de ce jour-là, le schéma donne une autre réponse.",
  },
  channel: {
    en: "Without a birth time this channel could be different: at another hour of that day it is defined or not.",
    fr: "Sans heure de naissance, ce canal pourrait être différent : à une autre heure de ce jour-là, il est défini ou non.",
  },
};
