/*
 * The encyclopedia's sixty pillars and thirty Na Yin (encyclopedia plan, part 25): the pages
 * scripts/encyclopedia/pillars.mjs assembles must say what the engine computes, to the character.
 * Its helpers are checked against the engine itself (bazi.ts's Ten Gods, pillars.ts's months and
 * hours, lunar.ts's years, names.ts's Na Yin), and a few built pages against the facts they print:
 * the years of a pillar, its days, its life stage, its week and empty branches, its Na Yin; a Na
 * Yin's two pillars and the arithmetic of its phase.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEncyclopedia, formatErrors, readContent } from "./encyclopedia/build.mjs";
import { BRANCH_NUMBER, STEM_NUMBER, TEN_GODS, godOf, hourOf, monthOf, naYinArithmetic, yearsOf } from "./encyclopedia/pillars.mjs";
import { BRANCHES, NA_YIN, SIXTY, STEMS, naYinOf } from "../src/lib/chinese/names.ts";
import { tenGodOf } from "../src/lib/chinese/bazi.ts";
import { emptyBranchesOf, stageOf } from "../src/lib/chinese/bazi-signs.ts";
import { hourPillarOf, monthPillarAt, pillarOf } from "../src/lib/chinese/pillars.ts";
import { yearCycleOf } from "../src/lib/chinese/lunar.ts";
import { termMs } from "../src/lib/chinese/terms.ts";
import { dayCycleOf } from "../src/lib/chinese/day-cycle.ts";

const DAY = 86_400_000;
const real = buildEncyclopedia(readContent(new URL("../content/encyclopedia", import.meta.url).pathname));

test("the generator’s Ten Gods, months, hours and years are the engine’s", () => {
  assert.deepEqual(TEN_GODS, ["companion", "rob-wealth", "eating-god", "hurting-officer", "indirect-wealth", "direct-wealth", "seven-killings", "direct-officer", "indirect-resource", "direct-resource"]);
  for (let dm = 0; dm < 10; dm += 1) for (let s = 0; s < 10; s += 1) assert.equal(godOf(dm, s, STEMS), tenGodOf(dm, s).id, `${dm} ${s}`);
  // A pillar’s month: in every year of a sixty-year run, the month whose pillar it is (pillars.ts, the five tigers).
  for (let k = 0; k < 60; k += 1) {
    const m = monthOf(k, SIXTY);
    for (let year = 1984; year < 2044; year += 1) {
      for (let index = 0; index < 12; index += 1) {
        // The middle of the solar month: a day after its opening term (Xiaohan, the twelfth, opens in the January after).
        const open = index < 11 ? termMs(year, 2 * index) : termMs(year + 1, 22);
        const cycle = monthPillarAt(open + DAY).cycle;
        const yearStem = yearCycleOf(year) % 10;
        assert.equal(cycle === k, index === m.index && m.stems.includes(yearStem), `${SIXTY[k].id} in ${year}, month ${index}`);
      }
    }
    for (const y of m.years) assert.ok(m.stems.includes(yearCycleOf(y) % 10), `${SIXTY[k].id}: ${y}`);
  }
  // A pillar’s hour: the double hour whose pillar it is on a day of each stem (pillars.ts, the five rats).
  for (let k = 0; k < 60; k += 1) {
    const h = hourOf(k, SIXTY);
    for (let day = 0; day < 60; day += 1) {
      for (let b = 0; b < 12; b += 1) {
        const cycle = hourPillarOf(pillarOf(day), b).cycle;
        assert.equal(cycle === k, b === h.branch && h.stems.includes(day % 10), `${SIXTY[k].id}: day ${day}, branch ${b}`);
      }
    }
  }
  // A pillar’s years, 1800–2200 (lunar.ts: 1984 is Jia Zi).
  for (let k = 0; k < 60; k += 1) {
    const years = yearsOf(k);
    for (let y = 1800; y <= 2200; y += 1) assert.equal(years.includes(y), yearCycleOf(y) === k, `${SIXTY[k].id}: ${y}`);
  }
});

test("the tradition’s arithmetic gives every Na Yin the engine’s phase", () => {
  assert.deepEqual(STEM_NUMBER, [9, 8, 7, 6, 5, 9, 8, 7, 6, 5]);
  assert.deepEqual(BRANCH_NUMBER, [9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4]);
  for (let n = 0; n < 30; n += 1) {
    assert.equal(naYinArithmetic(n, SIXTY).phase, NA_YIN[n].phase, NA_YIN[n].en);
    assert.equal(naYinOf(2 * n), NA_YIN[n]);
    assert.equal(naYinOf(2 * n + 1), NA_YIN[n]);
  }
  // Jia Zi and Yi Chou: 9 + 9 + 8 + 8 = 34; 49 − 34 = 15, whose 5 is Earth, and Earth produces Metal.
  assert.deepEqual(naYinArithmetic(0, SIXTY), { sum: 34, rest: 15, base: "earth", phase: "metal" });
});

test("the pillars’ and the Na Yin’s pages print the engine’s facts", () => {
  assert.equal(real.errors.length, 0, formatErrors(real.errors));
  const text = (lang, id) => JSON.stringify(real.data.pages[`${lang}/${id}`].sections);
  for (let k = 0; k < 60; k += 1) {
    const p = SIXTY[k];
    const id = `pillar-${p.id}`;
    for (const lang of ["en", "fr"]) {
      const page = real.data.pages[`${lang}/${id}`];
      assert.ok(page, `${lang}/${id}`);
      assert.deepEqual(page.zh, { hant: p.hant, hans: p.hans, pinyin: p.pinyin }, id);
      const t = text(lang, id);
      // Its years, its stage, its Na Yin.
      assert.ok(t.includes(yearsOf(k).join(", ")), `${lang}/${id}: years`);
      assert.ok(t.includes(`life-stage-${stageOf(p.stem, p.branch).id}`), `${lang}/${id}: stage`);
      assert.ok(t.includes(`na-yin-${NA_YIN[Math.floor(k / 2)].pinyin.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(" ", "-")}`), `${lang}/${id}: Na Yin`);
      assert.ok(t.includes(NA_YIN[Math.floor(k / 2)].hant), `${lang}/${id}: Na Yin’s characters`);
      // Its week’s empty branches.
      const [a, b] = emptyBranchesOf(k).map((x) => BRANCHES[x].id.charAt(0).toUpperCase() + BRANCHES[x].id.slice(1));
      assert.ok(t.includes(`${a} ${lang === "fr" ? "et" : "and"} ${b}`), `${lang}/${id}: empty ${a} ${b}`);
    }
    // Its days in 2026 (day-cycle.ts), in English: “on 19 February, …”.
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (let m = 1; m <= 12; m += 1) {
      for (let d = 1; d <= new Date(Date.UTC(2026, m, 0)).getUTCDate(); d += 1) {
        if (dayCycleOf(2026, m, d) === k) assert.ok(text("en", id).includes(`${d} ${months[m - 1]}`), `${id}: ${d} ${months[m - 1]} 2026`);
      }
    }
  }
  // A Na Yin’s page names its two pillars and the arithmetic of its phase.
  const t = text("en", "na-yin-tianhe-shui");
  assert.ok(t.includes('"l":"pillar-bing-wu"') && t.includes('"l":"pillar-ding-wei"'), "Water of the Milky Way: Bing Wu and Ding Wei");
  const ar = naYinArithmetic(21, SIXTY);
  assert.ok(t.includes(`49 − ${ar.sum} = ${ar.rest}`), "its numbers");
  // The Calendar’s day of 23 October 2026 is Geng Wu, the pillar its reading offers.
  assert.equal(SIXTY[dayCycleOf(2026, 10, 23)].id, "geng-wu");
});
