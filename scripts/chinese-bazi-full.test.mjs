/**
 * BaZi's full table (languages plan, part 17): every pillar by every layer,
 * the four of a made-up chart and the luck pillar and year of a fixed
 * moment; the stars an arriving pillar brings; the rows with one count, with
 * none, before the first luck pillar, without a birth time; the lines for
 * Copy and the CSV.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { baziChart } from "../src/lib/chinese/bazi.ts";
import { STEMS, BRANCHES } from "../src/lib/chinese/names.ts";
import { starsForPillar } from "../src/lib/chinese/bazi-signs.ts";
import { flowYear, luckPillars } from "../src/lib/chinese/bazi-luck.ts";
import { baziFullRows, fullLines } from "../src/lib/chinese/bazi-full.ts";
import { baziTableCsv, baziTextParts } from "../src/lib/chinese/bazi-table.ts";

const S = Object.fromEntries(STEMS.map((s) => [s.id, s.index]));
const B = Object.fromEntries(BRANCHES.map((b) => [b.id, b.index]));
const full = { script: "hant", show: "full" };
// Made-up birth (never a real person's).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const NOW = Date.UTC(2026, 9, 12);

function timeOf(c, counts, nowMs = NOW, year = 2026) {
  const lucks = counts.map((n) => luckPillars(c, n));
  return { lucks, year: flowYear(c, year, lucks), nowMs };
}

test("the stars an arriving pillar brings", () => {
  const c = baziChart(CAMILLE);
  // 2026, Bing-Wu: Wu is Xin's Nobleman, the General of the year's trine; Bing the Monthly Virtue of a Wu month.
  assert.deepEqual(starsForPillar(c, S.bing, B.wu), ["nobleman", "general", "monthly-virtue"]);
  // Yi-You: You is Xin's Prosperity, and the Red Phoenix of a Wu year.
  assert.deepEqual(starsForPillar(c, S.yi, B.you), ["prosperity-star", "red-phoenix"]);
});

test("every pillar by every layer, with the luck pillar and the year of the moment", () => {
  const c = baziChart(CAMILLE);
  const rows = baziFullRows(c, "en", full, timeOf(c, ["yang", "yin"]));
  assert.deepEqual(rows.map((r) => r.id), ["year", "month", "day", "hour", "luck-yang", "luck-yin", "flow-year"]);
  assert.deepEqual(rows.map((r) => r.kind), ["natal", "natal", "natal", "natal", "luck", "luck", "year"]);
  assert.deepEqual(rows[2].ids, ["full", "day", "xin-hai", "xin", "day-master", "hai", "ren:70:hurting-officer|jia:30:direct-wealth", "bath", "釵釧金", "0", "golden-carriage|heavenly-virtue", "clash:day-hour", "wood:0.3|metal:1|water:0.7"]);
  assert.equal(rows[3].stage, "Death · sǐ 死");
  assert.equal(rows[3].links, "Clash · Day");
  assert.equal(rows[0].points, "Fire 0.7 · Earth 0.3 · Metal 1");
  assert.equal(rows[4].label, "Luck pillar · 27–37 · Yang count");
  assert.equal(rows[4].links, "Stem combination · Year; Stem clash · Day");
  // The yin count's luck pillar, Wu-Yin, stands on an empty branch (the day's week leaves out Yin and Mao).
  assert.equal(rows[5].empty, "Yes");
  assert.equal(rows[6].label, "The year 2026");
  assert.equal(rows[6].points, "–");
  // The points of the four pillars add up to the chart's nine.
  const total = rows.slice(0, 4).flatMap((r) => r.ids[12].split("|")).reduce((s, x) => s + Number(x.split(":")[1]), 0);
  assert.equal(Math.round(total * 100) / 100, 9);
});

test("one count, no time rows, before the first luck pillar, no birth time", () => {
  const c = baziChart(CAMILLE);
  assert.deepEqual(baziFullRows(c, "en", full, timeOf(c, ["yin"])).map((r) => r.id), ["year", "month", "day", "hour", "luck-yin", "flow-year"]);
  assert.equal(baziFullRows(c, "en", full).length, 4);
  // In 1991 no luck pillar runs yet, whichever count.
  assert.deepEqual(baziFullRows(c, "en", full, timeOf(c, ["yang", "yin"], Date.UTC(1991, 5, 1), 1991)).map((r) => r.id).slice(4), ["flow-year"]);
  const noTime = baziChart({ ...CAMILLE, timeUnknown: true });
  assert.deepEqual(baziFullRows(noTime, "en", full).map((r) => r.id), ["year", "month", "day"]);
});

test("Copy's lines and the CSV", () => {
  const c = baziChart(CAMILLE);
  const time = timeOf(c, ["yang"]);
  const parts = baziTextParts(c, "fr", { script: "hant", show: "names" }, "Camille", time);
  assert.equal(parts[0].id, "full");
  assert.equal(parts[0].lines[0], "Camille · Le thème, couche par couche");
  assert.equal(
    parts[0].lines[1],
    "Pilier de l’année : Cheval de Métal yang | Rival | Cheval · Feu | Troncs cachés Feu yin 70 Sept Tueurs · Terre yin 30 Ressource indirecte | Stade de vie Maladie | Na Yin Terre du bord de la route | Branche vide – | Étoiles symboliques Noble céleste | Rencontre Autopunition · Mois | Points Feu 0,7 · Terre 0,3 · Métal 1",
  );
  assert.equal(fullLines(baziFullRows(c, "en", full, time), "en").length, 6);
  const csv = baziTableCsv(c, time).split("\n");
  assert.ok(csv.includes("full,row,pillar,stem,stemGod,branch,hiddenStems,stage,naYin,empty,stars,links,points"));
  assert.ok(csv.includes("full,luck-yang,yi-you,yi,indirect-wealth,you,xin:100:companion,prosperity,泉中水,0,prosperity-star|red-phoenix,stem-combination:year|stem-clash:day,"), csv.join("\n"));
  assert.ok(csv.includes("full,flow-year,bing-wu,bing,direct-officer,wu,ding:70:seven-killings|ji:30:indirect-resource,sickness,天河水,0,nobleman|general|monthly-virtue,stem-combination:day|stem-clash:month|self-punishment:year|self-punishment:month,"));
});
