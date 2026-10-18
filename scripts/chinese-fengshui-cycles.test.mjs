/**
 * Feng Shui's Cycles, your directions through the years (share and compare
 * plan, feature 5d; decision R4): the year's and the month's flying stars
 * checked against the almanacs' values (languages plan, part 25), the months
 * opening at their jie, each direction's afflictions, what the year makes of a
 * person's eight directions (both counts of a birth without one), invariants
 * for every month from 1900 to 2100 and every Kua, the readings in both
 * languages, the table's text and CSV, and the texts' typography and tone.
 * Made-up births only: Camille (15 June 1990, 12:00 in Paris).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { DIRECTION_IDS, EIGHT_MANSIONS, MANSION_IDS, MANSIONS, fengShuiOf, trigramOfKua } from "../src/lib/chinese/fengshui.ts";
import { yearStarsAt } from "../src/lib/chinese/fengshui-years.ts";
import {
  CYCLES_FIRST_YEAR,
  CYCLES_LAST_YEAR,
  CYCLE_AFFLICTIONS,
  directionsOfYear,
  personDirection,
  personYear,
  solarMonthStart,
  starKind,
  starsOfMonth,
  stateOf,
  stepMonth,
} from "../src/lib/chinese/fengshui-cycles.ts";
import {
  FSC_MONTH_REF,
  FSC_YEAR_REF,
  bestLine,
  cyclesReading,
  cyclesRefs,
  directionAria,
  directionsList,
  fscAffRef,
  fscDirRef,
  fscYouRef,
  practiceLines,
  restLine,
} from "../src/lib/chinese/fengshui-cycles-reading.ts";
import { cyclesTableCsv, cyclesTextParts } from "../src/lib/chinese/fengshui-cycles-table.ts";
import { AFFLICTION_FOR_YOU, BEST_NONE_BEHIND, CYCLES_ABOUT, HOW_READ, STAR_FOR_YOU, STATE_TEXTS } from "../src/lib/chinese/fengshui-cycles-texts.ts";
import { chinese } from "../src/lib/i18n/catalog/chinese.ts";
import { fengShuiCyclesWords } from "../src/lib/i18n/catalog/fengshui-cycles-words.ts";

const full = { script: "hant", show: "full" };
// A made-up birth (never a real person's): Camille, 15 June 1990, 12:00 in Paris.
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const YANG = fengShuiOf(CAMILLE, "yang");
const YIN = fengShuiOf(CAMILLE, "yin");
/** A Kua's Eight Mansions as fengShuiOf gives them, for any Kua (the solar year is beside the point here). */
const kuaFs = (kua) => {
  const list = EIGHT_MANSIONS[kua];
  const of = Object.fromEntries(MANSION_IDS.map((m, i) => [m, list[i]]));
  const trigram = trigramOfKua(kua);
  const directions = DIRECTION_IDS.map((d) => {
    const rank = list.indexOf(d);
    return { direction: d, mansion: MANSION_IDS[rank], rank, supportive: MANSIONS[MANSION_IDS[rank]].supportive };
  });
  return { count: "yang", solarYear: 2000, kua, steps: { root: 1, raw: 1, five: false }, trigram, group: trigram.group, directions, of, uncertain: false };
};
const OPPOSITE = { n: "s", ne: "sw", e: "w", se: "nw", s: "n", sw: "ne", w: "e", nw: "se" };
// October 2026's solar month (the Dog month, from Hanlu): the year's 1 White, the month's 9 Purple.
const OCT = starsOfMonth(2026, 8);
const DIRS = directionsOfYear(OCT);
const ctxOf = (people, y = OCT) => ({ y, dirs: directionsOfYear(y), people: people.map((fs) => personYear(fs, y)), timeZone: "Europe/Paris" });
const BOTH = ctxOf([YANG, YIN]);
const SKY = ctxOf([]);

test("the year's and the month's stars, as the almanacs give them; each month opens at its jie", () => {
  // The year's star and its afflictions, 2024 to 2027 (fengshui-years.ts's own values).
  const years = [2024, 2025, 2026, 2027].map((y) => starsOfMonth(y, 5));
  assert.deepEqual(years.map((s) => s.year), [3, 2, 1, 9]);
  assert.deepEqual(years.map((s) => s.afflictions.fiveYellow), ["w", "ne", "s", "n"]);
  assert.deepEqual(years.map((s) => s.afflictions.threeKillings.direction), ["s", "e", "n", "w"]);
  assert.deepEqual(years.map((s) => s.afflictions.taiSui), ["chen", "si", "wu", "wei"]);
  // October 2026: the month opens at Hanlu, on 8 October.
  assert.deepEqual([OCT.solarYear, OCT.monthIndex, OCT.year, OCT.month, OCT.afflictions.monthFiveYellow], [2026, 8, 1, 9, "n"]);
  assert.equal(new Date(OCT.monthFrom).toISOString().slice(0, 10), "2026-10-08");
  assert.equal(new Date(OCT.monthTo).toISOString().slice(0, 10), "2026-11-07");
  // The same stars as at any instant inside the month.
  const mid = yearStarsAt(Date.parse("2026-10-18T12:00:00Z"));
  assert.deepEqual([mid.solarYear, mid.monthIndex, mid.year, mid.month], [2026, 8, 1, 9]);
  // The first month opens at Lichun; the last (the Ox month) at Xiaohan, in the next Gregorian year, still the same solar year.
  const first = starsOfMonth(2026, 0);
  assert.deepEqual([first.solarYear, first.monthIndex, first.year, first.month], [2026, 0, 1, 8]);
  assert.equal(new Date(first.monthFrom).toISOString().slice(0, 10), "2026-02-03", "Lichun 2026, 4 February in China");
  const last = starsOfMonth(2026, 11);
  assert.deepEqual([last.solarYear, last.monthIndex, last.year, last.month], [2026, 11, 1, 6]);
  assert.equal(new Date(solarMonthStart(2026, 11)).toISOString().slice(0, 10), "2027-01-05");
  assert.equal(solarMonthStart(2026, -1), solarMonthStart(2026, 11), "a month index is taken round the twelve");
  // The dial's steps cross the year's turn.
  assert.deepEqual(stepMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(stepMonth(2026, 0, -1), { year: 2025, month: 11 });
  assert.deepEqual(stepMonth(2026, 8, 12), { year: 2027, month: 8 });
  assert.deepEqual(stepMonth(2026, 8, -21), { year: 2024, month: 11 });
});

test("each direction under October 2026: the year's and the month's star, and what falls there", () => {
  const by = Object.fromEntries(DIRS.map((x) => [x.direction, [x.year, x.month, x.afflictions, x.monthFive]]));
  assert.deepEqual(by, {
    n: [6, 5, ["year-breaker", "three-killings"], true],
    ne: [4, 3, [], false],
    e: [8, 7, [], false],
    se: [9, 8, [], false],
    s: [5, 4, ["five-yellow", "tai-sui"], false],
    sw: [7, 6, [], false],
    w: [3, 2, [], false],
    nw: [2, 1, [], false],
  });
  // The Grand Duke's and the Year Breaker's mountains: Wu in the south, Zi in the north.
  assert.deepEqual(DIRS.find((x) => x.direction === "s").mountains, [{ id: "wu", affliction: "tai-sui" }]);
  assert.deepEqual(DIRS.find((x) => x.direction === "n").mountains, [{ id: "zi", affliction: "year-breaker" }]);
  assert.deepEqual(DIRS.map((x) => x.direction), [...DIRECTION_IDS], "clockwise from the north");
});

test("how a star is read, and what the year makes of a direction", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(starKind), ["supportive", "calm", "mixed", "supportive", "calm", "supportive", "mixed", "supportive", "supportive"]);
  assert.equal(stateOf(true, 9, false), "strengthened");
  assert.equal(stateOf(true, 3, false), "steady", "a mixed star leaves it steady");
  assert.equal(stateOf(true, 7, false), "steady");
  assert.equal(stateOf(true, 2, false), "rest", "a star asking for calm rests it");
  assert.equal(stateOf(true, 5, false), "rest");
  assert.equal(stateOf(true, 8, true), "rest", "an affliction rests it, whatever the star");
  assert.equal(stateOf(false, 9, false), "steady", "a challenging direction is never strengthened");
  assert.equal(stateOf(false, 2, false), "rest");
  assert.equal(stateOf(false, 1, true), "rest");
  // The Three Killings may be faced, not sat on: the direction across from them is steady at most.
  assert.equal(stateOf(true, 8, false, true), "steady", "a supportive star across from the Three Killings: steady, not strengthened");
  assert.equal(stateOf(true, 2, false, true), "rest");
});

test("the Three Killings at your back: never the direction to face (2024, Kua 4)", () => {
  // 2024 (the Dragon, water's trine): the Three Killings in the south. Kua 4's Sheng Qi is the north, under
  // the year's 8 White, unafflicted: facing it would put them at your back, so the east (Yan Nian, 1 White) leads.
  const y = starsOfMonth(2024, 5);
  assert.equal(y.afflictions.threeKillings.direction, "s");
  const dirs = directionsOfYear(y);
  assert.deepEqual(dirs.filter((x) => x.killingsBehind).map((x) => x.direction), ["n"]);
  const p = personYear(kuaFs(4), y, dirs);
  const n = personDirection(p, "n");
  assert.deepEqual([n.mansion, n.year, n.afflictions, n.state], ["sheng-qi", 8, [], "steady"]);
  assert.equal(p.best, "e");
  assert.ok(!p.strengthened.includes("n"));
  assert.equal(bestLine(p, "en"), "Face the east (Harmony) for what you begin this year.");
  const ctx = { y, dirs, people: [p], timeZone: "Europe/Paris" };
  const reading = cyclesReading(ctx, fscDirRef("yang", "n"), "en", full);
  assert.match(reading.sections.find((x) => x.id === "you").paragraphs[0], /^One of your supportive directions, steady this year: the Three Killings fall across from it/);
  assert.ok(!reading.paragraphs.some((t) => t === AFFLICTION_FOR_YOU["killings-behind"][0]), "said once, by its state");
  // Without a chart the north says it too, and the south (where they fall) its own counsel.
  const sky = { y, dirs, people: [], timeZone: "Europe/Paris" };
  assert.ok(cyclesReading(sky, fscDirRef(null, "n"), "fr", full).paragraphs.includes(AFFLICTION_FOR_YOU["killings-behind"][1]));
  assert.ok(!cyclesReading(sky, fscDirRef(null, "s"), "en", full).paragraphs.includes(AFFLICTION_FOR_YOU["killings-behind"][0]));
});

test("Camille's directions in 2026, both counts (a birth without one)", () => {
  // 1990: Kua 1 (Kan, East) by the yang count, Kua 8 (Gen, West) by the yin count.
  assert.deepEqual([YANG.kua, YIN.kua], [1, 8]);
  const yang = BOTH.people[0];
  // Kua 1: Sheng Qi SE (9 Purple), Tian Yi E (8 White), Yan Nian S (5 Yellow, the Grand Duke), Fu Wei N (the Year Breaker, the Three Killings).
  assert.deepEqual(yang.byMansion.map((x) => [x.mansion, x.direction, x.state]), [
    ["sheng-qi", "se", "strengthened"],
    ["tian-yi", "e", "strengthened"],
    ["yan-nian", "s", "rest"],
    ["fu-wei", "n", "rest"],
    ["huo-hai", "w", "steady"],
    ["wu-gui", "ne", "steady"],
    ["liu-sha", "nw", "rest"],
    ["jue-ming", "sw", "steady"],
  ]);
  assert.deepEqual([yang.best, yang.strengthened, yang.resting, yang.quiet], ["se", ["se", "e"], ["s", "n"], ["nw"]]);
  // Kua 8: Sheng Qi SW (7 Red, mixed), Tian Yi NW (2 Black), Yan Nian W (3 Jade), Fu Wei NE (4 Green).
  const yin = BOTH.people[1];
  assert.deepEqual([yin.best, yin.strengthened, yin.resting, yin.quiet], ["ne", ["ne"], ["nw"], ["s", "n"]]);
  assert.equal(personDirection(yin, "sw").state, "steady", "Sheng Qi under the 7 Red: steady, not strengthened");
  assert.equal(personDirection(yang, "ne").state, "steady", "a challenging direction under the 4 Green stays steady");
  // The year in practice.
  assert.deepEqual(practiceLines(yang, "en"), [
    "Face the south-east (Growth) for what you begin this year.",
    "For a desk or a long task this year, face the south-east: your Growth direction, with the year’s 9 Purple.",
    "Rest the south and the north this year rather than starting work there.",
  ]);
  assert.equal(restLine(yin, "fr"), "Laissez reposer le nord-ouest cette année plutôt que d’y entamer des travaux.");
  assert.equal(directionsList(["s", "n", "e"], "fr"), "le sud, le nord et l’est");
});

test("every month from 1900 to 2100, every Kua: the afflictions' places and the year's rules hold", () => {
  assert.deepEqual([CYCLES_FIRST_YEAR, CYCLES_LAST_YEAR], [1900, 2100]);
  const kuas = [1, 2, 3, 4, 6, 7, 8, 9].map(kuaFs);
  let prevYear = null;
  let prevMonth = null;
  let none = null;
  let noneBehind = null;
  for (let year = CYCLES_FIRST_YEAR; year <= CYCLES_LAST_YEAR; year += 1) {
    for (let m = 0; m < 12; m += 1) {
      const s = starsOfMonth(year, m);
      const at = `${year}/${m}`;
      assert.deepEqual([s.solarYear, s.monthIndex], [year, m], at);
      // The month's star goes back one each month, unbroken across Lichun; the year's one each year.
      if (prevMonth != null) assert.equal(s.month, prevMonth === 1 ? 9 : prevMonth - 1, at);
      prevMonth = s.month;
      if (m === 0 && prevYear != null) assert.equal(s.year, prevYear === 1 ? 9 : prevYear - 1, at);
      if (m === 0) prevYear = s.year;
      const dirs = directionsOfYear(s);
      const holding = (id) => dirs.filter((x) => x.afflictions.includes(id)).map((x) => x.direction);
      // The year's 5 Yellow sits where the year's 5 lands (in the centre, no direction holds it).
      assert.deepEqual(holding("five-yellow"), s.year === 5 ? [] : dirs.filter((x) => x.year === 5).map((x) => x.direction), at);
      assert.equal(holding("tai-sui").length, 1, at);
      assert.equal(holding("year-breaker").length, 1, at);
      assert.equal(OPPOSITE[holding("tai-sui")[0]], holding("year-breaker")[0], `${at}: the Year Breaker faces the Grand Duke`);
      assert.equal(holding("three-killings").length, 1, at);
      assert.ok(["n", "e", "s", "w"].includes(holding("three-killings")[0]), at);
      const five = dirs.filter((x) => x.monthFive);
      assert.deepEqual(five.map((x) => x.month), s.month === 5 ? [] : [5], `${at}: the month's 5 Yellow`);
      for (const x of dirs) assert.deepEqual(x.afflictions, CYCLE_AFFLICTIONS.filter((id) => x.afflictions.includes(id)), at);
      for (const fs of kuas) {
        const p = personYear(fs, s, dirs);
        const where = `${at} Kua ${fs.kua}`;
        for (const x of p.directions) {
          if (x.afflictions.length) assert.equal(x.state, "rest", `${where} ${x.direction}: an afflicted direction rests`);
          if (x.state === "strengthened") assert.ok(x.supportive && starKind(x.year) === "supportive" && !x.afflictions.length && !x.killingsBehind, where);
          assert.equal(x.killingsBehind, OPPOSITE[x.direction] === holding("three-killings")[0], `${where} ${x.direction}: across from the Three Killings`);
        }
        const supportive = p.byMansion.filter((x) => x.supportive).map((x) => x.direction);
        assert.equal(supportive.length, 4, where);
        assert.ok([...p.strengthened, ...p.resting].every((d) => supportive.includes(d)), where);
        assert.ok(p.strengthened.every((d) => !p.resting.includes(d)), where);
        assert.ok(p.quiet.every((d) => !supportive.includes(d)), where);
        const steady = supportive.filter((d) => personDirection(p, d).state === "steady" && !personDirection(p, d).killingsBehind);
        assert.equal(p.best, p.strengthened[0] ?? steady[0] ?? null, where);
        if (p.best) assert.ok(!personDirection(p, p.best).killingsBehind, `${where}: the direction to face never puts the Three Killings at your back`);
        if (!p.best && supportive.every((d) => personDirection(p, d).state === "rest") && !none) none = p;
        if (!p.best && !supportive.every((d) => personDirection(p, d).state === "rest") && !noneBehind) noneBehind = p;
      }
    }
  }
  // Some years ask all four supportive directions to rest: the page says so gently, and names none to face.
  assert.ok(none, "a year with all four supportive directions resting");
  assert.equal(bestLine(none, "en"), fengShuiCyclesWords.fscBestNone[0]);
  assert.equal(bestLine(none, "fr"), fengShuiCyclesWords.fscBestNone[1]);
  assert.equal(practiceLines(none, "en").length, 2, "no desk line without a direction to face");
  // And years where the one supportive direction left would put the Three Killings at your back.
  assert.ok(noneBehind, "a year whose one supportive direction not resting lies across from the Three Killings");
  assert.equal(bestLine(noneBehind, "fr"), BEST_NONE_BEHIND[1]);
  assert.equal(practiceLines(noneBehind, "en").length, 2);
});

/** French spacing: a narrow no-break space before : ; ! ? and none plain. */
const frenchSpacing = (t) => !/(?<!\u202f)[:;!?](?=\s|$)/.test(t) && !/ [:;!?]/.test(t) && !/\u00a0[:;!?]/.test(t);

test("every reading of the page, in both languages, with a chart (both counts) and without one", () => {
  assert.deepEqual(cyclesRefs(SKY), [FSC_YEAR_REF, FSC_MONTH_REF, ...CYCLE_AFFLICTIONS.map(fscAffRef), ...DIRECTION_IDS.map((d) => fscDirRef(null, d))]);
  assert.deepEqual(cyclesRefs(BOTH).slice(6, 8), [fscYouRef("yang"), fscDirRef("yang", "n")]);
  assert.equal(cyclesRefs(BOTH).length, 6 + 2 * 9);
  for (const ctx of [BOTH, SKY, ctxOf([YANG])]) {
    for (const locale of ["en", "fr"]) {
      for (const ref of cyclesRefs(ctx)) {
        const r = cyclesReading(ctx, ref, locale, full);
        assert.ok(r, `${ref} ${locale}`);
        assert.equal(r.id, ref);
        assert.ok(r.title && r.lead && r.paragraphs.length >= 2, `${ref} ${locale}`);
        assert.equal(new Set(r.paragraphs).size, r.paragraphs.length, `${ref} ${locale}: a paragraph said twice`);
        assert.ok(!r.sections.some((s) => s.paragraphs.includes(r.lead)), `${ref} ${locale}: the lead said again in a section`);
        for (const p of [r.title, r.kicker, ...r.paragraphs, ...(r.facts ?? []).flatMap((f) => [f.label, f.value])]) {
          assert.ok(!/[{}]/.test(p), `${ref} ${locale}: “${p}”`);
          if (locale === "fr") assert.ok(frenchSpacing(p), `${ref}: French spacing in “${p}”`);
        }
        for (const f of r.facts ?? []) if (f.ref) assert.ok(cyclesReading(ctx, f.ref, locale, full), `${ref}: a fact's link ${f.ref} opens`);
      }
    }
  }
  // Another page's refs, a count not shown, an unknown affliction: nothing.
  assert.equal(cyclesReading(BOTH, "fs:yang:dir:n", "en", full), null);
  assert.equal(cyclesReading(BOTH, "fsc:aff:nothing", "en", full), null);
  assert.equal(cyclesReading(ctxOf([YANG]), fscYouRef("yin"), "en", full), null);
  assert.equal(cyclesReading(null, FSC_YEAR_REF, "en", full), null);
  // What a direction says: its mansion and state, the year's star, what falls there, the month.
  const se = cyclesReading(BOTH, "fsc:yang:dir:se", "en", full);
  assert.equal(se.title, "South-East in 2026");
  assert.equal(se.lead, "In 2026, the year’s 9 Purple visits the south-east, your Growth direction.");
  assert.deepEqual(se.sections.map((s) => s.id), ["you", "star", "month", "read"]);
  assert.match(se.paragraphs.join(" "), /From 8 October to 7 November, the month’s 8 White visits it\./);
  // The south holds the year's 5 Yellow and the Grand Duke: their counsel, not the 5's star line again.
  const s = cyclesReading(BOTH, "fsc:yang:dir:s", "fr", full);
  assert.deepEqual(s.sections.map((x) => x.id), ["you", "quiet", "month", "read"]);
  // The 5 Yellow, the Grand Duke, and the Three Killings (in the north) at your back as you face it.
  assert.equal(s.sections.find((x) => x.id === "quiet").paragraphs.length, 3);
  assert.equal(s.lead, "En 2026, le 5 Jaune de l’année visite le sud, votre direction d’Harmonie.");
  // The north, without a chart: the Year Breaker's, the Three Killings' and the month's 5 Yellow's counsels.
  const n = cyclesReading(SKY, "fsc:dir:n", "en", full);
  assert.equal(n.paragraphs.filter((p) => /classics suggest|a month to keep this side quiet/.test(p)).length, 3);
  assert.match(n.paragraphs.at(-1), /With a birth chart/);
  // The Three Killings: face them rather than sit with your back to them (the classics' counsel).
  const k = cyclesReading(BOTH, fscAffRef("three-killings"), "en", full);
  assert.match(k.lead, /facing them rather than sitting with your back to them/);
  assert.match(k.paragraphs.join(" "), /Yang count: In 2026, the year’s 6 White visits the north, your Stability direction\./);
  assert.match(cyclesReading(BOTH, FSC_MONTH_REF, "fr", full).lead, /^Du 8 octobre au 7 novembre, l’étoile du mois au centre est le 9 Pourpre\.$/);
  const year = cyclesReading(BOTH, FSC_YEAR_REF, "en", full);
  assert.equal(year.title, "The year 2026");
  assert.ok(year.paragraphs.includes("Yin count: Face the north-east (Stability) for what you begin this year."));
  // The rose's words for one direction.
  assert.equal(
    directionAria(BOTH.people[0].directions[0], "en", full, "water"),
    "North (water): Stability, supportive; year’s star 6 White, month’s star 5 Yellow; resting this year; the Year Breaker, the Three Killings, the month’s 5 Yellow.",
  );
  assert.equal(directionAria(DIRS[3], "fr", full, "bois"), "Sud-Est (bois)\u202f; étoile de l’année 9 Pourpre, étoile du mois 8 Blanc.");
});

test("the table as text and as CSV, the same ids in every language", () => {
  const en = cyclesTextParts(BOTH, "Camille", "en", full);
  assert.deepEqual(en.map((p) => p.id), ["year", "dirs", "you"]);
  assert.equal(en[0].lines[0], "Camille · The year and the month");
  assert.ok(en[0].lines.includes("The Grand Duke: Wu · S2"));
  assert.match(en[1].lines[4], /^South-East · dōngnán 東南 · ☴ Xun: Year star 9 Purple, month star 8 White; Yang count Growth · shēngqì 生氣 \(supportive\), strengthened; Yin count Depletion/);
  assert.equal(en[2].lines.length, 1 + 3 + 3);
  const fr = cyclesTextParts(BOTH, "Camille", "fr", full).map((p) => p.lines.join("\n")).join("\n");
  assert.match(fr, /Les Trois Sha\u202f: Nord/);
  assert.doesNotMatch(fr, /Year star|Grand Duke|strengthened|resting|Yang count/);
  for (const line of fr.split("\n")) assert.ok(frenchSpacing(line), line);
  assert.deepEqual(cyclesTextParts(SKY, "", "en", full).map((p) => p.id), ["year", "dirs"], "without a chart, no part for you");
  const csv = cyclesTableCsv(BOTH).split("\n");
  for (const row of [
    "year,solarYear,2026",
    "year,star,1",
    "year,monthIndex,8",
    "year,monthStar,9",
    "year,monthFrom,2026-10-08",
    "aff,five-yellow,s",
    "aff,tai-sui,wu",
    "aff,year-breaker,zi",
    "aff,three-killings,n",
    "aff,month-five-yellow,n",
    "dir,n,6,5,year-breaker|three-killings,1",
    "dir,s,5,4,five-yellow|tai-sui,0",
    "you,yang,se,sheng-qi,1,strengthened",
    "you,yin,nw,tian-yi,1,rest",
    "best,yang,1,se,s|n",
    "best,yin,8,ne,nw",
  ])
    assert.ok(csv.includes(row), row);
  assert.equal(cyclesTableCsv(BOTH), cyclesTableCsv(ctxOf([YANG, YIN])), "the same in every language and time zone");
  assert.ok(!cyclesTableCsv(SKY).includes("\nyou,"));
  assert.ok(!cyclesTableCsv(SKY).includes("\nbest,"));
});

/** Every text the page says, as [where, language, text]. */
function allTexts() {
  const out = [];
  const both = (where, [en, fr]) => {
    out.push([where, "en", en]);
    out.push([where, "fr", fr]);
  };
  for (const [n, t] of Object.entries(STAR_FOR_YOU)) both(`star ${n}`, t);
  for (const [id, t] of Object.entries(AFFLICTION_FOR_YOU)) both(`affliction ${id}`, t);
  for (const [id, t] of Object.entries(STATE_TEXTS)) both(`state ${id}`, t);
  both("how", HOW_READ);
  both("best none behind", BEST_NONE_BEHIND);
  CYCLES_ABOUT.forEach((t, i) => both(`about ${i}`, t));
  for (const [k, t] of Object.entries(fengShuiCyclesWords)) both(`word ${k}`, t);
  both("word cnmHowCycles", chinese.cnmHowCycles);
  for (const ctx of [BOTH, SKY])
    for (const locale of ["en", "fr"])
      for (const ref of cyclesRefs(ctx)) {
        const r = cyclesReading(ctx, ref, locale, full);
        for (const p of r.paragraphs) out.push([`reading ${ref}`, locale, p]);
      }
  return out;
}

test("the texts: Ulune's typography, and suggestions about timing, never a danger or a verdict", () => {
  assert.deepEqual(Object.keys(STAR_FOR_YOU).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(Object.keys(AFFLICTION_FOR_YOU).sort(), [...CYCLE_AFFLICTIONS, "killings-behind", "month-five-yellow"].sort());
  assert.deepEqual(Object.keys(STATE_TEXTS).sort(), ["good-behind", "good-rest", "good-steady", "good-strengthened", "hard-rest", "hard-steady"]);
  const banned = {
    en: /(?<!\p{L})(?:danger\w*|threat\w*|harm(?:s|ed|ful)?|death|dies?|illness|disease|sick\w*|health\w*|doomed|unlucky|lucky|bad luck|misfortune|curse[ds]?|must|fate|disaster|divorce|accident\w*|bankrupt\w*|buy|cure|remedy|amulet|charm|wind chime|salt water)(?!\p{L})/iu,
    fr: /(?<!\p{L})(?:danger\w*|menace\w*|néfaste|mort|meurt|maladie|malade|santé|malchance|malheur\w*|maudit|condamn\w*|doit|doivent|devez|destin|désastre|divorce|accident\w*|faillite|acheter|remède|amulette|carillon|eau salée)(?!\p{L})/iu,
  };
  for (const [where, l, t] of allTexts()) {
    assert.ok(t.trim(), `${where} ${l}`);
    // "Nothing to buy" says the very promise the ban keeps.
    assert.doesNotMatch(t.replace(/nothing to buy|rien à acheter/g, ""), banned[l], `${where} (${l}): “${t}”`);
    assert.ok(!/\w'\w/.test(t), `${where} (${l}): a straight apostrophe`);
    assert.ok(!/"/.test(t), `${where} (${l}): a straight quote`);
    assert.ok(!/ {2}/.test(t), `${where} (${l}): two spaces`);
    if (l === "fr") {
      assert.ok(frenchSpacing(t), `${where}: French punctuation without its narrow space: “${t}”`);
      assert.ok(!/« |«[^\u202f]| »|[^\u202f]»/.test(t), `${where}: « » without narrow spaces`);
    } else assert.ok(!/[«»]/.test(t), `${where}: French quotes in English`);
  }
  // The same {placeholders} in both languages of each word (French's elided names aside).
  const holes = (t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1].replace(/^de([A-Z])/, (_, c) => c.toLowerCase())).filter((h, i, all) => all.indexOf(h) === i).sort().join();
  for (const [k, [en, fr]] of Object.entries(fengShuiCyclesWords)) assert.equal(holes(en), holes(fr), `word ${k}`);
  // Its own book (review of 2.0's week 3): none of its words left in the Chinese traditions' words "/" fetches.
  assert.deepEqual(Object.keys(chinese).filter((k) => /^fsc/.test(k)), []);
  // "A year to rest that side rather than start work there": the owner's own words, in the texts that ask for rest.
  for (const t of [STAR_FOR_YOU[2], STAR_FOR_YOU[5], STATE_TEXTS["good-rest"]]) assert.match(t[0], /a year to rest that side rather than start work there/);
});
