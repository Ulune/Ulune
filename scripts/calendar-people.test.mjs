/**
 * The Calendar's birthdays and returns of the charts you keep (share and
 * compare plan, idea B10; src/lib/chart/calendar-people.ts): the birthdays on
 * their days (29 February included), the solar returns found on the device in
 * the sky's chunks against the Swiss search of the server, the big returns
 * (a Saturn return, a Uranus opposition) from the year files against the same
 * search, nothing before the ages they count from, ids without a date of birth
 * or a name, the groups, the readings in both languages, and the calendar
 * file: no names unless the reader includes them. Made-up births only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal, calculateSkyWindow, calculateSkyYear, calculateTiming } from "../src/lib/chart/calculate.server.ts";
import { birthdayIn, birthdaysBetween, bigReturnsBetween, eventsOfDay, peopleEvents, peopleOfGroup, saturnNth, solarReturnsBetween } from "../src/lib/chart/calendar-people.ts";
import { chunkStart, WINDOW_TIMES } from "../src/lib/chart/sky-window.ts";
import { calendarIcs } from "../src/lib/i18n/calendar-export.ts";
import { personDetail, personIcsItem, personReading, personShort, personTitle } from "../src/lib/i18n/calendar-people-text.ts";

const TRACE = { name: "TraceQA", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris, France", houseSystem: "placidus" };
const SAMPLE_B = { name: "Sample B", date: "1987-11-03", time: "23:10", latitude: 59.9139, longitude: 10.7522, placeLabel: "Oslo, Norway", houseSystem: "placidus" };
const DAY = 86_400_000;
const a = await calculateNatal(TRACE);
const b = await calculateNatal(SAMPLE_B);
const people = [
  { id: "k7f2", name: "TraceQA", chart: a },
  { id: "q9x1", name: "Sample B", chart: b },
];
const iso = (ms) => new Date(ms).toISOString();
const lonOf = (chart, id) => chart.planets.find((p) => p.id === id).ecliptic;

const chunks = new Map();
async function chunksFor(from, to) {
  const out = [];
  for (let t0 = chunkStart(from - 2 * DAY); t0 <= to + 2 * DAY; t0 += WINDOW_TIMES.CHUNK_MS) {
    if (!chunks.has(t0)) chunks.set(t0, await calculateSkyWindow(t0));
    out.push(chunks.get(t0));
  }
  return out;
}
const yearFiles = new Map();
const skyYears = async (...list) => {
  for (const y of list) if (!yearFiles.has(y)) yearFiles.set(y, await calculateSkyYear(y));
  return list.map((y) => yearFiles.get(y));
};
/** The server's Swiss search of one body's exacts to its own natal place. */
async function swiss(chart, body, type, from, to) {
  const r = await calculateTiming({ from: new Date(from), to: new Date(to), latitude: chart.meta.latitude, longitude: chart.meta.longitude, natalBodies: [{ id: body, name: body, ecliptic: lonOf(chart, body) }] });
  return r.hits.filter((h) => h.moving === body && h.natal === body && h.type === type).map((h) => Date.parse(h.exactUtc));
}

test("a birthday: the birth's date each year after the birth, at the start of that day on the Calendar's clock; 29 February keeps 28 February", () => {
  assert.deepEqual(birthdayIn({ year: 1992, month: 2, day: 29 }, 2026), { year: 2026, month: 2, day: 28 });
  assert.deepEqual(birthdayIn({ year: 1992, month: 2, day: 29 }, 2028), { year: 2028, month: 2, day: 29 });
  assert.deepEqual(birthdayIn({ year: 1990, month: 6, day: 15 }, 2026), { year: 2026, month: 6, day: 15 });
  const year = birthdaysBetween(people, Date.UTC(2026, 0, 1), Date.UTC(2027, 0, 1), "Europe/Paris");
  assert.deepEqual(
    year.map((e) => [e.name, e.day, e.age, iso(e.t)]),
    [
      ["TraceQA", "2026-06-15", 36, "2026-06-14T22:00:00.000Z"],
      ["Sample B", "2026-11-03", 39, "2026-11-02T23:00:00.000Z"],
    ],
  );
  // In New York's clock the same days start later; the birth's own year is no birthday.
  const ny = birthdaysBetween(people, Date.UTC(2026, 0, 1), Date.UTC(2027, 0, 1), "America/New_York");
  assert.deepEqual(ny.map((e) => iso(e.t)), ["2026-06-15T04:00:00.000Z", "2026-11-03T05:00:00.000Z"]);
  assert.deepEqual(birthdaysBetween(people, Date.UTC(1990, 0, 1), Date.UTC(1991, 0, 1), "Europe/Paris").map((e) => [e.name, e.age]), [["Sample B", 3]]);
  const leapling = { id: "l1", name: "Leap", chart: { ...a, meta: { ...a.meta, date: "1992-02-29" } } };
  assert.deepEqual(birthdaysBetween([leapling], Date.UTC(2026, 0, 1), Date.UTC(2027, 0, 1), "UTC").map((e) => [e.day, e.age]), [["2026-02-28", 34]]);
});

test("a solar return: found on the device in the sky's chunks, within 2 s of the Swiss search, on its day in the Calendar's clock", async () => {
  const june = [Date.UTC(2026, 5, 10), Date.UTC(2026, 5, 20)];
  const november = [Date.UTC(2026, 9, 29), Date.UTC(2026, 10, 8)];
  const juneWins = await chunksFor(...june);
  const found = [...solarReturnsBetween(people, juneWins, ...june, "Europe/Paris"), ...solarReturnsBetween(people, await chunksFor(...november), ...november, "Europe/Paris")];
  assert.deepEqual(found.map((e) => e.name), ["TraceQA", "Sample B"]);
  for (const [e, chart, span] of [
    [found[0], a, june],
    [found[1], b, november],
  ]) {
    const [exact] = await swiss(chart, "sun", "conjunction", ...span);
    assert.ok(Math.abs(e.t - exact) <= 2000, `${e.name}: device ${iso(e.t)}, Swiss ${iso(exact)}`);
    assert.equal(e.natalLon, lonOf(chart, "sun"));
    assert.equal(e.birthZone, chart.meta.timezone);
    assert.equal(e.uncertain, undefined);
  }
  assert.equal(found[0].day, "2026-06-15");
  assert.equal(found[0].age, 36);
  // Sample B's return, 3 November at 08:57 UT: 09:57 in Oslo and in Paris, 03:57 in New York.
  assert.equal(found[1].day, "2026-11-03");
  assert.equal(iso(found[1].t).slice(0, 16), "2026-11-03T08:57");
  // A chart without a birth time: its day only.
  const noTime = { id: "n1", name: "No time", chart: { ...a, meta: { ...a.meta, timeUnknown: true } } };
  assert.equal(solarReturnsBetween([noTime], juneWins, ...june, "Europe/Paris")[0].uncertain, true);
  // The birth itself is no return.
  const birthWins = await chunksFor(Date.UTC(1990, 5, 10), Date.UTC(1990, 5, 20));
  assert.deepEqual(solarReturnsBetween(people, birthWins, Date.UTC(1990, 5, 10), Date.UTC(1990, 5, 20), "Europe/Paris"), []);
});

test("the big returns: TraceQA's first Saturn return and Sample B's Uranus opposition, every pass within a minute of the Swiss search; nothing before the ages they count from", async () => {
  const sat = bigReturnsBetween(people, await skyYears(2019, 2020, 2021), Date.UTC(2019, 6, 1), Date.UTC(2021, 0, 1), "Europe/Paris");
  assert.deepEqual(sat.map((e) => [e.kind, e.name, e.age, e.nth]), [["saturn", "TraceQA", 29, 1]]);
  const [satExact] = await swiss(a, "saturn", "conjunction", Date.UTC(2019, 11, 1), Date.UTC(2020, 2, 1));
  assert.ok(Math.abs(sat[0].t - satExact) <= 60_000, `Saturn: ${iso(sat[0].t)} against ${iso(satExact)}`);
  assert.ok(sat[0].window.from < sat[0].t && sat[0].t < sat[0].window.to && sat[0].window.passes.includes(sat[0].t));
  assert.equal(sat[0].id, "ppl:saturn:k7f2:20200123");
  // Sample B's Uranus opposition: three passes, July 2031, January and April 2032, each its own event.
  const years = await skyYears(2031, 2032, 2033);
  const ura = bigReturnsBetween(people, years, Date.UTC(2031, 0, 1), Date.UTC(2034, 0, 1), "Europe/Paris");
  assert.deepEqual(ura.map((e) => [e.kind, e.name, e.age]), [["uranus", "Sample B", 43], ["uranus", "Sample B", 44], ["uranus", "Sample B", 44]]);
  assert.equal(new Set(ura.map((e) => e.id)).size, 3, "each pass its own id");
  for (const e of ura) {
    const [exact] = await swiss(b, "uranus", "opposition", e.t - 10 * DAY, e.t + 10 * DAY);
    assert.ok(Math.abs(e.t - exact) <= 60_000, `Uranus: ${iso(e.t)} against ${iso(exact)}`);
  }
  // Saturn back over its natal place in the months after the birth: no return yet.
  assert.deepEqual(bigReturnsBetween(people, await skyYears(1990, 1991), Date.UTC(1990, 5, 16), Date.UTC(1991, 11, 1), "Europe/Paris"), []);
  assert.deepEqual([28, 29, 44, 45, 58, 74, 75, 88].map(saturnNth), [1, 1, 1, 2, 2, 2, 3, 3]);
});

test("the layer's events: in time order, a day's birthday first; ids without a date of birth or a name; the groups; a day's events", async () => {
  const from = Date.UTC(2026, 10, 1);
  const to = Date.UTC(2026, 11, 1);
  const events = peopleEvents(people, { wins: await chunksFor(from, to), years: [] }, from, to, "Europe/Paris");
  assert.deepEqual(events.map((e) => `${e.kind}:${e.name}:${e.day}`), ["birthday:Sample B:2026-11-03", "solar:Sample B:2026-11-03"]);
  for (const e of events) {
    assert.ok(e.id.startsWith(`ppl:${e.kind}:q9x1:`), e.id);
    assert.ok(!e.id.includes("Sample") && !e.id.includes("1987"), `an id with a name or a birth: ${e.id}`);
  }
  assert.deepEqual(eventsOfDay(events, "2026-11-03").length, 2);
  assert.deepEqual(eventsOfDay(events, "2026-11-04"), []);
  assert.deepEqual(peopleOfGroup(people, ["q9x1"]).map((p) => p.name), ["Sample B"]);
  assert.deepEqual(peopleOfGroup(people, null).map((p) => p.name), ["TraceQA", "Sample B"]);
  assert.deepEqual(peopleOfGroup(people, []), []);
});

test("the readings, both languages: titles, lines and leads in Ulune's tone, the way to the chart and to the transits", async () => {
  const from = Date.UTC(2026, 10, 1);
  const to = Date.UTC(2026, 11, 1);
  const [birthday, solar] = peopleEvents(people, { wins: await chunksFor(from, to), years: [] }, from, to, "Europe/Paris");
  const sat = bigReturnsBetween(people, await skyYears(2019, 2020, 2021), Date.UTC(2019, 6, 1), Date.UTC(2021, 0, 1), "Europe/Paris")[0];
  assert.equal(personTitle(birthday, "en"), "Sample B’s birthday");
  assert.equal(personTitle(birthday, "fr"), "Anniversaire de Sample B");
  assert.equal(personTitle(solar, "fr"), "Retour solaire de Sample B");
  assert.equal(personTitle(sat, "en"), "TraceQA’s first Saturn return");
  assert.equal(personTitle(sat, "fr"), "Premier retour de Saturne de TraceQA");
  assert.equal(personShort(solar, "en"), "Sample B · solar return");
  assert.equal(personDetail(birthday, "en", "Europe/Paris"), "turns 39");
  assert.equal(personDetail(birthday, "fr", "Europe/Paris"), "39 ans");
  assert.equal(personDetail(solar, "en", "Europe/Paris"), "09:57");
  assert.equal(personDetail(solar, "en", "America/New_York"), "03:57");
  assert.equal(personDetail(sat, "fr", "Europe/Paris"), "09:49 · à 29 ans");
  for (const locale of ["en", "fr"]) {
    for (const ev of [birthday, solar, sat]) {
      const r = personReading(ev, locale, "America/New_York");
      const text = [r.title, r.kicker, r.lead, ...r.paragraphs, ...(r.facts ?? []).flatMap((f) => [f.label, f.value]), ...(r.links?.rows ?? []).map((x) => x.label), ...(r.about?.paragraphs ?? [])].join("\n");
      assert.ok(!/undefined|NaN|\{[a-zA-Z]+\}/.test(text), `${ev.id} ${locale}: ${text}`);
      assert.ok(!/\w'\w/.test(text.replace(/\d+°\d+'/g, "")), `${ev.id} ${locale}: a straight apostrophe`);
      assert.ok(!/\b(will|death|illness|accident|divorce|mort|maladie|divorce)\b/i.test(text), `${ev.id} ${locale}: a prediction or a fear`);
      if (locale === "fr") assert.ok(!/(?<!\u202f)[:;!?](?=\s|$)/.test(text.replace(/\d{2}:\d{2}/g, "")), `${ev.id}: French punctuation without its narrow space`);
      assert.equal(r.links.rows[0].ref, `open-chart:${ev.personId}:natal`);
      if (ev.kind !== "birthday") assert.equal(r.links.rows[1].ref, `open-chart:${ev.personId}:transits:${Math.round(ev.t)}`);
    }
  }
  // A return's moment in the birthplace's clock: Sample B's in Oslo's, read from New York.
  const fact = personReading(solar, "en", "America/New_York").facts.find((f) => f.label === "At the birthplace");
  assert.equal(fact.value, "3 Nov, 09:57 in Oslo");
  // A return's window within 1° in its reading.
  assert.ok(personReading(sat, "en", "Europe/Paris").paragraphs.some((p) => /^Within 1° from \d+ Jan to \d+ Jan, exact once\.$/.test(p)));
});

test("the calendar file holds no names unless the reader includes them", async () => {
  const from = Date.UTC(2026, 10, 1);
  const to = Date.UTC(2026, 11, 1);
  const events = peopleEvents(people, { wins: await chunksFor(from, to), years: [] }, from, to, "Europe/Paris");
  const rows = events.map((ev) => ({ kind: "people", t: ev.t, id: ev.id, ev }));
  const unfold = (ics) => ics.replace(/\r\n /g, "").split("\r\n").filter(Boolean);
  for (const locale of ["en", "fr"]) {
    const without = calendarIcs(rows, [], locale, "Europe/Paris", "Ulune 2026-11");
    assert.ok(!/Sample B|TraceQA|ppl-/.test(without), "a name in the file by default");
    assert.equal(unfold(without).filter((l) => l === "BEGIN:VEVENT").length, 0);
    const withNames = calendarIcs(rows, [], locale, "Europe/Paris", "Ulune 2026-11", { people: (r) => personIcsItem(r, locale, "Europe/Paris") });
    const lines = unfold(withNames);
    assert.equal(lines.filter((l) => l === "BEGIN:VEVENT").length, 2);
    // The birthday as its whole day, the solar return at its moment.
    assert.ok(lines.includes("DTSTART;VALUE=DATE:20261103"), lines.join("\n"));
    assert.ok(lines.some((l) => /^DTSTART:20261103T0857\d\dZ$/.test(l)), lines.join("\n"));
    assert.ok(lines.some((l) => l.startsWith("SUMMARY:") && l.includes("Sample B")));
    assert.ok(lines.some((l) => l.startsWith("UID:ppl-solar-q9x1-")));
  }
});
