/**
 * The review of 3 Oct 2026, Pair (P6, P7): the Davison chart's moment and
 * place, cast like a birth; synastry's own, tighter orbs.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { davisonCastInput, davisonMoment } from "../src/lib/chart/davison.ts";
import { aspectOrb, synastryOrb } from "../src/lib/chart/constants.ts";
import { buildSynastry } from "../src/lib/chart/synastry.ts";

const CAMILLE = { name: "Camille Marie Laurent", placeLabel: "Paris", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 };
const YOLANDA = { name: "Yolanda Mary Kyle", placeLabel: "Lyon", date: "1984-11-29", time: "07:45", latitude: 45.764, longitude: 4.8357 };

test("Davison: the moment and the place halfway, cast in universal time", async () => {
  const a = await calculateNatal(CAMILLE);
  const b = await calculateNatal(YOLANDA);
  const m = davisonMoment(a, b);
  const mid = (Date.parse(a.meta.utc) + Date.parse(b.meta.utc)) / 2;
  assert.ok(Math.abs(m.utc.getTime() - mid) <= 1000);
  assert.ok(Math.abs(m.latitude - (48.8566 + 45.764) / 2) < 1e-9);
  assert.ok(Math.abs(m.longitude - (2.3522 + 4.8357) / 2) < 1e-9);
  assert.equal(m.timeUnknown, false);
  const input = davisonCastInput(m);
  assert.match(input.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(input.time, /^\d{2}:\d{2}:\d{2}$/);
  const chart = await calculateNatal({ name: "", placeLabel: "", ...input });
  assert.ok(Math.abs(Date.parse(chart.meta.utc) - m.utc.getTime()) < 1000, `${chart.meta.utc} vs ${m.utc.toISOString()}`);
  // A real sky: its bodies move.
  assert.ok(chart.planets.find((p) => p.id === "moon").speed > 10);
});

test("Davison's longitude goes the shorter way round the date line", async () => {
  const a = { meta: { utc: "2000-01-01T00:00:00Z", latitude: 10, longitude: 170 } };
  const b = { meta: { utc: "2000-01-03T00:00:00Z", latitude: -10, longitude: -170 } };
  const m = davisonMoment(a, b);
  assert.ok(Math.abs(Math.abs(m.longitude) - 180) < 1e-9, String(m.longitude));
  assert.equal(m.latitude, 0);
  assert.equal(m.utc.toISOString(), "2000-01-02T00:00:00.000Z");
});

test("synastry's orbs: tighter than a birth chart's, the lights a degree wider", async () => {
  assert.equal(synastryOrb("square", "mars", "saturn"), 6);
  assert.equal(synastryOrb("square", "sun", "saturn"), 7);
  assert.equal(synastryOrb("sextile", "venus", "mars"), 4);
  assert.equal(synastryOrb("trine", "venus", "ascendant"), Math.min(6, aspectOrb("trine", "venus", "ascendant")));
  for (const t of ["conjunction", "opposition", "trine", "square", "sextile", "quincunx"]) assert.ok(synastryOrb(t, "mars", "jupiter") <= aspectOrb(t, "mars", "jupiter"), t);
  const pair = buildSynastry(await calculateNatal(CAMILLE), await calculateNatal(YOLANDA));
  for (const l of pair.aspects) assert.ok(l.orb <= synastryOrb(l.type, l.a, l.b) + 1e-9, l.id);
});

test("the 192 Incarnation Crosses are named, in both languages (H3)", async () => {
  const { hdCrossName, hdCrossTable } = await import("../src/lib/chart/hd-cross-names.ts");
  const table = hdCrossTable();
  assert.equal(Object.keys(table).length, 64);
  for (let g = 1; g <= 64; g += 1) {
    for (const angle of ["right", "juxtaposition", "left"]) {
      const en = hdCrossName({ angle, personality: [g, 0] }, "en");
      const fr = hdCrossName({ angle, personality: [g, 0] }, "fr");
      assert.ok(en && /Cross of/.test(en), `${g} ${angle}`);
      assert.ok(fr && /^Croix /.test(fr), `${g} ${angle} fr`);
    }
  }
  assert.equal(hdCrossName({ angle: "right", personality: [1, 2] }, "en"), "Right Angle Cross of the Sphinx 4");
  assert.equal(hdCrossName({ angle: "juxtaposition", personality: [2, 1] }, "en"), "Juxtaposition Cross of the Driver");
  assert.equal(hdCrossName({ angle: "left", personality: [2, 1] }, "en"), "Left Angle Cross of Defiance 1");
  assert.equal(hdCrossName({ angle: null, personality: [2, 1] }, "en"), null);
});
