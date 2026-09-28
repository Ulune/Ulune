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
  | "lifePath"
  | "nameNumbers"
  | "birthday"
  | "masterNumbers";

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
};

export const GLOSSARY_ORDER = Object.keys(GLOSSARY) as GlossaryId[];

/** The words a reading uses, from what is chosen and the mode it is in. */
export function glossaryFor(page: string, selectedId: string | null): GlossaryId[] {
  const out: GlossaryId[] = [];
  const add = (...ids: GlossaryId[]) => {
    for (const id of ids) if (!out.includes(id)) out.push(id);
  };
  const prefix = selectedId?.split(":")[0] ?? "";
  if (page === "transits" || page === "timing") add("transit");
  if (page === "progressions") add("progression");
  if (page === "synastry") add("synastry");
  if (page === "composite") add("composite");
  if (page === "design") {
    // The words the chosen piece's reading uses first, then the keys.
    if (prefix === "gate" || prefix === "act") add("hdGate", "hdLine", "hdHanging", "hdChannel");
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
  if (page === "numerology") add("lifePath", "nameNumbers", "birthday", "masterNumbers");
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
