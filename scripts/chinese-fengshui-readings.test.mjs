/**
 * Feng Shui's readings (languages plan, part 27): the 45 pairings of
 * mountain and water stars and the five ways their phases meet (81
 * readings), each star's own reading in its three states and where it
 * stands in the home, the year's note per sector; the texts' typography and
 * tone, the classical names' pinyin. Made-up homes only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import * as TEXTS from "../src/lib/chinese/fengshui-readings-texts.ts";
import { PAIR_KEYS, isHeTu, isTen, pairKey, phaseStep, relationOf } from "../src/lib/chinese/fengshui-pairs.ts";
import { homeOf, periodOf } from "../src/lib/chinese/fengshui-home.ts";
import { homeReading, homeStars } from "../src/lib/chinese/fengshui-home-reading.ts";
import { fssPalaceRef, fssStarRef, pairLines, pairName, starHome, starPlaces, starsReading } from "../src/lib/chinese/fengshui-stars-reading.ts";
import { starState } from "../src/lib/chinese/fengshui-stars.ts";
import { STATE_TEXTS } from "../src/lib/chinese/fengshui-stars-texts.ts";
import { yearStarsAt } from "../src/lib/chinese/fengshui-years.ts";
import { FSY_YEAR_REF, palaceYearLines, sectorNotes, yearsReading } from "../src/lib/chinese/fengshui-years-reading.ts";
import { homeTableCsv, homeTextParts } from "../src/lib/chinese/fengshui-home-table.ts";

const full = { script: "hant", show: "full" };
const names = { script: "hant", show: "names" };
const N = [1, 2, 3, 4, 5, 6, 7, 8, 9];
// Period 7, sitting Zi facing Wu (facing 180°, built 1998), read in Period 9.
const home = homeOf(180, "compass", null);
const period = { year: 1998, ...periodOf(1998) };
const years = yearStarsAt(Date.parse("2026-10-13T12:00:00Z"));
const stars = homeStars(home, period, 2026, years, [], TEXTS);
const ctx = { home, period, people: [], place: "Paris", declination: null, stars, years, rooms: [], texts: TEXTS };

test("the 45 pairings, and how the phases of mountain and water meet", () => {
  assert.equal(PAIR_KEYS.length, 45);
  assert.deepEqual(Object.keys(TEXTS.PAIR_TEXTS).sort(), [...PAIR_KEYS].sort());
  assert.deepEqual(Object.keys(TEXTS.PAIR_NAMES).sort(), [...PAIR_KEYS].sort());
  assert.equal(pairKey(4, 1), "1-4");
  assert.equal(pairKey(1, 4), "1-4");
  // Wood feeds fire, fire earth, earth metal, metal water, water wood; wood checks earth, earth water, water fire, fire metal, metal wood.
  assert.equal(phaseStep("wood", "fire"), 1);
  assert.equal(phaseStep("wood", "earth"), 2);
  assert.equal(relationOf(6, 1), "m-feeds-w", "metal feeds water");
  assert.equal(relationOf(1, 6), "w-feeds-m");
  assert.equal(relationOf(2, 1), "m-checks-w", "earth checks water");
  assert.equal(relationOf(1, 2), "w-checks-m");
  assert.equal(relationOf(9, 7), "m-checks-w", "fire checks metal");
  assert.equal(relationOf(3, 9), "m-feeds-w", "wood feeds fire");
  assert.equal(relationOf(2, 5), "same");
  assert.equal(relationOf(8, 8), "same");
  assert.deepEqual(PAIR_KEYS.filter((k) => isHeTu(...k.split("-").map(Number))), ["1-6", "2-7", "3-8", "4-9"]);
  assert.deepEqual(PAIR_KEYS.filter((k) => isTen(...k.split("-").map(Number))), ["1-9", "2-8", "3-7", "4-6", "5-5"]);
});

test("81 readings of mountain and water, in both languages", () => {
  const seen = new Set();
  for (const m of N) {
    for (const w of N) {
      for (const locale of ["en", "fr"]) {
        const lines = pairLines(m, w, TEXTS, locale);
        assert.equal(lines.length, 2);
        for (const l of lines) assert.doesNotMatch(l, /\{\w+\}/, `${m}-${w} ${locale}`);
        if (locale === "en") seen.add(`${m}/${w}: ${pairName(m, w, TEXTS, "en", names)} | ${lines.join(" | ")}`);
      }
    }
  }
  assert.equal(seen.size, 81);
  assert.equal(pairLines(6, 1, TEXTS, "en")[1], "The mountain star feeds the water star, as metal feeds water: the people’s effort goes into what comes in.");
  assert.equal(pairLines(1, 6, TEXTS, "fr")[1], "L’étoile de l’eau nourrit celle de la montagne, comme le métal nourrit l’eau\u202f: ce qui arrive soutient les habitants.");
  assert.match(pairLines(2, 8, TEXTS, "en")[1], /share their phase, earth:/);
  assert.equal(pairName(1, 4, TEXTS, "en", full), "The scholar’s pairing · sì yī tóng gōng 四一同宮");
  assert.equal(pairName(4, 1, TEXTS, "fr", { script: "hans", show: "full" }), "L’alliance du lettré · sì yī tóng gōng 四一同宫");
  assert.equal(pairName(6, 8, TEXTS, "en", full), "Standing and wealth", "no classical name: the name alone");
  assert.equal(pairName(2, 3, TEXTS, "en", names), "The fighting bull");
});

test("the classical names: characters in both scripts, a toned syllable each", () => {
  const named = Object.entries(TEXTS.PAIR_NAMES).filter(([, n]) => n.hant);
  assert.equal(named.length, 15);
  const toned = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g;
  for (const [k, n] of named) {
    assert.equal([...n.hant].length, [...n.hans].length, k);
    assert.match(n.pinyin, /^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü ]+$/, k);
    assert.equal(n.pinyin.split(" ").length, [...n.hant].length, k);
    assert.equal(n.pinyin.match(toned).length, [...n.hant].length, k);
  }
  assert.equal(TEXTS.PAIR_NAMES["2-5"].hant, "二五交加");
  assert.equal(TEXTS.PAIR_NAMES["6-9"].hans, "火烧天门");
});

test("a palace's reading: its pair first after the rooms, its stars linked to their own readings", () => {
  const ne = homeReading(ctx, fssPalaceRef("main", "ne"), "en", names);
  // The north-east: mountain 9, water 5.
  assert.equal(ne.sections[0].id, "pair");
  assert.equal(ne.sections[0].title, "Mountain 9 and water 5: Fire feeding the 5");
  assert.equal(ne.sections[0].paragraphs[0], TEXTS.PAIR_TEXTS["5-9"][0]);
  assert.equal(ne.sections[0].paragraphs[1], "The mountain star feeds the water star, as fire feeds earth: the people’s effort goes into what comes in.");
  assert.deepEqual(ne.facts.slice(0, 3).map((f) => f.ref), [fssStarRef(9), fssStarRef(5), fssStarRef(1)]);
  const year = ne.sections.find((s) => s.id === "year");
  assert.ok(year.paragraphs.some((p) => p === TEXTS.ANNUAL_NOTES[4][0]), year.paragraphs.join(" / "));
  const fr = homeReading(ctx, fssPalaceRef("main", "s"), "fr", names);
  assert.equal(fr.sections[0].title, "Montagne 8 et eau 6\u202f: Le rang et la richesse");
  // Without the texts yet: no pair, the rest as before.
  const bare = homeStars(home, period, 2026, years, [], null);
  const noPair = starsReading(bare, fssPalaceRef("main", "ne"), "en", names);
  assert.ok(!noPair.sections.some((s) => s.id === "pair"));
});

test("each star's own reading: who it is, its state now, where it stands", () => {
  for (const n of N) {
    const r = homeReading(ctx, fssStarRef(n), "en", names);
    const st = starState(n, 9).state;
    assert.equal(r.lead, TEXTS.STAR_TEXTS[n][0], `star ${n}`);
    assert.equal(r.sections[0].id, "state");
    assert.equal(r.sections[0].title, "Its state in Period 9");
    assert.equal(r.sections[0].paragraphs[0], TEXTS.STAR_STATE_TEXTS[n][st][0]);
    assert.equal(r.sections.find((s) => s.id === "states").paragraphs.length, 3);
    assert.ok(r.paragraphs.length >= 3);
  }
  const nine = homeReading(ctx, fssStarRef(9), "en", full);
  assert.equal(nine.title, "9 Purple");
  assert.equal(nine.kicker, "You Bi · yòu bì 右弼 · fire · ☲ Li");
  assert.deepEqual(starPlaces(9, stars.main), { mountain: ["ne"], water: ["e"], period: ["w"] });
  assert.ok(nine.sections[1].paragraphs.includes("As the mountain star: North-East."));
  assert.ok(nine.sections[1].paragraphs.includes("As the water star: East."));
  assert.deepEqual(nine.links.rows.map((r) => r.ref), [fssPalaceRef("main", "ne"), fssPalaceRef("main", "e")]);
  assert.equal(starHome(5).palace, "c");
  assert.equal(starHome(5).trigram, null);
  assert.equal(homeReading(ctx, fssStarRef(5), "fr", names).facts.find((f) => f.label === "Trigramme").value, "—");
  assert.equal(starHome(9).trigram.id, "li");
  // A star that is neither mountain nor water star here says so.
  const missing = N.find((n) => !starPlaces(n, stars.main).mountain.length && !starPlaces(n, stars.main).water.length);
  if (missing) assert.ok(homeReading(ctx, fssStarRef(missing), "en", names).sections[1].paragraphs[0].startsWith("In this chart it is neither"));
  // Before the texts: the state's general line leads.
  const bare = homeStars(home, period, 2026, years, [], null);
  assert.equal(starsReading(bare, fssStarRef(8), "en", names).lead, STATE_TEXTS.waning[0]);
  assert.equal(starsReading(bare, "fss:star:0", "en", names), null);
});

test("the year's note per sector", () => {
  // 2026: the 1 White in the centre; the 6 White in the north; the 5 Yellow in the south.
  assert.equal(years.yearChart.n, 6);
  assert.deepEqual(palaceYearLines(years, "n", "en", TEXTS), ["This year the 6 White visits this palace; this month, the 5 Yellow.", TEXTS.ANNUAL_NOTES[6][0]]);
  assert.equal(palaceYearLines(years, "n", "en").length, 1, "without the texts, the visitors only");
  assert.match(palaceYearLines(years, "s", "en", TEXTS)[1], /5 Yellow is here/);
  const notes = sectorNotes(years, "en", TEXTS);
  assert.equal(notes.length, 9);
  assert.equal(notes[0], "The centre: the year’s 1 White brings good news for study, careers and journeys to this part of the home.");
  assert.equal(notes[5], "South: the year’s 5 Yellow, where the classics counsel quiet for the year.");
  const fr = sectorNotes(years, "fr", TEXTS);
  assert.match(fr[1], /^Nord\u202f: le 6 Blanc de l’année/);
  const yr = yearsReading(years, FSY_YEAR_REF, "en", names, TEXTS);
  assert.deepEqual(yr.sections.find((s) => s.id === "sectors").paragraphs, notes);
  assert.ok(!yearsReading(years, FSY_YEAR_REF, "en", names).sections.some((s) => s.id === "sectors"));
});

test("the table: each palace's pairing, by name and in the file", () => {
  const part = homeTextParts(ctx, "Camille", "en", names).find((p) => p.id === "stars");
  assert.ok(part.lines.some((l) => l === "  South palace: Mountain star 8, water star 6, period star 2; the Lo Shu’s own number here is 9. · Standing and wealth"), part.lines.join(" / "));
  const csv = homeTableCsv(ctx).split("\n");
  assert.ok(csv.includes("stars,chart,palace,mountain,water,period,base,pair"));
  assert.ok(csv.includes("stars,main,ne,9,5,1,8,5-9"));
});

test("the texts in both languages, in Ulune's typography and tone", () => {
  const all = [
    ...Object.values(TEXTS.PAIR_TEXTS),
    ...Object.values(TEXTS.PAIR_NAMES).map((n) => [n.en, n.fr]),
    ...Object.values(TEXTS.RELATION_TEXTS),
    ...Object.values(TEXTS.PHASE_WORDS),
    ...Object.values(TEXTS.STAR_TEXTS),
    ...Object.values(TEXTS.STAR_STATE_TEXTS).flatMap((s) => Object.values(s)),
    ...Object.values(TEXTS.ANNUAL_NOTES),
  ];
  assert.equal(Object.keys(TEXTS.ANNUAL_NOTES).length, 8);
  for (const [en, fr] of all) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/, t.slice(0, 40));
      assert.doesNotMatch(t, / {2}/, t.slice(0, 40));
      assert.doesNotMatch(t, /"/, t.slice(0, 40));
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!»]/, fr.slice(0, 50));
    assert.doesNotMatch(fr, /«[^\u202f]/, fr.slice(0, 50));
    assert.doesNotMatch(en, /\b(death|dies?|die|illness|ill|disease|sick\w*|health\w*|doomed|unlucky|lucky|curse[ds]?|must|fate|disaster|divorce|accident\w*|bankrupt\w*|buy|cure|remedy|amulet|charm(s|ed)? to|injur\w*|robber\w*|theft)\b/i, en.slice(0, 50));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|santé|malchance|maudit|condamn\w*|doit|devez|destin|désastre|divorce|accident\w*|faillite|acheter|remède|amulette|blessure\w*|vol)\b/i, fr.slice(0, 50));
  }
  // Every pairing gives both faces.
  for (const [k, [en, fr]] of Object.entries(TEXTS.PAIR_TEXTS)) {
    if (k === "2-5") continue; // the heaviest pairing: its counsel alone
    assert.match(en, /In season/, k);
    assert.match(en, /out of season/, k);
    assert.match(fr, /En saison/, k);
    assert.match(fr, /hors saison/, k);
  }
});
