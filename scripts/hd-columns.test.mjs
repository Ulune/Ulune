/*
 * The Human Design chart's columns, facts and first read (the Human Design
 * plan, part 45): the rows in Jovian Archive's order, the cross and its
 * angle, what a choice lights on the chart and in the columns, and readings
 * that start with this chart. On the sample chart (1 Jan 2000, 12:00 UT).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateHumanDesign } from "../src/lib/chart/calculate.server.ts";
import { hdAngleOf, hdCrossGates, hdCrossOf } from "../src/lib/chart/hd-cross.ts";
import { HD_COLUMN_ORDER, hdActId, hdColumnRows, parseHdActId } from "../src/lib/chart/hd-rows.ts";
import { hdFocusOf, hdSay } from "../src/lib/chart/hd-focus.ts";
import { hdFirstRead, hdReading } from "../src/lib/chart/interpret-humandesign.ts";
import { HD_BODY_IDS } from "../src/lib/chart/human-design.ts";
import { glossaryFor, GLOSSARY } from "../src/lib/i18n/glossary.ts";

const sample = () => calculateHumanDesign({ natalUtc: new Date("2000-01-01T12:00:00Z") });

test("the columns list the 13 bodies in Jovian Archive's current order", async () => {
  assert.deepEqual([...HD_COLUMN_ORDER], [
    "sun",
    "earth",
    "northnode",
    "southnode",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
  ]);
  assert.deepEqual([...HD_COLUMN_ORDER].sort(), [...HD_BODY_IDS].sort());
  const hd = await sample();
  for (const layer of ["design", "personality"]) {
    const rows = hdColumnRows(hd, layer);
    assert.equal(rows.length, 13);
    assert.deepEqual(rows.map((r) => r.body), [...HD_COLUMN_ORDER]);
    assert.ok(rows.every((r) => r.layer === layer));
  }
  const at = (layer, body) => hdColumnRows(hd, layer).find((r) => r.body === body);
  assert.equal(`${at("personality", "sun").gate}.${at("personality", "sun").line}`, "38.1");
  assert.equal(`${at("personality", "earth").gate}.${at("personality", "earth").line}`, "39.1");
  assert.equal(`${at("design", "sun").gate}.${at("design", "sun").line}`, "48.4");
  assert.equal(`${at("design", "earth").gate}.${at("design", "earth").line}`, "21.4");
  assert.equal(`${at("personality", "venus").gate}.${at("personality", "venus").line}`, "34.2");
  assert.equal(`${at("design", "mars").gate}.${at("design", "mars").line}`, "26.6");
});

test("a row is chosen as act:<layer>:<body>, and nothing else parses as one", () => {
  assert.equal(hdActId("design", "mars"), "act:design:mars");
  assert.deepEqual(parseHdActId("act:personality:northnode"), { layer: "personality", body: "northnode" });
  assert.equal(parseHdActId("act:both:sun"), null);
  assert.equal(parseHdActId("act:design:chiron"), null);
  assert.equal(parseHdActId("gate:34"), null);
  assert.equal(parseHdActId(null), null);
});

test("the cross: the gates of both Suns and Earths, its angle from the profile", async () => {
  const hd = await sample();
  const cross = hdCrossOf(hd);
  assert.equal(hdCrossGates(cross), "38/39 | 48/21");
  assert.equal(cross.angle, "right");
  const right = ["1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6"];
  const left = ["5/1", "5/2", "6/2", "6/3"];
  for (const p of right) assert.equal(hdAngleOf(p), "right", p);
  for (const p of left) assert.equal(hdAngleOf(p), "left", p);
  assert.equal(hdAngleOf("4/1"), "juxtaposition");
  assert.equal(hdAngleOf("—"), null);
});

test("what a choice lights: the piece, what it joins, and its rows", async () => {
  const hd = await sample();
  // A gate: its channels, their far gates, its centre; its rows.
  const g = hdFocusOf("gate:34", hd);
  assert.equal(g.hero, "gate:34");
  for (const id of ["center:sacral", "channel:34–20", "channel:10–34", "channel:34–57", "gate:20", "gate:10", "gate:57"]) {
    assert.ok(g.lit.has(id), id);
  }
  assert.deepEqual([...g.rows], ["act:personality:venus"]);
  // A row: its gate, as a gate would be.
  const r = hdFocusOf("act:design:mars", hd);
  assert.equal(r.hero, "gate:26");
  assert.ok(r.rows.has("act:design:mars"));
  // The authority: its centre (Emotional: the Solar Plexus).
  assert.equal(hdFocusOf("hello:authority", hd).hero, "center:solarPlexus");
  // The profile: the two Suns; the cross: both Suns and Earths.
  const p = hdFocusOf("hello:profile", hd);
  assert.equal(p.hero, null);
  assert.deepEqual([...p.rows].sort(), ["act:design:sun", "act:personality:sun"]);
  assert.deepEqual([...p.lit].sort(), ["gate:38", "gate:48"]);
  const c = hdFocusOf("hello:cross", hd);
  assert.deepEqual([...c.lit].sort(), ["gate:21", "gate:38", "gate:39", "gate:48"]);
  assert.equal(c.rows.size, 4);
  // The keys without a place on the chart light nothing.
  assert.equal(hdFocusOf("hello:type", hd), null);
  assert.equal(hdFocusOf(null, hd), null);
});

test("the line under the chart names a row by its body first", async () => {
  const hd = await sample();
  assert.equal(hdSay(hd, "both", "act:personality:venus", "en", null), "Personality Venus 34.2 · Gate 34 · Sacral");
  assert.equal(hdSay(hd, "both", "act:design:mars", "fr", null), "Mars (Design) 26.6 · Porte 26 · Cœur");
  assert.match(hdSay(hd, "both", "gate:34", "en", null), /^Gate 34 · Sacral · Personality Venus 34\.2$/);
});

test("the first read: five steps in Human Design's order, in both languages", async () => {
  const hd = await sample();
  for (const locale of ["en", "fr"]) {
    const read = hdFirstRead(hd, locale);
    assert.deepEqual(read.steps.map((s) => s.id), ["type", "strategy", "authority", "profile", "definition"]);
    for (const s of read.steps) assert.ok(s.text.length > 20, `${locale} ${s.id}`);
    assert.ok(read.next.length > 40);
  }
  const en = hdFirstRead(hd, "en");
  assert.equal(en.profileName, "Investigator / Opportunist");
  assert.match(en.steps[0].extra, /frustration and anger when you are off track \(the not-self theme\), satisfaction and peace/);
  assert.equal(en.steps[3].text, "The 1 is the line of your Personality Sun (Investigator), the 4 the line of your Design Sun (Opportunist).");
});

test("readings start with this chart; what a gate is in general waits in About", async () => {
  const hd = await sample();
  const gate = hdReading(hd, "gate:34", "en");
  assert.match(gate.lead, /^In your chart: Personality Venus, line 2 \(Hermit\)\. Gate 34 is in the Sacral centre/);
  assert.match(gate.note, /^A gate is one of the 64/);
  assert.deepEqual(gate.facts[0], { label: "Personality Venus", value: "34.2", ref: "act:personality:venus" });
  assert.deepEqual(gate.links.rows.map((r) => r.ref), ["channel:10–34", "channel:34–20", "channel:34–57"]);
  const off = hdReading(hd, "gate:64", "en");
  assert.match(off.lead, /^Not coloured in your chart\./);

  const ch = hdReading(hd, "channel:34–20", "en");
  assert.match(ch.lead, /^Half of it in your chart: Personality Venus on gate 34; gate 20 is not coloured\./);
  const on = hdReading(hd, "channel:10–34", "en");
  assert.match(on.lead, /^Defined in your chart: Personality Mercury on gate 10 and Personality Venus on gate 34\./);

  const row = hdReading(hd, "act:design:sun", "en");
  assert.equal(row.title, "Design Sun 48.4");
  assert.match(row.lead, /^In your chart, Design Sun colours gate 48, line 4 \(Opportunist\)\. Human Design gives the Sun the most weight/);
  assert.deepEqual(row.facts.map((f) => f.label), ["Gate", "Line", "Centre"]);
  assert.equal(row.facts[0].value, "48 · Depth");

  const cross = hdReading(hd, "hello:cross", "en");
  assert.equal(cross.title, "Incarnation Cross");
  assert.equal(cross.kicker, "38/39 | 48/21");
  assert.deepEqual(cross.links.rows.map((r) => r.ref), ["gate:38", "gate:39", "gate:48", "gate:21"]);
  assert.match(cross.sections[0].paragraphs[0], /^A Right Angle cross/);

  const type = hdReading(hd, "hello:type", "en");
  assert.ok(type.sections.some((s) => s.id === "signposts"));
  assert.ok(type.facts.some((f) => f.ref === "hello:cross"));
  // French: the bodies and layers in French.
  assert.match(hdReading(hd, "gate:34", "fr").lead, /^Dans votre schéma\u202f: Vénus \(Personnalité\), ligne 2/);
});

test("the glossary starts with the words the chosen piece uses", () => {
  assert.deepEqual(glossaryFor("design", "gate:34").slice(0, 4), ["hdGate", "hdLine", "hdHanging", "hdChannel"]);
  assert.equal(glossaryFor("design", "hello:cross")[0], "hdCross");
  assert.equal(glossaryFor("design", "hello:type")[1], "hdNotSelf");
  for (const id of ["hdGate", "hdChannel", "hdLine", "hdHanging", "hdNotSelf", "hdProfile", "hdDefinition", "hdCross"]) {
    assert.ok(GLOSSARY[id].term[0] && GLOSSARY[id].term[1] && GLOSSARY[id].body[0] && GLOSSARY[id].body[1], id);
  }
});
