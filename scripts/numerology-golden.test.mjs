import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import {
  castNumerology,
  digitalRoot,
  foldLetter,
  givenBirthName,
  lettersOf,
  lifePathFromParts,
  nameNumbers,
  personalYearFromParts,
  personalMonthFromParts,
  personalDayFromParts,
  universalYearFromYear,
  PYTHAGOREAN_VALUE,
  reduceBirthday,
  reduceKeepMasters,
  sumLetters,
} from "../src/lib/chart/numerology.ts";
import { parseName } from "../src/lib/chart/numerology-name.ts";
import { NUMEROLOGY_HELLO, numerologyHelloCells } from "../src/lib/i18n/numerology-hello.ts";
import { numerologyNoNatal, numerologyPageText, numerologySystemLabel } from "../src/lib/i18n/numerology-ui.ts";

const PARIS = {
  name: "",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

test("Pythagorean map is A=1…I=9, J=1…R=9, S=1…Z=8", () => {
  assert.equal(PYTHAGOREAN_VALUE.A, 1);
  assert.equal(PYTHAGOREAN_VALUE.I, 9);
  assert.equal(PYTHAGOREAN_VALUE.J, 1);
  assert.equal(PYTHAGOREAN_VALUE.R, 9);
  assert.equal(PYTHAGOREAN_VALUE.S, 1);
  assert.equal(PYTHAGOREAN_VALUE.Z, 8);
  assert.equal(PYTHAGOREAN_VALUE.Y, 7);
});

test("JOHN SMITH — Expression 8, Soul Urge 6, Personality 11", () => {
  // J1 O6 H8 N5 + S1 M4 I9 T2 H8 = 44 → 8 Expression
  // vowels O6 + I9 = 15 → 6 Soul Urge
  // consonants J1 H8 N5 S1 M4 T2 H8 = 29 → 11 Personality
  const n = nameNumbers("JOHN SMITH");
  assert.equal(n.expression.number, 8);
  assert.equal(n.expression.digit, 8);
  assert.equal(n.soulUrge.number, 6);
  assert.equal(n.personality.number, 11);
  assert.equal(n.personality.digit, 2);
});

test("Y between consonants is a vowel; accents fold; punctuation is ignored", () => {
  const lynn = nameNumbers("LYNN");
  // L3 Y7 N5 N5 = 20 → 2; vowels Y7 (between consonants); consonants L3 N5 N5 = 13 → 4
  assert.equal(lynn.expression.number, 2);
  assert.equal(lynn.soulUrge.number, 7);
  assert.equal(lynn.personality.number, 4);

  const jose = nameNumbers("José");
  const josePlain = nameNumbers("JOSE");
  for (const key of ["expression", "soulUrge", "personality"]) {
    assert.deepEqual([jose[key].number, jose[key].chain], [josePlain[key].number, josePlain[key].chain], key);
  }
  assert.ok(lettersOf("Mary-Jane O'Brien").join("") === "MARYJANEOBRIEN");
});

test("Life Path: reduce month, day, year separately, keep masters", () => {
  // 15 Jun 1990: month 6, day 15→6, year 1990→1, 6+6+1=13→4
  assert.equal(reduceKeepMasters(6), 6);
  assert.equal(reduceKeepMasters(15), 6);
  assert.equal(reduceKeepMasters(1990), 1);
  assert.equal(lifePathFromParts(6, 15, 1990), 4);
  assert.equal(reduceBirthday(15), 6);
  assert.equal(reduceBirthday(11), 11);
  assert.equal(reduceBirthday(22), 22);
  assert.equal(digitalRoot(11), 2);
  assert.equal(digitalRoot(22), 4);
  assert.equal(digitalRoot(33), 6);
});

test("Personal year: natal month+day + calendar year 2026 → 4 for the Paris fixture", () => {
  // Year 2026→1; 6+6+1=13→4
  assert.equal(reduceKeepMasters(2026), 1);
  assert.equal(personalYearFromParts(6, 15, 2026), 4);
});

test("Ligatures expand instead of vanishing: œ, ß, æ, ø, ł, þ", () => {
  // NFD strips combining marks, so `é` folds to E on its own. These letters
  // carry no mark to strip: without an explicit fold they fall outside A–Z and
  // get dropped, silently changing every number in the name.
  assert.equal(foldLetter("é"), "E");
  assert.equal(foldLetter("œ"), "OE");
  assert.equal(foldLetter("Œ"), "OE");
  assert.equal(foldLetter("ß"), "SS");
  assert.equal(foldLetter("ẞ"), "SS");
  assert.equal(foldLetter("æ"), "AE");
  assert.equal(foldLetter("ø"), "O");
  assert.equal(foldLetter("ł"), "L");
  assert.equal(foldLetter("þ"), "TH");
  assert.equal(foldLetter("-"), "");
  assert.equal(foldLetter("好"), "");

  assert.equal(lettersOf("Lœuillet").join(""), "LOEUILLET");
  assert.equal(lettersOf("Weiß").join(""), "WEISS");
  assert.equal(lettersOf("Wałęsa").join(""), "WALESA");
  assert.equal(lettersOf("Søren").join(""), "SOREN");
  assert.equal(lettersOf("Þóra").join(""), "THORA");

  // L3 O6 E5 U3 I9 L3 L3 E5 T2 = 39 → 3; vowels O E U I E = 28 → 1;
  // consonants L L L T = 11, a master.
  const l = nameNumbers("Lœuillet");
  assert.equal(l.expression.number, 3);
  assert.equal(l.soulUrge.number, 1);
  assert.equal(l.personality.number, 11);
  assert.equal(l.personality.digit, 2);
});

test("Y as a vowel before a consonant, after one and between two; no letter is dropped or double-counted", () => {
  // Y initial, medial, final. The partition invariant is the real assertion:
  // vowels + consonants must rebuild each name's letters exactly, so a letter
  // can never be counted in both halves or in neither.
  for (const name of ["YVONNE", "LYNN", "AMY", "Lœuillet", "Mary-Jane O'Brien", "José"]) {
    const parsed = parseName(name);
    const letters = parsed.letters.map((l) => l.ch);
    assert.deepEqual(letters, lettersOf(name), name);
    const vowels = parsed.letters.filter((l) => l.vowel).map((l) => l.ch);
    const consonants = parsed.letters.filter((l) => !l.vowel).map((l) => l.ch);
    assert.equal(vowels.length + consonants.length, letters.length, name);
    assert.equal(sumLetters(vowels) + sumLetters(consonants), sumLetters(letters), name);
    const n = nameNumbers(name);
    // One name: its letters reduce as a whole.
    if (parsed.words.length === 1) assert.equal(reduceKeepMasters(sumLetters(letters)), n.expression.number, name);
  }

  // Y7 V4 O6 N5 N5 E5 = 32 → 5; vowels Y O E = 18 → 9; consonants V N N = 14 → 5
  const yvonne = nameNumbers("YVONNE");
  assert.equal(yvonne.expression.number, 5);
  assert.equal(yvonne.soulUrge.number, 9);
  assert.equal(yvonne.personality.number, 5);

  // A1 M4 Y7 = 12 → 3; vowels A Y = 8; consonant M = 4
  const amy = nameNumbers("AMY");
  assert.equal(amy.expression.number, 3);
  assert.equal(amy.soulUrge.number, 8);
  assert.equal(amy.personality.number, 4);
});

test("Masters 11, 22 and 33 survive every core, and the digit is still 1–9", () => {
  // 01/01/1980 → 1 + 1 + (1980→9) = 11
  assert.equal(lifePathFromParts(1, 1, 1980), 11);
  // 02/11/1980 → 11 + 2 + 9 = 22
  assert.equal(lifePathFromParts(11, 2, 1980), 22);
  // 11/11/1802 → 11 + 11 + (1802→11) = 33
  assert.equal(reduceKeepMasters(1802), 11);
  assert.equal(lifePathFromParts(11, 11, 1802), 33);
  assert.equal(reduceKeepMasters(33), 33);
  assert.equal(digitalRoot(33), 6);
  // Timing cycles reduce fully to 1–9 (Sol 2026-09-18): no masters on PY/PM/PD.
  // 11 + 2 + 2025 = 2038 → 13 → 4
  assert.equal(personalYearFromParts(11, 2, 2025), 4);
});

test("Natal fixture 02 Nov 1980 Paris — master Life Path 22 all the way through castNumerology", async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1980-11-02", time: "14:30" });
  assert.equal(natal.meta.date, "1980-11-02");
  const frozen = new Date("2026-08-28T12:00:00");
  const numbers = castNumerology(natal, { now: frozen, name: "JOHN SMITH" });
  assert.ok(numbers);
  assert.equal(numbers.lifePath.number, 22);
  assert.equal(numbers.lifePath.digit, 4);
  assert.equal(numbers.birthday.number, 2);
  // 2026→1; 11 + 2 + 1 = 14 → 5
  assert.equal(numbers.personalYear.number, 5);
  assert.equal(numbers.expression.number, 8);
  // Maturity reduces the master pair rather than keeping 30: 22 + 8 = 30 → 3
  assert.equal(numbers.maturity.number, 3);
});

test("Natal fixture 15 Jun 1990 14:30 Paris Placidus — Life Path 4, Birthday 6, Personal year 4, no invented name", async () => {
  const natal = await calculateNatal({
    ...PARIS,
    date: "1990-06-15",
    time: "14:30",
  });
  assert.equal(natal.meta.date, "1990-06-15");
  assert.equal(natal.meta.houseSystem, "placidus");
  const frozen = new Date("2026-08-28T12:00:00");
  const numbers = castNumerology(natal, { now: frozen, name: givenBirthName("", natal) });
  assert.ok(numbers);
  assert.equal(numbers.lifePath.number, 4);
  assert.equal(numbers.lifePath.digit, 4);
  assert.equal(numbers.birthday.number, 6);
  assert.equal(numbers.personalYear.number, 4);
  assert.equal(numbers.personalYear.digit, 4);
  assert.equal(numbers.calendarYear, 2026);
  assert.equal(numbers.name, null);
  assert.equal(numbers.expression.number, null);
  assert.equal(numbers.soulUrge.number, null);
  assert.equal(numbers.personality.number, null);
  assert.equal(numbers.maturity.number, null);
});

test("Display-name fallbacks are not treated as a birth name", async () => {
  const natal = await calculateNatal({
    ...PARIS,
    name: "Natal chart",
    date: "1990-06-15",
    time: "14:30",
  });
  assert.equal(givenBirthName("Natal chart", natal), null);
  assert.equal(givenBirthName("Paris · 1990-06-15", natal), null);
  assert.equal(givenBirthName("Untitled", natal), null);
  assert.equal(givenBirthName("JOHN SMITH", natal), "JOHN SMITH");
  const withName = castNumerology(natal, { now: new Date("2026-08-28T12:00:00"), name: "JOHN SMITH" });
  assert.ok(withName);
  assert.equal(withName.expression.number, 8);
  assert.equal(withName.soulUrge.number, 6);
  assert.equal(withName.personality.number, 11);
  assert.equal(withName.maturity.number, reduceKeepMasters(4 + 8));
  assert.equal(withName.maturity.number, 3);
});

test("Committed copy: Pythagorean, no-natal, Hello sentences, the table's words", () => {
  assert.equal(numerologySystemLabel("en"), "Pythagorean");
  assert.equal(numerologyNoNatal("en"), "Cast a birth chart first.");
  assert.equal(NUMEROLOGY_HELLO.id, "numerology.hello");
  const cells = numerologyHelloCells("en");
  assert.equal(cells.map((c) => c.id).join(","), "lifepath,expression,soulurge");
  assert.equal(cells[0].sentence, "From your full birth date: the main theme and lessons of your life.");
  assert.equal(cells[1].sentence, "From your full birth name: your natural abilities and how you use them.");
  assert.equal(cells[2].sentence, "From the vowels of your name: what you want deep down.");
  assert.equal(numerologyPageText("en", "cycle_pinnacle", { n: 2 }), "Pinnacle 2");
  assert.equal(numerologyPageText("fr", "cycle_pinnacle", { n: 2 }), "Réalisation 2");
  assert.equal(numerologyPageText("fr", "line_full"), "pleine\u202f: une flèche");
});


test("Personal month/day and universal year reduce to 1–9 only", () => {
  const py = personalYearFromParts(11, 2, 2025); // 4
  assert.equal(py, 4);
  assert.equal(personalMonthFromParts(py, 9), 4); // 4+9=13→4
  assert.equal(personalDayFromParts(4, 18), 4); // 4+18=22→4
  assert.equal(universalYearFromYear(2025), 9); // 2+0+2+5=9
});
