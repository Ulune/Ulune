/*
 * Human Design's Cycles (share and compare plan, feature 5b, decision R2;
 * src/lib/chart/hd-transit.ts, src/lib/chart/hd-cycles.ts): the moment's
 * thirteen bodies as the bodygraph's own cast places them; what a moment
 * completes with a person's gates, its own channels and the centres it
 * defines, on gates chosen by hand (nobody's birth); how long the Sun and the
 * Moon stay in their gates; the life cycles found on the engine, checked to
 * the minute against a plain scan of the same engine, and the shared year
 * files (Ulune's server) against the casts (this device); the solar return.
 * Then the readings, the first read, the method notes and the table in both
 * languages: every id reads, in Ulune's tone and typography, suggestions and
 * never predictions. The births are the e2e fixtures' made-up ones.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateHumanDesign, calculateNatal, calculateSkyWindow, calculateSkyYear, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import { ageAt, cycleStatus, DAY_MS, findPassages, LIFE_CYCLES, lifeCycles, SEASON_MS, solarReturn, YEAR_MS } from "../src/lib/chart/hd-cycles.ts";
import {
  gateSpan,
  gateStart,
  HDC_CENTRES,
  HDC_COMPLETES,
  HDC_MOMENT,
  HDC_MOON,
  HDC_SOLAR,
  HDC_WEEK,
  hdcBodyRef,
  hdcLifeRef,
  hdMomentOf,
  hdTransit,
  hdTransitFocus,
  momentOnGate,
  parseHdcRef,
} from "../src/lib/chart/hd-transit.ts";
import { eclipticToGate, HD_BODY_IDS, HD_CENTER_IDS, HD_CHANNELS, HD_GATE_SIZE } from "../src/lib/chart/human-design.ts";
import { slowAt, yearOf } from "../src/lib/chart/sky-year.ts";
import { bodyAt, chunksAround, covers } from "../src/lib/chart/sky-window.ts";
import { cycleNow, hdCyclesFirstRead, hdCyclesMethod, hdCyclesReading, momentSummary, solarWhen } from "../src/lib/chart/interpret-hd-cycles.ts";
import { hdCyclesTableCsv, hdCyclesTextParts } from "../src/lib/chart/hd-cycles-table.ts";
import { hdCyclesWords } from "../src/lib/i18n/catalog/hd-cycles-words.ts";
import { bookT } from "../src/lib/i18n/words-book.ts";
import { csvSections, parseCsv } from "../src/lib/csv.ts";

const MINUTE = 60_000;
const wrap180 = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

/* ------------------------------------------------ the sky, three ways */

const CUSPS = Array.from({ length: 12 }, (_, i) => i * 30);
const casts = new Map();
/** The sky as the page asks this device for it (studio/modes/hooks/hd-sky.ts, castSky): a transits cast with no place and no chart. */
async function castSky(ms) {
  if (!casts.has(ms)) {
    const sky = await calculateTransits({ utc: new Date(ms), latitude: 0, longitude: 0, natalCusps: CUSPS, natalBodies: [], houseSystem: "whole" });
    casts.set(ms, Object.fromEntries(sky.planets.map((p) => [p.id, { lon: p.ecliptic, speed: p.speed }])));
  }
  return casts.get(ms);
}

const years = new Map();
/** The slow planets from the shared year files, as the page reads them when the reader chose Ulune's server (yearSky). */
async function yearSky(ms) {
  const y = yearOf(ms);
  if (!years.has(y)) years.set(y, calculateSkyYear(y));
  const file = await years.get(y);
  return Object.fromEntries(["saturn", "uranus", "chiron"].map((b) => [b, slowAt(file, b, ms)]).filter(([, p]) => p));
}

const chunks = new Map();
const chunkAt = (start) => {
  if (!chunks.has(start)) chunks.set(start, calculateSkyWindow(start));
  return chunks.get(start);
};
/** Every body from the scrub window's shared chunks (chunkSky). */
async function chunkSky(ms) {
  const wins = await Promise.all(chunksAround(ms, 0).map(chunkAt));
  const win = wins.find((w) => covers(w, ms));
  return Object.fromEntries(["sun", "moon", "saturn", "uranus", "chiron"].map((b) => [b, bodyAt(win, b, ms)]));
}

/* ------------------------------------------------ the fixtures' made-up births */

const FIXTURES = {
  A: { name: "TraceQA", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris", houseSystem: "placidus" },
  B: { name: "Sample B", date: "1987-11-03", time: "23:10", latitude: 59.9139, longitude: 10.7522, placeLabel: "Oslo", houseSystem: "placidus" },
};
const births = new Map();
/** A fixture's birth moment, its natal places (Sun, Saturn, Uranus, Chiron), its bodygraph and its four life cycles (on the casts). */
function birthOf(key) {
  if (!births.has(key)) {
    births.set(
      key,
      (async () => {
        const chart = await calculateNatal(FIXTURES[key]);
        const birth = Date.parse(chart.meta.utc);
        const natal = Object.fromEntries(chart.planets.filter((p) => ["sun", "saturn", "uranus", "chiron"].includes(p.id)).map((p) => [p.id, p.ecliptic]));
        const hd = await calculateHumanDesign({ natalUtc: new Date(birth) });
        const cycles = await lifeCycles(castSky, birth, natal);
        return { chart, birth, natal, hd, cycles, zone: chart.meta.timezone };
      })(),
    );
  }
  return births.get(key);
}

/** The moment of the screenshots: Sunday 18 October 2026, 08:43 in Paris. */
const AT = Date.UTC(2026, 9, 18, 6, 43);
async function momentAt(ms) {
  const sky = await castSky(ms);
  return hdMomentOf(ms, (b) => sky[b]);
}

/* ------------------------------------------------ the moment */

test("the moment: thirteen bodies in their gates and lines, as the bodygraph's own cast places them", async () => {
  const m = await momentAt(AT);
  assert.deepEqual(
    m.rows.map((r) => r.body),
    [...HD_BODY_IDS],
  );
  const row = (b) => m.rows.find((r) => r.body === b);
  assert.ok(Math.abs(wrap180(row("earth").ecliptic - row("sun").ecliptic - 180)) < 1e-9, "the Earth opposite the Sun");
  assert.ok(Math.abs(wrap180(row("southnode").ecliptic - row("northnode").ecliptic - 180)) < 1e-9, "the South Node opposite the North");
  for (const r of m.rows) assert.deepEqual({ gate: r.gate, line: r.line }, eclipticToGate(r.ecliptic), r.body);
  // The Human Design engine's own Personality rows at the same moment.
  const hd = await calculateHumanDesign({ natalUtc: new Date(AT) });
  for (const a of hd.activations.filter((x) => x.layer === "personality")) {
    const r = row(a.body);
    assert.deepEqual([r.gate, r.line], [a.gate, a.line], a.body);
    assert.ok(Math.abs(wrap180(r.ecliptic - a.ecliptic)) < 1e-6, a.body);
  }
  assert.deepEqual(
    m.rows.map((r) => `${r.body} ${r.gate}.${r.line}`),
    ["sun 32.5", "earth 42.5", "moon 54.6", "northnode 30.4", "southnode 29.4", "mercury 43.1", "venus 28.3", "mars 33.5", "jupiter 4.4", "saturn 21.1", "uranus 20.6", "neptune 25.5", "pluto 41.2"],
  );
  // Backwards: the planets only (the nodes always move so, and are never marked).
  assert.deepEqual(
    m.rows.filter((r) => r.retrograde).map((r) => r.body),
    ["venus", "saturn", "uranus", "neptune"],
  );
  assert.ok(row("northnode").speed < 0 && !row("northnode").retrograde);
  assert.deepEqual(
    momentOnGate(m, 32).map((r) => r.body),
    ["sun"],
  );
  // A body missing: no moment.
  const sky = await castSky(AT);
  assert.equal(
    hdMomentOf(AT, (b) => (b === "pluto" ? null : sky[b])),
    null,
  );
});

/* ------------------------------------------------ transit channels, by hand */

/** A person by their gates alone. */
const person = (...gates) => ({ activations: gates.map((gate, i) => ({ gate, line: 1, layer: i % 2 ? "design" : "personality", body: "sun", ecliptic: 0 })) });
/** A moment by its gates alone (bodies in the column's order). */
const momentOf = (...gates) => ({ at: AT, rows: gates.map((gate, i) => ({ body: HD_BODY_IDS[i], ecliptic: gateStart(gate) + 1, speed: 1, gate, line: 1, retrograde: false })) });
const ids = (chs) => chs.map((ch) => ch.id).sort();

/*
 * Case 1. You: 63 (Head), 28 (Spleen), 53 (Root), 1 (G); no channel, every
 * centre open. The moment: 4 (Ajna), 38 (Root), 42 (Sacral), 12 and 22.
 *   63–4, 28–38, 42–53: one gate yours, one the moment's: completed (temporary)
 *   12–22: both the moment's: its own channel (the field)
 *   8–1: your 1 waits for 8, which nobody has
 * Defined for you now: Head, Ajna (63–4), Spleen (28–38), Sacral (42–53),
 * Root (both), Throat and Solar Plexus (12–22, the moment's own); the G
 * (your 1 alone) and the Heart stay open.
 */
test("case 1: what the moment completes with your gates, its own channels, and the centres it defines", () => {
  const t = hdTransit(person(63, 28, 53, 1), momentOf(4, 38, 42, 12, 22));
  assert.deepEqual(ids(t.completes), ["28–38", "42–53", "63–4"].sort());
  assert.ok(t.completes.every((ch) => ch.kind === "electromagnetic"));
  assert.deepEqual(ids(t.field), ["12–22"]);
  assert.deepEqual(t.conditioned, ["head", "ajna", "throat", "sacral", "solarPlexus", "spleen", "root"]);
  assert.deepEqual(
    Object.fromEntries([...t.through].map(([c, chs]) => [c, ids(chs)])),
    { head: ["63–4"], ajna: ["63–4"], throat: ["12–22"], sacral: ["42–53"], solarPlexus: ["12–22"], spleen: ["28–38"], root: ["28–38", "42–53"].sort() },
  );
  const by = Object.fromEntries(t.pair.centres.map((c) => [c.id, c.by]));
  assert.equal(by.throat, "b");
  assert.equal(by.root, "together");
  assert.equal(by.g, null);
  // Whose each gate is: yours, the moment's, both.
  assert.equal(t.pair.tones.get(63), "a");
  assert.equal(t.pair.tones.get(4), "b");
  assert.equal(t.pair.tones.get(64), "off");
  assert.equal(t.pair.channels.find((c) => c.id === "8–1").kind, null);
});

/*
 * Case 2. You: 59–6 whole (the Sacral and the Solar Plexus defined), and 34.
 * The moment: 57 and 6. 34–57 completes through the moment's 57 (the Spleen,
 * open in your chart, defined only with your gate); 59–6 stays yours, the
 * moment's 6 on it too; the Sacral and the Solar Plexus are yours already:
 * not conditioned. 20–57 and 10–57 wait for a gate nobody has.
 */
test("case 2: a channel of yours the moment underlines, and a centre defined only together", () => {
  const t = hdTransit(person(59, 6, 34), momentOf(57, 6));
  assert.deepEqual(ids(t.completes), ["34–57"]);
  assert.deepEqual(t.field, []);
  assert.deepEqual(t.conditioned, ["spleen"]);
  assert.deepEqual(ids(t.through.get("spleen")), ["34–57"]);
  const by = Object.fromEntries(t.pair.centres.map((c) => [c.id, c.by]));
  assert.deepEqual([by.spleen, by.sacral, by.solarPlexus], ["together", "a", "a"]);
  assert.deepEqual([6, 34, 57, 59].map((g) => t.pair.tones.get(g)), ["both", "a", "b", "a"]);
  const own = t.pair.channels.find((c) => c.id === "59–6");
  assert.ok(own.a.whole && own.kind !== "electromagnetic" && own.lead !== "b");
  for (const id of ["20–57", "10–57"]) assert.equal(t.pair.channels.find((c) => c.id === id).kind, null, id);
  // The moment's own channel over one of your gates: its field, not a completion.
  const field = hdTransit(person(20), momentOf(20, 57));
  assert.deepEqual([ids(field.completes), ids(field.field)], [[], ["20–57"]]);
  // Nothing in the sky yet: nothing completed, nothing conditioned.
  const empty = hdTransit(person(59, 6, 34), { at: AT, rows: [] });
  assert.deepEqual([empty.completes, empty.field, empty.conditioned], [[], [], []]);
});

test("what a choice lights on the figure, and the page's ids read back", async () => {
  const t = hdTransit(person(63, 28, 53, 1), momentOf(4, 38, 42, 12, 22));
  const lit = (id, extra) => [...(hdTransitFocus(t, id, extra)?.lit ?? [])].sort();
  assert.ok(lit(HDC_COMPLETES).includes("channel:63–4") && lit(HDC_COMPLETES).includes("center:ajna") && !lit(HDC_COMPLETES).includes("channel:12–22"));
  assert.ok(lit(HDC_CENTRES).includes("center:throat") && lit(HDC_CENTRES).includes("channel:12–22") && !lit(HDC_CENTRES).includes("center:g"));
  assert.deepEqual(lit(HDC_WEEK), ["gate:38", "gate:4"]);
  assert.deepEqual(lit(HDC_MOON), ["gate:42"]);
  assert.deepEqual(lit(hdcBodyRef("northnode")), ["gate:12"]);
  assert.deepEqual(lit(hdcLifeRef("chiron"), { lifeGates: { chiron: 53 } }), ["gate:53"]);
  assert.deepEqual(lit(HDC_SOLAR, { sunEarth: [12, 11] }), ["gate:11", "gate:12"]);
  assert.equal(hdTransitFocus(t, hdcLifeRef("uranus")), null, "a life cycle not found yet lights nothing");
  assert.equal(hdTransitFocus(t, "gate:4").hero, "gate:4");
  assert.ok(lit(HDC_MOMENT).includes("gate:22") && lit(HDC_MOMENT).includes("channel:42–53"));
  assert.equal(hdTransitFocus(t, "hdc:nonsense"), null);
  assert.equal(hdTransitFocus(t, null), null);
  for (const id of [HDC_MOMENT, HDC_WEEK, HDC_MOON, HDC_COMPLETES, HDC_CENTRES, HDC_SOLAR]) assert.equal(parseHdcRef(id).kind, id.slice(4));
  assert.deepEqual(parseHdcRef(hdcBodyRef("earth")), { kind: "body", body: "earth" });
  assert.deepEqual(parseHdcRef(hdcLifeRef("saturn2")), { kind: "life", id: "saturn2" });
  for (const bad of ["hdc:body:chiron", "hdc:life:saturn3", "hdp:summary", "gate:4", "", null]) assert.equal(parseHdcRef(bad), null, String(bad));
});

/* ------------------------------------------------ the week's gate and the Moon's */

test("how long the Sun and the Moon stay in their gates: a gate's width, on a plain line and on the sky's chunks", async () => {
  // A body at exactly 1° a day stays 5.625 days in each gate.
  const t0 = Date.UTC(2026, 0, 1);
  const lon0 = gateStart(32) + 2;
  const line = (ms) => ({ lon: (lon0 + (ms - t0) / DAY_MS) % 360, speed: 1 });
  const s = gateSpan(line, t0);
  assert.equal(s.gate, 32);
  assert.ok(Math.abs(s.to - s.from - HD_GATE_SIZE * DAY_MS) < 2000);
  assert.ok(Math.abs(t0 - s.from - 2 * DAY_MS) < 2000);
  // The real sky around the screenshots' moment, from the chunks.
  const wins = await Promise.all([AT - 12 * DAY_MS, AT, AT + 12 * DAY_MS].flatMap((ms) => chunksAround(ms, 0)).map(chunkAt));
  const lonAt = (body) => (ms) => {
    const win = wins.find((w) => covers(w, ms));
    return win ? bodyAt(win, body, ms) : null;
  };
  const week = gateSpan(lonAt("sun"), AT);
  assert.equal(`${week.gate}.${week.line}`, "32.5");
  assert.ok(week.from <= AT && AT <= week.to);
  const days = (week.to - week.from) / DAY_MS;
  assert.ok(days > 5.4 && days < 6, `the Sun's gate: ${days} days`);
  // Its ends, cast: the Sun on the gate's edges, to a minute.
  for (const [ms, edge] of [
    [week.from, gateStart(32)],
    [week.to, gateStart(32) + HD_GATE_SIZE],
  ]) {
    const sun = (await castSky(ms)).sun;
    assert.ok(Math.abs(wrap180(sun.lon - edge) / sun.speed) * DAY_MS < MINUTE, `the Sun at ${new Date(ms).toISOString()}`);
  }
  const moon = gateSpan(lonAt("moon"), AT);
  assert.equal(moon.gate, 54);
  const hours = (moon.to - moon.from) / 3_600_000;
  assert.ok(hours > 8.5 && hours < 12, `the Moon's gate: ${hours} hours`);
  assert.equal(
    gateSpan(() => null, AT),
    null,
  );
});

/* ------------------------------------------------ the life cycles, on the engine */

/** Every crossing of `target` between `from` and `to`, by a plain scan of the engine every 5 days, each halved down to a second. */
async function plainScan(body, target, from, to) {
  const res = async (ms) => wrap180((await castSky(ms))[body].lon - target);
  const out = [];
  let t = from;
  let r = await res(t);
  for (let u = from + 5 * DAY_MS; u <= to + 5 * DAY_MS; u += 5 * DAY_MS) {
    const ru = await res(u);
    if (r * ru <= 0 && Math.abs(r - ru) < 90) {
      let lo = t;
      let hi = u;
      let rl = r;
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2;
        const rm = await res(mid);
        if (rl * rm <= 0) hi = mid;
        else {
          lo = mid;
          rl = rm;
        }
      }
      out.push((lo + hi) / 2);
    }
    t = u;
    r = ru;
  }
  return out;
}

test("the life cycles: every passage exact to the minute, as a plain scan of the engine finds them", async () => {
  for (const key of ["A", "B"]) {
    const { birth, natal, cycles } = await birthOf(key);
    assert.deepEqual(
      cycles.map((c) => c.id),
      ["saturn1", "uranus", "chiron", "saturn2"],
    );
    for (const c of cycles) {
      const def = LIFE_CYCLES.find((d) => d.id === c.id);
      assert.ok(Math.abs(wrap180(c.target - natal[c.body] - def.offset)) < 1e-9, `${key} ${c.id}: the point`);
      assert.ok(c.passages.length >= 1 && c.passages.length <= 5, `${key} ${c.id}: ${c.passages.length} passages`);
      for (const p of c.passages) {
        const s = (await castSky(p.at))[c.body];
        assert.ok((Math.abs(wrap180(s.lon - c.target)) / Math.abs(s.speed)) * DAY_MS < MINUTE, `${key} ${c.id} ${new Date(p.at).toISOString()}: off the point`);
        assert.equal(p.retrograde, s.speed < 0, `${key} ${c.id}: direction`);
        const age = (p.at - birth) / YEAR_MS;
        assert.ok(age >= def.ages[0] && age <= def.ages[1], `${key} ${c.id}: at ${age}`);
      }
      const plain = await plainScan(c.body, c.target, birth + def.ages[0] * YEAR_MS, birth + def.ages[1] * YEAR_MS);
      assert.equal(c.passages.length, plain.length, `${key} ${c.id}: as many passages as the plain scan`);
      c.passages.forEach((p, i) => assert.ok(Math.abs(p.at - plain[i]) < MINUTE, `${key} ${c.id} passage ${i + 1}: ${(p.at - plain[i]) / 1000} s`));
      assert.deepEqual(c.season, { from: c.passages[0].at - SEASON_MS, to: c.passages[c.passages.length - 1].at + SEASON_MS });
      assert.equal(c.beyond, false);
    }
  }
  const a = (await birthOf("A")).cycles;
  assert.deepEqual(
    a.map((c) => c.passages.map((p) => `${day(p.at)}${p.retrograde ? " ℞" : ""}`).join(", ")),
    ["2020-01-23", "2034-07-30, 2035-01-07 ℞, 2035-05-17", "2040-07-18", "2049-02-28, 2049-07-16 ℞, 2049-11-28"],
  );
  assert.deepEqual(
    a.map((c) => `${c.gate.gate}.${c.gate.line}`),
    ["61.4", "52.5", "53.1", "61.4"],
  );
  const b = (await birthOf("B")).cycles;
  assert.deepEqual(
    b.map((c) => c.passages.length),
    [1, 3, 3, 3],
  );
  assert.equal(day(b[0].passages[0].at), "2016-12-10");
});

test("where each cycle stands from the dial's moment: behind you, in its season, ahead", async () => {
  const { birth, cycles } = await birthOf("A");
  const [saturn1, uranus] = cycles;
  assert.deepEqual(
    cycles.map((c) => cycleStatus(c, AT)),
    ["past", "coming", "coming", "coming"],
  );
  assert.equal(cycleStatus(uranus, uranus.passages[1].at), "now");
  assert.equal(cycleStatus(uranus, uranus.passages[0].at - SEASON_MS + DAY_MS), "now");
  assert.equal(cycleStatus(uranus, uranus.passages[0].at - SEASON_MS - DAY_MS), "coming");
  assert.equal(cycleStatus(saturn1, saturn1.passages[0].at + SEASON_MS + DAY_MS), "past");
  assert.equal(cycleStatus({ season: null, passages: [] }, AT), null);
  assert.deepEqual(ageAt(birth, saturn1.passages[0].at), { years: 29, months: 7 });
  assert.deepEqual(ageAt(birth, birth + 6 * YEAR_MS + 1), { years: 6, months: 0 });
});

test("the shared year files (Ulune's server) find the same passages as this device's casts, to the minute", async () => {
  const a = await birthOf("A");
  const b = await birthOf("B");
  for (const [c, from, to] of [
    [a.cycles[0], Date.UTC(2019, 8, 1), Date.UTC(2020, 4, 1)],
    [b.cycles[1], Date.UTC(2031, 2, 1), Date.UTC(2032, 8, 30)],
  ]) {
    const files = await findPassages(yearSky, c.body, c.target, from, to);
    assert.equal(files.length, c.passages.length, c.id);
    files.forEach((p, i) => {
      assert.ok(Math.abs(p.at - c.passages[i].at) < MINUTE, `${c.id} passage ${i + 1}: ${(p.at - c.passages[i].at) / 1000} s apart`);
      assert.equal(p.retrograde, c.passages[i].retrograde);
    });
  }
});

test("the solar return: the Sun back on its place near the birthday, the same from the chunks, nothing past the ephemeris", async () => {
  for (const [key, want] of [
    ["A", "2026-06-15"],
    ["B", "2026-11-03"],
  ]) {
    const { birth, natal } = await birthOf(key);
    const at = await solarReturn(castSky, birth, natal.sun, 2026);
    assert.equal(day(at), want, key);
    const sun = (await castSky(at)).sun;
    assert.ok(Math.abs(wrap180(sun.lon - natal.sun)) < 1e-6, `${key}: the Sun ${sun.lon} for ${natal.sun}`);
    const fromChunks = await solarReturn(chunkSky, birth, natal.sun, 2026);
    assert.ok(Math.abs(fromChunks - at) < MINUTE, `${key}: the chunks ${(fromChunks - at) / 1000} s apart`);
    assert.equal(await solarReturn(castSky, birth, natal.sun, 2400), null);
  }
});

/* ------------------------------------------------ the readings, both languages */

/** A page's context: the person under a moment, the cycles, the year's solar return. */
async function ctxOf(key, at, over = {}) {
  const { birth, natal, hd, cycles, zone } = await birthOf(key);
  const moment = await momentAt(at);
  const wins = await Promise.all([at - 12 * DAY_MS, at, at + 12 * DAY_MS].flatMap((ms) => chunksAround(ms, 0)).map(chunkAt));
  const lonAt = (body) => (ms) => {
    const win = wins.find((w) => covers(w, ms));
    return win ? bodyAt(win, body, ms) : null;
  };
  const year = new Date(at).getUTCFullYear();
  const sr = await solarReturn(castSky, birth, natal.sun, year);
  return {
    hd,
    name: FIXTURES[key].name,
    birth,
    at,
    transit: hdTransit(hd, moment),
    week: gateSpan(lonAt("sun"), at),
    moon: gateSpan(lonAt("moon"), at),
    cycles,
    solar: { year, at: sr, transit: hdTransit(hd, await momentAt(sr)) },
    zone,
    place: FIXTURES[key].placeLabel,
    clock: zone,
    timeUnknown: false,
    ...over,
  };
}

/** Every id the page can choose: 64 gates, 36 channels, 9 centres, and its own parts. */
const ALL_IDS = [
  ...Array.from({ length: 64 }, (_, i) => `gate:${i + 1}`),
  ...HD_CHANNELS.map((ch) => `channel:${ch.id}`),
  ...HD_CENTER_IDS.map((c) => `center:${c}`),
  HDC_MOMENT,
  HDC_WEEK,
  HDC_MOON,
  HDC_COMPLETES,
  HDC_CENTRES,
  HDC_SOLAR,
  ...HD_BODY_IDS.map(hdcBodyRef),
  ...LIFE_CYCLES.map((d) => hdcLifeRef(d.id)),
];

const readingText = (r) =>
  [
    r.title,
    r.kicker,
    r.note ?? "",
    r.lead ?? "",
    ...r.paragraphs,
    ...(r.facts ?? []).map((f) => `${f.label} ${f.value}`),
    ...(r.sections ?? []).flatMap((s) => [s.title, ...s.paragraphs]),
    ...(r.links?.rows ?? []).map((row) => `${row.label} ${row.detail ?? ""}`),
    ...(r.about?.paragraphs ?? []),
  ].join("\n");

/** Ulune's typography and tone, in either language (fr-typography.test.mjs's rule for French): suggestions, never a prediction or a fear. */
function assertWritten(text, locale, what) {
  assert.ok(!/[{}]/.test(text), `${what}: a placeholder left: ${text.match(/.{0,30}[{}].{0,30}/)?.[0]}`);
  assert.ok(!/\b(?:null|NaN|Invalid Date)\b|(?:gate|Gate|porte|Porte|line|ligne|[–.])\s?undefined\b|\bundefined\s?[–.\d]/.test(text), `${what}: a value missing`);
  assert.ok(!/\w'\w/.test(text), `${what}: a straight apostrophe`);
  assert.ok(!/ {2}|\s[,.]/.test(text), `${what}: a stray space: ${text.match(/.{0,20}(?: {2}|\s[,.]).{0,20}/)?.[0]}`);
  assert.ok(
    !/\b(?:toxi[cq]|doomed|condamn|danger|disaster|désastre|catastroph|beware|méfiez|death|mort\b|illness|maladie|accident|bad luck|malchance|you will\b|vous allez \p{L}+(?:er|ir|re|oir)\b|vous (?:serez|aurez|ferez|vivrez|devrez)\b)/iu.test(text),
    `${what}: a prediction or a fear: ${text.match(/.{0,40}\b(?:toxi[cq]|danger|disaster|beware|death|illness|accident|you will|vous allez \p{L}+|vous (?:serez|aurez|ferez|vivrez|devrez))\w*.{0,20}/iu)?.[0]}`,
  );
  if (locale === "fr") {
    const bad = [];
    for (const m of text.matchAll(/(.{0,24})(?<![\u202f\d])([:;!?])(?=\s|$)/gmu)) bad.push(`${m[1]}${m[2]}`);
    for (const m of text.matchAll(/(.{0,12})«(?!\u202f)(.{0,12})/gu)) bad.push(`${m[1]}«${m[2]}`);
    for (const m of text.matchAll(/(.{0,12})(?<!\u202f)»/gu)) bad.push(`${m[1]}»`);
    assert.deepEqual(bad.slice(0, 3), [], `${what}: French punctuation without its narrow space`);
    assert.ok(!/\bde [AEIOUÉÈHaeiouéèh]/.test(text), `${what}: “de” before a vowel: ${text.match(/.{0,20}\bde [AEIOUÉÈHaeiouéèh].{0,10}/)?.[0]}`);
    assert.ok(!/\b(?:the|and|with|your)\b/.test(text), `${what}: English in French: ${text.match(/.{0,20}\b(?:the|and|with|your)\b.{0,20}/)?.[0]}`);
  } else {
    assert.ok(!/[«»\u202f]/.test(text), `${what}: French marks in English`);
    assert.ok(!/\b(?:le|la|les|avec|votre|vous)\b/.test(text), `${what}: French in English: ${text.match(/.{0,20}\b(?:le|la|les|avec|votre|vous)\b.{0,20}/)?.[0]}`);
  }
}

const contexts = (async () => {
  const a = await birthOf("A");
  const uranusNow = a.cycles[1].passages[1].at;
  return [
    ["TraceQA, October 2026", await ctxOf("A", AT)],
    ["TraceQA, at the Uranus opposition", await ctxOf("A", uranusNow)],
    // Names and places that elide in French: « d’Élise », « heure d’Oslo ».
    ["Élise in Oslo, no birth time", await ctxOf("B", AT, { name: "Élise", timeUnknown: true })],
    ["waiting: no sky, no cycles, no solar return yet", await ctxOf("A", AT, { transit: null, week: null, moon: null, cycles: null, solar: null })],
    ["the sky could not say", await ctxOf("B", AT, { solar: { year: 2026, at: null, transit: null }, cycles: (await birthOf("B")).cycles.map((c) => ({ ...c, passages: [], season: null })) })],
  ];
})();

test("every gate, channel, centre and part of the page reads, in both languages, in Ulune's tone and typography", async () => {
  for (const [label, ctx] of await contexts) {
    for (const locale of ["en", "fr"]) {
      for (const id of ALL_IDS) {
        const r = hdCyclesReading(ctx, id, locale);
        const waits = !ctx.transit && (id === HDC_WEEK || id === HDC_MOON || id.startsWith("hdc:body:"));
        if ((waits || (!ctx.solar && id === HDC_SOLAR)) && r == null) continue;
        assert.ok(r, `${label} ${locale} ${id}: no reading`);
        assert.equal(r.id, id);
        assert.ok(r.title && r.paragraphs.length && r.paragraphs.every(Boolean), `${label} ${locale} ${id}: an empty reading`);
        // The card shows the lead, then each section: nothing is said twice.
        const said = (r.sections ?? []).flatMap((sec) => sec.paragraphs);
        assert.ok(!said.includes(r.lead), `${label} ${locale} ${id}: the lead again in a section`);
        assert.equal(new Set(said).size, said.length, `${label} ${locale} ${id}: a paragraph twice`);
        assert.ok(!(r.note && r.sections?.some((sec) => sec.paragraphs.includes(r.note))), `${label} ${locale} ${id}: the note again in a section`);
        assertWritten(readingText(r), locale, `${label} ${locale} ${id}`);
      }
      assert.equal(hdCyclesReading(ctx, "planet:sun", locale), null);
      assert.equal(hdCyclesReading(ctx, "hdp:summary", locale), null);
      assert.equal(hdCyclesReading(ctx, null, locale), null);
      assert.equal(hdCyclesReading(null, HDC_MOMENT, locale), null);
    }
  }
});

test("the readings start with you and the moment: what it completes, where each cycle stands, when the Sun comes back", async () => {
  const [[, oct], [, now], [, elise]] = await contexts;
  assert.equal(
    momentSummary(oct, "en"),
    "Sunday 18 October, 08:43: the Sun in gate 32.5, the Earth in gate 42.5, the Moon in gate 54.6. With your gates, the moment completes 63–4, 28–38 and 42–53. It defines the Head, the Ajna, the Solar Plexus, the Spleen and the Root for you, open in your chart.",
  );
  assert.match(momentSummary(oct, "fr"), /^Dimanche 18 octobre à 08:43\u202f: le Soleil dans la porte 32\.5, la Terre dans la porte 42\.5, la Lune dans la porte 54\.6\. Avec vos portes, le moment complète 63–4, 28–38 et 42–53\./);
  // Waiting for the sky: the moment's day and time, and nothing said about gates not yet here.
  assert.equal(momentSummary({ ...oct, transit: null }, "en"), "Sunday 18 October, 08:43: the sky of this moment is on its way.");
  const ch = hdCyclesReading(oct, "channel:63–4", "en");
  assert.match(ch.lead, /^Your gate 63 and the moment’s gate 4 \(Jupiter 4\.4\) complete this channel: it is defined in you for as long as the transit lasts \(/);
  assert.match(hdCyclesReading(oct, "channel:63–4", "fr").lead, /^Votre porte 63 et la porte 4 du moment \(Jupiter 4\.4\) complètent ce canal\u202f: il est défini chez vous le temps de ce transit/);
  assert.match(hdCyclesReading(oct, "center:head", "en").lead, /^The Head is open in your chart; with your gates, the moment completes 63–4 · Logic, which define it for now/);
  assert.match(hdCyclesReading(oct, "center:spleen", "en").lead, /^The Spleen is open in your chart, and the moment defines it through 28–38 · Struggle and 32–54/);
  assert.match(hdCyclesReading(oct, "gate:32", "en").lead, /^The moment stands in it \(Sun 32\.5\)\. It is not one of your gates/);
  const [saturn1, uranus] = oct.cycles;
  assert.equal(cycleNow(oct, saturn1, "en"), "Behind you: Saturn passed the point exactly on 23 Jan 2020, at 29.");
  assert.equal(cycleNow(oct, saturn1, "fr"), "Derrière vous\u202f: Saturne est passé exactement sur ce point le 23 janv. 2020, à 29 ans.");
  assert.equal(cycleNow(oct, uranus, "en"), "Ahead: Uranus will pass the point 3 times, turning back and forward again: on 30 Jul 2034, 7 Jan 2035 (retrograde) and 17 May 2035, at 44.");
  assert.match(cycleNow(now, uranus, "en"), /^Now, in this cycle’s season: Uranus passes the point 3 times/);
  assert.match(cycleNow(now, uranus, "fr"), /^En ce moment, dans la saison de ce cycle\u202f: Uranus passe 3 fois sur ce point/);
  assert.match(hdCyclesReading(oct, hdcLifeRef("uranus"), "en").paragraphs.join(" "), /When you were born, Uranus stood in gate \d+, line \d; at the opposition it stands across the wheel, in gate 52, line 5/);
  assert.equal(solarWhen(oct, "en"), "In 2026, the Sun comes back to its place at your birth on Monday, 15 June 2026 at 04:53 (Paris time).");
  assert.equal(solarWhen(oct, "fr"), "En 2026, le Soleil revient à sa place de votre naissance le lundi 15 juin 2026 à 04:53 (heure de Paris).");
  // No birth time: the day alone; the Oslo of « heure d’Oslo » elides.
  assert.equal(solarWhen(elise, "fr"), "En 2026, le Soleil revient à sa place de votre naissance le mardi 3 novembre 2026.");
  assert.match(solarWhen({ ...elise, timeUnknown: false }, "fr"), /\(heure d’Oslo\)\.$/);
  assert.match(hdCyclesReading(elise, hdcLifeRef("saturn1"), "en").paragraphs.join(" "), /Without a birth time, the places at birth are taken at noon/);
  // Without a birth time, the card says so first (as the natal readings do).
  assert.deepEqual(
    hdCyclesReading(elise, hdcLifeRef("saturn1"), "fr").sections.map((sec) => sec.id),
    ["time", "asks", "passages"],
  );
  assert.equal(hdCyclesReading(elise, hdcLifeRef("saturn1"), "fr").sections[0].title, "Heure de naissance inconnue");
  // A life cycle's facts: where it stands, its exact passages on one line, the age, its point.
  assert.deepEqual(
    hdCyclesReading(oct, hdcLifeRef("uranus"), "en").facts.map((f) => `${f.label}: ${f.value}`),
    ["Where it stands: Ahead", "Exact passages: 30 Jul 2034 · 7 Jan 2035 ℞ · 17 May 2035", "Age: 44", "Point of opposition: Gate 52.5"],
  );
  assert.equal(hdCyclesReading(oct, hdcLifeRef("saturn2"), "fr").facts[2].value, "58 à 59 ans");
  assert.deepEqual(
    ["uranus", "chiron"].map((id) => hdCyclesReading(oct, hdcLifeRef(id), "en").links.title),
    ["Point of opposition", "Point of return"],
  );
  assert.equal(hdCyclesReading(oct, hdcLifeRef("saturn1"), "fr").facts[1].label, "Passage exact");
  // The week's and the Moon's gate: their number is the card's mark, their name the title's.
  const week = hdCyclesReading(oct, HDC_WEEK, "en");
  assert.deepEqual([week.title, week.mark], ["Gate of the week · Continuity", "32"]);
  assert.equal(hdCyclesReading(oct, HDC_MOON, "fr").title, "La porte de la Lune · Ambition");
  // The solar return: the year's theme with your gates first, then the Sun and Earth as at birth.
  const solar = hdCyclesReading(oct, HDC_SOLAR, "en");
  assert.deepEqual(
    solar.sections.map((sec) => sec.id),
    ["theme", "sun", "channels"],
  );
  assert.match(solar.sections[0].paragraphs[0], /^The year’s theme, in Human Design’s terms: at that moment, with your gates, the sky completes 59–6/);
});

test("the first read: a text for each step, in both languages", async () => {
  for (const [label, ctx] of await contexts) {
    for (const locale of ["en", "fr"]) {
      const first = hdCyclesFirstRead(ctx, locale);
      for (const id of ["moment", "completes", "centres", ...LIFE_CYCLES.map((d) => `life:${d.id}`)]) {
        assert.ok(first.texts[id], `${label} ${locale}: no text for ${id}`);
        assertWritten(first.texts[id], locale, `${label} ${locale} first read ${id}`);
      }
      if (ctx.transit) for (const id of ["week", "moon"]) assertWritten(first.texts[id], locale, `${label} ${locale} first read ${id}`);
      if (ctx.solar) assertWritten(first.texts.solar, locale, `${label} ${locale} first read solar`);
      assertWritten(`${first.lead}\n${first.next}`, locale, `${label} ${locale} first read`);
    }
  }
  const [[, oct]] = await contexts;
  const en = hdCyclesFirstRead(oct, "en").texts;
  assert.equal(en.moment, "With your gates, the moment completes 63–4, 28–38 and 42–53. It defines the Head, the Ajna, the Solar Plexus, the Spleen and the Root for you, open in your chart.");
  assert.equal(en.centres, "The Head, the Ajna, the Solar Plexus, the Spleen and the Root.");
  assert.match(en.week, /^Continuity\. Gate 32 is not in your chart/);
  assert.match(en.solar, /^In 2026, the Sun comes back to its place at your birth on Monday, 15 June 2026 at 04:53 \(Paris time\)\. The year’s theme, in Human Design’s terms: /);
  assert.equal(hdCyclesFirstRead((await contexts)[3][1], "fr").texts["life:chiron"], "Calcul des dates exactes…");
});

test("the method notes say how the dates are found, and where, in both languages", () => {
  for (const locale of ["en", "fr"]) {
    const how = hdCyclesMethod(locale);
    assert.equal(how.items.length, 7);
    assertWritten([how.title, ...how.items].join("\n"), locale, `method ${locale}`);
  }
  const en = hdCyclesMethod("en").items.join(" ");
  assert.match(en, /sampled every 30 days/);
  assert.match(en, /on this device by default, with nothing of yours/);
  assert.match(en, /shared sky files, the same for everyone/);
});

test("the table: its text for Copy and its CSV, a section per part", async () => {
  const [[, oct]] = await contexts;
  const catalog = (key) => `[${key}]`;
  for (const locale of ["en", "fr"]) {
    const w = bookT(hdCyclesWords, catalog, locale);
    const parts = hdCyclesTextParts(oct, locale, w, { gate: (n) => `G${n}`, channel: (id) => `C${id}` });
    assert.deepEqual(
      parts.map((p) => p.id),
      ["moment", "channels", "centres", "life", "solar"],
    );
    const text = parts.flatMap((p) => p.lines).join("\n");
    assert.ok(!text.includes("[hdc"), `${locale}: a word missing from the book: ${text.match(/\[hdc\w+\]/)?.[0]}`);
    assertWritten(text.replaceAll(/C\d+–\d+|G\d+/g, "x"), locale, `table ${locale}`);
    assert.equal(parts[0].lines.length, 1 + 13);
    // 3 completed, then the moment's own 32–54 and 41–30.
    assert.equal(parts[1].lines.length, 1 + 5);
    assert.equal(parts[2].lines.length, 1 + 9);
    assert.equal(parts[3].lines.length, 1 + 8, "one line for each passage: 1, 3, 1 and 3");
  }
  const w = bookT(hdCyclesWords, catalog, "en");
  const parts = hdCyclesTextParts(oct, "en", w, null);
  assert.equal(parts[0].lines[9], "Jupiter 4.4 · Gate 4 · Ajna · Completes: 63–4");
  assert.equal(parts[3].lines[1], "Saturn return · 23 Jan 2020 · direct · at 29 · Gate 61.4 · behind you");
  assert.match(parts[4].lines[1], /^Solar return 2026: 15 Jun 2026, 04:53$/);
  const sections = csvSections(parseCsv(hdCyclesTableCsv(oct)));
  assert.deepEqual(
    sections.map((s) => s.kind),
    ["moment", "channel", "centre", "cycle", "solar"],
  );
  assert.equal(sections[0].rows.length, 1 + 13);
  assert.ok(sections[0].rows.some((r) => r[1] === "jupiter" && r[2] === "4" && r[9] === "63–4"));
  assert.ok(sections[1].rows.some((r) => r.join() === "channel,63–4,63|4,head|ajna,temporary,63,4,jupiter:4.4"));
  assert.ok(sections[2].rows.some((r) => r.join() === "centre,head,0,together,63–4"));
  assert.ok(sections[2].rows.some((r) => r.join() === "centre,spleen,0,moment,28–38|32–54"));
  const saturn = oct.cycles[0].passages[0];
  assert.ok(sections[3].rows.some((r) => r.join() === ["cycle", "saturn1", "saturn", oct.cycles[0].target.toFixed(6), "61", "4", new Date(saturn.at).toISOString(), "direct", "29.60", "past"].join()));
  assert.equal(sections[3].rows.length, 1 + 8);
  assert.deepEqual(sections[4].rows[1], ["solar", "2026", new Date(oct.solar.at).toISOString(), "Europe/Paris", "2026-06-15 04:53", "12", "2", "11", "2", oct.solar.transit.completes.map((ch) => ch.id).join("|")]);
});
