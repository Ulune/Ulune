/**
 * The years' and months' flying stars (languages plan, part 25): the year's
 * and the month's centre, the year's afflictions checked against the
 * almanacs for 2024 to 2027, the changes at each jie for the Calendar, what
 * the page says in both languages and the texts' tone. Made-up homes only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { monthCentre, yearBranch, yearCentre, yearStarsAt, palaceOfMountain } from "../src/lib/chinese/fengshui-years.ts";
import { starChangesBetween, starName } from "../src/lib/chinese/fengshui-calendar.ts";
import { AFFLICTION_HOW, AFFLICTION_NAMES, AFFLICTION_TEXTS } from "../src/lib/chinese/fengshui-years-texts.ts";
import { AFFLICTION_IDS, FSY_MONTH_REF, FSY_YEAR_REF, afflictionPlace, fsyAffRef, palaceYearLines, yearsReading } from "../src/lib/chinese/fengshui-years-reading.ts";
import { homeOf, periodOf } from "../src/lib/chinese/fengshui-home.ts";
import { homeReading, homeStars } from "../src/lib/chinese/fengshui-home-reading.ts";
import { fssPalaceRef } from "../src/lib/chinese/fengshui-stars-reading.ts";
import { homeTableCsv, homeTextParts } from "../src/lib/chinese/fengshui-home-table.ts";

const full = { script: "hant", show: "full" };
const at = (iso) => Date.parse(iso);

test("the year's star: one less each year, the 1 White in 2026", () => {
  assert.deepEqual([2023, 2024, 2025, 2026, 2027, 2028].map(yearCentre), [4, 3, 2, 1, 9, 8]);
  assert.equal(yearCentre(2017), 1, "nine years before, the same star");
  assert.equal(yearCentre(1990), 1);
  assert.deepEqual([2024, 2025, 2026, 2027].map(yearBranch), [4, 5, 6, 7], "Dragon, Snake, Horse, Goat");
});

test("the month's star: the Tiger month's by the year's branch, one less each month", () => {
  assert.equal(monthCentre(2026, 0), 8, "a Horse year opens with the 8");
  assert.equal(monthCentre(2025, 0), 2, "a Snake year with the 2");
  assert.equal(monthCentre(2024, 0), 5, "a Dragon year with the 5");
  assert.equal(monthCentre(2027, 0), 5, "a Goat year with the 5");
  assert.deepEqual(Array.from({ length: 12 }, (_, i) => monthCentre(2026, i)), [8, 7, 6, 5, 4, 3, 2, 1, 9, 8, 7, 6]);
  // Across Lichun the months run on unbroken: the Snake year's Rat and Ox months, then the Horse year's Tiger month.
  assert.deepEqual([monthCentre(2025, 10), monthCentre(2025, 11), monthCentre(2026, 0)], [1, 9, 8]);
});

test("the year's afflictions, as the almanacs give them for 2024 to 2027", () => {
  const y = (iso) => yearStarsAt(at(iso)).afflictions;
  const a24 = y("2024-06-15T12:00:00Z");
  assert.equal(a24.fiveYellow, "w");
  assert.equal(a24.threeKillings.direction, "s");
  assert.deepEqual(a24.threeKillings.mountains, ["bing", "wu", "ding"]);
  assert.equal(a24.taiSui, "chen");
  assert.equal(a24.yearBreaker, "xu");
  const a25 = y("2025-06-15T12:00:00Z");
  assert.equal(a25.fiveYellow, "ne");
  assert.equal(a25.threeKillings.direction, "e");
  assert.equal(a25.taiSui, "si");
  assert.equal(a25.yearBreaker, "hai");
  const a26 = y("2026-10-13T12:00:00Z");
  assert.equal(a26.fiveYellow, "s");
  assert.equal(a26.threeKillings.direction, "n");
  assert.deepEqual(a26.threeKillings.mountains, ["ren", "zi", "gui"]);
  assert.equal(a26.taiSui, "wu");
  assert.equal(a26.yearBreaker, "zi");
  assert.equal(palaceOfMountain(a26.taiSui), "s");
  const a27 = y("2027-06-15T12:00:00Z");
  assert.equal(a27.fiveYellow, "n");
  assert.equal(a27.threeKillings.direction, "w");
  assert.equal(a27.taiSui, "wei");
});

test("the stars at an instant: the year turns at Lichun, the month at each jie", () => {
  const oct = yearStarsAt(at("2026-10-13T12:00:00Z"));
  assert.equal(oct.solarYear, 2026);
  assert.equal(oct.year, 1);
  assert.equal(oct.monthIndex, 8, "the Dog month, from Hanlu");
  assert.equal(oct.month, 9);
  assert.equal(oct.yearChart.c, 1);
  assert.equal(oct.yearChart.s, 5);
  assert.equal(oct.monthChart.c, 9);
  assert.equal(oct.afflictions.monthFiveYellow, "n");
  assert.ok(oct.monthFrom < at("2026-10-13T12:00:00Z") && at("2026-10-13T12:00:00Z") < oct.monthTo);
  assert.equal(new Date(oct.monthFrom).getUTCDate(), 8);
  const jan = yearStarsAt(at("2026-01-20T12:00:00Z"));
  assert.equal(jan.solarYear, 2025, "January belongs to the year that began at the last Lichun");
  assert.equal(jan.year, 2);
  assert.equal(jan.month, 9);
  assert.equal(yearStarsAt(at("2026-02-10T12:00:00Z")).year, 1);
});

test("the Calendar's changes: one at each jie, the year's at Lichun only", () => {
  const ch = starChangesBetween(at("2026-01-01T00:00:00Z"), at("2027-01-01T00:00:00Z"));
  assert.equal(ch.length, 12);
  assert.deepEqual(ch.map((c) => c.month), [9, 8, 7, 6, 5, 4, 3, 2, 1, 9, 8, 7]);
  assert.deepEqual(ch.map((c) => c.year), [null, 1, null, null, null, null, null, null, null, null, null, null]);
  assert.deepEqual(ch.map((c) => new Date(c.t).getUTCMonth()), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  for (let i = 1; i < ch.length; i += 1) assert.ok(ch[i].t > ch[i - 1].t);
  // Each change agrees with the stars just after it.
  for (const c of ch) assert.equal(yearStarsAt(c.t + 60_000).month, c.month);
  assert.deepEqual(starChangesBetween(at("2026-10-09T00:00:00Z"), at("2026-10-20T00:00:00Z")), []);
  assert.equal(starName(1, "en"), "1 White");
  assert.equal(starName(9, "fr"), "9 Pourpre");
});

test("what the page says of the year, the month and each affliction, in both languages", () => {
  const y = yearStarsAt(at("2026-10-13T12:00:00Z"));
  const year = yearsReading(y, FSY_YEAR_REF, "en", full);
  assert.equal(year.title, "The year 2026");
  assert.match(year.lead, /1 White/);
  assert.ok(year.facts.some((f) => f.ref === fsyAffRef("five-yellow") && f.value === "South"));
  assert.equal(afflictionPlace(y, "tai-sui", "en", full).split(" · ")[0], "Wu");
  const month = yearsReading(y, FSY_MONTH_REF, "fr", full);
  assert.equal(month.title, "Ce mois-ci");
  assert.match(month.lead, /9 Pourpre/);
  assert.match(month.lead, /8 octobre/);
  for (const id of AFFLICTION_IDS) {
    for (const locale of ["en", "fr"]) {
      const r = yearsReading(y, fsyAffRef(id), locale, full);
      assert.ok(r, `${id} ${locale}`);
      assert.doesNotMatch(r.lead, /\{(where|year)\}/);
      assert.match(r.lead, /2026/);
      assert.notEqual(r.sections[0].paragraphs[0], r.lead, "the section says how, not the lead again");
    }
  }
  assert.match(yearsReading(y, fsyAffRef("five-yellow"), "en", full).lead, /flies to the south in 2026/);
  assert.match(yearsReading(y, fsyAffRef("three-killings"), "fr", full).lead, /tombent au nord en 2026/);
  assert.equal(yearsReading(y, "fsy:aff:nothing", "en", full), null);
  assert.equal(yearsReading(null, FSY_YEAR_REF, "en", full), null);
  assert.deepEqual(palaceYearLines(y, "s", "en").length, 2, "the 5 Yellow's palace says so");
  assert.deepEqual(palaceYearLines(y, "n", "en").length, 1);
});

test("the home page: a palace's reading adds its visitors, the table its year part", () => {
  const home = homeOf(180, "compass", null);
  const period = { year: 2005, ...periodOf(2005) };
  const years = yearStarsAt(at("2026-10-13T12:00:00Z"));
  const stars = homeStars(home, period, 2026, years);
  const ctx = { home, period, people: [], place: "Paris", declination: null, stars, years };
  const s = homeReading(ctx, fssPalaceRef("main", "s"), "en", full);
  assert.ok(s.paragraphs.some((p) => /This year the 5 Yellow visits this palace; this month, the 4 Green\./.test(p)), s.paragraphs.join(" / "));
  assert.ok(s.paragraphs.some((p) => /classics counsel quiet/.test(p)));
  assert.equal(homeReading(ctx, FSY_YEAR_REF, "en", full).title, "The year 2026");
  const parts = homeTextParts(ctx, "Camille", "en", full);
  const yp = parts.find((p) => p.id === "years");
  assert.ok(yp);
  assert.ok(yp.lines.some((l) => /The 5 Yellow: South/.test(l)));
  assert.ok(yp.lines.some((l) => /year 5, month 4/.test(l)));
  const csv = homeTableCsv(ctx).split("\n");
  assert.ok(csv.includes("years,yearStar,1"));
  assert.ok(csv.includes("years,monthStar,9"));
  assert.ok(csv.includes("years,fiveYellow,s"));
  assert.ok(csv.includes("years,taiSui,wu"));
  assert.ok(csv.includes("years,threeKillings,n:ren|zi|gui"));
  assert.ok(csv.includes("years,palace-s,5:4"));
  // Without the year's stars, nothing of them.
  const bare = { ...ctx, years: null };
  assert.equal(homeTextParts(bare, "", "en", full).find((p) => p.id === "years"), undefined);
  assert.ok(!homeTableCsv(bare).includes("years,"));
});

test("the afflictions' names and texts, in Ulune's typography and tone", () => {
  assert.deepEqual(Object.keys(AFFLICTION_NAMES).sort(), [...AFFLICTION_IDS].sort());
  assert.deepEqual(Object.keys(AFFLICTION_TEXTS).sort(), [...AFFLICTION_IDS].sort());
  assert.deepEqual(Object.keys(AFFLICTION_HOW).sort(), [...AFFLICTION_IDS].sort());
  for (const [en, fr] of Object.values(AFFLICTION_TEXTS)) {
    for (const t of [en, fr]) {
      assert.match(t, /\{where\}/);
      assert.match(t, /\{year\}/);
    }
  }
  for (const [en, fr] of [...Object.values(AFFLICTION_TEXTS), ...Object.values(AFFLICTION_HOW)]) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/);
      assert.doesNotMatch(t, / {2}/);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, fr.slice(0, 40));
    assert.doesNotMatch(en, /\b(death|dies?|illness|disease|sick\w*|health\w*|doomed|unlucky|lucky|curse[ds]?|must|fate|disaster|divorce|accident|bankrupt\w*|buy|cure|remedy|amulet|charm|wind chime|salt water)\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|santé|malchance|maudit|condamn\w*|doit|devez|destin|désastre|divorce|accident|faillite|acheter|remède|amulette|carillon|eau salée)\b/i, fr.slice(0, 40));
  }
});
