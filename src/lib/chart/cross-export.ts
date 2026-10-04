/**
 * The other modes' tables as text (the Copy buttons) and as CSV (part 52 of
 * the launch plan): the same rows as the pages (cross-table.ts), the same
 * words, the same ~ where a birth time is unknown. The CSV keeps full
 * decimals for other programs; its first line is `section,field,value` as
 * the chart table's.
 */
import { bodyAgree, bodyBare, inSign, signName } from "@/lib/i18n/astro";
import type { AppLocale } from "@/lib/i18n/messages";
import { aspectsWord, chartFactText, modesWord, moonPhaseName, pointsGroupLabel, pointsText, pointsWord } from "@/lib/i18n/table-ui";
import { dateFormat } from "@/lib/intl-cache";
import { formatArc, formatDegreeSeconds } from "@/lib/utils";
import {
  bothGroups,
  overlayRows,
  progressedAngleRows,
  progressedGroups,
  progressedMoon,
  progressionAspectRows,
  progressionCheck,
  skyGroups,
  synastryAspectRows,
  synastryCheck,
  transitAspectRows,
  transitCheck,
  type CrossAspectRow,
  type ProgressedMoon,
  type ProgressedRow,
} from "./cross-table";
import { allowedText, ASPECT_CSV_HEAD } from "./table-aspects";
import { aspectWord, cellText, colon, phaseWord, stationMoment, type Cell } from "./table-cells";
import { timeUnknown } from "./unknown-time";
import type { AspectLink, NatalChart, ProgressedSky, SynastryPair, TransitSky } from "./types";

export type TextPart = { id: string; lines: string[] };

const mark = (on: boolean) => (on ? "~" : "");
const upper = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function csvEscape(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

const num = (x: number | null | undefined, digits = 6) => (x != null && Number.isFinite(x) ? x.toFixed(digits) : "");
const bit = (x: boolean | null | undefined) => (x ? "1" : "0");

/** French "de Anna" or "d’Anna". */
export function ofName(name: string): string {
  return /^[aeiouyhéèêàâîôûAEIOUYHÉÈÊÀÂÎÔÛ]/.test(name) ? `d’${name}` : `de ${name}`;
}

/** A day of the calendar: "12 Oct 2031". */
export function dayText(utc: string, locale: AppLocale): string {
  return dateFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(utc));
}

/** Who each end of a contact is: "Pluto", "natal Moon", "progressed Sun", "Venus (Anna)". */
export type SideOf = (id: string) => string;

export function transitSide(locale: AppLocale): SideOf {
  return (id) => modesWord(locale, "transitSide", { body: bodyBare(id, locale) });
}

export function natalSide(locale: AppLocale): SideOf {
  return (id) => modesWord(locale, "natalSide", { body: bodyBare(id, locale), natal: bodyAgree(id, "natal", "natale") });
}

export function progressedSide(locale: AppLocale): SideOf {
  return (id) => modesWord(locale, "progressedSide", { body: bodyBare(id, locale), progressed: bodyAgree(id, "progressé", "progressée") });
}

export function personSide(name: string, locale: AppLocale): SideOf {
  return (id) => modesWord(locale, "personSide", { body: bodyBare(id, locale), name });
}

/** "Pluto trine natal Moon". */
export function crossPhrase(l: Pick<AspectLink, "a" | "b" | "type">, a: SideOf, b: SideOf, locale: AppLocale): string {
  return `${a(l.a)} ${aspectWord(l.type, locale)} ${b(l.b)}`;
}

/** How a table gives its exact moments; a progression exact before birth has been separating all life. */
export type ExactKind = {
  kind: "moment" | "day";
  pending: boolean;
  birthMs?: number;
  /** The clock the moment is shown in (the Calendar's choice, review 3 Oct T4); universal time without it. */
  zone?: string;
};

/** A moment in a zone's clock with the zone's short name: "4 Oct 2026, 13:18 CEST"; in UT as the tables write it. */
export function zonedMoment(utc: string, locale: AppLocale, zone: string): string {
  if (zone === "UTC" || zone === "Etc/UTC") return stationMoment(utc, locale);
  const minute = Math.floor(Date.parse(utc) / 60_000) * 60_000;
  return dateFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
    timeZoneName: "short",
  }).format(new Date(minute));
}

/** The exact moment's words, or null to say it is not in reach. */
export function exactWhen(utc: string | null | undefined, how: ExactKind, locale: AppLocale): string | null {
  if (!utc) return null;
  if (how.birthMs != null && Date.parse(utc) < how.birthMs) return modesWord(locale, "beforeBirth");
  if (how.kind === "moment") return how.zone ? zonedMoment(utc, locale, how.zone) : stationMoment(utc, locale);
  return dayText(utc, locale);
}

/** When it is exact, in words: "exact 12 Oct 2026, 14:02 UT"; null when the table has no such column. */
export function exactText(r: CrossAspectRow, how: ExactKind, locale: AppLocale): string {
  if (how.pending) return modesWord(locale, "pending");
  const when = exactWhen(r.link.exactUtc, how, locale);
  if (!when) return modesWord(locale, "notFound");
  return `${mark(r.exactUncertain)}${modesWord(locale, "exactOn", { when })}`;
}

/** An aspect row as a line: "Pluto trine natal Moon · orb 0°12' of 8° · applying · exact 12 Oct 2026, 14:02 UT · mirror: …". */
export function crossRowText(r: CrossAspectRow, a: SideOf, b: SideOf, locale: AppLocale, exact: ExactKind | null): string {
  const bits = [
    `${mark(r.uncertain)}${upper(crossPhrase(r.link, a, b, locale))}`,
    pointsWord(locale, "orb", { arc: aspectsWord(locale, "orbOf", { orb: formatArc(r.orb), allowed: allowedText(r.allowed) }) }),
  ];
  if (r.link.applying != null) bits.push(phaseWord(r.link.applying, locale));
  if (exact) bits.push(exactText(r, exact, locale));
  if (r.twins.length) bits.push(aspectsWord(locale, "also", { list: r.twins.map((t) => crossPhrase(t, a, b, locale)).join(", ") }));
  return bits.join(" · ");
}

/** A position in words: "24°03'00" Gemini". */
function positionText(c: Cell, sign: Parameters<typeof signName>[0], locale: AppLocale): string {
  return `${cellText(c)} ${signName(sign, locale)}`;
}

function aspectCsvRows(section: string, rows: readonly CrossAspectRow[], exact: boolean): string[][] {
  // The natal table's columns (table-export.ts ASPECT_CSV_HEAD), the section named for its table.
  const out: string[][] = [[section, ...ASPECT_CSV_HEAD.slice(1)]];
  for (const r of rows) {
    const cells = (l: AspectLink, mirror: string) => [
      section,
      l.a,
      l.type,
      l.b,
      l.level ?? "",
      r.orb.toFixed(4),
      String(r.allowed),
      r.strength.toFixed(4),
      l.applying === true ? "applying" : l.applying === false ? "separating" : "",
      exact ? (l.exactUtc ?? "") : "",
      bit(r.uncertain),
      exact ? bit(r.exactUncertain) : "",
      "",
      mirror,
    ];
    out.push(cells(r.link, ""));
    for (const t of r.twins) out.push(cells(t, r.link.id));
  }
  return out;
}

/* ── Transits ───────────────────────────────────────────────────────── */

export function transitTextParts(sky: TransitSky, chart: NatalChart, name: string, locale: AppLocale): TextPart[] {
  const unknown = timeUnknown(chart);
  const aspects: string[] = [modesWord(locale, "partAspects"), modesWord(locale, "transitsHead", { name, when: stationMoment(sky.meta.utc, locale) })];
  if (unknown) aspects.push(modesWord(locale, "unknownTransits"));
  const rows = transitAspectRows(sky, chart);
  const exact: ExactKind = { kind: "moment", pending: Boolean(sky.meta.provisional) };
  for (const r of rows) aspects.push(crossRowText(r, transitSide(locale), natalSide(locale), locale, exact));
  if (!rows.length) aspects.push(aspectsWord(locale, "none"));

  const skyLines: string[] = [modesWord(locale, "partSky")];
  for (const g of skyGroups(sky, chart, locale)) {
    skyLines.push(pointsGroupLabel(locale, g.id));
    for (const r of g.rows) {
      const p = r.point;
      const bits = [bodyBare(p.id, locale), `${formatDegreeSeconds(p.ecliptic)} ${signName(p.sign, locale)}`];
      if (r.motion) bits.push(`${pointsWord(locale, "perDay", { arc: r.motion.speed })}${r.motion.words.length ? ` (${r.motion.words.join(", ")})` : ""}`);
      bits.push(`${mark(r.house.uncertain)}${modesWord(locale, "houseN", { n: r.house.text })}`);
      skyLines.push(bits.join(" · "));
    }
  }
  return [
    { id: "aspects", lines: aspects },
    { id: "sky", lines: skyLines },
  ];
}

export function transitTableCsv(sky: TransitSky, chart: NatalChart, locale: AppLocale): string {
  const rows: string[][] = [["section", "field", "value"]];
  rows.push(["transits", "utc", sky.meta.utc]);
  rows.push(["transits", "timeUnknown", bit(timeUnknown(chart))]);
  rows.push(["transits", "provisional", bit(Boolean(sky.meta.provisional))]);
  rows.push([]);
  rows.push(...aspectCsvRows("aspect", transitAspectRows(sky, chart), true));
  rows.push([]);
  rows.push(["position", "id", "sign", "longitude", "speed", "retrograde", "stationary", "swift", "slow", "natalHouse", "houseUncertain"]);
  for (const g of skyGroups(sky, chart, locale)) {
    for (const r of g.rows) {
      const p = r.point;
      const flags = r.motion ? r.motion.words : [];
      rows.push([
        "position",
        p.id,
        p.sign,
        p.ecliptic.toFixed(6),
        r.motion && p.speed != null ? p.speed.toFixed(6) : "",
        bit(p.retrograde),
        bit(flags.includes(pointsText(locale, "stationary"))),
        bit(flags.includes(pointsText(locale, "swift"))),
        bit(flags.includes(pointsText(locale, "slow"))),
        String(p.house),
        bit(r.house.uncertain),
      ]);
    }
  }
  // Every contact the grid shows, majors and minors.
  rows.push([]);
  rows.push(["contact", "a", "type", "b", "orb", "level", "applying", "uncertain"]);
  const check = transitCheck(sky, chart);
  for (const l of sky.aspects) {
    rows.push(["contact", l.a, l.type, l.b, l.orb.toFixed(4), l.level, l.applying === true ? "applying" : l.applying === false ? "separating" : "", bit(check(l).uncertain)]);
  }
  return toCsv(rows);
}

/* ── Progressions ───────────────────────────────────────────────────── */

function progressedLine(r: ProgressedRow, locale: AppLocale): string {
  const p = r.point;
  const bits = [bodyBare(p.id, locale), positionText(r.position, p.sign, locale)];
  if (r.natal && r.natalPosition) bits.push(modesWord(locale, "atBirthLine", { pos: positionText(r.natalPosition, r.natal.sign, locale) }));
  if (r.moved) bits.push(`${mark(r.moved.uncertain)}${modesWord(locale, "movedBy", { arc: r.moved.text })}`);
  if (r.motion) bits.push(`${modesWord(locale, "perYear", { arc: r.motion.speed })}${r.motion.words.length ? ` (${r.motion.words.join(", ")})` : ""}`);
  bits.push(`${mark(r.house.uncertain)}${modesWord(locale, "houseN", { n: r.house.text })}`);
  return bits.join(" · ");
}

/** "Balsamic · 331°12' past the progressed Sun · waning" and "In Libra, house 3 of your chart". */
export function progressedMoonLines(sky: ProgressedSky, chart: NatalChart, locale: AppLocale): string[] {
  const m = progressedMoon(sky, chart);
  if (!m) return [];
  const trend = chartFactText(locale, m.waxing ? "waxing" : "waning");
  const lines = [
    `${mark(m.uncertain)}${moonPhaseName(locale, m.phase)} · ${modesWord(locale, "phaseLine", { arc: formatArc(m.angle), trend })}`,
    `${mark(m.uncertain)}${modesWord(locale, "moonWhere", { where: upper(inSign(m.sign, locale)), house: String(m.house) })}`,
  ];
  const next = nextPhaseText(m, sky.meta.yearsOfLife, locale);
  if (next) lines.push(`${mark(m.uncertain)}${modesWord(locale, "nextLine", { next })}`);
  return lines;
}

/** "New Moon in about 5 months", "First quarter at about age 41". */
export function nextPhaseText(m: ProgressedMoon, yearsOfLife: number, locale: AppLocale): string {
  if (!m.next) return "";
  const phase = moonPhaseName(locale, m.next.phase);
  const years = m.next.years;
  if (years < 2) {
    const n = Math.max(1, Math.round(years * 12));
    return modesWord(locale, n === 1 ? "inAMonth" : "inMonths", { phase, n: String(n) });
  }
  return modesWord(locale, "atAge", { phase, age: String(Math.round(yearsOfLife + years)) });
}

export function progressionTextParts(sky: ProgressedSky, chart: NatalChart, name: string, locale: AppLocale): TextPart[] {
  const unknown = timeUnknown(chart);
  const years = (Math.floor(sky.meta.yearsOfLife * 100) / 100).toFixed(2);
  const aspects: string[] = [
    modesWord(locale, "partAspects"),
    modesWord(locale, "progressionsHead", { name, when: dayText(sky.meta.targetUtc, locale), years: locale === "fr" ? years.replace(".", ",") : years }),
  ];
  if (unknown) aspects.push(modesWord(locale, "unknownProgressions"));
  const rows = progressionAspectRows(sky, chart);
  const exact: ExactKind = { kind: "day", pending: Boolean(sky.meta.provisional), birthMs: Date.parse(sky.meta.natalUtc) };
  for (const r of rows) aspects.push(crossRowText(r, progressedSide(locale), natalSide(locale), locale, exact));
  if (!rows.length) aspects.push(aspectsWord(locale, "none"));

  const positions: string[] = [modesWord(locale, "partPositions")];
  for (const g of progressedGroups(sky, chart, locale)) {
    positions.push(pointsGroupLabel(locale, g.id));
    for (const r of g.rows) positions.push(progressedLine(r, locale));
  }
  const angles: string[] = [modesWord(locale, "partAngles")];
  for (const r of progressedAngleRows(sky, chart, locale)) angles.push(progressedLine(r, locale));
  const moon: string[] = [modesWord(locale, "partMoon"), ...progressedMoonLines(sky, chart, locale)];
  return [
    { id: "aspects", lines: aspects },
    { id: "positions", lines: positions },
    { id: "angles", lines: angles },
    { id: "moon", lines: moon },
  ];
}

export function progressionTableCsv(sky: ProgressedSky, chart: NatalChart, locale: AppLocale): string {
  const rows: string[][] = [["section", "field", "value"]];
  rows.push(["progressions", "targetUtc", sky.meta.targetUtc]);
  rows.push(["progressions", "progressedUtc", sky.meta.progressedUtc]);
  rows.push(["progressions", "yearsOfLife", num(sky.meta.yearsOfLife)]);
  rows.push(["progressions", "method", sky.meta.method]);
  rows.push(["progressions", "houseSystem", sky.meta.houseSystem]);
  rows.push(["progressions", "timeUnknown", bit(timeUnknown(chart))]);
  rows.push([]);
  rows.push(...aspectCsvRows("aspect", progressionAspectRows(sky, chart), true));
  rows.push([]);
  rows.push(["position", "id", "sign", "longitude", "natalLongitude", "moved", "speedPerYear", "retrograde", "natalHouse", "uncertain"]);
  const list = [...progressedGroups(sky, chart, locale).flatMap((g) => g.rows), ...progressedAngleRows(sky, chart, locale)];
  for (const r of list) {
    const p = r.point;
    rows.push([
      "position",
      p.id,
      p.sign,
      p.ecliptic.toFixed(6),
      r.natal ? r.natal.ecliptic.toFixed(6) : "",
      num(r.movedDeg),
      p.speed != null ? p.speed.toFixed(6) : "",
      bit(p.retrograde),
      String(p.house),
      bit(r.position.uncertain),
    ]);
  }
  const m = progressedMoon(sky, chart);
  if (m) {
    rows.push([]);
    rows.push(["moonPhase", "phase", "angle", "waxing", "sign", "natalHouse", "uncertain"]);
    rows.push(["moonPhase", m.phase, num(m.angle), bit(m.waxing), m.sign, String(m.house), bit(m.uncertain)]);
  }
  rows.push([]);
  rows.push(["contact", "a", "type", "b", "orb", "level", "applying", "uncertain"]);
  const check = progressionCheck(sky, chart);
  for (const l of sky.aspects) {
    rows.push(["contact", l.a, l.type, l.b, l.orb.toFixed(4), l.level, l.applying === true ? "applying" : l.applying === false ? "separating" : "", bit(check(l).uncertain)]);
  }
  return toCsv(rows);
}

/* ── Synastry ───────────────────────────────────────────────────────── */

export type PairNames = { a: string; b: string };

/** "Anna’s bodies in Ben’s houses". */
export function overlaysTitle(owner: string, host: string, locale: AppLocale): string {
  return modesWord(locale, "overlaysOf", { a: owner, b: host, ofA: ofName(owner), ofB: ofName(host) });
}

export function synastryTextParts(pair: SynastryPair, a: NatalChart, b: NatalChart, names: PairNames, locale: AppLocale): TextPart[] {
  const unknownNames = [timeUnknown(a) ? names.a : "", timeUnknown(b) ? names.b : ""].filter(Boolean);
  const aspects: string[] = [modesWord(locale, "partAspects"), modesWord(locale, "synastryHead", names)];
  if (unknownNames.length) aspects.push(modesWord(locale, "unknownSynastry", { names: unknownNames.join(modesWord(locale, "and")) }));
  const rows = synastryAspectRows(pair, a, b);
  for (const r of rows) aspects.push(crossRowText(r, personSide(names.a, locale), personSide(names.b, locale), locale, null));
  if (!rows.length) aspects.push(aspectsWord(locale, "none"));

  const overlays: string[] = [modesWord(locale, "partOverlays")];
  for (const [owner, host, on, onName, hostName] of [
    [a, b, "a", names.a, names.b],
    [b, a, "b", names.b, names.a],
  ] as const) {
    void on;
    overlays.push(overlaysTitle(onName, hostName, locale));
    const list = overlayRows(owner, host);
    if (!list.length) overlays.push(modesWord(locale, "noOverlays", { b: hostName, ofB: ofName(hostName) }));
    for (const r of list) {
      overlays.push(`${bodyBare(r.point.id, locale)} · ${r.point.formatted} ${signName(r.point.sign, locale)} · ${mark(r.uncertain)}${modesWord(locale, "houseN", { n: String(r.house) })}`);
    }
  }

  const both: string[] = [modesWord(locale, "partBoth")];
  for (const g of bothGroups(a, b)) {
    both.push(pointsGroupLabel(locale, g.id));
    for (const r of g.rows) {
      const side = (p: typeof r.a, pos: Cell | null, house: Cell | null, who: string) =>
        p && pos && house ? `${who}${colon(locale)}${positionText(pos, p.sign, locale)}, ${mark(house.uncertain)}${modesWord(locale, "houseN", { n: house.text })}` : `${who}${colon(locale)}—`;
      both.push([bodyBare(r.id, locale), side(r.a, r.aPosition, r.aHouse, names.a), side(r.b, r.bPosition, r.bHouse, names.b)].join(" · "));
    }
  }
  return [
    { id: "aspects", lines: aspects },
    { id: "overlays", lines: overlays },
    { id: "both", lines: both },
  ];
}

export function synastryTableCsv(pair: SynastryPair, a: NatalChart, b: NatalChart, names: PairNames): string {
  const rows: string[][] = [["section", "field", "value"]];
  rows.push(["synastry", "a", names.a]);
  rows.push(["synastry", "b", names.b]);
  rows.push(["synastry", "aTimeUnknown", bit(timeUnknown(a))]);
  rows.push(["synastry", "bTimeUnknown", bit(timeUnknown(b))]);
  rows.push([]);
  rows.push(...aspectCsvRows("aspect", synastryAspectRows(pair, a, b), false));
  rows.push([]);
  rows.push(["overlay", "owner", "body", "longitude", "hostHouse", "uncertain"]);
  for (const [owner, host, who] of [
    [a, b, "a"],
    [b, a, "b"],
  ] as const) {
    for (const r of overlayRows(owner, host)) rows.push(["overlay", who, r.point.id, r.point.ecliptic.toFixed(6), String(r.house), bit(r.uncertain)]);
  }
  rows.push([]);
  rows.push(["both", "id", "aLongitude", "aSign", "aHouse", "bLongitude", "bSign", "bHouse"]);
  for (const g of bothGroups(a, b)) {
    for (const r of g.rows) {
      rows.push(["both", r.id, r.a ? r.a.ecliptic.toFixed(6) : "", r.a?.sign ?? "", r.a ? String(r.a.house) : "", r.b ? r.b.ecliptic.toFixed(6) : "", r.b?.sign ?? "", r.b ? String(r.b.house) : ""]);
    }
  }
  rows.push([]);
  rows.push(["contact", "a", "type", "b", "orb", "level", "applying", "uncertain"]);
  const check = synastryCheck(a, b);
  for (const l of pair.aspects) {
    rows.push(["contact", l.a, l.type, l.b, l.orb.toFixed(4), l.level, l.applying === true ? "applying" : l.applying === false ? "separating" : "", bit(check(l).uncertain)]);
  }
  return toCsv(rows);
}

/** The whole table as text: its parts, a blank line between them. */
export function joinParts(parts: readonly TextPart[]): string {
  return parts.map((p) => p.lines.join("\n")).join("\n\n");
}

/**
 * A grid of two charts' bodies as text and as a table (review 3 Oct, B6):
 * each row body's contacts in a line ("Sun: Moon square 2°04' A · …"), and
 * the matrix itself for a spreadsheet, each cell "square 2°04' A".
 */
export function gridParts(
  links: readonly AspectLink[],
  rowIds: readonly string[],
  colIds: readonly string[],
  title: string,
  locale: AppLocale,
): { lines: string[]; table: string[][] } {
  const byPair = new Map<string, AspectLink>();
  for (const l of links) byPair.set(`${l.a}|${l.b}`, l);
  const as = (l: AspectLink) => (l.applying === true ? "A" : l.applying === false ? "S" : "");
  const cell = (l: AspectLink) => [aspectWord(l.type, locale), formatArc(l.orb), as(l)].filter(Boolean).join(" ");
  const lines = [title];
  const table: string[][] = [["", ...colIds.map((c) => bodyBare(c, locale))]];
  for (const r of rowIds) {
    const contacts = colIds.flatMap((c) => {
      const l = byPair.get(`${r}|${c}`);
      return l ? [`${bodyBare(c, locale)} ${cell(l)}`] : [];
    });
    if (contacts.length) lines.push(`${bodyBare(r, locale)}${colon(locale)} ${contacts.join(" · ")}`);
    table.push([bodyBare(r, locale), ...colIds.map((c) => {
      const l = byPair.get(`${r}|${c}`);
      return l ? cell(l) : "";
    })]);
  }
  return { lines, table };
}
