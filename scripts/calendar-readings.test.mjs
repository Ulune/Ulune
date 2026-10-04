/**
 * The calendar's day and readings (part 56 of the launch plan): a day laid
 * out from the shared chunks (its Moon, void-of-course hours, events and your
 * exacts, a 25-hour day when the clocks go back), and a reading for every
 * kind of event in both languages, each with the link to Transits.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal, calculateSkyWindow, calculateSkyYear } from "../src/lib/chart/calculate.server.ts";
import { dayOverview } from "../src/lib/chart/calendar-day.ts";
import { yearLayout } from "../src/lib/chart/calendar-year.ts";
import { eventsOf, mergeEvents } from "../src/lib/chart/calendar-sky.ts";
import { calendarDayReading, moonDayReading, skyEventReading, windowReading } from "../src/lib/chart/interpret-calendar.ts";
import { CALENDAR_MOVERS, foldTwins, slowWindowsFromYears, transitsFromWindows } from "../src/lib/chart/personal-transits.ts";
import { seasonOf } from "../src/lib/chart/sky-events.ts";
import { chunkStart, WINDOW_TIMES } from "../src/lib/chart/sky-window.ts";
import { scopeBounds, utcFromCivil } from "../src/lib/chart/timing-window.ts";

const TZ = "Europe/Paris";
const DAY = 86_400_000;
const TRACE = { name: "TraceQA", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris, France", houseSystem: "placidus" };

let shared;
async function sky() {
  if (shared) return shared;
  const chart = await calculateNatal(TRACE);
  const natal = [...chart.planets, ...Object.values(chart.angles)].map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic }));
  const from = Date.UTC(2026, 8, 1);
  const to = Date.UTC(2026, 10, 1);
  const wins = [];
  for (let t0 = chunkStart(from - 3 * DAY); t0 <= to + 3 * DAY; t0 += WINDOW_TIMES.CHUNK_MS) wins.push(await calculateSkyWindow(t0));
  const years = [await calculateSkyYear(2025), await calculateSkyYear(2026), await calculateSkyYear(2027)];
  const events = mergeEvents(eventsOf(wins), years.flatMap((y) => y.events));
  const hits = foldTwins(transitsFromWindows(wins, natal, from, to, [...CALENDAR_MOVERS]));
  const windows = slowWindowsFromYears(years, natal, from - 400 * DAY, to + 400 * DAY);
  shared = { chart, natal, wins, years, events, hits, windows };
  return shared;
}

function day(civil, s) {
  const b = scopeBounds("day", civil, TZ);
  const noon = utcFromCivil({ ...civil, hour: 12, minute: 0 }, TZ).getTime();
  return dayOverview({ from: b.from.getTime(), to: b.to.getTime(), noon }, s.events, s.wins, s.hits, s.windows, Date.UTC(2026, 8, 28, 10));
}

const paris = (ms) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));

/** No slot left unfilled, no stray value, the Transits link present. */
function assertClean(r, where) {
  const text = JSON.stringify(r);
  assert.ok(r.title && r.title.trim(), `${where}: no title`);
  assert.ok(!/\{[a-z]+\}/i.test(text), `${where}: unfilled slot in ${text.slice(0, 300)}`);
  assert.ok(!/undefined|NaN|null/.test(text.replace(/"note":null/g, "")), `${where}: stray value in ${text.slice(0, 300)}`);
}

test("a day from the chunks: 28 Sep 2026 in Paris", { timeout: 180_000 }, async () => {
  const s = await sky();
  const ov = day({ year: 2026, month: 9, day: 28 }, s);
  assert.equal(ov.to - ov.from, DAY);
  assert.equal(ov.signAtStart, 0, "the day starts with the Moon in Aries");
  assert.equal(ov.ingresses.length, 1);
  assert.equal(ov.ingresses[0].sign, 1, "then Taurus");
  assert.equal(paris(ov.ingresses[0].t), "16:40");
  const v = ov.voids.find((x) => x.end === ov.ingresses[0].t);
  assert.ok(v, "the void span ends at the ingress");
  assert.equal(paris(v.t), "11:50");
  assert.equal(ov.phase?.phase, 3, "the next phase is the last quarter");
  const mars = ov.rows.find((r) => r.kind === "sky" && r.ev.k === "ingress" && r.ev.body === "mars");
  assert.ok(mars, "Mars enters Leo");
  assert.equal(paris(mars.t), "04:48");
  assert.ok(ov.rows.some((r) => r.kind === "you" && r.hit.moving === "moon"), "the Moon's transits show in the day");
  for (let i = 1; i < ov.rows.length; i += 1) assert.ok(ov.rows[i].t >= ov.rows[i - 1].t, "rows in time order");
  assert.ok(ov.effect.some((w) => w.moving === "uranus" && w.type === "conjunction" && w.natal === "mercury"), "Uranus conjunct your Mercury is in effect");
  // No event twice although the chunks and the year files both hold it.
  const ids = ov.rows.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  const marsTwice = ov.rows.filter((r) => r.kind === "sky" && r.ev.k === "ingress" && r.ev.body === "mars").length;
  assert.equal(marsTwice, 1);
});

test("the clocks go back on 25 Oct 2026: a day of 25 hours", { timeout: 180_000 }, async () => {
  const s = await sky();
  const ov = day({ year: 2026, month: 10, day: 25 }, s);
  assert.equal(ov.to - ov.from, 25 * 3_600_000);
  assert.ok(ov.moon, "the Moon is drawn");
});

test("every kind of event reads in English and French, with the link to Transits", { timeout: 180_000 }, async () => {
  const s = await sky();
  const ctx = { chart: s.chart, events: s.events };
  const kinds = {
    phase: s.events.find((e) => e.k === "phase"),
    solar: s.events.find((e) => e.k === "eclipse" && e.kind === "solar"),
    lunar: s.events.find((e) => e.k === "eclipse" && e.kind === "lunar"),
    rx: s.events.find((e) => e.k === "station" && e.turn === "rx" && e.body === "venus"),
    direct: s.events.find((e) => e.k === "station" && e.turn === "direct"),
    ingress: s.events.find((e) => e.k === "ingress" && e.body === "mars"),
    back: s.events.find((e) => e.k === "ingress" && e.rx),
    moonIngress: s.events.find((e) => e.k === "ingress" && e.body === "moon"),
    season: s.events.find((e) => seasonOf(e) != null),
    aspect: s.events.find((e) => e.k === "aspect" && e.a !== "moon"),
    moonAspect: s.events.find((e) => e.k === "aspect" && e.a === "moon"),
    void: s.events.find((e) => e.k === "void"),
  };
  for (const [name, ev] of Object.entries(kinds)) {
    assert.ok(ev, `no ${name} event to read`);
    for (const locale of ["en", "fr"]) {
      const r = skyEventReading(ev, locale, TZ, ctx);
      assertClean(r, `${name} ${locale}`);
      assert.ok(r.lead && r.lead.length > 40, `${name} ${locale}: a lead`);
      assert.ok(r.links?.rows.some((row) => row.ref === `transits-at:${Math.round(ev.t)}`), `${name} ${locale}: the link to Transits`);
    }
  }
  // The sign change says where it falls in your chart, and until when.
  const mars = skyEventReading(kinds.ingress, "en", TZ, ctx);
  assert.ok(mars.facts.some((f) => f.label === "Until"));
  assert.ok(mars.facts.some((f) => f.label === "In your chart"));
  // A station says when the planet turns again.
  const venus = skyEventReading(kinds.rx, "en", TZ, ctx);
  assert.ok(venus.facts.some((f) => f.label === "Direct again"), JSON.stringify(venus.facts));
});

test("the day, the Moon and a slow transit read in both languages", { timeout: 180_000 }, async () => {
  const s = await sky();
  const ov = day({ year: 2026, month: 9, day: 28 }, s);
  const w = s.windows.find((x) => x.moving === "uranus" && x.natal === "mercury");
  assert.ok(w);
  for (const locale of ["en", "fr"]) {
    const d = calendarDayReading(ov, "2026-09-28", locale, TZ, Date.UTC(2026, 8, 28, 10));
    assertClean(d, `day ${locale}`);
    assert.equal(d.id, "day:2026-09-28");
    assert.ok(d.links.rows.length >= ov.rows.length + 1, "each row and the Moon link to their readings");
    const m = moonDayReading(ov, "2026-09-28", locale, TZ, Date.UTC(2026, 8, 28, 10));
    assertClean(m, `moon ${locale}`);
    assert.ok(m.links.rows.some((row) => row.ref.startsWith("transits-at:")));
    const r = windowReading(w, locale, TZ, Date.UTC(2026, 8, 28, 10));
    assertClean(r, `window ${locale}`);
    assert.ok(r.links.rows.some((row) => row.ref.startsWith("transits-at:")));
  }
});

test("a year whose sky file has not come yet draws no signs and no retrograde (part 62)", { timeout: 180_000 }, async () => {
  const s = await sky();
  // 2031 with only 2025–2027 at hand: the last stations and signs known must not stretch over it.
  const early = yearLayout(2031, TZ, s.events, s.years, []);
  for (const b of early.bodies) assert.deepEqual([b.body, b.segments.length, b.retro.length], [b.body, 0, 0]);
  // 2026, whose file is here: every body has its signs, Mercury its three retrograde stretches.
  const here = yearLayout(2026, TZ, s.events, s.years, []);
  for (const b of here.bodies) assert.ok(b.segments.length >= 1, b.body);
  assert.equal(here.bodies.find((b) => b.body === "mercury").retro.length, 3);
});

test("sign changes, sky aspects, stations and near misses read right in both languages (proofreading)", { timeout: 180_000 }, async () => {
  const s = await sky();
  const ctx = { chart: s.chart, events: s.events };
  const read = (ev, locale) => skyEventReading(ev, locale, TZ, ctx);
  const all = (r) => [r.lead, ...(r.sections ?? []).flatMap((x) => x.paragraphs)].join("\n");
  // The North Node goes backwards through the signs: its own line, not a planet backing into a sign it had left.
  const node = s.events.find((e) => e.k === "ingress" && e.body === "northnode");
  assert.ok(node, "a North Node sign change");
  assert.match(read(node, "en").lead, /^The North Node changes sign\. The lunar nodes move backwards/);
  assert.match(read(node, "fr").lead, /^Le Nœud Nord vrai change de signe\. Les nœuds lunaires reculent/);
  for (const locale of ["en", "fr"]) assert.doesNotMatch(all(read(node, locale)), /last review|dernière révision/);
  // A body keeps its article ("the Sun", "le Soleil" mid-sentence); the French sign keywords take no "de".
  const sun = s.events.find((e) => e.k === "ingress" && e.body === "sun" && seasonOf(e) == null);
  assert.ok(sun, "a Sun sign change that opens no season");
  assert.match(read(sun, "en").lead, /^The Sun leaves one sign for the next\./);
  assert.match(all(read(sun, "en")), /, what the Sun stands for tends to turn /);
  assert.match(all(read(sun, "fr")), /, ce que le Soleil représente prend la couleur du signe\u202f: /);
  for (const ev of s.events.filter((e) => e.k === "ingress" && e.body !== "moon" && seasonOf(e) == null)) {
    assert.doesNotMatch(all(read(ev, "fr")), /\bde [aeiouyéèêâîôû]/i, `no elision before a vowel: ${ev.body}`);
  }
  // Two planets in aspect: each with its own keywords, never two lists run together.
  const moonAspect = s.events.find((e) => e.k === "aspect" && e.a === "moon");
  assert.match(read(moonAspect, "en").lead, /^The Moon \(feelings, needs and habits\) and /);
  assert.match(read(moonAspect, "fr").lead, /^La Lune \(les émotions, les besoins et les habitudes\) et /);
  for (const ev of s.events.filter((e) => e.k === "aspect" || e.k === "ingress")) {
    const fr = all(read(ev, "fr"));
    assert.doesNotMatch(fr, /[a-zà-ÿ,)] (?:Le|La) (?:Soleil|Lune|Nœud)/, `a capital article mid-sentence: ${fr.slice(0, 160)}`);
  }
  // Venus is feminine in French; turning direct, the time to clear the retrograde's degree depends on the planet.
  const venus = s.events.find((e) => e.k === "station" && e.turn === "rx" && e.body === "venus");
  assert.match(read(venus, "fr").lead, /^Depuis la Terre, Vénus semble s’arrêter/);
  assert.doesNotMatch(read(venus, "fr").lead, /\b(?:le|il) dépasse\b/);
  const direct = s.events.find((e) => e.k === "station" && e.turn === "direct");
  assert.match(read(direct, "en").lead, /from two or three weeks for Mercury to several months for the slow planets\.$/);
  assert.match(read(direct, "fr").lead, /de deux ou trois semaines pour Mercure à plusieurs mois pour les planètes lentes\.$/);
  // Orbs in degrees and minutes, never a bare decimal.
  for (const ev of s.events.filter((e) => e.k === "phase" || e.k === "eclipse" || e.k === "station")) {
    for (const locale of ["en", "fr"]) assert.doesNotMatch(all(read(ev, locale)), /\d[.,]\d+ (?:from your|de votre)/);
  }
  const miss = { moving: "saturn", natal: "sun", type: "square", from: Date.UTC(2026, 8, 1), to: Date.UTC(2026, 9, 1), passes: [], minOrb: 0.4, openStart: false, openEnd: false };
  const en = windowReading(miss, "en", TZ, Date.UTC(2026, 8, 28, 10));
  assert.equal(en.facts.find((f) => f.label === "Closest")?.value, "0°24'");
  assert.ok(en.paragraphs.some((p) => p.startsWith("It comes within 0°24' of exact and turns back")), JSON.stringify(en.paragraphs));
  const fr = windowReading(miss, "fr", TZ, Date.UTC(2026, 8, 28, 10));
  assert.equal(fr.facts.find((f) => f.label === "Au plus près")?.value, "0°24'");
  assert.ok(fr.paragraphs.some((p) => p.startsWith("Elle arrive à 0°24' de l’exactitude")), JSON.stringify(fr.paragraphs));
});
