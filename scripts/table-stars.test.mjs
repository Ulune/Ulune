/*
 * The table's stars, balance and the Moon's course (part 51 of the launch
 * plan):
 *   - the Moon's next exact aspect before it leaves its sign, and when it
 *     leaves, against an independent search of native Swiss Ephemeris
 *     (pyswisseph 2.10.03 on the same ephe/ files: minute steps, then
 *     bisection) at 16 moments from 1921 to 2025, one of them void of course;
 *   - the stars' and midpoints' contacts against a brute-force search;
 *   - the bodies named in each balance row weigh what the row says;
 *   - without a birth time, a contact said to hold is there at 00:00 and
 *     23:59;
 *   - the twenty new glossary words, in English and French.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { BALANCE_WEIGHT, STAR_CONJUNCT_ORB } from "../src/lib/chart/constants.ts";
import { hydratePatterns } from "../src/lib/chart/patterns.ts";
import { balanceGroups, moonCourseText } from "../src/lib/chart/table-cells.ts";
import { chartTextParts, formatChartTableCsv } from "../src/lib/chart/table-export.ts";
import { MIDPOINT_ORB, midpointRows, starRows } from "../src/lib/chart/table-stars.ts";
import { GLOSSARY } from "../src/lib/i18n/glossary.ts";

const TRACE = {
  name: "TraceQA",
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

const SWISS_MOON = [
  { utc: "1990-06-15T10:00:00Z", leaveAfterMs: 100486306, sign: 0, next: { afterMs: 7480605, body: "pluto", type: "trine" } },
  { utc: "1921-01-07T03:17:00Z", leaveAfterMs: 46354789, sign: 9, next: { afterMs: 8529998, body: "saturn", type: "square" } },
  { utc: "1934-02-19T22:05:00Z", leaveAfterMs: 101475861, sign: 2, next: { afterMs: 22240340, body: "mercury", type: "sextile" } },
  { utc: "1947-03-30T11:45:00Z", leaveAfterMs: 63420413, sign: 4, next: { afterMs: 4197751, body: "mars", type: "trine" } },
  { utc: "1958-05-11T06:30:00Z", leaveAfterMs: 17809883, sign: 11, next: { afterMs: 16254266, body: "pluto", type: "opposition" } },
  { utc: "1966-06-22T17:12:00Z", leaveAfterMs: 42945787, sign: 5, next: { afterMs: 17942519, body: "venus", type: "square" } },
  { utc: "1979-08-02T01:01:00Z", leaveAfterMs: 75863785, sign: 8, next: null },
  { utc: "1985-09-13T14:40:00Z", leaveAfterMs: 150819842, sign: 6, next: { afterMs: 54590292, body: "mercury", type: "conjunction" } },
  { utc: "1993-10-24T09:09:00Z", leaveAfterMs: 43694842, sign: 11, next: { afterMs: 4221459, body: "pluto", type: "square" } },
  { utc: "2004-11-04T19:55:00Z", leaveAfterMs: 155103228, sign: 5, next: { afterMs: 708807, body: "venus", type: "sextile" } },
  { utc: "2011-12-15T00:20:00Z", leaveAfterMs: 99508399, sign: 5, next: { afterMs: 56771299, body: "sun", type: "trine" } },
  { utc: "2019-04-26T12:00:00Z", leaveAfterMs: 209482966, sign: 11, next: { afterMs: 10619279, body: "uranus", type: "square" } },
  { utc: "2024-07-18T23:59:00Z", leaveAfterMs: 29681635, sign: 9, next: { afterMs: 28761304, body: "neptune", type: "square" } },
  { utc: "2000-01-01T12:00:00Z", leaveAfterMs: 120703651, sign: 8, next: { afterMs: 10728837, body: "uranus", type: "square" } },
  { utc: "1969-07-20T20:17:00Z", leaveAfterMs: 146807133, sign: 7, next: { afterMs: 52789741, body: "venus", type: "trine" } },
  { utc: "2025-11-09T20:00:00Z", leaveAfterMs: 77613979, sign: 4, next: { afterMs: 1543087, body: "sun", type: "trine" } },
];

test("the Moon's course agrees with a search of native Swiss Ephemeris to the second", async () => {
  let voids = 0;
  for (const ref of SWISS_MOON) {
    const [date, time] = ref.utc.slice(0, 16).split("T");
    const chart = await calculateNatal({ ...TRACE, name: ref.utc, date, time, tz: "+00:00" });
    const born = Date.parse(chart.meta.utc);
    assert.equal(born, Date.parse(ref.utc), ref.utc);
    const c = chart.meta.moonCourse;
    assert.ok(c, `${ref.utc}: no course`);
    assert.ok(Math.abs(Date.parse(c.leaves.utc) - born - ref.leaveAfterMs) < 1500, `${ref.utc}: leaves ${c.leaves.utc}`);
    assert.equal(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"].indexOf(c.leaves.sign), ref.sign, ref.utc);
    if (ref.next == null) {
      voids += 1;
      assert.equal(c.next, null, `${ref.utc}: void of course`);
    } else {
      assert.equal(`${c.next?.type} ${c.next?.body}`, `${ref.next.type} ${ref.next.body}`, ref.utc);
      assert.ok(Math.abs(Date.parse(c.next.utc) - born - ref.next.afterMs) < 1500, `${ref.utc}: next at ${c.next.utc}`);
    }
    // The void-of-course flag follows the search.
    assert.equal(hydratePatterns(chart).vocMoon, ref.next == null, `${ref.utc}: vocMoon`);
  }
  assert.equal(voids, 1);
});

test("the Moon's course in words", async () => {
  const chart = await calculateNatal(TRACE);
  assert.equal(
    moonCourseText(chart, "en"),
    "The Moon’s next aspect: trine Pluto, 15 Jun 1990, 12:04 UT (2 h 04 min after birth); it enters Aries 16 Jun 1990, 13:54 UT.",
  );
  assert.equal(
    moonCourseText(chart, "fr"),
    "Prochain aspect de la Lune\u202f: trigone Pluton, 15 juin 1990, 12:04 UT (2 h 04 min après la naissance)\u202f; elle entre en Bélier 16 juin 1990, 13:54 UT.",
  );
  const voidChart = await calculateNatal({ ...TRACE, date: "1979-08-02", time: "01:01", tz: "+00:00" });
  assert.equal(moonCourseText(voidChart, "en"), "No major aspect before the Moon enters Sagittarius, 2 Aug 1979, 22:05 UT (21 h 04 min after birth).");
});

test("the stars' and the midpoints' contacts: every body within the orb, and no other", async () => {
  const sep = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  for (const [date, time] of [["1990-06-15", "12:00"], ["1966-06-22", "17:12"], ["2004-11-04", "19:55"], ["1947-03-30", "11:45"]]) {
    const chart = await calculateNatal({ ...TRACE, date, time });
    const points = [...chart.planets, ...Object.values(chart.angles)].filter((p) => p.id !== "fortune" && p.id !== "spirit");
    for (const r of starRows(chart)) {
      const want = points.filter((p) => sep(p.ecliptic, r.ecliptic) <= STAR_CONJUNCT_ORB).map((p) => p.id).sort();
      assert.deepEqual(r.contacts.map((c) => c.body).sort(), want, `${date} ${r.id}`);
      assert.equal(r.ecliptic, chart.stars.find((s) => s.id === r.id).ecliptic);
    }
    for (const r of midpointRows(chart)) {
      const want = points
        .filter((p) => p.id !== r.a && p.id !== r.b && Math.min(sep(p.ecliptic, r.ecliptic), 180 - sep(p.ecliptic, r.ecliptic)) <= MIDPOINT_ORB)
        .map((p) => p.id)
        .sort();
      assert.deepEqual(r.contacts.map((c) => c.body).sort(), want, `${date} ${r.id}`);
      for (const c of r.contacts) assert.equal(c.opposite, sep(points.find((p) => p.id === c.body).ecliptic, r.ecliptic) > 90);
    }
  }
  const trace = await calculateNatal(TRACE);
  const sunMoon = midpointRows(trace).find((r) => r.id === "sun-moon");
  assert.deepEqual(sunMoon.contacts.map((c) => `${c.body} ${(c.orb * 60).toFixed(0)}'`), ["vesta 38'"]);
});

test("the bodies named in each balance row weigh what the row says", async () => {
  for (const timeUnknown of [false, true]) {
    const chart = await calculateNatal({ ...TRACE, timeUnknown });
    for (const g of balanceGroups(chart, hydratePatterns(chart), "en")) {
      for (const row of g.rows) {
        const sum = row.bodies.reduce((s, id) => s + (BALANCE_WEIGHT[id] ?? 0), 0);
        assert.ok(Math.abs(sum - row.value) < 1e-9, `${timeUnknown ? "no time" : "known"} ${g.id} ${row.id}: ${sum} vs ${row.value}`);
      }
    }
  }
});

test("without a birth time, a star or midpoint contact said to hold is there at 00:00 and 23:59", async () => {
  const places = [
    [48.8566, 2.3522],
    [-33.8688, 151.2093],
  ];
  const days = [];
  for (let y = 1930; y <= 2025; y += 5) days.push(`${y}-0${1 + (y % 9)}-1${y % 10}`);
  let held = 0;
  let marked = 0;
  const sep = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  for (const [i, date] of days.entries()) {
    const [latitude, longitude] = places[i % 2];
    const at = { ...TRACE, date, latitude, longitude };
    const noon = await calculateNatal({ ...at, name: "NoTime", timeUnknown: true });
    const ends = [await calculateNatal({ ...at, time: "00:00" }), await calculateNatal({ ...at, time: "23:59" })];
    const lonAt = (chart, id) => [...chart.planets, ...Object.values(chart.angles)].find((p) => p.id === id)?.ecliptic;
    for (const r of starRows(noon)) {
      for (const c of r.contacts) {
        if (c.uncertain) {
          marked += 1;
          continue;
        }
        held += 1;
        for (const e of ends) assert.ok(sep(lonAt(e, c.body), r.ecliptic) <= STAR_CONJUNCT_ORB, `${date} ${r.id} ${c.body}`);
      }
    }
    for (const r of midpointRows(noon)) {
      for (const c of r.contacts) {
        if (c.uncertain) {
          marked += 1;
          continue;
        }
        held += 1;
        for (const e of ends) {
          const m = midpointRows(e).find((x) => x.id === r.id);
          const d = sep(lonAt(e, c.body), m.ecliptic);
          assert.ok((c.opposite ? 180 - d : d) <= MIDPOINT_ORB, `${date} ${r.id} ${c.body}`);
        }
      }
    }
  }
  assert.ok(held >= 5, `${held} contacts hold all day`);
  assert.ok(marked >= 5, `${marked} contacts marked ~`);
});

test("twenty new glossary words, each in English and French", () => {
  const ids = ["declination", "latitude", "outOfBounds", "domicile", "exaltation", "triplicity", "term", "face", "peregrine", "sect", "combust", "dispositor", "reception", "outOfSign", "parallel", "intercepted", "siderealTime", "midpoint", "fixedStar", "lot"];
  for (const id of ids) {
    const e = GLOSSARY[id];
    assert.ok(e, id);
    for (const i of [0, 1]) {
      assert.ok(e.term[i].length > 2 && e.body[i].length > 40, `${id} ${i}`);
      assert.doesNotMatch(e.body[i], /\d[.,]\d+ ?°/, `${id}: a decimal degree`);
    }
  }
  // 59, the 15 numerology words of part 63 (numerology-texts.test.mjs), and undefined and open centres (review 3 Oct, H4).
  assert.equal(Object.keys(GLOSSARY).length, 75);
});

test("the text copy and the CSV carry the stars, the midpoints and the Moon's course", async () => {
  const chart = await calculateNatal(TRACE);
  const parts = chartTextParts(chart, "en");
  assert.deepEqual(parts.map((p) => p.id), ["identity", "points", "houses", "aspects", "dignities", "patterns", "balance", "stars"]);
  const stars = parts.find((p) => p.id === "stars").lines;
  assert.ok(stars.includes(`Regulus · 29°41'52" Leo · On it: none`), stars.join("\n"));
  assert.ok(stars.includes(`Sun/Moon · 4°08'52" Taurus · On it: Vesta 0°38'`));
  const balance = parts.find((p) => p.id === "balance").lines;
  assert.ok(balance[1].startsWith("Elements: fire 2 (Mars) · earth 9 (Ascendant, Venus, Midheaven, Saturn, Uranus, Neptune)"), balance[1]);
  const fr = chartTextParts(chart, "fr").find((p) => p.id === "balance").lines;
  assert.match(fr[1], /eau 6,5 \(/);
  const csv = formatChartTableCsv(chart, "en").split("\n");
  assert.ok(csv.includes("midpoint,sun-moon,34.147887,taurus,vesta:0.6259,0") || csv.some((l) => l.startsWith("midpoint,sun-moon,") && l.includes("vesta:")));
  assert.ok(csv.some((l) => /^moonCourse,pluto,trine,1990-06-15T12:04:\d\d\.\d{3}Z,aries,1990-06-16T13:54:\d\d\.\d{3}Z$/.test(l)), csv.filter((l) => l.startsWith("moonCourse")).join("\n"));
});
