import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
import { calculateNatal, calculateTiming, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import { wrap360 } from "../src/lib/chart/anatomy.ts";
import {
  applyingFromExactDays,
  aspectPoles,
  findExactsFromSamples,
  isTransitTablePair,
  lockedAspectResidual,
  nextHelloExacts,
  residualForType,
  sampleStepDays,
} from "../src/lib/chart/transit-exact.ts";
import {
  civilFromUtc,
  civilKey,
  hitsInScope,
  localHourFraction,
  scopeBounds,
  timingWhen,
  yearBounds,
} from "../src/lib/chart/timing-window.ts";

const PARIS = {
  name: "Paris fixture",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

/** Timing window recorded for Swiss QA. */
export const TIMING_DAY = "2026-08-27";
export const TIMING_TZ = "Europe/Paris";
export const TIMING_MONTH = { year: 2026, month: 8, day: 1 };
export const TIMING_YEAR = 2026;

function natalBodies(chart) {
  return [
    ...chart.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
    ...Object.values(chart.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
  ];
}

test("timing-ui.json is the source of the calendar table's words", () => {
  const ui = JSON.parse(readFileSync(join(ROOT, "src/lib/i18n/timing-ui.json"), "utf8"));
  // The calendar's events table (part 57): when, what, where, for whom, and UT for Copy and CSV.
  assert.deepEqual(ui.table.columns.en, ["When", "What", "Where", "For", "UT"]);
  assert.deepEqual(ui.table.columns.fr, ["Quand", "Quoi", "Où", "Pour", "UT"]);
  assert.equal(ui.table.applying, undefined, "the A and S columns are gone");
  assert.equal(ui.noNatal.en, "Cast a birth chart first.");
  assert.equal(ui.readingEmpty.en, "Tap a date, a body or an aspect.");
  assert.equal(ui.table.empty.day.en, "Nothing to show on this day.");
  assert.equal(ui.table.empty.month.en, "Nothing to show this month.");
  assert.equal(ui.table.empty.year.en, "Nothing to show this year.");
  assert.equal(ui.scope.day.en, "Day");
  assert.equal(ui.scope.month.en, "Month");
  assert.equal(ui.scope.year.en, "Year");
});

test("findExactsFromSamples locks every linear square in the window", () => {
  const speed = 13;
  const lonAt = (d) => ({ lon: wrap360(0 + speed * d), speed });
  const samples = [];
  for (let d = 0; d <= 40; d += 0.35) samples.push({ days: d, ...lonAt(d) });
  const hits = findExactsFromSamples({
    samples,
    lonAt,
    natalLon: 0,
    target: 90,
    pole: 1,
    minDays: 0,
    maxDays: 40,
  });
  assert.ok(hits.length >= 2, `expected two +90 squares, got ${hits.length}`);
  assert.ok(Math.abs(hits[0] - 90 / speed) < 1 / 1440, `first ${hits[0]}`);
  assert.ok(Math.abs(hits[1] - 450 / speed) < 1 / 1440, `second ${hits[1]}`);
  assert.equal(aspectPoles(90).length, 2);
  assert.equal(aspectPoles(0).length, 1);
  assert.ok(sampleStepDays("moon") < 0.5);
  assert.ok(sampleStepDays("pluto") >= 1);
});

test("Hello-next takes the three soonest remaining exacts in scope", () => {
  const hits = [
    { id: "a", moving: "moon", natal: "saturn", type: "square", exactUtc: "2026-08-27T08:00:00Z" },
    { id: "b", moving: "sun", natal: "mars", type: "trine", exactUtc: "2026-08-27T14:00:00Z" },
    { id: "c", moving: "mercury", natal: "venus", type: "sextile", exactUtc: "2026-08-27T18:00:00Z" },
    { id: "d", moving: "mars", natal: "sun", type: "conjunction", exactUtc: "2026-08-27T21:00:00Z" },
  ];
  const from = Date.parse("2026-08-27T00:00:00Z");
  const to = Date.parse("2026-08-28T00:00:00Z");
  const next = nextHelloExacts(hits, from, to, Date.parse("2026-08-27T12:00:00Z"), 3);
  assert.deepEqual(
    next.map((h) => h.id),
    ["b", "c", "d"],
  );
  const past = nextHelloExacts(hits, from, to, Date.parse("2026-08-28T12:00:00Z"), 3);
  assert.deepEqual(
    past.map((h) => h.id),
    ["a", "b", "c"],
  );
});

test("Hello-next skips the Moon on month and year, keeps it on day", () => {
  const hits = [
    { id: "m1", moving: "moon", natal: "sun", type: "square", exactUtc: "2026-08-27T01:00:00Z" },
    { id: "m2", moving: "moon", natal: "mars", type: "trine", exactUtc: "2026-08-27T02:00:00Z" },
    { id: "m3", moving: "moon", natal: "venus", type: "sextile", exactUtc: "2026-08-27T03:00:00Z" },
    { id: "s1", moving: "sun", natal: "saturn", type: "square", exactUtc: "2026-08-27T10:00:00Z" },
  ];
  const from = Date.parse("2026-08-01T00:00:00Z");
  const to = Date.parse("2026-09-01T00:00:00Z");
  const now = Date.parse("2026-08-27T00:00:00Z");
  const day = nextHelloExacts(hits, from, to, now, 3, "day");
  assert.deepEqual(
    day.map((h) => h.id),
    ["m1", "m2", "m3"],
  );
  const month = nextHelloExacts(hits, from, to, now, 3, "month");
  assert.deepEqual(
    month.map((h) => h.id),
    ["s1"],
  );
  assert.ok(month.every((h) => h.moving !== "moon"));
  const year = nextHelloExacts(hits, from, to, now, 3, "year");
  assert.deepEqual(
    year.map((h) => h.id),
    ["s1"],
  );
  const quiet = nextHelloExacts(hits.slice(0, 3), from, to, now, 3, "month");
  assert.deepEqual(quiet, []);
});

test("day strip hour fraction matches table When", () => {
  const iso = "2026-08-27T12:20:00.000Z";
  const tz = "Europe/Paris";
  const when = timingWhen(iso, tz, "en", "time");
  const frac = localHourFraction(iso, tz);
  assert.ok(frac != null);
  const [hh, mm] = when.split(":").map(Number);
  assert.ok(Number.isFinite(hh) && Number.isFinite(mm), when);
  assert.ok(Math.abs(frac - (hh + mm / 60) / 24) < 1e-6, `${when} vs ${frac}`);
});

async function assertHitsExact(chart, hits, n = 6) {
  const sample = hits.filter((h) => h.moving === "moon" || h.moving === "sun" || h.moving === "mars").slice(0, n);
  const fallback = sample.length ? sample : hits.slice(0, n);
  assert.ok(fallback.length > 0, "need exacts to verify against Swiss");
  for (const hit of fallback) {
    const utc = new Date(hit.exactUtc);
    assert.ok(Number.isFinite(utc.getTime()), hit.id);
    const sky = await calculateTransits({
      utc,
      latitude: chart.meta.latitude,
      longitude: chart.meta.longitude,
      natalCusps: chart.houses.map((h) => h.ecliptic),
      natalBodies: natalBodies(chart),
    });
    const moving = sky.planets.find((p) => p.id === hit.moving);
    const natalP =
      hit.natal in chart.angles ? chart.angles[hit.natal] : chart.planets.find((p) => p.id === hit.natal);
    assert.ok(moving && natalP, `bodies ${hit.id}`);
    const orb = residualForType(moving.ecliptic, natalP.ecliptic, hit.type);
    assert.ok(
      orb <= 1 / 60 + 1e-6,
      `${hit.id} at ${hit.exactUtc} orb ${orb}° (${(orb * 60).toFixed(3)}′)`,
    );
  }
}

test("Paris 14:30 natal — day exacts on 2026-08-27 Europe/Paris match Swiss to 1′", { timeout: 120_000 }, async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "14:30" });
  assert.equal(natal.meta.ephemeris, "swiss");
  assert.equal(natal.meta.zodiac, "tropical");
  assert.equal(natal.meta.lilith, "true");
  assert.equal(natal.meta.houseSystem, "placidus");

  const civil = { year: 2026, month: 8, day: 27 };
  const day = scopeBounds("day", civil, TIMING_TZ);
  const month = scopeBounds("month", TIMING_MONTH, TIMING_TZ);

  const dayCast = await calculateTiming({
    from: day.from,
    to: day.to,
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalBodies: natalBodies(natal),
  });
  assert.ok(dayCast.hits.length > 0, "expected exacts on 2026-08-27");
  assert.ok(
    dayCast.hits.every((h) => ["conjunction", "sextile", "square", "trine", "opposition"].includes(h.type)),
    "majors only",
  );
  for (const hit of dayCast.hits) {
    const t = Date.parse(hit.exactUtc);
    assert.ok(t >= day.from.getTime() && t < day.to.getTime(), `${hit.id} outside the day`);
  }

  const noon = await calculateTransits({
    utc: new Date("2026-08-27T12:00:00.000Z"),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natalBodies(natal),
  });
  const noonMajors = noon.aspects.filter((a) => isTransitTablePair(a) && a.exactUtc);
  const onThisDay = noonMajors.filter((a) => {
    const t = Date.parse(a.exactUtc);
    return t >= day.from.getTime() && t < day.to.getTime();
  });
  for (const a of onThisDay) {
    const found = dayCast.hits.find((h) => h.moving === a.a && h.natal === a.b && h.type === a.type);
    assert.ok(found, `missing transits exact ${a.a} ${a.type} ${a.b} at ${a.exactUtc}`);
    assert.ok(Math.abs(Date.parse(found.exactUtc) - Date.parse(a.exactUtc)) < 120_000, `${a.id} time drift`);
  }

  await assertHitsExact(natal, dayCast.hits);

  const monthCast = await calculateTiming({
    from: month.from,
    to: month.to,
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalBodies: natalBodies(natal),
  });
  const dayInsideMonth = hitsInScope(monthCast.hits, day.from.getTime(), day.to.getTime());
  assert.ok(dayInsideMonth.length >= dayCast.hits.length - 1, "month engine must include the day's exacts");
  const slow = monthCast.hits.filter((h) =>
    ["jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"].includes(h.moving),
  );
  void slow;
  assert.ok(
    monthCast.hits.some((h) => h.moving === "moon"),
    "moon exacts belong on the month calendar",
  );

  const hello = nextHelloExacts(dayCast.hits, day.from.getTime(), day.to.getTime(), day.from.getTime(), 3);
  assert.ok(hello.length <= 3);
  assert.ok(hello.every((h) => h.moving !== "ascendant"));

  const monthHello = nextHelloExacts(
    monthCast.hits,
    month.from.getTime(),
    month.to.getTime(),
    month.from.getTime(),
    3,
    "month",
  );
  assert.ok(monthHello.every((h) => h.moving !== "moon"), "month Hello-next must skip the Moon");
  assert.ok(monthHello.length <= 3);
});

test("Paris 12:00 natal — day exacts on 2026-08-27 still lock to 1′", { timeout: 60_000 }, async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "12:00" });
  const day = scopeBounds("day", { year: 2026, month: 8, day: 27 }, TIMING_TZ);
  const cast = await calculateTiming({
    from: day.from,
    to: day.to,
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalBodies: natalBodies(natal),
  });
  assert.ok(cast.hits.length > 0);
  await assertHitsExact(natal, cast.hits, 4);
  const noonSky = await calculateTransits({
    utc: new Date("2026-08-27T12:00:00.000Z"),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natalBodies(natal),
  });
  const pluto = noonSky.planets.find((p) => p.id === "pluto");
  assert.ok(pluto);
  const mcTrine = residualForType(pluto.ecliptic, natal.angles.midheaven.ecliptic, "trine");
  assert.ok(mcTrine <= 6, `noon 12:00 Pluto–MC trine ${mcTrine}`);
});

test("year 2026 counts are the same exacts engine as the months", { timeout: 180_000 }, async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "14:30" });
  const year = yearBounds(TIMING_YEAR, TIMING_TZ);
  const yearCast = await calculateTiming({
    from: year.from,
    to: year.to,
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalBodies: natalBodies(natal),
  });
  assert.ok(yearCast.hits.length > 0, "expected exacts in 2026");
  assert.ok(yearCast.hits.some((h) => ["jupiter", "saturn", "uranus", "neptune", "pluto"].includes(h.moving)));
  const august = scopeBounds("month", TIMING_MONTH, TIMING_TZ);
  const augustFromYear = hitsInScope(yearCast.hits, august.from.getTime(), august.to.getTime());
  const monthCast = await calculateTiming({
    from: august.from,
    to: august.to,
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalBodies: natalBodies(natal),
  });
  assert.ok(Math.abs(augustFromYear.length - monthCast.hits.length) <= 2, "year August count vs month scan");
  const byMonth = Array.from({ length: 12 }, () => 0);
  for (const hit of yearCast.hits) {
    const c = civilFromUtc(new Date(hit.exactUtc), TIMING_TZ);
    byMonth[c.month - 1] += 1;
  }
  assert.equal(
    byMonth.reduce((a, b) => a + b, 0),
    yearCast.hits.length,
  );
  assert.ok(byMonth[7] > 0, "August 2026 should have exacts");
  await assertHitsExact(natal, yearCast.hits.filter((h) => h.moving === "saturn" || h.moving === "jupiter").slice(0, 3), 3);
});

test("applying flag from exact days is unchanged", () => {
  assert.equal(applyingFromExactDays(12.5, false), true);
  assert.equal(applyingFromExactDays(-12.5, true), false);
  assert.equal(lockedAspectResidual(90, 0, 90, 1) === 0, true);
  assert.equal(civilKey({ year: 2026, month: 8, day: 27 }), "2026-08-27");
});
