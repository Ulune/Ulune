/**
 * The Chinese languages' method notes (languages plan, part 29;
 * src/lib/chinese/method-notes.ts): the notes a birth calls for, only when
 * they apply (born between 23:00 and 01:00 under each day rule, outside the
 * table's 1800–2200, a pillar within minutes of its change, the two New Years
 * the calendar's choices move), and each language's "How Ulune calculates",
 * naming its school; in English and French, with the house's typography and
 * tone. Made-up births only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { howUluneCalculates, methodNotesOf, noteLine } from "../src/lib/chinese/method-notes.ts";
import { SIXTY } from "../src/lib/chinese/names.ts";
import { fourPillars } from "../src/lib/chinese/pillars.ts";
import { chineseLabel } from "../src/lib/chinese/prefs.ts";
import { LICHUN, termMs } from "../src/lib/chinese/terms.ts";
import { TABLE_SOURCE } from "../src/lib/chinese/time-table.ts";
import { birthMomentOf } from "../src/lib/chinese/zodiac.ts";
import { chinese } from "../src/lib/i18n/catalog/chinese.ts";

const PAGES = ["zodiac", "zodiac-pair", "bazi", "bazi-luck", "bazi-pair", "fengshui", "fengshui-pair", "fengshui-home"];
const RULES = ["23:00", "split", "midnight"];
const LOCALES = ["en", "fr"];
const prefs = (o = {}) => ({ clock: "true-solar", dayBoundary: "23:00", script: "hant", show: "full", ...o });
const notes = (birth, page, o = {}, locale = "en", who) => methodNotesOf(birth, page, prefs(o), locale, who);
const ids = (list) => list.map((n) => n.id);
/** Every line the tests produce, for the typography and tone checks at the end. */
const SAID = { en: new Set(), fr: new Set() };
const keep = (list, locale) => {
  for (const n of list) SAID[locale].add(noteLine(n));
  return list;
};

// A birth from its UT instant and longitude, its local date and time given at UT + offset (minutes).
function birth(iso, longitude, offset = 0, timeUnknown = false) {
  const ms = Date.parse(iso);
  const local = new Date(ms + offset * 60_000).toISOString();
  return { utc: new Date(ms).toISOString(), date: local.slice(0, 10), time: local.slice(11, 16), longitude, timeUnknown };
}
// A usual birth: 15 June 1990, 12:00 in a made-up town at Paris's longitude (UTC+2).
const USUAL = birth("1990-06-15T10:00:00Z", 2.35, 120);
// At the Greenwich meridian on 15 April, when the equation of time is near nought: the clock is the Sun's.
const LATE = birth("2001-04-15T23:30:00Z", 0);
const EARLY = birth("2001-04-15T00:30:00Z", 0);
const dayLabel = (b, rule, locale = "en") => chineseLabel(SIXTY[fourPillars(birthMomentOf(b), { dayBoundary: rule }).day.cycle], locale, prefs()).text;

test("a usual birth has no note, on any page, clock or day rule", () => {
  for (const page of PAGES) {
    for (const locale of LOCALES) {
      for (const dayBoundary of RULES) {
        for (const clock of ["true-solar", "local-mean", "civil"]) assert.deepEqual(notes(USUAL, page, { dayBoundary, clock }, locale), [], `${page} ${locale} ${dayBoundary} ${clock}`);
      }
    }
  }
});

test("born at 23:30: the reader's day rule, the day pillar, and what the other rule gives", () => {
  const today = dayLabel(LATE, "midnight");
  const tomorrow = dayLabel(LATE, "23:00");
  assert.notEqual(today, tomorrow);
  assert.equal(dayLabel(LATE, "split"), today, "the split Rat hour keeps the day until midnight");
  const [zp] = keep(notes(LATE, "bazi"), "en");
  assert.deepEqual({ id: zp.id, settings: zp.settings, lead: zp.lead }, { id: "day-boundary", settings: true, lead: undefined });
  assert.equal(
    zp.text,
    `Born at 23:30 by true solar time, in the Rat hour before midnight: by the Zi Ping rule, followed here, the day has already turned, so your day pillar is the next day’s, ${tomorrow}. If the day turned at midnight, as in other schools, it would be ${today}.`,
  );
  const [mid] = keep(notes(LATE, "bazi", { dayBoundary: "midnight" }), "en");
  assert.match(mid.text, /with the day turning at midnight, as you chose/);
  assert.ok(mid.text.includes(`your day pillar is ${today}.`) && mid.text.includes(`it would be the next day’s, ${tomorrow}.`), mid.text);
  const [split] = keep(notes(LATE, "bazi", { dayBoundary: "split" }), "en");
  assert.match(split.text, /with the Rat hour split, as you chose/);
  assert.ok(split.text.includes(`stays ${today} until midnight`) && split.text.includes(tomorrow), split.text);
  // Chinese astrology says it of the day animal; Feng Shui, which reads the year alone, says nothing.
  assert.match(keep(notes(LATE, "zodiac"), "en")[0].text, /your day animal is the next day’s/);
  assert.match(keep(notes(LATE, "zodiac-pair"), "en")[0].text, /your day animal is the next day’s/);
  for (const page of ["bazi-luck", "bazi-pair"]) assert.deepEqual(ids(notes(LATE, page)), ["day-boundary"], page);
  for (const page of ["fengshui", "fengshui-pair", "fengshui-home"]) assert.deepEqual(notes(LATE, page), [], page);
  // In French, the hour as French writes it, and each rule.
  for (const dayBoundary of RULES) {
    const [fr] = keep(notes(LATE, "bazi", { dayBoundary }, "fr"), "fr");
    assert.ok(fr.text.startsWith("Naissance à 23\u202fh\u202f30 en temps solaire vrai, dans l’heure du Rat avant minuit\u202f: "), fr.text);
    assert.ok(fr.text.includes(dayLabel(LATE, dayBoundary === "23:00" ? "23:00" : "midnight", "fr")), fr.text);
    assert.ok(fr.text.includes(dayLabel(LATE, dayBoundary === "23:00" ? "midnight" : "23:00", "fr")), fr.text);
  }
});

test("born at 00:30: the three rules agree, and the note says so", () => {
  const day = dayLabel(EARLY, "23:00");
  for (const dayBoundary of RULES) {
    assert.equal(dayLabel(EARLY, dayBoundary), day, dayBoundary);
    const [en] = keep(notes(EARLY, "bazi", { dayBoundary }), "en");
    assert.equal(en.text, `Born at 00:29 by true solar time (00:30 on the clock), in the Rat hour after midnight: every school counts the new day here, so your day pillar is ${day} whichever rule you choose.`);
    assert.equal(en.settings, true);
    const [fr] = keep(notes(EARLY, "zodiac", { dayBoundary }, "fr"), "fr");
    assert.ok(fr.text.startsWith("Naissance à 0\u202fh\u202f29 en temps solaire vrai (0\u202fh\u202f30 à la pendule), dans l’heure du Rat après minuit\u202f: "), fr.text);
    assert.ok(fr.text.includes(`votre animal du jour est ${dayLabel(EARLY, dayBoundary, "fr")}, quelle que soit la règle choisie.`), fr.text);
  }
  // 01:30 is the Ox hour: no note.
  assert.deepEqual(notes(birth("2001-04-15T01:30:00Z", 0), "bazi"), []);
});

test("the note follows the clock the pillars are read on", () => {
  // Oslo-like, 23:10 on the clock in winter (UTC+1) at 10.75° E: 23:09 by the Sun, 22:53 by local mean time.
  const b = birth("1987-11-03T22:10:00Z", 10.75, 60);
  assert.ok(keep(notes(b, "bazi"), "en")[0].text.startsWith("Born at 23:09 by true solar time (23:10 on the clock), "));
  assert.deepEqual(notes(b, "bazi", { clock: "local-mean" }), [], "22:53 by local mean time is not the Rat hour");
  assert.ok(keep(notes(b, "bazi", { clock: "civil" }), "en")[0].text.startsWith("Born at 23:10 on the clock, in the Rat hour"));
  assert.ok(keep(notes(b, "bazi", { clock: "civil" }, "fr"), "fr")[0].text.startsWith("Naissance à 23\u202fh\u202f10 à la pendule, "));
  // On the zone's own meridian (15° E in UTC+1), local mean time is the clock's: the minute is said once.
  const east = birth("2001-04-15T22:30:00Z", 15, 60);
  assert.ok(keep(notes(east, "bazi", { clock: "local-mean" }), "en")[0].text.startsWith("Born at 23:30 by local mean time, "), "the same minute on both clocks says it once");
  // A page of two names each person, and says whose pillar it is.
  const [named] = keep(notes(b, "bazi-pair", {}, "en", "Sample B"), "en");
  assert.equal(named.lead, "Sample B");
  assert.ok(noteLine(named).startsWith("Sample B — Born at 23:09"));
  assert.match(named.text, /so Sample B’s day pillar is the next day’s/);
  assert.match(keep(notes(b, "bazi-pair", {}, "fr", "Sample B"), "fr")[0].text, /et le pilier du jour de Sample B est celui du lendemain/);
  assert.match(keep(notes(b, "zodiac-pair", { dayBoundary: "midnight" }, "fr", "Sample B"), "fr")[0].text, /comme vous l’avez choisi, l’animal du jour de Sample B est /);
  // French elides « de » before a name that opens on a vowel (the review of part 20).
  assert.match(keep(notes(b, "bazi-pair", {}, "fr", "Anna"), "fr")[0].text, /et le pilier du jour d’Anna est celui du lendemain/);
});

test("outside the table's years, the terms come from the formula, said once a page", () => {
  for (const iso of ["1750-06-15T12:00:00Z", "2250-06-15T12:00:00Z", "1799-12-31T12:00:00Z", "2201-01-01T12:00:00Z"]) {
    const b = birth(iso, 0);
    for (const page of PAGES) {
      for (const locale of LOCALES) {
        const list = keep(notes(b, page, {}, locale), locale);
        assert.deepEqual(ids(list), ["formula"], `${iso} ${page} ${locale}`);
        assert.match(list[0].text, locale === "en" ? /^Born outside 1800–2200, the years of Ulune’s table: .+ within about 20 seconds/ : /^Naissance hors de 1800–2200, .+ à une vingtaine de secondes près/);
        // New moons only where New Year is read.
        assert.equal(/new moons|nouvelles lunes/.test(list[0].text), page === "zodiac", `${page} ${locale}`);
      }
    }
  }
  // The table's own edges: 1 January 1800 and 31 December 2200 are in it.
  for (const iso of ["1800-01-01T12:00:00Z", "2200-12-31T12:00:00Z"]) assert.deepEqual(notes(birth(iso, 0), "bazi"), [], iso);
});

test("the calendar's choices move the animal from New Year on two days only, and Chinese astrology says so", () => {
  // 1913–1928 at Beijing's meridian: New Year 1916 on 3 February, the 4th at UTC+8.
  const beijing = birth("1916-02-03T12:00:00Z", 0);
  const [b] = keep(notes(beijing, "zodiac"), "en");
  assert.equal(b.id, "new-year-beijing");
  assert.equal(
    b.text,
    "By the calendar of the time, reckoned at Beijing’s meridian from 1913 to 1928 as Ulune dates those years, Chinese New Year 1916 fell on 3 February. At China’s standard time (UTC+8) it would fall on 4 February, and your year animal counted from New Year would be the Rabbit.",
  );
  assert.match(keep(notes(beijing, "zodiac", {}, "fr"), "fr")[0].text, /tombait le 3 février\. .+ le 4 février, .+ serait le Lapin\.$/);
  // The Qing calendar of 1896 began the year on 13 February, the modern rules on the 14th.
  const qing = birth("1896-02-13T12:00:00Z", 0);
  const [q] = keep(notes(qing, "zodiac"), "en");
  assert.equal(q.id, "new-year-qing");
  assert.equal(
    q.text,
    "Ulune dates Chinese New Year 1896 by the modern rules, on 14 February; the Qing observatory’s calendar of the time began that year on 13 February: counted from that New Year, your year animal would be the Monkey.",
  );
  assert.match(keep(notes(qing, "zodiac", {}, "fr"), "fr")[0].text, /au 14 février\u202f; .+ le 13 février\u202f: .+ serait le Singe\.$/);
  // Only Chinese astrology names the animal from New Year.
  for (const page of PAGES.filter((p) => p !== "zodiac")) {
    assert.deepEqual(notes(beijing, page), [], page);
    assert.deepEqual(notes(qing, page), [], page);
  }
  // The days either side, an ordinary 1920 and the tenth month of 1920 that Beijing's meridian moves: no animal changes, no note.
  for (const iso of ["1916-02-02T12:00:00Z", "1916-02-04T12:00:00Z", "1896-02-12T12:00:00Z", "1896-02-14T12:00:00Z", "1920-06-15T12:00:00Z", "1920-11-10T12:00:00Z", "1914-11-17T12:00:00Z"]) {
    assert.deepEqual(notes(birth(iso, 0), "zodiac"), [], iso);
  }
  // The birthplace's own date: 3 February in Paris at 20:00 was already the 4th in China.
  assert.deepEqual(ids(notes(birth("1916-02-03T20:00:00Z", 2.35, 0), "zodiac")), ["new-year-beijing"]);
});

test("a pillar within minutes of its change: the engine's flag, said in the zodiac's words", () => {
  // Two minutes after Lichun 2001, at the Greenwich meridian: the year and the month may be the ones before.
  const at = termMs(2001, LICHUN) + 2 * 60_000;
  const b = birth(new Date(at).toISOString(), 0);
  const zk = keep(notes(b, "zodiac"), "en").filter((n) => n.id.startsWith("near-year") || n.id.startsWith("near-month"));
  assert.deepEqual(zk.map((n) => n.lead), ["Year animal ~", "Month animal ~"]);
  for (const n of zk) assert.equal(n.text, chinese.zkUncertainNear[0]);
  const bz = keep(notes(b, "bazi", {}, "fr"), "fr").filter((n) => n.id === "near-year");
  assert.deepEqual(bz.map((n) => `${n.lead} — ${n.text}`), [`Pilier de l’année ~ — ${chinese.zkUncertainNear[1]}`]);
  for (const page of ["fengshui", "fengshui-pair", "fengshui-home"]) {
    for (const locale of LOCALES) {
      const fs = keep(notes(b, page, {}, locale), locale);
      assert.deepEqual(ids(fs), ["near-lichun"], page);
      assert.match(fs[0].text, /Lichun.+(another Kua|un autre Kua)/);
    }
  }
  // Without a birth time, on Lichun's day: the Kua's card says it on Feng Shui's page; the home page says it here.
  const noon = birth(new Date(at).toISOString().slice(0, 10) + "T12:00:00Z", 0, 0, true);
  assert.deepEqual(notes(noon, "fengshui").filter((n) => n.id === "near-lichun"), []);
  // Feng Shui's Relationship says it on each person's Kua card, as the Kua page does.
  assert.deepEqual(notes(noon, "fengshui-pair").filter((n) => n.id === "near-lichun"), []);
  assert.deepEqual(notes(noon, "fengshui-home").map((n) => n.text), [chinese.fsUncertain[0]]);
});

test("without a birth time: no Rat hour to speak of, and the day that may be another", () => {
  const b = { ...USUAL, timeUnknown: true };
  for (const locale of LOCALES) {
    const zk = keep(notes(b, "zodiac", {}, locale), locale);
    assert.deepEqual(ids(zk), ["near-day"], locale);
    assert.equal(zk[0].text, chinese.zkUncertainDay[locale === "fr" ? 1 : 0]);
    assert.equal(zk[0].lead, locale === "fr" ? "Animal du jour ~" : "Day animal ~");
    assert.deepEqual(keep(notes(b, "bazi", {}, locale), locale).map((n) => n.lead), [locale === "fr" ? "Pilier du jour ~" : "Day pillar ~"]);
  }
  // A page of two: the person, then the place.
  assert.equal(notes(b, "zodiac-pair", {}, "en", "Camille")[0].lead, "Camille · Day animal ~");
});

test("how Ulune calculates: each language's school and choices, and where the terms come from", () => {
  const expect = {
    zodiac: [/Lichun/, /not at Chinese New Year/, /UTC\+8/, /Beijing’s meridian for 1913–1928/, /solar terms and the new moons/],
    "zodiac-pair": [/Lichun/, /not at Chinese New Year/],
    bazi: [/Zi Ping school/, /Xu Ziping/, /Zi Ping Zhen Quan/, /Qiong Tong Bao Jian/, /luck pillars step from the month pillar/, /three days to a year/],
    "bazi-luck": [/Zi Ping school/, /luck pillars step from the month pillar/],
    "bazi-pair": [/Zi Ping school/],
    fengshui: [/Eight Mansions school/, /Ba Zhai Ming Jing/, /2 \(Kun\) for the yang count and 8 \(Gen\) for the yin count/],
    "fengshui-pair": [/Eight Mansions school/, /Ba Zhai Ming Jing/],
    "fengshui-home": [/Eight Mansions school/, /Xuan Kong Flying Stars/, /24 mountains of 15°/, /Within 3°/, /within 1\.5°/, /counted from 1864/, /World Magnetic Model 2025/, /year’s star changes at Lichun/],
  };
  for (const page of PAGES) {
    const how = howUluneCalculates(page, prefs(), "en");
    assert.equal(how.title, "How Ulune calculates");
    const all = how.items.join(" ");
    for (const re of expect[page]) assert.match(all, re, page);
    // The source, named, and the device.
    assert.ok(how.items.at(-1).includes(`(${TABLE_SOURCE})`) && /worked out on this device; nothing is sent\.$/.test(how.items.at(-1)), page);
    // The day and the hour where the language reads them.
    assert.equal(how.items.some((t) => /true solar time/.test(t)), !page.startsWith("fengshui"), page);
    assert.equal(/luck pillars/.test(all), page === "bazi" || page === "bazi-luck", page);
    for (const locale of LOCALES) for (const t of howUluneCalculates(page, prefs(), locale).items) SAID[locale].add(t);
  }
  const fr = howUluneCalculates("fengshui-home", prefs(), "fr");
  assert.equal(fr.title, "Comment Ulune calcule");
  assert.match(fr.items.join(" "), /Huit Demeures.+Ba Zhai Ming Jing.+Xuan Kong.+1864.+modèle magnétique mondial 2025/);
  // The reader's own clock and day rule, once changed in Settings.
  for (const locale of LOCALES) {
    for (const [clock, dayBoundary] of [["civil", "split"], ["local-mean", "midnight"], ["true-solar", "midnight"]]) {
      const items = howUluneCalculates("bazi", { clock, dayBoundary }, locale).items;
      for (const t of items) SAID[locale].add(t);
      assert.ok(items.some((t) => (locale === "en" ? /as you chose in Settings → Chinese traditions/ : /comme vous l’avez choisi dans Réglages → Traditions chinoises/).test(t)), `${clock} ${dayBoundary} ${locale}`);
    }
  }
  assert.match(howUluneCalculates("zodiac", { clock: "civil", dayBoundary: "split" }, "en").items[1], /read on the clock on the wall at the birthplace, and the day turns at midnight, the Rat hour split/);
});

test("the birth form's count names only what reads it in 2.0, and Settings' promise is the notes'", () => {
  for (const text of chinese.cnCountNote) assert.doesNotMatch(text, /Zi Wei/);
  assert.match(chinese.cnCountNote[0], /Only two calculations read it: the direction of BaZi’s luck pillars and Feng Shui’s Kua number\./);
  assert.match(chinese.cnCountNote[1], /Deux calculs seulement le lisent\u202f: le sens des piliers de chance du BaZi et le nombre Kua du Feng Shui\./);
  assert.match(chinese.cnDayLead[0], /between 23:00 and midnight.+between 23:00 and 01:00/);
});

test("typography and tone of every line said", () => {
  // (Run after the others: node:test keeps the order of a file's tests.)
  assert.ok(SAID.en.size > 20 && SAID.fr.size > 20);
  for (const locale of LOCALES) {
    for (const text of SAID[locale]) {
      assert.doesNotMatch(text, /\{\w+\}/, `placeholder left: ${text}`);
      assert.doesNotMatch(text, /\w'\w/, `straight apostrophe: ${text}`);
      assert.doesNotMatch(text, /\s{2,}| [,.]/, `spacing: ${text}`);
      assert.doesNotMatch(text, locale === "en" ? /\b(death|dies?|illness|ill|accident|divorce|buy)\b/i : /\b(mort|meurt|maladie|accident|divorce|achet\w*)\b/i, `tone: ${text}`);
      if (locale === "fr") {
        assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(text), `French punctuation without its narrow space: ${text}`);
        assert.ok(!/ [:;!?]/.test(text), `French punctuation after a plain space: ${text}`);
        assert.ok(!/« |«[^\u202f]| »|[^\u202f]»/.test(text), `« » without narrow spaces: ${text}`);
      }
    }
  }
});
