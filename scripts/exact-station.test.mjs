// The exact date near a station (the bug-fix round, item 1; transit-exact.ts, exactOfPass). Found 22 Oct
// 2026: Pluto sextile a relationship's composite Moon read "exact 4 Nov 2025" at one moment and
// "21 Sep 2025" ten minutes later, because the search started Newton from the moment and, at a station,
// the planet's speed is almost nothing. Now every passage is bracketed on a grid the same for every
// moment, and the one shown follows a rule. Real stations, on Ulune's server path and on a device's
// (the same engine, src/lib/engine, its files fetched as a browser would): 2025–2026's Pluto, Saturn's
// two of 2025, Mercury's of November 2025. Every passage listed is checked on the sky itself.
//
// The points are bare longitudes (moments and places only: nobody's birth).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as server from "../src/lib/chart/calculate.server.ts";
import { Calculator } from "../src/lib/engine/calculate.ts";
import { browserFiles } from "../src/lib/engine/files-browser.ts";
import { ALL_FILES } from "../src/lib/engine/eras.ts";
import { castTransits } from "../src/lib/engine/requests.ts";
import { aspectTarget, exactOfPass, findExactDays, lockedAspectResidual } from "../src/lib/chart/transit-exact.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const MIN = 60_000;
const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const CUSPS = Array.from({ length: 12 }, (_, i) => i * 30);

/** A transit request against one point (named the Moon, as a composite's would be). */
const request = (at, point) => ({ at: new Date(at).toISOString(), ...PARIS, natalCusps: CUSPS, natalBodies: [{ id: "moon", name: "Moon", ecliptic: point }], timezone: "Europe/Paris" });

async function serverSky(at, point) {
  const r = request(at, point);
  return server.calculateTransits({ utc: new Date(r.at), latitude: r.latitude, longitude: r.longitude, natalCusps: r.natalCusps, natalBodies: r.natalBodies });
}

/** A device's engine: its files fetched from Ulune's address (here the repository's), as engine-device.test.mjs does. */
function device() {
  const urls = { wasm: "/assets/swisseph.wasm", files: Object.fromEntries(ALL_FILES.map((name) => [name, `/assets/${name}`])) };
  const byUrl = new Map([[urls.wasm, "node_modules/sweph-wasm/dist/wasm/swisseph.wasm"], ...ALL_FILES.map((name) => [`/assets/${name}`, `ephe/${name}`])]);
  const fetch = async (url) => {
    const file = byUrl.get(new URL(url).pathname);
    if (!file) return new Response("not found", { status: 404 });
    const bytes = readFileSync(ROOT + file);
    return new Response(bytes, { headers: { "content-type": file.endsWith(".wasm") ? "application/wasm" : "application/octet-stream", "content-length": String(bytes.length) } });
  };
  return new Calculator(browserFiles(urls, { fetch, caches: null, base: "http://ulune.test/studio" }));
}
const deviceCalc = device();
const deviceSky = (at, point) => castTransits(deviceCalc, request(at, point));

const linkOf = (sky, body) => sky.aspects.find((a) => a.a === body && a.b === "moon");

/** Each passage listed is exact on the sky: within 1″ (a turn that only grazes the point, within 1′). */
async function checkOnSky(link, point) {
  for (const iso of link.exactPasses ?? [link.exactUtc]) {
    const sky = await serverSky(Date.parse(iso), point);
    const lon = sky.planets.find((p) => p.id === link.a).ecliptic;
    const r = Math.min(...[1, -1].map((pole) => Math.abs(lockedAspectResidual(lon, point, aspectTarget(link.type), pole))));
    assert.ok(r < 1 / 3600, `${link.id} at ${iso}: ${(r * 3600).toFixed(3)}″ from exact`);
  }
}

/**
 * Moments ten minutes apart either side of a station: the same exact on each side, and the side the
 * rule gives (drawing away: the last passage, separating; closing: the next, applying).
 */
async function aroundStation({ body, point, station, before, after, passes }) {
  const at = Date.parse(station);
  for (let k = -12; k <= 12; k += 1) {
    if (k === 0) continue;
    const t = at + k * 10 * MIN;
    const link = linkOf(await serverSky(t, point), body);
    assert.ok(link, `${body} at ${new Date(t).toISOString()}`);
    const want = k < 0 ? before : after;
    assert.deepEqual([link.exactUtc, link.applying], want, `${body} ${new Date(t).toISOString()}`);
    if (passes) assert.deepEqual(link.exactPasses, passes, `${body} ${new Date(t).toISOString()}: the passes`);
  }
}

// Pluto, 2024–2026: it passes 1°28′51″ Aquarius five times (Mar and Jun 2024, Jan, Sep and Nov 2025),
// stations direct on 14 Oct 2025 a tenth of a degree short of it, and again on 16 Oct 2026 1.6° past it.
const PLUTO_POINT = 241.4810584; // the point it is sextile to (60° behind)
const PLUTO_PASSES = ["2024-03-11T17:19:34Z", "2024-06-26T05:57:37Z", "2025-01-14T05:14:00Z", "2025-09-21T22:45:46Z", "2025-11-04T23:01:05Z"];

test("the reported case: Pluto sextile the point reads the same exact at every moment of 22 Oct 2026", async () => {
  const seen = new Set();
  const t0 = Date.parse("2026-10-22T08:00:00Z");
  for (let k = 0; k <= 18; k += 1) {
    const link = linkOf(await serverSky(t0 + k * 10 * MIN, PLUTO_POINT), "pluto");
    assert.equal(link.type, "sextile");
    seen.add(JSON.stringify([link.exactUtc, link.applying, link.exactPasses]));
  }
  // Before the fix the same three hours gave 11 Mar 2024, 26 Jun 2024, 14 Jan 2025 and 4 Nov 2025.
  assert.deepEqual([...seen], [JSON.stringify(["2025-11-04T23:01:05Z", false, PLUTO_PASSES])]);
  await checkOnSky(linkOf(await serverSky(t0, PLUTO_POINT), "pluto"), PLUTO_POINT);
});

test("Pluto's stations of 14 Oct 2025 and 16 Oct 2026: the exact follows its motion, not the moment's noise", async () => {
  // 2025: retrograde away from the point after 21 Sep, then direct onto it for 4 Nov.
  await aroundStation({ body: "pluto", point: PLUTO_POINT, station: "2025-10-14T02:52:08Z", before: [PLUTO_PASSES[3], false], after: [PLUTO_PASSES[4], true], passes: PLUTO_PASSES });
  // 2026: it turns 1.6° past the point; closing or not, the pass's last exact is behind it.
  await aroundStation({ body: "pluto", point: PLUTO_POINT, station: "2026-10-16T02:40:19Z", before: [PLUTO_PASSES[4], false], after: [PLUTO_PASSES[4], false], passes: PLUTO_PASSES });
  // Before the pass's first exact it is applying, whichever way it moves that day.
  const early = linkOf(await serverSky(Date.parse("2023-12-01T00:00:00Z"), PLUTO_POINT), "pluto");
  assert.deepEqual([early.exactUtc, early.applying], [PLUTO_PASSES[0], true]);
  const between = linkOf(await serverSky(Date.parse("2025-06-01T00:00:00Z"), PLUTO_POINT), "pluto");
  assert.deepEqual([between.exactUtc, between.applying], [PLUTO_PASSES[3], true], "retrograde, closing on September's passage");
});

test("Saturn's stations of 13 Jul and 28 Nov 2025: three passes over 29° Pisces, the same on each side", async () => {
  const passes = ["2025-05-13T01:09:15Z", "2025-09-14T21:37:05Z", "2026-02-04T14:02:42Z"];
  await aroundStation({ body: "saturn", point: 359, station: "2025-07-13T04:07:20Z", before: [passes[0], false], after: [passes[1], true], passes });
  await aroundStation({ body: "saturn", point: 359, station: "2025-11-28T03:51:34Z", before: [passes[1], false], after: [passes[2], true], passes });
  await checkOnSky(linkOf(await serverSky(Date.parse("2025-07-13T04:07:20Z"), 359), "saturn"), 359);
});

test("Mercury's stations of November 2025: each side of a turn keeps its own exact", async () => {
  // Retrograde on 9 Nov at 6°52′ Sagittarius: 0° Sagittarius was passed on 29 Oct and is met again on 19 Nov.
  await aroundStation({ body: "mercury", point: 240, station: "2025-11-09T19:01:42Z", before: ["2025-10-29T11:02:03Z", false], after: ["2025-11-19T03:20:18Z", true] });
  // Direct on 29 Nov at 20°42′ Scorpio: 25° Scorpio, passed going back, is met again going forward.
  const link = linkOf(await serverSky(Date.parse("2025-11-29T17:38:27Z") - 10 * MIN, 235), "mercury");
  const [back, forward] = link.exactPasses;
  assert.ok(back && forward && link.exactPasses.length === 2, JSON.stringify(link.exactPasses));
  await aroundStation({ body: "mercury", point: 235, station: "2025-11-29T17:38:27Z", before: [back, false], after: [forward, true], passes: link.exactPasses });
  await checkOnSky(link, 235);
});

test("on a device the same stations give the server's answers, to the last digit", async () => {
  const cases = [
    ["2026-10-22T08:00:00Z", PLUTO_POINT],
    ["2026-10-22T08:10:00Z", PLUTO_POINT],
    ["2025-10-14T02:42:08Z", PLUTO_POINT],
    ["2025-10-14T03:02:08Z", PLUTO_POINT],
    ["2025-07-13T03:57:20Z", 359],
    ["2025-07-13T04:17:20Z", 359],
    ["2025-11-09T18:51:42Z", 240],
    ["2025-11-09T19:11:42Z", 240],
  ];
  for (const [at, point] of cases) {
    const here = await deviceSky(Date.parse(at), point);
    const there = await serverSky(Date.parse(at), point);
    assert.equal(JSON.stringify(here), JSON.stringify(there), at);
  }
  const link = linkOf(await deviceSky(Date.parse("2026-10-22T08:20:00Z"), PLUTO_POINT), "pluto");
  assert.deepEqual([link.exactUtc, link.applying, link.exactPasses], ["2025-11-04T23:01:05Z", false, PLUTO_PASSES]);
});

test("the rule on straight lines and turns: closing, the next passage; drawing away, the last; a graze within 1′ counts once", () => {
  const DAY = 86_400_000;
  // A body turning at day 0, 0.5′ short of the point (the residual's least): one passage, at the turn.
  const graze = (d) => ({ lon: 100 + 0.5 / 60 + 0.001 * d * d, speed: 0.002 * d });
  const g = exactOfPass({ at: (ms) => graze(ms / DAY), momentMs: 3 * DAY, natalLon: 100, target: 0, stepDays: 5, maxDays: 400, bound: 8 });
  assert.equal(g.passes.length, 1);
  assert.ok(Math.abs(g.passes[0]) <= MIN, `the turn: ${g.passes[0]}`);
  assert.equal(g.applying, false, "past the turn, drawing away");
  // The same turn 0.02° past the point: two passages either side of it; the moment between them and closing.
  const loop = (d) => ({ lon: 100 - 0.02 + 0.001 * d * d, speed: 0.002 * d });
  const before = exactOfPass({ at: (ms) => loop(ms / DAY), momentMs: -2 * DAY, natalLon: 100, target: 0, stepDays: 5, maxDays: 400, bound: 8 });
  assert.equal(before.passes.length, 2);
  assert.equal(before.applying, false, "between the passages, still going back: the first one, behind");
  assert.ok(before.exactMs < -2 * DAY);
  const after = exactOfPass({ at: (ms) => loop(ms / DAY), momentMs: 2 * DAY, natalLon: 100, target: 0, stepDays: 5, maxDays: 400, bound: 8 });
  assert.equal(after.applying, true, "turned, closing on the second");
  assert.ok(after.exactMs > 2 * DAY);
  assert.deepEqual(after.passes, before.passes, "the same passages from either moment");
  // Within a minute of a passage it is exact now, and the motion at the instant says which way.
  const line = (d) => ({ lon: 10 + 13 * d, speed: 13 });
  assert.equal(findExactDays({ lonAt: line, natalLon: 10 + 13 * (20 / 86_400), target: 0, applying: true, maxDays: 40 }) * 86_400, 20);
});

test("a reading lists every passage of a pass with several, in both languages", async () => {
  const { transitWhen } = await import("../src/lib/chart/interpret-transit.ts");
  const link = { id: "tpluto_sextile_moon", type: "sextile", label: "sextile", level: "major", a: "pluto", b: "moon", aName: "Pluto", bName: "Moon", orb: 1.6, applying: false, exactUtc: PLUTO_PASSES[4], exactPasses: PLUTO_PASSES.slice(2) };
  const en = transitWhen(link, 0.003, "en");
  assert.equal(en.sentence, "Exact on 4 Nov 2025, 23:01 UT. Pluto passes the exact point three times, turning back and forward again: on 14 Jan 2025, 21 Sept 2025 and 4 Nov 2025.");
  assert.equal(en.span, null, "no single span across turns");
  const fr = transitWhen(link, 0.003, "fr");
  assert.equal(fr.sentence, "Exact le 4 nov. 2025, 23:01 UT. Pluton passe trois fois sur le point exact, en rebroussant chemin puis en repartant\u202f: le 14 janv. 2025, le 21 sept. 2025 et le 4 nov. 2025.");
  // One passage: the sentence as before.
  assert.match(transitWhen({ ...link, exactPasses: undefined }, 0.2, "en").sentence, /^Exact on 4 Nov 2025, 23:01 UT; within 1° /);
});
