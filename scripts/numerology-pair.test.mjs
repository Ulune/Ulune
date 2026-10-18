/*
 * Numerology's Relationship (share and compare plan, feature 5c; decision R3):
 * two people's numbers side by side, the pairs read as dynamics, the
 * relationship number, the shared digits and the two of you this year
 * (lib/chart/numerology-pair.ts); every pair's text in both languages, in
 * the tone the owner asked for (dynamics, never a score); the readings, the
 * table's text and CSV; the page's book of words. With the made-up fixtures:
 * TraceQA (15 June 1990) and Sample B (3 November 1987).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { castNumerology } from "../src/lib/chart/numerology.ts";
import {
  PAIR_IDS,
  PAIR_NUMBERS,
  allTextKeys,
  numerologyPair,
  pairKey,
  pairRow,
  relationshipNumber,
  relationshipYear,
  textKey,
} from "../src/lib/chart/numerology-pair.ts";
import { firstReadLines, numerologyPairReading, numerologyPairRefs } from "../src/lib/chart/interpret-numerology-pair.ts";
import { numerologyPairCsv, numerologyPairTextParts } from "../src/lib/chart/numerology-pair-table.ts";
import { stepsText, wholeText } from "../src/lib/chart/numerology-reduce.ts";
import * as T from "../src/lib/content/numerology-pairs.ts";
import { numPairWords } from "../src/lib/i18n/catalog/numerology-pair-words.ts";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const cast = (date, name, year = 2026) => castNumerology({ meta: { date, name: "", placeLabel: "" } }, { name, calendarYear: year, calendarMonth: 10, calendarDay: 18 });
const A = cast("1990-06-15", "TraceQA");
const B = cast("1987-11-03", "Sample B");
const names = { a: "TraceQA", b: "Sample B" };
const pair = numerologyPair(A, B);
const ctx = { pair, names };

test("both people's six numbers side by side, with the gap between each", () => {
  const cores = Object.fromEntries(pair.cores.map((c) => [c.id, [wholeText(c.a), wholeText(c.b), c.gap?.number]]));
  assert.deepEqual(cores, {
    lifepath: ["13/4", "3", 1],
    expression: ["11/2", "5", 3],
    soulurge: ["7", "6", 1],
    personality: ["22/4", "8", 4],
    birthday: ["6", "3", 3],
    maturity: ["6", "8", 2],
  });
});

test("the relationship number: the two Life Paths added and reduced, 11, 22 and 33 kept, never a debt", () => {
  assert.equal(stepsText(pair.relationship), "4 + 3 = 7");
  assert.equal(pair.relationship.number, 7);
  const lp = (n) => ({ lifePath: { number: n, digit: n > 9 ? (n % 9 || 9) : n } });
  const rel = (x, y) => relationshipNumber(lp(x), lp(y));
  assert.equal(rel(11, 11).number, 22, "11 + 11 = 22, kept");
  assert.equal(rel(11, 22).number, 33, "11 + 22 = 33, kept");
  assert.equal(rel(4, 7).number, 11, "4 + 7 = 11, kept");
  assert.equal(rel(33, 33).number, 3, "33 + 33 = 66 → 12 → 3");
  assert.equal(stepsText(rel(33, 33)), "33 + 33 = 66 → 12 → 3");
  assert.equal(rel(9, 4).number, 4);
  assert.equal(rel(9, 4).debt, null, "13 on the way is never a karmic debt here");
  // A Life Path with its debt is read as its number: TraceQA's 13/4 adds as a 4.
  assert.equal(pair.relationship.terms[0].value, 4);
});

test("each pair is keyed by its two numbers; a master beside 1–9 reads through its root's pair, two masters their own", () => {
  assert.equal(pairKey(4, 11), "4-11");
  assert.equal(pairKey(11, 4), "4-11");
  assert.equal(textKey(4, 11), "2-4");
  assert.equal(textKey(22, 8), "4-8");
  assert.equal(textKey(33, 9), "6-9");
  assert.equal(textKey(22, 11), "11-22");
  assert.equal(textKey(5, 5), "5-5");
  const rows = Object.fromEntries(pair.rows.map((r) => [r.id, [r.key, r.text, r.masters, r.gap?.number, r.same]]));
  assert.deepEqual(rows.lifepath, ["3-4", "3-4", [], 1, false]);
  assert.deepEqual(rows.expression, ["5-11", "2-5", [11], 3, false]);
  assert.deepEqual(rows.personality, ["8-22", "4-8", [22], 4, false]);
  // The crossed pairs: A's Soul Urge with B's Personality, A's Personality with B's Soul Urge, and the Life Path with the Expression both ways.
  assert.deepEqual(rows["su-pe"], ["7-8", "7-8", [], 1, false]);
  assert.deepEqual(rows["pe-su"], ["6-22", "4-6", [22], 2, false]);
  assert.deepEqual(rows["lp-ex"], ["4-5", "4-5", [], 1, false]);
  assert.deepEqual(rows["ex-lp"], ["3-11", "2-3", [11], 1, false]);
  assert.deepEqual(PAIR_IDS, ["lifepath", "expression", "soulurge", "personality", "birthday", "maturity", "su-pe", "pe-su", "lp-ex", "ex-lp"]);
  // The very same number, written whole: an 11 beside a 2 is not the same.
  const two = cast("1990-06-15", "TraceQA");
  assert.equal(numerologyPair(A, two).rows.filter((r) => !r.cross).every((r) => r.same), true);
  assert.equal(pairRow(numerologyPair(A, two), "su-pe").same, false, "a Soul Urge 7 beside a Personality 22/4");
  assert.deepEqual(pair.rows.filter((r) => r.cross).map((r) => r.id), ["su-pe", "pe-su", "lp-ex", "ex-lp"]);
});

test("every unordered pair of 1–9, 11, 22 and 33 has its text, in both languages", () => {
  const keys = allTextKeys();
  assert.equal(keys.length, 51, "45 pairs of 1–9 and 6 of masters");
  assert.deepEqual(Object.keys(T.PAIR_TEXTS).sort(), [...keys].sort());
  for (const x of PAIR_NUMBERS) {
    for (const y of PAIR_NUMBERS) {
      const text = T.PAIR_TEXTS[textKey(x, y)];
      assert.ok(text, `${x} and ${y}`);
      for (const part of ["together", "rub"]) for (const l of ["en", "fr"]) assert.ok(text[part][l].trim().length > 40, `${x}-${y} ${part} ${l}`);
    }
  }
  for (const n of PAIR_NUMBERS) for (const l of ["en", "fr"]) assert.ok(T.BRINGS[n][l], `brings ${n} ${l}`);
  for (const m of [11, 22, 33]) for (const l of ["en", "fr"]) assert.ok(T.MASTER_NOTES[m][l], `master ${m} ${l}`);
  for (const n of PAIR_NUMBERS) for (const l of ["en", "fr"]) assert.ok(T.RELATIONSHIP_TEXT[n][l], `relationship ${n} ${l}`);
  for (let n = 1; n <= 9; n += 1) for (const l of ["en", "fr"]) assert.ok(T.COUPLE_YEAR_TEXT[n][l], `year ${n} ${l}`);
  for (const id of PAIR_IDS) for (const l of ["en", "fr"]) assert.ok(T.POSITION_TEXT[id][l], `position ${id} ${l}`);
  // Each "what helps" is said in each pair's rub.
  for (const [k, text] of Object.entries(T.PAIR_TEXTS)) {
    assert.match(text.rub.en, /What helps: /, `${k} en`);
    assert.match(text.rub.fr, /Ce qui aide\u202f: /, `${k} fr`);
  }
});

/** Every text of the page's readings, as [where, language, text]. */
function allTexts() {
  const out = [];
  const bi = (where, b) => {
    out.push([where, "en", b.en]);
    out.push([where, "fr", b.fr]);
  };
  for (const [k, t] of Object.entries(T.PAIR_TEXTS)) {
    bi(`pair ${k} together`, t.together);
    bi(`pair ${k} rub`, t.rub);
  }
  for (const [n, b] of Object.entries(T.BRINGS)) bi(`brings ${n}`, b);
  for (const [n, b] of Object.entries(T.MASTER_NOTES)) bi(`master ${n}`, b);
  for (const [n, b] of Object.entries(T.RELATIONSHIP_TEXT)) bi(`relationship ${n}`, b);
  for (const [n, b] of Object.entries(T.COUPLE_YEAR_TEXT)) bi(`year ${n}`, b);
  for (const [n, b] of Object.entries(T.POSITION_TEXT)) bi(`position ${n}`, b);
  bi("about", T.PAIR_ABOUT);
  bi("relationship how", T.RELATIONSHIP_HOW);
  bi("year how", T.COUPLE_YEAR_HOW);
  for (const [k, [en, fr]] of Object.entries(numPairWords)) {
    out.push([`word ${k}`, "en", en]);
    out.push([`word ${k}`, "fr", fr]);
  }
  return out;
}

test("the tone: dynamics, never a score or a verdict; suggestions, never predictions; nothing to fear, nothing to buy", () => {
  const banned = {
    en: /\b(?:compatib\w*|incompatib\w*|score\w*|soul ?mates?|perfect match|doomed|destined|fate|must|divorce\w*|break(?:s|ing)? up|split up|illness|ill|sick\w*|disease|death|die|accident\w*|cheat\w*|buy|will (?:never|always))\b/i,
    fr: /\b(?:compatib\w*|incompatib\w*|score\w*|âmes? sœurs?|destin\w*|fatal\w*|doi[tv]\w*|divorc\w*|rupture\w*|séparation\w*|maladie\w*|malade\w*|mort\w*|accident\w*|tromp\w*|achet\w*)\b/i,
  };
  for (const [where, l, text] of allTexts()) {
    assert.doesNotMatch(text, banned[l], `${where} (${l}): “${text}”`);
  }
});

test("the typography: curly apostrophes, French narrow spaces, no straight quotes", () => {
  for (const [where, l, text] of allTexts()) {
    assert.ok(!/\w'\w/.test(text), `${where} (${l}): a straight apostrophe in “${text}”`);
    assert.ok(!/"/.test(text), `${where} (${l}): a straight quote`);
    if (l === "fr") {
      assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(text), `${where}: French punctuation without its narrow space: “${text}”`);
      assert.ok(!/ [:;!?]/.test(text), `${where}: a plain space before French punctuation: “${text}”`);
      assert.ok(!/« |«[^\u202f]| »|[^\u202f]»/.test(text), `${where}: « » without narrow spaces`);
    }
  }
  // The same {placeholders} in both languages of each word (French's elided names aside: {deA}, {deB}, {deName}).
  const holes = (t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1].replace(/^de([A-Z])/, (_, c) => c.toLowerCase())).filter((h, i, all) => all.indexOf(h) === i).sort().join();
  for (const [k, [en, fr]] of Object.entries(numPairWords)) assert.equal(holes(en), holes(fr), `word ${k}`);
});

test("every reading of the page, in both languages: a title, a lead, no placeholder left", () => {
  const refs = numerologyPairRefs(ctx);
  assert.deepEqual(refs, ["np:rel", "np:year", ...PAIR_IDS.map((id) => `np:pair:${id}`), "np:digit:6"]);
  for (const locale of ["en", "fr"]) {
    for (const ref of refs) {
      const r = numerologyPairReading(ctx, ref, locale);
      assert.ok(r, `${ref} ${locale}`);
      assert.equal(r.id, ref);
      assert.ok(r.title && r.lead && r.paragraphs.length >= 2, `${ref} ${locale}`);
      for (const p of [r.title, r.kicker, ...r.paragraphs, ...(r.facts ?? []).flatMap((f) => [f.label, f.value])]) {
        assert.ok(!/[{}]/.test(p), `${ref} ${locale}: “${p}”`);
        if (locale === "fr") assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(p), `${ref}: French spacing in “${p}”`);
      }
    }
  }
  assert.equal(numerologyPairReading(ctx, "np:pair:nope", "en"), null);
  assert.equal(numerologyPairReading(ctx, "np:digit:5", "en"), null, "no 5 in common");
  assert.equal(numerologyPairReading(ctx, "core:lifepath", "en"), null, "another page's ref");
  // The pair's reading says how the two work together, what each brings, where they may rub, the master's note and the bridge.
  const ex = numerologyPairReading(ctx, "np:pair:expression", "en");
  // (How the two work together is the lead, said once.)
  assert.deepEqual(ex.sections.map((s) => s.id), ["frame", "brings", "master", "rub", "bridge"]);
  assert.match(ex.lead, /^The 2 brings closeness and care, the 5 movement and curiosity\./);
  for (const ref of numerologyPairRefs(ctx)) {
    const r = numerologyPairReading(ctx, ref, "en");
    assert.ok(!r.sections.some((s) => s.paragraphs.includes(r.lead)), `${ref}: the lead said again in a section`);
  }
  assert.equal(ex.title, "Expression: 11/2 and 5");
  assert.match(ex.paragraphs.join(" "), /TraceQA’s 11 brings intuition and inspiration/);
  assert.match(ex.paragraphs.join(" "), /An 11 is a 2 heightened/);
  assert.match(ex.paragraphs.join(" "), /Between 2 and 5, a gap of 3\. A gap of 3 is bridged by expression/);
  const cross = numerologyPairReading(ctx, "np:pair:su-pe", "fr");
  assert.equal(cross.title, "Élan de l’âme de TraceQA · Personnalité de Sample B\u202f: 7 et 8");
  assert.match(cross.paragraphs[0], /^L’Élan de l’âme de TraceQA rencontre la Personnalité de Sample B\u202f: ce à quoi TraceQA aspire/);
});

test("without a full name at birth, the name's pairs wait and say why; the date's still read", () => {
  const bare = numerologyPair(cast("1990-06-15", null), B);
  const so = pairRow(bare, "soulurge");
  assert.equal(so.text, null);
  assert.equal(so.gap, null);
  assert.equal(pairRow(bare, "lifepath").text, "3-4");
  assert.equal(pairRow(bare, "birthday").text, "3-6");
  const r = numerologyPairReading({ pair: bare, names: { a: "Ana", b: "Sample B" } }, "np:pair:soulurge", "fr");
  assert.match(r.paragraphs.join(" "), /attend le nom complet de naissance d’Ana/);
  // Their shared digits come from the numbers there are.
  assert.deepEqual(bare.shared.map((s) => s.digit), [6]);
});

test("the shared digits, and the two of you this year", () => {
  assert.deepEqual(pair.shared, [{ digit: 6, a: ["birthday", "maturity"], b: ["soulurge"] }]);
  // 2026: a 4 year beside a 6 year, the relationship's year 4 + 6 = 10 → 1.
  assert.deepEqual([pair.year.year, pair.year.a.number, pair.year.b.number, pair.year.together.number], [2026, 4, 6, 1]);
  assert.equal(stepsText(pair.year.together), "4 + 6 = 10 → 1");
  // Each year on, both personal years step one; the relationship's year two.
  const next = numerologyPair(cast("1990-06-15", "TraceQA", 2027), cast("1987-11-03", "Sample B", 2027));
  assert.deepEqual([next.year.year, next.year.a.number, next.year.b.number, next.year.together.number], [2027, 5, 7, 3]);
  assert.equal(relationshipYear({ number: 9 }, { number: 9 }).number, 9);
  assert.equal(relationshipYear({ number: null }, { number: 3 }).number, null);
  // The first read's lines come from the texts.
  const lines = firstReadLines(ctx, "en");
  assert.match(lines.rel, /^A relationship number 7 gives the pair a reflective tone/);
  assert.equal(lines.pairs.lifepath, "The 3 imagines and the 4 builds: play meets method.");
  assert.match(lines.year, /^A 1 year for the two of you/);
});

test("the table as text and as CSV, the same ids in every language", () => {
  const parts = numerologyPairTextParts(ctx, "en", () => "line");
  assert.deepEqual(parts.map((p) => p.id), ["side", "pairs", "shared", "now"]);
  assert.match(parts[0].lines.join("\n"), /\nLife Path: 13\/4 · 3 · gap 1\n/);
  assert.match(parts[1].lines.join("\n"), /\nTraceQA’s Soul Urge · Sample B’s Personality: 7 · 8 — line\n/);
  assert.match(parts[2].lines.join("\n"), /Relationship number: 7 \(4 \+ 3 = 7\)/);
  const fr = numerologyPairTextParts(ctx, "fr").map((p) => p.lines.join("\n")).join("\n");
  assert.match(fr, /Chemin de vie\u202f: 13\/4 · 3 · écart 1/);
  assert.doesNotMatch(fr, /Life Path|gap|Soul Urge/);
  const csv = numerologyPairCsv(ctx).split("\n");
  assert.deepEqual(csv.slice(0, 5), ["pair,field,value", "pair,a,TraceQA", "pair,b,Sample B", "pair,relationship,7", "pair,relationshipSteps,4 + 3 = 7"]);
  assert.ok(csv.includes("core,lifepath,4,3,1"));
  assert.ok(csv.includes("dyn,expression,expression,11,expression,5,5-11,2-5,3"));
  assert.ok(csv.includes("digit,6,birthday|maturity,soulurge"));
  assert.ok(csv.includes("year,2026,4,6,1"));
});

test("the page's words: a book of its own, out of the first download, each said by the page's code", () => {
  const own = [
    "src/studio/modes/numerology-pair.tsx",
    "src/studio/tables/numerology-pair-table.tsx",
    "src/lib/chart/interpret-numerology-pair.ts",
    "src/lib/chart/numerology-pair-table.ts",
  ]
    .map((p) => readFileSync(`${ROOT}${p}`, "utf8"))
    .join("\n");
  const unsaid = Object.keys(numPairWords).filter((k) => !new RegExp(`["'\`]${k}["'\`]`).test(own));
  assert.deepEqual(unsaid, []);
  for (const k of Object.keys(numPairWords)) assert.ok(!(k in CATALOG), `${k} in both the catalog and the book`);
  for (const [k, [en, fr]] of Object.entries(numPairWords)) assert.ok(en.trim() && fr.trim(), k);
  // The page's name in the bars is the app's catalog's.
  assert.deepEqual(CATALOG.pageNumerologyPair, ["Numerology: two people", "Numérologie\u202f: deux personnes"]);
});
