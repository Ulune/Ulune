/*
 * What BaZi's Pair says (languages plan, part 19): the Day Masters, what
 * each is to the other among the Ten Gods and how their phases meet; the
 * partner palaces; each of B's pillars and what it meets among A's; what
 * each chart's phases bring the other. A cell of either chart is read by the
 * board's readings, named for its person, its links kept on that person's
 * chart. Part 20 (the review's BZ9) adds the luck pillars of the moment:
 * each person's decade, its stem's god for the other's Day Master, and how
 * the two decades meet; each decade opens its own reading, as the Cycles
 * page writes it.
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { BRANCHES, PHASES, SIXTY, STEMS, type ChineseName } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord, type ChineseWordKey } from "./words";
import { tenGodById, type BaziChart, type BaziPlaceId, type GodFamily, type TenGodId } from "./bazi";
import { INTERACTION_NAMES, interactionTone } from "./bazi-interactions";
import { PILLAR_WORD, baziReading, fmtShare } from "./bazi-reading";
import { LUCK_HOW_REF, ageWords, countWord, luckReading, luckRef, meetingFact, meetingShort } from "./bazi-luck-reading";
import { flowYear, flowYearOf } from "./bazi-luck";
import { pairLine } from "./bazi-readings-texts";
import { RELATION_NAMES } from "./relations";
import type { BaziPair, PairDecade, PairGift } from "./bazi-pair";
import { deFr, said, semicolon } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;
export type PairNames = { a: string; b: string };
type Person = "a" | "b";

export const PAIR_DM_REF = "bzp:dm";
export const PAIR_PALACE_REF = "bzp:palace";
export const PAIR_GIFTS_REF = "bzp:gifts";
/** Part 20: the luck pillars of the moment, and how they meet. */
export const PAIR_LUCK_REF = "bzp:luck";
export const pairMeetRef = (from: BaziPlaceId): string => `bzp:meet:${from}`;
/** A cell of one person's chart: "bzp:a:bz:stem:day"; one of their luck pillars: "bzp:b:bz:luck:yin:4". */
export const pairCellRef = (person: Person, ref: string): string => `bzp:${person}:${ref}`;

const FAMILY_TEXT: Record<GodFamily, ChineseWordKey> = { peer: "bzpFamPeer", output: "bzpFamOutput", wealth: "bzpFamWealth", power: "bzpFamPower", resource: "bzpFamResource" };
/** What one person's decade is to the other's Day Master, by the family of its stem's god (part 20). */
const LUCK_FAMILY_TEXT: Record<GodFamily, ChineseWordKey> = {
  peer: "bzpLuckFamPeer",
  output: "bzpLuckFamOutput",
  wealth: "bzpLuckFamWealth",
  power: "bzpLuckFamPower",
  resource: "bzpLuckFamResource",
};

/**
 * Each god's article in French, for the sentences that say what one person
 * is to the other: « représente les Sept Tueurs », « l’Officier direct »
 * (part 20; « le dieu Dieu nourricier » read badly).
 */
const FR_ARTICLE: Record<TenGodId, "le" | "la" | "l’" | "les"> = {
  companion: "le",
  "rob-wealth": "le",
  "eating-god": "le",
  "hurting-officer": "l’",
  "indirect-wealth": "la",
  "direct-wealth": "la",
  "seven-killings": "les",
  "direct-officer": "l’",
  "indirect-resource": "la",
  "direct-resource": "la",
};

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "bzAboutTitle"), paragraphs: [cnWord(locale, "bzAbout1"), cnWord(locale, "bzpAbout")] };
}

const godName = (id: TenGodId, locale: string, prefs: Shown) => chineseLabel(tenGodById(id), locale, { ...prefs, show: "names" }).name;
/** A god's name with its French article: « la Richesse indirecte »; English sentences write "the" themselves. */
const leGod = (id: TenGodId, locale: string, prefs: Shown) => {
  const name = godName(id, locale, prefs);
  const art = FR_ARTICLE[id];
  return art === "l’" ? `l’${name}` : `${art} ${name}`;
};
const phaseName = (id: string, locale: string) => chineseLabel(PHASES.find((p) => p.id === id)!, locale, { script: "hant", show: "names" }).name;
/** A stem as the sentences name it: "xīn 辛", or its name alone. */
const stemShort = (s: ChineseName, locale: string, prefs: Shown) => {
  const l = chineseLabel(s, locale, prefs);
  return prefs.show === "names" ? l.name : [l.pinyin, l.hanzi].filter(Boolean).join(" ");
};

/** The two names as the sentences take them: {a} and {b}, and French's {deA} and {deB}. */
const nameVars = (names: PairNames) => ({ a: names.a, b: names.b, deA: deFr(names.a), deB: deFr(names.b) });

/** A row naming one of B's pillars: "Sample B’s year", « Année de Sample B »; French opens on the pillar's word, which takes the capital. */
export function meetFromLabel(names: PairNames, place: BaziPlaceId, locale: string, word: Readonly<Record<BaziPlaceId, ChineseWordKey>> = PILLAR_WORD): string {
  const s = cnWord(locale, "bzpMeetFrom", { ...nameVars(names), pillar: cnWord(locale, word[place]).toLowerCase() });
  return locale === "fr" ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** The Day Masters' relation in a line: "To Camille, Sample B's Day Master is the Seven Killings; …". */
export function dmLine(p: BaziPair, names: PairNames, locale: string, prefs: Shown): string {
  return cnWord(locale, "bzpDmGods", {
    ...nameVars(names),
    godAB: godName(p.dm.godAB, locale, prefs),
    godBA: godName(p.dm.godBA, locale, prefs),
    leGodAB: leGod(p.dm.godAB, locale, prefs),
    leGodBA: leGod(p.dm.godBA, locale, prefs),
  });
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
  const line = (g: PairGift, from: string, to: string) => {
    const phase = phaseName(g.phase, locale);
    return cnWord(locale, g.why === "favoured" ? "bzpGiftFavoured" : "bzpGiftLacking", { from, to, deTo: deFr(to), phase, dePhase: deFr(phase), pct: fmtShare(g.share, locale) });
  };
  const lines = [...p.gifts.toA.map((g) => line(g, names.b, names.a)), ...p.gifts.toB.map((g) => line(g, names.a, names.b))];
  return lines.length ? lines : [cnWord(locale, "bzpGiftNone")];
}

// ── The luck pillars of the moment (part 20) ─────────────────────────────────

const pillarName = (cycle: number, locale: string, prefs: Shown) => chineseLabel(SIXTY[cycle]!, locale, { ...prefs, show: "names" }).name;
const agesOf = (d: PairDecade, locale: string) => cnWord(locale, "bzlAges", { from: Math.floor(d.pillar!.fromAge), to: Math.floor(d.pillar!.toAge) });
const otherOf = (who: Person): Person => (who === "a" ? "b" : "a");
/** What a person's decade opens: its own reading, or how theirs are counted before the first. */
const decadeRef = (who: Person, d: PairDecade) => pairCellRef(who, d.pillar ? luckRef(d.count, d.pillar.index) : LUCK_HOW_REF);
/** The god a person's decade is to the other, in the words the sentences take. */
const godVars = (d: PairDecade, locale: string, prefs: Shown) => ({ god: godName(d.godForOther!, locale, prefs), leGod: leGod(d.godForOther!, locale, prefs) });

/** How the two decades meet: a line per pair of decades that meet or are the same, with their pairs' own lines; one line when none does. */
function luckMeets(p: BaziPair, names: PairNames, locale: string, prefs: Shown): { id: string; text: string; own: string[] }[] {
  const L = p.luck;
  if (!L) return [];
  const out: { id: string; text: string; own: string[] }[] = [];
  for (const m of L.meets) {
    const da = L.a.find((x) => x.count === m.a)!;
    const db = L.b.find((x) => x.count === m.b)!;
    const pa = pillarName(da.pillar!.pillar.cycle, locale, prefs);
    const pb = pillarName(db.pillar!.pillar.cycle, locale, prefs);
    const own = m.meets
      .map((x) => pairLine(x.kind, x.level, x.items, x.phase))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .map((x) => said(x, locale));
    const id = `meet-${m.a}-${m.b}`;
    if (m.same) out.push({ id, text: cnWord(locale, "bzpLuckSame", { a: names.a, b: names.b, pillar: pa }), own });
    else if (m.meets.length) {
      const kinds = [...new Set(m.meets.map((x) => chineseLabel(INTERACTION_NAMES[x.kind], locale, { ...prefs, show: "names" }).name.toLowerCase()))].join(", ");
      out.push({ id, text: cnWord(locale, "bzpLuckMeet", { a: names.a, b: names.b, pa, pb, kinds }), own });
    }
  }
  if (!out.length && L.meets.length) out.push({ id: "meet-none", text: cnWord(locale, "bzpLuckNone"), own: [] });
  return out;
}

/** A line of the luck pillars of the moment, and the reading it opens. */
export type PairLuckLine = { id: string; ref: string; text: string };

/** The luck pillars of the moment in sentences (the side panel, Copy): each person's decade by each count and what it is to the other, then how the decades meet. */
export function luckLines(p: BaziPair, names: PairNames, locale: string, prefs: Shown): PairLuckLine[] {
  const L = p.luck;
  if (!L) return [];
  const out: PairLuckLine[] = [];
  for (const who of ["a", "b"] as const) {
    for (const d of L[who]) {
      const count = d.given ? "" : `, ${countWord(d.count, locale).toLowerCase()}`;
      out.push({
        id: `${who}-${d.count}`,
        ref: decadeRef(who, d),
        text: d.pillar
          ? cnWord(locale, "bzpLuckLine", { name: names[who], count, pillar: pillarName(d.pillar.pillar.cycle, locale, prefs), ages: agesOf(d, locale), other: names[otherOf(who)], ...godVars(d, locale, prefs) })
          : cnWord(locale, "bzpLuckBefore", { name: names[who], count, age: ageWords(d.start, locale) }),
      });
    }
  }
  return [...out, ...luckMeets(p, names, locale, prefs).map(({ id, text }) => ({ id, ref: PAIR_LUCK_REF, text }))];
}

/** A row of the page's list of luck pillars: who (and by which count), what, and the reading it opens. */
export type PairLuckRow = { id: string; ref: string; kind: string; sub: string; tone?: "meet" | "tension" };

/** The page's rows: one per person and count, then how the decades meet when both have begun. */
export function luckRows(p: BaziPair, names: PairNames, locale: string, prefs: Shown): PairLuckRow[] {
  const L = p.luck;
  if (!L) return [];
  const rows: PairLuckRow[] = [];
  for (const who of ["a", "b"] as const) {
    for (const d of L[who]) {
      rows.push({
        id: `${who}-${d.count}`,
        ref: decadeRef(who, d),
        kind: d.given ? names[who] : `${names[who]} · ${countWord(d.count, locale)}`,
        sub: d.pillar
          ? cnWord(locale, "bzpLuckRow", { pillar: chineseLabel(SIXTY[d.pillar.pillar.cycle]!, locale, prefs).text, ages: agesOf(d, locale), other: names[otherOf(who)], ...godVars(d, locale, prefs) })
          : cnWord(locale, "bzpLuckRowBefore", { age: ageWords(d.start, locale) }),
      });
    }
  }
  const meets = luckMeets(p, names, locale, prefs);
  if (meets.length) {
    const all = L.meets.flatMap((m) => m.meets);
    rows.push({
      id: "meets",
      ref: PAIR_LUCK_REF,
      kind: cnWord(locale, "bzpLuckMeetHead"),
      sub: meets.map((m) => m.text).join(" "),
      tone: all.some((x) => interactionTone(x.kind) === "tension") ? "tension" : all.length || L.meets.some((m) => m.same) ? "meet" : undefined,
    });
  }
  return rows;
}

/** The luck pillars of the moment: each decade and what it brings its person, what its stem is to the other's Day Master; how the two meet. */
function luckPairReading(p: BaziPair, names: PairNames, locale: string, prefs: Shown): ElementReading | null {
  const L = p.luck;
  if (!L) return null;
  const lead = cnWord(locale, "bzpLuckLead");
  const sections: NonNullable<ElementReading["sections"]> = [];
  const facts: ReadingFact[] = [];
  for (const who of ["a", "b"] as const) {
    const other = otherOf(who);
    const paragraphs: string[] = [];
    for (const d of L[who]) {
      const vars = { name: names[who], deName: deFr(names[who]), count: d.given ? "" : cnWord(locale, "bzpLuckByCount", { count: countWord(d.count, locale).toLowerCase() }) };
      const label = d.given ? names[who] : `${names[who]} · ${countWord(d.count, locale)}`;
      if (!d.pillar) {
        paragraphs.push(cnWord(locale, "bzpLuckIsBefore", { ...vars, age: ageWords(d.start, locale) }));
        facts.push({ label, value: cnWord(locale, "bzlBeforeLuck"), ref: decadeRef(who, d) });
        continue;
      }
      const pillar = chineseLabel(SIXTY[d.pillar.pillar.cycle]!, locale, prefs);
      const ages = agesOf(d, locale);
      // What the decade brings its own person, in a clause; its full text is its own reading's, a tap away (and written to "you").
      paragraphs.push(cnWord(locale, "bzpLuckIs", { ...vars, pillar: pillar.text, ages, ownGod: godName(d.pillar.god, locale, prefs), leOwnGod: leGod(d.pillar.god, locale, prefs) }));
      paragraphs.push(
        [
          cnWord(locale, "bzpLuckGod", {
            stem: stemShort(STEMS[d.pillar.stem]!, locale, prefs),
            dm: stemShort(STEMS[p.dm[other]]!, locale, prefs),
            other: names[other],
            deOther: deFr(names[other]),
            ...godVars(d, locale, prefs),
          }),
          cnWord(locale, LUCK_FAMILY_TEXT[d.familyForOther!], { a: names[who], b: names[other], deA: deFr(names[who]), deB: deFr(names[other]) }),
        ].join(" "),
      );
      facts.push({ label, value: `${pillar.text} · ${ages}`, ref: decadeRef(who, d) });
    }
    sections.push({ id: `luck-${who}`, title: names[who], paragraphs });
  }
  const meets = luckMeets(p, names, locale, prefs);
  if (meets.length) sections.push({ id: "meets", title: cnWord(locale, "bzpLuckMeetHead"), paragraphs: meets.flatMap((m) => [m.text, ...m.own]) });
  if ([...L.a, ...L.b].some((d) => !d.given)) sections.push({ id: "counts", title: cnWord(locale, "bzlCountCol"), paragraphs: [cnWord(locale, "bzpLuckCounts")] });
  return {
    id: PAIR_LUCK_REF,
    kind: "aspect",
    title: cnWord(locale, "bzpLuckHead"),
    kicker: `${names.a} · ${names.b}`,
    lead,
    paragraphs: [lead, ...sections.flatMap((s) => s.paragraphs)],
    facts,
    sections,
    mark: "大運",
    about: about(locale),
  };
}

/** One person's luck pillar, or how theirs are counted, as the Cycles page reads it (part 20). */
function personLuckReading(p: BaziPair, who: Person, c: BaziChart, ref: string, locale: string, prefs: Shown, tz?: string): ElementReading | null {
  const lucks = p.luck?.lucks[who];
  if (!lucks?.length || (ref !== LUCK_HOW_REF && !/^bz:luck:(yang|yin):\d+$/.test(ref))) return null;
  return luckReading({ c, lucks, year: flowYear(c, flowYearOf(p.luck!.nowMs), lucks), day: null, tz }, ref, locale, prefs);
}

/**
 * A reading of one person's chart, named for them, its links kept on that
 * person's chart. The person comes first among the facts too (part 20): the
 * reading card shows a kicker only when there are no facts, and a cell or a
 * decade says "your" of whichever person it belongs to.
 */
function named(r: ElementReading, who: Person, ref: string, names: PairNames, locale: string): ElementReading {
  return {
    ...r,
    id: ref,
    kicker: `${names[who]} · ${r.kicker ?? ""}`,
    facts: [{ label: cnWord(locale, "bzpPersonCol"), value: names[who] }, ...(r.facts ?? []).map((f) => (f.ref?.startsWith("bz:") ? { ...f, ref: pairCellRef(who, f.ref) } : f))],
  };
}

// ── The cards' readings ──────────────────────────────────────────────────────

function dmReading(p: BaziPair, names: PairNames, locale: string, prefs: Shown): ElementReading {
  const a = chineseLabel(STEMS[p.dm.a]!, locale, prefs);
  const b = chineseLabel(STEMS[p.dm.b]!, locale, prefs);
  const lead = dmLine(p, names, locale, prefs);
  const family = cnWord(locale, FAMILY_TEXT[p.dm.family], nameVars(names));
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
  const head = cnWord(locale, row.meets.length ? "bzpMeetLead" : "bzpMeetsNone", { ...nameVars(names), pillar: pillarWord, pair: pair.text });
  const lines = row.meets.map((m) => {
    const own = pairLine(m.kind, m.level, m.items, m.phase);
    return `${meetingShort(m, locale, prefs)}${own ? `${locale === "fr" ? "\u202f: " : ": "}${said(own, locale)}` : ""}`;
  });
  // French opens on the pillar's word; English on a name, left as its person wrote it.
  const lead = locale === "fr" ? head.charAt(0).toUpperCase() + head.slice(1) : head;
  return {
    id: pairMeetRef(from),
    kind: "aspect",
    title: meetFromLabel(names, from, locale),
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

/** The Pair page's reading of a selection, or null; `tz` dates each person's luck pillars in their birthplace's zone. */
export function pairReading(
  p: BaziPair,
  a: BaziChart,
  b: BaziChart,
  ref: string | null,
  names: PairNames,
  locale: string,
  prefs: Shown,
  tz: { a?: string; b?: string } = {},
): ElementReading | null {
  if (!ref) return null;
  if (ref === PAIR_DM_REF) return dmReading(p, names, locale, prefs);
  if (ref === PAIR_PALACE_REF) return palaceReading(p, names, locale, prefs);
  if (ref === PAIR_GIFTS_REF) return giftsReading(p, names, locale, prefs);
  if (ref === PAIR_LUCK_REF) return luckPairReading(p, names, locale, prefs);
  const m = /^bzp:meet:(year|month|day|hour)$/.exec(ref);
  if (m) return meetReading(p, b, m[1] as BaziPlaceId, names, locale, prefs);
  const cell = /^bzp:(a|b):(bz:.+)$/.exec(ref);
  if (cell) {
    const who = cell[1] as Person;
    const inner = cell[2]!;
    const c = who === "a" ? a : b;
    // A luck pillar of either person (part 20) is read as the Cycles page reads it; a cell as the board does.
    const r = inner.startsWith("bz:luck") ? personLuckReading(p, who, c, inner, locale, prefs, tz[who]) : baziReading(c, inner, locale, prefs);
    return r ? named(r, who, ref, names, locale) : null;
  }
  return null;
}

/** For the meetings' list: B's pillar and what it meets, in a line (the same text as bazi-term-pieces.ts's meetPieces, for the table's links). */
export function meetRowLine(p: BaziPair, from: BaziPlaceId, names: PairNames, locale: string, prefs: Shown): string {
  const row = p.meetings.find((m) => m.from === from)!;
  return (
    row.meets.map((m) => `${chineseLabel(INTERACTION_NAMES[m.kind], locale, { ...prefs, show: "names" }).name} · ${m.with.map((w) => (w === "luck" ? "" : cnWord(locale, PILLAR_WORD[w]))).join(", ")}`).join(semicolon(locale)) ||
    cnWord(locale, "bzpMeetsNone", nameVars(names))
  );
}
