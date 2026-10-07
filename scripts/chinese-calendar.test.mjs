/*
 * The Chinese lunisolar calendar (src/lib/chinese/lunar.ts): its rules, its
 * leap months (2033 by name), the calendar's clock (120° E, and Beijing for
 * 1913–1928), and conversions both ways. The day-by-day comparison with the
 * Hong Kong Observatory's tables is in chinese-golden.test.mjs.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BEIJING_FROM_MS,
  BEIJING_TO_MS,
  calendarDayOf,
  calendarOffsetMinutes,
  dayOfLunarDate,
  leapMonthOf,
  lunarDateAt,
  lunarDateOfDay,
  lunarNewYearDay,
  lunarYearMonths,
  suiMonths,
  yearCycleOf,
} from "../src/lib/chinese/lunar.ts";
import { DONGZHI, moonAtOrBefore, moonMs, termMs } from "../src/lib/chinese/terms.ts";

const DAY = 86_400_000;
const day = (y, m, d) => Date.UTC(y, m - 1, d) / DAY;
const iso = (n) => new Date(n * DAY).toISOString().slice(0, 10);
const months = (year) => lunarYearMonths(year).map((m) => `${m.leap ? "L" : ""}${m.month}:${iso(m.start).slice(5)}`);

test("2033: the leap month follows month 11 (閏十一月 from 22 December 2033), not month 7", () => {
  // The famous problem year: the month from 25 August 2033 holds no principal
  // term, but its suì has only 12 months, so it is not a leap month; the next
  // suì has 13, and its first month without a principal term follows month 11.
  assert.equal(leapMonthOf(2033), 11);
  assert.deepEqual(months(2033), [
    "1:01-31", "2:03-01", "3:03-31", "4:04-29", "5:05-28", "6:06-27", "7:07-26",
    "8:08-25", "9:09-23", "10:10-23", "11:11-22", "L11:12-22", "12:01-20",
  ]);
  assert.deepEqual(lunarDateOfDay(day(2033, 8, 25)), { year: 2033, month: 8, leap: false, day: 1, monthLength: 29, yearCycle: 49 });
  assert.equal(lunarDateOfDay(day(2033, 12, 22)).leap, true);
  assert.equal(lunarDateOfDay(day(2034, 1, 20)).month, 12);
  assert.equal(iso(lunarNewYearDay(2034)), "2034-02-19");
});

test("the leap months of recent and coming years are where the tables put them", () => {
  const expected = { 1984: 10, 1987: 6, 1990: 5, 1993: 3, 1995: 8, 1998: 5, 2001: 4, 2004: 2, 2006: 7, 2009: 5, 2012: 4, 2014: 9, 2017: 6, 2020: 4, 2023: 2, 2025: 6, 2028: 5, 2031: 3, 2033: 11, 2036: 6 };
  for (const [year, leap] of Object.entries(expected)) assert.equal(leapMonthOf(+year), leap, `${year}`);
  for (const year of [1985, 1986, 2000, 2018, 2019, 2021, 2022, 2024, 2026, 2027, 2034]) assert.equal(leapMonthOf(year), 0, `${year}`);
  assert.deepEqual(months(2025).slice(5, 8), ["6:06-25", "L6:07-25", "7:08-23"]);
});

test("every suì 1800–2200 has 12 or 13 months of 29 or 30 days, month 11 holds the winter solstice, and a leap month exactly when 13", () => {
  for (let year = 1799; year <= 2200; year += 1) {
    const sui = suiMonths(year);
    assert.ok(sui.length === 12 || sui.length === 13, `${year}: ${sui.length} months`);
    assert.equal(sui.filter((m) => m.leap).length, sui.length === 13 ? 1 : 0, `${year} leap months`);
    for (const m of sui) assert.ok(m.length === 29 || m.length === 30, `${year} month ${m.month}: ${m.length} days`);
    const solstice = calendarDayOf(termMs(year, DONGZHI));
    assert.equal(sui[0].month, 11);
    assert.ok(solstice >= sui[0].start && solstice < sui[0].start + sui[0].length, `${year}: month 11 holds the solstice`);
    // The leap month is the first without a principal term (none falls inside it).
    const leap = sui.find((m) => m.leap);
    if (leap) {
      for (let t = 1; t < 24; t += 2) {
        for (const y of [year, year + 1]) {
          const d = calendarDayOf(termMs(y, t));
          assert.ok(!(d >= leap.start && d < leap.start + leap.length), `${year}: leap month holds term ${t}`);
        }
      }
    }
  }
});

test("Lunar New Year falls between 21 January and 20 February, 1800–2200, and starts the year's sixty-cycle name", () => {
  for (let year = 1800; year <= 2200; year += 1) {
    const ny = new Date(lunarNewYearDay(year) * DAY);
    const md = (ny.getUTCMonth() + 1) * 100 + ny.getUTCDate();
    assert.ok(md >= 121 && md <= 220, `${year}: New Year on ${ny.toISOString().slice(0, 10)}`);
    assert.equal(lunarDateOfDay(lunarNewYearDay(year)).yearCycle, yearCycleOf(year));
  }
  assert.equal(iso(lunarNewYearDay(2026)), "2026-02-17");
  assert.equal(yearCycleOf(2026), 42, "2026 is Bing-Wu");
  assert.equal(yearCycleOf(1984), 0, "1984 is Jia-Zi");
});

test("a lunar date and its day convert both ways, and a date that does not exist is refused", () => {
  for (let n = day(1800, 1, 1); n <= day(2200, 12, 31); n += 97) {
    const l = lunarDateOfDay(n);
    assert.equal(dayOfLunarDate(l.year, l.month, l.day, l.leap), n, iso(n));
  }
  assert.equal(dayOfLunarDate(2033, 11, 1, true), day(2033, 12, 22));
  assert.equal(dayOfLunarDate(2034, 11, 1, true), null, "no leap month 11 in 2034");
  // A 29-day month has no day 30.
  const short = lunarYearMonths(2026).find((m) => m.length === 29);
  assert.equal(dayOfLunarDate(2026, short.month, 30, short.leap), null);
});

test("the calendar's day is China's standard time (120° E), and Beijing's meridian for 1913–1928", () => {
  assert.equal(calendarOffsetMinutes(Date.UTC(2026, 0, 1)), 480);
  assert.equal(calendarOffsetMinutes(Date.UTC(1900, 0, 1)), 480);
  assert.equal(calendarOffsetMinutes(Date.UTC(1920, 5, 1)), 465 + 40 / 60);
  assert.equal(new Date(BEIJING_FROM_MS).toISOString(), "1912-12-31T16:14:20.000Z");
  assert.equal(new Date(BEIJING_TO_MS).toISOString(), "1928-12-31T16:00:00.000Z");
  // Lunar New Year 1916: the new moon came at 00:05 at 120° E but 23:51 at
  // Beijing on 3 February, and the calendars of the day (and HKO's tables)
  // begin the year on the 3rd.
  const k = moonAtOrBefore(Date.UTC(1916, 1, 4));
  const nm = moonMs(k);
  assert.equal(new Date(nm + 8 * 3600_000).toISOString().slice(0, 16), "1916-02-04T00:05");
  assert.equal(iso(lunarNewYearDay(1916)), "1916-02-03");
  // The tenth months of 1914 and 1920 likewise start a day before 120° E would put them.
  assert.deepEqual(lunarDateOfDay(day(1914, 11, 17)), { year: 1914, month: 10, leap: false, day: 1, monthLength: 30, yearCycle: 50 });
  assert.equal(lunarDateOfDay(day(1920, 11, 10)).day, 1);
  // Days are continuous across both changes of clock.
  for (const at of [BEIJING_FROM_MS, BEIJING_TO_MS]) {
    const before = calendarDayOf(at - 1);
    const after = calendarDayOf(at);
    assert.ok(after - before === 0 || after - before === 1);
  }
});

test("the lunar date of an instant is read on China's clock", () => {
  // 16 February 2026, 17:00 UT is already 17 February (New Year's Day) in China.
  assert.deepEqual(lunarDateAt(Date.UTC(2026, 1, 16, 17)), { year: 2026, month: 1, leap: false, day: 1, monthLength: 30, yearCycle: 42 });
  assert.equal(lunarDateAt(Date.UTC(2026, 1, 16, 15, 59)).year, 2025);
});

test("years outside the table follow the same rules, from the analytic Sun and Moon", () => {
  for (const year of [1650, 1700, 1750, 2250, 2300, 2398]) {
    const sui = suiMonths(year);
    assert.ok(sui.length === 12 || sui.length === 13);
    const solstice = calendarDayOf(termMs(year, DONGZHI));
    assert.ok(solstice >= sui[0].start && solstice < sui[0].start + sui[0].length);
    const md = new Date(lunarNewYearDay(year + 1) * DAY).toISOString().slice(5, 10);
    assert.ok(md >= "01-20" && md <= "02-21", `${year + 1}: New Year ${md}`);
  }
});
