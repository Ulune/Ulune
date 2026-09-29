/*
 * The table without a birth time, and the table as text and CSV (part 48 of
 * the launch plan).
 *
 * A chart without a birth time is cast for 12:00. What the table shows
 * without a ~ must hold at every hour of that day: checked against casts of
 * the same day at 00:00 and 23:59, both ways (what is said to hold is the
 * same at both ends; what is said not to hold differs at one of them).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { hydratePatterns } from "../src/lib/chart/patterns.ts";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import {
  anareticHolds,
  ariesPointHolds,
  aspectHolds,
  daySpan,
  dignityHolds,
  isRough,
  signHolds,
  sunContactHolds,
  unaspectedHolds,
} from "../src/lib/chart/day-checks.ts";
import { essentialDignity, isTraditionalPlanet } from "../src/lib/chart/dignities.ts";
import { chartTextParts, formatChartTableCsv, formatChartTableText } from "../src/lib/chart/table-export.ts";

const TRACE = {
  name: "TraceQA",
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

/** Days spread over two centuries, one a month apart in the year, at Paris. */
const DAYS = [
  "1921-01-07",
  "1934-02-19",
  "1947-03-30",
  "1958-05-11",
  "1966-06-22",
  "1979-08-02",
  "1985-09-13",
  "1993-10-24",
  "2004-11-04",
  "2011-12-15",
  "2019-04-26",
  "2024-07-18",
];

async function dayOf(date) {
  const noon = await calculateNatal({ ...TRACE, name: "NoTime", date, time: "12:00", timeUnknown: true });
  const start = await calculateNatal({ ...TRACE, date, time: "00:00" });
  const end = await calculateNatal({ ...TRACE, date, time: "23:59" });
  return { noon, ends: [start, end] };
}

const pointOf = (chart, id) => chart.planets.find((p) => p.id === id);
const sameAspect = (chart, a) =>
  chart.aspects.find((x) => x.type === a.type && ((x.a === a.a && x.b === a.b) || (x.a === a.b && x.b === a.a)));

test("the day's range: its two ends are the casts at 00:00 and 24:00", async () => {
  const { noon, ends } = await dayOf(TRACE.date);
  for (const p of noon.planets) {
    const span = daySpan(noon, p);
    if (!span || !noon.meta.dayRange?.[p.id]) continue;
    const a = pointOf(ends[0], p.id);
    const b = pointOf(ends[1], p.id);
    const near = (x, y, tol) => Math.abs(((x - y + 540) % 360) - 180) <= tol;
    assert.ok(near(span.start, a.ecliptic, 1e-6), `${p.id} at 00:00: ${span.start} vs ${a.ecliptic}`);
    // 23:59 is a minute short of the day's end: a minute of the body's motion, at its speed then.
    const minute = (Math.max(Math.abs(p.speed), Math.abs(b.speed)) * 1.01) / 1440 + 1e-6;
    assert.ok(near(span.end, b.ecliptic, minute), `${p.id} at 24:00: ${span.end} vs ${b.ecliptic}`);
  }
});

test("without a birth time, what holds all day is the same at 00:00 and 23:59, and what does not mostly differs", async () => {
  let held = 0;
  let moved = 0;
  let differed = 0;
  for (const date of DAYS) {
    const { noon, ends } = await dayOf(date);
    const flagsNoon = hydratePatterns(noon).flags;
    const flagsEnds = ends.map((e) => hydratePatterns(e).flags);

    // Aspects between bodies (the angles, Vertex and lots never hold).
    for (const a of noon.aspects) {
      const shaky = [a.a, a.b].some((id) => (pointOf(noon, id) ?? noon.angles[id])?.uncertain);
      const holds = aspectHolds(noon, a);
      if (shaky) {
        assert.equal(holds, false, `${date} ${a.id} involves a point that hangs on the time`);
        continue;
      }
      const there = ends.map((e) => sameAspect(e, a));
      if (holds) {
        held += 1;
        for (const [i, x] of there.entries()) {
          assert.ok(x, `${date} ${a.id} holds all day but is gone at ${ends[i].meta.time}`);
          assert.equal(x.applying, a.applying, `${date} ${a.id} holds all day but its phase changes`);
        }
      } else {
        // Marked ~: it may change in the day. Most do by the day's end; the
        // others perfect or turn between two casts, or barely move (a phase
        // the ephemeris cannot promise within the margins).
        moved += 1;
        if (there.some((x) => !x) || there[0].applying !== there[1].applying) differed += 1;
      }
    }

    // A body's own facts: its sign, its degree's dignities, its notes.
    for (const p of noon.planets) {
      if (p.uncertain || !daySpan(noon, p)) continue;
      const at = ends.map((e) => pointOf(e, p.id));
      if (signHolds(noon, p)) for (const q of at) assert.equal(q.sign, p.sign, `${date} ${p.id} sign`);
      if (isTraditionalPlanet(p.id) && dignityHolds(noon, p)) {
        for (const q of at) {
          for (const isDay of [true, false]) {
            const d = essentialDignity(p.id, q.ecliptic, isDay);
            const n = essentialDignity(p.id, p.ecliptic, true);
            assert.equal(`${d.own}|${d.debilities}|${d.score}`, `${n.own}|${n.debilities}|${n.score}`, `${date} ${p.id} dignity`);
          }
        }
      }
      const checks = [
        ["anaretic", anareticHolds],
        ["ariesPoint", ariesPointHolds],
        ["cazimi", sunContactHolds],
        ["combust", sunContactHolds],
        ["unaspected", unaspectedHolds],
      ];
      for (const [flag, holdsFor] of checks) {
        if (!flagsNoon[p.id]?.[flag] || !holdsFor(noon, p)) continue;
        for (const [i, f] of flagsEnds.entries()) {
          assert.equal(f[p.id]?.[flag], true, `${date} ${p.id} ${flag} holds all day but not at ${ends[i].meta.time}`);
        }
      }
    }
  }
  assert.ok(held > 100, `${held} aspects hold all day`);
  assert.ok(moved > 20, `${moved} aspects may change in the day`);
  assert.ok(differed >= 0.85 * moved, `${differed} of the ${moved} marked ~ differ at the day's ends`);
});

test("the Moon is roughly placed without a birth time, Pluto is not; with one, nothing is", async () => {
  const { noon } = await dayOf(TRACE.date);
  assert.equal(isRough(noon, pointOf(noon, "moon")), true);
  assert.equal(isRough(noon, pointOf(noon, "pluto")), false);
  assert.equal(isRough(noon, noon.angles.ascendant), true);
  const known = await calculateNatal(TRACE);
  for (const p of known.planets) assert.equal(isRough(known, p), false, p.id);
  for (const a of known.aspects) assert.equal(aspectHolds(known, a), true, a.id);
});

test("the test chart without a birth time, by hand", async () => {
  const { noon, ends } = await dayOf(TRACE.date);
  const text = formatChartTableText(noon, "en");
  // The Sun holds its face all day (+1); Mercury leaves its own term at 6° Gemini.
  assert.match(text, /\nSun · ~24°03' Gemini \(23°34' to 24°32' Gemini over the day\) · ~house 10 .* · face \+1 ·/);
  assert.match(text, /\nMercury · .* · ~domicile, term \+7 ·/);
  const mercury = ends.map((e) => essentialDignity("mercury", pointOf(e, "mercury").ecliptic, true).score);
  assert.deepEqual(mercury, [7, 5]);
  // Venus holds its triplicity by day only: its score needs the sect.
  assert.match(text, /\nVenus · .* · ~domicile, triplicity \+8 ·/);
  // The Sun has no major aspect at noon, but the Moon squares it by midnight.
  assert.match(text, /~no major aspect/);
  assert.equal(hydratePatterns(noon).flags.sun.unaspected, true);
  assert.equal(hydratePatterns(ends[1]).flags.sun.unaspected, false);
  // Jupiter conjunct Chiron holds all day; the Moon sextile Neptune perfects in it.
  assert.match(text, /\nJupiter conjunction Chiron · orb 0°11' of 8° · applying\n/);
  assert.match(text, /\n~Moon sextile Neptune · orb 0°32' of 6° · separating\n/);
  // The facts that need the time.
  assert.match(text, /\nBorn: 15\/06\/1990 · time unknown \(the chart is cast at 12:00 as a stand-in\)/);
  assert.match(text, /\nSect: ~needs the birth time/);
  assert.match(text, /\nHouse 1 · ~5°09' Virgo/);
  assert.match(text, /\n~Hemisphere: /);
  // The balance is weighed on the bodies alone: no Ascendant in the elements.
  const w = hydratePatterns(noon).weights;
  const total = Object.values(w.elements).reduce((s, x) => s + x, 0);
  assert.equal(total, 15.5);
});

test("the text and the page speak one notation: no decimal degree, no °/d", async () => {
  const charts = [
    await calculateNatal(TRACE),
    await calculateNatal({ ...TRACE, timeUnknown: true }),
    await calculateNatal({ ...TRACE, name: "Station", date: "2025-11-09", time: "20:00", latitude: 51.5074, longitude: -0.1278, placeLabel: "London" }),
  ];
  for (const chart of charts) {
    for (const locale of ["en", "fr"]) {
      const text = formatChartTableText(chart, locale);
      assert.doesNotMatch(text, /\d[.,]\d+ ?°/, `${chart.meta.name} ${locale}: a decimal degree`);
      assert.doesNotMatch(text, /°\/d/, `${chart.meta.name} ${locale}: °/d`);
      assert.doesNotMatch(text, /undefined|NaN|\{\w+\}/, `${chart.meta.name} ${locale}: a hole in the text`);
      for (const part of chartTextParts(chart, locale)) {
        assert.ok(part.lines.every((l) => l.trim().length > 0), `${part.id} has no blank line`);
      }
    }
  }
  const station = formatChartTableText(charts[2], "en");
  assert.match(station, /\nMercury · 6°51'4\d" Sagittarius · house \d+ · −0°00'\d\d" a day \(retrograde, stationary\) · station retrograde 9 Nov 2025, 19:0\d UT/);
  const fr = formatChartTableText(charts[2], "fr");
  assert.match(fr, /station rétrograde 9 nov\. 2025,? (à )?19:0\d UT/);
});

test("the CSV keeps its first line, full decimals, and the new facts", async () => {
  const known = await calculateNatal(TRACE);
  const csv = formatChartTableCsv(known, "en").split("\n");
  assert.equal(csv[0], "section,field,value");
  const field = (rows, name) => rows.find((l) => l.startsWith(`identity,${name},`))?.split(",")[2];
  assert.equal(field(csv, "timeUnknown"), "0");
  assert.equal(field(csv, "localSiderealTime"), "03:43:07.6");
  assert.equal(field(csv, "moonPhase"), "disseminating");
  const header = csv.find((l) => l.startsWith("point,id,"))?.split(",");
  for (const col of ["swift", "slow", "stationUtc", "stationTurns", "latitude", "oobBy", "dignities", "dignityScore", "angle", "angleDistance", "uncertain", "dayFrom", "dayTo"]) {
    assert.ok(header.includes(col), `point column ${col}`);
  }
  assert.ok(!header.includes("fast"), "fast is now swift");
  const row = (id) => {
    const cells = csv.find((l) => l.startsWith(`point,${id},`)).split(",");
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  };
  assert.equal(row("mercury").dignities, "domicile|term");
  assert.equal(row("mercury").dignityScore, "7");
  assert.equal(row("mercury").angle, "midheaven");
  assert.equal(row("uranus").oob, "1");
  assert.ok(Math.abs(Number(row("uranus").oobBy) - (4 + 17 / 60) / 60) < 1 / 3600, row("uranus").oobBy);
  assert.equal(row("sun").speed.includes("."), true);
  // The angles carry no motion.
  assert.equal(row("ascendant").speed, "");
  // Without a birth time: no time, the stand-in, and the marks.
  const unknown = formatChartTableCsv(await calculateNatal({ ...TRACE, timeUnknown: true }), "en").split("\n");
  assert.equal(field(unknown, "time"), "");
  assert.equal(field(unknown, "castAt"), "12:00");
  assert.equal(field(unknown, "sect"), "");
  const moon = unknown.find((l) => l.startsWith("point,moon,")).split(",");
  assert.equal(moon[header.indexOf("uncertain")], "1");
  assert.ok(Number(moon[header.indexOf("dayFrom")]) > 0);
});
