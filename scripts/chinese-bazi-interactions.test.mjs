/**
 * BaZi's interactions between the pillars (languages plan, part 14): the
 * stems' five combinations and four clashes and the six harmonies' phases
 * against the classical tables; the transformation conditions one by one on
 * made-up boards; trines, half trines, seasonal trios and punishments; two
 * made-up births; the readings in both languages; the texts' tone; the
 * table's text and CSV.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { BRANCHES, STEMS } from "../src/lib/chinese/names.ts";
import { baziChart } from "../src/lib/chinese/bazi.ts";
import { baziInteractions, harmonyPhase, monthSupports, stemClash, stemCombination } from "../src/lib/chinese/bazi-interactions.ts";
import { INTERACTION_TEXTS, PUNISHMENT_GROUP_TEXTS } from "../src/lib/chinese/bazi-interactions-texts.ts";
import { baziReading, ixRef, ixStatus } from "../src/lib/chinese/bazi-reading.ts";
import { baziTableCsv, baziTextParts } from "../src/lib/chinese/bazi-table.ts";

const S = Object.fromEntries(STEMS.map((s) => [s.id, s.index]));
const B = Object.fromEntries(BRANCHES.map((b) => [b.id, b.index]));
const full = { script: "hant", show: "full" };

/** A made-up board: [stem, branch] for the year, month, day and hour. */
function board(...cols) {
  const ids = ["year", "month", "day", "hour"];
  const pillars = cols.map(([stem, branch], i) => ({ id: ids[i], stem: S[stem], branch: B[branch], pillar: { cycle: 0 }, hidden: [], god: null, uncertain: false }));
  return { pillars, dayMaster: pillars[2].stem };
}
const ids = (c) => baziInteractions(c).map((x) => x.id);
const conds = (ix) => ix.conditions.map((x) => `${x.id}:${x.met ? 1 : 0}`).join(" ");

test("the stems' five combinations and four clashes, the six harmonies' phases", () => {
  const combos = { "jia-ji": "earth", "yi-geng": "metal", "bing-xin": "water", "ding-ren": "wood", "wu-gui": "fire" };
  for (const [pair, phase] of Object.entries(combos)) {
    const [a, b] = pair.split("-");
    assert.equal(stemCombination(S[a], S[b]), phase, pair);
    assert.equal(stemCombination(S[b], S[a]), phase, pair);
  }
  assert.equal(stemCombination(S.jia, S.geng), null);
  const clashes = ["jia-geng", "yi-xin", "bing-ren", "ding-gui"];
  for (let a = 0; a < 10; a += 1) for (let b = 0; b < 10; b += 1) {
    const name = [STEMS[Math.min(a, b)].id, STEMS[Math.max(a, b)].id].join("-");
    assert.equal(stemClash(a, b), clashes.includes(name), name);
  }
  const harmonies = { "zi-chou": "earth", "yin-hai": "wood", "mao-xu": "fire", "chen-you": "metal", "si-shen": "water", "wu-wei": "fire" };
  for (const [pair, phase] of Object.entries(harmonies)) {
    const [a, b] = pair.split("-");
    assert.equal(harmonyPhase(B[a], B[b]), phase, pair);
  }
  assert.equal(harmonyPhase(B.zi, B.wu), null);
  // The month's support: its own phase, or its season (Chen is Earth, and spring).
  assert.ok(monthSupports(B.chen, "earth") && monthSupports(B.chen, "wood") && !monthSupports(B.chen, "fire"));
  assert.ok(monthSupports(B.wei, "fire") && monthSupports(B.hai, "water") && !monthSupports(B.mao, "metal"));
});

test("a stem combination transforms only when every condition is met", () => {
  // Jia over Ji, side by side, in a Chen (Earth) month, nothing clashing, no rival: Earth.
  const yes = baziInteractions(board(["jia", "zi"], ["ji", "chen"], ["bing", "yin"], ["wu", "wu"]));
  const combo = yes.find((x) => x.kind === "stem-combination");
  assert.equal(combo.id, "stem-combination:year-month");
  assert.equal(combo.phase, "earth");
  assert.equal(conds(combo), "neighbours:1 season:1 unbroken:1 uncontested:1");
  assert.equal(combo.transforms, true);
  // Apart (year and day), in a Hai month, a Geng clashing the Jia, a second Ji seeking it.
  const no = baziInteractions(board(["jia", "zi"], ["geng", "hai"], ["ji", "yin"], ["ji", "wu"]));
  const first = no.find((x) => x.id === "stem-combination:year-day");
  assert.equal(conds(first), "neighbours:0 season:0 unbroken:0 uncontested:0");
  assert.equal(first.transforms, false);
  assert.deepEqual(first.conditions[2].breaker, { place: "month", item: S.geng, target: S.jia });
  assert.deepEqual(first.conditions[3].rival, { place: "hour", item: S.ji, target: S.jia });
  assert.ok(no.some((x) => x.id === "stem-clash:year-month"));
  // Wu and Ji, the Earth stems, clash with nothing.
  assert.equal(baziInteractions(board(["wu", "zi"], ["ji", "zi"], ["wu", "zi"])).filter((x) => x.level === "stem").length, 0);
});

test("the branches: trines, half trines, seasonal trios, harmonies and the tensions", () => {
  // Shen, Zi and Chen in a Zi month: a whole Water trine; Zi-Chou a harmony beside it.
  const water = baziInteractions(board(["jia", "shen"], ["jia", "zi"], ["jia", "chen"], ["jia", "chou"]));
  const trine = water.find((x) => x.kind === "trine");
  assert.equal(trine.id, "trine:year-month-day");
  assert.equal(conds(trine), "complete:1 season:1 unbroken:1");
  assert.ok(trine.transforms);
  // With a Wu hour clashing the Zi, it no longer holds.
  const broken = baziInteractions(board(["jia", "shen"], ["jia", "zi"], ["jia", "chen"], ["jia", "wu"])).find((x) => x.kind === "trine");
  assert.equal(conds(broken), "complete:1 season:1 unbroken:0");
  // A half trine needs the peak: Zi with Chen is one, Shen with Chen is not.
  assert.deepEqual(ids(board(["jia", "zi"], ["jia", "chen"], ["jia", "mao"])).filter((x) => x.startsWith("half")), ["half-trine:year-month"]);
  assert.deepEqual(ids(board(["jia", "shen"], ["jia", "chen"], ["jia", "mao"])).filter((x) => x.startsWith("half")), []);
  // Yin, Mao and Chen: spring's trio, Wood, in a Mao month.
  const spring = baziInteractions(board(["jia", "yin"], ["jia", "mao"], ["jia", "chen"])).find((x) => x.kind === "season");
  assert.equal(spring.phase, "wood");
  assert.ok(spring.transforms);
  // Yin, Si and Shen: one punishment of all three (and the pairs' own harms and destructions).
  const ungrateful = baziInteractions(board(["jia", "yin"], ["jia", "si"], ["jia", "shen"]));
  const pun = ungrateful.find((x) => x.kind === "punishment");
  assert.deepEqual([pun.id, pun.group], ["punishment:year-month-day", "ungrateful"]);
  assert.ok(ungrateful.some((x) => x.id === "clash:year-day"));
  assert.ok(ungrateful.some((x) => x.id === "harm:year-month"));
  assert.ok(ungrateful.some((x) => x.id === "harmony:month-day"));
  assert.ok(ungrateful.some((x) => x.id === "destruction:month-day"));
  // The same Wu twice punishes itself; Zi twice does nothing.
  assert.ok(ids(board(["jia", "wu"], ["jia", "wu"], ["jia", "mao"])).includes("self-punishment:year-month"));
  assert.ok(!ids(board(["jia", "zi"], ["jia", "zi"], ["jia", "yin"])).some((x) => x.startsWith("self")));
});

// Made-up births (never a real person's).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };

test("Camille and Sample B", () => {
  assert.deepEqual(ids(baziChart(CAMILLE)), ["clash:day-hour", "self-punishment:year-month"]);
  const b = baziInteractions(baziChart(SAMPLE_B));
  assert.deepEqual(b.map((x) => x.id), ["harmony:year-month", "punishment:year-hour"]);
  assert.equal(conds(b[0]), "neighbours:1 season:0 unbroken:1 uncontested:1");
  assert.equal(b[1].group, "uncivil");
  // Without a time: Camille's clash with the hour is gone.
  assert.deepEqual(ids(baziChart({ ...CAMILLE, timeUnknown: true })), ["self-punishment:year-month"]);
});

test("what an interaction says, and why it transforms or not", () => {
  const b = baziChart(SAMPLE_B);
  const h = baziReading(b, ixRef("harmony:year-month"), "en", full);
  assert.equal(h.title, "Harmony");
  assert.equal(h.lead, `${INTERACTION_TEXTS.harmony[0]} The Rabbit and the Dog, Mao and Xu: gentleness and loyalty, making Fire.`);
  assert.deepEqual(h.facts.map((f) => f.ref ?? f.value), ["bz:branch:year", "bz:branch:month", "Fire · huǒ 火", "Fire · binds without transforming"]);
  assert.deepEqual(h.sections[0].paragraphs, [
    "Rabbit · mǎo 卯 and Dog · xū 戌 stand side by side.",
    "The month branch Dog · xū 戌 does not support Fire.",
    "Nothing else in the chart clashes with them.",
    "No third one seeks the same partner.",
    "Not every condition is met: they hold together without turning into Fire.",
  ]);
  const fr = baziReading(b, ixRef("harmony:year-month"), "fr", full);
  assert.equal(fr.sections[0].paragraphs[1], "La branche du mois Chien · xū 戌 ne soutient pas le Feu.");
  const p = baziReading(b, ixRef("punishment:year-hour"), "fr", full);
  assert.equal(p.sections[0].paragraphs[0], PUNISHMENT_GROUP_TEXTS.uncivil[1]);
  assert.equal(p.facts.at(-1).value, "Non");
  const c = baziChart(CAMILLE);
  assert.equal(baziReading(c, ixRef("clash:day-hour"), "en", full).facts.at(-1).value, "Yes");
  assert.equal(baziReading(c, ixRef("harmony:year-month"), "en", full), null);
  // A Day Master that combines: the note.
  const dm = board(["bing", "zi"], ["ding", "chen"], ["ji", "chen"], ["jia", "wu"]);
  assert.match(baziReading(dm, ixRef("stem-combination:day-hour"), "en", full).sections[0].paragraphs.at(-1), /seldom turns into another phase/);
  // The status words.
  assert.equal(ixStatus(baziInteractions(dm).find((x) => x.kind === "stem-combination"), "fr"), "Terre · se transforme");
  assert.equal(ixStatus(baziInteractions(c)[0], "en"), "side by side");
});

test("every text in both languages, in Ulune's typography and tone", () => {
  for (const [en, fr] of [...Object.values(INTERACTION_TEXTS), ...Object.values(PUNISHMENT_GROUP_TEXTS)]) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/);
      assert.doesNotMatch(t, / {2}/);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, fr.slice(0, 40));
    assert.doesNotMatch(en, /\b(death|dies?|illness|disease|sick\w*|doomed|unlucky|curse[ds]?|must|fate|disaster)\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|malchance|maudit|condamn\w*|doit|devez|destin|désastre)\b/i, fr.slice(0, 40));
  }
});

test("the table as text and as CSV", () => {
  const lines = baziTextParts(baziChart(SAMPLE_B), "en", full, "Sample B").find((p) => p.id === "interactions").lines;
  assert.deepEqual(lines, [
    "Between the pillars",
    "Harmony · liùhé 六合: Year · Month · Rabbit 卯 mǎo · Dog 戌 xū · Fire · binds without transforming",
    "Punishment · xíng 刑: Year · Hour · Rabbit 卯 mǎo · Rat 子 zǐ · apart",
  ]);
  const csv = baziTableCsv(baziChart(SAMPLE_B)).split("\n");
  assert.ok(csv.includes("ix,harmony:year-month,harmony,branch,year|month,mao|xu,fire,1,0,neighbours:1|season:0|unbroken:1|uncontested:1"), csv.join("\n"));
  assert.ok(csv.includes("ix,punishment:year-hour,punishment,branch,year|hour,mao|zi,,0,,"));
});
