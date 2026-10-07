/*
 * Builds the Chinese calendar's time table: the exact moment of every solar
 * term and every new moon from 1799 to 2201, computed with the Swiss
 * Ephemeris and the ephemeris files the charts already use (ephe/, built on
 * JPL DE441), so the Chinese pages agree with the natal wheel to the second.
 *
 *   node scripts/chinese/build-time-table.mjs          writes the two modules
 *   node scripts/chinese/build-time-table.mjs --check  only checks they are current
 *
 * It writes src/lib/chinese/time-table.ts (terms and new moons) and
 * src/lib/chinese/delta-t.ts (Swiss's ΔT every five years, for the dates the
 * table does not cover). Both are generated: edit this script, not them.
 *
 * Definitions (those of the modern Chinese calendar, GB/T 33661-2017):
 * a solar term is the instant the Sun's apparent geocentric ecliptic
 * longitude (true equinox and ecliptic of date: nutation, aberration and
 * light-time included) reaches a multiple of 15°; a new moon is the instant
 * the apparent longitudes of the Moon and the Sun are equal. Times are
 * universal time (UT1, which civil UTC follows to within 0.9 s), with Swiss
 * Ephemeris's own ΔT, rounded to the nearest second and stored as seconds
 * since 1970 like a JavaScript date.
 */
import SwissEPH from "sweph-wasm";
import createModule from "sweph-wasm/wasm/swisseph";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = new URL("../..", import.meta.url).pathname;
const OUT_TABLE = join(ROOT, "src/lib/chinese/time-table.ts");
const OUT_DELTA_T = join(ROOT, "src/lib/chinese/delta-t.ts");
const CHECK = process.argv.includes("--check");

/** Gregorian years whose 24 terms are tabulated. A year either side of 1800–2200, so every date in that range is resolved from the table alone (the lunar months of early 1800 hang on the winter solstice of 1799). */
const FIRST_YEAR = 1799;
const LAST_YEAR = 2201;
/** New moons from this date to MOONS_TO (UT), with the same margin. */
const MOONS_FROM = [1798, 12, 1];
const MOONS_TO = [2202, 2, 1];
/** ΔT knots: every 5 years over the app's date range (years 1–2399) and a little beyond. */
const DT_FIRST = -100;
const DT_LAST = 2500;
const DT_STEP = 5;

/*
 * Constants of the encoding, shared with the decoder in terms.ts. A term
 * comes back about one tropical year after the same term a year earlier,
 * and a new moon one mean synodic month after the last, so only the small
 * remainders are stored.
 */
const YEAR_S = 31556925;
const MONTH_S = 2551443;
/** Lunation lengths repeat with the Moon's anomaly (about 14 months) and the Sun's (12): predicting each from those lags leaves remainders of a few minutes. */
const LAG_A = 14;
const LAG_B = 12;

const UNIX_JD = 2440587.5;
const J2000 = 2451545.0;
/** Meeus's lunation number 0 is the new moon of 6 January 2000; terms.ts uses the same count. */
const MEEUS_K0_JDE = 2451550.09766;
const SYNODIC_DAYS = 29.530588861;

// ── The Swiss Ephemeris, loaded as calculate.server.ts loads it ─────────────

const REQUIRED_EPHE = ["sepl_18.se1", "semo_18.se1", "sepl_12.se1", "semo_12.se1"];

async function loadSwiss() {
  const dir = join(ROOT, "ephe");
  const files = readdirSync(dir).filter((n) => n.endsWith(".se1") && statSync(join(dir, n)).size >= 1024);
  for (const name of REQUIRED_EPHE) {
    if (!files.includes(name)) throw new Error(`ephe/${name} is missing (or a Git LFS pointer): the table needs the real file.`);
  }
  const wasmFile = join(ROOT, "node_modules/sweph-wasm/dist/wasm/swisseph.wasm");
  if (!existsSync(wasmFile)) throw new Error("node_modules/sweph-wasm is missing: install the project's dependencies first.");
  const wasm = await createModule({ wasmBinary: readFileSync(wasmFile) });
  try {
    wasm.FS.mkdir("/ephe");
  } catch {
    /* exists */
  }
  for (const name of files) {
    wasm.FS.createDataFile("/ephe", name, Uint8Array.from(readFileSync(join(dir, name))), true, true, true);
  }
  const swe = new SwissEPH(wasm);
  const ptr = wasm._malloc(16);
  wasm.stringToUTF8("/ephe", ptr, 16);
  wasm._swe_set_ephe_path(ptr);
  wasm._free(ptr);
  return { swe, wasm };
}

const { swe, wasm } = await loadSwiss();
const FLAGS = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

/**
 * swe_calc_ut that also reads the flags Swiss really used: if no file covered
 * the date it would fall back to its Moshier series without saying so, and a
 * table built that way would be quietly less exact.
 */
function calcUt(jdUt, body) {
  const xx = wasm._malloc(6 * 8);
  const serr = wasm._malloc(256);
  try {
    wasm.setValue(serr, 0, "i8");
    const flag = wasm._swe_calc_ut(jdUt, body, FLAGS, xx, serr);
    if (flag < 0) throw new Error(wasm.UTF8ToString(serr) || `Swiss Ephemeris failed for body ${body}`);
    if ((flag & swe.SEFLG_SWIEPH) === 0) throw new Error(`No ephemeris file covers JD ${jdUt}: Swiss fell back to Moshier.`);
    return { lon: wasm.getValue(xx, "double"), speed: wasm.getValue(xx + 3 * 8, "double") };
  } finally {
    wasm._free(xx);
    wasm._free(serr);
  }
}

const wrap180 = (x) => ((((x + 180) % 360) + 360) % 360) - 180;

/** The instant (JD UT) the Sun's apparent longitude reaches `lon`, by Newton's method from a guess within a few days. */
function sunCrossing(lon, guess) {
  let jd = guess;
  for (let i = 0; i < 30; i += 1) {
    const sun = calcUt(jd, swe.SE_SUN);
    const step = wrap180(sun.lon - lon) / sun.speed;
    jd -= step;
    // A step under a millisecond leaves an error far smaller still (Newton
    // converges quadratically); a JD near 2.4 million cannot resolve much less.
    if (Math.abs(step) < 1e-8) return jd;
  }
  throw new Error(`The Sun's crossing of ${lon}° near JD ${guess} did not converge.`);
}

/** The new moon (JD UT) nearest a guess within about ten days. */
function newMoon(guess) {
  let jd = guess;
  for (let i = 0; i < 40; i += 1) {
    const sun = calcUt(jd, swe.SE_SUN);
    const moon = calcUt(jd, swe.SE_MOON);
    const step = wrap180(moon.lon - sun.lon) / (moon.speed - sun.speed);
    jd -= step;
    if (Math.abs(step) < 1e-8) return jd;
  }
  throw new Error(`The new moon near JD ${guess} did not converge.`);
}

const toSeconds = (jd) => Math.round((jd - UNIX_JD) * 86400);
const julday = (y, m, d) => swe.swe_julday(y, m, d, 0, swe.SE_GREG_CAL);

// ── The moments ─────────────────────────────────────────────────────────────

/** terms[y - FIRST_YEAR][g]: g = 0 is Xiaohan (285°, early January), then every 15° to Dongzhi (270°). */
const terms = [];
for (let y = FIRST_YEAR; y <= LAST_YEAR; y += 1) {
  const row = [];
  for (let g = 0; g < 24; g += 1) {
    const jd = sunCrossing((285 + 15 * g) % 360, julday(y, 1, 6) + 15.2184 * g);
    row.push(toSeconds(jd));
  }
  terms.push(row);
}

const moonsFrom = julday(...MOONS_FROM);
const moonsTo = julday(...MOONS_TO);
const firstK = Math.ceil((moonsFrom - MEEUS_K0_JDE) / SYNODIC_DAYS) - 1;
const moons = [];
let moonK0 = null;
for (let k = firstK; ; k += 1) {
  const jd = newMoon(MEEUS_K0_JDE + SYNODIC_DAYS * k);
  if (jd < moonsFrom) continue;
  if (jd >= moonsTo) break;
  if (moonK0 === null) moonK0 = k;
  moons.push(toSeconds(jd));
}

// ── Checks before anything is written ───────────────────────────────────────

for (let y = 0; y < terms.length; y += 1) {
  for (let g = 0; g < 24; g += 1) {
    const t = terms[y][g];
    const date = new Date(t * 1000);
    if (date.getUTCFullYear() !== FIRST_YEAR + y) throw new Error(`Term ${g} of ${FIRST_YEAR + y} fell in another year.`);
    if (g > 0) {
      const gap = (t - terms[y][g - 1]) / 86400;
      if (gap < 14.6 || gap > 15.9) throw new Error(`Terms ${g - 1}→${g} of ${FIRST_YEAR + y} are ${gap.toFixed(2)} days apart.`);
    }
  }
}
for (let i = 1; i < moons.length; i += 1) {
  const gap = (moons[i] - moons[i - 1]) / 86400;
  if (gap < 29.1 || gap > 30.0) throw new Error(`New moons ${i - 1}→${i} are ${gap.toFixed(3)} days apart.`);
}

// ── Encoding: small integer remainders, low and high bytes in two planes ────

/** Int16 values as base64, the low bytes of all values first, then the high bytes: gzip finds far more repetition that way. */
function packInt16(values) {
  const n = values.length;
  const bytes = Buffer.alloc(n * 2);
  values.forEach((v, i) => {
    if (!Number.isInteger(v) || v < -32768 || v > 32767) throw new Error(`Remainder ${v} does not fit 16 bits.`);
    const u = v & 0xffff;
    bytes[i] = u & 0xff;
    bytes[n + i] = u >> 8;
  });
  return bytes.toString("base64");
}

function unpackInt16(text) {
  const bytes = Buffer.from(text, "base64");
  const n = bytes.length / 2;
  const out = new Array(n);
  for (let i = 0; i < n; i += 1) {
    const u = bytes[i] | (bytes[n + i] << 8);
    out[i] = u >= 0x8000 ? u - 0x10000 : u;
  }
  return out;
}

const termFirst = terms[0];
const termRemainders = [];
for (let y = 1; y < terms.length; y += 1) {
  for (let g = 0; g < 24; g += 1) termRemainders.push(terms[y][g] - terms[y - 1][g] - YEAR_S);
}

const lengths = [];
for (let i = 1; i < moons.length; i += 1) lengths.push(moons[i] - moons[i - 1] - MONTH_S);
const lagSpan = LAG_A + LAG_B;
const moonRemainders = lengths.map((v, i) =>
  i >= lagSpan ? v - (lengths[i - LAG_A] + lengths[i - LAG_B] - lengths[i - lagSpan]) : v,
);

const termsPacked = packInt16(termRemainders);
const moonsPacked = packInt16(moonRemainders);

// Decode exactly as terms.ts will, and insist on a perfect round trip.
{
  const tr = unpackInt16(termsPacked);
  let prev = termFirst.slice();
  for (let y = 1; y < terms.length; y += 1) {
    const row = prev.map((t, g) => t + YEAR_S + tr[(y - 1) * 24 + g]);
    row.forEach((t, g) => {
      if (t !== terms[y][g]) throw new Error(`Term round trip failed at ${FIRST_YEAR + y}/${g}.`);
    });
    prev = row;
  }
  const mr = unpackInt16(moonsPacked);
  const len = [];
  let t = moons[0];
  for (let i = 0; i < mr.length; i += 1) {
    const l = i >= lagSpan ? mr[i] + len[i - LAG_A] + len[i - LAG_B] - len[i - lagSpan] : mr[i];
    len.push(l);
    t += MONTH_S + l;
    if (t !== moons[i + 1]) throw new Error(`New moon round trip failed at ${i + 1}.`);
  }
}

// ── ΔT knots ────────────────────────────────────────────────────────────────

const deltaT = [];
for (let y = DT_FIRST; y <= DT_LAST; y += DT_STEP) {
  const jd = J2000 + (y - 2000) * 365.2425;
  deltaT.push(Math.round(swe.swe_deltat(jd) * 86400 * 10));
}

// ── The modules ─────────────────────────────────────────────────────────────

const version = swe.swe_version();
/** Base64 in lines of 100 inside a template string: the decoder drops the line breaks, and gzip loses less than with joined strings. */
const wrap = (text, width = 100) => `\`\n${text.match(new RegExp(`.{1,${width}}`, "g")).join("\n")}\n\``;

const tableSource = `/*
 * Generated by scripts/chinese/build-time-table.mjs: do not edit by hand.
 *
 * The exact moments of the 24 solar terms of every year ${FIRST_YEAR}–${LAST_YEAR} and of
 * every new moon from ${MOONS_FROM.join("-")} to ${MOONS_TO.join("-")}, from the Swiss Ephemeris ${version}
 * and the DE441 files in ephe/: apparent geocentric longitudes of date, UT to
 * the second (seconds since 1970). terms.ts decodes them; README.md explains.
 */

/** Gregorian years whose 24 terms are here, Xiaohan (285°) first. */
export const TERM_FIRST_YEAR = ${FIRST_YEAR};
export const TERM_LAST_YEAR = ${LAST_YEAR};

/** The ${FIRST_YEAR} terms, seconds since 1970 (UT), Xiaohan first. */
export const TERM_FIRST_ROW: readonly number[] = [${termFirst.join(", ")}];

/** Each later term minus the same term a year before, minus ${YEAR_S} s: int16, low bytes then high bytes, base64. */
export const TERM_REMAINDERS =
${wrap(termsPacked)};

/** Meeus's lunation number of the first new moon here (0 is the new moon of 6 January 2000). */
export const MOON_FIRST_K = ${moonK0};
/** The first new moon, seconds since 1970 (UT). */
export const MOON_FIRST = ${moons[0]};
/** How many new moons are here. */
export const MOON_COUNT = ${moons.length};

/**
 * Each lunation's length minus ${MONTH_S} s, less its prediction from the lunations
 * ${LAG_A} and ${LAG_B} before (minus the one ${lagSpan} before): int16, low then high bytes, base64.
 */
export const MOON_REMAINDERS =
${wrap(moonsPacked)};

/** The encoding's constants, which the decoder must share. */
export const TABLE_CODE = { yearSeconds: ${YEAR_S}, monthSeconds: ${MONTH_S}, lagA: ${LAG_A}, lagB: ${LAG_B} } as const;

/** Where the moments come from, for the method notes. */
export const TABLE_SOURCE = "Swiss Ephemeris ${version}, JPL DE441" as const;
`;

const deltaTSource = `/*
 * Generated by scripts/chinese/build-time-table.mjs: do not edit by hand.
 *
 * ΔT (TT − UT, the slowing Earth's lag behind uniform time) as the Swiss
 * Ephemeris ${version} has it, every ${DT_STEP} years from ${DT_FIRST} to ${DT_LAST}, in tenths of a second.
 * astro.ts interpolates it for the dates the time table does not cover, so
 * the calendar there uses the same ΔT as the natal charts.
 */

/** The year of the first knot (a decimal year: J2000 + (year − 2000) × 365.2425 days). */
export const DELTA_T_FIRST_YEAR = ${DT_FIRST};
/** Years between knots. */
export const DELTA_T_STEP = ${DT_STEP};
/** ΔT at each knot, tenths of a second. */
export const DELTA_T_TENTHS: readonly number[] = [
${deltaT.join(", ").match(/.{1,96}(, |$)/g).map((l) => `  ${l.trim()}`).join("\n")}
];
`;

if (CHECK) {
  // Layout aside (a formatter may rewrap the arrays): the same text, the same data.
  const canon = (text) => text.replace(/\s+/g, "").replace(/,([\]}])/g, "$1");
  const same = (file, text) => existsSync(file) && canon(readFileSync(file, "utf8")) === canon(text);
  const stale = [OUT_TABLE, OUT_DELTA_T].filter((f, i) => !same(f, i === 0 ? tableSource : deltaTSource));
  if (stale.length) {
    console.error(`Out of date: ${stale.join(", ")}. Run node scripts/chinese/build-time-table.mjs.`);
    process.exit(1);
  }
  console.log("The time table and ΔT knots are current.");
} else {
  writeFileSync(OUT_TABLE, tableSource);
  writeFileSync(OUT_DELTA_T, deltaTSource);
  const raw = Buffer.byteLength(tableSource);
  console.log(
    `${terms.length * 24} terms (${FIRST_YEAR}–${LAST_YEAR}), ${moons.length} new moons, Swiss ${version}.`,
    `time-table.ts ${raw} B raw, ${gzipSync(tableSource, { level: 9 }).length} B gzip;`,
    `delta-t.ts ${Buffer.byteLength(deltaTSource)} B raw, ${gzipSync(deltaTSource, { level: 9 }).length} B gzip.`,
  );
}
