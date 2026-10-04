/**
 * The review of 3 Oct 2026, Calendar (T4, T5): the Time pages in the
 * Calendar's clock, and the calendar file's three choices.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { icsKeeps } from "../src/lib/i18n/calendar-export.ts";
import { zonedMoment, exactWhen } from "../src/lib/chart/cross-export.ts";
import { euroFromMs, msFromEuro, timeFromMs } from "../src/studio/modes/euro-date.ts";

const sky = (ev) => ({ kind: "sky", t: ev.t, id: `sky:${ev.k}`, ev });
const you = (moving) => ({ kind: "you", t: 0, id: "you:x", hit: { moving, type: "square", natal: "sun", exactUtc: "2026-10-05T12:00:00Z" } });

test("the calendar file holds the main events, with your slow transits, or everything", () => {
  const phase = sky({ k: "phase", t: 0, phase: 0, lon: 10 });
  const moonIn = sky({ k: "ingress", t: 0, body: "moon", sign: 3 });
  const marsIn = sky({ k: "ingress", t: 0, body: "mars", sign: 3 });
  assert.equal(icsKeeps(phase, "main"), true);
  assert.equal(icsKeeps(marsIn, "main"), true);
  assert.equal(icsKeeps(moonIn, "main"), false);
  assert.equal(icsKeeps(moonIn, "all"), true);
  assert.equal(icsKeeps(you("saturn"), "main"), false);
  assert.equal(icsKeeps(you("saturn"), "mine"), true);
  assert.equal(icsKeeps(you("venus"), "mine"), false);
  assert.equal(icsKeeps(you("venus"), "all"), true);
});

test("Transits read and write their date and time in the Calendar's clock", () => {
  const ms = Date.parse("2026-10-24T22:30:00Z");
  assert.equal(euroFromMs(ms, "Europe/Paris"), "25/10/2026");
  assert.equal(timeFromMs(ms, "Europe/Paris"), "00:30");
  assert.equal(euroFromMs(ms, "UTC"), "24/10/2026");
  assert.equal(timeFromMs(ms, "UTC"), "22:30");
  assert.equal(msFromEuro("25/10/2026", "00:30", "Europe/Paris"), ms);
  assert.equal(msFromEuro("24/10/2026", "22:30", "UTC"), ms);
});

test("an exact moment in the chosen clock, with its zone; in UT without one", () => {
  const utc = "2026-10-04T11:18:40Z";
  assert.match(zonedMoment(utc, "en", "Europe/Paris"), /4 Oct 2026, 13:18 (CEST|GMT\+2)/);
  assert.match(zonedMoment(utc, "en", "UTC"), /11:18 UT$/);
  assert.match(exactWhen(utc, { kind: "moment", pending: false }, "en"), /11:18 UT$/);
  assert.match(exactWhen(utc, { kind: "moment", pending: false, zone: "America/New_York" }, "en"), /07:18/);
});
