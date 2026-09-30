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

/** The outer ring of a double wheel, as chart-wheel.tsx draws it: glyphs, the label ring, the drawing's edge. */
const OUTER = { glyph: 388, disc: 11, r1: 416, r2: 434, half: 458 };
const labelW = (txt) => txt.length * 0.62 * 10.5 + 7;

/** Every label clear of every other, of every glyph, and inside the drawing. */
function assertClear(items, places, discs, half, what) {
  const boxes = items.map((it) => {
    const p = places.get(it.id);
    return { cx: p.x, cy: p.y, hw: it.w / 2, hh: it.h / 2, rot: p.rot };
  });
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) assert.ok(!boxesOverlap(boxes[i], boxes[j]), `${what}: ${items[i].id} and ${items[j].id} touch`);
    for (const d of discs) assert.ok(discGap(d, boxes[i]) > 0, `${what}: ${items[i].id} touches a glyph`);
    const b = boxes[i];
    const a = (b.rot * Math.PI) / 180;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = b.cx + u * b.hw * Math.cos(a) - v * b.hh * Math.sin(a);
      const y = b.cy + u * b.hw * Math.sin(a) + v * b.hh * Math.cos(a);
      assert.ok(Math.abs(x - CX) <= half + 1 && Math.abs(y - CY) <= half + 1, `${what}: ${items[i].id} crosses the edge`);
    }
  }
}

test("a partner's labels round the outer ring touch nothing (an Ascendant beside the Sun, Mercury beside Neptune)", () => {
  // A made-up couple's synastry (Camille Marie Laurent's wheel, Yolanda Mary Kyle's bodies outside): where the glyphs are drawn.
  const asc = 155.15;
  const pol = (ecl, r) => {
    const rad = ((((ecl - asc) % 360) + 360) % 360) * (Math.PI / 180);
    return { x: CX - r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  };
  const bodies = [
    ["sun", 247.24, "7°14'"], ["moon", 325.51, "25°31'"], ["mercury", 267.54, "28°31'"], ["venus", 288.32, "18°19'"],
    ["mars", 310.19, "10°11'"], ["jupiter", 284.18, "14°11'"], ["saturn", 231.21, "21°12'"], ["uranus", 253.4, "13°24'"],
    ["neptune", 271.23, "0°16'"], ["pluto", 213.42, "3°25'"], ["ascendant", 243.43, "3°26'"], ["midheaven", 173.93, "23°56'"],
    ["descendant", 63.43, "3°26'"], ["ic", 353.93, "23°56'"],
  ];
  const items = bodies.map(([id, angle, txt]) => ({ id, angle, w: labelW(txt), h: 16 }));
  const discs = bodies.map(([, angle]) => ({ ...pol(angle, OUTER.glyph), r: OUTER.disc }));
  const places = placeLabels(items, pol, { x: CX, y: CY }, { r1: OUTER.r1, r2: OUTER.r2, discs, half: OUTER.half, own: { r: OUTER.glyph, radius: OUTER.disc } });
  assertClear(items, places, discs, OUTER.half, "synastry");
});

test("three labels crowded low on the outer ring are settled together; one beside the wheel sits just clear of its glyph", () => {
  const pol = (ecl, r) => {
    const rad = (((ecl % 360) + 360) % 360) * (Math.PI / 180);
    return { x: CX - r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  };
  // Three bodies at the least spacing the ring allows, where neither ring has room for all three level: all turned.
  const crowd = [["a", 117.83, "10°01'"], ["b", 121.52, "11°27'"], ["c", 125.21, "15°18'"], ["side", 0, "14°11'"]];
  const items = crowd.map(([id, angle, txt]) => ({ id, angle, w: labelW(txt), h: 16 }));
  const discs = crowd.map(([, angle]) => ({ ...pol(angle, OUTER.glyph), r: OUTER.disc }));
  const places = placeLabels(items, pol, { x: CX, y: CY }, { r1: OUTER.r1, r2: OUTER.r2, discs, half: OUTER.half, own: { r: OUTER.glyph, radius: OUTER.disc } });
  assertClear(items, places, discs, OUTER.half, "crowd");
  // Beside the wheel the level label moves out only as far as its own glyph asks (not to the second ring).
  const side = places.get("side");
  assert.equal(side.at, 0);
  const reach = CX - side.x;
  assert.ok(reach > OUTER.r1 && reach < OUTER.r1 + 8, `beside the wheel at ${reach.toFixed(1)}`);
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
