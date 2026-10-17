// The requests both identity tests send to Ulune's server path and to the device's engine
// (on-device plan, steps 1–3): scripts/engine-device.test.mjs in Node, scripts/e2e/engine-worker.mjs
// in Chromium. Inputs from the golden and reference suites: the QA fixtures, polar houses, an
// unknown time, each house system, historical zones and Local Mean Time, Julian dates, repeated
// and skipped hours, the reader's own overrides, dates whose ephemeris era the device fetches only
// when asked (1500, 800, the eve of 1800). Moments and places only: nobody's birth.
//
// Each natal case is castChart's input (functions.ts) less the zone, which `zone` gives as the
// device would get it: "search" (the place search's zone, Ulune's server confirming it) or
// "coordinates" (typed coordinates: Ulune's server asked for their zone alone).

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const OSLO = { latitude: 59.9139, longitude: 10.7522 };
const TROMSO = { latitude: 69.6492, longitude: 18.9553 };
const NEW_YORK = { latitude: 40.7128, longitude: -74.006 };

export const NATAL_CASES = [
  { label: "QA fixture A, Paris 1990", zone: "search", hint: "Europe/Paris", data: { date: "1990-06-15", time: "12:00", ...PARIS, houseSystem: "placidus" } },
  { label: "QA fixture B, Oslo 1987", zone: "search", hint: "Europe/Oslo", data: { date: "1987-11-03", time: "23:10", ...OSLO, houseSystem: "placidus" } },
  { label: "Paris 1990, 14:30", zone: "coordinates", data: { date: "1990-06-15", time: "14:30", ...PARIS } },
  { label: "Paris 1990, Koch", zone: "coordinates", data: { date: "1990-06-15", time: "12:00", ...PARIS, houseSystem: "koch" } },
  { label: "Paris 1990, whole signs", zone: "coordinates", data: { date: "1990-06-15", time: "12:00", ...PARIS, houseSystem: "whole" } },
  { label: "Tromsø 1990, Placidus → Porphyry", zone: "coordinates", data: { date: "1990-06-15", time: "12:00", ...TROMSO, houseSystem: "placidus" } },
  { label: "Paris 1990, no birth time", zone: "coordinates", data: { date: "1990-06-15", time: "", ...PARIS, timeUnknown: true } },
  { label: "Oslo, summer 1962", zone: "coordinates", data: { date: "1962-07-01", time: "12:00", ...OSLO } },
  { label: "Buffalo 1880, Local Mean Time", zone: "coordinates", data: { date: "1880-07-01", time: "12:00", latitude: 42.8864, longitude: -78.8784 } },
  { label: "Reykjavik, January 1960", zone: "coordinates", data: { date: "1960-01-15", time: "12:00", latitude: 64.1466, longitude: -21.9426 } },
  { label: "Sitka 1860, Asian side of the date line", zone: "coordinates", data: { date: "1860-07-01", time: "12:00", latitude: 57.0531, longitude: -135.33 } },
  { label: "Nuremberg 1500, Julian (era 1200–1799)", zone: "coordinates", data: { date: "1500-03-01", time: "12:00", latitude: 49.4521, longitude: 11.0767 } },
  { label: "Aachen 800 (era 600–1199)", zone: "coordinates", data: { date: "0800-12-25", time: "10:00", latitude: 50.7753, longitude: 6.0839 } },
  { label: "London, eve of 1800", zone: "coordinates", data: { date: "1799-12-31", time: "23:00", latitude: 51.5074, longitude: -0.1278 } },
  { label: "New York, repeated hour", zone: "coordinates", data: { date: "2024-11-03", time: "01:30", ...NEW_YORK } },
  { label: "New York, repeated hour, first reading", zone: "coordinates", data: { date: "2024-11-03", time: "01:30", ...NEW_YORK, fold: 0 } },
  { label: "New York, skipped hour", zone: "coordinates", data: { date: "2024-03-10", time: "02:30", ...NEW_YORK } },
  { label: "Paris, a fixed offset chosen", zone: "coordinates", data: { date: "1990-01-01", time: "12:00", ...PARIS, tz: "+05:30" } },
  { label: "Paris, Local Mean Time chosen", zone: "coordinates", data: { date: "1990-01-01", time: "12:00", ...PARIS, tz: "lmt" } },
  { label: "Sydney 2000, equal houses", zone: "coordinates", data: { date: "2000-01-01", time: "00:00", latitude: -33.8688, longitude: 151.2093, houseSystem: "equal" } },
  { label: "Paris 2399", zone: "coordinates", data: { date: "2399-06-01", time: "12:00", ...PARIS } },
];

/** The other requests, built on the natal answers (by label) as the studio builds them. */
export function laterCases(natalOf) {
  const a = natalOf("QA fixture A, Paris 1990");
  const polar = natalOf("Tromsø 1990, Placidus → Porphyry");
  const old = natalOf("Nuremberg 1500, Julian (era 1200–1799)");
  const rows = (chart) => [
    ...chart.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
    ...Object.values(chart.angles).map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
  ];
  const sky = (chart, at) => ({
    at,
    latitude: chart.meta.latitude,
    longitude: chart.meta.longitude,
    natalCusps: chart.houses.map((h) => h.ecliptic),
    natalBodies: rows(chart),
    houseSystem: chart.meta.houseSystem,
    timezone: chart.meta.timezone,
  });
  const progressed = (chart, targetUtc) => ({
    natalUtc: chart.meta.utc,
    targetUtc,
    latitude: chart.meta.latitude,
    longitude: chart.meta.longitude,
    natalCusps: chart.houses.map((h) => h.ecliptic),
    natalBodies: rows(chart),
    houseSystem: chart.meta.houseSystem,
    timezone: chart.meta.timezone,
  });
  const timing = (chart, from, to) => ({
    from,
    to,
    latitude: chart.meta.latitude,
    longitude: chart.meta.longitude,
    natalBodies: rows(chart),
    houseSystem: chart.meta.houseSystem,
    timezone: chart.meta.timezone,
  });
  return [
    { label: "transits, 27 Aug 2026", kind: "transits", data: sky(a, "2026-08-27T12:00:00.000Z") },
    { label: "transits, 17 Oct 2026 09:00", kind: "transits", data: sky(a, "2026-10-17T09:00:00.000Z") },
    { label: "transits, polar natal", kind: "transits", data: sky(polar, "2026-08-27T12:00:00.000Z") },
    { label: "transits to a 1500 natal, 1520", kind: "transits", data: sky(old, "1520-05-01T12:00:00.000Z") },
    { label: "progressions to 27 Aug 2026", kind: "progressions", data: progressed(a, "2026-08-27T12:00:00.000Z") },
    { label: "progressions, polar natal", kind: "progressions", data: progressed(polar, "2026-08-27T12:00:00.000Z") },
    { label: "Human Design, fixture A", kind: "humanDesign", data: { natalUtc: a.meta.utc } },
    { label: "Human Design, no birth time", kind: "humanDesign", data: { natalUtc: "1990-06-15T10:00:00.000Z", spanMinutes: 720 } },
    { label: "Human Design across the 2016 leap second", kind: "humanDesign", data: { natalUtc: "2017-02-01T11:00:00.000Z" } },
    { label: "Human Design, design moment in 1799", kind: "humanDesign", data: { natalUtc: "1800-03-21T06:00:00.000Z" } },
    { label: "scrub window, October 2026", kind: "skyWindow", t0: chunkStartOf(Date.UTC(2026, 9, 17)) },
    { label: "scrub window across 1800", kind: "skyWindow", t0: chunkStartOf(Date.UTC(1799, 11, 20)) },
    { label: "Timing, a day", kind: "timing", data: timing(a, "2026-08-26T22:00:00.000Z", "2026-08-27T22:00:00.000Z") },
    { label: "Timing, a month", kind: "timing", data: timing(a, "2026-07-31T22:00:00.000Z", "2026-08-31T22:00:00.000Z") },
    { label: "Timing, a year", kind: "timing", data: timing(a, "2025-12-31T23:00:00.000Z", "2026-12-31T23:00:00.000Z") },
    { label: "the year's sky, 2026", kind: "skyYear", year: 2026 },
  ];
}

/** sky-window.ts chunkStart, repeated here so this file needs no TypeScript (32-day chunks from 1 Jan 2000). */
function chunkStartOf(ms) {
  const CHUNK = 32 * 86_400_000;
  const EPOCH = Date.UTC(2000, 0, 1);
  return EPOCH + Math.floor((ms - EPOCH) / CHUNK) * CHUNK;
}
