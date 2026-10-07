/*
 * The Chinese calendar engine against outside references:
 *  - the Hong Kong Observatory's Gregorian–lunar tables, 34 years from 1901
 *    to 2100 chosen for their leap months and their hard cases (new moons and
 *    principal terms within minutes of midnight, the change of meridian),
 *    every day and every solar term's date (scripts/fixtures/chinese/hko-calendar.json);
 *  - HKO's published times of the principal terms 2022–2027, the National
 *    Astronomical Observatory of Japan's 24 terms 2025–2027 and the US Naval
 *    Observatory's new moons and seasons 1800–2100, to the minute
 *    (scripts/fixtures/chinese/minute-references.json).
 * Each disagreement is listed below with its reason, and the test checks the
 * reason holds; anything else fails.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { calendarDayOf, lunarDateOfDay } from "../src/lib/chinese/lunar.ts";
import { moonAtOrBefore, moonMs, termMs } from "../src/lib/chinese/terms.ts";

const HKO = JSON.parse(readFileSync(new URL("./fixtures/chinese/hko-calendar.json", import.meta.url), "utf8"));
const MINUTE = JSON.parse(readFileSync(new URL("./fixtures/chinese/minute-references.json", import.meta.url), "utf8"));
const DAY = 86_400_000;
const MONTHS = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
/** HKO's terms in the Gregorian year's order, and their index in terms.ts (0 = Lichun). */
const TERMS = ["小寒", "大寒", "立春", "雨水", "驚蟄", "春分", "清明", "穀雨", "立夏", "小滿", "芒種", "夏至", "小暑", "大暑", "立秋", "處暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"];
const termIndex = (name) => (TERMS.indexOf(name) + 22) % 24;
const iso = (n) => new Date(n * DAY).toISOString().slice(0, 10);

/** 初一 … 三十 as numbers. */
function lunarDay(text) {
  const digits = "一二三四五六七八九";
  if (text === "初十") return 10;
  if (text === "二十") return 20;
  if (text === "三十") return 30;
  const unit = digits.indexOf(text[1]) + 1;
  return { 初: 0, 十: 10, 廿: 20 }[text[0]] + unit;
}

function parse(lines) {
  return lines.map((line) => {
    const [date, label, weekday, term] = line.split(" ");
    const [, y, m, d] = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(date);
    const day = Date.UTC(+y, +m - 1, +d) / DAY;
    // The transcription keeps the weekday, a check that each line was copied whole.
    assert.equal(weekday, `星期${"日一二三四五六"[new Date(day * DAY).getUTCDay()]}`, line);
    const plain = label.replace(/^閏/, "");
    const month = MONTHS.indexOf(plain) + 1;
    return { day, line, month: month || null, leap: label.startsWith("閏"), lunarDay: month ? 1 : lunarDay(label), term };
  });
}

/*
 * Where the engine and HKO differ, and why. Lunar months by their first
 * HKO day; terms by year and name.
 *  - 2057, 2097, 2084: the new moon or term falls 30–90 s after midnight
 *    (UTC+8) by the Swiss Ephemeris with today's forecast of ΔT; HKO's tables,
 *    computed years ago, assume the Earth slows faster (a ΔT a minute or two
 *    larger), which puts it before midnight. Nobody can know which is right
 *    until the time comes; the engine keeps one ephemeris and one ΔT.
 *  - 1979 Dahan: 5 s before midnight; HKO times its terms to the minute and
 *    dates the rounded time (00:00 on the 21st).
 *  - 1912 Xiaoxue: the calendar for 1912 was computed by the Qing observatory
 *    with the astronomy of its day, 12 minutes from the true instant.
 */
const MONTH_EXCEPTIONS = {
  "2057-09-28": { hko: "九月", minutesAfterMidnight: [0, 2] },
  "2097-08-07": { hko: "七月", minutesAfterMidnight: [0, 2] },
};
const TERM_EXCEPTIONS = {
  "1912 小雪": { maxMinutesFromMidnight: 15 },
  "1979 大寒": { maxMinutesFromMidnight: 0.5 },
  "2084 春分": { maxMinutesFromMidnight: 2 },
};

/** Minutes from the nearest midnight of the calendar's clock, signed (positive: after midnight). */
function fromMidnight(ms) {
  const local = ms - calendarDayOf(ms) * DAY + (ms >= Date.UTC(1912, 11, 31, 16, 14, 20) && ms < Date.UTC(1928, 11, 31, 16) ? (116 + 25 / 60) * 4 * 60_000 : 8 * 3_600_000);
  const minutes = local / 60_000;
  return minutes > 720 ? minutes - 1440 : minutes;
}

test("every day of 34 years of the Hong Kong Observatory's tables (1901–2100) has the engine's lunar date", () => {
  let days = 0;
  const differing = new Set();
  for (const [year, lines] of Object.entries(HKO.years)) {
    const rows = parse(lines);
    const starts = rows.filter((r) => r.month).sort((a, b) => a.day - b.day);
    const jan1 = rows.find((r) => r.day === Date.UTC(+year, 0, 1) / DAY);
    assert.ok(jan1, `${year}: the line of 1 January`);
    // The month running on 1 January began before it: its day numbers, then every labelled month.
    const first = starts[0].day;
    const runningStart = jan1.day - jan1.lunarDay + 1;
    for (let d = jan1.day; d < first; d += 1) {
      const mine = lunarDateOfDay(d);
      assert.equal(mine.day, d - runningStart + 1, `${iso(d)}: day of the month`);
      days += 1;
    }
    const end = Date.UTC(+year, 11, 31) / DAY;
    for (let d = first; d <= end; d += 1) {
      const m = starts.filter((s) => s.day <= d).at(-1);
      const want = { month: m.month, leap: m.leap, day: d - m.day + 1 };
      const mine = lunarDateOfDay(d);
      days += 1;
      if (mine.month !== want.month || mine.leap !== want.leap || mine.day !== want.day) {
        const key = iso(m.day);
        assert.ok(key in MONTH_EXCEPTIONS, `${iso(d)}: HKO ${m.leap ? "閏" : ""}${MONTHS[m.month - 1]} ${want.day}, engine ${mine.leap ? "leap " : ""}${mine.month}/${mine.day}`);
        differing.add(key);
      }
    }
    // Every term line agrees with the term's lunar day too.
    for (const r of rows.filter((r) => r.term)) assert.ok(TERMS.includes(r.term), r.line);
  }
  assert.ok(days > 11_900, `${days} days compared`);
  // Each listed exception really differs, and for the stated reason: the
  // engine's new moon is just after midnight, HKO's a day earlier.
  assert.deepEqual([...differing].sort(), Object.keys(MONTH_EXCEPTIONS).sort());
  for (const [date, why] of Object.entries(MONTH_EXCEPTIONS)) {
    const hkoStart = Date.parse(`${date}T00:00:00Z`);
    const nm = moonMs(moonAtOrBefore(hkoStart + 2 * DAY));
    const after = fromMidnight(nm);
    assert.equal(iso(calendarDayOf(nm)), iso(hkoStart / DAY + 1));
    assert.ok(after >= why.minutesAfterMidnight[0] && after <= why.minutesAfterMidnight[1], `${date}: new moon ${after.toFixed(2)} min after midnight`);
  }
});

test("every solar term falls on HKO's date, 34 years", () => {
  let terms = 0;
  const differing = new Set();
  for (const [year, lines] of Object.entries(HKO.years)) {
    const rows = parse(lines).filter((r) => r.term);
    assert.equal(rows.length, 24, `${year}: 24 terms`);
    for (const r of rows) {
      const ms = termMs(+year, termIndex(r.term));
      terms += 1;
      if (calendarDayOf(ms) !== r.day) {
        const key = `${year} ${r.term}`;
        assert.ok(key in TERM_EXCEPTIONS, `${key}: HKO ${iso(r.day)}, engine ${new Date(ms).toISOString()}`);
        assert.ok(Math.abs(fromMidnight(ms)) <= TERM_EXCEPTIONS[key].maxMinutesFromMidnight, `${key}: ${fromMidnight(ms).toFixed(2)} min from midnight`);
        assert.equal(Math.abs(calendarDayOf(ms) - r.day), 1);
        differing.add(key);
      }
    }
  }
  assert.equal(terms, 34 * 24);
  assert.deepEqual([...differing].sort(), Object.keys(TERM_EXCEPTIONS).sort());
});

test("HKO's times of the principal terms 2022–2027 agree to the minute", () => {
  // Dahan, Yushui, Chunfen … Dongzhi: terms 23, 1, 3 … 21.
  const order = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  let worst = 0;
  for (const [year, times] of Object.entries(MINUTE.hkoMajorTerms.years)) {
    times.forEach((text, i) => {
      const [, d, m, hh, mm] = /^(\d+)\/(\d+) (\d+):(\d+)$/.exec(text).map(Number);
      const hko = Date.UTC(+year, m - 1, d, hh - 8, mm);
      const off = Math.abs(termMs(+year, order[i]) - hko) / 1000;
      worst = Math.max(worst, off);
      // HKO rounds to the minute: the true instant is within 30 s of its time.
      assert.ok(off <= 30.5, `${year} ${text}: ${off.toFixed(1)} s`);
    });
  }
  assert.ok(worst > 0);
});

test("the National Astronomical Observatory of Japan's 24 terms 2025–2027, jie included, agree to the minute", () => {
  for (const [year, times] of Object.entries(MINUTE.naojTerms.years)) {
    assert.equal(times.length, 24);
    times.forEach((text, slot) => {
      const [, m, d, hh, mm] = /^(\d+)-(\d+) (\d+):(\d+)$/.exec(text).map(Number);
      const naoj = Date.UTC(+year, m - 1, d, hh - 9, mm);
      const term = (slot + 22) % 24; // Xiaohan first
      const off = Math.abs(termMs(+year, term) - naoj) / 1000;
      assert.ok(off <= 30.5, `${year} ${text} JST: ${off.toFixed(1)} s`);
    });
  }
});

test("the US Naval Observatory's new moons and seasons 1800–2100 agree within a minute", () => {
  for (const [year, list] of Object.entries(MINUTE.usnoNewMoons.years)) {
    for (const text of list) {
      const usno = Date.parse(`${year}-${text.replace(" ", "T")}:00Z`);
      const k = moonAtOrBefore(usno + DAY / 2);
      const near = [moonMs(k), moonMs(k - 1)].sort((a, b) => Math.abs(a - usno) - Math.abs(b - usno))[0];
      // USNO's minute rounding (30 s) and its own ΔT and lunar theory: measured within 50 s.
      assert.ok(Math.abs(near - usno) <= 60_000, `${year}-${text}: ${(near - usno) / 1000} s`);
    }
  }
  for (const [year, list] of Object.entries(MINUTE.usnoSeasons.years)) {
    [3, 9, 15, 21].forEach((term, i) => {
      const usno = Date.parse(`${year}-${list[i].replace(" ", "T")}:00Z`);
      assert.ok(Math.abs(termMs(+year, term) - usno) <= 60_000, `${year}-${list[i]}: ${(termMs(+year, term) - usno) / 1000} s`);
    });
  }
});
