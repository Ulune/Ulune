/*
 * What Feng Shui's Relationship lens says (review items FS5 and FS32; the
 * languages plan's "Two people in one home"): each person's Kua, the groups
 * compared and the direction most supportive for both (or, of two groups,
 * the best middle ground), each of the eight directions for two (both
 * people's mansions, what the direction is for the two of them, then each
 * mansion's own text), and the practical lines for two: a desk you share, a
 * bed you share, rooms of your own, what suits storage, and the home open on
 * the Home lens beside your two Kua. Suggestions with their reasons, never
 * rules, in the Kua page's tone (fengshui-texts.ts); nothing about how two
 * people get on, only where each is best served.
 *
 *   fsp:summary          the two Kua, the groups, the best for both
 *   fsp:a:kua            A's Kua (the Kua page's reading, named for A)
 *   fsp:dir:ne           a direction for two
 *   fsp:practice         the practical lines for two
 *
 * Pure; tested in scripts/chinese-fengshui-pair.test.mjs. Nothing is sent.
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord, type ChineseWordKey } from "./words";
import { DIRECTION_IDS, MANSIONS, directionById, trigramOfDirection, type DirectionId, type FengShui } from "./fengshui";
import { houseMatch, type Home } from "./fengshui-home";
import { MANSION_TEXTS } from "./fengshui-texts";
import { dirIn, directionName, fengShuiReading, fsKuaRef, groupLabel, mansionName } from "./fengshui-reading";
import { pairDirection, type FengShuiPair, type PairDirection, type PairKind, type PairPerson } from "./fengshui-pair";
import { deFr, said } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;
export type FsPairNames = { a: string; b: string };
/** The home open on the Home lens (its name when it is kept), read beside the two Kua. */
export type FsPairHome = { home: Home; name: string };
/**
 * What the page reads: the pair on the compass (each person's Kua for the count it reads), the two
 * names, each person's Kua for every count shown (both when the birth gives none), and the home.
 */
export type FsPairContext = { pair: FengShuiPair; names: FsPairNames; lists: Readonly<Record<PairPerson, readonly FengShui[]>>; home?: FsPairHome | null };

export const FSP_SUMMARY_REF = "fsp:summary";
export const FSP_PRACTICE_REF = "fsp:practice";
export const fspDirRef = (d: DirectionId): string => `fsp:dir:${d}`;
export const fspKuaRef = (person: PairPerson): string => `fsp:${person}:kua`;

const cap = (s: string) => s.replace(/^\p{Ll}/u, (x) => x.toUpperCase());
const low = (s: string) => s.replace(/^\p{Lu}/u, (x) => x.toLowerCase());
const other = (p: PairPerson): PairPerson => (p === "a" ? "b" : "a");

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "fsAboutTitle"), paragraphs: [cnWord(locale, "fsAbout1"), cnWord(locale, "fspAbout")] };
}

/** Directions in a sentence, clockwise from the north: "the north, the east and the south", « le nord, l’est ou le sud ». */
export function directionList(dirs: readonly DirectionId[], locale: string, joiner: "and" | "or"): string {
  const words = DIRECTION_IDS.filter((d) => dirs.includes(d)).map((d) => dirIn(d, locale, "the"));
  if (words.length < 2) return words[0] ?? "";
  const last = locale === "fr" ? (joiner === "and" ? " et " : " ou ") : joiner === "and" ? " and " : " or ";
  return `${words.slice(0, -1).join(", ")}${last}${words.at(-1)}`;
}

/** "TraceQA’s Restoration direction and Sample B’s Harmony", or for one mansion "the Restoration direction of each of you". */
function who(x: PairDirection, names: FsPairNames, locale: string): string {
  const ma = mansionName(x.a.mansion, locale);
  const mb = mansionName(x.b.mansion, locale);
  if (x.a.mansion === x.b.mansion) return cnWord(locale, "fspWhoSame", { m: ma, deM: deFr(ma) });
  return cnWord(locale, "fspWho", { a: names.a, b: names.b, ma, mb, deMa: deFr(ma), deMb: deFr(mb) });
}

/** A mixed direction's two sides: the one it supports and the one it challenges, with their mansions. */
function sidesOf(x: PairDirection, names: FsPairNames, locale: string) {
  const g = x.good ?? "a";
  const h = other(g);
  const mGood = mansionName(x[g].mansion, locale);
  const mHard = mansionName(x[h].mansion, locale);
  return { good: names[g], hard: names[h], deGood: deFr(names[g]), mGood, mHard, deMGood: deFr(mGood), deMHard: deFr(mHard) };
}

/** What a direction is for the two of you: "Supportive for you both", "Mixed, supportive for TraceQA". */
export function kindLabel(x: PairDirection, names: FsPairNames, locale: string): string {
  if (x.kind === "both-good") return cnWord(locale, "fspKindGood");
  if (x.kind === "both-hard") return cnWord(locale, "fspKindHard");
  return `${cnWord(locale, "fspKindMixed")}, ${cnWord(locale, "fspMixedFor", { name: names[x.good ?? "a"] })}`;
}

/** A direction for a screen reader, the wedge's and its row's: what it is for two, then each person's mansion and its kind. */
export function directionAria(p: FengShuiPair, d: DirectionId, names: FsPairNames, locale: string): string {
  const x = pairDirection(p, d);
  const kind = (supportive: boolean) => low(cnWord(locale, supportive ? "fsSupportive" : "fsChallenging"));
  return cnWord(locale, "fspWedgeAria", {
    dir: directionName(d, locale),
    kind: low(kindLabel(x, names, locale)),
    a: names.a,
    b: names.b,
    ma: mansionName(x.a.mansion, locale),
    mb: mansionName(x.b.mansion, locale),
    ka: kind(x.a.supportive),
    kb: kind(x.b.supportive),
  });
}

/** A direction's opening line: "The east is supportive for you both: TraceQA’s Restoration direction and Sample B’s Harmony." */
export function pairDirLine(p: FengShuiPair, d: DirectionId, names: FsPairNames, locale: string): string {
  const x = pairDirection(p, d);
  const Dir = cap(dirIn(d, locale, "the"));
  if (x.kind === "mixed") return cnWord(locale, "fspDirMixed", { Dir, ...sidesOf(x, names, locale) });
  return cnWord(locale, x.kind === "both-good" ? "fspDirGood" : "fspDirHard", { Dir, who: who(x, names, locale) });
}

/** What a direction suits for the two of you; a mixed one that is the challenged one's Huo Hai makes a good middle ground. */
export function forTwoLines(p: FengShuiPair, d: DirectionId, names: FsPairNames, locale: string): string[] {
  const x = pairDirection(p, d);
  if (x.kind === "both-good") return [cnWord(locale, "fspTwoGood")];
  if (x.kind === "both-hard") return [cnWord(locale, "fspTwoHard")];
  const s = sidesOf(x, names, locale);
  const lines = [cnWord(locale, "fspTwoMixed", s)];
  if (x[other(x.good ?? "a")].mansion === "huo-hai") lines.push(cnWord(locale, "fspTwoMiddle", s));
  return lines;
}

/** A group's name inside a sentence: "East group", « groupe de l’Est ». */
const groupIn = (group: FengShui["group"], locale: string) => {
  const g = groupLabel({ group } as FengShui, locale);
  return locale === "fr" ? low(g) : g;
};

/** The two groups compared, in a line. */
export function groupsLine(p: FengShuiPair, names: FsPairNames, locale: string): string {
  const base = { a: names.a, b: names.b, ka: p.a.kua, kb: p.b.kua };
  if (p.sameGroup) return cnWord(locale, "fspGroupsSame", { ...base, group: groupIn(p.a.group, locale), dirs: directionList(p.sides.a, locale, "and") });
  return cnWord(locale, "fspGroupsTwo", { ...base, ga: groupIn(p.a.group, locale), gb: groupIn(p.b.group, locale) });
}

/** The first read's and the summary's best direction: shared, else the best middle ground. */
export const bestDirection = (p: FengShuiPair): DirectionId => p.shared[0] ?? p.mixed[0]!;

/** The direction most supportive for both, or of two groups the best middle ground, in a line. */
export function bestLine(p: FengShuiPair, names: FsPairNames, locale: string): string {
  const x = pairDirection(p, bestDirection(p));
  const dirThe = dirIn(x.direction, locale, "the");
  if (x.kind === "both-good") return cnWord(locale, "fspBestShared", { dirThe, who: who(x, names, locale) });
  return cnWord(locale, "fspBestMiddle", { dirThe, ...sidesOf(x, names, locale) });
}

/**
 * The home open on the Home lens beside the two Kua (houseMatch for each): its house and group, whose
 * group it shares, and the mansions its front faces for each; null without a home.
 */
export function pairHomeLine(c: FsPairContext, locale: string): string | null {
  if (!c.home) return null;
  const { pair: p, names } = c;
  const { home, name } = c.home;
  const ma = houseMatch(home, p.a);
  const mb = houseMatch(home, p.b);
  const lead = cnWord(locale, "fspHomeOf", {
    home: name ? cnWord(locale, "fspHomeNamed", { name }) : cnWord(locale, "fspHomeHead"),
    house: `${locale === "fr" ? home.house.fr : home.house.en} ${home.house.symbol}`,
    group: groupIn(home.house.group, locale),
  });
  let fit: string;
  if (ma.same && mb.same) fit = cnWord(locale, "fspHomeBoth");
  else if (ma.same || mb.same) {
    const same = ma.same ? names.a : names.b;
    const out = ma.same ? names.b : names.a;
    fit = cnWord(locale, "fspHomeOne", { same, other: out, deSame: deFr(same), deOther: deFr(out) });
  } else fit = cnWord(locale, "fspHomeNone");
  const d = home.facingDirection;
  const faces = cnWord(locale, "fspHomeFaces", { fdirTo: dirIn(d, locale, "to"), fdirThe: dirIn(d, locale, "the"), who: who(pairDirection(p, d), names, locale) });
  return `${lead} ${fit} ${faces}`;
}

export type PairPracticeId = "desk" | "bed" | "rooms" | "store" | "home";
const PRACTICE_HEAD: Record<PairPracticeId, ChineseWordKey> = { desk: "fspDeskHead", bed: "fspBedHead", rooms: "fspRoomsHead", store: "fspStoreHead", home: "fspHomeHead" };
export const practiceHead = (id: PairPracticeId, locale: string) => cnWord(locale, PRACTICE_HEAD[id]);

/** The practical lines for two, in order: a desk you share, a bed you share, rooms of your own, storage, and the home when one is open. */
export function pairPracticeLines(c: FsPairContext, locale: string): { id: PairPracticeId; text: string }[] {
  const { pair: p, names } = c;
  const sq = mansionName("sheng-qi", locale);
  const sqA = p.a.of["sheng-qi"];
  const sqB = p.b.of["sheng-qi"];
  const desk = pairDirection(p, p.desk);
  const deskLine =
    desk.kind === "both-good"
      ? cnWord(locale, "fspDeskShared", { dirTo: dirIn(desk.direction, locale, "to"), who: who(desk, names, locale) })
      : cnWord(locale, "fspDeskMiddle", { dirTo: dirIn(desk.direction, locale, "to"), ...sidesOf(desk, names, locale) });
  // Desks of their own, each facing their Growth direction (the Kua page's desk), when the two differ.
  const own = sqA === sqB ? "" : ` ${cnWord(locale, "fspDeskOwn", { m: sq, deM: deFr(sq), a: names.a, b: names.b, toA: dirIn(sqA, locale, "to"), toB: dirIn(sqB, locale, "to") })}`;
  const bed = pairDirection(p, p.bed);
  const bedLine =
    bed.kind === "both-good"
      ? cnWord(locale, "fspBedShared", { dirThe: dirIn(bed.direction, locale, "the"), who: who(bed, names, locale) })
      : cnWord(locale, "fspBedMiddle", { dirThe: dirIn(bed.direction, locale, "the"), ...sidesOf(bed, names, locale) });
  const rooms = p.sameKua
    ? cnWord(locale, "fspRoomsSameKua", { dirThe: dirIn(sqA, locale, "the"), m: sq, deM: deFr(sq) })
    : p.sameGroup
      ? cnWord(locale, "fspRoomsShared", { m: sq, deM: deFr(sq), a: names.a, b: names.b, inA: dirIn(sqA, locale, "in"), inB: dirIn(sqB, locale, "in") })
      : cnWord(locale, "fspRoomsSplit", { a: names.a, b: names.b, listA: directionList(p.sides.a, locale, "or"), listB: directionList(p.sides.b, locale, "or") });
  const store = p.hard.length ? cnWord(locale, "fspStoreShared", { list: directionList(p.hard, locale, "and") }) : cnWord(locale, "fspStoreSplit");
  const home = pairHomeLine(c, locale);
  return [
    { id: "desk" as const, text: `${deskLine}${own}` },
    { id: "bed" as const, text: bedLine },
    { id: "rooms" as const, text: rooms },
    { id: "store" as const, text: store },
    ...(home ? [{ id: "home" as const, text: home }] : []),
  ];
}

/** A list's directions as their short names, clockwise ("N, E, SE, S"), or a dash for none. */
function shortList(dirs: readonly DirectionId[], locale: string): string {
  const list = DIRECTION_IDS.filter((d) => dirs.includes(d)).map((d) => directionById(d).short[locale === "fr" ? "fr" : "en"]);
  return list.length ? list.join(", ") : "—";
}

function summaryReading(c: FsPairContext, locale: string): ElementReading {
  const { pair: p, names } = c;
  const lead = groupsLine(p, names, locale);
  const best = bestLine(p, names, locale);
  const note = cnWord(locale, "fspNoVerdict");
  const kua = (fs: FengShui) => `${cnWord(locale, "fsKuaN", { n: fs.kua })} · ${groupLabel(fs, locale)}`;
  const facts: ReadingFact[] = [
    { label: names.a, value: kua(p.a), ref: fspKuaRef("a") },
    { label: names.b, value: kua(p.b), ref: fspKuaRef("b") },
    { label: cnWord(locale, "fspSharedHead"), value: shortList(p.shared, locale) },
    { label: cnWord(locale, "fspHardHead"), value: shortList(p.hard, locale) },
    { label: cnWord(locale, "fspKindMixed"), value: shortList(p.mixed, locale) },
  ];
  return {
    id: FSP_SUMMARY_REF,
    kind: "aspect",
    title: cnWord(locale, "fspTitle"),
    kicker: `${names.a} · ${names.b} · ${cnWord(locale, p.sameGroup ? "fspSameGroup" : "fspTwoGroups")}`,
    lead,
    paragraphs: [lead, best, note],
    facts,
    sections: [
      { id: "groups", title: cnWord(locale, "fspGroups"), paragraphs: [lead] },
      { id: "best", title: cnWord(locale, p.shared.length ? "fspFirstBest" : "fspFirstMiddle"), paragraphs: [best] },
      { id: "note", title: cnWord(locale, "fsNoteHead"), paragraphs: [note] },
    ],
    links: {
      title: cnWord(locale, "fspPartDirs"),
      rows: DIRECTION_IDS.map((d) => {
        const x = pairDirection(p, d);
        return { ref: fspDirRef(d), label: directionName(d, locale), detail: `${mansionName(x.a.mansion, locale)} · ${mansionName(x.b.mansion, locale)}` };
      }),
    },
    mark: "八宅",
    terms: [{ family: "kua", id: p.a.kua }, { family: "kua", id: p.b.kua }],
    about: about(locale),
  };
}

function dirReading(c: FsPairContext, d: DirectionId, locale: string, prefs: Shown): ElementReading {
  const { pair: p, names } = c;
  const x = pairDirection(p, d);
  const dir = directionById(d);
  const dl = chineseLabel(dir, locale, prefs);
  const tri = trigramOfDirection(d);
  const tl = chineseLabel(tri, locale, prefs);
  const lead = pairDirLine(p, d, names, locale);
  const two = forTwoLines(p, d, names, locale);
  const side = (person: PairPerson) => {
    const s = x[person];
    const ml = chineseLabel(MANSIONS[s.mansion], locale, prefs);
    return { name: ml.name, text: said(MANSION_TEXTS[s.mansion], locale), value: `${ml.text} (${low(cnWord(locale, s.supportive ? "fsSupportive" : "fsChallenging"))})` };
  };
  const sa = side("a");
  const sb = side("b");
  // One mansion for both (the same Kua): its text once.
  const own =
    x.a.mansion === x.b.mansion
      ? [{ id: "both", title: `${names.a} · ${names.b} · ${sa.name}`, paragraphs: [sa.text] }]
      : [
          { id: "a", title: `${names.a} · ${sa.name}`, paragraphs: [sa.text] },
          { id: "b", title: `${names.b} · ${sb.name}`, paragraphs: [sb.text] },
        ];
  return {
    id: fspDirRef(d),
    kind: "house",
    title: dl.name,
    kicker: kindLabel(x, names, locale),
    lead,
    paragraphs: [lead, ...two, ...own.flatMap((s) => s.paragraphs)],
    facts: [
      { label: cnWord(locale, "fsDirection"), value: dl.text },
      { label: names.a, value: sa.value, ref: fspKuaRef("a") },
      { label: names.b, value: sb.value, ref: fspKuaRef("b") },
      { label: cnWord(locale, "fsTrigram"), value: `${tri.symbol} ${tl.text}` },
    ],
    sections: [{ id: "two", title: cnWord(locale, "fspForTwo"), paragraphs: two }, ...own],
    mark: (prefs.show === "full" ? dir[prefs.script] : null) ?? dir.short[locale === "fr" ? "fr" : "en"],
    terms: [{ family: "mansion", id: x.a.mansion }, { family: "mansion", id: x.b.mansion }, { family: "trigram", id: tri.id }],
    about: about(locale),
  };
}

/** One person's Kua: the Kua page's own reading, named for its person, its directions read for two. */
function kuaReading(c: FsPairContext, person: PairPerson, locale: string, prefs: Shown): ElementReading | null {
  const fs = c.pair[person];
  const list = c.lists[person].length ? c.lists[person] : [fs];
  const r = fengShuiReading(list, fsKuaRef(fs.count), locale, prefs);
  if (!r) return null;
  const name = c.names[person];
  const lead = cnWord(locale, "fspKuaIs", { name, deName: deFr(name), n: fs.kua, trigram: chineseLabel(fs.trigram, locale, prefs).text, symbol: fs.trigram.symbol });
  return {
    ...r,
    id: fspKuaRef(person),
    kicker: `${name} · ${r.kicker}`,
    lead,
    paragraphs: [lead, ...r.paragraphs.slice(1)],
    links: r.links ? { ...r.links, rows: r.links.rows.map((row) => ({ ...row, ref: row.ref.replace(/^fs:(?:yang|yin):dir:/, "fsp:dir:") })) } : undefined,
  };
}

function practiceReading(c: FsPairContext, locale: string): ElementReading {
  const { pair: p, names } = c;
  const lead = cnWord(locale, "fspPracticeLead");
  const lines = pairPracticeLines(c, locale);
  const note = cnWord(locale, "fsPracticeNote");
  return {
    id: FSP_PRACTICE_REF,
    kind: "house",
    title: cnWord(locale, "fspPracticeHead"),
    kicker: `${names.a} · ${names.b}`,
    lead,
    paragraphs: [lead, ...lines.map((l) => l.text), note],
    facts: [
      { label: cnWord(locale, "fspDeskHead"), value: directionName(p.desk, locale), ref: fspDirRef(p.desk) },
      { label: cnWord(locale, "fspBedHead"), value: directionName(p.bed, locale), ref: fspDirRef(p.bed) },
    ],
    sections: [...lines.map((l) => ({ id: l.id, title: practiceHead(l.id, locale), paragraphs: [l.text] })), { id: "note", title: cnWord(locale, "fsNoteHead"), paragraphs: [note] }],
    mark: "八宅",
    terms: [{ family: "kua", id: p.a.kua }, { family: "kua", id: p.b.kua }],
    about: about(locale),
  };
}

/** The page's reading of a selection, or null (nothing chosen, no pair yet, or a ref of another page). */
export function fsPairReading(c: FsPairContext | null, ref: string | null, locale: string, prefs: Shown): ElementReading | null {
  if (!c || !ref) return null;
  if (ref === FSP_SUMMARY_REF) return summaryReading(c, locale);
  if (ref === FSP_PRACTICE_REF) return practiceReading(c, locale);
  const k = /^fsp:(a|b):kua$/.exec(ref);
  if (k) return kuaReading(c, k[1] as PairPerson, locale, prefs);
  const m = /^fsp:dir:(n|ne|e|se|s|sw|w|nw)$/.exec(ref);
  return m ? dirReading(c, m[1] as DirectionId, locale, prefs) : null;
}

/** Every ref the page can open, for the tests. */
export const fsPairRefs = (): string[] => [FSP_SUMMARY_REF, FSP_PRACTICE_REF, fspKuaRef("a"), fspKuaRef("b"), ...DIRECTION_IDS.map(fspDirRef)];

/** The lists beside the compass, by kind. */
export const listOfKind = (p: FengShuiPair, kind: PairKind): DirectionId[] => (kind === "both-good" ? p.shared : kind === "both-hard" ? p.hard : p.mixed);
