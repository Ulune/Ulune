/**
 * Chinese astrology's readings (languages plan, part 10): a modern portrait
 * of each animal, the sixty pairs of an animal with its stem's phase, the
 * month, day and hour animals said to the reader, each relation in
 * practice; every text in English and French, in Ulune's typography and
 * tone; and where each shows on the page, under a title saying where it
 * comes from.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ANIMALS, BRANCHES, PHASES, SIXTY, STEMS } from "../src/lib/chinese/names.ts";
import { RELATION_KINDS } from "../src/lib/chinese/relations.ts";
import { zodiacChart } from "../src/lib/chinese/zodiac.ts";
import { pairYears, relationRef, zodiacReading } from "../src/lib/chinese/zodiac-reading.ts";
import { ANIMAL_PORTRAITS, PAIR_TEXTS, PLACE_TEXTS, RELATION_PRACTICE, pairText } from "../src/lib/chinese/zodiac-texts.ts";

/** Every text, with where it is, as [where, en, fr]. */
function everyText() {
  const out = [];
  ANIMAL_PORTRAITS.forEach((p, i) => {
    for (const k of ["portrait", "gifts", "watch"]) out.push([`${ANIMALS[i].en} ${k}`, ...p[k]]);
  });
  for (const [k, t] of Object.entries(PAIR_TEXTS)) out.push([`pair ${k}`, ...t]);
  for (const [place, list] of Object.entries(PLACE_TEXTS)) list.forEach((t, i) => out.push([`${place} ${ANIMALS[i].en}`, ...t]));
  for (const [k, t] of Object.entries(RELATION_PRACTICE)) out.push([`practice ${k}`, ...t]);
  return out;
}

test("every text is there: twelve portraits, the sixty pairs and no others, twelve of each inner place, every relation", () => {
  assert.equal(ANIMAL_PORTRAITS.length, 12);
  const want = new Set(SIXTY.map((p) => `${BRANCHES[p.branch].animal}:${STEMS[p.stem].phase}`));
  assert.equal(want.size, 60);
  assert.deepEqual(new Set(Object.keys(PAIR_TEXTS)), want);
  for (const place of ["month", "day", "hour"]) assert.equal(PLACE_TEXTS[place].length, 12, place);
  assert.deepEqual(Object.keys(RELATION_PRACTICE).sort(), [...RELATION_KINDS].sort());
});

test("each portrait and pair names its own animal (and the pair its phase), in both languages", () => {
  ANIMAL_PORTRAITS.forEach((p, i) => {
    assert.ok(p.portrait[0].includes(ANIMALS[i].en), ANIMALS[i].en);
    assert.ok(p.portrait[1].includes(ANIMALS[i].fr), ANIMALS[i].fr);
  });
  for (const [key, [en, fr]] of Object.entries(PAIR_TEXTS)) {
    const [animal, phase] = key.split(":");
    const a = ANIMALS[Number(animal)];
    const ph = PHASES.find((x) => x.id === phase);
    assert.ok(en.startsWith(`The ${ph.en} ${a.en}`), `${key}: ${en.slice(0, 40)}`);
    assert.ok(fr.startsWith(`${a.id === "goat" ? "La" : "Le"} ${a.fr} d${/^[AEIOU]/.test(ph.fr) ? "’" : "e "}${ph.fr}`), `${key}: ${fr.slice(0, 40)}`);
  }
  // The Goat is feminine in French, all through.
  for (const t of [ANIMAL_PORTRAITS[7].portrait[1], ...["wood", "fire", "earth", "metal", "water"].map((p) => pairText(7, p)[1])]) {
    assert.doesNotMatch(t, /\bil\b|\bLe Chèvre\b/, t.slice(0, 50));
  }
});

test("Ulune's typography: curly apostrophes, French thin spaces before : ; ? !, whole sentences", () => {
  for (const [where, en, fr] of everyText()) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/, `${where}: a straight apostrophe`);
      assert.doesNotMatch(t, / {2}|\s$|^\s/, `${where}: stray spaces`);
      assert.match(t, /[.!?]$/, `${where}: a whole sentence`);
      assert.ok(t.length >= 40 && t.length <= 420, `${where}: ${t.length} characters`);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, `${where}: a French colon or semicolon without its thin space`);
    assert.doesNotMatch(en, /\u202f/, `${where}: a French space in English`);
  }
});

test("the tone: a mirror, not a verdict (no fate, no health, no orders)", () => {
  const en = /\b(death|dies?|illness|disease|sick|doomed|unlucky|bad luck|curse[ds]?|must|never will|always fails?)\b/i;
  const fr = /\b(mort|meurt|maladie|malade|malchance|maudit|condamn\w*|doit|devez|échec assuré)\b/i;
  for (const [where, e, f] of everyText()) {
    assert.doesNotMatch(e, en, where);
    assert.doesNotMatch(f, fr, where);
  }
});

// Made-up births (never a real person's).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const NOW = Date.UTC(2026, 9, 9, 12);
const full = { script: "hant", show: "full" };

test("on the page: each section titled with where it comes from", () => {
  const z = zodiacChart(CAMILLE, { nowMs: NOW });
  // The year: its pair first, then the modern portrait, then the tradition.
  const year = zodiacReading(z, "zk:year", "en", full);
  assert.equal(year.lead, pairText(6, "metal")[0]);
  assert.deepEqual(year.sections.map((s) => s.title), ["A modern portrait", "In the tradition"]);
  assert.equal(year.sections[0].paragraphs[0], ANIMAL_PORTRAITS[6].portrait[0]);
  assert.deepEqual(pairYears(6), [1930, 1990, 2050]);
  assert.deepEqual(pairYears(0), [1924, 1984, 2044]);
  assert.deepEqual(pairYears(59), [1923, 1983, 2043]);
  // The day: the Pig as the true self, then its pair (Yin Metal Pig) and portrait.
  const day = zodiacReading(z, "zk:day", "fr", full);
  assert.equal(day.lead, PLACE_TEXTS.day[11][1]);
  assert.deepEqual(day.sections.map((s) => s.title), ["Portrait moderne", "Dans la tradition"]);
  assert.equal(day.sections[0].paragraphs[0], pairText(11, "metal")[1]);
  // The hour: the Snake as the secret animal, its pair the Water Snake.
  const hour = zodiacReading(z, "zk:hour", "en", full);
  assert.match(hour.lead, /^In private, the Snake/);
  assert.match(hour.sections[0].paragraphs[0], /^The Water Snake/);
  // An animal of the wheel: the tradition's facts, then its portrait.
  const goat = zodiacReading(z, "zk:branch:7", "fr", full);
  assert.match(goat.lead, /^La Chèvre est la branche/);
  assert.equal(goat.sections.at(-1).title, "Portrait moderne");
  assert.match(goat.sections.at(-1).paragraphs[0], /^La Chèvre, qu’on appelle aussi/);
  // A relation: the tradition's reading, then in practice.
  const clash = zodiacReading(z, relationRef(z.relations[0]), "en", full);
  assert.equal(clash.title, "Clash");
  assert.deepEqual(clash.sections.map((s) => s.title), ["In practice"]);
  assert.equal(clash.sections[0].paragraphs[0], RELATION_PRACTICE.clash[0]);
  // The About says where the words come from.
  assert.match(year.about.paragraphs[1], /modern/);
  assert.match(zodiacReading(z, "zk:year", "fr", full).about.paragraphs[1], /modernes/);
});
