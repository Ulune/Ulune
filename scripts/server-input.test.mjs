// What the server accepts (src/lib/chart/server-input.ts): the app's own
// requests pass; oversized, repeated, unknown or out-of-range input is refused
// before any calculation.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BODY_IDS,
  birthSchema,
  humanDesignSchema,
  MAX_PLACE_QUERY,
  placeQuery,
  progressionSchema,
  timingSchema,
  transitSchema,
} from "../src/lib/chart/server-input.ts";

const bodies = BODY_IDS.map((id, i) => ({ id, name: id.slice(0, 1).toUpperCase() + id.slice(1), ecliptic: (i * 13.7) % 360 }));
const cusps = Array.from({ length: 12 }, (_, i) => (i * 30 + 7.5) % 360);
const transit = {
  at: "2026-09-26T12:00:00.000Z",
  latitude: 51.4779,
  longitude: -0.0015,
  natalCusps: cusps,
  natalBodies: bodies,
  houseSystem: "placidus",
};

const ok = (schema, value) => assert.equal(schema.safeParse(value).success, true, JSON.stringify(value).slice(0, 120));
const refused = (schema, value, why) => assert.equal(schema.safeParse(value).success, false, why);

test("the app's own requests pass", () => {
  ok(transitSchema, transit);
  ok(transitSchema, { ...transit, natalBodies: bodies.slice(0, 12), houseSystem: undefined });
  ok(timingSchema, { from: "2026-01-01T00:00:00.000Z", to: "2027-01-01T00:00:00.000Z", latitude: 59.91, longitude: 10.75, natalBodies: bodies });
  ok(progressionSchema, { ...transit, at: undefined, natalUtc: "1987-11-03T22:10:00.000Z", targetUtc: "2026-09-26T00:00:00.000Z" });
  ok(humanDesignSchema, { natalUtc: "2000-01-01T12:00:00.000Z" });
  ok(humanDesignSchema, { natalUtc: new Date(Date.UTC(-500, 5, 1)).toISOString() });
  ok(humanDesignSchema, { natalUtc: "2000-01-01T12:00:00.000Z", spanMinutes: 720 });
  ok(humanDesignSchema, { natalUtc: "2000-01-01T12:00:00.000Z", spanMinutes: 0 });
  ok(birthSchema, { date: "01/01/2000", time: "12:00", latitude: 51.48, longitude: 0, locale: "fr", tz: "Europe/London" });
});

test("a Human Design day is at most half a day either side, in whole minutes", () => {
  refused(humanDesignSchema, { natalUtc: "2000-01-01T12:00:00.000Z", spanMinutes: 721 }, "more than 12 hours");
  refused(humanDesignSchema, { natalUtc: "2000-01-01T12:00:00.000Z", spanMinutes: -1 }, "negative");
  refused(humanDesignSchema, { natalUtc: "2000-01-01T12:00:00.000Z", spanMinutes: 1.5 }, "a fraction");
  refused(humanDesignSchema, { natalUtc: "2000-01-01T12:00:00.000Z", spanMinutes: "720" }, "a string");
});

test("too many, repeated or unknown bodies are refused", () => {
  const many = Array.from({ length: 5000 }, (_, i) => ({ id: "sun", name: "Sun", ecliptic: i % 360 }));
  refused(transitSchema, { ...transit, natalBodies: many }, "5,000 bodies");
  refused(transitSchema, { ...transit, natalBodies: [...bodies, bodies[0]] }, "one body twice");
  refused(transitSchema, { ...transit, natalBodies: [bodies[0], bodies[0]] }, "a repeated id");
  refused(transitSchema, { ...transit, natalBodies: [{ id: "nibiru", name: "X", ecliptic: 1 }] }, "an unknown body");
  refused(transitSchema, { ...transit, natalBodies: [{ id: "sun", name: "S".repeat(41), ecliptic: 1 }] }, "a long name");
  refused(transitSchema, { ...transit, natalCusps: cusps.slice(0, 11) }, "11 cusps");
});

test("numbers must be finite and in range", () => {
  for (const ecliptic of [Number.NaN, Number.POSITIVE_INFINITY, 1e9, -1e9]) {
    refused(transitSchema, { ...transit, natalBodies: [{ id: "sun", name: "Sun", ecliptic }] }, `ecliptic ${ecliptic}`);
  }
  refused(transitSchema, { ...transit, latitude: 91 }, "latitude 91");
  refused(transitSchema, { ...transit, longitude: -180.5 }, "longitude -180.5");
  refused(transitSchema, { ...transit, latitude: "51" }, "latitude as text");
  refused(birthSchema, { date: "01/01/2000", time: "12:00", latitude: Number.NaN, longitude: 0 }, "NaN latitude");
});

test("moments must be dates inside the ephemeris, and short", () => {
  refused(transitSchema, { ...transit, at: "not a date" }, "garbage");
  refused(transitSchema, { ...transit, at: "2400-06-01T00:00:00.000Z" }, "past 2399");
  refused(transitSchema, { ...transit, at: new Date(Date.UTC(-700, 0, 1)).toISOString() }, "before 600 BC");
  refused(transitSchema, { ...transit, at: `2026-09-26T12:00:00.000Z${" ".repeat(100)}` }, "a long string");
  refused(humanDesignSchema, { natalUtc: "" }, "empty");
  refused(birthSchema, { date: "01/01/2000", time: "1".repeat(21), latitude: 0, longitude: 0 }, "a long time");
});

test("the place search is cut to length, never refused", () => {
  const long = placeQuery({ q: "x".repeat(64_000), locale: "fr" });
  assert.equal(long.q.length, MAX_PLACE_QUERY);
  assert.equal(long.locale, "fr");
  assert.deepEqual(placeQuery({ q: { toString: () => "Paris" } }), { q: "", locale: "en" });
  assert.deepEqual(placeQuery(null), { q: "", locale: "en" });
  assert.deepEqual(placeQuery({ q: "  Oslo  ", locale: "xx" }), { q: "Oslo", locale: "en" });
});
