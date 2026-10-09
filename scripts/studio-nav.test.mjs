// The 2.0 navigation's pure parts (page reorganisation, R2 to R4): the
// picker's headings and order, the chips beside the language button, the
// order the bars switch in, each language's home in the encyclopedia, and
// the words every section, lens and language needs in both languages; and
// who gets the language button's one-time hint (R8).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LANGUAGES,
  LENSES,
  PAGE_ORDER,
  SECTIONS,
  TRADITIONS,
  chipLanguages,
  languageGroups,
  languageHomePath,
  lensesOf,
  pickerOrder,
  REMEMBER_KEY,
  recentLanguages,
  rememberPage,
} from "../src/studio/map.ts";
import { LANG_HINT_KEY, MARKS_1X, decideLangHint } from "../src/studio/shell/lang-hint.ts";
import { STUDIO_PAGES } from "../src/studio/url.ts";
import { LANGUAGE_WORDS, LENS_LABEL, SECTION_LABEL, TRADITION_LABEL } from "../src/studio/shell/map-ui.ts";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";
import { pickerWords } from "../src/lib/i18n/catalog/picker-words.ts";

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test("the picker's headings come from the registry: Western, then Chinese since Chinese astrology (languages plan, part 7)", () => {
  assert.deepEqual(
    languageGroups().map((g) => [g.group, g.languages.map((l) => l.id)]),
    [
      ["western", ["astrology", "human-design", "numerology"]],
      ["chinese", ["chinese-astrology"]],
    ],
  );
  // A heading never stands without a language under it.
  assert.deepEqual(languageGroups(LANGUAGES.filter((l) => l.group !== "chinese")).map((g) => g.group), ["western"]);
  // Another Chinese language joins its heading in the registry's order.
  const withBazi = [...LANGUAGES, { id: "bazi", path: "/bazi", group: "chinese", home: { en: "bazi", fr: "bazi" }, lenses: { natal: ["natal"] } }];
  assert.deepEqual(
    languageGroups(withBazi).map((g) => [g.group, g.languages.map((l) => l.id)]),
    [
      ["western", ["astrology", "human-design", "numerology"]],
      ["chinese", ["chinese-astrology", "bazi"]],
    ],
  );
  assert.deepEqual(TRADITIONS, ["western", "chinese"]);
});

test("each language's ⓘ leads to its home in the encyclopedia, in the reader's language", () => {
  assert.equal(languageHomePath("astrology"), "/encyclopedia/astrology");
  assert.equal(languageHomePath("human-design", "en"), "/encyclopedia/human-design");
  assert.equal(languageHomePath("numerology", "en"), "/encyclopedia/numerology");
  assert.equal(languageHomePath("astrology", "fr"), "/encyclopedie/astrologie");
  assert.equal(languageHomePath("human-design", "fr"), "/encyclopedie/design-humain");
  assert.equal(languageHomePath("numerology", "fr"), "/encyclopedie/numerologie");
  // Chinese astrology's home comes with its pages (encyclopedia plan, part 24): no ⓘ until then.
  assert.equal(languageHomePath("chinese-astrology"), null);
});

test("the bars' order: each language's lenses and sub-modes, then the Calendar", () => {
  assert.deepEqual(PAGE_ORDER, ["natal", "transits", "progressions", "synastry", "composite", "design", "numerology", "numerology-cycles", "zodiac", "timing"]);
  assert.deepEqual([...PAGE_ORDER].sort(), [...STUDIO_PAGES].sort(), "every page once");
});

test("the languages used are remembered in order, most recent first", () => {
  const store = memory();
  assert.deepEqual(recentLanguages(store), [], "nothing on a first visit");
  rememberPage("transits", store);
  rememberPage("numerology", store);
  rememberPage("design", store);
  rememberPage("timing", store);
  assert.deepEqual(recentLanguages(store), ["human-design", "numerology", "astrology"], "the Calendar is not a language");
  rememberPage("natal", store);
  assert.deepEqual(recentLanguages(store), ["astrology", "human-design", "numerology"]);
  // A record from before the order was kept: its last language.
  store.setItem("ulune.studio.last.v2", JSON.stringify({ lang: "numerology" }));
  assert.deepEqual(recentLanguages(store), ["numerology"]);
  // Unknown or doubled entries are dropped.
  store.setItem("ulune.studio.last.v2", JSON.stringify({ recent: ["zodiac", "astrology", "astrology", 3] }));
  assert.deepEqual(recentLanguages(store), ["astrology"]);
  store.setItem("ulune.studio.last.v2", "{nope");
  assert.deepEqual(recentLanguages(store), []);
});

test("the chips: the other languages, the last used first, then the registry's order", () => {
  assert.deepEqual(chipLanguages("astrology", []), ["human-design", "numerology"], "a first visit shows where the others are");
  assert.deepEqual(chipLanguages("astrology", ["astrology", "numerology"]), ["numerology", "human-design"]);
  assert.deepEqual(chipLanguages("numerology", ["numerology", "astrology", "human-design"]), ["astrology", "human-design"]);
  assert.deepEqual(chipLanguages("human-design", ["astrology"]), ["astrology", "numerology"]);
  for (const id of ["astrology", "human-design", "numerology"]) {
    const chips = chipLanguages(id, ["numerology", "astrology"]);
    assert.equal(chips.length, 2);
    assert.ok(!chips.includes(id), "never the language on screen");
  }
  assert.deepEqual(chipLanguages("astrology", [], 1), ["human-design"]);
});

test("the phone's picker puts the two languages used last first; a computer's keeps the registry's order", () => {
  const ids = ["astrology", "human-design", "numerology"];
  assert.deepEqual(pickerOrder(ids, ["numerology", "human-design"], false), ids);
  assert.deepEqual(pickerOrder(ids, ["numerology", "human-design", "astrology"], true), ["numerology", "human-design", "astrology"]);
  assert.deepEqual(pickerOrder(ids, ["numerology"], true), ["numerology", "astrology", "human-design"]);
  assert.deepEqual(pickerOrder(ids, [], true), ids);
  assert.deepEqual(pickerOrder(["astrology"], ["numerology", "astrology"], true), ["astrology"], "within its own heading");
});

test("every section, lens, tradition and language has its words in English and French", () => {
  const has = (key) => {
    // The picker's own words live outside the index (catalog/picker-words.ts), loaded with the picker.
    const pair = CATALOG[key] ?? pickerWords[key];
    assert.ok(pair && pair[0].trim() && pair[1].trim(), `${key}: missing`);
  };
  for (const id of SECTIONS) has(SECTION_LABEL[id]);
  for (const id of LENSES) has(LENS_LABEL[id]);
  for (const id of TRADITIONS) has(TRADITION_LABEL[id]);
  for (const l of LANGUAGES) {
    const words = LANGUAGE_WORDS[l.id];
    assert.ok(words, `${l.id}: no words`);
    for (const key of Object.values(words)) has(key);
  }
  // The owner's names (6 Oct).
  assert.deepEqual(SECTIONS.map((id) => CATALOG[SECTION_LABEL[id]]), [
    ["Charts", "Thèmes"],
    ["Calendar", "Calendrier"],
    ["Encyclopedia", "Encyclopédie"],
  ]);
  assert.deepEqual(LENSES.map((id) => CATALOG[LENS_LABEL[id]]), [
    ["Natal", "Natal"],
    ["Cycles", "Cycles"],
    ["Relationship", "Relation"],
  ]);
  assert.deepEqual(CATALOG[LANGUAGE_WORDS["human-design"].name], ["Human Design", "Human Design"], "Ulune keeps the name in French");
  assert.equal(CATALOG[LANGUAGE_WORDS.numerology.name][1], "Numérologie");
  // French: a narrow no-break space before the colon between a lens and its sub-mode.
  assert.equal(CATALOG.lensColon[1], "\u202f: ");
  assert.match(CATALOG.lensFold[1], /\u202f:/);
});

test("a lens a language lacks is never offered", () => {
  for (const l of LANGUAGES) {
    for (const lens of lensesOf(l.id)) assert.ok((l.lenses[lens]?.length ?? 0) > 0, `${l.id} ${lens}`);
  }
  assert.deepEqual(lensesOf("human-design"), ["natal"], "one lens: no lens tabs (ChartsNav.tsx)");
  assert.deepEqual(lensesOf("numerology"), ["natal", "cycles"]);
});

test("the language button's hint: a reader of 1.x gets it until it is done, a new reader never", () => {
  // A new reader: nothing of 1.x here. Decided once and kept, so 2.0's own marks
  // written later (the Calendar keeps a page and no language) never turn it on.
  const fresh = memory();
  assert.equal(decideLangHint(fresh), "done");
  assert.equal(fresh.getItem(LANG_HINT_KEY), "1");
  fresh.setItem("ulune.studio.page", "timing");
  assert.equal(decideLangHint(fresh), "done", "decided once");
  // A reader of 1.x: one of the marks 1.x left while its tabs were used, none of 2.0's.
  assert.deepEqual([...MARKS_1X], ["ulune.studio.group-last", "ulune.studio.page", "ulune.studio.view"]);
  for (const mark of MARKS_1X) {
    const old = memory();
    old.setItem(mark, "transits");
    assert.equal(decideLangHint(old), "show", mark);
    assert.equal(old.getItem(LANG_HINT_KEY), "show");
    // 2.0 then writes its own marks: the hint stays until it is done.
    rememberPage("natal", old);
    assert.ok(old.getItem(REMEMBER_KEY));
    assert.equal(decideLangHint(old), "show", `${mark}, on the next visit`);
  }
  // A reader who has used 2.0 already, here: never.
  const both = memory();
  both.setItem("ulune.studio.page", "transits");
  rememberPage("transits", both);
  assert.equal(decideLangHint(both), "done");
  // Done is for good; marks the tests leave (the wheel's own hint seen) are not 1.x's.
  const done = memory();
  done.setItem(LANG_HINT_KEY, "1");
  done.setItem("ulune.studio.group-last", "{}");
  assert.equal(decideLangHint(done), "done");
  const wheelOnly = memory();
  wheelOnly.setItem("ulune.hint.wheel.v1", "1");
  assert.equal(decideLangHint(wheelOnly), "done");
});
