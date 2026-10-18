/*
 * What Feng Shui's home page says of the year and the month (languages plan,
 * part 25): their stars, how they turn, and where the year asks for quiet.
 *
 *   fsy:year            the year's star and its places to leave quiet
 *   fsy:month           the month's star
 *   fsy:aff:tai-sui     one of the year's afflictions
 */
import type { ElementReading } from "@/lib/chart/types";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { mountainById, mountainCode } from "./fengshui-home";
import { dirIn, directionName } from "./fengshui-reading";
import { DIRECTION_IDS } from "./fengshui";
import { starOf, type PalaceId } from "./fengshui-stars";
import type { AfflictionId, YearStars } from "./fengshui-years";
import { AFFLICTION_HOW, AFFLICTION_NAMES, AFFLICTION_TEXTS } from "./fengshui-years-texts";
import { said } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;
/** The year's notes per sector (part 27), from the texts loaded with the page. */
type YearTexts = Pick<typeof import("./fengshui-readings-texts"), "ANNUAL_NOTES">;

export const FSY_YEAR_REF = "fsy:year";
export const FSY_MONTH_REF = "fsy:month";
export const fsyAffRef = (id: AfflictionId): string => `fsy:aff:${id}`;
export const AFFLICTION_IDS: readonly AfflictionId[] = ["five-yellow", "tai-sui", "year-breaker", "three-killings"];

const starText = (n: number, locale: string, prefs: Shown) => chineseLabel(starOf(n), locale, prefs).text;
const starName = (n: number, locale: string) => (locale === "fr" ? starOf(n).fr : starOf(n).en);

/** A jie's date on the reader's own clock (a jie late in the UT day is the next day in Asia). */
function dateWord(ms: number, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", timeZone }).format(ms);
}

/** Where an affliction stands, as its line says it: a direction or a mountain. */
export function afflictionWhere(y: YearStars, id: AfflictionId, locale: string, prefs: Shown): string {
  const a = y.afflictions;
  const palace = (p: PalaceId) => (p === "c" ? cnWord(locale, "fssCentre").toLowerCase() : locale === "fr" ? dirIn(p, locale, "to") : `to ${dirIn(p, locale, "the")}`);
  const mountain = (id: Parameters<typeof mountainById>[0]) => {
    const m = mountainById(id);
    return `${chineseLabel(m, locale, prefs).text}, ${mountainCode(m, locale)}`;
  };
  if (id === "five-yellow") return palace(a.fiveYellow);
  if (id === "tai-sui") return mountain(a.taiSui);
  if (id === "year-breaker") return mountain(a.yearBreaker);
  return dirIn(a.threeKillings.direction, locale, "in");
}

/** "South", "Wu · wǔ 午, S2": an affliction's place in a few words, for lists and cards. */
export function afflictionPlace(y: YearStars, id: AfflictionId, locale: string, prefs: Shown): string {
  const a = y.afflictions;
  if (id === "five-yellow") return a.fiveYellow === "c" ? cnWord(locale, "fssCentre") : directionName(a.fiveYellow, locale);
  if (id === "three-killings") return directionName(a.threeKillings.direction, locale);
  const m = mountainById(id === "tai-sui" ? a.taiSui : a.yearBreaker);
  return `${chineseLabel(m, locale, { ...prefs, show: "names" }).name} · ${mountainCode(m, locale)}`;
}

export const afflictionName = (id: AfflictionId, locale: string, prefs: Shown): string => chineseLabel(AFFLICTION_NAMES[id], locale, { ...prefs, show: "names" }).name;

/** The year's line: "In 2026, the year's star in the centre is the 1 White…". */
export const yearLine = (y: YearStars, locale: string): string => cnWord(locale, "fsyYearLead", { year: y.solarYear, star: starName(y.year, locale) });
/** The month's line, with its dates: the jie that opens it and the day before the next. */
export const monthLine = (y: YearStars, locale: string, timeZone?: string): string =>
  cnWord(locale, "fsyMonthLead", { from: dateWord(y.monthFrom, locale, timeZone), to: dateWord(y.monthTo - 1, locale, timeZone), star: starName(y.month, locale) });

/** The year's note for a palace (part 27): what the year's star visiting it brings; the 5 Yellow's own line where it flies. */
export function yearNote(y: YearStars, p: PalaceId, locale: string, texts: YearTexts | null): string | null {
  const n = y.yearChart[p];
  if (n === 5) return cnWord(locale, "fsyPalaceFive");
  return texts ? said(texts.ANNUAL_NOTES[n], locale) : null;
}

/** A palace's visitors this year and this month, and the year's note for it. */
export function palaceYearLines(y: YearStars, p: PalaceId, locale: string, texts: YearTexts | null = null): string[] {
  const lines = [cnWord(locale, "fsyPalaceLine", { ystar: starName(y.yearChart[p], locale), mstar: starName(y.monthChart[p], locale) })];
  const note = yearNote(y, p, locale, texts);
  if (note) lines.push(note);
  return lines;
}

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "fssAboutTitle"), paragraphs: [cnWord(locale, "fssAbout1"), cnWord(locale, "fssAbout2")] };
}

/** The year's note for each sector (part 27): "North: …", the centre first. */
export function sectorNotes(y: YearStars, locale: string, texts: YearTexts | null): string[] {
  if (!texts) return [];
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  return (["c", ...DIRECTION_IDS] as PalaceId[]).map((p) => {
    const note = y.yearChart[p] === 5 ? cnWord(locale, "fsySectorFive") : lower(yearNote(y, p, locale, texts)!);
    return `${p === "c" ? cnWord(locale, "fssCentre") : directionName(p, locale)}${colon}${note}`;
  });
}

function yearReading(y: YearStars, locale: string, prefs: Shown, texts: YearTexts | null): ElementReading {
  const lead = yearLine(y, locale);
  const sectors = sectorNotes(y, locale, texts);
  const quiet = AFFLICTION_IDS.map((id) => `${afflictionName(id, locale, prefs)}${locale === "fr" ? "\u202f: " : ": "}${afflictionPlace(y, id, locale, prefs)}`);
  return {
    id: FSY_YEAR_REF,
    kind: "sign",
    title: cnWord(locale, "fsyYearTitle", { year: y.solarYear }),
    kicker: starText(y.year, locale, prefs),
    lead,
    paragraphs: [lead, cnWord(locale, "fsyHowYear"), ...quiet, ...sectors],
    facts: [
      { label: cnWord(locale, "fsyYearStar"), value: starText(y.year, locale, prefs) },
      { label: cnWord(locale, "fsyMonthStar"), value: starText(y.month, locale, prefs), ref: FSY_MONTH_REF },
      ...AFFLICTION_IDS.map((id) => ({ label: afflictionName(id, locale, prefs), value: afflictionPlace(y, id, locale, prefs), ref: fsyAffRef(id) })),
    ],
    sections: [
      { id: "how", title: cnWord(locale, "fssHowHead"), paragraphs: [cnWord(locale, "fsyHowYear")] },
      { id: "quiet", title: cnWord(locale, "fsyQuietHead"), paragraphs: quiet },
      ...(sectors.length ? [{ id: "sectors", title: cnWord(locale, "fsySectorsHead"), paragraphs: sectors }] : []),
    ],
    mark: starOf(y.year)[prefs.script],
    about: about(locale),
  };
}

function monthReading(y: YearStars, locale: string, prefs: Shown): ElementReading {
  const lead = monthLine(y, locale);
  const five = cnWord(locale, "fsyMonthFive", {
    where: y.afflictions.monthFiveYellow === "c" ? cnWord(locale, "fssCentre").toLowerCase() : dirIn(y.afflictions.monthFiveYellow, locale, "the"),
  });
  return {
    id: FSY_MONTH_REF,
    kind: "sign",
    title: cnWord(locale, "fsyMonthTitle"),
    kicker: starText(y.month, locale, prefs),
    lead,
    paragraphs: [lead, five, cnWord(locale, "fsyHowMonth")],
    facts: [
      { label: cnWord(locale, "fsyMonthStar"), value: starText(y.month, locale, prefs) },
      { label: cnWord(locale, "fsyYearStar"), value: starText(y.year, locale, prefs), ref: FSY_YEAR_REF },
    ],
    sections: [
      { id: "five", title: cnWord(locale, "fsyQuietHead"), paragraphs: [five] },
      { id: "how", title: cnWord(locale, "fssHowHead"), paragraphs: [cnWord(locale, "fsyHowMonth")] },
    ],
    mark: starOf(y.month)[prefs.script],
    about: about(locale),
  };
}

function afflictionReading(y: YearStars, id: AfflictionId, locale: string, prefs: Shown): ElementReading {
  const text = said(AFFLICTION_TEXTS[id], locale).replace("{where}", afflictionWhere(y, id, locale, prefs)).replace("{year}", String(y.solarYear));
  const n = AFFLICTION_NAMES[id];
  const how = said(AFFLICTION_HOW[id], locale);
  return {
    id: fsyAffRef(id),
    kind: "aspect",
    title: afflictionName(id, locale, prefs),
    kicker: `${chineseLabel(n, locale, prefs).text} · ${afflictionPlace(y, id, locale, prefs)}`,
    lead: text,
    paragraphs: [text, how],
    facts: [{ label: cnWord(locale, "fsyYearTitle", { year: y.solarYear }), value: starText(y.year, locale, prefs), ref: FSY_YEAR_REF }],
    sections: [{ id: "how", title: cnWord(locale, "fsyHowPlacedHead"), paragraphs: [how] }],
    mark: n[prefs.script],
    about: about(locale),
  };
}

/** A year's or month's reading, or null for a ref of another kind. */
export function yearsReading(y: YearStars | null, ref: string, locale: string, prefs: Shown, texts: YearTexts | null = null): ElementReading | null {
  if (!y || !ref.startsWith("fsy:")) return null;
  if (ref === FSY_YEAR_REF) return yearReading(y, locale, prefs, texts);
  if (ref === FSY_MONTH_REF) return monthReading(y, locale, prefs);
  const m = /^fsy:aff:([a-z-]+)$/.exec(ref);
  if (m && (AFFLICTION_IDS as readonly string[]).includes(m[1]!)) return afflictionReading(y, m[1] as AfflictionId, locale, prefs);
  return null;
}
