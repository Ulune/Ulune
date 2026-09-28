/*
 * The table page (part 47 of the launch plan): the arithmetic behind the
 * pinned bar, and the table's text cut into the same parts as the page.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { chartTextParts, formatChartTableText } from "../src/lib/chart/table-export.ts";
import { activePartIndex, barScrollFor, isAtEnd, scrollTargetFor } from "../src/studio/tables/table-spy.ts";

test("the part being read is the last one whose top reached the line under the bar", () => {
  const tops = [100, 700, 1300, 1900];
  assert.equal(activePartIndex(tops, 145, false), 0);
  // Exactly on the line, or a pixel below it (rounding), counts as reached.
  assert.equal(activePartIndex(tops, 700, false), 1);
  assert.equal(activePartIndex(tops, 699, false), 1);
  assert.equal(activePartIndex(tops, 698, false), 0);
  assert.equal(activePartIndex(tops, 5000, false), 3);
  // Before the first part reaches the line, the first part is still the one read.
  assert.equal(activePartIndex([400, 900], 145, false), 0);
  // At the very end, the last part, however short.
  assert.equal(activePartIndex(tops, 145, true), 3);
  assert.equal(activePartIndex([], 145, false), -1);
  // A part not in the page (Infinity) stops the walk.
  assert.equal(activePartIndex([0, Infinity, 50], 145, false), 0);
});

test("the end of the page: scrolled to the bottom of a page that scrolls", () => {
  assert.equal(isAtEnd(0, 0), false);
  assert.equal(isAtEnd(3, 4), false);
  assert.equal(isAtEnd(998, 1000), true);
  assert.equal(isAtEnd(997, 1000), false);
  assert.equal(isAtEnd(1000, 1000), true);
});

test("a link scrolls its part's top to just under the bar, within the page", () => {
  // Part at 800 px on screen, page scrolled by 200, page top at 56, bar 45 tall.
  assert.equal(scrollTargetFor(800, 200, 56, 45, 5000), 899);
  // Never above the top, never past the end.
  assert.equal(scrollTargetFor(60, 0, 56, 45, 5000), 0);
  assert.equal(scrollTargetFor(9000, 200, 56, 45, 5000), 5000);
  assert.equal(scrollTargetFor(800, 200, 56, 45, -10), 0);
});

test("the bar slides sideways only to bring its marked link into view", () => {
  // Link past the right edge of a 390 px bar.
  assert.equal(barScrollFor(600, 80, 0, 390), 314);
  // Link before the left edge.
  assert.equal(barScrollFor(10, 60, 100, 390), 0);
  // Link just inside the left edge, without its margin: a little way back.
  assert.equal(barScrollFor(160, 60, 150, 390), 136);
  // Already in view: unchanged.
  assert.equal(barScrollFor(120, 60, 50, 390), 50);
});

test("the text copy comes in the page's parts, each with its title, and joins into the whole", async () => {
  const chart = await calculateNatal({
    name: "TraceQA",
    date: "1990-06-15",
    time: "12:00",
    latitude: 48.8566,
    longitude: 2.3522,
    placeLabel: "Paris, France",
    houseSystem: "placidus",
  });
  for (const [locale, titles] of [
    ["en", ["Chart", "Points", "Houses", "Aspects", "Patterns", "Balance", "Ranking"]],
    ["fr", ["Thème", "Points", "Maisons", "Aspects", "Figures", "Équilibre", "Classement"]],
  ]) {
    const parts = chartTextParts(chart, locale);
    assert.deepEqual(
      parts.map((p) => p.id),
      ["identity", "points", "houses", "aspects", "patterns", "balance", "ranking"],
    );
    assert.deepEqual(
      parts.map((p) => p.lines[0]),
      titles,
    );
    for (const p of parts) {
      assert.ok(p.lines.length > 1, `${p.id} has content`);
      assert.ok(p.lines.every((l) => l.trim().length > 0), `${p.id} has no blank line`);
    }
    assert.equal(formatChartTableText(chart, locale), parts.map((p) => p.lines.join("\n")).join("\n\n"));
    // One line per body and angle, one per cusp, one per aspect.
    const count = (id) => parts.find((p) => p.id === id).lines.length - 1;
    assert.equal(count("points"), chart.planets.length + Object.keys(chart.angles).length);
    assert.equal(count("houses"), 12);
    assert.equal(count("aspects"), chart.aspects.length);
  }
});
