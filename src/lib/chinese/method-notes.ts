/*
 * What the Chinese pages say about how they were calculated (languages plan,
 * part 29: "each language's method notes name the school followed").
 *
 *   - The conditional notes, like astrology's (lib/chart/method-notes.ts), only
 *     when they apply to the birth on screen: born between 23:00 and 01:00 on
 *     the clock the pillars are read on (Settings → Chinese traditions promises
 *     it), what the reader's day rule gives and what the Zi Ping rule or
 *     midnight would; born outside the table's 1800–2200, the terms worked out
 *     by formula; a pillar within five minutes of its change (the engine's own
 *     flag, said with the zodiac's words; for Feng Shui, Lichun's); and, on
 *     Chinese astrology's page only, the two days on which the calendar's
 *     choices move the animal counted from New Year: 3 February 1916
 *     (1913–1928 reckoned at Beijing's meridian) and 13 February 1896 (the
 *     Qing calendar of the time).
 *   - Each language's "How Ulune calculates": the school, the main choices
 *     and the source of the solar terms and new moons, in a few short lines.
 *
 * Pure: the birth comes from a cast chart's meta, the clock, the day rule and
 * how terms are written from Settings. Tested in
 * scripts/chinese-method-notes.test.mjs. Nothing is sent.
 */
import { DAY_MS } from "./astro";
import { CALENDAR_OFFSET_MINUTES, calendarDayOf, dayNumberOf, lunarNewYearDay, yearCycleOf } from "./lunar";
import { SIXTY } from "./names";
import { fourPillars, type BirthMoment, type DayBoundary, type FourPillars } from "./pillars";
import { chineseLabel, DEFAULT_CHINESE_PREFS, type ChinesePrefs } from "./prefs";
import { LICHUN, isTabulated, moonAtOrBefore, moonMs, termMs } from "./terms";
import { TABLE_SOURCE } from "./time-table";
import { cnWord, theAnimal, type ChineseWordKey } from "./words";
import { birthMomentOf, type ZodiacBirth, type ZodiacPlaceId } from "./zodiac";
import { PLACE_ANIMAL } from "./zodiac-places";
import { deFr } from "./both";

/** The Chinese pages that say how they were calculated. */
export type ChinesePageId = "zodiac" | "zodiac-pair" | "bazi" | "bazi-luck" | "bazi-pair" | "fengshui" | "fengshui-pair" | "fengshui-home" | "fengshui-cycles";

export type MethodNote = {
  /** What it is about, stable for tests: "day-boundary", "formula", "near-day", "new-year-beijing"… */
  id: string;
  /** Set before the text: the person on a page of two, the place a "~" marks ("Day pillar ~"). */
  lead?: string;
  text: string;
  /** It points to Settings → Chinese traditions. */
  settings?: boolean;
};

export type NotePrefs = Pick<ChinesePrefs, "clock" | "dayBoundary" | "script" | "show">;

const MINUTE_MS = 60_000;
const ZODIAC_PAGES: readonly ChinesePageId[] = ["zodiac", "zodiac-pair"];
const FENGSHUI_PAGES: readonly ChinesePageId[] = ["fengshui", "fengshui-pair", "fengshui-home", "fengshui-cycles"];
const PLACES: readonly ZodiacPlaceId[] = ["year", "month", "day", "hour"];
const PILLAR_KEY: Record<ZodiacPlaceId, ChineseWordKey> = { year: "bzPillarYear", month: "bzPillarMonth", day: "bzPillarDay", hour: "bzPillarHour" };

/** A place's name on a page: "Day animal" on Chinese astrology's, "Day pillar" on BaZi's. */
const placeName = (page: ChinesePageId, id: ZodiacPlaceId, locale: string): string =>
  cnWord(locale, ZODIAC_PAGES.includes(page) ? PLACE_ANIMAL[id] : PILLAR_KEY[id]);

/** A time on a clock: "23:09"; in French "23 h 09". */
function clockTime(ms: number, locale: string): string {
  const minutes = Math.floor((((ms % DAY_MS) + DAY_MS) % DAY_MS) / MINUTE_MS);
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, "0");
  return locale === "fr" ? `${h}\u202fh\u202f${m}` : `${String(h).padStart(2, "0")}:${m}`;
}

/** A calendar day (day number) as its day and month, the year being said beside it: "3 February", « 3 février ». */
function dayMonth(day: number, locale: string): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(day * DAY_MS));
}

/** The birth's time on the clock the pillars are read on, and on the wall clock when that shows another minute. */
function birthTime(moment: BirthMoment, four: FourPillars, locale: string): string {
  const time = clockTime(four.localMs, locale);
  if (four.clock === "civil") return cnWord(locale, "cnmTimeCivil", { time });
  const on = cnWord(locale, four.clock === "true-solar" ? "cnmTimeSolar" : "cnmTimeMean", { time });
  if (moment.utcOffsetMinutes === undefined) return on;
  const wall = clockTime(moment.ms + moment.utcOffsetMinutes * MINUTE_MS, locale);
  return wall === time ? on : `${on} ${cnWord(locale, "cnmTimeAlso", { time: wall })}`;
}

/**
 * Born between 23:00 and 01:00 on the reader's clock: which day the reader's
 * rule gives and what the other gives. Before midnight the schools differ (the
 * Zi Ping rule already counts the next day; midnight, or the split Rat hour,
 * keeps this one); after midnight they all count the new day.
 */
function dayBoundaryNote(page: ChinesePageId, moment: BirthMoment, mine: FourPillars, prefs: NotePrefs, locale: string, who?: string): MethodNote | null {
  if (moment.timeUnknown) return null;
  const minutes = Math.floor((((mine.localMs % DAY_MS) + DAY_MS) % DAY_MS) / MINUTE_MS);
  const late = minutes >= 23 * 60;
  if (!late && minutes >= 60) return null;
  const label = (four: FourPillars) => chineseLabel(SIXTY[four.day.cycle]!, locale, prefs).text;
  // "your day pillar", or on a page of two "Sample B's day pillar" (« le pilier du jour de Sample B »).
  const place = cnWord(locale, ZODIAC_PAGES.includes(page) ? "zkDayAnimal" : "bzPillarDay").toLowerCase();
  const whose = who
    ? cnWord(locale, "cnmWhose", { who, deWho: deFr(who), place: locale === "fr" ? `${/^[aeiouyéèêh]/i.test(place) ? "l’" : "le "}${place}` : place })
    : cnWord(locale, "cnmYour", { place });
  const vars = { time: birthTime(moment, mine, locale), whose, day: label(mine) };
  if (!late) return { id: "day-boundary", text: cnWord(locale, "cnmDayAfter", vars), settings: true };
  // The other answer: midnight's for the Zi Ping rule, the Zi Ping rule's for the others.
  const otherRule: DayBoundary = prefs.dayBoundary === "23:00" ? "midnight" : "23:00";
  const other = label(fourPillars(moment, { clock: prefs.clock, dayBoundary: otherRule }));
  const key: ChineseWordKey = prefs.dayBoundary === "23:00" ? "cnmDay23" : prefs.dayBoundary === "split" ? "cnmDaySplit" : "cnmDayMidnight";
  return { id: "day-boundary", text: cnWord(locale, key, { ...vars, other }), settings: true };
}

/**
 * The pillars the engine marks "~" (pillars.ts, `uncertain`): within five
 * minutes of their change, or changing during the day without a birth time;
 * said with the zodiac reading's own words. Feng Shui reads only the year: a
 * birth within minutes of Lichun could give the other year, and another Kua;
 * without a time, on Lichun's day, the Kua's own words (fengshui.ts's
 * `uncertain`), which Feng Shui's page already shows on its Kua card.
 */
function nearNotes(page: ChinesePageId, moment: BirthMoment, four: FourPillars, locale: string): MethodNote[] {
  if (FENGSHUI_PAGES.includes(page)) {
    if (!moment.timeUnknown) return four.uncertain.year ? [{ id: "near-lichun", text: cnWord(locale, "cnmNearLichun") }] : [];
    const lichun = termMs(new Date(moment.ms).getUTCFullYear(), LICHUN);
    return page === "fengshui-home" && Math.abs(lichun - moment.ms) < DAY_MS ? [{ id: "near-lichun", text: cnWord(locale, "fsUncertain") }] : [];
  }
  const text = cnWord(locale, moment.timeUnknown ? "zkUncertainDay" : "zkUncertainNear");
  const notes: MethodNote[] = PLACES.filter((id) => four.uncertain[id] && (id !== "hour" || four.hour)).map((id) => ({
    id: `near-${id}`,
    lead: `${placeName(page, id, locale)} ~`,
    text,
  }));
  // The animal counted from New Year, on the page that names it.
  if (page === "zodiac" && !moment.timeUnknown && four.uncertain.lunarYear) {
    notes.push({ id: "near-new-year", lead: `${cnWord(locale, "cnmNewYearAnimal")} ~`, text });
  }
  return notes;
}

/**
 * The calendar's New Years that its choices move by a day (README.md), as
 * day numbers: from 1913 to 1928 the engine reckons the calendar at Beijing's
 * meridian, as the calendars of those years were (the Hong Kong
 * Observatory's tables keep them), where China's standard time would move
 * New Year 1916 a day later; before 1913 it applies the modern rules at
 * 120° E, where the Qing observatory's calendar of 1896, as sxtwl records it,
 * began the year a day earlier (13 February). Of the other months that move,
 * none is a first month: none changes the animal counted from New Year.
 */
const QING_NEW_YEARS: Readonly<Record<number, number>> = { 1896: Date.UTC(1896, 1, 13) / DAY_MS };

/** New Year of a lunar year at China's standard time (UTC+8), from the same new moon the engine's calendar starts it on. */
function newYearAt120(year: number): number {
  const day = lunarNewYearDay(year);
  let k = moonAtOrBefore((day + 1) * DAY_MS);
  while (calendarDayOf(moonMs(k)) > day) k -= 1;
  return Math.floor((moonMs(k) + CALENDAR_OFFSET_MINUTES * MINUTE_MS) / DAY_MS);
}

/** The lunar year a calendar day falls in, with New Year on other days. */
const lunarYearWith = (day: number, year: number, newYear: (y: number) => number): number =>
  day >= newYear(year + 1) ? year + 1 : day >= newYear(year) ? year : year - 1;

/** On Chinese astrology's page: the animal counted from New Year, when the calendar's choices change it. */
function newYearNotes(moment: BirthMoment, four: FourPillars, locale: string): MethodNote[] {
  // The birthplace's date, as the engine looks the lunar birthday up (pillars.ts).
  const day = dayNumberOf(moment.ms, moment.utcOffsetMinutes ?? moment.longitude * 4);
  const year = four.lunar.year;
  const notes: MethodNote[] = [];
  for (const [id, key, other] of [
    ["new-year-beijing", "cnmNewYearBeijing", newYearAt120],
    ["new-year-qing", "cnmNewYearQing", (y: number) => QING_NEW_YEARS[y] ?? lunarNewYearDay(y)],
  ] as const) {
    const otherYear = lunarYearWith(day, year, other);
    if (otherYear === year) continue;
    // The New Year that moved: the next one when the other calendar has already turned, this one when it has not.
    const moved = otherYear > year ? year + 1 : year;
    notes.push({
      id,
      text: cnWord(locale, key, {
        year: moved,
        date: dayMonth(lunarNewYearDay(moved), locale),
        other: dayMonth(other(moved), locale),
        theAnimal: theAnimal(yearCycleOf(otherYear) % 12, locale),
      }),
    });
  }
  return notes;
}

/**
 * The notes that apply to one birth on one page, in the reader's language,
 * on the reader's clock and day rule; none for a usual birth. `who` names the
 * person on a page of two.
 */
export function methodNotesOf(birth: ZodiacBirth, page: ChinesePageId, prefs: NotePrefs, locale: string, who?: string): MethodNote[] {
  const moment = birthMomentOf(birth);
  if (!moment) return [];
  const four = fourPillars(moment, { clock: prefs.clock, dayBoundary: prefs.dayBoundary });
  const notes: MethodNote[] = [];
  // Feng Shui reads the solar year alone: the day's turn changes nothing there.
  if (!FENGSHUI_PAGES.includes(page)) {
    const day = dayBoundaryNote(page, moment, four, prefs, locale, who);
    if (day) notes.push(day);
  }
  notes.push(...nearNotes(page, moment, four, locale));
  if (page === "zodiac") notes.push(...newYearNotes(moment, four, locale));
  if (!isTabulated(moment.ms)) {
    notes.push({ id: "formula", text: cnWord(locale, "cnmNoteFormula", { what: cnWord(locale, page === "zodiac" ? "cnmWhatTermsMoons" : "cnmWhatTerms") }) });
  }
  if (!who) return notes;
  return notes.map((n) => ({ ...n, lead: n.lead ? `${who} · ${n.lead}` : who }));
}

/** A note on one line, its lead before its text, as the page sets them side by side. */
export const noteLine = (n: MethodNote): string => (n.lead ? `${n.lead} — ${n.text}` : n.text);

/** The clock and the day's turn, as the reader set them (or Ulune's defaults). */
function clockItem(prefs: Pick<ChinesePrefs, "clock" | "dayBoundary">, locale: string): string {
  if (prefs.clock === DEFAULT_CHINESE_PREFS.clock && prefs.dayBoundary === DEFAULT_CHINESE_PREFS.dayBoundary) return cnWord(locale, "cnmHowClockDefault");
  return cnWord(locale, "cnmHowClockChosen", {
    clock: cnWord(locale, prefs.clock === "true-solar" ? "cnmClockSolar" : prefs.clock === "local-mean" ? "cnmClockMean" : "cnmClockCivil"),
    day: cnWord(locale, prefs.dayBoundary === "23:00" ? "zkDayAt23" : prefs.dayBoundary === "split" ? "zkDaySplit" : "zkDayMidnight"),
  });
}

/**
 * A page's "How Ulune calculates": its language's school and main choices,
 * then where the solar terms (and, for New Year, the new moons) come from.
 * Every line is the code's own choice, said in a sentence or two.
 */
export function howUluneCalculates(page: ChinesePageId, prefs: Pick<ChinesePrefs, "clock" | "dayBoundary">, locale: string): { title: string; items: string[] } {
  const source = { source: TABLE_SOURCE };
  const say = (key: ChineseWordKey) => cnWord(locale, key);
  let items: string[];
  if (page === "zodiac") items = [say("cnmHowZodiac"), clockItem(prefs, locale), say("cnmHowNewYear"), cnWord(locale, "cnmHowSourceMoons", source)];
  else if (page === "zodiac-pair") items = [say("cnmHowZodiac"), clockItem(prefs, locale), cnWord(locale, "cnmHowSourceTerms", source)];
  else if (page === "bazi-pair") items = [say("cnmHowBazi"), say("cnmHowPillars"), clockItem(prefs, locale), cnWord(locale, "cnmHowSourceTerms", source)];
  else if (page === "bazi" || page === "bazi-luck") items = [say("cnmHowBazi"), say("cnmHowPillars"), clockItem(prefs, locale), say("cnmHowLuck"), cnWord(locale, "cnmHowSourceTerms", source)];
  else if (page === "fengshui" || page === "fengshui-pair") items = [say("cnmHowKua"), cnWord(locale, "cnmHowSourceTerms", source)];
  // Feng Shui's Cycles (share and compare plan, feature 5d): the Kua, the year's and the month's stars, how they are read over your directions.
  else if (page === "fengshui-cycles") items = [say("cnmHowKua"), say("cnmHowStars"), say("cnmHowCycles"), cnWord(locale, "cnmHowSourceTerms", source)];
  else items = [say("cnmHowKua"), say("cnmHowHome"), say("cnmHowPeriod"), say("cnmHowStars"), cnWord(locale, "cnmHowSourceTerms", source)];
  return { title: say("cnmHowTitle"), items };
}
