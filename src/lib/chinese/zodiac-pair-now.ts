/*
 * "You two, now" on Chinese astrology's Relationship page (share and compare
 * plan, feature 5e): the year's animal, the Tai Sui (太歲), for both people,
 * from the year ahead of part 11 (zodiac-time.ts, yearAhead) completed for
 * two. How each person's animals meet the year's, the solar month we are in
 * with each one's year animal, and what the two together make of it: a year
 * that supports both, moves things for one of them, or for both. The words
 * are the year ahead's (zodiac-time-texts.ts) said for each person, and a
 * line for the two; suggestions, a year to know rather than a fate. Pure
 * arithmetic on the engine; nothing leaves the device.
 *
 *   zkp:now          the year for the two
 *   zkp:now:a        one person's year ahead (the Cycles page's reading)
 *   zkp:now:month    the solar month we are in, for both
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { BRANCHES, SIXTY } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { animalOf, cnWord, theAnimal } from "./words";
import { PLACE_WORD } from "./zodiac-places";
import type { ZodiacChart } from "./zodiac";
import { said, type Both } from "./both";
import { MONTH_TEXTS, YEAR_TEXTS, type MeetText } from "./zodiac-time-texts";
import { firstKind, meetKinds, yearAhead, yearAheadOf, type MeetKind, type MonthAhead, type YearAhead } from "./zodiac-time";
import { meetLine, yearRef, yearsReading } from "./zodiac-time-reading";

type Shown = Pick<ChinesePrefs, "script" | "show">;
export type NowPerson = "a" | "b";
export type NowNames = Record<NowPerson, string>;

export const ZKP_NOW = "zkp:now";
export const ZKP_NOW_MONTH = "zkp:now:month";
export const zkpNowRef = (who: NowPerson): string => `zkp:now:${who}`;

/** How a year (or month) meets a person's year animal, in four tones: it supports, it is quiet, it moves things (own year included). */
export type NowTone = "support" | "quiet" | "move";

export function toneOfKind(kind: MeetKind | null): NowTone {
  if (kind === "harmony" || kind === "trine") return "support";
  if (kind == null) return "quiet";
  return "move";
}

/** What the two together make of the year. */
export type Together = "same-animal" | "both-support" | "both-quiet" | "steady" | "one-moves" | "both-move";

export type ZodiacPairNow = {
  /** The solar year (by Lichun) and each person's year ahead in it. */
  year: number;
  ahead: Record<NowPerson, YearAhead>;
  /** How each person's year animal meets the year's, first in reading order (null: neither meets nor opposes). */
  kinds: Record<NowPerson, MeetKind | null>;
  /** The solar month we are in, and how it meets each person's year animal. */
  month: MonthAhead | null;
  monthKinds: Record<NowPerson, MeetKind[]>;
  together: Together;
  /** One person whose year supports and the other's is quiet (steady), or who moves while the other does not (one-moves). */
  lead: NowPerson | null;
};

/** Both people in the year (and the solar month) an instant is in. */
export function zodiacPairNow(za: ZodiacChart, zb: ZodiacChart, ms: number): ZodiacPairNow {
  const year = yearAheadOf(ms);
  const ahead = { a: yearAhead(za, year), b: yearAhead(zb, year) };
  const yearOf = (y: YearAhead) => y.yours.find((m) => m.place === "year")!;
  const kinds = { a: firstKind(yearOf(ahead.a).kinds), b: firstKind(yearOf(ahead.b).kinds) };
  const month = ahead.a.months.find((m) => ms >= m.fromMs && ms < m.toMs) ?? null;
  const monthKinds = {
    a: month ? meetKinds(za.places[0]!.branch, month.pillar.branch) : [],
    b: month ? meetKinds(zb.places[0]!.branch, month.pillar.branch) : [],
  };
  const ta = toneOfKind(kinds.a);
  const tb = toneOfKind(kinds.b);
  let together: Together;
  let lead: NowPerson | null = null;
  if (za.places[0]!.branch === zb.places[0]!.branch) together = "same-animal";
  else if (ta === tb) together = ta === "support" ? "both-support" : ta === "quiet" ? "both-quiet" : "both-move";
  else if (ta === "move" || tb === "move") {
    together = "one-moves";
    lead = ta === "move" ? "a" : "b";
  } else {
    together = "steady";
    lead = ta === "support" ? "a" : "b";
  }
  return { year, ahead, kinds, month, monthKinds, together, lead };
}

/** What the two make of the year, for Chinese astrology's tradition. */
export const TOGETHER_TEXTS: Readonly<Record<Together, Both>> = {
  "same-animal": [
    "You share your year animal, so this year meets you both the same way: one to read side by side, and to go through supporting each other.",
    "Vous partagez votre animal de l’année, si bien que cette année vous rencontre tous deux de la même façon\u202f: une année à lire côte à côte, et à traverser en vous soutenant.",
  ],
  "both-support": [
    "A year that supports you both: the tradition would call it a good one for the plans you make together.",
    "Une année qui vous soutient tous les deux\u202f: la tradition y verrait une bonne année pour les projets que vous faites ensemble.",
  ],
  "both-quiet": [
    "A quieter year for both of you, shaped by what you bring to it together.",
    "Une année plus calme pour vous deux, façonnée par ce que vous y apportez ensemble.",
  ],
  steady: [
    "A steady year for the two of you: {name} has the year’s wind behind them, something to lean on for your shared plans.",
    "Une année stable pour vous deux\u202f: {name} a le vent de l’année dans le dos, un appui pour vos projets communs.",
  ],
  "one-moves": [
    "The year moves things for {moved} more than for {steady}: the steadier of you can carry shared plans while the other’s year asks for room and change.",
    "L’année fait bouger les choses pour {moved} plus que pour {steady}\u202f: le plus stable des deux peut porter les projets communs pendant que l’année de l’autre demande de la place et du changement.",
  ],
  "both-move": [
    "A year that moves things for both of you: prepare changes together, patiently, leaving room for each other’s pace.",
    "Une année qui fait bouger les choses pour vous deux\u202f: préparez les changements ensemble, patiemment, en laissant de la place au rythme de chacun.",
  ],
};

/** The line for the two. */
export function togetherLine(now: ZodiacPairNow, names: NowNames, locale: string): string {
  const other: NowPerson = now.lead === "a" ? "b" : "a";
  const t = said(TOGETHER_TEXTS[now.together], locale);
  if (now.together === "steady" && now.lead) return t.replaceAll("{name}", names[now.lead]);
  if (now.together === "one-moves" && now.lead) return t.replaceAll("{moved}", names[now.lead]).replaceAll("{steady}", names[other]);
  return t;
}

/** "2026, Fire Horse". */
export function nowYearTitle(now: ZodiacPairNow, locale: string, prefs: Shown): string {
  return cnWord(locale, "zkYearTitle", { year: now.year, animal: chineseLabel(SIXTY[now.ahead.a.pillar.cycle]!, locale, prefs).name });
}

/** How one person's year animal meets the year's: "Own year · běnmìng 本命", or "none". */
export function nowKindLine(now: ZodiacPairNow, who: NowPerson, locale: string, prefs: Shown): string {
  const k = now.kinds[who];
  return meetLine(k ? [k] : [], locale, prefs, true);
}

/** One person's line: "Camille · Horse". */
export function nowPersonTitle(now: ZodiacPairNow, who: NowPerson, z: ZodiacChart, names: NowNames, locale: string, prefs: Shown): string {
  return `${names[who]} · ${chineseLabel(BRANCHES[z.places[0]!.branch]!, locale, prefs).name}`;
}

/** The month's line: "The Dog month: Camille, trine; Sample B, harmony". */
export function nowMonthLine(now: ZodiacPairNow, names: NowNames, locale: string, prefs: Shown): string {
  if (!now.month) return "";
  const title = cnWord(locale, "zkNowMonth", { animal: animalOf(now.month.pillar.branch, locale) });
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const semi = locale === "fr" ? "\u202f; " : "; ";
  const who = (["a", "b"] as const).map((p) => `${names[p]}, ${meetLine(now.monthKinds[p], locale, prefs, true).toLowerCase()}`).join(semi);
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}${colon}${who}`;
}

function dayFormat(locale: string, tz: string | undefined) {
  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: tz || "UTC", day: "numeric", month: "short", year: "numeric" });
  return (ms: number) => fmt.format(new Date(ms));
}

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "zkAboutTimeTitle"), paragraphs: [cnWord(locale, "zkAboutTime1"), cnWord(locale, "zkAboutTime2")] };
}

/**
 * "You two, now" on the Pair page: the year for the two, one person's year ahead (the Cycles page's
 * own reading, named for them), or the month for both; null for another id.
 */
export function zodiacPairNowReading(
  now: ZodiacPairNow,
  z: Record<NowPerson, ZodiacChart>,
  names: NowNames,
  ref: string | null,
  locale: string,
  prefs: Shown,
  /** The part's heading in the reader's language ("You two, now"). */
  head: string,
  tz?: Partial<Record<NowPerson, string>>,
): ElementReading | null {
  if (!ref?.startsWith(ZKP_NOW)) return null;
  const who = /^zkp:now:(a|b)$/.exec(ref)?.[1] as NowPerson | undefined;
  if (who) {
    const r = yearsReading(z[who], now.ahead[who], yearRef, locale, prefs, tz?.[who]);
    return r ? { ...r, id: ref, kicker: `${names[who]} · ${head} · ${r.kicker}` } : null;
  }
  const day = dayFormat(locale, tz?.a);
  const pillar = chineseLabel(SIXTY[now.ahead.a.pillar.cycle]!, locale, prefs);
  const placeLine = (p: NowPerson) => `${names[p]} · ${cnWord(locale, PLACE_WORD.year).toLowerCase()} (${animalOf(z[p].places[0]!.branch, locale).replace(/^(du|de la) /, "")})`;
  if (ref === ZKP_NOW_MONTH) {
    const m = now.month;
    if (!m) return null;
    const mp = chineseLabel(SIXTY[m.pillar.cycle]!, locale, prefs);
    const lines = (["a", "b"] as const).map((p) => `${names[p]}${locale === "fr" ? "\u202f: " : ": "}${said(MONTH_TEXTS[(firstKind(now.monthKinds[p]) ?? "none") as MeetText], locale)}`);
    const facts: ReadingFact[] = [
      { label: cnWord(locale, "zkPillar"), value: mp.text },
      { label: cnWord(locale, "zkMonth"), value: `${day(m.fromMs)} – ${day(m.toMs)}` },
      ...(["a", "b"] as const).map((p) => ({ label: placeLine(p), value: meetLine(now.monthKinds[p], locale, prefs, true) })),
    ];
    const title = cnWord(locale, "zkNowMonth", { animal: animalOf(m.pillar.branch, locale) });
    return {
      id: ref,
      kind: "sign",
      title: `${title.charAt(0).toUpperCase()}${title.slice(1)}`,
      kicker: [head, String(now.year), mp.name].join(" · "),
      lead: lines[0],
      paragraphs: lines,
      facts,
      mark: mp.hanzi ?? undefined,
      about: about(locale),
    };
  }
  const together = togetherLine(now, names, locale);
  const each = (["a", "b"] as const).map((p) => `${names[p]}${locale === "fr" ? "\u202f: " : ": "}${said(YEAR_TEXTS[(now.kinds[p] ?? "none") as MeetText], locale)}`);
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "zkPillar"), value: pillar.text },
    { label: cnWord(locale, "zkTaiSui"), value: chineseLabel(BRANCHES[now.ahead.a.pillar.branch]!, locale, prefs).text },
    { label: cnWord(locale, "zkYear"), value: `${day(now.ahead.a.fromMs)} – ${day(now.ahead.a.toMs)}` },
    ...(["a", "b"] as const).map((p) => ({ label: placeLine(p), value: nowKindLine(now, p, locale, prefs), ref: zkpNowRef(p) })),
    ...(now.month ? [{ label: cnWord(locale, "zkMonth"), value: nowMonthLine(now, names, locale, prefs), ref: ZKP_NOW_MONTH }] : []),
  ];
  return {
    id: ZKP_NOW,
    kind: "sign",
    title: nowYearTitle(now, locale, prefs),
    kicker: [head, [pillar.pinyin, pillar.hanzi].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
    lead: together,
    paragraphs: [together, ...each, cnWord(locale, "zkTaiSuiText", { theAnimal: theAnimal(now.ahead.a.pillar.branch, locale) })],
    facts,
    sections: [
      { id: "each", title: cnWord(locale, "zkYearYours"), paragraphs: each },
      { id: "tradition", title: cnWord(locale, "zkTradition"), paragraphs: [cnWord(locale, "zkTaiSuiText", { theAnimal: theAnimal(now.ahead.a.pillar.branch, locale) })] },
    ],
    links: {
      title: head,
      rows: [
        ...(["a", "b"] as const).map((p) => ({ ref: zkpNowRef(p), label: names[p], detail: nowKindLine(now, p, locale, prefs) })),
        ...(now.month ? [{ ref: ZKP_NOW_MONTH, label: cnWord(locale, "zkMonth"), detail: nowMonthLine(now, names, locale, prefs) }] : []),
      ],
    },
    mark: pillar.hanzi ?? undefined,
    about: about(locale),
  };
}
