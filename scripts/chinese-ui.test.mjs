/**
 * The Chinese traditions in today's pages (languages plan, part 6): the
 * reader's settings and how a term is written, the solar terms in the
 * Calendar (their words, the year's line, the calendar file) and the terms
 * the engine gives for a year.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHINESE_PREFS_KEY,
  DEFAULT_CHINESE_PREFS,
  chineseLabel,
  cleanChinesePrefs,
  readChinesePrefs,
  setChinesePrefs,
} from "../src/lib/chinese/prefs.ts";
import { SOLAR_TERMS } from "../src/lib/chinese/names.ts";
import { termsOfYear } from "../src/lib/chinese/terms.ts";
import { animalOf, cnWord } from "../src/lib/chinese/words.ts";
import { termDetail, termWord, skyEventTitle, skyEventDetail } from "../src/lib/i18n/calendar-words.ts";
import { yearLayout } from "../src/lib/chart/calendar-year.ts";
import { calendarRows } from "../src/lib/chart/calendar-rows.ts";
import { calendarIcs, icsKeeps } from "../src/lib/i18n/calendar-export.ts";
import { chinese } from "../src/lib/i18n/catalog/chinese.ts";

test("the settings' defaults are the owner's answers, and anything unknown falls back to them", () => {
  assert.deepEqual(DEFAULT_CHINESE_PREFS, { clock: "true-solar", dayBoundary: "23:00", script: "hant", show: "full", animals: "drawings" });
  assert.deepEqual(cleanChinesePrefs(null), DEFAULT_CHINESE_PREFS);
  assert.deepEqual(cleanChinesePrefs({ clock: "civil", dayBoundary: "noon", script: "hans", show: 3, animals: "photos", extra: true }), {
    ...DEFAULT_CHINESE_PREFS,
    clock: "civil",
    script: "hans",
  });
  // No browser (the server, a test): the defaults, never an error.
  assert.deepEqual(readChinesePrefs(), DEFAULT_CHINESE_PREFS);
});

test("the settings are kept in this browser, only where they differ, and told to the open views", () => {
  const data = new Map();
  const heard = [];
  globalThis.window = {
    localStorage: { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) },
    dispatchEvent: (e) => heard.push(e.detail),
  };
  globalThis.CustomEvent ??= class extends Event {
    constructor(type, init) {
      super(type);
      this.detail = init?.detail;
    }
  };
  try {
    setChinesePrefs({ script: "hans" });
    assert.deepEqual(JSON.parse(data.get(CHINESE_PREFS_KEY)), { script: "hans" });
    assert.equal(readChinesePrefs().script, "hans");
    setChinesePrefs({ show: "names", clock: "local-mean", animals: "characters" });
    assert.deepEqual(JSON.parse(data.get(CHINESE_PREFS_KEY)), { clock: "local-mean", script: "hans", show: "names", animals: "characters" });
    setChinesePrefs({ ...DEFAULT_CHINESE_PREFS });
    assert.equal(data.has(CHINESE_PREFS_KEY), false, "back to the defaults: nothing kept");
    assert.equal(heard.length, 3);
    // Garbage in storage reads as the defaults.
    data.set(CHINESE_PREFS_KEY, "{nope");
    assert.deepEqual(readChinesePrefs(), DEFAULT_CHINESE_PREFS);
  } finally {
    delete globalThis.window;
  }
});

test("a term is written as the reader chose: name, pinyin, characters", () => {
  const lichun = SOLAR_TERMS[0];
  assert.equal(chineseLabel(lichun, "en", { script: "hant", show: "full" }).text, "Start of Spring · lìchūn 立春");
  assert.equal(chineseLabel(SOLAR_TERMS[2], "fr", { script: "hans", show: "full" }).text, "Éveil des insectes · jīngzhé 惊蛰");
  assert.equal(chineseLabel(SOLAR_TERMS[2], "fr", { script: "hant", show: "full" }).text, "Éveil des insectes · jīngzhé 驚蟄");
  assert.equal(chineseLabel(lichun, "en", { script: "hant", show: "pinyin" }).text, "Start of Spring · lìchūn");
  assert.deepEqual(chineseLabel(lichun, "fr", { script: "hant", show: "names" }), { name: "Début du printemps", pinyin: null, hanzi: null, text: "Début du printemps" });
});

test("each term says where the Sun is and its place in the solar month", () => {
  // Lichun: the Sun at 15° Aquarius, opening the Tiger month; Chunfen: the middle of the Rabbit month.
  assert.equal(termDetail(0, "en"), "The Sun at 15° Aquarius · Opens the Tiger month");
  assert.equal(termDetail(3, "fr"), "Le Soleil à 0° Bélier · Le milieu du mois du Lapin");
  // The Goat month in French takes its article.
  assert.equal(termDetail(10, "fr"), "Le Soleil à 15° Cancer · Ouvre le mois de la Chèvre");
  // Xiaohan opens the Ox month, the year's last; Dahan is its middle.
  assert.equal(termDetail(22, "en"), "The Sun at 15° Capricorn · Opens the Ox month");
  assert.equal(termDetail(23, "en"), "The Sun at 0° Aquarius · The middle of the Ox month");
  assert.equal(animalOf(2, "fr"), "du Tigre");
  assert.equal(termWord(17, "en"), "Frost’s Descent · shuāngjiàng 霜降");
  const ev = { k: "term", t: Date.UTC(2026, 9, 23, 3, 37), term: 17 };
  assert.equal(skyEventTitle(ev, "fr", () => "", () => ""), "Descente du givre · shuāngjiàng 霜降");
  assert.equal(skyEventDetail(ev, "en", () => ""), "The Sun at 0° Scorpio · The middle of the Dog month");
  for (const [key, [en, fr]] of Object.entries(chinese)) assert.ok(en.trim() && fr.trim() && cnWord("fr", key) === fr, key);
});

test("the Calendar's terms come from the engine: 24 a year, in order, from Xiaohan to Dongzhi", () => {
  const year = termsOfYear(2026).filter((m) => new Date(m.ms).getUTCFullYear() === 2026);
  assert.equal(year.length, 24);
  assert.deepEqual(
    year.map((m) => m.term),
    [22, 23, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
  );
  for (let i = 1; i < year.length; i += 1) assert.ok(year[i].ms > year[i - 1].ms);
  // Lichun 2026 on 4 February (Beijing time), as the Hong Kong Observatory publishes it.
  const lichun = year.find((m) => m.term === 0);
  assert.equal(new Date(lichun.ms + 8 * 3_600_000).toISOString().slice(0, 10), "2026-02-04");
});

test("the year's line holds the terms, and the calendar file keeps them", () => {
  const events = termsOfYear(2026).map((m) => ({ k: "term", t: m.ms, term: m.term }));
  const layout = yearLayout(2026, "UTC", events, [], []);
  assert.equal(layout.terms.length, 24);
  const rows = calendarRows(events, [], Date.UTC(2026, 0, 1), Date.UTC(2027, 0, 1), { layers: { terms: true }, moon: false });
  assert.equal(rows.length, 24);
  assert.ok(rows.every((r) => icsKeeps(r, "main")), "a term is worth a calendar's day");
  const ics = calendarIcs(rows, [], "en", "UTC", "", { kind: "main" }).replace(/\r\n /g, "");
  assert.match(ics, /SUMMARY:Start of Spring · lìchūn 立春/);
  assert.match(ics, /UID:term-0-\d+@ulune\.app/);
});
