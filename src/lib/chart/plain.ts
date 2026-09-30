/**
 * Plain-language building blocks for readings. All wording lives in
 * src/lib/content/*; this module only picks the right text and joins it
 * with the facts of a chart.
 */
import { SIGN_META } from "./constants";
import type { AspectId, AspectLink, BodyId, NatalChart, Placement, PlanetId, SignId } from "./types";
import type { Locale } from "@/lib/i18n/locale";
import { aspectLinkPhrase, aspectName, bodyInline, bodyLabel, bodyThe, houseInline, inSign, joinList, signDe, signName } from "@/lib/i18n/astro";
import { pickBi } from "@/lib/content/types";
import { BODY_TEXT } from "@/lib/content/astro-bodies";
import { ANGLE_PAIR_TEXT, ASPECT_TEXT, PAIR_TEXT, type AspectFamily } from "@/lib/content/astro-aspects";
import { HOUSE_TEXT, SIGN_TEXT } from "@/lib/content/astro-signs-houses";
import { PLANET_IN_SIGN, type ClassicPlanet } from "@/lib/content/astro-planet-sign";
import { BODY_KEYWORDS } from "@/lib/content/astro-time";
import { formatArc } from "@/lib/utils";

type HouseNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const CLASSIC: readonly string[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** What the body is, in 2–4 sentences (used when it is tapped). */
export function bodyIs(id: BodyId, locale: Locale): string {
  return pickBi(BODY_TEXT[id]?.what, locale);
}

/** Short noun phrase about the reader's own body: "your drive and …". */
export function bodyAs(id: BodyId, locale: Locale): string {
  return pickBi(BODY_TEXT[id]?.short, locale);
}

/** Neutral keywords, for a body that is not the reader's (a transit, a partner's planet). */
export function bodyKeywords(id: BodyId, locale: Locale): string {
  return pickBi(BODY_KEYWORDS[id], locale);
}

export function bodyExample(id: BodyId, locale: Locale): string {
  return pickBi(BODY_TEXT[id]?.example, locale);
}

export function bodyCycle(id: BodyId, locale: Locale): string {
  return pickBi(BODY_TEXT[id]?.cycle, locale);
}

export function houseArea(house: number, locale: Locale): string {
  return pickBi(HOUSE_TEXT[house as HouseNo]?.area, locale);
}

/** "In the 10th house, Mars puts energy … into career and public standing." */
export function bodyInHouse(id: BodyId, house: number, locale: Locale): string {
  const verb = pickBi(BODY_TEXT[id]?.inHouse, locale);
  const area = houseArea(house, locale);
  if (!verb || !area) return "";
  if (locale === "fr") {
    return `En ${houseInline(house, locale)}, ${bodyInline(id, locale)} ${verb} ${area}.`;
  }
  return `In the ${houseInline(house, locale)}, ${bodyThe(id, locale)} ${verb} ${area}.`;
}

/** Sign on a house cusp: "You approach money … steadily." */
export function signOnCusp(sign: SignId, house: number, locale: Locale): string {
  const tpl = pickBi(SIGN_TEXT[sign]?.onCusp, locale);
  return tpl.replaceAll("{area}", houseArea(house, locale));
}

/** The specific planet-in-sign text, when there is one (the ten planets). */
export function planetInSignText(id: BodyId, sign: SignId, locale: Locale): string | null {
  if (!CLASSIC.includes(id)) return null;
  return pickBi(PLANET_IN_SIGN[id as ClassicPlanet]?.[sign], locale) || null;
}

/** For points and asteroids: the body's role, styled by the sign. */
export function pointInSignText(id: BodyId, sign: SignId, locale: Locale): string {
  const kw = joinList(pickBi(SIGN_TEXT[sign]?.keywords, locale).split(/,\s*/).slice(0, 3), locale);
  const short = bodyAs(id, locale);
  if (locale === "fr") {
    return `${bodyThe(id, locale, true)} ${inSign(sign, locale)}\u202f: ${short} s’exprime avec ${kw}, dans le style ${signDe(sign)}.`;
  }
  return `${bodyThe(id, locale, true)} in ${signName(sign, locale)}: ${short} tends to show in a ${kw} way.`;
}

export function aspectIs(type: AspectId, locale: Locale): string {
  return pickBi(ASPECT_TEXT[type]?.what, locale);
}

export function aspectInPractice(type: AspectId, locale: Locale): string {
  return pickBi(ASPECT_TEXT[type]?.inPractice, locale);
}

export function aspectFamily(type: AspectId): AspectFamily {
  return ASPECT_TEXT[type]?.family ?? "tension";
}

const MINOR: readonly AspectId[] = ["quincunx", "semisextile", "semisquare", "quintile"];

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

/** Theme of the combination of two bodies, when known. */
export function pairTheme(a: BodyId, b: BodyId, locale: Locale): string | null {
  const row = PAIR_TEXT[pairKey(a, b)];
  if (row) return pickBi(row.theme, locale);
  const angle = a === "ascendant" || a === "midheaven" ? a : b === "ascendant" || b === "midheaven" ? b : null;
  const planet = angle === a ? b : a;
  if (angle) {
    const t = ANGLE_PAIR_TEXT[`${angle}|${planet}`];
    if (t) return pickBi(t.theme, locale);
  }
  return null;
}

/**
 * How the two bodies interact under this aspect, for the reader who has it.
 * Classic pairs have their own text per aspect family; others are composed.
 */
/** " As a minor aspect, the effect is quieter…" for minor aspects, else "". */
export function minorAspectNote(type: AspectId, locale: Locale): string {
  if (!MINOR.includes(type)) return "";
  return locale === "fr"
    ? " S’agissant d’un aspect mineur, l’effet est plus discret qu’avec un aspect majeur."
    : " As a minor aspect, the effect is quieter than with a major one.";
}

export function aspectPractice(a: BodyId, b: BodyId, type: AspectId, locale: Locale): string {
  const fam = aspectFamily(type);
  const row = PAIR_TEXT[pairKey(a, b)];
  const minorNote = minorAspectNote(type, locale);
  if (row) return `${pickBi(row[fam], locale)}${minorNote}`;
  const theme = pairTheme(a, b, locale);
  const link = pickBi(ASPECT_TEXT[type]?.link, locale);
  const lead =
    locale === "fr"
      ? `${bodyThe(a, locale, true)} (${bodyKeywords(a, locale)}) ${link} ${bodyThe(b, locale)} (${bodyKeywords(b, locale)}).`
      : `${bodyThe(a, locale, true)} (${bodyKeywords(a, locale)}) ${link} ${bodyThe(b, locale)} (${bodyKeywords(b, locale)}).`;
  return [theme ?? lead, aspectInPractice(type, locale)].filter(Boolean).join(" ") + minorNote;
}

function placementOf(chart: NatalChart, id: BodyId): Placement | undefined {
  return chart.planets.find((x) => x.id === id) ?? (id in chart.angles ? chart.angles[id as keyof typeof chart.angles] : undefined);
}

export function applyingWord(flag: boolean | null | undefined, locale: Locale): string {
  if (flag === true) return locale === "fr" ? "applicatif" : "applying";
  if (flag === false) return locale === "fr" ? "séparatif" : "separating";
  return "";
}

/** One row of a planet's aspect list: "Sun square Saturn in Pisces (2.1°, applying) — …". */
export function aspectSentence(chart: NatalChart, link: AspectLink, from: BodyId, locale: Locale): string {
  const other = link.a === from ? link.b : link.a;
  const otherP = placementOf(chart, other);
  const app = applyingWord(link.applying, locale);
  const orb = `${formatArc(link.orb)}${app ? `, ${app}` : ""}`;
  const practice = aspectPractice(from, other, link.type, locale);
  if (locale === "fr") {
    const phrase = aspectLinkPhrase(from, link.type, other, locale);
    return `${phrase}${otherP ? ` ${inSign(otherP.sign, locale)}` : ""} (orbe ${orb})\u202f: ${practice}`;
  }
  const right = otherP ? `${bodyLabel(other, locale)} in ${signName(otherP.sign, locale)}` : bodyLabel(other, locale);
  return `${bodyLabel(from, locale)} ${aspectName(link.type, locale).toLowerCase()} ${right} (${orb}): ${practice}`;
}

/** Aspect reading: [what this aspect does between them, where it happens, how it tends to show]. */
export function aspectParagraphs(chart: NatalChart, link: AspectLink, locale: Locale): string[] {
  const a = placementOf(chart, link.a);
  const b = placementOf(chart, link.b);
  const app = applyingWord(link.applying, locale);
  const practice = aspectPractice(link.a, link.b, link.type, locale);
  const where: string[] = [];
  if (a && b) {
    if (locale === "fr") {
      where.push(
        `${cap(bodyInline(link.a, locale))} est ${inSign(a.sign, locale)}, en ${houseInline(a.house, locale)} (${houseArea(a.house, locale)})\u202f; ${bodyInline(link.b, locale)} est ${inSign(b.sign, locale)}, en ${houseInline(b.house, locale)} (${houseArea(b.house, locale)}). L’aspect relie ces deux domaines de votre vie.`,
      );
      where.push(
        `L’orbe est de ${formatArc(link.orb)}${app ? ` et l’aspect est ${app}` : ""}\u202f: ${link.orb < 2 ? "il est serré et se fait nettement sentir" : link.orb < 5 ? "il est d’intensité moyenne" : "il est large et plus diffus"}.`,
      );
    } else {
      where.push(
        `${bodyThe(link.a, locale, true)} is in ${signName(a.sign, locale)} in your ${houseInline(a.house, locale)} (${houseArea(a.house, locale)}); ${bodyThe(link.b, locale)} is in ${signName(b.sign, locale)} in your ${houseInline(b.house, locale)} (${houseArea(b.house, locale)}). The aspect links these two areas of your life.`,
      );
      where.push(
        `The orb is ${formatArc(link.orb)}${app ? ` and ${app}` : ""}: ${link.orb < 2 ? "tight, so it is strongly felt" : link.orb < 5 ? "of medium strength" : "wide, so its effect is more diffuse"}.`,
      );
    }
  }
  return [practice, ...where].filter(Boolean);
}

const OUTER: PlanetId[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];

export function isOuterPlanet(id: string): boolean {
  return OUTER.includes(id as PlanetId);
}

/** The sign’s first few keywords as a readable list: "direct, quick and independent". */
export function signKeywords(sign: SignId, locale: Locale, max = 3): string {
  return joinList(pickBi(SIGN_TEXT[sign]?.keywords, locale).split(/,\s*/).filter(Boolean).slice(0, max), locale);
}

export function signElement(sign: SignId) {
  return SIGN_META[sign].element;
}
