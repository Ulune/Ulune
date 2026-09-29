/*
 * The numerology texts and readings (part 63 of the launch plan): every
 * number of every set has its text in English and in French, none empty, the
 * French with the narrow space before : ; ! ?, a Life Path 7 and an
 * Expression 7 reading differently; and every reading the page can open
 * works for the plan's made-up people (Camille Marie Laurent, born 15 June
 * 1990; Yolanda Mary Kyle, born 29 November 1984) and without a name.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  NUMBER_TEXT,
  NUMEROLOGY_ABOUT,
  PERSONAL_DAY_TEXT,
  PERSONAL_MONTH_TEXT,
  PERSONAL_YEAR_TEXT,
  UNIVERSAL_YEAR_TEXT,
} from "../src/lib/content/numerology.ts";
import * as MORE from "../src/lib/content/numerology-more.ts";
import { PLACE_TEXT } from "../src/lib/content/numerology-places.ts";
import { FIRST_READ_STEPS, numerologyFirstStep, numerologyReading } from "../src/lib/chart/interpret-numerology.ts";
import { castNumerology } from "../src/lib/chart/numerology.ts";
import { PLANE_IDS } from "../src/lib/chart/numerology-name.ts";
import { GLOSSARY, glossaryFor } from "../src/lib/i18n/glossary.ts";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const MASTERS = [...DIGITS, 11, 22, 33];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** A French text breaks nowhere before : ; ! ? (a narrow no-break space goes there, or nothing). */
const frenchSpacing = (s) => !/[ \u00a0][:;!?]/.test(s);

function checkBi(bi, where) {
  assert.ok(bi && typeof bi.en === "string" && typeof bi.fr === "string", `${where}: missing`);
  assert.ok(bi.en.trim().length > 10, `${where}: English empty`);
  assert.ok(bi.fr.trim().length > 10, `${where}: French empty`);
  assert.notEqual(bi.en, bi.fr, `${where}: French is the English`);
  assert.ok(frenchSpacing(bi.fr), `${where}: French spacing in «${bi.fr.slice(0, 80)}»`);
  assert.ok(!/\s{2,}|\s[,.]/.test(bi.en) && !/\s{2,}|\s[,.]/.test(bi.fr), `${where}: stray space`);
}

test("Every number in every core place has its text, in both languages", () => {
  const counts = {};
  for (const place of ["lifepath", "expression", "soulurge", "personality", "maturity"]) {
    for (const n of MASTERS) checkBi(PLACE_TEXT[place][n], `${place} ${n}`);
    counts[place] = Object.keys(PLACE_TEXT[place]).length;
  }
  for (const n of [...DIGITS, 11, 22]) checkBi(PLACE_TEXT.birthday[n], `birthday ${n}`);
  assert.equal(PLACE_TEXT.birthday[33], undefined, "no Birthday 33: the day keeps 11 and 22 only");
  const total = Object.values(counts).reduce((s, n) => s + n, 0) + Object.keys(PLACE_TEXT.birthday).length;
  assert.equal(total, 71);
  // The same number reads differently in each place.
  const sevens = ["lifepath", "expression", "soulurge", "personality", "maturity", "birthday"].map((p) => PLACE_TEXT[p][7].en);
  assert.equal(new Set(sevens).size, 6);
  for (const [p, word] of [
    ["lifepath", "Life Path"],
    ["expression", "Expression"],
    ["soulurge", "Soul Urge"],
    ["personality", "Personality"],
    ["maturity", "Maturity"],
    ["birthday", "Birthday"],
  ]) {
    for (const [n, bi] of Object.entries(PLACE_TEXT[p])) assert.ok(bi.en.includes(`${word} ${n}`), `${p} ${n} names its place and number`);
  }
});

test("Every set of the finer numbers and the cycles is complete, in both languages", () => {
  const sets = {
    KARMIC_DEBT_TEXT: [13, 14, 16, 19],
    KARMIC_LESSON_TEXT: DIGITS,
    HIDDEN_PASSION_TEXT: DIGITS,
    BALANCE_TEXT: DIGITS,
    RATIONAL_TEXT: DIGITS,
    SUBCONSCIOUS_TEXT: DIGITS,
    ATTITUDE_TEXT: DIGITS,
    PLANE_TEXT: [...PLANE_IDS],
    STONE_TEXT: ["cornerstone", "capstone", "firstVowel"],
    LETTER_TEXT: LETTERS,
    BRIDGE_TEXT: [0, ...DIGITS.slice(0, 8)],
    PERIOD_TEXT: MASTERS,
    PERIOD_PLACE_TEXT: [1, 2, 3],
    PINNACLE_TEXT: MASTERS,
    CHALLENGE_TEXT: [0, ...DIGITS.slice(0, 8)],
    ESSENCE_TEXT: [...DIGITS, 11, 22],
    LETTER_CYCLE_TEXT: LETTERS,
    LETTER_CYCLE_ABOUT: ["physical", "mental", "spiritual"],
    CHALDEAN_TEXT: DIGITS,
    CYCLE_ABOUT: ["period", "pinnacle", "challenge"],
    Y_WHY: ["alone", "firstBeforeConsonant", "firstBeforeVowel", "lastAfterConsonant", "lastAfterVowel", "betweenConsonants", "afterVowel", "onlyVowel", "beforeVowel"],
  };
  let texts = 71;
  for (const [name, keys] of Object.entries(sets)) {
    const set = MORE[name];
    assert.ok(set, `${name} exported`);
    assert.deepEqual(Object.keys(set).map(String).sort(), keys.map(String).sort(), `${name}: exactly its keys`);
    for (const k of keys) checkBi(set[k], `${name} ${k}`);
    if (!/ABOUT|^Y_WHY$|STONE_TEXT/.test(name)) texts += keys.length;
  }
  for (const name of ["KARMIC_DEBT_ABOUT", "KARMIC_LESSON_ABOUT", "HIDDEN_PASSION_ABOUT", "BALANCE_ABOUT", "RATIONAL_ABOUT", "SUBCONSCIOUS_ABOUT", "ATTITUDE_ABOUT", "PLANES_ABOUT", "BRIDGE_ABOUT", "ESSENCE_ABOUT", "CHALDEAN_ABOUT", "Y_RULE"]) {
    checkBi(MORE[name], name);
  }
  // About 250 new readings in each language, as the plan counted them.
  assert.ok(texts >= 245 && texts <= 260, `${texts} texts`);
  // Cheiro's planets are named in the Chaldean texts, never anywhere else.
  const planets = ["the Sun", "the Moon", "Jupiter", "Uranus", "Mercury", "Venus", "Neptune", "Saturn", "Mars"];
  DIGITS.forEach((n, i) => assert.ok(MORE.CHALDEAN_TEXT[n].en.includes(planets[i]), `Chaldean ${n}: ${planets[i]}`));
});

test("The older numerology texts: complete, the masters gone from the personal cycles, the French spaced", () => {
  for (const n of MASTERS) for (const k of ["keywords", "what", "strengths", "pitfalls", "example"]) checkBi(NUMBER_TEXT[n][k], `number ${n} ${k}`);
  for (const [name, set] of Object.entries({ PERSONAL_YEAR_TEXT, PERSONAL_MONTH_TEXT, PERSONAL_DAY_TEXT, UNIVERSAL_YEAR_TEXT })) {
    assert.deepEqual(Object.keys(set).map(Number), DIGITS, `${name}: 1 to 9 only`);
    for (const n of DIGITS) checkBi(set[n], `${name} ${n}`);
  }
  for (const [k, bi] of Object.entries(NUMEROLOGY_ABOUT)) checkBi(bi, `about ${k}`);
  // The numerology words on screen too.
  const ui = JSON.parse(readFileSync(new URL("../src/lib/i18n/numerology-ui.json", import.meta.url), "utf8"));
  const walk = (o, path) => {
    if (o && typeof o === "object" && "fr" in o && typeof o.fr === "string") {
      assert.ok(frenchSpacing(o.fr), `${path}: «${o.fr}»`);
      return;
    }
    for (const [k, v] of Object.entries(o ?? {})) if (v && typeof v === "object") walk(v, `${path}.${k}`);
  };
  walk(ui, "numerology-ui");
});

test("The glossary's numerology words, in both languages", () => {
  const ids = ["maturity", "personalCycles", "karmicDebt", "karmicLesson", "hiddenPassion", "finerNumbers", "planes", "stones", "bridge", "pinnacle", "challenge", "periodCycle", "letterCycle", "chaldean", "birthGrid"];
  for (const id of ids) {
    const e = GLOSSARY[id];
    assert.ok(e, id);
    assert.ok(e.term[0] && e.term[1] && e.body[0].length > 20 && e.body[1].length > 20, id);
    assert.ok(frenchSpacing(e.body[1]), `${id}: «${e.body[1]}»`);
  }
  assert.deepEqual(glossaryFor("numerology", "cycle:pinnacle:2").slice(0, 3), ["pinnacle", "challenge", "periodCycle"]);
  assert.ok(glossaryFor("numerology", "detail:lessons").includes("karmicLesson"));
  assert.ok(glossaryFor("numerology", "plane:mental").includes("planes"));
  assert.ok(glossaryFor("numerology", null).includes("lifePath"));
});

function cast(date, name) {
  return castNumerology({ meta: { date, name: "", placeLabel: "" } }, { name, calendarYear: 2026, calendarMonth: 9, calendarDay: 29 });
}

const PEOPLE = {
  camille: cast("1990-06-15", "Camille Marie Laurent"),
  yolanda: cast("1984-11-29", "Yolanda Mary Kyle"),
  noName: cast("1990-06-15", ""),
};

function readingIds(chart) {
  const ids = [
    ...["lifepath", "expression", "soulurge", "personality", "birthday", "maturity", "personalYear"].map((c) => `core:${c}`),
    ...MASTERS.map((n) => `number:${n}`),
    "time:month",
    "time:day",
    ...["attitude", "rationalThought", "balance", "subconscious", "lessons", "passion", "cornerstone", "capstone", "firstVowel", "chaldean"].map((d) => `detail:${d}`),
    ...PLANE_IDS.map((id) => `plane:${id}`),
    "bridge:lifePathExpression",
    "bridge:soulUrgePersonality",
    ...chart.life.pinnacles.map((c) => `cycle:pinnacle:${c.index}`),
    ...chart.life.challenges.map((c) => `cycle:challenge:${c.index}`),
    ...chart.life.periods.map((c) => `cycle:period:${c.index}`),
    ...[chart.year - 1, chart.year, 2026, chart.year + 75].map((y) => `year:${y}`),
  ];
  for (const l of chart.names.birth?.parsed.letters ?? []) ids.push(`letter:${l.index}`);
  return ids;
}

test("Every reading the page opens works, with its own words spaced in French", () => {
  for (const [who, chart] of Object.entries(PEOPLE)) {
    for (const locale of ["en", "fr"]) {
      for (const id of readingIds(chart)) {
        const r = numerologyReading(chart, id, locale);
        const nameless = !chart.names.birth && (/^(detail:(balance|subconscious|lessons|passion|cornerstone|capstone|firstVowel|chaldean|rationalThought)|plane:|letter:)/.test(id) || /^core:(expression|soulurge|personality|maturity)$/.test(id) || /^bridge:/.test(id));
        if (nameless) {
          assert.equal(r, null, `${who} ${id}: nothing without a name`);
          continue;
        }
        assert.ok(r, `${who} ${locale} ${id}`);
        assert.equal(r.id, id);
        const text = JSON.stringify(r);
        assert.ok(!/undefined|NaN|\{[a-zA-Z]+\}/.test(text), `${who} ${locale} ${id}: ${text.slice(0, 200)}`);
        assert.ok(r.title && r.lead, `${who} ${locale} ${id}: title and lead`);
        if (locale === "fr") {
          for (const s of [r.title, r.kicker, r.lead, ...r.paragraphs, ...(r.facts ?? []).flatMap((f) => [f.label, f.value])]) {
            assert.ok(frenchSpacing(s), `${who} ${id}: «${s}»`);
          }
        }
        // Links and facts lead to readings that exist.
        for (const ref of [...(r.facts ?? []).map((f) => f.ref), ...(r.links?.rows ?? []).map((x) => x.ref)].filter(Boolean)) {
          assert.ok(numerologyReading(chart, ref, locale), `${who} ${id} → ${ref}`);
        }
      }
    }
  }
  // Unknown ids read nothing.
  for (const id of ["core:nothing", "number:0", "number:44", "cycle:pinnacle:5", "cycle:other:1", "plane:none", "bridge:none", "detail:none", "year:abc"]) {
    assert.equal(numerologyReading(PEOPLE.camille, id, "en"), null, id);
  }
});

test("The readings say what the plan said: Camille's Life Path, lessons, cornerstone and third pinnacle", () => {
  const c = PEOPLE.camille;
  const lp = numerologyReading(c, "core:lifepath", "en");
  assert.equal(lp.title, "Life Path 13/4");
  assert.equal(lp.lead, PLACE_TEXT.lifepath[4].en);
  assert.deepEqual(lp.sections.map((s) => s.id), ["debt", "number"]);
  assert.equal(lp.sections[0].title, "Karmic debt 13");
  assert.deepEqual(lp.facts.map((f) => f.value), ["13/4", "6 + 6 + 1 = 13 → 4"]);
  const lessons = numerologyReading(c, "detail:lessons", "en");
  assert.equal(lessons.title, "Karmic lessons 6, 7, 8");
  assert.equal(numerologyReading(c, "detail:cornerstone", "fr").title, "Pierre angulaire · C");
  const p3 = numerologyReading(c, "cycle:pinnacle:3", "en");
  assert.equal(p3.title, "Pinnacle 3 · 1");
  assert.deepEqual(p3.facts.map((f) => f.value), ["1", "3 + 7 = 10 → 1", "41–50", "2031–2040"]);
  assert.equal(p3.links.rows[0].ref, "cycle:challenge:3");
  const ch3 = numerologyReading(c, "cycle:challenge:3", "en");
  assert.ok(ch3.paragraphs.some((x) => /main challenge/.test(x)));
  const period2 = numerologyReading(c, "cycle:period:2", "fr");
  assert.equal(period2.title, "Cycle de vie 2 · 6");
  assert.ok(period2.sections.some((s) => s.id === "place"));
  const y2026 = numerologyReading(c, "year:2026", "en");
  assert.equal(y2026.title, "2026 · Personal year 4");
  assert.deepEqual(y2026.links.rows.map((x) => x.ref), ["cycle:pinnacle:2", "cycle:challenge:2", "cycle:period:2"]);
  assert.ok(y2026.sections.some((s) => s.id === "letters" && s.paragraphs.length === 3));
  // A number that is a karmic lesson says so; the hidden passion too.
  assert.ok(numerologyReading(c, "number:6", "en").sections.some((s) => s.id === "lesson"));
  assert.ok(numerologyReading(c, "number:3", "en").sections.some((s) => s.id === "passion"));
  assert.ok(!numerologyReading(c, "number:4", "en").sections.some((s) => s.id === "lesson" || s.id === "passion"));
  // The first read: four core numbers and this year, each with its number and its place's words.
  assert.deepEqual(FIRST_READ_STEPS, ["lifepath", "expression", "soulurge", "personality", "personalYear"]);
  assert.deepEqual(
    FIRST_READ_STEPS.map((s) => numerologyFirstStep(c, s, "en").value),
    ["13/4", "3", "3", "9", "4"],
  );
  assert.equal(numerologyFirstStep(c, "expression", "fr").text, PLACE_TEXT.expression[3].fr);
  assert.equal(numerologyFirstStep(PEOPLE.noName, "expression", "en"), null);
});
