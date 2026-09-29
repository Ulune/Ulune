/**
 * The chart table's content in words and numbers. The table page, its Copy
 * buttons and the CSV all read from here, so the three never disagree.
 *
 * Without a birth time, whatever depends on it is `uncertain`: the page dims
 * it and marks it ~, and so does the text. What depends on it is decided by
 * day-checks.ts (a fact that could change between the start and the end of
 * the birth day).
 */
import {
  aspectName,
  bodyBare,
  dignityName,
  elementName,
  houseName,
  modalityName,
  signName,
} from "@/lib/i18n/astro";
import { translate, type AppLocale } from "@/lib/i18n/messages";
import { angleShort, chartFactText, moonPhaseName, patternsWord, pointsText, pointsWord } from "@/lib/i18n/table-ui";
import { dateFormat } from "@/lib/intl-cache";
import {
  formatArc,
  formatArcSeconds,
  formatDegree,
  formatDegreeSeconds,
  formatHms,
  formatLatLon,
  formatSignedDms,
  formatSignedDmsSeconds,
} from "@/lib/utils";
import { birthZoneLine, julianDayLine, universalTimeLine } from "./birth-time-label";
import { BALANCE_WEIGHT, CLASSIC_BODIES, HOUSE_SYSTEM_LABEL, MEAN_SPEED, SIGN_IDS, SIGN_META, signFromEcliptic } from "./constants";
import {
  anareticHolds,
  ariesPointHolds,
  dignityHolds,
  isRough,
  RANGE_WORTH,
  signHolds,
  signsHold,
  sunContactHolds,
  unaspectedHolds,
} from "./day-checks";
import { essentialDignity, isTraditionalPlanet, type DebilityKind, type EssentialKind } from "./dignities";
import { mergedShapes, shapeLine, type MergedShape } from "./table-patterns";
import { formatEuropeanDate } from "./parse-birth";
import { declinationOf, localSiderealHours, moonPhase, nearestAngle, outOfBoundsBy, separation } from "./table-facts";
import { ANGLE_IDS, type AspectLink, type BodyFlags, type BodyId, type ChartPatterns, type NatalChart, type Placement } from "./types";
import { houseTempo } from "./patterns";

/** A value and whether it hangs on an unknown birth time. */
export type Cell = { text: string; uncertain: boolean };

function mark(on: boolean): string {
  return on ? "~" : "";
}

/** "Label: value", with the French space before the colon. */
export function colon(locale: AppLocale): string {
  return locale === "fr" ? "\u202f: " : ": ";
}

/** A cell as text: "~" before it when it hangs on the time. */
export function cellText(c: Cell): string {
  return `${mark(c.uncertain)}${c.text}`;
}

/** A balance weight: whole, or with one decimal. */
export function weightText(n: number, locale: AppLocale = "en"): string {
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
  return locale === "fr" ? text.replace(".", ",") : text;
}

/** The id the table and the wheel use to choose a point. */
export function pointSelectId(id: string): string {
  return (ANGLE_IDS as readonly string[]).includes(id) ? `angle:${id}` : `planet:${id}`;
}

/* ── Points ─────────────────────────────────────────────────────────── */

/** Every body and point of a chart: the planets and points, then the angles. */
export function chartPoints(chart: NatalChart): Placement[] {
  return [...chart.planets, ...Object.values(chart.angles)];
}

export type PointGroupId = "planets" | "points" | "asteroids" | "angles" | "lots";

/** The Points rows, in groups and in reading order. */
export const POINT_GROUPS: readonly { id: PointGroupId; ids: readonly string[] }[] = [
  { id: "planets", ids: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"] },
  { id: "points", ids: ["chiron", "northnode", "southnode", "lilith"] },
  { id: "asteroids", ids: ["ceres", "pallas", "juno", "vesta", "eris", "sedna"] },
  { id: "angles", ids: ["ascendant", "midheaven", "descendant", "ic", "vertex", "antivertex"] },
  { id: "lots", ids: ["fortune", "spirit"] },
];

/** The chart's points in their groups (groups the chart has none of are left out). */
export function groupedPoints(chart: NatalChart): { id: PointGroupId; rows: Placement[] }[] {
  const byId = new Map(chartPoints(chart).map((p) => [p.id as string, p]));
  return POINT_GROUPS.map((g) => ({
    id: g.id,
    rows: g.ids.map((id) => byId.get(id)).filter((p): p is Placement => Boolean(p)),
  })).filter((g) => g.rows.length > 0);
}

/** Points with no motion of their own to show: the angles, the Vertex and the lots. */
const STILL = new Set<string>(["vertex", "antivertex", "fortune", "spirit"]);

/** The nodes lie on the ecliptic by definition: no latitude to show. */
const ON_THE_ECLIPTIC = new Set<string>(["northnode", "southnode"]);

export function hasLatitude(p: Placement): p is Placement & { latitude: number } {
  return p.kind !== "angle" && !ON_THE_ECLIPTIC.has(p.id) && p.latitude != null && Number.isFinite(p.latitude);
}

export function movesOnItsOwn(p: Placement): boolean {
  return p.kind !== "angle" && !STILL.has(p.id) && p.speed != null;
}

/** A score in Lilly's points, with a true minus sign: "+7", "−5", "0". */
export function scoreText(score: number): string {
  return score > 0 ? `+${score}` : score < 0 ? `−${Math.abs(score)}` : "0";
}

/** "9 Nov 2025, 19:02 UT": the minute the station falls in, as the calendar's times. */
export function stationMoment(utc: string, locale: AppLocale): string {
  const minute = Math.floor(Date.parse(utc) / 60_000) * 60_000;
  const when = dateFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(minute));
  return `${when} UT`;
}

export type Motion = {
  /** Its daily motion, signed: "+1°12'05"". */
  speed: string;
  /** Retrograde, stationary, swift or slow, and the share of its mean daily motion. */
  words: string[];
  /** When it turns, if it is at a station. */
  station: string;
};

/** How a body moves: its daily speed, its words, and its station's moment. */
export function motionOf(p: Placement, flag: Pick<BodyFlags, "stationary" | "fast" | "slow"> | undefined, locale: AppLocale): Motion | null {
  if (!movesOnItsOwn(p) || p.speed == null) return null;
  const words: string[] = [];
  if (p.retrograde) words.push(pointsText(locale, "retrograde"));
  if (flag?.stationary) words.push(pointsText(locale, "stationary"));
  const mean = Math.abs(MEAN_SPEED[p.id] ?? 0);
  if ((flag?.fast || flag?.slow) && mean > 0) {
    words.push(pointsText(locale, flag.fast ? "swift" : "slow"));
    words.push(pointsWord(locale, "ofMean", { pct: String(Math.round((100 * p.speed) / mean)) }));
  }
  const station = p.station
    ? pointsWord(locale, p.station.direct ? "stationDirect" : "stationRetro", { when: stationMoment(p.station.utc, locale) })
    : "";
  return { speed: formatSignedDmsSeconds(p.speed), words, station };
}

/** What else is true of a body, as short notes, with their numbers. */
export function pointNotes(p: Placement, flag: BodyFlags | undefined, chart: NatalChart, locale: AppLocale): Cell[] {
  const unknown = chart.meta.timeUnknown === true;
  const notes: Cell[] = [];
  const sun = chart.planets.find((b) => b.id === "sun");
  if (sun && (flag?.cazimi || flag?.combust)) {
    notes.push({
      text: pointsWord(locale, flag.cazimi ? "cazimiBy" : "combustBy", { arc: formatArc(separation(p.ecliptic, sun.ecliptic)) }),
      uncertain: !sunContactHolds(chart, p),
    });
  }
  if (p.kind !== "angle") {
    const near = nearestAngle(p.ecliptic, chart.angles);
    if (near) {
      notes.push({
        text: pointsWord(locale, "angularBy", { arc: formatArc(near.distance), angle: angleShort(locale, near.id) }),
        uncertain: unknown,
      });
    }
  }
  if (flag?.anaretic) notes.push({ text: pointsText(locale, "anaretic"), uncertain: !anareticHolds(chart, p) });
  if (flag?.ariesPoint) notes.push({ text: pointsText(locale, "ariesPoint"), uncertain: !ariesPointHolds(chart, p) });
  if (flag?.inSect === true) notes.push({ text: translate(locale, "inSect"), uncertain: unknown });
  else if (flag?.inSect === false) notes.push({ text: translate(locale, "outOfSect"), uncertain: unknown });
  if (flag?.unaspected) notes.push({ text: pointsText(locale, "unaspected"), uncertain: !unaspectedHolds(chart, p) });
  return notes;
}

export type DignityKindId = EssentialKind | DebilityKind | "peregrine";

export type DignityCell = {
  /** Its sign dignity or debility first, then the lesser dignities; or peregrine. */
  kinds: DignityKindId[];
  /** The kinds in words. */
  words: string[];
  label: string;
  /** Lilly's points. */
  score: number;
  scoreText: string;
  uncertain: boolean;
};

function dignityWord(kind: DignityKindId, locale: AppLocale): string {
  if (kind === "exaltation" || kind === "triplicity" || kind === "term" || kind === "face") return pointsText(locale, kind);
  return dignityName(kind, locale);
}

/**
 * A traditional planet's essential dignities where it stands, in words and
 * in Lilly's points: every kind that it holds (the triplicity of the chart's
 * sect only), so the score can be checked against them.
 */
export function dignityCell(p: Placement, isDay: boolean, chart: NatalChart, locale: AppLocale): DignityCell | null {
  if (!isTraditionalPlanet(p.id)) return null;
  const d = essentialDignity(p.id, p.ecliptic, isDay);
  const kinds: DignityKindId[] = d.peregrine
    ? ["peregrine"]
    : [
        ...d.own.filter((k) => k === "domicile" || k === "exaltation"),
        ...d.debilities,
        ...d.own.filter((k) => k !== "domicile" && k !== "exaltation"),
      ];
  const words = kinds.map((k) => dignityWord(k, locale));
  return {
    kinds,
    words,
    label: words.join(", "),
    score: d.score,
    scoreText: scoreText(d.score),
    uncertain: !dignityHolds(chart, p),
  };
}

/** Without a birth time, how far a body goes in the day, when that is worth saying. */
export function dayRangeText(p: Placement, chart: NatalChart, locale: AppLocale): string | null {
  if (chart.meta.timeUnknown !== true) return null;
  const range = chart.meta.dayRange?.[p.id as keyof NonNullable<NatalChart["meta"]["dayRange"]>];
  if (!range) return null;
  const [from, to] = range;
  if (separation(from, to) < RANGE_WORTH) return null;
  const fromSign = signFromEcliptic(from);
  const toSign = signFromEcliptic(to);
  return pointsWord(locale, "dayRange", {
    from: `${formatDegree(from)}${fromSign === toSign ? "" : ` ${signName(fromSign, locale)}`}`,
    to: `${formatDegree(to)} ${signName(toSign, locale)}`,
  });
}

export type PointRow = {
  point: Placement;
  name: string;
  /** The whole row hangs on the time (an angle, the Vertex or a lot without a birth time). */
  uncertain: boolean;
  /** Within its sign: to the second, or to the minute without a birth time. */
  position: Cell;
  sign: string;
  /** Without a birth time: where it goes over the day. */
  range: string | null;
  house: Cell;
  motion: Motion | null;
  latitude: Cell | null;
  declination: Cell | null;
  /** How far beyond the Sun's greatest declination. */
  oob: Cell | null;
  dignity: DignityCell | null;
  notes: Cell[];
};

/** One row of the Points table. */
export function pointRow(p: Placement, chart: NatalChart, patterns: ChartPatterns, locale: AppLocale): PointRow {
  const unknown = chart.meta.timeUnknown === true;
  const flag = patterns.flags[p.id];
  const rough = isRough(chart, p);
  const arc = unknown ? formatSignedDms : formatSignedDmsSeconds;
  const oob = flag?.oob ? outOfBoundsBy(p.declination, chart.meta.obliquity) : null;
  const decl = declinationOf(p, chart);
  return {
    point: p,
    name: bodyBare(p.id, locale),
    uncertain: p.uncertain === true,
    position: { text: unknown ? formatDegree(p.ecliptic) : formatDegreeSeconds(p.ecliptic), uncertain: rough },
    sign: signName(p.sign, locale),
    range: dayRangeText(p, chart, locale),
    house: { text: String(p.house), uncertain: unknown },
    motion: motionOf(p, flag, locale),
    latitude: hasLatitude(p) ? { text: arc(p.latitude), uncertain: rough } : null,
    declination: decl != null ? { text: arc(decl), uncertain: rough } : null,
    oob: oob != null ? { text: pointsWord(locale, "oobBy", { arc: (unknown ? formatArc : formatArcSeconds)(oob) }), uncertain: rough } : null,
    dignity: dignityCell(p, patterns.isDay, chart, locale),
    notes: pointNotes(p, flag, chart, locale),
  };
}

/** A Points row as a line of text, with the same facts as the table. */
export function pointRowText(r: PointRow, locale: AppLocale): string {
  const bits = [
    r.name,
    `${cellText(r.position)} ${r.sign}${r.range ? ` (${r.range})` : ""}`,
    `${mark(r.house.uncertain)}${pointsWord(locale, "houseN", { n: r.house.text })}`,
  ];
  if (r.motion) {
    bits.push(`${pointsWord(locale, "perDay", { arc: r.motion.speed })}${r.motion.words.length ? ` (${r.motion.words.join(", ")})` : ""}`);
    if (r.motion.station) bits.push(r.motion.station);
  }
  if (r.latitude) bits.push(`${pointsText(locale, "latShort")} ${cellText(r.latitude)}`);
  if (r.declination) bits.push(`${pointsText(locale, "declShort")} ${cellText(r.declination)}${r.oob ? ` (${cellText(r.oob)})` : ""}`);
  if (r.dignity) bits.push(`${mark(r.dignity.uncertain)}${r.dignity.label} ${r.dignity.scoreText}`);
  for (const n of r.notes) bits.push(cellText(n));
  return bits.join(" · ");
}

/* ── Aspects ────────────────────────────────────────────────────────── */

/** An aspect's name inside a sentence: "trine", "carré". */
export function aspectWord(type: AspectLink["type"], locale: AppLocale): string {
  return aspectName(type, locale).toLocaleLowerCase(locale === "fr" ? "fr-FR" : "en-GB");
}

/** Applying, separating, or a dash when the orb stands still. */
export function phaseWord(applying: boolean | null, locale: AppLocale): string {
  return applying === true ? translate(locale, "applying") : applying === false ? translate(locale, "separating") : translate(locale, "flagNo");
}

/* ── Patterns ───────────────────────────────────────────────────────── */

/** "Stellium in Gemini", "House 10": a stellium's place in the reader's language. */
export function stelliumPlace(place: string, locale: AppLocale): string {
  const n = /^House (\d+)$/.exec(place)?.[1];
  if (n) return houseName(Number(n), locale);
  const sign = SIGN_IDS.find((id) => SIGN_META[id].name === place);
  return sign ? signName(sign, locale) : place;
}

export type PatternItem = Cell & {
  /** What choosing it selects on the wheel (a point or a house). */
  pick?: string;
  /** A configuration, merged with its near-duplicates (table-patterns.ts). */
  shape?: MergedShape;
};

export type PatternSectionId = "configurations" | "stelliums" | "unaspected" | "voc" | "retrogrades";

export type PatternSection = {
  id: PatternSectionId;
  title: string;
  /** Empty when there is none: `none` says so. */
  items: PatternItem[];
  none: string;
};

function pointById(chart: NatalChart, id: string): Placement | undefined {
  return chartPoints(chart).find((p) => p.id === id);
}

export function patternSections(chart: NatalChart, patterns: ChartPatterns, locale: AppLocale): PatternSection[] {
  const unknown = chart.meta.timeUnknown === true;
  const names = (ids: readonly string[]) => ids.map((id) => bodyBare(id, locale)).join(", ");
  const unaspected = chart.planets.filter((p) => patterns.flags[p.id]?.unaspected);
  return [
    {
      id: "configurations",
      title: translate(locale, "patternConfigs"),
      items: mergedShapes(chart, patterns).map((shape) => ({
        text: shapeLine(shape, locale),
        uncertain: shape.uncertain,
        pick: pointSelectId(shape.representative.apex ?? shape.representative.members[0] ?? "sun"),
        shape,
      })),
      none: translate(locale, "noConfigs"),
    },
    {
      id: "stelliums",
      title: translate(locale, "patternStelliums"),
      items: patterns.stelliums.map((s) => {
        const house = /^House (\d+)$/.exec(s.place)?.[1];
        const members = s.members.map((id) => pointById(chart, id));
        return {
          text: `${stelliumPlace(s.place, locale)}${colon(locale)}${names(s.members)}`,
          uncertain: unknown && (house != null || !members.every((p) => p && signHolds(chart, p))),
          pick: house ? `house:${house}` : pointSelectId(s.members[0] ?? "sun"),
        };
      }),
      none: translate(locale, "noStelliums"),
    },
    {
      id: "unaspected",
      title: translate(locale, "patternUnaspected"),
      items: unaspected.length
        ? [{ text: names(unaspected.map((p) => p.id)), uncertain: !unaspected.every((p) => unaspectedHolds(chart, p)) }]
        : [],
      none: translate(locale, "noUnaspected"),
    },
    {
      id: "voc",
      title: translate(locale, "patternVoc"),
      items: [
        { text: translate(locale, patterns.vocMoon ? "vocYes" : "vocNo"), uncertain: unknown },
        ...(moonCourseText(chart, locale) ? [{ text: moonCourseText(chart, locale) as string, uncertain: unknown, pick: pointSelectId("moon") }] : []),
      ],
      none: "",
    },
    {
      id: "retrogrades",
      title: translate(locale, "patternRx"),
      items: patterns.retrogrades.length
        ? [{ text: `${patterns.retrogrades.length} · ${names(patterns.retrogrades)}`, uncertain: false }]
        : [],
      none: translate(locale, "noRx"),
    },
  ];
}

/** "2 h 04 min": from one moment to another, each taken to the minute it falls in (as the times beside it). */
function spanText(from: number, to: number, locale: AppLocale): string {
  const total = Math.max(0, Math.floor(to / 60_000) - Math.floor(from / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? patternsWord(locale, "hoursMinutes", { h: String(h), m: String(m).padStart(2, "0") }) : patternsWord(locale, "minutes", { m: String(m) });
}

/**
 * The Moon's course from the birth moment, from the cast's own search on the
 * ephemeris: its next major aspect and when, and when it enters the next
 * sign; or that it makes none before (void of course). Null on a chart cast
 * before the search existed.
 */
export function moonCourseText(chart: NatalChart, locale: AppLocale): string | null {
  const c = chart.meta.moonCourse;
  if (!c) return null;
  const born = Date.parse(chart.meta.utc);
  const leaves = Date.parse(c.leaves.utc);
  const enters = stationMoment(c.leaves.utc, locale);
  const sign = signName(c.leaves.sign, locale);
  if (!c.next) return patternsWord(locale, "courseVoid", { sign, enters, after: spanText(born, leaves, locale) });
  return patternsWord(locale, "courseNext", {
    aspect: aspectWord(c.next.type, locale),
    body: bodyBare(c.next.body, locale),
    when: stationMoment(c.next.utc, locale),
    after: spanText(born, Date.parse(c.next.utc), locale),
    sign,
    enters,
  });
}

/* ── Balance ────────────────────────────────────────────────────────── */

export type BalanceGroupId = "elements" | "modalities" | "polarity" | "hemisphere" | "quadrants" | "angularity";

export type BalanceGroup = {
  id: BalanceGroupId;
  title: string;
  /** Each row's weighted score and the bodies that make it, heaviest first. */
  rows: { id: string; label: string; value: number; color?: string; bodies: BodyId[] }[];
  uncertain: boolean;
};

/** The bodies weighed in the balance (patterns.ts buildPatterns): the angles too, unless the birth time is unknown. */
function weighed(chart: NatalChart): Placement[] {
  const pool = chart.meta.timeUnknown === true ? chart.planets : [...chart.planets, ...Object.values(chart.angles)];
  return pool
    .filter((p) => (BALANCE_WEIGHT[p.id] ?? 0) > 0)
    .sort((a, b) => (BALANCE_WEIGHT[b.id] ?? 0) - (BALANCE_WEIGHT[a.id] ?? 0));
}

export function balanceGroups(chart: NatalChart, patterns: ChartPatterns, locale: AppLocale): BalanceGroup[] {
  const unknown = chart.meta.timeUnknown === true;
  const w = patterns.weights;
  const bodies = weighed(chart);
  const where = (test: (p: Placement) => boolean) => bodies.filter(test).map((p) => p.id);
  const element = (p: Placement) => SIGN_META[p.sign].element;
  const east = (p: Placement) => [10, 11, 12, 1, 2, 3].includes(p.house);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  // Without a birth time the balance is weighed on the bodies alone (anatomy.ts):
  // it holds unless one of them changes sign in the day.
  const bySign = unknown && !signsHold(chart, CLASSIC_BODIES);
  return [
    {
      id: "elements",
      title: t("lookElements"),
      rows: (["fire", "earth", "air", "water"] as const).map((e) => ({
        id: e,
        label: elementName(e, locale),
        value: w.elements[e],
        color: `var(--el-${e})`,
        bodies: where((p) => element(p) === e),
      })),
      uncertain: bySign,
    },
    {
      id: "modalities",
      title: t("tableModalities"),
      rows: (["cardinal", "fixed", "mutable"] as const).map((m) => ({
        id: m,
        label: modalityName(m, locale),
        value: w.modalities[m],
        bodies: where((p) => SIGN_META[p.sign].modality === m),
      })),
      uncertain: bySign,
    },
    {
      id: "polarity",
      title: t("tablePolarity"),
      rows: [
        { id: "pos", label: t("polarityPositive"), value: w.polarity.positive, bodies: where((p) => element(p) === "fire" || element(p) === "air") },
        { id: "neg", label: t("polarityNegative"), value: w.polarity.negative, bodies: where((p) => element(p) === "earth" || element(p) === "water") },
      ],
      uncertain: bySign,
    },
    {
      id: "hemisphere",
      title: t("overlayHemisphere"),
      rows: [
        { id: "e", label: t("hemiEast"), value: w.hemisphere.east, bodies: where(east) },
        { id: "w", label: t("hemiWest"), value: w.hemisphere.west, bodies: where((p) => !east(p)) },
        { id: "n", label: t("hemiNorth"), value: w.hemisphere.north, bodies: where((p) => p.house < 7) },
        { id: "s", label: t("hemiSouth"), value: w.hemisphere.south, bodies: where((p) => p.house >= 7) },
      ],
      uncertain: unknown,
    },
    {
      id: "quadrants",
      title: t("overlayQuadrant"),
      rows: [t("quad1"), t("quad2"), t("quad3"), t("quad4")].map((label, i) => ({
        id: `q${i + 1}`,
        label,
        value: w.quadrants[i] ?? 0,
        bodies: where((p) => Math.floor((p.house - 1) / 3) === i),
      })),
      uncertain: unknown,
    },
    {
      id: "angularity",
      title: t("overlayAngularity"),
      rows: [
        { id: "a", label: t("tempoAngular"), value: w.angularity.angular, bodies: where((p) => houseTempo(p.house) === "angular") },
        { id: "s", label: t("tempoSuccedent"), value: w.angularity.succedent, bodies: where((p) => houseTempo(p.house) === "succedent") },
        { id: "c", label: t("tempoCadent"), value: w.angularity.cadent, bodies: where((p) => houseTempo(p.house) === "cadent") },
      ],
      uncertain: unknown,
    },
  ];
}

/** "Elements: Fire 7 · Earth 3 · Air 5 · Water 2". */
export function balanceGroupText(g: BalanceGroup, locale: AppLocale = "en"): string {
  const row = (r: BalanceGroup["rows"][number]) =>
    `${r.label} ${weightText(r.value, locale)}${r.bodies.length ? ` (${r.bodies.map((id) => bodyBare(id, locale)).join(", ")})` : ""}`;
  return `${mark(g.uncertain)}${g.title}${colon(locale)}${g.rows.map(row).join(" · ")}`;
}

/* ── Chart ──────────────────────────────────────────────────────────── */

export type ChartFactId = "name" | "born" | "ut" | "place" | "lst" | "houses" | "sect" | "phase" | "settings";

export type ChartFact = {
  id: ChartFactId;
  label: string;
  value: string;
  /** Set in the monospace face (a date, a time, a number). */
  mono?: boolean;
  /** Said after the value, in the text face. */
  note?: string;
  /** A second line under the value. */
  detail?: string;
  detailMono?: boolean;
  /** Depends on the birth time, which is unknown: marked ~ and dimmed. */
  uncertain?: boolean;
};

/**
 * The Chart part: the moment, the place and how the chart is cast. Each fact
 * a label, a value and, under it, its detail.
 */
export function chartFacts(chart: NatalChart, isDay: boolean, locale: AppLocale): ChartFact[] {
  const meta = chart.meta;
  const unknown = meta.timeUnknown === true;
  const facts: ChartFact[] = [];
  facts.push({ id: "name", label: chartFactText(locale, "name"), value: meta.name });

  const julian = meta.birthTime?.calendar === "julian" ? ` · ${translate(locale, "tzJulianShort")}` : "";
  facts.push({
    id: "born",
    label: chartFactText(locale, "born"),
    value: unknown ? formatEuropeanDate(meta.date) : `${formatEuropeanDate(meta.date)} ${meta.time}`,
    mono: true,
    note: unknown ? chartFactText(locale, "timeUnknown") : undefined,
    detail: `${unknown ? chartFactText(locale, "standIn") : birthZoneLine(meta, locale)}${julian}`,
  });

  const jd = julianDayLine(meta);
  facts.push({
    id: "ut",
    label: chartFactText(locale, "universalTime"),
    value: universalTimeLine(meta),
    mono: true,
    detail: jd ?? undefined,
    detailMono: true,
    uncertain: unknown,
  });

  facts.push({
    id: "place",
    label: chartFactText(locale, "place"),
    value: meta.placeLabel,
    detail: formatLatLon(meta.latitude, meta.longitude, locale),
    detailMono: true,
  });

  const lst = localSiderealHours(chart);
  if (lst != null) {
    facts.push({
      id: "lst",
      label: chartFactText(locale, "sidereal"),
      value: formatHms(lst),
      mono: true,
      detail: meta.obliquity != null ? chartFactText(locale, "obliquity", { arc: formatArcSeconds(meta.obliquity) }) : undefined,
      uncertain: unknown,
    });
  }

  const system = translate(locale, HOUSE_SYSTEM_LABEL[meta.houseSystem] ?? "housePlacidus");
  const requested = meta.houseSystemRequested ? translate(locale, HOUSE_SYSTEM_LABEL[meta.houseSystemRequested]) : null;
  facts.push({
    id: "houses",
    label: chartFactText(locale, "houses"),
    value: requested ? chartFactText(locale, "fallback", { system, requested }) : system,
    uncertain: unknown,
  });

  const alt = meta.sunAltitude;
  facts.push(
    unknown
      ? { id: "sect", label: chartFactText(locale, "sect"), value: chartFactText(locale, "needsTime"), uncertain: true }
      : {
          id: "sect",
          label: chartFactText(locale, "sect"),
          value: translate(locale, isDay ? "tableDay" : "tableNight"),
          detail:
            alt != null
              ? chartFactText(locale, alt >= 0 ? "sunAbove" : "sunBelow", { arc: formatArc(Math.abs(alt)) })
              : translate(locale, isDay ? "tableSunAbove" : "tableSunBelow"),
        },
  );

  const sun = chart.planets.find((p) => p.id === "sun");
  const moon = chart.planets.find((p) => p.id === "moon");
  if (sun && moon) {
    const phase = moonPhase(sun.ecliptic, moon.ecliptic, moon.latitude ?? 0);
    facts.push({
      id: "phase",
      label: chartFactText(locale, "moonPhase"),
      value: moonPhaseName(locale, phase.phase),
      detail: chartFactText(locale, "phaseDetail", {
        arc: formatArc(phase.angle),
        lit: String(Math.round(phase.lit * 100)),
        trend: chartFactText(locale, phase.waxing ? "waxing" : "waning"),
      }),
      uncertain: unknown,
    });
  }

  facts.push({ id: "settings", label: chartFactText(locale, "settings"), value: chartFactText(locale, "settingsLine") });
  return facts;
}

/** A Chart fact as a line of text: "Label: value · note (detail)". */
export function chartFactLine(f: ChartFact, locale: AppLocale = "en"): string {
  return `${f.label}${colon(locale)}${mark(f.uncertain === true)}${f.value}${f.note ? ` · ${f.note}` : ""}${f.detail ? ` (${f.detail})` : ""}`;
}
