/**
 * How the wheel draws its lines (see the chart visibility plan):
 *
 *  - a line style per aspect, so the family reads without colour: an
 *    opposition is the heaviest solid line, a sextile a long dash, a
 *    quincunx a dash-dot, the other minors fine dots, and a conjunction a
 *    yoke joining its two bodies' glyphs (a chord between two neighbours on
 *    the aspect circle is a few pixels long: invisible);
 *  - orb as weight, with opacity floors per theme, so the widest orb still
 *    shows (on the cream theme the same opacity is about half as visible);
 *  - inks: a chart colour drawn as a line or a glyph is the colour itself on
 *    the dark theme, a deeper version of it on the light one (styles.css
 *    `--ink-keep` for glyphs, `--line-keep` for lines: the same hue, as
 *    saturated), so pale hues keep their contrast on cream;
 *  - the lanes conjunction yokes nest in.
 *
 * Pure: shared by the wheel and its tests.
 */
import type { AspectId, AspectLink } from "./types";

export type AspectPattern = "arc" | "solid" | "dash" | "dashdot" | "dots";

export const ASPECT_PATTERN: Record<AspectId, AspectPattern> = {
  conjunction: "arc",
  opposition: "solid",
  square: "solid",
  trine: "solid",
  sextile: "dash",
  quincunx: "dashdot",
  semisextile: "dots",
  semisquare: "dots",
  quintile: "dots",
};

/** Dash per pattern, screen px (the wheel's strokes do not scale with it). */
export const PATTERN_DASH: Record<AspectPattern, string | undefined> = {
  arc: undefined,
  solid: undefined,
  dash: "6 3.5",
  dashdot: "7 3 0.01 3",
  dots: "0.01 3.2",
};

/** Stroke weight by aspect: the opposition is the chart's backbone. */
export const ASPECT_WEIGHT: Record<AspectId, number> = {
  conjunction: 1.15,
  opposition: 1.3,
  square: 1.05,
  trine: 1,
  sextile: 1,
  quincunx: 1,
  semisextile: 1,
  semisquare: 1,
  quintile: 1,
};

export type LineTheme = "dark" | "light";
export type LineEmphasis = "base" | "lit" | "dim";

/** Resting opacity: the widest orb at the floor, the exact aspect at the top. */
export const OPACITY: Record<LineTheme, { major: [number, number]; minor: [number, number]; dim: [number, number] }> = {
  dark: { major: [0.45, 0.95], minor: [0.3, 0.75], dim: [0.1, 0.22] },
  // On cream a line thinned by opacity turns pastel, a colour of its own:
  // lines stay near full ink and their width carries the orb.
  light: { major: [0.72, 1], minor: [0.56, 0.9], dim: [0.2, 0.32] },
};

/** Thinnest line the wheel draws (px): under ~0.7 px a line lands between pixel rows. */
export const ASPECT_MIN_W = 1;

/** 0..1 from the orb: 1 is exact, 0 at the widest orb the wheel draws. */
export function orbTightness(a: Pick<AspectLink, "orb" | "level">): number {
  const cap = a.level === "minor" ? 3.2 : 10;
  return Math.max(0, Math.min(1, 1 - a.orb / cap));
}

export type AspectLook = { width: number; opacity: number; dash: string | undefined; pattern: AspectPattern };

/** How an aspect's line is drawn at rest, lit (in focus) and dimmed (another focus). */
export function aspectLook(
  a: Pick<AspectLink, "orb" | "level" | "type">,
  emphasis: LineEmphasis,
  strokeScale: number,
  theme: LineTheme,
): AspectLook {
  const t = orbTightness(a);
  const minor = a.level === "minor";
  const pattern = ASPECT_PATTERN[a.type] ?? "solid";
  const weight = ASPECT_WEIGHT[a.type] ?? 1;
  const baseW = (minor ? 1.1 : 1.15) * weight;
  const spanW = (minor ? 1.0 : 2.05) * weight;
  // Dots are as wide as the line: a hairline dot would vanish. A
  // conjunction's yoke stays fine: in a stellium they nest a few px apart.
  const floorW = pattern === "dots" ? 1.7 : ASPECT_MIN_W;
  const width =
    pattern === "arc"
      ? Math.max(ASPECT_MIN_W, (1.1 + t * 0.6) * strokeScale)
      : Math.max(floorW, (baseW + t * spanW) * strokeScale);
  const [lo, hi] = OPACITY[theme][minor ? "minor" : "major"];
  const opacity = lo + t * (hi - lo);
  const dash = PATTERN_DASH[pattern];
  if (emphasis === "lit") return { width: width + 0.55, opacity: Math.min(1, opacity + 0.2), dash, pattern };
  if (emphasis === "dim") {
    const [dlo, dhi] = OPACITY[theme].dim;
    return { width, opacity: dlo + t * (dhi - dlo), dash, pattern };
  }
  return { width, opacity, dash, pattern };
}

/**
 * A chart colour as ink for a glyph: itself on the dark theme, deeper on the
 * light one (--ink-keep: 100% / 76%). It deepens toward black in oklch, so
 * its hue and its saturation stay (toward the warm text colour, blues went
 * grey and greens olive).
 */
export function ink(color: string): string {
  const keep = PALE.test(color) ? "var(--ink-keep-pale, var(--ink-keep, 100%))" : "var(--ink-keep, 100%)";
  return `color-mix(in oklch, ${color} ${keep}, black)`;
}

/**
 * The pale hues, air's yellow and the conjunctions' gold, take more ink on
 * cream (--ink-keep-pale, --line-keep-pale) to keep a 3:1 contrast there.
 */
const PALE = /--(?:el-air|aspect-conj|aspect-outer-conj)\)/;

/**
 * A chart colour as ink for an aspect line: itself on the dark theme, barely
 * deeper on the light one (--line-keep: 100% / 88%), so a line reads in its
 * element's colour on both.
 */
export function lineInk(color: string): string {
  const keep = PALE.test(color) ? "var(--line-keep-pale, var(--line-keep, 100%))" : "var(--line-keep, 100%)";
  return `color-mix(in oklch, ${color} ${keep}, black)`;
}

/** Signed shortest turn from `a` to `b`, degrees (−180 … 180). */
export function turn(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

export type YokeSpan = {
  /** Where it starts (degrees): the end it leaves going the short way round in zodiac order. */
  from: number;
  /** How far it runs (degrees, 0 … 180). */
  len: number;
  /** Its middle (degrees). */
  mid: number;
};

const norm360 = (a: number) => ((a % 360) + 360) % 360;

/** A conjunction's yoke between two places (its bodies' glyphs, or their degrees): the short way round. */
export function yokeSpan(a: number, b: number): YokeSpan {
  const d = turn(a, b);
  const from = norm360(d >= 0 ? a : b);
  const len = Math.abs(d);
  return { from, len, mid: norm360(from + len / 2) };
}

/** How much two spans share (degrees), round the circle; ends that only meet share nothing. */
export function yokeOverlap(a: Pick<YokeSpan, "from" | "len">, b: Pick<YokeSpan, "from" | "len">): number {
  const s = norm360(b.from - a.from);
  let out = 0;
  for (const at of [s, s - 360]) out += Math.max(0, Math.min(a.len, at + b.len) - Math.max(0, at));
  return out;
}

/**
 * Lanes for yokes, the first hugging the glyphs: narrower yokes are placed
 * first and each takes the lane under every yoke it shares any stretch with,
 * so a yoke that spans others runs beneath them (nested like brackets, never
 * crossing them) and yokes that only meet at a body share a lane. Lanes past
 * `maxLanes` fold onto the last.
 */
export function yokeLanes(spans: Pick<YokeSpan, "from" | "len">[], maxLanes: number, touch = 0.05): number[] {
  const order = spans.map((_, i) => i).sort((i, j) => spans[i].len - spans[j].len || spans[i].from - spans[j].from);
  const out = new Array<number>(spans.length).fill(0);
  const done: number[] = [];
  for (const i of order) {
    let lane = 0;
    for (const j of done) if (yokeOverlap(spans[i], spans[j]) > touch) lane = Math.max(lane, out[j] + 1);
    out[i] = Math.min(lane, maxLanes - 1);
    done.push(i);
  }
  return out;
}
