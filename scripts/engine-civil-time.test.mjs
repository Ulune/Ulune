// Local birth time → UTC on the device (on-device plan, step 3): civil-time.test.mjs's cases
// read the device's way. The zone is handed in as a device gets it — the place search's zone,
// or, for typed coordinates, Ulune's server's answer for those coordinates alone (lookupZone:
// geo-tz's map, no date, time or name sent) — and the conversion runs in the modules the worker
// bundles (src/lib/engine/birth-time.ts, civil-time.ts, Ulune's own tz table). Each must give
// what the server gives (resolveBirthMoment) and what civil-time.test.mjs expects, Oslo 1962 and
// Buffalo 1880 among them.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { resolveBirthMomentIn, formatLocalMinute } from "../src/lib/engine/birth-time.ts";
import { TZDB_VERSION, zoneTypeAt } from "../src/lib/engine/civil-time.ts";
import { resolveBirthMoment, zoneAt } from "../src/lib/chart/birth-time.server.ts";

const place = (latitude, longitude) => ({ name: "", placeLabel: "", latitude, longitude });

/** What lookupZone answers for typed coordinates (src/lib/engine/zone-lookup.ts: the server's zoneAt). */
const lookupZone = (input) => zoneAt(input.latitude, input.longitude);

/** The device's reading: the zone handed in, the rest on the device. */
async function onDevice(input, zone) {
  return resolveBirthMomentIn(input, zone ?? (await lookupZone(input)));
}

// civil-time.test.mjs's historical cases: the instant, the zone and the abbreviation expected.
const HISTORICAL = [
  ["Oslo, summer 1962", place(59.9139, 10.7522), "1962-07-01", "12:00", "1962-07-01T10:00:00.000Z", "Europe/Oslo", "CEST"],
  ["Stockholm, 1946", place(59.3293, 18.0686), "1946-07-01", "12:00", "1946-07-01T11:00:00.000Z", "Europe/Stockholm", "CET"],
  ["Amsterdam, June 1937", place(52.3676, 4.9041), "1937-06-01", "12:00", "1937-06-01T10:40:28.000Z", "Europe/Amsterdam", "NST"],
  ["Reykjavik, January 1960", place(64.1466, -21.9426), "1960-01-15", "12:00", "1960-01-15T13:00:00.000Z", "Atlantic/Reykjavik", "-01"],
  ["Nassau, summer 1950", place(25.0443, -77.3504), "1950-07-01", "12:00", "1950-07-01T17:00:00.000Z", "America/Nassau", "EST"],
  ["Buffalo, 1880 (LMT)", place(42.8864, -78.8784), "1880-07-01", "12:00", "1880-07-01T17:15:30.816Z", "America/New_York", "LMT"],
  ["Paris, 1905 (PMT)", place(48.8566, 2.3522), "1905-07-01", "12:00", "1905-07-01T11:50:39.000Z", "Europe/Paris", "PMT"],
  ["Ciudad Juárez, 2023", place(31.6904, -106.4245), "2023-07-01", "12:00", "2023-07-01T18:00:00.000Z", "America/Ciudad_Juarez", "MDT"],
  ["Coyhaique, winter 2025", place(-45.5752, -72.0662), "2025-07-01", "12:00", "2025-07-01T15:00:00.000Z", "America/Coyhaique", "-03"],
];

test("the device reads with the same tz table as the server", () => {
  const ref = JSON.parse(readFileSync(new URL("./fixtures/tz-zoneinfo.json", import.meta.url), "utf8"));
  assert.equal(TZDB_VERSION, ref.tzdb);
  const bad = ref.instants.filter(([zone, t, offset, dst, abbr]) => {
    const got = zoneTypeAt(zone, t);
    return got.offset !== offset || (got.dst ? 1 : 0) !== dst || got.abbr !== abbr;
  });
  assert.deepEqual(bad.slice(0, 5), []);
});

test("historical births, typed coordinates: the zone from the server, the reading on the device", async () => {
  for (const [label, where, date, time, utc, zone, abbr] of HISTORICAL) {
    const input = { ...where, date, time };
    const device = await onDevice(input);
    const server = await resolveBirthMoment(input);
    assert.equal(device.utc.toISOString(), utc, label);
    assert.equal(device.info.zone, zone, `${label}: zone`);
    assert.equal(device.info.abbr, abbr, `${label}: abbreviation`);
    assert.deepEqual(device, server, `${label}: as the server reads it`);
  }
});

test("a place from the search brings its zone: nothing else asked of the server", async () => {
  // Oslo 1962 and Buffalo 1880 with the geocoder's zone, as a place picked from the search gives it.
  const oslo = await onDevice({ ...place(59.9139, 10.7522), date: "1962-07-01", time: "12:00", zone: "Europe/Oslo" }, { zone: "Europe/Oslo", source: "place" });
  assert.equal(oslo.utc.toISOString(), "1962-07-01T10:00:00.000Z");
  assert.equal(oslo.info.zoneSource, "place");
  const buffalo = await onDevice({ ...place(42.8864, -78.8784), date: "1880-07-01", time: "12:00" }, { zone: "America/New_York", source: "place" });
  assert.equal(buffalo.utc.toISOString(), "1880-07-01T17:15:30.816Z");
  assert.equal(buffalo.info.offsetLabel, "−05:15:31", "the birthplace's own mean time, not New York's");
  // The server, given the same zone by the search, reads them the same way.
  assert.deepEqual(oslo, await resolveBirthMoment({ ...place(59.9139, 10.7522), date: "1962-07-01", time: "12:00", zone: "Europe/Oslo" }));
});

test("Local Mean Time, Julian dates, repeated and skipped hours, overrides: as on the server", async () => {
  const cases = [
    { ...place(42.8864, -78.8784), date: "1880-07-01", time: "12:00" },
    { ...place(41.1579, -8.6291), date: "1880-07-01", time: "12:00" },
    { ...place(41.1579, -8.6291), date: "1900-07-01", time: "12:00" },
    { ...place(0.3365, 6.7273), date: "1900-07-01", time: "12:00" },
    { ...place(12.0022, 8.592), date: "1910-07-01", time: "12:00" },
    { ...place(57.0531, -135.33), date: "1860-07-01", time: "12:00" },
    { ...place(57.0531, -135.33), date: "1880-07-01", time: "12:00", tz: "lmt" },
    { ...place(14.5995, 120.9842), date: "1840-07-01", time: "12:00" },
    { ...place(66.16, -169.81), date: "1900-07-01", time: "12:00" },
    { ...place(49.4521, 11.0767), date: "1500-03-01", time: "12:00" },
    { ...place(49.4521, 11.0767), date: "1500-02-29", time: "12:00" },
    { ...place(41.9028, 12.4964), date: "1582-10-15", time: "12:00" },
    { ...place(40.7128, -74.006), date: "2024-11-03", time: "01:30" },
    { ...place(40.7128, -74.006), date: "2024-11-03", time: "01:30", fold: 0 },
    { ...place(40.7128, -74.006), date: "2024-03-10", time: "02:30" },
    { ...place(48.8566, 2.3522), date: "1990-01-01", time: "12:00", tz: "+05:30" },
    { ...place(48.8566, 2.3522), date: "1990-01-01", time: "12:00", tz: "lmt" },
    { ...place(48.8566, 2.3522), date: "1990-01-01", time: "12:00", tz: "−04:00" },
    { ...place(48.8566, 2.3522), date: "1990-06-15", time: "12:00", tz: "Europe/London" },
  ];
  for (const input of cases) {
    assert.deepEqual(await onDevice(input), await resolveBirthMoment(input), JSON.stringify(input));
  }
  // The values civil-time.test.mjs pins, read on the device.
  const sitka = await onDevice(cases[5]);
  assert.equal(sitka.utc.toISOString().slice(0, 16), "1860-06-30T21:01");
  const julian = await onDevice(cases[9]);
  assert.equal(julian.utc.toISOString(), "1500-03-11T11:15:41.592Z");
  assert.equal(julian.info.calendar, "julian");
  const repeated = await onDevice(cases[12]);
  assert.equal(repeated.info.local, "ambiguous");
  assert.equal(repeated.utc.toISOString(), "2024-11-03T06:30:00.000Z");
  const skipped = await onDevice(cases[14]);
  assert.equal(skipped.info.local, "nonexistent");
  assert.equal(skipped.utc.toISOString(), "2024-03-10T07:30:00.000Z");
  await assert.rejects(onDevice({ ...cases[15], tz: "+16:00" }), /E:tz\.invalid/);
});

test("local times of a sky are written the server's way", () => {
  for (const [ms, zone] of [[Date.UTC(1962, 6, 1, 10), "Europe/Oslo"], [Date.UTC(1880, 6, 1, 17, 15), "America/New_York"], [Date.UTC(2026, 9, 17, 9), "Europe/Paris"]]) {
    assert.match(formatLocalMinute(new Date(ms), zone), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  }
  assert.equal(formatLocalMinute(new Date(Date.UTC(1962, 6, 1, 10)), "Europe/Oslo"), "1962-07-01 12:00");
});

test("the device's modules use no Node built-in and no server file (on-device plan, step 1)", () => {
  const dir = new URL("../src/lib/engine/", import.meta.url);
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    const text = readFileSync(new URL(name, dir), "utf8");
    // Static imports only: the zone lookup's server function loads the server's lookup inside its handler.
    const imports = [...text.matchAll(/^import[^;]*?from\s+"([^"]+)"/gms)].map((m) => m[1]);
    for (const spec of imports) {
      assert.ok(!spec.startsWith("node:") && !/^(fs|path|url|os|crypto|module)$/.test(spec), `${name} imports ${spec}`);
      assert.ok(!/\.server(\.ts)?$/.test(spec), `${name} imports the server file ${spec}`);
    }
    assert.doesNotMatch(text, /\bprocess\.(env|cwd)\b|\brequire\(/, `${name} reaches for Node`);
  }
});
