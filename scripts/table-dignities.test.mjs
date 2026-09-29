/*
 * The table's dignities and patterns (part 50 of the launch plan):
 *   - the test chart's dignity table and scores, by hand;
 *   - the dispositors and the mutual receptions, by hand and against a
 *     second derivation on 2,000 random charts;
 *   - the chart ruler, traditional and modern;
 *   - the configurations merged: 12 found on the test chart, 5 shapes;
 *   - without a birth time, a dispositor chain said to hold is the same at
 *     00:00 and 23:59;
 *   - the text copy and the CSV.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { EXALTATION, SIGN_IDS, TRADITIONAL_RULER } from "../src/lib/chart/constants.ts";
import { hydratePatterns } from "../src/lib/chart/patterns.ts";
import { chartRulerFacts, dignityRows, dispositorsOf, mutualReceptions, receptionDetail, strongestLine } from "../src/lib/chart/table-dignities.ts";
import { chartTextParts, formatChartTableCsv } from "../src/lib/chart/table-export.ts";
import { mergedShapes, shapeLine } from "../src/lib/chart/table-patterns.ts";

const TRACE = {
  name: "TraceQA",
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

test("the test chart's dignity table, by hand (a day chart)", async () => {
  const chart = await calculateNatal(TRACE);
  const patterns = hydratePatterns(chart);
  const rows = dignityRows(chart, patterns, "en");
  const by = Object.fromEntries(rows.map((r) => [r.planet, r]));
  const score = (id) => `${by[id].dignity.scoreText} ${by[id].dignity.words.join(", ")}`;
  assert.equal(score("sun"), "+1 face");
  assert.equal(score("moon"), "−5 peregrine");
  assert.equal(score("mercury"), "+7 domicile, term");
  assert.equal(score("venus"), "+8 domicile, triplicity");
  assert.equal(score("mars"), "+5 domicile");
  assert.equal(score("jupiter"), "+4 exaltation");
  assert.equal(score("saturn"), "+7 domicile, term");
  // The Sun at 24°03' Gemini: Mercury's sign, no exaltation, air (Saturn by day,
  // Mercury by night, Jupiter participating), Saturn's term (24°–30°), its own face (20°–30°).
  const sun = by.sun.rulers;
  assert.deepEqual([sun.domicile, sun.exaltation, ...sun.triplicity, sun.term, sun.face, sun.detriment, sun.fall], [
    "mercury",
    null,
    "saturn",
    "mercury",
    "jupiter",
    "saturn",
    "sun",
    "jupiter",
    null,
  ]);
  // The Moon at 14°15' Pisces: Jupiter's sign, Venus exalted there; the Moon only participates in water's triplicity.
  const moon = by.moon.rulers;
  assert.deepEqual([moon.domicile, moon.exaltation, ...moon.triplicity, moon.term, moon.face, moon.detriment, moon.fall], [
    "jupiter",
    "venus",
    "venus",
    "mars",
    "moon",
    "jupiter",
    "jupiter",
    "mercury",
    "mercury",
  ]);
  // Day chart: the day triplicity ruler is the one scored.
  assert.ok(rows.every((r) => r.sectTriplicity === 0));
  assert.deepEqual(rows.map((r) => [r.planet, r.sect?.text ?? null]), [
    ["sun", "in sect"],
    ["moon", "out of sect"],
    ["mercury", "in sect"],
    ["venus", "out of sect"],
    ["mars", "out of sect"],
    ["jupiter", "in sect"],
    ["saturn", "in sect"],
  ]);
  assert.equal(strongestLine(rows, "en").text, "Venus +8, Mercury +7, Saturn +7, Mars +5, Jupiter +4, Sun +1, Moon −5");
});

test("the test chart's dispositors and receptions, by hand", async () => {
  const chart = await calculateNatal(TRACE);
  const d = dispositorsOf(chart);
  assert.deepEqual(d.finals, ["mercury", "venus", "mars", "saturn"]);
  assert.equal(d.single, null);
  assert.deepEqual(d.loops, [["moon", "jupiter"]]);
  const chains = Object.fromEntries(d.chains.map((c) => [c.path[0], `${c.path.join(">")}:${c.end}`]));
  assert.deepEqual(chains, {
    sun: "sun>mercury:final",
    moon: "moon>jupiter>moon:loop",
    jupiter: "jupiter>moon>jupiter:loop",
    uranus: "uranus>saturn:final",
    neptune: "neptune>saturn:final",
    pluto: "pluto>mars:final",
  });
  const receptions = mutualReceptions(chart);
  assert.deepEqual(receptions.map((r) => `${r.a}|${r.b}|${r.kind}`), ["moon|venus|exaltation", "moon|jupiter|domicile"]);
  assert.equal(receptionDetail(receptions[1], chart, "en"), "The Moon in Pisces, Jupiter’s sign; Jupiter in Cancer, the Moon’s sign");
  assert.equal(receptionDetail(receptions[0], chart, "fr"), "La Lune en Poissons, exaltation de Vénus\u202f; Vénus en Taureau, exaltation de la Lune");
});

const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

/** A chart of random signs, enough for the dispositors and the receptions. */
function randomChart(seed) {
  let x = seed;
  const rnd = () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
  const planets = PLANETS.map((id) => {
    const lon = rnd() * 360;
    return { id, sign: SIGN_IDS[Math.floor(lon / 30)], ecliptic: lon };
  });
  return { meta: { timeUnknown: false }, planets, angles: {}, aspects: [] };
}

test("dispositors and receptions agree with a second derivation on 2,000 random charts", () => {
  for (let seed = 1; seed <= 2000; seed += 1) {
    const chart = randomChart(seed);
    const signOf = Object.fromEntries(chart.planets.map((p) => [p.id, p.sign]));
    // Walk each planet's rulers for twenty steps: a fixed point is its final dispositor, anything else a loop.
    const d = dispositorsOf(chart);
    for (const id of PLANETS) {
      let at = id;
      const seen = [id];
      for (let i = 0; i < 20; i += 1) {
        const next = TRADITIONAL_RULER[signOf[at]];
        if (next === at) break;
        at = next;
        seen.push(at);
      }
      const fixed = TRADITIONAL_RULER[signOf[at]] === at;
      if (fixed && at === id) {
        assert.ok(d.finals.includes(id), `${seed}: ${id} is in its own sign`);
        continue;
      }
      const chain = d.chains.find((c) => c.path[0] === id);
      assert.ok(chain, `${seed}: ${id} has a chain`);
      assert.equal(chain.end, fixed ? "final" : "loop", `${seed}: ${id}`);
      if (fixed) assert.equal(chain.path.at(-1), at, `${seed}: ${id} ends at ${at}`);
    }
    assert.equal(d.single != null, d.finals.length === 1 && d.loops.length === 0, `${seed}: single`);
    // Receptions: a is received by b when a stands in b's sign or b's exaltation.
    const seven = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
    const want = [];
    for (let i = 0; i < 7; i += 1) {
      for (let j = i + 1; j < 7; j += 1) {
        const a = seven[i];
        const b = seven[j];
        const aDom = TRADITIONAL_RULER[signOf[a]] === b;
        const aExa = EXALTATION[b] === signOf[a];
        const bDom = TRADITIONAL_RULER[signOf[b]] === a;
        const bExa = EXALTATION[a] === signOf[b];
        if (aDom && bDom) want.push(`${a}|${b}|domicile`);
        else if (aExa && bExa) want.push(`${a}|${b}|exaltation`);
        else if ((aDom && bExa) || (aExa && bDom)) want.push(`${a}|${b}|mixed`);
      }
    }
    assert.deepEqual(mutualReceptions(chart).map((r) => `${r.a}|${r.b}|${r.kind}`), want, `${seed}`);
  }
});

test("the chart ruler: Mercury for Virgo rising; Mars and Pluto for Scorpio rising", async () => {
  const chart = await calculateNatal(TRACE);
  const [ruler, ...rest] = chartRulerFacts(chart, hydratePatterns(chart), "en");
  assert.equal(rest.length, 0);
  assert.equal(ruler.by, "both");
  assert.equal(ruler.where.text, "Mercury in Gemini, house 10");
  assert.deepEqual(ruler.notes.map((n) => n.text), ["in sect", "swift, 124% of its mean", "7°31' from the MC"]);
  // Mirrors folded: the Ascendant's square, not the Descendant's as well.
  assert.deepEqual(ruler.aspects.map((a) => a.text), [
    "square Ascendant 0°24'",
    "trine Vertex 0°37'",
    "trine North Node 2°34'",
    "sextile Mars 5°26'",
    "conjunction Midheaven 7°31'",
  ]);
  // Scorpio rising: Paris, the same day, about 18:30.
  const evening = await calculateNatal({ ...TRACE, time: "18:30" });
  assert.equal(evening.angles.ascendant.sign, "scorpio");
  const both = chartRulerFacts(evening, hydratePatterns(evening), "en");
  assert.deepEqual(both.map((r) => [r.by, r.planet]), [
    ["traditional", "mars"],
    ["modern", "pluto"],
  ]);
});

test("the configurations merged: 12 found, 5 shapes, the dominant kite first", async () => {
  const chart = await calculateNatal(TRACE);
  const patterns = hydratePatterns(chart);
  assert.equal(patterns.configurations.length, 12);
  const shapes = mergedShapes(chart, patterns);
  assert.deepEqual(shapes.map((s) => [s.type, s.ways]), [
    ["kite", 2],
    ["kite", 2],
    ["mysticRectangle", 2],
    ["grandTrine", 2],
    ["tsquare", 4],
  ]);
  assert.equal(shapes.reduce((n, s) => n + s.ways, 0), 12);
  assert.equal(shapes[0].dominant, true);
  assert.ok(shapes.slice(1).every((s) => !s.dominant));
  const tsquare = shapes.find((s) => s.type === "tsquare");
  assert.equal(shapeLine(tsquare, "en"), "T-square · Jupiter or Chiron, Neptune or Uranus · focal Mars · orbs 2°09' to 4°53' · 4 ways, with the bodies in conjunction");
  // Each shape's aspects are the ones its representative's members make, within their orbs.
  for (const s of shapes) {
    const members = new Set(s.representative.members);
    assert.ok(s.aspects.length >= 3);
    assert.ok(s.aspects.every((a) => members.has(a.a) && members.has(a.b)));
    assert.equal(s.orbs[0], Math.min(...s.aspects.map((a) => a.orb)));
  }
  const fr = shapeLine(tsquare, "fr");
  assert.equal(fr, "T-carré · Jupiter ou Chiron, Neptune ou Uranus · foyer Mars · orbes de 2°09' à 4°53' · 4 façons, avec les corps en conjonction");
});

test("without a birth time, a dispositor chain said to hold is the same at 00:00 and 23:59", async () => {
  const days = ["1931-03-02", "1947-03-30", "1966-06-22", "1979-08-02", "1990-06-15", "1999-08-11", "2012-04-14", "2024-07-18"];
  let held = 0;
  for (const date of days) {
    const noon = await calculateNatal({ ...TRACE, date, name: "NoTime", timeUnknown: true });
    const ends = [await calculateNatal({ ...TRACE, date, time: "00:00" }), await calculateNatal({ ...TRACE, date, time: "23:59" })];
    for (const c of dispositorsOf(noon).chains) {
      if (c.uncertain) continue;
      held += 1;
      for (const e of ends) {
        const there = dispositorsOf(e).chains.find((x) => x.path[0] === c.path[0]);
        assert.deepEqual(there?.path, c.path, `${date} ${c.path[0]}`);
      }
    }
    for (const r of mutualReceptions(noon)) {
      if (r.uncertain) continue;
      for (const e of ends) assert.ok(mutualReceptions(e).some((x) => x.a === r.a && x.b === r.b && x.kind === r.kind), `${date} ${r.a} ${r.b}`);
    }
  }
  assert.ok(held > 20, `${held} chains hold all day`);
});

test("the text copy and the CSV carry the dignities and the shapes", async () => {
  const chart = await calculateNatal(TRACE);
  const parts = chartTextParts(chart, "en");
  assert.deepEqual(parts.map((p) => p.id), ["identity", "points", "houses", "aspects", "dignities", "patterns", "balance", "stars"]);
  const lines = parts.find((p) => p.id === "dignities").lines;
  assert.equal(lines[0], "Dignities");
  assert.equal(
    lines[1],
    "Ruler of the rising sign: Mercury in Gemini, house 10 · domicile, term +7 · in sect · swift, 124% of its mean · 7°31' from the MC · square Ascendant 0°24', trine Vertex 0°37', trine North Node 2°34', sextile Mars 5°26', conjunction Midheaven 7°31'",
  );
  assert.ok(lines.includes("Sun · rulers of its degree: domicile Mercury, exaltation —, triplicity Saturn/Mercury/Jupiter, term Saturn, face Sun; detriment Jupiter, fall — · face +1 · in sect"));
  assert.ok(lines.includes("Final dispositors: Mercury, Venus, Mars, Saturn"));
  assert.ok(lines.includes("Moon → Jupiter → Moon (a loop)"));
  assert.ok(lines.includes("Moon ⇄ Jupiter · by domicile (The Moon in Pisces, Jupiter’s sign; Jupiter in Cancer, the Moon’s sign)"));
  const patterns = parts.find((p) => p.id === "patterns").lines;
  assert.ok(patterns.some((l) => l.startsWith("Kite · Pluto, Moon, Neptune · focal Jupiter or Chiron · orbs ") && l.endsWith(" · dominant")), patterns.join("\n"));
  const aspects = parts.find((p) => p.id === "aspects").lines;
  assert.equal(aspects[1], "Tightest major: Jupiter conjunction Chiron, 0°11'");
  const csv = formatChartTableCsv(chart, "en").split("\n");
  assert.equal(csv[0], "section,field,value");
  const head = csv.find((l) => l.startsWith("dignity,planet,")).split(",");
  const venus = Object.fromEntries(head.map((k, i) => [k, csv.find((l) => l.startsWith("dignity,venus,")).split(",")[i]]));
  assert.equal(venus.score, "8");
  assert.equal(venus.dignities, "domicile|triplicity");
  assert.equal(venus.triplicityDay, "venus");
  assert.ok(csv.includes("dispositor,sun,sun|mercury,final,0"));
  assert.ok(csv.includes("reception,moon,jupiter,domicile,0"));
  assert.equal(csv.filter((l) => l.startsWith("shape,") && !l.startsWith("shape,type")).length, 5);
  assert.ok(csv.includes("ruler,traditional,mercury,gemini,10,domicile|term,7,0"));
});
