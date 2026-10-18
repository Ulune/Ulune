/**
 * Numerology's Relationship readings (share and compare plan, feature 5c;
 * decision R3): a pair of numbers as a dynamic (its frame, how the two tend
 * to work together, what each brings, where they may rub, a master's note,
 * the bridge between them), the relationship number, a digit both hold, and
 * the two of you this year. The texts come from the reading pack
 * (pack-num-pair.ts), one language at a time; every step is written from the
 * calculation (lib/chart/numerology-pair.ts).
 *
 *   np:rel               the relationship number
 *   np:pair:lifepath     a pair: the same number in both people
 *   np:pair:su-pe        a crossed pair (A's Soul Urge, B's Personality)
 *   np:digit:6           a digit both people's numbers hold
 *   np:year              both personal years and the relationship's year
 */
import { BRIDGE_TEXT, type Gap } from "@/lib/content/numerology-more";
import {
  BRINGS,
  COUPLE_YEAR_HOW,
  COUPLE_YEAR_TEXT,
  MASTER_NOTES,
  PAIR_ABOUT,
  PAIR_TEXTS,
  POSITION_TEXT,
  RELATIONSHIP_HOW,
  RELATIONSHIP_TEXT,
} from "@/lib/content/numerology-pairs";
import { pickBi } from "@/lib/content/types";
import { deFr } from "@/lib/chinese/both";
import type { AppLocale } from "@/lib/i18n/messages";
import { npWord } from "@/lib/i18n/catalog/numerology-pair-words";
import { numerologyCoreLabel } from "@/lib/i18n/numerology-ui";
import { PAIR_IDS, pairRow, type NumerologyPair, type PairId, type PairRow, type SharedDigit } from "./numerology-pair";
import { stepsText, wholeText } from "./numerology-reduce";
import type { ElementReading, ReadingFact } from "./types";

export type PairNames = { a: string; b: string };
export type PairContext = { pair: NumerologyPair; names: PairNames };

export const NP_REL_REF = "np:rel";
export const NP_YEAR_REF = "np:year";
export const npPairRef = (id: PairId): string => `np:pair:${id}`;
export const npDigitRef = (d: number): string => `np:digit:${d}`;

const t = (b: { en: string; fr: string } | undefined, locale: AppLocale) => pickBi(b, locale);
const first = (s: string) => s.split(/(?<=[.!?])\s/)[0] ?? s;
const colon = (locale: AppLocale) => (locale === "fr" ? "\u202f: " : ": ");

/** A pair's name in the bars and tables: "Life Path" for the same number, "A's Soul Urge · B's Personality" for a crossed one. */
export function pairLabel(r: PairRow, names: PairNames, locale: AppLocale): string {
  if (!r.cross) return numerologyCoreLabel(locale, r.a.core);
  return npWord(locale, "npCrossLabel", {
    a: names.a,
    b: names.b,
    pa: numerologyCoreLabel(locale, r.a.core),
    pb: numerologyCoreLabel(locale, r.b.core),
    deA: deFr(names.a),
    deB: deFr(names.b),
  });
}

/** How the pair's two numbers tend to work together (its text's first part), or null while a number waits for a name. */
export function pairTogether(r: PairRow, locale: AppLocale): string | null {
  return r.text ? t(PAIR_TEXTS[r.text]?.together, locale) || null : null;
}

/** What a number brings to a pair, in a sentence: "TraceQA's 4 brings steadiness and method: things done well." */
function bringsLine(n: number, name: string, locale: AppLocale): string {
  return npWord(locale, "npBrings", { name, deName: deFr(name), n, brings: t(BRINGS[n], locale) });
}

function about(locale: AppLocale): ElementReading["about"] {
  return { title: npWord(locale, "npFigure"), paragraphs: [t(PAIR_ABOUT, locale)] };
}

/** The other pairs, for a reading's links. */
function pairLinks(ctx: PairContext, locale: AppLocale): ElementReading["links"] {
  return {
    title: npWord(locale, "npSideHead"),
    rows: ctx.pair.rows.map((r) => ({
      ref: npPairRef(r.id),
      label: pairLabel(r, ctx.names, locale),
      detail: `${r.a.value.number == null ? "—" : wholeText(r.a.value)} · ${r.b.value.number == null ? "—" : wholeText(r.b.value)}`,
    })),
  };
}

function pairReading(ctx: PairContext, r: PairRow, locale: AppLocale): ElementReading {
  const { names } = ctx;
  const label = pairLabel(r, names, locale);
  const na = r.a.value.number == null ? "—" : wholeText(r.a.value);
  const nb = r.b.value.number == null ? "—" : wholeText(r.b.value);
  const frame = t(POSITION_TEXT[r.id], locale)
    .replaceAll("{deA}", deFr(names.a))
    .replaceAll("{deB}", deFr(names.b))
    .replaceAll("{a}", names.a)
    .replaceAll("{b}", names.b);
  const facts: ReadingFact[] = [
    { label: `${names.a} · ${numerologyCoreLabel(locale, r.a.core)}`, value: na },
    { label: `${names.b} · ${numerologyCoreLabel(locale, r.b.core)}`, value: nb },
  ];
  const base = { id: npPairRef(r.id), kind: "aspect" as const, title: npWord(locale, "npPairTitle", { label, na, nb }), kicker: `${names.a} · ${names.b}`, links: pairLinks(ctx, locale), about: about(locale) };
  if (!r.text || !r.gap) {
    // A number from the name, with no full name at birth: the pair waits for it.
    const who = r.a.value.number == null ? names.a : names.b;
    const wait = npWord(locale, "npWait", { name: who, deName: deFr(who) });
    return { ...base, lead: frame, paragraphs: [frame, wait], facts, sections: [{ id: "wait", title: label, paragraphs: [wait] }], mark: `${na}·${nb}` };
  }
  const text = PAIR_TEXTS[r.text]!;
  const together = t(text.together, locale);
  const rub = t(text.rub, locale);
  const brings = [bringsLine(r.a.value.number!, names.a, locale), bringsLine(r.b.value.number!, names.b, locale)];
  const masters = r.masters.map((m) => t(MASTER_NOTES[m], locale));
  const gap = r.gap.number ?? 0;
  const bridge = [npWord(locale, "npBridgeLine", { na: r.gap.gap?.[0] ?? "", nb: r.gap.gap?.[1] ?? "", n: gap }), t(BRIDGE_TEXT[gap as Gap], locale)].join(" ");
  facts.push({ label: npWord(locale, "npBridgeHead"), value: r.same ? npWord(locale, "npSame") : String(gap) });
  facts.push({ label: npWord(locale, "npRelHead"), value: wholeText(ctx.pair.relationship), ref: NP_REL_REF });
  return {
    ...base,
    lead: together,
    paragraphs: [frame, together, ...brings, ...masters, rub, bridge],
    facts,
    sections: [
      { id: "frame", title: label, paragraphs: [frame] },
      { id: "brings", title: npWord(locale, "npBringsHead"), paragraphs: brings },
      ...(masters.length ? [{ id: "master", title: npWord(locale, "npMasterHead"), paragraphs: masters }] : []),
      { id: "rub", title: npWord(locale, "npRubHead"), paragraphs: [rub] },
      { id: "bridge", title: npWord(locale, "npBridgeHead"), paragraphs: [bridge] },
    ],
    mark: `${na}·${nb}`,
  };
}

/** The relationship number's text. */
export const relationshipText = (n: number | null, locale: AppLocale): string => (n == null ? "" : t(RELATIONSHIP_TEXT[n], locale));

function relReading(ctx: PairContext, locale: AppLocale): ElementReading {
  const { pair, names } = ctx;
  const v = pair.relationship;
  const lead = relationshipText(v.number, locale);
  const steps = npWord(locale, "npRelSteps", { steps: stepsText(v) });
  const how = t(RELATIONSHIP_HOW, locale);
  const lp = pairRow(pair, "lifepath");
  const together = pairTogether(lp, locale);
  return {
    id: NP_REL_REF,
    kind: "sign",
    title: npWord(locale, "npRelTitle", { n: wholeText(v) }),
    kicker: `${names.a} · ${names.b}`,
    lead,
    paragraphs: [lead, steps, how, ...(together ? [together] : [])],
    facts: [
      { label: `${names.a} · ${numerologyCoreLabel(locale, "lifepath")}`, value: wholeText(pair.a.lifePath), ref: npPairRef("lifepath") },
      { label: `${names.b} · ${numerologyCoreLabel(locale, "lifepath")}`, value: wholeText(pair.b.lifePath), ref: npPairRef("lifepath") },
      { label: npWord(locale, "npRelHead"), value: stepsText(v) },
    ],
    sections: [
      { id: "how", title: npWord(locale, "npHowHead"), paragraphs: [steps, how] },
      ...(together ? [{ id: "lifepath", title: numerologyCoreLabel(locale, "lifepath"), paragraphs: [together] }] : []),
    ],
    links: pairLinks(ctx, locale),
    mark: wholeText(v),
    about: about(locale),
  };
}

/** "Birthday and Maturity", « Jour de naissance et Maturité ». */
function coresList(ids: readonly Parameters<typeof numerologyCoreLabel>[1][], locale: AppLocale): string {
  const fmt = new Intl.ListFormat(locale === "fr" ? "fr" : "en-GB", { type: "conjunction" });
  return fmt.format(ids.map((id) => numerologyCoreLabel(locale, id)));
}

/** A shared digit in one line: "The 6: for A, Birthday and Maturity; for B, Soul Urge." */
export function digitLine(s: SharedDigit, names: PairNames, locale: AppLocale): string {
  return npWord(locale, "npDigitLead", { d: s.digit, a: names.a, b: names.b, aList: coresList(s.a, locale), bList: coresList(s.b, locale) });
}

function digitReading(ctx: PairContext, s: SharedDigit, locale: AppLocale): ElementReading {
  const lead = digitLine(s, ctx.names, locale);
  const shared = npWord(locale, "npDigitShared", { d: s.digit, brings: t(BRINGS[s.digit], locale) });
  return {
    id: npDigitRef(s.digit),
    kind: "sign",
    title: npWord(locale, "npDigitTitle", { d: s.digit }),
    kicker: `${ctx.names.a} · ${ctx.names.b}`,
    lead,
    paragraphs: [lead, shared],
    facts: [
      { label: ctx.names.a, value: coresList(s.a, locale) },
      { label: ctx.names.b, value: coresList(s.b, locale) },
    ],
    sections: [{ id: "shared", title: npWord(locale, "npSharedHead"), paragraphs: [shared] }],
    links: pairLinks(ctx, locale),
    mark: String(s.digit),
    about: about(locale),
  };
}

/** The two of you this year, in one line. */
export function yearLine(ctx: PairContext, locale: AppLocale): string {
  const y = ctx.pair.year;
  return npWord(locale, "npYearLine", { year: y.year, a: ctx.names.a, b: ctx.names.b, pa: y.a.number ?? "—", pb: y.b.number ?? "—", pt: y.together.number ?? "—" });
}

/** The relationship's year's text. */
export const coupleYearText = (n: number | null, locale: AppLocale): string => (n == null ? "" : t(COUPLE_YEAR_TEXT[n], locale));

function yearReading(ctx: PairContext, locale: AppLocale): ElementReading {
  const { pair, names } = ctx;
  const y = pair.year;
  const lead = yearLine(ctx, locale);
  const text = coupleYearText(y.together.number, locale);
  const how = t(COUPLE_YEAR_HOW, locale);
  const steps = `${npWord(locale, "npYearTogether")}${colon(locale)}${stepsText(y.together)}`;
  return {
    id: NP_YEAR_REF,
    kind: "sign",
    title: npWord(locale, "npYearTitle", { year: y.year }),
    kicker: `${names.a} · ${names.b}`,
    lead,
    paragraphs: [lead, text, steps, how],
    facts: [
      { label: npWord(locale, "npYearOf", { name: names.a, deName: deFr(names.a) }), value: String(y.a.number ?? "—") },
      { label: npWord(locale, "npYearOf", { name: names.b, deName: deFr(names.b) }), value: String(y.b.number ?? "—") },
      { label: npWord(locale, "npYearTogether"), value: String(y.together.number ?? "—") },
      { label: npWord(locale, "npRelHead"), value: wholeText(pair.relationship), ref: NP_REL_REF },
    ],
    sections: [
      { id: "year", title: npWord(locale, "npYearTogether"), paragraphs: [text] },
      { id: "how", title: npWord(locale, "npHowHead"), paragraphs: [steps, how] },
    ],
    links: pairLinks(ctx, locale),
    mark: String(y.together.number ?? "—"),
    about: about(locale),
  };
}

/** The page's reading of a selection, or null (nothing chosen, or a ref of another page). */
export function numerologyPairReading(ctx: PairContext | null, ref: string | null, locale: AppLocale): ElementReading | null {
  if (!ctx || !ref || !ref.startsWith("np:")) return null;
  if (ref === NP_REL_REF) return relReading(ctx, locale);
  if (ref === NP_YEAR_REF) return yearReading(ctx, locale);
  const pair = /^np:pair:([a-z-]+)$/.exec(ref);
  if (pair && (PAIR_IDS as readonly string[]).includes(pair[1]!)) return pairReading(ctx, pairRow(ctx.pair, pair[1] as PairId), locale);
  const digit = /^np:digit:([1-9])$/.exec(ref);
  const shared = digit ? ctx.pair.shared.find((s) => s.digit === Number(digit[1])) : undefined;
  return shared ? digitReading(ctx, shared, locale) : null;
}

/** Every ref the page can open, for the tests. */
export function numerologyPairRefs(ctx: PairContext): string[] {
  return [NP_REL_REF, NP_YEAR_REF, ...PAIR_IDS.map(npPairRef), ...ctx.pair.shared.map((s) => npDigitRef(s.digit))];
}

/** The first read's lines (each a first sentence), from the pack's texts. */
export function firstReadLines(ctx: PairContext, locale: AppLocale): { rel: string; pairs: Partial<Record<PairId, string>>; year: string } {
  const pairs: Partial<Record<PairId, string>> = {};
  for (const r of ctx.pair.rows) {
    const x = pairTogether(r, locale);
    if (x) pairs[r.id] = first(x);
  }
  return { rel: first(relationshipText(ctx.pair.relationship.number, locale)), pairs, year: coupleYearText(ctx.pair.year.together.number, locale) };
}
