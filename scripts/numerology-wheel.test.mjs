/*
 * The numerology wheel's geometry, what lights when a part is pointed at,
 * and the lines that name each part (part 60), with the plan's made-up
 * person, Camille Marie Laurent, born 15 June 1990.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { castNumerology, readName } from "../src/lib/chart/numerology.ts";
import { numerologyFocus } from "../src/lib/chart/numerology-focus.ts";
import { parseName } from "../src/lib/chart/numerology-name.ts";
import { stepsText, wholeText } from "../src/lib/chart/numerology-reduce.ts";
import { WHEEL, placeDiscs, placeLetters, sectorAngle } from "../src/lib/chart/numerology-wheel.ts";
import { numerologySay } from "../src/lib/i18n/numerology-say.ts";

function cast(date, name, extra = {}) {
  return castNumerology({ meta: { date, name: "", placeLabel: "" } }, { name, calendarYear: 2026, calendarMonth: 9, calendarDay: 29, ...extra });
}
const camille = cast("1990-06-15", "Camille Marie Laurent");

const angleOf = (p) => (Math.atan2(p.y, p.x) * 180) / Math.PI;
const gap = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

test("1 sits at the top and the numbers run clockwise, 40° apart", () => {
  assert.equal(sectorAngle(1), -90);
  assert.equal(sectorAngle(4), 30);
  assert.equal(sectorAngle(9), 230);
});

test("Every letter sits on its own number, vowels inside, consonants outside, none on another", () => {
  const names = ["Camille Marie Laurent", "Yolanda Mary Kyle", "Maximilian Alexander Konstantinopoulos Wolfeschlegelsteinhausen", "Al"];
  for (const name of names) {
    const marks = placeLetters(parseName(name).letters);
    assert.equal(marks.length, parseName(name).letters.length, name);
    for (const m of marks) {
      const r = Math.hypot(m.x, m.y);
      assert.ok(Math.abs(r - (m.letter.vowel ? WHEEL.rVowel : WHEEL.rConsonant)) < 0.05, `${name} ${m.letter.ch} radius ${r}`);
      assert.ok(gap(angleOf(m), sectorAngle(m.letter.value)) <= 16.01, `${name} ${m.letter.ch} leaves its sector`);
    }
    // Two letters on one track never overlap: closer letters are drawn smaller.
    for (let i = 0; i < marks.length; i++) {
      for (let j = i + 1; j < marks.length; j++) {
        const a = marks[i];
        const b = marks[j];
        if (a.letter.vowel !== b.letter.vowel || a.letter.value !== b.letter.value) continue;
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= Math.min(a.size, b.size) * 0.69, `${name}: ${a.letter.ch} and ${b.letter.ch} overlap`);
      }
    }
  }
});

test("The discs never touch each other, the centre or the letters, however the six numbers fall", () => {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const cases = [Array(6).fill(9), [3, 3, 3, 3, 3, 4], [1, 1, 2, 2, 3, 3]];
  for (let i = 0; i < 400; i++) cases.push(Array.from({ length: 6 }, () => digits[Math.floor(rand() * 9)]));
  for (const c of cases) {
    const discs = placeDiscs(c.map((digit, i) => ({ digit, item: i })));
    assert.equal(discs.length, 6);
    for (const d of discs) {
      const r = Math.hypot(d.x, d.y);
      assert.ok(r - WHEEL.disc >= WHEEL.rCentre + 4, `${c}: a disc on the centre`);
      // With its ring (a master, a debt) it stays inside the vowels' track.
      assert.ok(r + WHEEL.disc + 3.5 <= WHEEL.rVowel - WHEEL.letter * 0.5, `${c}: a disc on the letters`);
    }
    for (let i = 0; i < discs.length; i++) {
      for (let j = i + 1; j < discs.length; j++) {
        const dist = Math.hypot(discs[i].x - discs[j].x, discs[i].y - discs[j].y);
        assert.ok(dist >= 2 * WHEEL.disc, `${c}: discs ${i} and ${j} touch (${dist.toFixed(1)})`);
      }
    }
  }
});

test("Pointing lights what makes a number", () => {
  const letters = camille.names.birth.parsed.letters;
  const lit = (id) => [...numerologyFocus(id, camille).lit].sort();
  const vowels = letters.filter((l) => l.vowel).map((l) => `letter:${l.index}`);
  assert.deepEqual(lit("core:soulurge"), ["core:soulurge", ...vowels].sort());
  assert.equal(lit("core:expression").filter((x) => x.startsWith("letter:")).length, 19);
  // 3: C L L L U, the Expression and the Soul Urge.
  const three = lit("number:3");
  assert.deepEqual(
    three.filter((x) => x.startsWith("letter:")).map((x) => letters[Number(x.slice(7))].ch).sort(),
    ["C", "L", "L", "L", "U"],
  );
  assert.ok(three.includes("core:expression") && three.includes("core:soulurge") && !three.includes("core:lifepath"));
  // The Life Path: the numbers it is added from (6, 6, 1); the Maturity: the two it adds.
  assert.deepEqual(lit("core:lifepath"), ["core:lifepath", "number:1", "number:6"]);
  assert.deepEqual(lit("core:maturity"), ["core:expression", "core:lifepath", "core:maturity"]);
  // A letter: its number and the two core numbers it feeds.
  assert.deepEqual(lit("letter:0"), ["core:expression", "core:personality", "letter:0", "number:3"]);
  // The year: 6 + 6 + 1 for 2026; the day's tick: its own number.
  assert.deepEqual(lit("core:personalYear"), ["core:personalYear", "number:1", "number:6"]);
  assert.deepEqual(lit("time:day"), ["number:6", "time:day"]);
  assert.equal(numerologyFocus("number:12", camille), null);
  assert.equal(numerologyFocus("letter:99", camille), null);
});

test("Steps and whole numbers are written from the calculation", () => {
  assert.equal(stepsText(camille.lifePath), "6 + 6 + 1 = 13 → 4");
  assert.equal(wholeText(camille.lifePath), "13/4");
  assert.equal(stepsText(camille.birthday), "15 → 6");
  assert.equal(stepsText(camille.life.challenges[1].value), "|6 − 1| = 5");
  assert.equal(stepsText(camille.expression), "1 + 1 + 1 = 3");
  assert.equal(wholeText(readName("Yolanda Mary Kyle").soulUrge), "19/1");
  assert.equal(wholeText(cast("1984-11-29", null).birthday), "11/2");
  assert.equal(stepsText(cast("1990-06-15", null).expression), "");
});

test("Each part of the wheel has its line, in English and French", () => {
  const say = (id, locale = "en") => numerologySay(camille, id, locale);
  assert.equal(say("number:3"), "3: 5 letters, C L L L U, the most, the hidden passion; Expression 3, Soul Urge 3");
  assert.equal(say("number:6"), "6: no letter, a karmic lesson; Birthday 6");
  assert.equal(say("number:4"), "4: 2 letters, M M; Life Path 13/4, Personal year 4 in 2026");
  assert.equal(say("number:2"), "2: 1 letter, T");
  assert.equal(say("core:lifepath"), "Life Path 13/4: 6 + 6 + 1 = 13 → 4, karmic debt 13");
  assert.equal(say("letter:0"), "C = 3, a consonant of Camille, the cornerstone");
  assert.equal(say("letter:1"), "A = 1, a vowel of Camille, the first vowel");
  assert.equal(say("core:personalYear"), "Personal year 4 in 2026: 6 + 6 + 1 = 13 → 4");
  assert.equal(say("time:month"), "Personal month 4, September");
  assert.equal(say("time:day"), "Personal day 6, 29 September");
  assert.equal(say("number:3", "fr"), "3\u202f: 5 lettres, C L L L U, le plus, la passion cachée\u202f; Expression 3, Élan de l’âme 3");
  assert.equal(say("core:lifepath", "fr"), "Chemin de vie 13/4\u202f: 6 + 6 + 1 = 13 → 4, dette karmique 13");
  assert.equal(say("time:day", "fr"), "Jour personnel 6, 29 septembre");
  // Without a name, a number says only which core numbers fall on it.
  const bare = cast("1990-06-15", null);
  assert.equal(numerologySay(bare, "number:4", "en"), "4: Life Path 13/4, Personal year 4 in 2026");
  assert.equal(numerologySay(bare, "number:3", "en"), "3");
});

test("A Y switched by hand says so", () => {
  const y = cast("1984-11-29", "Yolanda Mary Kyle", { yRoles: ["v", "v", "v"] });
  assert.equal(numerologySay(y, "letter:0", "en"), "Y = 7, a vowel of Yolanda, the cornerstone, the first vowel (switched by hand)");
});
