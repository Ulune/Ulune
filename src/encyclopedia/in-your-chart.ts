/*
 * What "In your chart" says on a page (encyclopedia plan, part 18): one to
 * three short lines worked out from the chart the studio published for this
 * tab (your-chart.ts), each piece of text either plain or a link to an entry
 * by its id. Pure: scripts/in-your-chart.test.mjs runs it on made-up charts.
 * Nothing here is sent or stored.
 */
import type { YourAspect, YourBody, YourChart } from "./your-chart";
import type { Lang } from "./types";

/** Text, or a link to an entry: its words, or its title when left out. */
export type Piece = string | { id: string; text?: string };
export type Line = Piece[];
export type Mine = {
  lines: Line[];
  /** "Open the reading": the studio's page and the reading to choose there. */
  reading: { path: string; ref: string | null } | null;
};
export type PageRef = { id: string; tradition: string; family: string; kind?: string };

export const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const MAJOR = ["conjunction", "sextile", "square", "trine", "opposition"];
const ELEMENTS = ["fire", "earth", "air", "water"];
const MODALITIES = ["cardinal", "fixed", "mutable"];
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const S = " ";

const NAME: Record<Lang, Record<string, string>> = {
  en: {
    sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
    chiron: "Chiron", "north-node": "North Node", "south-node": "South Node", lilith: "Lilith", vertex: "Vertex", "part-of-fortune": "Part of Fortune", lot: "Lot of Spirit",
    ceres: "Ceres", pallas: "Pallas", juno: "Juno", vesta: "Vesta", eris: "Eris", sedna: "Sedna",
    ascendant: "Ascendant", midheaven: "Midheaven", descendant: "Descendant", "imum-coeli": "IC", earth: "Earth",
  },
  fr: {
    sun: "Soleil", moon: "Lune", mercury: "Mercure", venus: "Vénus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturne", uranus: "Uranus", neptune: "Neptune", pluto: "Pluton",
    chiron: "Chiron", "north-node": "Nœud Nord", "south-node": "Nœud Sud", lilith: "Lilith", vertex: "Vertex", "part-of-fortune": "Part de Fortune", lot: "Part d’Esprit",
    ceres: "Cérès", pallas: "Pallas", juno: "Junon", vesta: "Vesta", eris: "Éris", sedna: "Sedna",
    ascendant: "Ascendant", midheaven: "Milieu du Ciel", descendant: "Descendant", "imum-coeli": "Fond du Ciel", earth: "Terre",
  },
};
const HD_BODY: Record<string, string> = { northnode: "north-node", southnode: "south-node" };
const SIGN_NAME: Record<Lang, string[]> = {
  en: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
  fr: ["Bélier", "Taureau", "Gémeaux", "Cancer", "Lion", "Vierge", "Balance", "Scorpion", "Sagittaire", "Capricorne", "Verseau", "Poissons"],
};
const ASPECT_WORD: Record<Lang, Record<string, string>> = {
  en: { conjunction: "conjunct", sextile: "sextile", square: "square", trine: "trine", opposition: "opposite", quincunx: "quincunx", "semi-sextile": "semi-sextile", "semi-square": "semi-square", quintile: "quintile", parallel: "parallel" },
  fr: { conjunction: "conjoint", sextile: "sextile", square: "carré", trine: "trigone", opposition: "opposé", quincunx: "quinconce", "semi-sextile": "semi-sextile", "semi-square": "semi-carré", quintile: "quintile", parallel: "parallèle" },
};
const ASPECT_PLURAL: Record<Lang, Record<string, string>> = {
  en: { conjunction: "conjunctions", sextile: "sextiles", square: "squares", trine: "trines", opposition: "oppositions", quincunx: "quincunxes", "semi-sextile": "semi-sextiles", "semi-square": "semi-squares", quintile: "quintiles", parallel: "parallels" },
  fr: { conjunction: "conjonctions", sextile: "sextiles", square: "carrés", trine: "trigones", opposition: "oppositions", quincunx: "quinconces", "semi-sextile": "semi-sextiles", "semi-square": "semi-carrés", quintile: "quintiles", parallel: "parallèles" },
};
/** After "are" / « sont en »: French needs the nouns. */
const ASPECT_AFTER_ARE: Record<Lang, Record<string, string>> = {
  en: { conjunction: "conjunct", sextile: "sextile", square: "square", trine: "trine", opposition: "opposite", quincunx: "quincunx", "semi-sextile": "semi-sextile", "semi-square": "semi-square", quintile: "quintile", parallel: "parallel" },
  fr: { conjunction: "conjonction", sextile: "sextile", square: "carré", trine: "trigone", opposition: "opposition", quincunx: "quinconce", "semi-sextile": "semi-sextile", "semi-square": "semi-carré", quintile: "quintile", parallel: "parallèle" },
};
const DIGNITY_WORD: Record<Lang, Record<string, string>> = {
  en: { domicile: "domicile", exaltation: "exaltation", detriment: "detriment", fall: "fall" },
  fr: { domicile: "domicile", exaltation: "exaltation", detriment: "exil", fall: "chute" },
};
const ELEMENT_NAME: Record<Lang, Record<string, string>> = {
  en: { fire: "Fire", earth: "Earth", air: "Air", water: "Water", cardinal: "Cardinal", fixed: "Fixed", mutable: "Mutable" },
  fr: { fire: "Feu", earth: "Terre", air: "Air", water: "Eau", cardinal: "Cardinal", fixed: "Fixe", mutable: "Mutable" },
};
const PLACE_NAME: Record<Lang, Record<string, string>> = {
  en: { "life-path": "Life Path", expression: "Expression", "soul-urge": "Soul Urge", "personality-number": "Personality", birthday: "Birthday", maturity: "Maturity", "attitude-number": "Attitude", "personal-year": "personal year" },
  fr: { "life-path": "Chemin de vie", expression: "Expression", "soul-urge": "Élan de l’âme", "personality-number": "Personnalité", birthday: "Jour de naissance", maturity: "Maturité", "attitude-number": "Attitude", "personal-year": "année personnelle" },
};
/** The combination pages' prefix for a place ("personality-7", not "personality-number-7"). */
const PLACE_PAGE: Record<string, string> = { "life-path": "life-path", expression: "expression", "soul-urge": "soul-urge", "personality-number": "personality", birthday: "birthday", maturity: "maturity" };
const NAMES_NEEDED = new Set(["expression", "soul-urge", "personality-number", "maturity"]);

const W: Record<Lang, Record<string, string>> = {
  en: {
    your: "Your",
    at: "at",
    retro: "retrograde",
    inIts: "in its",
    closest: "Its closest aspects",
    noTime: "Without a birth time, your chart has no Ascendant, Midheaven or houses.",
    noneIn: "None of your planets is in",
    inYourChart: "in your chart",
    houseStarts: "begins in",
    inIt: "in it",
    emptyHouse: "no planet is in it",
    tightest: "tightest first",
    noAspect: "Your chart has no",
    yes: "Yes",
    have: "In your chart",
    orb: "orb",
    applying: "applying",
    separating: "separating",
    notYours: "Not in your chart",
    noMajor: "make no major aspect",
    and: "and",
    are: "are",
    of10: "of the ten planets",
    noneDignity: "None of your planets is in its",
    inTheir: "In their",
    numberIs: "is",
    notAmong: "is not among your numbers",
    inYourNumbers: "in your numbers",
    needsName: "needs the full name at birth, given on the Numerology page.",
    onTheWay: "On the way to your",
    noDebt: "None of your numbers passes through",
    thisYear: "this calendar year",
    noHd: "Your bodygraph shows here once the Human Design page has drawn it in this tab.",
    youAre: "You are a",
    yourType: "Your type is",
    yourAuthority: "Your authority is",
    yourProfile: "Your profile is",
    yourDefinition: "Your definition",
    lineIn: "is in your profile",
    lineNot: "is not in your profile",
    defined: "is defined in your bodygraph",
    undefinedC: "is undefined in your bodygraph",
    active: "is active in your bodygraph",
    notActive: "is not active in your bodygraph",
    line: "line",
    personality: "Personality",
    design: "Design",
    completes: "It completes",
    with: "with",
    channelYes: "is defined in your bodygraph",
    channelOne: "You have one of its gates",
    hanging: "a hanging gate",
    channelNone: "Neither of its gates is active in your bodygraph.",
    both: "both layers",
  },
  fr: {
    your: "Votre",
    at: "à",
    retro: "rétrograde",
    inIts: "dans son",
    closest: "Ses aspects les plus serrés",
    noTime: "Sans heure de naissance, votre thème n’a ni Ascendant, ni Milieu du Ciel, ni maisons.",
    noneIn: "Aucune de vos planètes n’est en",
    inYourChart: "dans votre thème",
    houseStarts: "commence en",
    inIt: "s’y trouvent",
    emptyHouse: "aucune planète ne s’y trouve",
    tightest: "les plus serrés d’abord",
    noAspect: "Votre thème n’a aucun",
    yes: "Oui",
    have: "Il est dans votre thème",
    orb: "orbe",
    applying: "appliquant",
    separating: "séparant",
    notYours: "Pas dans votre thème",
    noMajor: "ne forment aucun aspect majeur",
    and: "et",
    are: "sont en",
    of10: "des dix planètes",
    noneDignity: "Aucune de vos planètes n’est en",
    inTheir: "En",
    numberIs: "est",
    notAmong: "n’est pas parmi vos nombres",
    inYourNumbers: "dans vos nombres",
    needsName: "demande le nom complet de naissance, donné sur la page Numérologie.",
    onTheWay: "En chemin vers votre",
    noDebt: "Aucun de vos nombres ne passe par",
    thisYear: "pour cette année civile",
    noHd: "Votre bodygraph s’affiche ici une fois que la page Human Design l’a dessiné dans cet onglet.",
    youAre: "Vous êtes",
    yourType: "Votre type est",
    yourAuthority: "Votre autorité est",
    yourProfile: "Votre profil est",
    yourDefinition: "Votre définition",
    lineIn: "est dans votre profil",
    lineNot: "n’est pas dans votre profil",
    defined: "est défini dans votre bodygraph",
    undefinedC: "est non défini dans votre bodygraph",
    active: "est active dans votre bodygraph",
    notActive: "n’est pas active dans votre bodygraph",
    line: "ligne",
    personality: "Personnalité",
    design: "Design",
    completes: "Elle complète",
    with: "avec",
    channelYes: "est défini dans votre bodygraph",
    channelOne: "Vous avez l’une de ses portes",
    hanging: "une porte suspendue",
    channelNone: "Aucune de ses portes n’est active dans votre bodygraph.",
    both: "les deux couches",
  },
};

/** 14°05′ */
export function degrees(d: number): string {
  let deg = Math.floor(d);
  let min = Math.round((d - deg) * 60);
  if (min === 60) {
    deg += 1;
    min = 0;
  }
  return `${deg}°${String(min).padStart(2, "0")}′`;
}

const signName = (s: string, lang: Lang) => SIGN_NAME[lang][SIGNS.indexOf(s)] ?? s;
const name = (id: string, lang: Lang) => NAME[lang][id] ?? id;
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const houseWords = (n: number, lang: Lang) => (lang === "fr" ? `maison ${ROMAN[n]}` : `${ordinal(n)} house`);
const colon = (lang: Lang) => (lang === "fr" ? `${S}: ` : ": ");
const join = (parts: Line[], lang: Lang): Line => parts.flatMap((p, i) => (i === 0 ? p : i === parts.length - 1 ? [` ${W[lang].and} `, ...p] : [", ", ...p]));

/** The pair's page when there is one ("sun-square-saturn"), else the aspect's. */
function aspectPage(x: YourAspect): string {
  const [a, b] = PLANETS.indexOf(x.a) <= PLANETS.indexOf(x.b) ? [x.a, x.b] : [x.b, x.a];
  return PLANETS.includes(a) && PLANETS.includes(b) && MAJOR.includes(x.type) ? `${a}-${x.type}-${b}` : x.type;
}

/** "Sun square Saturn", in the planets' order, as the pages are named. */
function aspectWords(x: YourAspect, lang: Lang): string {
  const order = (id: string) => (PLANETS.includes(id) ? PLANETS.indexOf(id) : 100);
  const [a, b] = order(x.a) <= order(x.b) ? [x.a, x.b] : [x.b, x.a];
  return `${name(a, lang)} ${ASPECT_WORD[lang][x.type] ?? x.type} ${name(b, lang)}`;
}

const aspectPiece = (x: YourAspect, lang: Lang): Line => [{ id: aspectPage(x), text: aspectWords(x, lang) }, ` (${degrees(x.orb)})`];

/** Where a body's sign links: its combination page when there is one. */
function signPage(b: YourBody): string {
  if (PLANETS.includes(b.id)) return `${b.id}-in-${b.sign}`;
  if (b.id === "ascendant" || b.id === "midheaven") return `${b.id}-in-${b.sign}`;
  return b.sign;
}
const housePage = (b: YourBody, n: number) => (PLANETS.includes(b.id) ? `${b.id}-in-house-${n}` : `house-${n}`);

/** "in Capricorn at 14°05′, in the 5th house, retrograde, in its domicile" */
function placement(b: YourBody, lang: Lang): Line {
  const w = W[lang];
  const out: Line = [lang === "fr" ? "en " : "in ", { id: signPage(b), text: signName(b.sign, lang) }, ` ${w.at} ${degrees(b.deg)}`];
  if (b.house) out.push(lang === "fr" ? ", en " : ", in the ", { id: housePage(b, b.house), text: houseWords(b.house, lang) });
  if (b.retro) out.push(`, ${w.retro}`);
  if (b.dignity) out.push(lang === "fr" && b.dignity !== "domicile" && b.dignity !== "exaltation" ? ", en " : `, ${w.inIts} `, { id: b.dignity, text: DIGNITY_WORD[lang][b.dignity] });
  return out;
}

const bodyLink = (b: YourBody, lang: Lang, page?: string): Piece => ({ id: page ?? b.id, text: name(b.id, lang) });
const STUDIO = { astrology: "/", "human-design": "/human-design", numerology: "/numerology" } as const;

function astrology(page: PageRef, c: YourChart, lang: Lang): Mine | null {
  const w = W[lang];
  const id = page.id;
  const body = (x: string) => c.bodies.find((b) => b.id === x);
  const angles = new Set(["ascendant", "midheaven", "descendant", "imum-coeli"]);
  const noTime: Mine = { lines: [[w.noTime]], reading: null };

  // A planet, a point, an angle.
  const own = body(id);
  if (own || ((angles.has(id) || id === "vertex" || id === "part-of-fortune" || id === "lot") && c.timeUnknown)) {
    if (!own) return noTime;
    const lines: Line[] = [[`${w.your} ${name(own.id, lang)}${colon(lang)}`, ...placement(own, lang), "."]];
    const near = c.aspects.filter((x) => x.a === id || x.b === id).slice(0, 4);
    if (near.length) lines.push([`${w.closest}${colon(lang)}`, ...join(near.map((x) => aspectPiece(x, lang)), lang), "."]);
    return { lines, reading: { path: STUDIO.astrology, ref: own.ref } };
  }

  // A sign.
  if (SIGNS.includes(id)) {
    const here = c.bodies.filter((b) => b.sign === id);
    const cusps = (c.cusps ?? []).map((s, i) => (s === id ? i + 1 : 0)).filter(Boolean);
    const lines: Line[] = [];
    if (here.length) lines.push([`${signName(id, lang)} ${w.inYourChart}${colon(lang)}`, ...join(here.map((b) => [bodyLink(b, lang, signPage(b)), ` ${degrees(b.deg)}`]), lang), "."]);
    else lines.push([`${w.noneIn} ${signName(id, lang)}.`]);
    if (cusps.length) {
      const head = lang === "fr" ? `${cusps.length > 1 ? "Cuspides" : "Cuspide"} en ${signName(id, lang)}` : `${cusps.length > 1 ? "Cusps" : "Cusp"} in ${signName(id, lang)}`;
      lines.push([`${head}${colon(lang)}`, ...join(cusps.map((n) => [{ id: `house-${n}`, text: houseWords(n, lang) }]), lang), "."]);
    }
    return { lines, reading: { path: STUDIO.astrology, ref: `sign:${id}` } };
  }

  // A house.
  const house = /^house-(\d+)$/.exec(id);
  if (house) {
    const n = Number(house[1]);
    if (!c.cusps) return noTime;
    const sign = c.cusps[n - 1];
    const inside = c.bodies.filter((b) => b.house === n);
    const line: Line = [`${w.your} ${houseWords(n, lang)} ${w.houseStarts} `, { id: sign, text: signName(sign, lang) }];
    if (inside.length) line.push(`${lang === "fr" ? " ; " : "; "}${w.inIt}${colon(lang)}`, ...join(inside.map((b) => [bodyLink(b, lang, housePage(b, n))]), lang), ".");
    else line.push(`${lang === "fr" ? " ; " : "; "}${w.emptyHouse}.`);
    return { lines: [line], reading: { path: STUDIO.astrology, ref: `house:${n}` } };
  }

  // An aspect.
  if (page.family === "aspects" && ASPECT_WORD.en[id]) {
    const mine = c.aspects.filter((x) => x.type === id);
    if (!mine.length) return { lines: [[`${w.noAspect} ${ASPECT_WORD[lang][id]}.`]], reading: null };
    const shown = mine.slice(0, 6);
    const more = mine.length - shown.length;
    const line: Line = [`${w.your} ${ASPECT_PLURAL[lang][id]}, ${w.tightest}${colon(lang)}`, ...join(shown.map((x) => aspectPiece(x, lang)), lang)];
    line.push(more > 0 ? (lang === "fr" ? `, et ${more} de plus.` : `, and ${more} more.`) : ".");
    return { lines: [line], reading: { path: STUDIO.astrology, ref: shown[0].ref } };
  }

  // A dignity.
  if (page.family === "dignities" && DIGNITY_WORD.en[id]) {
    const mine = c.bodies.filter((b) => b.dignity === id);
    if (!mine.length) return { lines: [[`${w.noneDignity} ${DIGNITY_WORD[lang][id]}.`]], reading: null };
    const word = DIGNITY_WORD[lang][id];
    const head = lang === "fr" ? `${w.inTheir} ${word} ${w.inYourChart}${colon(lang)}` : `${w.inTheir} ${word} ${w.inYourChart}${colon(lang)}`;
    return { lines: [[head, ...join(mine.map((b) => [{ id: signPage(b), text: `${name(b.id, lang)} ${lang === "fr" ? "en" : "in"} ${signName(b.sign, lang)}` }]), lang), "."]], reading: null };
  }

  // An element or a modality.
  const el = /^(element|modality)-([a-z]+)$/.exec(id);
  if (el) {
    const signs = SIGNS.filter((_, i) => (el[1] === "element" ? ELEMENTS[i % 4] : MODALITIES[i % 3]) === el[2]);
    const mine = c.bodies.filter((b) => PLANETS.includes(b.id) && signs.includes(b.sign));
    const label = ELEMENT_NAME[lang][el[2]];
    if (!mine.length) return { lines: [[lang === "fr" ? `${label}${colon(lang)}aucune de vos dix planètes.` : `${label}: none of your ten planets.`]], reading: null };
    return { lines: [[`${label} ${w.inYourChart}${colon(lang)}`, ...join(mine.map((b) => [bodyLink(b, lang, signPage(b))]), lang), lang === "fr" ? `, ${mine.length} ${w.of10}.` : `, ${mine.length} ${w.of10}.`]], reading: null };
  }

  // The combinations.
  const inSign = /^([a-z]+)-in-([a-z]+)$/.exec(id);
  if (inSign && SIGNS.includes(inSign[2]) && (PLANETS.includes(inSign[1]) || angles.has(inSign[1]))) {
    const b = body(inSign[1]);
    if (!b) return c.timeUnknown ? noTime : null;
    if (b.sign === inSign[2]) return { lines: [[`${w.yes}${colon(lang)}`, `${w.your.toLowerCase()} ${name(b.id, lang)} ${lang === "fr" ? "est" : "is"} `, ...placement(b, lang), "."]], reading: { path: STUDIO.astrology, ref: b.ref } };
    return { lines: [[`${w.your} ${name(b.id, lang)} ${lang === "fr" ? "est" : "is"} `, ...placement(b, lang), "."]], reading: { path: STUDIO.astrology, ref: b.ref } };
  }
  const inHouse = /^([a-z]+)-in-house-(\d+)$/.exec(id);
  if (inHouse) {
    const b = body(inHouse[1]);
    if (!b) return null;
    if (!b.house) return noTime;
    const n = Number(inHouse[2]);
    const verb = lang === "fr" ? "est" : "is";
    const lead = b.house === n ? [`${w.yes}${colon(lang)}`, `${w.your.toLowerCase()} ${name(b.id, lang)} ${verb} `] : [`${w.your} ${name(b.id, lang)} ${verb} `];
    return { lines: [[...lead, ...placement(b, lang), "."]], reading: { path: STUDIO.astrology, ref: b.ref } };
  }
  const pair = /^([a-z]+)-(conjunction|sextile|square|trine|opposition)-([a-z]+)$/.exec(id);
  if (pair) {
    const [, a, type, z] = pair;
    const all = c.aspects.filter((x) => (x.a === a && x.b === z) || (x.a === z && x.b === a));
    const exact = all.find((x) => x.type === type);
    if (exact) {
      const how = exact.applying == null ? "" : `, ${exact.applying ? w.applying : w.separating}`;
      return { lines: [[`${w.have}${colon(lang)}${w.orb} ${degrees(exact.orb)}${how}.`]], reading: { path: STUDIO.astrology, ref: exact.ref } };
    }
    const other = all.find((x) => MAJOR.includes(x.type)) ?? all[0];
    const both = `${w.your.toLowerCase()} ${name(a, lang)} ${w.and} ${name(z, lang)}`;
    if (other) return { lines: [[`${w.notYours}${colon(lang)}${both} ${w.are} `, { id: aspectPage(other), text: ASPECT_AFTER_ARE[lang][other.type] ?? other.type }, ` (${degrees(other.orb)}).`]], reading: { path: STUDIO.astrology, ref: other.ref } };
    return { lines: [[`${w.notYours}${colon(lang)}${both} ${w.noMajor}.`]], reading: null };
  }
  const withAngle = /^([a-z]+)-and-(ascendant|midheaven)$/.exec(id);
  if (withAngle) {
    const [, p, angle] = withAngle;
    if (c.timeUnknown) return noTime;
    const all = c.aspects.filter((x) => (x.a === p && x.b === angle) || (x.a === angle && x.b === p));
    const both = `${w.your.toLowerCase()} ${name(p, lang)} ${w.and} ${name(angle, lang)}`;
    if (!all.length) return { lines: [[`${w.notYours}${colon(lang)}${both} ${w.noMajor}.`]], reading: null };
    const x = all[0];
    const head = lang === "fr" ? "Dans votre thème" : "In your chart";
    return { lines: [[`${head}${colon(lang)}${both} ${w.are} `, { id: x.type, text: ASPECT_AFTER_ARE[lang][x.type] ?? x.type }, ` (${degrees(x.orb)}).`]], reading: { path: STUDIO.astrology, ref: x.ref } };
  }
  return null;
}

function numerology(page: PageRef, c: YourChart, lang: Lang): Mine | null {
  const w = W[lang];
  const id = page.id;
  const nums = c.numbers;
  if (!nums) return null;
  const at = (place: string) => nums.find((n) => n.place === place);
  const numberPage = (v: number) => `number-${v}`;
  const placeLine = (place: string, wanted: number | null): Mine | null => {
    const n = at(place);
    const label = PLACE_NAME[lang][place];
    if (!n) return NAMES_NEEDED.has(place) ? { lines: [[`${w.your} ${label} ${w.needsName}`]], reading: null } : null;
    const target = PLACE_PAGE[place] && !(place === "birthday" && n.value === 33) ? `${PLACE_PAGE[place]}-${n.value}` : numberPage(n.value);
    const value: Piece = { id: target === id ? numberPage(n.value) : target, text: String(n.value) };
    const lead = wanted != null && n.value === wanted ? [`${w.yes}${colon(lang)}`, `${w.your.toLowerCase()} ${label} ${w.numberIs} `] : [`${w.your} ${label} ${w.numberIs} `];
    const tail = place === "personal-year" ? ` (${w.thisYear}).` : ".";
    return { lines: [[...lead, value, tail]], reading: { path: STUDIO.numerology, ref: n.ref } };
  };
  if (PLACE_NAME.en[id]) return placeLine(id, null);
  const combo = /^(life-path|expression|soul-urge|personality|maturity|birthday)-(\d+)$/.exec(id);
  if (combo) {
    const place = Object.keys(PLACE_PAGE).find((p) => PLACE_PAGE[p] === combo[1]) ?? combo[1];
    return placeLine(place, Number(combo[2]));
  }
  const number = /^number-(\d+)$/.exec(id);
  if (number || id === "master-numbers") {
    const want = number ? [Number(number[1])] : [11, 22, 33];
    const hits = nums.filter((n) => want.includes(n.value) && n.place !== "personal-year");
    const label = number ? number[1] : "";
    if (!hits.length) return { lines: [[number ? `${label} ${w.notAmong}.` : lang === "fr" ? "Aucun nombre maître parmi les vôtres." : "No master number among yours."]], reading: null };
    const list = join(hits.map((n) => [{ id: PLACE_PAGE[n.place] ? `${PLACE_PAGE[n.place]}-${n.value}` : n.place, text: number ? PLACE_NAME[lang][n.place] : `${PLACE_NAME[lang][n.place]} ${n.value}` }]), lang);
    const head = number ? `${label} ${w.inYourNumbers}${colon(lang)}` : `${lang === "fr" ? "Nombres maîtres parmi les vôtres" : "Master numbers among yours"}${colon(lang)}`;
    return { lines: [[head, ...list, "."]], reading: { path: STUDIO.numerology, ref: hits[0].ref } };
  }
  const debt = /^karmic-debt-(\d+)$/.exec(id);
  if (debt) {
    const d = Number(debt[1]);
    const hits = nums.filter((n) => n.debt === d);
    if (!hits.length) return { lines: [[`${w.noDebt} ${d}.`]], reading: null };
    const list = join(hits.map((n) => [{ id: n.place, text: PLACE_NAME[lang][n.place] }]), lang);
    return { lines: [[`${w.onTheWay} `, ...list, lang === "fr" ? `, la somme passe par ${d}.` : `, the sum passes through ${d}.`]], reading: { path: STUDIO.numerology, ref: hits[0].ref } };
  }
  return null;
}

function humanDesign(page: PageRef, c: YourChart, lang: Lang): Mine | null {
  const w = W[lang];
  const id = page.id;
  const relevant = /^hd-(generator|manifesting-generator|manifestor|projector|reflector|type|authority.*|profile.*|line-\d|centre-.*|gate-\d+|channel-.*|definition)$/.test(id);
  if (!relevant) return null;
  const hd = c.hd;
  if (!hd) return { lines: [[w.noHd]], reading: { path: STUDIO["human-design"], ref: null } };
  const path = STUDIO["human-design"];
  const label = (x: string): Piece => ({ id: x });
  if (page.family === "types" || id === "hd-type") {
    if (hd.type === id) return { lines: [[`${w.youAre} `, label(hd.type), "."]], reading: { path, ref: null } };
    return { lines: [[`${w.yourType} `, label(hd.type), "."]], reading: { path, ref: null } };
  }
  if (page.family === "authorities" || id === "hd-authority") return { lines: [[`${w.yourAuthority} `, label(hd.authority), "."]], reading: { path, ref: null } };
  if (/^hd-profile/.test(id)) return { lines: [[`${w.yourProfile} `, label(hd.profile), "."]], reading: { path, ref: null } };
  if (id === "hd-definition") return { lines: [[`${w.yourDefinition}${colon(lang)}${hd.definition}.`]], reading: { path, ref: null } };
  const line = /^hd-line-(\d)$/.exec(id);
  if (line) {
    const [p, d] = hd.profile.replace("hd-profile-", "").split("-");
    const inIt = line[1] === p || line[1] === d;
    return { lines: [[`${lang === "fr" ? "La ligne" : "Line"} ${line[1]} ${inIt ? w.lineIn : w.lineNot} (`, label(hd.profile), ")."]], reading: { path, ref: null } };
  }
  const centre = /^hd-centre-(.+)$/.exec(id);
  if (centre) {
    const on = hd.centres.includes(id);
    return { lines: [[`${lang === "fr" ? "Ce centre" : "This centre"} ${on ? w.defined : w.undefinedC}.`]], reading: { path, ref: `center:${centre[1] === "solar-plexus" ? "solarPlexus" : centre[1]}` } };
  }
  const gate = /^hd-gate-(\d+)$/.exec(id);
  if (gate) {
    const g = Number(gate[1]);
    const acts = hd.gates.filter((x) => x.gate === g);
    if (!acts.length) return { lines: [[`${lang === "fr" ? "La porte" : "Gate"} ${g} ${w.notActive}.`]], reading: null };
    const how = acts.map((x) => `${w.line} ${x.line}, ${name(HD_BODY[x.body] ?? x.body, lang)} (${x.layer === "personality" ? w.personality : w.design})`).join(lang === "fr" ? " ; " : "; ");
    const lines: Line[] = [[`${lang === "fr" ? "La porte" : "Gate"} ${g} ${w.active}${colon(lang)}${how}.`]];
    const channels = hd.channels.filter((ch) => ch.id.replace("hd-channel-", "").split("-").map(Number).includes(g));
    if (channels.length) lines.push([`${w.completes} `, ...join(channels.map((ch) => [{ id: ch.id, text: `${lang === "fr" ? "le canal" : "the channel"} ${ch.id.replace("hd-channel-", "").replace("-", "–")}` }]), lang), "."]);
    return { lines, reading: { path, ref: `gate:${g}` } };
  }
  const channel = /^hd-channel-(\d+)-(\d+)$/.exec(id);
  if (channel) {
    const mine = hd.channels.find((ch) => ch.id === id);
    const pair = `${channel[1]}–${channel[2]}`;
    if (mine) {
      const layers = mine.personality && mine.design ? w.both : mine.personality ? w.personality : w.design;
      return { lines: [[`${lang === "fr" ? "Le canal" : "The channel"} ${pair} ${w.channelYes} (${layers}).`]], reading: { path, ref: `channel:${pair}` } };
    }
    const have = [Number(channel[1]), Number(channel[2])].filter((g) => hd.gates.some((x) => x.gate === g));
    if (!have.length) return { lines: [[w.channelNone]], reading: null };
    return { lines: [[`${w.channelOne}${colon(lang)}`, { id: `hd-gate-${have[0]}`, text: `${lang === "fr" ? "la porte" : "gate"} ${have[0]}` }, `, ${w.hanging}.`]], reading: { path, ref: `gate:${have[0]}` } };
  }
  return null;
}

/** What "In your chart" says on a page, or null when the page is not about a part of a chart. */
export function inYourChart(page: PageRef, c: YourChart, lang: Lang): Mine | null {
  if (page.tradition === "astrology") return astrology(page, c, lang);
  if (page.tradition === "numerology") return numerology(page, c, lang);
  if (page.tradition === "human-design") return humanDesign(page, c, lang);
  return null;
}

/** The home's index (part 18): the pages that apply to this chart, by kind. */
export function yourPages(c: YourChart): { group: "signs" | "houses" | "angles" | "aspects" | "numbers" | "design"; ids: string[] }[] {
  const out: { group: "signs" | "houses" | "angles" | "aspects" | "numbers" | "design"; ids: string[] }[] = [];
  const planets = PLANETS.map((p) => c.bodies.find((b) => b.id === p)).filter((b): b is YourBody => Boolean(b));
  out.push({ group: "signs", ids: planets.map((b) => `${b.id}-in-${b.sign}`) });
  const housed = planets.filter((b) => b.house);
  if (housed.length) out.push({ group: "houses", ids: housed.map((b) => `${b.id}-in-house-${b.house}`) });
  const angles = ["ascendant", "midheaven"].map((a) => c.bodies.find((b) => b.id === a)).filter((b): b is YourBody => Boolean(b));
  if (angles.length) out.push({ group: "angles", ids: angles.map((b) => `${b.id}-in-${b.sign}`) });
  const pairs = c.aspects.filter((x) => PLANETS.includes(x.a) && PLANETS.includes(x.b) && MAJOR.includes(x.type)).slice(0, 12);
  if (pairs.length) out.push({ group: "aspects", ids: [...new Set(pairs.map(aspectPage))] });
  if (c.numbers?.length) {
    const ids = c.numbers.filter((n) => PLACE_PAGE[n.place] && !(n.place === "birthday" && n.value === 33)).map((n) => `${PLACE_PAGE[n.place]}-${n.value}`);
    if (ids.length) out.push({ group: "numbers", ids });
  }
  if (c.hd) out.push({ group: "design", ids: [c.hd.type, c.hd.authority, c.hd.profile, ...c.hd.channels.map((ch) => ch.id)] });
  return out;
}

/** A combination page's title, as the build names it ("Moon in Scorpio", « Mars en maison X »), or null. */
export function titleOf(id: string, lang: Lang): string | null {
  const fr = lang === "fr";
  let m = /^([a-z]+)-in-house-(\d+)$/.exec(id);
  if (m) return fr ? `${name(m[1], lang)} en maison ${ROMAN[Number(m[2])]}` : `${name(m[1], lang)} in the ${ordinal(Number(m[2]))} house`;
  m = /^([a-z]+)-in-([a-z]+)$/.exec(id);
  if (m && SIGNS.includes(m[2])) return `${name(m[1], lang)} ${fr ? "en" : "in"} ${signName(m[2], lang)}`;
  m = /^([a-z]+)-(conjunction|sextile|square|trine|opposition)-([a-z]+)$/.exec(id);
  if (m) return `${name(m[1], lang)} ${ASPECT_WORD[lang][m[2]]} ${name(m[3], lang)}`;
  m = /^(life-path|expression|soul-urge|personality|maturity|birthday)-(\d+)$/.exec(id);
  if (m) {
    const place = Object.keys(PLACE_PAGE).find((p) => PLACE_PAGE[p] === m![1]) ?? m[1];
    return `${PLACE_NAME[lang][place]} ${m[2]}`;
  }
  return null;
}
