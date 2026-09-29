/*
 * The table's houses and aspects (part 49 of the launch plan):
 *   - each house's size, the ruler of its sign and where it stands, the
 *     bodies inside, intercepted signs and signs on two cusps, by hand;
 *   - each aspect's allowed orb and strength, out-of-sign aspects by hand,
 *     the mirrors an axis makes folded, sorting and filters;
 *   - parallels and contra-parallels against an independent Swiss
 *     Ephemeris (pyswisseph 2.10.03, same ephe/ files): the declinations of
 *     the angles by swe_cotrans, every pair within 1°;
 *   - without a birth time, the parallels said to hold all day against casts
 *     at 00:00 and 23:59.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { aspectOrb } from "../src/lib/chart/constants.ts";
import { parallelHolds } from "../src/lib/chart/day-checks.ts";
import {
  aspectTableRows,
  isOutOfSign,
  parallelRows,
  parallelsOf,
  twinGroups,
  twinKey,
} from "../src/lib/chart/table-aspects.ts";
import { declinationOf } from "../src/lib/chart/table-facts.ts";
import { houseRows } from "../src/lib/chart/table-houses.ts";
import { chartTextParts, formatChartTableCsv } from "../src/lib/chart/table-export.ts";

const TRACE = {
  name: "TraceQA",
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

const sep = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const ANGLE = { conjunction: 0, opposition: 180, trine: 120, square: 90, sextile: 60, quincunx: 150, semisextile: 30, semisquare: 45, quintile: 72 };
const pointsOf = (chart) => new Map([...chart.planets, ...Object.values(chart.angles)].map((p) => [p.id, p]));

test("the test chart's houses, by hand", async () => {
  const chart = await calculateNatal(TRACE);
  const rows = houseRows(chart, "en");
  assert.equal(rows.length, 12);
  // Sizes: cusp to cusp, 360° in all; opposite houses the same size (Placidus).
  const sizes = rows.map((r) => r.size.text);
  assert.deepEqual(sizes, ["21°24'", "27°25'", "34°05'", "37°09'", "32°57'", "27°01'", "21°24'", "27°25'", "34°05'", "37°09'", "32°57'", "27°01'"]);
  const total = chart.houses.reduce((s, h, i) => s + ((chart.houses[(i + 1) % 12].ecliptic - h.ecliptic + 360) % 360), 0);
  assert.ok(Math.abs(total - 360) < 1e-9);
  // The 1st: Virgo, ruled by Mercury in Gemini in the 10th; Virgo on cusps 1 and 2.
  const [first] = rows;
  assert.equal(first.sign, "virgo");
  assert.deepEqual(first.rulers.map((r) => r.text), ["Mercury in Gemini, house 10"]);
  assert.deepEqual(first.twoCusps, [1, 2]);
  // Scorpio on the 4th: Pluto, and Mars beside it as the traditional ruler; Sagittarius intercepted in it.
  assert.deepEqual(rows[3].rulers.map((r) => [r.id, r.traditional, r.text]), [
    ["pluto", false, "Pluto in Scorpio, house 3"],
    ["mars", true, "Mars in Aries, house 8"],
  ]);
  assert.deepEqual(rows[3].intercepted, ["sagittarius"]);
  assert.deepEqual(rows[9].intercepted, ["gemini"]);
  assert.deepEqual(rows[6].twoCusps, [7, 8]);
  assert.equal(rows.filter((r) => r.twoCusps).length, 4);
  // Every body in exactly one house, in the Points order.
  assert.deepEqual(rows[9].inside, ["sun", "mercury", "pallas"]);
  assert.deepEqual(rows[10].inside, ["jupiter", "chiron", "southnode", "ceres", "antivertex"]);
  assert.equal(rows.reduce((n, r) => n + r.inside.length, 0), chart.planets.length);
});

test("whole-sign houses: 30° each, nothing intercepted, no sign on two cusps", async () => {
  const chart = await calculateNatal({ ...TRACE, houseSystem: "whole" });
  for (const r of houseRows(chart, "en")) {
    assert.equal(r.size.text, "30°00'");
    assert.deepEqual(r.intercepted, []);
    assert.equal(r.twoCusps, null);
  }
});

test("allowed orbs and strength: planet to angle trine 6°, sextile 4°; strength 1 − orb / allowed", async () => {
  const chart = await calculateNatal(TRACE);
  const { rows } = aspectTableRows(chart, "en", { sort: "orb", minors: true, angles: true, unfold: true });
  assert.equal(rows.length, chart.aspects.length);
  for (const r of rows) {
    const a = r.aspect;
    const allowed = aspectOrb(a.type, a.a, a.b);
    assert.ok(a.orb <= allowed + 1e-9, `${a.id} within its orb`);
    assert.ok(Math.abs(r.strength - (1 - a.orb / allowed)) < 1e-9, a.id);
  }
  const vesta = rows.find((r) => r.aspect.id === "vesta_trine_ascendant");
  assert.equal(vesta.allowed, "6°");
  const ceres = rows.find((r) => r.aspect.id === "ceres_sextile_midheaven");
  assert.equal(ceres.allowed, "4°");
  const quincunx = rows.find((r) => r.aspect.id === "sun_quincunx_saturn");
  assert.equal(quincunx.allowed, "3°");
  assert.equal(rows.find((r) => r.aspect.type === "semisextile").allowed, "2°30'");
});

test("out of sign, by hand: the degrees make the aspect, the signs do not", async () => {
  // A trine from 29° Aries to 1° Virgo is out of sign; from 1° Aries to 29° Leo, in sign.
  assert.equal(isOutOfSign("trine", 29, 151), true);
  assert.equal(isOutOfSign("trine", 1, 149), false);
  assert.equal(isOutOfSign("conjunction", 29.5, 30.5), true);
  // 29° Pisces opposite 29° Virgo in sign; 1° Aries opposite 29° Virgo out of sign.
  assert.equal(isOutOfSign("opposition", 359, 179), false);
  assert.equal(isOutOfSign("opposition", 1, 179), true);
  // No sign of their own: no mark.
  assert.equal(isOutOfSign("semisquare", 0, 45), null);
  assert.equal(isOutOfSign("quintile", 0, 72), null);
  const chart = await calculateNatal(TRACE);
  const { rows } = aspectTableRows(chart, "en", { sort: "orb", minors: true, angles: true, unfold: true });
  const out = rows.filter((r) => r.outOfSign).map((r) => r.aspect.id).sort();
  // Ceres 27°50' Cancer square Vesta 4°46' Taurus (two signs apart); the Ascendant
  // 5°09' Virgo square the MC 28°02' Taurus (four); Mercury 5°33' Gemini conjunct the MC.
  assert.deepEqual(out, [
    "ascendant_square_ic",
    "ascendant_square_midheaven",
    "ceres_square_vesta",
    "descendant_square_ic",
    "mercury_conjunction_midheaven",
    "mercury_opposition_ic",
    "midheaven_square_descendant",
  ]);
});

test("mirrors: an aspect to one end of an axis is the same fact as its mirror to the other end", async () => {
  // Uranus trine the Ascendant is Uranus sextile the Descendant.
  assert.equal(twinKey("uranus", "ascendant", 120), twinKey("uranus", "descendant", 60));
  // Two tails: the North Node's quintile to the IC is the South Node's to the MC.
  assert.equal(twinKey("northnode", "ic", 72), twinKey("southnode", "midheaven", 72));
  assert.notEqual(twinKey("uranus", "ascendant", 120), twinKey("uranus", "ascendant", 60));
  const chart = await calculateNatal(TRACE);
  const points = pointsOf(chart);
  const groups = twinGroups(chart.aspects).filter((g) => g.length > 1);
  assert.equal(groups.length, 24);
  assert.equal(groups.reduce((n, g) => n + g.length - 1, 0), 30);
  for (const [head, ...rest] of groups) {
    for (const t of rest) {
      // The same orb, and each is the aspect its two points really make.
      assert.ok(Math.abs(t.orb - head.orb) < 2e-4, `${t.id} vs ${head.id}`);
      assert.ok(Math.abs(sep(points.get(t.a).ecliptic, points.get(t.b).ecliptic) - ANGLE[t.type]) <= t.orb + 1e-4, t.id);
    }
    // The head names the axis by its first end when it can.
    const tails = (a) => ["descendant", "ic", "southnode", "antivertex"].filter((id) => a.a === id || a.b === id).length;
    for (const t of rest) assert.ok(tails(head) <= tails(t), `${head.id} before ${t.id}`);
  }
  const folded = aspectTableRows(chart, "en");
  assert.equal(folded.total, 159);
  assert.equal(folded.folded, 30);
  assert.equal(folded.rows.length, 129);
  const uranus = folded.rows.find((r) => r.aspect.id === "uranus_trine_ascendant");
  assert.deepEqual(uranus.twins.map((t) => t.id), ["uranus_sextile_descendant"]);
  const node = folded.rows.find((r) => r.aspect.id === "northnode_conjunction_vertex");
  assert.equal(node.twins.length, 3);
});

test("filters and sorting", async () => {
  const chart = await calculateNatal(TRACE);
  const noMinors = aspectTableRows(chart, "en", { sort: "orb", minors: false, angles: true, unfold: true });
  assert.equal(noMinors.rows.length, 111);
  assert.ok(noMinors.rows.every((r) => !r.minor));
  const angles = new Set(["ascendant", "midheaven", "descendant", "ic", "vertex", "antivertex"]);
  const noAngles = aspectTableRows(chart, "en", { sort: "orb", minors: true, angles: false, unfold: false });
  assert.ok(noAngles.rows.every((r) => !angles.has(r.aspect.a) && !angles.has(r.aspect.b)));
  assert.equal(noAngles.shown, 108);
  assert.equal(noAngles.rows.length, 101);
  // By orb: the majors first, each level tightest first.
  const byOrb = aspectTableRows(chart, "en").rows.map((r) => r.aspect);
  const majors = byOrb.filter((a) => a.level === "major");
  assert.deepEqual(byOrb.slice(0, majors.length), majors);
  for (const level of [majors, byOrb.slice(majors.length)]) {
    const orbs = level.map((a) => a.orb);
    assert.deepEqual(orbs, [...orbs].sort((a, b) => a - b));
  }
  assert.equal(byOrb[0].id, "jupiter_conjunction_chiron");
  // By body: the Sun's aspects first, then the Moon's.
  const byBody = aspectTableRows(chart, "en", { sort: "body", minors: true, angles: true, unfold: false }).rows;
  const firstNonSun = byBody.findIndex((r) => r.aspect.a !== "sun" && r.aspect.b !== "sun");
  assert.ok(firstNonSun > 0);
  assert.ok(byBody.slice(firstNonSun).every((r) => r.aspect.a !== "sun" && r.aspect.b !== "sun"));
  assert.ok([byBody[firstNonSun].aspect.a, byBody[firstNonSun].aspect.b].includes("moon"));
  // By aspect: conjunctions first, then oppositions, each tightest first.
  const byAspect = aspectTableRows(chart, "en", { sort: "aspect", minors: true, angles: true, unfold: true }).rows.map((r) => r.aspect);
  assert.equal(byAspect[0].type, "conjunction");
  const types = byAspect.map((a) => a.type);
  assert.deepEqual(types, [...types].sort((a, b) => Object.keys(ANGLE).indexOf(a) - Object.keys(ANGLE).indexOf(b)));
});

/**
 * pyswisseph 2.10.03 on the same ephe/ files, 15 Jun 1990 10:00 UT (UTC to
 * Julian day by swe_utc_to_jd): the angles' declinations by swe_cotrans
 * with the true obliquity (23.44203756978349°), and every pair of bodies,
 * points and angles within 1° of declination (the two ends of an axis left
 * unpaired), in minutes of arc.
 */
const SWISS_ANGLE_DECLINATION = { ascendant: 9.625748484129048, midheaven: 19.725419502606258, vertex: -18.733174850725426 };
const SWISS_PARALLELS = [
  ["pluto", "parallel", "pallas", 0.120187],
  ["lilith", "contra", "ceres", 0.143032],
  ["mercury", "contra", "ic", 0.14557],
  ["mercury", "parallel", "midheaven", 0.14557],
  ["sun", "contra", "uranus", 0.204995],
  ["northnode", "parallel", "vertex", 0.494837],
  ["southnode", "contra", "vertex", 0.494837],
  ["northnode", "contra", "antivertex", 0.494837],
  ["southnode", "parallel", "antivertex", 0.494837],
  ["eris", "contra", "ascendant", 0.521986],
  ["eris", "parallel", "descendant", 0.521986],
  ["sun", "parallel", "jupiter", 0.6259],
  ["pallas", "parallel", "juno", 0.642158],
  ["saturn", "parallel", "neptune", 0.673917],
  ["venus", "parallel", "chiron", 0.741756],
  ["pluto", "parallel", "juno", 0.762345],
  ["jupiter", "contra", "neptune", 0.819029],
  ["jupiter", "contra", "uranus", 0.830894],
  ["mercury", "parallel", "antivertex", 0.846675],
  ["mercury", "contra", "vertex", 0.846675],
  ["moon", "contra", "sedna", 0.860621],
  ["moon", "contra", "mars", 0.865691],
  ["ic", "contra", "antivertex", 0.992245],
  ["midheaven", "parallel", "antivertex", 0.992245],
  ["ic", "parallel", "vertex", 0.992245],
  ["midheaven", "contra", "vertex", 0.992245],
];

test("declinations of the angles and the parallels agree with native Swiss Ephemeris", async () => {
  const chart = await calculateNatal(TRACE);
  const points = pointsOf(chart);
  for (const [id, want] of Object.entries(SWISS_ANGLE_DECLINATION)) {
    const got = declinationOf(points.get(id), chart);
    assert.ok(Math.abs(got - want) < 1e-9, `${id}: ${got} vs ${want}`);
  }
  // The lots have none; the Descendant mirrors the Ascendant.
  assert.equal(declinationOf(points.get("fortune"), chart), null);
  assert.ok(Math.abs(declinationOf(points.get("descendant"), chart) + SWISS_ANGLE_DECLINATION.ascendant) < 1e-9);
  const key = (a, kind, b) => `${[a, b].sort().join("|")}|${kind}`;
  const got = new Map(parallelsOf(chart).map((p) => [key(p.a, p.kind, p.b), p.orb]));
  assert.equal(got.size, SWISS_PARALLELS.length);
  for (const [a, kind, b, orb] of SWISS_PARALLELS) {
    const mine = got.get(key(a, kind, b));
    assert.ok(mine != null, `${a} ${kind} ${b} missing`);
    assert.ok(Math.abs(mine - orb) < 2e-6, `${a} ${kind} ${b}: ${mine} vs ${orb}`);
  }
  // Mirrors folded: 17 rows; without the angles and the Vertex, 12.
  assert.equal(parallelRows(chart).length, 17);
  assert.equal(parallelRows(chart, { angles: false, unfold: false }).length, 12);
  assert.equal(parallelRows(chart, { angles: true, unfold: true }).length, 26);
  const first = parallelRows(chart)[2];
  assert.equal(`${first.a} ${first.kind} ${first.b}`, "mercury parallel midheaven");
  assert.deepEqual(first.twins.map((t) => `${t.a} ${t.kind} ${t.b}`), ["mercury contra ic"]);
});

/** Days spread over a century, at Paris and at Sydney. */
const DAYS = [
  ["1931-03-02", 48.8566, 2.3522],
  ["1944-09-17", -33.8688, 151.2093],
  ["1957-12-05", 48.8566, 2.3522],
  ["1969-07-20", -33.8688, 151.2093],
  ["1978-01-28", 48.8566, 2.3522],
  ["1986-05-09", -33.8688, 151.2093],
  ["1990-06-15", 48.8566, 2.3522],
  ["1999-08-11", 48.8566, 2.3522],
  ["2003-10-30", -33.8688, 151.2093],
  ["2012-04-14", 48.8566, 2.3522],
  ["2020-12-21", -33.8688, 151.2093],
  ["2025-02-06", 48.8566, 2.3522],
];

test("without a birth time, a parallel said to hold is within 1° and of the same kind at 00:00 and 23:59", async () => {
  let held = 0;
  let marked = 0;
  let differed = 0;
  for (const [date, latitude, longitude] of DAYS) {
    const at = { ...TRACE, date, latitude, longitude };
    const noon = await calculateNatal({ ...at, name: "NoTime", timeUnknown: true });
    const ends = [await calculateNatal({ ...at, time: "00:00" }), await calculateNatal({ ...at, time: "23:59" })];
    const declAt = (chart, id) => {
      const p = pointsOf(chart).get(id);
      return p ? declinationOf(p, chart) : null;
    };
    for (const p of parallelsOf(noon)) {
      const a = pointsOf(noon).get(p.a);
      const b = pointsOf(noon).get(p.b);
      assert.equal(p.uncertain, !parallelHolds(noon, a, b, p.declA, p.declB));
      if (a.uncertain || b.uncertain) {
        assert.equal(p.uncertain, true, `${date} ${p.id}: a point that hangs on the time`);
        continue;
      }
      const there = ends.map((e) => {
        const da = declAt(e, p.a);
        const db = declAt(e, p.b);
        return { orb: Math.abs(Math.abs(da) - Math.abs(db)), kind: Math.sign(da) === Math.sign(db) ? "parallel" : "contra" };
      });
      if (!p.uncertain) {
        held += 1;
        for (const x of there) {
          assert.ok(x.orb <= 1, `${date} ${p.id} holds all day but is ${x.orb}° apart at an end`);
          assert.equal(x.kind, p.kind, `${date} ${p.id} changes kind`);
        }
      } else {
        marked += 1;
        if (there.some((x) => x.orb > 1 || x.kind !== p.kind)) differed += 1;
      }
    }
    // The cast carries each body's declination at the day's two ends.
    const moon = noon.meta.dayDecl?.moon;
    assert.ok(moon && Math.abs(moon[0] - declAt(ends[0], "moon")) < 1e-6, `${date} the Moon's declination at 00:00`);
  }
  assert.ok(held > 80, `${held} parallels hold all day`);
  assert.ok(marked > 20, `${marked} parallels marked ~`);
  assert.ok(differed >= 0.35 * marked, `${differed} of the ${marked} marked ~ differ at an end`);
});

test("the text copy and the CSV carry the houses, the aspects and the parallels", async () => {
  const chart = await calculateNatal(TRACE);
  const parts = chartTextParts(chart, "en");
  const houses = parts.find((p) => p.id === "houses").lines;
  assert.equal(houses[1], "House 1 · 5°08'43\" Virgo · size 21°24' · ruled by Mercury in Gemini, house 10 · inside: — · Virgo on cusps 1 and 2");
  assert.ok(houses.includes("House 4 · 28°02'18\" Scorpio · size 37°09' · ruled by Pluto in Scorpio, house 3, traditionally Mars in Aries, house 8 · inside: True Lilith, Lot of Spirit · intercepted sign: Sagittarius"));
  const aspects = parts.find((p) => p.id === "aspects").lines;
  assert.equal(aspects[1], "Jupiter conjunction Chiron · orb 0°11' of 8° · applying");
  assert.ok(aspects.includes("Sun quincunx Saturn · orb 0°01' of 3° · separating · minor"));
  assert.ok(aspects.includes("Uranus trine Ascendant · orb 3°01' of 6° · applying · mirror: Uranus sextile Descendant"), aspects.join("\n"));
  assert.ok(aspects.includes("In declination"));
  assert.ok(aspects.includes(`Sun contra-parallel Uranus · orb 0°12' of 1° · +23°18'30" / −23°30'48"`), aspects.join("\n"));
  const fr = chartTextParts(chart, "fr").find((p) => p.id === "aspects").lines;
  assert.ok(fr.includes(`Soleil contre-parallèle Uranus · orbe 0°12' sur 1° · +23°18'30" / −23°30'48"`), fr.join("\n"));
  const csv = formatChartTableCsv(chart, "en").split("\n");
  assert.equal(csv[0], "section,field,value");
  const houseHead = csv.find((l) => l.startsWith("house,id,")).split(",");
  const house4 = csv.find((l) => l.startsWith("house,4,")).split(",");
  const h = Object.fromEntries(houseHead.map((k, i) => [k, house4[i]]));
  assert.equal(h.ruler, "pluto");
  assert.equal(h.traditionalRuler, "mars");
  assert.equal(h.intercepted, "sagittarius");
  assert.ok(Math.abs(Number(h.size) - 37.146) < 0.001, h.size);
  const aspectHead = csv.find((l) => l.startsWith("aspect,a,")).split(",");
  const dsc = csv.find((l) => l.startsWith("aspect,uranus,descendant,")).split(",");
  const d = Object.fromEntries(aspectHead.map((k, i) => [k, dsc[i]]));
  assert.equal(d.mirrorOf, "uranus_trine_ascendant");
  assert.equal(d.allowedOrb, "4");
  assert.equal(csv.filter((l) => l.startsWith("parallel,") && !l.startsWith("parallel,a,")).length, 26);
});
