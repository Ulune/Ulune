/**
 * The bodygraph's drawing: where the nine centres, 64 gates and 36 channels
 * sit, in one viewBox. It follows the standard layout (Head pointing up, Ajna
 * down, the Heart a small triangle pointing up, the Spleen and the Solar
 * Plexus pointing in), each gate on the rim of its centre, on the side facing
 * the centre at the other end of its channel.
 *
 * Eight rules keep it readable; scripts/bodygraph-geometry.test.mjs checks
 * every one of them (gates 22 units apart or more, no channel within 12.5
 * units of a gate that is not its own, no channel through a centre, every
 * channel long enough to show both halves, only the standard crossings, one
 * bend). Change a number here and run that test.
 */
import { HD_CHANNELS, type HdCenterId } from "./human-design";

export type Pt = readonly [number, number];

/** The drawing's box, units. */
export const BODYGRAPH_W = 470;
export const BODYGRAPH_H = 674;
/** A gate's disc, units (its number is drawn at 10.5). */
export const GATE_R = 9.5;

export type CenterShape = "tri-up" | "tri-down" | "square" | "diamond" | "tri-right" | "tri-left";

const CX = BODYGRAPH_W / 2;
/** Three gates along one side: this far apart. */
const STEP = 24;

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const r2 = (p: Pt): Pt => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];

const centers = {} as Record<HdCenterId, { shape: CenterShape; points: Pt[] }>;
const gates: Record<number, { x: number; y: number; center: HdCenterId }> = {};
const put = (gate: number, p: Pt, center: HdCenterId) => {
  const [x, y] = r2(p);
  gates[gate] = { x, y, center };
};

// Head: a triangle pointing up, its three gates along the base.
{
  const base = 72;
  centers.head = { shape: "tri-up", points: [[CX, 12], [CX + 44, base], [CX - 44, base]] };
  [64, 61, 63].forEach((g, i) => put(g, [CX + (i - 1) * STEP, base], "head"));
}
// Ajna: a triangle pointing down; 47 · 24 · 4 on top, 17 and 11 on the sides, 43 at the point.
{
  const l: Pt = [CX - 44, 104];
  const r: Pt = [CX + 44, 104];
  const a: Pt = [CX, 170];
  centers.ajna = { shape: "tri-down", points: [l, r, a] };
  [47, 24, 4].forEach((g, i) => put(g, [CX + (i - 1) * STEP, 104], "ajna"));
  put(17, lerp(l, a, 0.58), "ajna");
  put(43, a, "ajna");
  put(11, lerp(r, a, 0.58), "ajna");
}
// Throat: a square; 62 · 23 · 56 on top, 16 on the left, 20 on its lower-left
// corner (its three channels all leave downward), 35 · 12 · 45 on the right,
// 31 · 8 · 33 along the bottom.
{
  const top = 200;
  const side = 88;
  const h = side / 2;
  const bottom = top + side;
  centers.throat = { shape: "square", points: [[CX - h, top], [CX + h, top], [CX + h, bottom], [CX - h, bottom]] };
  [62, 23, 56].forEach((g, i) => put(g, [CX + (i - 1) * STEP, top], "throat"));
  put(16, [CX - h, top + 28], "throat");
  put(20, [CX - h, bottom], "throat");
  [35, 12, 45].forEach((g, i) => put(g, [CX + h, top + [14, 42, 70][i]], "throat"));
  [31, 8, 33].forEach((g, i) => put(g, [CX + [-20, 2, 24][i], bottom], "throat"));
}
// G: a diamond; 1 · 25 · 2 · 10 at the corners, 13 · 46 · 15 · 7 on the sides.
{
  const cy = 368;
  const d = 50;
  const t: Pt = [CX, cy - d];
  const r: Pt = [CX + d, cy];
  const b: Pt = [CX, cy + d];
  const l: Pt = [CX - d, cy];
  centers.g = { shape: "diamond", points: [t, r, b, l] };
  put(1, t, "g");
  put(13, lerp(t, r, 0.5), "g");
  put(25, r, "g");
  put(46, lerp(r, b, 0.5), "g");
  put(2, b, "g");
  put(15, lerp(b, l, 0.5), "g");
  put(10, l, "g");
  put(7, lerp(l, t, 0.5), "g");
}
// Heart: a small triangle pointing up, its point a little right of centre;
// 21 at the point, 51 on the left side, 26 and 40 at the base corners.
{
  const x = 309;
  const top = 358;
  const w = 50;
  const h = 58;
  const bl: Pt = [x, top + h];
  const br: Pt = [x + w, top + h];
  const ap: Pt = [x + w * 0.55, top];
  centers.heart = { shape: "tri-up", points: [ap, br, bl] };
  put(21, ap, "heart");
  put(51, lerp(ap, bl, 0.55), "heart");
  put(26, bl, "heart");
  put(40, br, "heart");
}
// Spleen (left, pointing right) and Solar Plexus (right, pointing left).
{
  const top = 438;
  const height = 124;
  const width = 62;
  const inset = 19;
  const sT: Pt = [inset, top];
  const sB: Pt = [inset, top + height];
  const sA: Pt = [inset + width, top + height / 2];
  centers.spleen = { shape: "tri-right", points: [sT, sA, sB] };
  put(48, lerp(sT, sA, 0.2), "spleen");
  put(57, lerp(sT, sA, 0.46), "spleen");
  put(44, lerp(sT, sA, 0.72), "spleen");
  put(50, sA, "spleen");
  put(32, lerp(sA, sB, 0.28), "spleen");
  put(28, lerp(sA, sB, 0.54), "spleen");
  put(18, lerp(sA, sB, 0.8), "spleen");
  const pT: Pt = [BODYGRAPH_W - inset, top];
  const pB: Pt = [BODYGRAPH_W - inset, top + height];
  const pA: Pt = [BODYGRAPH_W - inset - width, top + height / 2];
  centers.solarPlexus = { shape: "tri-left", points: [pT, pB, pA] };
  put(36, lerp(pT, pA, 0.2), "solarPlexus");
  put(22, lerp(pT, pA, 0.46), "solarPlexus");
  put(37, lerp(pT, pA, 0.72), "solarPlexus");
  put(6, pA, "solarPlexus");
  put(49, lerp(pA, pB, 0.28), "solarPlexus");
  put(55, lerp(pA, pB, 0.54), "solarPlexus");
  put(30, lerp(pA, pB, 0.8), "solarPlexus");
}
// Sacral: a square; 5 · 14 · 29 on top, 34 and 27 on the left, 59 on the right, 42 · 3 · 9 along the bottom.
{
  const top = 466;
  const side = 80;
  const h = side / 2;
  const bottom = top + side;
  centers.sacral = { shape: "square", points: [[CX - h, top], [CX + h, top], [CX + h, bottom], [CX - h, bottom]] };
  [5, 14, 29].forEach((g, i) => put(g, [CX + (i - 1) * STEP, top], "sacral"));
  put(34, [CX - h, top + 20], "sacral");
  put(27, [CX - h, top + 54], "sacral");
  put(59, [CX + h, top + 44], "sacral");
  [42, 3, 9].forEach((g, i) => put(g, [CX + (i - 1) * STEP, bottom], "sacral"));
}
// Root: a square; 53 · 60 · 52 on top, 54 · 38 · 58 on the left, 19 · 39 · 41 on the right.
{
  const top = 582;
  const side = 80;
  const h = side / 2;
  const bottom = top + side;
  centers.root = { shape: "square", points: [[CX - h, top], [CX + h, top], [CX + h, bottom], [CX - h, bottom]] };
  [53, 60, 52].forEach((g, i) => put(g, [CX + (i - 1) * STEP, top], "root"));
  [54, 38, 58].forEach((g, i) => put(g, [CX - h, top + 22 + i * 22], "root"));
  [19, 39, 41].forEach((g, i) => put(g, [CX + h, top + 22 + i * 22], "root"));
}

export const BODYGRAPH_CENTERS: Readonly<Record<HdCenterId, { shape: CenterShape; points: readonly Pt[] }>> = centers;
export const BODYGRAPH_GATES: Readonly<Record<number, { x: number; y: number; center: HdCenterId }>> = gates;

/** How far left of gate 10 the 34–20 channel passes, round the G's corner. */
const BEND_34_20 = 24;

export type ChannelDrawing = {
  /** The channel's line, from its first gate (as in HD_CHANNELS) to its second. */
  points: readonly Pt[];
  /** SVG path of the whole line, and of each half (first gate to the middle, middle to the second). */
  d: string;
  dA: string;
  dB: string;
  length: number;
};

const num = (n: number) => String(Math.round(n * 100) / 100);
const pathOf = (pts: readonly Pt[]) => `M${pts.map((p) => `${num(p[0])} ${num(p[1])}`).join("L")}`;
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function drawChannel(points: Pt[]): ChannelDrawing {
  const lens = points.slice(1).map((p, i) => dist(points[i], p));
  const length = lens.reduce((s, l) => s + l, 0);
  // The middle, by length along the line.
  let acc = 0;
  let k = 0;
  while (k < lens.length - 1 && acc + lens[k] < length / 2) acc += lens[k++];
  const mid = lerp(points[k], points[k + 1], (length / 2 - acc) / lens[k]);
  const first = [...points.slice(0, k + 1), mid];
  const second = [mid, ...points.slice(k + 1)];
  return { points, d: pathOf(points), dA: pathOf(first), dB: pathOf(second), length };
}

const channels: Record<string, ChannelDrawing> = {};
for (const ch of HD_CHANNELS) {
  const [a, b] = ch.gates;
  const ga = gates[a];
  const gb = gates[b];
  const pa: Pt = [ga.x, ga.y];
  const pb: Pt = [gb.x, gb.y];
  if (ch.id === "34–20") {
    // Round the G's left corner instead of through gate 10.
    const g10 = gates[10];
    channels[ch.id] = drawChannel([pa, [g10.x - BEND_34_20, g10.y], pb]);
  } else {
    channels[ch.id] = drawChannel([pa, pb]);
  }
}

export const BODYGRAPH_CHANNELS: Readonly<Record<string, ChannelDrawing>> = channels;

/** A centre's outline as an SVG path. */
export function centerPath(id: HdCenterId): string {
  return `${pathOf(BODYGRAPH_CENTERS[id].points)}Z`;
}
