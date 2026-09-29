/*
 * The other modes' tables (part 52 of the launch plan):
 *   - transits, progressions and synastry: each row's orb is the residual of
 *     its aspect from the two longitudes, its allowed orb and strength
 *     follow, every contact the table lists is shown once (an aspect to an
 *     axis end folded under its mirror), tightest first;
 *   - without a birth time, what a row says without ~ holds at 00:00 and
 *     23:59 of that day: the natal chart cast at both ends (transits), the
 *     natal chart and its progressions both moved (progressions), each
 *     chart at both ends (synastry, one or both unknown); an exact moment
 *     said to hold moves by less than a minute;
 *   - the overlays: the houses of the synastry pair, marked when a body may
 *     cross a cusp that day;
 *   - the progressed Moon's arc with its laps, the lunation phase;
 *   - Human Design: the centres and their gates, the keys;
 *   - the text and CSV: the first line, no decimal degree in the text.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateHumanDesign, calculateNatal, calculateProgressions, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import { aspectOrb, ASPECT_META } from "../src/lib/chart/constants.ts";
import {
  bothGroups,
  movedArc,
  overlayRows,
  progressedAngleRows,
  progressedGroups,
  progressedMoon,
  progressionAspectRows,
  progressionLinks,
  rangeHolds,
  skyGroups,
  synastryAspectRows,
  transitAspectRows,
  transitLinks,
} from "../src/lib/chart/cross-table.ts";
import {
  progressionTableCsv,
  progressionTextParts,
  synastryTableCsv,
  synastryTextParts,
  transitTableCsv,
  transitTextParts,
} from "../src/lib/chart/cross-export.ts";
import { hdCentreRows, hdKeyRows, hdTableCsv, hdTextParts } from "../src/lib/chart/hd-table.ts";
import { HD_CENTER_IDS } from "../src/lib/chart/human-design.ts";
import { buildSynastry, houseRing } from "../src/lib/chart/synastry.ts";
import { houseFromCusps } from "../src/lib/chart/anatomy.ts";

const TRACE = {
  name: "TraceQA",
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

const OTHER = {
  name: "Other",
  date: "1987-11-03",
  time: "08:40",
  latitude: 51.5074,
  longitude: -0.1278,
  placeLabel: "London, UK",
  houseSystem: "placidus",
};

const wrap180 = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
const residual = (a, b, type) => Math.abs(Math.abs(wrap180(a - b)) - ASPECT_META[type].angle);
/** Which side of exact: −1 inside the aspect's angle, 1 beyond it. */
const side = (a, b, type) => Math.sign(Math.abs(wrap180(a - b)) - ASPECT_META[type].angle);

function natalBodies(natal) {
  return [
    ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
    ...Object.values(natal.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
  ];
}

function pointOf(chart, id) {
  return chart.angles?.[id] ?? chart.planets.find((p) => p.id === id);
}

function transitsFor(natal, utc) {
  return calculateTransits({
    utc: new Date(utc),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natalBodies(natal),
    houseSystem: natal.meta.houseSystem,
  });
}

function progressionsFor(natal, target) {
  return calculateProgressions({
    natalUtc: new Date(natal.meta.utc),
    targetUtc: new Date(target),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natalBodies(natal),
    houseSystem: natal.meta.houseSystem,
  });
}

/** Every listed contact appears once: as a row, or folded under its mirror. */
function assertEachOnce(rows, links) {
  const seen = rows.flatMap((r) => [r.link.id, ...r.twins.map((t) => t.id)]).sort();
  assert.deepEqual(seen, links.map((l) => l.id).sort());
  for (let i = 1; i < rows.length; i += 1) assert.ok(rows[i - 1].orb <= rows[i].orb + 1e-12, "tightest first");
  for (const r of rows) {
    for (const t of r.twins) {
      // A mirror is the same contact to the axis's other end: the same orb.
      assert.ok(Math.abs(t.orb - r.link.orb) < 2e-3, `${t.id} mirrors ${r.link.id}`);
    }
  }
}

test("rangeHolds: out of orb or exact inside the range is not held", () => {
  assert.equal(rangeHolds("trine", 8, { lo: 115, hi: 118 }), true);
  assert.equal(rangeHolds("trine", 8, { lo: 118, hi: 121 }), false, "exact inside");
  assert.equal(rangeHolds("trine", 8, { lo: -121, hi: -119 }), false, "the other side's exact");
  assert.equal(rangeHolds("trine", 8, { lo: 110, hi: 113 }), false, "out of orb at one end");
  assert.equal(rangeHolds("conjunction", 8, { lo: 1, hi: 5 }), true);
  assert.equal(rangeHolds("conjunction", 8, { lo: -1, hi: 5 }), false);
  assert.equal(rangeHolds("opposition", 8, { lo: 175, hi: 179 }), true);
  assert.equal(rangeHolds("opposition", 8, { lo: 178, hi: 182 }), false, "180 inside");
  assert.equal(rangeHolds("opposition", 8, { lo: -179.5, hi: -176 }), true);
  assert.equal(rangeHolds("square", 8, { lo: 0, hi: 60 }), false, "too wide to say");
});

test("transits: orbs from the longitudes, each contact once, the Sky's houses", async () => {
  const natal = await calculateNatal(TRACE);
  const sky = await transitsFor(natal, "2026-09-29T12:00:00Z");
  const links = transitLinks(sky, natal);
  assert.ok(links.length >= 5, `${links.length} transits`);
  const rows = transitAspectRows(sky, natal);
  assertEachOnce(rows, links);
  const moving = new Map(sky.planets.map((p) => [p.id, p]));
  for (const r of rows) {
    const m = moving.get(r.link.a);
    const n = pointOf(natal, r.link.b);
    assert.ok(Math.abs(r.orb - residual(m.ecliptic, n.ecliptic, r.link.type)) < 1e-9, r.link.id);
    assert.equal(r.allowed, aspectOrb(r.link.type, r.link.a, r.link.b));
    assert.ok(r.orb <= r.allowed + 1e-9);
    assert.ok(Math.abs(r.strength - (1 - r.orb / r.allowed)) < 1e-9);
    assert.equal(r.uncertain, false);
    assert.equal(r.exactUncertain, false);
  }
  const groups = skyGroups(sky, natal, "en");
  const ring = houseRing(natal);
  for (const g of groups) {
    for (const row of g.rows) {
      assert.equal(Number(row.house.text), houseFromCusps(row.point.ecliptic, ring), row.point.id);
      assert.equal(row.house.uncertain, false);
    }
  }
  assert.ok(groups.flatMap((g) => g.rows).length >= 12);
});

/** Days at Paris for the no-time checks. */
const DAYS = ["1947-03-30", "1966-06-22", "1985-09-13", "2004-11-04", "2019-04-26"];

test("transits without a birth time: what is not marked holds at 00:00 and 23:59, and its exact moment within a minute", async () => {
  let held = 0;
  let marked = 0;
  let exactHeld = 0;
  for (const date of DAYS) {
    const noon = await calculateNatal({ ...TRACE, name: "NoTime", date, time: "12:00", timeUnknown: true });
    const ends = [await calculateNatal({ ...TRACE, date, time: "00:00" }), await calculateNatal({ ...TRACE, date, time: "23:59" })];
    const at = "2026-09-29T12:00:00Z";
    const sky = await transitsFor(noon, at);
    const skies = [await transitsFor(ends[0], at), await transitsFor(ends[1], at)];
    const moving = new Map(sky.planets.map((p) => [p.id, p]));
    for (const r of transitAspectRows(sky, noon)) {
      const l = r.link;
      if (ANGLE.has(l.b)) assert.equal(r.uncertain, true, `${date} ${l.id} to an angle`);
      if (r.uncertain) {
        marked += 1;
        continue;
      }
      held += 1;
      const m = moving.get(l.a).ecliptic;
      const s0 = side(m, pointOf(noon, l.b).ecliptic, l.type);
      for (const e of ends) {
        const n = pointOf(e, l.b).ecliptic;
        assert.ok(residual(m, n, l.type) <= r.allowed + 1e-9, `${date} ${l.id} out of orb at ${e.meta.time}`);
        assert.equal(side(m, n, l.type), s0, `${date} ${l.id} crosses exact by ${e.meta.time}`);
      }
      if (l.exactUtc && !r.exactUncertain) {
        exactHeld += 1;
        for (const s of skies) {
          const same = s.aspects.find((x) => x.a === l.a && x.b === l.b && x.type === l.type);
          assert.ok(same?.exactUtc, `${date} ${l.id} exact at the day's end`);
          assert.ok(Math.abs(Date.parse(same.exactUtc) - Date.parse(l.exactUtc)) < 60_000, `${date} ${l.id} exact ${same.exactUtc} vs ${l.exactUtc}`);
        }
      }
    }
    for (const g of skyGroups(sky, noon, "en")) for (const row of g.rows) assert.equal(row.house.uncertain, true);
  }
  assert.ok(held > 20, `${held} held`);
  assert.ok(marked > 5, `${marked} marked`);
  assert.ok(exactHeld > 3, `${exactHeld} exact moments held`);
});

const ANGLE = new Set(["ascendant", "midheaven", "descendant", "ic"]);

test("progressions: orbs, each contact once, positions beside the birth ones, the Moon's laps", async () => {
  const natal = await calculateNatal(TRACE);
  const sky = await progressionsFor(natal, "2026-09-29T12:00:00Z");
  const links = progressionLinks(sky, natal);
  assert.ok(links.length >= 3, `${links.length} progressions`);
  const rows = progressionAspectRows(sky, natal);
  assertEachOnce(rows, links);
  for (const r of rows) {
    const m = pointOf(sky, r.link.a);
    const n = pointOf(natal, r.link.b);
    assert.ok(Math.abs(r.orb - residual(m.ecliptic, n.ecliptic, r.link.type)) < 1e-9, r.link.id);
    assert.equal(r.uncertain, false);
  }
  const years = sky.meta.yearsOfLife;
  for (const g of progressedGroups(sky, natal, "en")) {
    for (const row of g.rows) {
      assert.ok(row.natal, row.point.id);
      assert.equal(row.movedDeg, movedArc(row.point.id, row.point.ecliptic, row.natal.ecliptic, years));
      assert.ok(row.motion === null || /a year|°/.test(row.motion.speed) || row.motion.speed.startsWith("+") || row.motion.speed.startsWith("−"));
    }
  }
  // The Moon's arc: about 13°10' a day of the ephemeris for each year of life, whole laps and all.
  const moon = progressedGroups(sky, natal, "en").flatMap((g) => g.rows).find((r) => r.point.id === "moon");
  assert.ok(Math.abs(moon.movedDeg - years * 13.1764) < 40, `the Moon moved ${moon.movedDeg} in ${years} years`);
  assert.ok(moon.movedDeg > 360, "the Moon has lapped the zodiac once in 36 years");
  // The Sun: about a degree a year (the solar arc).
  const sun = progressedGroups(sky, natal, "en").flatMap((g) => g.rows).find((r) => r.point.id === "sun");
  assert.ok(Math.abs(sun.movedDeg - years * 0.9856) < 1.5, `the Sun moved ${sun.movedDeg}`);
  const angles = progressedAngleRows(sky, natal, "en");
  assert.deepEqual(
    angles.map((r) => r.point.id),
    ["ascendant", "midheaven", "descendant", "ic", "vertex"],
  );
  const mc = angles.find((r) => r.point.id === "midheaven");
  assert.ok(Math.abs(mc.movedDeg - years * 0.9856) < 6, `the MC moved ${mc.movedDeg} (Naibod in right ascension)`);
  const lunation = progressedMoon(sky, natal);
  const ps = pointOf(sky, "sun").ecliptic;
  const pm = pointOf(sky, "moon").ecliptic;
  assert.ok(Math.abs(lunation.angle - (((pm - ps) % 360) + 360) % 360) < 1e-9);
  assert.equal(lunation.waxing, lunation.angle < 180);
});

test("progressions without a birth time: what is not marked holds with birth at 00:00 and 23:59", async () => {
  let held = 0;
  let marked = 0;
  for (const date of DAYS) {
    const noon = await calculateNatal({ ...TRACE, name: "NoTime", date, time: "12:00", timeUnknown: true });
    const ends = [await calculateNatal({ ...TRACE, date, time: "00:00" }), await calculateNatal({ ...TRACE, date, time: "23:59" })];
    const at = "2026-09-29T12:00:00Z";
    const sky = await progressionsFor(noon, at);
    const skies = [await progressionsFor(ends[0], at), await progressionsFor(ends[1], at)];
    for (const r of progressionAspectRows(sky, noon)) {
      const l = r.link;
      assert.equal(r.exactUncertain, true, "a progressed exact date moves with the birth time");
      if (ANGLE.has(l.a) || ANGLE.has(l.b)) assert.equal(r.uncertain, true, `${date} ${l.id} involves an angle`);
      if (r.uncertain) {
        marked += 1;
        continue;
      }
      held += 1;
      const s0 = side(pointOf(sky, l.a).ecliptic, pointOf(noon, l.b).ecliptic, l.type);
      for (const [i, e] of ends.entries()) {
        const m = pointOf(skies[i], l.a).ecliptic;
        const n = pointOf(e, l.b).ecliptic;
        assert.ok(residual(m, n, l.type) <= r.allowed + 1e-9, `${date} ${l.id} out of orb with birth at ${e.meta.time}`);
        assert.equal(side(m, n, l.type), s0, `${date} ${l.id} crosses exact with birth at ${e.meta.time}`);
      }
    }
    for (const row of progressedAngleRows(sky, noon, "en")) assert.equal(row.position.uncertain, true);
  }
  assert.ok(held > 5, `${held} held`);
  assert.ok(marked > 5, `${marked} marked`);
});

test("synastry: orbs, each contact once, the overlays are the pair's, both charts side by side", async () => {
  const a = await calculateNatal(TRACE);
  const b = await calculateNatal(OTHER);
  const pair = buildSynastry(a, b);
  const rows = synastryAspectRows(pair, a, b);
  assertEachOnce(rows, pair.majors);
  // An aspect to one end of an axis is folded under the other end's.
  assert.ok(rows.some((r) => r.twins.length), "some mirrors folded");
  for (const r of rows) {
    assert.ok(Math.abs(r.orb - residual(pointOf(a, r.link.a).ecliptic, pointOf(b, r.link.b).ecliptic, r.link.type)) < 1e-9);
    assert.equal(r.uncertain, false);
  }
  const aInB = overlayRows(a, b);
  const pairHouse = new Map(pair.overlays.aInB.map((o) => [o.body, o.house]));
  assert.ok(aInB.length >= 14);
  for (const o of aInB) {
    assert.equal(o.house, pairHouse.get(o.point.id), o.point.id);
    assert.equal(o.uncertain, false);
  }
  const bInA = overlayRows(b, a);
  const pairHouseB = new Map(pair.overlays.bInA.map((o) => [o.body, o.house]));
  for (const o of bInA) assert.equal(o.house, pairHouseB.get(o.point.id), o.point.id);
  const both = bothGroups(a, b).flatMap((g) => g.rows);
  assert.ok(both.find((r) => r.id === "sun" && r.a && r.b));
  assert.ok(!both.some((r) => r.id === "descendant" || r.id === "fortune"), "mirrors and lots left out");
});

test("synastry without a birth time: what is not marked holds at the day's ends, one or both unknown", async () => {
  let held = 0;
  let marked = 0;
  let overlaysHeld = 0;
  const known = await calculateNatal(OTHER);
  for (const date of DAYS.slice(0, 3)) {
    const noon = await calculateNatal({ ...TRACE, name: "NoTime", date, time: "12:00", timeUnknown: true });
    const ends = [await calculateNatal({ ...TRACE, date, time: "00:00" }), await calculateNatal({ ...TRACE, date, time: "23:59" })];
    // One unknown: the other chart known.
    for (const r of synastryAspectRows(buildSynastry(noon, known), noon, known)) {
      if (r.uncertain) {
        marked += 1;
        continue;
      }
      held += 1;
      const l = r.link;
      const b = pointOf(known, l.b).ecliptic;
      const s0 = side(pointOf(noon, l.a).ecliptic, b, l.type);
      for (const e of ends) {
        const a = pointOf(e, l.a).ecliptic;
        assert.ok(residual(a, b, l.type) <= r.allowed + 1e-9, `${date} ${l.id} out of orb at ${e.meta.time}`);
        assert.equal(side(a, b, l.type), s0, `${date} ${l.id} crosses exact at ${e.meta.time}`);
      }
    }
    // Overlays of the unknown chart's bodies into the known chart's houses.
    const ring = houseRing(known);
    for (const o of overlayRows(noon, known)) {
      if (o.uncertain) continue;
      overlaysHeld += 1;
      for (const e of ends) assert.equal(houseFromCusps(pointOf(e, o.point.id).ecliptic, ring), o.house, `${date} ${o.point.id} house at ${e.meta.time}`);
    }
    // Into the unknown chart's houses: always marked.
    for (const o of overlayRows(known, noon)) assert.equal(o.uncertain, true);
    // Both unknown: each at either end of its own day.
    const other = await calculateNatal({ ...OTHER, name: "NoTime2", time: "12:00", timeUnknown: true });
    const otherEnds = [await calculateNatal({ ...OTHER, time: "00:00" }), await calculateNatal({ ...OTHER, time: "23:59" })];
    for (const r of synastryAspectRows(buildSynastry(noon, other), noon, other)) {
      if (r.uncertain) continue;
      held += 1;
      const l = r.link;
      const s0 = side(pointOf(noon, l.a).ecliptic, pointOf(other, l.b).ecliptic, l.type);
      for (const ea of ends) {
        for (const eb of otherEnds) {
          const a = pointOf(ea, l.a).ecliptic;
          const b = pointOf(eb, l.b).ecliptic;
          assert.ok(residual(a, b, l.type) <= r.allowed + 1e-9, `${date} ${l.id} out of orb at ${ea.meta.time}/${eb.meta.time}`);
          assert.equal(side(a, b, l.type), s0, `${date} ${l.id} crosses exact at ${ea.meta.time}/${eb.meta.time}`);
        }
      }
    }
  }
  assert.ok(held > 20, `${held} held`);
  assert.ok(marked > 3, `${marked} marked`);
  assert.ok(overlaysHeld > 10, `${overlaysHeld} overlays held`);
});

test("Human Design: the centres and their gates, the keys", async () => {
  const natal = await calculateNatal(TRACE);
  const hd = await calculateHumanDesign({ natalUtc: new Date(natal.meta.utc) });
  const centres = hdCentreRows(hd, "both");
  assert.deepEqual(centres.map((c) => c.id), [...HD_CENTER_IDS]);
  assert.deepEqual(centres.filter((c) => c.defined).map((c) => c.id).sort(), [...hd.definedCenters].sort());
  const gates = new Set(hd.activations.map((a) => a.gate));
  assert.equal(centres.reduce((n, c) => n + c.gates.length, 0), gates.size);
  assert.ok(centres.every((c) => !c.uncertain));
  const keys = hdKeyRows(hd, "en");
  assert.deepEqual(keys.map((k) => k.key), ["type", "strategy", "authority", "profile", "definition", "cross"]);
  assert.equal(keys[3].value, hd.profile);
  const text = hdTextParts(hd, "both", "en");
  assert.deepEqual(text.map((p) => p.id), ["keys", "activations", "channels", "centres"]);
  assert.equal(text[1].lines.length, 1 + 26);
  assert.equal(text[3].lines.length, 1 + 9);
  const csv = hdTableCsv(hd, "both").split("\n");
  assert.equal(csv[0], "section,field,value");
  assert.equal(csv.filter((l) => l.startsWith("activation,")).length, 1 + 26);
  // One layer: its thirteen.
  assert.equal(hdTextParts(hd, "design", "en")[1].lines.length, 1 + 13);
});

test("text and CSV: the first line, the parts, no decimal degree in the text", async () => {
  const natal = await calculateNatal(TRACE);
  const other = await calculateNatal(OTHER);
  const sky = await transitsFor(natal, "2026-09-29T12:00:00Z");
  const prog = await progressionsFor(natal, "2026-09-29T12:00:00Z");
  const pair = buildSynastry(natal, other);
  for (const locale of ["en", "fr"]) {
    const parts = [
      ...transitTextParts(sky, natal, "TraceQA", locale),
      ...progressionTextParts(prog, natal, "TraceQA", locale),
      ...synastryTextParts(pair, natal, other, { a: "TraceQA", b: "Other" }, locale),
    ];
    for (const p of parts) {
      for (const line of p.lines) {
        assert.ok(!/\d\.\d+°/.test(line), `decimal degree in ${p.id}: ${line}`);
        assert.ok(!/undefined|NaN|\{[a-z]+\}/.test(line), `${p.id}: ${line}`);
      }
    }
  }
  const fr = synastryTextParts(pair, natal, other, { a: "Anna", b: "Ben" }, "fr").find((p) => p.id === "overlays");
  assert.ok(fr.lines.includes("Les corps d’Anna dans les maisons de Ben"), fr.lines.join("\n"));
  for (const csv of [transitTableCsv(sky, natal, "en"), progressionTableCsv(prog, natal, "en"), synastryTableCsv(pair, natal, other, { a: "A", b: "B" })]) {
    const lines = csv.split("\n");
    assert.equal(lines[0], "section,field,value");
    assert.ok(lines.some((l) => l.startsWith("aspect,")));
  }
  const text = transitTextParts(sky, natal, "TraceQA", "en")[0].lines;
  assert.match(text[1], /^Transits · TraceQA · 29 Sept? 2026, 12:00 UT$/);
  assert.ok(text.slice(2).every((l) => / · orb \d+°\d\d' of \d/.test(l)), text.join("\n"));
  const moon = progressionTextParts(prog, natal, "TraceQA", "en").find((p) => p.id === "moon").lines;
  assert.match(moon[1], /^(New Moon|Crescent|First quarter|Gibbous|Full Moon|Disseminating|Last quarter|Balsamic) · \d+°\d\d' past the progressed Sun · (waxing|waning)$/);
  assert.match(moon[2], /^In [A-Z][a-z]+, house \d+ of your chart$/);
});

test("composite without a birth time: each body's day is the midpoints at the day's ends, and what holds is there at both", async () => {
  const { buildComposite } = await import("../src/lib/chart/composite.ts");
  const { aspectHolds, daySpan } = await import("../src/lib/chart/day-checks.ts");
  const known = await calculateNatal(OTHER);
  let held = 0;
  for (const date of DAYS.slice(0, 3)) {
    const noon = await calculateNatal({ ...TRACE, name: "NoTime", date, time: "12:00", timeUnknown: true });
    const ends = [await calculateNatal({ ...TRACE, date, time: "00:00" }), await calculateNatal({ ...TRACE, date, time: "23:59" })];
    const comp = buildComposite(noon, known);
    const compEnds = ends.map((e) => buildComposite(e, known));
    assert.equal(comp.meta.timeUnknown, true);
    const near = (x, y, tol) => Math.abs(((x - y + 540) % 360) - 180) <= tol;
    for (const p of comp.planets) {
      if (p.uncertain || !comp.meta.dayRange?.[p.id]) continue;
      const s = daySpan(comp, p);
      const at = compEnds.map((c) => c.planets.find((q) => q.id === p.id));
      // 23:59 is a minute short of the day's end: half a minute of the unknown chart's body (the midpoint moves half as fast).
      const own = ends[1].planets.find((q) => q.id === p.id);
      const tol = (Math.abs(own?.speed ?? 1) / 2 / 1440) * 1.05 + 1e-6;
      assert.ok(near(s.start, at[0].ecliptic, 1e-6), `${date} ${p.id} at 00:00`);
      assert.ok(near(s.end, at[1].ecliptic, tol), `${date} ${p.id} at 23:59`);
    }
    for (const a of comp.aspects) {
      if (!aspectHolds(comp, a)) continue;
      held += 1;
      for (const c of compEnds) {
        const same = c.aspects.find((x) => x.type === a.type && ((x.a === a.a && x.b === a.b) || (x.a === a.b && x.b === a.a)));
        assert.ok(same, `${date} composite ${a.id} holds but is gone at an end of the day`);
      }
    }
  }
  assert.ok(held > 20, `${held} composite aspects held`);
});

test("the events table's parts: a year by month, a month by week (Monday to Sunday), in the calendar's zone", async () => {
  const { civilOf, periodOf, weekOfMonth } = await import("../src/lib/chart/calendar-periods.ts");
  // September 2026 starts on a Tuesday and has 30 days.
  assert.deepEqual(weekOfMonth(1, 1, 30), { index: 0, from: 1, to: 6 });
  assert.deepEqual(weekOfMonth(6, 6, 30), { index: 0, from: 1, to: 6 });
  assert.deepEqual(weekOfMonth(7, 0, 30), { index: 1, from: 7, to: 13 });
  assert.deepEqual(weekOfMonth(30, 2, 30), { index: 4, from: 28, to: 30 });
  // March 2026 starts on a Sunday: a first week of one day.
  assert.deepEqual(weekOfMonth(1, 6, 31), { index: 0, from: 1, to: 1 });
  assert.deepEqual(weekOfMonth(31, 1, 31), { index: 5, from: 30, to: 31 });
  const end = Date.parse("2026-09-30T12:00:00Z");
  const sep = (iso, tz = "Europe/Paris") => periodOf(Date.parse(iso), "month", tz, "en", end);
  assert.deepEqual(sep("2026-09-29T10:00:00Z"), { id: "w4", label: "28–30 Sept", heading: "28–30 September 2026" });
  assert.equal(sep("2026-09-06T21:30:00Z").id, "w0", "Sunday 23:30 in Paris is still the first week");
  assert.equal(sep("2026-09-06T22:30:00Z").id, "w1", "Monday 00:30 in Paris is the second week");
  assert.equal(sep("2026-09-06T22:30:00Z", "UTC").id, "w0", "in universal time it is still Sunday");
  const year = periodOf(Date.parse("2026-01-01T00:30:00+01:00"), "year", "Europe/Paris", "fr", end);
  assert.deepEqual(year, { id: "m01", label: "Janv", heading: "Janvier 2026" });
  assert.match(periodOf(Date.parse("2026-09-29T10:00:00Z"), "day", "Europe/Paris", "en", end).heading, /^Tuesday,? 29 September 2026$/);
  assert.deepEqual(civilOf(Date.parse("2026-09-29T23:30:00Z"), "Asia/Tokyo"), { y: 2026, m: 9, d: 30, wd: 2 });
});
