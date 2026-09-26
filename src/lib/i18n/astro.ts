import type { AngleId, AspectId, ElementId, ModalityId, PlanetId, SignId } from "@/lib/chart/types";
import type { Locale } from "./locale";

const SIGN_EN: Record<SignId, string> = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces",
};

const SIGN_FR: Record<SignId, string> = {
  aries: "Bélier",
  taurus: "Taureau",
  gemini: "Gémeaux",
  cancer: "Cancer",
  leo: "Lion",
  virgo: "Vierge",
  libra: "Balance",
  scorpio: "Scorpion",
  sagittarius: "Sagittaire",
  capricorn: "Capricorne",
  aquarius: "Verseau",
  pisces: "Poissons",
};

/** Grammatical article for each sign. Gémeaux and Poissons are plural. */
const SIGN_ART_FR: Record<SignId, "le" | "la" | "les"> = {
  aries: "le",
  taurus: "le",
  gemini: "les",
  cancer: "le",
  leo: "le",
  virgo: "la",
  libra: "la",
  scorpio: "le",
  sagittarius: "le",
  capricorn: "le",
  aquarius: "le",
  pisces: "les",
};

const SIGN_ABBR_EN: Record<SignId, string> = {
  aries: "Ari",
  taurus: "Tau",
  gemini: "Gem",
  cancer: "Can",
  leo: "Leo",
  virgo: "Vir",
  libra: "Lib",
  scorpio: "Sco",
  sagittarius: "Sag",
  capricorn: "Cap",
  aquarius: "Aqu",
  pisces: "Pis",
};

const SIGN_ABBR_FR: Record<SignId, string> = {
  aries: "Bél",
  taurus: "Tau",
  gemini: "Gém",
  cancer: "Can",
  leo: "Lio",
  virgo: "Vie",
  libra: "Bal",
  scorpio: "Sco",
  sagittarius: "Sag",
  capricorn: "Cap",
  aquarius: "Ver",
  pisces: "Poi",
};

const PLANET_EN: Record<PlanetId, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
  chiron: "Chiron",
  northnode: "North Node",
  southnode: "South Node",
  lilith: "True Lilith",
  vertex: "Vertex",
  antivertex: "Anti-Vertex",
  fortune: "Lot of Fortune",
  spirit: "Lot of Spirit",
  ceres: "Ceres",
  pallas: "Pallas",
  juno: "Juno",
  vesta: "Vesta",
  eris: "Eris",
  sedna: "Sedna",
};

type FrArticle = "" | "le" | "la" | "l'";

type FrNom = {
  article: FrArticle;
  name: string;
};

const PLANET_FR_NOM: Record<PlanetId, FrNom> = {
  sun: { article: "le", name: "Soleil" },
  moon: { article: "la", name: "Lune" },
  mercury: { article: "", name: "Mercure" },
  venus: { article: "", name: "Vénus" },
  mars: { article: "", name: "Mars" },
  jupiter: { article: "", name: "Jupiter" },
  saturn: { article: "", name: "Saturne" },
  uranus: { article: "", name: "Uranus" },
  neptune: { article: "", name: "Neptune" },
  pluto: { article: "", name: "Pluton" },
  chiron: { article: "", name: "Chiron" },
  northnode: { article: "le", name: "Nœud Nord réel" },
  southnode: { article: "le", name: "Nœud Sud" },
  lilith: { article: "", name: "Lilith réelle" },
  vertex: { article: "le", name: "Vertex" },
  antivertex: { article: "l'", name: "Anti-Vertex" },
  fortune: { article: "le", name: "Lot de Fortune" },
  spirit: { article: "le", name: "Lot d’Esprit" },
  ceres: { article: "", name: "Cérès" },
  pallas: { article: "", name: "Pallas" },
  juno: { article: "", name: "Junon" },
  vesta: { article: "", name: "Vesta" },
  eris: { article: "", name: "Éris" },
  sedna: { article: "", name: "Sedna" },
};

const PLANET_ABBR_EN: Record<PlanetId, string> = {
  sun: "Sun",
  moon: "Moo",
  mercury: "Mer",
  venus: "Ven",
  mars: "Mar",
  jupiter: "Jup",
  saturn: "Sat",
  uranus: "Ura",
  neptune: "Nep",
  pluto: "Plu",
  chiron: "Chi",
  northnode: "NN",
  southnode: "SN",
  lilith: "Lil",
  vertex: "Vx",
  antivertex: "Avx",
  fortune: "LF",
  spirit: "LS",
  ceres: "Cer",
  pallas: "Pal",
  juno: "Jun",
  vesta: "Ves",
  eris: "Eri",
  sedna: "Sed",
};

const PLANET_ABBR_FR: Record<PlanetId, string> = {
  sun: "Sol",
  moon: "Lun",
  mercury: "Mer",
  venus: "Vén",
  mars: "Mar",
  jupiter: "Jup",
  saturn: "Sat",
  uranus: "Ura",
  neptune: "Nep",
  pluto: "Plu",
  chiron: "Chi",
  northnode: "NN",
  southnode: "NS",
  lilith: "Lil",
  vertex: "Vx",
  antivertex: "Avx",
  fortune: "LF",
  spirit: "LS",
  ceres: "Cér",
  pallas: "Pal",
  juno: "Jun",
  vesta: "Ves",
  eris: "Éri",
  sedna: "Sed",
};

const ANGLE_EN: Record<AngleId, string> = {
  ascendant: "Ascendant",
  midheaven: "Midheaven",
  descendant: "Descendant",
  ic: "Imum Coeli",
};

const ANGLE_FR_NOM: Record<AngleId, FrNom> = {
  ascendant: { article: "l'", name: "Ascendant" },
  midheaven: { article: "le", name: "Milieu du Ciel" },
  descendant: { article: "le", name: "Descendant" },
  ic: { article: "le", name: "Fond du Ciel" },
};

const HOUSE_EN: Record<number, string> = {
  1: "First house",
  2: "Second house",
  3: "Third house",
  4: "Fourth house",
  5: "Fifth house",
  6: "Sixth house",
  7: "Seventh house",
  8: "Eighth house",
  9: "Ninth house",
  10: "Tenth house",
  11: "Eleventh house",
  12: "Twelfth house",
};

const HOUSE_FR: Record<number, string> = {
  1: "Maison I",
  2: "Maison II",
  3: "Maison III",
  4: "Maison IV",
  5: "Maison V",
  6: "Maison VI",
  7: "Maison VII",
  8: "Maison VIII",
  9: "Maison IX",
  10: "Maison X",
  11: "Maison XI",
  12: "Maison XII",
};

const ASPECT_EN: Record<AspectId, string> = {
  conjunction: "Conjunction",
  opposition: "Opposition",
  trine: "Trine",
  square: "Square",
  sextile: "Sextile",
  quincunx: "Quincunx",
  semisextile: "Semi-sextile",
  semisquare: "Semi-square",
  quintile: "Quintile",
};

const ASPECT_FR: Record<AspectId, string> = {
  conjunction: "Conjonction",
  opposition: "Opposition",
  trine: "Trigone",
  square: "Carré",
  sextile: "Sextile",
  quincunx: "Quinconce",
  semisextile: "Semi-sextile",
  semisquare: "Semi-carré",
  quintile: "Quintile",
};

const ASPECT_GENDER_FR: Record<AspectId, "m" | "f"> = {
  conjunction: "f",
  opposition: "f",
  trine: "m",
  square: "m",
  sextile: "m",
  quincunx: "m",
  semisextile: "m",
  semisquare: "m",
  quintile: "m",
};

const ELEMENT_EN: Record<ElementId, string> = {
  fire: "fire",
  earth: "earth",
  air: "air",
  water: "water",
};
const ELEMENT_FR: Record<ElementId, string> = {
  fire: "feu",
  earth: "terre",
  air: "air",
  water: "eau",
};
const ELEMENT_DE_FR: Record<ElementId, string> = {
  fire: "de feu",
  earth: "de terre",
  air: "d’air",
  water: "d’eau",
};

const MODALITY_EN: Record<ModalityId, string> = {
  cardinal: "cardinal",
  fixed: "fixed",
  mutable: "mutable",
};
const MODALITY_FR: Record<ModalityId, string> = {
  cardinal: "cardinal",
  fixed: "fixe",
  mutable: "mutable",
};

const DIGNITY_EN: Record<string, string> = {
  domicile: "domicile",
  exalted: "exalted",
  detriment: "detriment",
  fall: "fall",
  peregrine: "peregrine",
};
const DIGNITY_FR: Record<string, string> = {
  domicile: "domicile",
  exalted: "exaltation",
  detriment: "exil",
  fall: "chute",
  peregrine: "pérégrin",
};

function capArticle(article: FrArticle | "les"): string {
  if (article === "l'") return "L’";
  if (article === "le") return "Le";
  if (article === "la") return "La";
  if (article === "les") return "Les";
  return "";
}

function joinNom(nom: FrNom, cap: boolean): string {
  if (!nom.article) return nom.name;
  if (nom.article === "l'") return `${cap ? "L’" : "l’"}${nom.name}`;
  const art = cap ? capArticle(nom.article) : nom.article;
  return `${art} ${nom.name}`;
}

function nomOf(id: string): FrNom | null {
  if (id in PLANET_FR_NOM) return PLANET_FR_NOM[id as PlanetId];
  if (id in ANGLE_FR_NOM) return ANGLE_FR_NOM[id as AngleId];
  return null;
}

function prepA(nom: FrNom): string {
  if (nom.article === "le") return `au ${nom.name}`;
  if (nom.article === "la") return `à la ${nom.name}`;
  if (nom.article === "l'") return `à l’${nom.name}`;
  return `à ${nom.name}`;
}

function prepAvec(nom: FrNom): string {
  if (!nom.article) return `avec ${nom.name}`;
  if (nom.article === "l'") return `avec l’${nom.name}`;
  return `avec ${nom.article} ${nom.name}`;
}

function prepDe(nom: FrNom): string {
  if (nom.article === "le") return `du ${nom.name}`;
  if (nom.article === "la") return `de la ${nom.name}`;
  if (nom.article === "l'") return `de l’${nom.name}`;
  return `de ${nom.name}`;
}

export function signName(id: SignId, locale: Locale): string {
  return (locale === "fr" ? SIGN_FR : SIGN_EN)[id];
}

/** "la Vierge", "le Bélier", "les Gémeaux" — for running French. */
export function signThe(id: SignId, cap = false): string {
  const art = SIGN_ART_FR[id];
  const name = SIGN_FR[id];
  const a = cap ? capArticle(art) : art;
  return `${a} ${name}`;
}

export function signAbbr(id: SignId, locale: Locale): string {
  return (locale === "fr" ? SIGN_ABBR_FR : SIGN_ABBR_EN)[id];
}

/** "en Vierge" / "in Virgo" */
export function inSign(id: SignId, locale: Locale): string {
  return locale === "fr" ? `en ${SIGN_FR[id]}` : `in ${SIGN_EN[id]}`;
}

/** "du Bélier", "de la Vierge", "des Gémeaux" */
export function signDe(id: SignId): string {
  const art = SIGN_ART_FR[id];
  const name = SIGN_FR[id];
  if (art === "le") return `du ${name}`;
  if (art === "la") return `de la ${name}`;
  return `des ${name}`;
}

export function planetName(id: PlanetId, locale: Locale): string {
  if (locale === "fr") return joinNom(PLANET_FR_NOM[id], true);
  return PLANET_EN[id];
}

export function planetAbbr(id: PlanetId, locale: Locale): string {
  return (locale === "fr" ? PLANET_ABBR_FR : PLANET_ABBR_EN)[id];
}

export function angleName(id: AngleId, locale: Locale): string {
  if (locale === "fr") return joinNom(ANGLE_FR_NOM[id], true);
  return ANGLE_EN[id];
}

export function houseName(n: number, locale: Locale): string {
  return (locale === "fr" ? HOUSE_FR : HOUSE_EN)[n] ?? String(n);
}

export function houseInline(n: number, locale: Locale): string {
  const name = houseName(n, locale);
  return locale === "fr" ? name.replace(/^Maison/, "maison") : name.toLowerCase();
}

export function aspectName(id: AspectId, locale: Locale): string {
  return (locale === "fr" ? ASPECT_FR : ASPECT_EN)[id];
}

export function aspectThe(id: AspectId, cap = false): string {
  const name = ASPECT_FR[id].toLowerCase();
  const gender = ASPECT_GENDER_FR[id];
  const vowel = /^[aeioué]/i.test(name);
  if (gender === "f") {
    if (vowel) return cap ? `L’${name}` : `l’${name}`;
    return cap ? `La ${name}` : `la ${name}`;
  }
  return cap ? `Le ${name}` : `le ${name}`;
}

export function elementName(id: ElementId, locale: Locale): string {
  return (locale === "fr" ? ELEMENT_FR : ELEMENT_EN)[id];
}

export function elementDe(id: ElementId, locale: Locale): string {
  if (locale === "fr") return ELEMENT_DE_FR[id];
  return ELEMENT_EN[id];
}

export function modalityName(id: ModalityId, locale: Locale): string {
  return (locale === "fr" ? MODALITY_FR : MODALITY_EN)[id];
}

export function dignityName(id: string, locale: Locale): string {
  return (locale === "fr" ? DIGNITY_FR : DIGNITY_EN)[id] ?? id;
}

export function faceLabelLocale(face: 1 | 2 | 3, locale: Locale): string {
  if (locale === "fr") return face === 1 ? "1er" : face === 2 ? "2e" : "3e";
  return face === 1 ? "1st" : face === 2 ? "2nd" : "3rd";
}

export function formatOrb(n: number, locale: Locale): string {
  const s = Math.abs(n).toFixed(1);
  return locale === "fr" ? s.replace(".", ",") : s;
}

/** Wheel-matching angle tags. Table rows are matched by id, not these labels. */
export const ANGLE_ABBR: Record<AngleId, string> = {
  ascendant: "ASC",
  midheaven: "MC",
  descendant: "DSC",
  ic: "IC",
};

export function bodyLabel(id: string, locale: Locale): string {
  if (id in PLANET_EN) return planetName(id as PlanetId, locale);
  if (id in ANGLE_EN) return angleName(id as AngleId, locale);
  return id;
}

/** Compact natal/transit cell: ASC / MC / DSC / IC, else the usual body name. */
export function bodyTableLabel(id: string, locale: Locale): string {
  if (id in ANGLE_ABBR) return ANGLE_ABBR[id as AngleId];
  return bodyLabel(id, locale);
}

/** Mid-sentence form: "le Soleil", "l'Ascendant". English is unchanged. */
export function bodyInline(id: string, locale: Locale): string {
  if (locale !== "fr") return bodyLabel(id, locale);
  const nom = nomOf(id);
  if (!nom) return id;
  return joinNom(nom, false);
}

export function bodyPrep(id: string, prep: "à" | "avec" | "de"): string {
  const nom = nomOf(id) ?? { article: "" as const, name: id };
  if (prep === "avec") return prepAvec(nom);
  if (prep === "de") return prepDe(nom);
  return prepA(nom);
}

/** "Le Soleil en opposition à la Lune" / "Sun Opposition Moon" */
export function aspectLinkPhrase(a: string, type: AspectId, b: string, locale: Locale): string {
  if (locale !== "fr") {
    return `${bodyLabel(a, locale)} ${aspectName(type, locale)} ${bodyLabel(b, locale)}`;
  }
  const left = bodyLabel(a, locale);
  const word = ASPECT_FR[type].toLowerCase();
  const right = type === "conjunction" ? bodyPrep(b, "avec") : bodyPrep(b, "à");
  return `${left} en ${word} ${right}`;
}

export function ruledBy(sign: SignId, ruler: PlanetId, locale: Locale): string {
  if (locale !== "fr") return `ruled by ${planetName(ruler, locale)}`;
  const art = SIGN_ART_FR[sign];
  const adj = art === "les" ? "gouvernés" : art === "la" ? "gouvernée" : "gouverné";
  return `${adj} par ${bodyInline(ruler, locale)}`;
}

export function signIs(sign: SignId, adj: { m: string; f: string; p: string }): string {
  const art = SIGN_ART_FR[sign];
  const name = signThe(sign, true);
  if (art === "les") return `${name} sont ${adj.p}`;
  if (art === "la") return `${name} est ${adj.f}`;
  return `${name} est ${adj.m}`;
}

export function localizeStelliumPlace(place: string, locale: Locale): string {
  const houseMatch = /^House\s+(\d+)$/i.exec(place);
  if (houseMatch) {
    const n = Number(houseMatch[1]);
    return houseName(n, locale);
  }
  const fromEn = (Object.keys(SIGN_EN) as SignId[]).find((id) => SIGN_EN[id] === place);
  if (fromEn) return signName(fromEn, locale);
  const fromFr = (Object.keys(SIGN_FR) as SignId[]).find((id) => SIGN_FR[id] === place);
  if (fromFr) return signName(fromFr, locale);
  return place;
}

const EN_THE = new Set([
  "sun", "moon", "northnode", "southnode", "vertex", "antivertex", "fortune", "spirit",
  "ascendant", "midheaven", "descendant", "ic",
]);

/** Name as used inside a sentence: "the Sun", "Mars", "la Lune", "Mars". */
export function bodyThe(id: string, locale: Locale, capital = false): string {
  const raw = locale === "fr" ? bodyInline(id, locale) : EN_THE.has(id) ? `the ${bodyLabel(id, locale)}` : bodyLabel(id, locale);
  return capital ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
}

/** "A, B and C" / « A, B et C ». */
/** French bodies whose name is feminine (Vénus, Cérès…): "natale", "progressée". */
const FEMININE_FR = new Set(["moon", "venus", "lilith", "ceres", "pallas", "juno", "vesta", "eris", "sedna"]);

/** French adjective agreement with a body: bodyAgree("venus", "natal", "natale") → "natale". */
export function bodyAgree(id: string, masc: string, fem: string): string {
  return FEMININE_FR.has(id) ? fem : masc;
}

/** Lower-case a leading French article for mid-sentence use: "La Lune en carré…" → "la Lune en carré…". */
export function lowerLead(s: string): string {
  return s.replace(/^(Le|La|Les) /, (m) => m.toLowerCase()).replace(/^L’/, "l’");
}

export function joinList(items: string[], locale: Locale): string {
  if (items.length <= 1) return items.join("");
  const and = locale === "fr" ? " et " : " and ";
  return `${items.slice(0, -1).join(", ")}${and}${items[items.length - 1]}`;
}
