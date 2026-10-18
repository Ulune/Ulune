/*
 * What Feng Shui's Cycles page says (share and compare plan, feature 5d,
 * decision R4): the year and the month on the dial, each of the year's
 * afflictions, each of your eight directions under them (or, without a birth
 * chart, each direction under the year alone), and the year in practice.
 * Suggestions about timing only; the counsel is the classics', said gently.
 *
 *   fsc:year                 the year's star, how it turns, where it asks for quiet
 *   fsc:month                the month's star and its 5 Yellow
 *   fsc:aff:tai-sui          one of the year's afflictions, and where it falls for you
 *   fsc:yang:dir:se          one of your directions under the year (a count's Kua)
 *   fsc:dir:se               a direction under the year alone (no chart)
 *   fsc:yang:you             this year in practice: the direction to face, the ones to rest
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { fscWord } from "./fsc-words";
import { DIRECTION_IDS, MANSIONS, directionById, type DirectionId, type FsCount } from "./fengshui";
import { countLabel, dirIn, directionName, mansionName } from "./fengshui-reading";
import { starOf, type PalaceId } from "./fengshui-stars";
import type { AfflictionId, YearStars } from "./fengshui-years";
import { AFFLICTION_HOW, AFFLICTION_NAMES } from "./fengshui-years-texts";
import { afflictionName, afflictionPlace, yearLine } from "./fengshui-years-reading";
import { CYCLE_AFFLICTIONS, personDirection, type CycleState, type DirectionYear, type PersonDirection, type PersonYear } from "./fengshui-cycles";
import { AFFLICTION_FOR_YOU, BEST_NONE_BEHIND, CYCLES_ABOUT, HOW_READ, STAR_FOR_YOU, STATE_TEXTS } from "./fengshui-cycles-texts";
import { deFr, said, semicolon } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;

/** What the page reads: the stars of the year and month on the dial, the directions under them, and each count's person. */
export type CyclesContext = {
  y: YearStars;
  dirs: readonly DirectionYear[];
  /** One per count shown (the birth's own, both without one); none without a birth chart. */
  people: readonly PersonYear[];
  /** The reader's clock, for the months' dates. */
  timeZone?: string;
};

export const FSC_YEAR_REF = "fsc:year";
export const FSC_MONTH_REF = "fsc:month";
export const fscAffRef = (id: AfflictionId): string => `fsc:aff:${id}`;
/** A direction under the year: a count's (your mansion there), or, without a chart, the year's alone. */
export const fscDirRef = (count: FsCount | null, d: DirectionId): string => (count ? `fsc:${count}:dir:${d}` : `fsc:dir:${d}`);
export const fscYouRef = (count: FsCount): string => `fsc:${count}:you`;

/** A name inside a sentence or a list: "the Grand Duke", « le Grand Duc ». */
export const low = (s: string): string => s.replace(/^\p{Lu}/u, (x) => x.toLowerCase());
const colon = (locale: string) => (locale === "fr" ? "\u202f: " : ": ");
/** "1 White", « 1 Blanc ». */
export const starName = (n: number, locale: string): string => (locale === "fr" ? starOf(n).fr : starOf(n).en);
const starText = (n: number, locale: string, prefs: Shown) => chineseLabel(starOf(n), locale, prefs).text;

/** A day as the month's dates say it: "8 October", « 8 octobre », on the reader's clock. */
export function dayWord(ms: number, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", timeZone }).format(ms);
}

/** "the south and the north", « le sud et le nord ». */
export function directionsList(ds: readonly DirectionId[], locale: string): string {
  const fmt = new Intl.ListFormat(locale === "fr" ? "fr" : "en-GB", { type: "conjunction", style: "long" });
  return fmt.format(ds.map((d) => dirIn(d, locale, "the")));
}

/** The words of a direction's state this year. */
export const stateWord = (s: CycleState, locale: string): string => fscWord(locale, s === "strengthened" ? "fscStrengthened" : s === "rest" ? "fscRest" : "fscSteady");
export const stateLine = (s: CycleState, locale: string): string =>
  fscWord(locale, s === "strengthened" ? "fscStateStrengthened" : s === "rest" ? "fscStateRest" : "fscStateSteady");

/** The month on the dial, with its dates: "From 8 October to 7 November, the month's star in the centre is the 9 Purple." */
export const monthLine = (y: YearStars, locale: string, timeZone?: string): string =>
  fscWord(locale, "fscMonthLine", { from: dayWord(y.monthFrom, locale, timeZone), to: dayWord(y.monthTo - 1, locale, timeZone), star: starName(y.month, locale) });

/** Where the month's 5 Yellow visits. */
export function monthFiveLine(y: YearStars, locale: string): string {
  const p: PalaceId = y.afflictions.monthFiveYellow;
  return fscWord(locale, "fscMonthFive", { where: p === "c" ? cnWord(locale, "fssCentre").toLowerCase() : dirIn(p, locale, "the") });
}

/** This year's direction to face for new starts, or why there is none (all four rest, or the one left would put the Three Killings at your back). */
export function bestLine(p: PersonYear, locale: string): string {
  if (!p.best) return p.byMansion.some((x) => x.supportive && x.state !== "rest") ? said(BEST_NONE_BEHIND, locale) : fscWord(locale, "fscBestNone");
  const x = personDirection(p, p.best);
  return fscWord(locale, "fscBest", { dir: dirIn(p.best, locale, "the"), mansion: mansionName(x.mansion, locale) });
}

/** The supportive directions to rest this year, or that none asks for rest. */
export const restLine = (p: PersonYear, locale: string): string =>
  p.resting.length ? fscWord(locale, "fscRestLine", { list: directionsList(p.resting, locale) }) : fscWord(locale, "fscRestNone");

/** A direction's key in STATE_TEXTS (a supportive direction steady for the Three Killings behind it says why). */
const stateKey = (x: PersonDirection) =>
  (x.supportive ? (x.killingsBehind && x.state === "steady" ? "good-behind" : `good-${x.state}`) : `hard-${x.state === "strengthened" ? "steady" : x.state}`) as keyof typeof STATE_TEXTS;

/**
 * One direction for screen readers and the rose's say line: "South-East (wood): Growth, supportive; year's
 * star 9 Purple, month's star 8 White; strengthened this year; the Grand Duke."
 */
export function directionAria(x: DirectionYear | PersonDirection, locale: string, prefs: Shown, phase: string): string {
  const own = "mansion" in x ? `${mansionName(x.mansion, locale)}, ${cnWord(locale, x.supportive ? "fsSupportive" : "fsChallenging").toLowerCase()}` : null;
  const marks = [...x.afflictions.map((id) => low(afflictionName(id, locale, prefs))), ...(x.monthFive ? [fscWord(locale, "fscMonthFiveMark")] : [])];
  const parts = [
    `${directionName(x.direction, locale)} (${phase})${own ? `${colon(locale)}${own}` : ""}`,
    `${fscWord(locale, "fscYearStarAria", { star: starName(x.year, locale) })}, ${fscWord(locale, "fscMonthStarAria", { star: starName(x.month, locale) })}`,
    ...("state" in x ? [stateLine(x.state, locale)] : []),
    ...(marks.length ? [marks.join(", ")] : []),
  ];
  return `${parts.join(semicolon(locale))}.`;
}

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "fssAboutTitle"), paragraphs: CYCLES_ABOUT.map((t) => said(t, locale)) };
}

/** Each of the year's afflictions with its place: "The Grand Duke: Wu · S2". */
const quietLines = (y: YearStars, locale: string, prefs: Shown) => CYCLE_AFFLICTIONS.map((id) => `${afflictionName(id, locale, prefs)}${colon(locale)}${afflictionPlace(y, id, locale, prefs)}`);

function yearReading(ctx: CyclesContext, locale: string, prefs: Shown): ElementReading {
  const { y } = ctx;
  const lead = yearLine(y, locale);
  const quiet = quietLines(y, locale, prefs);
  const both = ctx.people.length > 1;
  const you = ctx.people.flatMap((p) => {
    const tag = both ? `${countLabel(p.fs.count, locale)}${colon(locale)}` : "";
    return [`${tag}${bestLine(p, locale)}`, `${tag}${restLine(p, locale)}`];
  });
  return {
    id: FSC_YEAR_REF,
    kind: "sign",
    title: cnWord(locale, "fsyYearTitle", { year: y.solarYear }),
    kicker: starText(y.year, locale, prefs),
    lead,
    paragraphs: [lead, cnWord(locale, "fsyHowYear"), ...quiet, ...you],
    facts: [
      { label: cnWord(locale, "fsyYearStar"), value: starText(y.year, locale, prefs) },
      { label: cnWord(locale, "fsyMonthStar"), value: starText(y.month, locale, prefs), ref: FSC_MONTH_REF },
      ...CYCLE_AFFLICTIONS.map((id) => ({ label: afflictionName(id, locale, prefs), value: afflictionPlace(y, id, locale, prefs), ref: fscAffRef(id) })),
    ],
    sections: [
      ...(you.length ? [{ id: "you", title: fscWord(locale, "fscYouHead"), paragraphs: you }] : []),
      { id: "quiet", title: cnWord(locale, "fsyQuietHead"), paragraphs: quiet },
      { id: "how", title: cnWord(locale, "fssHowHead"), paragraphs: [cnWord(locale, "fsyHowYear")] },
      { id: "read", title: fscWord(locale, "fscHowReadHead"), paragraphs: [said(HOW_READ, locale)] },
    ],
    mark: starOf(y.year)[prefs.script],
    about: about(locale),
  };
}

function monthReading(ctx: CyclesContext, locale: string, prefs: Shown): ElementReading {
  const { y } = ctx;
  const lead = monthLine(y, locale, ctx.timeZone);
  const five = monthFiveLine(y, locale);
  return {
    id: FSC_MONTH_REF,
    kind: "sign",
    title: fscWord(locale, "fscMonthHead"),
    kicker: starText(y.month, locale, prefs),
    lead,
    paragraphs: [lead, five, cnWord(locale, "fsyHowMonth")],
    facts: [
      { label: cnWord(locale, "fsyMonthStar"), value: starText(y.month, locale, prefs) },
      { label: cnWord(locale, "fsyYearStar"), value: starText(y.year, locale, prefs), ref: FSC_YEAR_REF },
    ],
    sections: [
      { id: "five", title: cnWord(locale, "fsyQuietHead"), paragraphs: [five, said(AFFLICTION_FOR_YOU["month-five-yellow"], locale)] },
      { id: "how", title: cnWord(locale, "fssHowHead"), paragraphs: [cnWord(locale, "fsyHowMonth")] },
    ],
    mark: starOf(y.month)[prefs.script],
    about: about(locale),
  };
}

/** The direction an affliction falls in (the Grand Duke's and the Year Breaker's by their mountain). */
export function afflictionDirection(ctx: Pick<CyclesContext, "dirs">, id: AfflictionId): DirectionId | null {
  return ctx.dirs.find((x) => x.afflictions.includes(id))?.direction ?? null;
}

function afflictionReading(ctx: CyclesContext, id: AfflictionId, locale: string, prefs: Shown): ElementReading {
  const { y } = ctx;
  const n = AFFLICTION_NAMES[id];
  const where = `${afflictionName(id, locale, prefs)}${colon(locale)}${afflictionPlace(y, id, locale, prefs)} (${y.solarYear})`;
  const counsel = said(AFFLICTION_FOR_YOU[id], locale);
  const how = said(AFFLICTION_HOW[id], locale);
  const d = afflictionDirection(ctx, id);
  const both = ctx.people.length > 1;
  const you = d
    ? ctx.people.map((p) => {
        const x = personDirection(p, d);
        const name = mansionName(x.mansion, locale);
        return `${both ? `${countLabel(p.fs.count, locale)}${colon(locale)}` : ""}${fscWord(locale, "fscDirLead", { year: y.solarYear, star: starName(x.year, locale), dir: dirIn(d, locale, "the"), mansion: name, deMansion: deFr(name) })}`;
      })
    : [];
  return {
    id: fscAffRef(id),
    kind: "aspect",
    title: afflictionName(id, locale, prefs),
    kicker: `${chineseLabel(n, locale, prefs).text} · ${afflictionPlace(y, id, locale, prefs)}`,
    lead: counsel,
    paragraphs: [where, counsel, ...you, how],
    facts: [
      { label: cnWord(locale, "fsyYearTitle", { year: y.solarYear }), value: starText(y.year, locale, prefs), ref: FSC_YEAR_REF },
      ...(d ? [{ label: cnWord(locale, "fsDirection"), value: directionName(d, locale), ref: fscDirRef(ctx.people[0]?.fs.count ?? null, d) }] : []),
    ],
    sections: [
      { id: "where", title: cnWord(locale, "fsyQuietHead"), paragraphs: [where] },
      ...(you.length ? [{ id: "you", title: fscWord(locale, "fscYouHead"), paragraphs: you }] : []),
      { id: "how", title: cnWord(locale, "fsyHowPlacedHead"), paragraphs: [how] },
    ],
    mark: n[prefs.script],
    about: about(locale),
  };
}

/** The year's star in a direction, in a sentence; the 5 Yellow is said by its affliction's counsel instead. */
const starLines = (x: DirectionYear, locale: string): string[] => (x.year === 5 ? [] : [said(STAR_FOR_YOU[x.year], locale)]);

/**
 * What falls in a direction this year and month: each affliction's counsel, the Three Killings across
 * from it (unless its state already says so), then the month's 5 Yellow.
 */
function marksOf(x: DirectionYear, locale: string, behindSaid = false): string[] {
  return [
    ...x.afflictions.map((id) => said(AFFLICTION_FOR_YOU[id], locale)),
    ...(x.killingsBehind && !behindSaid ? [said(AFFLICTION_FOR_YOU["killings-behind"], locale)] : []),
    ...(x.monthFive ? [said(AFFLICTION_FOR_YOU["month-five-yellow"], locale)] : []),
  ];
}

const dirMonth = (ctx: CyclesContext, x: DirectionYear, locale: string) =>
  fscWord(locale, "fscDirMonth", { from: dayWord(ctx.y.monthFrom, locale, ctx.timeZone), to: dayWord(ctx.y.monthTo - 1, locale, ctx.timeZone), star: starName(x.month, locale) });

function dirFacts(ctx: CyclesContext, x: DirectionYear, locale: string, prefs: Shown): ReadingFact[] {
  return [
    { label: cnWord(locale, "fsDirection"), value: chineseLabel(directionById(x.direction), locale, prefs).text },
    { label: cnWord(locale, "fsyYearStar"), value: starText(x.year, locale, prefs), ref: FSC_YEAR_REF },
    { label: cnWord(locale, "fsyMonthStar"), value: starText(x.month, locale, prefs), ref: FSC_MONTH_REF },
    ...x.afflictions.map((id) => ({ label: fscWord(locale, "fscQuietCol"), value: afflictionName(id, locale, prefs), ref: fscAffRef(id) })),
  ];
}

function personDirReading(ctx: CyclesContext, p: PersonYear, d: DirectionId, locale: string, prefs: Shown): ElementReading {
  const x = personDirection(p, d);
  const both = ctx.people.length > 1;
  const name = mansionName(x.mansion, locale);
  const lead = fscWord(locale, "fscDirLead", { year: ctx.y.solarYear, star: starName(x.year, locale), dir: dirIn(d, locale, "the"), mansion: name, deMansion: deFr(name) });
  const star = starLines(x, locale);
  const key = stateKey(x);
  const state = said(STATE_TEXTS[key], locale);
  const marks = marksOf(x, locale, key === "good-behind");
  const month = dirMonth(ctx, x, locale);
  const kind = cnWord(locale, x.supportive ? "fsSupportive" : "fsChallenging");
  return {
    id: fscDirRef(p.fs.count, d),
    kind: "house",
    title: fscWord(locale, "fscDirTitle", { dir: directionName(d, locale), year: ctx.y.solarYear }),
    kicker: [chineseLabel(MANSIONS[x.mansion], locale, { ...prefs, show: "names" }).name, kind, stateWord(x.state, locale), both ? countLabel(p.fs.count, locale) : null].filter(Boolean).join(" · "),
    lead,
    paragraphs: [lead, state, ...star, ...marks, month],
    facts: [
      ...dirFacts(ctx, x, locale, prefs).slice(0, 1),
      { label: cnWord(locale, "fsMansion"), value: chineseLabel(MANSIONS[x.mansion], locale, prefs).text },
      { label: fscWord(locale, "fscStateCol"), value: stateWord(x.state, locale), ref: fscYouRef(p.fs.count) },
      ...dirFacts(ctx, x, locale, prefs).slice(1),
      { label: cnWord(locale, "fsKuaHead"), value: cnWord(locale, "fsKuaN", { n: p.fs.kua }) },
    ],
    sections: [
      { id: "you", title: fscWord(locale, "fscYouHead"), paragraphs: [state] },
      ...(star.length ? [{ id: "star", title: fscWord(locale, "fscStarHead"), paragraphs: star }] : []),
      ...(marks.length ? [{ id: "quiet", title: cnWord(locale, "fsyQuietHead"), paragraphs: marks }] : []),
      { id: "month", title: fscWord(locale, "fscMonthHead"), paragraphs: [month] },
      { id: "read", title: fscWord(locale, "fscHowReadHead"), paragraphs: [said(HOW_READ, locale)] },
    ],
    links: {
      title: fscWord(locale, "fscRose"),
      rows: p.byMansion.map((m) => ({ ref: fscDirRef(p.fs.count, m.direction), label: mansionName(m.mansion, locale), detail: `${directionName(m.direction, locale)} · ${stateWord(m.state, locale)}` })),
    },
    mark: String(x.year),
    about: about(locale),
  };
}

function skyDirReading(ctx: CyclesContext, d: DirectionId, locale: string, prefs: Shown): ElementReading {
  const x = ctx.dirs.find((r) => r.direction === d)!;
  const lead = fscWord(locale, "fscDirLeadSky", { year: ctx.y.solarYear, star: starName(x.year, locale), dir: dirIn(d, locale, "the") });
  const star = starLines(x, locale);
  const marks = marksOf(x, locale);
  const month = dirMonth(ctx, x, locale);
  return {
    id: fscDirRef(null, d),
    kind: "house",
    title: fscWord(locale, "fscDirTitle", { dir: directionName(d, locale), year: ctx.y.solarYear }),
    kicker: starText(x.year, locale, prefs),
    lead,
    paragraphs: [lead, ...star, ...marks, month, fscWord(locale, "fscInvite")],
    facts: dirFacts(ctx, x, locale, prefs),
    sections: [
      ...(star.length ? [{ id: "star", title: fscWord(locale, "fscStarHead"), paragraphs: star }] : []),
      ...(marks.length ? [{ id: "quiet", title: cnWord(locale, "fsyQuietHead"), paragraphs: marks }] : []),
      { id: "month", title: fscWord(locale, "fscMonthHead"), paragraphs: [month] },
      { id: "you", title: cnWord(locale, "fsRose"), paragraphs: [fscWord(locale, "fscInvite")] },
    ],
    mark: String(x.year),
    about: about(locale),
  };
}

/** The year in practice for one count: the direction to face for new starts, the desk's line, the ones to rest. */
export function practiceLines(p: PersonYear, locale: string): string[] {
  const lines = [bestLine(p, locale)];
  if (p.best) {
    const x = personDirection(p, p.best);
    const name = mansionName(x.mansion, locale);
    lines.push(fscWord(locale, "fscPracticeDesk", { dir: dirIn(p.best, locale, "the"), mansion: name, deMansion: deFr(name), star: starName(x.year, locale) }));
  }
  lines.push(restLine(p, locale));
  return lines;
}

function youReading(ctx: CyclesContext, p: PersonYear, locale: string, prefs: Shown): ElementReading {
  const both = ctx.people.length > 1;
  const lines = practiceLines(p, locale);
  return {
    id: fscYouRef(p.fs.count),
    kind: "house",
    title: fscWord(locale, "fscPracticeTitle"),
    kicker: [String(ctx.y.solarYear), cnWord(locale, "fsKuaN", { n: p.fs.kua }), both ? countLabel(p.fs.count, locale) : null].filter(Boolean).join(" · "),
    lead: lines[0]!,
    paragraphs: [...lines, said(HOW_READ, locale)],
    facts: p.byMansion
      .filter((x) => x.supportive)
      .map((x) => ({ label: mansionName(x.mansion, locale), value: `${directionName(x.direction, locale)} · ${stateWord(x.state, locale)}`, ref: fscDirRef(p.fs.count, x.direction) })),
    sections: [
      // The lead says the direction to face; the section, the desk and the directions to rest.
      { id: "you", title: fscWord(locale, "fscYouHead"), paragraphs: lines.slice(1) },
      { id: "read", title: fscWord(locale, "fscHowReadHead"), paragraphs: [said(HOW_READ, locale)] },
    ],
    links: {
      title: fscWord(locale, "fscRose"),
      rows: p.byMansion.map((m) => ({ ref: fscDirRef(p.fs.count, m.direction), label: mansionName(m.mansion, locale), detail: `${directionName(m.direction, locale)} · ${stateWord(m.state, locale)}` })),
    },
    mark: "八宅",
    about: about(locale),
  };
}

/** The page's reading of a selection, or null (nothing chosen, or a ref of another page). */
export function cyclesReading(ctx: CyclesContext | null, ref: string | null, locale: string, prefs: Shown): ElementReading | null {
  if (!ctx || !ref || !ref.startsWith("fsc:")) return null;
  if (ref === FSC_YEAR_REF) return yearReading(ctx, locale, prefs);
  if (ref === FSC_MONTH_REF) return monthReading(ctx, locale, prefs);
  const aff = /^fsc:aff:([a-z-]+)$/.exec(ref);
  if (aff) return (CYCLE_AFFLICTIONS as readonly string[]).includes(aff[1]!) ? afflictionReading(ctx, aff[1] as AfflictionId, locale, prefs) : null;
  const sky = /^fsc:dir:(n|ne|e|se|s|sw|w|nw)$/.exec(ref);
  if (sky) return skyDirReading(ctx, sky[1] as DirectionId, locale, prefs);
  const own = /^fsc:(yang|yin):(you|dir:(n|ne|e|se|s|sw|w|nw))$/.exec(ref);
  if (!own) return null;
  const p = ctx.people.find((x) => x.fs.count === own[1]);
  if (!p) return null;
  return own[2] === "you" ? youReading(ctx, p, locale, prefs) : personDirReading(ctx, p, own[3] as DirectionId, locale, prefs);
}

/** Every ref the page can open for a context, for the tests. */
export function cyclesRefs(ctx: CyclesContext): string[] {
  const own = ctx.people.flatMap((p) => [fscYouRef(p.fs.count), ...DIRECTION_IDS.map((d) => fscDirRef(p.fs.count, d))]);
  return [FSC_YEAR_REF, FSC_MONTH_REF, ...CYCLE_AFFLICTIONS.map(fscAffRef), ...(ctx.people.length ? own : DIRECTION_IDS.map((d) => fscDirRef(null, d)))];
}
