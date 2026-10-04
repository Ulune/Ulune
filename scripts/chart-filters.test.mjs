/**
 * The review of 3 Oct 2026, chart (C1, C3): an orb of its own for each aspect
 * type, two degrees more for the lights when asked, kept with the chart's
 * view, and the one reason a picked aspect is not on the wheel.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_ASPECT_FILTER, aspectVisible, blockedTarget, cloneAspectFilter, orbCap } from "../src/lib/chart/aspect-filter.ts";
import { partsToView, sameChartView, parseStoredChartView, viewToAspectFilter, classicView } from "../src/lib/chart/chart-view.ts";

const link = (a, b, type, orb) => ({ id: `${a}-${b}-${type}`, a, b, type, orb });

test("an aspect type's own orb replaces the max orb for that type only", () => {
  const f = cloneAspectFilter(DEFAULT_ASPECT_FILTER);
  f.maxOrb = 5;
  f.orbs = { square: 2 };
  assert.equal(orbCap(f, "square"), 2);
  assert.equal(orbCap(f, "trine"), 5);
  assert.equal(aspectVisible(link("mars", "saturn", "square", 3), f), false);
  assert.equal(aspectVisible(link("mars", "saturn", "trine", 3), f), true);
});

test("the lights' bonus widens only aspects to the Sun or the Moon", () => {
  const f = cloneAspectFilter(DEFAULT_ASPECT_FILTER);
  f.maxOrb = 4;
  f.lumBonus = true;
  assert.equal(orbCap(f, "trine", "sun", "mars"), 6);
  assert.equal(orbCap(f, "trine", "venus", "moon"), 6);
  assert.equal(orbCap(f, "trine", "venus", "mars"), 4);
  assert.equal(aspectVisible(link("sun", "mars", "trine", 5.5), f), true);
  assert.equal(aspectVisible(link("venus", "mars", "trine", 5.5), f), false);
});

test("a cloned filter does not share its orbs", () => {
  const f = cloneAspectFilter(DEFAULT_ASPECT_FILTER);
  const g = cloneAspectFilter(f);
  g.orbs.square = 1;
  assert.equal(f.orbs.square, undefined);
});

test("the switch that keeps an aspect off is named", () => {
  const f = cloneAspectFilter(DEFAULT_ASPECT_FILTER);
  f.toAngles = false;
  assert.equal(blockedTarget(link("sun", "ascendant", "trine", 1), f), "toAngles");
  assert.equal(blockedTarget(link("sun", "mars", "trine", 1), f), null);
  f.toLuminaries = false;
  assert.equal(blockedTarget(link("sun", "mars", "trine", 1), f), "toLuminaries");
});

test("orbs by aspect and the lights' bonus are kept with the view", () => {
  const base = classicView();
  const f = viewToAspectFilter(base);
  f.orbs = { conjunction: 7.5, sextile: 3 };
  f.lumBonus = true;
  const v = partsToView(new Set(base.bodies), f, { on: new Set(base.overlays), configs: new Set() }, new Set(), new Set(), base.readingDepth);
  assert.deepEqual(v.orbs, { conjunction: 7.5, sextile: 3 });
  assert.equal(v.lumBonus, true);
  assert.equal(sameChartView(v, base), false);
  const back = viewToAspectFilter(v);
  assert.deepEqual(back.orbs, { conjunction: 7.5, sextile: 3 });
  assert.equal(back.lumBonus, true);
  // Through storage: odd values are dropped, good ones kept.
  const stored = parseStoredChartView({ v: 1, live: { ...v, orbs: { ...v.orbs, nonsense: 3, trine: -1 } } });
  if (stored?.live) {
    assert.deepEqual(stored.live.orbs, { conjunction: 7.5, sextile: 3 });
    assert.equal(stored.live.lumBonus, true);
  }
});

test("a view without its own orbs matches the classic preset still", () => {
  const base = classicView();
  const f = viewToAspectFilter(base);
  const v = partsToView(new Set(base.bodies), f, { on: new Set(base.overlays), configs: new Set() }, new Set(base.stars), new Set(base.midpoints), base.readingDepth, base.folds);
  assert.equal(sameChartView(v, base), true);
});
