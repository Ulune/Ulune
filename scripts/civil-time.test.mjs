/**
 * Local birth time → UTC. The bundled tz database (with its pre-1970
 * history) against Python's zoneinfo on the same release
 * (scripts/fixtures/tz-zoneinfo.json, build-tz-fixture.py), then the cases
 * that went wrong before: zones the runtime's ICU merges before 1970, Local
 * Mean Time of the birthplace, Julian dates, skipped and repeated hours, and
 * the user's own overrides.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolveWallTime, zoneTypeAt, TZDB_VERSION, formatUtcOffset } from "../src/lib/chart/civil-time.server.ts";
import { parseTimeZoneChoice, resolveBirthMoment, zoneAt } from "../src/lib/chart/birth-time.server.ts";

const REF = JSON.parse(readFileSync(new URL("./fixtures/tz-zoneinfo.json", import.meta.url), "utf8"));

test("bundled tz data is the release the reference was built from", () => {
  assert.equal(TZDB_VERSION, REF.tzdb);
});

test("offset, summer time and abbreviation at 1500 instants (1800–2100) match zoneinfo", () => {
  const bad = [];
  for (const [zone, t, offset, dst, abbr] of REF.instants) {
    const got = zoneTypeAt(zone, t);
    if (got.offset !== offset || (got.dst ? 1 : 0) !== dst || got.abbr !== abbr) {
      bad.push(`${zone} ${new Date(t * 1000).toISOString()}: ${got.offset}/${got.dst}/${got.abbr} vs ${offset}/${dst}/${abbr}`);
    }
  }
  assert.deepEqual(bad.slice(0, 5), []);
});

test("wall times — normal, skipped and repeated — read as zoneinfo reads them", () => {
  const bad = [];
  for (const [zone, w, kind, first, second] of REF.walls) {
    const wall = { year: w[0], month: w[1], day: w[2], hour: w[3], minute: w[4], second: w[5] };
    const a = resolveWallTime(zone, wall, { fold: 0 });
    const b = resolveWallTime(zone, wall, { fold: 1 });
    const ok = a.kind === kind && a.utcSeconds === first && (kind !== "ambiguous" || b.utcSeconds === second);
    if (!ok) bad.push(`${zone} ${w.join(",")}: ${a.kind} ${a.utcSeconds}/${b.utcSeconds} vs ${kind} ${first}/${second}`);
  }
  assert.ok(REF.walls.filter((w) => w[2] === "ambiguous").length > 100, "the fixture exercises repeated hours");
  assert.ok(REF.walls.filter((w) => w[2] === "nonexistent").length > 100, "the fixture exercises skipped hours");
  assert.deepEqual(bad.slice(0, 5), []);
});

const place = (latitude, longitude) => ({ name: "", placeLabel: "", latitude, longitude });

/**
 * Before the fix (runtime ICU zones without backzone, tz-lookup's 2019
 * borders, the zone's own LMT) each of these came out wrong by the amount noted.
 */
const HISTORICAL = [
  // Norway kept summer time 1959–1965; ICU reads Oslo as Berlin (none): 1 h.
  ["Oslo, summer 1962", place(59.9139, 10.7522), "1962-07-01", "12:00", "1962-07-01T10:00:00.000Z", "Europe/Oslo", "CEST"],
  // Sweden had no summer time in 1946; Berlin did: 1 h.
  ["Stockholm, 1946", place(59.3293, 18.0686), "1946-07-01", "12:00", "1946-07-01T11:00:00.000Z", "Europe/Stockholm", "CET"],
  // Amsterdam kept its own mean time (+0:19:32, summer +1:19:32) until 1940; ICU: Brussels, 19 min 32 s.
  ["Amsterdam, June 1937", place(52.3676, 4.9041), "1937-06-01", "12:00", "1937-06-01T10:40:28.000Z", "Europe/Amsterdam", "NST"],
  // Iceland was on −01:00 in winters until 1968; ICU: Abidjan (GMT), 1 h.
  ["Reykjavik, January 1960", place(64.1466, -21.9426), "1960-01-15", "12:00", "1960-01-15T13:00:00.000Z", "Atlantic/Reykjavik", "-01"],
  // The Bahamas kept no summer time until 1964; ICU: Toronto (EDT), 1 h.
  ["Nassau, summer 1950", place(25.0443, -77.3504), "1950-07-01", "12:00", "1950-07-01T17:00:00.000Z", "America/Nassau", "EST"],
  // Before standard time (Nov 1883) Buffalo kept its own mean time, −5:15:31, not New York's −4:56:02: 19 min.
  ["Buffalo, 1880 (LMT)", place(42.8864, -78.8784), "1880-07-01", "12:00", "1880-07-01T17:15:30.816Z", "America/New_York", "LMT"],
  // France: Paris Mean Time (+0:09:21) was the legal time 1891–1911.
  ["Paris, 1905 (PMT)", place(48.8566, 2.3522), "1905-07-01", "12:00", "1905-07-01T11:50:39.000Z", "Europe/Paris", "PMT"],
  // Ciudad Juárez (zone split off in 2022) keeps US Mountain time; tz-lookup's 2019 borders said Ojinaga (Central): 1 h.
  ["Ciudad Juárez, 2023", place(31.6904, -106.4245), "2023-07-01", "12:00", "2023-07-01T18:00:00.000Z", "America/Ciudad_Juarez", "MDT"],
  // Aysén (Chile) left Santiago's clock in 2025: −03 all year.
  ["Coyhaique, winter 2025", place(-45.5752, -72.0662), "2025-07-01", "12:00", "2025-07-01T15:00:00.000Z", "America/Coyhaique", "-03"],
];

test("historical births read with each zone's own history", async () => {
  for (const [label, where, date, time, utc, zone, abbr] of HISTORICAL) {
    const { utc: got, info } = await resolveBirthMoment({ ...where, date, time });
    assert.equal(got.toISOString(), utc, label);
    assert.equal(info.zone, zone, `${label}: zone`);
    assert.equal(info.abbr, abbr, `${label}: abbreviation`);
    assert.equal(info.local, "normal", `${label}: an ordinary time`);
  }
});

test("Local Mean Time is the birthplace's own: 4 minutes of time per degree of longitude", async () => {
  const { utc, info } = await resolveBirthMoment({ ...place(42.8864, -78.8784), date: "1880-07-01", time: "12:00" });
  assert.equal(info.basis, "lmt");
  assert.equal(info.offset, -18930.816);
  assert.equal(info.offsetLabel, "−05:15:31");
  assert.equal(utc.getTime(), Date.UTC(1880, 6, 1, 12) + 18930.816 * 1000);
});

test("only the zone's first period is the birthplace's LMT; a later legal mean time is kept", async () => {
  // Porto: its own mean time until 1884, then Lisbon Mean Time was the legal time until 1912.
  const porto1880 = await resolveBirthMoment({ ...place(41.1579, -8.6291), date: "1880-07-01", time: "12:00" });
  assert.equal(porto1880.info.offsetLabel, "−00:34:31", "Porto's own LMT");
  const porto1900 = await resolveBirthMoment({ ...place(41.1579, -8.6291), date: "1900-07-01", time: "12:00" });
  assert.equal(porto1900.info.offsetLabel, "−00:36:45", "Lisbon Mean Time, the legal time");
  // São Tomé kept Lisbon Mean Time 1884–1912 too (not its own +0:26:56).
  const saoTome = await resolveBirthMoment({ ...place(0.3365, 6.7273), date: "1900-07-01", time: "12:00" });
  assert.equal(saoTome.utc.toISOString(), "1900-07-01T12:36:45.000Z");
  // Kano 1910: Lagos Mean Time was legal (1914 end), not Kano's own.
  const kano = await resolveBirthMoment({ ...place(12.0022, 8.592), date: "1910-07-01", time: "12:00" });
  assert.equal(kano.info.offsetLabel, "+00:13:35");
});

test("Local Mean Time keeps the calendar side of the date line the place kept then", async () => {
  // Sitka counted its days with Asia until the 1867 purchase: +14:58, not −9:01 (a day apart).
  const sitka = await resolveBirthMoment({ ...place(57.0531, -135.33), date: "1860-07-01", time: "12:00" });
  assert.equal(sitka.utc.toISOString().slice(0, 16), "1860-06-30T21:01");
  assert.ok(sitka.info.offset > 50000, `Sitka 1860 offset ${sitka.info.offset}`);
  // …and the same place asked for LMT explicitly, before and after 1867.
  const asked = await resolveBirthMoment({ ...place(57.0531, -135.33), date: "1860-07-01", time: "12:00", tz: "lmt" });
  assert.equal(asked.utc.getTime(), sitka.utc.getTime());
  const asked1880 = await resolveBirthMoment({ ...place(57.0531, -135.33), date: "1880-07-01", time: "12:00", tz: "lmt" });
  assert.ok(asked1880.info.offset < -30000, "American side after the purchase");
  // Manila counted with America until 1844: −15:56.
  const manila = await resolveBirthMoment({ ...place(14.5995, 120.9842), date: "1840-07-01", time: "12:00" });
  assert.equal(manila.utc.toISOString().slice(0, 13), "1840-07-02T03");
  // A Chukotka village east of 180° kept Anadyr's (Asian) calendar.
  const uelen = await resolveBirthMoment({ ...place(66.16, -169.81), date: "1900-07-01", time: "12:00" });
  assert.equal(uelen.info.zone, "Asia/Anadyr");
  assert.ok(uelen.info.offset > 40000, `Uelen offset ${uelen.info.offset}`);
});

test("dates before 15 October 1582 are Julian-calendar dates", async () => {
  // 1 March 1500 (Julian) at noon, Nuremberg LMT = 11 March 1500 (Gregorian) 11:15:41.6 UT.
  const { utc, info } = await resolveBirthMoment({ ...place(49.4521, 11.0767), date: "1500-03-01", time: "12:00" });
  assert.equal(info.calendar, "julian");
  assert.equal(info.basis, "lmt");
  assert.equal(utc.toISOString(), "1500-03-11T11:15:41.592Z");
  // 29 February 1500 exists in the Julian calendar (not in the Gregorian).
  const leap = await resolveBirthMoment({ ...place(49.4521, 11.0767), date: "1500-02-29", time: "12:00" });
  assert.equal(leap.utc.toISOString(), "1500-03-10T11:15:41.592Z");
  // From the reform on, Gregorian.
  const after = await resolveBirthMoment({ ...place(41.9028, 12.4964), date: "1582-10-15", time: "12:00" });
  assert.equal(after.info.calendar, "gregorian");
});

test("a repeated hour is flagged with both readings; the second is the default, the first on request", async () => {
  const ny = place(40.7128, -74.006);
  const second = await resolveBirthMoment({ ...ny, date: "2024-11-03", time: "01:30" });
  assert.equal(second.info.local, "ambiguous");
  assert.equal(second.utc.toISOString(), "2024-11-03T06:30:00.000Z");
  assert.deepEqual(
    second.info.readings.map((r) => `${r.abbr} ${r.offsetLabel}`),
    ["EDT −04:00", "EST −05:00"],
  );
  const first = await resolveBirthMoment({ ...ny, date: "2024-11-03", time: "01:30", fold: 0 });
  assert.equal(first.utc.toISOString(), "2024-11-03T05:30:00.000Z");
  assert.equal(first.info.abbr, "EDT");
  assert.equal(first.info.fold, 0);
});

test("a skipped hour is flagged and read with the offset in force before the change", async () => {
  const { utc, info } = await resolveBirthMoment({ ...place(40.7128, -74.006), date: "2024-03-10", time: "02:30" });
  assert.equal(info.local, "nonexistent");
  assert.equal(info.abbr, "EST");
  assert.equal(utc.toISOString(), "2024-03-10T07:30:00.000Z");
});

test("the user's override wins: a fixed offset, or the birthplace's Local Mean Time", async () => {
  const paris = place(48.8566, 2.3522);
  const fixed = await resolveBirthMoment({ ...paris, date: "1990-01-01", time: "12:00", tz: "+05:30" });
  assert.equal(fixed.utc.toISOString(), "1990-01-01T06:30:00.000Z");
  assert.equal(fixed.info.basis, "offset");
  assert.equal(fixed.info.choice, "+05:30");
  assert.equal(fixed.info.zone, "Europe/Paris", "the place's zone is still known");
  const lmt = await resolveBirthMoment({ ...paris, date: "1990-01-01", time: "12:00", tz: "lmt" });
  assert.equal(lmt.info.basis, "lmt");
  assert.equal(lmt.utc.toISOString(), "1990-01-01T11:50:35.472Z");
  const west = await resolveBirthMoment({ ...paris, date: "1990-01-01", time: "12:00", tz: "−04:00" });
  assert.equal(west.utc.toISOString(), "1990-01-01T16:00:00.000Z");
});

test("time zone choices parse strictly", () => {
  assert.deepEqual(parseTimeZoneChoice(undefined), { kind: "auto" });
  assert.deepEqual(parseTimeZoneChoice("auto"), { kind: "auto" });
  assert.deepEqual(parseTimeZoneChoice("LMT"), { kind: "lmt" });
  assert.deepEqual(parseTimeZoneChoice("+05:45"), { kind: "offset", seconds: 20700 });
  assert.deepEqual(parseTimeZoneChoice("UTC-3"), { kind: "offset", seconds: -10800 });
  assert.deepEqual(parseTimeZoneChoice("Europe/Kiev"), { kind: "zone", zone: "Europe/Kiev" });
  assert.throws(() => parseTimeZoneChoice("+16:00"), /E:tz.invalid/, "out of range is refused, not ignored");
  assert.throws(() => parseTimeZoneChoice("Mars/Olympus"), /E:tz.invalid/);
  assert.throws(() => parseTimeZoneChoice("constructor"), /E:tz.invalid/, "no prototype keys");
});

test("the zone comes from the coordinates; the place's own zone breaks ties and covers offshore centres", async () => {
  assert.equal((await zoneAt(59.9139, 10.7522)).zone, "Europe/Oslo");
  assert.equal((await zoneAt(59.9139, 10.7522)).source, "coordinates");
  // Mid-Atlantic: only a nautical zone — the geocoder's zone for the place wins.
  const sea = await zoneAt(30, -40, "Atlantic/Azores");
  assert.equal(sea.zone, "Atlantic/Azores");
  assert.equal(sea.source, "place");
  assert.equal((await zoneAt(30, -40)).zone, "Etc/GMT+3");
});

test("offsets print with seconds only when they have them", () => {
  assert.equal(formatUtcOffset(3600), "+01:00");
  assert.equal(formatUtcOffset(-17762), "−04:56:02");
  assert.equal(formatUtcOffset(19800), "+05:30");
  assert.equal(formatUtcOffset(0), "+00:00");
});
