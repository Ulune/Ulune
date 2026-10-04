/**
 * The chart table as text (part by part, for the Copy buttons) and as CSV.
 * Both read the same cells as the table page (table-cells.ts): the same
 * words, the same numbers, the same ~ where the birth time is unknown. The
 * CSV keeps full decimals for other programs.
 */
import { hydratePatterns } from "./patterns";
import { aspectOrb, CLASSIC_BODIES } from "./constants";
import { isRough, signsHold } from "./day-checks";
import {
  ASPECT_CSV_HEAD,
  aspectTableRow,
  aspectTableRows,
  aspectTableRowText,
  tightestText,
  isOutOfSign,
  parallelRows,
  parallelRowText,
  parallelsOf,
  twinGroups,
} from "./table-aspects";
import {
  balanceGroups,
  balanceGroupText,
  cellText,
  chartFactLine,
  chartFacts,
  chartPoints,
  colon,
  groupedPoints,
  hasLatitude,
  patternSections,
  pointRow,
  pointRowText,
  type PointRow,
} from "./table-cells";
import { armcOf, declinationOf, localSiderealHours, moonPhase, nearestAngle, outOfBoundsBy, separation } from "./table-facts";
import { dispositorsOf, dignityRows, dignitiesText, mutualReceptions } from "./table-dignities";
import { houseRows, houseRowText } from "./table-houses";
import { midpointList, starRows, type Contact } from "./table-stars";
import { mergedShapes } from "./table-patterns";
import type { NatalChart } from "./types";
import { bodyBare, signName } from "@/lib/i18n/astro";
import type { AppLocale } from "@/lib/i18n/messages";
import { aspectsWord, pointsGroupLabel, pointsText, starsWord, tablePartLabel, unknownTimeNote } from "@/lib/i18n/table-ui";
import { formatArc, formatDegreeSeconds, formatHms, formatSignedDms, formatSignedDmsSeconds } from "@/lib/utils";

const capitalize = (x: string) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export { chartPoints };

/** The parts of the text copy, in the table page's order (the grid has none). */
export type ChartTextPartId = "identity" | "points" | "houses" | "aspects" | "dignities" | "patterns" | "balance" | "stars";
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
  for (const f of chartFacts(chart, patterns.isDay, locale)) push(chartFactLine(f, locale));

  start("points");
  if (unknown) push(pointsText(locale, "needsTime"));
  for (const g of groupedPoints(chart)) {
    push(pointsGroupLabel(locale, g.id));
    for (const p of g.rows) push(pointRowText(pointRow(p, chart, patterns, locale), locale));
  }

  start("houses");
  if (unknown) push(unknownTimeNote(locale, "houses"));
  for (const r of houseRows(chart, locale)) push(houseRowText(r, locale));

  start("aspects");
  if (unknown) push(unknownTimeNote(locale, "aspects"));
  const tightest = tightestText(chart, locale);
  if (tightest) push(`${tightest.uncertain ? "~" : ""}${capitalize(tightest.text)}`);
  for (const r of aspectTableRows(chart, locale).rows) push(aspectTableRowText(r, locale));
  push(aspectsWord(locale, "parallelsHead"));
  if (unknown) push(aspectsWord(locale, "parallelsUnknown"));
  const parallels = parallelRows(chart);
  const decl = unknown ? formatSignedDms : formatSignedDmsSeconds;
  if (parallels.length) for (const p of parallels) push(parallelRowText(p, locale, decl));
  else push(aspectsWord(locale, "noParallels"));

  start("dignities");
  if (unknown) push(unknownTimeNote(locale, "dignities"));
  for (const line of dignitiesText(chart, patterns, locale)) push(line);

  start("patterns");
  if (unknown) push(unknownTimeNote(locale, "patterns"));
  for (const s of patternSections(chart, patterns, locale)) {
    if (s.id === "voc" || s.id === "unaspected" || s.id === "retrogrades") {
      // One line each: "Title: what it says" (the Moon's course on a line of its own).
      const [item, ...more] = s.items;
      push(`${s.title}${colon(locale)}${item ? cellText(item) : s.none}`);
      for (const m of more) push(cellText(m));
      continue;
    }
    push(s.title);
    if (s.items.length) for (const item of s.items) push(cellText(item));
    else push(s.none);
  }

  start("balance");
  if (unknown) push(unknownTimeNote(locale, "balance"));
  for (const g of balanceGroups(chart, patterns, locale)) push(balanceGroupText(g, locale));

  start("stars");
  if (unknown) push(unknownTimeNote(locale, "stars"));
  push(starsWord(locale, "starsHead"));
  const on = (contacts: readonly Contact[]) =>
    contacts.length
      ? contacts
          .map((c) => `${c.uncertain ? "~" : ""}${bodyBare(c.body, locale)} ${formatArc(c.orb)}${c.opposite ? ` (${starsWord(locale, "opposite")})` : ""}`)
          .join(", ")
      : starsWord(locale, "noneOn");
  for (const r of starRows(chart)) {
    push(`${starsWord(locale, r.id)} · ${formatDegreeSeconds(r.ecliptic)} ${signName(r.sign, locale)} · ${starsWord(locale, "on")}${colon(locale)}${on(r.contacts)}`);
  }
  push(starsWord(locale, "midpointsHead"));
  // Of the full list (review 3 Oct, B7), the midpoints with a body on them; the CSV has them all.
  for (const r of midpointList(chart).filter((x) => x.contacts.length)) {
    push(
      `${bodyBare(r.a, locale)}/${bodyBare(r.b, locale)} · ${r.uncertain ? "~" : ""}${formatDegreeSeconds(r.ecliptic)} ${signName(r.sign, locale)} · ${starsWord(locale, "on")}${colon(locale)}${on(r.contacts)}`,
    );
  }

  return parts;
}

/**
 * Which parts a table shows: all of them by default. The composite's table
 * shows Points, Houses, Aspects, Grid and Balance: a composite has no
 * moment or place of its own, so no Chart part.
 */
export type ChartTableScope = { parts?: readonly string[]; composite?: boolean };

/** The whole table as text: every part it shows, a blank line between them. */
export function formatChartTableText(chart: NatalChart, locale: AppLocale, scope: ChartTableScope = {}): string {
  return chartTextParts(chart, locale)
    .filter((p) => !scope.parts || scope.parts.includes(p.id))
    .map((p) => p.lines.join("\n"))
    .join("\n\n");
}

/** The table part each CSV section belongs to. */
const CSV_PART: Record<string, string> = {
  identity: "identity",
  point: "points",
  house: "houses",
  aspect: "aspects",
  parallel: "aspects",
  tightest: "aspects",
  pattern: "patterns",
  shape: "patterns",
  moonCourse: "patterns",
  balance: "balance",
  ruler: "dignities",
  dignity: "dignities",
  dispositor: "dignities",
  reception: "dignities",
  star: "stars",
  midpoint: "stars",
};

/** The CSV's rows of the parts a table shows, one blank row between sections. */
function scopedRows(rows: string[][], scope: ChartTableScope, head: string[][]): string[][] {
  if (!scope.parts) return rows;
  const out: string[][] = [...head];
  for (const row of rows.slice(1)) {
    if (!row.length) {
      if (out.length && out[out.length - 1]?.length) out.push(row);
      continue;
    }
    const part = CSV_PART[row[0] ?? ""];
    if (part && scope.parts.includes(part)) out.push(row);
  }
  while (out.length && !out[out.length - 1]?.length) out.pop();
  return out;
}

const num = (x: number | null | undefined, digits = 6) => (x != null && Number.isFinite(x) ? x.toFixed(digits) : "");
const bit = (x: boolean | null | undefined) => (x ? "1" : "0");

export function formatChartTableCsv(chart: NatalChart, locale: AppLocale, scope: ChartTableScope = {}): string {
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
    const full: PointRow = pointRow(p, chart, patterns, locale);
    // A composite's points carry no motion or dignity of their own (as on screen).
    const row: PointRow = chart.meta.time === "midpoint" ? { ...full, motion: null, dignity: null } : full;
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
      num(declinationOf(p, chart)),
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
  add(["house", "id", "sign", "longitude", "formatted", "uncertain", "size", "ruler", "traditionalRuler", "inside", "intercepted", "signOnCusps"]);
  const wrap = (x: number) => ((x % 360) + 360) % 360;
  for (const [i, r] of houseRows(chart, locale).entries()) {
    const h = r.cusp;
    const next = chart.houses[(i + 1) % chart.houses.length];
    add([
      "house",
      String(h.id),
      h.sign,
      h.ecliptic.toFixed(6),
      formatDegreeSeconds(h.ecliptic),
      bit(unknown),
      next ? wrap(next.ecliptic - h.ecliptic).toFixed(6) : "",
      r.rulers.find((x) => !x.traditional)?.id ?? "",
      r.rulers.find((x) => x.traditional)?.id ?? "",
      r.inside.join("|"),
      r.intercepted.join("|"),
      r.twoCusps ? r.twoCusps.join("|") : "",
    ]);
  }

  add([]);
  // One column order for every aspects table, here and in the modes' (review 3 Oct, B2).
  add([...ASPECT_CSV_HEAD]);
  const mirrorOf = new Map<string, string>();
  for (const [head, ...rest] of twinGroups(chart.aspects)) for (const t of rest) if (head) mirrorOf.set(t.id, head.id);
  const lonOf = new Map(chartPoints(chart).map((p) => [p.id as string, p.ecliptic]));
  for (const a of chart.aspects) {
    const row = aspectTableRow(a, chart, locale);
    const la = lonOf.get(a.a);
    const lb = lonOf.get(a.b);
    const out = la != null && lb != null ? isOutOfSign(a.type, la, lb) : null;
    add([
      "aspect",
      a.a,
      a.type,
      a.b,
      a.level,
      a.orb.toFixed(4),
      String(aspectOrb(a.type, a.a, a.b)),
      row.strength.toFixed(4),
      chart.meta.time === "midpoint" ? "" : a.applying === true ? "applying" : a.applying === false ? "separating" : "",
      "",
      bit(row.uncertain),
      "",
      out == null ? "" : bit(out),
      mirrorOf.get(a.id) ?? "",
    ]);
  }

  add([]);
  add(["parallel", "a", "b", "kind", "orb", "declinationA", "declinationB", "uncertain"]);
  for (const p of parallelsOf(chart)) {
    add(["parallel", p.a, p.b, p.kind === "parallel" ? "parallel" : "contra-parallel", p.orb.toFixed(4), num(p.declA), num(p.declB), bit(p.uncertain)]);
  }

  add([]);
  add(["pattern", "kind", "value"]);
  for (const c of patterns.configurations) {
    add(["pattern", c.type, `${c.members.join("|")}${c.apex ? ` apex:${c.apex}` : ""}`]);
  }
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
  add(["shape", "type", "members", "focal", "ways", "orbMin", "orbMax", "dominant", "uncertain"]);
  for (const sh of mergedShapes(chart, patterns)) {
    add([
      "shape",
      sh.type,
      sh.corners.map((c) => c.join("/")).join("|"),
      sh.focal ? sh.focal.join("/") : "",
      String(sh.ways),
      sh.orbs[0].toFixed(4),
      sh.orbs[1].toFixed(4),
      bit(sh.dominant),
      bit(sh.uncertain),
    ]);
  }

  add([]);
  add(["ruler", "by", "planet", "sign", "house", "dignities", "score", "uncertain"]);
  const trad = patterns.chartRulerTraditional ?? patterns.chartRuler;
  const modern = patterns.chartRulerModern ?? trad;
  for (const [by, id] of [["traditional", trad], ["modern", modern]] as const) {
    const p = chart.planets.find((x) => x.id === id);
    const row = dignityRows(chart, patterns, locale).find((r) => r.planet === id);
    add(["ruler", by, id, p?.sign ?? "", p ? String(p.house) : "", row ? row.dignity.kinds.join("|") : "", row ? String(row.dignity.score) : "", bit(unknown)]);
  }

  add([]);
  add([
    "dignity",
    "planet",
    "sign",
    "longitude",
    "domicile",
    "exaltation",
    "triplicityDay",
    "triplicityNight",
    "triplicityParticipating",
    "term",
    "face",
    "detriment",
    "fall",
    "dignities",
    "score",
    "sect",
    "uncertain",
  ]);
  for (const r of dignityRows(chart, patterns, locale)) {
    const x = r.rulers;
    add([
      "dignity",
      r.planet,
      r.point.sign,
      r.point.ecliptic.toFixed(6),
      x.domicile,
      x.exaltation ?? "",
      x.triplicity[0],
      x.triplicity[1],
      x.triplicity[2],
      x.term,
      x.face,
      x.detriment,
      x.fall ?? "",
      r.dignity.kinds.join("|"),
      String(r.dignity.score),
      unknown ? "" : patterns.flags[r.planet]?.inSect === true ? "in" : patterns.flags[r.planet]?.inSect === false ? "out" : "",
      bit(r.dignity.uncertain),
    ]);
  }

  add([]);
  add(["dispositor", "planet", "chain", "end", "uncertain"]);
  const disp = dispositorsOf(chart);
  for (const id of disp.finals) add(["dispositor", id, id, "own sign", bit(false)]);
  for (const c of disp.chains) add(["dispositor", c.path[0] ?? "", c.path.join("|"), c.end, bit(c.uncertain)]);

  add([]);
  add(["reception", "a", "b", "kind", "uncertain"]);
  for (const r of mutualReceptions(chart)) add(["reception", r.a, r.b, r.kind, bit(r.uncertain)]);

  add([]);
  add(["star", "id", "longitude", "sign", "contacts"]);
  for (const r of starRows(chart)) {
    add(["star", r.id, r.ecliptic.toFixed(6), r.sign, r.contacts.map((c) => `${c.body}:${c.orb.toFixed(4)}${c.uncertain ? ":~" : ""}`).join("|")]);
  }
  add([]);
  add(["midpoint", "id", "longitude", "sign", "contacts", "uncertain"]);
  for (const r of midpointList(chart)) {
    add([
      "midpoint",
      r.id,
      r.ecliptic.toFixed(6),
      r.sign,
      r.contacts.map((c) => `${c.body}:${c.orb.toFixed(4)}${c.opposite ? ":opposite" : ""}${c.uncertain ? ":~" : ""}`).join("|"),
      bit(r.uncertain),
    ]);
  }
  const course = chart.meta.moonCourse;
  if (course) {
    add([]);
    add(["moonCourse", "nextBody", "nextType", "nextUtc", "entersSign", "entersUtc"]);
    add(["moonCourse", course.next?.body ?? "", course.next?.type ?? "", course.next?.utc ?? "", course.leaves.sign, course.leaves.utc]);
  }

  if (patterns.tightest) {
    const t = patterns.tightest;
    add([]);
    add(["tightest", "a", "type", "b", "orb", "applying"]);
    add(["tightest", t.a, t.type, t.b, t.orb.toFixed(4), t.applying === true ? "applying" : t.applying === false ? "separating" : ""]);
  }

  // A composite has no moment or place of its own: its name, how it is made, its houses.
  const head = scope.composite
    ? [
        ["section", "field", "value"],
        ["identity", "name", chart.meta.name],
        ["identity", "method", "midpoint composite"],
        ["identity", "houseSystem", chart.meta.houseSystem],
        ["identity", "timeUnknown", bit(unknown)],
        [],
      ].map((r) => r.map(csvEscape))
    : [rows[0] ?? []];
  return scopedRows(rows, scope, head)
    .map((r) => r.join(","))
    .join("\n");
}
