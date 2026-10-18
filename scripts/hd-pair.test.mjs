/*
 * Human Design's connection chart (share and compare plan, feature 5a;
 * src/lib/chart/hd-pair.ts): the four kinds of connection, conditioning,
 * the open ground, the pair's definition and its bridges, on pairs worked
 * out by hand (gates chosen, not cast: nobody's birth); then the rules held
 * channel by channel on two cast charts (the e2e fixtures' made-up births);
 * then the readings, the first read, the method notes and the table in both
 * languages: every id reads, in Ulune's tone and typography.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateHumanDesign } from "../src/lib/chart/calculate.server.ts";
import {
  HD_PAIR_KINDS,
  HDP_DEFINITION,
  HDP_OPEN,
  HDP_SUMMARY,
  hdPair,
  hdPairFocus,
  hdPairUncertain,
  hdpConditionRef,
  hdpKindRef,
  hdpPersonRef,
  pairKindOf,
  parseHdpRef,
  partsOf,
} from "../src/lib/chart/hd-pair.ts";
import { HD_CENTER_IDS, HD_CHANNELS, definitionFromChannels } from "../src/lib/chart/human-design.ts";

/** A person by their gates alone (as both layers' union: the layer does not matter to a connection chart). */
const person = (...gates) => ({ activations: gates.map((gate, i) => ({ gate, layer: i % 2 ? "design" : "personality", body: "sun", line: 1, ecliptic: 0 })) });
const kinds = (pair) => Object.fromEntries(pair.formed.map((ch) => [ch.id, ch.lead ? `${ch.kind}:${ch.lead}` : ch.kind]));

test("a channel's kind follows the classical rules, whoever is A", () => {
  const h = (...gates) => ({ gates, whole: gates.length === 2 });
  assert.deepEqual(pairKindOf(h(34), h(20)), { kind: "electromagnetic", lead: null });
  assert.deepEqual(pairKindOf(h(34, 20), h(34, 20)), { kind: "companionship", lead: null });
  assert.deepEqual(pairKindOf(h(34, 20), h()), { kind: "dominance", lead: "a" });
  assert.deepEqual(pairKindOf(h(), h(34, 20)), { kind: "dominance", lead: "b" });
  assert.deepEqual(pairKindOf(h(34, 20), h(20)), { kind: "compromise", lead: "a" });
  assert.deepEqual(pairKindOf(h(34), h(34, 20)), { kind: "compromise", lead: "b" });
  // The same gate in both, one gate in one, nothing: not formed.
  for (const [a, b] of [[h(34), h(34)], [h(34), h()], [h(), h(20)], [h(), h()]]) assert.deepEqual(pairKindOf(a, b), { kind: null, lead: null });
});

/*
 * Pair 1, the four kinds. A: 34 20 1 8 59 6 25. B: 57 1 8 59 37 40 51.
 *   20–57  A 20, B 57                electromagnetic
 *   25–51  A 25, B 51                electromagnetic (G to Heart)
 *   34–57  A 34, B 57                electromagnetic
 *   8–1    both whole                companionship
 *   34–20  A whole, B neither gate   dominance, A
 *   40–37  B whole, A neither gate   dominance, B
 *   59–6   A whole, B 59 only        compromise, A
 *   10–20, 10–34 (A's gate alone), 10–57 (B's alone): not formed.
 * A defines Throat, G, Sacral, Solar Plexus (single); B Throat, G | Heart,
 * Solar Plexus (split). Between them: Throat, G, Solar Plexus both; Sacral A
 * only (A conditions B there); Heart B only (B conditions A); Spleen only
 * together (20–57, 34–57); Head, Ajna, Root open. One group of six centres:
 * single, 6–3. B's split is joined by A's gates 6, 20, 25 and 34 (25–51
 * directly, and through A's Sacral: 34–20, 59–6, 20–57, 34–57).
 */
const P1 = { a: person(34, 20, 1, 8, 59, 6, 25), b: person(57, 1, 8, 59, 37, 40, 51) };

test("pair 1: each of the four kinds, by hand", () => {
  const pair = hdPair(P1.a, P1.b);
  assert.deepEqual(kinds(pair), {
    "20–57": "electromagnetic",
    "25–51": "electromagnetic",
    "34–57": "electromagnetic",
    "8–1": "companionship",
    "34–20": "dominance:a",
    "40–37": "dominance:b",
    "59–6": "compromise:a",
  });
  // Formed channels by kind, then in the channels' order.
  assert.deepEqual(pair.formed.map((ch) => ch.id), ["20–57", "25–51", "34–57", "8–1", "34–20", "40–37", "59–6"]);
  assert.equal(pair.channels.length, 36);
  for (const id of ["10–20", "10–34", "10–57", "64–47"]) assert.equal(pair.channels.find((c) => c.id === id).kind, null, id);
  // Whose each gate is.
  assert.equal(pair.tones.get(34), "a");
  assert.equal(pair.tones.get(57), "b");
  assert.equal(pair.tones.get(59), "both");
  assert.equal(pair.tones.get(1), "both");
  assert.equal(pair.tones.get(64), "off");
  assert.equal([...pair.tones.values()].filter((t) => t !== "off").length, 11);
  // What each holds of the compromise channel.
  const c = pair.channels.find((ch) => ch.id === "59–6");
  assert.deepEqual([c.a, c.b], [{ gates: [59, 6], whole: true }, { gates: [59], whole: false }]);
});

test("pair 1: the centres, conditioning both ways, the open ground, the definition and the bridge", () => {
  const pair = hdPair(P1.a, P1.b);
  const by = Object.fromEntries(pair.centres.map((c) => [c.id, c.by]));
  assert.deepEqual(by, { head: null, ajna: null, throat: "both", g: "both", heart: "b", sacral: "a", solarPlexus: "both", spleen: "together", root: null });
  assert.deepEqual(pair.conditioning, { a: ["sacral"], b: ["heart"] });
  assert.deepEqual(pair.both, ["throat", "g", "solarPlexus"]);
  assert.deepEqual(pair.together, ["spleen"]);
  assert.deepEqual(pair.open, ["head", "ajna", "root"]);
  assert.deepEqual(pair.definitions, { a: "Single", b: "Split" });
  assert.equal(pair.definition, "Single");
  assert.deepEqual(pair.parts, [["throat", "g", "heart", "sacral", "solarPlexus", "spleen"]]);
  assert.deepEqual(pair.theme, { defined: 6, open: 3 });
  assert.deepEqual(pair.bridges, [{ who: "b", parts: 2, apart: 1, channels: ["20–57", "34–20", "25–51", "34–57", "59–6"], gates: [6, 20, 25, 34] }]);
});

/*
 * Pair 2, a triple split and a Reflector. A: 64 47 12 22 3 60 17 5 (Head–Ajna
 * 64–47 | Throat–Solar Plexus 12–22 | Sacral–Root 3–60, hanging 17 and 5).
 * B: 62 15 2 41, no whole channel (a Reflector).
 *   17–62  A 17, B 62: electromagnetic, joining A's Head–Ajna to its Throat
 *   15–5   A 5, B 15: electromagnetic, the G defined only together
 *   64–47, 12–22, 3–60: dominance, A
 *   2–14 (B's 2), 41–30 (B's 41): not formed
 * A conditions B in all six of A's centres; B conditions nothing. Between
 * them: Head, Ajna, Throat, Solar Plexus | G, Sacral, Root: split, 7–2, the
 * Heart and the Spleen open. A's three parts become two: B's gate 62 bridges
 * (17–62); 15–5 reaches the G but joins nothing more.
 */
const P2 = { a: person(64, 47, 12, 22, 3, 60, 17, 5), b: person(62, 15, 2, 41) };

test("pair 2: a Reflector beside a triple split, conditioning one way, a bridge that joins two of three", () => {
  const pair = hdPair(P2.a, P2.b);
  assert.deepEqual(kinds(pair), { "17–62": "electromagnetic", "15–5": "electromagnetic", "64–47": "dominance:a", "12–22": "dominance:a", "3–60": "dominance:a" });
  assert.deepEqual(pair.definitions, { a: "Triple split", b: "None" });
  assert.deepEqual(pair.conditioning, { a: ["head", "ajna", "throat", "sacral", "solarPlexus", "root"], b: [] });
  assert.deepEqual(pair.together, ["g"]);
  assert.deepEqual(pair.both, []);
  assert.deepEqual(pair.open, ["heart", "spleen"]);
  assert.equal(pair.definition, "Split");
  assert.deepEqual(pair.parts, [["head", "ajna", "throat", "solarPlexus"], ["g", "sacral", "root"]]);
  assert.deepEqual(pair.theme, { defined: 7, open: 2 });
  assert.deepEqual(pair.bridges, [{ who: "a", parts: 3, apart: 2, channels: ["17–62"], gates: [62] }]);
});

/*
 * Pair 3, nothing formed. A: 10 41. B: 10 19. The same gate 10 in both makes
 * no channel (10–20, 10–57, 10–34 need the other end); 41 and 19 hang alone.
 * No definition between them: 0–9, every centre open, no conditioning.
 */
test("pair 3: the same gate in both, and nothing formed", () => {
  const pair = hdPair(person(10, 41), person(10, 19));
  assert.deepEqual(pair.formed, []);
  assert.equal(pair.tones.get(10), "both");
  assert.equal(pair.tones.get(41), "a");
  assert.equal(pair.tones.get(19), "b");
  assert.equal(pair.definition, "None");
  assert.deepEqual(pair.parts, []);
  assert.deepEqual(pair.theme, { defined: 0, open: 9 });
  assert.deepEqual(pair.open, [...HD_CENTER_IDS]);
  assert.deepEqual(pair.conditioning, { a: [], b: [] });
  assert.deepEqual(pair.bridges, []);
});

/*
 * Pair 4, the other person leads. A: 54 32 28. B: 54 32 38 28 13. 32–54
 * both whole (companionship); 28–38 B whole and A 28 (compromise, B); 33–13
 * B's 13 alone. Both define the Spleen and the Root, nothing else: no
 * conditioning between them, a single definition, nobody's split to bridge.
 */
test("pair 4: compromise led by B, companionship, and no conditioning where both define", () => {
  const pair = hdPair(person(54, 32, 28), person(54, 32, 38, 28, 13));
  assert.deepEqual(kinds(pair), { "32–54": "companionship", "28–38": "compromise:b" });
  assert.deepEqual(pair.conditioning, { a: [], b: [] });
  assert.deepEqual(pair.both, ["spleen", "root"]);
  assert.equal(pair.definition, "Single");
  assert.deepEqual(pair.bridges, []);
});

test("A and B change places: the same kinds, the leads and the conditioning swap", () => {
  for (const { a, b } of [P1, P2]) {
    const ab = hdPair(a, b);
    const ba = hdPair(b, a);
    const swap = { a: "b", b: "a", null: null };
    assert.deepEqual(ba.formed.map((ch) => [ch.id, ch.kind, ch.lead]), ab.formed.map((ch) => [ch.id, ch.kind, swap[ch.lead]]));
    assert.deepEqual(ba.conditioning, { a: ab.conditioning.b, b: ab.conditioning.a });
    assert.deepEqual([ba.definition, ba.theme, ba.open], [ab.definition, ab.theme, ab.open]);
  }
});

test("a split that nothing joins stays apart, and says so", () => {
  // A: 64–47 (Head–Ajna) | 3–60 (Sacral–Root). B: 9 alone (9–52 needs 52). Nothing between A's parts.
  const pair = hdPair(person(64, 47, 3, 60), person(9));
  assert.deepEqual(pair.bridges, [{ who: "a", parts: 2, apart: 2, channels: [], gates: [] }]);
  assert.equal(pair.definition, "Split");
});

test("what a choice lights on the figure", () => {
  const pair = hdPair(P1.a, P1.b);
  const gate = hdPairFocus(pair, "gate:57");
  assert.equal(gate.hero, "gate:57");
  for (const id of ["center:spleen", "channel:20–57", "gate:20", "channel:34–57", "gate:34", "channel:10–57", "gate:10"]) assert.ok(gate.lit.has(id), id);
  const em = hdPairFocus(pair, hdpKindRef("electromagnetic"));
  assert.equal(em.hero, null);
  assert.deepEqual([...em.lit].filter((x) => x.startsWith("channel:")).sort(), ["channel:20–57", "channel:25–51", "channel:34–57"]);
  assert.ok(em.lit.has("center:heart") && em.lit.has("gate:51"));
  assert.deepEqual([...hdPairFocus(pair, HDP_OPEN).lit].sort(), ["center:ajna", "center:head", "center:root"]);
  const cond = hdPairFocus(pair, hdpConditionRef("a"));
  assert.ok(cond.lit.has("center:sacral") && cond.lit.has("channel:34–20") && cond.lit.has("channel:59–6"));
  assert.ok(!cond.lit.has("channel:8–1"), "A's channel away from the conditioned centre stays faded");
  assert.ok(hdPairFocus(pair, hdpPersonRef("b")).lit.has("channel:40–37"));
  assert.equal(hdPairFocus(pair, hdpKindRef("companionship")).lit.size, 5);
  assert.equal(hdPairFocus(hdPair(person(10), person(19)), HDP_SUMMARY), null, "nothing formed: nothing to light");
  assert.equal(hdPairFocus(pair, "hdp:nonsense"), null);
  assert.equal(hdPairFocus(pair, null), null);
});

test("the page's ids read back", () => {
  assert.deepEqual(parseHdpRef(HDP_SUMMARY), { kind: "summary" });
  assert.deepEqual(parseHdpRef(HDP_DEFINITION), { kind: "definition" });
  assert.deepEqual(parseHdpRef("hdp:kind:compromise"), { kind: "kind", value: "compromise" });
  assert.deepEqual(parseHdpRef("hdp:conditioning:b"), { kind: "conditioning", who: "b" });
  assert.deepEqual(parseHdpRef("hdp:person:a"), { kind: "person", who: "a" });
  for (const bad of ["hdp:kind:friendship", "hdp:person:c", "gate:34", "", null]) assert.equal(parseHdpRef(bad), null, String(bad));
});

test("without a birth time, the channels whose kind rests on a gate that could differ", () => {
  // A's 20 comes from its Design Sun's row (person() puts the second gate on the Design side), which could differ; 34 is sure.
  const a = { ...person(34, 20), uncertain: { spanMinutes: 720, rows: ["act:design:sun"], keys: [], channels: [] } };
  const b = person(57);
  const loose = hdPairUncertain(a, b);
  assert.ok(loose.has("34–20") && loose.has("20–57") && loose.has("10–20"));
  assert.ok(!loose.has("34–57"), "a channel on sure gates only");
  assert.equal(hdPairUncertain(person(1), person(2)).size, 0);
});

// The e2e fixtures' made-up births: TraceQA (15 June 1990, 12:00, Paris) and Sample B (3 Nov 1987, 23:10, Oslo).
const castA = () => calculateHumanDesign({ natalUtc: new Date("1990-06-15T10:00:00Z") });
const castB = () => calculateHumanDesign({ natalUtc: new Date("1987-11-03T22:10:00Z") });

test("two cast charts: every channel by the rules, each person's own definition as their bodygraph's", async () => {
  const [a, b] = [await castA(), await castB()];
  const pair = hdPair(a, b);
  const ga = new Set(a.activations.map((x) => x.gate));
  const gb = new Set(b.activations.map((x) => x.gate));
  for (const ch of pair.channels) {
    const [x, y] = ch.gates;
    const wa = ga.has(x) && ga.has(y);
    const wb = gb.has(x) && gb.has(y);
    const one = (s) => Number(s.has(x)) + Number(s.has(y)) === 1;
    const want = wa && wb ? "companionship" : wa || wb ? ((wa ? gb : ga).has(x) || (wa ? gb : ga).has(y) ? "compromise" : "dominance") : one(ga) && one(gb) && ga.has(x) !== gb.has(x) ? "electromagnetic" : null;
    assert.equal(ch.kind, want, ch.id);
  }
  assert.equal(pair.definitions.a, a.definition);
  assert.equal(pair.definitions.b, b.definition);
  // The pair's definition agrees with the natal engine's on the channels formed.
  assert.equal(pair.definition, definitionFromChannels(pair.formed.map((ch) => ({ ...ch, personality: false, design: false, mixed: true }))));
  assert.deepEqual(partsOf(a.definedChannels).flat().sort(), [...a.definedCenters].sort());
  // Each person's whole channels are formed between them, whatever the other has.
  for (const ch of a.definedChannels) assert.ok(pair.formed.some((f) => f.id === ch.id), ch.id);
  assert.equal(HD_CHANNELS.length, pair.channels.length);
  assert.ok(HD_PAIR_KINDS.every((k) => typeof k === "string"));
});

/* ------------------------------------------------ the readings, both languages */

import { hdPairFirstRead, hdPairMethod, hdPairReading, hdPairSummary } from "../src/lib/chart/interpret-hd-pair.ts";
import { hdPairTableCsv, hdPairTextParts } from "../src/lib/chart/hd-pair-table.ts";
import { hdPairWords } from "../src/lib/i18n/catalog/hd-pair-words.ts";
import { bookT } from "../src/lib/i18n/words-book.ts";
import { csvSections, parseCsv } from "../src/lib/csv.ts";

/** A bodygraph-like person for the readings: gates on named bodies, and the keys the person reading says. */
const chartOf = (gates, keys = {}) => ({
  activations: gates.map((gate, i) => ({ gate, line: (i % 6) + 1, layer: i % 2 ? "design" : "personality", body: ["sun", "earth", "moon", "mercury", "venus", "mars", "jupiter", "saturn"][Math.floor(i / 2) % 8], ecliptic: 0 })),
  type: "Projector",
  strategy: "Wait for the invitation",
  authority: "Splenic",
  profile: "4/6",
  definition: "Split",
  ...keys,
});

const ctxOf = (a, b, names) => ({ pair: hdPair(a, b), charts: { a, b }, names, uncertain: hdPairUncertain(a, b) });

/** Every id the page can choose: 36 channels, 64 gates, 9 centres and its own parts. */
const ALL_IDS = [
  ...HD_CHANNELS.map((ch) => `channel:${ch.id}`),
  ...Array.from({ length: 64 }, (_, i) => `gate:${i + 1}`),
  ...HD_CENTER_IDS.map((c) => `center:${c}`),
  HDP_SUMMARY,
  HDP_OPEN,
  HDP_DEFINITION,
  ...HD_PAIR_KINDS.map(hdpKindRef),
  hdpConditionRef("a"),
  hdpConditionRef("b"),
  hdpPersonRef("a"),
  hdpPersonRef("b"),
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

/** Ulune's typography and tone, in either language (fr-typography.test.mjs's rule for French). */
function assertWritten(text, locale, what) {
  assert.ok(!/[{}]/.test(text), `${what}: a placeholder left: ${text.match(/.{0,30}[{}].{0,30}/)?.[0]}`);
  // "undefined" is also Human Design's word for a centre with gates but no channel: only a value's leftovers count.
  assert.ok(!/\b(?:null|NaN)\b|(?:gate|Gate|porte|Porte|line|ligne|[–.])\s?undefined\b|\bundefined\s?[–.\d]/.test(text), `${what}: a value missing`);
  assert.ok(!/\w'\w/.test(text), `${what}: a straight apostrophe`);
  assert.ok(!/\b(?:toxi[cq]|incompatib|compatib|soul ?mate|âme sœur|divorc|death|mort\b|illness|maladie|accident|doomed|condamn)/i.test(text), `${what}: a verdict or a fear: ${text.match(/.{0,40}\b(?:toxi[cq]|incompatib|compatib|divorc|death|illness|accident)\w*.{0,20}/i)?.[0]}`);
  if (locale === "fr") {
    const bad = [];
    for (const m of text.matchAll(/(.{0,24})(?<![\u202f\d])([:;!?])(?=\s|$)/gmu)) bad.push(`${m[1]}${m[2]}`);
    for (const m of text.matchAll(/(.{0,12})«(?!\u202f)(.{0,12})/gu)) bad.push(`${m[1]}«${m[2]}`);
    for (const m of text.matchAll(/(.{0,12})(?<!\u202f)»/gu)) bad.push(`${m[1]}»`);
    assert.deepEqual(bad.slice(0, 3), [], `${what}: French punctuation without its narrow space`);
    assert.ok(!/\bde [AEIOUÉÈHaeiouéèh]/.test(text), `${what}: “de” before a vowel: ${text.match(/.{0,20}\bde [AEIOUÉÈHaeiouéèh].{0,10}/)?.[0]}`);
  } else assert.ok(!/[«»\u202f]/.test(text), `${what}: French marks in English`);
}

const PAIRS = [
  ["pair 1", ctxOf(chartOf([34, 20, 1, 8, 59, 6, 25], { type: "Manifesting Generator", definition: "Single", profile: "2/4", strategy: "Wait to respond", authority: "Sacral" }), chartOf([57, 1, 8, 59, 37, 40, 51]), { a: "TraceQA", b: "Sample B" })],
  ["pair 2, names that elide", ctxOf(chartOf([64, 47, 12, 22, 3, 60, 17, 5], { definition: "Triple split" }), chartOf([62, 15, 2, 41], { type: "Reflector", strategy: "Wait a lunar cycle", authority: "Lunar", definition: "None" }), { a: "Anna", b: "Élise" })],
  ["pair 3, nothing formed", ctxOf(chartOf([10, 41], { definition: "None", type: "Reflector", strategy: "Wait a lunar cycle", authority: "Lunar" }), chartOf([10, 19], { definition: "None", type: "Reflector", strategy: "Wait a lunar cycle", authority: "Lunar" }), { a: "Hugo", b: "Yann" })],
];

test("every channel, gate, centre and part of the page reads, in both languages, in Ulune's tone and typography", () => {
  for (const [label, ctx] of PAIRS) {
    for (const locale of ["en", "fr"]) {
      for (const id of ALL_IDS) {
        const r = hdPairReading(ctx, id, locale);
        assert.ok(r, `${label} ${locale} ${id}: no reading`);
        assert.equal(r.id, id);
        assert.ok(r.title && r.paragraphs.length && r.paragraphs.every(Boolean), `${label} ${locale} ${id}: an empty reading`);
        assertWritten(readingText(r), locale, `${label} ${locale} ${id}`);
      }
      assert.equal(hdPairReading(ctx, "planet:sun", locale), null);
      assert.equal(hdPairReading(ctx, null, locale), null);
      assert.equal(hdPairReading(null, "gate:1", locale), null);
    }
  }
});

test("the readings start with the two people: a kind's sentence, who brings what, who conditions whom", () => {
  const [, ctx] = PAIRS[0];
  const em = hdPairReading(ctx, "channel:25–51", "en");
  assert.match(em.lead, /^TraceQA brings gate 25 and Sample B gate 51: this channel is whole in neither of you/);
  assert.equal(em.facts[0].value, "Electromagnetic");
  const cmp = hdPairReading(ctx, "channel:59–6", "fr");
  assert.match(cmp.lead, /^TraceQA a le canal entier, portes 59 et 6, et Sample B la seule porte 59\u202f: ici, Sample B tend à s’adapter à la façon de faire de TraceQA/);
  const dom = hdPairReading(ctx, "channel:40–37", "en");
  assert.match(dom.lead, /^Sample B has the whole channel, gates 40 and 37, and TraceQA neither gate/);
  assert.match(hdPairReading(ctx, "channel:8–1", "en").lead, /^You both have the whole channel, gates 8 and 1/);
  assert.match(hdPairReading(ctx, "channel:10–20", "en").lead, /^Not formed between you: TraceQA has gate 20, and neither of you has gate 10/);
  assert.match(hdPairReading(ctx, "center:sacral", "en").lead, /^TraceQA defines the Sacral and Sample B has it open/);
  assert.match(hdPairReading(ctx, "center:heart", "fr").lead, /^Sample B définit le Cœur, que TraceQA a ouvert/);
  assert.match(hdPairReading(ctx, "center:spleen", "en").lead, /^The Spleen is defined in neither of you on your own, but between you it is, through 20–57/);
  assert.match(hdPairReading(ctx, "center:throat", "en").lead, /^You both define the Throat/);
  assert.match(hdPairReading(ctx, "center:root", "en").lead, /^The Root is open between you/);
  assert.match(hdPairReading(ctx, "gate:59", "en").lead, /^You both activate it: TraceQA with .+, Sample B with .+\. Between you it is part of 59–6 \(compromise\)\./);
  assert.match(hdPairReading(ctx, HDP_DEFINITION, "en").paragraphs.join(" "), /Sample B’s own definition is in 2 parts, and with TraceQA they join up, bridged by TraceQA’s gates 6, 20, 25 and 34/);
  assert.match(hdPairReading(ctx, HDP_DEFINITION, "fr").paragraphs.join(" "), /reliées par les portes 6, 20, 25 et 34 de TraceQA/);
  assert.equal(hdPairSummary(ctx, "en"), "Between you: 7 channels (3 electromagnetic, 1 of companionship, 2 of dominance, 1 of compromise). Your connection defines 6 of the nine centres (6–3), with a single definition.");
  // French elision before a vowel: « d’Anna », « d’Élise ».
  const [, two] = PAIRS[1];
  assert.match(hdPairReading(two, "center:throat", "fr").lead, /auprès d’Anna/);
  assert.match(hdPairReading(two, HDP_DEFINITION, "fr").paragraphs.join(" "), /La définition propre d’Anna est en 3 parties\u202f; avec Élise, il en reste 2, certaines reliées par la porte 62 d’Élise \(17–62\)/);
  assert.match(hdPairReading(two, hdpPersonRef("b"), "en").paragraphs.join(" "), /Élise is a Reflector, profile 4\/6, with no definition\. On their own, Élise defines no centre/);
});

test("the first read: a text for each step, in both languages", () => {
  for (const [label, ctx] of PAIRS) {
    for (const locale of ["en", "fr"]) {
      const first = hdPairFirstRead(ctx, locale);
      for (const id of ["summary", ...HD_PAIR_KINDS, "conditioning-a", "conditioning-b", "open", "definition"]) {
        assert.ok(first.texts[id], `${label} ${locale}: no text for ${id}`);
        assertWritten(first.texts[id], locale, `${label} ${locale} first read ${id}`);
      }
      assertWritten(`${first.lead}\n${first.next}`, locale, `${label} ${locale} first read`);
    }
  }
  const one = hdPairFirstRead(PAIRS[0][1], "en").texts;
  assert.equal(one.electromagnetic, "One gate each: together you complete the channel. Between you: 20–57, 25–51 and 34–57.");
  assert.equal(one.dominance, "One has it whole, the other neither gate. TraceQA leads: 34–20; Sample B leads: 40–37.");
  assert.equal(one.companionship, "Both of you have it whole: shared ground. Between you: 8–1.");
  assert.equal(hdPairFirstRead(PAIRS[2][1], "fr").texts.companionship, "Vous l’avez tous les deux en entier\u202f: un terrain commun. Aucun entre vous.");
});

test("the method notes say what a connection chart is and is not, in both languages", () => {
  for (const locale of ["en", "fr"]) {
    const how = hdPairMethod(locale);
    assert.equal(how.items.length, 5);
    assertWritten([how.title, ...how.items].join("\n"), locale, `method ${locale}`);
  }
  assert.match(hdPairMethod("en").items.join(" "), /not verdicts.*not a third person’s chart/s);
});

test("the table: its text for Copy and its CSV, a section per part", () => {
  const [, ctx] = PAIRS[0];
  const catalog = (key) => `[${key}]`;
  for (const locale of ["en", "fr"]) {
    const w = bookT(hdPairWords, catalog, locale);
    const parts = hdPairTextParts(ctx, locale, w, { gate: (n) => `G${n}`, channel: (id) => `C${id}` });
    assert.deepEqual(parts.map((p) => p.id), ["channels", "centres", "gates"]);
    const text = parts.flatMap((p) => p.lines).join("\n");
    assert.ok(!text.includes("["), `${locale}: a word missing from the book`);
    assertWritten(text.replaceAll(/C\d+–\d+|G\d+/g, ""), locale, `table ${locale}`);
    // 7 formed, then one line for the half ones; 9 centres; 11 active gates (each part with its heading).
    assert.equal(parts[0].lines.length, 1 + 7 + 1);
    assert.equal(parts[1].lines.length, 1 + 9);
    assert.equal(parts[2].lines.length, 1 + 11);
  }
  const w = bookT(hdPairWords, catalog, "en");
  assert.equal(hdPairTextParts(ctx, "en", w, null)[0].lines[1], "20–57 · Electromagnetic · TraceQA: Gate 20 · Sample B: Gate 57");
  assert.match(hdPairTextParts(ctx, "en", w, null)[1].lines.find((l) => l.startsWith("Sacral")), /^Sacral: TraceQA defined · Sample B undefined · defined by TraceQA, open for Sample B · TraceQA → Sample B$/);
  const sections = csvSections(parseCsv(hdPairTableCsv(ctx)));
  assert.deepEqual(sections.map((s) => s.kind), ["channel", "centre", "gate"]);
  assert.deepEqual(sections[0].rows[0], ["channel", "id", "gates", "centres", "kind", "lead", "a", "b", "uncertain"]);
  assert.ok(sections[0].rows.some((r) => r.join() === "channel,59–6,59|6,sacral|solarPlexus,compromise,a,59|6,59,0"));
  assert.ok(sections[1].rows.some((r) => r.join() === "centre,sacral,1,0,1,a,a"));
  assert.ok(sections[2].rows.some((r) => r[1] === "57" && r[3] === "" && r[4].startsWith("personality:sun:57.")));
});
