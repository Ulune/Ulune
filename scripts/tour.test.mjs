// The tour (src/lib/tour, src/components/tour): its steps say something in
// both languages, point at things the app has, and download only when the
// tour starts. It remembers one value on the device, and nothing else.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { TOUR_STEPS, TOUR_WORDS } from "../src/lib/tour/steps.ts";
import { TOUR_KEY, TOUR_DONE_ATTR } from "../src/lib/tour/keys.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

test("eight steps, each with a title and words in English and French", () => {
  assert.equal(TOUR_STEPS.length, 8);
  assert.equal(new Set(TOUR_STEPS.map((s) => s.id)).size, TOUR_STEPS.length);
  for (const step of TOUR_STEPS) {
    for (const pair of [step.title, step.body, ...(step.compact ? [step.compact] : [])]) {
      assert.equal(pair.length, 2, step.id);
      for (const text of pair) {
        assert.ok(text.trim(), `${step.id}: empty text`);
        assert.ok(!/\w'\w/.test(text), `${step.id}: straight apostrophe in "${text}"`);
      }
      if (pair[0].length > 12) assert.notEqual(pair[0], pair[1], `${step.id}: French not written`);
    }
    assert.ok(step.targets.length > 0, step.id);
  }
  assert.ok(TOUR_STEPS[0].body.every((t) => t.includes("{who}")), "the first step names the chart");
  for (const [key, pair] of Object.entries(TOUR_WORDS)) {
    assert.ok(pair[0].trim() && pair[1].trim(), key);
    assert.ok(!/\w'\w/.test(pair.join(" ")), `${key}: straight apostrophe`);
  }
});

test("every step points at something the app draws", () => {
  const corpus = walk(join(ROOT, "src")).map((p) => readFileSync(p, "utf8")).join("\n");
  for (const step of TOUR_STEPS) {
    for (const selector of step.targets) {
      for (const [, id] of selector.matchAll(/data-testid="([^"]+)"/g)) {
        assert.ok(corpus.includes(`data-testid="${id}"`) || corpus.includes(`testId="${id}"`), `${step.id}: no element ${id}`);
      }
      for (const [, cls] of selector.matchAll(/\.([a-z][\w-]*)/g)) {
        assert.ok(corpus.includes(cls), `${step.id}: no class ${cls}`);
      }
    }
  }
});

test("the tour downloads when it starts, not with the first view", () => {
  const importers = walk(join(ROOT, "src")).filter((p) => /from ["'][^"']*components\/tour\/Tour["']|from ["']\.\/Tour["']/.test(readFileSync(p, "utf8")));
  assert.deepEqual(importers, [], "a static import of the tour");
  assert.match(read("src/components/tour/TourHost.tsx"), /lazyNamed\(\(\) => import\("\.\/Tour"\), "Tour"\)/);
  // Its words ship with it, not in the shared catalog.
  assert.doesNotMatch(read("src/lib/i18n/catalog/guide.ts"), /Skip tour/);
});

test("it keeps one value on this device, and starts only when asked", () => {
  assert.equal(TOUR_KEY, "ulune.tour.v1");
  assert.equal(TOUR_DONE_ATTR, "data-tour-done");
  const stores = walk(join(ROOT, "src")).filter((p) => readFileSync(p, "utf8").includes("TOUR_KEY"));
  assert.deepEqual(
    stores.map((p) => p.slice(ROOT.length)).sort(),
    ["src/lib/boot.ts", "src/lib/tour/keys.ts", "src/lib/tour/state.ts"],
  );
  // startTour is called from a click, the guide's page and the menu, never on load.
  const callers = walk(join(ROOT, "src"))
    .filter((p) => /startTour\(|onClick=\{startTour\}|onTour=\{startTour\}/.test(readFileSync(p, "utf8")))
    .map((p) => p.slice(ROOT.length))
    .sort();
  assert.deepEqual(callers, [
    "src/components/tour/TourHost.tsx",
    "src/lib/tour/state.ts",
    "src/studio/dock/BirthTab.tsx",
    "src/studio/shell/AccountMenu.tsx",
    "src/studio/workspace.tsx",
  ]);
});
