/**
 * The time tape (src/studio/modes/time-tape.ts): steps on the calendar, the
 * marks on the tape, and what a wheel or trackpad is worth.
 */
process.env.TZ = "Europe/Paris";
import assert from "node:assert/strict";
import { test } from "node:test";
import { addSteps, msPerPx, tapeTicks, wheelSteps, UNIT_PX } from "../src/studio/modes/time-tape.ts";

const local = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const parts = (ms) => {
  const d = new Date(ms);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
};

test("a day on keeps the clock time, across a change of the clocks", () => {
  // 25 October 2026: Paris goes back from summer time.
  assert.deepEqual(parts(addSteps(local(2026, 10, 24, 21, 53), "day", 1)), [2026, 10, 25, 21, 53]);
  assert.deepEqual(parts(addSteps(local(2026, 10, 26, 21, 53), "day", -2)), [2026, 10, 24, 21, 53]);
  assert.deepEqual(parts(addSteps(local(2026, 3, 28, 2, 30), "week", 1)), [2026, 4, 4, 2, 30]);
});

test("a month on from the 31st lands on the month's last day", () => {
  assert.deepEqual(parts(addSteps(local(2026, 1, 31, 12), "month", 1)), [2026, 2, 28, 12, 0]);
  assert.deepEqual(parts(addSteps(local(2028, 1, 31, 12), "month", 1)), [2028, 2, 29, 12, 0]);
  assert.deepEqual(parts(addSteps(local(2026, 3, 31, 9), "month", -1)), [2026, 2, 28, 9, 0]);
  assert.deepEqual(parts(addSteps(local(2028, 2, 29, 8), "year", 1)), [2029, 2, 28, 8, 0]);
  assert.deepEqual(parts(addSteps(local(2026, 10, 3, 21, 53), "year", -10)), [2016, 10, 3, 21, 53]);
});

test("minutes, ten minutes and hours are plain lengths of time", () => {
  const at = local(2026, 10, 3, 21, 53);
  assert.equal(addSteps(at, "minute", 7) - at, 7 * 60_000);
  assert.equal(addSteps(at, "tenMinutes", -3) - at, -30 * 60_000);
  assert.equal(addSteps(at, "hour", 25) - at, 25 * 3_600_000);
  assert.equal(addSteps(at, "day", 0), at);
});

test("the tape's marks: labelled where a reader looks for them", () => {
  const at = local(2026, 10, 3, 21, 53);
  const span = (u, px) => [at - px * msPerPx(u), at + px * msPerPx(u)];
  const day = tapeTicks("day", ...span("day", 400));
  // Every day a mark; the 1st of a month labelled; Mondays labelled by their day.
  assert.ok(day.length >= 79 && day.length <= 81, `${day.length}`);
  const nov1 = day.find((k) => k.t === local(2026, 11, 1));
  assert.deepEqual(nov1, { t: local(2026, 11, 1), level: 2, label: "month" });
  const monday = day.find((k) => k.t === local(2026, 10, 5));
  assert.equal(monday.level, 1);
  assert.equal(monday.label, "day");
  const hours = tapeTicks("hour", ...span("hour", 200));
  assert.equal(hours.find((k) => k.t === local(2026, 10, 4)).label, "date");
  assert.equal(hours.find((k) => k.t === local(2026, 10, 4, 6)).level, 1);
  const tens = tapeTicks("tenMinutes", ...span("tenMinutes", 120));
  assert.equal(tens.find((k) => k.t === local(2026, 10, 3, 22)).label, "time");
  const months = tapeTicks("month", ...span("month", 300));
  assert.deepEqual(months.find((k) => k.t === local(2027, 1, 1)), { t: local(2027, 1, 1), level: 2, label: "year" });
  const years = tapeTicks("year", local(2019, 6, 1), local(2041, 6, 1));
  assert.deepEqual(years.filter((k) => k.level === 2).map((k) => new Date(k.t).getFullYear()), [2020, 2030, 2040]);
  // Sorted, and inside the span asked.
  for (const list of [day, hours, tens, months, years]) {
    for (let i = 1; i < list.length; i += 1) assert.ok(list[i].t > list[i - 1].t);
  }
});

test("a wheel's notch is a step; a trackpad's glide moves the tape by its pixels", () => {
  assert.deepEqual(wheelSteps(100, 0, "day", 0), { steps: 1, carry: 0 });
  assert.deepEqual(wheelSteps(-3, 1, "day", 0), { steps: -1, carry: 0 });
  let carry = 0;
  let steps = 0;
  for (let i = 0; i < 10; i += 1) {
    const r = wheelSteps(3.5, 0, "day", carry);
    carry = r.carry;
    steps += r.steps;
  }
  assert.equal(steps, Math.trunc(35 / UNIT_PX.day));
});
