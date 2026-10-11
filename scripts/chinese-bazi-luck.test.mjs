/**
 * BaZi's time (languages plan, part 16): the luck pillars' direction, start
 * and sequence for two made-up births under both counts; what a new pillar
 * meets (pairs, and the trines and trios it completes); a year of the flow
 * with its months and the luck pillar it falls in; a day; the readings in
 * both languages; the table's text and CSV.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { BRANCHES, SIXTY, STEMS } from "../src/lib/chinese/names.ts";
import { baziChart } from "../src/lib/chinese/bazi.ts";
import { flowDay, flowYear, flowYearOf, luckAt, luckDirection, luckPillars, meetingsOf } from "../src/lib/chinese/bazi-luck.ts";
import { luckReading } from "../src/lib/chinese/bazi-luck-reading.ts";
import { luckTableCsv, luckTextParts } from "../src/lib/chinese/bazi-luck-table.ts";
import { dayCycleOf } from "../src/lib/chinese/day-cycle.ts";
import { termMs } from "../src/lib/chinese/terms.ts";

const S = Object.fromEntries(STEMS.map((s) => [s.id, s.index]));
const B = Object.fromEntries(BRANCHES.map((b) => [b.id, b.index]));
const full = { script: "hant", show: "full" };
const ids = (l) => l.pillars.map((p) => SIXTY[p.pillar.cycle].id);

// Made-up births (never a real person's).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };

test("the direction: forward when the year stem's polarity and the count agree", () => {
  assert.equal(luckDirection(S.geng, "yang"), "forward");
  assert.equal(luckDirection(S.geng, "yin"), "backward");
  assert.equal(luckDirection(S.ding, "yang"), "backward");
  assert.equal(luckDirection(S.ding, "yin"), "forward");
});

test("Camille's luck pillars, both counts: the start from the days to the opening term, three days a year", () => {
  const c = baziChart(CAMILLE);
  const yang = luckPillars(c, "yang");
  assert.equal(yang.direction, "forward");
  assert.equal(new Date(yang.jieMs).toISOString().slice(0, 16), "1990-07-07T09:00"); // Xiaoshu
  assert.equal(yang.days.toFixed(2), "21.96");
  assert.deepEqual(yang.start, { years: 7, months: 3, days: 25 });
  assert.equal(new Date(yang.startMs).toISOString().slice(0, 10), "1997-10-09");
  assert.deepEqual(ids(yang), ["gui-wei", "jia-shen", "yi-you", "bing-xu", "ding-hai", "wu-zi", "ji-chou", "geng-yin", "xin-mao"]);
  assert.deepEqual(yang.pillars.slice(0, 3).map((p) => p.god), ["eating-god", "direct-wealth", "indirect-wealth"]);
  assert.equal(yang.pillars[1].fromAge - yang.pillars[0].fromAge, 10);
  const yin = luckPillars(c, "yin");
  assert.equal(yin.direction, "backward");
  assert.equal(new Date(yin.jieMs).toISOString().slice(0, 10), "1990-06-05"); // Mangzhong
  assert.deepEqual(yin.start, { years: 3, months: 1, days: 26 });
  assert.deepEqual(ids(yin).slice(0, 3), ["xin-si", "geng-chen", "ji-mao"]);
  // What the first yang pillar meets: Wei completes Si-Wu-Wei with the hour and the year; Wu-Wei harmonies.
  assert.deepEqual(
    yang.pillars[0].meets.map((m) => `${m.kind}:${m.with.join("+")}:${m.phase ?? ""}`),
    ["season:hour+year:fire", "harmony:year:fire", "harmony:month:fire"],
  );
});

test("Sample B: a yin year, so the yang count runs backward", () => {
  const c = baziChart(SAMPLE_B);
  const yang = luckPillars(c, "yang");
  const yin = luckPillars(c, "yin");
  assert.deepEqual([yang.direction, yin.direction], ["backward", "forward"]);
  assert.equal(ids(yang)[0], "ji-you");
  assert.equal(ids(yin)[0], "xin-hai");
  assert.deepEqual(yin.start, { years: 1, months: 4, days: 4 });
});

test("what a new pillar meets: pairs, and the trines and trios it completes", () => {
  const placed = [
    { place: "year", stem: S.jia, branch: B.shen },
    { place: "month", stem: S.bing, branch: B.chen },
  ];
  const m = meetingsOf(S.ji, B.zi, placed).map((x) => `${x.kind}:${x.with.join("+")}:${x.phase ?? ""}`);
  assert.ok(m.includes("stem-combination:year:earth"));
  assert.ok(m.includes("trine:year+month:water"));
  assert.ok(m.includes("harmony:month:") === false);
  // Geng over Yin: a stem clash with the Jia, and Yin against Shen, a clash and a punishment.
  assert.deepEqual(meetingsOf(S.geng, B.yin, placed).map((x) => x.kind), ["stem-clash", "clash", "punishment"]);
});

test("a year of the flow, its months, its luck pillars; a day", () => {
  const c = baziChart(CAMILLE);
  const lucks = [luckPillars(c, "yang"), luckPillars(c, "yin")];
  const y = flowYear(c, 2026, lucks);
  assert.equal(SIXTY[y.pillar.cycle].id, "bing-wu");
  assert.equal(y.god, "direct-officer");
  assert.equal(y.fromMs, termMs(2026, 0));
  assert.deepEqual(y.meets.map((m) => `${m.kind}:${m.with.join("+")}`), ["stem-combination:day", "stem-clash:month", "self-punishment:year", "self-punishment:month"]);
  assert.deepEqual(y.luck.map((l) => SIXTY[l.pillar.pillar.cycle].id), ["yi-you", "wu-yin"]);
  assert.equal(y.months.length, 12);
  assert.equal(SIXTY[y.months[0].pillar.cycle].id, "geng-yin");
  assert.equal(SIXTY[y.months[11].pillar.cycle].id, "xin-chou");
  assert.equal(y.months[11].toMs, termMs(2027, 0));
  // Before the first luck pillar: none.
  assert.equal(luckAt(lucks[0], Date.UTC(1995, 0, 1)), null);
  assert.equal(flowYearOf(Date.UTC(2026, 0, 20)), 2025);
  // 1 January 2000, Wu-Wu: Xin's Direct Resource.
  const d = flowDay(c, dayCycleOf(2000, 1, 1));
  assert.equal(SIXTY[d.pillar.cycle].id, "wu-wu");
  assert.equal(d.god, "direct-resource");
});

test("what the Cycles page says, and how the pillars are counted", () => {
  const c = baziChart(CAMILLE);
  const lucks = [luckPillars(c, "yang"), luckPillars(c, "yin")];
  const x = { c, lucks, year: flowYear(c, 2026, lucks), day: null, tz: "Europe/Paris" };
  const how = luckReading(x, "bz:luck-how", "en", full);
  assert.equal(
    how.sections[0].paragraphs[0],
    "Your year stem gēng 庚 is yang and the count is yang: they agree, so the luck pillars run forward from your month pillar Yang Water Horse · rénwǔ 壬午, one step of the sixty-cycle per ten years.",
  );
  assert.equal(how.sections[0].paragraphs[1], "From your birth to the next opening term, on 7 Jul 1990: 22 days. Three days make a year, so a day is four months: the first luck pillar starts at 7 years 3 months.");
  assert.match(how.sections[0].paragraphs.at(-1), /both directions are shown/);
  const fr = luckReading(x, "bz:luck-how", "fr", full);
  assert.equal(fr.facts[1].value, "3 ans 1 mois · 11 août 1993");
  const block = luckReading(x, "bz:luck:yang:2", "en", full);
  assert.equal(block.lead, "For ten years, from Oct 2007 to Oct 2017, this luck pillar brings your Direct Wealth by its stem and your Rob Wealth by its branch’s main qi.");
  assert.equal(block.kicker, "Luck pillar · 17–27 · Yang count");
  // Nothing chosen reads the year; a chart cell is read by the board.
  assert.equal(luckReading(x, null, "en", full).title, "Yang Fire Horse");
  assert.equal(luckReading(x, "bz:stem:day", "en", full).title, "Yin Metal · Day Master");
  assert.equal(luckReading(x, "bz:luck:yang:12", "en", full), null);
  // One count given: one direction, said once.
  const one = { ...x, lucks: [lucks[1]] };
  assert.doesNotMatch(luckReading(one, "bz:luck-how", "en", full).sections[0].paragraphs.join(" "), /both directions/);
});

test("the table as text and as CSV", () => {
  const c = baziChart(CAMILLE);
  const lucks = [luckPillars(c, "yang")];
  const y = flowYear(c, 2026, lucks);
  const parts = luckTextParts(lucks, y, "en", full, "Camille", "Europe/Paris");
  assert.equal(parts[0].lines[1], "Yang count · forward · From 7 years 3 months, around 9 Oct 1997");
  assert.match(parts[0].lines[2], /^7–17 · 1997: Yin Water Goat · guǐwèi 癸未 · Eating God/);
  assert.equal(parts[1].lines[2].slice(0, 30), "3 Feb: Yang Metal Tiger · gēng");
  const csv = luckTableCsv(lucks, y).split("\n");
  assert.ok(csv.includes("luck,yang,1,7.32,17.32,1997,gui-wei,癸未,eating-god,indirect-resource,season:hour+year:fire|harmony:year:fire|harmony:month:fire"), csv.join("\n"));
  assert.ok(csv.some((r) => r.startsWith("flow,year,2026,") && r.includes(",bing-wu,丙午,direct-officer,seven-killings,")));
});
