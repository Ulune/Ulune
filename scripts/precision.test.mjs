/**
 * Precision beyond the ephemeris: how positions are written, and how exact
 * the "exact" times of transits are.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal, calculateTiming, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import { lockedAspectResidual, aspectTarget } from "../src/lib/chart/transit-exact.ts";
import { formatDegree, formatDegreeSeconds, formatSignedDms } from "../src/lib/utils.ts";
import { chartMoved, needsSwissUpgrade } from "../src/lib/chart/visibility.ts";
import { CALC_VERSION } from "../src/lib/chart/constants.ts";

test("positions round to the nearest minute or second but never into the next degree or sign", () => {
  // 14°59′40″ is in the 15th degree: it must not read 15°00′.
  assert.equal(formatDegree(14 + 59 / 60 + 40 / 3600), "14°59'");
  assert.equal(formatDegreeSeconds(14 + 59 / 60 + 40 / 3600), `14°59'40"`);
  // 24°02′59.87″ rounds to the nearest minute within its degree.
  assert.equal(formatDegree(84.049963), "24°03'");
  assert.equal(formatDegreeSeconds(84.049963), `24°03'00"`);
  // 29°59′59.9″ Aries stays in Aries.
  assert.equal(formatDegree(29.99999), "29°59'");
  assert.equal(formatDegreeSeconds(29.999999), `29°59'59"`);
  // Floating-point noise on a whole degree is that degree.
  assert.equal(formatDegree(44.99999999999999), "15°00'");
  assert.equal(formatSignedDms(-23.99999), "−23°59'");
});

const NATAL = [
  { id: "sun", name: "Sun", ecliptic: 84.149454 },
  { id: "moon", name: "Moon", ecliptic: 345.636491 },
  { id: "venus", name: "Venus", ecliptic: 48.802098 },
  { id: "saturn", name: "Saturn", ecliptic: 294.030713 },
  { id: "ascendant", name: "Ascendant", ecliptic: 182.465211 },
  { id: "midheaven", name: "Midheaven", ecliptic: 93.105583 },
];

test("transit exacts land within a second of the true perfecting, outer planets included", async () => {
  const from = new Date("2026-01-01T00:00:00Z");
  const to = new Date("2027-01-01T00:00:00Z");
  const cast = await calculateTiming({ from, to, latitude: 48.8566, longitude: 2.3522, natalBodies: NATAL });
  const slow = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto", "northnode"]);
  const sample = [
    ...cast.hits.filter((h) => slow.has(h.moving)),
    ...cast.hits.filter((h) => !slow.has(h.moving)).slice(0, 60),
  ];
  assert.ok(sample.filter((h) => slow.has(h.moving)).length >= 10, "slow-planet exacts are exercised");
  const worst = { seconds: 0, hit: null };
  for (const hit of sample) {
    const at = new Date(hit.exactUtc);
    const sky = await calculateTransits({
      utc: at,
      latitude: 48.8566,
      longitude: 2.3522,
      natalCusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      natalBodies: [],
    });
    const body = sky.planets.find((p) => p.id === hit.moving);
    const natal = NATAL.find((b) => b.id === hit.natal);
    const target = aspectTarget(hit.type);
    const r = Math.min(
      Math.abs(lockedAspectResidual(body.ecliptic, natal.ecliptic, target, 1)),
      Math.abs(lockedAspectResidual(body.ecliptic, natal.ecliptic, target, -1)),
    );
    // Residual arc ÷ daily motion = how far in time from the true exact (the
    // published time is rounded to the second, so up to half a second).
    const seconds = (r / Math.max(Math.abs(body.speed), 1e-9)) * 86400;
    if (seconds > worst.seconds) Object.assign(worst, { seconds, hit });
  }
  assert.ok(worst.seconds <= 0.6, `worst exact ${worst.seconds.toFixed(3)} s off: ${JSON.stringify(worst.hit)}`);
});

test("out of bounds is measured against the true obliquity of the day", async () => {
  const chart = await calculateNatal({
    name: "",
    placeLabel: "Paris",
    date: "1900-06-21",
    time: "12:00",
    latitude: 48.8566,
    longitude: 2.3522,
  });
  // 1900: ε ≈ 23.452°, not the modern 23.44°.
  assert.ok(Math.abs(chart.meta.obliquity - 23.452) < 0.003, `obliquity ${chart.meta.obliquity}`);
  const sun = chart.planets.find((p) => p.id === "sun");
  assert.ok(sun.declination > 23.44, "the solstice Sun is above the old fixed 23.44° limit");
  assert.equal(chart.patterns.flags.sun.oob, false, "…but never out of its own bounds");
});

test("saved charts are recast once under new rules, and their AI reading goes when the chart moves", async () => {
  const oslo = { name: "", placeLabel: "Oslo", date: "1962-07-01", time: "12:00", latitude: 59.9139, longitude: 10.7522 };
  const now = await calculateNatal(oslo);
  assert.equal(now.meta.calc, CALC_VERSION);
  assert.equal(needsSwissUpgrade(now), false);
  const old = { ...now, meta: { ...now.meta, calc: undefined } };
  assert.equal(needsSwissUpgrade(old), true, "a chart from before this version is recast");
  // A medieval chart lacks Eris and Sedna by nature: not a reason to recast it on every opening.
  const medieval = await calculateNatal({ ...oslo, date: "1400-07-01" });
  assert.ok(!medieval.planets.some((p) => p.id === "eris"));
  assert.equal(needsSwissUpgrade(medieval), false);
  // The old Oslo reading (ICU read 1962 as Berlin, no summer time) was an hour later.
  const shifted = await calculateNatal({ ...oslo, tz: "+01:00" });
  assert.equal(chartMoved(shifted, now), true);
  assert.equal(chartMoved(now, await calculateNatal(oslo)), false);
});
