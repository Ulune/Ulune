/*
 * The numerology engine of part 59, checked three ways:
 *   1. Hans Decoz's own worked examples (World Numerology) and the plan's
 *      made-up person, Camille Marie Laurent, born 15 June 1990;
 *   2. invariants that hold for anyone (vowels and consonants rebuild the
 *      Expression, nine years give each personal year once, …);
 *   3. 2,000 random people against a second calculation written separately
 *      below, straight from the rules.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { castNumerology, numerologyYear, readName } from "../src/lib/chart/numerology.ts";
import { CHALDEAN_VALUE, PYTHAGOREAN_VALUE, parseName, yRoleByRule } from "../src/lib/chart/numerology-name.ts";
import {
  cycleChanges,
  letterAt,
  letterCycleSources,
  letterSpans,
  lifeCyclesOf,
  lifePathOf,
  nineYearStarts,
  personalDayNumber,
  personalYearNumber,
} from "../src/lib/chart/numerology-cycles.ts";
import { GRID_CELLS, GRID_LINES, birthGrid } from "../src/lib/chart/numerology-grid.ts";
import { chainText, reduceChain } from "../src/lib/chart/numerology-reduce.ts";

/** castNumerology reads only the chart's date (and its name, when none is given). */
function natal(date, name = "") {
  return { meta: { date, name, placeLabel: "" } };
}

function cast(date, name, at = [2026, 9, 29], extra = {}) {
  const [calendarYear, calendarMonth, calendarDay] = at;
  return castNumerology(natal(date), { name, calendarYear, calendarMonth, calendarDay, ...extra });
}

const values = (list) => list.map((c) => c.value.number);
const ages = (list) => list.map((c) => [c.fromAge, c.toAge]);

// ── 1. Decoz's worked examples ─────────────────────────────────────────────

test("Decoz: Thomas Cruise Mapother's Expression is 22 + 3 + 6 = 31 → 4, name by name", () => {
  const n = readName("Thomas Cruise Mapother");
  assert.deepEqual(
    n.expression.terms.map((t) => [t.key, t.raw, t.value]),
    [
      ["Thomas", 22, 22],
      ["Cruise", 30, 3],
      ["Mapother", 42, 6],
    ],
  );
  assert.deepEqual(n.expression.chain, [31, 4]);
  assert.equal(n.expression.number, 4);
  // All letters at once would pass through 94 → 13 → 4 and flag a debt that is not there.
  assert.equal(n.expression.debt, null);
});

test("Decoz: challenges for 3 July 1962 are 4, 6, 2 (the main one) and 2", () => {
  const c = cast("1962-07-03", "Thomas Cruise Mapother");
  assert.deepEqual(values(c.life.challenges), [4, 6, 2, 2]);
  assert.deepEqual(
    c.life.challenges.map((x) => x.value.gap),
    [
      [7, 3],
      [3, 9],
      [4, 6],
      [7, 9],
    ],
  );
  assert.deepEqual(
    c.life.challenges.map((x) => x.main),
    [false, false, true, false],
  );
});

test("Decoz: Thomas John Hancock's Soul Urge 7 + 6 + 7 = 20 → 2, Personality 6 + 5 + 3 = 14 → 5 (karmic debt 14)", () => {
  const n = readName("Thomas John Hancock");
  assert.deepEqual(
    n.soulUrge.terms.map((t) => t.value),
    [7, 6, 7],
  );
  assert.equal(n.soulUrge.number, 2);
  assert.deepEqual(
    n.personality.terms.map((t) => t.value),
    [6, 5, 3],
  );
  assert.deepEqual(n.personality.chain, [14, 5]);
  assert.equal(n.personality.number, 5);
  assert.equal(n.personality.debt, 14);
});

test("Decoz: Thomas John Hancock's Balance is T 2 + J 1 + H 8 = 11 → 2 (masters reduced)", () => {
  const n = readName("Thomas John Hancock");
  assert.deepEqual(n.detail.balance.chain, [11, 2]);
  assert.equal(n.detail.balance.number, 2);
});

test("Decoz: 15 May 1949 has the pinnacles 11, 11, 22 and 1", () => {
  const c = cast("1949-05-15", null);
  assert.deepEqual(values(c.life.pinnacles), [11, 11, 22, 1]);
});

test("Decoz: 15 October 1998 has the Life Path 16/7, a karmic debt", () => {
  const lp = lifePathOf({ year: 1998, month: 10, day: 15 });
  assert.deepEqual(
    lp.terms.map((t) => t.chain),
    [
      [10, 1],
      [15, 6],
      [1998, 27, 9],
    ],
  );
  assert.deepEqual(lp.chain, [16, 7]);
  assert.equal(lp.debt, 16);
  assert.equal(chainText(lp.chain), "16 → 7");
});

test("Decoz: 15 December 1965 has the period cycles 3, 6 and 3", () => {
  const c = cast("1965-12-15", null);
  assert.deepEqual(values(c.life.periods), [3, 6, 3]);
});

test("Decoz: Rational Thought for Thomas, born on the 3rd, is 22/4 + 3 = 7", () => {
  const c = cast("1962-07-03", "Thomas Cruise Mapother");
  assert.equal(c.rationalThought.number, 7);
  assert.deepEqual(c.rationalThought.terms[0].chain, [22, 4]);
});

test("Decoz: Thomas Cruise Mapother's letter cycles at 20 are A, I and H", () => {
  const c = cast("1962-07-03", "Thomas Cruise Mapother");
  const row = numerologyYear(c, 1962 + 20);
  const { physical, mental, spiritual } = row.cycles.letters;
  assert.deepEqual([physical.letter.ch, mental.letter.ch, spiritual.letter.ch], ["A", "I", "H"]);
  // The I (9) began five years before.
  assert.deepEqual([mental.fromAge, mental.toAge], [15, 24]);
  // T lasts two years: ages 0 and 1.
  assert.deepEqual([letterAt(c.letterSources.physical, 0).letter.ch, letterAt(c.letterSources.physical, 1).letter.ch], ["T", "T"]);
  assert.equal(letterAt(c.letterSources.physical, 2).letter.ch, "H");
});

// ── The plan's made-up person ───────────────────────────────────────────────

test("Camille Marie Laurent, 15 June 1990, on 29 September 2026: every number in the plan", () => {
  const c = cast("1990-06-15", "Camille Marie Laurent");
  assert.equal(c.age, 36);
  assert.deepEqual([c.lifePath.number, c.lifePath.chain, c.lifePath.debt], [4, [13, 4], 13]);
  assert.equal(c.birthday.number, 6);
  assert.deepEqual(c.attitude.chain, [12, 3]);
  assert.deepEqual(values(c.life.pinnacles), [3, 7, 1, 7]);
  assert.deepEqual(ages(c.life.pinnacles), [
    [0, 32],
    [32, 41],
    [41, 50],
    [50, null],
  ]);
  assert.deepEqual(values(c.life.challenges), [0, 5, 5, 5]);
  assert.deepEqual(values(c.life.periods), [6, 6, 1]);
  assert.deepEqual(ages(c.life.periods), [
    [0, 33],
    [33, 60],
    [60, null],
  ]);
  const birth = c.names.birth;
  assert.deepEqual(
    birth.expression.terms.map((t) => [t.raw, t.value]),
    [
      [28, 1],
      [28, 1],
      [28, 1],
    ],
  );
  assert.equal(c.expression.number, 3);
  assert.deepEqual(
    c.soulUrge.terms.map((t) => t.value),
    [6, 6, 9],
  );
  assert.equal(c.soulUrge.number, 3);
  assert.deepEqual(
    c.personality.terms.map((t) => t.value),
    [4, 4, 1],
  );
  assert.equal(c.personality.number, 9);
  // Camille's consonants pass through 13, but only the last total can be a debt.
  assert.equal(c.personality.debt, null);
  assert.deepEqual(c.debts, [{ id: "lifepath", debt: 13 }]);
  assert.deepEqual(birth.detail.karmicLessons, [6, 7, 8]);
  assert.deepEqual(birth.detail.hiddenPassion, [3]);
  assert.equal(birth.detail.counts[3], 5);
  assert.equal(c.subconsciousSelf.number, 6);
  assert.deepEqual(c.balance.chain, [10, 1]);
  assert.deepEqual(
    birth.detail.planes.map((p) => p.value.number),
    [5, 8, 11, 6],
  );
  assert.deepEqual([birth.detail.cornerstone, birth.detail.capstone, birth.detail.firstVowel], ["C", "E", "A"]);
  assert.deepEqual(birth.chaldean, { total: 59, compound: 14, single: 5 });
  assert.equal(c.maturity.number, 7);
  assert.equal(c.rationalThought.number, 7);
  assert.deepEqual([c.bridges.lifePathExpression.number, c.bridges.soulUrgePersonality.number], [1, 6]);
  assert.deepEqual([c.personalYear.number, c.personalMonth.number, c.personalDay.number, c.universalYear.number], [4, 4, 6, 1]);
  // Each part reduced first, as Decoz adds them: the personal month 4 and the 29th (29 → 11 → 2).
  assert.deepEqual(
    c.personalDay.terms.map((t) => t.chain),
    [[4], [29, 11, 2]],
  );
  assert.deepEqual(c.personalYear.terms.map((t) => t.value), [6, 6, 1]);
  assert.deepEqual(c.personalYear.chain, [13, 4]);
  // At 36: the second pinnacle (7), its challenge (5), the second period (6).
  assert.deepEqual([c.cycles.pinnacle.index, c.cycles.challenge.value.number, c.cycles.period.index], [2, 5, 2]);
  const { physical, mental, spiritual } = c.cycles.letters;
  assert.deepEqual(
    [physical, mental, spiritual].map((s) => [s.letter.ch, s.fromAge]),
    [
      ["I", 36],
      ["R", 33],
      ["R", 35],
    ],
  );
  assert.deepEqual(c.cycles.essence.chain, [27, 9]);
  assert.deepEqual(c.grid.digits, [1, 1, 5, 6, 9, 9]);
  const full = c.grid.lines.phillips.filter((l) => l.state === "full").map((l) => l.id);
  assert.deepEqual(full, ["1-5-9"]);
  assert.deepEqual(nineYearStarts(c, 1990, 2060), [1996, 2005, 2014, 2023, 2032, 2041, 2050, 2059]);
});

// ── The letter Y ────────────────────────────────────────────────────────────

test("Y is a vowel or a consonant by its place (Decoz)", () => {
  const cases = {
    Yvonne: "v",
    Barry: "v",
    Kyle: "v",
    Yolanda: "c",
    Mickey: "c",
    Eyarta: "c",
    Ryan: "v",
    Bryan: "v",
    Taylor: "c",
    Doyle: "c",
    Tanya: "c",
    Lynn: "v",
    Amy: "v",
    Y: "v",
  };
  for (const [name, role] of Object.entries(cases)) {
    const word = name.toUpperCase().split("");
    assert.equal(yRoleByRule(word, word.indexOf("Y")), role, name);
    const y = parseName(name).letters.find((l) => l.ch === "Y");
    assert.equal(y.vowel, role === "v", name);
    assert.equal(y.yRule, role, name);
  }
});

test("Each Y can be switched by hand: Yolanda's Soul Urge is 8, or 6 with Y as a vowel", () => {
  assert.equal(readName("Yolanda").soulUrge.number, 8);
  assert.equal(readName("Yolanda", ["v"]).soulUrge.number, 6);
  // The switches go in order through the whole name; a list of the wrong length is ignored.
  const two = parseName("Yolanda Barry", ["v", "c"]);
  assert.deepEqual(
    two.letters.filter((l) => l.ch === "Y").map((l) => [l.y, l.vowel, l.yRule]),
    [
      [0, true, "c"],
      [1, false, "v"],
    ],
  );
  assert.equal(parseName("Yolanda", ["v", "v"]).letters[0].vowel, false);
});

test("W is never a vowel", () => {
  const w = parseName("Andrew Wu").letters.filter((l) => l.ch === "W");
  assert.equal(w.length, 2);
  assert.ok(w.every((l) => !l.vowel));
});

// ── Names ───────────────────────────────────────────────────────────────────

test("A karmic debt in a one-word name keeps its own steps: José is 13 → 4", () => {
  const n = readName("José");
  assert.deepEqual(n.expression.chain, [13, 4]);
  assert.equal(n.expression.debt, 13);
});

test("Birthday debts: the 13th, 14th, 16th and 19th; the 29th is an 11", () => {
  const debts = [13, 14, 16, 19].map((d) => cast(`2000-01-${d}`, null).birthday);
  assert.deepEqual(
    debts.map((b) => [b.number, b.debt]),
    [
      [4, 13],
      [5, 14],
      [7, 16],
      [1, 19],
    ],
  );
  const b29 = cast("2000-01-29", null).birthday;
  assert.deepEqual([b29.number, b29.debt, b29.chain], [11, null, [29, 11]]);
  assert.deepEqual(cast("2000-01-19", null).debts, [{ id: "birthday", debt: 19 }]);
});

test("The name used now gives the minor numbers, only when it differs from the birth name", () => {
  const c = cast("1990-06-15", "Camille Marie Laurent", undefined, { currentName: "Camille Dupont" });
  assert.equal(c.currentName, "Camille Dupont");
  assert.equal(c.names.current.expression.number, readName("Camille Dupont").expression.number);
  // The core numbers stay the birth name's.
  assert.equal(c.expression.number, 3);
  const same = cast("1990-06-15", "Camille Marie Laurent", undefined, { currentName: "camille  MARIE laurent" });
  assert.equal(same.names.current, null);
  assert.equal(same.currentName, null);
  const accents = cast("1990-06-15", "Camille Marie Laurent", undefined, { currentName: "Camîlle Marie Laurent" });
  assert.equal(accents.names.current, null);
});

test("Without a name, the name numbers wait (never a made-up 0)", () => {
  const c = cast("1990-06-15", null);
  for (const key of ["expression", "soulUrge", "personality", "maturity", "rationalThought", "balance", "subconsciousSelf"]) {
    assert.equal(c[key].number, null, key);
  }
  assert.equal(c.names.birth, null);
  assert.equal(c.letterSources, null);
  assert.equal(c.cycles.letters, null);
  assert.equal(c.cycles.essence.number, null);
  assert.deepEqual([c.bridges.lifePathExpression.number, c.bridges.soulUrgePersonality.number], [null, null]);
  assert.equal(readName("  -- '' "), null);
});

test("Letter cycles: no middle name gives the last name twice; middle names are strung together", () => {
  const two = letterCycleSources(parseName("Ann Lee"));
  assert.equal(two.mental.map((l) => l.ch).join(""), "LEE");
  assert.equal(two.spiritual.map((l) => l.ch).join(""), "LEE");
  const four = letterCycleSources(parseName("Ann Marie Rose Lee"));
  assert.equal(four.mental.map((l) => l.ch).join(""), "MARIEROSE");
  const one = letterCycleSources(parseName("Cher"));
  assert.equal(one.physical.map((l) => l.ch).join(""), "CHER");
  assert.equal(one.spiritual.map((l) => l.ch).join(""), "CHER");
});

// ── Chaldean ────────────────────────────────────────────────────────────────

test("Chaldean values cover the alphabet with 1 to 8, never 9; a compound over 52 is reduced", () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  assert.ok(letters.every((c) => CHALDEAN_VALUE[c] >= 1 && CHALDEAN_VALUE[c] <= 8));
  assert.ok(letters.every((c) => PYTHAGOREAN_VALUE[c] >= 1 && PYTHAGOREAN_VALUE[c] <= 9));
  // A1 + L3 = 4: too short for a compound number.
  assert.deepEqual(readName("Al").chaldean, { total: 4, compound: null, single: 4 });
  // Z7 O7 E5 = 19 each. Cheiro's compounds run 10 to 52: 76 → 13; 133 → 7 leaves none.
  assert.deepEqual(readName("Zoe Zoe Zoe Zoe").chaldean, { total: 76, compound: 13, single: 4 });
  assert.deepEqual(readName("Zoe Zoe Zoe Zoe Zoe Zoe Zoe").chaldean, { total: 133, compound: null, single: 7 });
  assert.deepEqual(readName("Zoe Zoe").chaldean, { total: 38, compound: 38, single: 2 });
});

// ── The birth grid ──────────────────────────────────────────────────────────

test("The grid's lines are exactly each layout's rows, columns and diagonals", () => {
  for (const layout of ["phillips", "loshu"]) {
    const rows = GRID_CELLS[layout];
    const expected = [
      ...rows.map((r) => [...r]),
      ...[0, 1, 2].map((i) => rows.map((r) => r[i])),
      [rows[0][0], rows[1][1], rows[2][2]],
      [rows[0][2], rows[1][1], rows[2][0]],
    ].map((d) => [...d].sort().join(""));
    const got = GRID_LINES[layout].map((l) => [...l.digits].sort().join(""));
    assert.deepEqual(got.sort(), expected.sort(), layout);
    // Each line's name is its digits.
    for (const l of GRID_LINES[layout]) assert.equal(l.id, l.digits.join("-"), layout);
  }
  // The Lo Shu square is magic: every line adds up to 15.
  for (const l of GRID_LINES.loshu) assert.equal(l.digits[0] + l.digits[1] + l.digits[2], 15);
});

test("A 2000s date leaves empty lines: 2 February 2002 holds only 2s", () => {
  const g = birthGrid({ year: 2002, month: 2, day: 2 });
  assert.deepEqual(g.digits, [2, 2, 2, 2]);
  assert.equal(g.counts[2], 4);
  assert.deepEqual(g.missing, [1, 3, 4, 5, 6, 7, 8, 9]);
  const empty = g.lines.phillips.filter((l) => l.state === "empty").map((l) => l.id);
  assert.deepEqual(empty, ["3-6-9", "1-4-7", "4-5-6", "7-8-9", "1-5-9", "3-5-7"]);
});

// ── 2. Invariants ───────────────────────────────────────────────────────────

/** A small seeded random source, so a failure can be replayed. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CONSONANTS = "BCDFGHJKLMNPQRSTVWXZ";
function randomWord(rand) {
  const len = 2 + Math.floor(rand() * 8);
  let w = "";
  for (let i = 0; i < len; i += 1) {
    const r = rand();
    // Names: mostly consonant–vowel, with a Y now and then.
    if (r < 0.12) w += "Y";
    else if ((i % 2 === 0) === rand() < 0.75) w += CONSONANTS[Math.floor(rand() * CONSONANTS.length)];
    else w += "AEIOU"[Math.floor(rand() * 5)];
  }
  return w[0] + w.slice(1).toLowerCase();
}
function randomName(rand) {
  const words = 1 + Math.floor(rand() * 4);
  return Array.from({ length: words }, () => randomWord(rand)).join(" ");
}
function randomDate(rand) {
  const year = 1900 + Math.floor(rand() * 201);
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  return { year, month, day, iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
}

test("Vowels and consonants always rebuild the Expression, name by name and in total", () => {
  const rand = seeded(59);
  for (let i = 0; i < 500; i += 1) {
    const n = readName(randomName(rand));
    for (const w of n.parsed.words) {
      const sum = (pick) => w.letters.filter(pick).reduce((s, l) => s + l.value, 0);
      assert.equal(sum((l) => l.vowel) + sum((l) => !l.vowel), sum(() => true), w.text);
    }
    assert.equal(
      n.parsed.letters.length,
      n.parsed.words.reduce((s, w) => s + w.letters.length, 0),
    );
    const root = (x) => (x === 0 ? 0 : 1 + ((x - 1) % 9));
    const digit = root((n.soulUrge.digit ?? 0) + (n.personality.digit ?? 0));
    assert.equal(digit, n.expression.digit, n.text);
  }
});

test("Nine years in a row give each personal year once; the birth year's is the Life Path's digit", () => {
  const rand = seeded(9);
  for (let i = 0; i < 300; i += 1) {
    const d = randomDate(rand);
    const start = 1900 + Math.floor(rand() * 190);
    const seen = new Set(Array.from({ length: 9 }, (_, k) => personalYearNumber(d, start + k)));
    assert.equal(seen.size, 9);
    assert.equal(personalYearNumber(d, d.year), lifePathOf(d).digit);
  }
});

test("Each long cycle changes in the year it should: the first pinnacle ends in a personal year 9, the first period in a 1", () => {
  const rand = seeded(27);
  for (let i = 0; i < 300; i += 1) {
    const d = randomDate(rand);
    const life = lifeCyclesOf(d, lifePathOf(d).digit);
    assert.equal(personalYearNumber(d, d.year + life.pinnacles[0].toAge), 9);
    const end = life.periods[0].toAge;
    assert.ok(end >= 27 && end <= 35, String(end));
    assert.equal(personalYearNumber(d, d.year + end), 1);
    assert.equal(life.periods[1].toAge - life.periods[1].fromAge, 27);
    // Spans follow each other with no gap.
    for (const list of [life.pinnacles, life.challenges, life.periods]) {
      list.forEach((c, k) => assert.equal(c.fromAge, k === 0 ? 0 : list[k - 1].toAge));
    }
    const changes = cycleChanges(d, life);
    assert.equal(changes.length, 2 + 3 + 3);
    assert.ok(changes.every((ch, k) => k === 0 || changes[k - 1].age <= ch.age));
  }
});

test("A personal day for the Calendar is the one castNumerology gives", () => {
  const rand = seeded(365);
  for (let i = 0; i < 200; i += 1) {
    const d = randomDate(rand);
    const at = randomDate(rand);
    const c = cast(d.iso, null, [at.year, at.month, at.day]);
    assert.equal(personalDayNumber(d, at.year, at.month, at.day), c.personalDay.number);
  }
});

test("Letter spans run end to end, and the letter at an age is the span holding it", () => {
  const rand = seeded(20);
  for (let i = 0; i < 200; i += 1) {
    const src = letterCycleSources(parseName(randomName(rand)));
    for (const id of ["physical", "mental", "spiritual"]) {
      const spans = letterSpans(src[id], 90);
      spans.forEach((s, k) => {
        assert.equal(s.toAge - s.fromAge, s.letter.value);
        if (k) assert.equal(s.fromAge, spans[k - 1].toAge);
      });
      for (let age = 0; age < 90; age += 7) {
        const at = letterAt(src[id], age);
        const span = spans.find((s) => age >= s.fromAge && age < s.toAge);
        assert.deepEqual([at.letter, at.fromAge, at.toAge], [span.letter, span.fromAge, span.toAge]);
      }
    }
  }
});

test("Reductions keep their steps: the chain ends on the number, masters and the kept 11/22 stop it", () => {
  assert.deepEqual(reduceChain(1990), [1990, 19, 10, 1]);
  assert.deepEqual(reduceChain(29), [29, 11]);
  assert.deepEqual(reduceChain(29, []), [29, 11, 2]);
  assert.deepEqual(reduceChain(7), [7]);
  assert.equal(chainText([1990, 19, 10, 1]), "1990 → 19 → 10 → 1");
});

test("Working out a reading sends nothing anywhere", () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("numerology must not make a request");
  };
  try {
    const c = cast("1990-06-15", "Camille Marie Laurent", undefined, { currentName: "Camille Dupont" });
    assert.ok(c);
    numerologyYear(c, 2040);
  } finally {
    globalThis.fetch = original;
  }
});

// ── 3. A second calculation, written apart from the engine ─────────────────

const REF = (() => {
  const PV = (ch) => ((ch.charCodeAt(0) - 65) % 9) + 1;
  const CH = {};
  for (const [v, letters] of Object.entries({ 1: "AIJQY", 2: "BKR", 3: "CGLS", 4: "DMT", 5: "EHNX", 6: "UVW", 7: "OZ", 8: "FP" })) {
    for (const ch of letters) CH[ch] = Number(v);
  }
  const ds = (n) => [...String(n)].reduce((a, d) => a + Number(d), 0);
  const M = [11, 22, 33];
  const red = (n, keep = M) => {
    const chain = [n];
    while (n > 9 && !keep.includes(n)) {
      n = ds(n);
      chain.push(n);
    }
    return chain;
  };
  const last = (chain) => chain[chain.length - 1];
  const root = (n) => (n === 0 ? 0 : 1 + ((n - 1) % 9));
  const debt = (chain) => chain.slice(0, -1).find((x) => [13, 14, 16, 19].includes(x)) ?? null;
  const isV = (ch) => ch !== undefined && "AEIOU".includes(ch);
  function vowelFlags(word) {
    return [...word].map((ch, i) => {
      if (isV(ch)) return true;
      if (ch !== "Y") return false;
      const p = word[i - 1];
      const n = word[i + 1];
      if (p === undefined && n === undefined) return true;
      if (p === undefined) return !isV(n);
      if (n === undefined) return !isV(p);
      if (isV(p)) return false;
      if (!isV(n)) return true;
      return !/[AEIOU]/.test(word.slice(0, i));
    });
  }
  function nameNumber(words, pick) {
    const sums = words
      .map((w) => {
        const f = vowelFlags(w);
        const picked = [...w].filter((_, i) => pick(f[i]));
        return picked.length ? picked.reduce((a, ch) => a + PV(ch), 0) : null;
      })
      .filter((s) => s !== null);
    if (!sums.length) return { n: null, debt: null };
    const chain = sums.length === 1 ? red(sums[0]) : red(sums.reduce((a, s) => a + last(red(s)), 0));
    return { n: last(chain), debt: debt(chain) };
  }
  function at(word, age) {
    const round = [...word].reduce((a, ch) => a + PV(ch), 0);
    let t = Math.floor(age / round) * round;
    for (const ch of word) {
      if (age < t + PV(ch)) return { ch, from: t };
      t += PV(ch);
    }
    return null;
  }
  return function reference(name, y, m, d, cy, cm, cd) {
    const words = name
      .toUpperCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^A-Z]/g, ""))
      .filter(Boolean);
    const mR = last(red(m));
    const dR = last(red(d));
    const yR = last(red(y));
    const lpChain = red(mR + dR + yR);
    const lp = last(lpChain);
    const ex = nameNumber(words, () => true);
    const su = nameNumber(words, (v) => v);
    const pe = nameNumber(words, (v) => !v);
    const bdChain = red(d, [11, 22]);
    const p1 = last(red(mR + dR));
    const p2 = last(red(dR + yR));
    const pinnacles = [p1, p2, last(red(p1 + p2)), last(red(mR + yR))];
    const e1 = 36 - root(lp);
    const c1 = Math.abs(root(mR) - root(dR));
    const c2 = Math.abs(root(dR) - root(yR));
    const challenges = [c1, c2, Math.abs(c1 - c2), Math.abs(root(mR) - root(yR))];
    let a1 = 27;
    while (root(m + d + y + a1) !== 1) a1 += 1;
    const py = root(m + d + cy);
    const pm = root(py + cm);
    const pd = root(pm + cd);
    const letters = words.join("").split("");
    const counts = Array.from({ length: 10 }, (_, k) => letters.filter((ch) => PV(ch) === k).length);
    const lessons = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => !counts[k]);
    const most = Math.max(...counts.slice(1));
    const planes = ["DEMW", "AGHJLNP", "BIORSTXZ", "CFKQUVY"].map((set) => {
      const s = letters.filter((ch) => set.includes(ch)).reduce((a, ch) => a + PV(ch), 0);
      return s ? last(red(s)) : null;
    });
    let compound = letters.reduce((a, ch) => a + CH[ch], 0);
    const chTotal = compound;
    while (compound > 52) compound = ds(compound);
    const birthAge = cy - y - (cm < m || (cm === m && cd < d) ? 1 : 0);
    const first = words[0];
    const lastName = words[words.length - 1];
    const middle = words.length > 2 ? words.slice(1, -1).join("") : lastName;
    const tr = birthAge >= 0 ? [at(first, birthAge), at(middle, birthAge), at(lastName, birthAge)] : null;
    const grid = `${d}${m}${y}`.split("").map(Number).filter(Boolean);
    return {
      lp: [lp, debt(lpChain)],
      bd: [last(bdChain), debt(bdChain)],
      ex: [ex.n, ex.debt],
      su: [su.n, su.debt],
      pe: [pe.n, pe.debt],
      maturity: last(red(lp + ex.n)),
      attitude: last(red(mR + dR)),
      rational: root(first.split("").reduce((a, ch) => a + PV(ch), 0) + d),
      balance: root(words.reduce((a, w) => a + PV(w[0]), 0)),
      pinnacles,
      pinnacleEnds: [e1, e1 + 9, e1 + 18],
      challenges,
      periods: [mR, dR, yR],
      periodEnds: [a1, a1 + 27],
      cycle: [py, pm, pd, root(ds(cy))],
      lessons,
      passion: [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => counts[k] === most),
      subconscious: 9 - lessons.length,
      planes,
      corner: [first[0], first[first.length - 1], [...first].find((_, i) => vowelFlags(first)[i]) ?? null],
      chaldean: [chTotal, compound >= 10 ? compound : null, root(chTotal)],
      bridges: [Math.abs(root(lp) - root(ex.n)), su.n == null || pe.n == null ? null : Math.abs(root(su.n) - root(pe.n))],
      age: birthAge,
      transits: tr ? tr.map((t) => [t.ch, t.from]) : null,
      essence: tr ? last(red(tr.reduce((a, t) => a + PV(t.ch), 0))) : null,
      grid: grid.sort((a, b) => a - b),
    };
  };
})();

function fromEngine(c) {
  const n = c.names.birth;
  const cy = c.cycles;
  return {
    lp: [c.lifePath.number, c.lifePath.debt],
    bd: [c.birthday.number, c.birthday.debt],
    ex: [c.expression.number, c.expression.debt ?? null],
    su: [c.soulUrge.number, c.soulUrge.debt ?? null],
    pe: [c.personality.number, c.personality.debt ?? null],
    maturity: c.maturity.number,
    attitude: c.attitude.number,
    rational: c.rationalThought.number,
    balance: c.balance.number,
    pinnacles: values(c.life.pinnacles),
    pinnacleEnds: c.life.pinnacles.slice(0, 3).map((p) => p.toAge),
    challenges: values(c.life.challenges),
    periods: values(c.life.periods),
    periodEnds: c.life.periods.slice(0, 2).map((p) => p.toAge),
    cycle: [c.personalYear.number, c.personalMonth.number, c.personalDay.number, c.universalYear.number],
    lessons: n.detail.karmicLessons,
    passion: n.detail.hiddenPassion,
    subconscious: c.subconsciousSelf.number,
    planes: n.detail.planes.map((p) => p.value.number),
    corner: [n.detail.cornerstone, n.detail.capstone, n.detail.firstVowel],
    chaldean: [n.chaldean.total, n.chaldean.compound, n.chaldean.single],
    bridges: [c.bridges.lifePathExpression.number, c.bridges.soulUrgePersonality.number],
    age: c.age,
    transits: cy?.letters ? ["physical", "mental", "spiritual"].map((id) => [cy.letters[id].letter.ch, cy.letters[id].fromAge]) : null,
    essence: cy?.letters ? cy.essence.number : null,
    grid: c.grid.digits,
  };
}

test("2,000 random people: the engine and a second, separate calculation agree on every number", () => {
  const rand = seeded(2026);
  for (let i = 0; i < 2000; i += 1) {
    const d = randomDate(rand);
    const at = randomDate(rand);
    const name = randomName(rand);
    const c = cast(d.iso, name, [at.year, at.month, at.day]);
    const want = REF(name, d.year, d.month, d.day, at.year, at.month, at.day);
    assert.deepEqual(fromEngine(c), want, `${name}, ${d.iso}, on ${at.iso}`);
  }
});
