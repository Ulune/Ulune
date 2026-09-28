/**
 * Your transits found on the device (part 54 of the launch plan): the search
 * run on the shared 12-hour chunks must land on the server's Swiss search,
 * find the double touches around stations that the server's longer steps
 * skipped, and the slow bodies' 1° windows must hold every exact pass.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateNatal,
  calculateSkyWindow,
  calculateSkyYear,
  calculateTiming,
  stationNearUtc,
} from "../src/lib/chart/calculate.server.ts";
import {
  CALENDAR_MOVERS,
  foldTwins,
  slowWindowsFromYears,
  transitsFromWindows,
  TWIN_OF,
  windowsCover,
} from "../src/lib/chart/personal-transits.ts";
import { chunkStart, WINDOW_TIMES } from "../src/lib/chart/sky-window.ts";
import { TRANSIT_TABLE_MOVING } from "../src/lib/chart/transit-exact.ts";

const TRACE = {
  name: "TraceQA",
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};
const DAY = 86_400_000;
const FROM = Date.UTC(2026, 0, 1);
const TO = Date.UTC(2027, 0, 1);
const natalOf = (chart) => [...chart.planets, ...Object.values(chart.angles)].map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic }));

const chunks = new Map();
async function chunksFor(from, to) {
  const out = [];
  for (let t0 = chunkStart(from); t0 <= to; t0 += WINDOW_TIMES.CHUNK_MS) {
    if (!chunks.has(t0)) chunks.set(t0, await calculateSkyWindow(t0));
    out.push(chunks.get(t0));
  }
  return out;
}

let shared;
async function year2026() {
  if (!shared) {
    const chart = await calculateNatal(TRACE);
    const natal = natalOf(chart);
    const wins = await chunksFor(FROM - 2 * DAY, TO + 2 * DAY);
    const server = await calculateTiming({ from: new Date(FROM), to: new Date(TO), latitude: TRACE.latitude, longitude: TRACE.longitude, natalBodies: natal });
    shared = { natal, wins, server };
  }
  return shared;
}

test("the device finds the server's 2,784 exacts of 2026 within 5 s, and the double touches it skipped", async () => {
  const { natal, wins, server } = await year2026();
  assert.equal(server.hits.length, 2784);
  const device = transitsFromWindows(wins, natal, FROM, TO, [...TRANSIT_TABLE_MOVING]);
  const key = (h) => `${h.moving}|${h.type}|${h.natal}`;
  const pool = new Map();
  for (const h of device) pool.set(key(h), [...(pool.get(key(h)) ?? []), Date.parse(h.exactUtc)]);
  let worst = 0;
  for (const h of server.hits) {
    const list = pool.get(key(h)) ?? [];
    const t = Date.parse(h.exactUtc);
    const i = list.findIndex((x) => Math.abs(x - t) <= 5000);
    assert.ok(i >= 0, `server exact ${key(h)} ${h.exactUtc} not found on the device`);
    worst = Math.max(worst, Math.abs(list[i] - t));
    list.splice(i, 1);
  }
  const extra = [...pool.entries()].flatMap(([k, list]) => list.map((t) => ({ k, t })));
  assert.equal(extra.length, 20, `extra exacts: ${extra.map((e) => `${e.k} ${new Date(e.t).toISOString()}`).join(", ")}`);
  // Each lies within three days of its body turning: two touches either side of a station.
  for (const e of extra) {
    const moving = e.k.split("|")[0];
    assert.ok(await stationNearUtc(new Date(e.t), moving, 3), `${e.k} ${new Date(e.t).toISOString()} is near a station`);
  }
  assert.ok(worst <= 5000, `worst ${worst} ms`);
});

test("the calendar's movers leave out Lilith and the South Node; paired points fold into one", async () => {
  const { natal, wins } = await year2026();
  const hits = transitsFromWindows(wins, natal, FROM, TO);
  assert.ok(hits.length > 0 && hits.every((h) => CALENDAR_MOVERS.includes(h.moving)));
  assert.ok(!hits.some((h) => h.moving === "lilith" || h.moving === "southnode"));
  const folded = foldTwins(hits);
  const twins = hits.filter((h) => TWIN_OF[h.natal]);
  assert.ok(twins.length > 0);
  // Every twin hit has its partner's at the same moment, so none survives the fold.
  assert.ok(!folded.some((h) => TWIN_OF[h.natal]), "a twin survived");
  assert.equal(folded.length, hits.length - twins.length);
  // Without the Moon: 519 exacts (the plan counted 516 from the server's search,
  // which skipped the node's two touches of the Midheaven square on 17 and
  // 19 Oct and Mercury's sextiles to the Ascendant on 12 and 14 Nov).
  assert.equal(folded.filter((h) => h.moving !== "moon").length, 519);
});

test("no answer from chunks with a gap", async () => {
  const { natal, wins } = await year2026();
  const holed = wins.filter((_, i) => i !== 5);
  assert.equal(windowsCover(holed, FROM, TO), false);
  assert.deepEqual(transitsFromWindows(holed, natal, FROM, TO), []);
});

test("the slow bodies' 1° windows hold every exact pass of the server, near misses included", async () => {
  const { natal, server } = await year2026();
  const years = [await calculateSkyYear(2025), await calculateSkyYear(2026), await calculateSkyYear(2027)];
  assert.equal(years[1].n, 366);
  const windows = slowWindowsFromYears(years, natal, FROM, TO);
  const slow = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode"]);
  const primaries = server.hits.filter((h) => slow.has(h.moving) && !TWIN_OF[h.natal] && !(h.moving === "northnode" && h.natal === "southnode"));
  for (const h of primaries) {
    const t = Date.parse(h.exactUtc);
    const w = windows.find((x) => x.moving === h.moving && x.natal === h.natal && x.type === h.type && x.from <= t && x.to >= t);
    assert.ok(w, `no window for ${h.moving} ${h.type} ${h.natal} ${h.exactUtc}`);
    assert.ok(w.passes.some((p) => Math.abs(p - t) <= 60_000), `${h.moving} ${h.type} ${h.natal} ${h.exactUtc} not among ${w.passes.map((p) => new Date(p).toISOString())}`);
  }
  // Every pass found is the server's, or a touch around a station.
  for (const w of windows) {
    for (const p of w.passes) {
      if (p < FROM || p >= TO) continue;
      const known = primaries.some((h) => h.moving === w.moving && h.natal === w.natal && h.type === w.type && Math.abs(Date.parse(h.exactUtc) - p) <= 60_000);
      if (!known) assert.ok(await stationNearUtc(new Date(p), w.moving, 5), `${w.moving} ${w.type} ${w.natal} ${new Date(p).toISOString()}`);
    }
  }
  // Uranus conjunct Mercury: within 1° from 19 Jul to 4 Nov, exact 23 Aug and 29 Sep.
  const um = windows.find((w) => w.moving === "uranus" && w.natal === "mercury" && w.type === "conjunction");
  assert.ok(um);
  assert.equal(new Date(um.from).toISOString().slice(0, 10), "2026-07-19");
  assert.equal(new Date(um.to).toISOString().slice(0, 10), "2026-11-04");
  assert.deepEqual(um.passes.map((p) => new Date(p).toISOString().slice(0, 10)), ["2026-08-23", "2026-09-29"]);
  // Pluto comes within 2′18″ of a trine to Mercury and turns back at its station of 6 May.
  const pm = windows.find((w) => w.moving === "pluto" && w.natal === "mercury" && w.type === "trine");
  assert.ok(pm && pm.passes.length === 0);
  assert.ok(Math.abs(pm.minOrb * 60 - 2.3) < 0.1, `Pluto's closest: ${(pm.minOrb * 60).toFixed(2)}′`);
});
