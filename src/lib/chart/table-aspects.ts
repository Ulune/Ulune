/**
 * The Aspects part of the chart table (part 49 of the launch plan): each
 * aspect with its orb beside the orb it is allowed and how strong that makes
 * it, whether it is applying, whether it is out of sign; the twins that an
 * axis makes folded into one row; sorting and filters; and the parallels and
 * contra-parallels of declination. The page, its Copy button and the CSV
 * read from here.
 */
import { aspectName, bodyBare } from "@/lib/i18n/astro";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { aspectsWord, pointsWord } from "@/lib/i18n/table-ui";
import { formatArc } from "@/lib/utils";
import { aspectOrb } from "./constants";
import { aspectHolds, parallelHolds, signHolds } from "./day-checks";
import { aspectWord, chartPoints, phaseWord, POINT_GROUPS, type Cell } from "./table-cells";
import { declinationOf } from "./table-facts";
import { ASPECT_IDS, type AspectId, type AspectLink, type BodyId, type NatalChart, type Placement } from "./types";

/** Parallels and contra-parallels are counted within 1° of declination (Kerykeion allows 1° to 1.5°). */
export const PARALLEL_ORB = 1;

/**
 * The four axes whose two ends are always exactly opposite. An aspect to one
 * end is an aspect to the other: Uranus trine the Ascendant is Uranus
 * sextile the Descendant, the same fact seen from the other end.
 */
const AXIS: Record<string, { head: BodyId; tail: boolean }> = {
  ascendant: { head: "ascendant", tail: false },
  descendant: { head: "ascendant", tail: true },
  midheaven: { head: "midheaven", tail: false },
  ic: { head: "midheaven", tail: true },
  northnode: { head: "northnode", tail: false },
  southnode: { head: "northnode", tail: true },
  vertex: { head: "vertex", tail: false },
  antivertex: { head: "vertex", tail: true },
};

/** The angles and the Vertex: what the "Angles" filter takes out. */
const ANGLE_POINTS = new Set<string>(["ascendant", "midheaven", "descendant", "ic", "vertex", "antivertex"]);

const ANGLE_OF: Record<AspectId, number> = {
  conjunction: 0,
  opposition: 180,
  trine: 120,
  square: 90,
  sextile: 60,
  quincunx: 150,
  semisextile: 30,
  semisquare: 45,
  quintile: 72,
};

/** How many signs apart two bodies in this aspect stand when it is in sign. */
const SIGN_STEPS: Partial<Record<AspectId, number>> = {
  conjunction: 0,
  semisextile: 1,
  sextile: 2,
  square: 3,
  trine: 4,
  quincunx: 5,
  opposition: 6,
};

const tails = (id: string) => (AXIS[id]?.tail ? 1 : 0);

/** The key shared by an aspect and its twins: each axis end named by its head, the angle turned for each tail. */
export function twinKey(a: string, b: string, angle: number): string {
  const flips = tails(a) + tails(b);
  const turned = flips % 2 ? 180 - angle : angle;
  return `${[AXIS[a]?.head ?? a, AXIS[b]?.head ?? b].sort().join("|")}|${turned}`;
}

/** Signs apart, 0 to 6. */
function signsApart(lonA: number, lonB: number): number {
  const d = Math.abs(Math.floor((((lonA % 360) + 360) % 360) / 30) - Math.floor((((lonB % 360) + 360) % 360) / 30));
  return Math.min(d, 12 - d);
}

/**
 * Out of sign (dissociate): the degrees make the aspect but the signs do
 * not, as a trine from 29° Aries to 1° Virgo. The semisquare and the
 * quintile have no sign of their own to fall in: null.
 */
export function isOutOfSign(type: AspectId, lonA: number, lonB: number): boolean | null {
  const want = SIGN_STEPS[type];
  return want == null ? null : signsApart(lonA, lonB) !== want;
}

/** The orb an aspect is allowed ("8°", "2°30'"). */
export function allowedText(allowed: number): string {
  return Number.isInteger(allowed) ? `${allowed}°` : formatArc(allowed);
}

function pointMap(chart: NatalChart): Map<string, Placement> {
  return new Map(chartPoints(chart).map((p) => [p.id as string, p]));
}

export type AspectSort = "orb" | "body" | "aspect";

export type AspectOptions = {
  sort: AspectSort;
  /** Show the minor aspects. */
  minors: boolean;
  /** Show the aspects to the angles and the Vertex. */
  angles: boolean;
  /** List each twin on its own row. */
  unfold: boolean;
};

export const DEFAULT_ASPECT_OPTIONS: AspectOptions = { sort: "orb", minors: true, angles: true, unfold: false };

export type AspectTableRow = {
  aspect: AspectLink;
  pair: string;
  type: string;
  minor: boolean;
  orb: string;
  /** The orb it is allowed. */
  allowed: string;
  /** 1 when exact, 0 at the edge of its orb. */
  strength: number;
  phase: string;
  outOfSign: Cell | null;
  /** The same aspect seen from the other end of an axis, folded into this row. */
  twins: AspectLink[];
  /** It may be out of orb, or perfect, at another hour of the birth day. */
  uncertain: boolean;
};

/** "Uranus sextile Descendant". */
export function aspectPhrase(a: Pick<AspectLink, "a" | "b" | "type">, locale: AppLocale): string {
  return `${bodyBare(a.a, locale)} ${aspectWord(a.type, locale)} ${bodyBare(a.b, locale)}`;
}

export function aspectTableRow(a: AspectLink, chart: NatalChart, locale: AppLocale, twins: AspectLink[] = [], points = pointMap(chart)): AspectTableRow {
  const allowed = aspectOrb(a.type, a.a, a.b);
  const pa = points.get(a.a);
  const pb = points.get(a.b);
  const out = pa && pb ? isOutOfSign(a.type, pa.ecliptic, pb.ecliptic) : null;
  return {
    aspect: a,
    pair: `${bodyBare(a.a, locale)} · ${bodyBare(a.b, locale)}`,
    type: aspectName(a.type, locale),
    minor: a.level === "minor",
    orb: formatArc(a.orb),
    allowed: allowedText(allowed),
    strength: Math.max(0, Math.min(1, 1 - a.orb / allowed)),
    phase: phaseWord(a.applying, locale),
    outOfSign: out ? { text: aspectsWord(locale, "outOfSign"), uncertain: !(pa && pb && signHolds(chart, pa) && signHolds(chart, pb)) } : null,
    twins,
    uncertain: !aspectHolds(chart, a),
  };
}

/** Each body's place in the Points order: the sort by body follows the table. */
function bodyRank(): Map<string, number> {
  const rank = new Map<string, number>();
  for (const g of POINT_GROUPS) for (const id of g.ids) rank.set(id, rank.size);
  return rank;
}

function involvesAngle(a: Pick<AspectLink, "a" | "b">): boolean {
  return ANGLE_POINTS.has(a.a) || ANGLE_POINTS.has(a.b);
}

/** Groups of twins, each with its representative first: the end of each axis that names it (ASC, MC, the North Node, the Vertex). */
export function twinGroups(aspects: readonly AspectLink[]): AspectLink[][] {
  const groups = new Map<string, AspectLink[]>();
  for (const a of aspects) {
    const key = twinKey(a.a, a.b, ANGLE_OF[a.type]);
    const g = groups.get(key);
    if (g) g.push(a);
    else groups.set(key, [a]);
  }
  return [...groups.values()].map((g) => [...g].sort((x, y) => tails(x.a) + tails(x.b) - (tails(y.a) + tails(y.b))));
}

function compareBy(sort: AspectSort, rank: Map<string, number>) {
  const r = (id: string) => rank.get(id) ?? 999;
  const byOrb = (x: AspectLink, y: AspectLink) => x.orb - y.orb;
  // The majors first, each level tightest first (as the chart lists them).
  const byLevel = (x: AspectLink, y: AspectLink) => (x.level === y.level ? 0 : x.level === "major" ? -1 : 1);
  if (sort === "body") {
    return (x: AspectLink, y: AspectLink) =>
      Math.min(r(x.a), r(x.b)) - Math.min(r(y.a), r(y.b)) || Math.max(r(x.a), r(x.b)) - Math.max(r(y.a), r(y.b)) || byOrb(x, y);
  }
  if (sort === "aspect") return (x: AspectLink, y: AspectLink) => ASPECT_IDS.indexOf(x.type) - ASPECT_IDS.indexOf(y.type) || byOrb(x, y);
  return (x: AspectLink, y: AspectLink) => byLevel(x, y) || byOrb(x, y);
}

/**
 * The rows of the Aspects part: filtered, twins folded (unless unfolded),
 * sorted. `total` counts every aspect of the chart.
 */
export function aspectTableRows(
  chart: NatalChart,
  locale: AppLocale,
  opts: AspectOptions = DEFAULT_ASPECT_OPTIONS,
): { rows: AspectTableRow[]; total: number; shown: number; folded: number } {
  const points = pointMap(chart);
  const shown = chart.aspects.filter((a) => (opts.minors || a.level === "major") && (opts.angles || !involvesAngle(a)));
  const sorted = [...shown].sort(compareBy(opts.sort, bodyRank()));
  let rows: AspectTableRow[];
  let folded = 0;
  if (opts.unfold) {
    rows = sorted.map((a) => aspectTableRow(a, chart, locale, [], points));
  } else {
    const twinsOf = new Map<AspectLink, AspectLink[]>();
    const hidden = new Set<AspectLink>();
    for (const g of twinGroups(shown)) {
      const [head, ...rest] = g;
      if (!head || !rest.length) continue;
      twinsOf.set(head, rest);
      for (const t of rest) hidden.add(t);
      folded += rest.length;
    }
    rows = sorted.filter((a) => !hidden.has(a)).map((a) => aspectTableRow(a, chart, locale, twinsOf.get(a) ?? [], points));
  }
  return { rows, total: chart.aspects.length, shown: shown.length, folded };
}

/** "Sun trine Moon · orb 1°12' of 8° · applying · minor · out of sign (also …)". */
export function aspectTableRowText(r: AspectTableRow, locale: AppLocale): string {
  const a = r.aspect;
  const bits = [
    `${r.uncertain ? "~" : ""}${aspectPhrase(a, locale)}`,
    pointsWord(locale, "orb", { arc: aspectsWord(locale, "orbOf", { orb: r.orb, allowed: r.allowed }) }),
  ];
  if (a.applying != null) bits.push(r.phase);
  if (r.minor) bits.push(translate(locale, "tableAspectMinor"));
  if (r.outOfSign) bits.push(`${r.outOfSign.uncertain ? "~" : ""}${r.outOfSign.text}`);
  if (r.twins.length) bits.push(aspectsWord(locale, "also", { list: r.twins.map((t) => aspectPhrase(t, locale)).join(", ") }));
  return bits.join(" · ");
}

/* ── Parallels ──────────────────────────────────────────────────────── */

export type ParallelKind = "parallel" | "contra";

export type Parallel = {
  id: string;
  a: BodyId;
  b: BodyId;
  kind: ParallelKind;
  /** The difference of the two declinations' sizes (degrees). */
  orb: number;
  declA: number;
  declB: number;
  /** Without a birth time: it may not hold at another hour of the day. */
  uncertain: boolean;
};

/** The points that have a declination worth pairing: every body, point and angle but the lots. */
function declinationPoints(chart: NatalChart): { p: Placement; decl: number }[] {
  const out: { p: Placement; decl: number }[] = [];
  const rank = bodyRank();
  const points = [...chartPoints(chart)].sort((x, y) => (rank.get(x.id) ?? 999) - (rank.get(y.id) ?? 999));
  for (const p of points) {
    if (p.id === "fortune" || p.id === "spirit") continue;
    const decl = declinationOf(p, chart);
    if (decl != null) out.push({ p, decl });
  }
  return out;
}

/**
 * Parallels (both on one side of the equator) and contra-parallels (one each
 * side) within 1°: two declinations of the same size. The two ends of an axis
 * are not paired with each other (the Ascendant is always contra-parallel
 * the Descendant). Tightest first.
 */
export function parallelsOf(chart: NatalChart): Parallel[] {
  const list = declinationPoints(chart);
  const out: Parallel[] = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const x = list[i];
      const y = list[j];
      if (!x || !y) continue;
      const ax = AXIS[x.p.id];
      if (ax && ax.head === AXIS[y.p.id]?.head) continue;
      const orb = Math.abs(Math.abs(x.decl) - Math.abs(y.decl));
      if (orb > PARALLEL_ORB) continue;
      const kind: ParallelKind = Math.sign(x.decl) === Math.sign(y.decl) ? "parallel" : "contra";
      out.push({
        id: `${x.p.id}|${kind}|${y.p.id}`,
        a: x.p.id,
        b: y.p.id,
        kind,
        orb,
        declA: x.decl,
        declB: y.decl,
        uncertain: !parallelHolds(chart, x.p, y.p, x.decl, y.decl),
      });
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** The key shared by a parallel and its twins: the kind turns at each axis tail. */
function parallelTwinKey(p: Parallel): string {
  const flips = tails(p.a) + tails(p.b);
  const kind = flips % 2 ? (p.kind === "parallel" ? "contra" : "parallel") : p.kind;
  return `${[AXIS[p.a]?.head ?? p.a, AXIS[p.b]?.head ?? p.b].sort().join("|")}|${kind}`;
}

export type ParallelRow = Parallel & { twins: Parallel[] };

/** The parallels for the page: the angles and the Vertex left out on request, twins folded unless unfolded. */
export function parallelRows(chart: NatalChart, opts: Pick<AspectOptions, "angles" | "unfold"> = DEFAULT_ASPECT_OPTIONS): ParallelRow[] {
  const all = parallelsOf(chart).filter((p) => opts.angles || !involvesAngle(p));
  if (opts.unfold) return all.map((p) => ({ ...p, twins: [] }));
  const groups = new Map<string, Parallel[]>();
  for (const p of all) {
    const key = parallelTwinKey(p);
    const g = groups.get(key);
    if (g) g.push(p);
    else groups.set(key, [p]);
  }
  const rows: ParallelRow[] = [];
  for (const g of groups.values()) {
    const [head, ...rest] = [...g].sort((x, y) => tails(x.a) + tails(x.b) - (tails(y.a) + tails(y.b)));
    if (head) rows.push({ ...head, twins: rest });
  }
  return rows.sort((x, y) => x.orb - y.orb);
}

/** "Sun contra-parallel Uranus". */
export function parallelPhrase(p: Pick<Parallel, "a" | "b" | "kind">, locale: AppLocale): string {
  return `${bodyBare(p.a, locale)} ${aspectsWord(locale, p.kind === "parallel" ? "parallel" : "contra")} ${bodyBare(p.b, locale)}`;
}

/** "Sun contra-parallel Uranus · orb 0°12' of 1° · +23°18' / −23°30'". */
export function parallelRowText(p: ParallelRow, locale: AppLocale, decl: (x: number) => string): string {
  const bits = [
    `${p.uncertain ? "~" : ""}${parallelPhrase(p, locale)}`,
    pointsWord(locale, "orb", { arc: aspectsWord(locale, "orbOf", { orb: formatArc(p.orb), allowed: allowedText(PARALLEL_ORB) }) }),
    `${decl(p.declA)} / ${decl(p.declB)}`,
  ];
  if (p.twins.length) bits.push(aspectsWord(locale, "also", { list: p.twins.map((t) => parallelPhrase(t, locale)).join(", ") }));
  return bits.join(" · ");
}
