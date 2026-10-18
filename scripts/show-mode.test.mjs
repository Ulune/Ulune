/*
 * Show mode and the flip between the last two charts (share and compare
 * plan, ideas B2 and B3): the flip's history (src/studio/show/flip-history.ts)
 * through the moves a reader makes (a chart opened, the same one again, a
 * form, a chart removed, a space locked, a space's remembered chart), Show
 * mode's words book held to the catalog's rules and said by the code that
 * loads it, and its stylesheet scoped to Show mode alone.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { NO_HISTORY, adoptFlip, flipTarget, moveFlip } from "../src/studio/show/flip-history.ts";
import { showWords } from "../src/lib/i18n/catalog/show-words.ts";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const ids = (...list) => new Set(list);

test("the flip's history: the chart on screen and the one before it", () => {
  const all = ids("a", "b", "c");
  let h = moveFlip(NO_HISTORY, "a", all);
  assert.deepEqual(h, { current: "a", previous: null });
  assert.equal(flipTarget(h, "a", all), null, "nothing to flip to yet");
  h = moveFlip(h, "b", all);
  assert.deepEqual(h, { current: "b", previous: "a" });
  assert.equal(flipTarget(h, "b", all), "a");
  // Flipping back and forth swaps the two.
  h = moveFlip(h, "a", all);
  assert.deepEqual(h, { current: "a", previous: "b" });
  h = moveFlip(h, "b", all);
  assert.deepEqual(h, { current: "b", previous: "a" });
  // A third chart pushes the second back; the first is no longer offered.
  h = moveFlip(h, "c", all);
  assert.deepEqual(h, { current: "c", previous: "b" });
  // The same chart again, or none on screen (a form, a second person being added), changes nothing: the same object.
  assert.equal(moveFlip(h, "c", all), h);
  assert.equal(moveFlip(h, null, all), h);
});

test("a chart no longer kept is never offered; a locked space offers nothing until it opens again", () => {
  const h = moveFlip(moveFlip(NO_HISTORY, "a", ids("a", "b")), "b", ids("a", "b"));
  // "a" removed: nothing to flip to (asked when offered: the history itself stays two ids).
  assert.equal(moveFlip(h, "b", ids("b")), h);
  assert.equal(flipTarget(h, "b", ids("b")), null);
  // The chart on screen removed, another shown in its place: the one before stays offered when still kept.
  const three = moveFlip(moveFlip(moveFlip(NO_HISTORY, "a", ids("a", "b", "c")), "b", ids("a", "b", "c")), "c", ids("a", "b", "c"));
  assert.deepEqual(moveFlip(three, "a", ids("a", "b")), { current: "a", previous: "b" });
  // The space locks: its charts leave the page, and nothing is offered; opened again, the same two.
  const locked = moveFlip(h, null, ids());
  assert.equal(flipTarget(locked, null, ids()), null);
  assert.equal(flipTarget(moveFlip(locked, "b", ids("a", "b")), "b", ids("a", "b")), "a");
  // Never the chart on screen itself.
  assert.equal(flipTarget({ current: "a", previous: "a" }, "a", ids("a")), null);
  assert.deepEqual(moveFlip({ current: "b", previous: "a" }, "a", ids("a", "b")), { current: "a", previous: "b" });
});

test("the private space's remembered chart is taken only when the tab has none of its own", () => {
  const all = ids("a", "b", "c");
  const opened = moveFlip(NO_HISTORY, "a", all);
  assert.deepEqual(adoptFlip(opened, "b", "a", all), { current: "a", previous: "b" });
  // The tab's own back and forth is newer.
  const own = moveFlip(opened, "c", all);
  assert.equal(adoptFlip(own, "b", "c", all), own);
  // Not a chart the space no longer keeps, not the chart on screen, not nothing.
  assert.equal(adoptFlip(opened, "gone", "a", all), opened);
  assert.equal(adoptFlip(opened, "a", "a", all), opened);
  assert.equal(adoptFlip(opened, null, "a", all), opened);
  assert.equal(adoptFlip(opened, undefined, "a", all), opened);
});

test("Show mode's book: both languages, Ulune's typography, said by Show mode's code, none in the catalog", () => {
  for (const [key, [en, fr]] of Object.entries(showWords)) {
    assert.ok(en.trim() && fr.trim(), `${key}: a language missing`);
    for (const t of [en, fr]) assert.ok(!/\w'\w/.test(t), `${key}: a straight apostrophe in "${t}"`);
    assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(fr), `${key}: French punctuation without its narrow space: "${fr}"`);
    assert.ok(!/« |«[^\u202f]| »|[^\u202f]»/.test(fr), `${key}: « » without narrow spaces in "${fr}"`);
    assert.ok(!(key in CATALOG), `${key} in both the catalog and Show mode's book`);
  }
  const code = readFileSync(`${ROOT}src/studio/show/show-mode.tsx`, "utf8");
  const unsaid = Object.keys(showWords).filter((key) => !new RegExp(`["'\`]${key}["'\`]`).test(code));
  assert.deepEqual(unsaid, []);
  // The words the first page says (the toolbar's button, the switcher's rows) are the catalog's.
  for (const key of ["showMode", "flipBack", "askChart"]) assert.ok(CATALOG[key], key);
  assert.equal(CATALOG.flipBack[0], "Back to {name}");
});

test("Show mode's stylesheet changes nothing outside Show mode", () => {
  const css = readFileSync(`${ROOT}src/studio/show/show.css`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  // Every rule's selectors (inside @media too): under html[data-show], or Show mode's own parts.
  const selectors = [...css.matchAll(/(^|[{}])\s*([^{}@]+?)\s*\{/g)].map((m) => m[2].trim()).filter((s) => !/^(from|to|\d+%)$/.test(s));
  assert.ok(selectors.length > 10);
  // A selector list split at its top-level commas (not those inside :is() or :not()).
  const split = (list) => {
    const out = [];
    let depth = 0;
    let at = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i] === "(") depth++;
      else if (list[i] === ")") depth--;
      else if (list[i] === "," && depth === 0) {
        out.push(list.slice(at, i));
        at = i + 1;
      }
    }
    return [...out, list.slice(at)];
  };
  for (const list of selectors) {
    for (const one of split(list)) {
      const s = one.trim();
      assert.ok(s.startsWith("html[data-show]") || s.startsWith(".ob-show-"), `"${s}" applies outside Show mode`);
    }
  }
});
