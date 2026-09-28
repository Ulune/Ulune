/**
 * The sky's own events in the chunks (sky-search.ts, part 53 of the launch
 * plan), against published references: NASA JPL Horizons (fetched 28 Sep
 * 2026, apparent ecliptic of date, UT), NASA's eclipse tables, AstroPixels'
 * phases, MoonTracks' and Cafe Astrology's void-of-course tables and Cafe
 * Astrology's stations. Times are UTC unless a zone is named.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateSkyWindow } from "../src/lib/chart/calculate.server.ts";
import { seasonOf } from "../src/lib/chart/sky-events.ts";
import { chunkStart, covers, WINDOW_TIMES } from "../src/lib/chart/sky-window.ts";

const chunks = new Map();
async function chunk(t0) {
  if (!chunks.has(t0)) chunks.set(t0, await calculateSkyWindow(t0));
  return chunks.get(t0);
}
/** Every event whose time falls in [from, to), from the chunks that hold it. */
async function eventsBetween(from, to) {
  const out = [];
  for (let t0 = chunkStart(Date.parse(from)); t0 < Date.parse(to); t0 += WINDOW_TIMES.CHUNK_MS) {
    for (const e of (await chunk(t0)).events) if (e.t >= Date.parse(from) && e.t < Date.parse(to)) out.push(e);
  }
  return out;
}
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const iso = (ms) => new Date(ms).toISOString();
/** The minute an event falls in, "YYYY-MM-DD HH:MM" (UTC). */
const minute = (ms) => iso(Math.floor(ms / 60_000) * 60_000).slice(0, 16).replace("T", " ");
function near(ms, ref, seconds, what) {
  assert.ok(Math.abs(ms - Date.parse(ref)) <= seconds * 1000, `${what}: ${iso(ms)} against ${ref} (±${seconds} s)`);
}
/** Arc minutes of a longitude within its sign. */
const arcmin = (lon) => (((lon % 30) + 30) % 30) * 60;
const one = (list, what) => {
  assert.equal(list.length, 1, `${what}: ${list.length} found`);
  return list[0];
};

test("JPL Horizons: the Moon, the Sun and the planets cross where Horizons says", async () => {
  const ev = await eventsBetween("2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z");
  const full = one(ev.filter((e) => e.k === "phase" && e.phase === 2 && iso(e.t).startsWith("2026-11-24")), "Full Moon of 24 Nov");
  near(full.t, "2026-11-24T14:53:34Z", 2, "Full Moon");
  const libra = one(ev.filter((e) => e.k === "ingress" && e.body === "moon" && e.sign === 6 && iso(e.t).startsWith("2026-09-11")), "Moon into Libra");
  near(libra.t, "2026-09-11T23:51:42Z", 2, "Moon into Libra");
  const equinox = one(ev.filter((e) => seasonOf(e) === 2), "September equinox");
  near(equinox.t, "2026-09-23T00:05:14Z", 2, "September equinox");
  const mars = one(ev.filter((e) => e.k === "ingress" && e.body === "mars" && e.sign === 10), "Mars into Aquarius");
  near(mars.t, "2026-01-23T09:16:47Z", 3, "Mars into Aquarius");
  const venus = one(ev.filter((e) => e.k === "station" && e.body === "venus" && e.turn === "rx"), "Venus turning retrograde");
  near(venus.t, "2026-10-03T07:15:55Z", 30, "Venus turning retrograde");
  assert.equal(Math.floor(venus.lon / 30), 7);
  assert.ok(Math.abs(arcmin(venus.lon) - (8 * 60 + 29.47)) < 0.2, `Venus stations at ${arcmin(venus.lon)}′ of Scorpio`);
  // Neptune crawls: 55 s is 0.06″, the gap between Horizons' IAU 1976/80 frame and Swiss's.
  const neptune = one(ev.filter((e) => e.k === "ingress" && e.body === "neptune" && e.sign === 0), "Neptune into Aries");
  near(neptune.t, "2026-01-26T17:35:33Z", 90, "Neptune into Aries");
});

test("AstroPixels: the twelve phases from September to November 2026 within a minute", async () => {
  const ref = [
    [3, "2026-09-04T07:51"], [0, "2026-09-11T03:27"], [1, "2026-09-18T20:44"], [2, "2026-09-26T16:49"],
    [3, "2026-10-03T13:25"], [0, "2026-10-10T15:50"], [1, "2026-10-18T16:13"], [2, "2026-10-26T04:12"],
    [3, "2026-11-01T20:28"], [0, "2026-11-09T07:02"], [1, "2026-11-17T11:48"], [2, "2026-11-24T14:53"],
  ];
  const phases = (await eventsBetween("2026-09-01T00:00:00Z", "2026-11-30T00:00:00Z")).filter((e) => e.k === "phase");
  assert.equal(phases.length, 12);
  phases.forEach((e, i) => {
    assert.equal(e.phase, ref[i][0], `phase ${i}`);
    near(e.t, `${ref[i][1]}:00Z`, 65, `phase on ${ref[i][1]}`);
  });
});

test("NASA: the four eclipses of 2026, their types and magnitudes", async () => {
  const eclipses = (await eventsBetween("2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z")).filter((e) => e.k === "eclipse");
  // NASA's greatest eclipse: solar in TD with ΔT (75.1 s, 75.4 s), lunar in UT to the minute.
  const ref = [
    { kind: "solar", type: "annular", at: "2026-02-17T12:11:51Z", tol: 15, mag: 0.963, magTol: 0.002, sign: 10 },
    { kind: "lunar", type: "total", at: "2026-03-03T11:34:00Z", tol: 60, mag: 1.1507, magTol: 0.0005, sign: 5 },
    { kind: "solar", type: "total", at: "2026-08-12T17:45:51Z", tol: 15, mag: 1.0386, magTol: 0.002, sign: 4 },
    { kind: "lunar", type: "partial", at: "2026-08-28T04:13:00Z", tol: 60, mag: 0.9299, magTol: 0.0005, sign: 11 },
  ];
  assert.equal(eclipses.length, 4);
  eclipses.forEach((e, i) => {
    assert.equal(e.kind, ref[i].kind);
    assert.equal(e.type, ref[i].type);
    near(e.t, ref[i].at, ref[i].tol, `${e.type} ${e.kind} eclipse`);
    assert.ok(Math.abs(e.mag - ref[i].mag) <= ref[i].magTol, `magnitude ${e.mag} against ${ref[i].mag}`);
    assert.equal(Math.floor(e.lon / 30), ref[i].sign, `${e.kind} eclipse in ${SIGNS[Math.floor(e.lon / 30)]}`);
  });
});

test("MoonTracks: the Moon void of course in September and October 2026, to the minute", async () => {
  // Their times cut to the minute, as Ulune's; [start, end, sign entered].
  const ref = [
    ["2026-09-02 10:46", "2026-09-03 11:47", 2], ["2026-09-05 08:39", "2026-09-05 14:30", 3],
    ["2026-09-07 13:39", "2026-09-07 16:49", 4], ["2026-09-09 18:57", "2026-09-09 19:35", 5],
    // Their end, 12 Sep 00:09, is 17 minutes off: Horizons puts the Moon at 0° Libra at 23:51:42.
    ["2026-09-11 05:52", "2026-09-11 23:51", 6], ["2026-09-13 14:26", "2026-09-14 06:43", 7],
    ["2026-09-16 03:29", "2026-09-16 16:41", 8], ["2026-09-18 20:43", "2026-09-19 04:54", 9],
    ["2026-09-21 14:31", "2026-09-21 17:14", 10], ["2026-09-23 08:18", "2026-09-24 03:23", 11],
    ["2026-09-26 08:31", "2026-09-26 10:23", 0], ["2026-09-28 09:50", "2026-09-28 14:40", 1],
    ["2026-09-29 23:36", "2026-09-30 17:26", 2], ["2026-10-02 02:41", "2026-10-02 19:54", 3],
    ["2026-10-03 15:08", "2026-10-04 22:54", 4], ["2026-10-06 10:22", "2026-10-07 02:52", 5],
    ["2026-10-07 18:56", "2026-10-09 08:10", 6], ["2026-10-10 23:07", "2026-10-11 15:21", 7],
    ["2026-10-13 08:45", "2026-10-14 00:59", 8], ["2026-10-15 21:55", "2026-10-16 12:57", 9],
    ["2026-10-18 16:12", "2026-10-19 01:39", 10], ["2026-10-21 08:42", "2026-10-21 12:35", 11],
    ["2026-10-23 03:31", "2026-10-23 19:53", 0], ["2026-10-25 22:59", "2026-10-25 23:34", 1],
    ["2026-10-27 14:51", "2026-10-28 01:01", 2], ["2026-10-29 21:43", "2026-10-30 02:05", 3],
  ];
  const voids = (await eventsBetween("2026-09-02T00:00:00Z", "2026-10-31T00:00:00Z")).filter((e) => e.k === "void");
  assert.equal(voids.length, ref.length);
  voids.forEach((v, i) => {
    assert.equal(minute(v.t), ref[i][0], `void ${i} starts`);
    assert.equal(minute(v.end), ref[i][1], `void ${i} ends`);
    assert.equal(v.sign, ref[i][2], `void ${i} ends in ${SIGNS[ref[i][2]]}`);
  });
});

test("Cafe Astrology: the Moon void of course from 2 to 9 January 2026, with its last aspect", async () => {
  // Eastern Standard Time (UTC−5) there, UTC here.
  const ref = [
    ["2026-01-02 12:23", "2026-01-02 13:09", "neptune", "square"],
    ["2026-01-04 12:59", "2026-01-04 13:43", "neptune", "trine"],
    ["2026-01-06 13:04", "2026-01-06 16:56", "uranus", "square"],
    ["2026-01-08 23:22", "2026-01-09 00:05", "neptune", "opposition"],
  ];
  const voids = (await eventsBetween("2026-01-02T00:00:00Z", "2026-01-09T12:00:00Z")).filter((e) => e.k === "void");
  assert.equal(voids.length, 4);
  voids.forEach((v, i) => {
    assert.equal(minute(v.t), ref[i][0]);
    assert.equal(minute(v.end), ref[i][1]);
    assert.equal(v.last?.body, ref[i][2]);
    assert.equal(v.last?.type, ref[i][3]);
  });
});

test("Cafe Astrology: the stations of 2026 on the same day in Eastern time, within 1′", async () => {
  const ref = [
    ["mercury", "rx", "2026-02-26", "Pisces", 22, 34], ["mercury", "direct", "2026-03-20", "Pisces", 8, 29],
    ["mercury", "rx", "2026-06-29", "Cancer", 26, 15], ["mercury", "direct", "2026-07-23", "Cancer", 16, 19],
    ["mercury", "rx", "2026-10-24", "Scorpio", 20, 59], ["mercury", "direct", "2026-11-13", "Scorpio", 5, 2],
    ["venus", "rx", "2026-10-03", "Scorpio", 8, 29], ["venus", "direct", "2026-11-13", "Libra", 22, 52],
    ["jupiter", "direct", "2026-03-10", "Cancer", 15, 5], ["jupiter", "rx", "2026-12-12", "Leo", 27, 1],
    ["saturn", "rx", "2026-07-26", "Aries", 14, 45], ["saturn", "direct", "2026-12-10", "Aries", 7, 56],
    ["uranus", "rx", "2026-09-10", "Gemini", 5, 42],
    ["neptune", "rx", "2026-07-07", "Aries", 4, 25], ["neptune", "direct", "2026-12-12", "Aries", 1, 37],
    ["pluto", "rx", "2026-05-06", "Aquarius", 5, 30], ["pluto", "direct", "2026-10-15", "Aquarius", 3, 4],
  ];
  const stations = (await eventsBetween("2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z")).filter((e) => e.k === "station");
  assert.equal(stations.length, 20, "with Chiron's two and Uranus turning direct on 4 Feb");
  const eastern = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  for (const [body, turn, day, sign, d, m] of ref) {
    const s = one(stations.filter((e) => e.body === body && e.turn === turn && eastern.format(new Date(e.t)) === day), `${body} ${turn} ${day}`);
    assert.equal(SIGNS[Math.floor(s.lon / 30)], sign, `${body} ${turn} sign`);
    assert.ok(Math.abs(arcmin(s.lon) - (d * 60 + m)) <= 0.75, `${body} ${turn}: ${arcmin(s.lon).toFixed(2)}′ against ${d}°${m}′`);
  }
});

test("a year of chunks: whole counts, no seam, spans that close", async () => {
  const from = Date.parse("2026-01-01T00:00:00Z");
  const to = Date.parse("2027-01-01T00:00:00Z");
  const ev = await eventsBetween(iso(from), iso(to));
  const count = (k) => ev.filter((e) => e.k === k).length;
  assert.equal(count("phase"), 50);
  assert.equal(count("eclipse"), 4);
  assert.equal(count("station"), 20);
  assert.equal(ev.filter((e) => e.k === "ingress" && e.body !== "moon").length, 52);
  assert.equal(ev.filter((e) => seasonOf(e) != null).length, 4);
  assert.equal(count("void"), 160);
  assert.equal(ev.filter((e) => e.k === "aspect" && e.a !== "moon").length, 188);
  // The Moon's conjunctions, squares and oppositions to the Sun are the phases, not aspects.
  assert.ok(!ev.some((e) => e.k === "aspect" && e.a === "moon" && e.b === "sun" && !["sextile", "trine"].includes(e.type)));
  // Each chunk holds its own 32 days (a void by its end), in time order; nothing twice across a seam.
  for (const [t0, win] of chunks) {
    assert.equal(win.f, 2);
    const inside = (ms) => ms >= t0 && ms < t0 + WINDOW_TIMES.CHUNK_MS && covers(win, ms);
    assert.ok(win.events.every((e) => (e.k === "void" ? inside(e.end) && e.t > t0 - 3 * 86_400_000 : inside(e.t))));
    assert.ok(win.events.every((e, i, a) => i === 0 || a[i - 1].t <= e.t));
  }
  assert.equal(new Set(ev.map((e) => JSON.stringify(e))).size, ev.length);
  // A void ends when the Moon enters its next sign, and starts at its last aspect.
  const moonIn = new Map(ev.filter((e) => e.k === "ingress" && e.body === "moon").map((e) => [e.t, e.sign]));
  const moonAspects = new Set(ev.filter((e) => e.k === "aspect" && e.a === "moon").map((e) => e.t));
  for (const v of ev.filter((e) => e.k === "void")) {
    assert.equal(moonIn.get(v.end), v.sign, `void ending ${iso(v.end)}`);
    assert.ok(v.end > v.t && v.end - v.t < 3 * 86_400_000);
    if (v.last && v.t >= from && !(v.last.body === "sun" && ["conjunction", "square", "opposition"].includes(v.last.type))) {
      assert.ok(moonAspects.has(v.t), `void from ${iso(v.t)} starts at an aspect`);
    }
  }
});
