/**
 * The scrub window (src/lib/chart/sky-window.ts): skies drawn on the client
 * while time moves must stay within half an arcsecond of Swiss, with the same
 * houses, motion and aspects as the exact casts that replace them.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal, calculateProgressions, calculateSkyWindow, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import {
  anglesFromArmc,
  chunkStart,
  chunksAround,
  covers,
  provisionalProgressedSky,
  provisionalTransitSky,
  WINDOW_SAMPLES,
} from "../src/lib/chart/sky-window.ts";
import { progressedUtcFromNatal, yearsOfLife } from "../src/lib/chart/progressions.ts";

const wrap = (x) => ((((x % 360) + 540) % 360) - 180);
let seed = 4242;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const windows = new Map();
async function windowFor(ms) {
  const t0 = chunkStart(ms);
  if (!windows.has(t0)) windows.set(t0, await calculateSkyWindow(t0));
  return windows.get(t0);
}
const rows = (natal) => [
  ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
  ...Object.values(natal.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
];

test("chunks start on fixed boundaries and cover their 32 days", async () => {
  const ms = Date.parse("2026-09-25T13:00:00Z");
  const t0 = chunkStart(ms);
  assert.equal(chunkStart(t0), t0);
  assert.ok(t0 <= ms && ms - t0 < 32 * 86_400_000);
  const win = await windowFor(ms);
  assert.equal(win.n, WINDOW_SAMPLES);
  assert.ok(covers(win, ms) && covers(win, t0) && !covers(win, t0 - 1));
  assert.deepEqual(chunksAround(t0 + 86_400_000), [t0, t0 - 32 * 86_400_000]);
  await assert.rejects(() => calculateSkyWindow(t0 + 1));
});

test("the Ascendant, Midheaven and Vertex are Swiss's own formulas", async () => {
  // Between the tropics the Vertex formula can land on the Antivertex: the
  // cast's Vertex decides (checked here against casts at 30 places).
  for (let k = 0; k < 30; k += 1) {
    const lat = -64 + rnd() * 128;
    const lon = -180 + rnd() * 360;
    const ms = Date.parse("1960-01-01T00:00:00Z") + rnd() * 90 * 365.25 * 86_400_000;
    const natal = await calculateNatal({ name: "", placeLabel: "x", date: "1990-06-15", time: "12:00", latitude: lat, longitude: lon });
    const exact = await calculateTransits({ utc: new Date(ms), latitude: lat, longitude: lon, natalCusps: natal.houses.map((h) => h.ecliptic), natalBodies: [] });
    const sky = provisionalTransitSky(await windowFor(ms), ms, exact.meta, natal.houses.map((h) => h.ecliptic), []);
    const v = sky.planets.find((p) => p.id === "vertex").ecliptic;
    const e = exact.planets.find((p) => p.id === "vertex").ecliptic;
    assert.ok(Math.abs(wrap(v - e)) * 3600 < 0.5, `Vertex ${v} vs ${e} at ${lat}`);
  }
  // The formulas themselves at an exact sidereal time.
  const a = anglesFromArmc(0, 0, 23.44);
  assert.ok(Math.abs(a.mc) < 1e-9 && Math.abs(a.asc - 90) < 1e-9);
});

test("a provisional transit sky is within half an arcsecond of Swiss, with the same aspects", async () => {
  let aspects = 0;
  for (let k = 0; k < 16; k += 1) {
    const lat = -60 + rnd() * 120;
    const lon = -180 + rnd() * 360;
    const ms = Date.parse("1950-01-01T00:00:00Z") + rnd() * 110 * 365.25 * 86_400_000;
    const natal = await calculateNatal({ name: "", placeLabel: "x", date: "1984-11-02", time: "06:30", latitude: lat, longitude: lon });
    const cusps = natal.houses.map((h) => h.ecliptic);
    const exact = await calculateTransits({ utc: new Date(ms), latitude: lat, longitude: lon, natalCusps: cusps, natalBodies: rows(natal) });
    const sky = provisionalTransitSky(await windowFor(ms), ms, exact.meta, cusps, rows(natal));
    assert.ok(sky && sky.meta.provisional);
    assert.deepEqual(sky.planets.map((p) => p.id), exact.planets.map((p) => p.id));
    for (const p of sky.planets) {
      const e = exact.planets.find((x) => x.id === p.id);
      const arcsec = Math.abs(wrap(p.ecliptic - e.ecliptic)) * 3600;
      assert.ok(arcsec <= 0.5, `${p.id} ${arcsec.toFixed(3)}″ off at ${new Date(ms).toISOString()}`);
      assert.equal(p.house, e.house, `${p.id} house`);
      assert.equal(p.retrograde, e.retrograde, `${p.id} motion`);
    }
    assert.deepEqual(sky.aspects.map((a) => a.id).sort(), exact.aspects.map((a) => a.id).sort());
    for (const a of sky.aspects) {
      const e = exact.aspects.find((x) => x.id === a.id);
      assert.ok(Math.abs(a.orb - e.orb) <= 0.0002, `${a.id} orb`);
      assert.equal(a.exactUtc, undefined, "no exact times in a provisional sky");
    }
    aspects += sky.aspects.length;
  }
  assert.ok(aspects > 1000);
});

test("a provisional progressed sky has Swiss's angles and the same aspects", async () => {
  for (let k = 0; k < 8; k += 1) {
    const lat = -60 + rnd() * 120;
    const lon = -180 + rnd() * 360;
    const natal = await calculateNatal({ name: "", placeLabel: "x", date: "1971-04-20", time: "21:10", latitude: lat, longitude: lon });
    const natalUtc = new Date(natal.meta.utc);
    const target = new Date(natalUtc.getTime() + rnd() * 90 * 365.25 * 86_400_000);
    const cusps = natal.houses.map((h) => h.ecliptic);
    const exact = await calculateProgressions({ natalUtc, targetUtc: target, latitude: lat, longitude: lon, natalCusps: cusps, natalBodies: rows(natal), houseSystem: natal.meta.houseSystem });
    const prog = progressedUtcFromNatal(natalUtc, target).getTime();
    const win = await windowFor(prog);
    if (!covers(win, prog + 3_600_000)) continue;
    const sky = provisionalProgressedSky(win, prog, { ...exact.meta, yearsOfLife: yearsOfLife(natalUtc, target) }, cusps, rows(natal));
    assert.ok(sky);
    for (const id of ["ascendant", "midheaven", "descendant", "ic"]) {
      const arcsec = Math.abs(wrap(sky.angles[id].ecliptic - exact.angles[id].ecliptic)) * 3600;
      assert.ok(arcsec < 0.05, `${id} ${arcsec}″`);
    }
    for (const p of sky.planets) {
      const e = exact.planets.find((x) => x.id === p.id);
      assert.ok(Math.abs(wrap(p.ecliptic - e.ecliptic)) * 3600 <= 0.5, `${p.id}`);
    }
    assert.deepEqual(sky.aspects.map((a) => a.id).sort(), exact.aspects.map((a) => a.id).sort());
  }
});
