/**
 * BaZi's analysis (languages plan, part 15): the five phases counted by the
 * stated method, the three tests and the strength, the structure (Prosperity,
 * Sword Edge, a revealed stem, the main qi), the "follow" flags, the
 * favourable phases by balance and by climate; two made-up births and
 * made-up boards; the readings in both languages; the texts' tone; the
 * table's text and CSV.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { BRANCHES, HIDDEN_STEMS, STEMS } from "../src/lib/chinese/names.ts";
import { baziChart, tenGodOf } from "../src/lib/chinese/bazi.ts";
import { baziBalance, climateNeed, phaseOfFamily, seasonOf, structureOf } from "../src/lib/chinese/bazi-balance.ts";
import { STRENGTH_TEXTS, STRUCTURE_TEXTS } from "../src/lib/chinese/bazi-balance-texts.ts";
import { baziReading } from "../src/lib/chinese/bazi-reading.ts";
import { baziTableCsv, baziTextParts } from "../src/lib/chinese/bazi-table.ts";

const S = Object.fromEntries(STEMS.map((s) => [s.id, s.index]));
const B = Object.fromEntries(BRANCHES.map((b) => [b.id, b.index]));
const full = { script: "hant", show: "full" };

/** A made-up board: [stem, branch] for the year, month, day and hour, with its hidden stems and gods. */
function board(...cols) {
  const ids = ["year", "month", "day", "hour"];
  const dm = S[cols[2][0]];
  const pillars = cols.map(([stem, branch], i) => ({
    id: ids[i],
    stem: S[stem],
    branch: B[branch],
    pillar: { cycle: 0 },
    god: i === 2 ? null : tenGodOf(dm, S[stem]).id,
    hidden: HIDDEN_STEMS[B[branch]].map((h) => ({ stem: h.stem, weight: h.weight, god: tenGodOf(dm, h.stem).id })),
    uncertain: false,
  }));
  return { pillars, dayMaster: dm };
}
const pts = (b) => Object.fromEntries(b.phases.map((p) => [p.phase, p.points]));

test("the families' phases, the seasons and the climate", () => {
  assert.equal(phaseOfFamily("metal", "resource"), "earth");
  assert.equal(phaseOfFamily("metal", "power"), "fire");
  assert.equal(phaseOfFamily("wood", "output"), "fire");
  assert.deepEqual([B.yin, B.wu, B.you, B.zi].map(seasonOf), ["spring", "summer", "autumn", "winter"]);
  assert.deepEqual([B.chou, B.wei, B.mao, B.xu].map(climateNeed), ["fire", "water", null, null]);
});

// Made-up births (never a real person's).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };

test("Camille: Fire and Water lead, a weak Xin, the Seven Killings structure, Earth most needed, Water by climate", () => {
  const b = baziBalance(baziChart(CAMILLE));
  assert.deepEqual(pts(b), { wood: 0.3, fire: 2.7, earth: 1.2, metal: 2.1, water: 2.7 });
  assert.equal(b.total, 9);
  assert.equal(b.support.toFixed(3), "0.367");
  assert.deepEqual([b.tests.season.met, b.tests.root.met, b.tests.support.met], [false, true, false]);
  assert.equal(b.tests.season.family, "power");
  assert.deepEqual(b.tests.root.roots, [{ place: "hour", stem: S.geng, index: 2, weight: 10 }]);
  assert.deepEqual([b.score, b.strength], [1, "weak"]);
  assert.deepEqual(b.structure, { id: "seven-killings", via: "main", stem: S.ding });
  assert.equal(b.special, null);
  assert.deepEqual(b.favourable, { good: ["earth", "metal"], bad: ["wood", "water", "fire"], season: "summer", climate: "water" });
  // Without a time: seven points.
  assert.equal(baziBalance(baziChart({ ...CAMILLE, timeUnknown: true })).total, 7);
});

test("Sample B: a weak Ding, the Hurting Officer structure, Wood and Fire, a mild month", () => {
  const b = baziBalance(baziChart(SAMPLE_B));
  assert.deepEqual(pts(b), { wood: 1, fire: 2.8, earth: 1.5, metal: 2.7, water: 1 });
  assert.deepEqual([b.tests.season.met, b.tests.root.met, b.tests.support.met, b.strength], [false, true, false, "weak"]);
  assert.deepEqual(b.structure, { id: "hurting-officer", via: "main", stem: S.wu });
  assert.deepEqual(b.favourable, { good: ["wood", "fire"], bad: ["water", "earth", "metal"], season: "autumn", climate: null });
});

test("the structures: Prosperity, Sword Edge, a revealed stem, the main qi", () => {
  assert.deepEqual(structureOf(board(["bing", "zi"], ["bing", "yin"], ["jia", "zi"], ["bing", "zi"])), { id: "jian-lu", via: "lu" });
  assert.deepEqual(structureOf(board(["bing", "zi"], ["bing", "mao"], ["jia", "zi"], ["bing", "zi"])), { id: "yang-ren", via: "ren" });
  // A Jia Day Master in Si (Bing, Wu, Geng hidden): Geng shows on the year, so Seven Killings, though Bing is the main qi.
  assert.deepEqual(structureOf(board(["geng", "zi"], ["ji", "si"], ["jia", "zi"], ["ji", "zi"])), { id: "seven-killings", via: "revealed", stem: S.geng, shownAt: "year" });
  assert.deepEqual(structureOf(board(["ji", "zi"], ["ji", "si"], ["jia", "zi"], ["ji", "zi"])), { id: "eating-god", via: "main", stem: S.bing });
  // A yin Day Master at its peak has no Sword Edge structure: Yi in a Yin month reads Yin's hidden stems (Jia is a peer; Bing shows).
  assert.deepEqual(structureOf(board(["bing", "zi"], ["wu", "yin"], ["yi", "zi"], ["ren", "zi"])), { id: "hurting-officer", via: "revealed", stem: S.bing, shownAt: "year" });
});

test("strong, balanced, weak, and the 'follow' flags", () => {
  // Jia in a Yin month, rooted, with Ren and Jia beside it: strong; the draining phases help, the least held first.
  const strong = baziBalance(board(["ren", "zi"], ["jia", "yin"], ["jia", "chen"], ["geng", "wu"]));
  assert.deepEqual([strong.score, strong.strength], [4, "strong"]);
  assert.deepEqual(strong.favourable.good.sort(), ["earth", "fire", "metal"]);
  assert.deepEqual(strong.favourable.bad.sort(), ["water", "wood"]);
  // In season but unrooted and alone: balanced (2).
  const even = baziBalance(board(["geng", "you"], ["xin", "zi"], ["jia", "shen"], ["geng", "you"]));
  assert.deepEqual([even.tests.season.met, even.tests.root.met, even.tests.support.met, even.strength], [true, false, false, "balanced"]);
  // All Metal round a Jia: no root, no helper, 11% support: the chart is flagged as following Power.
  const follow = baziBalance(board(["geng", "you"], ["xin", "you"], ["jia", "you"], ["geng", "you"]));
  assert.equal(follow.support.toFixed(2), "0.11");
  assert.equal(follow.special, "follow-power");
  assert.deepEqual(follow.favourable.good.includes("metal"), true);
  // All Wood and Water, nothing controlling: dominant.
  const dominant = baziBalance(board(["ren", "zi"], ["jia", "yin"], ["jia", "mao"], ["gui", "hai"]));
  assert.equal(dominant.special, "follow-strong");
});

test("what the analysis says, and why", () => {
  const c = baziChart(CAMILLE);
  const strength = baziReading(c, "bz:strength", "en", full);
  assert.equal(strength.title, "Day Master · Weak");
  assert.equal(strength.lead, STRENGTH_TEXTS.weak[0]);
  assert.deepEqual(strength.sections[0].paragraphs.slice(0, 3), [
    "The month branch Horse · wǔ 午 has dīng 丁 (Fire) as its main qi: for your Day Master xīn 辛, the phase that controls it. It is born out of season.",
    "Metal, your Day Master’s phase, is held in Snake · sì 巳 (hour pillar, residual qi 10): it is rooted.",
    "Other stems that are Metal or produce it: 1 of 3, where half are needed. It is not supported.",
  ]);
  const fr = baziReading(c, "bz:balance", "fr", full);
  assert.equal(fr.facts[1].value, "2,7 sur 9 points · 30\u202f%");
  const structure = baziReading(c, "bz:structure", "en", full);
  assert.equal(structure.title, "Seven Killings structure");
  assert.equal(structure.lead, STRUCTURE_TEXTS["seven-killings"][0]);
  const fav = baziReading(c, "bz:favourable", "en", full);
  assert.deepEqual(fav.sections.map((s) => s.paragraphs[0]), [
    "Your Day Master is weak: its own phase and the one producing it help, Earth, Metal. Most needed: Earth, the one the chart holds least.",
    "Born in a summer month, Horse · wǔ 午: the climate method asks first for Water’s moisture.",
  ]);
  const wood = baziReading(c, "bz:phase:wood", "fr", full);
  assert.equal(wood.lead, "La phase Bois tient 0,3 des 9 points du thème (3\u202f%). C’est la phase la moins présente de votre thème.");
  assert.deepEqual(wood.facts.map((f) => f.ref), ["bz:stem:day", "bz:hidden:day:1"]);
  assert.equal(baziReading(c, "bz:phase:air", "en", full), null);
  const follow = baziReading(board(["geng", "you"], ["xin", "you"], ["jia", "you"], ["geng", "you"]), "bz:structure", "en", full);
  assert.match(follow.sections[1].paragraphs[0], /Schools disagree/);
});

test("every text in both languages, in Ulune's typography and tone", () => {
  assert.equal(Object.keys(STRUCTURE_TEXTS).length, 14);
  for (const [en, fr] of [...Object.values(STRENGTH_TEXTS), ...Object.values(STRUCTURE_TEXTS)]) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/);
      assert.doesNotMatch(t, / {2}/);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, fr.slice(0, 40));
    assert.doesNotMatch(en, /\b(death|dies?|illness|disease|sick\w*|doomed|unlucky|lucky|curse[ds]?|must|fate|disaster)\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|malchance|chance|maudit|condamn\w*|doit|devez|destin|désastre)\b/i, fr.slice(0, 40));
  }
});

test("the table as text and as CSV", () => {
  const lines = baziTextParts(baziChart(CAMILLE), "en", full, "Camille").find((p) => p.id === "balance").lines;
  assert.equal(lines[0], "Balance and strength");
  assert.equal(lines[2], "Fire · huǒ 火: 2.7 · 30% · Power: what controls you");
  assert.ok(lines.includes("Strength: Weak (1)"));
  assert.ok(lines.includes("Structure: Seven Killings structure · qīshā gé 七殺格"));
  assert.ok(lines.includes("By climate: Water"));
  const csv = baziTableCsv(baziChart(SAMPLE_B)).split("\n");
  assert.ok(csv.includes("phase,fire,2.8,0.311,peer"), csv.join("\n"));
  assert.ok(csv.includes("analysis,structure,hurting-officer"));
  assert.ok(csv.includes("analysis,favourable,wood|fire"));
  assert.ok(csv.includes("analysis,climate,"));
});
