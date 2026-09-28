/**
 * The chart table as text (part by part, for the Copy buttons) and as CSV.
 * Both read the same cells as the table page (table-cells.ts): the same
 * words, the same numbers, the same ~ where the birth time is unknown. The
 * CSV keeps full decimals for other programs.
 */
import { hydratePatterns } from "./patterns";
import { CLASSIC_BODIES } from "./constants";
import { isRough, signsHold } from "./day-checks";
import {
  aspectRow,
  aspectRowText,
  balanceGroups,
  balanceGroupText,
  cellText,
  chartFactLine,
  chartFacts,
  chartPoints,
  groupedPoints,
  hasLatitude,
  houseLine,
  patternSections,
  pointRow,
  pointRowText,
  rankingFacts,
  type PointRow,
} from "./table-cells";
import { armcOf, localSiderealHours, moonPhase, nearestAngle, outOfBoundsBy, separation } from "./table-facts";
import type { NatalChart } from "./types";
import { bodyBare } from "@/lib/i18n/astro";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { pointsGroupLabel, pointsText, tablePartLabel, unknownTimeNote } from "@/lib/i18n/table-ui";
import { formatDegreeSeconds, formatHms } from "@/lib/utils";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export { chartPoints };

/** The parts of the text copy, in the table page's order (the grid has none). */
export type ChartTextPartId = "identity" | "points" | "houses" | "aspects" | "patterns" | "balance" | "ranking";
export type ChartTextPart = { id: ChartTextPartId; lines: string[] };

/**
 * The table as text, part by part: each part starts with its title. The
 * table page's Copy buttons use one part each; Copy as text joins them all.
 */
export function chartTextParts(chart: NatalChart, locale: AppLocale): ChartTextPart[] {
  const unknown = chart.meta.timeUnknown === true;
  const patterns = hydratePatterns(chart);
  const parts: ChartTextPart[] = [];
  let lines: string[] = [];
  const start = (id: ChartTextPartId) => {
    lines = [tablePartLabel(locale, id)];
    parts.push({ id, lines });
  };
  const push = (s: string) => lines.push(s);

  start("identity");
  for (const f of chartFacts(chart, patterns.isDay, locale)) push(chartFactLine(f));

  start("points");
  if (unknown) push(pointsText(locale, "needsTime"));
  for (const g of groupedPoints(chart)) {
    push(pointsGroupLabel(locale, g.id));
    for (const p of g.rows) push(pointRowText(pointRow(p, chart, patterns, locale), locale));
  }

  start("houses");
  if (unknown) push(unknownTimeNote(locale, "houses"));
  for (const h of chart.houses) push(houseLine(h, chart, locale));

  start("aspects");
  if (unknown) push(unknownTimeNote(locale, "aspects"));
  for (const a of chart.aspects) push(aspectRowText(aspectRow(a, chart, locale), locale));

  start("patterns");
  if (unknown) push(unknownTimeNote(locale, "patterns"));
  for (const s of patternSections(chart, patterns, locale)) {
    if (s.id === "voc" || s.id === "unaspected" || s.id === "retrogrades") {
      // One line each: "Title: what it says".
      const item = s.items[0];
      push(`${s.title}: ${item ? cellText(item) : s.none}`);
      continue;
    }
    push(s.title);
    if (s.items.length) for (const item of s.items) push(cellText(item));
    else push(s.none);
  }

  start("balance");
  if (unknown) push(unknownTimeNote(locale, "balance"));
  for (const g of balanceGroups(chart, patterns, locale)) push(balanceGroupText(g));

  start("ranking");
  if (unknown) push(unknownTimeNote(locale, "ranking"));
  const r = rankingFacts(chart, patterns, locale);
  if (r.ruler) push(`${translate(locale, "chartRulerHead")}: ${cellText(r.ruler)}${r.ruler.aspects ? ` (${r.ruler.aspects})` : ""}`);
  if (r.tightest) push(`${translate(locale, "tightestHead")}: ${cellText(r.tightest)}`);
  push(`${translate(locale, "rankingHead")}:`);
  r.rows.forEach((row, i) => push(`${i + 1}. ${cellText(row)}`));
  push(`${translate(locale, "dominantHead")}: ${cellText(r.dominant)}`);

  return parts;
}

/** The whole table as text: every part, a blank line between them. */
export function formatChartTableText(chart: NatalChart, locale: AppLocale): string {
  return chartTextParts(chart, locale)
    .map((p) => p.lines.join("\n"))
    .join("\n\n");
}

const num = (x: number | null | undefined, digits = 6) => (x != null && Number.isFinite(x) ? x.toFixed(digits) : "");
const bit = (x: boolean | null | undefined) => (x ? "1" : "0");

export function formatChartTableCsv(chart: NatalChart, locale: AppLocale): string {
  const patterns = hydratePatterns(chart);
  const unknown = chart.meta.timeUnknown === true;
  const rows: string[][] = [];
  const add = (row: string[]) => rows.push(row.map(csvEscape));

  add(["section", "field", "value"]);
  add(["identity", "name", chart.meta.name]);
  add(["identity", "date", chart.meta.date]);
  add(["identity", "time", unknown ? "" : chart.meta.time]);
  add(["identity", "timeUnknown", bit(unknown)]);
  if (unknown) add(["identity", "castAt", chart.meta.time]);
  add(["identity", "timezone", chart.meta.timezone]);
  if (chart.meta.birthTime) {
    add(["identity", "utcOffset", chart.meta.birthTime.offsetLabel.replace("−", "-")]);
    add(["identity", "zoneAbbr", chart.meta.birthTime.abbr]);
    add(["identity", "summerTime", chart.meta.birthTime.dst ? "yes" : "no"]);
    add(["identity", "timeBasis", chart.meta.birthTime.basis]);
    if (chart.meta.birthTime.calendar === "julian") add(["identity", "calendar", "julian"]);
  }
  add(["identity", "place", chart.meta.placeLabel]);
  add(["identity", "latitude", chart.meta.latitude.toFixed(4)]);
  add(["identity", "longitude", chart.meta.longitude.toFixed(4)]);
  add(["identity", "houseSystem", chart.meta.houseSystem]);
  if (chart.meta.houseSystemRequested) add(["identity", "houseSystemRequested", chart.meta.houseSystemRequested]);
  add(["identity", "sect", unknown ? "" : patterns.isDay ? "day" : "night"]);
  if (chart.meta.sunAltitude != null) add(["identity", "sunAltitude", num(chart.meta.sunAltitude)]);
  add(["identity", "utc", chart.meta.utc]);
  if (chart.meta.jdUt != null) add(["identity", "jdUt", chart.meta.jdUt.toFixed(6)]);
  if (chart.meta.deltaT != null) add(["identity", "deltaT", chart.meta.deltaT.toFixed(2)]);
  const armc = armcOf(chart);
  const lst = localSiderealHours(chart);
  if (armc != null) add(["identity", "armc", num(armc)]);
  if (lst != null) add(["identity", "localSiderealTime", formatHms(lst)]);
  if (chart.meta.obliquity != null) add(["identity", "obliquity", num(chart.meta.obliquity)]);
  const sun = chart.planets.find((p) => p.id === "sun");
  const moon = chart.planets.find((p) => p.id === "moon");
  if (sun && moon) {
    const phase = moonPhase(sun.ecliptic, moon.ecliptic, moon.latitude ?? 0);
    add(["identity", "moonPhase", phase.phase]);
    add(["identity", "moonPhaseAngle", num(phase.angle)]);
    add(["identity", "moonLit", num(phase.lit, 4)]);
  }

  add([]);
  add([
    "point",
    "id",
    "name",
    "group",
    "sign",
    "house",
    "longitude",
    "formatted",
    "speed",
    "direction",
    "stationary",
    "swift",
    "slow",
    "stationUtc",
    "stationTurns",
    "rx",
    "latitude",
    "declination",
    "oob",
    "oobBy",
    "dignity",
    "dignities",
    "dignityScore",
    "peregrine",
    "combust",
    "cazimi",
    "sunDistance",
    "angular",
    "angle",
    "angleDistance",
    "anaretic",
    "ariesPoint",
    "inSect",
    "unaspected",
    "uncertain",
    "dayFrom",
    "dayTo",
  ]);
  const groupOf = new Map<string, string>();
  for (const g of groupedPoints(chart)) for (const p of g.rows) groupOf.set(p.id, g.id);
  for (const p of chartPoints(chart)) {
    const flag = patterns.flags[p.id];
    const row: PointRow = pointRow(p, chart, patterns, locale);
    const near = p.kind !== "angle" ? nearestAngle(p.ecliptic, chart.angles) : null;
    const range = chart.meta.dayRange?.[p.id as keyof NonNullable<NatalChart["meta"]["dayRange"]>];
    add([
      "point",
      p.id,
      bodyBare(p.id, locale),
      groupOf.get(p.id) ?? "",
      p.sign,
      String(p.house),
      p.ecliptic.toFixed(6),
      formatDegreeSeconds(p.ecliptic),
      row.motion && p.speed != null ? p.speed.toFixed(6) : "",
      row.motion ? (p.retrograde ? "Rx" : "D") : "",
      bit(flag?.stationary),
      bit(flag?.fast),
      bit(flag?.slow),
      p.station?.utc ?? "",
      p.station ? (p.station.direct ? "direct" : "retrograde") : "",
      bit(p.retrograde),
      hasLatitude(p) ? num(p.latitude) : "",
      num(p.declination),
      bit(flag?.oob),
      flag?.oob ? num(outOfBoundsBy(p.declination, chart.meta.obliquity)) : "",
      flag?.dignity ?? "",
      row.dignity ? row.dignity.kinds.join("|") : "",
      row.dignity ? String(row.dignity.score) : "",
      bit(flag?.dignity === "peregrine"),
      bit(flag?.combust),
      bit(flag?.cazimi),
      sun && p.id !== "sun" && p.kind !== "angle" ? num(separation(p.ecliptic, sun.ecliptic)) : "",
      bit(flag?.angular),
      near?.id ?? "",
      near ? num(near.distance) : "",
      bit(flag?.anaretic),
      bit(flag?.ariesPoint),
      flag?.inSect === true ? "1" : flag?.inSect === false ? "0" : "",
      bit(flag?.unaspected),
      bit(unknown && (p.uncertain === true || isRough(chart, p))),
      range ? num(range[0]) : "",
      range ? num(range[1]) : "",
    ]);
  }

  add([]);
  add(["house", "id", "sign", "longitude", "formatted", "uncertain"]);
  for (const h of chart.houses) {
    add(["house", String(h.id), h.sign, h.ecliptic.toFixed(6), formatDegreeSeconds(h.ecliptic), bit(unknown)]);
  }

  add([]);
  add(["aspect", "a", "b", "type", "level", "orb", "applying", "uncertain"]);
  for (const a of chart.aspects) {
    add([
      "aspect",
      a.a,
      a.b,
      a.type,
      a.level,
      a.orb.toFixed(4),
      a.applying === true ? "applying" : a.applying === false ? "separating" : "",
      bit(aspectRow(a, chart, locale).uncertain),
    ]);
  }

  add([]);
  add(["pattern", "kind", "value"]);
  for (const c of patterns.configurations) {
    add(["pattern", c.type, `${c.members.join("|")}${c.apex ? ` apex:${c.apex}` : ""}`]);
  }
  for (const r of patterns.receptions) add(["pattern", "reception", `${r.a}|${r.b}`]);
  for (const s of patterns.stelliums) add(["pattern", "stellium", `${s.place}|${s.members.join("|")}`]);
  add([
    "pattern",
    "unaspected",
    chart.planets.filter((p) => patterns.flags[p.id]?.unaspected).map((p) => p.id).join("|"),
  ]);
  add(["pattern", "vocMoon", unknown ? "" : bit(patterns.vocMoon)]);
  add(["pattern", "retrogrades", patterns.retrogrades.join("|")]);

  const w = patterns.weights;
  add([]);
  add(["balance", "field", "value"]);
  add(["balance", "fire", String(w.elements.fire)]);
  add(["balance", "earth", String(w.elements.earth)]);
  add(["balance", "air", String(w.elements.air)]);
  add(["balance", "water", String(w.elements.water)]);
  add(["balance", "cardinal", String(w.modalities.cardinal)]);
  add(["balance", "fixed", String(w.modalities.fixed)]);
  add(["balance", "mutable", String(w.modalities.mutable)]);
  add(["balance", "positive", String(w.polarity.positive)]);
  add(["balance", "negative", String(w.polarity.negative)]);
  add(["balance", "east", String(w.hemisphere.east)]);
  add(["balance", "west", String(w.hemisphere.west)]);
  add(["balance", "north", String(w.hemisphere.north)]);
  add(["balance", "south", String(w.hemisphere.south)]);
  add(["balance", "q1", String(w.quadrants[0])]);
  add(["balance", "q2", String(w.quadrants[1])]);
  add(["balance", "q3", String(w.quadrants[2])]);
  add(["balance", "q4", String(w.quadrants[3])]);
  add(["balance", "angular", String(w.angularity.angular)]);
  add(["balance", "succedent", String(w.angularity.succedent)]);
  add(["balance", "cadent", String(w.angularity.cadent)]);
  if (unknown) {
    add(["balance", "anglesLeftOut", "1"]);
    add(["balance", "signsUncertain", bit(!signsHold(chart, CLASSIC_BODIES))]);
    add(["balance", "housesUncertain", "1"]);
  }

  add([]);
  add(["ranking", "field", "value"]);
  add(["ranking", "chartRuler", patterns.chartRuler]);
  if (patterns.tightest) {
    const t = patterns.tightest;
    add([
      "ranking",
      "tightest",
      `${t.a}|${t.type}|${t.b}|${t.orb.toFixed(4)}|${t.applying === true ? "applying" : t.applying === false ? "separating" : ""}`,
    ]);
  }
  for (const row of patterns.ranking) {
    add([
      "ranking",
      "dignitySect",
      `${row.id}|${row.score}|${row.dignity ?? ""}|${row.inSect === true ? "in" : row.inSect === false ? "out" : ""}`,
    ]);
  }
  if (patterns.dominant) {
    add([
      "ranking",
      "dominant",
      `${patterns.dominant.type}|${patterns.dominant.members.join("|")}|apex:${patterns.dominant.apex ?? ""}`,
    ]);
  }

  return rows.map((r) => r.join(",")).join("\n");
}
