// The 2.0 navigation's pure parts (page reorganisation, R2 to R4): the
// picker's headings and order, the chips beside the language button, the
// order the bars switch in, each language's home in the encyclopedia, and
// the words every section, lens and language needs in both languages; who
// gets the language button's one-time hint (R8); and (languages plan, part
// 28) the "new" label on 2.0's languages, the Chinese languages' own names,
// and ⌘K finding a language by them, case and accents aside.
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
  pageFor,
  pickerOrder,
  REMEMBER_KEY,
  deviceStore,
  recentLanguages,
  rememberPage,
} from "../src/studio/map.ts";
import { NEW_LANGUAGE_DAYS, isNewLanguage, pickerSeen } from "../src/studio/new-languages.ts";
import { LANGUAGE_NAMES } from "../src/lib/chinese/names.ts";
import { LANG_HINT_KEY, MARKS_1X, decideLangHint } from "../src/studio/shell/lang-hint.ts";
import { languageAliases, paletteFinds, paletteWords, typedWords } from "../src/studio/shell/palette-find.ts";
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
      ["chinese", ["chinese-astrology", "bazi", "feng-shui"]],
    ],
  );
  // A heading never stands without a language under it.
  assert.deepEqual(languageGroups(LANGUAGES.filter((l) => l.group !== "chinese")).map((g) => g.group), ["western"]);
  // Another Chinese language joins its heading in the registry's order.
  const withIChing = [...LANGUAGES, { id: "iching", path: "/i-ching", group: "chinese", lenses: { natal: ["natal"] } }];
  assert.deepEqual(
    languageGroups(withIChing).map((g) => [g.group, g.languages.map((l) => l.id)]),
    [
      ["western", ["astrology", "human-design", "numerology"]],
      ["chinese", ["chinese-astrology", "bazi", "feng-shui", "iching"]],
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
  // The Chinese languages' homes hold their introductions since encyclopedia part 23 (lib/chinese/term-live.ts, LIVE_HOMES).
  assert.equal(languageHomePath("chinese-astrology"), "/encyclopedia/chinese-astrology");
  assert.equal(languageHomePath("bazi", "fr"), "/encyclopedie/bazi");
  assert.equal(languageHomePath("feng-shui", "fr"), "/encyclopedie/feng-shui");
  assert.equal(languageHomePath("chinese-astrology", "fr"), "/encyclopedie/astrologie-chinoise");
});

test("the bars' order: each language's lenses and sub-modes, then the Calendar", () => {
  assert.deepEqual(PAGE_ORDER, ["natal", "transits", "progressions", "synastry", "composite", "design", "design-cycles", "design-pair", "numerology", "numerology-cycles", "numerology-pair", "zodiac", "zodiac-years", "zodiac-pair", "bazi", "bazi-luck", "bazi-pair", "fengshui", "fengshui-cycles", "fengshui-pair", "fengshui-home", "timing"]);
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
    ["Home", "Logement"],
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
  assert.deepEqual(lensesOf("human-design"), ["natal", "cycles", "relationship"], "its bodygraph, its transits and life cycles (feature 5b) and its connection chart (share and compare plan, feature 5a)");
  assert.deepEqual(lensesOf("numerology"), ["natal", "cycles", "relationship"], "its two people (share and compare plan, feature 5c)");
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

const DAY = 86_400_000;

test("the “new” label: 2.0's languages, for the reader's first four weeks from the first opening of the picker since 2.0 (languages plan, part 28)", () => {
  assert.deepEqual(LANGUAGES.filter((l) => l.since).map((l) => [l.id, l.since]), [
    ["chinese-astrology", "2.0"],
    ["bazi", "2.0"],
    ["feng-shui", "2.0"],
  ]);
  assert.equal(NEW_LANGUAGE_DAYS, 28);
  const chinese = ["chinese-astrology", "bazi", "feng-shui"];
  const western = ["astrology", "human-design", "numerology"];
  const newOnes = (seen, now) => LANGUAGES.filter((l) => isNewLanguage(l.id, seen, now)).map((l) => l.id);

  // A first visit: the picker opens at 09:30 on 13 October, the day is kept (a date, nothing else).
  const store = memory();
  rememberPage("natal", store);
  const first = Date.UTC(2026, 9, 13, 9, 30);
  const seen = pickerSeen(first, store);
  assert.deepEqual(seen, { "2.0": "2026-10-13" });
  const kept = JSON.parse(store.getItem(REMEMBER_KEY));
  assert.deepEqual(kept.seen, { "2.0": "2026-10-13" });
  assert.equal(kept.lang, "astrology", "what was remembered stays");
  assert.deepEqual(newOnes(seen, first), chinese, "the three Chinese languages, not the Western ones");
  for (const id of western) assert.equal(isNewLanguage(id, seen, first), false, id);

  // Later openings keep the first day; going from page to page keeps it too.
  assert.deepEqual(pickerSeen(first + 3 * DAY, store), { "2.0": "2026-10-13" });
  rememberPage("bazi", store);
  rememberPage("fengshui-home", store);
  assert.deepEqual(JSON.parse(store.getItem(REMEMBER_KEY)).seen, { "2.0": "2026-10-13" });
  assert.equal(pageFor("feng-shui", undefined, store), "fengshui-home", "and the pages are still remembered");

  // Day 27: still new; day 28 (from midnight of the first day) and day 29: not any more.
  const day0 = Date.UTC(2026, 9, 13);
  assert.deepEqual(newOnes(pickerSeen(day0 + 27 * DAY + 23 * 3_600_000, store), day0 + 27 * DAY + 23 * 3_600_000), chinese, "day 27");
  assert.deepEqual(newOnes(pickerSeen(day0 + 28 * DAY, store), day0 + 28 * DAY), [], "day 28");
  assert.deepEqual(newOnes(pickerSeen(day0 + 29 * DAY, store), day0 + 29 * DAY), [], "day 29");

  // Storage unavailable (private mode, switched off, full): nothing kept, so new for this visit.
  assert.equal(pickerSeen(first, null), null);
  const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
  assert.equal(pickerSeen(first, broken), null, "a storage that throws is not kept, and nothing throws");
  const full = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
  assert.equal(pickerSeen(first, full), null, "nor a full one");
  assert.deepEqual(newOnes(null, first + 400 * DAY), chinese);
  for (const id of western) assert.equal(isNewLanguage(id, null, first), false, `${id}, even then`);

  // A day that is not a date is written again, from today.
  const odd = memory();
  odd.setItem(REMEMBER_KEY, JSON.stringify({ lang: "bazi", seen: { "2.0": "soon" } }));
  assert.deepEqual(pickerSeen(first, odd), { "2.0": "2026-10-13" });
  assert.equal(JSON.parse(odd.getItem(REMEMBER_KEY)).lang, "bazi");
  odd.setItem(REMEMBER_KEY, JSON.stringify({ seen: ["2026-10-13"] }));
  assert.deepEqual(pickerSeen(first + DAY, odd), { "2.0": "2026-10-14" });
  // A day still to come (the device's clock was a year ahead at the first opening): today instead,
  // so "new" does not last until then; a day past stays as it was.
  const ahead = memory();
  ahead.setItem(REMEMBER_KEY, JSON.stringify({ seen: { "2.0": "2027-10-13" } }));
  assert.deepEqual(pickerSeen(first, ahead), { "2.0": "2026-10-13" });
  assert.deepEqual(newOnes(pickerSeen(first + 29 * DAY, ahead), first + 29 * DAY), [], "four weeks on, from today");
  ahead.setItem(REMEMBER_KEY, JSON.stringify({ seen: { "2.0": "2026-10-01" } }));
  assert.deepEqual(pickerSeen(first, ahead), { "2.0": "2026-10-01" });
});

test("storage switched off (reaching it throws, as with cookies blocked): nothing is remembered, nothing throws (part 28)", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("SecurityError: access is denied for this document");
    },
  });
  try {
    assert.equal(deviceStore(), undefined);
    assert.doesNotThrow(() => rememberPage("bazi-luck"));
    assert.equal(pageFor("bazi", "relationship"), "bazi-pair", "the switcher's pair button");
    assert.equal(pageFor("feng-shui", "relationship"), "fengshui-pair", "and from Feng Shui, its own (FS32)");
    assert.equal(pageFor("human-design", "relationship"), "design-pair", "and from Human Design, its connection chart (feature 5a)");
    assert.equal(pageFor("astrology", "relationship"), "synastry");
    assert.deepEqual(recentLanguages(), []);
    assert.equal(pickerSeen(Date.UTC(2026, 9, 13)), null);
  } finally {
    delete globalThis.localStorage;
  }
});

test("⌘K finds a language by its name, case and accents aside, and a Chinese one by its pinyin and characters (languages plan, part 28)", () => {
  // The palette's entries for the languages, their lenses and pages, as CommandPaletteDialog.tsx makes them.
  const say = (key) => CATALOG[key][0];
  const entries = [];
  for (const l of LANGUAGES) {
    const name = say(LANGUAGE_WORDS[l.id].name);
    entries.push({ id: `lang:${l.id}`, hay: paletteWords(name, pickerWords[LANGUAGE_WORDS[l.id].line][0], "Languages", languageAliases(l.id)) });
    for (const lens of lensesOf(l.id)) entries.push({ id: `lens:${l.id}:${lens}`, hay: paletteWords(say(LENS_LABEL[lens]), name, "Lenses", languageAliases(l.id)) });
  }
  const found = (typed) => entries.filter((e) => paletteFinds(typedWords(typed), e.hay)).map((e) => e.id);
  const languages = (typed) => found(typed).filter((id) => id.startsWith("lang:"));

  assert.equal(languageAliases("bazi"), "bāzì 八字", "Traditional and Simplified alike: once");
  assert.equal(languageAliases("feng-shui"), "fēngshuǐ 風水 风水");
  assert.equal(languageAliases("chinese-astrology"), "shēngxiào 生肖");
  for (const id of ["astrology", "human-design", "numerology"]) assert.equal(languageAliases(id), "", id);

  for (const typed of ["bazi", "BaZi", "bāzì", "BĀZÌ", "八字", "ｂａｚｉ"]) assert.deepEqual(languages(typed), ["lang:bazi"], typed);
  for (const typed of ["fengshui", "feng shui", "fēngshuǐ", "Feng Shui", "風水", "风水"]) assert.deepEqual(languages(typed), ["lang:feng-shui"], typed);
  for (const typed of ["shengxiao", "shēngxiào", "生肖"]) assert.deepEqual(languages(typed), ["lang:chinese-astrology"], typed);
  // As by its name, a Chinese language's lenses are found by its pinyin and characters, and narrowed by a lens's name.
  assert.deepEqual(found("八字"), ["lang:bazi", "lens:bazi:natal", "lens:bazi:cycles", "lens:bazi:relationship"]);
  assert.deepEqual(found("bāzì cycles"), ["lens:bazi:cycles"]);
  assert.deepEqual(found("風水　home"), ["lens:feng-shui:home"], "an ideographic space between the words");
  assert.deepEqual(found("fēngshuǐ relationship"), ["lens:feng-shui:relationship"], "Feng Shui's two people (FS32)");
  assert.deepEqual(found("风水"), ["lang:feng-shui", "lens:feng-shui:natal", "lens:feng-shui:cycles", "lens:feng-shui:relationship", "lens:feng-shui:home"]);
  assert.deepEqual(found("fēngshuǐ cycles"), ["lens:feng-shui:cycles"], "Feng Shui's directions through the years (feature 5d)");
  // Accents aside in French too; nothing typed, nothing narrowed.
  assert.ok(paletteFinds(typedWords("numerologie"), paletteWords("Numérologie")));
  assert.ok(paletteFinds(typedWords("ÉCLIPSE"), paletteWords("éclipse")));
  assert.deepEqual(typedWords("  "), []);
  assert.deepEqual(languages("八"), ["lang:bazi"], "a character alone");
  assert.deepEqual(languages("水"), ["lang:feng-shui"]);
  assert.deepEqual(languages("zz"), []);
});

test("the Chinese languages' own names on their cards: characters, pinyin, and the picker's names (languages plan, part 28)", () => {
  const chinese = languageGroups().find((g) => g.group === "chinese").languages.map((l) => l.id);
  assert.deepEqual(Object.keys(LANGUAGE_NAMES).sort(), [...chinese].sort(), "one for each Chinese language");
  for (const id of chinese) {
    const n = LANGUAGE_NAMES[id];
    assert.deepEqual([n.en, n.fr], CATALOG[LANGUAGE_WORDS[id].name], `${id}: the same names as the picker's`);
  }
  assert.deepEqual(
    Object.values(LANGUAGE_NAMES).map((n) => `${n.hant} ${n.hans} ${n.pinyin}`),
    ["生肖 生肖 shēngxiào", "八字 八字 bāzì", "風水 风水 fēngshuǐ"],
  );
  // Feng Shui's card says what it needs: a date; a home only if the reader wants its Home lens.
  assert.deepEqual(pickerWords[LANGUAGE_WORDS["feng-shui"].needs], ["A date is enough; a home is optional", "Une date suffit\u202f; un logement est facultatif"]);
  assert.deepEqual(pickerWords.langNew, ["New", "Nouveau"]);
});
