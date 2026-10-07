/*
 * The Chinese calendar's time table (src/lib/chinese/time-table.ts, built
 * from the Swiss Ephemeris by scripts/chinese/build-time-table.mjs) and the
 * analytic Sun and Moon that take over outside it (astro.ts), held to an
 * independent native Swiss Ephemeris (scripts/fixtures/chinese/swiss-sample.json,
 * pyswisseph from the same ephe/ files).
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  deltaTSeconds,
  equationOfTimeMinutes,
  newMoonMs,
  sunAt,
  sunCrossingMs,
  wrap180,
  jdFromMs,
} from "../src/lib/chinese/astro.ts";
import {
  DONGZHI,
  XIAOHAN,
  isTabulated,
  moonAtOrBefore,
  moonMs,
  termAfter,
  termAtOrBefore,
  termLongitude,
  termMs,
  termsOfYear,
  utcMs,
} from "../src/lib/chinese/terms.ts";
import { MOON_COUNT, MOON_FIRST_K, TERM_FIRST_YEAR, TERM_LAST_YEAR } from "../src/lib/chinese/time-table.ts";

const SWISS = JSON.parse(readFileSync(new URL("./fixtures/chinese/swiss-sample.json", import.meta.url), "utf8"));
const DAY = 86_400_000;

test("the committed table is exactly what the build script makes from the Swiss Ephemeris", () => {
  // Rebuilds in memory (about two seconds) and compares with the files: a hand
  // edit, or a Swiss Ephemeris update that moves an instant, fails here.
  const root = new URL("..", import.meta.url).pathname;
  const out = execFileSync(process.execPath, ["scripts/chinese/build-time-table.mjs", "--check"], { cwd: root, encoding: "utf8" });
  assert.match(out, /current/);
});

test("every tabulated year has its 24 terms, in order, 14.7 to 15.8 days apart", () => {
  assert.equal(TERM_FIRST_YEAR, 1799);
  assert.equal(TERM_LAST_YEAR, 2201);
  let previous = null;
  for (let year = TERM_FIRST_YEAR; year <= TERM_LAST_YEAR; year += 1) {
    const terms = termsOfYear(year);
    assert.equal(terms.length, 24);
    assert.equal(terms[0].term, XIAOHAN, "Xiaohan opens the Gregorian year");
    assert.equal(terms[23].term, DONGZHI, "Dongzhi closes it");
    for (const t of terms) {
      assert.equal(new Date(t.ms).getUTCFullYear(), year, `term ${t.term} of ${year} is in ${year}`);
      if (previous) {
        const gap = (t.ms - previous.ms) / DAY;
        assert.ok(gap > 14.7 && gap < 15.8, `${year} term ${t.term}: ${gap.toFixed(3)} days after the last`);
        assert.equal(t.term, (previous.term + 1) % 24);
      }
      previous = t;
    }
  }
});

test("the same term comes back after one tropical year, ±20 minutes", () => {
  for (let year = TERM_FIRST_YEAR + 1; year <= TERM_LAST_YEAR; year += 1) {
    for (let term = 0; term < 24; term += 1) {
      const days = (termMs(year, term) - termMs(year - 1, term)) / DAY;
      assert.ok(Math.abs(days - 365.2422) < 20 / 1440, `${year} term ${term}: ${days} days`);
    }
  }
});

test("the new moons follow each other 29.26 to 29.84 days apart, 29.5306 on average", () => {
  assert.ok(MOON_COUNT > 4950);
  let sum = 0;
  for (let k = MOON_FIRST_K + 1; k < MOON_FIRST_K + MOON_COUNT; k += 1) {
    const days = (moonMs(k) - moonMs(k - 1)) / DAY;
    assert.ok(days > 29.26 && days < 29.84, `lunation ${k}: ${days} days`);
    sum += days;
  }
  assert.ok(Math.abs(sum / (MOON_COUNT - 1) - 29.530589) < 0.0005);
});

test("the table holds the native Swiss Ephemeris's instants, to the second", () => {
  assert.ok(SWISS.terms.length >= 100 && SWISS.moons.length >= 100);
  for (const t of SWISS.terms) {
    const got = termMs(t.year, t.term) / 1000;
    assert.ok(Math.abs(got - t.s) <= 0.501, `${t.year} term ${t.term}: ${got} vs Swiss ${t.s}`);
  }
  for (const m of SWISS.moons) {
    const k = moonAtOrBefore(m.s * 1000 + DAY);
    const got = [moonMs(k), moonMs(k - 1)].map((x) => x / 1000).sort((a, b) => Math.abs(a - m.s) - Math.abs(b - m.s))[0];
    assert.ok(Math.abs(got - m.s) <= 0.501, `new moon ${m.s}: ${got}`);
  }
});

test("the analytic Sun and Moon agree with the table within 25 s over its 400 years", () => {
  let worstTerm = 0;
  for (let year = TERM_FIRST_YEAR; year <= TERM_LAST_YEAR; year += 3) {
    for (let term = 0; term < 24; term += 1) {
      const table = termMs(year, term);
      const analytic = sunCrossingMs(termLongitude(term), table + 2 * DAY);
      worstTerm = Math.max(worstTerm, Math.abs(analytic - table) / 1000);
    }
  }
  let worstMoon = 0;
  for (let k = MOON_FIRST_K; k < MOON_FIRST_K + MOON_COUNT; k += 1) {
    worstMoon = Math.max(worstMoon, Math.abs(newMoonMs(k) - moonMs(k)) / 1000);
  }
  // Measured at the build: terms within 17.2 s, new moons within 17.6 s.
  assert.ok(worstTerm < 25, `terms differ by up to ${worstTerm.toFixed(1)} s`);
  assert.ok(worstMoon < 25, `new moons differ by up to ${worstMoon.toFixed(1)} s`);
});

test("the analytic Sun's apparent longitude is the one the terms need: 315° at Lichun, 270° at Dongzhi", () => {
  for (const [year, term] of [
    [1850, 0],
    [2026, 0],
    [2026, DONGZHI],
    [2199, 9],
  ]) {
    const ms = termMs(year, term);
    const jde = jdFromMs(ms) + deltaTSeconds(jdFromMs(ms)) / 86400;
    const off = wrap180(sunAt(jde).lon - termLongitude(term)) * 3600;
    // The Sun moves about 2.5″ a minute: a second of time is 0.04″.
    assert.ok(Math.abs(off) < 1, `${year} term ${term}: ${off.toFixed(2)}″ off`);
  }
});

test("outside the table the terms and new moons come from the analytic engine, in step with it at both edges", () => {
  assert.ok(isTabulated(Date.UTC(1800, 0, 1)) && isTabulated(Date.UTC(2200, 11, 31, 23)));
  assert.ok(!isTabulated(Date.UTC(1799, 11, 31, 23)) && !isTabulated(Date.UTC(2201, 0, 1)));
  // The seams: the last analytic term before the table and the first after it.
  const before = (termMs(TERM_FIRST_YEAR, XIAOHAN) - termMs(TERM_FIRST_YEAR - 1, DONGZHI)) / DAY;
  const after = (termMs(TERM_LAST_YEAR + 1, XIAOHAN) - termMs(TERM_LAST_YEAR, DONGZHI)) / DAY;
  assert.ok(before > 14.5 && before < 15, `1798 → 1799: ${before}`);
  assert.ok(after > 14.5 && after < 15, `2201 → 2202: ${after}`);
  const firstGap = (moonMs(MOON_FIRST_K) - moonMs(MOON_FIRST_K - 1)) / DAY;
  const lastGap = (moonMs(MOON_FIRST_K + MOON_COUNT) - moonMs(MOON_FIRST_K + MOON_COUNT - 1)) / DAY;
  assert.ok(firstGap > 29.2 && firstGap < 29.9 && lastGap > 29.2 && lastGap < 29.9);
  // Far years keep the terms in their seasons (proleptic Gregorian dates).
  for (const year of [1, 600, 1200, 1700, 2300, 2399]) {
    const lichun = new Date(termMs(year, 0));
    assert.equal(lichun.getUTCMonth(), 1, `Lichun ${year} in February`);
    const solstice = new Date(termMs(year, DONGZHI));
    assert.equal(solstice.getUTCMonth(), 11, `Dongzhi ${year} in December`);
    assert.ok(Math.abs(termMs(year, 3) - utcMs(year, 3, 20)) < 3 * DAY, `Chunfen ${year} near 20 March`);
  }
  // Searching across a seam finds the neighbouring terms.
  const seam = Date.UTC(1800, 0, 1);
  assert.equal(termAtOrBefore(seam).term, DONGZHI);
  assert.equal(termAfter(seam).term, XIAOHAN);
});

test("ΔT is the Swiss Ephemeris's within half a second, years 1 to 2399", () => {
  for (const d of SWISS.deltaT) {
    const got = deltaTSeconds(jdFromMs(d.s * 1000));
    assert.ok(Math.abs(got - d.seconds) < 0.5, `ΔT at ${d.s}: ${got} vs ${d.seconds}`);
  }
});

test("the equation of time is the Swiss Ephemeris's within a second, years 1 to 2399", () => {
  for (const e of SWISS.eot) {
    const got = equationOfTimeMinutes(e.s * 1000);
    // Measured: within 0.43 s.
    assert.ok(Math.abs(got - e.minutes) * 60 < 1, `EoT at ${e.s}: ${got} vs ${e.minutes} min`);
  }
});

test("the equation of time has its familiar year: −14 min in mid-February, +16 in early November", () => {
  const at = (m, d) => equationOfTimeMinutes(Date.UTC(2026, m - 1, d, 12));
  assert.ok(Math.abs(at(2, 11) + 14.2) < 0.3, `11 February: ${at(2, 11)}`);
  assert.ok(Math.abs(at(11, 3) - 16.4) < 0.3, `3 November: ${at(11, 3)}`);
  // It crosses zero four times a year: mid-April, mid-June, early September, late December.
  const signs = [];
  for (let d = 0; d < 365; d += 1) signs.push(Math.sign(equationOfTimeMinutes(Date.UTC(2026, 0, 1 + d, 12))));
  const crossings = signs.filter((s, i) => i > 0 && s !== signs[i - 1]).length;
  assert.equal(crossings, 4);
});
