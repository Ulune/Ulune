/*
 * What Feng Shui's personal page says (languages plan, part 21): the Kua
 * number with the working that gives it, each of the eight directions with
 * its mansion and its trigram, and the practical lines (where to face, sleep
 * and come in, what suits storage), always suggestions with their reasons.
 * One reading per count shown: both, when the birth has no yin or yang count.
 *
 *   fs:yang:kua           the Kua, its trigram, its group, how it is counted
 *   fs:yang:dir:ne        a direction and its mansion
 *   fs:yang:practice      the practical lines
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { DIRECTION_IDS, MANSIONS, MANSION_IDS, directionById, trigramOfDirection, type DirectionId, type FengShui, type FsCount, type MansionId } from "./fengshui";
import { GROUP_TEXTS, MANSION_TEXTS, TRIGRAM_TEXTS } from "./fengshui-texts";
import { said } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;

export const fsKuaRef = (count: FsCount): string => `fs:${count}:kua`;
export const fsDirRef = (count: FsCount, d: DirectionId): string => `fs:${count}:dir:${d}`;
export const fsPracticeRef = (count: FsCount): string => `fs:${count}:practice`;

const cap = (s: string) => s.replace(/^\p{Ll}/u, (x) => x.toUpperCase());

/**
 * A direction in a sentence: "north-east", "the north-east", "of the
 * north-east", "in the north-east" in English; "au nord-est" / "à l’est",
 * "le nord-est" / "l’est", "du nord-est" / "de l’est", "au nord-est" in French.
 */
export function dirIn(d: DirectionId, locale: string, form: "to" | "the" | "of" | "in"): string {
  const dir = directionById(d);
  const own = (locale === "fr" ? dir.fr : dir.en).toLowerCase();
  if (locale !== "fr") return form === "to" ? own : form === "the" ? `the ${own}` : form === "of" ? `of the ${own}` : `in the ${own}`;
  const vowel = d === "e" || d === "w";
  if (form === "to" || form === "in") return vowel ? `à l’${own}` : `au ${own}`;
  if (form === "of") return vowel ? `de l’${own}` : `du ${own}`;
  return vowel ? `l’${own}` : `le ${own}`;
}

/** "de Croissance", "d’Harmonie": a mansion's name after "direction" in French. */
export const deName = (name: string) => (/^[AEIOUYÉÈÊH]/i.test(name) ? `d’${name}` : `de ${name}`);

export const countLabel = (count: FsCount, locale: string): string => cnWord(locale, count === "yang" ? "bzlCountYang" : "bzlCountYin");
export const groupLabel = (fs: FengShui, locale: string): string => cnWord(locale, fs.group === "east" ? "fsGroupEast" : "fsGroupWest");
export const mansionName = (m: MansionId, locale: string): string => (locale === "fr" ? MANSIONS[m].fr : MANSIONS[m].en);
export const directionName = (d: DirectionId, locale: string): string => (locale === "fr" ? directionById(d).fr : directionById(d).en);

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "fsAboutTitle"), paragraphs: [cnWord(locale, "fsAbout1"), cnWord(locale, "fsAbout2")] };
}

/** The working of the Kua: the year, its digits, the count's sum, the reduction and the rule for 5. */
export function kuaSteps(fs: FengShui, locale: string): string[] {
  const { root, raw, five } = fs.steps;
  const lines = [
    cnWord(locale, "fsHowYear", { year: fs.solarYear }),
    cnWord(locale, "fsHowDigits", { year: fs.solarYear, d: root }),
    cnWord(locale, fs.count === "yang" ? "fsHowYang" : "fsHowYin", { d: root, raw }),
  ];
  const reduced = raw > 9 ? raw - 9 : raw;
  if (raw > 9) lines.push(cnWord(locale, "fsHowReduce", { raw, n: reduced }));
  if (five) lines.push(cnWord(locale, "fsHowFive"));
  if (fs.uncertain) lines.push(cnWord(locale, "fsUncertain"));
  return lines;
}

/** "Your Kua number is 1: the trigram Kan ☵." */
export const kuaLine = (fs: FengShui, locale: string, prefs: Shown): string =>
  cnWord(locale, "fsKuaIs", { n: fs.kua, trigram: chineseLabel(fs.trigram, locale, prefs).text, symbol: fs.trigram.symbol });

function kuaReading(fs: FengShui, both: boolean, locale: string, prefs: Shown): ElementReading {
  const t = chineseLabel(fs.trigram, locale, prefs);
  const lead = kuaLine(fs, locale, prefs);
  const trigram = said(TRIGRAM_TEXTS[fs.trigram.id], locale);
  const group = said(GROUP_TEXTS[fs.group], locale);
  const how = kuaSteps(fs, locale);
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "fsKuaHead"), value: String(fs.kua) },
    { label: cnWord(locale, "fsTrigram"), value: `${fs.trigram.symbol} ${t.text}` },
    { label: cnWord(locale, "fsGroup"), value: groupLabel(fs, locale) },
    { label: cnWord(locale, "fsSolarYear"), value: String(fs.solarYear) },
  ];
  if (both) facts.push({ label: cnWord(locale, "bzlCountCol"), value: countLabel(fs.count, locale) });
  return {
    id: fsKuaRef(fs.count),
    kind: "sign",
    title: cnWord(locale, "fsKuaN", { n: fs.kua }),
    kicker: [t.name, groupLabel(fs, locale), both ? countLabel(fs.count, locale) : null].filter(Boolean).join(" · "),
    lead,
    paragraphs: [lead, trigram, group, ...how],
    facts,
    sections: [
      { id: "trigram", title: cnWord(locale, "fsTrigram"), paragraphs: [trigram] },
      { id: "group", title: cnWord(locale, "fsGroup"), paragraphs: [group] },
      // The working first (the digits, the count's sum, the reduction, the rule for 5), so the short reading shows it; then the year's turn.
      { id: "how", title: cnWord(locale, "fsHowHead"), paragraphs: [how.slice(1, fs.uncertain ? -1 : undefined).join(" "), how[0]!, ...(fs.uncertain ? [how.at(-1)!] : [])] },
    ],
    links: {
      title: cnWord(locale, "fsRose"),
      rows: MANSION_IDS.map((m) => ({ ref: fsDirRef(fs.count, fs.of[m]), label: mansionName(m, locale), detail: directionName(fs.of[m], locale) })),
    },
    mark: (prefs.show === "full" ? fs.trigram[prefs.script] : null) ?? fs.trigram.symbol,
    about: about(locale),
  };
}

/** A direction's opening line: "The north-east is your Growth direction, one of your four supportive ones." */
export function dirLine(fs: FengShui, d: DirectionId, locale: string): string {
  const row = fs.directions.find((x) => x.direction === d)!;
  const name = mansionName(row.mansion, locale);
  return cnWord(locale, row.supportive ? "fsDirGood" : "fsDirBad", { dir: cap(dirIn(d, locale, "the")), mansion: name, deMansion: deName(name) });
}

function dirReading(fs: FengShui, d: DirectionId, both: boolean, locale: string, prefs: Shown): ElementReading {
  const row = fs.directions.find((x) => x.direction === d)!;
  const m = MANSIONS[row.mansion];
  const ml = chineseLabel(m, locale, prefs);
  const dl = chineseLabel(directionById(d), locale, prefs);
  const tri = trigramOfDirection(d);
  const tl = chineseLabel(tri, locale, prefs);
  const lead = dirLine(fs, d, locale);
  const use = said(MANSION_TEXTS[row.mansion], locale);
  const trigram = [
    cnWord(locale, "fsDirTrigram", { dir: dirIn(d, locale, "the"), trigram: tl.name, symbol: tri.symbol, image: locale === "fr" ? tri.image.fr : tri.image.en }),
    ...(row.mansion === "fu-wei" ? [cnWord(locale, "fsDirOwn")] : []),
  ];
  const kind = cnWord(locale, row.supportive ? "fsSupportive" : "fsChallenging");
  return {
    id: fsDirRef(fs.count, d),
    kind: "house",
    title: ml.name,
    kicker: [dl.name, kind, both ? countLabel(fs.count, locale) : null].filter(Boolean).join(" · "),
    lead,
    paragraphs: [lead, use, ...trigram],
    facts: [
      { label: cnWord(locale, "fsDirection"), value: dl.text },
      { label: cnWord(locale, "fsMansion"), value: ml.text },
      { label: cnWord(locale, "fsKind"), value: kind },
      { label: cnWord(locale, "fsTrigram"), value: `${tri.symbol} ${tl.text}` },
      { label: cnWord(locale, "fsKuaHead"), value: cnWord(locale, "fsKuaN", { n: fs.kua }), ref: fsKuaRef(fs.count) },
    ],
    sections: [
      { id: "use", title: cnWord(locale, "fsUseHead"), paragraphs: [use] },
      { id: "trigram", title: cnWord(locale, "fsTrigramHead"), paragraphs: trigram },
    ],
    mark: (prefs.show === "full" ? m[prefs.script] : null) ?? directionById(d).short[locale === "fr" ? "fr" : "en"],
    about: about(locale),
  };
}

/** The practical lines, in order: the desk, the bed, the door, what suits storage. */
export function practiceLines(fs: FengShui, locale: string): { id: "desk" | "bed" | "door" | "avoid"; text: string }[] {
  const to = (m: MansionId) => dirIn(fs.of[m], locale, "to");
  const the = (m: MansionId) => dirIn(fs.of[m], locale, "the");
  return [
    { id: "desk", text: cnWord(locale, "fsDesk", { sqTo: to("sheng-qi"), fwTo: to("fu-wei") }) },
    { id: "bed", text: cnWord(locale, "fsBed", { tyThe: the("tian-yi"), ynThe: the("yan-nian") }) },
    { id: "door", text: cnWord(locale, "fsDoor", { sqTo: to("sheng-qi"), tyTo: to("tian-yi") }) },
    { id: "avoid", text: cnWord(locale, "fsAvoid", { jmTo: to("jue-ming"), hhThe: the("huo-hai") }) },
  ];
}

const PRACTICE_HEAD = { desk: "fsDeskHead", bed: "fsBedHead", door: "fsDoorHead", avoid: "fsAvoidHead" } as const;

function practiceReading(fs: FengShui, both: boolean, locale: string): ElementReading {
  const lead = cnWord(locale, "fsPracticeLead");
  const lines = practiceLines(fs, locale);
  const note = cnWord(locale, "fsPracticeNote");
  return {
    id: fsPracticeRef(fs.count),
    kind: "house",
    title: cnWord(locale, "fsPracticeHead"),
    kicker: [cnWord(locale, "fsKuaN", { n: fs.kua }), both ? countLabel(fs.count, locale) : null].filter(Boolean).join(" · "),
    lead,
    paragraphs: [lead, ...lines.map((l) => l.text), note],
    facts: (["sheng-qi", "tian-yi", "yan-nian", "fu-wei", "jue-ming"] as const).map((m) => ({
      label: mansionName(m, locale),
      value: directionName(fs.of[m], locale),
      ref: fsDirRef(fs.count, fs.of[m]),
    })),
    sections: [...lines.map((l) => ({ id: l.id, title: cnWord(locale, PRACTICE_HEAD[l.id]), paragraphs: [l.text] })), { id: "note", title: cnWord(locale, "fsNoteHead"), paragraphs: [note] }],
    mark: "八宅",
    about: about(locale),
  };
}

/** The page's reading of a selection, or null (nothing chosen, or a ref of another page). */
export function fengShuiReading(list: readonly FengShui[], ref: string | null, locale: string, prefs: Shown): ElementReading | null {
  if (!ref) return null;
  const m = /^fs:(yang|yin):(kua|practice|dir:(n|ne|e|se|s|sw|w|nw))$/.exec(ref);
  if (!m) return null;
  const fs = list.find((x) => x.count === m[1]);
  if (!fs) return null;
  const both = list.length > 1;
  if (m[2] === "kua") return kuaReading(fs, both, locale, prefs);
  if (m[2] === "practice") return practiceReading(fs, both, locale);
  return dirReading(fs, m[3] as DirectionId, both, locale, prefs);
}

/** Every ref the page can open, for the tests. */
export const fengShuiRefs = (count: FsCount): string[] => [fsKuaRef(count), fsPracticeRef(count), ...DIRECTION_IDS.map((d) => fsDirRef(count, d))];
