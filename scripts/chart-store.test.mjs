/**
 * Charts kept on the device without their aspects and midpoints
 * (src/lib/chart/chart-store.ts) come back exactly as cast.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { fullChart, slimChart } from "../src/lib/chart/chart-store.ts";

let seed = 99;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

test("a stored chart is rebuilt exactly, at about a third of the size", async () => {
  let full = 0;
  let slim = 0;
  for (let k = 0; k < 24; k += 1) {
    const y = 1900 + Math.floor(rnd() * 125);
    const date = `${y}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`;
    const time = `${String(Math.floor(rnd() * 24)).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}`;
    const chart = await calculateNatal({ name: "", placeLabel: "x", date, time, latitude: -60 + rnd() * 125, longitude: -180 + rnd() * 360, timeUnknown: k % 7 === 3 });
    const original = JSON.stringify(chart);
    const stored = JSON.stringify(slimChart(chart));
    assert.equal(JSON.stringify(fullChart(JSON.parse(stored))), original, `${date} ${time}`);
    full += original.length;
    slim += stored.length;
  }
  assert.ok(slim < full * 0.5, `stored ${slim} of ${full} bytes`);
});

test("a chart cast under older rules is kept whole until it is recast", async () => {
  const chart = await calculateNatal({ name: "", placeLabel: "Paris", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 });
  const old = { ...chart, meta: { ...chart.meta, calc: undefined } };
  assert.equal(slimChart(old), old);
  assert.equal(fullChart(chart), chart);
});
