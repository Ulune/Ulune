/**
 * The app's chart numbers against an independent native Swiss Ephemeris
 * (scripts/fixtures/swiss-reference.json, built by build-swiss-reference.py
 * with pyswisseph from the same ephe/ files): 60 charts from 633 to 2399,
 * Julian dates before 1582, every house system, polar latitudes. Every body
 * (longitude, latitude, speed, declination), cusp, angle, the Vertex, the
 * lots and the fixed stars must agree to a thousandth of an arc-second — the
 * same code compiled twice, so any real gap is a wiring bug in the app.
 * (Not exactly equal: in the few days where two 600-year files overlap, the
 * result depends on which file Swiss has open, ~0.0001″ apart.)
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";

const REF = JSON.parse(readFileSync(new URL("./fixtures/swiss-reference.json", import.meta.url), "utf8"));
/** 0.001″ in degrees. */
const TOL = 1e-3 / 3600;

function arcDiff(a, b) {
  return Math.abs(((a - b + 540) % 360) - 180);
}

function near(label, got, want, tol = TOL) {
  assert.ok(Number.isFinite(got), `${label}: not a number (${got})`);
  const d = arcDiff(got, want);
  assert.ok(d <= tol, `${label}: ${got} vs ${want} (${(d * 3600).toExponential(2)}″)`);
}

test("every body, cusp, angle, lot and star matches native Swiss Ephemeris to 0.001″", async () => {
  assert.equal(REF.cases.length, 60);
  for (const [i, c] of REF.cases.entries()) {
    const chart = await calculateNatal({
      name: `ref ${i}`,
      placeLabel: "reference",
      ...c.input,
      tz: "+00:00",
    });
    const at = `case ${i} (${c.input.date} ${c.input.time} UT, ${c.input.latitude}, ${c.input.longitude}, ${c.input.houseSystem})`;
    assert.ok(Math.abs(chart.meta.jdUt - c.jdUt) < 1e-9, `${at}: JD ${chart.meta.jdUt} vs ${c.jdUt}`);
    assert.equal(chart.meta.houseSystem, c.houseSystem, `${at}: house system used`);
    for (const [id, want] of Object.entries(c.bodies)) {
      const body = chart.planets.find((p) => p.id === id);
      assert.ok(body, `${at}: ${id} missing`);
      near(`${at} ${id} longitude`, body.ecliptic, want.lon);
      near(`${at} ${id} latitude`, body.latitude, want.lat);
      near(`${at} ${id} declination`, body.declination, want.dec);
      // Speeds come from numerical differences inside Swiss: equal to ~1e-7 °/day.
      assert.ok(Math.abs(body.speed - want.speed) < 1e-6, `${at} ${id} speed ${body.speed} vs ${want.speed}`);
    }
    const south = chart.planets.find((p) => p.id === "southnode");
    near(`${at} south node`, south.ecliptic, (c.bodies.northnode.lon + 180) % 360);
    c.cusps.forEach((want, k) => near(`${at} cusp ${k + 1}`, chart.houses[k].ecliptic, want));
    near(`${at} ascendant`, chart.angles.ascendant.ecliptic, c.asc);
    near(`${at} midheaven`, chart.angles.midheaven.ecliptic, c.mc);
    near(`${at} descendant`, chart.angles.descendant.ecliptic, (c.asc + 180) % 360);
    near(`${at} IC`, chart.angles.ic.ecliptic, (c.mc + 180) % 360);
    near(`${at} vertex`, chart.planets.find((p) => p.id === "vertex").ecliptic, c.vertex);
    assert.equal(chart.patterns.isDay, c.isDay, `${at}: sect`);
    near(`${at} fortune`, chart.planets.find((p) => p.id === "fortune").ecliptic, c.fortune, 1e-9);
    near(`${at} spirit`, chart.planets.find((p) => p.id === "spirit").ecliptic, c.spirit, 1e-9);
    for (const [id, want] of Object.entries(c.stars)) {
      near(`${at} star ${id}`, chart.stars.find((s) => s.id === id).ecliptic, want);
    }
    near(`${at} obliquity`, chart.meta.obliquity, c.obliquity);
    assert.equal(chart.meta.birthTime.calendar, c.input.date < "1582-10-15" ? "julian" : "gregorian", `${at}: calendar`);
  }
});
