import assert from "node:assert/strict";
import { test } from "node:test";
import { ASPECT_PATTERN, OPACITY, aspectLook, ink, lineInk, orbTightness, turn, yokeLanes, yokeOverlap, yokeSpan } from "../src/lib/chart/wheel-style.ts";
import { dashSegments } from "../src/lib/depth/gl-meshes.ts";

const major = (type, orb) => ({ type, orb, level: "major" });
const minor = (type, orb) => ({ type, orb, level: "minor" });

test("every aspect family reads without colour: its own line pattern or weight", () => {
  assert.equal(ASPECT_PATTERN.conjunction, "arc");
  assert.equal(ASPECT_PATTERN.sextile, "dash");
  assert.equal(ASPECT_PATTERN.quincunx, "dashdot");
  for (const t of ["semisextile", "semisquare", "quintile"]) assert.equal(ASPECT_PATTERN[t], "dots");
  // Square and opposition share red and a solid line: the opposition is heavier.
  const opp = aspectLook(major("opposition", 3), "base", 1, "dark");
  const sq = aspectLook(major("square", 3), "base", 1, "dark");
  assert.ok(opp.width > sq.width * 1.2, `opposition ${opp.width} vs square ${sq.width}`);
  assert.equal(aspectLook(major("sextile", 3), "base", 1, "dark").dash, "6 3.5");
  assert.equal(aspectLook(major("trine", 3), "base", 1, "dark").dash, undefined);
});

test("the widest orb never falls under the floor; cream gets a higher one", () => {
  for (const theme of ["dark", "light"]) {
    const wide = aspectLook(major("square", 10), "base", 1, theme);
    const exact = aspectLook(major("square", 0), "base", 1, theme);
    assert.equal(wide.opacity, OPACITY[theme].major[0]);
    assert.equal(exact.opacity, OPACITY[theme].major[1]);
    const wideMinor = aspectLook(minor("quincunx", 3.2), "base", 1, theme);
    assert.equal(wideMinor.opacity, OPACITY[theme].minor[0]);
  }
  assert.ok(OPACITY.light.major[0] > OPACITY.dark.major[0]);
  assert.ok(OPACITY.dark.major[0] >= 0.45, "the dark floor was 0.22");
});

test("lit lines are wider and stronger, dimmed ones fainter but still there", () => {
  const a = major("trine", 4);
  for (const theme of ["dark", "light"]) {
    const base = aspectLook(a, "base", 1, theme);
    const lit = aspectLook(a, "lit", 1, theme);
    const dim = aspectLook(a, "dim", 1, theme);
    assert.ok(lit.width > base.width && lit.opacity >= base.opacity);
    assert.ok(dim.opacity < base.opacity && dim.opacity >= 0.1);
  }
});

test("tightness follows the orb and the level's cap", () => {
  assert.equal(orbTightness(major("square", 0)), 1);
  assert.equal(orbTightness(major("square", 10)), 0);
  assert.equal(orbTightness(major("square", 5)), 0.5);
  assert.equal(orbTightness(minor("quincunx", 1.6)), 0.5);
});

test("inks keep the colour on the dark theme and deepen it on cream toward black, hue kept", () => {
  assert.equal(ink("var(--el-fire)"), "color-mix(in oklch, var(--el-fire) var(--ink-keep, 100%), black)");
  assert.equal(lineInk("var(--aspect-hard)"), "color-mix(in oklch, var(--aspect-hard) var(--line-keep, 100%), black)");
});

test("the pale hues (air, the conjunctions' gold) take their own, deeper keep on cream", () => {
  assert.equal(ink("var(--el-air)"), "color-mix(in oklch, var(--el-air) var(--ink-keep-pale, var(--ink-keep, 100%)), black)");
  assert.equal(
    lineInk("var(--aspect-conj)"),
    "color-mix(in oklch, var(--aspect-conj) var(--line-keep-pale, var(--line-keep, 100%)), black)",
  );
  assert.equal(
    lineInk("var(--aspect-outer-conj)"),
    "color-mix(in oklch, var(--aspect-outer-conj) var(--line-keep-pale, var(--line-keep, 100%)), black)",
  );
  assert.equal(lineInk("var(--aspect-soft)"), "color-mix(in oklch, var(--aspect-soft) var(--line-keep, 100%), black)");
});

test("a conjunction's yoke runs the short way round, across 0° Aries too", () => {
  assert.equal(turn(350, 10), 20);
  assert.equal(turn(10, 350), -20);
  const y = yokeSpan(358, 3);
  assert.equal(y.from, 358);
  assert.equal(y.len, 5);
  assert.ok(Math.abs(y.mid - 0.5) < 1e-9);
  assert.deepEqual(yokeSpan(3, 358), y, "either end first: the same yoke");
  assert.equal(yokeOverlap({ from: 10, len: 8 }, { from: 18, len: 8 }), 0, "yokes meeting at a body share nothing");
  assert.equal(yokeOverlap({ from: 10, len: 8 }, { from: 14, len: 8 }), 4);
  assert.equal(yokeOverlap({ from: 355, len: 10 }, { from: 2, len: 6 }), 3, "round 0° Aries");
});

test("yokes nest: one spanning others runs beneath them, ones meeting at a body share a lane", () => {
  // A stellium of four fanned glyphs 8° apart, every pair conjunct.
  const at = [100, 108, 116, 124];
  const pairs = [];
  for (let i = 0; i < at.length; i += 1) for (let j = i + 1; j < at.length; j += 1) pairs.push([i, j]);
  const spans = pairs.map(([i, j]) => yokeSpan(at[i], at[j]));
  const lanes = yokeLanes(spans, 6);
  const laneOf = (i, j) => lanes[pairs.findIndex(([a, b]) => a === i && b === j)];
  assert.equal(laneOf(0, 1), 0);
  assert.equal(laneOf(1, 2), 0, "neighbours share the first lane (a comb)");
  assert.equal(laneOf(2, 3), 0);
  for (let k = 0; k < spans.length; k += 1)
    for (let m = 0; m < spans.length; m += 1) {
      if (k === m || yokeOverlap(spans[k], spans[m]) <= 0.05) continue;
      assert.notEqual(lanes[k], lanes[m], "overlapping yokes never share a lane");
      if (spans[k].len > spans[m].len) assert.ok(lanes[k] > lanes[m], "the wider one runs beneath");
    }
  assert.equal(Math.max(...lanes), 3);
  // Far apart: the first lane; more than the lanes available: the last takes the rest.
  assert.deepEqual(yokeLanes([yokeSpan(10, 18), yokeSpan(200, 208)], 5), [0, 0]);
  assert.deepEqual(yokeLanes(Array.from({ length: 4 }, (_, k) => ({ from: 0, len: 10 + k })), 3), [0, 1, 2, 2]);
});

test("a dashed tube is laid out like the flat line: centred dashes, dots as balls", () => {
  const segs = dashSegments(100, [6, 3.5], 1);
  assert.ok(segs.length >= 10);
  const first = segs[0];
  const last = segs[segs.length - 1];
  assert.ok(Math.abs(first[0] - (100 - last[1])) < 1e-6, "both ends alike");
  for (const [a, b] of segs) assert.ok(b > a && b - a <= 6 - 2 + 1e-9);
  const dots = dashSegments(40, [0.01, 3.2], 1);
  assert.ok(dots.length >= 10);
  for (const [a, b] of dots) assert.equal(a, b, "a dot is a ball");
  assert.equal(dashSegments(50, [7, 3, 0.01, 3], 0.5).length > 3, true);
  assert.deepEqual(dashSegments(0, [6, 3], 1), []);
});
