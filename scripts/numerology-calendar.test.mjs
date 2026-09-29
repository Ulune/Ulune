/*
 * Numerology in the Calendar (part 62 of the launch plan): the personal day,
 * month and year of any date (a birthday and a 1 January crossed), the long
 * cycles' changes on the birthdays they fall on (29 February included), the
 * rows, the calendar file and the readings in both languages; with the plan's
 * made-up person, Camille Marie Laurent, born 15 June 1990.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIcs } from "../src/lib/chart/calendar-ics.ts";
import { calendarRows } from "../src/lib/chart/calendar-rows.ts";
import {
  numerologyChangeReading,
  numerologyDayReading,
  numerologyMonthReading,
  numerologyYearReading,
} from "../src/lib/chart/interpret-calendar.ts";
import { castNumerology, numerologyYear } from "../src/lib/chart/numerology.ts";
import {
  birthdayIn,
  changeId,
  changesBetween,
  changesByDay,
  dayKey,
  numerologyCalendarOf,
  personalDayOn,
  personalMonthOn,
  personalYearOn,
} from "../src/lib/chart/numerology-calendar.ts";
import { calendarIcs } from "../src/lib/i18n/calendar-export.ts";
import { numChangeDetail, numChangeShort, numChangeTitle } from "../src/lib/i18n/calendar-words.ts";

const chartOf = (date) => ({ meta: { date, name: "", placeLabel: "", timezone: "Europe/Paris" } });
const camille = numerologyCalendarOf(chartOf("1990-06-15"));
const NNBSP = " ";

test("No birth date, no numerology in the calendar", () => {
  assert.equal(numerologyCalendarOf(null), null);
  assert.equal(numerologyCalendarOf(chartOf("")), null);
  assert.equal(numerologyCalendarOf(chartOf("15/06/1990")), null);
});

test("Camille's long cycles change on her birthdays, in order", () => {
  const got = camille.changes.map((c) => `${c.day} ${c.kind} ${c.index}: ${c.previous.number} → ${c.value.number} at ${c.age}`);
  assert.deepEqual(got, [
    "2022-06-15 pinnacle 2: 3 → 7 at 32",
    "2022-06-15 challenge 2: 0 → 5 at 32",
    "2023-06-15 period 2: 6 → 6 at 33",
    "2031-06-15 pinnacle 3: 7 → 1 at 41",
    "2031-06-15 challenge 3: 5 → 5 at 41",
    "2040-06-15 pinnacle 4: 1 → 7 at 50",
    "2040-06-15 challenge 4: 5 → 5 at 50",
    "2050-06-15 period 3: 6 → 1 at 60",
  ]);
  assert.deepEqual(
    changesBetween(camille, "2031-01-01", "2031-12-31").map(changeId),
    ["numcycle:pinnacle:3", "numcycle:challenge:3"],
  );
  const june = changesByDay(camille, "2031-06-01", "2031-06-30");
  assert.deepEqual([...june.keys()], ["2031-06-15"]);
  assert.equal(june.get("2031-06-15").length, 2);
  assert.equal(changesBetween(camille, "2026-01-01", "2026-12-31").length, 0);
});

test("The personal day, month and year: 29 September 2026, a birthday and a 1 January crossed", () => {
  assert.deepEqual([personalYearOn(camille, 2026), personalMonthOn(camille, 2026, 9), personalDayOn(camille, 2026, 9, 29)], [4, 4, 6]);
  // The personal year turns on 1 January, not on the birthday (Decoz).
  assert.equal(personalYearOn(camille, 2026), 4);
  assert.deepEqual([personalMonthOn(camille, 2026, 6), personalDayOn(camille, 2026, 6, 14), personalDayOn(camille, 2026, 6, 15)], [1, 6, 7]);
  // 31 December 2026, then 1 January 2027.
  assert.deepEqual([personalYearOn(camille, 2026), personalMonthOn(camille, 2026, 12), personalDayOn(camille, 2026, 12, 31)], [4, 7, 2]);
  assert.deepEqual([personalYearOn(camille, 2027), personalMonthOn(camille, 2027, 1), personalDayOn(camille, 2027, 1, 1)], [5, 6, 7]);
  // The calendar's numbers are the numerology page's, for any day.
  for (const [y, m, d] of [
    [2026, 9, 29],
    [2026, 12, 31],
    [2027, 1, 1],
    [2031, 6, 15],
    [1990, 6, 15],
  ]) {
    const page = castNumerology(chartOf("1990-06-15"), { name: "", calendarYear: y, calendarMonth: m, calendarDay: d });
    assert.deepEqual(
      [personalYearOn(camille, y), personalMonthOn(camille, y, m), personalDayOn(camille, y, m, d)],
      [page.personalYear.number, page.personalMonth.number, page.personalDay.number],
      `${y}-${m}-${d}`,
    );
  }
});

test("The stepper from 1900 to 2100: every year a personal year of 1 to 9, the same in the calendar and on the page", () => {
  const chart = castNumerology(chartOf("1990-06-15"), { name: "Camille Marie Laurent", calendarYear: 2026, calendarMonth: 9, calendarDay: 29 });
  for (let y = 1900; y <= 2100; y += 1) {
    const py = personalYearOn(camille, y);
    assert.ok(py >= 1 && py <= 9, `${y}: ${py}`);
    assert.equal(numerologyYear(chart, y).personalYear.number, py, String(y));
    for (let m = 1; m <= 12; m += 1) {
      const pm = personalMonthOn(camille, y, m);
      assert.ok(pm >= 1 && pm <= 9, `${y}-${m}: ${pm}`);
    }
  }
});

test("Born on 29 February: the changes fall on 1 March in years without a 29th", () => {
  const leapling = numerologyCalendarOf(chartOf("2000-02-29"));
  assert.deepEqual(birthdayIn(leapling.birth, 2001), { year: 2001, month: 3, day: 1 });
  assert.deepEqual(birthdayIn(leapling.birth, 2004), { year: 2004, month: 2, day: 29 });
  assert.deepEqual(birthdayIn(leapling.birth, 2100), { year: 2100, month: 3, day: 1 });
  assert.ok(leapling.changes.length >= 8);
  for (const c of leapling.changes) {
    const leap = (c.year % 4 === 0 && c.year % 100 !== 0) || c.year % 400 === 0;
    assert.equal(c.day, leap ? `${c.year}-02-29` : `${c.year}-03-01`, `${c.kind} ${c.index}`);
  }
  assert.equal(dayKey(2031, 6, 5), "2031-06-05");
});

test("A change is yours: in the rows with your transits on, after the sky's at the same time", () => {
  const change = camille.changes.find((c) => c.kind === "pinnacle" && c.index === 3);
  const t = Date.UTC(2031, 5, 14, 22); // midnight in Paris
  const num = [{ kind: "num", t, id: changeId(change), change }];
  const sky = [{ k: "phase", t, phase: 2, lon: 84 }];
  const on = calendarRows(sky, [], t - 1, t + 1, { sky: true, yours: true, moon: true }, num);
  assert.deepEqual(on.map((r) => r.kind), ["sky", "num"]);
  const off = calendarRows(sky, [], t - 1, t + 1, { sky: true, yours: false, moon: true }, num);
  assert.deepEqual(off.map((r) => r.kind), ["sky"]);
  const outside = calendarRows([], [], t + 1, t + 2, { sky: true, yours: true, moon: true }, num);
  assert.equal(outside.length, 0);
});

test("In the calendar file, a change is the whole birthday", () => {
  const change = camille.changes.find((c) => c.kind === "pinnacle" && c.index === 3);
  const rows = [{ kind: "num", t: Date.UTC(2031, 5, 14, 22), id: changeId(change), change }];
  const ics = calendarIcs(rows, [], "en", "Europe/Paris", "Ulune 2031").replace(/\r\n /g, "");
  assert.match(ics, /UID:num-pinnacle-3-2031-06-15@ulune\.app/);
  assert.match(ics, /DTSTART;VALUE=DATE:20310615/);
  assert.match(ics, /DTEND;VALUE=DATE:20310616/);
  assert.match(ics, /SUMMARY:Pinnacle 3 begins: 1/);
  assert.match(ics, /DESCRIPTION:Numerology · after 7\\, at 41/);
  const fr = calendarIcs(rows, [], "fr", "Europe/Paris", "Ulune 2031").replace(/\r\n /g, "");
  assert.match(fr, new RegExp(`SUMMARY:Réalisation 3 commence${NNBSP}: 1`));
  // The same item from buildIcs alone, so a second import updates it rather than adding one.
  const again = buildIcs([{ uid: "num-pinnacle-3-2031-06-15@ulune.app", start: 0, days: { from: "2031-06-15", to: "2031-06-16" }, summary: "x" }], "Ulune");
  assert.match(again, /UID:num-pinnacle-3-2031-06-15@ulune\.app/);
});

test("A change's words, long and short, in both languages", () => {
  const p3 = camille.changes.find((c) => c.kind === "pinnacle" && c.index === 3);
  const period2 = camille.changes.find((c) => c.kind === "period" && c.index === 2);
  assert.equal(numChangeTitle(p3, "en"), "Pinnacle 3 begins: 1");
  assert.equal(numChangeTitle(p3, "fr"), `Réalisation 3 commence${NNBSP}: 1`);
  assert.equal(numChangeShort(p3, "en"), "Pinnacle 3 → 1");
  assert.equal(numChangeShort(period2, "fr"), "Cycle de vie 2 → 6");
  assert.equal(numChangeDetail(p3, "en"), "after 7, at 41");
  assert.equal(numChangeDetail(p3, "fr"), "après 7, à 41 ans");
});

test("Readings: the personal day, month and year, and a change, with their steps and links", () => {
  for (const locale of ["en", "fr"]) {
    const day = numerologyDayReading(camille, "2026-09-29", locale);
    assert.equal(day.id, "numday:2026-09-29");
    assert.equal(day.mark, "6");
    assert.ok(day.lead.length > 20);
    assert.deepEqual(
      day.facts.map((f) => f.value),
      [locale === "fr" ? "29 sept. 2026" : "29 Sept 2026", "4 + 2 = 6", "4", "4"],
    );
    assert.deepEqual(day.facts.slice(2).map((f) => f.ref), ["nummonth:2026-09", "numyear:2026"]);

    const month = numerologyMonthReading(camille, "2026-09", locale);
    assert.equal(month.id, "nummonth:2026-09");
    assert.equal(month.facts[1].value, "4 + 9 = 13 → 4");
    assert.equal(month.links, undefined);
    assert.equal(numerologyMonthReading(camille, "2026-13", locale), null);

    const june = numerologyMonthReading(camille, "2031-06", locale);
    assert.deepEqual(june.links.rows.map((r) => r.ref), ["numcycle:pinnacle:3", "numcycle:challenge:3"]);

    const year = numerologyYearReading(camille, 2026, locale);
    assert.equal(year.id, "numyear:2026");
    assert.equal(year.mark, "4");
    assert.equal(year.facts[1].value, "6 + 6 + 1 = 13 → 4");
    assert.equal(year.facts[2].value, "1");
    // A new round opens with a personal year 1 (2032 for Camille).
    assert.equal(numerologyYearReading(camille, 2032, locale).mark, "1");
    assert.ok(numerologyYearReading(camille, 2032, locale).lead.startsWith(locale === "fr" ? "Un nouveau cycle de neuf ans commence" : "A new nine-year round begins"));

    const change = numerologyChangeReading(camille, "numcycle:pinnacle:3", locale);
    assert.equal(change.mark, "1");
    assert.deepEqual(
      change.facts.map((f) => f.value),
      locale === "fr"
        ? ["15 juin 2031, à 41 ans", "15 juin 2040, à 50 ans", "1", "7"]
        : ["15 Jun 2031, at 41", "15 Jun 2040, at 50", "1", "7"],
    );
    assert.deepEqual(change.links.rows.map((r) => r.ref), ["numcycle:challenge:3"]);
    // The last of each runs for the rest of life; a challenge 0 has no number text, and no link out of the calendar.
    const last = numerologyChangeReading(camille, "numcycle:period:3", locale);
    assert.equal(last.facts[1].value, locale === "fr" ? "pour la vie" : "for life");
    for (const r of [day, month, year, change, last]) {
      for (const f of r.facts ?? []) assert.ok(!f.ref || /^(numday|nummonth|numyear|numcycle):/.test(f.ref), f.ref);
      // The calendar's own words (the number texts are part 63's).
      const own = [r.title, ...(r.facts ?? []).flatMap((f) => [f.label, f.value]), ...(r.about?.paragraphs ?? []), ...(r.links?.rows ?? []).flatMap((x) => [x.label, x.detail])];
      if (locale === "fr") for (const s of own) assert.ok(!/ [:;?!]/.test(s), s);
    }
    assert.equal(numerologyChangeReading(camille, "numcycle:pinnacle:9", locale), null);
  }
});
