/*
 * What Chinese astrology says in time and between two people (languages
 * plan, part 11): the year ahead and its months (the Cycles lens, at
 * /chinese-astrology/cycles), two people's animals (the Relationship lens,
 * at /chinese-astrology/pair), and a day of the Calendar with its animal.
 * Each reading says where its words come from, as the natal page's do.
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { ANIMALS, BRANCHES, SIXTY, type ChineseName } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { RELATION_NAMES } from "./relations";
import { animalOf, cnWord, theAnimal } from "./words";
import { PLACE_WORD } from "./zodiac-places";
import type { ZodiacChart, ZodiacPlaceId } from "./zodiac";
import { CLASH_DAY_TEXT, DAY_ANIMAL_TEXT, MONTH_TEXTS, PAIR_TEXTS_TWO, YEAR_TEXTS, said, type MeetText } from "./zodiac-texts";
import { dayAnimalOf, firstKind, meetKinds, type MeetKind, type PairMeeting, type YearAhead } from "./zodiac-time";

type Shown = Pick<ChinesePrefs, "script" | "show">;

/** The name of a way to meet: a relation's (沖 chōng, Clash), or the same animal (本命 běnmìng in time, 同 tóng for two people). */
const OWN: ChineseName = { hant: "本命", hans: "本命", pinyin: "běnmìng", en: "Own year", fr: "Année propre" };
const SAME: ChineseName = { hant: "同", hans: "同", pinyin: "tóng", en: "Same animal", fr: "Même animal" };

export function meetName(kind: MeetKind, inTime: boolean): ChineseName {
  if (kind === "same") return inTime ? OWN : SAME;
  return RELATION_NAMES[kind];
}

/** Kinds in a line: "Clash · chōng 沖, Punishment · xíng 刑", or "none". */
export function meetLine(kinds: readonly MeetKind[], locale: string, prefs: Shown, inTime: boolean): string {
  return kinds.length ? kinds.map((k) => chineseLabel(meetName(k, inTime), locale, prefs).text).join(", ") : cnWord(locale, "zkMeetNone");
}

/** A place of a person's in a line: "year (Horse)". */
function placeLine(id: ZodiacPlaceId, branch: number, locale: string): string {
  const a = ANIMALS[branch]!;
  return `${cnWord(locale, PLACE_WORD[id]).toLowerCase()} (${locale === "fr" ? a.fr : a.en})`;
}

/** A selection on the Cycles page: the year ("zky:year") or one of its months ("zky:month:3"). */
export const yearRef = "zky:year";
export const monthRef = (index: number): string => `zky:month:${index}`;

/** The months' names by their branch, the way the tradition says them: "the Tiger month". */
function monthTitle(branch: number, locale: string): string {
  const t = cnWord(locale, "zkNowMonth", { animal: animalOf(branch, locale) });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function dayFormat(locale: string, tz: string | undefined) {
  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: tz || "UTC", day: "numeric", month: "short", year: "numeric" });
  return (ms: number) => fmt.format(new Date(ms));
}

function aboutTime(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "zkAboutTimeTitle"), paragraphs: [cnWord(locale, "zkAboutTime1"), cnWord(locale, "zkAboutTime2")] };
}

/** The year ahead: the year's pillar and ruler, how your year animal meets it (the lead), and your other animals. */
function yearReading(z: ZodiacChart, y: YearAhead, locale: string, prefs: Shown, tz?: string): ElementReading {
  const pair = chineseLabel(SIXTY[y.pillar.cycle]!, locale, prefs);
  const day = dayFormat(locale, tz);
  const mine = y.yours.find((m) => m.place === "year")!;
  const kind = firstKind(mine.kinds);
  const lead = said(YEAR_TEXTS[(kind ?? "none") as MeetText], locale);
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "zkPillar"), value: pair.text },
    { label: cnWord(locale, "zkTaiSui"), value: chineseLabel(BRANCHES[y.pillar.branch]!, locale, prefs).text },
    { label: cnWord(locale, "zkYear"), value: `${day(y.fromMs)} – ${day(y.toMs)}` },
  ];
  for (const m of y.yours) facts.push({ label: placeLine(m.place, m.branch, locale), value: meetLine(m.kinds, locale, prefs, true) });
  const others = y.yours
    .filter((m) => m.place !== "year" && m.kinds.length)
    .map((m) => cnWord(locale, "zkYearOther", { place: placeLine(m.place, m.branch, locale), kinds: meetLine(m.kinds, locale, prefs, true).toLowerCase() }));
  const sections: NonNullable<ElementReading["sections"]> = [
    { id: "tradition", title: cnWord(locale, "zkTradition"), paragraphs: [cnWord(locale, "zkTaiSuiText", { theAnimal: theAnimal(y.pillar.branch, locale) })] },
  ];
  if (others.length) sections.unshift({ id: "others", title: cnWord(locale, "zkYearOthersTitle"), paragraphs: others });
  return {
    id: yearRef,
    kind: "sign",
    title: cnWord(locale, "zkYearTitle", { year: y.year, animal: pair.name }),
    kicker: [cnWord(locale, "zkYearsPage"), [pair.pinyin, pair.hanzi].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
    lead,
    paragraphs: [lead, ...sections.flatMap((s) => s.paragraphs)],
    facts,
    sections,
    mark: pair.hanzi ?? undefined,
    about: aboutTime(locale),
  };
}

/** A month of the year: its pillar, its dates, how your animals meet its animal. */
function monthReading(z: ZodiacChart, y: YearAhead, index: number, locale: string, prefs: Shown, tz?: string): ElementReading | null {
  const m = y.months[index];
  if (!m) return null;
  const pair = chineseLabel(SIXTY[m.pillar.cycle]!, locale, prefs);
  const day = dayFormat(locale, tz);
  const mine = m.yours.find((p) => p.place === "year")!;
  const lead = said(MONTH_TEXTS[(firstKind(mine.kinds) ?? "none") as MeetText], locale);
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "zkPillar"), value: pair.text },
    { label: cnWord(locale, "zkMonth"), value: `${day(m.fromMs)} – ${day(m.toMs)}` },
    ...m.yours.map((p) => ({ label: placeLine(p.place, p.branch, locale), value: meetLine(p.kinds, locale, prefs, true) })),
  ];
  return {
    id: monthRef(index),
    kind: "sign",
    title: monthTitle(m.pillar.branch, locale),
    kicker: [String(y.year), pair.name, [pair.pinyin, pair.hanzi].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
    lead,
    paragraphs: [lead],
    facts,
    mark: pair.hanzi ?? undefined,
    about: aboutTime(locale),
  };
}

/** The Cycles page's reading of a selection, or null when it is not the page's. */
export function yearsReading(z: ZodiacChart, y: YearAhead, ref: string | null, locale: string, prefs: Shown, tz?: string): ElementReading | null {
  if (ref === yearRef) return yearReading(z, y, locale, prefs, tz);
  const m = /^zky:month:(\d{1,2})$/.exec(ref ?? "");
  return m ? monthReading(z, y, Number(m[1]), locale, prefs, tz) : null;
}

// ── Two people ───────────────────────────────────────────────────────────────

/** A meeting between two people's animals on the Pair page ("zkp:m:year:day": A's year with B's day). */
export const meetingRef = (m: Pick<PairMeeting, "a" | "b">): string => `zkp:m:${m.a}:${m.b}`;

/** A meeting in a line: "Clash · your day (Pig) – B's day (Snake)". */
export function meetingLine(m: PairMeeting, names: { a: string; b: string }, locale: string, prefs: Shown): string {
  const kinds = m.kinds.map((k) => chineseLabel(meetName(k, false), locale, prefs).name).join(", ");
  return `${kinds} · ${names.a}, ${placeLine(m.a, m.branchA, locale)} – ${names.b}, ${placeLine(m.b, m.branchB, locale)}`;
}

/** What the tradition reads between two of two people's animals. */
export function pairMeetingReading(m: PairMeeting, za: ZodiacChart, zb: ZodiacChart, names: { a: string; b: string }, locale: string, prefs: Shown): ElementReading {
  const first = m.kinds[0]!;
  const name = chineseLabel(meetName(first, false), locale, prefs);
  const pa = za.places.find((p) => p.id === m.a)!;
  const pb = zb.places.find((p) => p.id === m.b)!;
  const facts: ReadingFact[] = [
    { label: `${names.a} · ${cnWord(locale, PLACE_WORD[m.a])}`, value: chineseLabel(SIXTY[pa.pillar.cycle]!, locale, prefs).text },
    { label: `${names.b} · ${cnWord(locale, PLACE_WORD[m.b])}`, value: chineseLabel(SIXTY[pb.pillar.cycle]!, locale, prefs).text },
  ];
  const texts = m.kinds.map((k) => said(PAIR_TEXTS_TWO[k as MeetText], locale));
  const which =
    m.a === "year" && m.b === "year" ? cnWord(locale, "zkPairYears") : m.a === "day" && m.b === "day" ? cnWord(locale, "zkPairDays") : null;
  const sections: NonNullable<ElementReading["sections"]> = [];
  if (texts.length > 1) sections.push({ id: "more", title: cnWord(locale, "zkTradition"), paragraphs: texts.slice(1) });
  if (which) sections.push({ id: "which", title: cnWord(locale, "zkPairWhich"), paragraphs: [which] });
  return {
    id: meetingRef(m),
    kind: "aspect",
    title: m.kinds.length > 1 ? m.kinds.map((k) => chineseLabel(meetName(k, false), locale, prefs).name).join(", ") : name.name,
    kicker: `${names.a}, ${placeLine(m.a, m.branchA, locale)} – ${names.b}, ${placeLine(m.b, m.branchB, locale)}`,
    lead: texts[0],
    paragraphs: [...texts, ...(which ? [which] : [])],
    facts,
    sections,
    mark: name.hanzi ?? undefined,
    about: { title: cnWord(locale, "zkAboutPairTitle"), paragraphs: [cnWord(locale, "zkAboutPair1"), cnWord(locale, "zkAboutTime2")] },
  };
}


// ── A day of the Calendar ────────────────────────────────────────────────────

/** A day of the Calendar with the Chinese layer on ("cnday:2026-10-09"). */
export const dayRef = (iso: string): string => `cnday:${iso}`;

/** The day's pillar and animal, the animal it clashes with, and how it meets your animals when a chart is open. */
export function dayAnimalReading(iso: string, z: ZodiacChart | null, locale: string, prefs: Shown, dateLine: string): ElementReading | null {
  const d = /^(-?\d{1,4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!d) return null;
  const da = dayAnimalOf(Number(d[1]), Number(d[2]), Number(d[3]));
  const pair = chineseLabel(SIXTY[da.pillar.cycle]!, locale, prefs);
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "zkPillar"), value: pair.text },
    { label: cnWord(locale, "zkDayClashes"), value: chineseLabel(BRANCHES[da.clashes]!, locale, prefs).text },
  ];
  const paragraphs = [said(DAY_ANIMAL_TEXT, locale)];
  if (z) {
    for (const p of z.places) facts.push({ label: placeLine(p.id, p.branch, locale), value: meetLine(meetKinds(p.branch, da.pillar.branch), locale, prefs, false) });
    const year = z.places.find((p) => p.id === "year")!;
    if (year.branch === da.clashes) paragraphs.unshift(said(CLASH_DAY_TEXT, locale));
  }
  return {
    id: dayRef(iso),
    kind: "sign",
    title: cnWord(locale, "zkDayTitle", { animal: animalOf(da.pillar.branch, locale) }),
    kicker: [dateLine, [pair.pinyin, pair.hanzi].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
    lead: paragraphs[0],
    paragraphs,
    facts,
    sections: paragraphs.length > 1 ? [{ id: "almanac", title: cnWord(locale, "zkTradition"), paragraphs: paragraphs.slice(1) }] : undefined,
    mark: pair.hanzi ?? undefined,
  };
}
