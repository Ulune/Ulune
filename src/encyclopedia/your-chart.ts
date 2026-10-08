/*
 * "In your chart" (encyclopedia plan, part 18): the charts the studio holds,
 * summed up for the encyclopedia's pages, for this tab only. The studio
 * publishes them (src/studio/your-chart-publish.ts); a page reads them after
 * it is drawn, so the page itself stays the same for everyone and nothing
 * leaves the browser or is stored. Light on purpose, with no import: the
 * encyclopedia reads it without loading the studio, as with "Back to your
 * chart" (src/studio/return-target.ts).
 *
 * Every id is an encyclopedia entry's id ("saturn", "north-node",
 * "imum-coeli", "semi-square", "hd-gate-34"…), so a page compares its own id
 * with them; `ref` is the studio's reading for it ("planet:saturn").
 */

export type YourDignity = "domicile" | "exaltation" | "detriment" | "fall";

export type YourBody = {
  /** The entry's id: "saturn", "north-node", "ascendant", "imum-coeli". */
  id: string;
  /** The studio's reading: "planet:saturn", "angle:ascendant". */
  ref: string;
  sign: string;
  /** Degrees within the sign, 0 to 30. */
  deg: number;
  /** 1 to 12; null without a birth time, or for an angle. */
  house: number | null;
  retro: boolean;
  dignity: YourDignity | null;
  angle: boolean;
};

export type YourAspect = {
  a: string;
  b: string;
  /** The aspect's entry: "trine", "semi-square". */
  type: string;
  /** Degrees from exact. */
  orb: number;
  applying: boolean | null;
  ref: string;
};

export type YourNumber = {
  /** The place's entry: "life-path", "soul-urge", "personality-number", "attitude-number", "personal-year". */
  place: string;
  /** The number as kept (11, 22, 33 whole). */
  value: number;
  ref: string;
  /** The karmic debt met on the way (13, 14, 16, 19), if any. */
  debt: number | null;
};

export type YourGate = { gate: number; line: number; layer: "personality" | "design"; body: string };

export type YourHd = {
  /** Entry ids: "hd-generator", "hd-authority-sacral", "hd-profile-1-3". */
  type: string;
  authority: string;
  profile: string;
  /** "None", "Single", "Split"… as the bodygraph names it. */
  definition: string;
  /** Defined centres, as entries ("hd-centre-sacral"). */
  centres: string[];
  gates: YourGate[];
  /** Defined channels, as entries ("hd-channel-34-20"), with the layers that complete them. */
  channels: { id: string; personality: boolean; design: boolean }[];
};

export type YourChart = {
  /** The library's id for the chart. */
  id: string;
  /** Its name as the reader gave it ("" when none). */
  label: string;
  timeUnknown: boolean;
  isDay: boolean;
  bodies: YourBody[];
  /** The twelve cusps' signs, 1st first; null without a birth time. */
  cusps: string[] | null;
  /** Tightest first. */
  aspects: YourAspect[];
  /** Null until worked out (numerology's code is its own download), or without a birth date. */
  numbers: YourNumber[] | null;
  /** Only when the bodygraph was cast in this tab. */
  hd: YourHd | null;
};

export type YourCharts = { active: string | null; charts: YourChart[] };

let state: YourCharts | null = null;
let chosen: string | null = null;
let asked: { chart: string; ref: string } | null = null;
const listeners = new Set<() => void>();

export function setYourCharts(next: YourCharts | null): void {
  state = next && next.charts.length ? next : null;
  for (const fn of listeners) fn();
}

/** The charts of this tab, null when the studio has none (or was not opened). */
export function yourCharts(): YourCharts | null {
  return state;
}

export function onYourCharts(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The chart the encyclopedia speaks of: the one the reader chose on a page, else the studio's open chart. */
export function yourChart(): YourChart | null {
  if (!state) return null;
  const by = (id: string | null) => (id ? state?.charts.find((c) => c.id === id) : undefined);
  return by(chosen) ?? by(state.active) ?? state.charts[0] ?? null;
}

export function chooseYourChart(id: string): void {
  chosen = id;
  for (const fn of listeners) fn();
}

/*
 * The bodygraphs the Human Design page cast in this tab, by their chart's
 * moment (useHumanDesign's key), kept here so that page needs nothing more
 * (the studio's publisher reads them).
 */
const bodygraphs = new Map<string, unknown>();
let onBodygraph: (() => void) | null = null;

export function noteBodygraph(key: string, hd: unknown): void {
  bodygraphs.set(key, hd);
  onBodygraph?.();
}

export function bodygraphOf(key: string): unknown {
  return bodygraphs.get(key);
}

export function onBodygraphs(fn: () => void): void {
  onBodygraph = fn;
}

/** "Open the reading": what the studio shows when it opens next. */
export function askReading(chart: string, ref: string): void {
  asked = { chart, ref };
}

/** The reading asked from a page, once. */
export function takeAskedReading(): { chart: string; ref: string } | null {
  const out = asked;
  asked = null;
  return out;
}
