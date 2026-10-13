/*
 * What the Flying Stars say on Feng Shui's home page (languages plan, part
 * 23): the chart and how it was cast, each palace with its three stars and
 * their state in the present period, each formation. The star pairs' own
 * readings come with part 27.
 *
 *   fss:main               the main chart, how it was cast, its formations
 *   fss:ti                 the replacement chart (near a mountain's edge)
 *   fss:main:palace:s      a palace's stars
 *   fss:formation:fu-yin   a formation
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { PHASES } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { mountainById, type PeriodId } from "./fengshui-home";
import { dirIn, directionName } from "./fengshui-reading";
import type { DirectionId } from "./fengshui";
import { FLIGHT, LO_SHU_ROWS, starOf, starState, type FlyingChart, type FormationId, type PalaceId, type StarNumber } from "./fengshui-stars";
import { FORMATION_NAMES, FORMATION_TEXTS, STATE_TEXTS } from "./fengshui-stars-texts";
import { said } from "./zodiac-texts";

type Shown = Pick<ChinesePrefs, "script" | "show">;
export type ChartVariant = "main" | "ti";
export type HomeStars = { main: FlyingChart; ti: FlyingChart | null; now: PeriodId };

export const fssChartRef = (v: ChartVariant): string => `fss:${v}`;
export const fssPalaceRef = (v: ChartVariant, p: PalaceId): string => `fss:${v}:palace:${p}`;
export const fssFormationRef = (id: FormationId): string => `fss:formation:${id}`;

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
  const lines = [line("fssMountainStar", x.mountain), line("fssWaterStar", x.water), line("fssPeriodStar", x.period)];
  const states = [...new Set([x.mountain, x.water].map((n) => starState(n, stars.now).state))].map((s) => said(STATE_TEXTS[s], locale));
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "fssMountainStar"), value: starText(x.mountain, locale, prefs) },
    { label: cnWord(locale, "fssWaterStar"), value: starText(x.water, locale, prefs) },
    { label: cnWord(locale, "fssPeriodStar"), value: starText(x.period, locale, prefs) },
    { label: cnWord(locale, "fssBaseCol"), value: String(x.base) },
  ];
  return {
    id: fssPalaceRef(v, p),
    kind: "house",
    title: palaceName(p, locale),
    kicker: `${x.mountain} ${x.water} · ${x.period}${stars.ti ? ` · ${cnWord(locale, v === "ti" ? "fssTi" : "fssMain")}` : ""}`,
    lead,
    paragraphs: [lead, ...lines, ...states, cnWord(locale, "fssStatesNow", { now: stars.now })],
    facts,
    sections: [
      { id: "stars", title: cnWord(locale, "fssHead"), paragraphs: [...lines, cnWord(locale, "fssStatesNow", { now: stars.now })] },
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

/** A Flying Star reading, or null for a ref of another kind. */
export function starsReading(stars: HomeStars | null, ref: string, locale: string, prefs: Shown): ElementReading | null {
  if (!stars || !ref.startsWith("fss:")) return null;
  const f = /^fss:formation:([a-z-]+)$/.exec(ref);
  if (f) return f[1]! in FORMATION_NAMES ? formationReading(f[1] as FormationId, stars, locale, prefs) : null;
  const m = /^fss:(main|ti)(?::palace:(c|n|ne|e|se|s|sw|w|nw))?$/.exec(ref);
  if (!m) return null;
  const v = m[1] as ChartVariant;
  const c = v === "ti" ? stars.ti : stars.main;
  if (!c) return null;
  return m[2] ? palaceReading(v, c, m[2] as PalaceId, stars, locale, prefs) : chartReading(v, c, stars, locale, prefs);
}
