/**
 * Every Chinese term ready to link to the encyclopedia (languages plan,
 * part 29): the registry's ids are unique, cannot meet another tradition's
 * entries or addresses, and follow the engines' own lists; every reading the
 * Chinese pages and the Calendar can open names the entries it is about,
 * and none of the glossary's (astrology's) words;
 * nothing links before its family is written, and everything does once it
 * is (a live set given to the functions); the tables' cells that name
 * several terms give back their text exactly. Made-up charts only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ALL_FAMILIES,
  CHINESE_FAMILIES,
  CHINESE_FAMILY_IDS,
  CHINESE_READING,
  LIVE_FAMILIES,
  chineseTermId,
  chineseTermIds,
  familyOfTerm,
  linkableId,
  traditionOfTerm,
} from "../src/lib/chinese/term-ids.ts";
import { chineseRefTerms, chineseSubjectOf } from "../src/lib/chinese/term-refs.ts";
import { hiddenStemPieces, placeAnimalPieces } from "../src/lib/chinese/term-pieces.ts";
import {
  branchPhasePieces,
  emptyPieces,
  hiddenGodPieces,
  ixItemPieces,
  ixResultPieces,
  meetPieces,
  natalLinkPieces,
  pointPieces,
  starPieces,
  summaryPieces,
} from "../src/lib/chinese/bazi-term-pieces.ts";
import { ANIMALS, BRANCHES, NA_YIN, PHASES, SIXTY, SOLAR_TERMS, STEMS } from "../src/lib/chinese/names.ts";
import { glossaryFor } from "../src/lib/i18n/glossary.ts";
import { chineseLabel } from "../src/lib/chinese/prefs.ts";
import { RELATION_KINDS } from "../src/lib/chinese/relations.ts";
import { TEN_GODS, baziChart } from "../src/lib/chinese/bazi.ts";
import { STAGES, STARS as SHEN_SHA, baziSigns } from "../src/lib/chinese/bazi-signs.ts";
import { INTERACTION_KINDS, baziInteractions } from "../src/lib/chinese/bazi-interactions.ts";
import { STRUCTURE_NAMES, baziBalance } from "../src/lib/chinese/bazi-balance.ts";
import { MANSION_IDS, TRIGRAMS, fengShuiOf } from "../src/lib/chinese/fengshui.ts";
import { MOUNTAINS, homeOf, periodOf } from "../src/lib/chinese/fengshui-home.ts";
import { FORMATION_NAMES } from "../src/lib/chinese/fengshui-stars-texts.ts";
import { PAIR_KEYS } from "../src/lib/chinese/fengshui-pairs.ts";
import { yearStarsAt } from "../src/lib/chinese/fengshui-years.ts";
import * as FS_READING_TEXTS from "../src/lib/chinese/fengshui-readings-texts.ts";
import { PAIR_TEXTS as FS_PAIR_TEXTS } from "../src/lib/chinese/fengshui-pair-texts.ts";
import { zodiacChart } from "../src/lib/chinese/zodiac.ts";
import { pairMeetings, yearAhead } from "../src/lib/chinese/zodiac-time.ts";
import { branchRef, placeAnimal, placeRef, relationRef, zodiacReading } from "../src/lib/chinese/zodiac-reading.ts";
import { dayAnimalReading, dayRef, meetingRef, monthRef, pairMeetingReading, yearRef, yearsReading } from "../src/lib/chinese/zodiac-time-reading.ts";
import { hiddenLine } from "../src/lib/chinese/zodiac-table.ts";
import * as BZ from "../src/lib/chinese/bazi-reading.ts";
import * as BZL from "../src/lib/chinese/bazi-luck-reading.ts";
import * as BZP from "../src/lib/chinese/bazi-pair-reading.ts";
import { baziPair } from "../src/lib/chinese/bazi-pair.ts";
import { semicolon } from "../src/lib/chinese/both.ts";
import { flowYear, flowYearOf, luckAt, luckPillars } from "../src/lib/chinese/bazi-luck.ts";
import { baziFullRows } from "../src/lib/chinese/bazi-full.ts";
import { balanceRows, hiddenGodsLine, ixItemShort } from "../src/lib/chinese/bazi-table.ts";
import * as FSR from "../src/lib/chinese/fengshui-reading.ts";
import * as FSH from "../src/lib/chinese/fengshui-home-reading.ts";
import * as FSS from "../src/lib/chinese/fengshui-stars-reading.ts";
import * as FSY from "../src/lib/chinese/fengshui-years-reading.ts";
import * as FSP from "../src/lib/chinese/fengshui-pair-reading.ts";
import * as FSC from "../src/lib/chinese/fengshui-cycles-reading.ts";
import { directionsOfYear, personYear } from "../src/lib/chinese/fengshui-cycles.ts";
import { FSP_NOW, fsPairNow, fsPairNowReading } from "../src/lib/chinese/fengshui-pair-now.ts";
import { fengShuiPair } from "../src/lib/chinese/fengshui-pair.ts";
import { skyEventId } from "../src/lib/chart/sky-events.ts";
import { allTermIds } from "../src/encyclopedia/term-ids.ts";
import { buildEncyclopedia, readContent } from "./encyclopedia/build.mjs";
import { ID_RE, TRADITIONS } from "./encyclopedia/registry.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };
const NOW = Date.parse("2026-10-14T12:00:00Z");
// Feng Shui's readings' texts with the pairings' own, as a palace's reading has them (the bug-fix round, item 4).
const FS_TEXTS = { ...FS_READING_TEXTS, PAIR_TEXTS: FS_PAIR_TEXTS };
const PREFS = ["full", "pinyin", "names"].flatMap((show) => ["hant", "hans"].map((script) => ({ script, show })));
const LOCALES = ["en", "fr"];
const full = { script: "hant", show: "full" };
const CHINESE_TRADITIONS = new Set(["chinese", "chinese-astrology", "bazi", "feng-shui", "shared"]);
const toneless = (pinyin) => pinyin.normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, "-");
const text = (pieces) => pieces.map((p) => p.text).join("");

const encyclopedia = buildEncyclopedia(readContent(`${ROOT}content/encyclopedia`));
const terms = encyclopedia.data.index.terms;

/* ------------------------------------------------------------ the registry */

test("every id is the encyclopedia's kind of id, and belongs to one family only", () => {
  const seen = new Map();
  for (const family of CHINESE_FAMILY_IDS) {
    const f = CHINESE_FAMILIES[family];
    assert.ok(CHINESE_TRADITIONS.has(f.tradition), family);
    for (const id of new Set([...(f.concept ? [f.concept] : []), ...Object.values(f.ids)])) {
      assert.match(id, ID_RE, `${family}: ${id}`);
      assert.ok(!seen.has(id), `${id} is both ${seen.get(id)}'s and ${family}'s`);
      seen.set(id, family);
      assert.equal(familyOfTerm(id), family, id);
      assert.equal(traditionOfTerm(id), f.tradition, id);
    }
    // A family's own entries carry its name, so they cannot meet another's.
    if (f.concept) for (const id of Object.values(f.ids)) assert.ok(id.startsWith(`${f.concept}-`), `${family}: ${id}`);
    // What a family only names belongs to another one.
    for (const id of Object.values(f.also ?? {})) assert.notEqual(familyOfTerm(id), family, id);
  }
  assert.equal(chineseTermIds().length, seen.size);
  assert.ok(seen.size > 380, `${seen.size} entries`);
});

test("no id meets another tradition's entry, an address or astrology's ids", () => {
  const astrology = new Set(allTermIds());
  const homes = new Set(TRADITIONS.flatMap((t) => [t.home.en, t.home.fr]));
  const slugs = new Map();
  for (const [id, row] of Object.entries(terms)) {
    slugs.set(row[2], id);
    slugs.set(row[3], id);
  }
  for (const id of chineseTermIds()) {
    assert.ok(!astrology.has(id), id);
    assert.ok(!homes.has(id), `${id} is a tradition's home`);
    // An entry by this id, when there is one, is this Chinese term's own.
    if (Object.hasOwn(terms, id)) assert.equal(terms[id][0], traditionOfTerm(id), `${id} is ${terms[id][0]}'s`);
    // A link by id (/encyclopedia/stem-jia) can never open another entry's page.
    if (slugs.has(id)) assert.equal(slugs.get(id), id, `${id} is ${slugs.get(id)}'s address`);
  }
  // And the languages' own names stay free for their homes.
  for (const lang of ["chinese-astrology", "bazi", "feng-shui", "chinese"]) assert.equal(familyOfTerm(lang), null, lang);
});

test("the lists are the engines' own", () => {
  const ids = (family) => Object.keys(CHINESE_FAMILIES[family].ids);
  assert.deepEqual(ids("phase"), PHASES.map((p) => p.id));
  assert.deepEqual(ids("stem"), STEMS.map((s) => s.id));
  assert.deepEqual(ids("branch"), BRANCHES.map((b) => b.id));
  assert.deepEqual(ids("animal"), ANIMALS.map((a) => a.id));
  assert.deepEqual(ids("pillar"), SIXTY.map((p) => p.id));
  assert.deepEqual(ids("solar-term"), SOLAR_TERMS.map((t) => t.id));
  assert.deepEqual(Object.values(CHINESE_FAMILIES["na-yin"].ids), NA_YIN.map((n) => `na-yin-${toneless(n.pinyin)}`));
  assert.deepEqual(ids("na-yin"), NA_YIN.map((n) => String(n.index)));
  assert.deepEqual(ids("ten-god"), TEN_GODS.map((g) => g.id));
  assert.deepEqual(ids("life-stage"), STAGES.map((s) => s.id));
  assert.deepEqual(ids("shen-sha"), SHEN_SHA.map((s) => s.id));
  assert.deepEqual(ids("structure").sort(), Object.keys(STRUCTURE_NAMES).sort());
  assert.deepEqual(ids("relation").sort(), [...INTERACTION_KINDS].sort());
  for (const k of RELATION_KINDS) assert.ok(chineseTermId("relation", k), k);
  assert.deepEqual(ids("trigram").sort(), TRIGRAMS.map((t) => t.id).sort());
  assert.deepEqual(ids("kua").map(Number), TRIGRAMS.map((t) => t.kua).sort());
  assert.deepEqual(ids("mansion"), [...MANSION_IDS]);
  assert.deepEqual(ids("mountain"), MOUNTAINS.map((m) => m.id));
  assert.deepEqual(ids("formation").sort(), Object.keys(FORMATION_NAMES).sort());
  assert.deepEqual([...ids("affliction"), ...Object.keys(CHINESE_FAMILIES.affliction.also)].sort(), [...FSY.AFFLICTION_IDS].sort());
  assert.deepEqual(ids("pairing"), [...PAIR_KEYS]);
  assert.deepEqual(ids("flying-star"), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  assert.deepEqual(ids("period"), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  // The few the tables and the readings ask for by hand.
  assert.equal(chineseTermId("stem", "jia"), "stem-jia");
  assert.equal(chineseTermId("pillar", "geng-wu"), "pillar-geng-wu");
  assert.equal(chineseTermId("na-yin", 3), "na-yin-lupang-tu");
  assert.equal(chineseTermId("relation", "season"), "relation-seasonal-trio");
  assert.equal(chineseTermId("polarity", "yin"), "yin-yang");
  assert.equal(chineseTermId("kua", 5), null, "no Kua 5");
  assert.equal(chineseTermId("affliction", "tai-sui"), "tai-sui", "the year's Tai Sui, one entry");
  assert.equal(familyOfTerm("tai-sui"), "chinese-concept");
  assert.equal(chineseTermId("stem", "constructor"), null);
  assert.equal(chineseTermId("stem", null), null);
});

/* ------------------------------------------------------------ the readings */

/** Every reading a page can open from its seeds, its facts and its links: the ids met on the way. */
function crawl(read, seeds) {
  const met = new Set(seeds);
  const queue = [...seeds];
  while (queue.length) {
    const ref = queue.shift();
    for (const locale of LOCALES) {
      const r = read(ref, locale);
      if (!r) continue;
      for (const next of [r.id, ...(r.facts ?? []).map((f) => f.ref), ...(r.links?.rows ?? []).map((x) => x.ref)]) {
        if (next && !met.has(next)) {
          met.add(next);
          queue.push(next);
        }
      }
    }
  }
  return met;
}

function pagesRefs() {
  const refs = new Set();
  const add = (set) => set.forEach((x) => refs.add(x));
  for (const birth of [CAMILLE, SAMPLE_B]) {
    // Chinese astrology: the places, the wheel's animals, the relations; the year ahead; two people; a day of the Calendar.
    const z = zodiacChart(birth, { nowMs: NOW });
    const zb = zodiacChart(birth === CAMILLE ? SAMPLE_B : CAMILLE, { nowMs: NOW });
    add(crawl((ref, l) => zodiacReading(z, ref, l, full, "Europe/Paris"), [...z.places.map((p) => placeRef(p.id)), ...BRANCHES.map((b) => branchRef(b.index)), ...z.relations.map(relationRef)]));
    const y = yearAhead(z, 2026);
    add(crawl((ref, l) => yearsReading(z, y, ref, l, full, "Europe/Paris"), [yearRef, ...y.months.map((m) => monthRef(m.index))]));
    const meetings = pairMeetings(z, zb);
    add(crawl((ref, l) => {
      const m = meetings.find((x) => meetingRef(x) === ref);
      return m ? pairMeetingReading(m, z, zb, { a: "A", b: "B" }, l, full) : null;
    }, meetings.map(meetingRef)));
    add(crawl((ref, l) => (ref.startsWith("cnday:") ? dayAnimalReading(ref.slice(6), z, l, full, "14 October 2026") : null), [dayRef("2026-10-14"), dayRef("2026-02-04")]));
    // BaZi: the board, its signs and interactions, the analysis; the luck pillars and the years; two charts.
    const c = baziChart(birth);
    const places = c.pillars.map((p) => p.id);
    add(crawl((ref, l) => BZ.baziReading(c, ref, l, full), [
      ...places.flatMap((p) => [BZ.stemRef(p), BZ.branchCellRef(p), BZ.hiddenRef(p, 0), BZ.stageRef(p), BZ.naYinRef(p)]),
      ...TEN_GODS.map((g) => BZ.godRef(g.id)),
      ...baziSigns(c).stars.map((s) => BZ.starRef(s.id)),
      ...baziInteractions(c).map((ix) => BZ.ixRef(ix.id)),
      ...PHASES.map((p) => BZ.phaseRef(p.id)),
      BZ.EMPTY_REF, BZ.BALANCE_REF, BZ.STRENGTH_REF, BZ.STRUCTURE_REF, BZ.FAVOURABLE_REF,
    ]));
    const lucks = [luckPillars(c, "yang"), luckPillars(c, "yin")];
    const x = { c, lucks, year: flowYear(c, 2026, lucks), day: null, tz: "Europe/Paris" };
    add(crawl((ref, l) => BZL.luckReading(x, ref, l, full), [
      ...lucks.flatMap((k) => k.pillars.map((p) => BZL.luckRef(k.count, p.index))),
      BZL.LUCK_HOW_REF, BZL.FLOW_YEAR_REF, BZL.FLOW_DAY_REF, ...x.year.months.map((m) => BZL.flowMonthRef(m.index)),
    ]));
    const b = baziChart(birth === CAMILLE ? SAMPLE_B : CAMILLE);
    const pair = baziPair(c, b);
    add(crawl((ref, l) => BZP.pairReading(pair, c, b, ref, { a: "A", b: "B" }, l, full), [
      BZP.PAIR_DM_REF, BZP.PAIR_PALACE_REF, BZP.PAIR_GIFTS_REF, ...b.pillars.map((p) => BZP.pairMeetRef(p.id)),
      BZP.pairCellRef("a", BZ.stemRef("day")), BZP.pairCellRef("b", BZ.branchCellRef("day")),
    ]));
    // Feng Shui: the Kua and the Eight Mansions for both counts; a home with its stars, its replacement chart, its year.
    const people = [fengShuiOf(birth, "yang"), fengShuiOf(birth, "yin")];
    add(crawl((ref, l) => FSR.fengShuiReading(people, ref, l, full), people.flatMap((fs) => FSR.fengShuiRefs(fs.count))));
    // Feng Shui's Pair: two people's Kua on one compass.
    const fb = fengShuiOf(birth === CAMILLE ? SAMPLE_B : CAMILLE, "yin");
    const pc = { pair: fengShuiPair(people[0], fb), names: { a: "A", b: "B" }, lists: { a: [people[0]], b: [fb] } };
    add(crawl((ref, l) => FSP.fsPairReading(pc, ref, l, full), FSP.fsPairRefs()));
    // Its "You two, now": the year and the month over the directions the two share.
    const now = fsPairNow(pc.pair, NOW);
    add(crawl((ref, l) => fsPairNowReading(now, pc.names, ref, l, full, "You two, now", "Europe/Paris"), [FSP_NOW]));
    // Feng Shui's Cycles: the year and the month on the dial, the year's afflictions, the directions under them, for both counts and without a chart.
    const cy = yearStarsAt(NOW);
    for (const ps of [people, []]) {
      const cc = { y: cy, dirs: directionsOfYear(cy), people: ps.map((fs) => personYear(fs, cy)), timeZone: "Europe/Paris" };
      add(crawl((ref, l) => FSC.cyclesReading(cc, ref, l, full), FSC.cyclesRefs(cc)));
    }
    for (const facing of [180, 170.5]) {
      const home = homeOf(facing, "compass", null);
      const period = { year: 1998, ...periodOf(1998) };
      const years = yearStarsAt(NOW);
      const stars = FSH.homeStars(home, period, 2026, years, [], FS_TEXTS);
      const ctx = { home, period, people, place: "Paris", declination: 1.2, stars, years, rooms: [], texts: FS_TEXTS };
      add(crawl((ref, l) => FSH.homeReading(ctx, ref, l, full), [
        FSH.FSH_FACING_REF, FSH.FSH_PERIOD_REF, FSH.FSH_HOW_REF, ...people.map((fs) => FSH.fshHouseRef(fs.count)), ...MOUNTAINS.map((m) => FSH.fshMountainRef(m.id)),
        FSS.fssChartRef("main"), FSS.fssChartRef("ti"), FSS.fssPalaceRef("main", "c"), FSS.fssPalaceRef("ti", "n"), ...Object.keys(FORMATION_NAMES).map(FSS.fssFormationRef),
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(FSS.fssStarRef), FSY.FSY_YEAR_REF, FSY.FSY_MONTH_REF, ...FSY.AFFLICTION_IDS.map(FSY.fsyAffRef),
      ]));
    }
  }
  // The Calendar's solar terms.
  for (let term = 0; term < 24; term += 1) refs.add(`sky:${skyEventId({ k: "term", t: NOW, term })}`);
  return refs;
}

const REFS = pagesRefs();

test("every reading the Chinese pages can open names the entries it is about", () => {
  const chinese = [...REFS].filter((r) => CHINESE_READING.test(r));
  assert.ok(chinese.length > 250, `${chinese.length} readings`);
  const families = new Set();
  for (const ref of chinese) {
    const ids = chineseRefTerms(ref);
    assert.ok(ids.length, `${ref} names no entry`);
    for (const id of ids) families.add(familyOfTerm(id));
  }
  // What else a reading links to is a move, not a reading of a thing ("calendar-year:2027").
  assert.deepEqual([...REFS].filter((r) => !CHINESE_READING.test(r) && !/^(calendar-year|transits-at|go):/.test(r)), []);
  // Every family is what some reading is about, but yin and yang, which only the tables name (a palace offers the pairs of stars, part 26).
  const unreached = CHINESE_FAMILY_IDS.filter((f) => !families.has(f));
  assert.deepEqual(unreached, ["polarity"]);
  // A few by name.
  assert.deepEqual(chineseRefTerms("bz:god:eating-god"), ["ten-god-eating-god"]);
  assert.deepEqual(chineseRefTerms("zk:branch:6"), ["animal-horse", "branch-wu"]);
  assert.deepEqual(chineseRefTerms("zk:rel:clash:day:hour"), ["relation-clash"]);
  assert.deepEqual(chineseRefTerms("bz:ix:season:year-month-day"), ["relation-seasonal-trio"]);
  assert.deepEqual(chineseRefTerms("bz:stem:day"), ["day-master", "stem"]);
  assert.deepEqual(chineseRefTerms("bzp:b:bz:stem:day"), ["day-master", "stem"]);
  assert.deepEqual(chineseRefTerms("bzp:luck"), ["luck-pillar"], "the two luck pillars of the moment (BaZi part 20, BZ9)");
  assert.deepEqual(chineseRefTerms("fss:main:palace:n"), ["trigram-kan", "pairing"]);
  assert.deepEqual(chineseRefTerms("fss:ti:palace:c"), ["lo-shu", "pairing"]);
  assert.deepEqual(chineseRefTerms("fsy:aff:tai-sui"), ["tai-sui"]);
  assert.deepEqual(chineseRefTerms("fsh:mountain:zi"), ["mountain-zi"]);
  assert.deepEqual(chineseRefTerms("fss:star:9"), ["flying-star-9"]);
  assert.deepEqual(chineseRefTerms("fsp:b:kua"), ["kua"]);
  assert.deepEqual(chineseRefTerms("fsp:dir:se"), ["mansion"]);
  assert.deepEqual(chineseRefTerms("fsp:now"), ["annual-stars", "monthly-stars"]);
  assert.deepEqual(chineseRefTerms("fsp:now:dir:e"), ["mansion", "annual-stars"]);
  assert.deepEqual(chineseRefTerms("fsc:aff:tai-sui"), ["tai-sui"]);
  assert.deepEqual(chineseRefTerms("fsc:aff:three-killings"), ["affliction-three-killings"]);
  assert.deepEqual(chineseRefTerms("fsc:yang:dir:se"), ["mansion", "annual-stars"]);
  assert.deepEqual(chineseRefTerms("fsc:dir:se"), ["annual-stars"]);
  assert.deepEqual(chineseRefTerms("cnday:2000-01-01"), ["pillar-wu-wu", "animal-horse"], "1 January 2000 is Wu-Wu");
  assert.deepEqual(chineseRefTerms(`sky:${skyEventId({ k: "term", t: NOW, term: 0 })}`), ["solar-term-lichun"]);
  // The other languages' readings and the Calendar's are not Chinese ones.
  for (const ref of ["planet:saturn", "angle:ascendant", "aspect:sun_trine_moon", "gate:34", "channel:34-20", "center:sacral", "act:design:sun", "core:lifePath", "detail:attitude", "cycle:pinnacle:1", "sky:phase-0-1", "sky:ingress-sun-0-1", "moon:2026-10-14", "day:2026-10-14", "win:saturn:square:sun:1", "transit:saturn", "hello:type"]) {
    assert.ok(!CHINESE_READING.test(ref), ref);
  }
  // Nothing for what is not one, or is broken.
  for (const ref of ["planet:saturn", "gate:34", "core:lifePath", "sky:phase-0-1", "zk:branch:12", "zk:rel:bogus:a:b", "bz:stem:week", "fss:main:palace:constructor", "fs:yang:dir:constructor", "fsc:dir:constructor", "fsc:aff:nothing", "fsp:now:dir:constructor", "cnday:soon"]) {
    assert.deepEqual(chineseRefTerms(ref), [], ref);
  }
});

test("every family of reading ids the Chinese readings build is mapped", () => {
  // A new kind of reading id must come with its entries (a builder found here and not above fails).
  const covered = new Set([
    "placeRef", "branchRef", "relationRef", "yearRef", "monthRef", "meetingRef", "dayRef",
    "stemRef", "branchCellRef", "hiddenRef", "godRef", "stageRef", "naYinRef", "EMPTY_REF", "starRef", "ixRef", "BALANCE_REF", "phaseRef", "STRENGTH_REF", "STRUCTURE_REF", "FAVOURABLE_REF",
    "luckRef", "LUCK_HOW_REF", "FLOW_YEAR_REF", "flowMonthRef", "FLOW_DAY_REF",
    "PAIR_DM_REF", "PAIR_PALACE_REF", "PAIR_GIFTS_REF", "PAIR_LUCK_REF", "pairMeetRef", "pairCellRef",
    "fsKuaRef", "fsDirRef", "fsPracticeRef",
    "FSH_FACING_REF", "FSH_PERIOD_REF", "FSH_HOW_REF", "fshHouseRef", "fshMountainRef",
    "fssChartRef", "fssPalaceRef", "fssFormationRef", "fssStarRef",
    "FSY_YEAR_REF", "FSY_MONTH_REF", "fsyAffRef",
    "FSP_SUMMARY_REF", "FSP_PRACTICE_REF", "fspDirRef", "fspKuaRef", "fspNowRef",
    "FSC_YEAR_REF", "FSC_MONTH_REF", "fscAffRef", "fscDirRef", "fscYouRef",
  ]);
  const files = ["zodiac-reading", "zodiac-time-reading", "bazi-reading", "bazi-luck-reading", "bazi-pair-reading", "fengshui-reading", "fengshui-home-reading", "fengshui-stars-reading", "fengshui-years-reading", "fengshui-rooms-reading", "fengshui-pair-reading", "fengshui-pair-now", "fengshui-cycles-reading"];
  for (const f of files) {
    const src = readFileSync(`${ROOT}src/lib/chinese/${f}.ts`, "utf8");
    for (const [, name] of src.matchAll(/export const (\w*(?:Ref|REF))\b/g)) assert.ok(covered.has(name), `${f}.ts: ${name} is not mapped (lib/chinese/term-refs.ts, chineseRefTerms)`);
  }
  // The crawl met each prefix the pattern knows.
  for (const prefix of ["zk:", "zky:", "zkp:", "cnday:", "bz:", "bzp:", "fs:", "fsh:", "fss:", "fsy:", "fsp:", "fsp:now", "fsc:", "sky:term-"]) assert.ok([...REFS].some((r) => r.startsWith(prefix)), prefix);
});

/* ------------------------------------------------------------ written or not */

test("a family links only once every entry of it is written, and a written family links", () => {
  const written = (family) => chineseTermIds(family).every((id) => Object.hasOwn(terms, id) && terms[id][4] === 1);
  for (const family of LIVE_FAMILIES) {
    const missing = chineseTermIds(family).filter((id) => !Object.hasOwn(terms, id) || terms[id][4] !== 1);
    assert.deepEqual(missing, [], `${family} is live (lib/chinese/term-live.ts) with entries missing`);
  }
  for (const family of CHINESE_FAMILY_IDS) {
    if (!LIVE_FAMILIES.has(family)) assert.ok(!written(family), `every entry of ${family} is written: add it to LIVE_FAMILIES (lib/chinese/term-live.ts)`);
  }
});

test("nothing links while the encyclopedia has no Chinese entry", () => {
  const chineseEntries = Object.keys(terms).filter((id) => familyOfTerm(id));
  if (chineseEntries.length) return;
  assert.equal(LIVE_FAMILIES.size, 0);
  for (const family of CHINESE_FAMILY_IDS) for (const id of Object.keys(CHINESE_FAMILIES[family].ids)) assert.equal(linkableId(family, id), null, `${family} ${id}`);
  for (const ref of REFS) assert.equal(chineseSubjectOf(ref).size, 0, ref);
});

test("a Chinese reading claims none of the glossary's words, in the Calendar too", () => {
  // The glossary lists the words the open reading uses first: never Transit under a solar term or the day's animal (part 29's review).
  for (const ref of REFS) if (CHINESE_READING.test(ref)) assert.deepEqual(glossaryFor("timing", ref), [], ref);
  assert.ok([...REFS].some((r) => r.startsWith("sky:term-")) && [...REFS].some((r) => r.startsWith("cnday:")));
  // The Calendar's own readings keep theirs.
  assert.deepEqual(glossaryFor("timing", "sky:phase-0-1"), ["moonPhase", "transit"]);
  assert.ok(glossaryFor("timing", null).includes("transit"));
});

test("once a family is written, its words link and its readings offer it", () => {
  const bazi = new Set(["ten-god", "bazi-concept", "stem"]);
  assert.equal(linkableId("ten-god", "eating-god", bazi), "ten-god-eating-god");
  assert.equal(linkableId("ten-god", "nobody", bazi), null);
  assert.equal(linkableId("branch", "zi", bazi), null, "the branches are not written");
  assert.equal(linkableId("affliction", "tai-sui", new Set(["affliction"])), null, "Tai Sui is the shared ideas' entry");
  assert.equal(linkableId("affliction", "tai-sui", new Set(["chinese-concept"])), "tai-sui");
  assert.deepEqual([...chineseSubjectOf("bz:god:eating-god", bazi)], ["ten-god-eating-god"]);
  assert.deepEqual([...chineseSubjectOf("bz:stem:day", bazi)], ["day-master", "stem"]);
  assert.deepEqual([...chineseSubjectOf("zk:branch:6", new Set(["animal"]))], ["animal-horse"]);
  assert.deepEqual([...chineseSubjectOf("zk:branch:6", new Set())], []);
  // With every family written, every reading offers every entry it names.
  for (const ref of REFS) if (CHINESE_READING.test(ref)) assert.deepEqual([...chineseSubjectOf(ref, ALL_FAMILIES)], chineseRefTerms(ref), ref);
});

/* ------------------------------------------------------------ the tables' pieces */

test("the zodiac's cells give back their text exactly", () => {
  const z = zodiacChart(CAMILLE, { nowMs: NOW });
  for (const locale of LOCALES) {
    for (const prefs of PREFS) for (let b = 0; b < 12; b += 1) assert.equal(text(hiddenStemPieces(b, locale, prefs)), hiddenLine(b, locale, prefs), `${b} ${prefs.show}`);
    for (const p of z.places) assert.equal(text(placeAnimalPieces(z, p.id, locale)), placeAnimal(z, p.id, locale));
  }
  const pieces = hiddenStemPieces(1, "en", full);
  assert.deepEqual(pieces.filter((p) => p.family).map((p) => p.id), ["ji", "gui", "xin"]);
});

test("BaZi's cells give back their text exactly", () => {
  for (const birth of [CAMILLE, SAMPLE_B]) {
    const c = baziChart(birth);
    const lucks = [luckPillars(c, "yang"), luckPillars(c, "yin")];
    const time = { lucks, year: flowYear(c, flowYearOf(NOW), lucks), nowMs: NOW };
    const ixs = baziInteractions(c);
    const balance = baziBalance(c);
    const signs = baziSigns(c);
    for (const locale of LOCALES) {
      for (const prefs of PREFS) {
        const tag = `${locale} ${prefs.script} ${prefs.show}`;
        for (const p of c.pillars) assert.equal(text(hiddenGodPieces(c.dayMaster, p.branch, locale, prefs)), hiddenGodsLine(p, locale, prefs), tag);
        for (const r of baziFullRows(c, locale, prefs, time)) {
          const branch = BRANCHES.findIndex((b) => b.id === r.ids[5]);
          assert.equal(text(branchPhasePieces(branch, locale, prefs)), r.branch, `${tag} ${r.id}`);
          assert.equal(text(hiddenGodPieces(c.dayMaster, branch, locale, prefs)), r.hidden, `${tag} ${r.id}`);
          assert.equal(text(starPieces(r.ids[10] ? r.ids[10].split("|") : [], locale, prefs)), r.stars, `${tag} ${r.id}`);
          if (r.place) {
            assert.equal(text(natalLinkPieces(ixs, r.place, locale, prefs)), r.links, `${tag} ${r.id}`);
            assert.equal(text(pointPieces(balance, r.place, locale, prefs)), r.points, `${tag} ${r.id}`);
          } else {
            const meets = r.kind === "year" ? time.year.meets : luckAt(lucks.find((l) => `luck-${l.count}` === r.id), NOW)?.meets ?? [];
            assert.equal(text(meetPieces(meets, locale, prefs, "place")), r.links, `${tag} ${r.id}`);
          }
          // The table finds a row's Na Yin from its pillar.
          const cycle = SIXTY.findIndex((x) => x.id === r.ids[2]);
          assert.equal(NA_YIN[Math.floor(cycle / 2)].hant, r.ids[8], `${tag} ${r.id} Na Yin`);
        }
        assert.equal(text(emptyPieces(signs.empty, locale, prefs)), signs.empty.map((b) => chineseLabel(BRANCHES[b], locale, prefs).text).join(" · "), tag);
        for (const ix of ixs) {
          assert.equal(text(ixItemPieces(ix, locale, prefs)), ix.items.map((n) => ixItemShort(ix, n, locale, prefs)).join(" · "), `${tag} ${ix.id}`);
          assert.equal(text(ixResultPieces(ix, locale)), BZ.ixStatus(ix, locale), `${tag} ${ix.id}`);
        }
        for (const [k, v] of balanceRows(c, locale, prefs).summary) {
          const pieces = summaryPieces(c, k, locale, prefs, balance);
          if (pieces) assert.equal(text(pieces), v, `${tag} ${k}`);
        }
        for (const l of lucks) {
          // Items apart as each language writes them: "; ", French's « ; » with its narrow no-break space (part 20's review).
          for (const p of l.pillars) assert.equal(text(meetPieces(p.meets, locale, prefs, "pillar")), p.meets.length ? p.meets.map((m) => BZL.meetingShort(m, locale, prefs)).join(semicolon(locale)) : "–", `${tag} luck ${p.index}`);
        }
      }
    }
    // The pair's meetings, as its table says them.
    const b = baziChart(birth === CAMILLE ? SAMPLE_B : CAMILLE);
    const pair = baziPair(c, b);
    for (const locale of LOCALES) {
      for (const row of pair.meetings) {
        if (row.meets.length) assert.equal(text(meetPieces(row.meets, locale, full, "pillar")), BZP.meetRowLine(pair, row.from, { a: "A", b: "B" }, locale, full));
      }
    }
  }
  // The analysis names its structure; a hidden stem its stem and its god (Camille's year, Geng-Wu: Ding and Ji in Wu).
  const c = baziChart(CAMILLE);
  const named = balanceRows(c, "en", full).summary.map(([k]) => summaryPieces(c, k, "en", full)?.find((p) => p.family)?.family ?? null);
  assert.ok(named.includes("structure") && named.includes("phase"), named.join(" "));
  const year = c.pillars.find((p) => p.id === "year");
  assert.equal(BRANCHES[year.branch].id, "wu");
  assert.deepEqual(
    hiddenGodPieces(c.dayMaster, year.branch, "en", full).filter((p) => p.family).map((p) => `${p.family}:${p.id}`),
    year.hidden.flatMap((h) => [`stem:${STEMS[h.stem].id}`, `ten-god:${h.god}`]),
  );
});
