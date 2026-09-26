import assert from "node:assert/strict";
import { test } from "node:test";
import { arcSpan, boxesOverlap, discGap, placeBadges, placeLabels } from "../src/lib/chart/wheel-layout.ts";
import { fanAngles } from "../src/lib/chart/fan-angles.ts";

const CX = 360;
const CY = 360;
const ASC = 204.27;
const polar = (ecl, r) => {
  const rad = ((((ecl - ASC) % 360) + 360) % 360) * (Math.PI / 180);
  return { x: CX - r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};
test("boxes and discs: overlap tests, level and turned", () => {
  const a = { cx: 0, cy: 0, hw: 10, hh: 5, rot: 0 };
  assert.ok(boxesOverlap(a, { cx: 15, cy: 0, hw: 10, hh: 5, rot: 0 }));
  assert.ok(!boxesOverlap(a, { cx: 25, cy: 0, hw: 4, hh: 5, rot: 0 }));
  assert.ok(!boxesOverlap(a, { cx: 0, cy: 12, hw: 10, hh: 5, rot: 90 }) === false);
  assert.ok(!boxesOverlap(a, { cx: 22, cy: 0, hw: 10, hh: 5, rot: 90 }));
  assert.ok(discGap({ x: 0, y: 12, r: 5 }, a) > 0);
  assert.ok(discGap({ x: 0, y: 8, r: 5 }, a) < 0);
});

test("a seven-planet stellium's degree labels touch neither each other nor any glyph", () => {
  const trues = [300.97, 301.6, 303.68, 314.72, 316.53, 318.08, 318.38];
  const sep = ((13 * 2 + 3) / 209) * (180 / Math.PI);
  for (const asc of [0, 90, 204.27, 300]) {
    const pol = (ecl, r) => {
      const rad = ((((ecl - asc) % 360) + 360) % 360) * (Math.PI / 180);
      return { x: CX - r * Math.cos(rad), y: CY + r * Math.sin(rad) };
    };
    const shown = fanAngles(trues, sep);
    const discs = shown.map((e) => ({ ...pol(e, 209), r: 13 }));
    const items = shown.map((e, i) => ({ id: `p${i}`, angle: e, w: 44, h: 15 }));
    const places = placeLabels(items, pol, { x: CX, y: CY }, { r1: 243, r2: 259, discs });
    const boxes = items.map((it) => {
      const p = places.get(it.id);
      return { cx: p.x, cy: p.y, hw: it.w / 2, hh: it.h / 2, rot: p.rot };
    });
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) assert.ok(!boxesOverlap(boxes[i], boxes[j]), `labels ${i} and ${j} touch (asc ${asc})`);
      for (const d of discs) assert.ok(discGap(d, boxes[i]) > 0, `label ${i} touches a glyph (asc ${asc})`);
    }
  }
});

test("a house number slides out from under a planet, and stays in its house", () => {
  const badges = [{ id: "h8", from: 100, to: 130, mid: 115 }];
  const pNear = polar(115, 209);
  const free = placeBadges(badges, polar, { r: 186, rIn: 176, radius: 11, discs: [] });
  assert.ok(Math.abs(free.get("h8").ecl - 115) < 1e-9);
  const moved = placeBadges(badges, polar, { r: 186, rIn: 176, radius: 11, discs: [{ ...pNear, r: 13 }] });
  const m = moved.get("h8");
  assert.ok(m.ecl > 103 - 1e-9 && m.ecl < 127 + 1e-9, "inside its house");
  assert.ok(Math.hypot(m.x - pNear.x, m.y - pNear.y) >= 13 + 11 + 2 - 1e-6, "clear of the planet");
  // A narrow house with the planet in the middle: the number steps in.
  const narrow = placeBadges([{ id: "h3", from: 110, to: 120, mid: 115 }], polar, { r: 186, rIn: 172, radius: 11, discs: [{ ...pNear, r: 13 }] });
  assert.ok(Math.abs(Math.hypot(narrow.get("h3").x - CX, narrow.get("h3").y - CY) - 172) < 1e-6);
  // A yoke running along the house under its planets: the number keeps clear of it too.
  const yoke = Array.from({ length: 13 }, (_, k) => ({ ...polar(106 + k, 190), r: 1.5 }));
  const dodged = placeBadges(badges, polar, { r: 186, rIn: 172, radius: 11, discs: yoke });
  const d = dodged.get("h8");
  assert.ok(d.ecl > 103 - 1e-9 && d.ecl < 127 + 1e-9, "inside its house");
  for (const y of yoke) assert.ok(Math.hypot(d.x - y.x, d.y - y.y) >= 1.5 + 11 + 2 - 1e-6, "clear of the yoke");
  // Nowhere free: the least crowded place, not the middle by default.
  const packed = Array.from({ length: 60 }, (_, k) => ({ ...polar(100 + k / 2, 180 + (k % 3) * 4), r: 3 }));
  const least = placeBadges([{ id: "h1", from: 100, to: 130, mid: 115 }], polar, { r: 186, rIn: 172, radius: 11, discs: packed });
  assert.ok(least.get("h1").ecl > 115, "it moves toward the free end of the house");
});

test("the shortest arc holding a stellium, across 0° Aries too", () => {
  const a = arcSpan([305, 312, 318, 301]);
  assert.equal(a.from, 301);
  assert.equal(a.len, 17);
  const b = arcSpan([355, 4, 10, 350]);
  assert.equal(b.from, 350);
  assert.equal(b.len, 20);
  assert.deepEqual(arcSpan([42]), { from: 42, len: 0 });
});
