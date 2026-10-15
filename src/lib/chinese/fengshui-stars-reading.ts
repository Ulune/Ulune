/*
 * What the Flying Stars say on Feng Shui's home page (languages plan, part
 * 23): the chart and how it was cast, each palace with its three stars and
 * their state in the present period, each formation. Part 27 adds each
 * star's own reading (who it is, its state now, where it stands in the
 * home) and, in each palace, the pair of mountain and water stars read
 * together, from texts loaded with the page (fengshui-readings-texts.ts);
 * until they are there, the readings go without them. The review's fixes
 * (part 27): after a pair's two faces, the one that applies here from the
 * two stars' states (FS35); near a mountain's edge, the rooms read against
 * the chart picked on the figure, and saying which (FS30).
 *
 *   fss:main               the main chart, how it was cast, its formations
 *   fss:ti                 the replacement chart (near a mountain's edge)
 *   fss:main:palace:s      a palace's stars, their pair, its rooms
 *   fss:formation:fu-yin   a formation
 *   fss:star:9             a star
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { PHASES } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { mountainById, type PeriodId } from "./fengshui-home";
import { dirIn, directionName } from "./fengshui-reading";
import { DIRECTION_IDS, trigramOfDirection, type DirectionId } from "./fengshui";
import { FLIGHT, LO_SHU, LO_SHU_ROWS, starOf, starState, type FlyingChart, type FormationId, type PalaceId, type StarNumber, type StarState } from "./fengshui-stars";
import { pairKey, relationOf } from "./fengshui-pairs";
import type * as ReadingTexts from "./fengshui-readings-texts";
import type { FaceKey } from "./fengshui-readings-texts";
import type { HomeRoom } from "./fengshui-rooms";
import { roomLines } from "./fengshui-rooms-reading";
import { FORMATION_NAMES, FORMATION_TEXTS, STATE_TEXTS } from "./fengshui-stars-texts";
import type { YearStars } from "./fengshui-years";
import { palaceYearLines } from "./fengshui-years-reading";
import { said } from "./both";

type Shown = Pick<ChinesePrefs, "script" | "show">;
export type ChartVariant = "main" | "ti";
export type HomeStars = {
  main: FlyingChart;
  ti: FlyingChart | null;
  now: PeriodId;
  years?: YearStars | null;
  /** The rooms the reader placed (part 26). */
  rooms?: readonly HomeRoom[];
  /** The stars' and pairs' texts (part 27), once loaded. */
  texts?: FsReadingTexts | null;
  /** The chart picked on the figure, which the rooms are read against (FS30): "ti" only when there is one. */
  pick?: ChartVariant;
};

/** The chart the rooms are read against: the one picked on the figure, the main one unless a replacement chart is there and picked (FS30). */
export function roomsChart(stars: HomeStars): { v: ChartVariant; chart: FlyingChart } {
  return stars.pick === "ti" && stars.ti ? { v: "ti", chart: stars.ti } : { v: "main", chart: stars.main };
}

/** "main chart", « thème de remplacement »: a chart named in a sentence. */
export const chartWord = (v: ChartVariant, locale: string): string => cnWord(locale, v === "ti" ? "fssTi" : "fssMain").replace(/^\p{Lu}/u, (c) => c.toLowerCase());

/** The texts of part 27's readings, loaded with the page (fengshui-readings-texts.ts). */
export type FsReadingTexts = typeof ReadingTexts;

export const fssChartRef = (v: ChartVariant): string => `fss:${v}`;
export const fssPalaceRef = (v: ChartVariant, p: PalaceId): string => `fss:${v}:palace:${p}`;
export const fssFormationRef = (id: FormationId): string => `fss:formation:${id}`;
export const fssStarRef = (n: StarNumber): string => `fss:star:${n}`;

/** The palaces in rows as the grid draws them: south at the top as the tradition does, or north as the rose's setting asks. */
export function gridRows(top: "north" | "south"): PalaceId[][] {
  const rows = LO_SHU_ROWS.map((r) => [...r]);
  return top === "south" ? rows : rows.reverse().map((r) => r.reverse());
}

/**
 * The palaces as a plan of the home (part 24): its front at the bottom, the
 * eight outer palaces turned round the centre in steps of 45° so the facing
 * palace is the bottom middle, as a practitioner lays the chart on a floor
 * plan with the entrance at the bottom.
 */
export function planRows(facing: DirectionId): PalaceId[][] {
  const dirs: readonly DirectionId[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  // The outer slots clockwise from the top left; the bottom middle is the fifth.
  const k = dirs.indexOf(facing);
  const at = (slot: number) => dirs[(((k + slot - 5) % 8) + 8) % 8]!;
  return [
    [at(0), at(1), at(2)],
    [at(7), "c", at(3)],
    [at(6), at(5), at(4)],
  ];
}

/** "Period 9 · Zi mountain, Wu facing · 子山午向". */
export function chartName(c: FlyingChart, locale: string, prefs: Shown): string {
  const s = mountainById(c.sitting);
  const f = mountainById(c.facing);
  const own = cnWord(locale, "fssChartName", { p: c.period, sitting: chineseLabel(s, locale, { ...prefs, show: "names" }).name, facing: chineseLabel(f, locale, { ...prefs, show: "names" }).name });
  return prefs.show === "full" ? `${own} · ${s[prefs.script]}山${f[prefs.script]}向` : own;
}

export const formationName = (id: FormationId, locale: string, prefs: Shown): string => chineseLabel(FORMATION_NAMES[id], locale, prefs).text;

/** The palace's name: "South palace", "Palais du sud", "The centre". */
export function palaceName(p: PalaceId, locale: string): string {
  if (p === "c") return cnWord(locale, "fssCentre");
  return cnWord(locale, "fssPalaceName", { dir: directionName(p, locale), ofDir: dirIn(p, locale, "of") });
}

function stateWord(n: StarNumber, now: PeriodId, locale: string): string {
  const s = starState(n, now);
  return cnWord(locale, s.state === "timely" ? (s.current ? "fssStateCurrent" : "fssStateComing") : s.state === "waning" ? "fssStateWaning" : "fssStateDormant");
}

const starText = (n: StarNumber, locale: string, prefs: Shown) => chineseLabel(starOf(n), locale, prefs).text;
const phaseName = (n: StarNumber, locale: string) => chineseLabel(PHASES.find((p) => p.id === starOf(n).phase)!, locale, { script: "hant", show: "names" }).name.toLowerCase();

/** A pairing's name: "The scholar’s pairing", with its classical name where the books give one and the reader shows them. */
export function pairName(m: StarNumber, w: StarNumber, texts: FsReadingTexts, locale: string, prefs: Shown): string {
  const n = texts.PAIR_NAMES[pairKey(m, w)];
  return n.hant && n.hans && n.pinyin ? chineseLabel({ hant: n.hant, hans: n.hans, pinyin: n.pinyin, en: n.en, fr: n.fr }, locale, prefs).text : locale === "fr" ? n.fr : n.en;
}

/** The pair of a palace read: what the classics read in it, then how the mountain star's phase meets the water star's. */
export function pairLines(m: StarNumber, w: StarNumber, texts: FsReadingTexts, locale: string): string[] {
  const phase = (n: StarNumber) => said(texts.PHASE_WORDS[starOf(n).phase], locale);
  const rel = said(texts.RELATION_TEXTS[relationOf(m, w)], locale).replace("{m}", phase(m)).replace("{w}", phase(w)).replace("{phase}", phase(m));
  return [said(texts.PAIR_TEXTS[pairKey(m, w)], locale), rel];
}

const STATE_LETTER = { timely: "T", waning: "W", dormant: "D" } as const;

/**
 * Which face of a pairing's text applies here (the review's fix FS35), from
 * the two stars' states in the present period: "Here the mountain star is in
 * season and the water star is not: read “in season” for the people of the
 * home, and “out of season” for what comes in." Null for the 2 and the 5,
 * whose text gives its counsel alone.
 */
export function pairFaceLine(m: StarNumber, w: StarNumber, now: PeriodId, texts: FsReadingTexts, locale: string): string | null {
  const key = pairKey(m, w);
  if (texts.PAIRS_WITHOUT_FACES.includes(key)) return null;
  const face = `${STATE_LETTER[starState(m, now).state]}${STATE_LETTER[starState(w, now).state]}` as FaceKey;
  return said(texts.FACE_TEXTS[face === "WW" && texts.PAIRS_WITH_WANING_FACE.includes(key) ? "WW+" : face], locale);
}

/** A star's home in the Lo Shu: its palace, and that palace's trigram (the 5 has none). */
export function starHome(n: StarNumber): { palace: PalaceId; trigram: ReturnType<typeof trigramOfDirection> | null } {
  const palace = FLIGHT.find((p) => LO_SHU[p] === n)!;
  return { palace, trigram: palace === "c" ? null : trigramOfDirection(palace) };
}

/** How the two stars were cast, a line each, after the period chart's. */
export function castLines(c: FlyingChart, locale: string, prefs: Shown): string[] {
  const name = (id: string) => chineseLabel(mountainById(id as never), locale, { ...prefs, show: "names" }).name;
  const one = (kind: "mountain" | "water") => {
    const cast = kind === "mountain" ? c.mountain : c.water;
    const own = kind === "mountain" ? c.sitting : c.facing;
    const args = {
      kind: cnWord(locale, kind === "mountain" ? "fssKindMountain" : "fssKindWater"),
      side: cnWord(locale, kind === "mountain" ? "fssSideSitting" : "fssSideFacing"),
      met: cast.met,
      by: name(cast.by),
      own: name(own),
      pol: cast.forward ? "yang" : "yin",
      way: cnWord(locale, cast.forward ? "bzlForward" : "bzlBackward"),
      centre: cast.centre,
    };
    const lines = [cnWord(locale, cast.met === 5 ? "fssCastFive" : "fssCast", args)];
    if (cast.replaced) lines.push(cnWord(locale, "fssCastReplaced", args));
    return lines;
  };
  return [cnWord(locale, "fssPeriodChart", { p: c.period }), ...one("mountain"), ...one("water")];
}

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "fssAboutTitle"), paragraphs: [cnWord(locale, "fssAbout1"), cnWord(locale, "fssAbout2")] };
}

function chartReading(v: ChartVariant, c: FlyingChart, stars: HomeStars, locale: string, prefs: Shown): ElementReading {
  const lead = chartName(c, locale, prefs);
  const how = castLines(c, locale, prefs);
  const forms = c.formations.length ? c.formations.map((f) => `${formationName(f, locale, prefs)}${locale === "fr" ? "\u202f: " : ": "}${said(FORMATION_TEXTS[f], locale)}`) : [cnWord(locale, "fssNoFormation")];
  const tiNote = stars.ti ? [cnWord(locale, "fssTiNote")] : [];
  return {
    id: fssChartRef(v),
    kind: "house",
    title: cnWord(locale, v === "ti" ? "fssTi" : stars.ti ? "fssMain" : "fssHead"),
    kicker: c.formations.length ? c.formations.map((f) => chineseLabel(FORMATION_NAMES[f], locale, { ...prefs, show: "names" }).name).join(" · ") : cnWord(locale, "fshPeriodN", { n: c.period }),
    lead,
    paragraphs: [lead, ...tiNote, ...forms, ...how],
    facts: [
      ...c.formations.map((f) => ({ label: cnWord(locale, "fssFormationsHead"), value: formationName(f, locale, prefs), ref: fssFormationRef(f) })),
      { label: cnWord(locale, "fssMountainStar"), value: `${c.mountain.centre} · ${cnWord(locale, c.mountain.forward ? "bzlForward" : "bzlBackward")}` },
      { label: cnWord(locale, "fssWaterStar"), value: `${c.water.centre} · ${cnWord(locale, c.water.forward ? "bzlForward" : "bzlBackward")}` },
    ],
    sections: [
      { id: "formations", title: cnWord(locale, "fssFormationsHead"), paragraphs: [...forms, ...tiNote] },
      { id: "how", title: cnWord(locale, "fssHowHead"), paragraphs: how },
    ],
    links: { title: cnWord(locale, "fssPalaceCol"), rows: FLIGHT.map((p) => ({ ref: fssPalaceRef(v, p), label: palaceName(p, locale), detail: `${c.palaces[p].mountain} ${c.palaces[p].water} · ${c.palaces[p].period}` })) },
    mark: "飛星",
    about: about(locale),
  };
}

function palaceReading(v: ChartVariant, c: FlyingChart, p: PalaceId, stars: HomeStars, locale: string, prefs: Shown): ElementReading {
  const x = c.palaces[p];
  const lead = cnWord(locale, "fssPalaceLead", { m: x.mountain, w: x.water, p: x.period, b: x.base });
  const line = (key: "fssMountainStar" | "fssWaterStar" | "fssPeriodStar", n: StarNumber) =>
    cnWord(locale, "fssStarLine", { kind: cnWord(locale, key), star: starText(n, locale, prefs), phase: phaseName(n, locale), state: stateWord(n, stars.now, locale) });
  const texts = stars.texts ?? null;
  const lines = [line("fssMountainStar", x.mountain), line("fssWaterStar", x.water), line("fssPeriodStar", x.period)];
  const year = stars.years ? palaceYearLines(stars.years, p, locale, texts) : [];
  const states = [...new Set([x.mountain, x.water].map((n) => starState(n, stars.now).state))].map((s) => said(STATE_TEXTS[s], locale));
  const rooms = roomLines(c, p, stars.rooms ?? [], stars.now, locale);
  // Near a mountain's edge there are two charts: the rooms say which this palace reads them against (FS30).
  if (rooms.length && stars.ti) rooms.splice(1, 0, cnWord(locale, "fsrAgainst", { chart: chartWord(v, locale) }));
  // The pair of mountain and water stars, read together (part 27), once the texts are there: its
  // text, closed by the face that applies here from the two stars' states (FS35), in the same
  // paragraph so the short reading (a section's first paragraph) has both.
  const pair = texts ? pairLines(x.mountain, x.water, texts, locale) : [];
  const face = texts ? pairFaceLine(x.mountain, x.water, stars.now, texts, locale) : null;
  if (face) pair[0] = `${pair[0]} ${face}`;
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "fssMountainStar"), value: starText(x.mountain, locale, prefs), ref: fssStarRef(x.mountain) },
    { label: cnWord(locale, "fssWaterStar"), value: starText(x.water, locale, prefs), ref: fssStarRef(x.water) },
    { label: cnWord(locale, "fssPeriodStar"), value: starText(x.period, locale, prefs), ref: fssStarRef(x.period) },
    { label: cnWord(locale, "fssBaseCol"), value: String(x.base) },
  ];
  return {
    id: fssPalaceRef(v, p),
    kind: "house",
    title: palaceName(p, locale),
    kicker: `${x.mountain} ${x.water} · ${x.period}${stars.ti ? ` · ${cnWord(locale, v === "ti" ? "fssTi" : "fssMain")}` : ""}`,
    lead,
    paragraphs: [lead, ...rooms, ...pair, ...lines, ...year, ...states, cnWord(locale, "fssStatesNow", { now: stars.now })],
    facts,
    sections: [
      ...(rooms.length ? [{ id: "rooms", title: cnWord(locale, "fsrHereHead"), paragraphs: rooms }] : []),
      ...(texts ? [{ id: "pair", title: cnWord(locale, "fssPairTitle", { m: x.mountain, w: x.water, name: pairName(x.mountain, x.water, texts, locale, prefs) }), paragraphs: pair }] : []),
      { id: "stars", title: cnWord(locale, "fssHead"), paragraphs: [...lines, cnWord(locale, "fssStatesNow", { now: stars.now })] },
      ...(year.length ? [{ id: "year", title: cnWord(locale, "fsyHead"), paragraphs: year }] : []),
      { id: "states", title: cnWord(locale, "fssStatesHead"), paragraphs: states },
    ],
    links: { title: cnWord(locale, "fssHead"), rows: [{ ref: fssChartRef(v), label: chartName(c, locale, prefs) }] },
    mark: String(x.mountain) + String(x.water),
    about: about(locale),
  };
}

function formationReading(id: FormationId, stars: HomeStars, locale: string, prefs: Shown): ElementReading {
  const n = FORMATION_NAMES[id];
  const text = said(FORMATION_TEXTS[id], locale);
  const where = (["main", "ti"] as const).filter((v) => (v === "main" ? stars.main : stars.ti)?.formations.includes(id));
  return {
    id: fssFormationRef(id),
    kind: "aspect",
    title: chineseLabel(n, locale, { ...prefs, show: "names" }).name,
    kicker: chineseLabel(n, locale, prefs).text,
    lead: text,
    paragraphs: [text],
    facts: where.map((v) => ({ label: cnWord(locale, v === "ti" ? "fssTi" : "fssMain"), value: chartName(v === "ti" ? stars.ti! : stars.main, locale, prefs), ref: fssChartRef(v) })),
    sections: [{ id: "formation", title: cnWord(locale, "fssFormationsHead"), paragraphs: [text] }],
    mark: n[prefs.script].slice(0, 2),
    about: about(locale),
  };
}

/** Where a star stands in the main chart: as the mountain, the water and the period star. */
export function starPlaces(n: StarNumber, c: FlyingChart): { mountain: PalaceId[]; water: PalaceId[]; period: PalaceId[] } {
  const order: readonly PalaceId[] = ["c", ...DIRECTION_IDS];
  return {
    mountain: order.filter((p) => c.palaces[p].mountain === n),
    water: order.filter((p) => c.palaces[p].water === n),
    period: order.filter((p) => c.palaces[p].period === n),
  };
}

function starReading(n: StarNumber, stars: HomeStars, locale: string, prefs: Shown): ElementReading {
  const texts = stars.texts ?? null;
  const star = starOf(n);
  const st = starState(n, stars.now);
  const home = starHome(n);
  const stateText = texts ? said(texts.STAR_STATE_TEXTS[n][st.state], locale) : said(STATE_TEXTS[st.state], locale);
  const portrait = texts ? said(texts.STAR_TEXTS[n], locale) : null;
  const at = starPlaces(n, stars.main);
  const list = (ps: PalaceId[]) => ps.map((p) => (p === "c" ? cnWord(locale, "fssCentre") : directionName(p, locale))).join(", ");
  const where = [
    ...(at.mountain.length ? [cnWord(locale, "fssStarAsM", { list: list(at.mountain) })] : []),
    ...(at.water.length ? [cnWord(locale, "fssStarAsW", { list: list(at.water) })] : []),
    ...(at.period.length ? [cnWord(locale, "fssStarAsP", { list: list(at.period) })] : []),
  ];
  if (!at.mountain.length && !at.water.length) where.unshift(cnWord(locale, "fssStarNowhere"));
  const tri = home.trigram ? `${home.trigram.symbol} ${chineseLabel(home.trigram, locale, { ...prefs, show: "names" }).name}` : "—";
  const phase = phaseName(n, locale);
  const allStates = texts ? (["timely", "waning", "dormant"] as const satisfies readonly StarState[]).map((k) => said(texts.STAR_STATE_TEXTS[n][k], locale)) : [];
  return {
    id: fssStarRef(n),
    kind: "sign",
    title: chineseLabel(star, locale, { ...prefs, show: "names" }).name,
    kicker: [chineseLabel(star.star, locale, prefs).text, phase, tri].join(" · "),
    lead: portrait ?? stateText,
    paragraphs: [...(portrait ? [portrait] : []), stateText, ...where],
    facts: [
      { label: cnWord(locale, "fssPhaseCol"), value: phase },
      { label: cnWord(locale, "fsTrigram"), value: tri },
      { label: cnWord(locale, "fssClassicalName"), value: chineseLabel(star.star, locale, prefs).text },
      { label: cnWord(locale, "fssLoShuHome"), value: home.palace === "c" ? cnWord(locale, "fssCentre") : directionName(home.palace, locale) },
      { label: cnWord(locale, "fssStateNow"), value: stateWord(n, stars.now, locale) },
    ],
    sections: [
      { id: "state", title: cnWord(locale, "fssStarStateHead", { now: stars.now }), paragraphs: [stateText] },
      { id: "home", title: cnWord(locale, "fssStarHomeHead"), paragraphs: where },
      ...(allStates.length ? [{ id: "states", title: cnWord(locale, "fssStarStatesHead"), paragraphs: allStates }] : []),
    ],
    links: {
      title: cnWord(locale, "fssStarHomeHead"),
      rows: [...new Set([...at.mountain, ...at.water])].map((p) => ({ ref: fssPalaceRef("main", p), label: palaceName(p, locale) })),
    },
    mark: star[prefs.script],
    about: about(locale),
  };
}

/** A Flying Star reading, or null for a ref of another kind. */
export function starsReading(stars: HomeStars | null, ref: string, locale: string, prefs: Shown): ElementReading | null {
  if (!stars || !ref.startsWith("fss:")) return null;
  const f = /^fss:formation:([a-z-]+)$/.exec(ref);
  if (f) return f[1]! in FORMATION_NAMES ? formationReading(f[1] as FormationId, stars, locale, prefs) : null;
  const sn = /^fss:star:([1-9])$/.exec(ref);
  if (sn) return starReading(Number(sn[1]) as StarNumber, stars, locale, prefs);
  const m = /^fss:(main|ti)(?::palace:(c|n|ne|e|se|s|sw|w|nw))?$/.exec(ref);
  if (!m) return null;
  const v = m[1] as ChartVariant;
  const c = v === "ti" ? stars.ti : stars.main;
  if (!c) return null;
  return m[2] ? palaceReading(v, c, m[2] as PalaceId, stars, locale, prefs) : chartReading(v, c, stars, locale, prefs);
}
