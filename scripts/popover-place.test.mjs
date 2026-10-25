/**
 * Floating panels' placement (src/lib/popover-place.ts): under the trigger when
 * it fits, over it when there is more room there, and a list following a field
 * stays under it whenever a few rows fit (2.0.1: on an iPhone with its keyboard
 * up the place list turned over the field and ran off the top of the screen).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { popoverPlacement } from "../src/lib/popover-place.ts";

const view = { top: 0, left: 0, width: 390, height: 360 };
const rect = (top, bottom) => ({ top, bottom, left: 16, right: 374, width: 358, height: bottom - top, x: 16, y: top, toJSON() {} });

test("under its trigger when it fits", () => {
  const p = popoverPlacement(rect(40, 84), { width: 358, height: 200, view });
  assert.equal(p.above, false);
  assert.equal(p.top, 92);
});

test("over its trigger when it does not fit under and there is more room over", () => {
  const p = popoverPlacement(rect(200, 244), { width: 358, height: 400, view });
  assert.equal(p.above, true);
  assert.ok(p.top >= 8, `top ${p.top}`);
  assert.ok(p.top + Math.min(p.maxHeight, 400) <= 200, "never over its trigger");
});

test("a list following a field stays under it while a few rows fit", () => {
  const p = popoverPlacement(rect(150, 194), { width: 358, height: 400, view, minBelow: 156 });
  assert.equal(p.above, false);
  assert.equal(p.top, 202);
  assert.ok(p.top + p.maxHeight <= 360 - 8 + 1, `bottom ${p.top + p.maxHeight}`);
});

test("…and turns over it when even those rows do not fit", () => {
  const p = popoverPlacement(rect(240, 284), { width: 358, height: 400, view, minBelow: 156 });
  assert.equal(p.above, true);
});
