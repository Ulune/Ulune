import assert from "node:assert/strict";
import { test } from "node:test";
import { placeGrid } from "../src/components/wheel-grid-place.ts";

/** A stage 1000 × 700 with the wheel (d = 640) centred, the grid's corner free. */
const ROOM = { top: 8, right: 988, bottom: 690, maxSize: 460, circle: { cx: 500, cy: 350, r: 320 }, bar: null };

/** The cells that exist (the upper triangle), as rectangles. */
function cells(n, p) {
  const out = [];
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) out.push({ l: p.left + j * (p.cell + 1), t: p.top + i * (p.cell + 1), r: p.left + j * (p.cell + 1) + p.cell, b: p.top + i * (p.cell + 1) + p.cell });
  return out;
}
const gapToDisc = (k, c) => Math.hypot(Math.max(k.l - c.cx, 0, c.cx - k.r), Math.max(k.t - c.cy, 0, c.cy - k.b)) - c.r;

test("the grid fits in the corner, cells of one size, never under 24 px, clear of the disc", () => {
  const p = placeGrid(13, ROOM);
  assert.ok(p, "a grid is placed");
  assert.ok(p.cell >= 24 && p.cell <= 26, `cell ${p.cell}`);
  assert.ok(p.left + p.size <= ROOM.right && p.top >= ROOM.top && p.top + p.size <= ROOM.bottom, "inside the stage");
  for (const k of cells(13, p)) assert.ok(gapToDisc(k, ROOM.circle) >= 11.5, "clear of the wheel");
});

test("the grid tucks against the curve: nearer the wheel than the stage's side margin allows", () => {
  const p = placeGrid(13, ROOM);
  // The wheel's right edge is at 820: the grid's first column starts left of it, under the arc's reach.
  assert.ok(p.left < ROOM.circle.cx + ROOM.circle.r, `left ${p.left}`);
});

test("no room, no grid: a margin too narrow, or a stage too short, draws none", () => {
  assert.equal(placeGrid(13, { ...ROOM, right: 700 }), null);
  assert.equal(placeGrid(13, { ...ROOM, bottom: 200 }), null);
  assert.equal(placeGrid(13, { ...ROOM, maxSize: 100 }), null);
});

test("a zoom bar in the way keeps the grid off it", () => {
  const p = placeGrid(13, { ...ROOM, bar: { l: 700, t: 100, r: 990, b: 130 } });
  if (p) assert.ok(p.top + p.size <= 100 - 6 || p.left >= 990 + 6 || p.left + p.size <= 700 - 6);
});

test("fewer bodies make a smaller grid that still fits and is clear", () => {
  const p = placeGrid(8, ROOM);
  assert.ok(p && p.cell === 26);
  for (const k of cells(8, p)) assert.ok(gapToDisc(k, ROOM.circle) >= 11.5);
});
