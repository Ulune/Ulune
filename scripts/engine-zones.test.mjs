// The place search's zones (on-device plan, W1-9, accepted 17 Oct 2026): each place found comes
// with the zone of Ulune's server's own map (geo-tz, the geocoder's zone as a tie-break:
// birth-time.server.ts zonedPlaces), so a chart calculated on the reader's device from that
// zone is the very chart the server calculates. Checked at borders where a geocoder's zone and
// the map part ways: enclaves (Baarle, Llívia), a reservation that keeps summer time inside a
// state that does not (the Navajo Nation), a city given a zone of its own in 2022 (Ciudad
// Juárez), an exclave (Kaliningrad), a state split between two zones (Indiana), a river border
// (Strasbourg and Kehl), and coastal places whose point falls a little offshore, where the
// place's own zone is kept. Each birth is chosen in a year the two zones' clocks differed, so
// a wrong zone would move the chart by an hour or more. Made-up moments, nobody's birth.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Calculator } from "../src/lib/engine/calculate.ts";
import { browserFiles } from "../src/lib/engine/files-browser.ts";
import { ALL_FILES } from "../src/lib/engine/eras.ts";
import { castNatal } from "../src/lib/engine/requests.ts";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { zoneAt, zonedPlaces } from "../src/lib/chart/birth-time.server.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const URLS = { wasm: "/e/swisseph.wasm", files: Object.fromEntries(ALL_FILES.map((name) => [name, `/e/${name}`])) };

/** A device's engine in Node: the worker's own modules, its files read from the repository. */
function device() {
  const fetch = async (url) => {
    const name = new URL(url).pathname.slice(3);
    const path = name === "swisseph.wasm" ? "node_modules/sweph-wasm/dist/wasm/swisseph.wasm" : `ephe/${name}`;
    return new Response(readFileSync(ROOT + path), { headers: { "content-type": name.endsWith(".wasm") ? "application/wasm" : "application/octet-stream" } });
  };
  return new Calculator(browserFiles(URLS, { fetch, caches: null, base: "http://ulune.test/" }));
}
const calc = device();

/** castChart on the server (functions.ts), the place's zone as the hint the page sends. */
async function onServer(birth, zone) {
  const chart = await calculateNatal({ name: "", placeLabel: "", ...birth, ...(zone ? { zone } : {}) });
  return { chart, timeUnknown: false };
}

/** The door on the device with the search's zone (door.ts: { zone, source: "place" }). */
const onDevice = (birth, zone) => castNatal(calc, { ...birth, zone, place: { zone, source: "place" } });

// [label, latitude, longitude, a geocoder's zone for the place, the map's zone, a moment their clocks differed]
const BORDERS = [
  ["Window Rock, Navajo Nation (summer time kept)", 35.6803, -109.0526, "America/Phoenix", "America/Denver", "1995-07-01"],
  ["Baarle-Hertog, a Belgian enclave in the Netherlands", 51.4383, 4.9298, "Europe/Amsterdam", "Europe/Brussels", "1930-05-01"],
  ["Baarle-Nassau, the Dutch village around it", 51.4447, 4.9306, "Europe/Brussels", "Europe/Amsterdam", "1930-05-01"],
  ["Llívia, a Spanish exclave in France", 42.4637, 1.9806, "Europe/Paris", "Europe/Madrid", "1975-07-01"],
  ["Ciudad Juárez, a zone of its own since 2022", 31.6904, -106.4245, "America/Ojinaga", "America/Ciudad_Juarez", "2023-01-15"],
  ["Kaliningrad", 54.7104, 20.4522, "Europe/Vilnius", "Europe/Kaliningrad", "2012-01-15"],
  ["Gary, Indiana's Central-time corner", 41.5934, -87.3464, "America/Indiana/Indianapolis", "America/Chicago", "2010-07-01"],
  ["Strasbourg, across the Rhine from Kehl", 48.5734, 7.7521, "Europe/Berlin", "Europe/Paris", "1977-07-01"],
];

test("each place found comes with the server map's zone; where the map has only sea, the place keeps its own", async () => {
  const hits = BORDERS.map(([label, latitude, longitude, timezone]) => ({ label, latitude, longitude, timezone, country: "" }));
  const zoned = await zonedPlaces(hits);
  assert.deepEqual(
    zoned.map((h) => h.timezone),
    BORDERS.map((b) => b[4]),
  );
  assert.equal(zoned[0].label, hits[0].label, "the rest of the place as it was");
  // A coastal point a little offshore (geo-tz's nautical zones): the place's zone, as the server's casts keep it.
  const coast = await zonedPlaces([{ label: "Biarritz", latitude: 43.49, longitude: -1.62, timezone: "Europe/Paris", country: "" }, { label: "Sylt", latitude: 54.9, longitude: 8.2, timezone: "Europe/Berlin", country: "" }]);
  assert.deepEqual(coast.map((h) => h.timezone), ["Europe/Paris", "Europe/Berlin"]);
  // A zone the map agrees with: the place untouched.
  const paris = { label: "Paris", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris", country: "France" };
  assert.equal((await zonedPlaces([paris]))[0], paris);
});

test("at the borders, a chart on the device from the search's zone is the server's chart, to the last digit", async () => {
  for (const [label, latitude, longitude, geocoder, map, date] of BORDERS) {
    const birth = { date, time: "12:00", latitude, longitude, houseSystem: "placidus" };
    const [{ timezone: zone }] = await zonedPlaces([{ latitude, longitude, timezone: geocoder }]);
    const server = await onServer(birth, zone);
    const mine = await onDevice(birth, zone);
    assert.equal(JSON.stringify(mine), JSON.stringify(server), label);
    assert.equal(mine.chart.meta.timezone, map, label);
    // The server's moment is the one it found from the geocoder's zone before W1-9: its map decided then too.
    const before = await onServer(birth, geocoder);
    assert.equal(before.chart.meta.utc, server.chart.meta.utc, `${label}: the server's moment unchanged`);
    assert.equal(before.chart.meta.timezone, map, label);
    // And the reason for W1-9: the geocoder's zone alone would have put the device's chart elsewhere.
    const naive = await onDevice(birth, geocoder);
    assert.notEqual(naive.chart.meta.utc, server.chart.meta.utc, `${label}: the two zones' clocks differ on ${date}`);
  }
});

test("typed coordinates: the device takes the server's zone for them, and agrees with the server", async () => {
  for (const [label, latitude, longitude, , map, date] of BORDERS.slice(0, 4)) {
    const birth = { date, time: "12:00", latitude, longitude };
    const looked = await zoneAt(latitude, longitude);
    assert.deepEqual(looked, { zone: map, source: "coordinates" }, label);
    const server = await onServer(birth, undefined);
    const mine = await castNatal(calc, { ...birth, place: looked });
    assert.equal(JSON.stringify(mine), JSON.stringify(server), label);
  }
});
