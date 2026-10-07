/*
 * The four pillars (src/lib/chinese/pillars.ts): every boundary rule, the
 * three clocks and the three day boundaries, published day pillars, both
 * year animals, the uncertainty flags, and speed. Made-up people only.
 * (A throwaway cross-check of 24,812 births 1800–2200 against lunar-python
 * agreed on every day and hour pillar, and on every year and month pillar
 * farther than 2 s from a term before 2030; README.md.)
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NEAR_MINUTES,
  cycleOf,
  dayPillarOfDay,
  fourPillars,
  hourBranchOf,
  hourPillarOf,
  localMeanMs,
  monthPillarAt,
  pillarOf,
  solarMonthAt,
  trueSolarMs,
  yearPillarAt,
} from "../src/lib/chinese/pillars.ts";
import { equationOfTimeMinutes } from "../src/lib/chinese/astro.ts";
import { LICHUN, termMs } from "../src/lib/chinese/terms.ts";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;
const dayNumber = (y, m, d) => Date.UTC(y, m - 1, d) / DAY;
const PARIS = 2.3522;
const OSLO = 10.7522;

/** The UT instant at which true solar time at `longitude` reads `y-m-d hh:mm`. */
function atTrueSolar(longitude, y, m, d, hh, mm, ss = 0) {
  const target = Date.UTC(y, m - 1, d, hh, mm, ss);
  let ms = target - longitude * 4 * MIN;
  for (let i = 0; i < 4; i += 1) ms += target - trueSolarMs(ms, longitude);
  return ms;
}

test("published day pillars: 1 Jan 1900 Jia-Xu, 1 Oct 1949 Jia-Zi, 1 Jan 2000 Wu-Wu; one step a day", () => {
  assert.equal(dayPillarOfDay(dayNumber(1900, 1, 1)).cycle, 10);
  assert.equal(dayPillarOfDay(dayNumber(1949, 10, 1)).cycle, 0);
  assert.equal(dayPillarOfDay(dayNumber(2000, 1, 1)).cycle, 54);
  for (let d = dayNumber(1800, 1, 1); d < dayNumber(2200, 12, 31); d += 1013) {
    assert.equal(dayPillarOfDay(d + 1).cycle, (dayPillarOfDay(d).cycle + 1) % 60);
  }
});

test("Camille (15 June 1990, 12:00 Paris): Geng-Wu year, Ren-Wu month, Xin-Hai day, Gui-Si hour", () => {
  const p = fourPillars({ ms: Date.UTC(1990, 5, 15, 10), longitude: PARIS, utcOffsetMinutes: 120 });
  assert.deepEqual([p.year.cycle, p.month.cycle, p.day.cycle, p.hour.cycle], [6, 18, 47, 29]);
  assert.equal(p.solarYear, 1990);
  assert.equal(p.solarMonth, 4, "the Horse month, from Mangzhong");
  assert.deepEqual(p.animal, { lichun: 6, lunarNewYear: 6 });
  assert.deepEqual([p.lunar.year, p.lunar.month, p.lunar.leap, p.lunar.day], [1990, 5, false, 23]);
  // True solar time in Paris that morning: 10:00 UT + 9.4 min of longitude − 0.4 min.
  assert.ok(Math.abs((p.localMs - Date.UTC(1990, 5, 15, 10)) / MIN - (9.41 + p.equationOfTime)) < 0.01);
});

test("Sample (1 January 2000, 12:00 Greenwich): Ji-Mao year (before Lichun), Bing-Zi month, Wu-Wu day and hour", () => {
  const p = fourPillars({ ms: Date.UTC(2000, 0, 1, 12), longitude: 0, utcOffsetMinutes: 0 });
  assert.deepEqual([p.year.cycle, p.month.cycle, p.day.cycle, p.hour.cycle], [15, 12, 54, 54]);
  assert.deepEqual(p.animal, { lichun: 3, lunarNewYear: 3 });
});

test("Sample B (3 November 1987, 23:10 Oslo): the clock decides the day and the hour", () => {
  const birth = { ms: Date.UTC(1987, 10, 3, 22, 10), longitude: OSLO, utcOffsetMinutes: 60 };
  const solar = fourPillars(birth);
  const mean = fourPillars(birth, { clock: "local-mean" });
  const civil = fourPillars(birth, { clock: "civil" });
  // Year Ding-Mao, month Geng-Xu (the Dog month, from Hanlu) whatever the clock.
  for (const p of [solar, mean, civil]) assert.deepEqual([p.year.cycle, p.month.cycle], [3, 46]);
  // True solar time is 23:09 (local mean 22:53, the equation of time +16.4 min):
  // the Rat hour, so tomorrow's day pillar, Ding-Si, and its first hour, Geng-Zi.
  assert.deepEqual([solar.day.cycle, solar.hour.cycle], [53, 36]);
  assert.deepEqual([civil.day.cycle, civil.hour.cycle], [53, 36]);
  // On local mean time it is still 22:53: Bing-Chen day, Ji-Hai hour.
  assert.deepEqual([mean.day.cycle, mean.hour.cycle], [52, 35]);
  assert.ok(Math.abs(solar.equationOfTime - 16.4) < 0.1);
});

test("the year turns at the exact instant of Lichun, whatever the place and the clock", () => {
  for (const year of [1801, 1950, 2026, 2200]) {
    const lichun = termMs(year, LICHUN);
    for (const longitude of [-179.9, -74, 0, 116.4, 179.9]) {
      for (const clock of ["true-solar", "local-mean", "civil"]) {
        const before = fourPillars({ ms: lichun - 1000, longitude, utcOffsetMinutes: 0 }, { clock });
        const after = fourPillars({ ms: lichun, longitude, utcOffsetMinutes: 0 }, { clock });
        assert.equal(before.solarYear, year - 1);
        assert.equal(after.solarYear, year);
        assert.equal(after.year.cycle, (before.year.cycle + 1) % 60);
        assert.equal(before.solarMonth, 11, "the Ox month ends the solar year");
        assert.equal(after.solarMonth, 0, "the Tiger month opens it");
      }
    }
  }
  assert.equal(yearPillarAt(termMs(2026, LICHUN)).cycle, 42, "Bing-Wu");
  assert.equal(yearPillarAt(termMs(2026, LICHUN) - 1).cycle, 41, "Yi-Si");
});

test("each month turns at its jie, and its stem follows the year's by the five-tigers rule", () => {
  // The Tiger month of a Jia or Ji year is Bing-Yin; Yi/Geng → Wu-Yin; Bing/Xin → Geng-Yin; Ding/Ren → Ren-Yin; Wu/Gui → Jia-Yin.
  const tigerStem = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
  for (let year = 2020; year < 2030; year += 1) {
    const yearStem = yearPillarAt(termMs(year, LICHUN)).stem;
    for (let m = 0; m < 12; m += 1) {
      const jie = 2 * m; // Lichun, Jingzhe, Qingming … Daxue, Xiaohan
      const at = termMs(m === 11 ? year + 1 : year, jie);
      const before = solarMonthAt(at - 1000);
      const now = solarMonthAt(at);
      assert.equal(now.index, m, `${year} month ${m}`);
      assert.equal(before.index, (m + 11) % 12);
      const p = monthPillarAt(at);
      assert.equal(p.branch, (m + 2) % 12, "Yin (Tiger) first");
      assert.equal(p.stem, (tigerStem[yearStem] + m) % 10, `${year} month ${m} stem`);
    }
  }
});

test("the day turns at 23:00 true solar time: the Rat hour belongs to the next day", () => {
  const lon = 116.4;
  const before = fourPillars({ ms: atTrueSolar(lon, 2026, 3, 10, 22, 59, 30), longitude: lon });
  const after = fourPillars({ ms: atTrueSolar(lon, 2026, 3, 10, 23, 0, 30), longitude: lon });
  const today = dayPillarOfDay(dayNumber(2026, 3, 10));
  const tomorrow = dayPillarOfDay(dayNumber(2026, 3, 11));
  assert.deepEqual([before.day, before.hour.branch], [today, 11], "22:59: still today, Pig hour");
  assert.deepEqual([after.day, after.hour.branch], [tomorrow, 0], "23:00: tomorrow, Rat hour");
  assert.equal(after.hour.stem, (tomorrow.stem * 2) % 10, "the Rat hour of tomorrow's stem");
  assert.ok(Math.abs(after.margins.day - 0.5) < 0.05 && after.uncertain.day);
  // After midnight the day is unchanged under this rule.
  const late = fourPillars({ ms: atTrueSolar(lon, 2026, 3, 11, 0, 30), longitude: lon });
  assert.deepEqual(late.day, tomorrow);
});

test("the split Rat hour and the midnight rule", () => {
  const lon = 0;
  const ms = atTrueSolar(lon, 2026, 3, 10, 23, 30);
  const today = dayPillarOfDay(dayNumber(2026, 3, 10));
  const tomorrow = dayPillarOfDay(dayNumber(2026, 3, 11));
  const zi = fourPillars({ ms, longitude: lon });
  const split = fourPillars({ ms, longitude: lon }, { dayBoundary: "split" });
  const midnight = fourPillars({ ms, longitude: lon }, { dayBoundary: "midnight" });
  assert.deepEqual(zi.day, tomorrow);
  // Split: today's day pillar, but already tomorrow's Rat hour (夜子時).
  assert.deepEqual(split.day, today);
  assert.deepEqual(split.hour, zi.hour);
  // Midnight: today, and a Rat hour counted from today's stem, like 00:30 this morning.
  assert.deepEqual(midnight.day, today);
  assert.deepEqual(midnight.hour, hourPillarOf(today, 0));
  assert.notDeepEqual(midnight.hour, zi.hour);
  // At 00:30 all three agree.
  const morning = atTrueSolar(lon, 2026, 3, 11, 0, 30);
  const all = ["23:00", "split", "midnight"].map((dayBoundary) => fourPillars({ ms: morning, longitude: lon }, { dayBoundary }));
  for (const p of all) assert.deepEqual([p.day, p.hour], [all[0].day, all[0].hour]);
});

test("the twelve double hours run from 23:00, and their stems follow the day's by the five-rats rule", () => {
  const base = Date.UTC(2026, 0, 1);
  for (let h = 0; h < 24; h += 1) {
    const branch = Math.floor((h + 1) / 2) % 12;
    assert.equal(hourBranchOf(base + h * HOUR), branch, `${h}:00`);
    assert.equal(hourBranchOf(base + h * HOUR + 59 * MIN + 59_000), Math.floor((h + 1 + 59.99 / 60) / 2) % 12, `${h}:59:59`);
  }
  assert.equal(hourBranchOf(base - 1), 0, "23:59:59.999 is still the Rat hour");
  // A Jia or Ji day starts with Jia-Zi, Yi/Geng with Bing-Zi, Bing/Xin with Wu-Zi, Ding/Ren with Geng-Zi, Wu/Gui with Ren-Zi.
  const ratStem = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  for (let c = 0; c < 60; c += 1) {
    const day = pillarOf(c);
    assert.equal(hourPillarOf(day, 0).stem, ratStem[day.stem]);
    for (let b = 0; b < 12; b += 1) assert.equal(hourPillarOf(day, b).branch, b);
  }
});

test("true solar time near noon and midnight: the Sun's clock, not the civil one", () => {
  // Greenwich, 11 February 2026: the Sun crosses the meridian at about 12:14 UT.
  const noonUt = Date.UTC(2026, 1, 11, 12);
  const eot = equationOfTimeMinutes(noonUt);
  assert.ok(eot < -14 && eot > -14.4);
  assert.ok(Math.abs((trueSolarMs(noonUt, 0) - noonUt) / MIN - eot) < 1e-6);
  // 13:05 UT is the Goat hour on the civil clock but still the Horse hour by the Sun.
  const birth = { ms: Date.UTC(2026, 1, 11, 13, 5), longitude: 0, utcOffsetMinutes: 0 };
  assert.equal(fourPillars(birth).hour.branch, 6);
  assert.equal(fourPillars(birth, { clock: "civil" }).hour.branch, 7);
  assert.equal(fourPillars(birth, { clock: "local-mean" }).hour.branch, 7);
  // Early November the Sun runs 16 minutes ahead: 22:50 UT is already 23:06 by the Sun, the next day's Rat hour.
  const late = { ms: Date.UTC(2026, 10, 3, 22, 50), longitude: 0, utcOffsetMinutes: 0 };
  assert.deepEqual(fourPillars(late).day, dayPillarOfDay(dayNumber(2026, 11, 4)));
  assert.deepEqual(fourPillars(late, { clock: "civil" }).day, dayPillarOfDay(dayNumber(2026, 11, 3)));
  assert.equal(localMeanMs(late.ms, 15), late.ms + HOUR);
});

test("far east and far west: one instant, two days either side of the date line", () => {
  const ms = Date.UTC(2026, 2, 1, 12);
  const east = fourPillars({ ms, longitude: 179.9 });
  const west = fourPillars({ ms, longitude: -179.9 });
  // The Sun's time is about 23:47 at both, on 1 March in the east and on 28 February in the west.
  assert.deepEqual(east.day, dayPillarOfDay(dayNumber(2026, 3, 2)));
  assert.deepEqual(west.day, dayPillarOfDay(dayNumber(2026, 3, 1)));
  assert.equal(east.hour.branch, 0);
  assert.equal(west.hour.branch, 0);
  // Year and month are the instant's: the same on both sides.
  assert.deepEqual([east.year, east.month], [west.year, west.month]);
});

test("the southern hemisphere is read like the northern: no latitude enters, a Sydney July birth is in the Goat month", () => {
  const ms = Date.UTC(2026, 6, 15, 0); // 10:00 in Sydney (UTC+10)
  const sydney = fourPillars({ ms, longitude: 151.21, utcOffsetMinutes: 600 });
  const beijing = fourPillars({ ms, longitude: 116.4, utcOffsetMinutes: 480 });
  assert.equal(sydney.month.branch, 7, "Wei, the Goat month (from Xiaoshu, 7 July)");
  assert.deepEqual([sydney.year, sydney.month], [beijing.year, beijing.month]);
});

test("both year animals: by Lichun and by Lunar New Year, which part between them", () => {
  // 1 February 1990, Paris: Lunar New Year was 27 January, Lichun 4 February.
  const a = fourPillars({ ms: Date.UTC(1990, 1, 1, 11), longitude: PARIS, utcOffsetMinutes: 60 });
  assert.deepEqual(a.animal, { lichun: 5, lunarNewYear: 6 }, "Snake by Lichun, Horse by New Year");
  // 2 February 2023, Lyon: New Year 22 January, Lichun 4 February.
  const b = fourPillars({ ms: Date.UTC(2023, 1, 2, 11), longitude: 4.8357, utcOffsetMinutes: 60 });
  assert.deepEqual(b.animal, { lichun: 2, lunarNewYear: 3 }, "Tiger by Lichun, Rabbit by New Year");
  // 16 February 2026, 20:00 in Paris: already New Year's Day in China (03:00),
  // but a reader born in Paris that evening was born on the eve, the year of the Snake.
  const eve = fourPillars({ ms: Date.UTC(2026, 1, 16, 19), longitude: PARIS, utcOffsetMinutes: 60 });
  assert.deepEqual([eve.lunar.year, eve.lunar.month, eve.lunar.day], [2025, 12, 29]);
  assert.deepEqual(eve.animal, { lichun: 6, lunarNewYear: 5 });
  assert.ok(Math.abs(eve.margins.lunarYear + 240) < 1e-6, "four hours before New Year's midnight");
});

test("births within five minutes of a change are flagged, with signed margins in minutes", () => {
  assert.equal(NEAR_MINUTES, 5);
  const lichun = termMs(2026, LICHUN);
  const close = fourPillars({ ms: lichun + 2 * MIN, longitude: 116.4 });
  assert.ok(Math.abs(close.margins.year - 2) < 1e-9 && close.uncertain.year && close.uncertain.month);
  const later = fourPillars({ ms: lichun + 10 * MIN, longitude: 116.4 });
  assert.ok(!later.uncertain.year && !later.uncertain.month);
  assert.ok(fourPillars({ ms: lichun + 10 * MIN, longitude: 116.4 }, { nearMinutes: 15 }).uncertain.year);
  const early = fourPillars({ ms: lichun - 3 * MIN, longitude: 116.4 });
  assert.ok(Math.abs(early.margins.year + 3) < 1e-9 && early.uncertain.year);
  // The hour's edge: 14:58 by the Sun is two minutes before the Monkey hour.
  const edge = fourPillars({ ms: atTrueSolar(0, 2026, 5, 5, 14, 58), longitude: 0 });
  assert.ok(Math.abs(edge.margins.hour + 2) < 0.01 && edge.uncertain.hour && !edge.uncertain.day);
});

test("without a birth time: no hour pillar, and the pillars a time could change are flagged", () => {
  // 3 February 2026 in Paris, cast at local noon: Lichun came at 20:02 UT that evening.
  const p = fourPillars({ ms: Date.UTC(2026, 1, 3, 11), longitude: PARIS, utcOffsetMinutes: 60, timeUnknown: true });
  assert.equal(p.hour, null);
  assert.equal(p.margins.hour, null);
  assert.equal(p.margins.day, null);
  assert.ok(p.uncertain.year && p.uncertain.month && p.uncertain.hour);
  assert.equal(p.uncertain.lunarYear, false, "the calendar date is known");
  // Mid-June in Shanghai: no term near; the day pillar can still turn at 23:00.
  const q = fourPillars({ ms: Date.UTC(2026, 5, 15, 4), longitude: 121.47, utcOffsetMinutes: 480, timeUnknown: true });
  assert.ok(!q.uncertain.year && !q.uncertain.month && q.uncertain.day);
});

test("the civil clock needs the birth's offset", () => {
  assert.throws(() => fourPillars({ ms: Date.UTC(2026, 0, 1), longitude: 0 }, { clock: "civil" }), /offset/);
});

test("births outside the table work the same way (1650 and 2300)", () => {
  for (const year of [1650, 2300]) {
    const lichun = termMs(year, LICHUN);
    assert.equal(new Date(lichun).getUTCMonth(), 1);
    const p = fourPillars({ ms: lichun + HOUR, longitude: 116.4 });
    assert.equal(p.solarYear, year);
    assert.equal(p.year.cycle, (((year - 1984) % 60) + 60) % 60);
    assert.equal(p.month.branch, 2);
  }
});

test("stems and branches make the sixty-cycle both ways", () => {
  for (let c = 0; c < 60; c += 1) {
    const p = pillarOf(c);
    assert.equal(cycleOf(p.stem, p.branch), c);
  }
  assert.equal(pillarOf(-1).cycle, 59);
  assert.throws(() => cycleOf(0, 1), /never meet/);
});

test("a full conversion takes well under a millisecond", () => {
  const births = Array.from({ length: 2000 }, (_, i) => ({
    ms: Date.UTC(1900, 0, 1) + ((i * 7919) % 73000) * DAY + ((i * 104729) % DAY),
    longitude: ((i * 37) % 360) - 180,
    utcOffsetMinutes: 60,
  }));
  for (const b of births.slice(0, 200)) fourPillars(b);
  const t0 = performance.now();
  for (const b of births) fourPillars(b);
  const each = (performance.now() - t0) / births.length;
  // About 0.03 ms on a laptop; the bound leaves room for a slow, busy machine.
  assert.ok(each < 0.5, `${each.toFixed(3)} ms per conversion`);
});
