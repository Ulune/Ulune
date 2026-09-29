/**
 * The Dignities part of the chart table (part 50 of the launch plan): the
 * chart ruler and its condition, each traditional planet with the rulers of
 * its degree and its own dignities (Lilly's points), the dispositor chains
 * and final dispositors, the mutual receptions. Traditional rulerships
 * throughout (the seven planets), as the dignity tables are; the chart
 * ruler is also given by the modern rulers. The page, its Copy button and
 * the CSV read from here.
 */
import { bodyBare, bodyPrep, bodyThe, planetName, signName } from "@/lib/i18n/astro";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { angleShort, dignitiesWord, pointsWord } from "@/lib/i18n/table-ui";
import { formatArc } from "@/lib/utils";
import { EXALTATION, TRADITIONAL_RULER } from "./constants";
import { signHolds } from "./day-checks";
import { essentialDignity, TRADITIONAL_PLANETS, type DegreeRulers, type TraditionalPlanet } from "./dignities";
import { aspectWord, colon, dignityCell, motionOf, type Cell, type DignityCell } from "./table-cells";
import { twinGroups } from "./table-aspects";
import { nearestAngle } from "./table-facts";
import type { ChartPatterns, NatalChart, Placement, PlanetId } from "./types";

/* ── The dignity table ─────────────────────────────────────────────── */

export type DignityRow = {
  planet: TraditionalPlanet;
  point: Placement;
  /** Who rules its degree: domicile, exaltation, triplicity (day, night, participating), term, face; detriment and fall. */
  rulers: DegreeRulers;
  /** Its own dignities and debilities, in words, with Lilly's points. */
  dignity: DignityCell;
  /** The triplicity ruler of the chart's sect (scored): the day ruler by day, the night ruler by night. */
  sectTriplicity: 0 | 1;
  /** In sect, out of sect; null for Mercury without a morning or evening (never) or without a birth time. */
  sect: Cell | null;
};

/** The seven planets, each with the rulers of its degree and its own dignities. */
export function dignityRows(chart: NatalChart, patterns: ChartPatterns, locale: AppLocale): DignityRow[] {
  const unknown = chart.meta.timeUnknown === true;
  const rows: DignityRow[] = [];
  for (const planet of TRADITIONAL_PLANETS) {
    const p = chart.planets.find((x) => x.id === planet);
    if (!p) continue;
    const d = essentialDignity(planet, p.ecliptic, patterns.isDay);
    const cell = dignityCell(p, patterns.isDay, chart, locale);
    if (!cell) continue;
    const inSect = patterns.flags[planet]?.inSect;
    rows.push({
      planet,
      point: p,
      rulers: d.rulers,
      dignity: cell,
      sectTriplicity: patterns.isDay ? 0 : 1,
      sect:
        inSect == null
          ? null
          : { text: translate(locale, inSect ? "inSect" : "outOfSect"), uncertain: unknown },
    });
  }
  return rows;
}

/** "Venus +8, Mercury +7, Saturn +7…": the planets by Lilly's points, strongest first (ties in the planets' order). */
export function strongestLine(rows: readonly DignityRow[], locale: AppLocale): Cell {
  const sorted = [...rows].sort((a, b) => b.dignity.score - a.dignity.score || TRADITIONAL_PLANETS.indexOf(a.planet) - TRADITIONAL_PLANETS.indexOf(b.planet));
  return {
    text: sorted.map((r) => `${bodyBare(r.planet, locale)} ${r.dignity.scoreText}`).join(", "),
    uncertain: sorted.some((r) => r.dignity.uncertain),
  };
}

/* ── Dispositors ───────────────────────────────────────────────────── */

/** The planets whose dispositors are followed: the ten, each disposed by the traditional ruler of its sign. */
const DISPOSED: readonly PlanetId[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

export type DispositorChain = {
  /** The planet, then each ruler in turn, to the final dispositor or round a loop (the loop's first planet again). */
  path: PlanetId[];
  end: "final" | "loop";
  /** A planet on the way may change sign at another hour of the birth day. */
  uncertain: boolean;
};

export type Dispositors = {
  /** Planets in their own sign: the chains end there. */
  finals: PlanetId[];
  /** Each planet that is not a final dispositor, and where its chain goes. */
  chains: DispositorChain[];
  /** Planets disposing each other in a ring (two: a mutual reception by sign). */
  loops: PlanetId[][];
  /** One final dispositor for the whole chart: every chain ends there. */
  single: PlanetId | null;
};

export function dispositorsOf(chart: NatalChart): Dispositors {
  const byId = new Map(chart.planets.map((p) => [p.id as string, p]));
  const rulerOf = (id: PlanetId): PlanetId | null => {
    const p = byId.get(id);
    return p ? TRADITIONAL_RULER[p.sign] : null;
  };
  const holds = (id: PlanetId) => {
    const p = byId.get(id);
    return p ? signHolds(chart, p) : false;
  };
  const present = DISPOSED.filter((id) => byId.has(id));
  const finals = present.filter((id) => rulerOf(id) === id);
  const chains: DispositorChain[] = [];
  const loopKeys = new Set<string>();
  const loops: PlanetId[][] = [];
  for (const id of present) {
    if (finals.includes(id)) continue;
    const path: PlanetId[] = [id];
    let end: DispositorChain["end"] = "final";
    for (;;) {
      const last = path[path.length - 1] as PlanetId;
      const next = rulerOf(last);
      if (!next) break;
      if (next === last) break;
      const seen = path.indexOf(next);
      if (seen >= 0) {
        path.push(next);
        end = "loop";
        const ring = path.slice(seen, -1);
        const key = [...ring].sort().join("|");
        if (!loopKeys.has(key)) {
          loopKeys.add(key);
          loops.push(ring);
        }
        break;
      }
      path.push(next);
    }
    chains.push({ path, end, uncertain: !path.every(holds) });
  }
  const ends = new Set(chains.filter((c) => c.end === "final").map((c) => c.path[c.path.length - 1]));
  const single = finals.length === 1 && loops.length === 0 && [...ends].every((e) => e === finals[0]) ? (finals[0] ?? null) : null;
  return { finals, chains, loops, single };
}

/* ── Mutual receptions ─────────────────────────────────────────────── */

export type ReceptionKind = "domicile" | "exaltation" | "mixed";

export type MutualReception = {
  a: TraditionalPlanet;
  b: TraditionalPlanet;
  kind: ReceptionKind;
  uncertain: boolean;
};

const exaltedIn = (planet: TraditionalPlanet) => EXALTATION[planet];

/**
 * Two planets each in a sign of the other's: by domicile (each in the
 * other's sign), by exaltation (each in the other's exaltation), or mixed
 * (one in the other's sign, the other in the first's exaltation).
 */
export function mutualReceptions(chart: NatalChart): MutualReception[] {
  const planets = TRADITIONAL_PLANETS.map((id) => chart.planets.find((p) => p.id === id)).filter((p): p is Placement => Boolean(p));
  const out: MutualReception[] = [];
  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const pa = planets[i];
      const pb = planets[j];
      if (!pa || !pb) continue;
      const a = pa.id as TraditionalPlanet;
      const b = pb.id as TraditionalPlanet;
      const aInB = { dom: TRADITIONAL_RULER[pa.sign] === b, exa: exaltedIn(b) === pa.sign };
      const bInA = { dom: TRADITIONAL_RULER[pb.sign] === a, exa: exaltedIn(a) === pb.sign };
      let kind: ReceptionKind | null = null;
      if (aInB.dom && bInA.dom) kind = "domicile";
      else if (aInB.exa && bInA.exa) kind = "exaltation";
      else if ((aInB.dom && bInA.exa) || (aInB.exa && bInA.dom)) kind = "mixed";
      if (kind) out.push({ a, b, kind, uncertain: !(signHolds(chart, pa) && signHolds(chart, pb)) });
    }
  }
  return out;
}

/** "the Moon in Pisces, Jupiter's sign; Jupiter in Cancer, the Moon's". */
export function receptionDetail(r: MutualReception, chart: NatalChart, locale: AppLocale): string {
  const pa = chart.planets.find((p) => p.id === r.a);
  const pb = chart.planets.find((p) => p.id === r.b);
  if (!pa || !pb) return "";
  const how = (p: Placement, other: TraditionalPlanet) =>
    dignitiesWord(locale, TRADITIONAL_RULER[p.sign] === other ? "inSignOf" : "inExaltationOf", {
      planet: bodyThe(p.id, locale, true),
      sign: signName(p.sign, locale),
      other: bodyThe(other, locale),
      ofOther: bodyPrep(other, "de"),
    });
  return `${how(pa, r.b)}${locale === "fr" ? " ; " : "; "}${how(pb, r.a)}`;
}

/* ── The chart ruler ───────────────────────────────────────────────── */

export type ChartRulerFact = {
  planet: PlanetId;
  /** Traditional, modern, or both (the same planet). */
  by: "both" | "traditional" | "modern";
  /** "Mercury in Gemini, house 10". */
  where: Cell;
  /** Its dignities and score, when it is one of the seven. */
  dignity: DignityCell | null;
  /** In sect, swift, how far from an angle… */
  notes: Cell[];
  /** Its major aspects, tightest first: "square Ascendant 0°24'". */
  aspects: Cell[];
};

/** The ruler of the rising sign, traditional and modern (one fact when they are the same planet). */
export function chartRulerFacts(chart: NatalChart, patterns: ChartPatterns, locale: AppLocale): ChartRulerFact[] {
  const unknown = chart.meta.timeUnknown === true;
  const trad = patterns.chartRulerTraditional ?? patterns.chartRuler;
  const modern = patterns.chartRulerModern ?? trad;
  const ids: { planet: PlanetId; by: ChartRulerFact["by"] }[] =
    trad === modern ? [{ planet: trad, by: "both" }] : [{ planet: trad, by: "traditional" }, { planet: modern, by: "modern" }];
  const out: ChartRulerFact[] = [];
  for (const { planet, by } of ids) {
    const p = chart.planets.find((x) => x.id === planet);
    if (!p) continue;
    const notes: Cell[] = [];
    const inSect = patterns.flags[planet]?.inSect;
    if (inSect != null) notes.push({ text: translate(locale, inSect ? "inSect" : "outOfSect"), uncertain: unknown });
    const motion = motionOf(p, patterns.flags[planet], locale);
    if (motion?.words.length) notes.push({ text: motion.words.join(", "), uncertain: false });
    const near = nearestAngle(p.ecliptic, chart.angles);
    if (near) notes.push({ text: pointsWord(locale, "angularBy", { arc: formatArc(near.distance), angle: angleShort(locale, near.id) }), uncertain: unknown });
    // Mirrors (the Descendant's square beside the Ascendant's) are left out: the first end names the axis.
    const mirrors = new Set(twinGroups(chart.aspects).flatMap((g) => g.slice(1)));
    const aspects = chart.aspects
      .filter((a) => a.level === "major" && (a.a === planet || a.b === planet) && !mirrors.has(a))
      .sort((x, y) => x.orb - y.orb)
      .map((a) => ({
        text: `${aspectWord(a.type, locale)} ${bodyBare(a.a === planet ? a.b : a.a, locale)} ${formatArc(a.orb)}`,
        uncertain: unknown,
      }));
    out.push({
      planet,
      by,
      where: {
        text: translate(locale, "chartRulerDetail", { planet: planetName(planet, locale), sign: signName(p.sign, locale), house: String(p.house) }),
        // The chart ruler is the ruler of the rising sign, which needs the time.
        uncertain: unknown,
      },
      dignity: dignityCell(p, patterns.isDay, chart, locale),
      notes,
      aspects,
    });
  }
  return out;
}

/* ── As text ───────────────────────────────────────────────────────── */

const mark = (on: boolean) => (on ? "~" : "");

/** The Dignities part as lines of text: the chart ruler, the table, the dispositors, the receptions. */
export function dignitiesText(chart: NatalChart, patterns: ChartPatterns, locale: AppLocale): string[] {
  const lines: string[] = [];
  const name = (id: string) => bodyBare(id, locale);
  for (const r of chartRulerFacts(chart, patterns, locale)) {
    const bits = [
      `${dignitiesWord(locale, r.by === "both" ? "rulerBoth" : r.by === "traditional" ? "rulerTraditional" : "rulerModern")}${colon(locale)}${mark(r.where.uncertain)}${r.where.text}`,
    ];
    if (r.dignity) bits.push(`${mark(r.dignity.uncertain)}${r.dignity.label} ${r.dignity.scoreText}`);
    for (const n of r.notes) bits.push(`${mark(n.uncertain)}${n.text}`);
    if (r.aspects.length) bits.push(`${mark(r.aspects.some((a) => a.uncertain))}${r.aspects.map((a) => a.text).join(", ")}`);
    lines.push(bits.join(" · "));
  }
  const rows = dignityRows(chart, patterns, locale);
  for (const r of rows) {
    const t = r.rulers.triplicity;
    const bits = [
      name(r.planet),
      dignitiesWord(locale, "rulersLine", {
        domicile: name(r.rulers.domicile),
        exaltation: r.rulers.exaltation ? name(r.rulers.exaltation) : translate(locale, "flagNo"),
        day: name(t[0]),
        night: name(t[1]),
        part: name(t[2]),
        term: name(r.rulers.term),
        face: name(r.rulers.face),
        detriment: name(r.rulers.detriment),
        fall: r.rulers.fall ? name(r.rulers.fall) : translate(locale, "flagNo"),
      }),
      `${mark(r.dignity.uncertain)}${r.dignity.label} ${r.dignity.scoreText}`,
    ];
    if (r.sect) bits.push(`${mark(r.sect.uncertain)}${r.sect.text}`);
    lines.push(bits.join(" · "));
  }
  const strongest = strongestLine(rows, locale);
  lines.push(`${dignitiesWord(locale, "strongest")}${colon(locale)}${mark(strongest.uncertain)}${strongest.text}`);
  const d = dispositorsOf(chart);
  lines.push(
    `${dignitiesWord(locale, d.single ? "finalOne" : "finals")}${colon(locale)}${d.finals.length ? d.finals.map(name).join(", ") : translate(locale, "flagNo")}`,
  );
  for (const c of d.chains) {
    lines.push(`${mark(c.uncertain)}${c.path.map(name).join(" → ")}${c.end === "loop" ? ` (${dignitiesWord(locale, "loop")})` : ""}`);
  }
  const receptions = mutualReceptions(chart);
  if (receptions.length) {
    for (const r of receptions) {
      lines.push(`${mark(r.uncertain)}${name(r.a)} ⇄ ${name(r.b)} · ${dignitiesWord(locale, r.kind === "domicile" ? "byDomicile" : r.kind === "exaltation" ? "byExaltation" : "byMixed")} (${receptionDetail(r, chart, locale)})`);
    }
  } else {
    lines.push(dignitiesWord(locale, "noReceptions"));
  }
  return lines;
}
