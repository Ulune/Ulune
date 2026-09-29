/*
 * The numerology table's rows, text and CSV (part 61), with the plan's
 * made-up person, Camille Marie Laurent, born 15 June 1990; and every word of
 * the numerology page in both languages.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { castNumerology } from "../src/lib/chart/numerology.ts";
import {
  agesText,
  compareRows,
  cycleRows,
  detailRows,
  lettersText,
  numerologyTableCsv,
  numerologyTextParts,
  spanYearsText,
  tableYears,
  termText,
  wordRows,
  yearLettersText,
} from "../src/lib/chart/numerology-table.ts";

function cast(date, name, extra = {}) {
  return castNumerology({ meta: { date, name: "", placeLabel: "" } }, { name, calendarYear: 2026, calendarMonth: 9, calendarDay: 29, ...extra });
}
const camille = cast("1990-06-15", "Camille Marie Laurent");

test("Each name with its letters, its total, its vowels and its consonants", () => {
  const rows = wordRows(camille.names.birth);
  assert.deepEqual(
    rows.map((r) => [r.word.text, lettersText(r.word), termText(r.all), termText(r.vowels), termText(r.consonants)]),
    [
      ["Camille", "C3 A1 M4 I9 L3 L3 E5", "28 → 10 → 1", "15 → 6", "13 → 4"],
      ["Marie", "M4 A1 R9 I9 E5", "28 → 10 → 1", "15 → 6", "13 → 4"],
      ["Laurent", "L3 A1 U3 R9 E5 N5 T2", "28 → 10 → 1", "9", "19 → 10 → 1"],
    ],
  );
});

test("The name's finer numbers, each with how it comes", () => {
  const rows = Object.fromEntries(detailRows(camille.names.birth, "en").map((r) => [r.id, [r.value, r.how]]));
  assert.deepEqual(rows.lessons, ["6, 7, 8", "numbers no letter gives"]);
  assert.deepEqual(rows.passion, ["3", "5 letters, the most"]);
  assert.deepEqual(rows.subconscious, ["6", "9 − 3 karmic lessons"]);
  assert.deepEqual(rows.balance, ["1", "C 3 + M 4 + L 3 = 10 → 1"]);
  assert.deepEqual(rows["plane-physical"], ["5", "M E M E E · 23 → 5"]);
  assert.deepEqual(rows["plane-emotional"], ["11/2", "I R I R T · 38 → 11"]);
  assert.deepEqual(rows.cornerstone, ["C", "first letter of the first name"]);
  assert.deepEqual(rows.chaldean, ["5", "59 → 14 → 5"]);
  const fr = Object.fromEntries(detailRows(camille.names.birth, "fr").map((r) => [r.id, r.label]));
  assert.equal(fr.lessons, "Leçons karmiques");
  assert.equal(fr["plane-physical"], "Plan physique");
});

test("The long cycles with their ages and years", () => {
  const rows = cycleRows(camille).map((r) => [r.kind, r.index, r.value.number, agesText("en", r.span), spanYearsText("en", 1990, r.span), r.main]);
  assert.deepEqual(rows, [
    ["period", 1, 6, "0–33", "1990–2023", false],
    ["period", 2, 6, "33–60", "2023–2050", false],
    ["period", 3, 1, "60 on", "2050 on", false],
    ["pinnacle", 1, 3, "0–32", "1990–2022", false],
    ["pinnacle", 2, 7, "32–41", "2022–2031", false],
    ["pinnacle", 3, 1, "41–50", "2031–2040", false],
    ["pinnacle", 4, 7, "50 on", "2040 on", false],
    ["challenge", 1, 0, "0–32", "1990–2022", false],
    ["challenge", 2, 5, "32–41", "2022–2031", false],
    ["challenge", 3, 5, "41–50", "2031–2040", true],
    ["challenge", 4, 5, "50 on", "2040 on", false],
  ]);
  assert.equal(agesText("fr", camille.life.pinnacles[3]), "50 et après");
});

test("Nine years round the one shown, or the whole life to 90", () => {
  const nine = tableYears(camille, false);
  assert.deepEqual(
    nine.map((r) => r.year),
    [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030],
  );
  const now = nine.find((r) => r.year === 2026);
  assert.deepEqual([now.age, now.personalYear.number, now.cycles.pinnacle.value.number, yearLettersText(now)], [36, 4, 7, "I · R · R"]);
  assert.equal(tableYears(camille, true).length, 91);
  assert.equal(tableYears(camille, true)[0].year, 1990);
  // Before the birth: the personal year only.
  const early = cast("2024-06-15", "Camille Marie Laurent");
  assert.equal(tableYears(early, false)[0].cycles, null);
});

test("Two people side by side, with the gap between each number", () => {
  const other = cast("1987-11-03", "Sample B");
  const rows = compareRows(camille, other);
  const lp = rows.find((r) => r.id === "lifepath");
  assert.deepEqual([lp.a.number, lp.b.number, lp.gap.number], [4, 3, 1]);
  assert.equal(rows.length, 8);
});

test("The text, part by part, in both languages", () => {
  const parts = numerologyTextParts(camille, "en", { who: "Camille Marie Laurent" });
  assert.deepEqual(
    parts.map((p) => p.id),
    ["core", "name", "grid", "cycles", "years", "bridges"],
  );
  const core = parts[0].lines.join("\n");
  assert.match(core, /^The core numbers\nCamille Marie Laurent\nLife Path: 13\/4 \(6 \+ 6 \+ 1 = 13 → 4\), karmic debt 13\n/);
  assert.match(core, /\nBirthday: 6 \(15 → 6\)\n/);
  const name = parts[1].lines.join("\n");
  assert.match(name, /\nCamille: C3 A1 M4 I9 L3 L3 E5 · 28 → 10 → 1 · Vowels 15 → 6 · Consonants 13 → 4\n/);
  assert.match(name, /\nLetters: 1×3 2×1 3×5 4×2 5×4 6×0 7×0 8×0 9×4\n/);
  assert.match(parts[2].lines.join("\n"), /\n1-5-9: full: an arrow\n/);
  assert.match(parts[4].lines.join("\n"), /\n2026 · age 36 · Personal year 4 · Pinnacle 7 · Challenge 5 · Period 6 · Essence 9 · I · R · R\n/);
  const fr = numerologyTextParts(camille, "fr").map((p) => p.lines.join("\n")).join("\n");
  assert.match(fr, /Chemin de vie\u202f: 13\/4 \(6 \+ 6 \+ 1 = 13 → 4\), dette karmique 13/);
  assert.doesNotMatch(fr, /Pinnacle|Challenge|Vowels|karmic|Letters/);
  const bare = numerologyTextParts(cast("1990-06-15", null), "en");
  assert.match(bare[1].lines.join("\n"), /No birth name yet/);
});

test("The CSV holds every number as plain ids and values", () => {
  const csv = numerologyTableCsv(camille).split("\n");
  assert.deepEqual(csv.slice(0, 3), ["section,field,value", "numerology,birthDate,1990-06-15", "numerology,name,Camille Marie Laurent"]);
  assert.ok(csv.includes("core,lifepath,4,4,6 + 6 + 1 = 13 → 4,13,0"));
  assert.ok(csv.includes("core,attitude,3,3,6 + 6 = 12 → 3,,0"));
  assert.ok(csv.includes("letter,0,C,3,0,Camille,intuitive,"));
  assert.ok(csv.includes("detail,karmicLessons,6|7|8"));
  assert.ok(csv.includes("detail,chaldeanCompound,14"));
  assert.ok(csv.includes("line,phillips,1-5-9,full"));
  assert.ok(csv.includes("cycle,challenge,3,5,41,50,1"));
  assert.ok(csv.includes("year,2026,36,4,7,5,6,9,I,R,R"));
  assert.ok(csv.includes("bridge,soulUrgePersonality,3,9,6"));
  assert.equal(csv.filter((l) => /^year,\d/.test(l)).length, 9);
  // A Y switched by hand is marked as such.
  const y = numerologyTableCsv(cast("1984-11-29", "Yolanda Mary Kyle", { yRoles: ["v", "v", "v"] })).split("\n");
  assert.ok(y.includes("letter,0,Y,7,1,Yolanda,intuitive,hand"));
  assert.ok(y.includes("letter,10,Y,7,1,Mary,intuitive,rule"));
});

test("Every word of the numerology page and wheel is there in English and French", () => {
  const src = JSON.parse(readFileSync(new URL("../src/lib/i18n/numerology-ui.json", import.meta.url), "utf8"));
  for (const block of ["page", "wheel", "cores"]) {
    for (const [key, pair] of Object.entries(src[block])) {
      assert.ok(pair.en && pair.fr, `${block}.${key} in both languages`);
      assert.ok(!/\w'\w/.test(pair.en + pair.fr), `${block}.${key}: a straight apostrophe`);
      // French: a narrow no-break space before : ; ? !, never a plain one.
      assert.ok(!/ [:;?!]/.test(pair.fr), `${block}.${key}: French spacing in "${pair.fr}"`);
      // The same {placeholders} in both.
      const holes = (t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
      assert.equal(holes(pair.en), holes(pair.fr), `${block}.${key}: placeholders`);
    }
  }
});
