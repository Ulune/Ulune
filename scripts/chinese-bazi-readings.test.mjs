/**
 * BaZi's readings (languages plan, part 18): every Ten God shown, hidden or
 * absent; every phase in excess or lacking; every luck pillar and year by its
 * god; a line for every pair and group the engine can name, and none it
 * cannot; both languages, Ulune's typography and tone; and the texts as two
 * made-up charts read them.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { TEN_GODS, baziChart } from "../src/lib/chinese/bazi.ts";
import { SEASONS, harmonyPhase, stemClash, stemCombination } from "../src/lib/chinese/bazi-interactions.ts";
import { SELF_PUNISHING, TRINES, branchRelations } from "../src/lib/chinese/relations.ts";
import { GOD_PRESENCE, LUCK_GOD_TEXTS, PAIR_LINES, PHASE_EXCESS, PHASE_LACK, YEAR_GOD_TEXTS, pairKey } from "../src/lib/chinese/bazi-readings-texts.ts";
import { baziReading, ixRef } from "../src/lib/chinese/bazi-reading.ts";
import { flowYear, luckPillars } from "../src/lib/chinese/bazi-luck.ts";
import { luckReading } from "../src/lib/chinese/bazi-luck-reading.ts";

const full = { script: "hant", show: "full" };
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };

test("every god three ways, every phase both ways, every luck pillar and year", () => {
  for (const g of TEN_GODS) {
    for (const k of ["shown", "hidden", "absent"]) assert.ok(GOD_PRESENCE[g.id][k], `${g.id} ${k}`);
    assert.ok(LUCK_GOD_TEXTS[g.id] && YEAR_GOD_TEXTS[g.id], g.id);
  }
  for (const p of ["wood", "fire", "earth", "metal", "water"]) assert.ok(PHASE_EXCESS[p] && PHASE_LACK[p], p);
});

test("a line for every pair and group the engine can name, and none it cannot", () => {
  const wanted = new Set();
  for (let a = 0; a < 10; a += 1) for (let b = a + 1; b < 10; b += 1) {
    if (stemCombination(a, b)) wanted.add(pairKey("stem-combination", "stem", [a, b]));
    if (stemClash(a, b)) wanted.add(pairKey("stem-clash", "stem", [a, b]));
  }
  for (let a = 0; a < 12; a += 1) for (let b = a + 1; b < 12; b += 1) {
    if (harmonyPhase(a, b)) wanted.add(pairKey("harmony", "branch", [a, b]));
    for (const k of branchRelations(a, b)) if (k === "clash" || k === "harm" || k === "destruction") wanted.add(pairKey(k, "branch", [a, b]));
  }
  for (const b of SELF_PUNISHING) wanted.add(pairKey("self-punishment", "branch", [b, b]));
  for (const t of TRINES) wanted.add(pairKey("trine", "branch", t.branches, t.phase));
  for (const s of SEASONS) wanted.add(pairKey("season", "branch", s.branches, s.phase));
  assert.equal(wanted.size, 45);
  assert.deepEqual([...wanted].filter((k) => !PAIR_LINES[k]), []);
  assert.deepEqual(Object.keys(PAIR_LINES).filter((k) => !wanted.has(k)), []);
  // A half trine reads its trine's line; a punishment its group's (part 14).
  assert.equal(pairKey("half-trine", "branch", [0, 4], "water"), "trine:water");
  assert.equal(pairKey("punishment", "branch", [2, 5]), null);
  // Each pair's line names its own stems or branches.
  for (const [key, [en]] of Object.entries(PAIR_LINES)) {
    const ids = key.split(":")[1].split("-");
    if (["wood", "fire", "earth", "metal", "water"].includes(ids[0])) continue;
    for (const id of ids) assert.ok(en.toLowerCase().includes(id), `${key}: ${en.slice(0, 40)}`);
  }
});

test("every text in both languages, in Ulune's typography and tone", () => {
  const all = [
    ...Object.values(GOD_PRESENCE).flatMap((x) => Object.values(x)),
    ...Object.values(PHASE_EXCESS),
    ...Object.values(PHASE_LACK),
    ...Object.values(LUCK_GOD_TEXTS),
    ...Object.values(YEAR_GOD_TEXTS),
    ...Object.values(PAIR_LINES),
  ];
  assert.equal(all.length, 30 + 10 + 20 + 45);
  for (const [en, fr] of all) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/);
      assert.doesNotMatch(t, / {2}/);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, fr.slice(0, 40));
    assert.doesNotMatch(en, /\b(death|dies?|illness|disease|sick\w*|doomed|unlucky|lucky|curse[ds]?|must|fate|disaster|divorce|accident)\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|malchance|maudit|condamn\w*|doit|devez|destin|désastre|divorce|accident)\b/i, fr.slice(0, 40));
  }
});

test("what Camille's chart says: gods present, quiet or absent, much and little, and the pairs' own lines", () => {
  const c = baziChart(CAMILLE);
  const said = (ref, l = "en") => baziReading(c, ref, l, full);
  assert.equal(said("bz:god:rob-wealth").sections[0].paragraphs[0], GOD_PRESENCE["rob-wealth"].shown[0]);
  assert.equal(said("bz:god:seven-killings").sections[0].paragraphs[0], GOD_PRESENCE["seven-killings"].hidden[0]);
  assert.equal(said("bz:god:companion", "fr").sections[0].paragraphs[0], GOD_PRESENCE.companion.absent[1]);
  // Fire and Water hold 2.7 of 9: much; Wood 0.3: little; Earth 1.2: neither.
  assert.equal(said("bz:phase:fire").sections[0].paragraphs[0], PHASE_EXCESS.fire[0]);
  assert.equal(said("bz:phase:wood").sections[0].paragraphs[0], PHASE_LACK.wood[0]);
  assert.equal(said("bz:phase:earth").sections[0].id, "method");
  assert.match(said(ixRef("clash:day-hour")).lead, /Si and Hai, the Snake and the Pig/);
  assert.match(said(ixRef("self-punishment:year-month"), "fr").lead, /Wu deux fois/);
  // Sample B's harmony of Mao and Xu.
  assert.match(baziReading(baziChart(SAMPLE_B), ixRef("harmony:year-month"), "en", full).lead, /The Rabbit and the Dog/);
});

test("a luck pillar and a year by their god, and the lines of what they meet", () => {
  const c = baziChart(CAMILLE);
  const lucks = [luckPillars(c, "yang")];
  const x = { c, lucks, year: flowYear(c, 2026, lucks), day: null, tz: "Europe/Paris" };
  const block = luckReading(x, "bz:luck:yang:2", "en", full);
  assert.equal(block.sections[0].paragraphs[0], LUCK_GOD_TEXTS["direct-wealth"][0]);
  assert.match(block.sections[1].paragraphs[0], /^Stem clash · Year pillar: Jia and Geng clash/);
  const year = luckReading(x, null, "fr", full);
  assert.equal(year.sections[0].paragraphs[0], YEAR_GOD_TEXTS["direct-officer"][1]);
  assert.match(year.sections[1].paragraphs[0], /Bing et Xin forment la combinaison de l’autorité/);
});
