/**
 * Chinese astrology in time and between two people (languages plan,
 * part 11): the year ahead and its solar months, the day's animal, two
 * people's animals; their readings and tables. Made-up births only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { dayAnimalAt, dayCycleOf } from "../src/lib/chinese/day-cycle.ts";
import { dayPillarOfDay } from "../src/lib/chinese/pillars.ts";
import { LICHUN, termMs } from "../src/lib/chinese/terms.ts";
import { zodiacChart } from "../src/lib/chinese/zodiac.ts";
import { MEET_KINDS, dayAnimalOf, dayOfDate, meetKinds, pairMeetings, yearAhead, yearAheadOf } from "../src/lib/chinese/zodiac-time.ts";
import { dayAnimalReading, meetingRef, pairMeetingReading, yearRef, yearsReading } from "../src/lib/chinese/zodiac-time-reading.ts";
import { pairTableCsv, yearsTableCsv } from "../src/lib/chinese/zodiac-time-table.ts";
import { CLASH_DAY_TEXT, MONTH_TEXTS, PAIR_TEXTS_TWO, YEAR_TEXTS } from "../src/lib/chinese/zodiac-texts.ts";

const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };
const NOW = Date.UTC(2026, 9, 9, 12);
const full = { script: "hant", show: "full" };
const a = zodiacChart(CAMILLE, { nowMs: NOW });
const b = zodiacChart(SAMPLE_B, { nowMs: NOW });

test("how two animals meet: the same animal first, then the tensions, then the meetings", () => {
  assert.deepEqual(meetKinds(6, 6), ["same", "self-punishment"], "the Horse with the Horse");
  assert.deepEqual(meetKinds(0, 0), ["same"], "the Rat does not punish itself");
  assert.deepEqual(meetKinds(5, 8), ["punishment", "destruction", "harmony"], "Snake and Monkey: the tensions read first");
  assert.deepEqual(meetKinds(6, 0), ["clash"]);
  assert.deepEqual(meetKinds(6, 1), ["harm"]);
  assert.deepEqual(meetKinds(6, 2), ["trine"]);
  assert.deepEqual(meetKinds(6, 9), []);
  assert.deepEqual([...MEET_KINDS].sort(), ["clash", "destruction", "harm", "harmony", "punishment", "same", "self-punishment", "trine"]);
});

test("the year ahead: 2026, the Yang Fire Horse, from Lichun to Lichun, Camille's own year", () => {
  const y = yearAhead(a, 2026);
  assert.deepEqual(y.pillar, { cycle: 42, stem: 2, branch: 6 });
  assert.equal(y.fromMs, termMs(2026, LICHUN));
  assert.equal(y.toMs, termMs(2027, LICHUN));
  assert.equal(new Date(y.fromMs).toISOString().slice(0, 10), "2026-02-03", "Lichun 2026: 4 February in China, the 3rd in UT");
  assert.deepEqual(
    y.yours.map((m) => `${m.place}:${m.kinds.join("+")}`),
    ["year:same+self-punishment", "month:same+self-punishment", "day:", "hour:"],
  );
  // The twelve solar months: the Tiger month (Geng-Yin, the five tigers' rule for a Bing year) to the Ox month in January 2027.
  assert.equal(y.months.length, 12);
  assert.deepEqual(y.months.map((m) => m.pillar.cycle), [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]);
  assert.deepEqual(y.months.map((m) => m.pillar.branch), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]);
  assert.equal(y.months[0].fromMs, y.fromMs);
  assert.equal(y.months[11].toMs, y.toMs);
  for (let i = 1; i < 12; i += 1) assert.equal(y.months[i].fromMs, y.months[i - 1].toMs, `month ${i} follows on`);
  assert.equal(new Date(y.months[11].fromMs).toISOString().slice(0, 7), "2027-01", "the Ox month opens at Xiaohan, in January");
  assert.deepEqual(y.months[10].yours[0].kinds, ["clash"], "the Rat month clashes with the Horse");
  // 2027, the Goat: the Horse's harmony.
  assert.deepEqual(yearAhead(a, 2027).yours[0].kinds, ["harmony"]);
  // Before Lichun, the year is still the last one.
  assert.equal(yearAheadOf(Date.UTC(2026, 0, 20)), 2025);
  assert.equal(yearAheadOf(NOW), 2026);
});

test("what the year ahead says: the year animal's meeting first, the tradition after", () => {
  const y = yearAhead(a, 2026);
  const year = yearsReading(a, y, yearRef, "en", full, "Europe/Paris");
  assert.equal(year.lead, YEAR_TEXTS.same[0]);
  assert.match(year.title, /^2026, Yang Fire Horse$/);
  assert.ok(year.facts.some((f) => f.label === "Tai Sui (the year’s ruler)" && f.value.startsWith("Horse")));
  assert.deepEqual(year.sections.map((s) => s.title), ["Your other animals", "In the tradition"]);
  const rat = yearsReading(a, y, "zky:month:10", "fr", full, "Europe/Paris");
  assert.equal(rat.title, "Le mois du Rat");
  assert.equal(rat.lead, MONTH_TEXTS.clash[1]);
  assert.equal(yearsReading(a, y, "zky:month:12", "en", full), null);
  assert.equal(yearsReading(a, y, "zk:year", "en", full), null, "the natal page's refs are not this page's");
  // A year neither meeting nor opposing: said as such.
  assert.equal(yearsReading(a, yearAhead(a, 2029), yearRef, "en", full).lead, YEAR_TEXTS.none[0], "2029, the Rooster, and the Horse");
});

test("the day's animal: the published count, the small one and the engine's agree", () => {
  assert.deepEqual(dayAnimalOf(2000, 1, 1), { pillar: { cycle: 54, stem: 4, branch: 6 }, clashes: 0 }, "1 January 2000, Wu-Wu, the Horse, clashing with the Rat");
  assert.equal(dayCycleOf(1949, 10, 1), 0, "1 October 1949, Jia-Zi");
  for (let d = -40000; d < 60000; d += 37) {
    const date = new Date(d * 86_400_000);
    const [y, m, dd] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
    assert.equal(dayCycleOf(y, m, dd), dayPillarOfDay(dayOfDate(y, m, dd)).cycle, `${y}-${m}-${dd}`);
  }
  assert.deepEqual(dayAnimalAt(2026, 10, 5), { cycle: 48, branch: 0, clashes: 6 }, "5 October 2026: a Rat day, clashing with the Horse");
});

test("a day of the Calendar: a clash day for a Horse year animal says so first", () => {
  const r = dayAnimalReading("2026-10-05", a, "en", full, "Monday 5 October 2026");
  assert.equal(r.title, "Day of the Rat");
  assert.equal(r.lead, CLASH_DAY_TEXT[0]);
  assert.match(r.kicker, /^Monday 5 October 2026 · /);
  assert.ok(r.facts.some((f) => f.label === "Clashes with" && f.value.startsWith("Horse")));
  const plain = dayAnimalReading("2026-10-06", null, "fr", full, "mardi 6 octobre 2026");
  assert.equal(plain.title, "Jour du Bœuf");
  assert.equal(plain.sections, undefined, "without a chart: the day alone");
  assert.equal(dayAnimalReading("nope", a, "en", full, ""), null);
});

test("two people's animals: the year animals first, then the day animals, then every other meeting", () => {
  const ms = pairMeetings(a, b);
  assert.deepEqual(
    ms.map((m) => `${m.a}-${m.b}:${m.kinds.join("+")}`),
    [
      "year-year:destruction",
      "day-day:clash",
      "year-month:trine",
      "year-hour:clash",
      "month-year:destruction",
      "month-month:trine",
      "month-hour:clash",
      "day-year:trine",
      "hour-day:same",
    ],
  );
  const names = { a: "Camille", b: "Sample B" };
  const r = pairMeetingReading(ms[0], a, b, names, "en", full);
  assert.equal(r.id, meetingRef(ms[0]));
  assert.equal(r.title, "Destruction");
  assert.equal(r.lead, PAIR_TEXTS_TWO.destruction[0]);
  assert.equal(r.kicker, "Camille, year (Horse) – Sample B, year (Rabbit)");
  assert.deepEqual(r.sections.map((s) => s.title), ["Which animals"]);
  assert.match(pairMeetingReading(ms[8], a, b, names, "fr", full).lead, /^Vous partagez cet animal/);
});

test("the tables as CSV", () => {
  const csv = yearsTableCsv(yearAhead(a, 2026)).split("\n");
  assert.ok(csv.includes("year,pillar,bing-wu"), csv.slice(0, 4).join("\n"));
  assert.ok(csv.includes("year,yours.year,same|self-punishment"));
  assert.ok(csv.some((l) => /^month,10,2026-12-0\d.*,geng-zi,庚子,rat,clash,clash,,$/.test(l)), csv.filter((l) => l.startsWith("month,10")).join("\n"));
  const pair = pairTableCsv(pairMeetings(a, b)).split("\n");
  assert.equal(pair[0], "meeting,placeA,placeB,animalA,animalB,kinds");
  assert.equal(pair[1], "meeting,year,year,horse,rabbit,destruction");
  assert.equal(pair.length, 10);
});
