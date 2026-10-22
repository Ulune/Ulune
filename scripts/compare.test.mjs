/**
 * Compare, two charts side by side (share and compare plan, feature 2, and
 * idea B9; src/studio/compare): which pages it shows and where "See how they
 * meet" leads; what a choice in one chart chooses in the other (linked.ts);
 * what the two share, worked out from the made-up fixtures' charts (Fixture
 * A, 15/06/1990 12:00 Paris; Fixture B, 03/11/1987 23:10 Oslo); and its book
 * of words, held to the catalog's rules and said by its own code only.
 * Ideas B7 and B8 (compare-modes.ts, agree.ts, shared-group.ts, small.ts):
 * its three ways and how a kept record is read back; where two languages
 * agree, and only where they truly do; what three or four share, all of them
 * or most; how three or four stand on the screen.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { calculateHumanDesign, calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { castNumerology, numerologyOptionsOf } from "../src/lib/chart/numerology.ts";
import { baziChart } from "../src/lib/chinese/bazi.ts";
import { baziBalance } from "../src/lib/chinese/bazi-balance.ts";
import { fengShuiOf } from "../src/lib/chinese/fengshui.ts";
import { zodiacChart } from "../src/lib/chinese/zodiac.ts";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";
import { compareWords } from "../src/lib/i18n/catalog/compare-words.ts";
import { comparablePage } from "../src/studio/compare/comparable.ts";
import { comparePageFor } from "../src/studio/compare/gate.ts";
import { relationshipPageOf } from "../src/studio/compare/meet.ts";
import { countsOf, hdLacks, linkedId, linkedState } from "../src/studio/compare/linked.ts";
import { sharedItems as sharedAstro } from "../src/studio/compare/shared-astro.ts";
import { sharedItems as sharedHd } from "../src/studio/compare/shared-hd.ts";
import * as numCompare from "../src/studio/compare/shared-numerology.ts";
import { WHEEL_CORES } from "../src/lib/chart/numerology-focus.ts";
import { sharedItems as sharedZodiac } from "../src/studio/compare/shared-zodiac.ts";
import { pillarGod, sharedItems as sharedBazi } from "../src/studio/compare/shared-bazi.ts";
import { sharedItems as sharedFengShui } from "../src/studio/compare/shared-fengshui.ts";
import * as ids from "../src/studio/compare/chinese-ids.ts";
import * as numTable from "../src/lib/chart/numerology-table.ts";
import { stemGodName } from "../src/lib/chinese/bazi-table.ts";
import { DEFAULT_CHINESE_PREFS, chineseLabel } from "../src/lib/chinese/prefs.ts";
import { PLACE_WORD } from "../src/lib/chinese/zodiac-places.ts";
import { hdKeyRows } from "../src/lib/chart/hd-keys.ts";
import { hdCrossOf } from "../src/lib/chart/hd-cross.ts";
import { hdCrossName } from "../src/lib/chart/hd-cross-names.ts";
import { fsDirRef, fsKuaRef } from "../src/lib/chinese/fengshui-reading.ts";
import { personYear, starsOfMonth } from "../src/lib/chinese/fengshui-cycles.ts";
import { fscDirRef } from "../src/lib/chinese/fengshui-cycles-reading.ts";
import { luckAt, luckPillars } from "../src/lib/chinese/bazi-luck.ts";
import { luckRef } from "../src/lib/chinese/bazi-luck-reading.ts";
import { STUDIO_PAGES } from "../src/studio/url.ts";

const ROOT = new URL("..", import.meta.url).pathname;

const say = (locale) => (key, vars = {}) => {
  let text = compareWords[key][locale === "fr" ? 1 : 0];
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
};

const A = { name: "", placeLabel: "Paris", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 };
const B = { name: "", placeLabel: "Oslo", date: "1987-11-03", time: "23:10", latitude: 59.9139, longitude: 10.7522 };

test("Compare shows every page that reads one person's chart, and none of the others", () => {
  const shown = STUDIO_PAGES.filter(comparablePage);
  assert.deepEqual(
    [...shown].sort(),
    ["bazi", "bazi-luck", "design", "design-cycles", "fengshui", "fengshui-cycles", "natal", "numerology", "numerology-cycles", "progressions", "transits", "zodiac", "zodiac-years"],
  );
  // From a page it does not show, it opens on its language's Natal page.
  const none = { getItem: () => null, setItem: () => {} };
  assert.equal(comparePageFor("synastry", none), "natal");
  assert.equal(comparePageFor("composite", none), "natal");
  assert.equal(comparePageFor("zodiac-pair", none), "zodiac");
  assert.equal(comparePageFor("bazi-pair", none), "bazi");
  assert.equal(comparePageFor("fengshui-pair", none), "fengshui");
  assert.equal(comparePageFor("design-pair", none), "design");
  assert.equal(comparePageFor("fengshui-home", none), "fengshui");
  assert.equal(comparePageFor("timing", none), "natal");
  assert.equal(comparePageFor("bazi-luck", none), "bazi-luck");
  // Numerology's two people (feature 5c) opens on Numerology; Feng Shui's Cycles (feature 5d) is shown itself.
  assert.equal(comparePageFor("numerology-pair", none), "numerology");
  assert.equal(comparePageFor("fengshui-cycles", none), "fengshui-cycles");
});

test("“See how they meet” leads to its language's Relationship page, where there is one", () => {
  for (const p of ["natal", "transits", "progressions"]) assert.equal(relationshipPageOf(p), "synastry");
  // Human Design's Cycles (feature 5b) leads to its connection chart too.
  assert.equal(relationshipPageOf("design-cycles"), "design-pair");
  for (const p of ["zodiac", "zodiac-years"]) assert.equal(relationshipPageOf(p), "zodiac-pair");
  for (const p of ["bazi", "bazi-luck"]) assert.equal(relationshipPageOf(p), "bazi-pair");
  assert.equal(relationshipPageOf("fengshui"), "fengshui-pair");
  // Human Design's connection chart (feature 5a): "See how they meet" leads there from the bodygraph.
  assert.equal(relationshipPageOf("design"), "design-pair");
  // Numerology's Relationship lens (feature 5c), from either of its pages; Feng Shui's Cycles leads to its two people too.
  for (const p of ["numerology", "numerology-cycles"]) assert.equal(relationshipPageOf(p), "numerology-pair");
  assert.equal(relationshipPageOf("fengshui-cycles"), "fengshui-pair");
  assert.equal(relationshipPageOf("timing"), null);
});

test("a choice in one chart is the same element in the other, in that chart's own count", () => {
  assert.equal(linkedId("planet:sun", ["yang", "yin"]), "planet:sun");
  assert.equal(linkedId("gate:34", ["yin"]), "gate:34");
  assert.equal(linkedId("fs:yang:dir:se", ["yang", "yin"]), "fs:yang:dir:se");
  assert.equal(linkedId("fs:yang:dir:se", ["yin"]), "fs:yin:dir:se");
  assert.equal(linkedId("fs:yin:kua", ["yang"]), "fs:yang:kua");
  assert.equal(linkedId("bz:luck:yang:3", ["yin"]), "bz:luck:yin:3");
  assert.equal(linkedId("bz:luck-how", ["yin"]), "bz:luck-how");
  // Feng Shui's Cycles: a direction and the year in practice in that chart's own count; the year's own refs are everyone's.
  assert.equal(linkedId("fsc:yang:dir:s", ["yin"]), "fsc:yin:dir:s");
  assert.equal(linkedId("fsc:yin:you", ["yang"]), "fsc:yang:you");
  assert.equal(linkedId("fsc:yang:dir:s", ["yang", "yin"]), "fsc:yang:dir:s");
  assert.equal(linkedId("fsc:aff:tai-sui", ["yin"]), "fsc:aff:tai-sui");
  assert.equal(linkedId("fsc:dir:n", ["yin"]), "fsc:dir:n");
  assert.deepEqual(countsOf("yin"), ["yin"]);
  assert.deepEqual(countsOf(undefined), ["yang", "yin"]);
});

test("a chart without the element says so; one whose text is on its way waits", async () => {
  const [ha, hb] = await Promise.all([A, B].map(async (x) => calculateHumanDesign({ natalUtc: new Date((await calculateNatal(x)).meta.utc) })));
  const onlyA = [...new Set(ha.activations.map((a) => a.gate))].find((g) => !hb.activations.some((b) => b.gate === g));
  assert.ok(onlyA, "a gate of A's that B lacks");
  assert.equal(hdLacks(`gate:${onlyA}`, hb), true);
  assert.equal(hdLacks(`gate:${onlyA}`, ha), false);
  for (const c of ha.definedChannels) assert.equal(hdLacks(`channel:${c.id}`, ha), false);
  assert.equal(hdLacks("center:sacral", hb), false);
  assert.equal(linkedState({ page: "design", id: `gate:${onlyA}`, readingId: `gate:${onlyA}`, pending: false, hd: hb }), "lacks");
  assert.equal(linkedState({ page: "natal", id: "planet:sun", readingId: "planet:sun", pending: false }), "read");
  assert.equal(linkedState({ page: "natal", id: "aspect:x", readingId: null, pending: true }), "wait");
  assert.equal(linkedState({ page: "natal", id: "aspect:x", readingId: null, pending: false }), "lacks");
  // A page that reads something unasked (the year) when its element is missing: not that element.
  assert.equal(linkedState({ page: "zodiac-years", id: "zky:month:3", readingId: "zky:year", pending: false }), "lacks");
});

test("what the fixtures share, in each language, chooses the same element in both", async () => {
  const [ca, cb] = await Promise.all([calculateNatal(A), calculateNatal(B)]);
  const side = (chart, data) => ({ chart, data });
  // Astrology: the outer planets of the late 1980s (Neptune in Capricorn, Pluto in Scorpio), not the Sun.
  const astro = sharedAstro("natal", side(ca), side(cb), "en", say("en"));
  assert.deepEqual(astro.map((i) => i.label), ["Neptune in Capricorn", "Pluto in Scorpio"]);
  assert.deepEqual(astro.map((i) => i.ids), [{ a: "planet:neptune", b: "planet:neptune" }, { a: "planet:pluto", b: "planet:pluto" }]);
  assert.equal(sharedAstro("natal", side(ca), side(cb), "fr", say("fr"))[0].label, "Neptune en Capricorne");
  // The same chart twice shares its Sun, Moon and Ascendant first.
  assert.deepEqual(sharedAstro("natal", side(ca), side(ca), "en", say("en")).slice(0, 3).map((i) => i.ids.a), ["planet:sun", "planet:moon", "angle:ascendant"]);
  // Human Design: the gates both have a planet in, each named and chosen as on the bodygraph.
  const [ha, hb] = await Promise.all([calculateHumanDesign({ natalUtc: new Date(ca.meta.utc) }), calculateHumanDesign({ natalUtc: new Date(cb.meta.utc) })]);
  const hd = sharedHd("design", side(ca, { hd: ha }), side(cb, { hd: hb }), "en", say("en"));
  assert.ok(hd.length > 0);
  for (const i of hd) {
    assert.match(i.ids.a, /^(gate:\d+|channel:\d+–\d+|hello:\w+)$/);
    if (i.ids.a.startsWith("gate:")) assert.equal(hdLacks(i.ids.a, hb), false);
  }
  assert.deepEqual(hd.filter((i) => i.ids.a.startsWith("gate:")).map((i) => i.label), ["Gate 11", "Gate 14", "Gate 19", "Gate 33", "Gate 58"]);
  // A bodygraph shares its keys with itself, named as the cards above it name them (hd-keys.ts), in both languages.
  for (const locale of ["en", "fr"]) {
    const keys = sharedHd("design", side(ca, { hd: ha }), side(ca, { hd: ha }), locale, say(locale)).filter((i) => i.ids.a.startsWith("hello:"));
    const rows = hdKeyRows(ha, locale).filter((r) => r.key !== "strategy" && !r.uncertain);
    // (The cross by its name, as under its card, where it has one.)
    const value = (r) => (r.key === "cross" ? (hdCrossName(hdCrossOf(ha), locale) ?? r.value) : r.value);
    assert.deepEqual(keys.map((i) => i.label), rows.map((r) => say(locale)("cmpKey", { label: r.label, value: value(r) })));
    assert.deepEqual(keys.map((i) => i.ids.a), rows.map((r) => `hello:${r.key}`));
  }
  // Numerology: a chart shares all its core numbers with itself, a master number counting as itself.
  const na = castNumerology(ca, numerologyOptionsOf({ name: "TraceQA", date: ca.meta.date, time: ca.meta.time, placeLabel: "", houseSystem: "placidus" }, ca));
  // Compare names the wheel's six cores and the table's core rows itself (out of the pages' files): the same, in the same order.
  assert.deepEqual([...numCompare.WHEEL_CORES], [...WHEEL_CORES]);
  assert.deepEqual([...numCompare.TABLE_CORES], [...numTable.TABLE_CORES]);
  for (const locale of ["en", "fr"]) {
    for (const id of numTable.TABLE_CORES) {
      assert.deepEqual(numCompare.tableCoreValue(na, id), numTable.tableCoreValue(na, id));
      assert.equal(numCompare.tableCoreLabel(locale, id), numTable.tableCoreLabel(locale, id));
      assert.equal(numCompare.valueNote(locale, numTable.tableCoreValue(na, id)), numTable.valueNote(locale, numTable.tableCoreValue(na, id)));
    }
  }
  const self = numCompare.sharedItems("numerology", side(ca, { numbers: na }), side(ca, { numbers: na }), "en", say("en"));
  assert.deepEqual(self.map((i) => i.ids.a), ["core:lifepath", "core:expression", "core:soulurge", "core:personality", "core:birthday", "core:maturity"]);
  assert.ok(self.some((i) => /13\/4/.test(i.label)), "the Life Path as 13/4");
  // Chinese astrology: no place in common, but the Snake in both (A's hour, B's day), chosen where each has it.
  const birth = (c) => ({ utc: c.meta.utc, date: c.meta.date, time: c.meta.time, longitude: c.meta.longitude });
  // On Ulune's default clock and day boundary (true solar time, the day turning at 23:00).
  const prefs = { clock: "true-solar", dayBoundary: "23:00" };
  const za = zodiacChart(birth(ca), prefs);
  const zb = zodiacChart(birth(cb), prefs);
  const zk = sharedZodiac("zodiac", side(ca, { zodiac: za }), side(cb, { zodiac: zb }), "en", say("en"));
  const snake = zk.find((i) => /Snake/.test(i.label));
  assert.ok(snake, JSON.stringify(zk));
  assert.notEqual(snake.ids.a, snake.ids.b);
  // BaZi: both Day Masters weak; A's Fire and Water tie, so no strongest phase is named for both.
  const [ba, bb] = [baziChart(birth(ca), prefs), baziChart(birth(cb), prefs)];
  const bz = sharedBazi("bazi", side(ca, { bazi: ba, balance: baziBalance(ba) }), side(cb, { bazi: bb, balance: baziBalance(bb) }), "en", say("en"));
  assert.deepEqual(bz.map((i) => [i.label, i.ids.a]), [["Strength: Weak", "bz:strength"]]);
  // Feng Shui: by the yang count Kua 1 and Kua 4, both of the East group; by the yin count Kua 8 and 2, both of the West.
  const fs = (ca2, cb2) => sharedFengShui("fengshui", side(ca, { list: ca2 }), side(cb, { list: cb2 }), "en", say("en"));
  const yang = fs([fengShuiOf(birth(ca), "yang")], [fengShuiOf(birth(cb), "yang"), fengShuiOf(birth(cb), "yin")]);
  assert.deepEqual(yang.map((i) => [i.label, i.ids]), [["East group", { a: "fs:yang:kua", b: "fs:yang:kua" }]]);
  const yin = fs([fengShuiOf(birth(ca), "yin")], [fengShuiOf(birth(cb), "yin")]);
  assert.deepEqual(yin[0]?.ids, { a: "fs:yin:kua", b: "fs:yin:kua" });
  assert.equal(yin[0]?.label, "West group");
  // Feng Shui's Cycles (feature 5d), October 2026: Kua 1 and Kua 4 both rest the south and the north; one chart with itself faces its south-east too.
  const oct = starsOfMonth(2026, 8);
  const cycOf = (fs1) => ({ ctx: { people: [personYear(fs1, oct)] } });
  const cyc = (fa, fb, locale = "en") => sharedFengShui("fengshui-cycles", side(ca, cycOf(fa)), side(cb, cycOf(fb)), locale, say(locale));
  const [fa1, fb4] = [fengShuiOf(birth(ca), "yang"), fengShuiOf(birth(cb), "yang")];
  assert.deepEqual(cyc(fa1, fb4).map((i) => [i.label, i.ids]), [
    ["To rest this year: South", { a: "fsc:yang:dir:s", b: "fsc:yang:dir:s" }],
    ["To rest this year: North", { a: "fsc:yang:dir:n", b: "fsc:yang:dir:n" }],
  ]);
  assert.deepEqual(cyc(fa1, fa1, "fr").map((i) => i.label), ["Vers où se tourner cette année\u202f: Sud-Est", "À laisser reposer cette année\u202f: Sud", "À laisser reposer cette année\u202f: Nord"]);
  assert.deepEqual(cyc(fa1, fengShuiOf(birth(ca), "yin")).map((i) => i.key), [], "Kua 1 and Kua 8 rest none of the same directions");
  assert.deepEqual(sharedFengShui("fengshui-cycles", side(ca, { ctx: null }), side(cb, cycOf(fb4)), "en", say("en")), [], "without a chart, nothing");
  // BaZi's Cycles: the same chart is in the same luck pillar as itself, chosen as the page's own id.
  const lucks = [luckPillars(ba, "yang")];
  const now = luckAt(lucks[0], Date.now());
  const luck = sharedBazi("bazi-luck", side(ca, { lucks }), side(ca, { lucks }), "en", say("en"));
  if (now) assert.deepEqual(luck.map((i) => i.ids), [{ a: luckRef("yang", now.index), b: luckRef("yang", now.index) }]);
  // The words and ids Compare names itself are the pages' own (chinese-ids.ts: zodiac-places.ts, fengshui-reading.ts).
  assert.deepEqual(ids.PLACE_WORD, PLACE_WORD);
  for (const count of ["yang", "yin"]) {
    assert.equal(ids.kuaRef(count), fsKuaRef(count));
    assert.equal(ids.dirRef(count, "se"), fsDirRef(count, "se"));
    assert.equal(ids.cyclesDirRef(count, "se"), fscDirRef(count, "se"));
  }
  // The merged pillars table names each stem's god as the page's table does (bazi-table.ts).
  for (const locale of ["en", "fr"]) {
    for (const p of ba.pillars) assert.equal(chineseLabel(pillarGod(p), locale, DEFAULT_CHINESE_PREFS).text, stemGodName(p, locale, DEFAULT_CHINESE_PREFS));
  }
});

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

test("Compare's words: both languages, Ulune's typography, said by Compare's own code only", () => {
  for (const [key, [en, fr]] of Object.entries(compareWords)) {
    assert.ok(en?.trim() && fr?.trim(), `${key}: a language is missing`);
    for (const text of [en, fr]) assert.ok(!/\w'\w/.test(text), `${key}: straight apostrophe in "${text}"`);
    assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(fr), `${key}: French punctuation without its narrow space: "${fr}"`);
    assert.ok(!/« |«[^\u202f]| »|[^\u202f]»/.test(fr), `${key}: « » without narrow spaces in "${fr}"`);
    assert.ok(!(key in CATALOG), `${key} in both the catalog and Compare's book`);
  }
  const own = walk(join(ROOT, "src/studio/compare")).map((p) => readFileSync(p, "utf8")).join("\n");
  const unsaid = Object.keys(compareWords).filter((key) => !new RegExp(`["'\`]${key}["'\`]`).test(own));
  assert.deepEqual(unsaid, [], "a word of the book is said nowhere");
  const elsewhere = walk(join(ROOT, "src"))
    .filter((p) => !p.includes("/src/studio/compare/") && !p.includes("/i18n/catalog/"))
    .flatMap((p) => Object.keys(compareWords).filter((key) => new RegExp(`["'\`]${key}["'\`]`).test(readFileSync(p, "utf8"))).map((key) => `${key} in ${p.slice(ROOT.length)}`));
  assert.deepEqual(elsewhere, [], "a word of Compare's book said by code that does not load it");
  // The first download's words (the toolbar's button, the switcher, ⌘K) are the catalog's.
  for (const key of ["compare", "compareWith", "compareNotHere"]) assert.ok(key in CATALOG, key);
});

test("Compare stays out of the first download: the workspace and the reading load it when it is on", () => {
  const first = ["src/studio/workspace.tsx", "src/studio/stage/Stage.tsx", "src/studio/shell/ChartPicker.tsx", "src/studio/compare/gate.ts", "src/studio/compare/CompareButton.tsx", "src/studio/compare/comparable.ts"];
  for (const f of first) {
    const src = readFileSync(join(ROOT, f), "utf8");
    assert.ok(!/from "@\/studio\/compare\/(CompareView|CompareReading|compare-store|shared|merged|export-both)/.test(src), `${f} imports Compare's view statically`);
    assert.ok(!/compare-words/.test(src), `${f} imports Compare's book`);
  }
  // The workspace fetches the view through gate.ts, which fetches the view itself.
  assert.match(readFileSync(join(ROOT, "src/studio/workspace.tsx"), "utf8"), /import\("@\/studio\/compare\/gate"\)\.then\(\(m\) => m\.loadCompareView\(\)\)/);
  assert.match(readFileSync(join(ROOT, "src/studio/compare/gate.ts"), "utf8"), /import\("@\/studio\/compare\/CompareView"\)/);
});

/* ---- Ideas B7 and B8: Compare's other ways ---- */

import * as modes from "../src/studio/compare/compare-modes.ts";
import { agreeItems, solarMonthBranch } from "../src/studio/compare/agree.ts";
import { groupShared, pairsOf } from "../src/studio/compare/shared-group.ts";
import { SMALL_SUMMARY, smallSummaryNow } from "../src/studio/compare/small.ts";
import { languageOf, lensOf } from "../src/studio/map.ts";

test("Compare's three ways: the panes each shows, and its choices read back with care", () => {
  assert.equal(modes.modeOf(undefined), "people", "a record from before ideas B7 and B8 compares people");
  assert.equal(modes.modeOf("moments"), "moments");
  assert.equal(modes.modeOf("everyone"), "people");
  assert.deepEqual(modes.panesOf("people", 0), ["a", "b"]);
  assert.deepEqual(modes.panesOf("people", 1), ["a", "b", "c"]);
  assert.deepEqual(modes.panesOf("people", 2), ["a", "b", "c", "d"]);
  assert.deepEqual(modes.panesOf("people", 9), ["a", "b", "c", "d"], "four at most");
  assert.deepEqual(modes.panesOf("languages", 2), ["a", "b"], "one person: two panes");
  assert.deepEqual(modes.panesOf("moments", 2), ["a", "b"]);
  // C and D: kept charts only, never A or B, none twice, two at most.
  const ids = ["a1", "b1", "c1", "d1", "e1"];
  assert.deepEqual(modes.morePeople(["c1", "d1"], ids, "a1", "b1"), ["c1", "d1"]);
  assert.deepEqual(modes.morePeople(["a1", "gone", "c1", "c1", 7, "b1", "d1", "e1"], ids, "a1", "b1"), ["c1", "d1"]);
  assert.deepEqual(modes.morePeople("c1", ids, "a1", "b1"), []);
  // Two languages: B's page is another language's page Compare shows; else Human Design beside astrology, astrology beside the rest.
  assert.equal(modes.languagesPageOf("natal", undefined), "design");
  assert.equal(modes.languagesPageOf("transits", "bazi"), "bazi");
  assert.equal(modes.languagesPageOf("numerology", "bazi"), "bazi");
  assert.equal(modes.languagesPageOf("numerology", undefined), "natal");
  assert.equal(modes.languagesPageOf("natal", "progressions"), "design", "not A's own language");
  assert.equal(modes.languagesPageOf("bazi", "zodiac-pair"), "natal", "a Relationship page is not compared");
  assert.equal(modes.languagesPageOf("bazi", "nowhere"), "natal");
  // Every page the picker offers is one Compare shows, language by language, in the lenses' order.
  for (const g of modes.comparableByLanguage()) {
    for (const p of g.pages) {
      assert.equal(languageOf(p), g.lang);
      assert.ok(comparablePage(p), p);
    }
  }
  assert.deepEqual(modes.comparableByLanguage().find((g) => g.lang === "astrology")?.pages, ["natal", "transits", "progressions"]);
  // Two moments: B's page is its language's Cycles page (the one kept if it is one); beside a Cycles page, that page.
  assert.equal(modes.momentsPageOf("natal", undefined), "transits");
  assert.equal(modes.momentsPageOf("natal", "progressions"), "progressions");
  assert.equal(modes.momentsPageOf("progressions", undefined), "progressions");
  assert.equal(modes.momentsPageOf("numerology", "transits"), "numerology-cycles", "a page of another language is not B's");
  assert.equal(modes.momentsPageOf("bazi", undefined), "bazi-luck");
  // Human Design's Cycles (feature 5b): the bodygraph beside its moment, and beside itself a year on.
  assert.equal(modes.momentsPageOf("design", undefined), "design-cycles");
  assert.equal(modes.momentsPageOf("design-cycles", undefined), "design-cycles");
  assert.equal(modes.momentsPageOf("fengshui", undefined), "fengshui-cycles");
  assert.equal(modes.momentsPageOf("zodiac-years", undefined), "zodiac-years");
  for (const lang of ["astrology", "human-design", "numerology", "chinese-astrology", "bazi", "feng-shui"]) {
    for (const p of modes.cyclesPagesOf(lang)) assert.equal(lensOf(p), "cycles");
  }
  assert.deepEqual(modes.cyclesPagesOf(undefined), []);
});

test("one chart at two moments: B starts now, or a step on beside the same page; a kept moment is read with care", () => {
  const now = Date.UTC(2026, 9, 18, 9, 0);
  const fresh = modes.startMoment("natal", "transits", now);
  assert.deepEqual(fresh, { page: "transits", at: now, live: true, progressionTarget: now, year: null, month: null });
  const year = modes.startMoment("transits", "transits", now);
  assert.equal(year.live, false);
  assert.ok(Math.abs(year.at - now - 365.2425 * 86_400_000) < 2, "a year on");
  assert.equal(year.year, 2027);
  assert.equal(modes.startMoment("numerology-cycles", "numerology-cycles", now).year, 2027, "numerology: this year beside next year");
  assert.equal(modes.startMoment("bazi-luck", "bazi-luck", now).year, 2036, "BaZi: a luck pillar's ten years on");
  assert.equal(modes.startMoment("numerology", "numerology-cycles", now).year, null, "beside the Natal page: now");
  // Kept: read back as it was; live, it follows now; anything out of place starts afresh.
  const kept = { page: "transits", at: Date.UTC(2030, 0, 1), live: false, progressionTarget: now, year: null, month: null };
  assert.deepEqual(modes.momentOf(kept, now), kept);
  assert.equal(modes.momentOf({ ...kept, live: true }, now)?.at, now);
  assert.equal(modes.momentOf({ ...kept, page: "natal" }, now), null, "a Natal page has no moment");
  assert.equal(modes.momentOf({ ...kept, page: "synastry" }, now), null);
  assert.equal(modes.momentOf({ ...kept, page: "x" }, now), null);
  assert.equal(modes.momentOf(null, now), null);
  assert.equal(modes.momentOf({ ...kept, at: 1e20 }, now)?.at, now, "an instant out of the ephemeris's years");
  assert.equal(modes.momentOf({ ...kept, page: "fengshui-cycles", year: 2027.5, month: 3 }, now)?.year, null);
  assert.deepEqual(
    [modes.momentOf({ ...kept, page: "fengshui-cycles", year: 2027, month: 3 }, now)?.month, modes.momentOf({ ...kept, page: "fengshui-cycles", year: 2027, month: 12 }, now)?.month],
    [3, null],
  );
  assert.equal(modes.momentOf({ ...kept, page: "fengshui-cycles", year: null, month: 3 }, now)?.month, null, "a month only with its year");
  // The kept record as the view reads it: the way, C and D, B's pages.
  const way = modes.wayOf({ on: true, partnerId: "b1", linked: true, mode: "moments", more: ["c1", "a1"], langPage: "bazi", moment: kept }, "natal", ["a1", "b1", "c1"], "a1", "b1");
  assert.deepEqual(way, { mode: "moments", more: ["c1"], langPage: "bazi", momentPage: "transits" });
});

test("three or four stand as a row or a grid of two by two, whichever draws each larger; the reading's side holds steady", () => {
  // 1920 × 1080 with the side panel: three in a row, four in a grid.
  assert.deepEqual(modes.arrange(3, 1540, 880), { cols: 3, rows: 1, cell: 1540 / 3 });
  assert.deepEqual(modes.arrange(4, 1540, 880), { cols: 2, rows: 2, cell: 440 });
  // A laptop beside the panel (1024): a grid of about 320 px.
  assert.deepEqual(modes.arrange(4, 644, 658), { cols: 2, rows: 2, cell: 322 });
  assert.deepEqual(modes.arrange(2, 1060, 700), { cols: 2, rows: 1, cell: 530 });
  // Two keep the owner's rule (about 490 px of pane beside the panel); three or four keep SMALL_MIN.
  assert.equal(modes.readingBeside(2, 1440, 790, 380, 490), true);
  assert.equal(modes.readingBeside(2, 1280, 790, 380, 490), false);
  assert.equal(modes.readingBeside(4, 1024, 658, 380, 490), true);
  assert.equal(modes.readingBeside(4, 900, 658, 380, 490), false);
  // Within a few pixels of the line, it stays where it was (no to and fro).
  const edge = 380 + 2 * (modes.SMALL_MIN - 8);
  assert.equal(modes.readingBeside(4, edge, 900, 380, 490, false), false);
  assert.equal(modes.readingBeside(4, edge, 900, 380, 490, true), true);
  // Small panes: Human Design and numerology show their summary, three or four to a screen and narrow only.
  assert.deepEqual([...SMALL_SUMMARY].sort(), ["design", "numerology"]);
  assert.equal(smallSummaryNow("design", 4, 322), true);
  assert.equal(smallSummaryNow("design", 2, 322), false);
  assert.equal(smallSummaryNow("design", 4, 530), false);
  assert.equal(smallSummaryNow("natal", 4, 322), false);
  assert.equal(smallSummaryNow("numerology", 3, 0), false, "not measured yet");
  // Human Design needs height for its keys and bodygraph: four short panes at 1440 (530 × 370) show its summary, three tall ones at 1920 do not.
  assert.equal(smallSummaryNow("design", 4, 530, 370), true);
  assert.equal(smallSummaryNow("design", 3, 513, 880), false);
  assert.equal(smallSummaryNow("numerology", 4, 530, 370), false, "numerology's wheel and cards read at that size");
  assert.equal(smallSummaryNow("design", 2, 530, 370), false, "two charts draw the figure as ever");
});

test("where two languages agree: only where a real correspondence holds, each item choosing in both panes", async () => {
  const [ca, cb] = await Promise.all([calculateNatal(A), calculateNatal(B)]);
  const ha = await calculateHumanDesign({ natalUtc: new Date(ca.meta.utc) });
  const birth = (c) => ({ utc: c.meta.utc, date: c.meta.date, time: c.meta.time, longitude: c.meta.longitude });
  const prefs = { clock: "true-solar", dayBoundary: "23:00" };
  const side = (page, chart, data) => ({ page, chart, data });
  // The Chinese solar month turns at 15° of each sign: Lichun at 315° is the Tiger's.
  assert.equal(solarMonthBranch(315), 2);
  assert.equal(solarMonthBranch(314.9), 1);
  assert.equal(solarMonthBranch(0), 3, "0° Aries is in the Rabbit month (Jingzhe, 345°, to Qingming, 15°)");
  assert.equal(solarMonthBranch(84), 6, "24° Gemini: the Horse month");
  // Astrology beside Human Design: the Personality Sun and Moon are the birth chart's.
  const hd = agreeItems(side("natal", ca, null), side("design", ca, { hd: ha }), "en", say("en"));
  assert.equal(hd.why, "cmpAgreeWhyHd");
  const sunGate = ha.activations.find((x) => x.body === "sun" && x.layer === "personality");
  assert.deepEqual(hd.items.map((i) => i.ids), [
    { a: "planet:sun", b: `gate:${sunGate.gate}` },
    { a: "planet:moon", b: `gate:${ha.activations.find((x) => x.body === "moon" && x.layer === "personality").gate}` },
  ]);
  assert.equal(hd.items[0].label, `Sun in Gemini: Gate ${sunGate.gate}.${sunGate.line}`);
  assert.match(agreeItems(side("natal", ca, null), side("design", ca, { hd: ha }), "fr", say("fr")).items[0].label, /^Le Soleil en Gémeaux\u202f: Porte \d+\.\d$/);
  // The other way round, each pane's own ids; on Transits, the natal Sun (drawn inside) all the same.
  assert.deepEqual(agreeItems(side("design", ca, { hd: ha }), side("transits", ca, null), "en", say("en")).items[0].ids, { a: `gate:${sunGate.gate}`, b: "planet:sun" });
  // Human Design's data not there yet: the list, empty.
  assert.deepEqual(agreeItems(side("natal", ca, null), side("design", ca, undefined), "en", say("en")).items, []);
  // Astrology beside Chinese astrology and BaZi: the month's animal follows the Sun, for both fixtures.
  for (const c of [ca, cb]) {
    const z = zodiacChart(birth(c), prefs);
    const bz = baziChart(birth(c), prefs);
    const sun = c.planets.find((p) => p.id === "sun");
    const month = z.places.find((p) => p.id === "month");
    assert.equal(solarMonthBranch(sun.ecliptic), month.branch, "the calendar's month and the Sun's agree");
    const zk = agreeItems(side("natal", c, null), side("zodiac", c, { zodiac: z }), "en", say("en"));
    assert.equal(zk.why, "cmpAgreeWhyMonth");
    assert.deepEqual(zk.items.map((i) => i.ids), [{ a: "planet:sun", b: "zk:month" }]);
    const pillars = agreeItems(side("bazi", c, { bazi: bz }), side("progressions", c, null), "en", say("en"));
    assert.deepEqual(pillars.items.map((i) => i.ids), [{ a: "bz:branch:month", b: "planet:sun" }]);
  }
  const z = zodiacChart(birth(ca), prefs);
  const bz = baziChart(birth(ca), prefs);
  assert.match(agreeItems(side("natal", ca, null), side("zodiac", ca, { zodiac: z }), "en", say("en")).items[0].label, /^Sun at 24° Gemini · Month: Horse$/);
  // Chinese astrology beside BaZi: the four animals are the four branches; the elements named together only when the same.
  const zb = agreeItems(side("zodiac", ca, { zodiac: z }), side("bazi", ca, { bazi: bz }), "en", say("en"));
  assert.equal(zb.why, "cmpAgreeWhyBranches");
  const places = zb.items.filter((i) => i.key !== "agree-element");
  assert.deepEqual(places.map((i) => i.ids), ["year", "month", "day", "hour"].map((p) => ({ a: `zk:${p}`, b: `bz:branch:${p}` })));
  assert.match(places[0].label, /^Year: Horse, in both$/);
  const sameElement = z.places.find((p) => p.id === "year").stemPhase === STEMS_PHASE(bz.dayMaster);
  assert.equal(zb.items.some((i) => i.key === "agree-element"), sameElement);
  // No correspondence, no list: numerology beside BaZi, Human Design beside numerology, Feng Shui beside astrology; nor on a Cycles page.
  assert.equal(agreeItems(side("numerology", ca, null), side("bazi", ca, { bazi: bz }), "en", say("en")), null);
  assert.equal(agreeItems(side("design", ca, { hd: ha }), side("numerology-cycles", ca, null), "en", say("en")), null);
  assert.equal(agreeItems(side("fengshui", ca, null), side("natal", ca, null), "en", say("en")), null);
  assert.equal(agreeItems(side("natal", ca, null), side("zodiac-years", ca, null), "en", say("en")), null);
});

import { STEMS } from "../src/lib/chinese/names.ts";
const STEMS_PHASE = (i) => STEMS[i].phase;

test("what three or four share: what all of them do, and what most of them do with its count", async () => {
  const [ca, cb] = await Promise.all([calculateNatal(A), calculateNatal(B)]);
  const people = (charts) => charts.map((chart) => ({ chart, data: null }));
  const run = (charts) => {
    const who = ["a", "b", "c", "d"].slice(0, charts.length);
    const sides = people(charts);
    const at = (w) => sides[who.indexOf(w)];
    return groupShared(who, pairsOf(who).map(([x, y]) => ({ x, y, items: sharedAstro("natal", at(x), at(y), "en", say("en")) })));
  };
  assert.deepEqual(pairsOf(["a", "b", "c", "d"]), [["a", "b"], ["a", "c"], ["a", "d"], ["b", "c"], ["b", "d"], ["c", "d"]]);
  // Four (the second pair the first's twins): all four share the late 1980s' Neptune and Pluto; two of four is not most.
  const four = run([ca, cb, ca, cb]);
  assert.deepEqual(four.all.map((g) => g.label), ["Neptune in Capricorn", "Pluto in Scorpio"]);
  assert.deepEqual(four.all[0].ids, { a: "planet:neptune", b: "planet:neptune", c: "planet:neptune", d: "planet:neptune" });
  assert.deepEqual(four.most, []);
  // Three (A twice): what A shares with its twin is shared by two of three, most of them; the Sun first, as the lists give it.
  const three = run([ca, cb, ca]);
  assert.deepEqual(three.all.map((g) => g.label), ["Neptune in Capricorn", "Pluto in Scorpio"]);
  assert.equal(three.most[0].label, "Sun in Gemini");
  assert.deepEqual(three.most[0].ids, { a: "planet:sun", c: "planet:sun" });
  assert.ok(three.most.every((g) => g.count === 2));
  // Different values are never joined: B's Sun is not A's.
  assert.ok(!three.most.some((g) => g.ids.b && g.label === "Sun in Gemini"));
  // A Chinese animal in different places joins as it does for two, chosen where each has it.
  const birth = (c) => ({ utc: c.meta.utc, date: c.meta.date, time: c.meta.time, longitude: c.meta.longitude });
  const prefs = { clock: "true-solar", dayBoundary: "23:00" };
  const [za, zb] = [zodiacChart(birth(ca), prefs), zodiacChart(birth(cb), prefs)];
  const zSides = { a: { chart: ca, data: { zodiac: za } }, b: { chart: cb, data: { zodiac: zb } }, c: { chart: ca, data: { zodiac: za } } };
  const zk = groupShared(["a", "b", "c"], pairsOf(["a", "b", "c"]).map(([x, y]) => ({ x, y, items: sharedZodiac("zodiac", zSides[x], zSides[y], "en", say("en")) })));
  const snake = zk.all.find((g) => /Snake/.test(g.label));
  assert.ok(snake, JSON.stringify(zk.all));
  assert.notEqual(snake.ids.a, snake.ids.b);
  assert.equal(snake.ids.a, snake.ids.c);
});

test("the new ways stay out of the first download: the first page reads its scope's page, not Compare's time", () => {
  const scope = readFileSync(join(ROOT, "src/studio/scope.tsx"), "utf8");
  assert.ok(!/from "@\/studio\/(scope-time|compare\/)/.test(scope), "scope.tsx brings no more than its hooks");
  for (const f of ["src/studio/modes/natal.tsx", "src/studio/modes/wheel-view.ts", "src/studio/modes/data.tsx", "src/studio/workspace.tsx"]) {
    const src = readFileSync(join(ROOT, f), "utf8");
    assert.ok(!/from "@\/studio\/scope-time"|from "@\/studio\/compare\/(compare-modes|agree|shared-group|small|pane-label|compare-bar)"/.test(src), `${f} imports Compare's ways statically`);
  }
  // Every page's runtime reads the page through its scope (a pane of two languages draws its own).
  for (const f of ["bazi.tsx", "bazi-luck.tsx", "zodiac.tsx", "zodiac-years.tsx", "fengshui.tsx", "fengshui-cycles.tsx", "hooks/useHumanDesign.ts", "hooks/useNumerology.ts", "hooks/useTransitSky.ts", "hooks/useProgressions.ts"]) {
    const src = readFileSync(join(ROOT, "src/studio/modes", f), "utf8");
    assert.ok(!/useStudioStore\(\(s\) => s\.page\)/.test(src), `${f} reads the studio's page, not its scope's`);
    assert.ok(!/s\.time\./.test(src), `${f} reads the studio's time, not its scope's`);
  }
});
