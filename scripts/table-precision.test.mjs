/*
 * The table's exact points (part 48 of the launch plan):
 *   - the essential dignities (Egyptian terms, Chaldean faces, Dorothean
 *     triplicities, Lilly's points), derived a second way and on the test chart;
 *   - motion: stations by each body's own speed, swift and slow;
 *   - the station's moment, against a published retrograde calendar
 *     (Cafe Astrology, dates in Eastern Time, degrees to the minute);
 *   - the chart's new facts: ARMC, the Sun's altitude, the day's range
 *     without a birth time.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal, stationNearUtc } from "../src/lib/chart/calculate.server.ts";
import { MEAN_SPEED, SIGN_IDS, STATION_SPEED } from "../src/lib/chart/constants.ts";
import {
  CHALDEAN_ORDER,
  EGYPTIAN_TERMS,
  TRIPLICITY,
  degreeRulers,
  essentialDignity,
  faceRuler,
  signDignity,
  termRuler,
} from "../src/lib/chart/dignities.ts";
import { moonPhase } from "../src/lib/chart/table-facts.ts";
import { motionFlags } from "../src/lib/chart/transit-exact.ts";

const TRACE = {
  name: "TraceQA",
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

test("the Egyptian terms: five spans a sign, to 30°, each of the five planets once", () => {
  for (const sign of SIGN_IDS) {
    const spans = EGYPTIAN_TERMS[sign];
    assert.equal(spans.length, 5, sign);
    assert.equal(spans.at(-1)[1], 30, sign);
    assert.deepEqual(
      [...spans.map(([p]) => p)].sort(),
      ["jupiter", "mars", "mercury", "saturn", "venus"],
      sign,
    );
    for (let i = 1; i < 5; i += 1) assert.ok(spans[i][1] > spans[i - 1][1], sign);
  }
  // Published starts (Augurine's table): Aries Jupiter 0–6, Taurus Venus 0–8,
  // Sagittarius Jupiter 0–12, Pisces Venus 0–12, Leo Saturn 11–18.
  assert.equal(termRuler(0), "jupiter");
  assert.equal(termRuler(5.99), "jupiter");
  assert.equal(termRuler(6), "venus");
  assert.equal(termRuler(30 + 7.9), "venus");
  assert.equal(termRuler(240 + 11.9), "jupiter");
  assert.equal(termRuler(330 + 11.99), "venus");
  assert.equal(termRuler(120 + 15), "saturn");
});

test("terms and faces agree with a second derivation on 36,000 longitudes", () => {
  // Terms: a degree-by-degree map built from the spans' starts.
  const byDegree = [];
  for (const sign of SIGN_IDS) {
    let start = 0;
    for (const [ruler, end] of EGYPTIAN_TERMS[sign]) {
      for (let d = start; d < end; d += 1) byDegree.push(ruler);
      start = end;
    }
  }
  assert.equal(byDegree.length, 360);
  // Faces: walk the Chaldean order from Mars at 0° Aries.
  const order = ["mars", "sun", "venus", "mercury", "moon", "saturn", "jupiter"];
  for (let i = 0; i < 36_000; i += 1) {
    const lon = i / 100 + 0.004;
    assert.equal(termRuler(lon), byDegree[Math.floor(lon)], `term at ${lon}`);
    assert.equal(faceRuler(lon), order[Math.floor(lon / 10) % 7], `face at ${lon}`);
  }
  assert.deepEqual(CHALDEAN_ORDER, ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"]);
  // 36 faces: the last (Pisces 20–30) is Mars, the first again.
  assert.equal(faceRuler(355), "mars");
});

test("the Dorothean triplicities", () => {
  assert.deepEqual(TRIPLICITY, {
    fire: ["sun", "jupiter", "saturn"],
    earth: ["venus", "moon", "mars"],
    air: ["saturn", "mercury", "jupiter"],
    water: ["venus", "mars", "moon"],
  });
  const r = degreeRulers(24 * 1 + 60 + 0.05); // 24°03' Gemini
  assert.equal(r.domicile, "mercury");
  assert.equal(r.exaltation, null);
  assert.equal(r.term, "saturn");
  assert.equal(r.face, "sun");
  assert.equal(r.detriment, "jupiter");
  assert.equal(r.fall, null);
});

test("the test chart's dignities (a day chart), by hand", async () => {
  const chart = await calculateNatal(TRACE);
  assert.equal(chart.patterns.isDay, true);
  const score = (id) => essentialDignity(id, chart.planets.find((p) => p.id === id).ecliptic, true);
  assert.deepEqual(
    Object.fromEntries(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"].map((id) => [id, score(id).score])),
    { sun: 1, moon: -5, mercury: 7, venus: 8, mars: 5, jupiter: 4, saturn: 7 },
  );
  assert.deepEqual(score("sun").own, ["face"]);
  assert.deepEqual(score("mercury").own, ["domicile", "term"]);
  assert.deepEqual(score("venus").own, ["domicile", "triplicity"]);
  assert.equal(score("moon").peregrine, true);
  // The Moon participates in the water triplicity: shown, not scored.
  assert.equal(score("moon").unscoredTriplicity, true);
  // The one word: the Sun holds its face, so it is no longer called peregrine.
  const sun = chart.planets.find((p) => p.id === "sun");
  const moon = chart.planets.find((p) => p.id === "moon");
  assert.equal(signDignity("sun", sun.ecliptic, true), null);
  assert.equal(signDignity("moon", moon.ecliptic, true), "peregrine");
  assert.equal(chart.patterns.flags.sun.dignity, null);
  assert.equal(chart.patterns.flags.moon.dignity, "peregrine");
  assert.equal(chart.patterns.flags.mercury.dignity, "domicile");
});

test("stationary by each body's own speed; swift and slow for the seven, going forward", () => {
  // The old single threshold (0.05°/day) called Neptune and Pluto stationary every day.
  assert.equal(motionFlags("neptune", -0.025).stationary, false);
  assert.equal(motionFlags("pluto", 0.02).stationary, false);
  assert.equal(motionFlags("pluto", 0.003).stationary, true);
  assert.equal(motionFlags("mercury", 0.1).stationary, true);
  assert.equal(motionFlags("mercury", 0.2).stationary, false);
  for (const [id, v] of Object.entries(STATION_SPEED)) {
    assert.equal(motionFlags(id, v * 0.99).stationary, true, id);
    assert.equal(motionFlags(id, v * 1.01).stationary, false, id);
  }
  // Saturn retrograde at −0.0586°/day was "fast": now retrograde, neither swift nor slow.
  assert.deepEqual(motionFlags("saturn", -0.0586), { retrograde: true, stationary: false, fast: false, slow: false });
  assert.equal(motionFlags("moon", 13.33).fast, true);
  assert.equal(motionFlags("venus", 1.1759).slow, true);
  assert.equal(motionFlags("sun", MEAN_SPEED.sun + 0.01).fast, true);
  // No motion words for the nodes, Lilith, the asteroids.
  for (const id of ["northnode", "southnode", "lilith", "ceres", "eris"]) {
    const f = motionFlags(id, 0.0001);
    assert.equal(f.stationary || f.fast || f.slow, false, id);
  }
});

/** Published stations (Cafe Astrology, Eastern Time): body, date, degree in sign, sign, turns direct. */
const PUBLISHED = [
  ["mercury", "2025-11-09", 6, 52, "sagittarius", false],
  ["mercury", "2025-11-29", 20, 42, "scorpio", true],
  ["jupiter", "2025-11-11", 25, 9, "cancer", false],
  ["jupiter", "2026-03-10", 15, 5, "cancer", true],
  ["uranus", "2025-09-06", 1, 28, "gemini", false],
  ["uranus", "2026-02-03", 27, 28, "taurus", true],
  ["mercury", "2026-02-26", 22, 34, "pisces", false],
  ["mercury", "2026-03-20", 8, 29, "pisces", true],
  ["mercury", "2026-06-29", 26, 15, "cancer", false],
  ["mercury", "2026-07-23", 16, 19, "cancer", true],
  ["pluto", "2026-05-06", 5, 30, "aquarius", false],
  ["pluto", "2026-10-15", 3, 4, "aquarius", true],
  ["neptune", "2026-07-07", 4, 25, "aries", false],
  ["neptune", "2026-12-12", 1, 37, "aries", true],
  ["saturn", "2026-07-26", 14, 45, "aries", false],
  ["saturn", "2026-12-10", 7, 56, "aries", true],
  ["uranus", "2026-09-10", 5, 42, "gemini", false],
  ["venus", "2026-10-03", 8, 29, "scorpio", false],
  ["venus", "2026-11-13", 22, 52, "libra", true],
  ["mercury", "2026-10-24", 20, 59, "scorpio", false],
  ["mercury", "2026-11-13", 5, 2, "scorpio", true],
  ["jupiter", "2026-12-12", 27, 1, "leo", false],
  ["mars", "2027-01-10", 10, 26, "virgo", false],
  ["mars", "2027-04-01", 20, 56, "leo", true],
];

function easternDate(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

test("the station's moment and degree agree with a published retrograde calendar", async () => {
  for (const [id, date, deg, min, sign, direct] of PUBLISHED) {
    // Noon in New York on the published day, searched two days either side.
    const noon = new Date(`${date}T16:00:00Z`);
    const hit = await stationNearUtc(noon, id, 2);
    assert.ok(hit, `${id} ${date}: no station found`);
    assert.equal(hit.direct, direct, `${id} ${date}: turns ${hit.direct ? "direct" : "retrograde"}`);
    const want = SIGN_IDS.indexOf(sign) * 30 + deg + min / 60;
    const diff = Math.abs(((hit.lon - want + 540) % 360) - 180) * 60;
    // The calendar prints whole minutes: within one minute of arc.
    assert.ok(diff <= 1, `${id} ${date}: ${hit.lon.toFixed(4)}° vs ${deg}°${min}′ ${sign} (${diff.toFixed(2)}′)`);
    // The day, in Eastern Time; the slow outer planets turn so gently that a
    // few hours' difference between ephemerides can cross midnight.
    const day = easternDate(hit.utc);
    const slow = ["uranus", "neptune", "pluto"].includes(id);
    const days = Math.abs(Date.parse(day) - Date.parse(date)) / 86_400_000;
    assert.ok(slow ? days <= 1 : days === 0, `${id} ${date}: station on ${day} (${hit.utc})`);
  }
});

test("a birth on a station day carries the station's moment", async () => {
  // Mercury turned retrograde on 9 Nov 2025 (published: 6°52′ Sagittarius).
  const chart = await calculateNatal({ ...TRACE, name: "Station", date: "2025-11-09", time: "12:00" });
  const mercury = chart.planets.find((p) => p.id === "mercury");
  assert.equal(mercury.stationary, true);
  assert.ok(mercury.station, "Mercury's station");
  assert.equal(mercury.station.direct, false);
  const hours = (Date.parse(mercury.station.utc) - Date.parse(chart.meta.utc)) / 3_600_000;
  assert.ok(Math.abs(hours) < 24, `station ${hours.toFixed(1)} h from birth`);
  // Bodies far from a station carry none.
  assert.equal(chart.planets.find((p) => p.id === "sun").station, undefined);
});

test("the chart's ARMC, from Swiss Ephemeris's houses, is the MC's right ascension", async () => {
  const chart = await calculateNatal(TRACE);
  const eps = (chart.meta.obliquity * Math.PI) / 180;
  const mc = (chart.angles.midheaven.ecliptic * Math.PI) / 180;
  const ra = ((Math.atan2(Math.sin(mc) * Math.cos(eps), Math.cos(mc)) * 180) / Math.PI + 360) % 360;
  assert.ok(Math.abs(chart.meta.armc - ra) < 1e-6, `${chart.meta.armc} vs ${ra}`);
  // Local sidereal time 03:43:07.6 (the mean sidereal time from the IAU 1982
  // formula gives 03:43:06.8; the 0.8 s is the equation of the equinoxes).
  const lst = chart.meta.armc / 15;
  const s = lst * 3600;
  assert.ok(Math.abs(s - (3 * 3600 + 43 * 60 + 7.6)) < 0.1, `LST ${s}`);
  // The Sun's altitude, again from its declination and hour angle.
  const sun = chart.planets.find((p) => p.id === "sun");
  const rad = Math.PI / 180;
  const sunRa = (Math.atan2(Math.sin(sun.ecliptic * rad) * Math.cos(eps), Math.cos(sun.ecliptic * rad)) / rad + 360) % 360;
  const h = (chart.meta.armc - sunRa) * rad;
  const phi = chart.meta.latitude * rad;
  const dec = sun.declination * rad;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h)) / rad;
  assert.ok(Math.abs(chart.meta.sunAltitude - alt) < 0.01, `Sun altitude ${chart.meta.sunAltitude} vs ${alt}`);
});

test("without a birth time, each body's range over the day", async () => {
  const chart = await calculateNatal({ ...TRACE, name: "NoTime", time: "12:00", timeUnknown: true });
  const range = chart.meta.dayRange;
  assert.ok(range, "dayRange");
  const moon = chart.planets.find((p) => p.id === "moon");
  const [start, end] = range.moon;
  const span = (end - start + 360) % 360;
  assert.ok(span > 11.5 && span < 15.5, `the Moon moves ${span}° in the day`);
  // The noon stand-in lies between the two ends.
  assert.ok(((moon.ecliptic - start + 360) % 360) < span);
  // Derived points have no range; the south node mirrors the north.
  assert.equal(range.fortune, undefined);
  assert.ok(Math.abs(((range.southnode[0] - range.northnode[0] + 360) % 360) - 180) < 1e-6);
  // With a birth time there is none.
  const known = await calculateNatal(TRACE);
  assert.equal(known.meta.dayRange, undefined);
});

/*
 * The Moon's lit share against native Swiss Ephemeris (pyswisseph 2.10.03,
 * swe.pheno_ut on the same ephe/ files, the phase: the illuminated fraction).
 */
const PHASES = [
  { date: "1990-06-15", time: "10:00", lit: 0.586236 },
  { date: "2025-11-09", time: "20:00", lit: 0.751986 },
  { date: "1921-01-07", time: "12:00", lit: 0.027839 },
  { date: "2004-11-04", time: "11:00", lit: 0.576252 },
];

test("the Moon's lit share agrees with Swiss Ephemeris's phase to 0.1%", async () => {
  for (const c of PHASES) {
    const chart = await calculateNatal({ ...TRACE, name: "Phase", date: c.date, time: c.time, tz: "+00:00" });
    const sun = chart.planets.find((p) => p.id === "sun");
    const moon = chart.planets.find((p) => p.id === "moon");
    const { lit } = moonPhase(sun.ecliptic, moon.ecliptic, moon.latitude);
    assert.ok(Math.abs(lit - c.lit) < 0.001, `${c.date} ${c.time} UT: ${lit} vs ${c.lit}`);
  }
  // The eight phases, each 45° of the Moon's lead on the Sun.
  assert.equal(moonPhase(0, 10).phase, "new");
  assert.equal(moonPhase(0, 100).phase, "firstQuarter");
  assert.equal(moonPhase(0, 181).phase, "full");
  assert.equal(moonPhase(0, 181).waxing, false);
  assert.equal(moonPhase(350, 30).phase, "new");
});
