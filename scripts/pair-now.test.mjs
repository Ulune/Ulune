/**
 * "You two, now" under each pair's reading (share and compare plan, feature
 * 5e): astrology's transits to the relationship's own chart (major aspects in
 * tight orbs, the slow planets first, never the Moon, the angles only with
 * both birth times), Human Design's moment over the connection chart (the
 * channels it completes for the two, by what each meets, and the centres it
 * defines between them), Chinese astrology's year for both and Feng Shui's
 * stars over the directions the two share. Their readings in both languages,
 * in Ulune's tone and typography, and the astrology part's text and CSV.
 * Made-up births only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateHumanDesign, calculateNatal, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import { buildComposite } from "../src/lib/chart/composite.ts";
import { NOW_LIMIT, NOW_MOVERS, NOW_POINTS, NOW_REF, nowContacts, nowMoment, nowOrb, nowRef, parseNowRef } from "../src/lib/chart/pair-now.ts";
import { pairNowReading, pairNowSummary } from "../src/lib/chart/interpret-pair-now.ts";
import { nowCsv, nowPhrase, nowTextLines } from "../src/lib/i18n/pair-now-astro.ts";
import { rowsCsv } from "../src/lib/pair-now-csv.ts";
import { HDP_NOW, hdPair, hdPairNow, hdPairNowFocus, hdPairUncertain, hdpNowRef, partsOf } from "../src/lib/chart/hd-pair.ts";
import { HD_CENTER_IDS, HD_CHANNELS } from "../src/lib/chart/human-design.ts";
import { hdPairNowReading } from "../src/lib/chart/interpret-hd-pair-now.ts";
import { zodiacChart } from "../src/lib/chinese/zodiac.ts";
import { yearAhead } from "../src/lib/chinese/zodiac-time.ts";
import { TOGETHER_TEXTS, ZKP_NOW, ZKP_NOW_MONTH, togetherLine, zkpNowRef, zodiacPairNow, zodiacPairNowReading } from "../src/lib/chinese/zodiac-pair-now.ts";
import { fengShuiOf } from "../src/lib/chinese/fengshui.ts";
import { fengShuiPair } from "../src/lib/chinese/fengshui-pair.ts";
import { FSP_NOW, fsNowLead, fsPairNow, fsPairNowReading, fspNowRef } from "../src/lib/chinese/fengshui-pair-now.ts";
import { natalBodiesOf } from "../src/studio/modes/hooks/natal-bodies.ts";
import { pairNowWords } from "../src/lib/i18n/catalog/pair-now-words.ts";
import { pairNowWestWords } from "../src/lib/i18n/catalog/pair-now-west-words.ts";
import { FAMILY_TWO, MOVING_TWO, NOW_ABOUT, NOW_LEAD, NOW_QUIET } from "../src/lib/content/pair-now.ts";
import { HDN_TEXT } from "../src/lib/content/hd-pair-now.ts";

const TRACE = { name: "TraceQA", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris, France", houseSystem: "placidus" };
const SAMPLE_B = { name: "Sample B", date: "1987-11-03", time: "23:10", latitude: 59.9139, longitude: 10.7522, placeLabel: "Oslo, Norway", houseSystem: "placidus" };
const AT = Date.UTC(2026, 9, 18, 12);
const names = { a: "TraceQA", b: "Sample B" };
const HEAD = { en: "You two, now", fr: "Vous deux, maintenant" };
const full = { script: "hant", show: "full" };

const readingText = (r) =>
  [
    r.title,
    r.kicker,
    r.lead ?? "",
    ...r.paragraphs,
    ...(r.facts ?? []).map((f) => `${f.label} ${f.value}`),
    ...(r.sections ?? []).flatMap((s) => [s.title, ...s.paragraphs]),
    ...(r.links?.rows ?? []).map((row) => `${row.label} ${row.detail ?? ""}`),
    ...(r.about?.paragraphs ?? []),
  ].join("\n");

/** Ulune's typography and tone: suggestions, never a verdict or a fear (hd-pair.test.mjs's rules). */
function assertWritten(text, locale, what) {
  assert.ok(!/[{}]/.test(text), `${what}: a placeholder left: ${text.match(/.{0,30}[{}].{0,30}/)?.[0]}`);
  assert.ok(!/\b(?:null|NaN)\b|(?:gate|Gate|porte|Porte|line|ligne|[–.])\s?undefined\b|\bundefined\s?[–.\d]/.test(text), `${what}: a value missing`);
  assert.ok(!/\w'\w/.test(text.replace(/\d+°\d+'/g, "")), `${what}: a straight apostrophe`);
  assert.ok(!/\b(?:toxi[cq]|incompatib|compatib|soul ?mate|âme sœur|divorc|death|mort\b|illness|maladie|accident|doomed|condamn)/i.test(text), `${what}: a verdict or a fear: ${text.match(/.{0,40}\b(?:toxi[cq]|incompatib|compatib|divorc|death|illness|accident)\w*.{0,20}/i)?.[0]}`);
  if (locale === "fr") {
    const bad = [];
    for (const m of text.matchAll(/(.{0,24})(?<![\u202f\d])([:;!?])(?=\s|$)/gmu)) bad.push(`${m[1]}${m[2]}`);
    for (const m of text.matchAll(/(.{0,12})«(?!\u202f)(.{0,12})/gu)) bad.push(`${m[1]}«${m[2]}`);
    for (const m of text.matchAll(/(.{0,12})(?<!\u202f)»/gu)) bad.push(`${m[1]}»`);
    assert.deepEqual(bad.slice(0, 3), [], `${what}: French punctuation without its narrow space`);
  } else assert.ok(!/[«»\u202f]/.test(text), `${what}: French marks in English`);
}

test("the part's own words, in every language: suggestions, never a prediction (“will”), never a fear", () => {
  const texts = [
    ...Object.values(pairNowWords).flat(),
    ...Object.values(pairNowWestWords).flat(),
    ...[...Object.values(MOVING_TWO), ...Object.values(FAMILY_TWO), NOW_ABOUT, NOW_LEAD, NOW_QUIET].flatMap((x) => [x.en, x.fr]),
    ...Object.values(HDN_TEXT).flatMap((x) => [x.en, x.fr]),
    ...Object.values(TOGETHER_TEXTS).flat(),
  ];
  assert.ok(texts.length > 60);
  for (const t of texts) {
    assert.ok(!/\bwill\b/i.test(t), `a prediction: ${t}`);
    assert.ok(!/\b(?:divorc|death|mort\b|illness|maladie|accident|achet|buy\b)/i.test(t), `a fear or a purchase: ${t}`);
  }
});

/* ── Astrology: today's transits to the relationship's chart ─────────────── */

const a = await calculateNatal(TRACE);
const b = await calculateNatal(SAMPLE_B);
const composite = buildComposite(a, b);
const skyOver = (chart, at = AT) =>
  calculateTransits({ utc: new Date(at), latitude: chart.meta.latitude, longitude: chart.meta.longitude, natalCusps: chart.houses.map((h) => h.ecliptic), natalBodies: natalBodiesOf(chart), houseSystem: chart.meta.houseSystem });
const ANGLE = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
const sep = (x, y) => {
  const d = Math.abs((((x - y) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
};
const pointLon = (chart, id) => (id in chart.angles ? chart.angles[id].ecliptic : chart.planets.find((p) => p.id === id).ecliptic);

test("astrology: the major contacts within 2° (slow movers) or 1° (the fast), never the Moon, slowest first, six at most", async () => {
  const sky = await skyOver(composite);
  const contacts = nowContacts(sky, composite);
  assert.ok(contacts.length > 0 && contacts.length <= NOW_LIMIT, `${contacts.length} contacts`);
  // Every contact the rules allow, ranked: the part shows the first six of them.
  const rank = (id) => NOW_MOVERS.indexOf(id);
  const allowed = sky.aspects
    .filter((l) => NOW_MOVERS.includes(l.a) && NOW_POINTS.includes(l.b) && l.type in ANGLE && Math.abs(l.orb) <= nowOrb(l.a))
    .sort((x, y) => rank(x.a) - rank(y.a) || Math.abs(x.orb) - Math.abs(y.orb));
  assert.deepEqual(contacts.map((c) => c.ref), allowed.slice(0, NOW_LIMIT).map(nowRef));
  for (const c of contacts) {
    assert.notEqual(c.link.a, "moon");
    assert.ok(Math.abs(c.link.orb) <= (c.slow ? 2 : 1), `${c.ref} orb ${c.link.orb}`);
    // The orb is the distance of the two longitudes from the aspect's angle.
    const off = Math.abs(sep(c.moving.ecliptic, pointLon(composite, c.link.b)) - ANGLE[c.link.type]);
    assert.ok(Math.abs(off - Math.abs(c.link.orb)) < 0.02, `${c.ref}: ${off} against ${c.link.orb}`);
    assert.deepEqual(parseNowRef(c.ref), { a: c.link.a, type: c.link.type, b: c.link.b });
  }
  // 18 October 2026, noon UT: Pluto trine the relationship’s Jupiter leads.
  assert.equal(contacts[0].ref, "two:asp:pluto:trine:jupiter");
  assert.deepEqual(contacts.map((c) => c.link.a), [...contacts.map((c) => c.link.a)].sort((x, y) => rank(x) - rank(y)));
  // The Moon's contacts were there to be had.
  assert.ok(sky.aspects.some((l) => l.a === "moon"));
  assert.equal(parseNowRef("two:asp:moon:square:sun"), null);
  assert.equal(parseNowRef(NOW_REF), null);
  assert.equal(nowMoment(Date.UTC(2026, 9, 18, 9, 47, 31)), Date.UTC(2026, 9, 18, 9, 40));
});

test("astrology: without both birth times, the relationship's angles are not read", async () => {
  const noTime = await calculateNatal({ ...SAMPLE_B, time: "", timeUnknown: true }).catch(() => null);
  const chart = noTime ? buildComposite(a, noTime) : { ...composite, meta: { ...composite.meta, timeUnknown: true } };
  assert.equal(chart.meta.timeUnknown, true);
  // A moment when Uranus squared the known composite's Ascendant within 0.1°.
  const at = Date.UTC(2026, 0, 5, 12);
  const known = nowContacts(await skyOver(composite, at), composite, 99);
  assert.ok(known.some((c) => c.link.b === "ascendant"), "the known composite's Ascendant is read");
  const unknown = nowContacts(await skyOver(chart, at), chart, 99);
  assert.ok(!unknown.some((c) => c.link.b === "ascendant" || c.link.b === "midheaven"));
});

test("astrology: a contact said and read in both languages, the part's text and CSV", async () => {
  const sky = await skyOver(composite);
  const contacts = nowContacts(sky, composite);
  assert.equal(nowPhrase({ a: "saturn", type: "square", b: "sun" }, "en"), "Saturn square the relationship’s Sun");
  assert.equal(nowPhrase({ a: "saturn", type: "square", b: "sun" }, "fr"), "Saturne en carré au Soleil de la relation");
  assert.equal(nowPhrase({ a: "pluto", type: "conjunction", b: "ascendant" }, "fr"), "Pluton en conjonction avec l’Ascendant de la relation");
  for (const locale of ["en", "fr"]) {
    for (const kind of ["composite", "davison"]) {
      const ctx = { chart: composite, at: AT, kind, tz: "Europe/Paris" };
      for (const c of contacts) assertWritten(readingText(pairNowReading(c, ctx, locale)), locale, `${c.ref} ${kind} ${locale}`);
      const summary = pairNowSummary(contacts, ctx, locale);
      assert.equal(summary.id, NOW_REF);
      assertWritten(readingText(summary), locale, `summary ${kind} ${locale}`);
      assertWritten(readingText(pairNowSummary([], ctx, locale)), locale, `quiet summary ${locale}`);
    }
    const lines = nowTextLines(contacts, AT, locale, "Europe/Paris");
    assert.equal(lines[0], locale === "fr" ? "Vous deux, maintenant\u202f: Aujourd’hui, 18 octobre 2026" : "You two, now: Today, 18 October 2026");
    assert.equal(lines.length, contacts.length + 1);
  }
  const csv = nowCsv(contacts, AT).split("\n");
  assert.equal(csv[0], "now,at,moving,type,point,orb,applying,exactUtc");
  assert.equal(csv.length, contacts.length + 1);
  assert.ok(csv[1].startsWith("now,2026-10-18T12:00:00.000Z,pluto,trine,jupiter,"));
  // Every page's part is written the tables' way: a cell with a comma or a quote is quoted.
  assert.equal(rowsCsv([["now", "a", "x"], ["now", 'Smith, "Jo"', ""]]), 'now,a,x\nnow,"Smith, ""Jo""",');
});

/* ── Human Design: the moment over the connection chart ───────────────────── */

const person = (...gates) => ({ activations: gates.map((gate, i) => ({ gate, layer: i % 2 ? "design" : "personality", body: "sun", line: 1, ecliptic: 0 })) });
const at = (body, gate) => ({ body, gate, line: 3 });

test("Human Design: the channels the moment completes, by what each meets, and the centres it defines between the two", () => {
  // A: 34 20 1 8 59 6 25 · B: 57 1 8 59 37 40 51 (hd-pair.test.mjs's pair 1); 13 for both.
  const pair = hdPair(person(34, 20, 1, 8, 59, 6, 25, 13), person(57, 1, 8, 59, 37, 40, 51, 13));
  // The moment: 10 (meets A's 20 and 34, B's 57), 33 (meets the 13 both hold), 64 and 47 (nothing of theirs), 61 alone (no channel).
  const now = hdPairNow(pair, [at("sun", 10), at("earth", 33), at("mars", 64), at("venus", 47), at("moon", 61)]);
  // The channel's own id, whichever gate it names first.
  const idOf = (x, y) => HD_CHANNELS.find((ch) => ch.gates.includes(x) && ch.gates.includes(y)).id;
  const byOrder = ["a", "b", "both", "sky"];
  assert.deepEqual(
    now.channels.map((c) => [c.channel.id, c.by, [...c.brings].sort().join("+"), c.held, [...c.bodies].sort().join("+")]),
    [
      [idOf(10, 20), "a", "10", 20, "sun"],
      [idOf(10, 34), "a", "10", 34, "sun"],
      [idOf(10, 57), "b", "10", 57, "sun"],
      [idOf(13, 33), "both", "33", 13, "earth"],
      [idOf(64, 47), "sky", "47+64", null, "mars+venus"],
    ].sort((x, y) => byOrder.indexOf(x[1]) - byOrder.indexOf(y[1]) || now.channels.findIndex((c) => c.channel.id === x[0]) - now.channels.findIndex((c) => c.channel.id === y[0])),
  );
  // Formed channels are the pair's already: never listed again.
  assert.ok(!now.channels.some((c) => c.channel.kind));
  // Head and Ajna were open between them: 64–47 defines both. 61 alone defines nothing.
  assert.deepEqual(now.centres, ["head", "ajna"]);
  // A moment that brings half a channel nobody holds completes nothing.
  assert.deepEqual(hdPairNow(pair, [at("sun", 64)]).channels, []);
  // What the part lights: all its channels and centres, or one channel.
  const all = hdPairNowFocus(now, HDP_NOW);
  assert.ok(all.lit.has("center:head") && all.lit.has("gate:47") && all.lit.has(`channel:${idOf(13, 33)}`));
  const one = hdPairNowFocus(now, hdpNowRef(idOf(13, 33)));
  assert.ok(one.lit.has("gate:33") && !one.lit.has("gate:47") && !one.lit.has("center:head"));
  assert.equal(hdPairNowFocus(now, "hdp:summary"), null);
});

test("Human Design: two cast charts and the moment cast at noon on 18 October 2026, held to the rules channel by channel; every reading in both languages", async () => {
  const [ca, cb] = [await calculateHumanDesign({ natalUtc: new Date("1990-06-15T10:00:00Z") }), await calculateHumanDesign({ natalUtc: new Date("1987-11-03T22:10:00Z") })];
  const sky = await calculateHumanDesign({ natalUtc: new Date(AT) });
  // The moment's gates: the planets' at that moment, as a birth's Personality is cast.
  const moment = sky.activations.filter((x) => x.layer === "personality").map(({ body, gate, line }) => ({ body, gate, line }));
  assert.equal(moment.length, 13);
  const pair = hdPair(ca, cb);
  const now = hdPairNow(pair, moment);
  const gates = new Set(moment.map((m) => m.gate));
  const holds = (g) => pair.gates.a.has(g) || pair.gates.b.has(g);
  // Every channel the pair does not form that the moment completes is listed, and only those.
  const expected = pair.channels.filter((ch) => !ch.kind && ch.gates.every((g) => holds(g) || gates.has(g)) && ch.gates.some((g) => !holds(g))).map((ch) => ch.id);
  assert.deepEqual(new Set(now.channels.map((c) => c.channel.id)), new Set(expected));
  for (const c of now.channels) {
    for (const g of c.brings) assert.ok(gates.has(g) && !holds(g));
    if (c.by === "sky") assert.equal(c.held, null);
    else assert.ok(c.by === "both" ? pair.gates.a.has(c.held) && pair.gates.b.has(c.held) : pair.gates[c.by].has(c.held));
  }
  const before = new Set(pair.centres.filter((x) => x.pair).map((x) => x.id));
  const after = new Set(partsOf([...pair.formed, ...now.channels.map((c) => c.channel)]).flat());
  assert.deepEqual(now.centres, HD_CENTER_IDS.filter((x) => after.has(x) && !before.has(x)));
  const ctx = { pair, charts: { a: ca, b: cb }, names, uncertain: hdPairUncertain(ca, cb) };
  for (const locale of ["en", "fr"]) {
    for (const id of [HDP_NOW, ...now.channels.map((c) => hdpNowRef(c.channel.id))]) {
      const r = hdPairNowReading(ctx, now, AT, id, locale);
      assert.ok(r, `${id} ${locale}: no reading`);
      assertWritten(readingText(r), locale, `${id} ${locale}`);
    }
    // A quiet moment reads too.
    assertWritten(readingText(hdPairNowReading(ctx, hdPairNow(pair, []), AT, HDP_NOW, locale)), locale, `quiet ${locale}`);
  }
});

/* ── Chinese astrology: the year's animal for both ────────────────────────── */

const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const B_BIRTH = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };
const NOW = Date.UTC(2026, 9, 9, 12);

test("Chinese astrology: 2026's Fire Horse for both, each one's year ahead as the Cycles page reads it, the Dog month, and the year for the two", () => {
  const za = zodiacChart(CAMILLE, { nowMs: NOW });
  const zb = zodiacChart(B_BIRTH, { nowMs: NOW });
  const now = zodiacPairNow(za, zb, NOW);
  assert.equal(now.year, 2026);
  assert.deepEqual(now.ahead.a, yearAhead(za, 2026));
  assert.deepEqual(now.ahead.b, yearAhead(zb, 2026));
  // The Horse's own year for Camille, the Horse breaking the Rabbit's for Sample B: it moves things for both.
  assert.deepEqual([now.kinds.a, now.kinds.b, now.together, now.lead], ["same", "destruction", "both-move", null]);
  // The Dog month (from Hanlu, 8 October): a trine to the Horse, the Rabbit's harmony.
  assert.equal(now.month.pillar.branch, 10);
  assert.deepEqual([now.monthKinds.a, now.monthKinds.b], [["trine"], ["harmony"]]);
  // The same year animal: what the two share.
  assert.equal(zodiacPairNow(za, za, NOW).together, "same-animal");
  for (const locale of ["en", "fr"]) {
    assertWritten(togetherLine(now, names, locale), locale, `together ${locale}`);
    for (const ref of [ZKP_NOW, zkpNowRef("a"), zkpNowRef("b"), ZKP_NOW_MONTH]) {
      const r = zodiacPairNowReading(now, { a: za, b: zb }, names, ref, locale, full, HEAD[locale], { a: "Europe/Paris", b: "Europe/Oslo" });
      assert.ok(r, `${ref} ${locale}`);
      assert.equal(r.id, ref);
      assertWritten(readingText(r), locale, `${ref} ${locale}`);
    }
    assert.equal(zodiacPairNowReading(now, { a: za, b: zb }, names, "zkp:summary", locale, full, HEAD[locale]), null);
  }
});

/* ── Feng Shui: the year's and month's stars over the shared directions ───── */

test("Feng Shui: the shared directions under 2026's stars, the one to face together, those to rest; two groups: each one's own", () => {
  // Kua 1 and Kua 4 (both of the East group) share north, east, south-east and south.
  const pair = fengShuiPair(fengShuiOf(CAMILLE, "yang"), fengShuiOf(B_BIRTH, "yang"));
  const now = fsPairNow(pair, NOW);
  assert.equal(now.y.solarYear, 2026);
  assert.equal(now.y.year, 1, "2026: the 1 White in the centre");
  assert.deepEqual(new Set(now.shared.map((s) => s.direction)), new Set(pair.shared));
  // A shared direction is under the same star for both, so in the same state.
  for (const s of now.shared) assert.equal(s.a.state, s.b.state, s.direction);
  const face = now.shared.find((s) => s.direction === now.face);
  assert.ok(face && (face.a.state === "strengthened" || (face.a.state === "steady" && !face.x.killingsBehind)));
  // The first shared direction the year strengthens, in the pair's order.
  const firstStrong = now.shared.find((s) => s.a.state === "strengthened");
  if (firstStrong) assert.equal(now.face, firstStrong.direction);
  assert.deepEqual(now.rest, now.shared.filter((s) => s.a.state === "rest").map((s) => s.direction));
  // The 5 Yellow flies to the south in 2026: a shared direction to rest.
  assert.ok(now.rest.includes("s"), `rest ${now.rest}`);
  assert.equal(now.face, "e");
  // Kua 1 (East) and Kua 2 (West) share nothing: each one's own direction to face.
  const apart = fsPairNow(fengShuiPair(fengShuiOf(CAMILLE, "yang"), fengShuiOf(B_BIRTH, "yin")), NOW);
  assert.deepEqual(apart.shared, []);
  assert.equal(apart.face, null);
  for (const locale of ["en", "fr"]) {
    assert.match(fsNowLead(apart, names, locale), locale === "fr" ? /^Aucune direction n’est favorable pour vous deux/ : /^No direction supports you both/);
    for (const [n, x] of [["shared", now], ["apart", apart]]) {
      for (const ref of [FSP_NOW, ...x.shared.map((s) => fspNowRef(s.direction)), ...(x.people.a.best ? [fspNowRef(x.people.a.best)] : [])]) {
        const r = fsPairNowReading(x, names, ref, locale, full, HEAD[locale], "Europe/Paris");
        assert.ok(r, `${n} ${ref} ${locale}`);
        assertWritten(readingText(r), locale, `${n} ${ref} ${locale}`);
      }
    }
    assert.equal(fsPairNowReading(now, names, "fsp:summary", locale, full, HEAD[locale]), null);
  }
});
