/*
 * What Feng Shui's home page says (languages plan, part 22): the facing with
 * its mountains, its edge and how it was measured; the house's trigram and
 * group beside the reader's Kua; each of the 24 mountains; the period; how
 * to find the facing.
 *
 *   fsh:facing            the facing, the sitting, the edge, the measure
 *   fsh:house:yang        the house and the reader's Kua (one per count shown)
 *   fsh:mountain:wu       a mountain of the dial
 *   fsh:period            the building's period
 *   fsh:how               finding the facing
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { BRANCHES, PHASES, STEMS } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { MANSIONS, TRIGRAMS, type FengShui, type FsCount } from "./fengshui";
import { MOUNTAINS, houseMatch, mountainById, norm360, periodOf, type Home, type Mountain, type MountainId, type PeriodId } from "./fengshui-home";
import { flyingChart } from "./fengshui-stars";
import { starsReading, type HomeStars } from "./fengshui-stars-reading";
import { countLabel, deName, dirIn, directionName, fsDirRef, fsKuaRef, groupLabel, mansionName } from "./fengshui-reading";

type Shown = Pick<ChinesePrefs, "script" | "show">;

export const FSH_FACING_REF = "fsh:facing";
export const FSH_PERIOD_REF = "fsh:period";
export const FSH_HOW_REF = "fsh:how";
export const fshHouseRef = (count: FsCount): string => `fsh:house:${count}`;
export const fshMountainRef = (id: MountainId): string => `fsh:mountain:${id}`;

export type HomeContext = {
  home: Home | null;
  /** The year the reader gave, with its period. */
  period: { year: number; period: PeriodId; from: number; to: number } | null;
  people: readonly FengShui[];
  /** What the declination was taken for: the chart's place, its value (east positive), or null without one. */
  place: string;
  declination: number | null;
  /** The Flying Star charts, once both a facing and a year are given (part 23). */
  stars?: HomeStars | null;
};

/** The home's Flying Star charts: the main one, the replacement near a mountain's edge, and the present period for the stars' states. */
export function homeStars(home: Home | null, period: HomeContext["period"], nowYear: number): HomeStars | null {
  if (!home || !period) return null;
  const main = flyingChart(period.period, home.facingMountain.id, home.sittingMountain.id);
  const ti = home.edge.level === "clear" ? null : flyingChart(period.period, home.facingMountain.id, home.sittingMountain.id, true);
  return { main, ti, now: periodOf(nowYear).period };
}

/** "172.5°" or "172,5°". */
export function fmtDeg(d: number, locale: string, digits = 1): string {
  return `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(d)}°`;
}

/** "1.6° E", "2,1° O". */
export function fmtDecl(d: number, locale: string): string {
  return cnWord(locale, d >= 0 ? "fshEast" : "fshWest", { n: fmtDeg(Math.abs(d), locale) });
}

/** "S2", "NO1": a mountain's short code. */
export function mountainCode(m: Mountain, locale: string): string {
  const short = { n: "N", ne: "NE", e: "E", se: "SE", s: "S", sw: locale === "fr" ? "SO" : "SW", w: locale === "fr" ? "O" : "W", nw: locale === "fr" ? "NO" : "NW" }[m.direction];
  return `${short}${m.place}`;
}

/** The phase a mountain carries: its stem's, its branch's or its trigram's. */
export function mountainPhase(m: Mountain): string {
  if (m.kind === "stem") return STEMS.find((s) => s.id === m.id)!.phase;
  if (m.kind === "branch") return BRANCHES.find((b) => b.id === m.id)!.phase;
  return TRIGRAMS.find((t) => t.id === m.id)!.phase;
}

const ORD = { 1: "fshOrd1", 2: "fshOrd2", 3: "fshOrd3" } as const;

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "fshAboutTitle"), paragraphs: [cnWord(locale, "fshAbout1"), cnWord(locale, "fshAbout2")] };
}

/** "Your home faces 172.5°: Wu · wǔ 午, the middle mountain of the south. It sits in Zi · zǐ 子, in the north." */
export function facingLine(home: Home, locale: string, prefs: Shown): string {
  return cnWord(locale, "fshFacingLead", {
    deg: fmtDeg(home.facing.degrees, locale),
    mountain: chineseLabel(home.facingMountain, locale, prefs).text,
    ord: cnWord(locale, ORD[home.facingMountain.place]),
    ofDir: dirIn(home.facingDirection, locale, "of"),
    sitting: chineseLabel(home.sittingMountain, locale, prefs).text,
    inDir: dirIn(home.sittingDirection, locale, "in"),
  });
}

/** How close the facing stands to its mountain's edge, in a line. */
export function edgeLine(home: Home, locale: string, prefs: Shown): string {
  const e = home.edge;
  const other = chineseLabel(e.neighbour, locale, { ...prefs, show: "names" }).name;
  const dist = fmtDeg(e.distance, locale);
  if (e.level === "clear") return cnWord(locale, "fshEdgeClear", { dist, other });
  if (e.level === "replacement") return cnWord(locale, "fshEdgeReplace", { dist, other });
  return cnWord(locale, "fshEdgeVoid", { dist, other, between: cnWord(locale, e.between === "directions" ? "fshBetweenDirections" : "fshBetweenMountains") });
}

/** How the facing was measured, in a line. */
export function sourceLine(home: Home, locale: string): string {
  const f = home.facing;
  if (f.source === "phone") return cnWord(locale, "fshSourcePhoneLine");
  if (f.source === "map" && f.declination != null) {
    return cnWord(locale, "fshSourceMapLine", { typed: fmtDeg(norm360(f.degrees + f.declination), locale), deg: fmtDeg(f.degrees, locale), decl: fmtDecl(f.declination, locale) });
  }
  return cnWord(locale, "fshSourceCompassLine");
}

/** The house's trigram and group, in a line. */
export function houseLine(home: Home, locale: string, prefs: Shown): string {
  const g = groupLabel({ group: home.house.group } as FengShui, locale);
  return cnWord(locale, "fshHouseLead", {
    house: `${chineseLabel(home.house, locale, { ...prefs, show: "names" }).name} ${home.house.symbol}`,
    inDir: dirIn(home.sittingDirection, locale, "in"),
    group: locale === "fr" ? g.replace(/^G/, "g") : g,
  });
}

/** The house beside one person's Kua: the same group or not, and the mansions it faces and sits in. */
export function matchLines(home: Home, fs: FengShui, locale: string): string[] {
  const m = houseMatch(home, fs);
  const facing = mansionName(m.facing, locale);
  const sitting = mansionName(m.sitting, locale);
  return [
    cnWord(locale, m.same ? "fshHouseSame" : "fshHouseOther", { kua: fs.kua }),
    cnWord(locale, "fshHouseFaces", {
      facing,
      sitting,
      deFacing: deName(facing),
      deSitting: deName(sitting),
      fdir: directionName(home.facingDirection, locale).toLowerCase(),
      sdir: directionName(home.sittingDirection, locale).toLowerCase(),
    }),
  ];
}

export function periodLines(c: HomeContext, locale: string): string[] {
  const lines = c.period ? [cnWord(locale, "fshPeriodBuilt", { year: c.period.year, n: c.period.period, from: c.period.from, to: c.period.to })] : [cnWord(locale, "fshPeriodNone")];
  return [...lines, cnWord(locale, "fshPeriodNow")];
}

function facingReading(c: HomeContext, home: Home, locale: string, prefs: Shown): ElementReading {
  const lead = facingLine(home, locale, prefs);
  const edge = edgeLine(home, locale, prefs);
  const source = sourceLine(home, locale);
  const house = houseLine(home, locale, prefs);
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "fshDialFacing"), value: `${fmtDeg(home.facing.degrees, locale)} · ${chineseLabel(home.facingMountain, locale, prefs).text} · ${mountainCode(home.facingMountain, locale)}`, ref: fshMountainRef(home.facingMountain.id) },
    { label: cnWord(locale, "fshDialSitting"), value: `${fmtDeg(norm360(home.facing.degrees + 180), locale)} · ${chineseLabel(home.sittingMountain, locale, prefs).text} · ${mountainCode(home.sittingMountain, locale)}`, ref: fshMountainRef(home.sittingMountain.id) },
    { label: cnWord(locale, "fsTrigram"), value: `${home.house.symbol} ${chineseLabel(home.house, locale, prefs).text}` },
    { label: cnWord(locale, "fsGroup"), value: groupLabel({ group: home.house.group } as FengShui, locale) },
  ];
  if (c.declination != null) facts.push({ label: cnWord(locale, "fshDeclShort"), value: fmtDecl(c.declination, locale), ref: FSH_HOW_REF });
  if (c.period) facts.push({ label: cnWord(locale, "fshPeriodHead"), value: cnWord(locale, "fshPeriodRange", { n: c.period.period, from: c.period.from, to: c.period.to }), ref: FSH_PERIOD_REF });
  return {
    id: FSH_FACING_REF,
    kind: "house",
    title: cnWord(locale, "fshFacingHead"),
    kicker: `${fmtDeg(home.facing.degrees, locale)} · ${mountainCode(home.facingMountain, locale)}`,
    lead,
    paragraphs: [lead, edge, source, house],
    facts,
    sections: [
      { id: "edge", title: cnWord(locale, "fshMountainsHead"), paragraphs: [edge] },
      { id: "measure", title: cnWord(locale, "fshHowHead"), paragraphs: [source, cnWord(locale, "fshCheck")] },
      { id: "house", title: cnWord(locale, "fshHouseHead"), paragraphs: [house] },
    ],
    links: c.people.length ? { title: cnWord(locale, "fshHouseHead"), rows: c.people.map((fs) => ({ ref: fshHouseRef(fs.count), label: cnWord(locale, "fsKuaN", { n: fs.kua }), detail: c.people.length > 1 ? countLabel(fs.count, locale) : undefined })) } : undefined,
    mark: (prefs.show === "full" ? home.facingMountain[prefs.script] : null) ?? mountainCode(home.facingMountain, locale),
    about: about(locale),
  };
}

function houseReading(c: HomeContext, home: Home, fs: FengShui, locale: string, prefs: Shown): ElementReading {
  const lead = houseLine(home, locale, prefs);
  const lines = matchLines(home, fs, locale);
  const m = houseMatch(home, fs);
  return {
    id: fshHouseRef(fs.count),
    kind: "house",
    title: cnWord(locale, "fshHouseHead"),
    kicker: [`${home.house.symbol} ${chineseLabel(home.house, locale, { ...prefs, show: "names" }).name}`, cnWord(locale, "fsKuaN", { n: fs.kua }), c.people.length > 1 ? countLabel(fs.count, locale) : null].filter(Boolean).join(" · "),
    lead,
    paragraphs: [lead, ...lines],
    facts: [
      { label: cnWord(locale, "fsKuaHead"), value: `${fs.kua} · ${groupLabel(fs, locale)}`, ref: fsKuaRef(fs.count) },
      { label: cnWord(locale, "fshDialFacing"), value: `${directionName(home.facingDirection, locale)} · ${chineseLabel(MANSIONS[m.facing], locale, prefs).text}`, ref: fsDirRef(fs.count, home.facingDirection) },
      { label: cnWord(locale, "fshDialSitting"), value: `${directionName(home.sittingDirection, locale)} · ${chineseLabel(MANSIONS[m.sitting], locale, prefs).text}`, ref: fsDirRef(fs.count, home.sittingDirection) },
    ],
    sections: [{ id: "match", title: cnWord(locale, "fshHouseHead"), paragraphs: lines }],
    mark: (prefs.show === "full" ? home.house[prefs.script] : null) ?? home.house.symbol,
    about: about(locale),
  };
}

function mountainReading(c: HomeContext, m: Mountain, locale: string, prefs: Shown): ElementReading {
  const l = chineseLabel(m, locale, prefs);
  const from = norm360(m.degrees - 7.5);
  const to = norm360(m.degrees + 7.5);
  const lead = cnWord(locale, "fshMountainLead", { mountain: l.text, code: mountainCode(m, locale), ord: cnWord(locale, ORD[m.place]), ofDir: dirIn(m.direction, locale, "of"), from: fmtDeg(from, locale), to: fmtDeg(to, locale) });
  const kind =
    m.kind === "stem"
      ? cnWord(locale, "fshKindStem")
      : m.kind === "branch"
        ? cnWord(locale, "fshKindBranch", { animal: chineseLabel(BRANCHES.find((b) => b.id === m.id)!, locale, { ...prefs, show: "names" }).name })
        : cnWord(locale, "fshKindTrigram", { trigram: `${chineseLabel(TRIGRAMS.find((t) => t.id === m.id)!, locale, { ...prefs, show: "names" }).name} ${TRIGRAMS.find((t) => t.id === m.id)!.symbol}`, ofDir: dirIn(m.direction, locale, "of") });
  const here = c.home?.facingMountain.id === m.id ? [cnWord(locale, "fshMountainFacing")] : c.home?.sittingMountain.id === m.id ? [cnWord(locale, "fshMountainSitting")] : [];
  const phase = PHASES.find((p) => p.id === mountainPhase(m))!;
  return {
    id: fshMountainRef(m.id),
    kind: "sign",
    title: l.name,
    kicker: `${mountainCode(m, locale)} · ${directionName(m.direction, locale)}`,
    lead,
    paragraphs: [lead, kind, ...here, cnWord(locale, "fshMountainsAbout")],
    facts: [
      { label: cnWord(locale, "fshMountainCol"), value: l.text },
      { label: cnWord(locale, "fsDirection"), value: `${directionName(m.direction, locale)} · ${mountainCode(m, locale)}` },
      { label: `${cnWord(locale, "fshFromCol")} · ${cnWord(locale, "fshToCol")}`, value: `${fmtDeg(from, locale)} – ${fmtDeg(to, locale)}` },
      { label: cnWord(locale, "bzPhase"), value: chineseLabel(phase, locale, prefs).text },
    ],
    sections: [
      { id: "kind", title: cnWord(locale, "fshMountainCol"), paragraphs: [kind, ...here] },
      { id: "mountains", title: cnWord(locale, "fshMountainsHead"), paragraphs: [cnWord(locale, "fshMountainsAbout")] },
    ],
    mark: (prefs.show === "full" ? m[prefs.script] : null) ?? mountainCode(m, locale),
    about: about(locale),
  };
}

function periodReading(c: HomeContext, locale: string): ElementReading {
  const lead = cnWord(locale, "fshPeriodLead");
  const lines = [...periodLines(c, locale), cnWord(locale, "fshPeriodRenovated")];
  return {
    id: FSH_PERIOD_REF,
    kind: "sign",
    title: c.period ? cnWord(locale, "fshPeriodN", { n: c.period.period }) : cnWord(locale, "fshPeriodHead"),
    kicker: c.period ? `${c.period.from}–${c.period.to}` : cnWord(locale, "fshPeriodHead"),
    lead,
    paragraphs: [lead, ...lines],
    facts: c.period ? [{ label: cnWord(locale, "fshYear"), value: String(c.period.year) }, { label: cnWord(locale, "fshPeriodHead"), value: cnWord(locale, "fshPeriodRange", { n: c.period.period, from: c.period.from, to: c.period.to }) }] : undefined,
    sections: [{ id: "period", title: cnWord(locale, "fshPeriodHead"), paragraphs: lines }],
    mark: "元運",
    about: about(locale),
  };
}

export const howLines = (locale: string): string[] => (["fshStep1", "fshStep2", "fshStep3", "fshStep4"] as const).map((k) => cnWord(locale, k));

function howReading(c: HomeContext, locale: string): ElementReading {
  const lead = cnWord(locale, "fshFacingHint");
  const steps = howLines(locale);
  const decl = c.declination != null ? [`${cnWord(locale, "fshDecl", { place: c.place, deg: fmtDecl(c.declination, locale) })}. ${cnWord(locale, "fshDeclNote")}`] : [];
  return {
    id: FSH_HOW_REF,
    kind: "sign",
    title: cnWord(locale, "fshHowHead"),
    kicker: cnWord(locale, "fshFacingHead"),
    lead,
    paragraphs: [lead, ...steps, cnWord(locale, "fshCheck"), ...decl],
    sections: [
      { id: "steps", title: cnWord(locale, "fshHowHead"), paragraphs: steps.map((s, i) => `${i + 1}. ${s}`) },
      { id: "check", title: cnWord(locale, "fsNoteHead"), paragraphs: [cnWord(locale, "fshCheck"), ...decl] },
    ],
    mark: "羅盤",
    about: about(locale),
  };
}

/** The page's reading of a selection, or null. */
export function homeReading(c: HomeContext, ref: string | null, locale: string, prefs: Shown): ElementReading | null {
  if (!ref) return null;
  if (ref.startsWith("fss:")) return starsReading(c.stars ?? null, ref, locale, prefs);
  if (ref === FSH_HOW_REF) return howReading(c, locale);
  if (ref === FSH_PERIOD_REF) return periodReading(c, locale);
  const mt = /^fsh:mountain:([a-z]+)$/.exec(ref);
  if (mt) return MOUNTAINS.some((m) => m.id === mt[1]) ? mountainReading(c, mountainById(mt[1] as MountainId), locale, prefs) : null;
  if (!c.home) return null;
  if (ref === FSH_FACING_REF) return facingReading(c, c.home, locale, prefs);
  const h = /^fsh:house:(yang|yin)$/.exec(ref);
  if (h) {
    const fs = c.people.find((p) => p.count === h[1]);
    return fs ? houseReading(c, c.home, fs, locale, prefs) : null;
  }
  return null;
}

