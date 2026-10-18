/**
 * Compare, two charts side by side (share and compare plan, feature 2, and
 * idea B9; src/studio/compare): which pages it shows and where "See how they
 * meet" leads; what a choice in one chart chooses in the other (linked.ts);
 * what the two share, worked out from the made-up fixtures' charts (Fixture
 * A, 15/06/1990 12:00 Paris; Fixture B, 03/11/1987 23:10 Oslo); and its book
 * of words, held to the catalog's rules and said by its own code only.
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
    ["bazi", "bazi-luck", "design", "fengshui", "fengshui-cycles", "natal", "numerology", "numerology-cycles", "progressions", "transits", "zodiac", "zodiac-years"],
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
