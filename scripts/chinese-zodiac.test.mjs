/**
 * Chinese astrology's four animals (languages plan, part 7): a cast chart
 * read into the engine's birth, the four pillars and their animals checked
 * by hand for two made-up births, each day boundary, the New Year's animal
 * beside Lichun's, a birth without a time, the Na Yin table, and what the
 * page says of a chosen animal.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { birthMomentOf, branchAngle, zodiacChart } from "../src/lib/chinese/zodiac.ts";
import { zodiacReading } from "../src/lib/chinese/zodiac-reading.ts";
import { NA_YIN, SIXTY, naYinOf } from "../src/lib/chinese/names.ts";

// Made-up test births (never a real person's): Camille, 15 June 1990, 12:00 in Paris (summer time);
// Sample B, 3 November 1987, 23:10 in Oslo (winter time).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };
const pair = (p) => SIXTY[p.pillar.cycle].en;
const NOW = Date.UTC(2026, 9, 9, 12);

test("a cast chart becomes the engine's birth: its instant, its longitude, the civil clock's offset", () => {
  assert.deepEqual(birthMomentOf(CAMILLE), { ms: Date.UTC(1990, 5, 15, 10), longitude: 2.3522, utcOffsetMinutes: 120, timeUnknown: false });
  assert.equal(birthMomentOf(SAMPLE_B).utcOffsetMinutes, 60);
  assert.equal(birthMomentOf({ ...CAMILLE, utc: "nope" }), null);
});

test("Camille's four animals: a Horse year and month, a Pig day, a Snake hour", () => {
  const z = zodiacChart(CAMILLE, { nowMs: NOW });
  assert.deepEqual(z.places.map((p) => p.id), ["year", "month", "day", "hour"]);
  assert.deepEqual(z.places.map(pair), ["Yang Metal Horse", "Yang Water Horse", "Yin Metal Pig", "Yin Water Snake"]);
  const [year] = z.places;
  assert.equal(year.branchPhase, "fire");
  assert.equal(year.stemPhase, "metal");
  assert.equal(year.polarity, "yang");
  assert.equal(year.naYin.en, "Earth by the roadside", "the plan's own example");
  assert.equal(z.newYearAnimal, null, "a June birth: New Year and Lichun agree");
  assert.ok(z.places.every((p) => !p.uncertain));
  // Now (9 October 2026): the Horse year, the Dog month (from Hanlu, 8 October).
  assert.equal(z.now.year.branch, 6);
  assert.equal(z.now.month.branch, 10);
});

test("Sample B, born at 23:10: each school's day and hour", () => {
  // True solar time in Oslo that evening: about 23:09, so past 23:00.
  const zi = zodiacChart(SAMPLE_B, { dayBoundary: "23:00", nowMs: NOW });
  assert.deepEqual(zi.places.map(pair), ["Yin Fire Rabbit", "Yang Metal Dog", "Yin Fire Snake", "Yang Metal Rat"]);
  const split = zodiacChart(SAMPLE_B, { dayBoundary: "split", nowMs: NOW });
  assert.deepEqual(split.places.map(pair).slice(2), ["Yang Fire Dragon", "Yang Metal Rat"], "the day stays, the hour is the next day's Rat");
  const midnight = zodiacChart(SAMPLE_B, { dayBoundary: "midnight", nowMs: NOW });
  assert.deepEqual(midnight.places.map(pair).slice(2), ["Yang Fire Dragon", "Yang Earth Rat"], "the hours restart with the day");
  // On the civil clock 23:10 is past 23:00 too; on local mean time (22:53) it is still the Pig hour.
  assert.equal(pair(zodiacChart(SAMPLE_B, { clock: "civil", nowMs: NOW }).places[3]), "Yang Metal Rat");
  assert.deepEqual(zodiacChart(SAMPLE_B, { clock: "local-mean", nowMs: NOW }).places.map(pair).slice(2), ["Yang Fire Dragon", "Yin Earth Pig"]);
});

test("born between Chinese New Year and Lichun: two year animals, said", () => {
  // 30 January 1990: after New Year (27 January), before Lichun (4 February).
  const z = zodiacChart({ utc: "1990-01-30T11:00:00Z", date: "1990-01-30", time: "12:00", longitude: 2.3522 }, { nowMs: NOW });
  assert.equal(pair(z.places[0]), "Yin Earth Snake", "Lichun's: still 1989's year");
  assert.equal(z.newYearAnimal, 6, "New Year's: the Horse");
  const r = zodiacReading(z, "zk:year", "en", { script: "hant", show: "full" });
  assert.match(r.paragraphs.join(" "), /would be the Horse/);
  assert.match(zodiacReading(z, "zk:year", "fr", { script: "hant", show: "full" }).paragraphs.join(" "), /serait le Cheval/);
});

test("without a birth time: three animals, and the day's marked when it changes that day", () => {
  const z = zodiacChart({ ...CAMILLE, time: "12:00", timeUnknown: true }, { nowMs: NOW });
  assert.deepEqual(z.places.map((p) => p.id), ["year", "month", "day"]);
  assert.equal(z.timeUnknown, true);
  // The day turns at 23:00 true solar time, inside the birth's day: it may be the next one.
  assert.equal(z.places[2].uncertain, true);
});

test("the Na Yin: thirty sounds, one for each two pairs, each phase six times", () => {
  assert.equal(NA_YIN.length, 30);
  assert.equal(naYinOf(0).en, "Metal in the sea");
  assert.equal(naYinOf(1).en, "Metal in the sea");
  assert.equal(naYinOf(6).hant, "路旁土");
  assert.equal(naYinOf(59).en, "Water of the great sea");
  for (const phase of ["wood", "fire", "earth", "metal", "water"]) assert.equal(NA_YIN.filter((n) => n.phase === phase).length, 6, phase);
  const toned = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g;
  for (const n of NA_YIN) {
    assert.equal([...n.hant].length, 3, n.hant);
    assert.equal([...n.hans].length, 3, n.hans);
    assert.equal(n.pinyin.match(toned).length, 3, n.pinyin);
    // The last character is the phase's own: 金 metal, 火 fire, 木 wood, 土 earth, 水 water.
    assert.equal(n.hant.at(-1), { metal: "金", fire: "火", wood: "木", earth: "土", water: "水" }[n.phase], n.hant);
    for (const text of [n.en, n.fr]) assert.ok(!text.includes("'"), text);
  }
});

test("the wheel: the Rat at the north, the Rabbit east, the Horse south, the Rooster west", () => {
  assert.deepEqual([0, 3, 6, 9].map(branchAngle), [0, 90, 180, 270]);
});

test("what the page says of a chosen place and of an animal of the wheel", () => {
  const z = zodiacChart(CAMILLE, { nowMs: NOW });
  const full = { script: "hant", show: "full" };
  const year = zodiacReading(z, "zk:year", "en", full, "Europe/Paris");
  assert.equal(year.title, "Yang Metal Horse");
  assert.equal(year.kicker, "Year animal · gēngwǔ 庚午");
  assert.deepEqual(
    year.facts.map((f) => f.label),
    ["Pillar", "Heavenly Stem", "Earthly Branch", "The animal’s phase", "Na Yin", "Year", "Self-punishment", "Its years"],
  );
  assert.equal(year.facts[6].value, "month (Horse)", "part 8: the year's relations with the other places");
  assert.equal(year.facts[7].value, "1930, 1990, 2050", "part 10: the years of the Metal Horse");
  assert.equal(year.facts[5].value, "4 Feb 1990 – 4 Feb 1991");
  assert.match(year.lead, /^The Metal Horse is the most determined of the Horses/, "part 10: the year opens on its pair");
  assert.match(year.sections.find((x) => x.id === "tradition").paragraphs[0], /how others see you/);
  const hour = zodiacReading(z, "zk:hour", "fr", { script: "hans", show: "names" });
  assert.equal(hour.title, "Serpent d’Eau yin", "French elides before Eau");
  const goat = zodiacReading(z, "zk:branch:7", "fr", full);
  assert.match(goat.lead, /^La Chèvre est la branche wèi 未, de la phase terre/);
  const horse = zodiacReading(z, "zk:branch:6", "en", full);
  assert.match(horse.paragraphs.join(" "), /yours: year, month/);
  assert.equal(zodiacReading(z, "zk:branch:12", "en", full), null);
  assert.equal(zodiacReading(z, "natal:sun", "en", full), null);
});
