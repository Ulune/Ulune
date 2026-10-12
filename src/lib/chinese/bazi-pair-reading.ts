/*
 * What BaZi's Pair says (languages plan, part 19): the Day Masters, what
 * each is to the other among the Ten Gods and how their phases meet; the
 * partner palaces; each of B's pillars and what it meets among A's; what
 * each chart's phases bring the other. A cell of either chart is read by the
 * board's readings, named for its person.
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { BRANCHES, PHASES, SIXTY, STEMS } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord, type ChineseWordKey } from "./words";
import { tenGodById, type BaziChart, type BaziPlaceId, type GodFamily } from "./bazi";
import { INTERACTION_NAMES } from "./bazi-interactions";
import { PILLAR_WORD, baziReading, fmtShare } from "./bazi-reading";
import { meetingFact, meetingShort } from "./bazi-luck-reading";
import { pairLine } from "./bazi-readings-texts";
import { RELATION_NAMES } from "./relations";
import type { BaziPair, PairGift } from "./bazi-pair";
import { said } from "./zodiac-texts";

type Shown = Pick<ChinesePrefs, "script" | "show">;
export type PairNames = { a: string; b: string };

export const PAIR_DM_REF = "bzp:dm";
export const PAIR_PALACE_REF = "bzp:palace";
export const PAIR_GIFTS_REF = "bzp:gifts";
export const pairMeetRef = (from: BaziPlaceId): string => `bzp:meet:${from}`;
/** A cell of one person's chart: "bzp:a:bz:stem:day". */
export const pairCellRef = (person: "a" | "b", ref: string): string => `bzp:${person}:${ref}`;

const FAMILY_TEXT: Record<GodFamily, ChineseWordKey> = { peer: "bzpFamPeer", output: "bzpFamOutput", wealth: "bzpFamWealth", power: "bzpFamPower", resource: "bzpFamResource" };

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "bzAboutTitle"), paragraphs: [cnWord(locale, "bzAbout1"), cnWord(locale, "bzpAbout")] };
}

const godName = (id: Parameters<typeof tenGodById>[0], locale: string, prefs: Shown) => chineseLabel(tenGodById(id), locale, { ...prefs, show: "names" }).name;
const phaseName = (id: string, locale: string) => chineseLabel(PHASES.find((p) => p.id === id)!, locale, { script: "hant", show: "names" }).name;

/** The Day Masters' relation in a line: "To Camille, Sample B's Day Master is the Seven Killings; …". */
export function dmLine(p: BaziPair, names: PairNames, locale: string, prefs: Shown): string {
  return cnWord(locale, "bzpDmGods", { a: names.a, b: names.b, godAB: godName(p.dm.godAB, locale, prefs), godBA: godName(p.dm.godBA, locale, prefs) });
}

/** The partner palaces in a line. */
export function palaceLine(p: BaziPair, names: PairNames, locale: string, prefs: Shown): string {
  const br = (b: number) => chineseLabel(BRANCHES[b]!, locale, prefs).text;
  if (p.palace.same) return cnWord(locale, "bzpPalaceSame", { a: names.a, b: names.b, branch: br(p.palace.a) });
  if (!p.palace.kinds.length) return cnWord(locale, "bzpPalaceNone", { a: names.a, b: names.b, ba: br(p.palace.a), bb: br(p.palace.b) });
  const kinds = p.palace.kinds.map((k) => chineseLabel(RELATION_NAMES[k], locale, { ...prefs, show: "names" }).name.toLowerCase()).join(", ");
  return cnWord(locale, "bzpPalaceMeet", { a: names.a, b: names.b, ba: br(p.palace.a), bb: br(p.palace.b), kinds });
}

/** What one chart brings the other, a line per phase. */
export function giftLines(p: BaziPair, names: PairNames, locale: string): string[] {
  const line = (g: PairGift, from: string, to: string) =>
    cnWord(locale, g.why === "favoured" ? "bzpGiftFavoured" : "bzpGiftLacking", { from, to, phase: phaseName(g.phase, locale), pct: fmtShare(g.share, locale) });
  const lines = [...p.gifts.toA.map((g) => line(g, names.b, names.a)), ...p.gifts.toB.map((g) => line(g, names.a, names.b))];
  return lines.length ? lines : [cnWord(locale, "bzpGiftNone")];
}

function dmReading(p: BaziPair, names: PairNames, locale: string, prefs: Shown): ElementReading {
  const a = chineseLabel(STEMS[p.dm.a]!, locale, prefs);
  const b = chineseLabel(STEMS[p.dm.b]!, locale, prefs);
  const lead = dmLine(p, names, locale, prefs);
  const family = cnWord(locale, FAMILY_TEXT[p.dm.family], { a: names.a, b: names.b });
  const pairs: string[] = [];
  for (const kind of ["stem-combination", "stem-clash"] as const) {
    if ((kind === "stem-combination" && p.dm.combination) || (kind === "stem-clash" && p.dm.clash)) {
      const own = pairLine(kind, "stem", [p.dm.a, p.dm.b]);
      if (own) pairs.push(said(own, locale));
    }
  }
  return {
    id: PAIR_DM_REF,
    kind: "aspect",
    title: cnWord(locale, "bzpDmHead"),
    kicker: `${a.name} · ${b.name}`,
    lead,
    paragraphs: [lead, family, ...pairs],
    facts: [
      { label: names.a, value: a.text, ref: pairCellRef("a", "bz:stem:day") },
      { label: names.b, value: b.text, ref: pairCellRef("b", "bz:stem:day") },
      { label: `${names.b} → ${names.a}`, value: chineseLabel(tenGodById(p.dm.godAB), locale, prefs).text },
      { label: `${names.a} → ${names.b}`, value: chineseLabel(tenGodById(p.dm.godBA), locale, prefs).text },
    ],
    sections: [{ id: "bond", title: cnWord(locale, "bzpDmHead"), paragraphs: [family, ...pairs] }],
    mark: [a.hanzi, b.hanzi].filter(Boolean).join("") || undefined,
    about: about(locale),
  };
}

function palaceReading(p: BaziPair, names: PairNames, locale: string, prefs: Shown): ElementReading {
  const lead = cnWord(locale, "bzpPalaceLead");
  const line = palaceLine(p, names, locale, prefs);
  const pairs = p.palace.kinds
    .map((k) => pairLine(k === "harmony" ? "harmony" : k, "branch", [p.palace.a, p.palace.b], k === "harmony" ? (p.palace.phase ?? undefined) : undefined))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .map((x) => said(x, locale));
  return {
    id: PAIR_PALACE_REF,
    kind: "aspect",
    title: cnWord(locale, "bzpPalaceHead"),
    kicker: `${chineseLabel(BRANCHES[p.palace.a]!, locale, prefs).name} · ${chineseLabel(BRANCHES[p.palace.b]!, locale, prefs).name}`,
    lead,
    paragraphs: [lead, line, ...pairs],
    facts: [
      { label: names.a, value: chineseLabel(BRANCHES[p.palace.a]!, locale, prefs).text, ref: pairCellRef("a", "bz:branch:day") },
      { label: names.b, value: chineseLabel(BRANCHES[p.palace.b]!, locale, prefs).text, ref: pairCellRef("b", "bz:branch:day") },
      ...p.palace.kinds.map((k) => ({ label: chineseLabel(RELATION_NAMES[k], locale, prefs).name, value: `${names.a} · ${names.b}` })),
    ],
    sections: [{ id: "palace", title: cnWord(locale, "bzpPalaceHead"), paragraphs: [line, ...pairs] }],
    mark: "夫妻",
    about: about(locale),
  };
}

function giftsReading(p: BaziPair, names: PairNames, locale: string, prefs: Shown): ElementReading {
  const lead = cnWord(locale, "bzpGiftsLead");
  const lines = giftLines(p, names, locale);
  const facts: ReadingFact[] = PHASES.map((ph) => {
    const a = p.balance.a.phases.find((x) => x.phase === ph.id)!;
    const b = p.balance.b.phases.find((x) => x.phase === ph.id)!;
    return { label: chineseLabel(ph, locale, prefs).text, value: `${names.a} ${fmtShare(a.share, locale)} · ${names.b} ${fmtShare(b.share, locale)}` };
  });
  return {
    id: PAIR_GIFTS_REF,
    kind: "sign",
    title: cnWord(locale, "bzpPhasesHead"),
    kicker: `${names.a} · ${names.b}`,
    lead,
    paragraphs: [lead, ...lines],
    facts,
    sections: [{ id: "gifts", title: cnWord(locale, "bzpPhasesHead"), paragraphs: lines }],
    mark: "五行",
    about: about(locale),
  };
}

function meetReading(p: BaziPair, b: BaziChart, from: BaziPlaceId, names: PairNames, locale: string, prefs: Shown): ElementReading | null {
  const row = p.meetings.find((m) => m.from === from);
  const pillar = b.pillars.find((x) => x.id === from);
  if (!row || !pillar) return null;
  const pair = chineseLabel(SIXTY[pillar.pillar.cycle]!, locale, prefs);
  const pillarWord = cnWord(locale, PILLAR_WORD[from]).toLowerCase();
  const head = cnWord(locale, row.meets.length ? "bzpMeetLead" : "bzpMeetsNone", { a: names.a, b: names.b, pillar: pillarWord, pair: pair.text });
  const lines = row.meets.map((m) => {
    const own = pairLine(m.kind, m.level, m.items, m.phase);
    return `${meetingShort(m, locale, prefs)}${own ? `${locale === "fr" ? " : " : ": "}${said(own, locale)}` : ""}`;
  });
  const lead = head.replace(/^\p{Ll}/u, (x) => x.toUpperCase());
  return {
    id: pairMeetRef(from),
    kind: "aspect",
    title: cnWord(locale, "bzpMeetFrom", { b: names.b, pillar: cnWord(locale, PILLAR_WORD[from]).toLowerCase() }).replace(/^\p{Ll}/u, (x) => x.toUpperCase()),
    kicker: pair.text,
    lead,
    paragraphs: [lead, ...lines],
    facts: row.meets.map((m) => {
      const f = meetingFact(m, locale, prefs);
      return { ...f, label: `${f.label} · ${names.a}`, ref: f.ref ? pairCellRef("a", f.ref) : undefined };
    }),
    sections: lines.length ? [{ id: "meets", title: cnWord(locale, "bzpMeetHead"), paragraphs: lines }] : undefined,
    mark: pair.hanzi ?? undefined,
    about: about(locale),
  };
}

/** The Pair page's reading of a selection, or null. */
export function pairReading(p: BaziPair, a: BaziChart, b: BaziChart, ref: string | null, names: PairNames, locale: string, prefs: Shown): ElementReading | null {
  if (!ref) return null;
  if (ref === PAIR_DM_REF) return dmReading(p, names, locale, prefs);
  if (ref === PAIR_PALACE_REF) return palaceReading(p, names, locale, prefs);
  if (ref === PAIR_GIFTS_REF) return giftsReading(p, names, locale, prefs);
  const m = /^bzp:meet:(year|month|day|hour)$/.exec(ref);
  if (m) return meetReading(p, b, m[1] as BaziPlaceId, names, locale, prefs);
  const cell = /^bzp:(a|b):(bz:.+)$/.exec(ref);
  if (cell) {
    const who = cell[1] as "a" | "b";
    const r = baziReading(who === "a" ? a : b, cell[2]!, locale, prefs);
    return r ? { ...r, id: ref, kicker: `${names[who]} · ${r.kicker ?? ""}` } : null;
  }
  return null;
}

/** For the meetings' list: B's pillar and what it meets, in a line. */
export function meetRowLine(p: BaziPair, from: BaziPlaceId, names: PairNames, locale: string, prefs: Shown): string {
  const row = p.meetings.find((m) => m.from === from)!;
  return row.meets.map((m) => `${chineseLabel(INTERACTION_NAMES[m.kind], locale, { ...prefs, show: "names" }).name} · ${m.with.map((w) => (w === "luck" ? "" : cnWord(locale, PILLAR_WORD[w]))).join(", ")}`).join("; ") || cnWord(locale, "bzpMeetsNone", { a: names.a, b: names.b });
}
