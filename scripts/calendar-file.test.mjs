/**
 * The calendar file (.ics, part 57 of the launch plan): lines folded at 75
 * octets without splitting a character, text escaped, times in UTC, every
 * event read back with its start, and a stable id so a second import updates.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIcs, icsFold, icsText, icsUtc } from "../src/lib/chart/calendar-ics.ts";
import { calendarRows, isMoonOwn } from "../src/lib/chart/calendar-rows.ts";
import { calendarIcs } from "../src/lib/i18n/calendar-export.ts";

/** Lines as a reader sees them: continuations joined back. */
const unfold = (ics) => ics.replace(/\r\n /g, "").split("\r\n").filter(Boolean);

test("folding keeps each line within 75 octets and never splits a character", () => {
  const long = `SUMMARY:${"Éclipse lunaire totale — la Lune traverse l’ombre de la Terre ".repeat(4)}`;
  const folded = icsFold(long);
  for (const line of folded.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.equal(folded.replace(/\r\n /g, ""), long);
  assert.equal(icsFold("SHORT:ok"), "SHORT:ok");
});

test("text is escaped and times are UTC", () => {
  assert.equal(icsText("a, b; c\\d\ne"), "a\\, b\\; c\\\\d\\ne");
  assert.equal(icsUtc(Date.UTC(2026, 8, 28, 2, 48, 7)), "20260928T024807Z");
});

test("events read back: starts, spans, whole days, unique ids", () => {
  const ics = buildIcs(
    [
      { uid: "event-a", start: Date.UTC(2026, 8, 28, 2, 48), summary: "Mars enters Leo" },
      { uid: "event-b", start: Date.UTC(2026, 8, 28, 9, 50), end: Date.UTC(2026, 8, 28, 14, 40), summary: "Moon void of course, until 16:40" },
      { uid: "event-c", start: 0, days: { from: "2026-07-19", to: "2026-11-05" }, summary: "Uranus conjunct your Mercury (1°)", description: "exact 23 Aug\nexact 29 Sept" },
    ],
    "Ulune 2026-09",
    Date.UTC(2026, 8, 28, 12),
  );
  assert.ok(ics.endsWith("\r\n"));
  const lines = unfold(ics);
  assert.equal(lines[0], "BEGIN:VCALENDAR");
  assert.equal(lines.at(-1), "END:VCALENDAR");
  assert.equal(lines.filter((l) => l === "BEGIN:VEVENT").length, 3);
  assert.ok(lines.includes("DTSTART:20260928T024800Z"));
  assert.ok(lines.includes("DTEND:20260928T144000Z"));
  assert.ok(lines.includes("DTSTART;VALUE=DATE:20260719"));
  assert.ok(lines.includes("DTEND;VALUE=DATE:20261105"));
  assert.ok(lines.includes("SUMMARY:Moon void of course\\, until 16:40"));
  assert.ok(lines.includes("DESCRIPTION:exact 23 Aug\\nexact 29 Sept"));
});

test("the calendar's rows become one event each, in both languages", () => {
  const events = [
    { k: "ingress", t: Date.UTC(2026, 8, 28, 2, 48), body: "mars", sign: 4 },
    { k: "void", t: Date.UTC(2026, 8, 28, 9, 50), end: Date.UTC(2026, 8, 28, 14, 40), sign: 0, last: { body: "mercury", type: "opposition" } },
    { k: "ingress", t: Date.UTC(2026, 8, 28, 14, 40), body: "moon", sign: 1 },
    { k: "phase", t: Date.UTC(2026, 9, 3, 13, 25), phase: 3, lon: 100.8 },
  ];
  const hits = [
    { id: "sun-trine-mercury-2026-09-28T16:00:00.000Z", moving: "sun", natal: "mercury", type: "trine", exactUtc: "2026-09-28T16:00:00.000Z" },
    { id: "moon-square-saturn-2026-09-28T04:26:00.000Z", moving: "moon", natal: "saturn", type: "square", exactUtc: "2026-09-28T04:26:00.000Z" },
  ];
  const from = Date.UTC(2026, 8, 1);
  const to = Date.UTC(2026, 9, 1);
  const all = calendarRows(events, hits, from, to, { sky: true, yours: true, moon: true });
  assert.equal(all.length, 5, "the phase of 3 Oct is outside September");
  const noMoon = calendarRows(events, hits, from, to, { sky: true, yours: true, moon: false });
  assert.equal(noMoon.length, 2);
  assert.ok(noMoon.every((r) => r.kind === "you" || !isMoonOwn(r.ev)));
  for (const locale of ["en", "fr"]) {
    const ics = calendarIcs(all, [], locale, "Europe/Paris", "Ulune 2026-09");
    const lines = unfold(ics);
    assert.equal(lines.filter((l) => l === "BEGIN:VEVENT").length, all.length);
    const uids = lines.filter((l) => l.startsWith("UID:"));
    assert.equal(new Set(uids).size, uids.length);
    assert.ok(lines.includes("DTSTART:20260928T024800Z"));
    assert.ok(lines.some((l) => l.startsWith("SUMMARY:Mars") && /Leo|Lion/.test(l)));
    assert.ok(!/undefined|NaN|\{[a-z]+\}/.test(ics));
  }
});
