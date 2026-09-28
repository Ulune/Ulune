/*
 * Human Design below the line, and the node (the Human Design plan, part 46):
 *   - gate, line, colour, tone and base derived again here by another road
 *     (nested intervals, not division), on 200,000 longitudes;
 *   - the four arrows (tones 1 to 3 left, 4 to 6 right) on the sample chart;
 *   - the true node, checked against the node rows of a real Jovian Archive
 *     chart published by a third party (Pensacola, 18 Oct 1993, 01:30 CDT);
 *   - without a birth time, what could differ is listed; with one, whether
 *     each arrow keeps its colour and side half an hour either side.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateHumanDesign, calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { HD_BASES, HD_BASE_SIZE, hdArrowLeft, hdArrowsOf, hdFineOf } from "../src/lib/chart/hd-variable.ts";
import { eclipticToGate, HD_GATE_41_START, HD_GATE_SIZE, HD_GATE_WHEEL, HD_LINE_SIZE } from "../src/lib/chart/human-design.ts";

/** A small seeded generator, so a failure can be replayed. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Which of `n` equal slices of [from, from + size) holds x (x already inside). */
function slice(x, from, size, n) {
  const step = size / n;
  for (let i = 0; i < n; i += 1) if (x < from + (i + 1) * step) return { i, from: from + i * step, size: step };
  return { i: n - 1, from: from + (n - 1) * step, size: step };
}

/** Gate to base by walking the wheel from gate 41 at 302°, slice by slice. */
function walk(lon) {
  let x = lon;
  while (x < HD_GATE_41_START) x += 360;
  while (x >= HD_GATE_41_START + 360) x -= 360;
  const g = slice(x, HD_GATE_41_START, 360, 64);
  const l = slice(x, g.from, g.size, 6);
  const c = slice(x, l.from, l.size, 6);
  const t = slice(x, c.from, c.size, 6);
  const b = slice(x, t.from, t.size, 5);
  return { gate: HD_GATE_WHEEL[g.i], line: l.i + 1, color: c.i + 1, tone: t.i + 1, base: b.i + 1, edge: Math.min(x - b.from, b.from + b.size - x) };
}

test("the sizes: 69,120 bases, a colour 0.15625°, a tone 1/38.4°, a base 1/192°", () => {
  assert.equal(HD_BASES, 69120);
  assert.ok(Math.abs(HD_BASE_SIZE * 5 * 6 * 6 - HD_LINE_SIZE) < 1e-12);
  assert.ok(Math.abs(HD_BASE_SIZE * 5 * 6 * 6 * 6 - HD_GATE_SIZE) < 1e-12);
  assert.ok(Math.abs(HD_BASE_SIZE * 5 * 6 - 0.15625) < 1e-12);
  assert.ok(Math.abs(HD_BASE_SIZE * 5 - 1 / 38.4) < 1e-12);
  assert.ok(Math.abs(HD_BASE_SIZE - 1 / 192) < 1e-12);
});

test("gate, line, colour, tone and base agree with a second derivation on 200,000 longitudes", () => {
  const next = rng(20260928);
  let checked = 0;
  for (let i = 0; i < 200_000; i += 1) {
    const lon = next() * 360;
    const w = walk(lon);
    // Within a billionth of a degree of a boundary the two roads may round apart.
    if (w.edge < 1e-9) continue;
    const f = hdFineOf(lon);
    assert.deepEqual(
      { gate: f.gate, line: f.line, color: f.color, tone: f.tone, base: f.base },
      { gate: w.gate, line: w.line, color: w.color, tone: w.tone, base: w.base },
      `at ${lon}`,
    );
    const g = eclipticToGate(lon);
    assert.equal(f.gate, g.gate, `gate at ${lon}`);
    assert.equal(f.line, g.line, `line at ${lon}`);
    checked += 1;
  }
  assert.ok(checked > 199_000);
});

test("the edges: 2° Aquarius opens gate 41 at line 1, colour 1, tone 1, base 1", () => {
  assert.deepEqual(hdFineOf(302), { gate: 41, line: 1, color: 1, tone: 1, base: 1 });
  assert.deepEqual(hdFineOf(302 + HD_GATE_SIZE - 1e-7), { gate: 41, line: 6, color: 6, tone: 6, base: 5 });
  assert.deepEqual(hdFineOf(302 + HD_GATE_SIZE), { gate: 19, line: 1, color: 1, tone: 1, base: 1 });
  assert.deepEqual(hdFineOf(302 - 1e-7), { gate: 60, line: 6, color: 6, tone: 6, base: 5 });
  assert.equal(hdFineOf(302 + 360).gate, 41);
  assert.equal(hdFineOf(-58).gate, 41);
});

test("an arrow points left for tones 1 to 3, right for 4 to 6", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(hdArrowLeft), [true, true, true, false, false, false]);
});

test("the sample chart's arrows (1 Jan 2000, 12:00 UT)", async () => {
  const hd = await calculateHumanDesign({ natalUtc: new Date("2000-01-01T12:00:00Z") });
  const arrows = Object.fromEntries(hdArrowsOf(hd).map((a) => [a.id, `c${a.color} t${a.tone} ${a.left ? "left" : "right"}`]));
  assert.deepEqual(arrows, {
    determination: "c1 t3 left",
    environment: "c6 t3 left",
    motivation: "c6 t4 right",
    perspective: "c1 t4 right",
  });
  assert.equal(hd.uncertain, undefined);
  // Half an hour earlier the Personality Sun is in tone 3 (left), half an
  // hour later the Personality Node too: those two arrows are marked.
  assert.deepEqual(hd.toneSteady, { determination: true, environment: true, motivation: false, perspective: false });
});

test("the true node: the node rows of a real Jovian Archive chart (Pensacola, 18 Oct 1993, 01:30 CDT)", async () => {
  // Published by hd-chart-engine's validation report: 34.4 / 20.4 for the
  // Personality nodes, 5.1 / 35.1 for the Design nodes, all four matching
  // Jovian with the true node; the mean node gave 34.6 and gate 9.
  const hd = await calculateHumanDesign({ natalUtc: new Date("1993-10-18T06:30:00Z") });
  const gl = (layer, body) => {
    const r = hd.activations.find((a) => a.layer === layer && a.body === body);
    return `${r.gate}.${r.line}`;
  };
  assert.deepEqual(
    [gl("personality", "northnode"), gl("personality", "southnode"), gl("design", "northnode"), gl("design", "southnode")],
    ["34.4", "20.4", "5.1", "35.1"],
  );
});

test("the bodygraph's node is the birth chart's node", async () => {
  const natal = await calculateNatal({
    name: "Paris fixture",
    latitude: 48.8566,
    longitude: 2.3522,
    placeLabel: "Paris, France",
    houseSystem: "placidus",
    date: "1998-10-15",
    time: "12:00",
  });
  const hd = await calculateHumanDesign({ natalUtc: new Date(natal.meta.utc) });
  const natalNode = natal.planets.find((p) => p.id === "northnode");
  const hdNode = hd.activations.find((a) => a.layer === "personality" && a.body === "northnode");
  assert.ok(Math.abs(hdNode.ecliptic - natalNode.ecliptic) < 1e-9);
  assert.equal(hdNode.gate, eclipticToGate(natalNode.ecliptic).gate);
  const south = hd.activations.find((a) => a.layer === "personality" && a.body === "southnode");
  assert.ok(Math.abs(((south.ecliptic - hdNode.ecliptic + 360) % 360) - 180) < 1e-9);
});

test("without a birth time the day is compared hour by hour; the Moon always moves", async () => {
  const known = await calculateHumanDesign({ natalUtc: new Date("2000-01-01T12:00:00Z") });
  const day = await calculateHumanDesign({ natalUtc: new Date("2000-01-01T12:00:00Z"), spanMinutes: 720 });
  // The noon chart itself is the same.
  assert.deepEqual(day.activations, known.activations);
  assert.equal(day.type, known.type);
  assert.equal(day.uncertain.spanMinutes, 720);
  assert.ok(day.uncertain.rows.includes("act:personality:moon"));
  assert.ok(day.uncertain.rows.includes("act:design:moon"));
  // Pluto moves a few hundredths of a degree a day: its row stays.
  assert.ok(!day.uncertain.rows.includes("act:personality:pluto"));
  assert.equal(day.toneSteady, undefined);
  assert.deepEqual(hdArrowsOf(day), []);
  // Every listed key is one of the six.
  for (const k of day.uncertain.keys) assert.ok(["type", "strategy", "authority", "profile", "definition", "cross"].includes(k), k);
});
