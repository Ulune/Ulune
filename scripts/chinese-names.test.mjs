/*
 * The names of the Chinese calendar's parts (src/lib/chinese/names.ts):
 * order, polarity and phase, the sixty pairs, the solar terms, Traditional
 * and Simplified characters, pinyin and French typography. (Characters and
 * pinyin were also checked once against pypinyin, OpenCC and CC-CEDICT;
 * README.md.)
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ANIMALS, BRANCHES, FAMILY_NAMES, PHASES, POLARITY_NAMES, SIXTY, SOLAR_TERMS, STEMS, hanzi } from "../src/lib/chinese/names.ts";
import { cycleOf } from "../src/lib/chinese/pillars.ts";
import { isJie, termLongitude } from "../src/lib/chinese/terms.ts";

const ALL = [...PHASES, ...Object.values(POLARITY_NAMES), ...STEMS, ...BRANCHES, ...ANIMALS, ...SIXTY, ...SOLAR_TERMS, ...Object.values(FAMILY_NAMES)];

test("ten stems and twelve branches in order, yang and yin alternating, each phase twice among the stems", () => {
  assert.equal(STEMS.map((s) => s.hant).join(""), "甲乙丙丁戊己庚辛壬癸");
  assert.equal(BRANCHES.map((b) => b.hant).join(""), "子丑寅卯辰巳午未申酉戌亥");
  STEMS.forEach((s, i) => {
    assert.equal(s.index, i);
    assert.equal(s.polarity, i % 2 ? "yin" : "yang");
    assert.equal(s.phase, PHASES[Math.floor(i / 2)].id);
  });
  BRANCHES.forEach((b, i) => {
    assert.equal(b.index, i);
    assert.equal(b.polarity, i % 2 ? "yin" : "yang");
    assert.equal(b.animal, i);
    assert.equal(b.en, ANIMALS[i].en);
  });
  assert.deepEqual(
    BRANCHES.map((b) => b.phase),
    ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"],
  );
  assert.equal(PHASES.map((p) => p.hant).join(""), "木火土金水");
});

test("the branches' double hours tile the day from 23:00, their solar months follow the jie, their lunar months from Yin", () => {
  BRANCHES.forEach((b, i) => {
    assert.deepEqual(b.hours, [(23 + 2 * i) % 24, (1 + 2 * i) % 24]);
    assert.equal(b.solarMonth, (i + 10) % 12, "Yin is the first solar month (0)");
    assert.equal(b.lunarMonth, ((i + 10) % 12) + 1, "Yin is month 1, Zi month 11");
  });
});

test("the sixty pairs: sixty different pairs, each stem with the branches of its polarity, Jia-Zi to Gui-Hai", () => {
  assert.equal(SIXTY.length, 60);
  assert.equal(new Set(SIXTY.map((p) => p.hant)).size, 60);
  assert.equal(new Set(SIXTY.map((p) => p.id)).size, 60);
  SIXTY.forEach((p, i) => {
    assert.equal(p.index, i);
    assert.equal(p.stem, i % 10);
    assert.equal(p.branch, i % 12);
    assert.equal(p.stem % 2, p.branch % 2, "same polarity");
    assert.equal(cycleOf(p.stem, p.branch), i);
    assert.equal(p.hant, STEMS[p.stem].hant + BRANCHES[p.branch].hant);
  });
  assert.equal(SIXTY[0].hant + SIXTY[59].hant, "甲子癸亥");
  assert.equal(SIXTY[6].en, "Yang Metal Horse", "Geng-Wu, the plan's example for 1990");
  assert.equal(SIXTY[6].fr, "Cheval de Métal yang");
  assert.equal(SIXTY[6].pinyin, "gēngwǔ");
  assert.equal(SIXTY[6].id, "geng-wu");
});

test("the 24 solar terms: from Lichun at 315°, every 15°, jie and zhongqi alternating, as the engine numbers them", () => {
  assert.equal(SOLAR_TERMS.length, 24);
  SOLAR_TERMS.forEach((t, i) => {
    assert.equal(t.index, i);
    assert.equal(t.longitude, termLongitude(i));
    assert.equal(t.kind, isJie(i) ? "jie" : "qi");
  });
  assert.deepEqual(
    SOLAR_TERMS.filter((t) => t.longitude % 90 === 0).map((t) => t.hant),
    ["春分", "夏至", "秋分", "冬至"],
  );
  assert.equal(new Set(SOLAR_TERMS.map((t) => t.en)).size, 24);
  assert.equal(new Set(SOLAR_TERMS.map((t) => t.fr)).size, 24);
});

test("Traditional and Simplified characters differ exactly where the scripts do", () => {
  const differ = ALL.filter((n) => n.hant !== n.hans).map((n) => `${n.hant}/${n.hans}`);
  assert.deepEqual(
    [...new Set(differ)].sort(),
    ["二十四節氣/二十四节气", "小滿/小满", "穀雨/谷雨", "處暑/处暑", "芒種/芒种", "農曆/农历", "陰/阴", "陽/阳", "雞/鸡", "馬/马", "驚蟄/惊蛰", "龍/龙", "豬/猪"].sort(),
  );
  for (const n of ALL) assert.equal([...n.hant].length, [...n.hans].length, n.hant);
  assert.equal(hanzi(ANIMALS[4]), "龍", "Traditional by default");
  assert.equal(hanzi(ANIMALS[4], "hans"), "龙");
});

test("pinyin: lower case, tone marks, a syllable per character", () => {
  const toned = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g;
  for (const n of ALL) {
    assert.match(n.pinyin, /^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü ]+$/, n.pinyin);
    // Every syllable of these names carries a tone, so the marks count the syllables.
    assert.equal(n.pinyin.match(toned).length, [...n.hant].length, `${n.hant} ${n.pinyin}`);
  }
  // The readings of the solar terms that dictionaries settle: zhòng, chǔ, jiàng; the branch Zi is zǐ.
  assert.equal(SOLAR_TERMS[8].pinyin, "mángzhòng");
  assert.equal(SOLAR_TERMS[13].pinyin, "chǔshǔ");
  assert.equal(SOLAR_TERMS[17].pinyin, "shuāngjiàng");
  assert.equal(SIXTY[0].pinyin, "jiǎzǐ");
});

test("English and French names: every entry has both, with typographic apostrophes", () => {
  for (const n of ALL) {
    assert.ok(n.en.trim() && n.fr.trim(), n.hant);
    for (const text of [n.en, n.fr]) {
      assert.ok(!text.includes("'"), `${text}: typographic apostrophe (’)`);
      assert.ok(!/ [:;!?»]|« /.test(text), `${text}: French spacing`);
    }
  }
  assert.equal(SOLAR_TERMS[6].fr, "Début de l’été");
  assert.equal(STEMS[0].fr, "Bois yang");
  // The pairs in French: the animal, then its stem, "de" elided before Eau.
  assert.equal(SIXTY[0].fr, "Rat de Bois yang");
  assert.equal(SIXTY[29].fr, "Serpent d’Eau yin");
});
