/**
 * "You two, now" on astrology's Relationship pages, its readings (share and
 * compare plan, feature 5e): a contact of today's sky with the relationship's
 * chart said for two (what the moving planet brings, how its family tends to
 * feel, where the point sits in the relationship's chart, its orb, when it is
 * exact and how long it lasts), and the part as a whole. The texts come from
 * the pair-now reading pack (pack-pair-now.ts), one language at a time;
 * suggestions, never predictions.
 *
 *   two:now                      the part: today's contacts, slow planets first
 *   two:asp:saturn:square:sun    one contact
 */
import { BODY_KEYWORDS, COMPOSITE_ABOUT, ORB_ABOUT, TRANSIT_PACE } from "@/lib/content/astro-time";
import { FAMILY_TWO, MOVING_TWO, NOW_ABOUT, NOW_LEAD, NOW_QUIET } from "@/lib/content/pair-now";
import { pickBi } from "@/lib/content/types";
import { bodyInline, bodyLabel, bodyThe, houseInline, inSign, signName } from "@/lib/i18n/astro";
import { pnWord } from "@/lib/i18n/catalog/pair-now-words";
import { pnwWord } from "@/lib/i18n/catalog/pair-now-west-words";
import { nowDetail, nowMotion, nowPhrase, nowToday } from "@/lib/i18n/pair-now-astro";
import { formatArc } from "@/lib/utils";
import { transitWhen } from "./interpret-transit";
import { NOW_REF, type NowContact } from "./pair-now";
import { aspectFamily, houseArea } from "./plain";
import type { BodyId, ElementReading, NatalChart, ReadingFact } from "./types";

type Locale = "en" | "fr";

/** What a reading needs besides the contact: the relationship's chart, the moment read, which chart it is, the reader's clock. */
export type NowReadContext = { chart: NatalChart; at: number; kind: "composite" | "davison"; tz?: string };

const loc = (locale: string): Locale => (locale === "fr" ? "fr" : "en");
const colon = (locale: string) => (locale === "fr" ? "\u202f: " : ": ");

function about(locale: Locale): NonNullable<ElementReading["about"]> {
  return { title: pnwWord(locale, "ptnAbout"), paragraphs: [pickBi(NOW_ABOUT, locale), pickBi(COMPOSITE_ABOUT, locale), pickBi(ORB_ABOUT, locale)] };
}

/** The contact's family sentence, said for two. */
export function nowLead(c: Pick<NowContact, "link">, locale: string): string {
  const l = loc(locale);
  const { a, b, type } = c.link;
  return pickBi(FAMILY_TWO[aspectFamily(type)], l)
    .replaceAll("{moving}", bodyThe(a, l, true))
    .replaceAll("{point}", l === "fr" ? bodyInline(b, l) : bodyLabel(b, l))
    .replaceAll("{pointWords}", pickBi(BODY_KEYWORDS[b as BodyId], l))
    .replaceAll("{movingWords}", pickBi(MOVING_TWO[a], l));
}

/** Where the relationship's point sits: "The relationship’s Sun is at 12°04' Leo, in its 5th house (…)." */
function pointLine(c: NowContact, ctx: NowReadContext, locale: Locale): string {
  const p = c.point;
  if (!p) return "";
  const where = `${p.formatted} ${locale === "fr" ? inSign(p.sign, locale) : signName(p.sign, locale)}`;
  const house = ctx.chart.meta.timeUnknown || !p.house || c.link.b === "ascendant" || c.link.b === "midheaven" ? "" : `${houseInline(p.house, locale)} (${houseArea(p.house, locale)})`;
  if (locale === "fr") {
    const point = bodyInline(c.link.b, locale);
    const lead = `${point.charAt(0).toUpperCase()}${point.slice(1)} de la relation est à ${where}`;
    return house ? `${lead}, dans sa ${house}.` : `${lead}.`;
  }
  const lead = `The relationship’s ${bodyLabel(c.link.b, locale)} is at ${where}`;
  return house ? `${lead}, in its ${house}.` : `${lead}.`;
}

/** The orb and the motion in a sentence. */
function orbLine(c: NowContact, locale: Locale): string {
  const orb = formatArc(c.link.orb);
  const motion = nowMotion(c.link.applying, locale);
  if (locale === "fr") {
    const says = c.link.applying ? "le contact se rapproche encore de l’exactitude" : c.link.applying === false ? "le point exact est passé, l’effet diminue" : "le contact est actif";
    return `Orbe ${orb}${motion ? `, ${motion}` : ""}\u202f: ${says}.`;
  }
  const says = c.link.applying ? "the contact is still getting closer to exact" : c.link.applying === false ? "the exact point has passed and the effect is fading" : "the contact is active";
  return `Orb ${orb}${motion ? `, ${motion}` : ""}: ${says}.`;
}

/** One contact of today's sky with the relationship's chart. */
export function pairNowReading(c: NowContact, ctx: NowReadContext, locale: string): ElementReading {
  const l = loc(locale);
  const lead = nowLead(c, l);
  const when = transitWhen(c.link, c.moving?.speed, l);
  const pace = pickBi(TRANSIT_PACE[c.link.a as BodyId], l);
  const inChart = [pointLine(c, ctx, l), orbLine(c, l), ...(when ? [when.sentence] : []), ...(pace ? [pace] : [])].filter(Boolean);
  const moving = c.moving;
  const facts: ReadingFact[] = [
    { label: pnwWord(l, "ptnColOrb"), value: [formatArc(c.link.orb), nowMotion(c.link.applying, l)].filter(Boolean).join(" · ") },
    ...(when ? [{ label: pnwWord(l, "ptnColExact"), value: when.exact }] : []),
    ...(when?.span ? [{ label: l === "fr" ? "À moins de 1°" : "Within 1°", value: when.span }] : []),
    ...(moving ? [{ label: l === "fr" ? `${bodyLabel(c.link.a, l)} en transit` : `Transiting ${bodyLabel(c.link.a, l)}`, value: `${moving.formatted} ${signName(moving.sign, l)}${moving.retrograde ? " ℞" : ""}` }] : []),
    ...(c.point ? [{ label: pnwWord(l, "ptnPoint", { point: l === "fr" ? bodyInline(c.link.b, l) : bodyLabel(c.link.b, l) }).replace(/^\p{Ll}/u, (x) => x.toUpperCase()), value: `${c.point.formatted} ${signName(c.point.sign, l)}` }] : []),
  ];
  return {
    id: c.ref,
    kind: "aspect",
    title: nowPhrase(c.link, l),
    kicker: [pnWord(l, "ptnHead"), nowDetail(c, l, ctx.tz)].join(" · "),
    lead,
    paragraphs: [lead, ...inChart],
    facts,
    sections: [{ id: "chart", title: pnwWord(l, ctx.kind === "davison" ? "ptnAstroOnDavison" : "ptnAstroOn"), paragraphs: inChart }],
    links: { title: pnWord(l, "ptnHead"), rows: [{ ref: NOW_REF, label: nowToday(ctx.at, l, ctx.tz) }] },
    about: about(l),
  };
}

/** The part's own mark (the inner markup of a 24 × 24 drawing): two circles that overlap, the two of you. */
const TWO_SVG = '<g fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/></g>';

/** "3 contacts", "one contact". */
const contactsWord = (n: number, locale: Locale) => (n === 1 ? pnwWord(locale, "ptnContactOne") : pnwWord(locale, "ptnContacts", { n }));

/**
 * The part as a whole: the day and the chart read (its kicker), today's contacts said in a line each
 * under the chart's name, each a link to its reading; or a quiet sky.
 */
export function pairNowSummary(contacts: readonly NowContact[], ctx: NowReadContext, locale: string): ElementReading {
  const l = loc(locale);
  const lead = contacts.length ? pickBi(NOW_LEAD, l).replaceAll("{n}", contactsWord(contacts.length, l)) : pickBi(NOW_QUIET, l);
  const lines = contacts.map((c) => `${nowPhrase(c.link, l)}${colon(l)}${nowLead(c, l).split(/(?<=[.!?])\s/)[0] ?? ""}`);
  const onChart = pnwWord(l, ctx.kind === "davison" ? "ptnAstroOnDavison" : "ptnAstroOn");
  return {
    id: NOW_REF,
    kind: "aspect",
    title: pnWord(l, "ptnHead"),
    kicker: [nowToday(ctx.at, l, ctx.tz), onChart].join(" · "),
    markSvg: TWO_SVG,
    lead,
    paragraphs: [lead, ...lines],
    sections: lines.length ? [{ id: "chart", title: onChart, paragraphs: lines }] : undefined,
    links: contacts.length ? { title: pnWord(l, "ptnHead"), rows: contacts.map((c) => ({ ref: c.ref, label: nowPhrase(c.link, l), detail: nowDetail(c, l, ctx.tz) })) } : undefined,
    about: about(l),
  };
}
