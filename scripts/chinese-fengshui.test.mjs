/**
 * Feng Shui's personal half (languages plan, part 21): the Kua number from
 * the solar year and the yin or yang count, the rule for 5, the eight
 * mansions' classical table (its symmetry and each Kua's group), two
 * made-up births, the texts in both languages, the readings, the practical
 * lines and the table's text and CSV; and (part 27, the review's fixes) the
 * trigrams drawn from their lines (FS7) and Wu Gui's gentler gloss (FS9).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { DIRECTIONS, DIRECTION_IDS, EIGHT_MANSIONS, MANSIONS, MANSION_IDS, TRIGRAMS, digitRoot, fengShuiOf, kuaOf, trigramOfKua } from "../src/lib/chinese/fengshui.ts";
import { GROUP_TEXTS, MANSION_TEXTS, TRIGRAM_TEXTS } from "../src/lib/chinese/fengshui-texts.ts";
import { dirIn, fengShuiReading, fengShuiRefs, fsDirRef, fsKuaRef, fsPracticeRef, practiceLines } from "../src/lib/chinese/fengshui-reading.ts";
import { fengShuiTableCsv, fengShuiTextParts } from "../src/lib/chinese/fengshui-table.ts";
import { TRIGRAM_SYMBOLS, trigramBars, trigramOfSymbol, trigramSvgInner } from "../src/lib/chinese/fengshui-trigram.ts";
import { chinese } from "../src/lib/i18n/catalog/chinese.ts";

const full = { script: "hant", show: "full" };
// Made-up births (never a real person's).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };

test("the Kua: the year's digits, 11 minus them for the yang count, 4 plus them for the yin, and 5 taking 2 or 8", () => {
  assert.equal(digitRoot(1990), 1);
  assert.equal(digitRoot(1989), 9);
  assert.deepEqual(kuaOf(1990, "yang"), { kua: 1, root: 1, raw: 10, five: false });
  assert.deepEqual(kuaOf(1990, "yin"), { kua: 8, root: 1, raw: 5, five: true });
  assert.deepEqual(kuaOf(1987, "yang"), { kua: 4, root: 7, raw: 4, five: false });
  assert.deepEqual(kuaOf(1987, "yin"), { kua: 2, root: 7, raw: 11, five: false });
  // The published tables' known years.
  for (const [year, yang, yin] of [
    [1950, 2, 1],
    [1985, 6, 9],
    [2000, 9, 6],
    [2003, 6, 9],
    [2024, 3, 3],
    [1995, 2, 1],
  ]) {
    assert.equal(kuaOf(year, "yang").kua, yang, `${year} yang`);
    assert.equal(kuaOf(year, "yin").kua, yin, `${year} yin`);
  }
  // A yang Kua of 5 (1995: 11 − 6) becomes 2; a yin Kua of 5 (1990: 4 + 1) becomes 8.
  assert.equal(kuaOf(1995, "yang").five, true);
  // Every year gives a Kua with a trigram, never 5.
  for (let y = 1900; y <= 2100; y++) for (const c of ["yang", "yin"]) assert.notEqual(kuaOf(y, c).kua, 5);
});

test("the eight trigrams in the Later Heaven order, and their groups", () => {
  assert.deepEqual(TRIGRAMS.map((t) => [t.kua, t.id, t.direction]), [
    [1, "kan", "n"],
    [2, "kun", "sw"],
    [3, "zhen", "e"],
    [4, "xun", "se"],
    [6, "qian", "nw"],
    [7, "dui", "w"],
    [8, "gen", "ne"],
    [9, "li", "s"],
  ]);
  assert.deepEqual(TRIGRAMS.filter((t) => t.group === "east").map((t) => t.kua), [1, 3, 4, 9]);
  assert.deepEqual(DIRECTIONS.map((d) => d.degrees), [0, 45, 90, 135, 180, 225, 270, 315]);
});

test("the trigrams drawn (part 27, the review's FS7): each one's lines are its symbol's; three bars, a broken line's two, inside the box", () => {
  for (const t of TRIGRAMS) {
    // Unicode's trigrams run from ☰ (U+2630): bit 0 breaks the top line, bit 1 the middle one, bit 2 the bottom one.
    const bits = t.symbol.codePointAt(0) - 0x2630;
    assert.deepEqual(t.lines, [!(bits & 4), !(bits & 2), !(bits & 1)], `${t.id}: its lines, from the bottom up`);
    assert.equal(trigramOfSymbol(t.symbol), t);
    assert.match(t.symbol, TRIGRAM_SYMBOLS);
    const box = { x: 10, y: 20, w: 20, h: 16 };
    const bars = trigramBars(t.lines, box);
    assert.equal(bars.length, 3 + t.lines.filter((l) => !l).length, `${t.id}: a bar per whole line, two per broken one`);
    for (const b of bars) {
      assert.ok(b.x >= box.x - 1e-9 && b.x + b.w <= box.x + box.w + 1e-9 && b.y >= box.y - 1e-9 && b.y + b.h <= box.y + box.h + 1e-9, `${t.id}: inside its box`);
      assert.ok(b.w > 0 && b.h > 0);
    }
    // Drawn from the top: the bars along the box's top edge are the third line's.
    assert.equal(bars.filter((b) => Math.abs(b.y - box.y) < 1e-9).length, t.lines[2] ? 1 : 2, `${t.id}: its top line`);
    assert.equal(bars.filter((b) => Math.abs(b.y + b.h - (box.y + box.h)) < 1e-9).length, t.lines[0] ? 1 : 2, `${t.id}: its bottom line`);
    // As a reading's mark: the same bars in a 24 × 24 box.
    const inner = trigramSvgInner(t.lines);
    assert.equal(inner.match(/<rect /g).length, bars.length);
    assert.doesNotMatch(inner, /NaN|undefined/);
    for (const v of inner.matchAll(/(?:x|y|width|height)="([\d.]+)"/g)) assert.ok(Number(v[1]) >= 0 && Number(v[1]) <= 24, `${t.id}: within the mark's box`);
  }
  assert.deepEqual(TRIGRAMS.find((t) => t.id === "kan").lines, [false, true, false], "Kan: its middle line alone whole");
  assert.equal(trigramOfSymbol("☯"), undefined);
  assert.doesNotMatch("Kan", TRIGRAM_SYMBOLS);
  // The Kua's reading draws its trigram as its mark when the characters are not shown; with them, the characters.
  const kan = fengShuiOf(CAMILLE, "yang");
  const names = fengShuiReading([kan], fsKuaRef("yang"), "en", { script: "hant", show: "names" });
  assert.equal(names.markSvg, trigramSvgInner(kan.trigram.lines));
  assert.equal(names.mark, "☵", "the symbol stays as the text one");
  const withChars = fengShuiReading([kan], fsKuaRef("yang"), "en", full);
  assert.equal(withChars.markSvg, undefined);
  assert.equal(withChars.mark, "坎");
});

test("the Eight Mansions' table: eight directions each, Fu Wei on the Kua's own trigram, the group's four supportive, the same bond both ways", () => {
  for (const [k, list] of Object.entries(EIGHT_MANSIONS)) {
    const kua = Number(k);
    assert.deepEqual([...list].sort(), [...DIRECTION_IDS].sort(), `Kua ${kua}: every direction once`);
    const t = trigramOfKua(kua);
    assert.equal(list[MANSION_IDS.indexOf("fu-wei")], t.direction, `Kua ${kua}: Fu Wei is its own place`);
    const groupDirs = TRIGRAMS.filter((x) => x.group === t.group).map((x) => x.direction).sort();
    assert.deepEqual(list.slice(0, 4).sort(), groupDirs, `Kua ${kua}: the supportive four are its group's`);
    // The bond between two trigrams is the same both ways: if Kua a finds b's place in mansion m, b finds a's in m too.
    for (const other of TRIGRAMS) {
      const m = list.indexOf(other.direction);
      assert.equal(EIGHT_MANSIONS[other.kua][m], t.direction, `Kua ${kua} and ${other.kua}`);
    }
  }
  assert.deepEqual(MANSION_IDS.map((m) => MANSIONS[m].supportive), [true, true, true, true, false, false, false, false]);
});

test("Camille and Sample B: their Kua by each count, and their directions", () => {
  const a = fengShuiOf(CAMILLE, "yang");
  assert.equal(a.solarYear, 1990);
  assert.equal(a.kua, 1);
  assert.equal(a.trigram.id, "kan");
  assert.equal(a.group, "east");
  assert.deepEqual(a.of, { "sheng-qi": "se", "tian-yi": "e", "yan-nian": "s", "fu-wei": "n", "huo-hai": "w", "wu-gui": "ne", "liu-sha": "nw", "jue-ming": "sw" });
  assert.deepEqual(a.directions.map((d) => d.direction), DIRECTION_IDS);
  assert.equal(a.uncertain, false);
  const ay = fengShuiOf(CAMILLE, "yin");
  assert.equal(ay.kua, 8);
  assert.equal(ay.group, "west");
  assert.equal(ay.steps.five, true);
  const b = fengShuiOf(SAMPLE_B, "yang");
  assert.equal(b.kua, 4);
  assert.equal(fengShuiOf(SAMPLE_B, "yin").kua, 2);
  // Before Lichun, the year before: 20 January 1990 counts as 1989.
  const jan = fengShuiOf({ ...CAMILLE, utc: "1990-01-20T11:00:00Z", date: "1990-01-20" }, "yang");
  assert.equal(jan.solarYear, 1989);
  assert.equal(jan.kua, 2);
  // On Lichun's day without a time, the page says so.
  const lichun = fengShuiOf({ utc: "1990-02-04T11:00:00Z", date: "1990-02-04", time: "", longitude: 2.35, timeUnknown: true }, "yang");
  assert.equal(lichun.uncertain, true);
  assert.equal(fengShuiOf({ ...CAMILLE, utc: "nope" }, "yang"), null);
});

test("every text in both languages, in Ulune's typography and tone", () => {
  const all = [...Object.values(TRIGRAM_TEXTS), ...Object.values(GROUP_TEXTS), ...Object.values(MANSION_TEXTS), ...Object.entries(chinese).filter(([k]) => k.startsWith("fs")).map(([, v]) => v)];
  assert.equal(Object.keys(TRIGRAM_TEXTS).length, 8);
  assert.equal(Object.keys(MANSION_TEXTS).length, 8);
  for (const [en, fr] of all) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/);
      assert.doesNotMatch(t, / {2}/);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, fr.slice(0, 40));
    assert.doesNotMatch(en, /\b(death|dies?|illness|disease|sick\w*|health\w*|doomed|unlucky|lucky|curse[ds]?|must|fate|disaster|divorce|accident|cure\w*)\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|santé|malchance|maudit|condamn\w*|doit|devez|destin|désastre|divorce|accident)\b/i, fr.slice(0, 40));
    // Wu Gui's gloss gives its meaning, not "the five ghosts" (part 27, the review's FS9).
    assert.doesNotMatch(en, /\bghosts?\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /fantômes?/i, fr.slice(0, 40));
  }
  assert.match(MANSION_TEXTS["wu-gui"][0], /^Wu Gui, the five distractions, /);
  assert.match(MANSION_TEXTS["wu-gui"][1], /^Wu Gui, les cinq distractions, /);
  assert.equal(MANSIONS["wu-gui"].hant, "五鬼", "the classical name stays");
});

test("a direction in a sentence, in English and French", () => {
  assert.equal(dirIn("ne", "en", "to"), "north-east");
  assert.equal(dirIn("ne", "en", "the"), "the north-east");
  assert.equal(dirIn("ne", "fr", "to"), "au nord-est");
  assert.equal(dirIn("e", "fr", "to"), "à l’est");
  assert.equal(dirIn("w", "fr", "the"), "l’ouest");
  assert.equal(dirIn("s", "fr", "the"), "le sud");
});

test("the readings: the Kua and its working, each direction, the practice; both counts named when both are shown", () => {
  const one = [fengShuiOf(CAMILLE, "yang")];
  const kua = fengShuiReading(one, fsKuaRef("yang"), "en", full);
  assert.equal(kua.title, "Kua 1");
  assert.match(kua.lead, /^Your Kua number is 1: the trigram Kan · kǎn 坎 ☵\.$/);
  assert.ok(kua.paragraphs.includes("For the yang count, 11 − 1 = 10."));
  assert.ok(kua.paragraphs.includes("10 reduces to 1."));
  assert.equal(kua.links.rows.length, 8);
  assert.equal(kua.links.rows[0].ref, fsDirRef("yang", "se"));
  assert.doesNotMatch(kua.kicker, /count/);
  const se = fengShuiReading(one, fsDirRef("yang", "se"), "en", full);
  assert.equal(se.title, "Growth");
  assert.equal(se.lead, "The south-east is your Growth direction, one of your four supportive ones.");
  assert.equal(se.sections[0].paragraphs[0], MANSION_TEXTS["sheng-qi"][0]);
  const n = fengShuiReading(one, fsDirRef("yang", "n"), "fr", full);
  assert.equal(n.lead, "Le nord est votre direction de Stabilité, l’une de vos quatre directions favorables.");
  assert.equal(n.sections[1].paragraphs.length, 2, "Fu Wei stands on the Kua's own trigram");
  const e = fengShuiReading(one, fsDirRef("yang", "w"), "fr", full);
  assert.equal(e.lead, "L’ouest est votre direction de Friction, l’une de vos quatre directions difficiles.");
  const s = fengShuiReading(one, fsDirRef("yang", "s"), "fr", full);
  assert.match(s.lead, /direction d’Harmonie/);
  const practice = fengShuiReading(one, fsPracticeRef("yang"), "en", full);
  assert.equal(practice.sections.length, 5);
  assert.match(practice.sections[0].paragraphs[0], /^At a desk, face south-east, your Growth direction/);
  assert.match(practiceLines(one[0], "fr")[1].text, /vers l’est, votre direction de Ressourcement, ou vers le sud/);
  for (const ref of fengShuiRefs("yang")) assert.ok(fengShuiReading(one, ref, "fr", full), ref);
  assert.equal(fengShuiReading(one, fsKuaRef("yin"), "en", full), null, "a count not shown");
  assert.equal(fengShuiReading(one, "bz:stem:day", "en", full), null);
  assert.equal(fengShuiReading(one, null, "en", full), null);
  const both = [fengShuiOf(CAMILLE, "yang"), fengShuiOf(CAMILLE, "yin")];
  const yin = fengShuiReading(both, fsKuaRef("yin"), "en", full);
  assert.match(yin.kicker, /Yin count/);
  assert.ok(yin.paragraphs.some((p) => /^5 has no trigram/.test(p)));
});

test("the table: the Kua by count, the eight directions, the practice; CSV with ids", () => {
  const both = [fengShuiOf(CAMILLE, "yang"), fengShuiOf(CAMILLE, "yin")];
  const parts = fengShuiTextParts(both, "Camille", "en", full);
  assert.deepEqual(parts.map((p) => p.id), ["kua", "dirs", "practice"]);
  assert.equal(parts[0].lines[0], "Camille · Kua number");
  assert.match(parts[0].lines[1], /^Yang count: Your Kua number is 1/);
  assert.equal(parts[1].lines.length, 9);
  assert.match(parts[1].lines[1], /^North · běi 北 · ☵ Kan: Yang count Stability · fúwèi 伏位 \(supportive\) · Yin count Restlessness · wǔguǐ 五鬼 \(challenging\)/);
  assert.equal(parts[2].lines.length, 9);
  const csv = fengShuiTableCsv(both).split("\n");
  assert.equal(csv[0], "section,count,field,value");
  assert.ok(csv.includes("kua,yang,kua,1"));
  assert.ok(csv.includes("kua,yin,kua,8"));
  assert.ok(csv.includes("kua,yin,five,1"));
  assert.ok(csv.includes("dir,yang,se,sheng-qi:1:supportive"));
  assert.ok(csv.includes("dir,yin,n,wu-gui:6:challenging"));
  assert.equal(csv.filter((l) => l.startsWith("dir,y")).length, 16);
  const fr = fengShuiTextParts(both, "Camille", "fr", full);
  assert.match(fr[0].lines[1], /^Compte yang\u202f: Votre nombre Kua est le 1/);
});
