/**
 * Feng Shui's home (languages plan, part 22): the 24 mountains and their
 * edges, the house's trigram and group beside a person's Kua, the periods,
 * the average of compass readings, the device's heading, the magnetic
 * declination against the World Magnetic Model 2025's published test
 * values, what the page says and its table. Made-up births only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { MOUNTAINS, averageBearing, directionAt, edgeOf, homeOf, houseMatch, mountainAt, periodOf } from "../src/lib/chinese/fengshui-home.ts";
import { fengShuiOf } from "../src/lib/chinese/fengshui.ts";
import { FSH_FACING_REF, FSH_HOW_REF, FSH_PERIOD_REF, fshHouseRef, fshMountainRef, homeReading, matchLines, sourceLine } from "../src/lib/chinese/fengshui-home-reading.ts";
import { homeTableCsv, homeTextParts } from "../src/lib/chinese/fengshui-home-table.ts";
import { declination, magneticField, decimalYear, modelCovers } from "../src/lib/chinese/geomag.ts";
import { headingOf } from "../src/studio/modes/hooks/useCompass.ts";
import { parseFacing, parseYear } from "../src/studio/modes/fengshui-home-state.ts";

const full = { script: "hant", show: "full" };
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const yang = fengShuiOf(CAMILLE, "yang");
const yin = fengShuiOf(CAMILLE, "yin");

test("the 24 mountains: Ren first at 345°, Zi on the north, each 15°, three to a direction", () => {
  assert.equal(MOUNTAINS.length, 24);
  assert.deepEqual(MOUNTAINS.map((m) => m.id).join(" "), "ren zi gui chou gen yin jia mao yi chen xun si bing wu ding wei kun shen geng you xin xu qian hai");
  assert.deepEqual([MOUNTAINS[0].degrees, MOUNTAINS[1].degrees, MOUNTAINS[13].degrees], [345, 0, 180]);
  assert.deepEqual(MOUNTAINS.filter((m) => m.kind === "trigram").map((m) => [m.id, m.direction, m.place]), [["gen", "ne", 2], ["xun", "se", 2], ["kun", "sw", 2], ["qian", "nw", 2]]);
  assert.equal(MOUNTAINS.filter((m) => m.kind === "stem").length, 8);
  assert.equal(mountainAt(0).id, "zi");
  assert.equal(mountainAt(352.5).id, "zi");
  assert.equal(mountainAt(352.4).id, "ren");
  assert.equal(mountainAt(7.5).id, "gui");
  assert.equal(mountainAt(359.99).id, "zi");
  assert.equal(mountainAt(180).id, "wu");
  assert.equal(directionAt(22.4), "n");
  assert.equal(directionAt(22.5), "ne");
});

test("a facing's edge: clear, a replacement chart's zone, a void line between mountains or directions", () => {
  assert.deepEqual([edgeOf(180).level, edgeOf(180).distance], ["clear", 7.5]);
  const near = edgeOf(170);
  assert.deepEqual([near.level, near.distance, near.neighbour.id, near.between], ["replacement", 2.5, "wu", "mountains"]);
  const line = edgeOf(22.4);
  assert.equal(line.level, "void");
  assert.equal(line.neighbour.id, "chou");
  assert.equal(line.between, "directions");
  assert.ok(Math.abs(line.distance - 0.1) < 1e-9);
});

test("a home: its mountains, its house by where it sits, and a person's Kua beside it", () => {
  const h = homeOf(180, "compass", null);
  assert.deepEqual([h.facingMountain.id, h.sittingMountain.id, h.facingDirection, h.sittingDirection, h.house.id, h.house.group], ["wu", "zi", "s", "n", "kan", "east"]);
  assert.deepEqual(houseMatch(h, yang), { same: true, facing: "yan-nian", sitting: "fu-wei", facingSupportive: true, sittingSupportive: true });
  assert.deepEqual(houseMatch(h, yin), { same: false, facing: "huo-hai", sitting: "wu-gui", facingSupportive: false, sittingSupportive: false });
  // A map's true bearing: the declination (east positive) is taken off to read it as a luopan does.
  const map = homeOf(180, "map", 2);
  assert.equal(map.facing.degrees, 178);
  assert.equal(homeOf(1, "map", 2).facing.degrees, 359);
  // A home facing north-east sits south-west: a Kun house, West group.
  assert.deepEqual([homeOf(45, "compass", null).house.id, homeOf(45, "compass", null).house.group], ["kun", "west"]);
});

test("the periods: twenty years each from 1864, Period 9 from 2024", () => {
  assert.deepEqual(periodOf(1864), { period: 1, from: 1864, to: 1883 });
  assert.deepEqual(periodOf(1998), { period: 7, from: 1984, to: 2003 });
  assert.deepEqual(periodOf(2004), { period: 8, from: 2004, to: 2023 });
  assert.deepEqual(periodOf(2023), { period: 8, from: 2004, to: 2023 });
  assert.deepEqual(periodOf(2024), { period: 9, from: 2024, to: 2043 });
  assert.deepEqual(periodOf(2044), { period: 1, from: 2044, to: 2063 });
  assert.deepEqual(periodOf(1863), { period: 9, from: 1844, to: 1863 });
});

test("three readings: their circular mean and spread, across north too", () => {
  const a = averageBearing([359, 1, 0]);
  assert.ok(a.mean < 1e-9 || a.mean > 359.999999, String(a.mean));
  assert.ok(Math.abs(a.spread - 1) < 1e-9);
  const b = averageBearing([170, 175, 180]);
  assert.ok(Math.abs(b.mean - 175) < 1e-9);
  assert.ok(Math.abs(b.spread - 5) < 1e-9);
  assert.equal(averageBearing([]), null);
});

test("the device's heading: an iPhone's compass heading, Android's absolute alpha turned clockwise", () => {
  assert.equal(headingOf({ webkitCompassHeading: 172.5, alpha: 10 }, false), 172.5);
  assert.equal(headingOf({ alpha: 187.5 }, true), 172.5);
  assert.equal(headingOf({ alpha: 187.5 }, false), null, "a relative alpha is no compass");
  assert.equal(headingOf({ alpha: null }, true), null);
});

test("the typed facing and year", () => {
  assert.equal(parseFacing("172.5"), 172.5);
  assert.equal(parseFacing("172,5°"), 172.5);
  assert.equal(parseFacing(" 0 "), 0);
  assert.equal(parseFacing("360"), null);
  assert.equal(parseFacing("-4"), null);
  assert.equal(parseFacing("south"), null);
  assert.equal(parseYear("1998"), 1998);
  assert.equal(parseYear("1863"), null);
  assert.equal(parseYear("98"), null);
});

test("the magnetic declination: the World Magnetic Model 2025's own test values, to the nanotesla", () => {
  const rows = readFileSync(new URL("./fixtures/chinese/wmm2025-test-values.csv", import.meta.url), "utf8").trim().split("\n").slice(1).map((l) => l.split(",").map(Number));
  assert.equal(rows.length, 100);
  for (const [date, alt, lat, lon, x, y, z, decl] of rows) {
    const f = magneticField(lat, lon, date, alt);
    assert.ok(Math.abs(f.x - x) < 0.05 && Math.abs(f.y - y) < 0.05 && Math.abs(f.z - z) < 0.05, `${date} ${lat} ${lon}: ${f.x} ${f.y} ${f.z}`);
    assert.ok(Math.abs(declination(lat, lon, date, alt) - decl) < 0.006, `${date} ${lat} ${lon} declination`);
  }
  // Paris, a few degrees east; New York, about thirteen west.
  const paris = declination(48.8566, 2.3522, 2026.5);
  assert.ok(paris > 1 && paris < 3, String(paris));
  const ny = declination(40.71, -74.0, 2026.5);
  assert.ok(ny < -11 && ny > -14, String(ny));
  assert.ok(Math.abs(decimalYear(Date.UTC(2026, 6, 2, 12)) - 2026.5) < 0.01);
  assert.equal(modelCovers(Date.UTC(2026, 9, 12)), true);
  assert.equal(modelCovers(Date.UTC(2030, 0, 1)), false);
});

test("what the page says: the facing, the house and you, a mountain, the period, finding the facing", () => {
  const ctx = { home: homeOf(180, "compass", 2.1), period: { year: 1998, ...periodOf(1998) }, people: [yang, yin], place: "Paris", declination: 2.1 };
  const facing = homeReading(ctx, FSH_FACING_REF, "en", full);
  assert.equal(facing.lead, "Your home faces 180°: Wu · wǔ 午, the middle mountain of the south. It sits in Zi · zǐ 子, in the north.");
  assert.match(facing.paragraphs[1], /^7\.5° from the nearest edge/);
  assert.equal(facing.links.rows.length, 2);
  const fr = homeReading(ctx, FSH_FACING_REF, "fr", full);
  assert.equal(fr.lead, "Votre logement est tourné vers 180°\u202f: Wu · wǔ 午, la deuxième montagne du sud. Il est adossé à Zi · zǐ 子, au nord.");
  assert.equal(fr.paragraphs[3], "Une maison Kan ☵\u202f: adossée au nord, elle appartient au groupe de l’Est.");
  const house = homeReading(ctx, fshHouseRef("yang"), "en", full);
  assert.equal(house.paragraphs[0], "A Kan ☵ house: it sits in the north, and belongs to the East group.");
  assert.equal(house.paragraphs[1], "Your Kua 1 is of the same group: the Eight Mansions read the house as suited to you.");
  assert.equal(house.paragraphs[2], "Its front faces your Harmony direction (south), and it sits in your Stability direction (north).");
  assert.match(homeReading(ctx, fshHouseRef("yin"), "en", full).paragraphs[1], /^Your Kua 8 is of the other group\. The tradition never asks anyone to move/);
  assert.equal(matchLines(ctx.home, yang, "fr")[1], "Sa façade regarde votre direction d’Harmonie (sud), et elle est adossée à votre direction de Stabilité (nord).");
  const wu = homeReading(ctx, fshMountainRef("wu"), "en", full);
  assert.equal(wu.lead, "Wu · wǔ 午, S2: the middle mountain of the south, from 172.5° to 187.5°.");
  assert.equal(wu.paragraphs[1], "One of the twelve branches’ mountains: Horse.");
  assert.equal(wu.paragraphs[2], "Your home faces this mountain.");
  assert.match(homeReading(ctx, fshMountainRef("qian"), "fr", full).paragraphs[1], /trigrammes des coins\u202f: Qian ☰, au cœur du nord-ouest\./);
  assert.match(homeReading(ctx, fshMountainRef("zi"), "fr", full).lead, /de 352,5° à 7,5°\.$/);
  assert.match(homeReading(ctx, fshMountainRef("ren"), "en", full).paragraphs[1], /^A heavenly stem’s mountain/);
  const period = homeReading(ctx, FSH_PERIOD_REF, "en", full);
  assert.equal(period.title, "Period 7");
  assert.ok(period.paragraphs.includes("Built in 1998: Period 7 (1984–2003)."));
  assert.equal(homeReading(ctx, FSH_HOW_REF, "en", full).sections[0].paragraphs.length, 4);
  // From a map: the true bearing, the magnetic one, the declination.
  assert.equal(sourceLine(homeOf(180, "map", 2.1), "en"), "Read on a map (180° true): 177.9° magnetic, with a declination of 2.1° E.");
  // Without a facing, only the mountains, the period and the method read.
  const none = { ...ctx, home: null };
  assert.equal(homeReading(none, FSH_FACING_REF, "en", full), null);
  assert.ok(homeReading(none, fshMountainRef("wu"), "en", full));
  assert.equal(homeReading(ctx, "fsh:mountain:nope", "en", full), null);
  assert.equal(homeReading(ctx, "fs:yang:kua", "en", full), null);
});

test("the table: the facing's lines and the 24 mountains, your home's marked; CSV with ids", () => {
  const ctx = { home: homeOf(170, "phone", 2.1), period: { year: 2024, ...periodOf(2024) }, people: [yang], place: "Paris", declination: 2.1 };
  const parts = homeTextParts(ctx, "Camille", "en", full);
  assert.deepEqual(parts.map((p) => p.id), ["facing", "stars", "mountains"]);
  assert.equal(parts[0].lines[0], "Camille · Your home’s facing");
  assert.match(parts[0].lines[2], /^Only 2\.5° from Wu: this close to an edge/);
  assert.equal(parts[2].lines.length, 25);
  assert.match(parts[2].lines.find((l) => l.startsWith("S1")), /Bing · bǐng 丙: 157\.5° – 172\.5°, south · Facing$/);
  const csv = homeTableCsv(ctx).split("\n");
  assert.ok(csv.includes("facing,mountain,bing"));
  assert.ok(csv.includes("facing,edge,replacement:2.50:wu"));
  assert.ok(csv.includes("facing,house,kan:east"));
  assert.ok(csv.includes("facing,match-yang,same:yan-nian:fu-wei"));
  assert.ok(csv.includes("facing,period,9:2024"));
  assert.ok(csv.includes("mountain,bing,157.5,172.5,s,facing"));
  assert.ok(csv.includes("mountain,ren,337.5,352.5,n,sitting"));
});
