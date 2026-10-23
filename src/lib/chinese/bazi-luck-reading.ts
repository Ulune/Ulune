/*
 * What BaZi's Cycles page says (languages plan, part 16): a luck pillar, the
 * year shown, one of its months, today, and how the luck pillars are
 * counted. Each names the pillar's Ten God for the reader (by its stem, and
 * by its branch's main qi), what it meets among the four pillars (and, for a
 * year, in the luck pillar it falls in), and the working: the direction from
 * the year stem and the count, the start from the days to the opening term.
 * A reference to the chart's own cells is read by the board's readings.
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { PHASES, POLARITY_NAMES, SIXTY, STEMS } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord, type ChineseWordKey } from "./words";
import { tenGodById, type BaziChart, type BaziPlaceId } from "./bazi";
import { TEN_GOD_TEXTS } from "./bazi-texts";
import { LUCK_GOD_TEXTS, YEAR_GOD_TEXTS, pairLine } from "./bazi-readings-texts";
import type { Both } from "./both";
import { INTERACTION_NAMES } from "./bazi-interactions";
import { PILLAR_WORD, baziReading, branchCellRef, stemRef } from "./bazi-reading";
import type { FlowYear, Luck, LuckCount, LuckPillar, Meeting, TimePillar } from "./bazi-luck";
import { deFr, said } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;

export const luckRef = (count: LuckCount, index: number): string => `bz:luck:${count}:${index}`;
export const LUCK_HOW_REF = "bz:luck-how";
export const FLOW_YEAR_REF = "bz:flow-year";
export const flowMonthRef = (index: number): string => `bz:flow-month:${index}`;
export const FLOW_DAY_REF = "bz:flow-day";

export type LuckContext = {
  c: BaziChart;
  /** One luck per count given (both when the birth has none). */
  lucks: Luck[];
  year: FlowYear;
  day: Omit<TimePillar, "fromMs" | "toMs"> | null;
  /** The birthplace's time zone, for the dates. */
  tz?: string;
};

export function dateIn(ms: number, locale: string, tz?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: tz || "UTC", ...opts }).format(new Date(ms)).replace(/\.$/, "");
}

/** An age as years and months: "7 years 3 months", « 7 ans 3 mois », "1 year", « 1 an ». */
export function ageWords(start: Luck["start"], locale: string): string {
  const { years: y, months: m } = start;
  if (locale === "fr") return `${y}\u00a0${y <= 1 ? "an" : "ans"}${m ? ` ${m}\u00a0mois` : ""}`;
  return `${y} ${y === 1 ? "year" : "years"}${m ? ` ${m} ${m === 1 ? "month" : "months"}` : ""}`;
}

const COUNT_WORD: Record<LuckCount, ChineseWordKey> = { yang: "bzlCountYang", yin: "bzlCountYin" };
export const countWord = (count: LuckCount, locale: string): string => cnWord(locale, COUNT_WORD[count]);

/** "Year pillar", or the luck pillar's word. */
const placeWord = (place: BaziPlaceId | "luck", locale: string) => (place === "luck" ? cnWord(locale, "bzlInLuck") : cnWord(locale, PILLAR_WORD[place]));

/** A meeting as a fact: its name, the places it meets (and the phase it makes), opening the cell it meets. */
export function meetingFact(m: Meeting, locale: string, prefs: Shown, luckRefOf?: string): ReadingFact {
  const phase = m.phase ? ` · ${chineseLabel(PHASES.find((x) => x.id === m.phase)!, locale, { ...prefs, show: "names" }).name}` : "";
  const first = m.with[0]!;
  return {
    label: chineseLabel(INTERACTION_NAMES[m.kind], locale, prefs).name,
    value: `${m.with.map((p) => placeWord(p, locale)).join(", ")}${phase}`,
    ref: first === "luck" ? luckRefOf : m.level === "stem" ? stemRef(first) : branchCellRef(first),
  };
}

/** A meeting in a few words, for the band and the list: "Clash · Hour". */
export function meetingShort(m: Meeting, locale: string, prefs: Shown): string {
  return `${chineseLabel(INTERACTION_NAMES[m.kind], locale, { ...prefs, show: "names" }).name} · ${m.with.map((p) => (p === "luck" ? cnWord(locale, "bzlInLuck") : cnWord(locale, PILLAR_WORD[p]))).join(", ")}`;
}

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "bzAboutTitle"), paragraphs: [cnWord(locale, "bzAbout1"), cnWord(locale, "bzAbout6")] };
}

/** The pillar's facts: the pair, its stem's god, its branch's main qi's god. */
function pillarFacts(t: { pillar: LuckPillar["pillar"]; god: LuckPillar["god"]; branchGod: LuckPillar["branchGod"] }, label: string, locale: string, prefs: Shown): ReadingFact[] {
  return [
    { label, value: chineseLabel(SIXTY[t.pillar.cycle]!, locale, prefs).text },
    { label: cnWord(locale, "bzGod"), value: chineseLabel(tenGodById(t.god), locale, prefs).text },
    { label: cnWord(locale, "bzlBranchGodCol"), value: chineseLabel(tenGodById(t.branchGod), locale, prefs).text },
  ];
}

/** What the pillar's god brings: a luck pillar's decade or a year by its own texts (part 18), a month or a day by what the god stands for. */
function godTheme(t: { god: LuckPillar["god"] }, locale: string, prefs: Shown, texts: Readonly<Record<LuckPillar["god"], Both>> = TEN_GOD_TEXTS) {
  const god = chineseLabel(tenGodById(t.god), locale, { ...prefs, show: "names" }).name;
  const paragraphs = [said(texts[t.god], locale)];
  if (texts !== TEN_GOD_TEXTS) paragraphs.push(said(TEN_GOD_TEXTS[t.god], locale));
  return { id: "god", title: cnWord(locale, "bzlGodTheme", { god }), paragraphs };
}

function meetsSection(meets: Meeting[], locale: string, prefs: Shown) {
  return {
    id: "meets",
    title: cnWord(locale, "bzlMeetsTitle"),
    paragraphs: meets.length
      ? meets.map((m) => {
          const head = meetingShort(m, locale, prefs) + (m.phase ? ` · ${chineseLabel(PHASES.find((x) => x.id === m.phase)!, locale, { ...prefs, show: "names" }).name}` : "");
          const own = pairLine(m.kind, m.level, m.items, m.phase);
          return own ? `${head}${locale === "fr" ? "\u202f: " : ": "}${said(own, locale)}` : head;
        })
      : [cnWord(locale, "bzlMeetsNone")],
  };
}

const godName = (id: LuckPillar["god"], locale: string, prefs: Shown) => chineseLabel(tenGodById(id), locale, { ...prefs, show: "names" }).name;

function luckPillarReading(x: LuckContext, l: Luck, p: LuckPillar, locale: string, prefs: Shown): ElementReading {
  const name = chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs);
  const from = dateIn(p.fromMs, locale, x.tz, { month: "short", year: "numeric" });
  const to = dateIn(p.toMs, locale, x.tz, { month: "short", year: "numeric" });
  // French elides before a month that opens on a vowel: « d’oct. 2017 » (part 20).
  const lead = cnWord(locale, "bzlLuckLead", { from, deFrom: deFr(from), to, god: godName(p.god, locale, prefs), branchGod: godName(p.branchGod, locale, prefs) });
  const sections = [godTheme(p, locale, prefs, LUCK_GOD_TEXTS), meetsSection(p.meets, locale, prefs)];
  const ages = cnWord(locale, "bzlAges", { from: Math.floor(p.fromAge), to: Math.floor(p.toAge) });
  return {
    id: luckRef(l.count, p.index),
    kind: "sign",
    title: name.name,
    kicker: [cnWord(locale, "bzlInLuck"), ages, x.lucks.length > 1 ? countWord(l.count, locale) : null].filter(Boolean).join(" · "),
    lead,
    paragraphs: [lead, ...sections.flatMap((s) => s.paragraphs)],
    facts: [
      { label: cnWord(locale, "bzlAgesCol"), value: ages },
      ...pillarFacts(p, cnWord(locale, "bzlInLuck"), locale, prefs),
      ...p.meets.map((m) => meetingFact(m, locale, prefs)),
      { label: cnWord(locale, "bzBalHow"), value: cnWord(locale, l.direction === "forward" ? "bzlForward" : "bzlBackward"), ref: LUCK_HOW_REF },
    ],
    sections,
    mark: name.hanzi ?? undefined,
    terms: [{ family: "pillar", id: SIXTY[p.pillar.cycle]!.id }],
    about: about(locale),
  };
}

function yearReading(x: LuckContext, locale: string, prefs: Shown): ElementReading {
  const y = x.year;
  const name = chineseLabel(SIXTY[y.pillar.cycle]!, locale, prefs);
  const lead = cnWord(locale, "bzlYearLead", { year: y.year, next: y.year + 1, god: godName(y.god, locale, prefs), branchGod: godName(y.branchGod, locale, prefs) });
  const facts: ReadingFact[] = [...pillarFacts(y, cnWord(locale, "bzlYearHead", { year: y.year }), locale, prefs), ...y.meets.map((m) => meetingFact(m, locale, prefs))];
  for (const l of y.luck) {
    const label = `${cnWord(locale, "bzlInLuck")}${y.luck.length > 1 ? ` · ${countWord(l.count, locale)}` : ""}`;
    facts.push(
      l.pillar
        ? { label, value: chineseLabel(SIXTY[l.pillar.pillar.cycle]!, locale, prefs).text, ref: luckRef(l.count, l.pillar.index) }
        : { label, value: cnWord(locale, "bzlBeforeLuck") },
    );
    for (const m of l.meets) facts.push(meetingFact(m, locale, prefs, l.pillar ? luckRef(l.count, l.pillar.index) : undefined));
  }
  const meets = [...y.meets, ...y.luck.flatMap((l) => l.meets)];
  const sections = [godTheme(y, locale, prefs, YEAR_GOD_TEXTS), meetsSection(meets, locale, prefs), { id: "flow", title: cnWord(locale, "bzBalHow"), paragraphs: [cnWord(locale, "bzlFlowNote")] }];
  return {
    id: FLOW_YEAR_REF,
    kind: "sign",
    title: name.name,
    kicker: cnWord(locale, "bzlYearHead", { year: y.year }),
    lead,
    paragraphs: [lead, ...sections.flatMap((s) => s.paragraphs)],
    facts,
    sections,
    mark: name.hanzi ?? undefined,
    terms: [{ family: "pillar", id: SIXTY[y.pillar.cycle]!.id }],
    about: about(locale),
  };
}

function monthReading(x: LuckContext, index: number, locale: string, prefs: Shown): ElementReading | null {
  const m = x.year.months[index];
  if (!m) return null;
  const name = chineseLabel(SIXTY[m.pillar.cycle]!, locale, prefs);
  const lead = cnWord(locale, "bzlMonthLead", {
    from: dateIn(m.fromMs, locale, x.tz, { day: "numeric", month: "long" }),
    to: dateIn(m.toMs, locale, x.tz, { day: "numeric", month: "long" }),
    god: godName(m.god, locale, prefs),
    branchGod: godName(m.branchGod, locale, prefs),
  });
  const sections = [godTheme(m, locale, prefs), meetsSection(m.meets, locale, prefs)];
  return {
    id: flowMonthRef(index),
    kind: "sign",
    title: name.name,
    kicker: [cnWord(locale, "bzlYearHead", { year: x.year.year }), cnWord(locale, "bzlMonthsHead")].join(" · "),
    lead,
    paragraphs: [lead, ...sections.flatMap((s) => s.paragraphs)],
    facts: [...pillarFacts(m, cnWord(locale, "bzPillarMonth"), locale, prefs), ...m.meets.map((mm) => meetingFact(mm, locale, prefs)), { label: cnWord(locale, "bzlYearHead", { year: x.year.year }), value: chineseLabel(SIXTY[x.year.pillar.cycle]!, locale, prefs).text, ref: FLOW_YEAR_REF }],
    sections,
    mark: name.hanzi ?? undefined,
    terms: [{ family: "pillar", id: SIXTY[m.pillar.cycle]!.id }],
    about: about(locale),
  };
}

function dayReading(x: LuckContext, locale: string, prefs: Shown): ElementReading | null {
  const d = x.day;
  if (!d) return null;
  const name = chineseLabel(SIXTY[d.pillar.cycle]!, locale, prefs);
  const lead = cnWord(locale, "bzlDayLead", { god: godName(d.god, locale, prefs), branchGod: godName(d.branchGod, locale, prefs) });
  const sections = [godTheme(d, locale, prefs), meetsSection(d.meets, locale, prefs)];
  return {
    id: FLOW_DAY_REF,
    kind: "sign",
    title: name.name,
    kicker: cnWord(locale, "bzlToday"),
    lead,
    paragraphs: [lead, ...sections.flatMap((s) => s.paragraphs)],
    facts: [...pillarFacts(d, cnWord(locale, "bzlToday"), locale, prefs), ...d.meets.map((m) => meetingFact(m, locale, prefs))],
    sections,
    mark: name.hanzi ?? undefined,
    terms: [{ family: "pillar", id: SIXTY[d.pillar.cycle]!.id }],
    about: about(locale),
  };
}

/** How the luck pillars are counted: the direction, the start, for each count given. */
function howReading(x: LuckContext, locale: string, prefs: Shown): ElementReading {
  const year = x.c.pillars.find((p) => p.id === "year")!;
  const month = x.c.pillars.find((p) => p.id === "month")!;
  const stem = STEMS[year.stem]!;
  const paragraphs: string[] = [];
  const facts: ReadingFact[] = [];
  for (const l of x.lucks) {
    paragraphs.push(
      cnWord(locale, l.direction === "forward" ? "bzlDirAgree" : "bzlDirDiffer", {
        stem: [chineseLabel(stem, locale, prefs).pinyin, chineseLabel(stem, locale, prefs).hanzi].filter(Boolean).join(" ") || chineseLabel(stem, locale, prefs).name,
        polarity: chineseLabel(POLARITY_NAMES[stem.polarity], locale, { ...prefs, show: "names" }).name.toLowerCase(),
        count: l.count,
        month: chineseLabel(SIXTY[month.pillar.cycle]!, locale, prefs).text,
      }),
      cnWord(locale, l.direction === "forward" ? "bzlStartNext" : "bzlStartLast", {
        date: dateIn(l.jieMs, locale, x.tz),
        days: new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 }).format(l.days),
        age: ageWords(l.start, locale),
      }),
    );
    const k = x.lucks.length > 1 ? ` · ${countWord(l.count, locale)}` : "";
    facts.push({ label: `${cnWord(locale, "bzlFromCol")}${k}`, value: `${ageWords(l.start, locale)} · ${dateIn(l.startMs, locale, x.tz)}`, ref: luckRef(l.count, 1) });
  }
  if (x.lucks.length > 1) paragraphs.push(cnWord(locale, "bzlBothNote"));
  const lead = cnWord(locale, "bzlHowLead");
  return {
    id: LUCK_HOW_REF,
    kind: "sign",
    title: cnWord(locale, "bzlTitle"),
    kicker: cnWord(locale, "bzBalHow"),
    lead,
    paragraphs: [lead, ...paragraphs],
    facts,
    sections: [{ id: "how", title: cnWord(locale, "bzBalHow"), paragraphs }],
    mark: "大運",
    about: about(locale),
  };
}

/** The Cycles page's reading of a selection; a cell of the chart is read by the board; nothing chosen reads the year. */
export function luckReading(x: LuckContext, ref: string | null, locale: string, prefs: Shown): ElementReading | null {
  if (!ref || ref === FLOW_YEAR_REF) return yearReading(x, locale, prefs);
  if (ref === LUCK_HOW_REF) return howReading(x, locale, prefs);
  if (ref === FLOW_DAY_REF) return dayReading(x, locale, prefs);
  const l = /^bz:luck:(yang|yin):(\d+)$/.exec(ref);
  if (l) {
    const luck = x.lucks.find((k) => k.count === l[1]);
    const p = luck?.pillars.find((q) => q.index === Number(l[2]));
    return luck && p ? luckPillarReading(x, luck, p, locale, prefs) : null;
  }
  const m = /^bz:flow-month:(\d+)$/.exec(ref);
  if (m) return monthReading(x, Number(m[1]), locale, prefs);
  return baziReading(x.c, ref, locale, prefs);
}
